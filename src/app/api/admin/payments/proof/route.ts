import { decodeImage } from "@/lib/images";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { fail, guard, isUuid } from "@/lib/server/http";

export const runtime = "nodejs";

/** Comprobante que adjuntó el cliente a una transferencia. Solo administradores. */
export async function GET(request: Request) {
  const { error } = await guard(request, "admin");
  if (error) return error;
  const id = new URL(request.url).searchParams.get("id");
  if (!isUuid(id)) return fail("Identificador inválido.", 400);
  const { data } = await getSupabaseAdmin().from("payment_proofs").select("image").eq("investment_id", id).maybeSingle();
  const image = data?.image ? decodeImage(data.image) : null;
  if (!image) return fail("Este pago no tiene comprobante.", 404);
  return new Response(new Uint8Array(image.bytes), { headers: { "Content-Type": image.type, "Cache-Control": "private, no-store" } });
}
