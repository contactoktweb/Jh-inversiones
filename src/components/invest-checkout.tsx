"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarDays, CircleCheck, CreditCard, LoaderCircle, LockKeyhole, Percent, ShieldCheck, Wallet } from "lucide-react";
import Logo from "./logo";
import { formatDate, formatUsd } from "@/lib/finance";
import { planForAmount } from "@/lib/plans";
import { MAX_INVESTMENT_USD, MIN_INVESTMENT_USD, MIN_TERM_DAYS } from "@/lib/rates";

type Receipt = { reference: string; amountUsd: number; planName: string };

export default function InvestCheckout({ initialAmount, email, todayRate, testMode }: {initialAmount:number;email:string;todayRate:number;testMode:boolean}) {
  const router=useRouter();
  const [amount,setAmount]=useState(String(initialAmount));
  const [accept,setAccept]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [receipt,setReceipt]=useState<Receipt|null>(null);
  const value=Number(amount);
  const valid=Number.isInteger(value)&&value>=MIN_INVESTMENT_USD&&value<=MAX_INVESTMENT_USD;
  const plan=planForAmount(valid?value:MIN_INVESTMENT_USD);
  const dailyGain=valid?value*todayRate/100:0;
  const availableAt=Date.now()+MIN_TERM_DAYS*86_400_000;

  useEffect(()=>{if(!receipt)return;const t=setTimeout(()=>{router.push("/dashboard");router.refresh();},4000);return()=>clearTimeout(t)},[receipt,router]);

  async function pay(e:React.FormEvent){
    e.preventDefault();
    if(!valid||!accept||busy)return;
    setBusy(true);setError("");
    try{
      const res=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amountUsd:value,acceptTerms:true})});
      const data=await res.json();
      if(res.status===401){router.push(`/acceso?next=${encodeURIComponent(`/invertir?monto=${value}`)}`);return;}
      if(!res.ok)throw new Error(data.error||"No pudimos procesar el pago.");
      if(data.status==="redirect"&&data.url){window.location.assign(data.url);return;}
      setReceipt({reference:data.reference,amountUsd:data.amountUsd,planName:data.planName});
    }catch(err){setError(err instanceof Error?err.message:"Ocurrió un error.");}
    finally{setBusy(false)}
  }

  return <div className="invest-page">
    <header className="invest-header"><Logo/><Link href="/dashboard">Mi panel <ArrowRight size={16}/></Link></header>
    <main className="invest-main-wrap">
      <AnimatePresence mode="wait">{receipt?
        <motion.section key="ok" className="invest-card invest-success" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
          <div className="invest-success-icon"><CircleCheck size={40}/></div>
          <h1>Pago de prueba aceptado</h1>
          <p>Tu inversión de <strong>{formatUsd(receipt.amountUsd)}</strong> en el plan <strong>{receipt.planName}</strong> quedó activa y ya empieza a sumar ganancias diarias.</p>
          <dl className="invest-summary"><div><dt>Referencia</dt><dd>{receipt.reference}</dd></div><div><dt>Retiro disponible desde</dt><dd>{formatDate(availableAt)}</dd></div></dl>
          <p className="invest-note">Te llevamos a tu panel en unos segundos…</p>
          <Link className="invest-pay" href="/dashboard">Ir a mi panel <ArrowRight size={18}/></Link>
        </motion.section>:
        <motion.form key="form" onSubmit={pay} className="invest-card" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
          <Link href="/#planes" className="invest-back"><ArrowLeft size={16}/> Ver planes</Link>
          <span className="invest-eyebrow">NUEVA INVERSIÓN</span>
          <h1>¿Cuánto quieres invertir?</h1>
          <p className="invest-lead">Desde {formatUsd(MIN_INVESTMENT_USD)} en adelante. Plazo mínimo de un mes.</p>
          <label htmlFor="invest-amount">Monto en dólares (USD)</label>
          <div className="invest-amount"><span>$</span><input id="invest-amount" inputMode="numeric" type="number" min={MIN_INVESTMENT_USD} max={MAX_INVESTMENT_USD} step={1} required value={amount} onChange={e=>setAmount(e.target.value)}/><span>USD</span></div>
          {!valid&&amount!==""&&<p className="invest-error">Ingresa un monto entero entre {formatUsd(MIN_INVESTMENT_USD)} y {formatUsd(MAX_INVESTMENT_USD)}.</p>}
          <div className="invest-presets">{[50,100,500,1000,2000].map(v=><button type="button" key={v} className={value===v?"active":""} onClick={()=>setAmount(String(v))}>${v.toLocaleString("en-US")}</button>)}</div>
          <dl className="invest-summary">
            <div><dt><Wallet size={15}/> Plan</dt><dd>{plan.name}</dd></div>
            <div><dt><Percent size={15}/> Ganancia de hoy</dt><dd>{todayRate}% · +{formatUsd(dailyGain)} al día</dd></div>
            <div><dt><CalendarDays size={15}/> Retiro disponible desde</dt><dd>{formatDate(availableAt)}</dd></div>
            <div><dt><ShieldCheck size={15}/> Cuenta</dt><dd>{email}</dd></div>
          </dl>
          <p className="invest-note">La ganancia diaria la publica la administración cada día (1.5% por defecto) y puede variar; no está garantizada.</p>
          <label className="invest-check"><input type="checkbox" checked={accept} onChange={e=>setAccept(e.target.checked)}/> <span>Acepto los <Link href="/terminos" target="_blank">términos</Link> y la <Link href="/privacidad" target="_blank">política de privacidad</Link>.</span></label>
          {testMode&&<p className="invest-test"><CreditCard size={16}/> Modo de pago de prueba: no se realizará ningún cobro real.</p>}
          <button type="submit" className="invest-pay" disabled={!valid||!accept||busy}>{busy?<><LoaderCircle className="spin" size={18}/> Procesando pago…</>:<><LockKeyhole size={17}/> Pagar {valid?formatUsd(value):""}</>}</button>
          {error&&<p className="invest-error" role="alert">{error}</p>}
        </motion.form>}
      </AnimatePresence>
    </main>
  </div>;
}
