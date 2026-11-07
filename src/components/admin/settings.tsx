"use client";
import { useState } from "react";
import { Save } from "lucide-react";
import { useAdminAction } from "./ui";

export default function TransferSettings({ initial }: { initial: string }) {
  const action = useAdminAction();
  const [value, setValue] = useState(initial);
  return <form className="form-grid single" onSubmit={e => { e.preventDefault(); action.run("/api/admin/settings", { transfer_instructions: value }); }}>
    <label>Datos que verá el cliente al elegir «Transferencia bancaria»<textarea className="field-textarea" rows={7} maxLength={2000} value={value} onChange={e => setValue(e.target.value)} placeholder={"Banco: …\nTipo de cuenta: …\nNúmero: …\nTitular: …\nDocumento: …"} /></label>
    <div className="form-actions"><button className="rate-primary" disabled={action.busy}><Save size={16} />{action.busy ? "Guardando…" : "Guardar"}</button>{action.message && <p role="status" className={`claim-feedback ${action.error ? "error" : ""}`}>{action.message}</p>}</div>
  </form>;
}
