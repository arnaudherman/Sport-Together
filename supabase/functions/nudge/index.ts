// Edge Function (Deno) — relance bienveillante ciblée (ADR-0006). Un membre
// encourage un autre membre du MÊME groupe. L'appartenance commune est vérifiée
// côté serveur. Cadrage positif uniquement (vision §8).
//
// Déploiement : supabase functions deploy nudge
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request) => {
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!jwt) return new Response('unauthorized', { status: 401 });

  const { target_user_id, group_id } = await req.json().catch(() => ({}));
  if (!target_user_id || !group_id) return new Response('missing params', { status: 400 });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: auth, error } = await admin.auth.getUser(jwt);
  const sender = auth?.user;
  if (error || !sender) return new Response('unauthorized', { status: 401 });

  // L'émetteur ET la cible doivent appartenir au groupe.
  const { data: members } = await admin
    .from('memberships')
    .select('user_id')
    .eq('group_id', group_id)
    .in('user_id', [sender.id, target_user_id]);
  const ids = new Set((members ?? []).map((m: { user_id: string }) => m.user_id));
  if (!ids.has(sender.id) || !ids.has(target_user_id)) {
    return new Response('forbidden', { status: 403 });
  }

  const { data: tokens } = await admin
    .from('device_tokens')
    .select('token')
    .eq('user_id', target_user_id);
  if (!tokens || tokens.length === 0) return new Response('no tokens');

  const { data: profile } = await admin
    .from('profiles')
    .select('pseudo')
    .eq('id', sender.id)
    .maybeSingle();
  const who = profile?.pseudo ?? 'Un ami';

  const messages = tokens.map((t: { token: string }) => ({
    to: t.token,
    sound: 'default',
    title: 'Sport Together',
    body: `${who} t'encourage 💪`,
  }));

  const res = await fetch(EXPO_PUSH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  return new Response(await res.text(), { status: res.ok ? 200 : 502 });
});
