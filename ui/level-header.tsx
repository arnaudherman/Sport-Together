import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { type DimensionValue, StyleSheet, Text, View } from 'react-native';

import type { FeedItem } from '@/domain/entities/feed';
import { levelProgress, xpFromFeed } from '@/domain/usecases/gamification';
import { streakFromFeed } from '@/domain/usecases/streak';
import { initial } from '@/ui/format';
import { colors, font, radius } from '@/ui/theme';

/**
 * En-tête gamifié (DA) : carte dégradée cinématique, avatar, niveau, barre d'XP,
 * streak. Progression PERSONNELLE (pas de comparaison compétitive).
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

  const pct = Math.round(progress.ratio * 100);

  return (
    <LinearGradient
      colors={['#2c1d12', '#191411']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial(pseudo || 'T')}</Text>
          </View>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{pseudo || 'Toi'}</Text>
            <View style={styles.levelPill}>
              <Text style={styles.levelText}>Niveau {progress.level}</Text>
            </View>
          </View>
          <View style={styles.subRow}>
            <Text style={styles.subStrong}>{xp}</Text>
            <Text style={styles.sub}> XP</Text>
            {streak > 0 ? (
              <View style={styles.streak}>
                <Ionicons name="flame" size={14} color={colors.accent} />
                <Text style={styles.streakText}>{streak} j</Text>
              </View>
            ) : (
              <Text style={styles.streakSoft}>  démarre ton streak</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.barTrack}>
        <LinearGradient
          colors={['#F58A4C', '#F0652F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.barFill, { width: `${pct}%` as DimensionValue }]}
        />
      </View>
      <Text style={styles.barLabel}>
        {progress.into} / {progress.span} XP → Niveau {progress.level + 1}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: colors.accent },
  info: { flex: 1, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...font.h1 },
  levelPill: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelText: { fontSize: 12, fontWeight: '700', color: colors.text },
  subRow: { flexDirection: 'row', alignItems: 'center' },
  sub: { ...font.body, color: colors.textMuted },
  subStrong: { fontSize: 15, color: colors.text, fontWeight: '800' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 12 },
  streakText: { color: colors.accent, fontWeight: '800', fontSize: 14 },
  streakSoft: { color: colors.textMuted, fontSize: 14 },
  barTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    overflow: 'hidden',
  },
  barFill: { height: 10, borderRadius: radius.pill },
  barLabel: { ...font.label },
});
