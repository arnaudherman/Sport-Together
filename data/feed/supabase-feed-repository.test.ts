import { describe, expect, it } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseFeedRepository } from '@/data/feed/supabase-feed-repository';

/** Faux client Supabase : capture les appels RPC, ne touche à aucun réseau. */
function fakeClient() {
  const calls: { name: string; params: unknown }[] = [];
  const client = {
    rpc: (name: string, params: unknown) => {
      calls.push({ name, params });
      return Promise.resolve({ data: null, error: null });
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('SupabaseFeedRepository — contrat de publication', () => {
  it('REJETTE la publication solo (groupId null) sur les 3 types, sans appeler la RPC', async () => {
    const { client, calls } = fakeClient();
    const repo = new SupabaseFeedRepository(client);
    await expect(repo.logSession(null, 'Course')).rejects.toThrow(/solo/i);
    await expect(repo.logSteps(null, 100)).rejects.toThrow(/solo/i);
    await expect(repo.logMeal(null, { label: 'Bowl' })).rejects.toThrow(/solo/i);
    expect(calls).toHaveLength(0); // la garde tombe AVANT tout appel réseau
  });

  it('appelle log_session avec le bon groupe quand groupId est fourni', async () => {
    const { client, calls } = fakeClient();
    const repo = new SupabaseFeedRepository(client);
    await repo.logSession('g1', 'Course', 30);
    expect(calls).toEqual([
      { name: 'log_session', params: { p_group_id: 'g1', p_activity: 'Course', p_duration_min: 30 } },
    ]);
  });
});
