import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type DimensionValue, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFeedRepository } from '@/core/di/repositories-context';
import type { FeedItem } from '@/domain/entities/feed';
import { MUSCU_TREE, nodeStates, unlockedFromFeed } from '@/domain/usecases/skill-tree';
import { ScreenState } from '@/ui/screen-state';
import { colors, font, radius } from '@/ui/theme';

/** Arbre de compétences (ADR-0009) : progression personnelle débloquable. */
export function SkillTreeScreen({
  groupId,
  userId,
  onBack,
  onLog,
}: {
  groupId: string;
  userId: string;
  onBack: () => void;
  onLog: () => void;
}) {
  const feedRepo = useFeedRepository();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      if (mounted.current) {
        setItems(data);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [feedRepo, groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const unlocked = useMemo(() => unlockedFromFeed(items, userId), [items, userId]);
  const states = useMemo(() => nodeStates(MUSCU_TREE, unlocked), [unlocked]);
  const total = MUSCU_TREE.nodes.length;
  const xpDone = useMemo(
    () => MUSCU_TREE.nodes.slice(0, unlocked).reduce((sum, n) => sum + n.xp, 0),
    [unlocked],
  );

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }} style={styles.backRow}>
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
          <Text style={styles.back}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Progression</Text>
        <View style={styles.spacer} />
      </View>

      <ScreenState loading={loading} error={error} hasData={items.length > 0} onRetry={load}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <LinearGradient
            colors={['#2c1d12', '#191411']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.treeName}>{MUSCU_TREE.name}</Text>
            <View style={styles.heroRow}>
              <View>
                <Text style={styles.hero}>
                  {unlocked}
                  <Text style={styles.heroTotal}>/{total}</Text>
                </Text>
                <Text style={styles.heroLabel}>Paliers débloqués</Text>
              </View>
              <View style={styles.alignEnd}>
                <Text style={styles.heroXp}>{xpDone}</Text>
                <Text style={styles.heroLabel}>XP gagnés</Text>
              </View>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.round((unlocked / total) * 100)}%` as DimensionValue }]} />
            </View>
            <Text style={styles.hint}>
              Chaque séance loggée débloque le palier suivant. Prochains arbres : Souffle,
              Hygiène de vie, Esprit.
            </Text>
          </LinearGradient>

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
                    {state === 'done' ? <Ionicons name="checkmark" size={16} color="#0B0B0D" /> : null}
                    {state === 'available' ? <View style={styles.dotPulse} /> : null}
                    {state === 'locked' ? <Ionicons name="lock-closed" size={12} color={colors.textFaint} /> : null}
                  </View>
                  {i < states.length - 1 ? (
                    <View style={[styles.lineDown, state === 'done' && styles.lineDone]} />
                  ) : null}
                </View>
                <View style={styles.content}>
                  <Text style={[styles.nodeLabel, state === 'locked' && styles.locked]}>{node.label}</Text>
                  <Text style={styles.nodeDetail}>{node.detail}</Text>
                  {state === 'available' ? (
                    <>
                      <Text style={styles.nextTag}>Prochain palier · +{node.xp} XP</Text>
                      <Pressable style={styles.logCta} onPress={onLog}>
                        <Text style={styles.logCtaText}>Logger une séance</Text>
                      </Pressable>
                    </>
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
      </ScreenState>
    </View>
  );
}

const DOT = 30;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8 },
  backRow: { flexDirection: 'row', alignItems: 'center', width: 70 },
  back: { fontSize: 15, color: colors.accent, fontWeight: '700' },
  title: { ...font.h1 },
  spacer: { width: 70 },
  scroll: { paddingBottom: 32 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, gap: 10 },
  treeName: { ...font.title, color: colors.textMuted },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  alignEnd: { alignItems: 'flex-end' },
  hero: { fontSize: 40, fontWeight: '800', color: colors.accent },
  heroTotal: { fontSize: 22, fontWeight: '800', color: colors.textMuted },
  heroXp: { fontSize: 28, fontWeight: '800', color: colors.text },
  heroLabel: { ...font.label, marginTop: 2 },
  barTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
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
  content: { flex: 1, paddingBottom: 24, paddingTop: 2, gap: 4 },
  nodeLabel: { ...font.title },
  locked: { color: colors.textMuted },
  nodeDetail: { fontSize: 13, color: colors.textMuted },
  nextTag: { fontSize: 13, color: colors.accent, fontWeight: '700', marginTop: 2 },
  doneTag: { fontSize: 12, color: colors.success, fontWeight: '700', marginTop: 2 },
  lockedTag: { fontSize: 12, color: colors.textFaint, fontWeight: '700', marginTop: 2 },
  logCta: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  logCtaText: { color: '#0B0B0D', fontWeight: '800', fontSize: 14 },
});
