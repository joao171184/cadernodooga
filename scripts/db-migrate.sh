#!/usr/bin/env bash
# Aplica no Supabase os arquivos novos de supabase/migrations (em ordem), uma vez cada.
# Controle no próprio banco: supabase_migrations.schema_migrations (mesmo formato do Supabase CLI).
#
# Uso:
#   DATABASE_URL=postgresql://... scripts/db-migrate.sh              # aplica as pendentes
#   DATABASE_URL=postgresql://... scripts/db-migrate.sh --dry-run    # só lista as pendentes
#   DATABASE_URL=postgresql://... scripts/db-migrate.sh --baseline   # marca TODAS como já aplicadas (sem rodar)
#
# Proteção: migrations com DROP TABLE/SCHEMA/COLUMN ou TRUNCATE só rodam com ALLOW_DESTRUCTIVE=true.
set -euo pipefail

: "${DATABASE_URL:?defina DATABASE_URL}"
MODE="${1:-apply}"
DIR="${MIGRATIONS_DIR:-supabase/migrations}"
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -q)

"${PSQL[@]}" -c "
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (
    version text primary key, statements text[], name text);"

applied=$("${PSQL[@]}" -tA -c "select version from supabase_migrations.schema_migrations")

pending=()
shopt -s nullglob
files=("$DIR"/*.sql)
IFS=$'\n' files=($(printf '%s\n' "${files[@]}" | sort)); unset IFS
for f in "${files[@]}"; do
  base=$(basename "$f" .sql)
  version="${base%%_*}"
  if ! grep -qx "$version" <<<"$applied"; then pending+=("$f"); fi
done

if [ ${#pending[@]} -eq 0 ]; then echo "Nenhuma migration pendente."; exit 0; fi
echo "Pendentes (${#pending[@]}):"; printf '  %s\n' "${pending[@]}"

if [ "$MODE" = "--dry-run" ]; then exit 0; fi

for f in "${pending[@]}"; do
  base=$(basename "$f" .sql); version="${base%%_*}"; name="${base#*_}"
  if [ "$MODE" = "--baseline" ]; then
    "${PSQL[@]}" -c "insert into supabase_migrations.schema_migrations(version,name) values ('$version','$name') on conflict do nothing"
    echo "baseline: $version"; continue
  fi
  if [ "${ALLOW_DESTRUCTIVE:-false}" != "true" ] && grep -qiE '(^|[^a-z_])(drop[[:space:]]+(table|schema|database|column)|truncate)([^a-z_]|$)' "$f"; then
    echo "BLOQUEADO: $f tem DROP TABLE/SCHEMA/COLUMN ou TRUNCATE. Revise e rode de novo com ALLOW_DESTRUCTIVE=true." >&2
    exit 1
  fi
  echo "Aplicando $f ..."
  # Cada migration roda numa transação: se falhar, nada dela fica aplicado.
  { echo "begin;"; cat "$f"; echo; echo "insert into supabase_migrations.schema_migrations(version,name) values ('$version','$name');"; echo "commit;"; } \
    | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -q -f -
  echo "OK: $version"
done
