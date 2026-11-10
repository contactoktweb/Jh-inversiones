# Configuración y despliegue · JH Inversiones

Guía técnica para dejar la plataforma funcionando en una cuenta nueva de **Supabase**, **Resend** y **Vercel**. Es para quien hace la instalación. El cliente recibe aparte el **manual de uso** (`docs/Manual-de-uso-JH-Inversiones.pdf`), que no incluye nada de esto.

**Archivos de la entrega**

| Archivo | Para qué |
|---|---|
| `supabase/schema.sql` | SQL a ejecutar en Supabase (tablas, seguridad RLS y ajustes iniciales) |
| `supabase/templates/confirmation.html` | Plantilla del correo «Confirma tu cuenta» |
| `supabase/templates/recovery.html` | Plantilla del correo «Restablece tu contraseña» |
| `deploy/variables-vercel.env` | Variables de entorno listas para pegar en Vercel |
| `docs/Manual-de-uso-JH-Inversiones.pdf` | Manual de uso para entregar al cliente |
| `docs/pasarela-de-pagos.md` | Fase pendiente: conectar la pasarela con tarjeta |

**Orden recomendado:** Resend (dominio) → Supabase → Vercel → URLs finales en Supabase → prueba completa.

---

## 1. Resend

Resend envía **todos** los correos: los de cuenta (confirmación y recuperación, vía SMTP desde Supabase) y los avisos de la plataforma (pagos y retiros, vía API).

