/**
 * Port d'authentification (ADR-0005 / ADR-0007). Multi-provider par conception ;
 * cette première slice n'implémente que le magic link e-mail par code OTP.
 * La présentation dépend de cette interface, jamais du SDK Supabase.
 */
export interface AuthRepository {
  /** Envoie un code de connexion à l'e-mail (magic link / OTP). */
  requestEmailOtp(email: string): Promise<void>;
  /** Valide le code reçu et ouvre la session. */
  verifyEmailOtp(email: string, code: string): Promise<void>;
  /** Id de l'utilisateur connecté, ou null. */
  getCurrentUserId(): Promise<string | null>;
  /** S'abonne aux changements d'état d'auth ; renvoie une fonction de désabonnement. */
  onAuthChange(listener: (userId: string | null) => void): () => void;
  signOut(): Promise<void>;
}
