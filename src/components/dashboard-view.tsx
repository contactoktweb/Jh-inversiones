"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowUpRight, Banknote, Clock3, FolderOpen, Info, Orbit, Percent, ShieldAlert, ShieldCheck, TrendingUp, UserRound, Wallet, X } from "lucide-react";
import AppShell from "./app-shell";
import { formatDate, formatUsd, INVESTMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS, type Investment } from "@/lib/finance";
import { calculateEarnings, earningsSeries, hasActiveClaim, isEarning, MIN_TERM_DAYS, rateFor, todayKey, type DailyRates } from "@/lib/rates";
import { getPlan } from "@/lib/plans";

export const CLAIM_LABELS: Record<string,string> = { pending: "EN REVISIÓN", approved: "APROBADO", settled: "DESEMBOLSADO", rejected: "RECHAZADO" };

/** Ventana para solicitar el retiro: pide dónde recibir el dinero (se guarda en el perfil). */
function WithdrawDialog({ investment, amount, defaultPayout, onClose }: {investment:Investment;amount:number;defaultPayout:string;onClose:()=>void}) {
  const router = useRouter();
  const [payout,setPayout] = useState(defaultPayout);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  async function submit(e:React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res=await fetch("/api/claims",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({investmentId:investment.id,payoutDetails:payout})});
      const data=await res.json();
      if (!res.ok) throw new Error(data.error||"No fue posible enviar la solicitud.");
      onClose(); router.refresh();
    } catch(err){setError(err instanceof Error?err.message:"Error desconocido")}
    finally{setBusy(false)}
  }
  return <motion.div className="rate-modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><motion.form onSubmit={submit} className="rate-modal" role="dialog" aria-modal="true" aria-labelledby="withdraw-title" initial={{y:24,opacity:0}} animate={{y:0,opacity:1}} exit={{y:24,opacity:0}}>
    <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}><X size={18}/></button>
    <div className="rate-modal-icon"><Banknote size={24}/></div>
    <h2 id="withdraw-title">Solicitar retiro</h2>
    <p>Vas a solicitar el retiro de <strong>{formatUsd(amount)}</strong> (capital + ganancias) de tu inversión {getPlan(investment.plan_id)?.name}. Las ganancias dejan de sumar desde este momento y la administración realizará el desembolso.</p>
    <label htmlFor="payout-details">¿Dónde quieres recibir el dinero?</label>
    <textarea id="payout-details" className="field-textarea" required minLength={6} maxLength={1000} rows={4} placeholder="Ej.: Banco, tipo y número de cuenta, titular y documento. O tu billetera / correo de PayPal." value={payout} onChange={e=>setPayout(e.target.value)}/>
    {error&&<p role="alert" className="claim-feedback error">{error}</p>}
    <div className="rate-modal-actions"><button type="submit" className="rate-primary" disabled={busy}>{busy?"Enviando…":"Confirmar solicitud"}</button><button type="button" className="rate-ghost" onClick={onClose}>Cancelar</button></div>
  </motion.form></motion.div>;
}

