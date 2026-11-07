#!/usr/bin/env bash
# Pruebas de punta a punta contra un Supabase local (requiere Docker).
# Uso: pnpm test:e2e   (opcional: SKIP_BUILD=1 para no recompilar)
set -euo pipefail
cd "$(dirname "$0")/.."

SUPABASE="npx --yes supabase@2"
EXCLUDE="studio,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta"

echo "▶ Iniciando Supabase local…"
$SUPABASE start -x "$EXCLUDE" >/dev/null
echo "▶ Reiniciando la base de datos (aplica supabase/schema.sql)…"
$SUPABASE db reset >/dev/null
eval "$($SUPABASE status -o env | sed 's/^/export SB_/')"

export NEXT_PUBLIC_SUPABASE_URL="$SB_API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$SB_ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SB_SERVICE_ROLE_KEY"
export E2E_DB_URL="$SB_DB_URL"
export E2E_MAILPIT_URL="${SB_MAILPIT_URL:-${SB_INBUCKET_URL:-http://127.0.0.1:54324}}"
export NEXT_PUBLIC_SITE_URL="http://localhost:3123"
export ADMIN_EMAILS="admin@e2e.test"
export NEXT_PUBLIC_PAYMENT_METHODS="test,transfer"
export NEXT_PUBLIC_CONTACT_EMAIL="soporte@e2e.test"
export NEXT_PUBLIC_CONTACT_WHATSAPP="573001234567"
# Las variables de este script tienen prioridad sobre .env.local.

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "▶ Compilando la aplicación…"
  pnpm build >/dev/null
fi
echo "▶ Ejecutando pruebas…"
pnpm exec playwright test "$@"
