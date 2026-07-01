/** Commentaire sur un post (ADR-0010). */
export interface Comment {
  id: string;
  feedItemId: string;
  authorId: string;
  authorName: string;
  text: string;
  /** Horodatage ISO 8601 (UTC). */
  createdAt: string;
}
