import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EMPTY_REACTIONS, type FeedItem, type ReactionKind } from '@/domain/entities/feed';
import { xpForType } from '@/domain/usecases/gamification';
import { colors, font, radius } from '@/ui/theme';

const TYPE_LABEL: Record<FeedItem['type'], string> = {
  session: 'Séance',
  steps: 'Pas',
  meal: 'Repas',
};

const REACTIONS: { kind: ReactionKind; emoji: string }[] = [
  { kind: 'kudos', emoji: '👏' },
  { kind: 'encouragement', emoji: '💪' },
];

/** Carte de feed (DA) : composant présentationnel pur (ADR-0007). */
export function FeedItemCard({
  item,
  onToggleReaction,
}: {
  item: FeedItem;
  onToggleReaction?: (kind: ReactionKind) => void;
}) {
  const reactions = item.reactions ?? EMPTY_REACTIONS;
  const initial = (item.authorName.trim().charAt(0) || '?').toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.author}>{item.authorName}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{TYPE_LABEL[item.type]}</Text>
        </View>
        <Text style={styles.xp}>+{xpForType(item.type)} XP</Text>
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  author: { ...font.title, flex: 1 },
  badge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  xp: { fontSize: 13, fontWeight: '800', color: colors.accent },
  summary: { ...font.body },
  reactions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  chipActive: { backgroundColor: colors.accentSoft },
  chipText: { fontSize: 14, color: colors.textMuted },
  chipTextActive: { color: colors.accent, fontWeight: '700' },
});
