"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import AppShell from "../app-shell";
import { CLAIM_STATUS_LABELS, INVESTMENT_STATUS_LABELS, type Investment } from "@/lib/finance";

/** Envoltorio de todas las páginas de administración; refresca los datos cada 30 s. */
export function AdminShell({ email, badges, eyebrow, title, subtitle, children }: { email: string; badges: Record<string, number>; eyebrow: string; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => { const t = setInterval(() => router.refresh(), 30_000); return () => clearInterval(t); }, [router]);
  return <AppShell variant="admin" email={email} badges={badges} eyebrow={eyebrow} title={title} subtitle={subtitle}>{children}</AppShell>;
}

/** POST JSON a una ruta de administración y refresca la página si sale bien. */
export function useAdminAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function run(url: string, payload: Record<string, unknown>) {
    setBusy(true); setMessage(""); setError(false);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo completar la operación.");
      setMessage(data.message || "Hecho."); router.refresh(); return true;
    } catch (e) { setMessage(e instanceof Error ? e.message : "Error desconocido"); setError(true); return false; }
    finally { setBusy(false); }
  }
  return { busy, message, error, run, clear: () => setMessage("") };
}

export type DialogField = { name: string; label: string; required?: boolean; multiline?: boolean; placeholder?: string };

/** Ventana de confirmación con campos opcionales (nota, comprobante…). */
export function ActionDialog({ title, description, confirmLabel, tone = "primary", fields = [], onConfirm, onClose }: {
  title: string; description: React.ReactNode; confirmLabel: string; tone?: "primary" | "danger" | "success"; fields?: DialogField[];
  onConfirm: (values: Record<string, string>) => Promise<boolean>; onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); setBusy(true); const ok = await onConfirm(values); setBusy(false); if (ok) onClose(); }
  return <motion.div className="rate-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.form onSubmit={submit} className="rate-modal" role="dialog" aria-modal="true" aria-label={title} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}>
      <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}><X size={18} /></button>
      <h2>{title}</h2>
      <div className="modal-description">{description}</div>
      {fields.map(f => <label key={f.name} className="modal-field">{f.label}{f.multiline
        ? <textarea className="field-textarea" name={f.name} rows={3} required={f.required} placeholder={f.placeholder} value={values[f.name] || ""} onChange={e => setValues({ ...values, [f.name]: e.target.value })} />
        : <input className="modal-input" name={f.name} required={f.required} placeholder={f.placeholder} value={values[f.name] || ""} onChange={e => setValues({ ...values, [f.name]: e.target.value })} />}</label>)}
      <div className="rate-modal-actions"><button type="submit" className={`rate-primary tone-${tone}`} disabled={busy}>{busy ? "Procesando…" : confirmLabel}</button><button type="button" className="rate-ghost" onClick={onClose}>Cancelar</button></div>
    </motion.form>
  </motion.div>;
}

/** Ventana controlada: guarda qué acción está abierta. */
export function useDialog<T>() {
  const [state, setState] = useState<T | null>(null);
  return { state, open: (value: T) => setState(value), close: () => setState(null) };
}
export { AnimatePresence };

export function InvestmentBadge({ item }: { item: Investment }) {
  const cls = item.status === "pending_payment" ? "claim-pending" : item.status === "cancelled" ? "claim-rejected" : item.status === "closed" ? "claim-settled" : "mature";
  return <span className={`badge-status ${cls}`}><i />{INVESTMENT_STATUS_LABELS[item.status] || item.status}</span>;
}
export function ClaimBadge({ status }: { status: string }) {
  return <span className={`badge-status claim-${status}`}><i />{CLAIM_STATUS_LABELS[status] || status}</span>;
}

export function Feedback({ message, error }: { message: string; error: boolean }) {
  return message ? <p role="status" className={`claim-feedback admin-feedback ${error ? "error" : ""}`}>{message}</p> : null;
}

export function Filters<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  return <div className="admin-filters" role="tablist">{options.map(o => <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? "active" : ""} onClick={() => onChange(o.value)}>{o.label}{o.count !== undefined && <b>{o.count}</b>}</button>)}</div>;
}

export const matches = (query: string, ...fields: (string | null | undefined)[]) => {
  const q = query.trim().toLowerCase();
  return !q || fields.some(f => (f || "").toLowerCase().includes(q));
};
