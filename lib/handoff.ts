import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { hmacHex, masterSecret, randomString } from "@/lib/crypto";
import { sanitizePhotoB64 } from "@/lib/signature";

// Hands a photographed signature from a phone to the computer the affiliate is signing on.
// The QR link carries a random token; only its hash is stored. A token is single-use, expires in
// 15 minutes, and is bound to one signing session (an invite while joining, or a partner later).
export type HandoffScope = { inviteId?: string; partnerId?: string; adminUserId?: string };

const TTL_MS = 15 * 60 * 1000;
const hashToken = (token: string) => hmacHex(masterSecret() + ":handoff", token);
const validToken = (t: string) => /^[a-z0-9]{32}$/.test(t);

export async function createHandoff(scope: HandoffScope): Promise<string> {
  const token = randomString(32, "abcdefghijklmnopqrstuvwxyz0123456789");
  const { error } = await adminClient().from("portal_signature_handoffs").insert({
    token_hash: await hashToken(token),
    invite_id: scope.inviteId ?? null,
    partner_id: scope.partnerId ?? null,
    admin_user_id: scope.adminUserId ?? null,
    expires_at: new Date(Date.now() + TTL_MS).toISOString(),
  });
  if (error) throw new Error(error.message);
  return token;
}

export async function handoffIsOpen(token: string): Promise<boolean> {
  if (!validToken(token)) return false;
  const { data } = await adminClient()
    .from("portal_signature_handoffs")
    .select("status, expires_at")
    .eq("token_hash", await hashToken(token))
    .maybeSingle();
  return !!data && data.status === "waiting" && new Date(data.expires_at).getTime() > Date.now();
}

// Called from the phone. Kept deliberately light (one plain request to the database, no client
// library) because the free Workers plan only allows about 10 ms of CPU per request.
export async function putHandoffImage(token: string, png: unknown): Promise<"ok" | "invalid" | "closed"> {
  if (!validToken(token)) return "closed";
  const clean = sanitizePhotoB64(png);
  if (!clean) return "invalid";
  const url = `${process.env.SUPABASE_URL}/rest/v1/portal_signature_handoffs?token_hash=eq.${await hashToken(token)}&status=eq.waiting&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const res = await fetch(url, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ image_b64: clean, status: "received", received_at: new Date().toISOString() }),
  });
  if (!res.ok) return "closed";
  const rows = (await res.json()) as unknown[];
  return rows.length > 0 ? "ok" : "closed";
}

function scopeMatches(row: { invite_id: string | null; partner_id: string | null; admin_user_id: string | null }, scope: HandoffScope): boolean {
  if (scope.inviteId) return row.invite_id === scope.inviteId && !row.partner_id && !row.admin_user_id;
  if (scope.partnerId) return row.partner_id === scope.partnerId && !row.invite_id && !row.admin_user_id;
  if (scope.adminUserId) return row.admin_user_id === scope.adminUserId && !row.invite_id && !row.partner_id;
  return false;
}

// Called from the computer that is waiting.
export async function readHandoff(token: string, scope: HandoffScope): Promise<{ status: "waiting" | "received" | "expired"; png?: string }> {
  if (!validToken(token)) return { status: "expired" };
  const { data } = await adminClient()
    .from("portal_signature_handoffs")
    .select("invite_id, partner_id, admin_user_id, status, image_b64, expires_at")
    .eq("token_hash", await hashToken(token))
    .maybeSingle();
  if (!data || !scopeMatches(data, scope) || data.status === "used" || new Date(data.expires_at).getTime() < Date.now()) return { status: "expired" };
  if (data.status === "received" && data.image_b64) return { status: "received", png: data.image_b64 };
  return { status: "waiting" };
}

// Takes the image for good (single use). Returns null if the token is wrong, used or expired.
export async function consumeHandoff(token: string, scope: HandoffScope): Promise<string | null> {
  const seen = await readHandoff(token, scope);
  if (seen.status !== "received" || !seen.png) return null;
  const { data } = await adminClient()
    .from("portal_signature_handoffs")
    .update({ status: "used", image_b64: null })
    .eq("token_hash", await hashToken(token))
    .eq("status", "received")
    .select("id");
  return data && data.length > 0 ? seen.png : null;
}
