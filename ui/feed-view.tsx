import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFeedRepository, useFollowRepository, useReactionRepository } from '@/core/di/repositories-context';
import type { FeedItem, ReactionKind } from '@/domain/entities/feed';
import { avatarColor, initial } from '@/ui/format';
import { FeedItemCard } from '@/ui/feed-item-card';
import { ScreenState } from '@/ui/screen-state';
import { colors, font, radius } from '@/ui/theme';

type Tab = 'tout' | 'abonnements' | 'groupes';

const TABS: { key: Tab; label: string }[] = [
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
}: {
  userId: string;
  pseudo: string;
  onOpenProfile: (id: string, name: string) => void;
  onOpenLog: () => void;
  onOpenComments: (item: FeedItem) => void;
}) {
  const feed = useFeedRepository();
  const reactionRepo = useReactionRepository();
  const followRepo = useFollowRepository();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('tout');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await feed.listHomeFeed();
      if (mounted.current) {
        setItems(data);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [feed]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    followRepo
      .listFollowing()
      .then((f) => {
        if (mounted.current) setFollowing(f);
      })
      .catch(() => {});
  }, [followRepo]);

  async function refresh() {
    setRefreshing(true);
    await load();
    if (mounted.current) setRefreshing(false);
  }

  const filtered = useMemo(() => {
    if (tab === 'abonnements') return items.filter((i) => following.includes(i.authorId));
    if (tab === 'groupes') return items.filter((i) => !!i.groupName);
    return items;
  }, [items, tab, following]);

  async function toggleReaction(item: FeedItem, kind: ReactionKind) {
    const active = (item.reactions?.mine ?? []).includes(kind);
    try {
      if (active) await reactionRepo.remove(item.id, kind);
      else await reactionRepo.add(item.id, kind);
      await load();
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
  }

  const av = avatarColor(userId);

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.brand}>Accueil</Text>
        <Pressable onPress={() => onOpenProfile(userId, pseudo)} hitSlop={8}>
          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarText, { color: av.fg }]}>{initial(pseudo || 'T')}</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.seg}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.schip, tab === t.key && styles.schipOn]}>
            <Text style={[styles.schipText, tab === t.key && styles.schipTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScreenState loading={loading} error={error} hasData={items.length > 0} onRetry={load}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <FeedItemCard
              item={item}
              onToggleReaction={(kind) => toggleReaction(item, kind)}
              onPressAuthor={() => onOpenProfile(item.authorId, item.authorName)}
              onOpenComments={() => onOpenComments(item)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: 120 + insets.bottom }]}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'abonnements'
                ? 'Suis des gens pour voir leurs posts ici.'
                : tab === 'groupes'
                  ? "Rejoins un groupe pour voir son activité ici."
                  : 'Rien pour l\'instant — publie ta première séance 💪'}
            </Text>
          }
        />
      </ScreenState>

      <Pressable style={[styles.fabWrap, { bottom: 20 + insets.bottom }]} onPress={onOpenLog}>
        <LinearGradient colors={['#F58A4C', '#F0652F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
          <Ionicons name="add" size={22} color="#0B0B0D" />
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
    paddingVertical: 9,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  schipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  schipText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  schipTextOn: { color: '#0B0B0D' },
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
  fab: { flexDirection: 'row', gap: 8, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  fabText: { ...font.title, color: '#0B0B0D' },
});
