import type { AuthRepository } from '@/domain/repositories/auth-repository';

/**
 * Mock d'AuthRepository pour le mode hors-ligne / les tests. N'importe quel code
 * connecte un utilisateur fictif. Aucune dépendance externe (ADR-0007).
 */
export class InMemoryAuthRepository implements AuthRepository {
  private userId: string | null = null;
  private readonly listeners = new Set<(userId: string | null) => void>();

  async requestEmailOtp(_email: string): Promise<void> {
    // no-op : le code n'est pas réellement envoyé en mode mock.
  }

  async verifyEmailOtp(_email: string, _code: string): Promise<void> {
    this.userId = 'local-user';
    this.emit();
  }

  async getCurrentUserId(): Promise<string | null> {
    return this.userId;
  }

  onAuthChange(listener: (userId: string | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async signOut(): Promise<void> {
    this.userId = null;
    this.emit();
  }

  async deleteAccount(): Promise<void> {
    await this.signOut();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.userId));
  }
}
