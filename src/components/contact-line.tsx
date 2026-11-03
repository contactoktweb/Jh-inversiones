import { contact } from "@/lib/brand";

/** Canales de contacto configurados (NEXT_PUBLIC_CONTACT_EMAIL / NEXT_PUBLIC_CONTACT_WHATSAPP). */
export default function ContactLine() {
  if (!contact.email && !contact.whatsapp) return <>los canales de atención indicados en la plataforma</>;
  return <>{contact.email&&<a href={`mailto:${contact.email}`}>{contact.email}</a>}{contact.email&&contact.whatsapp&&" o "}{contact.whatsapp&&<a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp {contact.whatsappLabel}</a>}</>;
}
