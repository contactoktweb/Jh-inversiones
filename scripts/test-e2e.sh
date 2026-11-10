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
# Por defecto se prueba con las claves nuevas de Supabase (sb_publishable_… / sb_secret_…),
# que son las que entregan los proyectos nuevos. SUPABASE_KEYS=legacy usa las JWT anon/service_role.
if [ "${SUPABASE_KEYS:-new}" = "legacy" ]; then
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="$SB_ANON_KEY"
  export SUPABASE_SERVICE_ROLE_KEY="$SB_SERVICE_ROLE_KEY"
else
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="$SB_PUBLISHABLE_KEY"
  export SUPABASE_SERVICE_ROLE_KEY="$SB_SECRET_KEY"
fi
echo "▶ Claves de Supabase: ${SUPABASE_KEYS:-new} (${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:16}…)"
export E2E_DB_URL="$SB_DB_URL"
export NEXT_PUBLIC_SITE_URL="http://localhost:3123"
export ADMIN_EMAILS="admin@e2e.test"
export NEXT_PUBLIC_PAYMENT_METHODS="test,transfer"
export NEXT_PUBLIC_CONTACT_EMAIL="soporte@e2e.test"
export NEXT_PUBLIC_CONTACT_WHATSAPP="573001234567"
# Correos: Resend simulado en 127.0.0.1:4010 (tests/e2e/mock-resend.ts).
export RESEND_API_KEY="re_test_e2e"
export RESEND_FROM_EMAIL="JH Inversiones <avisos@e2e.test>"
export ADMIN_NOTIFICATION_EMAIL="avisos-admin@e2e.test"
export RESEND_BASE_URL="http://127.0.0.1:4010"
# Las variables de este script tienen prioridad sobre .env.local.

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "▶ Compilando la aplicación…"
  pnpm build >/dev/null
fi
echo "▶ Ejecutando pruebas…"
pnpm exec playwright test "$@"
