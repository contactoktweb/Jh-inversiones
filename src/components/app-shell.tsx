"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, Banknote, CalendarDays, CircleHelp, CreditCard, LayoutDashboard, LogOut, Menu, Layers, Percent, Settings2, Sparkles, UserRound, Users, Wallet, X, type LucideIcon } from "lucide-react";
import Logo from "./logo";
import { formatDate } from "@/lib/finance";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number };
type Variant = "user" | "admin";

const NAV: Record<Variant, NavItem[]> = {
  user: [
    { href: "/dashboard", label: "Mi inversión", icon: LayoutDashboard },
    { href: "/invertir", label: "Nueva inversión", icon: Wallet },
    { href: "/cuenta", label: "Mi cuenta", icon: UserRound },
    { href: "/#preguntas", label: "Centro de ayuda", icon: CircleHelp },
  ],
  admin: [
    { href: "/admin", label: "Resumen", icon: LayoutDashboard },
    { href: "/admin/tasas", label: "Ganancia diaria", icon: Percent },
    { href: "/admin/pagos", label: "Pagos", icon: CreditCard },
    { href: "/admin/retiros", label: "Retiros", icon: Banknote },
    { href: "/admin/inversiones", label: "Inversiones", icon: Wallet },
    { href: "/admin/planes", label: "Planes", icon: Layers },
    { href: "/admin/clientes", label: "Clientes", icon: Users },
    { href: "/admin/actividad", label: "Actividad", icon: Activity },
    { href: "/admin/ajustes", label: "Ajustes", icon: Settings2 },
  ],
};

/** Estructura común de los paneles (menú lateral, menú móvil y encabezado). */
export default function AppShell({ variant, email, badges = {}, eyebrow, title, subtitle, children }: {
  variant: Variant; email: string; badges?: Record<string, number>; eyebrow: string; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(Date.now()), []);
  useEffect(() => setOpen(false), [pathname]);
  const items = NAV[variant].map(item => ({ ...item, badge: badges[item.href] }));
  const isCurrent = (href: string) => href === pathname || (href !== "/admin" && href !== "/dashboard" && !href.includes("#") && pathname.startsWith(href + "/"));
  const initial = (email.charAt(0) || "J").toUpperCase();
  const nav = <nav className="dash-nav" aria-label={variant === "admin" ? "Secciones de administración" : "Secciones del panel"}>{items.map(({ href, label, icon: Icon, badge }) =>
    <Link key={href} href={href} className={isCurrent(href) ? "current" : ""} aria-current={isCurrent(href) ? "page" : undefined}><Icon size={18} /><span>{label}</span>{badge ? <b className="nav-badge">{badge}</b> : null}</Link>)}</nav>;
  return <div className="dash-layout">
    <aside className="dash-sidebar"><Logo /><div className="dash-group-label">{variant === "admin" ? "ADMINISTRACIÓN" : "MENÚ PRINCIPAL"}</div>{nav}
      <div className="sidebar-bottom">
        <div className="sidebar-help">{variant === "admin"
          ? <><Settings2 size={23} /><h3>Recuerda a diario.</h3><p>Configura cada día el porcentaje de ganancia y revisa pagos y retiros pendientes.</p><Link href="/">Ver sitio público <ArrowUpRight size={14} /></Link></>
          : <><Sparkles size={23} /><h3>Plazo mínimo: 1 mes.</h3><p>Tus ganancias se suman cada día según la tasa publicada por la administración.</p><Link href="/invertir">Invertir más <ArrowUpRight size={14} /></Link></>}</div>
        <div className="sidebar-foot"><span title={email}>{variant === "admin" ? "ADMINISTRADOR" : "CUENTA ACTIVA"}</span><form method="POST" action="/api/signout"><button type="submit" title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut size={18} /></button></form></div>
      </div>
    </aside>
    <div>
      <div className="dash-mobile-head"><Logo compact /><button type="button" className="dash-mobile-menu" aria-expanded={open} aria-label={open ? "Cerrar menú" : "Abrir menú"} onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button></div>
      {open && <div className="dash-mobile-nav">{nav}<form method="POST" action="/api/signout"><button type="submit" className="dash-mobile-signout">Cerrar sesión <LogOut size={16} /></button></form></div>}
      <main className="dash-main">
        <header className="dash-top"><span>JH / {variant === "admin" ? "ADMINISTRACIÓN" : "MI CUENTA"}</span><div className="dash-top-right"><span className="dash-live"><i />{email}</span><span className="dash-avatar">{initial}</span></div></header>
        <section className="dash-welcome"><div><span className="dash-eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{today && <span className="dash-date"><CalendarDays size={15} />{formatDate(today)}</span>}</section>
        {children}
      </main>
    </div>
  </div>;
}
