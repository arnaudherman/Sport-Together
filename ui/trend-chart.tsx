import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { FeedItem } from '@/domain/entities/feed';
import { xpBreakdown } from '@/domain/usecases/gamification';
import { localDayKey, previousDayKey } from '@/domain/usecases/streak';
import { Surface } from '@/ui/surface';
import { colors, font } from '@/ui/theme';

const DAYS = 14;

/**
 * Graphique de tendance auto-créé (DA v2) : barres d'XP des 14 derniers jours,
 * dérivées de ce que l'utilisateur logge. Se remplit tout seul au fil des posts.
 */
export function TrendChart({ items, userId }: { items: FeedItem[]; userId: string }) {
  const tz = -new Date().getTimezoneOffset();
  const bars = useMemo(() => {
    const { byDay } = xpBreakdown(items, userId, tz);
    const keys: string[] = [];
    let cursor = localDayKey(new Date().toISOString(), tz);
    for (let i = 0; i < DAYS; i += 1) {
      keys.unshift(cursor);
      cursor = previousDayKey(cursor);
    }
    return keys.map((key) => ({ key, xp: byDay.get(key) ?? 0 }));
  }, [items, userId, tz]);

  const max = Math.max(40, ...bars.map((b) => b.xp));
  const total = bars.reduce((sum, b) => sum + b.xp, 0);

  return (
    <Surface>
      <View style={styles.pad}>
        <View style={styles.head}>
          <Text style={styles.label}>XP · 14 derniers jours</Text>
          <Text style={styles.total}>
            <Text style={styles.totalNum}>{total}</Text> XP
          </Text>
        </View>
        <View style={styles.chart} accessibilityLabel="Barres d'XP des 14 derniers jours">
          {bars.map((b, i) => (
            <View key={b.key} style={styles.barSlot}>
              <View
                style={[
                  styles.bar,
                  { height: Math.max(3, Math.round((b.xp / max) * 56)) },
                  b.xp > 0 && (i === bars.length - 1 ? styles.barToday : styles.barOn),
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.axis}>
          <Text style={styles.axisText}>il y a 14 j</Text>
          <Text style={styles.axisText}>aujourd’hui</Text>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingVertical: 14 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { ...font.label },
  total: { fontSize: 12, color: colors.textMuted },
  totalNum: { fontSize: 19, fontWeight: '200', letterSpacing: -0.5, color: colors.text },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 60, marginTop: 12 },
  barSlot: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-end' },
  bar: { borderRadius: 3, backgroundColor: colors.track },
  barOn: { backgroundColor: 'rgba(255,90,31,0.55)' },
  barToday: { backgroundColor: colors.accent },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  axisText: { fontSize: 10, color: colors.textFaint },
});
