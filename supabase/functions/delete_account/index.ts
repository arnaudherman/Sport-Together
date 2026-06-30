// Edge Function (Deno) — suppression de compte (ADR-0005 ; exigence Apple 5.1.1(v)
// + RGPD). Vérifie le JWT de l'appelant, purge ses photos (best-effort), puis
// supprime l'utilisateur. La cascade SQL anonymise le feed (author_id -> null) et
// retire les memberships.
//
// Déploiement : supabase functions deploy delete_account
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!jwt) return new Response('unauthorized', { status: 401 });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: auth, error } = await admin.auth.getUser(jwt);
  const user = auth?.user;
  if (error || !user) return new Response('unauthorized', { status: 401 });

  // Purge best-effort des photos de l'utilisateur (RGPD) : les cascades SQL ne
  // touchent pas le bucket Storage.
  try {
    const { data: items } = await admin
      .from('feed_items')
      .select('sessions(photo_path), meals(photo_path)')
      .eq('author_id', user.id);
    const paths: string[] = [];
    for (const it of items ?? []) {
      const s = Array.isArray(it.sessions) ? it.sessions[0] : it.sessions;
      const m = Array.isArray(it.meals) ? it.meals[0] : it.meals;
      if (s?.photo_path) paths.push(s.photo_path);
      if (m?.photo_path) paths.push(m.photo_path);
    }
    if (paths.length > 0) await admin.storage.from('feed-photos').remove(paths);
  } catch (_) {
    // best-effort : ne bloque pas la suppression du compte.
  }

  const { error: delError } = await admin.auth.admin.deleteUser(user.id);
  if (delError) return new Response(delError.message, { status: 500 });
  return new Response('ok');
});
