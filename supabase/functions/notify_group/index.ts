// Edge Function (Deno) — notifie les membres d'un groupe (sauf l'auteur) d'une
// nouvelle entrée de feed (ADR-0006). Appelée par le trigger feed_items_notify
// (pg_net) ou un Database Webhook. Utilise le service_role pour lire membres +
// tokens (la sélection des destinataires est faite côté serveur — ADR-0004).
//
// Déploiement : supabase functions deploy notify_group --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    // Supporte notre trigger (corps plat) ET les Database Webhooks ({ record }).
    const rec = payload.record ?? payload;
    const groupId: string | undefined = rec.group_id;
    const authorId: string | null = rec.author_id ?? null;
    if (!groupId) return new Response('missing group_id', { status: 400 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: members } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('group_id', groupId);
    const recipientIds = (members ?? [])
      .map((m: { user_id: string }) => m.user_id)
      .filter((id: string) => id !== authorId);
    if (recipientIds.length === 0) return new Response('no recipients');

    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token')
      .in('user_id', recipientIds);
    if (!tokens || tokens.length === 0) return new Response('no tokens');

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
    return new Response(await res.text(), { status: res.ok ? 200 : 502 });
  } catch (e) {
    return new Response((e as Error).message, { status: 500 });
  }
});
