"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ArrowUpRight, CalendarDays, CircleHelp, Clock3, FolderOpen, Info, LayoutDashboard, LogOut, Orbit, Percent, ShieldCheck, Sparkles, TrendingUp, Wallet } from "lucide-react";
import Logo from "./logo";
import { formatDate, formatUsd, type Investment } from "@/lib/finance";
import { calculateEarnings, earningsSeries, MIN_TERM_DAYS, rateFor, todayKey, type DailyRates } from "@/lib/rates";
import { getPlan } from "@/lib/plans";

function WithdrawButton({ investment, demo, enabled }: {investment:Investment;demo:boolean;enabled:boolean}) {
  const [busy,setBusy] = useState(false);
  const [submitted,setSubmitted] = useState(false);
  const [status,setStatus] = useState("");
  const [error,setError] = useState(false);
  async function claim() {
    if (!enabled || busy) return;
    if (demo) {setStatus("Demostración: aquí se avisaría al administrador. No se envió ningún correo.");setError(false);return;}
    setBusy(true); setStatus(""); setError(false);
    try {
      const res=await fetch("/api/claims",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({investmentId:investment.id})});
      const data=await res.json();
      if (!res.ok) throw new Error(data.error||"No fue posible enviar la solicitud.");
      setStatus(data.message||"Solicitud registrada correctamente.");setSubmitted(true);
    } catch(e){setStatus(e instanceof Error?e.message:"Error desconocido");setError(true)}
    finally{setBusy(false)}
  }
  return <><button onClick={claim} className="claim-action" disabled={!enabled||busy||submitted||Boolean(investment.claim_status)}>{(investment.claim_status||submitted)?"Solicitado":busy?"Enviando…":enabled?"Solicitar retiro":"Bloqueado"}</button>{status&&<p role="status" className={`claim-feedback ${error?"error":""}`}>{status}</p>}</>;
}

