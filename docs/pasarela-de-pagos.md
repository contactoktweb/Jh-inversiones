# Fase pendiente: pasarela de pagos

Documento técnico para conectar el cobro automático con tarjeta. Es la **única pieza que falta**: inversiones, ganancias, retiros, administración, correos y pruebas ya funcionan.

## Estado actual

| Pieza | Archivo | Estado |
|---|---|---|
| Métodos visibles al invertir | `NEXT_PUBLIC_PAYMENT_METHODS` → `src/lib/config.ts` | Listo |
| Inicio del pago según el método | `startPayment()` en `src/lib/server/payments.ts` | Listo (`test`, `transfer`); `stripe` de ejemplo |
| Endpoint que llama la página `/invertir` | `src/app/api/checkout/route.ts` | Listo |
| Confirmación asíncrona del proveedor | `src/app/api/webhooks/stripe/route.ts` | Ejemplo con Stripe, **desactivado** |
| Página de regreso tras pagar | `src/app/checkout/success/page.tsx` | Lista |
| Columna del método en la base de datos | `investments.payment_method` (`test`, `transfer`, `manual`, `stripe`) | Lista |

### Cómo fluye hoy un pago

```
/invertir ──POST /api/checkout {amountUsd, acceptTerms, method}
             └─ startPayment(session, amount, method)
                 ├─ test     → inserta inversión ACTIVA          → «Pago de prueba aceptado»
                 ├─ transfer → inserta PAGO PENDIENTE + ref. JH-… → el admin confirma en /admin/pagos
                 └─ stripe   → crea Checkout Session → redirige → webhook firmado inserta ACTIVA
```

## Pasos para activar la pasarela

### 1. Elegir el proveedor (requisito de negocio)

Confirma **por escrito** que el proveedor acepta servicios de inversión y que tienes las licencias de tu jurisdicción. Stripe, por ejemplo, restringe estos negocios y puede bloquear la cuenta si no los aprueba antes.

### 2. Con Stripe (ya hay código de ejemplo)

1. Crea la cuenta y obtén `STRIPE_SECRET_KEY`.
2. En Stripe → Developers → Webhooks, registra `https://TU_DOMINIO/api/webhooks/stripe` con los eventos `checkout.session.completed` y `checkout.session.async_payment_succeeded`. Copia el secreto de firma en `STRIPE_WEBHOOK_SECRET`.
3. En Vercel define:
   ```
   NEXT_PUBLIC_PAYMENT_METHODS=stripe,transfer
   PAYMENTS_APPROVED=true
   STRIPE_SECRET_KEY=sk_live_…
   STRIPE_WEBHOOK_SECRET=whsec_…
   ```
4. Vuelve a desplegar. En `/invertir` aparecerá «Tarjeta de crédito o débito».

Lo que ya hace el ejemplo:
- El **monto lo valida el servidor** (entero entre 50 y 100,000 USD), nunca el navegador.
- El webhook **verifica la firma**, la moneda (`usd`), el monto (`amount_total === amount_usd × 100`) y el plan, y solo entonces crea la inversión activa.
- `payment_reference` es único: si el proveedor reintenta el webhook no se duplica la inversión (error `23505` ignorado).

### 3. Con otro proveedor (Wompi, Mercado Pago, PayU, Bold, etc.)

1. Agrega el valor del método en la restricción de la base de datos (en `supabase/schema.sql`, `investments_payment_method_check`) y en `PaymentMethod` / `ALL_METHODS` de `src/lib/config.ts`.
2. En `startPayment()` agrega una rama que:
   - cree la orden o el link de pago en el proveedor con el monto, la moneda USD, el `user_id` y un identificador único;
   - devuelva `{ kind: "redirect", url }`.
3. Crea `src/app/api/webhooks/<proveedor>/route.ts` que:
   - **verifique la firma** del evento con el secreto del proveedor;
   - compruebe el estado aprobado, la moneda y el **monto exacto**;
   - inserte la inversión con `status: "active"`, `payment_method: "<proveedor>"`, `payment_reference: <id de la transacción>` y `confirmed_at: now`. Usa `planForAmount()` y las fechas de `MIN_TERM_DAYS`;
   - sea **idempotente** (la referencia única ya lo garantiza).
4. Agrega la etiqueta en `PAYMENT_METHOD_LABELS` (`src/lib/finance.ts`) y en `METHOD_INFO` (`src/components/invest-checkout.tsx`).
5. Opcional: avisa al administrador con `notifyAdmin()` y al cliente con `sendEmail()` (`src/lib/server/notify.ts`).

### 4. Probar antes de abrir

- Usa el modo sandbox o de pruebas del proveedor y sus tarjetas de prueba.
- Agrega una prueba de punta a punta en `tests/e2e/` que simule el webhook firmado.
- Verifica en `/admin/pagos → Historial` que aparece con el método «Tarjeta (pasarela)».
- **Quita `test`** de `NEXT_PUBLIC_PAYMENT_METHODS` en producción.

## Lista de verificación

- [ ] Proveedor aprobado por escrito para esta actividad.
- [ ] Claves de producción en Vercel (nunca en el código).
- [ ] Webhook registrado y con la firma verificada.
- [ ] Monto y moneda verificados en el servidor.
- [ ] Prueba en sandbox: pago aprobado, rechazado y webhook reintentado.
- [ ] `NEXT_PUBLIC_PAYMENT_METHODS` sin `test`.
- [ ] Términos y política de privacidad actualizados con el proveedor.
