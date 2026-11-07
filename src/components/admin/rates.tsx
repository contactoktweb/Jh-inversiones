"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Check, Pencil, Save, X } from "lucide-react";
import { formatDate } from "@/lib/finance";
import { DEFAULT_DAILY_RATE_PCT, MAX_DAILY_RATE_PCT, rateFor, recentDayKeys, todayKey, type DailyRates } from "@/lib/rates";

export const formatKey = (key: string) => formatDate(`${key}T12:00:00`);

function useSaveRate(onSaved: (date: string, rate: number) => void) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState(false);
  async function save(date: string, ratePct: number) {
    setBusy(true);setMessage("");setError(false);
    try {
      const res=await fetch("/api/admin/rates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({date,ratePct})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"No se pudo guardar la tasa.");
      setMessage(data.message);onSaved(data.date,data.ratePct);return true;
    } catch(e){setMessage(e instanceof Error?e.message:"Error desconocido");setError(true);return false;}
    finally{setBusy(false)}
  }
  return {busy,message,error,save};
}

function RateInput({ value, onChange, id }: {value:string;onChange:(v:string)=>void;id:string}) {
  return <div className="rate-input"><input id={id} type="number" inputMode="decimal" min={0} max={MAX_DAILY_RATE_PCT} step={0.01} required value={value} onChange={e=>onChange(e.target.value)}/><span>%</span></div>;
}

function DailyPrompt({ today, suggested, error, onSave, onLater }: {today:string;suggested:number;error:string;onSave:(rate:number)=>Promise<boolean>;onLater:()=>void}) {
  const [value,setValue]=useState(String(suggested));
  const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);await onSave(Number(value));setBusy(false);}
  return <motion.div className="rate-modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><motion.form onSubmit={submit} className="rate-modal" role="dialog" aria-modal="true" aria-labelledby="rate-modal-title" initial={{y:24,opacity:0}} animate={{y:0,opacity:1}} exit={{y:24,opacity:0}}>
    <div className="rate-modal-icon"><BellRing size={24}/></div>
    <h2 id="rate-modal-title">Configura la ganancia de hoy</h2>
    <p>Indica el porcentaje de ganancia para el <strong>{formatKey(today)}</strong>. Si no lo configuras, se aplicará automáticamente el <strong>{DEFAULT_DAILY_RATE_PCT}%</strong> por defecto.</p>
    <label htmlFor="rate-today">Porcentaje diario</label>
    <RateInput id="rate-today" value={value} onChange={setValue}/>
    {error&&<p role="alert" className="claim-feedback error">{error}</p>}
    <div className="rate-modal-actions"><button type="submit" className="rate-primary" disabled={busy}><Save size={17}/>{busy?"Guardando…":"Guardar porcentaje"}</button><button type="button" className="rate-ghost" onClick={onLater}>Recordármelo después</button></div>
  </motion.form></motion.div>;
}

/** Tarjeta de la tasa de hoy (con aviso diario) y, opcionalmente, historial editable. */
export default function RatesPanel({ rates: initialRates, historyDays = 0, prompt = false }: {rates:DailyRates;historyDays?:number;prompt?:boolean}) {
  const router=useRouter();
  const [rates,setRates]=useState(initialRates);
  useEffect(()=>setRates(initialRates),[initialRates]);
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),60_000);return()=>clearInterval(t)},[]);
  const today=todayKey(now);
  const todaySet=today in rates;
  const [promptOpen,setPromptOpen]=useState(prompt&&!todaySet);
  const {busy,message,error,save}=useSaveRate((date,rate)=>{setRates(r=>({...r,[date]:rate}));router.refresh();});
  const yesterday=recentDayKeys(2,now)[1];
  const [todayValue,setTodayValue]=useState(String(rates[today]??rates[yesterday]??DEFAULT_DAILY_RATE_PCT));
  const [editing,setEditing]=useState<string|null>(null);
  const [editValue,setEditValue]=useState("");
  const history=historyDays?recentDayKeys(historyDays,now):[];

  return <>
    {!todaySet&&<div className="rate-alert" role="alert"><BellRing size={18}/><span>Aún no configuraste la ganancia de hoy. Se está aplicando el {DEFAULT_DAILY_RATE_PCT}% por defecto.</span><button type="button" onClick={()=>setPromptOpen(true)}>Configurar ahora</button></div>}
    <div className={historyDays?"dash-body-grid":""}>
      <section className="dash-panel" id="tasa"><div className="panel-heading"><h2>Ganancia diaria de hoy</h2><span>{formatKey(today)}</span></div>
        <form className="rate-form" onSubmit={async e=>{e.preventDefault();await save(today,Number(todayValue));}}>
          <label htmlFor="rate-main">Porcentaje de ganancia para hoy</label>
          <div className="rate-form-row"><RateInput id="rate-main" value={todayValue} onChange={setTodayValue}/><button type="submit" className="rate-primary" disabled={busy}><Save size={17}/>{busy?"Guardando…":todaySet?"Actualizar":"Guardar"}</button></div>
          <div className="rate-presets">{[1,1.5,2,2.5].map(v=><button type="button" key={v} className={Number(todayValue)===v?"active":""} onClick={()=>setTodayValue(String(v))}>{v}%</button>)}</div>
          <p className="chart-note">Se aplica a todas las inversiones activas: cada una gana su capital × {Number(todayValue)||0}% durante este día. Si no se configura, se usa {DEFAULT_DAILY_RATE_PCT}%.</p>
          {message&&<p role="status" className={`claim-feedback ${error?"error":""}`}>{message}</p>}
        </form>
      </section>
      {historyDays>0&&<section className="dash-panel" id="historial"><div className="panel-heading"><h2>Historial de tasas</h2><span>{historyDays} DÍAS</span></div>
        <ul className="rate-history">{history.map(key=><li key={key}><span>{formatKey(key)}{key===today&&<small> · hoy</small>}</span>{editing===key?<form className="rate-inline" onSubmit={async e=>{e.preventDefault();if(await save(key,Number(editValue)))setEditing(null);}}><RateInput id={`rate-${key}`} value={editValue} onChange={setEditValue}/><button type="submit" aria-label="Guardar" disabled={busy}><Check size={16}/></button><button type="button" aria-label="Cancelar" onClick={()=>setEditing(null)}><X size={16}/></button></form>:<><strong className={key in rates?"":"rate-default"}>{rateFor(rates,key)}%{!(key in rates)&&<small> por defecto</small>}</strong><button type="button" className="rate-edit" aria-label={`Editar tasa del ${formatKey(key)}`} onClick={()=>{setEditing(key);setEditValue(String(rateFor(rates,key)))}}><Pencil size={14}/></button></>}</li>)}</ul>
      </section>}
    </div>
    <AnimatePresence>{promptOpen&&!todaySet&&<DailyPrompt today={today} error={error?message:""} suggested={rates[yesterday]??DEFAULT_DAILY_RATE_PCT} onLater={()=>setPromptOpen(false)} onSave={async rate=>{const ok=await save(today,rate);if(ok){setPromptOpen(false);setTodayValue(String(rate));}return ok;}}/>}</AnimatePresence>
  </>;
}
