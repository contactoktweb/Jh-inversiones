import Link from "next/link";
import Logo from "@/components/logo";
import { CircleCheck, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata={title:"Confirmación de operación",robots:{index:false,follow:false}};
export default function SuccessPage(){return <div className="simple-page"><header className="simple-header"><Logo/><Link href="/">Inicio</Link></header><main className="simple-content"><CircleCheck size={45} color="#d6fc74"/><h1>Estamos verificando la operación.</h1><p>La plataforma espera la confirmación autenticada del proveedor de pagos. La operación aparecerá en tu panel cuando el servidor reciba y procese el evento de pago aprobado. Si la operación no aparece, contacta al equipo responsable.</p><p><Link href="/dashboard">Volver a mi panel <ArrowUpRight size={16}/></Link></p></main></div>}
