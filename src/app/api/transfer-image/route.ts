import { decodeImage } from "@/lib/images";
import { getSupabaseServer } from "@/lib/server/supabase";

export const runtime = "nodejs";

/** Foto con los datos de pago que subió el administrador. Solo para cuentas con sesión iniciada (RLS de settings). */
export async function GET() {
  const supabase = await getSupabaseServer();
  if (!supabase) return new Response("No disponible", { status: 404 });
  const { data } = await supabase.from("settings").select("value").eq("key", "transfer_image").maybeSingle();
  const image = data?.value ? decodeImage(data.value) : null;
  if (!image) return new Response("Sin imagen", { status: 404 });
  return new Response(new Uint8Array(image.bytes), { headers: { "Content-Type": image.type, "Cache-Control": "private, max-age=600" } });
}
