import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
        <Pressable onPress={onCancel} hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }} style={styles.backRow}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
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
          <Ionicons name="camera-outline" size={20} color={colors.textMuted} />
          <Text style={styles.photoText}>Ajouter une photo-preuve (bientôt)</Text>
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
      </ScrollView>

      <View style={styles.footer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={[styles.ctaWrap, busy && styles.ctaBusy]} onPress={submit} disabled={busy}>
          <LinearGradient
            colors={['#F58A4C', '#F0652F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            {busy ? (
              <ActivityIndicator color="#0B0B0D" />
            ) : (
              <Text style={styles.ctaText}>Logger  ·  +{xpForType(type)} XP</Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8 },
  backRow: { width: 80 },
  title: { ...font.h1 },
  spacer: { width: 80 },
  scroll: { paddingBottom: 20, gap: 12 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 11, minHeight: 44, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.textMuted, fontWeight: '700' },
  tabTextOn: { color: '#0B0B0D' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: colors.text },
  label: { ...font.label, marginTop: 4 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 11, minHeight: 44, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontWeight: '700' },
  chipTextOn: { color: colors.accent },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  photo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md, padding: 22 },
  photoText: { color: colors.textMuted, fontSize: 14 },
  reward: { borderRadius: radius.md, padding: 16, gap: 6, borderWidth: 1, borderColor: 'rgba(240,101,47,0.25)' },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardLabel: { ...font.label },
  rewardXp: { color: colors.accent, fontWeight: '800', fontSize: 24 },
  rewardHint: { color: colors.textFaint, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 14, marginBottom: 8 },
  footer: { paddingVertical: 12 },
  ctaWrap: { borderRadius: radius.pill },
  cta: { borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  ctaBusy: { opacity: 0.7 },
  ctaText: { ...font.title, color: '#0B0B0D' },
});
