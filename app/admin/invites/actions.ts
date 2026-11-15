"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";
import { formatInviteCode, INVITE_ALPHABET, randomString } from "@/lib/crypto";
import { inviteHash } from "@/lib/invite";
import { publicUrl } from "@/lib/mail";

export type InviteState = { code?: string; link?: string; error?: string };

export async function createInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").slice(0, 80);
  const rate1 = Number(formData.get("rate1") ?? 30);
  const rate2 = Number(formData.get("rate2") ?? 20);
  const days = Math.round(Number(formData.get("days") ?? 14));
  if (![rate1, rate2].every((r) => Number.isFinite(r) && r >= 0 && r <= 100)) return { error: "Rates must be between 0 and 100." };
  if (!Number.isFinite(days) || days < 1 || days > 60) return { error: "Expiry must be between 1 and 60 days." };

  const core = randomString(12, INVITE_ALPHABET);
  const { error } = await adminClient().rpc("portal_create_invite", {
    p_code_hash: await inviteHash(core),
    p_hint: core.slice(-4),
    p_label: label,
    p_rate: rate1,
    p_rate2: rate2,
    p_days: days,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/invites");
  return { code: formatInviteCode(core), link: `${publicUrl()}/join` };
}

export async function revokeInvite(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await adminClient().from("partner_invites").update({ revoked_at: new Date().toISOString() }).eq("id", id).is("used_at", null);
  revalidatePath("/admin/invites");
}
