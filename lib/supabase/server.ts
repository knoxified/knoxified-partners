import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Session-aware client (cookies). Used only to find out who is logged in.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_ANON_KEY || "placeholder-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component; the middleware refreshes the session instead.
          }
        },
      },
    }
  );
}