function EarningsChart({ series }: {series:{at:number;value:number}[]}) {
  const max=Math.max(...series.map(p=>p.value),1);
  const step=544/Math.max(1,series.length-1);
  const points=series.map((p,i)=>({x:i*step,y:190-160*p.value/max}));
  const d=`M ${points.map(p=>`${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`;
  const last=points[points.length-1];
  return <><svg className="dash-chart" viewBox="0 0 544 220" preserveAspectRatio="none" role="img" aria-label="Ganancias acumuladas de los últimos días"><defs><linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2469f6" stopOpacity=".18"/><stop offset="1" stopColor="#2469f6" stopOpacity="0"/></linearGradient></defs><g className="dash-chart-grid">{[35,85,135,185].map(y=><line key={y} x1="0" x2="544" y1={y} y2={y}/>)}</g><path d={`${d} L 544 210 L 0 210 Z`} fill="url(#dash-area)"/><motion.path initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1.2}} d={d} className="dash-chart-line"/><circle cx={last.x} cy={last.y} r="6" fill="#2469f6" stroke="#fff" strokeWidth="4"/></svg><div className="dash-chart-dates"><span>{formatDate(series[0].at)}</span><span>Hoy · {formatUsd(series[series.length-1].value)}</span></div></>;
}

const claimMessage = (item: Investment) =>
  item.claim_status==="pending"?"La administración fue notificada y realizará el desembolso tras revisar la solicitud."
  :item.claim_status==="approved"?"Solicitud aprobada: el desembolso está en proceso."
  :item.claim_status==="settled"?`La administración realizó el desembolso${item.claim_resolved_at?` el ${formatDate(item.claim_resolved_at)}`:""}.`
  :"La solicitud fue rechazada. Puedes volver a solicitarla o contactar a soporte.";

export default function DashboardView({ investments, userEmail, fullName, payoutDetails, transferInstructions, suspended, rates, renderedAt }: {
  investments:Investment[];userEmail:string;fullName:string|null;payoutDetails:string;transferInstructions:string;suspended:boolean;rates:DailyRates;renderedAt:number;
}) {
  const [now,setNow]=useState(renderedAt);
  const [withdrawing,setWithdrawing]=useState<{item:Investment;amount:number}|null>(null);
  useEffect(()=>{const interval=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(interval)},[]);
  const overview=investments.map(item=>({...item, calc:calculateEarnings(item,rates,now)}));
  const earning=overview.filter(x=>isEarning(x));
  const pendingPayments=overview.filter(x=>x.status==="pending_payment");
  const principal=earning.filter(x=>x.status==="active").reduce((sum,x)=>sum+x.principal_usd,0);
  const earnings=earning.filter(x=>x.status==="active").reduce((sum,x)=>sum+x.calc.earnings,0);
  const todayRate=rateFor(rates,todayKey(now));
  const todayGain=overview.filter(x=>x.status==="active"&&!hasActiveClaim(x)).reduce((sum,x)=>sum+x.principal_usd*todayRate/100,0);
  const active=overview.filter(x=>x.status==="active");
  const avgProgress=active.length ? active.reduce((sum,x)=>sum+x.calc.termProgress,0)/active.length : 0;
  const series=earningsSeries(investments,rates,30,renderedAt);
  const displayName=fullName?.split(" ")[0]||userEmail.split("@")[0].replace(/[._-]/g," ")||"Inversionista";

  return <AppShell variant="user" email={userEmail} eyebrow="TU ESPACIO PERSONAL" title={<>Hola, {displayName}.</>} subtitle="Tu inversión y tus ganancias, actualizadas en tiempo real.">
    {suspended&&<div className="withdraw-alert" role="alert"><ShieldAlert size={18}/><span><strong>Tu cuenta está suspendida.</strong> No puedes invertir ni solicitar retiros. Contacta a soporte.</span></div>}
    {!fullName&&!suspended&&<div className="demo-notice" role="note"><UserRound size={18}/><span>Completa tus datos y dónde recibir tus retiros en <Link href="/cuenta"><strong>Mi cuenta</strong></Link>.</span></div>}
    {pendingPayments.length>0&&<section className="dash-panel pending-panel" aria-label="Pagos pendientes"><div className="panel-heading"><h2>Pagos pendientes</h2><span><Clock3 size={15}/> Esperando confirmación</span></div>
      <ul className="withdraw-list">{pendingPayments.map(item=><li key={item.id}><div><strong>{formatUsd(item.principal_usd)}</strong><small>Registrada el {formatDate(item.created_at||item.started_at)} · Referencia <b>{item.payment_reference}</b></small></div><span className="badge-status claim-pending"><i/>PAGO PENDIENTE</span><p>Transfiere el monto exacto escribiendo la referencia en la descripción. Tu inversión se activa cuando la administración confirme el pago.{transferInstructions&&<span className="pending-instructions">{transferInstructions}</span>}</p></li>)}</ul>
    </section>}
    <section className="metrics-grid" aria-label="Resumen de tu inversión"><article className="metric-card main-metric"><div className="metric-ambient"/><div className="metric-label"><Wallet size={16}/> CAPITAL INVERTIDO</div><div className="metric-value">{formatUsd(principal)}</div><div className="metric-foot"><ShieldCheck size={14}/> {active.length} {active.length===1?"inversión activa":"inversiones activas"} · USD</div></article><article className="metric-card"><div className="metric-label"><TrendingUp size={16}/> GANANCIAS ACUMULADAS</div><div className="metric-value">{formatUsd(earnings)}</div><div className="metric-foot positive"><ArrowUpRight size={14}/> Total: {formatUsd(principal+earnings)}</div></article><article className="metric-card"><div className="metric-label"><Percent size={16}/> GANANCIA DE HOY</div><div className="metric-value">{todayRate}%</div><div className="metric-foot positive"><ArrowUpRight size={14}/> +{formatUsd(todayGain)} hoy</div></article></section>
    <div className="dash-body-grid"><section className="dash-panel"><div className="panel-heading"><h2>Ganancias acumuladas</h2><span><Activity size={15}/> Últimos 30 días</span></div>{earning.length?<EarningsChart series={series}/>:<p className="chart-note">Aún no hay ganancias para mostrar.</p>}<p className="chart-note">Cada día suma capital × porcentaje diario configurado por la administración ({todayRate}% hoy).</p></section><section className="dash-panel"><div className="panel-heading"><h2>Plazo mínimo</h2><span>{MIN_TERM_DAYS} DÍAS</span></div><div className="summary-visual"><div className="summary-ring" style={{"--angle":`${avgProgress*360}deg`} as React.CSSProperties}><div className="summary-ring-inner"><strong>{Math.round(avgProgress*100)}%</strong><span>del primer mes</span></div></div></div><div className="summary-row"><span><i/> Avance promedio</span><strong>{Math.round(avgProgress*100)}%</strong></div><div className="summary-row"><span><i className="dim"/> Disponibles para retiro</span><strong>{overview.filter(x=>x.calc.canWithdraw).length} / {active.length}</strong></div></section></div>
    {overview.some(x=>x.claim_status)&&<section className="dash-panel dash-table-panel withdraw-panel" aria-label="Mis solicitudes de retiro"><div className="panel-heading"><h2>Mis solicitudes de retiro</h2><span><Banknote size={15}/> Notificadas a la administración</span></div><ul className="withdraw-list">{overview.filter(x=>x.claim_status).map(item=><li key={item.id}><div><strong>{formatUsd(item.claim_amount_usd??item.calc.total)}</strong><small>{getPlan(item.plan_id)?.name||item.plan_id} · solicitado el {formatDate(item.claim_requested_at||now)}</small></div><span className={`badge-status claim-${item.claim_status}`}><i/>{CLAIM_LABELS[item.claim_status!]}</span><p>{claimMessage(item)}{item.claim_payout_reference&&<> Comprobante: <b>{item.claim_payout_reference}</b>.</>}{item.claim_admin_note&&<> Nota: {item.claim_admin_note}</>}</p></li>)}</ul></section>}
    <section className="dash-panel dash-table-panel"><div className="panel-heading"><h2>Mis inversiones</h2><Link href="/invertir">Invertir más <ArrowUpRight size={16}/></Link></div>{overview.length===0?<div className="empty-state"><FolderOpen size={32}/><h3>Todavía no tienes inversiones</h3><p>Empieza desde 50 USD. Tu inversión aparecerá aquí en cuanto la registres.</p><Link href="/invertir">Invertir ahora</Link></div>:<div className="table-scroll"><table className="invest-table"><thead><tr><th>INVERSIÓN</th><th>MONTO</th><th>GANANCIA</th><th>TIEMPO</th><th>RETIRO DESDE</th><th>ESTADO</th><th>SOLICITUD</th></tr></thead><tbody>{overview.map(item=>{const plan=getPlan(item.plan_id);const pct=Math.round(item.calc.termProgress*100);const earningRow=isEarning(item);return <tr key={item.id} className={earningRow?"":"row-muted"}><td><div className="invest-main"><span className="invest-icon"><Orbit size={19}/></span><span>{plan?.name||item.plan_id}<small>{earningRow?`Desde ${formatDate(item.started_at)}`:PAYMENT_METHOD_LABELS[item.payment_method||""]}</small></span></div></td><td>{formatUsd(item.principal_usd)}</td><td>{earningRow?<><strong className="gain-value">+{formatUsd(item.calc.earnings)}</strong><small className="cell-sub">Total {formatUsd(item.calc.total)}</small></>:"—"}</td><td>{earningRow?<><strong>{item.calc.daysElapsed} días</strong><div className="mini-progress"><span style={{width:`${pct}%`}}/></div><small className="cell-sub">{item.calc.daysRemaining?`Faltan ${item.calc.daysRemaining} días`:"Plazo mínimo cumplido"}</small></>:"—"}</td><td>{earningRow?formatDate(item.calc.availableAt):"—"}</td><td><span className={`badge-status ${item.claim_status?`claim-${item.claim_status}`:item.status==="pending_payment"?"claim-pending":item.status==="cancelled"?"claim-rejected":item.calc.canWithdraw?"mature":""}`}><i/>{item.claim_status?CLAIM_LABELS[item.claim_status]:item.status!=="active"?INVESTMENT_STATUS_LABELS[item.status]:item.calc.canWithdraw?"DISPONIBLE":"EN CURSO"}</span>{item.status==="cancelled"&&item.admin_note&&<small className="cell-sub">{item.admin_note}</small>}</td><td>{item.status==="active"&&<button className="claim-action" disabled={!item.calc.canWithdraw||suspended} onClick={()=>setWithdrawing({item,amount:item.calc.total})}>{item.calc.canWithdraw?(item.claim_status==="rejected"?"Solicitar de nuevo":"Solicitar retiro"):item.claim_status?"Solicitado":"Bloqueado"}</button>}</td></tr>})}</tbody></table></div>}</section>
    <p className="dash-legal"><Info size={13}/> JH Inversiones · Plazo mínimo de {MIN_TERM_DAYS} días antes de solicitar retiro. Las ganancias dependen del porcentaje diario publicado por la administración y cada retiro requiere revisión.</p>
    <AnimatePresence>{withdrawing&&<WithdrawDialog investment={withdrawing.item} amount={withdrawing.amount} defaultPayout={payoutDetails} onClose={()=>setWithdrawing(null)}/>}</AnimatePresence>
  </AppShell>;
}
