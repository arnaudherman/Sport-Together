#!/usr/bin/env bash
#
# Applique TOUTES les migrations, dans l'ordre, à une base Postgres (cloud ou locale).
# Turnkey pour brancher un vrai Supabase (voir supabase/README.md).
#
# Usage :
#   DATABASE_URL="postgresql://postgres:MDP@db.<ref>.supabase.co:5432/postgres" \
#     bash supabase/apply-migrations.sh
#
# (URL : Supabase > Project Settings > Database > Connection string > URI.)
# Alternative cloud sans psql : copier chaque fichier dans le SQL Editor, ou
# `supabase db push` avec la CLI.
set -euo pipefail

: "${DATABASE_URL:?Définis DATABASE_URL (Project Settings > Database > Connection string).}"

HERE="$(cd "$(dirname "$0")" && pwd)"
shopt -s nullglob
files=("$HERE"/migrations/*.sql)

if [ ${#files[@]} -eq 0 ]; then
  echo "Aucune migration trouvée dans $HERE/migrations" >&2
  exit 1
fi

for f in "${files[@]}"; do
  echo "→ $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

echo "✓ ${#files[@]} migrations appliquées. Active ensuite Auth > Email (+ {{ .Token }} dans le template Magic Link), puis remplis .env."
