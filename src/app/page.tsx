import Landing from "@/components/landing";
import { activePlans } from "@/lib/plans";
import { getPlans } from "@/lib/server/plans";

// Se actualiza en cuanto el administrador cambia los planes (revalidatePath) y, como respaldo, cada minuto.
export const revalidate = 60;
export default async function Home() { return <Landing plans={activePlans(await getPlans())} />; }
