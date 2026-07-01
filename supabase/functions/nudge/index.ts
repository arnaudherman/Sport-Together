// Edge Function (Deno) — relance bienveillante ciblée (ADR-0006). Un membre
// encourage un autre membre du MÊME groupe. L'appartenance commune est vérifiée
// côté serveur. Cadrage positif uniquement (vision §8). THROTTLE anti-harcèlement :
//   - ATOMIQUE : au plus 1 relance par couple (émetteur, cible) / 12h, garanti par
//     l'index UNIQUE (sender, target, bucket) via INSERT ON CONFLICT (pas de TOCTOU) ;
//   - GLOBAL : au plus MAX_PER_TARGET relances reçues / 12h, tous émetteurs confondus
//     (anti-harcèlement coordonné).
// Entrées validées comme UUID avant tout accès DB (payload malformé -> 400).
//
// Déploiement : supabase functions deploy nudge
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';
const THROTTLE_HOURS = 12;
const WINDOW_MS = THROTTLE_HOURS * 3600 * 1000;
const MAX_PER_TARGET = 3; // relances reçues max / fenêtre, tous émetteurs confondus
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!jwt) return new Response('unauthorized', { status: 401 });

  const { target_user_id, group_id } = await req.json().catch(() => ({}));
  if (!target_user_id || !group_id) return new Response('missing params', { status: 400 });
  // Valider le FORMAT avant tout accès DB (payload malformé -> 400, pas 500).
  if (!UUID_RE.test(target_user_id) || !UUID_RE.test(group_id)) {
    return new Response('invalid params', { status: 400 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: auth, error } = await admin.auth.getUser(jwt);
  const sender = auth?.user;
  if (error || !sender) return new Response('unauthorized', { status: 401 });
  if (sender.id === target_user_id) return new Response('cannot nudge self', { status: 400 });

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

  // Fenêtre (bucket) de 12h alignée, fournie explicitement — socle du throttle atomique.
  const bucket = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS).toISOString();

  // Plafond GLOBAL par cible : au plus MAX_PER_TARGET relances reçues / fenêtre, tous
  // émetteurs confondus (anti-harcèlement coordonné, absent de la version par-couple).
  const { count: received } = await admin
    .from('nudges')
    .select('*', { count: 'exact', head: true })
    .eq('target_id', target_user_id)
    .eq('bucket', bucket);
  if ((received ?? 0) >= MAX_PER_TARGET) {
    return new Response('cible déjà beaucoup encouragée', { status: 429 });
  }

  // Throttle par couple ATOMIQUE : l'index unique (sender, target, bucket) garantit
  // « 1 par couple / 12h » même sous appels concurrents ; ignoreDuplicates => `data`
  // vide si le couple a déjà relancé dans la fenêtre (plus de TOCTOU SELECT-puis-INSERT).
  const { data: inserted, error: insErr } = await admin
    .from('nudges')
    .upsert(
      { sender_id: sender.id, target_id: target_user_id, group_id, bucket },
      { onConflict: 'sender_id,target_id,bucket', ignoreDuplicates: true },
    )
    .select('sender_id');
  if (insErr) return new Response('error', { status: 500 });
  if (!inserted || inserted.length === 0) {
    return new Response('déjà relancé récemment', { status: 429 });
  }

  const { data: tokens } = await admin
    .from('device_tokens')
    .select('token')
    .eq('user_id', target_user_id);
  if (!tokens || tokens.length === 0) return new Response('ok');

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
  return new Response(res.ok ? 'ok' : 'push error', { status: res.ok ? 200 : 502 });
});
