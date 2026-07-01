import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/ui/button';
import { colors, font } from '@/ui/theme';

/** Écran d'erreur récupérable avec réessai (ex. lecture du profil ratée). */
export function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
      <PrimaryButton title="Réessayer" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 16,
    padding: 24,
  },
  text: { ...font.body, color: colors.textMuted, textAlign: 'center' },
});