function EarningsChart({ series }: {series:{at:number;value:number}[]}) {
  const max=Math.max(...series.map(p=>p.value),1);
  const step=544/Math.max(1,series.length-1);
  const points=series.map((p,i)=>({x:i*step,y:190-160*p.value/max}));
  const d=`M ${points.map(p=>`${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`;
  const last=points[points.length-1];
  return <><svg className="dash-chart" viewBox="0 0 544 220" preserveAspectRatio="none" role="img" aria-label="Ganancias acumuladas de los últimos días"><defs><linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d6fc74" stopOpacity=".27"/><stop offset="1" stopColor="#d6fc74" stopOpacity="0"/></linearGradient></defs><g className="dash-chart-grid">{[35,85,135,185].map(y=><line key={y} x1="0" x2="544" y1={y} y2={y}/>)}</g><path d={`${d} L 544 210 L 0 210 Z`} fill="url(#dash-area)"/><motion.path initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1.2}} d={d} className="dash-chart-line"/><circle cx={last.x} cy={last.y} r="6" fill="#d6fc74" stroke="#1e2a26" strokeWidth="4"/></svg><div className="dash-chart-dates"><span>{formatDate(series[0].at)}</span><span>Hoy · {formatUsd(series[series.length-1].value)}</span></div></>;
}

export default function DashboardView({ demo, investments, userEmail, rates, renderedAt }: {demo:boolean;investments:Investment[];userEmail:string;rates:DailyRates;renderedAt:number}) {
  const [now,setNow]=useState(renderedAt);
  useEffect(()=>{const interval=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(interval)},[]);
  const overview=investments.map(item=>({...item, calc:calculateEarnings(item,rates,now)}));
  const principal=overview.reduce((sum,x)=>sum+x.principal_usd,0);
  const earnings=overview.reduce((sum,x)=>sum+x.calc.earnings,0);
  const todayRate=rateFor(rates,todayKey(now));
  const todayGain=overview.filter(x=>x.status==="active").reduce((sum,x)=>sum+x.principal_usd*todayRate/100,0);
  const avgProgress=overview.length ? overview.reduce((sum,x)=>sum+x.calc.termProgress,0)/overview.length : 0;
  const series=earningsSeries(investments,rates,30,renderedAt);
  const displayName=demo?"Inversionista":userEmail.split("@")[0].replace(/[._-]/g," ");
  const initial=(displayName.trim().charAt(0)||"J").toUpperCase();
  return <div className="dash-layout"><aside className="dash-sidebar"><Logo/><div className="dash-group-label">MENÚ PRINCIPAL</div><nav className="dash-nav" aria-label="Secciones del panel"><Link className="current" href="/dashboard"><LayoutDashboard size={18}/><span>Mi inversión</span></Link><Link href="/#planes"><Orbit size={18}/><span>Explorar planes</span></Link><Link href="/#simulador"><TrendingUp size={18}/><span>Simulador</span></Link><Link href="/#preguntas"><CircleHelp size={18}/><span>Centro de ayuda</span></Link></nav><div className="sidebar-bottom"><div className="sidebar-help"><Sparkles size={23}/><h3>Plazo mínimo: 1 mes.</h3><p>Tus ganancias se suman cada día según la tasa publicada por el administrador.</p><Link href="/#planes">Invertir más <ArrowUpRight size={14}/></Link></div><div className="sidebar-foot"><span>{demo?"MODO DEMO":"CUENTA ACTIVA"}</span><form method="POST" action="/api/signout"><button type="submit" title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut size={18}/></button></form></div></div></aside>
    <div><div className="dash-mobile-head"><Logo compact/><form method="POST" action="/api/signout"><button type="submit" className="dash-mobile-signout">Cerrar sesión <LogOut size={16}/></button></form></div><main className="dash-main"><header className="dash-top"><span>JH / MI INVERSIÓN</span><div className="dash-top-right"><span className="dash-live"><i/>{demo?"ENTORNO DEMO":"PANEL PRIVADO"}</span><span className="dash-avatar">{initial}</span></div></header><section className="dash-welcome"><div><span className="dash-eyebrow">TU ESPACIO PERSONAL</span><h1>Hola, {displayName}. <Sparkles size={20} style={{display:"inline-block",verticalAlign:"middle",color:"var(--mint, #ffd34f)"}} aria-hidden="true"/></h1><p>Tu inversión y tus ganancias, actualizadas en tiempo real.</p></div><span className="dash-date"><CalendarDays size={15}/>{formatDate(now)}</span></section>{demo&&<div className="demo-notice" role="note"><Info size={18}/>Vista de demostración con datos inventados. Los saldos y ganancias aquí no representan inversiones ni pagos reales.</div>}
    <section className="metrics-grid" aria-label="Resumen de tu inversión"><article className="metric-card main-metric"><div className="metric-ambient"/><div className="metric-label"><Wallet size={16}/> CAPITAL INVERTIDO</div><div className="metric-value">{formatUsd(principal)}</div><div className="metric-foot"><ShieldCheck size={14}/> {investments.length} {investments.length===1?"inversión":"inversiones"}</div></article><article className="metric-card"><div className="metric-label"><TrendingUp size={16}/> GANANCIAS ACUMULADAS</div><div className="metric-value">{formatUsd(earnings)}</div><div className="metric-foot positive"><ArrowUpRight size={14}/> Total: {formatUsd(principal+earnings)}</div></article><article className="metric-card"><div className="metric-label"><Percent size={16}/> GANANCIA DE HOY</div><div className="metric-value">{todayRate}%</div><div className="metric-foot positive"><ArrowUpRight size={14}/> +{formatUsd(todayGain)} hoy</div></article></section>
    <div className="dash-body-grid"><section className="dash-panel"><div className="panel-heading"><h2>Ganancias acumuladas</h2><span><Activity size={15}/> Últimos 30 días</span></div>{investments.length?<EarningsChart series={series}/>:<p className="chart-note">Aún no hay ganancias para mostrar.</p>}<p className="chart-note">Cada día suma capital × porcentaje diario configurado por el administrador ({todayRate}% hoy).</p></section><section className="dash-panel"><div className="panel-heading"><h2>Plazo mínimo</h2><span>{MIN_TERM_DAYS} DÍAS</span></div><div className="summary-visual"><div className="summary-ring" style={{"--angle":`${avgProgress*360}deg`} as React.CSSProperties}><div className="summary-ring-inner"><strong>{Math.round(avgProgress*100)}%</strong><span>del primer mes</span></div></div></div><div className="summary-row"><span><i/> Avance promedio</span><strong>{Math.round(avgProgress*100)}%</strong></div><div className="summary-row"><span><i className="dim"/> Disponibles para retiro</span><strong>{overview.filter(x=>x.calc.canWithdraw).length} / {overview.length}</strong></div></section></div>
    <section className="dash-panel dash-table-panel"><div className="panel-heading"><h2>Mis inversiones</h2><Link href="/#planes">Invertir más <ArrowUpRight size={16}/></Link></div>{overview.length===0?<div className="empty-state"><FolderOpen size={32}/><h3>Todavía no tienes inversiones</h3><p>Empieza desde 50 USD. Tu inversión aparecerá aquí cuando se confirme el pago.</p><Link href="/#planes">Explorar planes</Link></div>:<div className="table-scroll"><table className="invest-table"><thead><tr><th>INVERSIÓN</th><th>MONTO</th><th>GANANCIA</th><th>TIEMPO</th><th>RETIRO DESDE</th><th>ESTADO</th><th>SOLICITUD</th></tr></thead><tbody>{overview.map(item=>{const plan=getPlan(item.plan_id);const pct=Math.round(item.calc.termProgress*100);return <tr key={item.id}><td><div className="invest-main"><span className="invest-icon"><Orbit size={19}/></span><span>{plan?.name||item.plan_id}<small>Desde {formatDate(item.started_at)}</small></span></div></td><td>{formatUsd(item.principal_usd)}</td><td><strong className="gain-value">+{formatUsd(item.calc.earnings)}</strong><small className="cell-sub">Total {formatUsd(item.calc.total)}</small></td><td><strong>{item.calc.daysElapsed} días</strong><div className="mini-progress"><span style={{width:`${pct}%`}}/></div><small className="cell-sub">{item.calc.daysRemaining?`Faltan ${item.calc.daysRemaining} días`:"Plazo mínimo cumplido"}</small></td><td>{formatDate(item.calc.availableAt)}</td><td><span className={`badge-status ${item.calc.canWithdraw?"mature":""}`}><i/>{item.claim_status?"EN REVISIÓN":item.calc.canWithdraw?"DISPONIBLE":"EN CURSO"}</span></td><td><WithdrawButton demo={demo} investment={item} enabled={item.calc.canWithdraw}/></td></tr>})}</tbody></table></div>}</section><p className="dash-legal"><Clock3 size={13}/> JH Inversiones · Plazo mínimo de {MIN_TERM_DAYS} días antes de solicitar retiro. Las ganancias dependen del porcentaje diario publicado por la administración y cada retiro requiere revisión.</p></main></div></div>;
}
