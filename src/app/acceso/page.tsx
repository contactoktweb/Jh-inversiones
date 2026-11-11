import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import { getSession } from "@/lib/server/session";
export const metadata: Metadata = { title: "Acceder", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const safeNext = (value: string | undefined) => value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : null;

/** Con la sesión guardada no hace falta volver a escribir la contraseña: va directo a su panel. */
export default async function AccessPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  if (!params.error) {
    const session = await getSession();
    if (session) {
      const next = safeNext(params.next);
      redirect(session.role === "admin" ? (next?.startsWith("/admin") ? next : "/admin") : (next && !next.startsWith("/admin") ? next : "/dashboard"));
    }
  }
  return <Suspense fallback={<div style={{minHeight:"100vh",background:"#0c131c"}}/>}><LoginForm/></Suspense>;
}
