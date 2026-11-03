import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/logo";
import ContactLine from "@/components/contact-line";
import { brand } from "@/lib/brand";

export const metadata:Metadata={title:"Política de privacidad"};
export default function Privacy(){return <div className="simple-page"><header className="simple-header"><Logo/><Link href="/">Volver al inicio</Link></header><main className="simple-content">
  <h1>Política de privacidad</h1>
  <p>Esta política explica qué datos trata {brand.name} y para qué.</p>
  <h2>Datos que tratamos</h2>
  <p>Tu correo electrónico y contraseña (cifrada) para darte acceso; los montos, fechas y estados de tus inversiones; tus solicitudes de retiro, y los datos técnicos de sesión necesarios para mantenerte conectado.</p>
  <h2>Para qué los usamos</h2>
  <p>Para gestionar tu cuenta, registrar tus inversiones, calcular tus ganancias diarias, tramitar tus retiros y comunicarnos contigo sobre ellos. No vendemos tus datos.</p>
  <h2>Proveedores</h2>
  <p>Usamos Supabase (autenticación y base de datos) y Vercel (alojamiento). Si se habilitan, también Resend (correos de aviso) y el procesador de pagos correspondiente.</p>
  <h2>Conservación y seguridad</h2>
  <p>Cada cuenta solo puede ver sus propios datos. Conservamos la información mientras tu cuenta esté activa y durante el tiempo que exijan las obligaciones legales y contables.</p>
  <h2>Tus derechos</h2>
  <p>Puedes pedir acceso, corrección o eliminación de tus datos escribiéndonos a <ContactLine/>.</p>
</main></div>}
