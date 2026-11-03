import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/logo";
import ContactLine from "@/components/contact-line";
import { brand } from "@/lib/brand";
import { DEFAULT_DAILY_RATE_PCT, MIN_INVESTMENT_USD, MIN_TERM_DAYS } from "@/lib/rates";

export const metadata:Metadata={title:"Términos y condiciones"};
export default function Terms(){return <div className="simple-page"><header className="simple-header"><Logo/><Link href="/">Volver al inicio</Link></header><main className="simple-content">
  <h1>Términos y condiciones</h1>
  <p>Al crear una cuenta o invertir en {brand.name} aceptas estas condiciones.</p>
  <h2>1. Inversión</h2>
  <p>La inversión mínima es de {MIN_INVESTMENT_USD} dólares estadounidenses (USD). Todos los montos, ganancias y retiros se expresan y liquidan en USD. La inversión se registra en tu panel cuando el pago queda confirmado.</p>
  <h2>2. Ganancias</h2>
  <p>Cada día tu inversión suma el capital multiplicado por el porcentaje de ganancia diaria que publica la administración para ese día. Si no se publica un porcentaje, se aplica el {DEFAULT_DAILY_RATE_PCT}% por defecto. El porcentaje puede variar de un día a otro y <strong>las ganancias no están garantizadas</strong>.</p>
  <h2>3. Plazo mínimo y retiros</h2>
  <p>Cada inversión tiene un plazo mínimo de {MIN_TERM_DAYS} días. Cumplido ese plazo puedes solicitar desde tu panel el retiro del capital más las ganancias acumuladas. Las ganancias dejan de sumar en la fecha de la solicitud. La administración revisa cada solicitud y realiza el desembolso; el estado (pendiente, aprobado, desembolsado o rechazado) se muestra en tu panel.</p>
  <h2>4. Pagos de prueba</h2>
  <p>Mientras la plataforma opere en modo de pago de prueba, los pagos se aceptan sin realizar ningún cobro y las inversiones creadas así quedan marcadas como «pago de prueba».</p>
  <h2>5. Cuenta</h2>
  <p>Eres responsable de mantener la confidencialidad de tu contraseña. Podemos suspender cuentas usadas de forma fraudulenta o contraria a estas condiciones.</p>
  <h2>6. Contacto</h2>
  <p>Para dudas sobre estas condiciones escríbenos a <ContactLine/>.</p>
</main></div>}
