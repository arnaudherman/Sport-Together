import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useProfileRepository } from '@/core/di/repositories-context';
import type { Profile } from '@/domain/entities/profile';

/** Onboarding minimal : pseudo + age-gating adulte (ADR-0005 / ADR-0008). */
export function ProfileOnboarding({ onDone }: { onDone: (profile: Profile) => void }) {
  const repo = useProfileRepository();
  const [pseudo, setPseudo] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const value = pseudo.trim();
    if (value.length === 0) {
      setError('Choisis un pseudo.');
      return;
    }
    if (!isAdult) {
      setError('Tu dois confirmer être majeur·e — l\'app inclut le suivi nutritionnel.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await repo.updateMyProfile({ pseudo: value, isAdult: true });
      onDone(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue 👋</Text>
      <Text style={styles.subtitle}>Choisis comment tes amis te verront.</Text>

      <TextInput
        style={styles.input}
        placeholder="Ton pseudo"
        value={pseudo}
        onChangeText={setPseudo}
        autoCapitalize="words"
      />

      <View style={styles.row}>
        <Switch value={isAdult} onValueChange={setIsAdult} />
        <Text style={styles.switchLabel}>Je confirme être majeur·e</Text>
      </View>
      <Text style={styles.note}>
        Le suivi nutritionnel est réservé aux adultes, dans un cadre bienveillant —
        jamais d'objectif de poids.
      </Text>

      <Button title="Continuer" onPress={submit} disabled={busy} />
      {busy && <ActivityIndicator style={styles.spinner} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { fontSize: 15 },
  note: { fontSize: 13, color: '#6B7280' },
  spinner: { marginTop: 8 },
  error: { color: '#DC2626', fontSize: 14 },
});
