"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, CalendarDays, ChartNoAxesCombined, ChevronRight, CircleHelp, Clock3, Compass, FolderOpen, Home, Info, LayoutDashboard, LogOut, Orbit, ShieldCheck, Sparkles, TrendingUp, Wallet } from "lucide-react";
import Logo from "./logo";
import { calculatePosition, formatCop, formatDate, type Investment } from "@/lib/finance";
import { getPlan } from "@/lib/plans";

function ClaimButton({ investment, demo, enabled }: {investment:Investment;demo:boolean;enabled:boolean}) {
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
  return <><button onClick={claim} className="claim-action" disabled={!enabled||busy||submitted||Boolean(investment.claim_status)}>{(investment.claim_status||submitted)?"Solicitado":busy?"Enviando…":enabled?"Reclamar recompensa":"Pendiente"}</button>{status&&<p role="status" className={`claim-feedback ${error?"error":""}`}>{status}</p>}</>;
}

function ProgressChart({ progress }: {progress:number}) {
  const points = Array.from({length:9},(_,i)=>({x:i*68, y:180-(30+140*Math.min(1,progress)*(i/8))}));
  const d = `M ${points.map((p)=>`${p.x} ${p.y}`).join(" L ")}`;
  const last = points[points.length-1];
  const top = 210;
  return <><svg className="dash-chart" viewBox="0 0 544 220" preserveAspectRatio="none" role="img" aria-label="Proyección ilustrativa acumulada, calculada linealmente a partir del tiempo transcurrido"><defs><linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d6fc74" stopOpacity=".27"/><stop offset="1" stopColor="#d6fc74" stopOpacity="0"/></linearGradient></defs><g className="dash-chart-grid">{[35,85,135,185].map(y=><line key={y} x1="0" x2="544" y1={y} y2={y}/>)}</g><path d={`${d} L 544 ${top} L 0 ${top} Z`} fill="url(#dash-area)"/><motion.path key={d} initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1.2}} d={d} className="dash-chart-line"/><circle cx={last.x} cy={last.y} r="6" fill="#d6fc74" stroke="#1e2a26" strokeWidth="4"/></svg><div className="dash-chart-dates"><span>Inicio</span><span>25%</span><span>50%</span><span>75%</span><span>Final</span></div></>;
}

