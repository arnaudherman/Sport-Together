import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ErrorRetry } from '@/ui/error-retry';
import { FeedView } from '@/ui/feed-view';
import { GroupGate } from '@/ui/group-gate';
import { GroupScreen } from '@/ui/group-screen';
import { ProfileOnboarding } from '@/ui/profile-onboarding';
import { ProfileScreen } from '@/ui/profile-screen';
import { colors } from '@/ui/theme';
import { useProfile } from '@/ui/use-profile';

type Screen = 'feed' | 'group' | { profile: { id: string; name: string } };

/**
 * Flux applicatif une fois connecté : onboarding profil -> choix du groupe ->
 * feed <-> groupe <-> profil. Monté avec `key={userId}` par l'écran racine : tout
 * l'état est remis à zéro au changement de compte (pas de fuite inter-comptes).
 */
export function AuthedFlow({ userId }: { userId: string }) {
  const { profile, loading, error, reload, applyProfile } = useProfile();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [view, setView] = useState<Screen>('feed');

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error && !profile) {
    return <ErrorRetry message="Impossible de charger ton profil." onRetry={reload} />;
  }

  if (!profile || !profile.isAdult) {
    return <ProfileOnboarding onDone={applyProfile} />;
  }

  if (!groupId) {
    return (
      <GroupGate
        onReady={(id) => {
          setGroupId(id);
          setView('feed');
        }}
      />
    );
  }

  if (typeof view === 'object') {
    return (
      <ProfileScreen
        groupId={groupId}
        targetUserId={view.profile.id}
        targetName={view.profile.name}
        currentUserId={userId}
        onBack={() => setView('feed')}
      />
    );
  }

  if (view === 'group') {
    return (
      <GroupScreen
        key={groupId}
        groupId={groupId}
        userId={userId}
        onBack={() => setView('feed')}
        onChangeGroup={() => {
          setGroupId(null);
          setView('feed');
        }}
      />
    );
  }

  return (
    <FeedView
      key={groupId}
      groupId={groupId}
      userId={userId}
      pseudo={profile.pseudo}
      onOpenGroup={() => setView('group')}
      onOpenProfile={(id, name) => setView({ profile: { id, name } })}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
});
