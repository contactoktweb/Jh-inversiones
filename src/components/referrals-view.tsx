"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeDollarSign, Copy, Gift, Link2, MessageCircle, Share2, Users } from "lucide-react";
import AppShell from "./app-shell";
import { formatDate, formatUsd } from "@/lib/finance";
import { COMMISSION_STATUS_LABELS } from "@/lib/referrals";

export type ReferredPerson = { id: string; name: string; joinedAt: string; invested: boolean };
export type ReferralCommission = { id: string; referredName: string; baseUsd: number; ratePct: number; amountUsd: number; status: string; createdAt: string; resolvedAt: string | null; payoutReference: string | null; note: string | null };

const statusClass = (status: string) => status === "paid" ? "claim-settled" : status === "cancelled" ? "claim-rejected" : "claim-pending";

/** Programa de referidos del cliente: su código, su enlace de invitación, sus referidos y sus comisiones. */
export default function ReferralsView({ email, code, siteOrigin, pct, people, commissions }: { email: string; code: string; siteOrigin: string; pct: number; people: ReferredPerson[]; commissions: ReferralCommission[] }) {
  const [origin, setOrigin] = useState(siteOrigin);
  const [copied, setCopied] = useState<"" | "code" | "link">("");
  const [canShare, setCanShare] = useState(false);
  useEffect(() => { if (!siteOrigin) setOrigin(window.location.origin); setCanShare(typeof navigator.share === "function"); }, [siteOrigin]);
  const link = `${origin}/acceso?ref=${code}`;
  const sum = (status: string) => commissions.filter(c => c.status === status).reduce((s, c) => s + c.amountUsd, 0);
  async function copy(text: string, what: "code" | "link") { try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1500); } catch { /* sin portapapeles */ } }
  const message = `Te invito a JH Inversiones. Regístrate con mi código ${code}: ${link}`;

  return <AppShell variant="user" email={email} eyebrow="PROGRAMA DE REFERIDOS" title="Invita y gana." subtitle={pct > 0 ? `Gana el ${pct}% de cada inversión confirmada de las personas que se registren con tu código.` : "El programa de referidos está pausado por ahora. Tu código sigue guardado."}>
    <section className="dash-panel referral-hero">
      <div className="referral-code-block"><span className="referral-label"><Gift size={15} /> Tu código</span><strong className="referral-code" data-testid="referral-code">{code}</strong>
        <button type="button" className="referral-copy" onClick={() => copy(code, "code")}><Copy size={14} /> {copied === "code" ? "Copiado" : "Copiar código"}</button></div>
      <div className="referral-link-block"><span className="referral-label"><Link2 size={15} /> Tu enlace de invitación</span><code className="referral-link">{link}</code>
        <div className="table-actions"><button type="button" className="referral-copy" onClick={() => copy(link, "link")}><Copy size={14} /> {copied === "link" ? "Copiado" : "Copiar enlace"}</button>
          <a className="referral-copy" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> Compartir por WhatsApp</a>
          {canShare && <button type="button" className="referral-copy" onClick={() => navigator.share({ title: "JH Inversiones", text: message, url: link }).catch(() => undefined)}><Share2 size={14} /> Compartir</button>}</div></div>
    </section>

    <section className="metrics-grid" aria-label="Resumen de referidos">
      <article className="metric-card"><div className="metric-label"><Users size={16} /> REFERIDOS</div><div className="metric-value">{people.length}</div><div className="metric-foot">{people.filter(p => p.invested).length} ya invirtieron</div></article>
      <article className="metric-card"><div className="metric-label"><BadgeDollarSign size={16} /> POR COBRAR</div><div className="metric-value">{formatUsd(sum("pending"))}</div><div className="metric-foot">La administración te la paga</div></article>
      <article className="metric-card"><div className="metric-label"><BadgeDollarSign size={16} /> COBRADO</div><div className="metric-value">{formatUsd(sum("paid"))}</div><div className="metric-foot positive">Comisiones pagadas</div></article>
    </section>

    <section className="dash-panel"><div className="panel-heading"><h2>¿Cómo funciona?</h2></div>
      <ol className="referral-steps">
        <li>Comparte tu código o tu enlace. Quien se registre con él queda vinculado a ti.</li>
        <li>Cada vez que esa persona haga una inversión y la administración confirme su pago, ganas {pct > 0 ? <strong>el {pct}%</strong> : "una comisión"} del monto invertido.</li>
        <li>La administración te paga la comisión a los datos de <Link href="/cuenta"><strong>Mi cuenta → dónde recibir tus retiros</strong></Link>. Aquí ves cuándo se pagó y el comprobante.</li>
      </ol>
    </section>

    <section className="dash-panel dash-table-panel panel-gap"><div className="panel-heading"><h2>Mis comisiones</h2></div>
      {commissions.length === 0 ? <p className="chart-note">Todavía no tienes comisiones. Aparecerán aquí cuando una persona que invitaste haga su primera inversión.</p> :
        <div className="table-scroll"><table className="invest-table"><thead><tr><th>FECHA</th><th>REFERIDO</th><th>INVERSIÓN</th><th>COMISIÓN</th><th>ESTADO</th></tr></thead><tbody>
          {commissions.map(c => <tr key={c.id}><td>{formatDate(c.createdAt)}</td><td>{c.referredName}</td><td>{formatUsd(c.baseUsd)}<small className="cell-sub">{c.ratePct}%</small></td><td className="cell-strong gain-value">{formatUsd(c.amountUsd)}</td>
            <td><span className={`badge-status ${statusClass(c.status)}`}><i />{COMMISSION_STATUS_LABELS[c.status] || c.status}</span>{c.status === "paid" && <small className="cell-sub">{c.resolvedAt && `Pagada el ${formatDate(c.resolvedAt)}`}{c.payoutReference && <> · Comprobante <b>{c.payoutReference}</b></>}</small>}{c.status === "cancelled" && c.note && <small className="cell-sub">{c.note}</small>}</td></tr>)}
        </tbody></table></div>}
    </section>

    <section className="dash-panel dash-table-panel panel-gap"><div className="panel-heading"><h2>Personas que invitaste</h2><span><Users size={15} /> {people.length}</span></div>
      {people.length === 0 ? <p className="chart-note">Aún nadie se ha registrado con tu código.</p> :
        <div className="table-scroll"><table className="invest-table"><thead><tr><th>PERSONA</th><th>SE REGISTRÓ</th><th>ESTADO</th></tr></thead><tbody>
          {people.map(p => <tr key={p.id}><td>{p.name}</td><td>{formatDate(p.joinedAt)}</td><td><span className={`badge-status ${p.invested ? "mature" : "claim-pending"}`}><i />{p.invested ? "YA INVIRTIÓ" : "AÚN NO INVIERTE"}</span></td></tr>)}
        </tbody></table></div>}
    </section>
  </AppShell>;
}
