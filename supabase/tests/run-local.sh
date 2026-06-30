#!/usr/bin/env bash
# Tests backend locaux : monte un PostgreSQL jetable, applique shims + migrations
# + grants, puis exécute la suite d'isolation RLS/RPC (supabase/tests/rls.test.mjs).
#
# Prérequis : `brew install postgresql@16` et `npm install`.
# Usage      : npm run test:db   (ou bash supabase/tests/run-local.sh)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="$(brew --prefix postgresql@16 2>/dev/null || true)/bin"
[ -x "$PGBIN/initdb" ] && export PATH="$PGBIN:$PATH"
command -v initdb >/dev/null || { echo "PostgreSQL introuvable — 'brew install postgresql@16'."; exit 1; }

PGDATA="${PGDATA:-/private/tmp/st_pg}"
PORT="${PGPORT:-54329}"

pg_ctl -D "$PGDATA" stop >/dev/null 2>&1 || true
rm -rf "$PGDATA"
initdb -D "$PGDATA" -U postgres --auth=trust >/dev/null
pg_ctl -D "$PGDATA" -o "-p $PORT -k /private/tmp" -l "$PGDATA.log" start >/dev/null
trap 'pg_ctl -D "$PGDATA" stop >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 30); do pg_isready -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1 && break; sleep 1; done
createdb -h 127.0.0.1 -p "$PORT" -U postgres st_test

q() { psql -h 127.0.0.1 -p "$PORT" -U postgres -d st_test -v ON_ERROR_STOP=1 -q "$@"; }
q -f "$ROOT/supabase/tests/_shims.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do q -f "$f" >/dev/null; done
q -f "$ROOT/supabase/tests/_grants.sql" >/dev/null

export DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/st_test"
node "$ROOT/supabase/tests/rls.test.mjs"
