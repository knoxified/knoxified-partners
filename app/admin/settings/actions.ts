"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";
import { sanitizeStrokes } from "@/lib/signature";

export type SigState = { ok?: boolean; error?: string };

export async function saveSignature(_prev: SigState, formData: FormData): Promise<SigState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80) || "Knox Favour";
  const title = String(formData.get("title") ?? "").trim().slice(0, 80) || "Founder, Knoxified";
  let strokes = null;
  try { strokes = sanitizeStrokes(JSON.parse(String(formData.get("strokes") ?? "[]"))); } catch { strokes = null; }
  if (!strokes) return { error: "Draw your signature in the box first." };
  const { error } = await adminClient()
    .from("portal_settings")
    .upsert({ key: "knoxified_signature", value: { name, title, strokes }, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}