1. Crea la cuenta en [resend.com](https://resend.com).
2. **Domains → Add Domain**: agrega el dominio del cliente (p. ej. `jhinversiones.com`) y crea en su DNS los registros que indica Resend (MX, SPF y DKIM). Espera a que diga **Verified**.
3. **API Keys → Create API Key**, con permiso *Sending access*. Copia la clave (`re_…`): se usa dos veces, en Supabase (SMTP) y en Vercel.
4. Define el remitente, por ejemplo `avisos@jhinversiones.com` (debe pertenecer al dominio verificado).

### 1.1 Sin dominio todavía (modo de prueba)

Si aún no tienes un dominio verificado, puedes arrancar solo con la API key usando el remitente de pruebas de Resend, `onboarding@resend.dev`.

**Limitación de Resend:** con ese remitente Resend **solo entrega correos al email con el que se creó la cuenta de Resend**. A cualquier otro destinatario lo rechaza. La plataforma no se rompe por eso: el correo simplemente no sale y la operación (pago, retiro, etc.) se completa igual.

| Correo | ¿Llega en modo de prueba? |
|---|---|
| Avisos al administrador (nueva transferencia, nuevo retiro) | **Sí**, si `ADMIN_NOTIFICATION_EMAIL` es el email de tu cuenta de Resend |
| Avisos al cliente (pago confirmado, retiro desembolsado…) | No (salvo que el cliente sea ese mismo email) |
| Confirmación de registro y recuperación de contraseña (Supabase) | Solo para el email de tu cuenta de Resend |

Configuración en modo de prueba:

- **Vercel:** `RESEND_FROM_EMAIL="JH Inversiones <onboarding@resend.dev>"` (ya viene así en `deploy/variables-vercel.env`) y `ADMIN_NOTIFICATION_EMAIL=` el email de tu cuenta de Resend.
- **Supabase → SMTP** (sección 2.3): igual, pero con *Sender email* `onboarding@resend.dev`.
- **Supabase → Sign In / Providers → Email:** **desactiva *Confirm email*** mientras no haya dominio. Así los clientes se registran y entran directo sin esperar un correo que no les va a llegar. (Con *Confirm email* desactivado la cuenta queda confirmada al registrarse, así que `ADMIN_EMAILS` funciona igual.)
- *¿Olvidaste tu contraseña?* solo funcionará para el email de tu cuenta de Resend. Si un cliente la olvida, en Supabase → **Authentication → Users** → el usuario → **Send password recovery** tampoco le llegará: elimina el usuario y que se registre de nuevo, o espera a tener el dominio.

**Cuando tengas el dominio:** verifícalo en Resend (paso 2), cambia `RESEND_FROM_EMAIL` en Vercel a `JH Inversiones <avisos@TU-DOMINIO.com>` y vuelve a desplegar, cambia el *Sender email* del SMTP en Supabase y vuelve a activar *Confirm email*. No hay que tocar el código.

---

## 2. Supabase

### 2.1 Proyecto y base de datos

1. Crea un proyecto en [supabase.com/dashboard](https://supabase.com/dashboard). Elige una región cercana a los clientes, por ejemplo *South America (São Paulo)* o *East US*.
2. **SQL Editor → New query** → pega **todo** `supabase/schema.sql` → **Run**. Debe terminar con *Success. No rows returned*.
   - Crea: `profiles`, `plans`, `investments`, `daily_rates`, `claims`, `settings` y `admin_audit`, con sus restricciones e índices, la RLS y el disparador que crea el perfil al registrarse. Deja cargados los 3 planes iniciales (Impulso 50, Órbita 500, Horizonte 2.000 USD), que luego el administrador edita en **Planes**.
   - Es re-ejecutable: si más adelante hay una versión nueva, se vuelve a pegar y ejecutar sin perder datos.
3. Comprueba en **Table Editor** que aparecen las 8 tablas (incluida `payment_proofs`, donde se guardan los comprobantes).

### 2.2 Claves (para Vercel)

**Project Settings → API Keys:**

| Clave en Supabase | Variable en Vercel |
|---|---|
| Project URL (`https://xxxx.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` |
| **Publishable key** (`sb_publishable_…`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Secret key** (`sb_secret_…`) | `SUPABASE_SERVICE_ROLE_KEY` |

> Las claves antiguas (*Legacy API Keys*: `anon` y `service_role`) también funcionan. La plataforma está probada con ambos formatos.

### 2.3 Autenticación

**Authentication → Sign In / Providers → Email**
- *Enable Email provider*: activado.
- **Confirm email: activado** (el cliente debe confirmar su correo antes de entrar).
- *Minimum password length*: **8** (el formulario ya exige 8).

**Authentication → Emails → SMTP Settings → Enable Custom SMTP** (con Resend)

| Campo | Valor |
|---|---|
| Sender email | `avisos@jhinversiones.com` (del dominio verificado) |
| Sender name | `JH Inversiones` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | la API key de Resend (`re_…`) |

> Sin SMTP propio, Supabase solo envía unos pocos correos por hora, lo que no basta para producción.

**Authentication → Rate Limits:** sube *Rate limit for sending emails* a un valor acorde (por ejemplo 100 por hora).

**Authentication → Emails → Templates**

| Plantilla | Asunto | Contenido (Source) |
|---|---|---|
| **Confirm signup** | `Confirma tu cuenta en JH Inversiones` | todo `supabase/templates/confirmation.html` |
| **Reset password** | `Restablece tu contraseña de JH Inversiones` | todo `supabase/templates/recovery.html` |

Las plantillas usan `/auth/confirm?token_hash=…`, así que el enlace funciona aunque el cliente abra el correo en otro dispositivo. No cambies esa parte del enlace.

**Authentication → URL Configuration** (se completa en el paso 4, cuando ya conozcas el dominio)
- *Site URL:* `https://TU-DOMINIO.com`
- *Redirect URLs:* `https://TU-DOMINIO.com/**` (y también `https://TU-PROYECTO.vercel.app/**` si vas a probar con el dominio de Vercel)

### 2.4 Respaldos

En **Database → Backups** revisa la política de respaldos del plan contratado. El plan Pro incluye respaldos diarios.

---

## 3. Vercel

1. **Add New → Project → Import** el repositorio de GitHub (rama `main`). Vercel detecta Next.js y pnpm solos; no cambies los comandos.
2. Antes del primer despliegue, en **Environment Variables**, pega el contenido de `deploy/variables-vercel.env` (Vercel acepta pegar un `.env` completo) y reemplaza los valores:

| Variable | Obligatoria | Valor |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Sí | `https://TU-DOMINIO.com` (sin `/` final) |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Project URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Secret key (**secreta**) |
| `ADMIN_EMAILS` | Sí | Correo(s) del cliente administrador, separados por comas |
| `NEXT_PUBLIC_PAYMENT_METHODS` | Sí | `transfer` para operar con dinero real (valor del archivo de Vercel); `test,transfer` solo para probar sin dinero |
| `RESEND_API_KEY` | Sí | `re_…` |
| `RESEND_FROM_EMAIL` | Sí | `JH Inversiones <avisos@TU-DOMINIO.com>`; sin dominio: `JH Inversiones <onboarding@resend.dev>` (sección 1.1). Si la escribes a mano en el campo de Vercel, sin comillas |
| `ADMIN_NOTIFICATION_EMAIL` | Sí | Bandeja que recibe los avisos de pagos y retiros (sin dominio: el email de tu cuenta de Resend) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Recomendada | Correo de contacto público |
| `NEXT_PUBLIC_CONTACT_WHATSAPP` | Opcional | Solo dígitos con código de país (`573001234567`) |
| `PAYMENTS_APPROVED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | No | Pasarela, fase pendiente: dejar `false` y vacías |

   Marca los entornos **Production** y **Preview**.
3. **Deploy.**
4. **Domains:** agrega el dominio del cliente y configura su DNS como indica Vercel.

> Las variables `NEXT_PUBLIC_…` se incorporan al compilar. Si cambias alguna, haz **Deployments → … → Redeploy**.

---

## 4. Cerrar la configuración

1. En Supabase → **Authentication → URL Configuration**, pon el dominio final (sección 2.3).
2. Si `NEXT_PUBLIC_SITE_URL` cambió, actualízala en Vercel y vuelve a desplegar.

---

## 5. Prueba de aceptación (antes de entregar)

Hazla en el dominio final, de principio a fin:

- [ ] La página de inicio carga y el pie muestra el contacto.
- [ ] **Registro** con un correo de prueba → llega «Confirma tu cuenta» desde `avisos@…` → el enlace lleva al panel.
- [ ] **¿Olvidaste tu contraseña?** → llega el correo → permite crear una nueva.
- [ ] Registro con el correo de `ADMIN_EMAILS` → al entrar va a **/admin** y aparece la ventana de la tasa diaria.
- [ ] **Planes:** aparecen Impulso, Órbita y Horizonte; edita uno y comprueba el cambio en la página de inicio.
- [ ] **Ajustes:** escribe los datos bancarios reales del cliente. «Correos de aviso» debe decir **Activos**.
- [ ] Como cliente de prueba: invertir **por transferencia** → aparece la referencia `JH-…` con los datos bancarios → al administrador le llega «Nueva inversión pendiente de pago».
- [ ] En **Pagos**, confirmar esa transferencia → al cliente le llega «Pago confirmado» y su panel la muestra activa.
- [ ] Invertir con **pago de prueba** → «Pago de prueba aceptado».
- [ ] **Retiro:** para no esperar 30 días, en Supabase → SQL Editor:
  ```sql
  update investments set started_at = now() - interval '31 days', ends_at = now() - interval '1 day'
  where user_id = (select id from profiles where email = 'cliente-de-prueba@correo.com') and status = 'active';
  ```
  Solicita el retiro → llega el aviso al administrador → márcalo como desembolsado → al cliente le llega «Retiro desembolsado».
- [ ] **Actividad** muestra todas las acciones y **Exportar** descarga los CSV.
- [ ] Borra los datos de prueba antes de entregar (abajo).

**Borrar los datos de prueba** (SQL Editor). Elimina las cuentas de prueba y todo lo relacionado; las tasas y los ajustes se conservan:

```sql
delete from auth.users where email in ('cliente-de-prueba@correo.com');
delete from admin_audit;  -- opcional: vacía el registro de actividad de las pruebas
```

---

## 6. Antes de operar con dinero real

- Cambia `NEXT_PUBLIC_PAYMENT_METHODS` a `transfer` y vuelve a desplegar. Con `test` activo, cualquier persona puede crear inversiones sin pagar.
- Haz revisar los textos de `/terminos` y `/privacidad` por un abogado (están en `src/app/terminos/page.tsx` y `src/app/privacidad/page.tsx`).
- La pasarela con tarjeta es la fase pendiente: ver `docs/pasarela-de-pagos.md`.

---

## 7. Mantenimiento

| Tarea | Cómo |
|---|---|
| Agregar un administrador | Que se registre y luego: panel → Clientes → ficha → **Hacer administrador**. O añadir su correo a `ADMIN_EMAILS` y volver a desplegar |
| Cambiar el contacto público | Variables `NEXT_PUBLIC_CONTACT_*` → Redeploy |
| Actualizar la base de datos tras una versión nueva | Volver a ejecutar `supabase/schema.sql` |
| Ver errores del servidor | Vercel → Logs |
| Ver los correos enviados | Resend → Emails |
| Ver los usuarios | Supabase → Authentication → Users |

## 8. Verificación técnica realizada

- `pnpm typecheck`: sin errores.
- `pnpm test`: 21 pruebas unitarias.
- `pnpm test:e2e`: **36 pruebas de punta a punta** contra Supabase local, con las claves nuevas `sb_publishable_` / `sb_secret_`, incluido el envío de cada correo por la API de Resend (simulada).
- El SQL se probó en una base nueva, re-ejecutándolo, y actualizando una base con la versión anterior y datos (incluida la versión sin tabla de planes: las inversiones existentes quedan enlazadas a sus planes).
