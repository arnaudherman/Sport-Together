import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useProfileRepository } from '@/core/di/repositories-context';
import type { Profile } from '@/domain/entities/profile';
import { PrimaryButton } from '@/ui/button';
import { colors, font, radius } from '@/ui/theme';

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
        placeholderTextColor={colors.textFaint}
        value={pseudo}
        onChangeText={setPseudo}
        autoCapitalize="words"
      />

      <View style={styles.row}>
        <Switch
          value={isAdult}
          onValueChange={setIsAdult}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor={colors.text}
        />
        <Text style={styles.switchLabel}>Je confirme être majeur·e</Text>
      </View>
      <Text style={styles.note}>
        Le suivi nutritionnel est réservé aux adultes, dans un cadre bienveillant —
        jamais d'objectif de poids.
      </Text>

      <PrimaryButton title="Continuer" onPress={submit} busy={busy} />
      {busy ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24, gap: 12 },
  title: { ...font.display, textAlign: 'center' },
  subtitle: { ...font.body, color: colors.textMuted, textAlign: 'center', marginBottom: 12 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.text,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { ...font.body },
  note: { ...font.body, color: colors.textMuted, fontSize: 13 },
  error: { color: '#FCA5A5', fontSize: 14 },
});
