import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useFeedRepository } from '@/core/di/repositories-context';
import type { FeedItemType } from '@/domain/entities/feed';
import { xpForType } from '@/domain/usecases/gamification';
import { validateMeal } from '@/domain/usecases/nutrition';
import { colors, font, radius } from '@/ui/theme';

const TABS: { type: FeedItemType; label: string }[] = [
  { type: 'session', label: 'Séance' },
  { type: 'steps', label: 'Pas' },
  { type: 'meal', label: 'Repas' },
];
const DURATIONS = [15, 30, 45, 60];

const REWARD_HINT: Record<FeedItemType, string> = {
  session: 'Fait avancer ton streak 🔥 et débloque le prochain palier de l\'arbre Muscu.',
  steps: 'Fait avancer ton streak 🔥.',
  meal: 'Fait avancer ton streak 🔥. Suivi bienveillant, jamais d\'objectif de poids.',
};

function toNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/** Écran de log dédié (DA) : séance, pas ou repas (ADR-0002 ; garde-fous ADR-0008). */
export function LogScreen({
  groupId,
  onDone,
  onCancel,
}: {
  groupId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const feed = useFeedRepository();
  const [type, setType] = useState<FeedItemType>('session');
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState(30);
  const [steps, setSteps] = useState('');
  const [mealLabel, setMealLabel] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={styles.back}>‹ Annuler</Text>
        </Pressable>
        <Text style={styles.title}>Logger</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.tabs}>
          {TABS.map((tab) => {
            const on = type === tab.type;
            return (
              <Pressable key={tab.type} onPress={() => setType(tab.type)} style={[styles.tab, on && styles.tabOn]}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {type === 'session' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Type d'activité (ex. Course)"
              placeholderTextColor={colors.textFaint}
              value={activity}
              onChangeText={setActivity}
            />
            <Text style={styles.label}>Durée</Text>
            <View style={styles.chips}>
              {DURATIONS.map((d) => (
                <Pressable key={d} onPress={() => setDuration(d)} style={[styles.chip, duration === d && styles.chipOn]}>
                  <Text style={[styles.chipText, duration === d && styles.chipTextOn]}>{d} min</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {type === 'steps' ? (
          <TextInput
            style={styles.input}
            placeholder="Nombre de pas"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            value={steps}
            onChangeText={setSteps}
          />
        ) : null}

        {type === 'meal' ? (
          <>
            <TextInput style={styles.input} placeholder="Nom du repas" placeholderTextColor={colors.textFaint} value={mealLabel} onChangeText={setMealLabel} />
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.flex]} placeholder="kcal" placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={calories} onChangeText={setCalories} />
              <TextInput style={[styles.input, styles.flex]} placeholder="Prot. (g)" placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={protein} onChangeText={setProtein} />
            </View>
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.flex]} placeholder="Gluc. (g)" placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={carbs} onChangeText={setCarbs} />
              <TextInput style={[styles.input, styles.flex]} placeholder="Lip. (g)" placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={fat} onChangeText={setFat} />
            </View>
          </>
        ) : null}

        <View style={styles.photo}>
          <Text style={styles.photoText}>📷 Ajouter une photo-preuve (bientôt)</Text>
        </View>

        <View style={styles.reward}>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardLabel}>Récompense</Text>
            <Text style={styles.rewardXp}>+{xpForType(type)} XP</Text>
          </View>
          <Text style={styles.rewardHint}>{REWARD_HINT[type]}</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.cta, busy && styles.ctaBusy]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#0B0B0D" /> : <Text style={styles.ctaText}>Logger  ·  +{xpForType(type)} XP</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8 },
  back: { fontSize: 15, color: colors.accent, fontWeight: '700', width: 80 },
  title: { ...font.h1 },
  spacer: { width: 80 },
  scroll: { paddingBottom: 20, gap: 12 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.textMuted, fontWeight: '700' },
  tabTextOn: { color: '#0B0B0D' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: colors.text },
  label: { ...font.label, marginTop: 4 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontWeight: '700' },
  chipTextOn: { color: colors.accent },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  photo: { backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md, padding: 24, alignItems: 'center' },
  photoText: { color: colors.textMuted, fontSize: 14 },
  reward: { backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: 14, gap: 6 },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardLabel: { color: colors.textMuted, fontSize: 14 },
  rewardXp: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  rewardHint: { color: colors.textFaint, fontSize: 13, lineHeight: 18 },
  error: { color: '#FCA5A5', fontSize: 14 },
  footer: { paddingVertical: 12 },
  cta: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center' },
  ctaBusy: { opacity: 0.7 },
  ctaText: { ...font.title, color: '#0B0B0D' },
});
