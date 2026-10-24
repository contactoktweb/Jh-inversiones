# JH Inversiones — plataforma Next.js

Plataforma visual de inversión **en modo demostración**: landing de conversión, planes ilustrativos, simulador, panel con cálculos dependientes del tiempo, autenticación opcional por correo, adaptador para un método de pago y avisos administrativos.

> **Importante:** el proyecto no debe captar fondos hasta contar con la autorización regulatoria correspondiente y la aprobación explícita del proveedor de pagos. Stripe menciona expresamente los servicios de inversión entre los negocios financieros que normalmente no admite sin revisión. El ejemplo de Stripe está **deshabilitado por defecto**. Las tasas y cantidades del prototipo son supuestos gráficos, no promesas ni asesoría financiera.

## 1. Ejecutar localmente

Requisitos: Node.js 20 o superior y npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abrir **http://localhost:3000**.

Por defecto, `NEXT_PUBLIC_DEMO_MODE=true`. En `/acceso` hay dos botones temporales de **acceso rápido** («Ver como usuario» y «Ver como administrador») que abren una sesión de demostración sin contraseña. **No se hacen cargos, no se crean inversiones reales y no se envían correos en modo demo.**

### Usuarios y administrador

- **Inversión mínima:** 50 USD. **Plazo mínimo:** 1 mes (30 días) antes de poder solicitar retiro (`src/lib/rates.ts`).
- **Administrador (`/admin`):** configura cada día el porcentaje de ganancia. Si el día no tiene porcentaje se aplica **1.5 % por defecto**. Al entrar sin la tasa del día configurada aparece un aviso para fijarla; también puede editar los días anteriores desde el historial.
- **Usuario (`/dashboard`):** ve su capital, las ganancias acumuladas (capital × tasa de cada día, sumadas día a día), la ganancia de hoy, los días transcurridos y la fecha desde la que puede solicitar el retiro.
- En modo real, el rol se guarda en `public.profiles.role`. Para crear un administrador: registrar la cuenta y ejecutar `update public.profiles set role = 'admin' where email = '...'`.
- **Retiros:** al cumplir el plazo mínimo, el usuario pulsa «Solicitar retiro» (capital + ganancias). Las ganancias se congelan en ese momento, el administrador ve la solicitud en `/admin` (aviso y contador en el menú; el panel se actualiza cada 30 s) y la marca como aprobada, rechazada o **desembolsada** al hacer el pago. Si Resend está configurado, también recibe un correo.
- Para quitar los botones de acceso rápido: `NEXT_PUBLIC_QUICK_LOGIN=false`. En demostración, las tasas del administrador se guardan en una cookie del navegador.

## 2. Estructura simple

```text
src/
  app/
    page.tsx                 # Landing
    dashboard/page.tsx       # Panel del usuario
    admin/page.tsx           # Panel del administrador (tasa diaria)
    acceso/page.tsx          # Inicio de sesión usuario / administrador
    api/checkout/route.ts    # Crear sesión de pago verificada
    api/webhooks/stripe/     # Confirmar pago firmado y registrar plan
    api/claims/route.ts      # Solicitud de retiro tras el plazo mínimo
    api/admin/claims/        # Aprobar / rechazar / marcar desembolsado (solo admin)
    api/admin/rates/         # Guardar el porcentaje diario (solo admin)
    api/demo-login/          # Acceso rápido temporal
    auth/callback/route.ts   # Confirmación de login
    privacidad/ y terminos/  # Textos preliminares
    globals.css              # Estilos heredados de panel/acceso
    platform.css             # Login, paneles con colores de marca, retiros
    betterment-inspired.css  # Nuevo sistema editorial fintech y responsive
  components/
    landing.tsx              # Landing animada
    dashboard-view.tsx       # Dashboard y reclamaciones
    checkout-button.tsx      # Botón de compra
    login-form.tsx           # Correo + contraseña y acceso rápido
    admin-view.tsx           # Panel de administración
    nav.tsx y logo.tsx       # Navegación y marca
  lib/
    plans.ts                 # Cambiar todos los planes desde aquí
    rates.ts                 # Tasa diaria, plazo mínimo y cálculo de ganancias
    finance.ts               # Formato de moneda/fechas y datos demo
    config.ts                # Modo demo y configuración
    client/supabase.ts       # Cliente de autenticación
    server/                  # Supabase con cookies, rol de servidor y sesión
  middleware.ts              # Renovación de sesión
supabase/schema.sql          # Tablas, índices y políticas RLS
```

## 3. Personalizar

- **Nombre de marca:** el nombre principal y el lema se cambian en `src/lib/brand.ts`. Si la marca cambia completamente, buscar también `JH` y `JH Inversiones` en las etiquetas de diseño, textos informativos, plantillas de correo y `src/app/icon.svg`.
- **Planes:** `src/lib/plans.ts` (nombres, importes, plazos, porcentajes *hipotéticos*). Ajustar los valores exigirá términos legales adecuados. No cambiar cantidades cobradas en el cliente: `api/checkout` calcula importes desde el servidor.
- **Estética nueva:** modificar los tokens `--bm-*` al inicio de `src/app/betterment-inspired.css`. Los componentes heredados del dashboard y acceso conservan estilos base en `globals.css`, con adaptaciones visuales al final del archivo nuevo.
- **Animaciones:** `framer-motion` en `landing.tsx` y `dashboard-view.tsx`, y transiciones CSS con soporte para `prefers-reduced-motion`.

