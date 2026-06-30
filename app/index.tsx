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
        <FeedView groupId={groupId} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
