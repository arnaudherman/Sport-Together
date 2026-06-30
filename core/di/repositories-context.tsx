import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { InMemoryFeedRepository } from '@/data/feed/in-memory-feed-repository';
import type { FeedRepository } from '@/domain/repositories/feed-repository';

/**
 * Conteneur d'injection de dépendances (ADR-0007). La présentation consomme les
 * repositories via ce provider — implémentations réelles en production, mocks en
 * test. Aucun container tiers : le Context React suffit.
 */
export interface Repositories {
  feed: FeedRepository;
}

const RepositoriesContext = createContext<Repositories | null>(null);

/** Implémentations par défaut (scaffold). Le câblage Supabase se branchera ici. */
function createDefaultRepositories(): Repositories {
  return {
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

export function useFeedRepository(): FeedRepository {
  return useRepositories().feed;
}
