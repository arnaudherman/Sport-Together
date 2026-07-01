import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EMPTY_REACTIONS, type FeedItem, type ReactionKind } from '@/domain/entities/feed';
import { xpForType } from '@/domain/usecases/gamification';
import { Avatar } from '@/ui/avatar';
import { handle, timeAgo } from '@/ui/format';
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
  onOpenGroup,
  onDelete,
}: {
  item: FeedItem;
  onToggleReaction?: (kind: ReactionKind) => void;
  onPressAuthor?: () => void;
  onOpenComments?: () => void;
  onOpenGroup?: () => void;
  onDelete?: () => void;
}) {
  const reactions = item.reactions ?? EMPTY_REACTIONS;

  return (
    <View style={styles.card}>
      <Pressable onPress={onPressAuthor} hitSlop={6}>
        <Avatar name={item.authorName} seed={item.authorId || item.authorName} size={42} />
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
                onOpenGroup ? (
                  <Pressable
                    onPress={onOpenGroup}
                    hitSlop={6}
                    style={styles.gbadge}
                    accessibilityRole="button"
                    accessibilityLabel={`Ouvrir le groupe ${item.groupName}`}
                  >
                    <Text style={styles.gbadgeText}>🔒 {item.groupName}</Text>
                  </Pressable>
                ) : (
                  <View style={styles.gbadge}>
                    <Text style={styles.gbadgeText}>🔒 {item.groupName}</Text>
                  </View>
                )
              ) : null}
            </View>
          </Pressable>
          <View style={styles.headRight}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{TYPE_LABEL[item.type]}</Text>
            </View>
            {onDelete ? (
              <Pressable
                onPress={onDelete}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                style={styles.menu}
                accessibilityRole="button"
                accessibilityLabel="Supprimer la publication"
              >
                <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <Pressable onPress={onOpenComments} accessibilityRole="button" accessibilityLabel="Voir la publication et les réponses">
          <Text style={styles.text}>{item.summary}</Text>
        </Pressable>

        <View style={styles.eng}>
          <Pressable
            style={styles.engItem}
            onPress={onOpenComments}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Répondre${(item.commentCount ?? 0) > 0 ? `, ${item.commentCount} réponses` : ''}`}
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
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                style={styles.engItem}
                accessibilityRole="button"
                accessibilityState={{ selected: mine }}
                accessibilityLabel={`${kind === 'kudos' ? 'Bravo' : 'Courage'}, ${count}`}
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
