import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/ui/button';
import { colors, font, radius } from '@/ui/theme';

/**
 * Distingue chargement / erreur / prêt pour ne jamais afficher des zéros « morts »
 * (finding critique #1). Chargement = skeletons sombres ; erreur = carte + réessai.
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
      <View style={styles.skeleton}>
        <View style={[styles.block, { height: 96 }]} />
        <View style={[styles.block, { height: 118 }]} />
        <View style={[styles.block, { height: 118 }]} />
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
  skeleton: { paddingTop: 12, gap: 12 },
  block: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.7,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  msg: { ...font.body, color: colors.textMuted, textAlign: 'center' },
  action: { alignSelf: 'stretch' },
});
