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
  it('publie en SOLO (groupId null) : la RPC reçoit p_group_id null (timeline perso)', async () => {
    const { client, calls } = fakeClient();
    const repo = new SupabaseFeedRepository(client);
    await repo.logSession(null, 'Course', 25);
    await repo.logSteps(null, 100);
    await repo.logRest(null);
    expect(calls.map((c) => c.name)).toEqual(['log_session', 'log_steps', 'log_rest']);
    expect(calls[0].params).toEqual({ p_group_id: null, p_activity: 'Course', p_duration_min: 25 });
    expect(calls[1].params).toEqual({ p_group_id: null, p_steps: 100 });
    expect(calls[2].params).toEqual({ p_group_id: null });
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
