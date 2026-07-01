export type ReportKind = 'post' | 'comment' | 'profile';

/**
 * Port de modération UGC (App Store 1.2) : signaler du contenu, bloquer des
 * utilisateurs. Les signalements sont write-only côté client (lus par la
 * modération via service_role) ; les blocages n'appartiennent qu'au bloqueur.
 */
export interface ModerationRepository {
  /** Signale un contenu (post / commentaire / profil) avec une raison libre. */
  report(kind: ReportKind, targetId: string, reason: string): Promise<void>;
  /** Ids des utilisateurs que J'AI bloqués. */
  listBlocked(): Promise<string[]>;
  /** Bloque un utilisateur (coupe aussi le follow dans les deux sens côté serveur). */
  block(userId: string): Promise<void>;
  /** Débloque un utilisateur. */
  unblock(userId: string): Promise<void>;
}
