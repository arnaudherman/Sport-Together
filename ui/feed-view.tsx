import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFeedRepository, useReactionRepository } from '@/core/di/repositories-context';
import type { FeedItem, ReactionKind } from '@/domain/entities/feed';
import { localDayKey } from '@/domain/usecases/streak';
import { avatarColor, dayBucketLabel, initial } from '@/ui/format';
import { FeedItemCard } from '@/ui/feed-item-card';
import { LevelHeader } from '@/ui/level-header';
import { ScreenState } from '@/ui/screen-state';
import { colors, font, radius } from '@/ui/theme';

type Tab = 'groupe' | 'amis';

/** Feed vivant (DA) : présence, activité groupée par jour, réactions (ADR-0002). */
export function FeedView({
  groupId,
  userId,
  pseudo,
  onOpenGroup,
  onOpenProfile,
  onOpenLog,
  onOpenSkills,
}: {
  groupId: string;
  userId: string;
  pseudo: string;
  onOpenGroup: () => void;
  onOpenProfile: (id: string, name: string) => void;
  onOpenLog: () => void;
  onOpenSkills: () => void;
}) {
  const feed = useFeedRepository();
  const reactionRepo = useReactionRepository();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('groupe');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await feed.listGroupFeed(groupId);
      if (mounted.current) {
        setItems(data);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [feed, groupId]);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    if (mounted.current) setRefreshing(false);
  }

  const sections = useMemo(() => {
    const tz = -new Date().getTimezoneOffset();
    const today = localDayKey(new Date().toISOString(), tz);
    const out: { title: string; data: FeedItem[] }[] = [];
    for (const it of items) {
      const label = dayBucketLabel(it.createdAt, tz, today);
      const last = out[out.length - 1];
      if (last && last.title === label) last.data.push(it);
      else out.push({ title: label, data: [it] });
    }
    return out;
  }, [items]);

  const presence = useMemo(() => {
    const seen = new Map<string, string>();
    for (const it of items) {
      if (it.authorId && it.authorId !== userId && !seen.has(it.authorId)) {
        seen.set(it.authorId, it.authorName);
      }
      if (seen.size >= 6) break;
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [items, userId]);

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

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Accueil</Text>
        <Pressable
          onPress={onOpenGroup}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.linkRow}
        >
          <Ionicons name="people" size={16} color={colors.textMuted} />
          <Text style={styles.link}>Groupe</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('groupe')} style={[styles.tab, tab === 'groupe' && styles.tabOn]}>
          <Text style={[styles.tabText, tab === 'groupe' && styles.tabTextOn]}>Groupe</Text>
        </Pressable>
        <Pressable onPress={() => setTab('amis')} style={[styles.tab, tab === 'amis' && styles.tabOn]}>
          <Text style={[styles.tabText, tab === 'amis' && styles.tabTextOn]}>Amis</Text>
        </Pressable>
      </View>

      {tab === 'amis' ? (
        <View style={styles.friendsEmpty}>
          <Text style={styles.friendsEmojiG}>👥</Text>
          <Text style={styles.friendsText}>
            Suis des amis au-delà de ton groupe pour voir leur activité ici. (bientôt)
          </Text>
        </View>
      ) : (
        <ScreenState loading={loading} error={error} hasData={items.length > 0} onRetry={load}>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />
            }
            renderItem={({ item }) => (
              <FeedItemCard
                item={item}
                onToggleReaction={(kind) => toggleReaction(item, kind)}
                onPressAuthor={() => onOpenProfile(item.authorId, item.authorName)}
              />
            )}
            renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={[styles.list, { paddingBottom: 120 + insets.bottom }]}
            ListHeaderComponent={
              <View style={styles.head}>
                <Pressable onPress={onOpenSkills}>
                  <LevelHeader pseudo={pseudo} userId={userId} items={items} />
                  <Text style={styles.progressLink}>Voir ma progression ›</Text>
                </Pressable>
                {presence.length > 0 ? (
                  <View>
                    <Text style={styles.presenceLabel}>Dernières activités</Text>
                    <View style={styles.presenceRow}>
                      {presence.map((p) => {
                        const av = avatarColor(p.id);
                        return (
                          <Pressable key={p.id} style={styles.presenceItem} onPress={() => onOpenProfile(p.id, p.name)}>
                            <View style={[styles.presenceAvatar, { backgroundColor: av.bg }]}>
                              <Text style={[styles.presenceInitial, { color: av.fg }]}>{initial(p.name)}</Text>
                            </View>
                            <Text style={styles.presenceName} numberOfLines={1}>{p.name}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>
            }
            ListEmptyComponent={<Text style={styles.empty}>Aucun goal pour l'instant — logge le premier 💪</Text>}
          />
        </ScreenState>
      )}

      <Pressable style={[styles.fabWrap, { bottom: 20 + insets.bottom }]} onPress={onOpenLog}>
        <LinearGradient
          colors={['#F58A4C', '#F0652F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Ionicons name="add" size={22} color="#0B0B0D" />
          <Text style={styles.fabText}>Logger</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  title: { ...font.h1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { fontSize: 14, color: colors.textMuted, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  tabTextOn: { color: '#0B0B0D' },
  head: { gap: 14, paddingTop: 10, paddingBottom: 6 },
  progressLink: { fontSize: 13, color: colors.textMuted, fontWeight: '700', textAlign: 'right', marginTop: 8 },
  presenceLabel: { ...font.label, marginBottom: 10 },
  presenceRow: { flexDirection: 'row', gap: 16 },
  presenceItem: { alignItems: 'center', width: 52 },
  presenceAvatar: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  presenceInitial: { fontSize: 16, fontWeight: '800' },
  presenceName: { fontSize: 11, color: colors.textFaint, marginTop: 4 },
  section: { ...font.label, marginTop: 18, marginBottom: 10 },
  list: { gap: 12 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  friendsEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  friendsEmojiG: { fontSize: 40 },
  friendsText: { color: colors.textMuted, textAlign: 'center', fontSize: 15, lineHeight: 22 },
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
  fab: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { ...font.title, color: '#0B0B0D' },
});
