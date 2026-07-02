import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFeedRepository, useFollowRepository, useModerationRepository, useReactionRepository } from '@/core/di/repositories-context';
import { type FeedItem, type ReactionKind } from '@/domain/entities/feed';
import { xpBreakdown } from '@/domain/usecases/gamification';
import { withToggledReaction } from '@/domain/usecases/reaction-toggle';
import { PrimaryButton } from '@/ui/button';
import { avatarColor, initial } from '@/ui/format';
import { FeedItemCard } from '@/ui/feed-item-card';
import { filterFeed, type FeedTab } from '@/ui/feed-filter';
import { LiveNow } from '@/ui/live-now';
import { YouStrip } from '@/ui/you-strip';
import { ScreenState } from '@/ui/screen-state';
import { colors, font, gradients, radius } from '@/ui/theme';
import { useAsyncData } from '@/ui/use-async-data';

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'tout', label: 'Tout' },
  { key: 'abonnements', label: 'Abonnements' },
  { key: 'groupes', label: 'Groupes' },
];

/** Accueil solo (DA) : fil social type Twitter (toi + abonnements + groupes). */
export function FeedView({
  userId,
  pseudo,
  onOpenProfile,
  onOpenLog,
  onOpenComments,
  onOpenDiscover,
  onOpenGroup,
  onOpenGroups,
}: {
  userId: string;
  pseudo: string;
  onOpenProfile: (id: string, name: string) => void;
  onOpenLog: () => void;
  onOpenComments: (item: FeedItem) => void;
  onOpenDiscover: () => void;
  onOpenGroup: (groupId: string) => void;
  onOpenGroups: () => void;
}) {
  const feed = useFeedRepository();
  const reactionRepo = useReactionRepository();
  const followRepo = useFollowRepository();
  const insets = useSafeAreaInsets();
  const [following, setFollowing] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const moderation = useModerationRepository();
  const [tab, setTab] = useState<FeedTab>('tout');

  const loader = useCallback(() => feed.listHomeFeed(), [feed]);
  const { data: items, setData: setItems, loading, error, setError, reload, mounted } = useAsyncData<FeedItem[]>(loader, []);

  useEffect(() => {
    followRepo
      .listFollowing()
      .then((f) => {
        if (mounted.current) setFollowing(f);
      })
      .catch(() => {});
    moderation
      .listBlocked()
      .then((b) => {
        if (mounted.current) setBlocked(b);
      })
      .catch(() => {});
  }, [followRepo, moderation, mounted]);

  async function refresh() {
    setRefreshing(true);
    await reload();
    if (mounted.current) setRefreshing(false);
  }

  const filtered = useMemo(() => filterFeed(items, tab, userId, following, blocked), [items, tab, userId, following, blocked]);

  // XP réellement gagné par post (moteur v2 : décroissance/plafond/bonus) — par auteur.
  // NB : pour AUTRUI c'est une approximation (le fil ne voit qu'un sous-ensemble de ses
  // posts via la RLS) ; sur son propre profil le calcul est exact.
  const earnedByItem = useMemo(() => {
    const tz = -new Date().getTimezoneOffset();
    const authors = [...new Set(items.map((i) => i.authorId))];
    const map = new Map<string, number>();
    for (const a of authors) {
      for (const [id, xp] of xpBreakdown(items, a, tz).byItem) map.set(id, xp);
    }
    return map;
  }, [items]);

  async function toggleReaction(item: FeedItem, kind: ReactionKind) {
    const active = (item.reactions?.mine ?? []).includes(kind);
    if (!active) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Optimistic : on met à jour l'item localement tout de suite.
    setItems((prev) => prev.map((it) => (it.id === item.id ? withToggledReaction(it, kind, !active) : it)));
    try {
      if (active) await reactionRepo.remove(item.id, kind);
      else await reactionRepo.add(item.id, kind);
    } catch (e) {
      setItems((prev) => prev.map((it) => (it.id === item.id ? withToggledReaction(it, kind, active) : it)));
      if (mounted.current) setError((e as Error).message);
    }
  }

  function confirmDelete(item: FeedItem) {
    Alert.alert('Supprimer cette publication ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const snapshot = items;
          setItems((prev) => prev.filter((i) => i.id !== item.id)); // optimistic
          try {
            await feed.deletePost(item.id);
          } catch (e) {
            if (mounted.current) {
              setItems(snapshot);
              setError((e as Error).message);
            }
          }
        },
      },
    ]);
  }

  function moderate(item: FeedItem) {
    // Menu Signaler / Bloquer (App Store 1.2) — Alerts natifs, iOS-first.
    Alert.alert(`Publication de ${item.authorName}`, undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Signaler la publication',
        onPress: () =>
          Alert.alert('Signaler', 'Pourquoi signales-tu cette publication ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Contenu inapproprié', onPress: () => sendReport(item, 'Contenu inapproprié') },
            { text: 'Spam', onPress: () => sendReport(item, 'Spam') },
            { text: 'Harcèlement', onPress: () => sendReport(item, 'Harcèlement') },
          ]),
      },
      {
        text: `Bloquer ${item.authorName}`,
        style: 'destructive',
        onPress: () =>
          Alert.alert(`Bloquer ${item.authorName} ?`, 'Ses publications disparaîtront de ton fil et vos abonnements seront coupés.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Bloquer', style: 'destructive', onPress: () => blockAuthor(item.authorId) },
          ]),
      },
    ]);
  }

  async function sendReport(item: FeedItem, reason: string) {
    try {
      await moderation.report('post', item.id, reason);
      Alert.alert('Merci', 'Signalement transmis — on y jette un œil rapidement.');
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
  }

  async function blockAuthor(authorId: string) {
    setBlocked((prev) => [...new Set([...prev, authorId])]); // optimiste (le fil se filtre)
    try {
      await moderation.block(authorId);
    } catch (e) {
      if (mounted.current) {
        setBlocked((prev) => prev.filter((id) => id !== authorId));
        setError((e as Error).message);
      }
    }
  }

  function sharePost(item: FeedItem) {
    Share.share({
      message: `${item.authorName} sur Sport Together : ${item.summary} 💪`,
    }).catch(() => {});
  }

  const av = avatarColor(userId);

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.brand}>Aujourd’hui</Text>
        <Pressable
          onPress={() => onOpenProfile(userId, pseudo)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Mon profil"
        >
          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarText, { color: av.fg }]}>{initial(pseudo || 'T')}</Text>
          </View>
        </Pressable>
      </View>

      <LiveNow items={items} userId={userId} onOpenProfile={onOpenProfile} />

      <View style={styles.seg}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={styles.schip}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
            accessibilityLabel={t.label}
          >
            <Text style={[styles.schipText, tab === t.key && styles.schipTextOn]}>{t.label}</Text>
            {tab === t.key ? <View style={styles.schipUnderline} /> : null}
          </Pressable>
        ))}
      </View>

      <ScreenState loading={loading} error={error} hasData={items.length > 0} onRetry={reload}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
          ListHeaderComponent={
            tab === 'tout' ? (
              items.length === 0 ? (
                <LinearGradient colors={gradients.panel} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={styles.welcome}>
                  <Text style={styles.welcomeTitle}>Bienvenue, {pseudo || 'toi'} 👋</Text>
                  <Text style={styles.welcomeSub}>Publie ta première séance pour lancer ta progression.</Text>
                  <View style={styles.welcomeBullets}>
                    <Text style={styles.welcomeBullet}>⚡  Gagne de l&apos;XP à chaque publication</Text>
                    <Text style={styles.welcomeBullet}>🔥  Démarre ton streak</Text>
                    <Text style={styles.welcomeBullet}>🌳  Débloque un palier de ton arbre</Text>
                  </View>
                  <PrimaryButton title="Publier ma première séance" onPress={onOpenLog} />
                </LinearGradient>
              ) : (
                <Pressable style={styles.headerCard} onPress={() => onOpenProfile(userId, pseudo)}>
                  <YouStrip items={items} userId={userId} />
                </Pressable>
              )
            ) : tab === 'abonnements' ? (
              <Pressable
                onPress={onOpenDiscover}
                style={styles.discover}
                accessibilityRole="button"
                accessibilityLabel="Découvrir des gens à suivre"
              >
                <Ionicons name="search" size={18} color={colors.accent} />
                <Text style={styles.discoverText}>Découvrir des gens à suivre</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <FeedItemCard
              item={item}
              onToggleReaction={(kind) => toggleReaction(item, kind)}
              onPressAuthor={() => onOpenProfile(item.authorId, item.authorName)}
              onOpenComments={() => onOpenComments(item)}
              onOpenGroup={item.groupName ? () => onOpenGroup(item.groupId) : undefined}
              onShare={() => sharePost(item)}
              onDelete={item.authorId === userId ? () => confirmDelete(item) : undefined}
              onModerate={item.authorId !== userId ? () => moderate(item) : undefined}
              earnedXp={earnedByItem.get(item.id)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: 120 + insets.bottom }]}
          ListEmptyComponent={
            tab === 'abonnements' ? (
              <Pressable style={styles.emptyCta} onPress={onOpenDiscover} accessibilityRole="button" accessibilityLabel="Découvrir des gens à suivre">
                <Ionicons name="person-add-outline" size={22} color={colors.accent} />
                <Text style={styles.emptyCtaText}>Suis des gens pour voir leurs publications ici.</Text>
                <Text style={styles.emptyCtaLink}>Découvrir des gens →</Text>
              </Pressable>
            ) : tab === 'groupes' ? (
              <Pressable style={styles.emptyCta} onPress={onOpenGroups} accessibilityRole="button" accessibilityLabel="Rejoindre ou créer un groupe">
                <Ionicons name="people-outline" size={22} color={colors.accent} />
                <Text style={styles.emptyCtaText}>Rejoins un groupe d&apos;entraide pour voir son activité ici.</Text>
                <Text style={styles.emptyCtaLink}>Rejoindre un groupe →</Text>
              </Pressable>
            ) : null
          }
        />
      </ScreenState>

      {error && items.length > 0 ? (
        <Pressable
          style={[styles.banner, { bottom: 86 + insets.bottom }]}
          onPress={() => setError(null)}
          accessibilityRole="button"
          accessibilityLabel="Erreur, toucher pour masquer"
        >
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.bannerText}>Action impossible pour l’instant. Réessaie.</Text>
        </Pressable>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 10 },
  brand: { ...font.h1, fontSize: 24 },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  seg: { flexDirection: 'row', gap: 22, marginBottom: 10, paddingHorizontal: 4 },
  schip: { paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  schipText: { color: colors.textFaint, fontWeight: '600', fontSize: 14.5 },
  schipTextOn: { color: colors.text },
  schipUnderline: { position: 'absolute', left: 0, right: 0, bottom: 4, height: 3, borderRadius: 2, backgroundColor: colors.accent },
  headerCard: { marginBottom: 12 },
  welcome: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 12, marginBottom: 12, marginTop: 4 },
  welcomeTitle: { ...font.h1 },
  welcomeSub: { ...font.body, color: colors.textMuted },
  welcomeBullets: { gap: 8, marginVertical: 4 },
  welcomeBullet: { ...font.body },
  emptyCta: {
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    marginHorizontal: 8,
    padding: 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyCtaText: { color: colors.textMuted, textAlign: 'center', fontSize: 14 },
  emptyCtaLink: { color: colors.accent, fontWeight: '800', fontSize: 15 },
  discover: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  discoverText: { ...font.title, flex: 1 },
  list: { gap: 12, paddingTop: 4 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 30 },
  fabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: radius.pill,
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerText: { color: colors.text, fontSize: 14, flex: 1 },
});
