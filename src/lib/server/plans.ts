import "server-only";
import { getSupabaseAdmin } from "./admin";
import { DEFAULT_PLANS, planFromRow, type Plan } from "@/lib/plans";

/** Todos los planes (visibles y ocultos). Si la base no responde, usa los planes iniciales. */
export async function getPlans(): Promise<Plan[]> {
  try {
    const { data, error } = await getSupabaseAdmin().from("plans")
      .select("id,name,eyebrow,caption,min_usd,features,highlighted,active,sort_order")
      .order("sort_order").order("min_usd");
    if (error) throw error;
    return data && data.length ? data.map(planFromRow) : DEFAULT_PLANS;
  } catch (e) {
    console.error("plans_load_error", e instanceof Error ? e.message : e);
    return DEFAULT_PLANS;
  }
}
