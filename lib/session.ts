import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Signs a verified person in without a password: the server asks Supabase for a one-time magic-link
// token and redeems it immediately on this same request, which sets the normal session cookies.
// Only call this after the person has proven they control the email (one-time code).
export async function signInAs(email: string): Promise<boolean> {
  try {
    const { data, error } = await adminClient().auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) {
      console.error("generateLink failed:", error?.message);
      return false;
    }
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
    if (verifyError) console.error("verifyOtp failed:", verifyError.message);
    return !verifyError;
  } catch (err) {
    console.error("signInAs error:", (err as Error).message);
    return false;
  }
}