export default function DashboardView({ demo, investments, userEmail, renderedAt }: {demo:boolean;investments:Investment[];userEmail:string;renderedAt:number}) {
  const [now,setNow]=useState(renderedAt);
  useEffect(()=>{const interval=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(interval)},[]);
  // Se recibe el tiempo de renderizado del servidor para evitar desajustes al hidratar.
  const timestamp=now;
  const overview=investments.map(item=>({...item, calc:calculatePosition(item,timestamp)}));
  const principal=overview.reduce((sum,x)=>sum+x.principal_cop,0);
  const accrued=overview.reduce((sum,x)=>sum+x.calc.accruedEstimate,0);
  const avgProgress=overview.length ? overview.reduce((sum,x)=>sum+x.calc.progress,0)/overview.length : 0;
  const active=overview.filter(x=>x.status==="active"&&x.calc.progress<1).length;
  const displayName=demo?"Inversionista":userEmail.split("@")[0].replace(/[._-]/g," ");
  const initial=(displayName.trim().charAt(0)||"J").toUpperCase();
  return <div className="dash-layout"><aside className="dash-sidebar"><Logo/><div className="dash-group-label">MENÚ PRINCIPAL</div><nav className="dash-nav" aria-label="Secciones del panel"><Link className="current" href="/dashboard"><LayoutDashboard size={18}/><span>Resumen general</span></Link><Link href="/#planes"><Orbit size={18}/><span>Explorar planes</span></Link><Link href="/#simulador"><ChartNoAxesCombined size={18}/><span>Simulador</span></Link><Link href="/#preguntas"><CircleHelp size={18}/><span>Centro de ayuda</span></Link></nav><div className="sidebar-bottom"><div className="sidebar-help"><Sparkles size={23}/><h3>Todo empieza aquí.</h3><p>Conoce el funcionamiento de tu espacio y visualiza cada detalle.</p><Link href="/#metodo">Explorar la plataforma <ArrowUpRight size={14}/></Link></div><div className="sidebar-foot"><span>{demo?"MODO DEMO":"CUENTA ACTIVA"}</span>{!demo&&<form method="POST" action="/api/signout"><button type="submit" title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut size={18}/></button></form>}</div></div></aside>
    <div><div className="dash-mobile-head"><Logo compact/><Link href="/">Ir al inicio <ArrowUpRight size={16}/></Link></div><main className="dash-main"><header className="dash-top"><span>JH / CENTRO DE CONTROL</span><div className="dash-top-right"><span className="dash-live"><i/>{demo?"ENTORNO DEMO":"PANEL PRIVADO"}</span><span className="dash-avatar">{initial}</span></div></header><section className="dash-welcome"><div><span className="dash-eyebrow">TU ESPACIO PERSONAL</span><h1>Hola, {displayName}. <Sparkles size={20} style={{display:"inline-block",verticalAlign:"middle",color:"var(--mint, #ffd34f)"}} aria-hidden="true"/></h1><p>Tu perspectiva financiera, resumida en un solo lugar.</p></div><span className="dash-date"><CalendarDays size={15}/>{formatDate(now)}</span></section>{demo&&<div className="demo-notice" role="note"><Info size={18}/>Vista de demostración con datos inventados. Los saldos, ganancias y planes aquí no representan inversiones ni pagos reales.</div>}
    <section className="metrics-grid" aria-label="Resumen de simulaciones"><article className="metric-card main-metric"><div className="metric-ambient"/><div className="metric-label"><Wallet size={16}/> CAPITAL ILUSTRATIVO</div><div className="metric-value">{formatCop(principal)}</div><div className="metric-foot"><ShieldCheck size={14}/> Valores visibles en tus planes</div></article><article className="metric-card"><div className="metric-label"><TrendingUp size={16}/> RENDIMIENTO ESTIMADO</div><div className="metric-value">{formatCop(accrued)}</div><div className="metric-foot positive"><ArrowUpRight size={14}/> No representa saldo disponible</div></article><article className="metric-card"><div className="metric-label"><Activity size={16}/> PLANES EN CURSO</div><div className="metric-value">{String(active).padStart(2,"0")} <span style={{fontSize:13,color:"#85979a"}}>/ {String(investments.length).padStart(2,"0")}</span></div><div className="metric-foot"><Clock3 size={14}/> Según fechas registradas</div></article></section>
    <div className="dash-body-grid"><section className="dash-panel"><div className="panel-heading"><h2>Progreso ilustrativo</h2><span><Activity size={15}/> Cálculo temporal</span></div><ProgressChart progress={avgProgress}/><p className="chart-note">Gráfico de demostración basado en progresión lineal, no en movimientos del mercado.</p></section><section className="dash-panel"><div className="panel-heading"><h2>Progreso general</h2><span>PERIODOS</span></div><div className="summary-visual"><div className="summary-ring" style={{"--angle":`${avgProgress*360}deg`} as React.CSSProperties}><div className="summary-ring-inner"><strong>{Math.round(avgProgress*100)}%</strong><span>promedio transcurrido</span></div></div></div><div className="summary-row"><span><i/> Avance estimado</span><strong>{Math.round(avgProgress*100)}%</strong></div><div className="summary-row"><span><i className="dim"/> Periodo restante</span><strong>{Math.round((1-avgProgress)*100)}%</strong></div></section></div>
    <section className="dash-panel dash-table-panel"><div className="panel-heading"><h2>Mis planes</h2><Link href="/#planes">Explorar más <ArrowUpRight size={16}/></Link></div>{overview.length===0?<div className="empty-state"><FolderOpen size={32}/><h3>Todavía no hay planes</h3><p>Cuando se confirme una operación autorizada, aparecerá en este panel.</p><Link href="/#planes">Explorar planes</Link></div>:<div className="table-scroll"><table className="invest-table"><thead><tr><th>PLAN</th><th>VALOR</th><th>PROGRESO</th><th>FECHA FINAL</th><th>ESTADO</th><th>SOLICITUD</th></tr></thead><tbody>{overview.map(item=>{const plan=getPlan(item.plan_id);const pct=Math.round(item.calc.progress*100);return <tr key={item.id}><td><div className="invest-main"><span className="invest-icon"><Orbit size={19}/></span><span>{plan?.name||item.plan_id}<small>Plazo {plan?.durationDays??"—"} días</small></span></div></td><td>{formatCop(item.principal_cop)}</td><td><strong>{pct}%</strong><div className="mini-progress"><span style={{width:`${pct}%`}}/></div></td><td>{formatDate(item.ends_at)}</td><td><span className={`badge-status ${item.calc.progress===1?"mature":""}`}><i/>{item.claim_status?"EN REVISIÓN":item.calc.progress===1?"FINALIZADO":"EN CURSO"}</span></td><td><ClaimButton demo={demo} investment={item} enabled={item.calc.canClaim}/></td></tr>})}</tbody></table></div>}</section><p className="dash-legal">JH Inversiones · Los valores calculados según el tiempo son proyecciones matemáticas de ejemplo y no reflejan fondos custodiados, rentabilidad efectivamente obtenida ni derechos de cobro. Cada solicitud requiere revisión administrativa.</p></main></div></div>;
}
