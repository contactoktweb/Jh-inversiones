import "server-only";
import { Resend } from "resend";
import { brand } from "@/lib/brand";
import { siteUrl } from "@/lib/config";

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c] || c));
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);

/** Envía un correo con Resend si está configurado. Devuelve true si se envió. Nunca lanza errores. */
export async function sendEmail(to: string, subject: string, paragraphs: string[], cta?: { label: string; path: string }) {
  if (!emailEnabled() || !to) return false;
  const button = cta ? `<p><a href="${siteUrl}${cta.path}" style="display:inline-block;background:#ffd34f;color:#070e46;padding:12px 20px;border-radius:8px;font-weight:bold;text-decoration:none">${escapeHtml(cta.label)}</a></p>` : "";
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#131a35;line-height:1.6"><h2 style="color:#070e46">${escapeHtml(brand.name)}</h2>${paragraphs.map(p => `<p>${p}</p>`).join("")}${button}</div>`;
  try {
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.RESEND_FROM_EMAIL!, to, subject: `${brand.name} · ${subject}`, html });
    return !result.error;
  } catch { return false; }
}

/** Aviso al administrador (ADMIN_NOTIFICATION_EMAIL). */
export const notifyAdmin = (subject: string, paragraphs: string[], path = "/admin") =>
  sendEmail(process.env.ADMIN_NOTIFICATION_EMAIL || "", subject, paragraphs, { label: "Abrir el panel", path });
