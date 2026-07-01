import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { isSupabaseConfigured } from '@/core/env';
import { getSupabaseClient } from '@/core/supabase/client';
import { InMemoryAuthRepository } from '@/data/auth/in-memory-auth-repository';
import { SupabaseAuthRepository } from '@/data/auth/supabase-auth-repository';
import { DEMO_REACTIONS, InMemoryFeedRepository } from '@/data/feed/in-memory-feed-repository';
import { SupabaseFeedRepository } from '@/data/feed/supabase-feed-repository';
import { InMemoryFollowRepository } from '@/data/follow/in-memory-follow-repository';
import { SupabaseFollowRepository } from '@/data/follow/supabase-follow-repository';
import { InMemoryGroupRepository } from '@/data/group/in-memory-group-repository';
import { SupabaseGroupRepository } from '@/data/group/supabase-group-repository';
import { InMemoryNotificationRepository } from '@/data/notification/in-memory-notification-repository';
import { SupabaseNotificationRepository } from '@/data/notification/supabase-notification-repository';
import { InMemoryProfileRepository } from '@/data/profile/in-memory-profile-repository';
import { SupabaseProfileRepository } from '@/data/profile/supabase-profile-repository';
import { InMemoryReactionRepository } from '@/data/reaction/in-memory-reaction-repository';
import { InMemoryReactionStore } from '@/data/reaction/in-memory-reaction-store';
import { SupabaseReactionRepository } from '@/data/reaction/supabase-reaction-repository';
import type { AuthRepository } from '@/domain/repositories/auth-repository';
import type { FeedRepository } from '@/domain/repositories/feed-repository';
import type { FollowRepository } from '@/domain/repositories/follow-repository';
import type { GroupRepository } from '@/domain/repositories/group-repository';
import type { NotificationRepository } from '@/domain/repositories/notification-repository';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { ReactionRepository } from '@/domain/repositories/reaction-repository';

/**
 * Conteneur d'injection de dépendances (ADR-0007). La présentation consomme les
 * repositories via ce provider — implémentations Supabase quand un projet est
 * configuré, mocks en mémoire sinon (hors-ligne / tests). Aucun container tiers.
 */
export interface Repositories {
  auth: AuthRepository;
  profile: ProfileRepository;
  group: GroupRepository;
  feed: FeedRepository;
  reaction: ReactionRepository;
  notification: NotificationRepository;
  follow: FollowRepository;
}

const RepositoriesContext = createContext<Repositories | null>(null);

function createDefaultRepositories(): Repositories {
  if (isSupabaseConfigured) {
    const client = getSupabaseClient();
    return {
      auth: new SupabaseAuthRepository(client),
      profile: new SupabaseProfileRepository(client),
      group: new SupabaseGroupRepository(client),
      feed: new SupabaseFeedRepository(client),
      reaction: new SupabaseReactionRepository(client),
      notification: new SupabaseNotificationRepository(client),
      follow: new SupabaseFollowRepository(client),
    };
  }
  // Mode hors-ligne : feed et réactions partagent le même store en mémoire.
  const reactionStore = new InMemoryReactionStore();
  DEMO_REACTIONS.forEach((r) => reactionStore.add(r.itemId, r.kind, r.userId));
  return {
    auth: new InMemoryAuthRepository(),
    profile: new InMemoryProfileRepository(),
    group: new InMemoryGroupRepository(),
    feed: new InMemoryFeedRepository(undefined, reactionStore),
    reaction: new InMemoryReactionRepository(reactionStore),
    notification: new InMemoryNotificationRepository(),
    follow: new InMemoryFollowRepository(),
  };
}

export function RepositoriesProvider({
  children,
  repositories,
}: {
  children: ReactNode;
  /** Permet d'injecter des mocks en test. */
  repositories?: Repositories;
}) {
  const value = useMemo(
    () => repositories ?? createDefaultRepositories(),
    [repositories],
  );
  return <RepositoriesContext.Provider value={value}>{children}</RepositoriesContext.Provider>;
}

export function useRepositories(): Repositories {
  const repositories = useContext(RepositoriesContext);
  if (!repositories) {
    throw new Error('useRepositories doit être utilisé dans un <RepositoriesProvider>.');
  }
  return repositories;
}

export function useAuthRepository(): AuthRepository {
  return useRepositories().auth;
}

export function useProfileRepository(): ProfileRepository {
  return useRepositories().profile;
}

export function useGroupRepository(): GroupRepository {
  return useRepositories().group;
}

export function useFeedRepository(): FeedRepository {
  return useRepositories().feed;
}

export function useReactionRepository(): ReactionRepository {
  return useRepositories().reaction;
}

export function useNotificationRepository(): NotificationRepository {
  return useRepositories().notification;
}

export function useFollowRepository(): FollowRepository {
  return useRepositories().follow;
}
