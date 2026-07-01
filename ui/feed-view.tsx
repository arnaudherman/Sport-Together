import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useFeedRepository, useReactionRepository } from '@/core/di/repositories-context';
import type { FeedItem, ReactionKind } from '@/domain/entities/feed';
import { FeedItemCard } from '@/ui/feed-item-card';
import { LevelHeader } from '@/ui/level-header';
import { LogGoal } from '@/ui/log-goal';
import { colors, font } from '@/ui/theme';

/** Feed du groupe en DA : header gamifié + log + réactions (boucle core, ADR-0002). */
export function FeedView({
  groupId,
  userId,
  pseudo,
  onChangeGroup,
}: {
  groupId: string;
  userId: string;
  pseudo: string;
  onChangeGroup: () => void;
}) {
  const feed = useFeedRepository();
  const reactionRepo = useReactionRepository();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
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
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedItemCard item={item} onToggleReaction={(kind) => toggleReaction(item, kind)} />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.head}>
            <View style={styles.topRow}>
              <Text style={styles.title}>Feed du groupe</Text>
              <Pressable onPress={onChangeGroup} hitSlop={8}>
                <Text style={styles.link}>Changer</Text>
              </Pressable>
            </View>
            <LevelHeader pseudo={pseudo} userId={userId} items={items} />
            <LogGoal groupId={groupId} onLogged={load} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Aucun goal pour l'instant — logge le premier 💪</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  head: { gap: 14, paddingTop: 8, paddingBottom: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...font.h1 },
  link: { fontSize: 15, color: colors.accent, fontWeight: '700' },
  list: { gap: 12, paddingBottom: 32 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  error: { color: '#FCA5A5', fontSize: 14 },
});
