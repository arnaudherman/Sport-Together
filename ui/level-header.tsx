import { useMemo } from 'react';
import { type DimensionValue, StyleSheet, Text, View } from 'react-native';

import type { FeedItem } from '@/domain/entities/feed';
import { levelProgress, xpFromFeed } from '@/domain/usecases/gamification';
import { streakFromFeed } from '@/domain/usecases/streak';
import { colors, font, radius } from '@/ui/theme';

/**
 * En-tête gamifié (DA) : avatar, pseudo, niveau, barre d'XP, streak. Progression
 * PERSONNELLE (pas de comparaison compétitive). Les valeurs sont dérivées du feed.
 */
export function LevelHeader({
  pseudo,
  userId,
  items,
}: {
  pseudo: string;
  userId: string;
  items: FeedItem[];
}) {
  const { xp, progress, streak } = useMemo(() => {
    const total = xpFromFeed(items, userId);
    const tz = -new Date().getTimezoneOffset();
    return {
      xp: total,
      progress: levelProgress(total),
      streak: streakFromFeed(items, userId, tz, new Date().toISOString()),
    };
  }, [items, userId]);

  const initial = (pseudo.trim().charAt(0) || 'T').toUpperCase();
  const pct = Math.round(progress.ratio * 100);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{pseudo || 'Toi'}</Text>
            <View style={styles.levelPill}>
              <Text style={styles.levelText}>Niveau {progress.level}</Text>
            </View>
          </View>
          <Text style={styles.sub}>
            <Text style={styles.subStrong}>{xp}</Text> XP
            {streak > 0 ? `   🔥 ${streak} j` : '   ✨ démarre ton streak'}
          </Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` as DimensionValue }]} />
      </View>
      <Text style={styles.barLabel}>
        {progress.into} / {progress.span} XP → Niveau {progress.level + 1}
      </Text>
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
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...font.title, color: colors.accent },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...font.h1 },
  levelPill: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelText: { fontSize: 12, fontWeight: '700', color: colors.text },
  sub: { ...font.body, color: colors.textMuted },
  subStrong: { color: colors.text, fontWeight: '800' },
  barTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.accent },
  barLabel: { ...font.label },
});
