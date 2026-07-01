import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFeedRepository } from '@/core/di/repositories-context';
import type { FeedItem } from '@/domain/entities/feed';
import { MUSCU_GRAPH, sessionsUnlocked } from '@/domain/usecases/skill-graph';
import { HolyGraph } from '@/ui/holy-graph';
import { ScreenState } from '@/ui/screen-state';
import { colors, font, radius } from '@/ui/theme';

/** Écran Progression : arbre de compétences en holy graph (ADR-0009). */
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

  const unlocked = useMemo(() => sessionsUnlocked(items, userId), [items, userId]);
  const total = MUSCU_GRAPH.nodes.length;
  const xpDone = useMemo(
    () => MUSCU_GRAPH.nodes.filter((n) => n.order < unlocked).reduce((s, n) => s + n.xp, 0),
    [unlocked],
  );

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }} style={styles.backRow}>
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
          <Text style={styles.back}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Compétences</Text>
        <View style={styles.spacer} />
      </View>

      <ScreenState loading={loading} error={error} hasData={items.length > 0} onRetry={load}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <LinearGradient
            colors={['#2c1d12', '#191411']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.between}>
              <View>
                <Text style={styles.heroBig}>
                  <Text style={styles.accent}>{unlocked}</Text>
                  <Text style={styles.heroTotal}>/{total}</Text>
                </Text>
                <Text style={styles.label}>Paliers débloqués</Text>
              </View>
              <View style={styles.alignEnd}>
                <Text style={styles.heroBig}>{xpDone}</Text>
                <Text style={styles.label}>XP de l'arbre</Text>
              </View>
              <View style={styles.alignEnd}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>Corps ▾</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.graphWrap}>
            <HolyGraph graph={MUSCU_GRAPH} unlocked={unlocked} />
          </View>
          <Text style={styles.hint}>◄ tes prochains paliers · glisse pour explorer les branches</Text>

          <Pressable style={styles.cta} onPress={onLog}>
            <Ionicons name="add" size={20} color="#0B0B0D" />
            <Text style={styles.ctaText}>Logger une séance</Text>
          </Pressable>
        </ScrollView>
      </ScreenState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8 },
  backRow: { flexDirection: 'row', alignItems: 'center', width: 90 },
  back: { fontSize: 15, color: colors.accent, fontWeight: '700' },
  title: { ...font.h1 },
  spacer: { width: 90 },
  scroll: { paddingBottom: 40, alignItems: 'stretch' },
  hero: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 18 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alignEnd: { alignItems: 'flex-end' },
  accent: { color: colors.accent },
  heroBig: { fontSize: 30, fontWeight: '800', color: colors.text },
  heroTotal: { fontSize: 18, fontWeight: '800', color: colors.textMuted },
  label: { ...font.label, marginTop: 2 },
  pill: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontSize: 12, fontWeight: '700', color: colors.text },
  graphWrap: { alignItems: 'center', marginTop: 10 },
  hint: { color: colors.textFaint, fontSize: 12, textAlign: 'center', marginTop: 4 },
  cta: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 22,
    paddingVertical: 13,
    alignItems: 'center',
  },
  ctaText: { ...font.title, color: '#0B0B0D' },
});
