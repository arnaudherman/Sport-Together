import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EMPTY_REACTIONS, type FeedItem, type ReactionKind } from '@/domain/entities/feed';
import { xpForType } from '@/domain/usecases/gamification';
import { avatarColor, handle, initial, timeAgo } from '@/ui/format';
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

/** Post type Twitter (DA) : composant présentationnel pur (ADR-0007). */
export function FeedItemCard({
  item,
  onToggleReaction,
  onPressAuthor,
  onOpenComments,
  onDelete,
}: {
  item: FeedItem;
  onToggleReaction?: (kind: ReactionKind) => void;
  onPressAuthor?: () => void;
  onOpenComments?: () => void;
  onDelete?: () => void;
}) {
  const reactions = item.reactions ?? EMPTY_REACTIONS;
  const av = avatarColor(item.authorId || item.authorName);

  return (
    <View style={styles.card}>
      <Pressable onPress={onPressAuthor} hitSlop={6}>
        <View style={[styles.avatar, { backgroundColor: av.bg }]}>
          <Text style={[styles.avatarText, { color: av.fg }]}>{initial(item.authorName)}</Text>
        </View>
      </Pressable>

      <View style={styles.body}>
        <View style={styles.head}>
          <Pressable style={styles.who} onPress={onPressAuthor} hitSlop={6}>
            <Text style={styles.name} numberOfLines={1}>{item.authorName}</Text>
            <View style={styles.handleRow}>
              <Text style={styles.handle} numberOfLines={1}>
                {handle(item.authorName)} · {timeAgo(item.createdAt)}
              </Text>
              {item.groupName ? (
                <View style={styles.gbadge}>
                  <Text style={styles.gbadgeText}>🔒 {item.groupName}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
          <View style={styles.headRight}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{TYPE_LABEL[item.type]}</Text>
            </View>
            {onDelete ? (
              <Pressable onPress={onDelete} hitSlop={10} style={styles.menu}>
                <Ionicons name="ellipsis-horizontal" size={16} color={colors.textFaint} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={styles.text}>{item.summary}</Text>

        <View style={styles.eng}>
          <Pressable
            style={styles.engItem}
            onPress={onOpenComments}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
            {(item.commentCount ?? 0) > 0 ? (
              <Text style={styles.engCount}>{item.commentCount}</Text>
            ) : null}
          </Pressable>
          {REACTIONS.map(({ kind, emoji }) => {
            const mine = reactions.mine.includes(kind);
            const count = kind === 'kudos' ? reactions.kudos : reactions.encouragement;
            return (
              <Pressable
                key={kind}
                onPress={() => onToggleReaction?.(kind)}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                style={styles.engItem}
              >
                <Text style={[styles.engEmoji, mine && styles.engActive]}>{emoji}</Text>
                <Text style={[styles.engCount, mine && styles.engActive]}>{count}</Text>
              </Pressable>
            );
          })}
          <View style={styles.spacer} />
          <Text style={styles.xp}>+{xpForType(item.type)} XP</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  avatar: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800' },
  body: { flex: 1, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menu: { padding: 2 },
  who: { flex: 1 },
  name: { ...font.title, fontWeight: '800' },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  handle: { fontSize: 13, color: colors.textMuted },
  gbadge: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1 },
  gbadgeText: { fontSize: 10, fontWeight: '700', color: colors.accent },
  badge: { backgroundColor: colors.surfaceElevated, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  text: { ...font.body, marginTop: 2 },
  eng: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 8 },
  engItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  engEmoji: { fontSize: 15 },
  engCount: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
  engActive: { color: colors.accent },
  spacer: { flex: 1 },
  xp: { fontSize: 13, fontWeight: '800', color: colors.accent },
});
