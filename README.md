# JH Inversiones — plataforma Next.js + Supabase

Plataforma de inversión en dólares: inversión desde **50 USD**, plazo mínimo de **1 mes**, ganancia diaria configurada por el administrador (**1.5 % por defecto**), panel de usuario con ganancias en tiempo real y solicitudes de retiro que el administrador gestiona hasta el desembolso.

> **Pagos:** por defecto la plataforma usa **pago de prueba** (`NEXT_PUBLIC_PAYMENT_MODE=test`): al pagar se muestra «Pago de prueba aceptado» y la inversión se crea sin cobrar dinero. Antes de cobrar dinero real hay que conectar una pasarela que acepte esta actividad y contar con las autorizaciones regulatorias correspondientes.

## 1. Puesta en marcha (producción)

1. **Crea un proyecto en [Supabase](https://supabase.com/dashboard).**
2. **Base de datos:** en *SQL Editor → New query* pega todo `supabase/schema.sql` y pulsa *Run*. Se puede volver a ejecutar sin perder datos.
3. **URLs de autenticación:** en *Authentication → URL Configuration*:
   - *Site URL*: `https://TU_DOMINIO`
   - *Redirect URLs*: `https://TU_DOMINIO/**`
4. **Plantillas de correo** (*Authentication → Email Templates*). Cambia el enlace de estas dos plantillas para que funcionen aunque el correo se abra en otro dispositivo:
   - *Confirm signup*: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirmar mi correo</a>`
   - *Reset password*: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Crear una nueva contraseña</a>`
5. **Variables de entorno:** copia `.env.example` y completa los valores en Vercel (*Settings → Environment Variables*) o en `.env.local` para desarrollo. Las claves se toman de *Supabase → Project Settings → API*. **No subas `.env.local` ni la `SUPABASE_SERVICE_ROLE_KEY` al repositorio.**
6. **Administrador:** pon su correo en `ADMIN_EMAILS`, regístrate con ese correo en `/acceso` y confírmalo. También puedes ejecutar `update public.profiles set role = 'admin' where email = '...';`.
7. Despliega y prueba: regístrate como usuario, invierte desde un plan, entra como administrador y fija la tasa del día.

### Variables

| Variable | Obligatoria | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave secreta del servidor: crea inversiones, tasas y retiros |
| `ADMIN_EMAILS` | Sí | Correos con rol de administrador (separados por comas) |
| `NEXT_PUBLIC_SITE_URL` | Sí | Dominio público, p. ej. `https://jhinversiones.com` |
| `NEXT_PUBLIC_PAYMENT_MODE` | No | `test` (por defecto) o `stripe` |
| `NEXT_PUBLIC_CONTACT_EMAIL` / `NEXT_PUBLIC_CONTACT_WHATSAPP` | No | Contacto en pie de página, preguntas frecuentes y términos |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_NOTIFICATION_EMAIL` | No | Correo al administrador cuando llega un retiro |
| `PAYMENTS_APPROVED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | No | Solo con `NEXT_PUBLIC_PAYMENT_MODE=stripe` |

## 2. Cómo funciona

- **Inversión (`/invertir`):** el usuario elige el monto (mín. 50 USD), acepta los términos y pulsa *Pagar*. En modo de prueba ve «Pago de prueba aceptado», la inversión se guarda y pasa a su panel.
- **Administrador (`/admin`):** fija cada día el porcentaje de ganancia (aviso diario si falta; 1.5 % por defecto), ve todas las inversiones (las de prueba aparecen marcadas) y gestiona los retiros: aprobar, marcar como desembolsado o rechazar.
- **Usuario (`/dashboard`):** capital, ganancias acumuladas (capital × tasa de cada día), ganancia de hoy, días transcurridos, fecha de retiro y estado de sus solicitudes.
- **Retiros:** al cumplir el mes, «Solicitar retiro» congela las ganancias y avisa al administrador en su panel (y por correo si Resend está configurado).
- **Cuenta:** registro con confirmación por correo, inicio de sesión y recuperación de contraseña.

## 3. Ejecutar localmente

Requisitos: Node.js 20 o superior.

```bash
pnpm install
cp .env.example .env.local   # completar con las claves de Supabase
pnpm dev
```

## 4. Estructura

```text
src/
  app/
    page.tsx                 # Landing
    dashboard/page.tsx       # Panel del usuario
    admin/page.tsx           # Panel del administrador (tasa diaria)
    acceso/page.tsx          # Inicio de sesión usuario / administrador
    api/checkout/route.ts    # Pago (de prueba o Stripe) y creación de la inversión
    api/webhooks/stripe/     # Confirmar pago firmado y registrar plan
    api/claims/route.ts      # Solicitud de retiro tras el plazo mínimo
    api/admin/claims/        # Aprobar / rechazar / marcar desembolsado (solo admin)
    api/admin/rates/         # Guardar el porcentaje diario (solo admin)
    auth/confirm/route.ts    # Enlaces de correo (confirmar cuenta, recuperar contraseña)
    auth/callback/route.ts   # Intercambio de código OAuth/PKCE
    invertir/page.tsx        # Flujo de inversión
    restablecer/page.tsx     # Nueva contraseña
    privacidad/ y terminos/  # Textos preliminares
    globals.css              # Estilos heredados de panel/acceso
    platform.css             # Login, paneles con colores de marca, retiros
    betterment-inspired.css  # Nuevo sistema editorial fintech y responsive
  components/
    landing.tsx              # Landing animada
    dashboard-view.tsx       # Dashboard y reclamaciones
    checkout-button.tsx      # Enlace a /invertir con el monto
    invest-checkout.tsx      # Formulario de pago y «Pago de prueba aceptado»
    login-form.tsx           # Correo + contraseña y acceso rápido
    admin-view.tsx           # Panel de administración
    nav.tsx y logo.tsx       # Navegación y marca
  lib/
    plans.ts                 # Cambiar todos los planes desde aquí
    rates.ts                 # Tasa diaria, plazo mínimo y cálculo de ganancias
    finance.ts               # Formato de moneda y fechas
    config.ts                # Modo de pago y configuración
    client/supabase.ts       # Cliente de autenticación
    server/                  # Supabase con cookies, rol de servidor y sesión
  middleware.ts              # Renovación de sesión
supabase/schema.sql          # Tablas, índices y políticas RLS
```

## 5. Personalizar

- **Nombre de marca:** el nombre principal y el lema se cambian en `src/lib/brand.ts`. Si la marca cambia completamente, buscar también `JH` y `JH Inversiones` en las etiquetas de diseño, textos informativos, plantillas de correo y `src/app/icon.svg`.
- **Planes:** `src/lib/plans.ts` (nombres y montos mínimos). Inversión mínima, plazo y tasa por defecto: `src/lib/rates.ts`. El monto siempre lo valida el servidor (`api/checkout`).
- **Estética nueva:** modificar los tokens `--bm-*` al inicio de `src/app/betterment-inspired.css`. Los componentes heredados del dashboard y acceso conservan estilos base en `globals.css`, con adaptaciones visuales al final del archivo nuevo.
- **Animaciones:** `framer-motion` en `landing.tsx` y `dashboard-view.tsx`, y transiciones CSS con soporte para `prefers-reduced-motion`.

## 6. Seguridad

- Las páginas reales requieren autenticación; el servidor valida la sesión con `auth.getUser()`.
- Row Level Security: cada cuenta solo puede leer sus propias inversiones y solicitudes. Las escrituras solo son posibles en rutas de servidor con `service_role`.
- Los precios, porcentajes y plazos los determina el servidor (no el JSON del cliente).
- En modo de pago de prueba la inversión la crea el servidor (monto validado, sesión obligatoria, solo cuentas de usuario) y queda marcada como `payment_method = test`. Con Stripe, solo se registra tras un **webhook firmado**.
- El retiro verifica en el servidor la propiedad de la inversión y el plazo mínimo, evita duplicados y solo notifica al administrador: **no paga automáticamente**.
- Probado contra Supabase local: un usuario no puede ver datos de otro, ni insertar inversiones, ni cambiar tasas, ni darse rol de administrador.
- Las rutas POST con cookies comparan `Origin` con `Host` para evitar solicitudes cruzadas triviales.

## 7. Comandos

```bash
pnpm dev        # Desarrollo
pnpm build      # Compilación
pnpm start      # Producción después de compilar
pnpm typecheck  # Tipos TypeScript
```
