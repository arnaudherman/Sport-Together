import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useProfileRepository } from '@/core/di/repositories-context';
import type { Profile } from '@/domain/entities/profile';
import { PrimaryButton } from '@/ui/button';
import { initial } from '@/ui/format';
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
      setError("Tu dois confirmer être majeur·e — l'app inclut le suivi nutritionnel.");
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Bienvenue 👋</Text>
      <Text style={styles.subtitle}>Voici comment tes amis te verront.</Text>

      <View style={styles.preview}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial(pseudo || 'T')}</Text>
        </View>
        <Text style={styles.previewName}>{pseudo.trim() || 'Ton pseudo'}</Text>
        <View style={styles.levelPill}>
          <Text style={styles.levelText}>Niveau 1 · 0 XP</Text>
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Ton pseudo"
        placeholderTextColor={colors.textFaint}
        value={pseudo}
        onChangeText={setPseudo}
        autoCapitalize="words"
      />

      <Pressable style={styles.adultRow} onPress={() => setIsAdult((v) => !v)}>
        <Switch
          value={isAdult}
          onValueChange={setIsAdult}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor={colors.text}
        />
        <Text style={styles.switchLabel}>Je confirme être majeur·e</Text>
      </Pressable>
      <Text style={styles.note}>
        Le suivi nutritionnel est réservé aux adultes, dans un cadre bienveillant — jamais
        d'objectif de poids.
      </Text>

      <PrimaryButton title="Continuer" onPress={submit} busy={busy} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24, gap: 12 },
  title: { ...font.display, textAlign: 'center' },
  subtitle: { ...font.body, color: colors.textMuted, textAlign: 'center', marginBottom: 8 },
  preview: { alignItems: 'center', gap: 8, marginBottom: 8 },
  avatar: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, fontWeight: '800', color: colors.accent },
  previewName: { ...font.h1 },
  levelPill: { backgroundColor: colors.surfaceElevated, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  levelText: { ...font.label, color: colors.accent },
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
  adultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 44 },
  switchLabel: { ...font.body },
  note: { ...font.body, color: colors.textMuted, fontSize: 13 },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});
