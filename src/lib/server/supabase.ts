import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseConfig } from "@/lib/config";

export async function getSupabaseServer() {
  if (!hasSupabaseConfig) return null;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(items: Array<{ name: string; value: string; options?: any }>) {
          try {
            items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components are read-only; Route Handlers can write cookies.
          }
        },
      },
    }
  );
}
