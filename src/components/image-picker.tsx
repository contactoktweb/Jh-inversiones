"use client";
import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";

/** Reduce la foto en el navegador (máx. 1600 px, JPEG) para que pese poco antes de enviarla. */
async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error("No se pudo leer la imagen.")); i.src = url; });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let out = canvas.toDataURL("image/jpeg", quality);
    if (out.length > 1_400_000) out = canvas.toDataURL("image/jpeg", 0.6);
    return out;
  } finally { URL.revokeObjectURL(url); }
}

export default function ImagePicker({ id, label, hint, value, onChange }: { id: string; label: string; hint?: string; value: string | null; onChange: (dataUrl: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pick(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Elige un archivo de imagen (JPG o PNG)."); return; }
    setBusy(true); setError("");
    try { onChange(await compressImage(file)); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo leer la imagen."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return <div className="image-picker">
    <label htmlFor={id}>{label}</label>
    {hint && <small>{hint}</small>}
    {value ? <div className="image-picker-preview"><img src={value} alt={label} /><div className="image-picker-actions">
      <button type="button" className="rate-ghost" onClick={() => input.current?.click()}><ImagePlus size={15} /> Cambiar foto</button>
      <button type="button" className="rate-ghost" onClick={() => onChange(null)}><Trash2 size={15} /> Quitar</button></div></div>
      : <button type="button" className="image-picker-drop" onClick={() => input.current?.click()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={22} /> : <ImagePlus size={22} />}<span>{busy ? "Preparando la foto…" : "Subir foto"}</span></button>}
    <input ref={input} id={id} type="file" accept="image/*" hidden onChange={e => pick(e.target.files?.[0])} />
    {error && <p className="claim-feedback error" role="alert">{error}</p>}
  </div>;
}
