import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedView } from '@/ui/feed-view';
import { GroupGate } from '@/ui/group-gate';
import { SignInForm } from '@/ui/sign-in-form';
import { useSession } from '@/ui/use-session';

/**
 * Orchestrateur de la slice verticale : connexion -> choix du groupe -> feed.
 * Chaque état est une vue présentationnelle qui consomme un repository via le DI.
 */
export default function HomeScreen() {
  const { userId, loading } = useSession();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [prevUserId, setPrevUserId] = useState(userId);

  // Sécurité : le groupe sélectionné est lié à la session courante. Au moindre
  // changement d'utilisateur (déconnexion, expiration, autre compte), on remet à
  // zéro pour ne JAMAIS afficher le groupe d'une session précédente. Pattern React
  // « ajuster l'état au changement de prop » (pendant le rendu, sans effet).
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    setGroupId(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : !userId ? (
        <SignInForm />
      ) : !groupId ? (
        <GroupGate onReady={setGroupId} />
      ) : (
        <FeedView key={userId} groupId={groupId} userId={userId} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
