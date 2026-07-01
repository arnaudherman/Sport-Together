import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/ui/button';
import { colors, font } from '@/ui/theme';

/**
 * Distingue chargement / erreur / prêt pour ne jamais afficher des zéros « morts »
 * (finding critique #1). Ne montre les enfants que quand il y a des données ou que
 * le chargement est fini sans erreur.
 */
export function ScreenState({
  loading,
  error,
  hasData,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loading && !hasData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (error && !hasData) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>Impossible de charger. Vérifie ta connexion.</Text>
        <View style={styles.action}>
          <PrimaryButton title="Réessayer" onPress={onRetry} />
        </View>
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  msg: { ...font.body, color: colors.textMuted, textAlign: 'center' },
  action: { alignSelf: 'stretch' },
});
