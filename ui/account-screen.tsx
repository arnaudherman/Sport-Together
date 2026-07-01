import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuthRepository, useProfileRepository } from '@/core/di/repositories-context';
import type { Profile } from '@/domain/entities/profile';
import { GhostButton, PrimaryButton } from '@/ui/button';
import { handle, initial } from '@/ui/format';
import { colors, font, radius } from '@/ui/theme';

/** Écran Compte : éditer son profil (pseudo/bio) + déconnexion + suppression. */
export function AccountScreen({
  pseudo,
  bio: initialBio,
  isAdult,
  onBack,
  onSaved,
}: {
  pseudo: string;
  bio: string;
  isAdult: boolean;
  onBack: () => void;
  onSaved: (profile: Profile) => void;
}) {
  const auth = useAuthRepository();
  const profileRepo = useProfileRepository();
  const [name, setName] = useState(pseudo);
  const [bio, setBio] = useState(initialBio);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  async function save() {
    const value = name.trim();
    if (!value) {
      setError('Choisis un pseudo.');
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await profileRepo.updateMyProfile({ pseudo: value, isAdult, bio: bio.trim() });
      if (mounted.current) {
        setSaved(true);
        onSaved(updated); // propage au reste de l'app (accueil, profil…)
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await auth.signOut();
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Supprimer ton compte ?',
      'Cette action est définitive : ton profil et tes publications seront supprimés ou anonymisés. Impossible de revenir en arrière.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await auth.deleteAccount();
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }} style={styles.backRow} accessibilityRole="button" accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
          <Text style={styles.back}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Compte</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial(name || 'T')}</Text>
          </View>
          <View>
            <Text style={styles.name}>{name || 'Moi'}</Text>
            <Text style={styles.handle}>{handle(name || 'moi')}</Text>
          </View>
        </View>

        <Text style={styles.label}>Pseudo</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(t) => {
            setName(t);
            setSaved(false);
          }}
          placeholder="Ton pseudo"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="words"
        />
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={(t) => {
            setBio(t);
            setSaved(false);
          }}
          placeholder="Parle un peu de toi…"
          placeholderTextColor={colors.textFaint}
          multiline
          maxLength={160}
        />
        <PrimaryButton title={saved ? 'Enregistré ✓' : 'Enregistrer'} onPress={save} busy={busy} />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.divider} />

        <View style={styles.actions}>
          <GhostButton title="Se déconnecter" onPress={signOut} disabled={busy} />
          <Pressable style={[styles.danger, busy && styles.dim]} onPress={confirmDelete} disabled={busy} accessibilityRole="button" accessibilityLabel="Supprimer mon compte">
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.dangerText}>Supprimer mon compte</Text>
          </Pressable>
          {busy ? <ActivityIndicator color={colors.accent} /> : null}
        </View>
        <Text style={styles.note}>La suppression retire tes appartenances aux groupes et anonymise tes publications.</Text>
      </ScrollView>
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
  scroll: { paddingBottom: 32, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, marginTop: 4, marginBottom: 6 },
  avatar: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: colors.accent },
  name: { ...font.title },
  handle: { fontSize: 13, color: colors.textMuted },
  label: { ...font.label, marginTop: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
  bioInput: { minHeight: 72, textAlignVertical: 'top' },
  error: { color: colors.danger, fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  actions: { gap: 12 },
  danger: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.danger, borderRadius: radius.pill, paddingVertical: 13 },
  dim: { opacity: 0.5 },
  dangerText: { color: colors.danger, fontWeight: '800', fontSize: 16 },
  note: { color: colors.textFaint, fontSize: 13, marginTop: 12, lineHeight: 19 },
});
