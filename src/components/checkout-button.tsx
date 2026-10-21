"use client";
import { useState } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CheckoutButton({ planId, label = "Elegir plan" }: { planId: string; label?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function checkout() {
    if (pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ planId }) });
      const data = await response.json();
      if (data.demo) { router.push("/dashboard?demo=1"); return; }
      if (response.status === 401) { router.push(`/acceso?plan=${encodeURIComponent(planId)}`); return; }
      if (!response.ok || !data.url) throw new Error(data.error || "No pudimos iniciar el pago.");
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Ocurrió un error."); }
    finally { setPending(false); }
  }
  return <><button className="choose-plan" disabled={pending} onClick={checkout}>{pending ? <LoaderCircle className="spin" size={17}/> : null}{label}<ArrowUpRight size={18}/></button>{error && <p className="small-error" role="alert">{error}</p>}</>;
}
