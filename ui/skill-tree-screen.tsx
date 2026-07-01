import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type DimensionValue, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFeedRepository } from '@/core/di/repositories-context';
import type { FeedItem } from '@/domain/entities/feed';
import { MUSCU_TREE, nodeStates, unlockedFromFeed } from '@/domain/usecases/skill-tree';
import { colors, font, radius } from '@/ui/theme';

/** Arbre de compétences (ADR-0009) : progression personnelle débloquable. */
export function SkillTreeScreen({
  groupId,
  userId,
  onBack,
}: {
  groupId: string;
  userId: string;
  onBack: () => void;
}) {
  const feedRepo = useFeedRepository();
  const [items, setItems] = useState<FeedItem[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await feedRepo.listGroupFeed(groupId);
      if (mounted.current) setItems(data);
    } catch {
      if (mounted.current) setItems([]);
    }
  }, [feedRepo, groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const unlocked = useMemo(() => unlockedFromFeed(items, userId), [items, userId]);
  const states = useMemo(() => nodeStates(MUSCU_TREE, unlocked), [unlocked]);
  const total = MUSCU_TREE.nodes.length;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.back}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.title}>Progression</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.treeName}>{MUSCU_TREE.name}</Text>
          <Text style={styles.treeSub}>
            <Text style={styles.accentStrong}>{unlocked}</Text> / {total} paliers débloqués
          </Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.round((unlocked / total) * 100)}%` as DimensionValue }]} />
          </View>
          <Text style={styles.hint}>
            Chaque séance loggée débloque le palier suivant. Prochains arbres : Souffle,
            Hygiène de vie, Esprit.
          </Text>
        </View>

        <View style={styles.path}>
          {states.map(({ node, state }, i) => (
            <View key={node.id} style={styles.nodeRow}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.dot,
                    state === 'done' && styles.dotDone,
                    state === 'available' && styles.dotAvailable,
                  ]}
                >
                  {state === 'done' ? <Text style={styles.dotCheck}>✓</Text> : null}
                  {state === 'available' ? <View style={styles.dotPulse} /> : null}
                </View>
                {i < states.length - 1 ? (
                  <View style={[styles.lineDown, state === 'done' && styles.lineDone]} />
                ) : null}
              </View>
              <View style={styles.content}>
                <Text style={[styles.nodeLabel, state === 'locked' && styles.locked]}>{node.label}</Text>
                <Text style={styles.nodeDetail}>{node.detail}</Text>
                {state === 'available' ? (
                  <Text style={styles.nextTag}>Prochain palier · +{node.xp} XP</Text>
                ) : state === 'done' ? (
                  <Text style={styles.doneTag}>Débloqué · +{node.xp} XP</Text>
                ) : (
                  <Text style={styles.lockedTag}>🔒 +{node.xp} XP</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const DOT = 30;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8 },
  back: { fontSize: 15, color: colors.accent, fontWeight: '700', width: 70 },
  title: { ...font.h1 },
  spacer: { width: 70 },
  scroll: { paddingBottom: 32 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, gap: 8 },
  treeName: { ...font.h1 },
  treeSub: { ...font.body, color: colors.textMuted },
  accentStrong: { color: colors.accent, fontWeight: '800' },
  barTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden', marginTop: 2 },
  barFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.accent },
  hint: { fontSize: 13, color: colors.textFaint, lineHeight: 19 },
  path: { marginTop: 18 },
  nodeRow: { flexDirection: 'row', alignItems: 'stretch' },
  rail: { width: 44, alignItems: 'center' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotAvailable: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  dotCheck: { color: '#0B0B0D', fontWeight: '800', fontSize: 15 },
  dotPulse: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.accent },
  lineDown: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 },
  lineDone: { backgroundColor: colors.accent },
  content: { flex: 1, paddingBottom: 24, paddingTop: 2, gap: 3 },
  nodeLabel: { ...font.title },
  locked: { color: colors.textMuted },
  nodeDetail: { fontSize: 13, color: colors.textMuted },
  nextTag: { fontSize: 13, color: colors.accent, fontWeight: '700', marginTop: 2 },
  doneTag: { fontSize: 12, color: colors.success, fontWeight: '700', marginTop: 2 },
  lockedTag: { fontSize: 12, color: colors.textFaint, fontWeight: '700', marginTop: 2 },
});
