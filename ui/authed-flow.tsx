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
import { FollowListScreen, type FollowListKind } from '@/ui/follow-list-screen';
import { GroupGate } from '@/ui/group-gate';
import { GroupScreen } from '@/ui/group-screen';
import { LogScreen } from '@/ui/log-screen';
import { ProfileOnboarding } from '@/ui/profile-onboarding';
import { ProfileScreen } from '@/ui/profile-screen';
import { TabBar, type TabKey } from '@/ui/tab-bar';
import { colors } from '@/ui/theme';
import { useProfile } from '@/ui/use-profile';

type Screen =
  | 'home'
  | 'log'
  | 'groups'
  | 'account'
  | 'discover'
  | { profile: { id: string; name: string } }
  | { followList: { kind: FollowListKind } }
  | { group: { id: string } }
  | { comments: { item: FeedItem } };

/**
 * Flux applicatif (solo-first, DA v2 Obsidienne). Navigation NATIVE : une TAB BAR
 * persistante (Accueil / Découvrir / ＋ / Groupes / Profil) porte les 4 racines ;
 * les écrans de détail s'empilent par-dessus (Retour contextuel + BackHandler
 * Android). Le ＋ central ouvre le composer. Monté avec `key={userId}`.
 */
export function AuthedFlow({ userId }: { userId: string }) {
  const { profile, loading, error, reload, applyProfile } = useProfile();
  const groupRepo = useGroupRepository();
  const [groups, setGroups] = useState<Group[]>([]);
  const [tab, setTab] = useState<TabKey>('home');
  const [stack, setStack] = useState<Screen[]>(['home']);
  const view = stack[stack.length - 1];
  const isRoot = stack.length === 1;

  const push = useCallback((s: Screen) => setStack((st) => [...st, s]), []);
  const pop = useCallback(() => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)), []);

  const openTab = useCallback(
    (t: TabKey) => {
      setTab(t);
      if (t === 'home') setStack(['home']);
      else if (t === 'discover') setStack(['discover']);
      else if (t === 'groups') setStack(['groups']);
      else setStack([{ profile: { id: userId, name: '' } }]);
    },
    [userId],
  );

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

  function renderScreen() {
    if (typeof view === 'object' && 'profile' in view) {
      return (
        <ProfileScreen
          targetUserId={view.profile.id}
          targetName={view.profile.name || (profile ? profile.pseudo : '')}
          currentUserId={userId}
          groups={groupList}
          onBack={isRoot ? undefined : pop}
          onOpenGroup={(id) => push({ group: { id } })}
          onJoinGroup={() => push('groups')}
          onOpenAccount={() => push('account')}
          onOpenComments={(item) => push({ comments: { item } })}
          onOpenFollowList={(kind) => push({ followList: { kind } })}
        />
      );
    }

    if (typeof view === 'object' && 'followList' in view) {
      return (
        <FollowListScreen
          kind={view.followList.kind}
          onBack={pop}
          onOpenProfile={(id, name) => push({ profile: { id, name } })}
        />
      );
    }

    if (typeof view === 'object' && 'comments' in view) {
      return <CommentsScreen item={view.comments.item} currentUserId={userId} onBack={pop} />;
    }

    if (view === 'account') {
      return (
        <AccountScreen
          pseudo={profile ? profile.pseudo : ''}
          bio={profile?.bio ?? ''}
          isAdult={profile?.isAdult ?? true}
          avatarUrl={profile?.avatarUrl}
          onSaved={applyProfile}
          onBack={pop}
        />
      );
    }

    if (view === 'discover') {
      return (
        <DiscoverScreen
          userId={userId}
          onBack={isRoot ? undefined : pop}
          onOpenProfile={(id, name) => push({ profile: { id, name } })}
          onJoinGroup={() => push('groups')}
        />
      );
    }

    if (typeof view === 'object' && 'group' in view) {
      const current = groups.find((g) => g.id === view.group.id);
      return (
        <GroupScreen
          key={view.group.id}
          groupId={view.group.id}
          groupName={current?.name ?? 'Ton groupe'}
          visibility={current?.visibility}
          isCreator={current?.createdBy === userId}
          userId={userId}
          onBack={pop}
          onOpenProfile={(id, name) => push({ profile: { id, name } })}
          onLeft={() => {
            loadGroups();
            pop();
          }}
          onChanged={loadGroups}
        />
      );
    }

    if (view === 'groups') {
      return (
        <GroupGate
          onBack={isRoot ? undefined : pop}
          onReady={(id) => {
            loadGroups();
            push({ group: { id } });
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
          pseudo={profile ? profile.pseudo : ''}
          onDone={pop}
          onCancel={pop}
        />
      );
    }

    return (
      <FeedView
        userId={userId}
        pseudo={profile ? profile.pseudo : ''}
        onOpenProfile={(id, name) => push({ profile: { id, name } })}
        onOpenLog={() => push('log')}
        onOpenComments={(item) => push({ comments: { item } })}
        onOpenDiscover={() => push('discover')}
        onOpenGroup={(id) => push({ group: { id } })}
        onOpenGroups={() => push('groups')}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.screen}>{renderScreen()}</View>
      {isRoot ? <TabBar active={tab} onTab={openTab} onCompose={() => push('log')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
});
