// Tests d'isolation multi-tenant (ADR-0004) + RPC + garde-fous, exécutés contre
// un vrai PostgreSQL (migrations appliquées sur des shims auth/storage).
//
// On simule un utilisateur authentifié comme le fait Supabase : rôle SQL
// `authenticated` + claim JWT `sub` (lue par auth.uid()). Les fonctions
// SECURITY DEFINER voient cette claim de session.
//
//   DATABASE_URL=postgresql://127.0.0.1:54329/st_test node supabase/tests/rls.test.mjs
import pg from 'pg';
import assert from 'node:assert/strict';

const URL = process.env.DATABASE_URL ?? 'postgresql://127.0.0.1:54329/st_test';

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const CAROL = '33333333-3333-3333-3333-333333333333';
const DAVE = '44444444-4444-4444-4444-444444444444';

const client = new pg.Client({ connectionString: URL });

function admin(text, params = []) {
  return client.query(text, params);
}

// Exécute une requête en tant qu'utilisateur authentifié donné, dans sa propre
// transaction (les fonctions définer commitent ; rollback si la requête échoue).
async function asUser(uid, text, params = []) {
  await client.query('begin');
  try {
    await client.query('set local role authenticated');
    await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    const res = await client.query(text, params);
    await client.query('commit');
    return res;
  } catch (e) {
    await client.query('rollback');
    throw e;
  }
}

function expectReject(promise, label) {
  return assert.rejects(promise, () => true, label);
}

