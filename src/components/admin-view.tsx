"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, CalendarDays, Check, FolderOpen, Info, LogOut, Pencil, Percent, Save, Settings2, ShieldCheck, TrendingUp, Users, Wallet, X } from "lucide-react";
import Logo from "./logo";
import { formatDate, formatUsd, type Investment } from "@/lib/finance";
import { calculateEarnings, DEFAULT_DAILY_RATE_PCT, MAX_DAILY_RATE_PCT, rateFor, recentDayKeys, todayKey, type DailyRates } from "@/lib/rates";

const formatKey = (key: string) => formatDate(`${key}T12:00:00`);

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

export default function AdminView({ demo, adminEmail, investments, rates: initialRates, renderedAt }: {demo:boolean;adminEmail:string;investments:Investment[];rates:DailyRates;renderedAt:number}) {
  const router=useRouter();
  const [rates,setRates]=useState(initialRates);
  const [now,setNow]=useState(renderedAt);
  useEffect(()=>{const interval=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(interval)},[]);
  const today=todayKey(now);
  const todaySet=today in rates;
  const [promptOpen,setPromptOpen]=useState(!todaySet);
  useEffect(()=>{if(!(today in rates))setPromptOpen(true)},[today]); // eslint-disable-line react-hooks/exhaustive-deps
  const {busy,message,error,save}=useSaveRate((date,rate)=>{setRates(r=>({...r,[date]:rate}));router.refresh();});
  const yesterday=recentDayKeys(2,now)[1];
  const [todayValue,setTodayValue]=useState(String(rates[today]??rates[yesterday]??DEFAULT_DAILY_RATE_PCT));
  const [editing,setEditing]=useState<string|null>(null);
  const [editValue,setEditValue]=useState("");

  const overview=investments.map(item=>({...item,calc:calculateEarnings(item,rates,now)}));
  const principal=overview.reduce((s,x)=>s+x.principal_usd,0);
  const earnings=overview.reduce((s,x)=>s+x.calc.earnings,0);
  const investors=new Set(investments.map(x=>x.owner_email)).size;
  const todayRate=rateFor(rates,today);
  const history=recentDayKeys(14,now);

  return <div className="dash-layout"><aside className="dash-sidebar"><Logo/><div className="dash-group-label">ADMINISTRACIÓN</div><nav className="dash-nav" aria-label="Secciones de administración"><a className="current" href="#tasa"><Percent size={18}/><span>Ganancia diaria</span></a><a href="#historial"><CalendarDays size={18}/><span>Historial de tasas</span></a><a href="#inversiones"><Users size={18}/><span>Inversiones</span></a></nav><div className="sidebar-bottom"><div className="sidebar-help"><Settings2 size={23}/><h3>Recuerda a diario.</h3><p>Configura cada día el porcentaje de ganancia. Por defecto se aplica {DEFAULT_DAILY_RATE_PCT}%.</p><Link href="/">Ver sitio público</Link></div><div className="sidebar-foot"><span>{demo?"ADMIN DEMO":"ADMINISTRADOR"}</span><form method="POST" action="/api/signout"><button type="submit" title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut size={18}/></button></form></div></div></aside>
  <div><div className="dash-mobile-head"><Logo compact/><form method="POST" action="/api/signout"><button type="submit" className="dash-mobile-signout">Cerrar sesión <LogOut size={16}/></button></form></div><main className="dash-main">
    <header className="dash-top"><span>JH / ADMINISTRACIÓN</span><div className="dash-top-right"><span className="dash-live"><i/>{demo?"ENTORNO DEMO":"PANEL ADMIN"}</span><span className="dash-avatar">A</span></div></header>
    <section className="dash-welcome"><div><span className="dash-eyebrow">PANEL DE ADMINISTRACIÓN</span><h1>Hola, administrador.</h1><p>{adminEmail}</p></div><span className="dash-date"><CalendarDays size={15}/>{formatDate(now)}</span></section>
    {demo&&<div className="demo-notice" role="note"><Info size={18}/>Administración de demostración: las tasas se guardan solo en este navegador y los clientes son ficticios.</div>}
    {!todaySet&&<div className="rate-alert" role="alert"><BellRing size={18}/><span>Aún no configuraste la ganancia de hoy. Se está aplicando el {DEFAULT_DAILY_RATE_PCT}% por defecto.</span><button type="button" onClick={()=>setPromptOpen(true)}>Configurar ahora</button></div>}
    <section className="metrics-grid" aria-label="Resumen de la plataforma"><article className="metric-card main-metric"><div className="metric-ambient"/><div className="metric-label"><Wallet size={16}/> CAPITAL TOTAL</div><div className="metric-value">{formatUsd(principal)}</div><div className="metric-foot"><Users size={14}/> {investors} inversionistas · {investments.length} inversiones</div></article><article className="metric-card"><div className="metric-label"><TrendingUp size={16}/> GANANCIAS GENERADAS</div><div className="metric-value">{formatUsd(earnings)}</div><div className="metric-foot positive">Total adeudado: {formatUsd(principal+earnings)}</div></article><article className="metric-card"><div className="metric-label"><Percent size={16}/> TASA DE HOY</div><div className="metric-value">{todayRate}%</div><div className="metric-foot">{todaySet?<><Check size={14}/> Configurada</>:<><Info size={14}/> Por defecto</>}</div></article></section>
    <div className="dash-body-grid">
      <section className="dash-panel" id="tasa"><div className="panel-heading"><h2>Ganancia diaria de hoy</h2><span>{formatKey(today)}</span></div>
        <form className="rate-form" onSubmit={async e=>{e.preventDefault();await save(today,Number(todayValue));}}>
          <label htmlFor="rate-main">Porcentaje de ganancia para hoy</label>
          <div className="rate-form-row"><RateInput id="rate-main" value={todayValue} onChange={setTodayValue}/><button type="submit" className="rate-primary" disabled={busy}><Save size={17}/>{busy?"Guardando…":todaySet?"Actualizar":"Guardar"}</button></div>
          <div className="rate-presets">{[1,1.5,2,2.5].map(v=><button type="button" key={v} className={Number(todayValue)===v?"active":""} onClick={()=>setTodayValue(String(v))}>{v}%</button>)}</div>
          <p className="chart-note">Se aplica a todas las inversiones activas: cada una gana su capital × {Number(todayValue)||0}% durante este día. Si no se configura, se usa {DEFAULT_DAILY_RATE_PCT}%.</p>
          {message&&<p role="status" className={`claim-feedback ${error?"error":""}`}>{message}</p>}
        </form>
      </section>
      <section className="dash-panel" id="historial"><div className="panel-heading"><h2>Historial de tasas</h2><span>14 DÍAS</span></div>
        <ul className="rate-history">{history.map(key=><li key={key}><span>{formatKey(key)}{key===today&&<small> · hoy</small>}</span>{editing===key?<form className="rate-inline" onSubmit={async e=>{e.preventDefault();if(await save(key,Number(editValue)))setEditing(null);}}><RateInput id={`rate-${key}`} value={editValue} onChange={setEditValue}/><button type="submit" aria-label="Guardar" disabled={busy}><Check size={16}/></button><button type="button" aria-label="Cancelar" onClick={()=>setEditing(null)}><X size={16}/></button></form>:<><strong className={key in rates?"":"rate-default"}>{rateFor(rates,key)}%{!(key in rates)&&<small> por defecto</small>}</strong><button type="button" className="rate-edit" aria-label={`Editar tasa del ${formatKey(key)}`} onClick={()=>{setEditing(key);setEditValue(String(rateFor(rates,key)))}}><Pencil size={14}/></button></>}</li>)}</ul>
      </section>
    </div>
    <section className="dash-panel dash-table-panel" id="inversiones"><div className="panel-heading"><h2>Inversiones de clientes</h2><span><ShieldCheck size={15}/> {investments.length} registros</span></div>{overview.length===0?<div className="empty-state"><FolderOpen size={32}/><h3>Aún no hay inversiones</h3><p>Las inversiones confirmadas aparecerán aquí.</p></div>:<div className="table-scroll"><table className="invest-table"><thead><tr><th>CLIENTE</th><th>MONTO</th><th>INICIO</th><th>DÍAS</th><th>GANANCIA</th><th>RETIRO DESDE</th><th>ESTADO</th></tr></thead><tbody>{overview.map(item=><tr key={item.id}><td>{item.owner_email}</td><td>{formatUsd(item.principal_usd)}</td><td>{formatDate(item.started_at)}</td><td>{item.calc.daysElapsed}</td><td><strong className="gain-value">+{formatUsd(item.calc.earnings)}</strong></td><td>{formatDate(item.calc.availableAt)}</td><td><span className={`badge-status ${item.calc.canWithdraw?"mature":""}`}><i/>{item.calc.canWithdraw?"DISPONIBLE":"EN CURSO"}</span></td></tr>)}</tbody></table></div>}</section>
  </main></div>
  <AnimatePresence>{promptOpen&&!todaySet&&<DailyPrompt today={today} error={error?message:""} suggested={rates[yesterday]??DEFAULT_DAILY_RATE_PCT} onLater={()=>setPromptOpen(false)} onSave={async rate=>{const ok=await save(today,rate);if(ok){setPromptOpen(false);setTodayValue(String(rate));}return ok;}}/>}</AnimatePresence>
  </div>;
}
