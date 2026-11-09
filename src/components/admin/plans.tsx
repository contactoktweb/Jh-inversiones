"use client";
import { useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Save, Star, Trash2, X } from "lucide-react";
import { formatUsd } from "@/lib/finance";
import type { Plan } from "@/lib/plans";
import { ActionDialog, AnimatePresence, Feedback, useAdminAction, useDialog } from "./ui";

type Form = { id: string; name: string; eyebrow: string; caption: string; minUsd: string; features: string; highlighted: boolean; sortOrder: string };
const empty = (order: number): Form => ({ id: "", name: "", eyebrow: "", caption: "", minUsd: "", features: "", highlighted: false, sortOrder: String(order) });
const toForm = (p: Plan): Form => ({ id: p.id, name: p.name, eyebrow: p.eyebrow, caption: p.caption, minUsd: String(p.minUsd), features: p.features.join("\n"), highlighted: p.highlighted, sortOrder: String(p.sortOrder) });

/** Lista y edición de los planes que ve el público en la página de inicio. */
export default function AdminPlans({ plans, usage }: { plans: Plan[]; usage: Record<string, number> }) {
  const action = useAdminAction();
  const dialog = useDialog<Plan>();
  const nextOrder = Math.max(0, ...plans.map(p => p.sortOrder)) + 1;
  const [form, setForm] = useState<Form | null>(null);
  const visible = plans.filter(p => p.active).sort((a, b) => a.minUsd - b.minUsd);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const ok = await action.run("/api/admin/plans", {
      action: "save", id: form.id || undefined, name: form.name, eyebrow: form.eyebrow, caption: form.caption,
      minUsd: Number(form.minUsd), features: form.features.split("\n"), highlighted: form.highlighted, sortOrder: Number(form.sortOrder) || 0,
    });
    if (ok) setForm(null);
  }

  return <>
    <Feedback message={action.message} error={action.error} />
    <section className="dash-panel dash-table-panel"><div className="panel-heading"><h2>Planes</h2>{!form && <button className="rate-primary" onClick={() => setForm(empty(nextOrder))}><Plus size={16} /> Nuevo plan</button>}</div>
      <p className="chart-note top-note">Cada inversión queda en el plan visible de mayor «monto desde» que alcance su monto. Hoy: {visible.map((p, i) => <span key={p.id}><b>{p.name}</b> {visible[i + 1] ? `de ${formatUsd(p.minUsd)} a ${formatUsd(visible[i + 1].minUsd - 1)}` : `desde ${formatUsd(p.minUsd)}`}{i < visible.length - 1 ? " · " : "."}</span>)} La inversión mínima es la del plan visible más bajo.</p>
      <div className="table-scroll"><table className="invest-table"><thead><tr><th>ORDEN</th><th>PLAN</th><th>DESDE</th><th>BENEFICIOS</th><th>INVERSIONES</th><th>ESTADO</th><th></th></tr></thead><tbody>
        {plans.map(p => <tr key={p.id} className={p.active ? "" : "row-muted"}>
          <td>{p.sortOrder}</td>
          <td><strong>{p.name}</strong>{p.highlighted && <span className="plan-flag"><Star size={12} /> Recomendado</span>}<small className="cell-sub">{[p.eyebrow, p.caption].filter(Boolean).join(" · ")}</small></td>
          <td className="cell-strong">{formatUsd(p.minUsd)}</td>
          <td><small className="cell-sub">{p.features.join(" · ") || "—"}</small></td>
          <td>{usage[p.id] || 0}</td>
          <td><span className={`badge-status ${p.active ? "claim-settled" : "claim-rejected"}`}><i />{p.active ? "VISIBLE" : "OCULTO"}</span></td>
          <td><div className="table-actions">
            <button className="act-primary" disabled={action.busy} onClick={() => setForm(toForm(p))}><Pencil size={14} /> Editar</button>
            <button disabled={action.busy} onClick={() => action.run("/api/admin/plans", { action: "toggle", id: p.id })}>{p.active ? <><EyeOff size={14} /> Ocultar</> : <><Eye size={14} /> Mostrar</>}</button>
            {!usage[p.id] && <button className="act-danger" disabled={action.busy} onClick={() => dialog.open(p)}><Trash2 size={14} /> Eliminar</button>}
          </div></td>
        </tr>)}
      </tbody></table></div>
    </section>

    {form && <section className="dash-panel panel-gap" id="editar-plan"><div className="panel-heading"><h2>{form.id ? `Editar «${plans.find(p => p.id === form.id)?.name}»` : "Nuevo plan"}</h2><button className="modal-close static" aria-label="Cerrar" onClick={() => setForm(null)}><X size={18} /></button></div>
      {form.id && (usage[form.id] || 0) > 0 && <p className="chart-note top-note">Este plan tiene inversiones. Los cambios solo afectan al nombre que se muestra y a las inversiones nuevas; las inversiones existentes conservan su monto y sus fechas.</p>}
      <form className="form-grid" onSubmit={save}>
        <label>Nombre del plan<input required maxLength={40} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej.: Élite" /></label>
        <label>Monto desde (USD)<input required type="number" min={50} max={100000} step={1} value={form.minUsd} onChange={e => setForm({ ...form, minUsd: e.target.value })} placeholder="5000" /></label>
        <label>Etiqueta corta (opcional)<input maxLength={40} value={form.eyebrow} onChange={e => setForm({ ...form, eyebrow: e.target.value })} placeholder="Ej.: Para grandes capitales" /></label>
        <label>Orden en la página<input type="number" min={0} max={999} step={1} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} /></label>
        <label className="span-2">Descripción (una frase)<input maxLength={160} value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })} placeholder="Ej.: Para quienes invierten a lo grande." /></label>
        <label className="span-2">Beneficios (uno por línea, máximo 8)<textarea className="field-textarea" rows={4} value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} placeholder={"Panel de seguimiento\nAtención prioritaria"} /></label>
        <label className="check-line span-2"><input type="checkbox" checked={form.highlighted} onChange={e => setForm({ ...form, highlighted: e.target.checked })} /> Destacar como «Recomendado» en la página de inicio</label>
        <div className="span-2 form-actions"><button className="rate-primary" disabled={action.busy}><Save size={16} />{action.busy ? "Guardando…" : form.id ? "Guardar cambios" : "Crear plan"}</button><button type="button" className="rate-ghost" onClick={() => setForm(null)}>Cancelar</button></div>
      </form>
    </section>}

    <AnimatePresence>{dialog.state && <ActionDialog title="Eliminar plan" tone="danger" confirmLabel="Eliminar"
      description={<p>¿Eliminar el plan <strong>{dialog.state.name}</strong>? Esta acción no se puede deshacer. Si solo quieres que deje de aparecer, usa «Ocultar».</p>}
      onConfirm={() => action.run("/api/admin/plans", { action: "delete", id: dialog.state!.id })} onClose={dialog.close} />}</AnimatePresence>
  </>;
}