let failures = 0;
const only = process.argv[2];
async function step(name, fn) {
  if (only && !name.includes(only)) return;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures += 1;
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

async function reset() {
  await admin(`truncate auth.users, public.profiles, public.groups, public.memberships,
    public.feed_items, public.sessions, public.step_logs, public.meals, public.reactions,
    public.follows, public.comments, public.nudges
    restart identity cascade`);
}

let A;
let B;

async function main() {
  await client.connect();
  await reset();

  // setup : 4 utilisateurs (trigger handle_new_user crée les profils, is_adult=false)
  await admin(`insert into auth.users (id) values ($1),($2),($3),($4)`, [ALICE, BOB, CAROL, DAVE]);
  await admin(`update public.profiles set is_adult = true where id = any($1)`, [[ALICE, BOB, DAVE]]);

  await step('create_group : crée le groupe + rend le créateur membre', async () => {
    A = (await asUser(ALICE, `select * from public.create_group('Groupe A')`)).rows[0];
    B = (await asUser(BOB, `select * from public.create_group('Groupe B')`)).rows[0];
    assert.ok(A.id && A.invite_code, 'A renvoie id + invite_code');
    const members = (await admin(`select user_id from public.memberships where group_id=$1`, [A.id])).rows;
    assert.equal(members.length, 1);
    assert.equal(members[0].user_id, ALICE);
  });

  await step('isolation lecture : alice ne voit que son groupe', async () => {
    const mine = (await asUser(ALICE, `select id from public.groups`)).rows;
    assert.equal(mine.length, 1);
    assert.equal(mine[0].id, A.id);
    const seesB = (await asUser(ALICE, `select id from public.groups where id=$1`, [B.id])).rows;
    assert.equal(seesB.length, 0, 'alice ne voit pas le groupe de bob');
  });

  await step('log_session : membre OK, non-membre REFUSÉ', async () => {
    await asUser(ALICE, `select public.log_session($1,'Course',30)`, [A.id]);
    const feed = (await asUser(ALICE, `select id from public.feed_items`)).rows;
    assert.equal(feed.length, 1);
    await expectReject(
      asUser(BOB, `select public.log_session($1,'Triche',10)`, [A.id]),
      'bob (non-membre) ne peut pas logger dans A',
    );
  });

  await step('isolation feed : bob ne voit pas le feed de A', async () => {
    const bobFeed = (await asUser(BOB, `select id from public.feed_items where group_id=$1`, [A.id])).rows;
    assert.equal(bobFeed.length, 0);
  });

  await step('group_id immuable : déplacer un item vers un autre groupe REFUSÉ', async () => {
    const item = (await asUser(ALICE, `select id from public.feed_items limit 1`)).rows[0];
    await expectReject(
      asUser(ALICE, `update public.feed_items set group_id=$1 where id=$2`, [B.id, item.id]),
      'déplacement cross-groupe',
    );
  });

  await step('memberships : INSERT direct REFUSÉ (adhésion via RPC seulement)', async () => {
    await expectReject(
      asUser(CAROL, `insert into public.memberships (group_id,user_id) values ($1,$2)`, [A.id, CAROL]),
      'auto-injection dans un groupe',
    );
  });

  await step('forger author_id : INSERT feed_items avec un autre auteur REFUSÉ', async () => {
    await expectReject(
      asUser(BOB, `insert into public.feed_items (group_id,author_id,type) values ($1,$2,'session')`, [A.id, ALICE]),
      'author_id forgé',
    );
  });

  await step('join_group_by_code : bob rejoint A et voit son feed', async () => {
    await asUser(BOB, `select * from public.join_group_by_code($1)`, [A.invite_code]);
    const groups = (await asUser(BOB, `select id from public.groups`)).rows;
    assert.equal(groups.length, 2, 'bob voit A et B');
    const feed = (await asUser(BOB, `select id from public.feed_items where group_id=$1`, [A.id])).rows;
    assert.equal(feed.length, 1, 'bob voit le feed de A');
  });

  await step('age-gating : non-adulte peut logger une séance mais PAS un repas', async () => {
    await asUser(CAROL, `select * from public.join_group_by_code($1)`, [A.invite_code]);
    await asUser(CAROL, `select public.log_session($1,'Marche',20)`, [A.id]); // OK
    await expectReject(
      asUser(CAROL, `select public.log_meal($1,'Repas',null,500,30,40,10)`, [A.id]),
      'log_meal par un non-adulte',
    );
    await asUser(ALICE, `select public.log_meal($1,'Bowl',null,600,40,50,15)`, [A.id]); // adulte OK
  });

  await step('réactions : membre OK, non-membre REFUSÉ', async () => {
    const target = (await asUser(ALICE, `select id from public.feed_items where group_id=$1 limit 1`, [A.id])).rows[0];
    await asUser(BOB, `insert into public.reactions (feed_item_id,author_id,kind) values ($1,$2,'kudos')`, [target.id, BOB]);
    const c = (await admin(`select count(*)::int c from public.reactions where feed_item_id=$1`, [target.id])).rows[0].c;
    assert.equal(c, 1);
    await expectReject(
      asUser(DAVE, `insert into public.reactions (feed_item_id,author_id,kind) values ($1,$2,'kudos')`, [target.id, DAVE]),
      'réaction par un non-membre',
    );
  });

  await step('storage : membre écrit/lit ses photos, non-membre & autre-uid REFUSÉS', async () => {
    const obj = (gid, uid) => `${gid}/${uid}/00000000-0000-0000-0000-000000000000/p.jpg`;
    // alice (membre A) écrit sous son propre uid -> OK
    await asUser(ALICE, `insert into storage.objects (bucket_id,name,owner) values ('feed-photos',$1,$2)`, [obj(A.id, ALICE), ALICE]);
    // alice écrit sous l'uid de bob -> REFUSÉ (binding auteur)
    await expectReject(
      asUser(ALICE, `insert into storage.objects (bucket_id,name,owner) values ('feed-photos',$1,$2)`, [obj(A.id, BOB), ALICE]),
      'photo sous l\'uid d\'autrui',
    );
    // alice écrit dans le groupe B (non-membre) -> REFUSÉ
    await expectReject(
      asUser(ALICE, `insert into storage.objects (bucket_id,name,owner) values ('feed-photos',$1,$2)`, [obj(B.id, ALICE), ALICE]),
      'photo dans un groupe non-membre',
    );
    // dave (non-membre) ne voit pas les photos de A ; bob (membre) oui
    const daveSees = (await asUser(DAVE, `select id from storage.objects where bucket_id='feed-photos' and name like $1`, [`${A.id}/%`])).rows;
    assert.equal(daveSees.length, 0, 'dave ne voit pas les photos de A');
    const bobSees = (await asUser(BOB, `select id from storage.objects where bucket_id='feed-photos' and name like $1`, [`${A.id}/%`])).rows;
    assert.equal(bobSees.length, 1, 'bob voit les photos de A');
  });

  await step('profils : visibles des co-membres seulement, modifiables seulement par soi', async () => {
    const visible = (await asUser(ALICE, `select id from public.profiles`)).rows.map((r) => r.id).sort();
    assert.deepEqual(visible, [ALICE, BOB, CAROL].sort(), 'alice voit ses co-membres, pas dave');
    const other = await asUser(ALICE, `update public.profiles set pseudo='hack' where id=$1`, [BOB]);
    assert.equal(other.rowCount, 0, 'modifier le profil d\'autrui = 0 ligne');
    const self = await asUser(ALICE, `update public.profiles set pseudo='Alice' where id=$1`, [ALICE]);
    assert.equal(self.rowCount, 1, 'modifier son propre profil OK');
  });

  await step('isolation totale : dave (aucun groupe) ne voit rien de A', async () => {
    const feed = (await asUser(DAVE, `select id from public.feed_items where group_id=$1`, [A.id])).rows;
    assert.equal(feed.length, 0);
    const groups = (await asUser(DAVE, `select id from public.groups`)).rows;
    assert.equal(groups.length, 0);
  });

  await step('abonnements : suivre expose les posts d\'un non-co-membre, sans ouvrir le groupe', async () => {
    // dave n'est dans aucun groupe et ne voit rien de A (cf. test précédent).
    // Il suit alice -> il voit désormais ses publications + leurs détails + son profil.
    await asUser(DAVE, `insert into public.follows (follower_id, followee_id) values ($1,$2)`, [DAVE, ALICE]);
    const seen = (await asUser(DAVE, `select id from public.feed_items where author_id=$1`, [ALICE])).rows;
    assert.ok(seen.length >= 1, 'dave voit les publications d\'alice qu\'il suit');
    const sess = (await asUser(DAVE, `select feed_item_id from public.sessions`)).rows;
    assert.ok(sess.length >= 1, 'dave voit le détail (session) d\'une publication visible');
    const prof = (await asUser(DAVE, `select id from public.profiles where id=$1`, [ALICE])).rows;
    assert.equal(prof.length, 1, 'dave voit le profil d\'alice qu\'il suit');
    // Mais suivre n'ouvre PAS l'accès au groupe (visibilité, pas adhésion).
    const grp = (await asUser(DAVE, `select id from public.groups where id=$1`, [A.id])).rows;
    assert.equal(grp.length, 0, 'suivre n\'ouvre pas l\'accès au groupe');
    // Ne plus suivre retire la visibilité (l'isolation revient).
    await asUser(DAVE, `delete from public.follows where follower_id=$1 and followee_id=$2`, [DAVE, ALICE]);
    const after = (await asUser(DAVE, `select id from public.feed_items where author_id=$1`, [ALICE])).rows;
    assert.equal(after.length, 0, 'ne plus suivre retire la visibilité');
  });

  await step('timeline perso : post solo (group_id null) visible par soi + abonnés seulement', async () => {
    // alice publie en SOLO via la RPC (p_group_id null) — le cas nominal solo-first.
    const fid = (await asUser(ALICE, `select public.log_session(null, 'Course solo', 25) as id`)).rows[0].id;
    const row = (await admin(`select group_id from public.feed_items where id=$1`, [fid])).rows[0];
    assert.equal(row.group_id, null, 'post solo sans groupe');
    // l'auteure le voit (avec son détail).
    const mine = (await asUser(ALICE, `select id from public.feed_items where id=$1`, [fid])).rows;
    assert.equal(mine.length, 1, 'alice voit son post solo');
    // bob (co-membre du groupe A mais non abonné) ne le voit PAS : solo = fil perso.
    const bobSees = (await asUser(BOB, `select id from public.feed_items where id=$1`, [fid])).rows;
    assert.equal(bobSees.length, 0, 'un co-membre non abonné ne voit pas le post solo');
    // dave s'abonne à alice -> il voit le post + son détail, peut réagir ET commenter.
    await asUser(DAVE, `insert into public.follows (follower_id, followee_id) values ($1,$2)`, [DAVE, ALICE]);
    const daveSees = (await asUser(DAVE, `select id from public.feed_items where id=$1`, [fid])).rows;
    assert.equal(daveSees.length, 1, 'un abonné voit le post solo');
    const detail = (await asUser(DAVE, `select activity from public.sessions where feed_item_id=$1`, [fid])).rows;
    assert.equal(detail.length, 1, 'le détail (session) suit la visibilité');
    await asUser(DAVE, `insert into public.reactions (feed_item_id, author_id, kind) values ($1,$2,'kudos')`, [fid, DAVE]);
    await asUser(DAVE, `insert into public.comments (feed_item_id, author_id, text) values ($1,$2,'Bien joué !')`, [fid, DAVE]);
    // supprimer un commentaire : réservé à son auteur (alice ne peut pas, dave oui).
    const cid = (await admin(`select id from public.comments where feed_item_id=$1 and author_id=$2`, [fid, DAVE])).rows[0].id;
    const foreignDel = await asUser(ALICE, `delete from public.comments where id=$1`, [cid]);
    assert.equal(foreignDel.rowCount, 0, 'supprimer le commentaire d\'autrui = 0 ligne');
    const ownDel = await asUser(DAVE, `delete from public.comments where id=$1`, [cid]);
    assert.equal(ownDel.rowCount, 1, 'dave supprime son propre commentaire');
    // se désabonner retire tout.
    await asUser(DAVE, `delete from public.follows where follower_id=$1 and followee_id=$2`, [DAVE, ALICE]);
    const after = (await asUser(DAVE, `select id from public.feed_items where id=$1`, [fid])).rows;
    assert.equal(after.length, 0, 'ne plus suivre retire la visibilité du post solo');
  });

  await step('jour de repos : log_rest crée un post rest, idempotent sur la journée', async () => {
    const r1 = (await asUser(ALICE, `select public.log_rest(null) as id`)).rows[0].id;
    const row = (await admin(`select type, group_id, author_id from public.feed_items where id=$1`, [r1])).rows[0];
    assert.equal(row.type, 'rest');
    assert.equal(row.group_id, null);
    assert.equal(row.author_id, ALICE);
    // Poser deux fois le même jour = no-op (renvoie le même id, pas de doublon).
    const r2 = (await asUser(ALICE, `select public.log_rest(null) as id`)).rows[0].id;
    assert.equal(r2, r1, 'repos du jour idempotent');
    // Dans un groupe : membre OK, non-membre refusé.
    await asUser(ALICE, `select public.log_rest($1)`, [A.id]);
    await expectReject(asUser(DAVE, `select public.log_rest($1)`, [A.id]), 'repos dans un groupe non-membre');
  });

  await step('throttle nudge : l\'index unique (émetteur, cible, bucket 12h) bloque le doublon', async () => {
    const b0 = '2026-07-01T00:00:00.000Z';
    const b1 = '2026-07-01T12:00:00.000Z';
    // 1re relance alice->bob dans la fenêtre b0 : OK (service_role, bypass RLS).
    await admin(`insert into public.nudges (sender_id,target_id,group_id,bucket) values ($1,$2,$3,$4)`, [ALICE, BOB, A.id, b0]);
    // 2e relance MÊME fenêtre : REFUSÉE atomiquement par l'index unique (plus de TOCTOU).
    await expectReject(
      admin(`insert into public.nudges (sender_id,target_id,group_id,bucket) values ($1,$2,$3,$4)`, [ALICE, BOB, A.id, b0]),
      'doublon dans la même fenêtre',
    );
    // Fenêtre suivante : autorisée.
    await admin(`insert into public.nudges (sender_id,target_id,group_id,bucket) values ($1,$2,$3,$4)`, [ALICE, BOB, A.id, b1]);
    const c = (await admin(`select count(*)::int c from public.nudges where sender_id=$1 and target_id=$2`, [ALICE, BOB])).rows[0].c;
    assert.equal(c, 2, 'deux relances au total (une par fenêtre)');
  });

  await step('invitation : rotation réservée au créateur + code expiré refusé', async () => {
    // bob (non-créateur) ne peut pas faire tourner le code de A
    await expectReject(asUser(BOB, `select public.rotate_invite_code($1)`, [A.id]), 'rotation par un non-créateur');
    // alice (créatrice) régénère avec une expiration DANS LE PASSÉ
    const expired = (await asUser(ALICE, `select public.rotate_invite_code($1, '2000-01-01T00:00:00Z'::timestamptz) as code`, [A.id])).rows[0].code;
    assert.ok(expired && expired !== A.invite_code, 'un nouveau code est généré');
    // un code expiré est refusé
    await expectReject(asUser(DAVE, `select * from public.join_group_by_code($1)`, [expired]), 'join avec un code expiré');
    // régénération sans expiration -> dave peut rejoindre
    const fresh = (await asUser(ALICE, `select public.rotate_invite_code($1) as code`, [A.id])).rows[0].code;
    await asUser(DAVE, `select * from public.join_group_by_code($1)`, [fresh]);
    const daveInA = (await asUser(DAVE, `select id from public.groups where id=$1`, [A.id])).rows;
    assert.equal(daveInA.length, 1, 'dave a rejoint A avec le code frais');
  });

  await step('quitter un groupe : sa propre ligne seulement, et le feed disparaît', async () => {
    // bob ne peut pas supprimer l'appartenance d'autrui (RLS memberships_delete).
    const foreign = await asUser(BOB, `delete from public.memberships where group_id=$1 and user_id=$2`, [A.id, ALICE]);
    assert.equal(foreign.rowCount, 0, "supprimer l'appartenance d'autrui = 0 ligne");
    // bob quitte A -> il ne voit plus ni le groupe ni son feed.
    const own = await asUser(BOB, `delete from public.memberships where group_id=$1 and user_id=$2`, [A.id, BOB]);
    assert.equal(own.rowCount, 1, 'bob quitte A');
    const feed = (await asUser(BOB, `select id from public.feed_items where group_id=$1`, [A.id])).rows;
    assert.equal(feed.length, 0, 'bob ne voit plus le feed de A');
    const grp = (await asUser(BOB, `select id from public.groups where id=$1`, [A.id])).rows;
    assert.equal(grp.length, 0, 'bob ne voit plus le groupe A');
  });

  await step('suppression de compte : anonymise le feed, retire les memberships (ADR-0005)', async () => {
    const carolItems = (await admin(`select id from public.feed_items where author_id=$1`, [CAROL])).rows;
    assert.ok(carolItems.length >= 1, 'carol a au moins un item loggé');
    await admin(`delete from auth.users where id=$1`, [CAROL]);
    const prof = (await admin(`select id from public.profiles where id=$1`, [CAROL])).rows;
    assert.equal(prof.length, 0, 'profil supprimé en cascade');
    const mem = (await admin(`select 1 from public.memberships where user_id=$1`, [CAROL])).rows;
    assert.equal(mem.length, 0, 'memberships retirés');
    const item = (await admin(`select author_id from public.feed_items where id=$1`, [carolItems[0].id])).rows;
    assert.equal(item.length, 1, 'item conservé (pas supprimé)');
    assert.equal(item[0].author_id, null, 'auteur anonymisé (author_id null)');
  });

  await client.end();
  console.log(`\n${failures === 0 ? 'OK' : 'ÉCHEC'} — ${failures} test(s) en échec`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
