import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { FeedItem } from '@/domain/entities/feed';
import { streakFromFeed } from '@/domain/usecases/streak';

/**
 * Affiche le streak personnel (vision §3). Cadrage POSITIF et non punitif (§8) :
 * à 0, on encourage à démarrer plutôt que de pointer un échec.
 */
export function StreakBadge({ items, userId }: { items: FeedItem[]; userId: string }) {
  const streak = useMemo(
    () =>
      streakFromFeed(
        items,
        userId,
        -new Date().getTimezoneOffset(),
        new Date().toISOString(),
      ),
    [items, userId],
  );

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>
        {streak > 0
          ? `🔥 ${streak} ${streak > 1 ? 'jours' : 'jour'} d'affilée`
          : '✨ Logge un goal pour démarrer ton streak'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  text: { fontSize: 14, fontWeight: '600', color: '#92400E' },
});
