// Edge Function (Deno) — suppression de compte (ADR-0005 ; exigence Apple 5.1.1(v)
// + RGPD). Vérifie le JWT de l'appelant puis supprime l'utilisateur. La cascade
// SQL anonymise le feed (author_id -> null) et retire les memberships.
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

  const { error: delError } = await admin.auth.admin.deleteUser(user.id);
  if (delError) return new Response(delError.message, { status: 500 });
  return new Response('ok');
});
