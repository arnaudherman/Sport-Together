import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { FeedItem } from '@/domain/entities/feed';
import { Avatar } from '@/ui/avatar';
import { timeAgo } from '@/ui/format';
import { colors, font } from '@/ui/theme';

const WINDOW_MS = 60 * 60_000; // activité de la dernière heure

const LIVE_LABEL: Record<FeedItem['type'], string> = {
  session: 'en séance',
  steps: 'en marche',
  meal: 'à table',
  rest: 'en récup',
  sleep: 'a bien dormi',
};

/**
 * « En ce moment » (DA v2) : rail horizontal de l'activité de la dernière heure —
 * voir ce que les gens font en direct. Dérivé du fil (le Realtime s'y branchera).
 */
export function LiveNow({
  items,
  userId,
  onOpenProfile,
}: {
  items: FeedItem[];
  userId: string;
  onOpenProfile: (id: string, name: string) => void;
}) {
  const live = useMemo(() => {
    const cutoff = Date.now() - WINDOW_MS;
    const seen = new Set<string>();
    return items
      .filter((it) => new Date(it.createdAt).getTime() >= cutoff && it.authorId !== userId)
      .filter((it) => {
        if (seen.has(it.authorId)) return false;
        seen.add(it.authorId);
        return true;
      })
      .slice(0, 10);
  }, [items, userId]);

  if (live.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.dot} />
        <Text style={styles.label}>En ce moment</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {live.map((it) => (
          <Pressable
            key={it.id}
            style={styles.person}
            onPress={() => onOpenProfile(it.authorId, it.authorName)}
            accessibilityRole="button"
            accessibilityLabel={`${it.authorName} ${LIVE_LABEL[it.type]}, ${timeAgo(it.createdAt)}`}
          >
            <View style={styles.avatarRing}>
              <Avatar name={it.authorName} seed={it.authorId} size={48} url={it.authorAvatarUrl} />
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {it.authorName}
            </Text>
            <Text style={styles.doing} numberOfLines={1}>
              {LIVE_LABEL[it.type]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4, marginBottom: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  label: { ...font.label, color: colors.textMuted },
  rail: { gap: 14, paddingHorizontal: 4, paddingBottom: 4 },
  person: { alignItems: 'center', width: 64 },
  avatarRing: {
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.success,
    padding: 2,
  },
  name: { fontSize: 11.5, fontWeight: '600', color: colors.text, marginTop: 5 },
  doing: { fontSize: 10, color: colors.textMuted },
});
