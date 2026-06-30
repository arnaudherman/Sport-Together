import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ErrorRetry } from '@/ui/error-retry';
import { FeedView } from '@/ui/feed-view';
import { GroupGate } from '@/ui/group-gate';
import { ProfileOnboarding } from '@/ui/profile-onboarding';
import { useProfile } from '@/ui/use-profile';

/**
 * Flux applicatif une fois connecté : onboarding profil -> choix du groupe -> feed.
 * Monté avec `key={userId}` par l'écran racine : tout l'état (profil, groupe) est
 * remis à zéro à chaque changement de compte — pas de fuite inter-comptes.
 */
export function AuthedFlow({ userId }: { userId: string }) {
  const { profile, loading, error, reload, applyProfile } = useProfile();
  const [groupId, setGroupId] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  // Lecture ratée (réseau) : on propose un réessai au lieu de renvoyer à tort un
  // adulte onboardé vers l'age-gate (correctif revue).
  if (error && !profile) {
    return <ErrorRetry message="Impossible de charger ton profil." onRetry={reload} />;
  }

  if (!profile || !profile.isAdult) {
    return <ProfileOnboarding onDone={applyProfile} />;
  }

  if (!groupId) {
    return <GroupGate onReady={setGroupId} />;
  }

  return (
    <FeedView
      key={groupId}
      groupId={groupId}
      userId={userId}
      onChangeGroup={() => setGroupId(null)}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
