import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';

import { useGroupRepository } from '@/core/di/repositories-context';
import type { FeedItem } from '@/domain/entities/feed';
import type { Group } from '@/domain/entities/group';
import { AccountScreen } from '@/ui/account-screen';
import { CommentsScreen } from '@/ui/comments-screen';
import { DiscoverScreen } from '@/ui/discover-screen';
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
  | 'discover'
  | { profile: { id: string; name: string } }
  | { group: { id: string } }
  | { comments: { item: FeedItem } };

/**
 * Flux applicatif (solo-first). Navigation par PILE : chaque écran empile, Retour
 * dépile (le contexte est préservé — profil > post > Retour revient au profil), et
 * le bouton retour matériel Android recule d'un cran. L'onboarding enchaîne
 * directement sur la 1re publication. Monté avec `key={userId}`.
 */
export function AuthedFlow({ userId }: { userId: string }) {
  const { profile, loading, error, reload, applyProfile } = useProfile();
  const groupRepo = useGroupRepository();
  const [groups, setGroups] = useState<Group[]>([]);
  const [stack, setStack] = useState<Screen[]>(['home']);
  const view = stack[stack.length - 1];

  const push = useCallback((s: Screen) => setStack((st) => [...st, s]), []);
  const pop = useCallback(() => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)), []);
  const replaceTop = useCallback((s: Screen) => setStack((st) => [...st.slice(0, -1), s]), []);

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

  // Bouton retour matériel (Android) : recule dans la pile, sinon comportement natif.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        pop();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, pop]);

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
    // Fin d'onboarding : on amorce directement la 1re publication (pic d'intention).
    return (
      <ProfileOnboarding
        onDone={(p) => {
          applyProfile(p);
          setStack(['home', 'log']);
        }}
      />
    );
  }

  const groupList = groups.map((g) => ({ id: g.id, name: g.name }));

  if (typeof view === 'object' && 'profile' in view) {
    return (
      <ProfileScreen
        targetUserId={view.profile.id}
        targetName={view.profile.name}
        currentUserId={userId}
        groups={groupList}
        onBack={pop}
        onOpenGroup={(id) => push({ group: { id } })}
        onJoinGroup={() => push('groups')}
        onOpenAccount={() => push('account')}
        onOpenComments={(item) => push({ comments: { item } })}
      />
    );
  }

  if (typeof view === 'object' && 'comments' in view) {
    return <CommentsScreen item={view.comments.item} onBack={pop} />;
  }

  if (view === 'account') {
    return (
      <AccountScreen
        pseudo={profile.pseudo}
        bio={profile.bio ?? ''}
        isAdult={profile.isAdult}
        onSaved={applyProfile}
        onBack={pop}
      />
    );
  }

  if (view === 'discover') {
    return (
      <DiscoverScreen
        userId={userId}
        onBack={pop}
        onOpenProfile={(id, name) => push({ profile: { id, name } })}
        onJoinGroup={() => push('groups')}
      />
    );
  }

  if (typeof view === 'object' && 'group' in view) {
    return (
      <GroupScreen
        key={view.group.id}
        groupId={view.group.id}
        userId={userId}
        onBack={pop}
        onOpenProfile={(id, name) => push({ profile: { id, name } })}
      />
    );
  }

  if (view === 'groups') {
    return (
      <GroupGate
        onBack={pop}
        onReady={(id) => {
          loadGroups();
          replaceTop({ group: { id } }); // Retour depuis le groupe -> écran précédent
        }}
      />
    );
  }

  if (view === 'log') {
    // Solo-first (ADR-0010) : destination « Mon fil » par défaut, un groupe au choix.
    return (
      <LogScreen
        groups={groupList}
        userId={userId}
        pseudo={profile.pseudo}
        onDone={pop}
        onCancel={pop}
      />
    );
  }

  return (
    <FeedView
      userId={userId}
      pseudo={profile.pseudo}
      onOpenProfile={(id, name) => push({ profile: { id, name } })}
      onOpenLog={() => push('log')}
      onOpenComments={(item) => push({ comments: { item } })}
      onOpenDiscover={() => push('discover')}
      onOpenGroup={(id) => push({ group: { id } })}
      onOpenGroups={() => push('groups')}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
});
