import { useState } from 'react';
import { Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useFeedRepository } from '@/core/di/repositories-context';
import type { FeedItemType } from '@/domain/entities/feed';
import { validateMeal } from '@/domain/usecases/nutrition';

const TABS: { type: FeedItemType; label: string }[] = [
  { type: 'session', label: 'Séance' },
  { type: 'steps', label: 'Pas' },
  { type: 'meal', label: 'Repas' },
];

function toNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/** Log d'un goal du jour : séance, pas ou repas (ADR-0002 ; garde-fous ADR-0008). */
export function LogGoal({ groupId, onLogged }: { groupId: string; onLogged: () => void }) {
  const feed = useFeedRepository();
  const [type, setType] = useState<FeedItemType>('session');
  const [activity, setActivity] = useState('');
  const [steps, setSteps] = useState('');
  const [mealLabel, setMealLabel] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setActivity('');
    setSteps('');
    setMealLabel('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (type === 'session') {
        await feed.logSession(groupId, activity.trim() || 'Séance', 30);
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
          // calories_kcal est un entier en base -> on arrondit (comme les pas).
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
      reset();
      onLogged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = type === tab.type;
          return (
            <Pressable
              key={tab.type}
              onPress={() => setType(tab.type)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {type === 'session' ? (
        <TextInput
          style={styles.input}
          placeholder="Type d'activité (ex. Course)"
          value={activity}
          onChangeText={setActivity}
        />
      ) : null}

      {type === 'steps' ? (
        <TextInput
          style={styles.input}
          placeholder="Nombre de pas"
          keyboardType="number-pad"
          value={steps}
          onChangeText={setSteps}
        />
      ) : null}

      {type === 'meal' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nom du repas"
            value={mealLabel}
            onChangeText={setMealLabel}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="kcal"
              keyboardType="number-pad"
              value={calories}
              onChangeText={setCalories}
            />
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="Prot. (g)"
              keyboardType="number-pad"
              value={protein}
              onChangeText={setProtein}
            />
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="Gluc. (g)"
              keyboardType="number-pad"
              value={carbs}
              onChangeText={setCarbs}
            />
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="Lip. (g)"
              keyboardType="number-pad"
              value={fat}
              onChangeText={setFat}
            />
          </View>
        </>
      ) : null}

      <Button title="Logger" onPress={submit} disabled={busy} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: '#1D4ED8' },
  tabText: { color: '#374151', fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  error: { color: '#DC2626', fontSize: 14 },
});
