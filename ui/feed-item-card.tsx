import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EMPTY_REACTIONS, type FeedItem, type ReactionKind } from '@/domain/entities/feed';
import { xpForType } from '@/domain/usecases/gamification';
import { Avatar } from '@/ui/avatar';
import { handle, timeAgo } from '@/ui/format';
import { Surface } from '@/ui/surface';
import { colors, font, radius } from '@/ui/theme';

const TYPE_LABEL: Record<FeedItem['type'], string> = {
  session: 'Séance',
  steps: 'Pas',
  meal: 'Repas',
  rest: 'Repos',
};

const REACTIONS: { kind: ReactionKind; emoji: string }[] = [
  { kind: 'kudos', emoji: '👏' },
  { kind: 'encouragement', emoji: '💪' },
];

/** Post du fil (DA v2 Obsidienne) : Surface sans bordure, photo, chiffres fins. */
export function FeedItemCard({
  item,
  onToggleReaction,
  onPressAuthor,
  onOpenComments,
  onOpenGroup,
  onShare,
  onDelete,
  onModerate,
  earnedXp,
}: {
  item: FeedItem;
  onToggleReaction?: (kind: ReactionKind) => void;
  onPressAuthor?: () => void;
  onOpenComments?: () => void;
  onOpenGroup?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  /** XP réellement gagné par CE post (moteur v2) — fallback : XP de base du type. */
  earnedXp?: number;
  /** Menu Signaler / Bloquer sur les publications d'AUTRUI (App Store 1.2). */
  onModerate?: () => void;
}) {
  const reactions = item.reactions ?? EMPTY_REACTIONS;
  const isRest = item.type === 'rest';

  // Post « repos » : carte compacte, ton Récup apaisé (jamais culpabilisant).
  if (isRest) {
    return (
      <Surface>
        <View style={[styles.pad, styles.restRow]}>
          <Pressable onPress={onPressAuthor} hitSlop={6}>
            <Avatar name={item.authorName} seed={item.authorId || item.authorName} size={34} />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.name}>
              {item.authorName}{' '}
              <Text style={styles.meta}>
                {handle(item.authorName)} · {timeAgo(item.createdAt)}
              </Text>
            </Text>
            <Text style={styles.restText}>Jour de repos — série protégée 😴</Text>
          </View>
          <Text style={styles.recup}>● Récup</Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface>
      <View style={styles.pad}>
        <View style={styles.head}>
          <Pressable onPress={onPressAuthor} hitSlop={6}>
            <Avatar name={item.authorName} seed={item.authorId || item.authorName} size={34} />
          </Pressable>
          <Pressable style={styles.flex} onPress={onPressAuthor} hitSlop={6}>
            <Text style={styles.name} numberOfLines={1}>
              {item.authorName}{' '}
              <Text style={styles.meta}>
                {handle(item.authorName)} · {timeAgo(item.createdAt)}
              </Text>
            </Text>
            {item.groupName ? (
              <Pressable onPress={onOpenGroup} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Ouvrir le groupe ${item.groupName}`}>
                <Text style={styles.gbadge}>🔒 {item.groupName}</Text>
              </Pressable>
            ) : null}
          </Pressable>
          <Text style={styles.type}>{TYPE_LABEL[item.type]}</Text>
          {onDelete ? (
            <Pressable onPress={onDelete} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} accessibilityRole="button" accessibilityLabel="Supprimer la publication">
              <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
            </Pressable>
          ) : onModerate ? (
            <Pressable onPress={onModerate} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} accessibilityRole="button" accessibilityLabel="Signaler ou bloquer">
              <Ionicons name="ellipsis-horizontal" size={16} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>

        {item.photoUrl ? (
          <Pressable onPress={onOpenComments}>
            <Image source={{ uri: item.photoUrl }} style={styles.photo} contentFit="cover" transition={200} />
          </Pressable>
        ) : null}

        <Pressable onPress={onOpenComments} accessibilityRole="button" accessibilityLabel="Voir la publication et les réponses">
          <Text style={styles.text}>{item.summary}</Text>
        </Pressable>

        <View style={styles.eng}>
          <Text style={styles.xpNum}>
            +{earnedXp ?? xpForType(item.type)} <Text style={styles.xpUnit}>XP</Text>
          </Text>
          <View style={styles.flex} />
          <Pressable
            style={styles.engItem}
            onPress={onOpenComments}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Répondre${(item.commentCount ?? 0) > 0 ? `, ${item.commentCount} réponses` : ''}`}
          >
            <Ionicons name="chatbubble-outline" size={15} color={colors.textMuted} />
            {(item.commentCount ?? 0) > 0 ? <Text style={styles.engCount}>{item.commentCount}</Text> : null}
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
                <Text style={[styles.engEmoji, !mine && styles.engDim]}>{emoji}</Text>
                <Text style={[styles.engCount, mine && styles.engOn]}>{count}</Text>
              </Pressable>
            );
          })}
          {onShare ? (
            <Pressable
              style={styles.engItem}
              onPress={onShare}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Partager la publication"
            >
              <Ionicons name="share-outline" size={15} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingVertical: 14 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12.5, fontWeight: '400', color: colors.textFaint },
  gbadge: { fontSize: 10.5, fontWeight: '700', color: colors.accent, marginTop: 2 },
  type: { fontSize: 11, color: colors.textMuted, backgroundColor: colors.track, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9, overflow: 'hidden' },
  photo: { width: '100%', height: 150, borderRadius: radius.md, marginTop: 12 },
  text: { ...font.body, fontSize: 15, marginTop: 11 },
  eng: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
  xpNum: { fontSize: 19, fontWeight: '200', letterSpacing: -0.5, color: colors.accent },
  xpUnit: { fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.5 },
  engItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  engEmoji: { fontSize: 14 },
  engDim: { opacity: 0.55 },
  engCount: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600' },
  engOn: { color: colors.accent, fontWeight: '700' },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  restText: { fontSize: 13.5, color: colors.textMuted, marginTop: 2 },
  recup: { fontSize: 11.5, color: colors.success, fontWeight: '600' },
});
