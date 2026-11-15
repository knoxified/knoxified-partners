import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { hmacHex, masterSecret, randomDigits } from "@/lib/crypto";
import { brandedEmail, sendMail } from "@/lib/mail";

export type Purpose = "login" | "join";

async function codeHash(email: string, purpose: Purpose, code: string): Promise<string> {
  return hmacHex(masterSecret() + ":otp", `${email.toLowerCase()}:${purpose}:${code}`);
}

async function allowed(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await adminClient().rpc("portal_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  return !error && data === true;
}

// Emails a 6-digit code. For "login" nothing is sent unless the email belongs to an affiliate or admin,
// but the caller shows the same message either way so nobody can probe which emails exist.
export async function sendCode(email: string, purpose: Purpose, ip: string): Promise<"sent" | "limited" | "skipped"> {
  const e = email.trim().toLowerCase();
  if (!(await allowed(`otp:email:${e}`, 5, 3600)) || !(await allowed(`otp:ip:${ip}`, 20, 3600))) return "limited";

  const admin = adminClient();
  if (purpose === "login") {
    const { data } = await admin.rpc("portal_login_allowed", { p_email: e });
    if (!Array.isArray(data) || data.length === 0) return "skipped";
  }

  const code = randomDigits(6);
  const { error } = await admin.rpc("portal_store_code", {
    p_email: e,
    p_purpose: purpose,
    p_code_hash: await codeHash(e, purpose, code),
    p_ttl_seconds: 600,
  });
  if (error) {
    console.error("Could not store login code:", error.message);
    return "skipped";
  }

  const { html, text } = brandedEmail({
    preheader: `Your Knoxified code is ${code}`,
    title: purpose === "join" ? "Confirm your email address" : "Your sign-in code",
    paragraphs: [
      `Your code is ${code}. It works once and expires in 10 minutes.`,
      "If you did not ask for this, you can ignore this email. Nobody can sign in without the code.",
    ],
  });
  const sent = await sendMail({
    to: e,
    subject: `${code} is your Knoxified code`,
    html,
    text,
  });
  return sent ? "sent" : "skipped";
}

export async function checkCode(email: string, purpose: Purpose, code: string, ip: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (!/^\d{6}$/.test(code)) return false;
  if (!(await allowed(`otpcheck:ip:${ip}`, 40, 3600)) || !(await allowed(`otpcheck:email:${e}`, 20, 3600))) return false;
  const { data, error } = await adminClient().rpc("portal_verify_code", {
    p_email: e,
    p_purpose: purpose,
    p_code_hash: await codeHash(e, purpose, code),
  });
  return !error && data === true;
}

export async function rateAllowed(key: string, limit: number, windowSeconds: number) {
  return allowed(key, limit, windowSeconds);
}
