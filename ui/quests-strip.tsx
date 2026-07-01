import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { type DimensionValue, StyleSheet, Text, View } from 'react-native';

import type { FeedItem } from '@/domain/entities/feed';
import { weeklyQuests } from '@/domain/usecases/quests';
import { colors, font, radius } from '@/ui/theme';

/** Quêtes hebdo perso (DA) : objectifs cochables dérivés du feed, sous le LevelHeader. */
export function QuestsStrip({ items, userId }: { items: FeedItem[]; userId: string }) {
  const tz = -new Date().getTimezoneOffset();
  const quests = useMemo(() => weeklyQuests(items, userId, new Date().toISOString(), tz), [items, userId, tz]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.head}>Quêtes de la semaine</Text>
      {quests.map((q) => {
        const pct = Math.round((q.current / q.target) * 100);
        return (
          <View key={q.id} style={styles.row}>
            <Ionicons
              name={q.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={q.done ? colors.success : colors.textMuted}
            />
            <View style={styles.body}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, q.done && styles.labelDone]} numberOfLines={1}>
                  {q.label}
                </Text>
                <Text style={styles.count}>
                  {q.current}/{q.target}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%` as DimensionValue }, q.done && styles.fillDone]} />
              </View>
            </View>
            <Text style={[styles.xp, q.done && styles.xpDone]}>+{q.xpReward}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    marginTop: 12,
  },
  head: { ...font.label },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  body: { flex: 1, gap: 5 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...font.body, flex: 1 },
  labelDone: { color: colors.textMuted },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginLeft: 8 },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.accent },
  fillDone: { backgroundColor: colors.success },
  xp: { color: colors.accent, fontWeight: '800', fontSize: 13, width: 40, textAlign: 'right' },
  xpDone: { color: colors.success },
});