## Referencia de diseño y vista previa

El rediseño toma **principios de organización visual de Betterment**, pero usa una marca, tipografías, mensajes, componentes y mockups originales. Leer `ANALISIS_BETTERMENT_Y_REDISENO.md` para la auditoría y las decisiones de diseño.

- **`preview.html`**: vista previa HTML independiente, abrible directamente desde un navegador, sin instalar Next.js. Tiene simulador y FAQ básicos interactivos. Las rutas y APIs reales solo existen al ejecutar Next.js.
- **`preview.css`**: estilos de la vista previa.
- **`src/components/landing.tsx`**: experiencia definitiva React, con animaciones Framer Motion, tabs, planes y calculadora.
- **`src/app/betterment-inspired.css`**: estilos originales de la nueva identidad.

## 4. Habilitar infraestructura REAL (solo después de autorizaciones)

1. Crear un proyecto en **Supabase**. En SQL Editor ejecutar `supabase/schema.sql` una sola vez (crea tablas y políticas; revisarlas antes de producción).
2. En Supabase Auth configurar los URLs permitidos, incluyendo `https://TU_DOMINIO/auth/callback`, y el proveedor de correo para inicio de sesión. Ajustar la política de datos y consentimiento.
3. Crear la cuenta de procesamiento **únicamente cuando el proveedor confirme por escrito que admite la actividad específica de inversión**. La integración de muestra usa Stripe Checkout. Si no admite inversiones, será necesario sustituirla por una pasarela financiera habilitada y adaptar el webhook.
4. Configurar en Vercel las variables de `.env.example` sin exponer las claves privadas. Las claves `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY` jamás deben llevar prefijo `NEXT_PUBLIC_`.
5. En Stripe registrar el webhook HTTPS `https://TU_DOMINIO/api/webhooks/stripe`; escuchar `checkout.session.completed` y `checkout.session.async_payment_succeeded`.
6. En Resend verificar un dominio y configurar dirección emisora y receptora; la API solo envía correos para solicitudes al cumplir el plazo.
7. Tras tener los contratos, certificaciones, procesos de control y pruebas: `NEXT_PUBLIC_DEMO_MODE=false` y `PAYMENTS_APPROVED=true`, con las demás credenciales presentes. Volver a desplegar.

### Seguridad implementada

- Las páginas reales requieren autenticación; el servidor valida la sesión con `auth.getUser()`.
- Row Level Security: cada cuenta solo puede leer sus propias inversiones y solicitudes. Las escrituras solo son posibles en rutas de servidor con `service_role`.
- Los precios, porcentajes y plazos los determina el servidor (no el JSON del cliente).
- La confirmación de un pago solo se registra después de un **webhook firmado**, con verificación del importe/moneda y protección contra registros duplicados.
- El reclamo verifica propiedad de la posición y finalización del plazo en el servidor, evita solicitudes duplicadas y únicamente notifica al administrador: **no paga recompensas automáticamente**.
- Las rutas POST con cookies comparan `Origin` con `Host` para evitar solicitudes cruzadas triviales.

### Pendiente antes de lanzamiento comercial

- Revisión legal y regulatoria según jurisdicción, políticas de riesgo y prevención de fraude/LAFT, requisitos KYC/AML, identificación del responsable, contratos de inversión y documentos de divulgación.
- Conciliación contable con la entidad custodio y fuente real del rendimiento; los gráficos temporales **no** son balances contables. Sustituir el interés hipotético por cálculos financieros aprobados y balances verificados.
- Resolución administrativa de reclamaciones, auditoría, trazabilidad, reintentos seguros de correo (cola/outbox), notificaciones de eventos y panel de administración, además de atención al cliente.
- Límites de peticiones, protección antibots, pruebas de carga, monitoreo de fraude, webhook-event ledger, validación de cancelaciones/reembolsos, observabilidad, pruebas automatizadas y auditoría de seguridad externa.
- Avisos legales definitivos, política de privacidad conforme a ley aplicable, contacto comercial real, accesibilidad y pruebas en dispositivos.

## 5. Vercel

1. Subir esta carpeta a tu repositorio GitHub/GitLab.
2. En [Vercel](https://vercel.com/new) elegir **Import Project**, framework **Next.js**, raíz del proyecto y desplegar.
3. Definir `NEXT_PUBLIC_SITE_URL=https://TU_DOMINIO` y redeplegar (se usa en metadata, sitemap y URLs de redirección).
4. En demostración **no hacen falta claves externas**; puedes mantener `NEXT_PUBLIC_DEMO_MODE=true` y `PAYMENTS_APPROVED=false`.

## 6. Comandos

```bash
npm run dev        # Desarrollo
npm run build      # Compilación
npm run start      # Producción después de compilar
npm run typecheck  # Tipos TypeScript
```

**Nota de entorno:** se comprobó la sintaxis TypeScript/TSX de los archivos modificados, pero no se pudo realizar una compilación Next.js completa ni pruebas visuales de navegador en este entorno. El archivo ZIP incluye todo el código fuente, no `node_modules`. Se necesita conexión a npm para instalar dependencias. Los textos y rentabilidades mostrados son de muestra, y los documentos legales son borradores.
