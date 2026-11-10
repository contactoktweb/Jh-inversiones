# JH Inversiones — plataforma Next.js + Supabase

Plataforma de inversión en dólares con panel de cliente y panel de administración completos.

- Inversión desde **50 USD**, plazo mínimo de **30 días**, ganancia **diaria** fijada por el administrador (**1.5 %** por defecto).
- Pagos por **transferencia bancaria**: el cliente ve la foto y los datos de pago, avisa «Ya realicé la transferencia» con comprobante opcional, al administrador le llega un correo con el comprobante adjunto y aprueba el pago; **registro manual** y **pago de prueba**. La **pasarela con tarjeta** es la fase pendiente.
- Retiros con datos de pago del cliente, aprobación, desembolso con comprobante o rechazo con motivo.
- **Planes editables** por el administrador (crear, editar montos y beneficios, ordenar, ocultar, eliminar sin uso).
- Gestión de clientes (suspender, roles), registro de actividad (auditoría) y exportación a CSV.
- 21 pruebas unitarias y 36 pruebas de punta a punta contra Supabase real (incluido el envío de correos con Resend).

## Documentación y entrega

| Archivo | Para quién |
|---|---|
| [`docs/Manual-de-uso-JH-Inversiones.pdf`](docs/Manual-de-uso-JH-Inversiones.pdf) | **Cliente / dueño:** manual de uso del panel (sin configuración técnica). Se regenera con `pnpm manual:pdf` desde [`docs/MANUAL-DE-USO.md`](docs/MANUAL-DE-USO.md) |
| [`docs/CONFIGURACION.md`](docs/CONFIGURACION.md) | **Quien instala:** Supabase, Resend (API), Vercel, prueba de aceptación |
| [`supabase/schema.sql`](supabase/schema.sql) | SQL a ejecutar en Supabase |
| [`deploy/variables-vercel.env`](deploy/variables-vercel.env) | Variables de entorno para pegar en Vercel |
| [`docs/pasarela-de-pagos.md`](docs/pasarela-de-pagos.md) | Fase pendiente: pasarela con tarjeta |

## 1. Puesta en marcha

Paso a paso completo en [`docs/CONFIGURACION.md`](docs/CONFIGURACION.md). En resumen: verificar el dominio en Resend → ejecutar `supabase/schema.sql` → configurar en Supabase las URLs → pegar `deploy/variables-vercel.env` en Vercel y desplegar → prueba de aceptación.

### Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave secreta del servidor. Todas las escrituras pasan por aquí |
| `ADMIN_EMAILS` | Sí | Correos administradores (separados por comas; solo cuentan si están confirmados) |
| `NEXT_PUBLIC_SITE_URL` | Sí | Dominio público (enlaces de correos y metadatos) |
| `NEXT_PUBLIC_PAYMENT_METHODS` | No | `test,transfer` por defecto. Producción real: `transfer`. Pasarela: añadir `stripe` |
| `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_WHATSAPP` | No | Contacto público |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_NOTIFICATION_EMAIL` | No | Correos de aviso (pagos, retiros, confirmaciones). Sin dominio: remitente `onboarding@resend.dev` (ver CONFIGURACION 1.1) |
| `PAYMENTS_APPROVED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | No | Solo para la pasarela (fase pendiente) |

## 2. Rutas

**Público:** `/` (landing), `/terminos`, `/privacidad`, `/acceso` (login, registro y recuperación), `/restablecer`.

**Cliente:** `/dashboard` (panel), `/invertir?monto=N` (nueva inversión), `/cuenta` (perfil, datos de retiro y contraseña).

**Administración:**

| Ruta | Función |
|---|---|
| `/admin` | Resumen, alertas, tasa del día, vencimientos de la semana, actividad reciente |
| `/admin/tasas` | Tasa diaria y historial editable de 60 días |
| `/admin/pagos` | Transferencias avisadas por el cliente (con comprobante), confirmar o rechazar, pagos manuales, historial |
| `/admin/retiros` | Aprobar, marcar como desembolsado (con comprobante) o rechazar (con motivo) |
| `/admin/inversiones` | Todas las inversiones, filtros y cancelación |
| `/admin/planes` | Crear, editar, ordenar, ocultar o eliminar planes (la web y el mínimo se actualizan solos) |
| `/admin/clientes` y `/admin/clientes/[id]` | Lista y ficha del cliente; suspender, reactivar y roles |
| `/admin/actividad` | Registro de auditoría |
| `/admin/ajustes` | Foto y texto con los datos de pago, configuración actual y exportaciones CSV |

