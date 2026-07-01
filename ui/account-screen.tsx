import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuthRepository } from '@/core/di/repositories-context';
import { GhostButton } from '@/ui/button';
import { handle, initial } from '@/ui/format';
import { colors, font, radius } from '@/ui/theme';

/** Écran Compte : déconnexion + suppression de compte (exigence Apple/RGPD). */
export function AccountScreen({ pseudo, onBack }: { pseudo: string; onBack: () => void }) {
  const auth = useAuthRepository();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await auth.signOut();
    } finally {
      setBusy(false);
    }
    // La session passe à null -> l'écran racine revient à la connexion.
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
        <Pressable onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }} style={styles.backRow}>
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
          <Text style={styles.back}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Compte</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial(pseudo || 'T')}</Text>
        </View>
        <View>
          <Text style={styles.name}>{pseudo || 'Moi'}</Text>
          <Text style={styles.handle}>{handle(pseudo || 'moi')}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <GhostButton title="Se déconnecter" onPress={signOut} disabled={busy} />
        <Pressable style={[styles.danger, busy && styles.dim]} onPress={confirmDelete} disabled={busy}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.dangerText}>Supprimer mon compte</Text>
        </Pressable>
        {busy ? <ActivityIndicator color={colors.accent} /> : null}
      </View>

      <Text style={styles.note}>
        La suppression retire tes appartenances aux groupes et anonymise tes publications.
      </Text>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 8,
  },
  avatar: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: colors.accent },
  name: { ...font.title },
  handle: { fontSize: 13, color: colors.textMuted },
  actions: { gap: 12, marginTop: 20 },
  danger: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingVertical: 13,
  },
  dim: { opacity: 0.5 },
  dangerText: { color: colors.danger, fontWeight: '800', fontSize: 16 },
  note: { color: colors.textFaint, fontSize: 13, marginTop: 16, lineHeight: 19 },
});
