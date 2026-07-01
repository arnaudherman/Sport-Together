import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useFeedRepository } from '@/core/di/repositories-context';
import type { FeedItemType } from '@/domain/entities/feed';
import { celebrationFor, type Celebration, type ProgressSnapshot } from '@/domain/usecases/celebration';
import { xpForType, xpFromFeed } from '@/domain/usecases/gamification';
import { validateMeal } from '@/domain/usecases/nutrition';
import { sessionsUnlocked } from '@/domain/usecases/skill-graph';
import { CelebrationOverlay } from '@/ui/celebration-overlay';
import { colors, font, radius } from '@/ui/theme';

const TABS: { type: FeedItemType; label: string; icon: string }[] = [
  { type: 'session', label: 'Séance', icon: '🏋️' },
  { type: 'steps', label: 'Pas', icon: '👟' },
  { type: 'meal', label: 'Repas', icon: '🥗' },
];
const DURATIONS = [15, 30, 45, 60];

const REWARD_HINT: Record<FeedItemType, string> = {
  session: 'Ta série 🔥 continue et tu approches un palier de ton arbre.',
  steps: 'Ta série 🔥 continue.',
  meal: 'Ta série 🔥 continue. Suivi bienveillant, jamais d\'objectif de poids.',
};

function toNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/** Composer type Twitter : publier une séance / des pas / un repas (ADR-0002 / 0008). */
export function LogScreen({
  groupId,
  userId,
  onDone,
  onCancel,
}: {
  groupId: string | null;
  userId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const feed = useFeedRepository();
  const [type, setType] = useState<FeedItemType>('session');
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState(45);
  const [steps, setSteps] = useState('');
  const [mealLabel, setMealLabel] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration>(null);
  const before = useRef<ProgressSnapshot | null>(null);
  const mounted = useRef(true);
  const tz = -new Date().getTimezoneOffset();

  // Progression AVANT le log, pour décider s'il faut célébrer (level-up / palier).
  useEffect(() => {
    mounted.current = true;
    feed
      .listUserFeed(userId)
      .then((items) => {
        before.current = { xp: xpFromFeed(items, userId), unlocked: sessionsUnlocked(items, userId, tz) };
      })
      .catch(() => {});
    return () => {
      mounted.current = false;
    };
  }, [feed, userId, tz]);

  async function computeCelebration(): Promise<Celebration> {
    if (!before.current) return null;
    try {
      const items = await feed.listUserFeed(userId);
      const after = { xp: xpFromFeed(items, userId), unlocked: sessionsUnlocked(items, userId, tz) };
      return celebrationFor(before.current, after);
    } catch {
      return null;
    }
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (type === 'session') {
        await feed.logSession(groupId, activity.trim() || 'Séance', duration);
      } else if (type === 'steps') {
        const n = toNumber(steps);
        if (n == null || n < 0) {
          setError('Nombre de pas invalide.');
          return;
        }
        await feed.logSteps(groupId, Math.round(n));
      } else {
        const cal = toNumber(calories);
        const input = {
          label: mealLabel.trim(),
          caloriesKcal: cal != null ? Math.round(cal) : undefined,
          proteinG: toNumber(protein),
          carbsG: toNumber(carbs),
          fatG: toNumber(fat),
        };
        const validation = validateMeal(input);
        if (!validation.ok) {
          setError(validation.error);
          return;
        }
        await feed.logMeal(groupId, input);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const c = await computeCelebration();
      if (c && mounted.current) {
        setCelebration(c); // l'overlay appelle onDone à sa fermeture
      } else {
        onDone();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button" accessibilityLabel="Annuler">
          <Text style={styles.cancel}>Annuler</Text>
        </Pressable>
        <Text style={styles.barTitle}>Nouvelle publication</Text>
        <Pressable
          style={({ pressed }) => [styles.publish, busy && styles.dim, pressed && styles.pressed]}
          onPress={submit}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Publier"
          accessibilityState={{ disabled: busy, busy }}
        >
          {busy ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Text style={styles.publishText}>Publier</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.chips}>
          {TABS.map((t) => {
            const on = type === t.type;
            return (
              <Pressable
                key={t.type}
                onPress={() => setType(t.type)}
                style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t.label}
              >
                <Text style={styles.chipIcon}>{t.icon}</Text>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.composeRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>T</Text>
          </View>
          {type === 'session' ? (
            <TextInput
              style={styles.compose}
              placeholder="Ta séance du jour ? Raconte… (ex. 45 min de course)"
              placeholderTextColor={colors.textFaint}
              value={activity}
              onChangeText={setActivity}
              multiline
            />
          ) : type === 'steps' ? (
            <TextInput
              style={styles.compose}
              placeholder="Combien de pas aujourd'hui ?"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              value={steps}
              onChangeText={setSteps}
            />
          ) : (
            <TextInput
              style={styles.compose}
              placeholder="Qu'as-tu mangé ? (ex. Buddha bowl)"
              placeholderTextColor={colors.textFaint}
              value={mealLabel}
              onChangeText={setMealLabel}
            />
          )}
        </View>

        {type === 'session' ? (
          <View style={styles.durations}>
            {DURATIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDuration(d)}
                style={[styles.dchip, duration === d && styles.dchipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: duration === d }}
                accessibilityLabel={`${d} minutes`}
              >
                <Text style={[styles.dchipText, duration === d && styles.dchipTextOn]}>{d} min</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {type === 'meal' ? (
          <View style={styles.macros}>
            <TextInput style={[styles.mInput]} placeholder="kcal" placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={calories} onChangeText={setCalories} />
            <TextInput style={[styles.mInput]} placeholder="Prot." placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={protein} onChangeText={setProtein} />
            <TextInput style={[styles.mInput]} placeholder="Gluc." placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={carbs} onChangeText={setCarbs} />
            <TextInput style={[styles.mInput]} placeholder="Lip." placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={fat} onChangeText={setFat} />
          </View>
        ) : null}

        <View style={styles.tools}>
          <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
          <Ionicons name="location-outline" size={22} color={colors.textMuted} />
          <Ionicons name="happy-outline" size={22} color={colors.textMuted} />
          <Text style={styles.toolsHint}>bientôt</Text>
        </View>

        <LinearGradient
          colors={['rgba(240,101,47,0.22)', 'rgba(240,101,47,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.reward}
        >
          <View style={styles.rewardRow}>
            <View style={styles.rewardLabelRow}>
              <Ionicons name="flash" size={16} color={colors.accent} />
              <Text style={styles.rewardLabel}>Récompense</Text>
            </View>
            <Text style={styles.rewardXp}>+{xpForType(type)} XP</Text>
          </View>
          <Text style={styles.rewardHint}>{REWARD_HINT[type]}</Text>
        </LinearGradient>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.foot}>
          {groupId ? 'Ta publication apparaîtra dans le fil de ton groupe.' : 'Ta publication apparaîtra dans ton fil.'}
        </Text>
      </ScrollView>

      <CelebrationOverlay celebration={celebration} onDismiss={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancel: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  barTitle: { ...font.title },
  publish: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 9, minWidth: 84, alignItems: 'center' },
  dim: { opacity: 0.7 },
  publishText: { color: colors.onAccent, fontWeight: '800', fontSize: 14 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  scroll: { padding: 16, gap: 14 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipIcon: { fontSize: 15 },
  chipText: { color: colors.textMuted, fontWeight: '700' },
  chipTextOn: { color: colors.accent },
  composeRow: { flexDirection: 'row', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.accent },
  compose: { flex: 1, fontSize: 18, color: colors.text, paddingTop: 8, minHeight: 60 },
  durations: { flexDirection: 'row', gap: 8, paddingLeft: 56 },
  dchip: { paddingHorizontal: 14, paddingVertical: 10, minHeight: 40, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dchipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  dchipText: { color: colors.textMuted, fontWeight: '700' },
  dchipTextOn: { color: colors.accent },
  macros: { flexDirection: 'row', gap: 8, paddingLeft: 56 },
  mInput: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14, color: colors.text, textAlign: 'center' },
  tools: { flexDirection: 'row', gap: 20, alignItems: 'center', paddingLeft: 56, paddingTop: 2 },
  toolsHint: { color: colors.textMuted, fontSize: 12 },
  reward: { borderRadius: radius.md, padding: 16, gap: 6, borderWidth: 1, borderColor: 'rgba(240,101,47,0.25)' },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardLabel: { ...font.label },
  rewardXp: { color: colors.accent, fontWeight: '800', fontSize: 24 },
  rewardHint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 14 },
  foot: { color: colors.textMuted, fontSize: 13 },
});