**APIs** (todas validan el origen y la sesión, y escriben con la service role):

| API | Quién | Acción |
|---|---|---|
| `POST /api/auth/signup` | Público | Registro; el correo de bienvenida (o de confirmación) sale por Resend |
| `POST /api/auth/recover` | Público | «¿Olvidaste tu contraseña?»: el enlace sale por Resend |
| `POST /api/checkout` | Cliente | Inicia el pago según el método |
| `POST /api/claims` | Cliente | Solicita un retiro con sus datos de pago |
| `POST /api/profile` | Cliente | Actualiza sus datos |
| `POST /api/admin/rates` | Admin | Fija la tasa de un día |
| `POST /api/admin/payments` | Admin | Confirma o rechaza una transferencia |
| `GET /api/admin/payments/proof?id=` | Admin | Foto del comprobante que envió el cliente |
| `POST /api/payments/report` | Cliente | «Ya realicé la transferencia» (+ comprobante opcional): avisa al administrador por correo |
| `GET /api/transfer-image` | Con sesión | Foto con los datos de pago subida en Ajustes |
| `POST /api/admin/investments` | Admin | Registra una inversión manual o cancela una inversión |
| `POST /api/admin/claims` | Admin | Aprueba, desembolsa o rechaza un retiro |
| `POST /api/admin/users` | Admin | Suspende, reactiva o cambia el rol de una cuenta |
| `POST /api/admin/plans` | Admin | Crea, edita, oculta o elimina un plan |
| `POST /api/admin/settings` | Admin | Guarda los ajustes |
| `GET /api/admin/export?tipo=` | Admin | CSV de `inversiones`, `retiros`, `clientes` o `actividad` |
| `POST /api/webhooks/stripe` | Stripe | Fase pendiente |

## 3. Estructura

```text
src/
  app/                      # Rutas (páginas y APIs) — ver la sección 2
  components/
    app-shell.tsx           # Menú lateral y encabezado de los paneles
    dashboard-view.tsx      # Panel del cliente
    account-view.tsx        # Mi cuenta
    invest-checkout.tsx     # /invertir: método de pago y recibos
    admin/                  # Páginas del panel de administración
  lib/
    rates.ts                # Reglas: mínimo, plazo, tasa por defecto y cálculo de ganancias
    plans.ts                # Planes: tipo, planes iniciales y plan según el monto
    finance.ts              # Formatos (USD, fechas en hora de Bogotá) y etiquetas
    config.ts               # Métodos de pago y configuración
    brand.ts                # Marca y contacto
    server/
      session.ts            # Sesión, rol, tasas y ajustes
      http.ts               # Guardas de permisos y validaciones
      payments.ts           # Módulo de pagos (aquí se conecta la pasarela)
      admin-data.ts         # Lecturas del panel de administración
      audit.ts              # Registro de actividad
      notify.ts             # Correos con Resend
      plans.ts              # Lectura de los planes desde Supabase
supabase/
  schema.sql                # Tablas, restricciones y RLS (re-ejecutable)
  config.toml               # Supabase local para desarrollo y pruebas
tests/
  unit/                     # Vitest
  e2e/                      # Playwright
docs/                       # Manual del dueño y guía de la pasarela
```

### Modelo de datos

