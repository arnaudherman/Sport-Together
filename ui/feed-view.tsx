import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { useFeedRepository, useReactionRepository } from '@/core/di/repositories-context';
import type { FeedItem, ReactionKind } from '@/domain/entities/feed';
import { localDayKey } from '@/domain/usecases/streak';
import { avatarColor, dayBucketLabel, initial } from '@/ui/format';
import { FeedItemCard } from '@/ui/feed-item-card';
import { LevelHeader } from '@/ui/level-header';
import { LogGoal } from '@/ui/log-goal';
import { colors, font, radius } from '@/ui/theme';

type Tab = 'groupe' | 'amis';

/** Feed vivant (DA) : présence, activité groupée par jour, réactions (ADR-0002). */
export function FeedView({
  groupId,
  userId,
  pseudo,
  onOpenGroup,
}: {
  groupId: string;
  userId: string;
  pseudo: string;
  onOpenGroup: () => void;
}) {
  const feed = useFeedRepository();
  const reactionRepo = useReactionRepository();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
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
    }
  }, [feed, groupId]);

  useEffect(() => {
    load();
  }, [load]);

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
        <Pressable onPress={onOpenGroup} hitSlop={8}>
          <Text style={styles.link}>👥 Groupe</Text>
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FeedItemCard item={item} onToggleReaction={(kind) => toggleReaction(item, kind)} />
          )}
          renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.head}>
              <LevelHeader pseudo={pseudo} userId={userId} items={items} />
              {presence.length > 0 ? (
                <View>
                  <Text style={styles.presenceLabel}>Dernières activités</Text>
                  <View style={styles.presenceRow}>
                    {presence.map((p) => {
                      const av = avatarColor(p.id);
                      return (
                        <View key={p.id} style={styles.presenceItem}>
                          <View style={[styles.presenceAvatar, { backgroundColor: av.bg }]}>
                            <Text style={[styles.presenceInitial, { color: av.fg }]}>{initial(p.name)}</Text>
                            <View style={styles.presenceDot} />
                          </View>
                          <Text style={styles.presenceName} numberOfLines={1}>{p.name}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}
              <LogGoal groupId={groupId} onLogged={load} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>Aucun goal pour l'instant — logge le premier 💪</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  title: { ...font.h1 },
  link: { fontSize: 14, color: colors.accent, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  tabTextOn: { color: '#0B0B0D' },
  head: { gap: 14, paddingTop: 10, paddingBottom: 6 },
  presenceLabel: { ...font.label, marginBottom: 10 },
  presenceRow: { flexDirection: 'row', gap: 16 },
  presenceItem: { alignItems: 'center', width: 52 },
  presenceAvatar: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  presenceInitial: { fontSize: 16, fontWeight: '800' },
  presenceDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  presenceName: { fontSize: 11, color: colors.textFaint, marginTop: 4 },
  section: { ...font.label, marginTop: 18, marginBottom: 10 },
  list: { paddingBottom: 32, gap: 12 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  error: { color: '#FCA5A5', fontSize: 14 },
  friendsEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  friendsEmojiG: { fontSize: 40 },
  friendsText: { color: colors.textMuted, textAlign: 'center', fontSize: 15, lineHeight: 22 },
});
