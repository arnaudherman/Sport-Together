import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useFeedRepository, useReactionRepository } from '@/core/di/repositories-context';
import type { FeedItem, ReactionKind } from '@/domain/entities/feed';
import { FeedItemCard } from '@/ui/feed-item-card';
import { LogGoal } from '@/ui/log-goal';

/** Feed du groupe + log d'un goal + réactions (la boucle core, ADR-0002). */
export function FeedView({ groupId }: { groupId: string }) {
  const feed = useFeedRepository();
  const reactionRepo = useReactionRepository();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await feed.listGroupFeed(groupId));
    } catch (e) {
      setError((e as Error).message);
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
      setError((e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feed du groupe</Text>

      <LogGoal groupId={groupId} onLogged={load} />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedItemCard item={item} onToggleReaction={(kind) => toggleReaction(item, kind)} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Aucun goal pour l'instant.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '700', paddingVertical: 12 },
  list: { gap: 12, paddingBottom: 24 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 24 },
  error: { color: '#DC2626', fontSize: 14, marginBottom: 8 },
});
