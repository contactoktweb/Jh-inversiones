"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import ImagePicker from "./image-picker";

/** El cliente avisa que ya hizo la transferencia (con comprobante opcional): se notifica al administrador. */
export default function ReportPayment({ investmentId, onDone }: { investmentId: string; onDone?: () => void }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/payments/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ investmentId, note, image }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No pudimos enviar el aviso. Intenta de nuevo.");
      setDone(true); onDone?.(); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Ocurrió un error."); }
    finally { setBusy(false); }
  }
  if (done) return <div className="report-done" role="status"><CircleCheck size={20} /><span><strong>¡Listo! Avisamos a la administración.</strong> Verificará el pago y activará tu inversión. Te avisaremos por correo y lo verás en tu panel.</span></div>;
  return <form className="report-payment" onSubmit={submit}>
    <h3>¿Ya hiciste la transferencia?</h3>
    <p>Avísanos para que la administración verifique el pago. Si puedes, adjunta una foto o captura del comprobante.</p>
    <label htmlFor={`note-${investmentId}`}>N.º de operación o comentario (opcional)</label>
    <input id={`note-${investmentId}`} className="field-input" maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder="Ej.: transferencia 123456 desde Banco X" />
    <ImagePicker id={`proof-${investmentId}`} label="Foto del comprobante (opcional)" value={image} onChange={setImage} />
    {error && <p className="claim-feedback error" role="alert">{error}</p>}
    <button type="submit" className="invest-pay" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={18} /> Enviando…</> : <><Send size={17} /> Ya realicé la transferencia</>}</button>
  </form>;
}
