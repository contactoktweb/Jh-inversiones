import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Lleva al flujo de inversión con el monto elegido; /invertir pide iniciar sesión si hace falta. */
export default function CheckoutButton({ amountUsd, label = "Invertir ahora" }: { amountUsd: number; label?: string }) {
  return <Link className="choose-plan" href={`/invertir?monto=${amountUsd}`}>{label}<ArrowUpRight size={18}/></Link>;
}
