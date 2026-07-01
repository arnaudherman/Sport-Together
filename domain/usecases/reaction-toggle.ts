import { EMPTY_REACTIONS, type FeedItem, type ReactionKind } from '@/domain/entities/feed';

/**
 * Applique de façon PURE un toggle de réaction à un item (pour l'optimistic update
 * du feed). `mine` reste idempotent (Set) et les compteurs sont bornés à >= 0 pour
 * ne jamais afficher un total négatif en cas de double-tap rapide ou de rollback partiel.
 */
export function withToggledReaction(item: FeedItem, kind: ReactionKind, on: boolean): FeedItem {
  const r = item.reactions ?? EMPTY_REACTIONS;
  const bump = (current: number, isThisKind: boolean) =>
    isThisKind ? Math.max(0, current + (on ? 1 : -1)) : current;
  return {
    ...item,
    reactions: {
      kudos: bump(r.kudos, kind === 'kudos'),
      encouragement: bump(r.encouragement, kind === 'encouragement'),
      mine: on ? [...new Set([...r.mine, kind])] : r.mine.filter((k) => k !== kind),
    },
  };
}
