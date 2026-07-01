import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EMPTY_REACTIONS, type FeedItem, type ReactionKind } from '@/domain/entities/feed';
import { xpForType } from '@/domain/usecases/gamification';
import { avatarColor, initial, timeAgo } from '@/ui/format';
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
  onPressAuthor,
}: {
  item: FeedItem;
  onToggleReaction?: (kind: ReactionKind) => void;
  onPressAuthor?: () => void;
}) {
  const reactions = item.reactions ?? EMPTY_REACTIONS;
  const av = avatarColor(item.authorId || item.authorName);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable style={styles.authorRow} onPress={onPressAuthor} hitSlop={6}>
          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarText, { color: av.fg }]}>{initial(item.authorName)}</Text>
          </View>
          <Text style={styles.author}>{item.authorName}</Text>
        </Pressable>
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>

      <View style={styles.metaRow}>
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
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
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
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800' },
  author: { ...font.title },
  time: { fontSize: 12, color: colors.textFaint },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  chipActive: { backgroundColor: colors.accentSoft },
  chipText: { fontSize: 14, color: colors.textMuted },
  chipTextActive: { color: colors.accent, fontWeight: '700' },
});
