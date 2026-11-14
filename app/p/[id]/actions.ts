"use server";

import { headers } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import { canView, getViewer, UUID_RE } from "@/lib/viewer";

export type AccessLinkState = { link?: string; error?: string };

// Admin only: makes a one-time sign-in link for an affiliate (new invite, or password reset for an
// existing login). The link is shown to the admin to send personally; no email service involved.
export async function createAccessLink(_prev: AccessLinkState, formData: FormData): Promise<AccessLinkState> {
  const viewer = await getViewer();
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!viewer || viewer.role !== "admin" || !canView(viewer, partnerId)) return { error: "Not allowed." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  if (!UUID_RE.test(partnerId)) return { error: "Unknown affiliate." };

  const admin = adminClient();
  const metadata = { account_type: "partner", partner_id: partnerId };

  let type: "invite" | "recovery" = "invite";
  let result = await admin.auth.admin.generateLink({ type: "invite", email, options: { data: metadata } });
  if (result.error) {
    // The login already exists: send a password-reset style link instead.
    type = "recovery";
    result = await admin.auth.admin.generateLink({ type: "recovery", email });
  }
  if (result.error || !result.data?.properties?.hashed_token) {
    return { error: result.error?.message ?? "Could not create a link." };
  }

  // Make sure this login is linked to this affiliate (also covers pre-existing logins).
  const userId = result.data.user?.id;
  if (userId) {
    const { error } = await admin.from("partner_members").upsert({ user_id: userId, partner_id: partnerId });
    if (error) return { error: error.message };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const link = `${proto}://${host}/auth/confirm?token_hash=${encodeURIComponent(result.data.properties.hashed_token)}&type=${type}`;
  return { link };
}
