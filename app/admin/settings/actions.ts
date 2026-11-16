"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";
import { sanitizePhotoDataUrl, sanitizeStrokes } from "@/lib/signature";
import { consumeHandoff, createHandoff, readHandoff } from "@/lib/handoff";
import { publicUrl } from "@/lib/mail";

export type SigState = { ok?: boolean; error?: string };

export async function startAdminHandoff(): Promise<{ ok: true; token: string; url: string } | { ok: false; error: string }> {
  const viewer = await requireAdmin();
  try {
    const token = await createHandoff({ adminUserId: viewer.userId });
    return { ok: true, token, url: `${publicUrl()}/sig/${token}` };
  } catch {
    return { ok: false, error: "Could not create the phone link. Run the latest SQL file in Supabase, or upload the photo from this computer instead." };
  }
}

export async function pollAdminHandoff(token: string) {
  const viewer = await requireAdmin();
  return readHandoff(token, { adminUserId: viewer.userId });
}

export async function saveSignature(_prev: SigState, formData: FormData): Promise<SigState> {
  const viewer = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80) || "Knox Favour";
  const title = String(formData.get("title") ?? "").trim().slice(0, 80) || "Founder, Knoxified";

  let strokes = null;
  let png: string | null = null;
  if (formData.get("sigMethod") === "photo") {
    png = sanitizePhotoDataUrl(formData.get("photo"));
    if (!png) png = await consumeHandoff(String(formData.get("handoff") ?? ""), { adminUserId: viewer.userId });
    if (!png) return { error: "The signature photo is missing or expired. Add it again." };
  } else {
    try { strokes = sanitizeStrokes(JSON.parse(String(formData.get("strokes") ?? "[]"))); } catch { strokes = null; }
    if (!strokes) return { error: "Draw your signature in the box first." };
  }
  const { error } = await adminClient()
    .from("portal_settings")
    .upsert({ key: "knoxified_signature", value: { name, title, strokes, png }, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}
