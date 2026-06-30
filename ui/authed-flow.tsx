import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { FeedView } from '@/ui/feed-view';
import { GroupGate } from '@/ui/group-gate';
import { ProfileOnboarding } from '@/ui/profile-onboarding';
import { useProfile } from '@/ui/use-profile';

/**
 * Flux applicatif une fois connecté : onboarding profil -> choix du groupe -> feed.
 * Monté avec `key={userId}` par l'écran racine : tout l'état (profil, groupe) est
 * donc remis à zéro à chaque changement de compte — pas de fuite inter-comptes.
 */
export function AuthedFlow({ userId }: { userId: string }) {
  const { profile, loading, reload } = useProfile();
  const [groupId, setGroupId] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!profile || !profile.isAdult) {
    return <ProfileOnboarding onDone={reload} />;
  }

  if (!groupId) {
    return <GroupGate onReady={setGroupId} />;
  }

  return (
    <FeedView groupId={groupId} userId={userId} onChangeGroup={() => setGroupId(null)} />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
