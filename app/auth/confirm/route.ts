import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Invite and password-reset links land here: verify the one-time token, then ask for a password.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const allowed = ["invite", "recovery", "magiclink", "email"];

  if (tokenHash && type && allowed.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL("/set-password", request.url));
  }
  return NextResponse.redirect(new URL("/login?error=That+link+is+invalid+or+has+expired.+Ask+for+a+new+one.", request.url));
}
