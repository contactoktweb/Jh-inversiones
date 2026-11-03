// Edita este archivo para cambiar la identidad provisional del proyecto.
export const brand = {
  name: "JH Inversiones",
  initials: "JH",
  wordmark: "inversiones",
  slogan: "Invierte con perspectiva",
} as const;

// Datos de contacto públicos (se configuran por variables de entorno; si faltan, no se muestran).
const whatsappDigits = (process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || "").replace(/[^\d]/g, "");
export const contact = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  whatsapp: whatsappDigits,
  whatsappUrl: whatsappDigits ? `https://wa.me/${whatsappDigits}` : "",
  whatsappLabel: whatsappDigits ? `+${whatsappDigits}` : "",
} as const;

