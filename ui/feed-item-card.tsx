import { StyleSheet, Text, View } from 'react-native';

import type { FeedItem } from '@/domain/entities/feed';

const TYPE_LABEL: Record<FeedItem['type'], string> = {
  session: 'Séance',
  steps: 'Pas',
  meal: 'Repas',
};

/**
 * Composant présentationnel pur (ADR-0007) : reçoit ses données en props,
 * n'accède à aucune source de données.
 */
export function FeedItemCard({ item }: { item: FeedItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.author}>{item.authorName}</Text>
        <Text style={styles.badge}>{TYPE_LABEL[item.type]}</Text>
      </View>
      <Text style={styles.summary}>{item.summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F4F5F7',
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  author: { fontSize: 16, fontWeight: '600' },
  badge: { fontSize: 12, color: '#6B7280' },
  summary: { fontSize: 15 },
});
