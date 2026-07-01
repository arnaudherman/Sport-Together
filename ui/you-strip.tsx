import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { FeedItem } from '@/domain/entities/feed';
import { levelProgress, xpFromFeed } from '@/domain/usecases/gamification';
import { weeklyQuests } from '@/domain/usecases/quests';
import { streakFromFeed } from '@/domain/usecases/streak';
import { Ring } from '@/ui/ring';
import { Surface } from '@/ui/surface';
import { colors, gradients } from '@/ui/theme';

const STREAK_RING_TARGET = 30; // l'anneau se remplit vers 30 jours de série

/**
 * Bandeau « toi » de l'accueil (DA v2 Obsidienne) : anneau de série + niveau +
 * barre d'XP fine + méta quêtes. Compact — le fil reste le héros de l'écran.
 */
export function YouStrip({ items, userId }: { items: FeedItem[]; userId: string }) {
  const tz = -new Date().getTimezoneOffset();
  const { streak, progress, quests } = useMemo(() => {
    const nowIso = new Date().toISOString();
    return {
      streak: streakFromFeed(items, userId, tz, nowIso),
      progress: levelProgress(xpFromFeed(items, userId, tz)),
      quests: weeklyQuests(items, userId, nowIso, tz),
    };
  }, [items, userId, tz]);

  const questsDone = quests.filter((q) => q.done).length;

  return (
    <Surface style={styles.card}>
      <View style={styles.row}>
        <Ring
          ratio={Math.min(1, streak / STREAK_RING_TARGET)}
          value={String(streak)}
          caption="jours"
          size={74}
        />
        <View style={styles.info}>
          <View style={styles.topline}>
            <Text style={styles.level}>Niveau {progress.level}</Text>
            <Text style={styles.xp}>
              {progress.into} <Text style={styles.xpFaint}>/ {progress.span} XP</Text>
            </Text>
          </View>
          <View style={styles.track}>
            <LinearGradient
              colors={gradients.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${Math.round(progress.ratio * 100)}%` as `${number}%` }]}
            />
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaText}>
              Série <Text style={styles.metaStrong}>{streak > 0 ? `${streak} j 🔥` : 'à lancer'}</Text>
            </Text>
            <Text style={styles.metaText}>
              Quêtes <Text style={styles.metaStrong}>{questsDone}/{quests.length}</Text>
            </Text>
          </View>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, paddingVertical: 16 },
  info: { flex: 1 },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  level: { fontSize: 15, fontWeight: '700', color: colors.text },
  xp: { fontSize: 12, color: colors.textMuted },
  xpFaint: { color: colors.textFaint },
  track: { height: 5, borderRadius: 3, backgroundColor: colors.track, marginTop: 8, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  meta: { flexDirection: 'row', gap: 14, marginTop: 9 },
  metaText: { fontSize: 11.5, color: colors.textMuted },
  metaStrong: { color: colors.text, fontWeight: '600' },
});
