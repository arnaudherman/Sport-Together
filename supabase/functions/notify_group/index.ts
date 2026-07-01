// Edge Function (Deno) — notifie les membres d'un groupe (sauf l'auteur) d'une
// nouvelle entrée de feed (ADR-0006). Appelée par le trigger feed_items_notify
// (pg_net) ou un Database Webhook. Utilise le service_role (bypass RLS) pour lire
// membres + tokens (sélection des destinataires côté serveur — ADR-0004).
//
// Sécurité : déployée avec --no-verify-jwt, elle exige un SECRET PARTAGÉ dans
// l'en-tête Authorization (le même que app.edge_service_key transmis par le
// trigger, cf. migration notifications.sql). Sans ce secret, 401 — pas d'appel
// anonyme possible (anti-flood, anti-oracle d'existence de groupe).
//
// Déploiement : supabase functions deploy notify_group --no-verify-jwt
//   + secret : supabase secrets set NOTIFY_HOOK_SECRET=<même valeur que app.edge_service_key>
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get('NOTIFY_HOOK_SECRET') ?? '';
  const provided = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!secret || !safeEqual(provided, secret)) {
    return new Response('unauthorized', { status: 401 });
  }

  try {
    const payload = await req.json();
    // Supporte notre trigger (corps plat) ET les Database Webhooks ({ record }).
    const rec = payload.record ?? payload;
    const feedItemId: string | undefined = rec.feed_item_id ?? rec.id;
    if (!feedItemId) return new Response('missing feed_item_id', { status: 400 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Valeurs FAISANT AUTORITÉ : on ne fait pas confiance au group_id/author_id du
    // payload (un détenteur du secret pourrait les forger pour spammer un groupe
    // arbitraire). On relit la ligne réelle ; si elle n'existe pas -> 400.
    const { data: item } = await supabase
      .from('feed_items')
      .select('group_id, author_id')
      .eq('id', feedItemId)
      .maybeSingle();
    if (!item) return new Response('unknown feed_item', { status: 400 });
    const groupId: string = item.group_id;
    const authorId: string | null = item.author_id;

    const { data: members } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('group_id', groupId);
    const recipientIds = (members ?? [])
      .map((m: { user_id: string }) => m.user_id)
      .filter((id: string) => id !== authorId);
    if (recipientIds.length === 0) return new Response('ok');

    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token')
      .in('user_id', recipientIds);
    if (!tokens || tokens.length === 0) return new Response('ok');

    const { data: author } = await supabase
      .from('profiles')
      .select('pseudo')
      .eq('id', authorId)
      .maybeSingle();
    const who = author?.pseudo ?? 'Un ami';

    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      sound: 'default',
      title: 'Sport Together',
      body: `${who} vient de logger 💪`,
    }));

    const res = await fetch(EXPO_PUSH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    return new Response(res.ok ? 'ok' : 'push error', { status: res.ok ? 200 : 502 });
  } catch (e) {
    return new Response((e as Error).message, { status: 500 });
  }
});
