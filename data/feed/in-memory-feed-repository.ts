import {
  EMPTY_REACTIONS,
  type FeedItem,
  type FeedItemType,
  type ReactionKind,
} from '@/domain/entities/feed';
import type { MealInput } from '@/domain/entities/meal';
import type { FeedRepository } from '@/domain/repositories/feed-repository';

import type { InMemoryCommentStore } from '@/data/comment/in-memory-comment-store';
import type { InMemoryReactionStore } from '@/data/reaction/in-memory-reaction-store';

/**
 * Implémentation en mémoire du FeedRepository. Sert de mock dans les tests et de
 * mode hors-ligne (aucun projet Supabase configuré). Aucune dépendance à Supabase
 * (ADR-0007). Le store de réactions est partagé avec le ReactionRepository.
 */
export class InMemoryFeedRepository implements FeedRepository {
  private items: FeedItem[];

  constructor(
    seed: readonly FeedItem[] = DEMO_FEED,
    private readonly reactions?: InMemoryReactionStore,
    private readonly viewerId = 'local-user',
    private readonly comments?: InMemoryCommentStore,
  ) {
    this.items = [...seed];
  }

  async listHomeFeed(): Promise<FeedItem[]> {
    return this.withReactions(this.items);
  }

  async listGroupFeed(groupId: string): Promise<FeedItem[]> {
    return this.withReactions(this.items.filter((item) => item.groupId === groupId));
  }

  async listUserFeed(userId: string): Promise<FeedItem[]> {
    return this.withReactions(this.items.filter((item) => item.authorId === userId));
  }

  private withReactions(items: readonly FeedItem[]): FeedItem[] {
    return [...items]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => ({
        ...item,
        reactions: this.reactions
          ? this.reactions.summaryFor(item.id, this.viewerId)
          : EMPTY_REACTIONS,
        commentCount: this.comments ? this.comments.count(item.id) : 0,
      }));
  }

  private push(groupId: string | null, type: FeedItemType, summary: string): void {
    // groupId null = post solo (timeline perso) : id de groupe personnel, pas de badge.
    this.items.push({
      id: `local-${this.items.length + 1}`,
      groupId: groupId ?? 'solo',
      authorId: this.viewerId,
      authorName: 'Moi',
      type,
      createdAt: new Date().toISOString(),
      summary,
    });
  }

  async logSession(groupId: string | null, activity: string, durationMin?: number): Promise<void> {
    this.push(groupId, 'session', durationMin ? `${activity} · ${durationMin} min` : activity);
  }

  async logSteps(groupId: string | null, steps: number): Promise<void> {
    this.push(groupId, 'steps', `${steps} pas`);
  }

  async logMeal(groupId: string | null, meal: MealInput): Promise<void> {
    const calories = meal.caloriesKcal != null ? ` · ${meal.caloriesKcal} kcal` : '';
    this.push(groupId, 'meal', `${meal.label}${calories}`);
  }

  async logRest(groupId: string | null): Promise<void> {
    this.push(groupId, 'rest', 'Jour de repos 😴');
  }

  async deletePost(feedItemId: string): Promise<void> {
    this.items = this.items.filter((item) => item.id !== feedItemId);
  }
}

/**
 * Données de démonstration pour le mode hors-ligne. Générées sur 3 jours pour que
 * les streaks (perso + journée parfaite du groupe) et l'assiduité soient réels.
 */
const DAY_MS = 86_400_000;
const demoNow = Date.now();
const at = (dayOffset: number, mins: number): string =>
  new Date(demoNow - dayOffset * DAY_MS - mins * 60_000).toISOString();

function demoItem(
  id: string,
  authorId: string,
  authorName: string,
  type: FeedItemType,
  createdAt: string,
  summary: string,
  groupName?: string,
  photoUrl?: string,
): FeedItem {
  return { id, groupId: 'demo-group', authorId, authorName, type, createdAt, summary, groupName, photoUrl };
}

// Solo-first : Moi = posts perso, Sam = abonnement (pas de groupe), Léa/Noa =
// activité de groupes privés (badge). Alimente les segments Tout/Abonnements/Groupes.
export const DEMO_FEED: readonly FeedItem[] = [
  // Aujourd'hui
  demoItem('d0-moi-s', 'local-user', 'Moi', 'session', at(0, 40), '45 min de course — plus longue série cette semaine'),
  demoItem('d0-lea-s', 'u-lea', 'Léa', 'session', at(0, 12), 'Course matinale au bord du lac — 5,2 km', 'The Crew', 'https://picsum.photos/id/1011/680/360'),
  demoItem('d0-sam-st', 'u-sam', 'Sam', 'steps', at(0, 74), '10 248 pas'),
  demoItem('d0-noa-m', 'u-noa', 'Noa', 'meal', at(0, 150), 'Salade César · 480 kcal', 'Les Costauds'),
  demoItem('d0-noa-r', 'u-noa', 'Noa', 'rest', at(0, 65), 'Jour de repos 😴'),
  // Hier
  demoItem('d1-moi-s', 'local-user', 'Moi', 'session', at(1, 60), 'Muscu haut du corps'),
  demoItem('d1-moi-m', 'local-user', 'Moi', 'meal', at(1, 200), 'Poulet-riz · 640 kcal'),
  demoItem('d1-lea-s', 'u-lea', 'Léa', 'session', at(1, 30), 'Course 5 km', 'The Crew', 'https://picsum.photos/id/1018/680/360'),
  demoItem('d1-sam-s', 'u-sam', 'Sam', 'session', at(1, 90), 'Vélo 40 min', undefined, 'https://picsum.photos/id/1015/680/360'),
  demoItem('d1-noa-st', 'u-noa', 'Noa', 'steps', at(1, 120), '8 430 pas', 'Les Costauds'),
  // Avant-hier
  demoItem('d2-moi-s', 'local-user', 'Moi', 'session', at(2, 50), 'Gainage + pompes'),
  demoItem('d2-lea-m', 'u-lea', 'Léa', 'meal', at(2, 180), 'Buddha bowl · 550 kcal', 'The Crew'),
];

/** Réactions de démonstration (mode hors-ligne). Viewer = 'local-user'. */
export const DEMO_REACTIONS: { itemId: string; kind: ReactionKind; userId: string }[] = [
  { itemId: 'd0-lea-s', kind: 'kudos', userId: 'local-user' },
  { itemId: 'd0-lea-s', kind: 'kudos', userId: 'u-sam' },
  { itemId: 'd0-lea-s', kind: 'kudos', userId: 'u-noa' },
  { itemId: 'd0-lea-s', kind: 'encouragement', userId: 'local-user' },
  { itemId: 'd0-moi-s', kind: 'kudos', userId: 'u-lea' },
  { itemId: 'd0-moi-s', kind: 'kudos', userId: 'u-sam' },
  { itemId: 'd1-lea-s', kind: 'kudos', userId: 'local-user' },
  { itemId: 'd0-noa-m', kind: 'encouragement', userId: 'u-lea' },
];
