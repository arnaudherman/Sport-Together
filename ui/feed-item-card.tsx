import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EMPTY_REACTIONS, type FeedItem, type ReactionKind } from '@/domain/entities/feed';

const TYPE_LABEL: Record<FeedItem['type'], string> = {
  session: 'Séance',
  steps: 'Pas',
  meal: 'Repas',
};

const REACTIONS: { kind: ReactionKind; emoji: string }[] = [
  { kind: 'kudos', emoji: '👏' },
  { kind: 'encouragement', emoji: '💪' },
];

/**
 * Composant présentationnel pur (ADR-0007) : reçoit ses données et un callback,
 * n'accède à aucune source de données.
 */
export function FeedItemCard({
  item,
  onToggleReaction,
}: {
  item: FeedItem;
  onToggleReaction?: (kind: ReactionKind) => void;
}) {
  const reactions = item.reactions ?? EMPTY_REACTIONS;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.author}>{item.authorName}</Text>
        <Text style={styles.badge}>{TYPE_LABEL[item.type]}</Text>
      </View>
      <Text style={styles.summary}>{item.summary}</Text>

      <View style={styles.reactions}>
        {REACTIONS.map(({ kind, emoji }) => {
          const mine = reactions.mine.includes(kind);
          const count = kind === 'kudos' ? reactions.kudos : reactions.encouragement;
          return (
            <Pressable
              key={kind}
              onPress={() => onToggleReaction?.(kind)}
              style={[styles.chip, mine && styles.chipActive]}
            >
              <Text style={[styles.chipText, mine && styles.chipTextActive]}>
                {emoji} {count}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F4F5F7',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  author: { fontSize: 16, fontWeight: '600' },
  badge: { fontSize: 12, color: '#6B7280' },
  summary: { fontSize: 15 },
  reactions: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#DBEAFE' },
  chipText: { fontSize: 14, color: '#374151' },
  chipTextActive: { color: '#1D4ED8', fontWeight: '600' },
});