| Tabla | Contenido |
|---|---|
| `plans` | Planes editables: nombre, monto desde, beneficios, destacado, orden, visible |
| `profiles` | Rol (`user`/`admin`), estado (`active`/`suspended`), nombre, teléfono, país, datos de retiro |
| `investments` | Monto, plan, fechas, `payment_method` (`test`, `transfer`, `manual`, `stripe`), referencia única, estado (`pending_payment`, `active`, `closed`, `cancelled`) |
| `daily_rates` | Tasa por día (`AAAA-MM-DD`, hora de Bogotá) |
| `claims` | Retiros: monto congelado, datos de pago, estado, comprobante y nota |
| `settings` | Ajustes editables (texto y foto con los datos de pago) |
| `payment_proofs` | Comprobantes de transferencia enviados por los clientes (solo service role) |
| `admin_audit` | Registro de acciones administrativas |

**RLS:** los clientes solo pueden **leer** sus propias filas (y las tasas y ajustes). Ninguna tabla admite escrituras desde el navegador: todo pasa por las APIs del servidor con la service role. `admin_audit` no es legible desde el cliente.

## 4. Desarrollo local

Requisitos: Node.js 20+, pnpm y Docker (para Supabase local).

```bash
pnpm install
npx supabase start            # Supabase local; aplica supabase/schema.sql
npx supabase status           # muestra URL y claves locales
cp .env.example .env.local    # completa con las claves locales
pnpm dev
```

Correos locales (confirmación y recuperación): Mailpit en http://127.0.0.1:54324.

## 5. Pruebas

```bash
pnpm typecheck   # Tipos TypeScript
pnpm test        # 21 pruebas unitarias (Vitest)
pnpm test:e2e    # 36 pruebas de punta a punta (Playwright + Supabase local en Docker)
```

`pnpm test:e2e` (`scripts/test-e2e.sh`) levanta Supabase local, **reinicia la base de datos**, compila la app con las claves locales (por defecto en el formato nuevo `sb_publishable_`/`sb_secret_`; `SUPABASE_KEYS=legacy` usa las JWT antiguas), simula la API de Resend en el puerto 4010 y ejecuta Playwright. Con `SKIP_BUILD=1` reutiliza la última compilación. El informe queda en `test-results/e2e-report`.

Cobertura de las pruebas de punta a punta:

- **Cuentas:** registro con confirmación por correo abierto en otro navegador, contraseña incorrecta, recuperación de contraseña (y enlace de un solo uso), Mi cuenta.
- **Ciclo completo:** aviso diario y tasa, datos de transferencia, pago de prueba, transferencia pendiente y confirmada, transferencia rechazada, bloqueo por plazo mínimo, retiro rechazado y vuelto a pedir, aprobado y desembolsado con comprobante, auditoría y CSV.
- **Planes:** crear, destacar, mostrar en la web, asignación por monto, editar, ocultar, eliminar, mínimo dinámico, permisos y RLS.
- **Administración:** pago manual, referencia duplicada, correo inexistente, clientes y ficha, suspensión y reactivación, cancelación, dar y quitar el rol, autoprotección del administrador, todas las páginas sin errores.
- **Correos (Resend):** avisos al administrador y al cliente en cada paso, con remitente, destinatario y contenido verificados.
- **Seguridad:** redirecciones de páginas privadas, permisos de todas las APIs, validaciones de monto, método y términos, el administrador no puede invertir, bloqueo de solicitudes desde otros sitios, RLS (lectura aislada; sin inserciones, cambios de tasa, de ajustes ni de rol).

## 6. Seguridad

- La sesión se valida en el servidor con `auth.getUser()`, y el rol y el estado se leen de `profiles` (o de `ADMIN_EMAILS`, solo con el correo confirmado).
- Los montos, planes, fechas y estados los decide el servidor, nunca el navegador.
- Las rutas POST rechazan solicitudes con un `Origin` distinto (CSRF).
- Las inversiones con pago de prueba quedan marcadas y el panel de retiros lo advierte. En producción real, quita `test` de `NEXT_PUBLIC_PAYMENT_METHODS`.
- Las acciones administrativas quedan en `admin_audit`.

## 7. Comandos

```bash
pnpm dev         # Desarrollo
pnpm build       # Compilación de producción
pnpm start       # Servir la compilación
pnpm typecheck   # Tipos
pnpm test        # Pruebas unitarias
pnpm test:e2e    # Pruebas de punta a punta
pnpm manual:pdf  # Regenera el PDF del manual de uso
```
