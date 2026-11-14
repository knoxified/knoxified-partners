import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. Server-only: it can read everything, so every caller must have
// already checked who the viewer is (see lib/viewer.ts) and scope queries accordingly.
export function adminClient() {
  return createClient(
    process.env.SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
