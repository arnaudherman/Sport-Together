import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useGroupRepository } from '@/core/di/repositories-context';
import type { Group } from '@/domain/entities/group';
import { AccountScreen } from '@/ui/account-screen';
import { ErrorRetry } from '@/ui/error-retry';
import { FeedView } from '@/ui/feed-view';
import { GroupGate } from '@/ui/group-gate';
import { GroupScreen } from '@/ui/group-screen';
import { LogScreen } from '@/ui/log-screen';
import { ProfileOnboarding } from '@/ui/profile-onboarding';
import { ProfileScreen } from '@/ui/profile-screen';
import { colors } from '@/ui/theme';
import { useProfile } from '@/ui/use-profile';

type Screen =
  | 'home'
  | 'log'
  | 'groups'
  | 'account'
  | { profile: { id: string; name: string } }
  | { group: { id: string } };

/**
 * Flux applicatif (solo-first) : onboarding -> accueil (fil social). Les groupes
 * sont un add-on optionnel (rejoindre/créer, écran d'entraide), accessibles depuis
 * le profil. Plus de gate groupe obligatoire. Monté avec `key={userId}`.
 */
export function AuthedFlow({ userId }: { userId: string }) {
  const { profile, loading, error, reload, applyProfile } = useProfile();
  const groupRepo = useGroupRepository();
  const [groups, setGroups] = useState<Group[]>([]);
  const [view, setView] = useState<Screen>('home');

  const loadGroups = useCallback(async () => {
    try {
      setGroups(await groupRepo.listMyGroups());
    } catch {
      /* les groupes sont optionnels : on n'échoue pas l'accueil pour autant */
    }
  }, [groupRepo]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

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

  const groupList = groups.map((g) => ({ id: g.id, name: g.name }));
  const postingGroupId = groups[0]?.id ?? null;

  if (typeof view === 'object' && 'profile' in view) {
    return (
      <ProfileScreen
        targetUserId={view.profile.id}
        targetName={view.profile.name}
        currentUserId={userId}
        groups={groupList}
        onBack={() => setView('home')}
        onOpenGroup={(id) => setView({ group: { id } })}
        onJoinGroup={() => setView('groups')}
        onOpenAccount={() => setView('account')}
      />
    );
  }

  if (view === 'account') {
    return <AccountScreen pseudo={profile.pseudo} onBack={() => setView('home')} />;
  }

  if (typeof view === 'object' && 'group' in view) {
    return (
      <GroupScreen
        key={view.group.id}
        groupId={view.group.id}
        userId={userId}
        onBack={() => setView('home')}
        onOpenProfile={(id, name) => setView({ profile: { id, name } })}
      />
    );
  }

  if (view === 'groups') {
    return (
      <GroupGate
        onBack={() => setView('home')}
        onReady={(id) => {
          loadGroups();
          setView({ group: { id } });
        }}
      />
    );
  }

  if (view === 'log') {
    if (!postingGroupId) {
      // Pas encore de groupe où publier : on invite à en rejoindre / créer un.
      return (
        <GroupGate
          onBack={() => setView('home')}
          onReady={() => {
            loadGroups();
            setView('home');
          }}
        />
      );
    }
    return (
      <LogScreen groupId={postingGroupId} onDone={() => setView('home')} onCancel={() => setView('home')} />
    );
  }

  return (
    <FeedView
      userId={userId}
      pseudo={profile.pseudo}
      onOpenProfile={(id, name) => setView({ profile: { id, name } })}
      onOpenLog={() => setView('log')}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
});
