import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { FeedItem } from '@/domain/entities/feed';
import { lifeProgress } from '@/domain/usecases/life-domains';
import { Ring } from '@/ui/ring';
import { Surface } from '@/ui/surface';
import { colors, font } from '@/ui/theme';

/**
 * Arbre de vie (DA v2 Obsidienne) : un rail de paliers par domaine de qualité de
 * vie (Sport, Pas, Sommeil, Nutrition, Rythme) + anneau de progression vers le
 * prochain palier. Remplace le holy graph mono-domaine.
 */
export function LifeProgress({ items, userId }: { items: FeedItem[]; userId: string }) {
  const tz = -new Date().getTimezoneOffset();
  const domains = useMemo(() => lifeProgress(items, userId, tz), [items, userId, tz]);

  return (
    <View style={styles.list}>
      {domains.map(({ def, value, done, next, ratioToNext }) => (
        <Surface key={def.key}>
          <View style={styles.pad}>
            <View style={styles.head}>
              <Text style={styles.icon}>{def.icon}</Text>
              <View style={styles.flex}>
                <Text style={styles.title}>{def.label}</Text>
                <Text style={styles.metric}>
                  <Text style={styles.metricNum}>{value}</Text> {def.unit}
                </Text>
              </View>
              <Ring ratio={ratioToNext} value={`${done}/${def.milestones.length}`} size={54} stroke={5.5} />
            </View>

            {/* Rail de paliers : accompli = accent, courant = anneau, à venir = discret */}
            <View style={styles.rail}>
              {def.milestones.map((m, i) => (
                <View key={m.target} style={styles.railSeg}>
                  {i > 0 ? <View style={[styles.wire, i <= done ? styles.wireOn : null]} /> : null}
                  <View
                    style={[
                      styles.dot,
                      i < done ? styles.dotDone : i === done ? styles.dotNext : null,
                    ]}
                  />
                </View>
              ))}
            </View>
            <Text style={styles.next}>
              {next ? (
                <>
                  Prochain palier : <Text style={styles.nextStrong}>{next.label}</Text> ({next.target}{' '}
                  {def.key === 'rhythm' ? 'jours de suite' : 'jours'})
                </>
              ) : (
                'Domaine complété — chapeau. 🏆'
              )}
            </Text>
          </View>
        </Surface>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  pad: { paddingHorizontal: 16, paddingVertical: 14 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 24 },
  title: { ...font.title, fontSize: 16 },
  metric: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  metricNum: { fontSize: 17, fontWeight: '200', letterSpacing: -0.5, color: colors.text },
  rail: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  railSeg: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  wire: { flex: 1, height: 2.5, backgroundColor: colors.track },
  wireOn: { backgroundColor: colors.accent },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.track },
  dotDone: { backgroundColor: colors.accent },
  dotNext: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 2.5,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  next: { fontSize: 12, color: colors.textMuted, marginTop: 10 },
  nextStrong: { color: colors.text, fontWeight: '600' },
});
