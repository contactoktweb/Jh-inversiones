"use client";
import { useState } from "react";
import { Save } from "lucide-react";
import ImagePicker from "../image-picker";
import { useAdminAction } from "./ui";

/** Datos de pago para transferencias: foto (QR, captura de la cuenta…) y texto. Los ve el cliente al invertir. */
export default function TransferSettings({ initial, initialImage }: { initial: string; initialImage: string }) {
  const action = useAdminAction();
  const [value, setValue] = useState(initial);
  // null = sin foto; string = foto actual (URL) o nueva (data URL).
  const [image, setImage] = useState<string | null>(initialImage || null);
  const changed = image !== (initialImage || null);
  return <form className="form-grid single settings-stack" onSubmit={e => {
    e.preventDefault();
    action.run("/api/admin/settings", { transfer_instructions: value, ...(changed ? { transfer_image: image ?? "" } : {}) });
  }}>
    <ImagePicker id="transfer-image" label="Foto con los datos de pago (opcional)" hint="Por ejemplo, el código QR de tu banco o una captura con los datos de la cuenta. El cliente la ve al elegir «Transferencia bancaria»." value={image} onChange={setImage} />
    <label>Datos que verá el cliente al elegir «Transferencia bancaria»<textarea className="field-textarea" rows={7} maxLength={2000} value={value} onChange={e => setValue(e.target.value)} placeholder={"Banco: …\nTipo de cuenta: …\nNúmero: …\nTitular: …\nDocumento: …"} /></label>
    <div className="form-actions"><button className="rate-primary" disabled={action.busy}><Save size={16} />{action.busy ? "Guardando…" : "Guardar"}</button>{action.message && <p role="status" className={`claim-feedback ${action.error ? "error" : ""}`}>{action.message}</p>}</div>
  </form>;
}
