import type { FeedItem } from '@/domain/entities/feed';

/**
 * « Journée parfaite » (vision §3) : tous les membres du groupe ont loggé au
 * moins un goal ce jour-là. Logique métier pure — testable sans backend.
 *
 * Volontairement non punitive : l'absence d'un membre rend la journée « non
 * parfaite » (signal de relance), elle ne « casse » rien de collectif.
 */
export function isPerfectDay(memberIds: string[], dayItems: FeedItem[]): boolean {
  if (memberIds.length === 0) return false;
  const loggers = new Set(dayItems.map((item) => item.authorId));
  return memberIds.every((memberId) => loggers.has(memberId));
}
