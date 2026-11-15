"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkCode, sendCode } from "@/lib/otp";
import { signInAs } from "@/lib/session";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") || (h.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

const validEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 254;

// Step 1: email a code. The response is the same whether or not the email belongs to an account.
export async function requestLoginCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!validEmail(email)) redirect("/login?error=Enter+a+valid+email+address");
  const result = await sendCode(email, "login", await clientIp());
  if (result === "limited") redirect("/login?error=Too+many+codes+requested.+Please+wait+a+while+and+try+again");
  redirect(`/login?step=code&email=${encodeURIComponent(email)}`);
}

// Step 2: check the code and sign in.
export async function verifyLoginCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const next = `/login?step=code&email=${encodeURIComponent(email)}`;
  if (!validEmail(email)) redirect("/login");
  const ok = await checkCode(email, "login", code, await clientIp());
  if (!ok) redirect(next + "&error=That+code+is+not+right+or+has+expired");
  const signedIn = await signInAs(email);
  if (!signedIn) redirect(next + "&error=We+could+not+sign+you+in.+Please+request+a+new+code");
  redirect("/");
}

// Fallback for admins who set a password.
export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?mode=password&error=Enter+your+email+and+password");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?mode=password&error=Incorrect+email+or+password");
  redirect("/");
}
