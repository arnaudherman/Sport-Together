import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthedFlow } from '@/ui/authed-flow';
import { SignInForm } from '@/ui/sign-in-form';
import { colors } from '@/ui/theme';
import { useSession } from '@/ui/use-session';

/**
 * Écran racine : connexion, puis flux authentifié keyé par userId (le `key`
 * remonte tout l'état au changement de compte — sécurité inter-comptes).
 */
export default function HomeScreen() {
  const { userId, loading } = useSession();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : userId ? (
        <AuthedFlow key={userId} userId={userId} />
      ) : (
        <SignInForm />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
});
