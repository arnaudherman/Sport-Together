/**
 * Port des notifications (ADR-0006 / ADR-0007). Enregistrement du token d'appareil
 * et relance bienveillante d'un membre. La présentation passe par cette interface,
 * jamais par le SDK Supabase ni Expo directement.
 */
export interface NotificationRepository {
  registerToken(token: string, platform: 'ios' | 'android'): Promise<void>;
  removeToken(token: string): Promise<void>;
  /** Relance ciblée d'un membre du groupe (push bienveillant). */
  nudge(targetUserId: string, groupId: string): Promise<void>;
}
