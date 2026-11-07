import "server-only";
import { redirect } from "next/navigation";
import { loadAdminCounts } from "./admin-data";
import { getSession } from "./session";

/** Para las páginas /admin/*: exige sesión de administrador y devuelve los contadores del menú. */
export async function requireAdminPage(path: string) {
  const session = await getSession();
  if (!session) redirect(`/acceso?rol=admin&next=${encodeURIComponent(path)}`);
  if (session.role !== "admin") redirect("/dashboard");
  const counts = await loadAdminCounts();
  return { session, badges: { "/admin/pagos": counts.pendingPayments, "/admin/retiros": counts.pendingClaims } };
}
