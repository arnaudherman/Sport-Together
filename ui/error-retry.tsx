import { Button, StyleSheet, Text, View } from 'react-native';

/** Écran d'erreur récupérable avec réessai (ex. lecture du profil ratée). */
export function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
      <Button title="Réessayer" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  text: { fontSize: 15, color: '#374151', textAlign: 'center' },
});
