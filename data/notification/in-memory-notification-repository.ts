import type { NotificationRepository } from '@/domain/repositories/notification-repository';

/** Mock de NotificationRepository (hors-ligne / tests) — sans effet. */
export class InMemoryNotificationRepository implements NotificationRepository {
  async registerToken(_token: string, _platform: 'ios' | 'android'): Promise<void> {}
  async removeToken(_token: string): Promise<void> {}
  async nudge(_targetUserId: string, _groupId: string): Promise<void> {}
}
