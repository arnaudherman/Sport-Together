import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFeedRepository, useFollowRepository, useReactionRepository } from '@/core/di/repositories-context';
import { type FeedItem, type ReactionKind } from '@/domain/entities/feed';
import { withToggledReaction } from '@/domain/usecases/reaction-toggle';
import { PrimaryButton } from '@/ui/button';
import { avatarColor, initial } from '@/ui/format';
import { FeedItemCard } from '@/ui/feed-item-card';
import { filterFeed, type FeedTab } from '@/ui/feed-filter';
import { LevelHeader } from '@/ui/level-header';
import { QuestsStrip } from '@/ui/quests-strip';
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
  const [refreshing, setRefreshing] = useState(false);
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
  }, [followRepo, mounted]);

  async function refresh() {
    setRefreshing(true);
    await reload();
    if (mounted.current) setRefreshing(false);
  }

  const filtered = useMemo(() => filterFeed(items, tab, userId, following), [items, tab, userId, following]);

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

  function sharePost(item: FeedItem) {
    Share.share({
      message: `${item.authorName} sur Sport Together : ${item.summary} 💪`,
    }).catch(() => {});
  }

  const av = avatarColor(userId);

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.brand}>Accueil</Text>
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

      <View style={styles.seg}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.schip, tab === t.key && styles.schipOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
            accessibilityLabel={t.label}
          >
            <Text style={[styles.schipText, tab === t.key && styles.schipTextOn]}>{t.label}</Text>
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
                <LinearGradient colors={['#2c1d12', '#191411']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.welcome}>
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
                <View style={styles.headerCard}>
                  <Pressable onPress={() => onOpenProfile(userId, pseudo)}>
                    <LevelHeader pseudo={pseudo} userId={userId} items={items} />
                  </Pressable>
                  <QuestsStrip items={items} userId={userId} />
                </View>
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

      <Pressable
        style={({ pressed }) => [styles.fabWrap, { bottom: 20 + insets.bottom }, pressed && styles.fabPressed]}
        onPress={onOpenLog}
        accessibilityRole="button"
        accessibilityLabel="Publier une séance"
      >
        <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
          <Ionicons name="add" size={22} color={colors.onAccent} />
          <Text style={styles.fabText}>Publier</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 10 },
  brand: { ...font.h1, fontSize: 24 },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  seg: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  schip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  schipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  schipText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  schipTextOn: { color: colors.onAccent },
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
  fabPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  fab: { flexDirection: 'row', gap: 8, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  fabText: { ...font.title, color: colors.onAccent },
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
