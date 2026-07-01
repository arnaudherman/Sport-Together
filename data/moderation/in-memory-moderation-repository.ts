import type { ModerationRepository, ReportKind } from '@/domain/repositories/moderation-repository';

/** Mock de modération (hors-ligne / tests). Les signalements sont juste comptés. */
export class InMemoryModerationRepository implements ModerationRepository {
  readonly reports: { kind: ReportKind; targetId: string; reason: string }[] = [];
  private readonly blocked = new Set<string>();

  async report(kind: ReportKind, targetId: string, reason: string): Promise<void> {
    this.reports.push({ kind, targetId, reason });
  }

  async listBlocked(): Promise<string[]> {
    return [...this.blocked];
  }

  async block(userId: string): Promise<void> {
    this.blocked.add(userId);
  }

  async unblock(userId: string): Promise<void> {
    this.blocked.delete(userId);
  }
}
