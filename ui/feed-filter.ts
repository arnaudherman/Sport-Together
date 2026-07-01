import type { FeedItem } from '@/domain/entities/feed';

export type FeedTab = 'tout' | 'abonnements' | 'groupes';

/**
 * Segmente le fil d'accueil (solo-first, ADR-0010) — logique pure, testable :
 * - `abonnements` : MES propres posts + ceux des gens que je suis (convention Twitter).
 * - `groupes`     : uniquement les posts rattachés à un groupe (présence de `groupName`).
 * - `tout`        : tout le fil.
 * Les auteurs BLOQUÉS sont exclus de tous les onglets (modération, App Store 1.2).
 */
export function filterFeed(
  items: readonly FeedItem[],
  tab: FeedTab,
  userId: string,
  following: readonly string[],
  blocked: readonly string[] = [],
): FeedItem[] {
  const visible = blocked.length > 0 ? items.filter((i) => !blocked.includes(i.authorId)) : [...items];
  if (tab === 'abonnements') return visible.filter((i) => i.authorId === userId || following.includes(i.authorId));
  if (tab === 'groupes') return visible.filter((i) => !!i.groupName);
  return visible;
}
