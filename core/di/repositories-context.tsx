import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { isSupabaseConfigured } from '@/core/env';
import { getSupabaseClient } from '@/core/supabase/client';
import { InMemoryAuthRepository } from '@/data/auth/in-memory-auth-repository';
import { SupabaseAuthRepository } from '@/data/auth/supabase-auth-repository';
import { InMemoryFeedRepository } from '@/data/feed/in-memory-feed-repository';
import { SupabaseFeedRepository } from '@/data/feed/supabase-feed-repository';
import { InMemoryGroupRepository } from '@/data/group/in-memory-group-repository';
import { SupabaseGroupRepository } from '@/data/group/supabase-group-repository';
import type { AuthRepository } from '@/domain/repositories/auth-repository';
import type { FeedRepository } from '@/domain/repositories/feed-repository';
import type { GroupRepository } from '@/domain/repositories/group-repository';

/**
 * Conteneur d'injection de dépendances (ADR-0007). La présentation consomme les
 * repositories via ce provider — implémentations Supabase quand un projet est
 * configuré, mocks en mémoire sinon (hors-ligne / tests). Aucun container tiers.
 */
export interface Repositories {
  auth: AuthRepository;
  group: GroupRepository;
  feed: FeedRepository;
}

const RepositoriesContext = createContext<Repositories | null>(null);

function createDefaultRepositories(): Repositories {
  if (isSupabaseConfigured) {
    const client = getSupabaseClient();
    return {
      auth: new SupabaseAuthRepository(client),
      group: new SupabaseGroupRepository(client),
      feed: new SupabaseFeedRepository(client),
    };
  }
  return {
    auth: new InMemoryAuthRepository(),
    group: new InMemoryGroupRepository(),
    feed: new InMemoryFeedRepository(),
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

export function useGroupRepository(): GroupRepository {
  return useRepositories().group;
}

export function useFeedRepository(): FeedRepository {
  return useRepositories().feed;
}
