"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";
import { rateAllowed } from "@/lib/otp";
import { encryptPayout, maskHint, validatePayout } from "@/lib/payout";
import { brandedEmail, publicUrl, sendMail } from "@/lib/mail";

export type PayoutState = { ok?: boolean; error?: string };

// Only the affiliate themselves can save payout details (not even admins), and every change is
// logged and emailed to the affiliate so a hijacked account cannot quietly redirect a payout.
export async function savePayout(_prev: PayoutState, formData: FormData): Promise<PayoutState> {
  const viewer = await getViewer();
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!viewer || viewer.role !== "partner" || viewer.partnerId !== partnerId) return { error: "Not allowed." };
  if (!(await rateAllowed(`payout:${partnerId}`, 10, 3600))) return { error: "Too many changes. Please try again later." };

  const input: Record<string, string> = {};
  for (const k of ["currency", "country", "method", "holder", "bank", "account", "swift", "notes"]) input[k] = String(formData.get(k) ?? "");
  const v = validatePayout(input);
  if (!v.ok) return { error: v.error };

  const admin = adminClient();
  const { data: existing } = await admin.from("partner_payout_details").select("updated_at").eq("partner_id", partnerId).maybeSingle();
  const { error } = await admin.from("partner_payout_details").upsert({
    partner_id: partnerId,
    currency: v.value.currency,
    method: v.value.method,
    country: v.value.country,
    hint: maskHint(v.value.account),
    ciphertext: await encryptPayout({ holder: v.value.holder, bank: v.value.bank, account: v.value.account, swift: v.value.swift, notes: v.value.notes }),
    updated_at: new Date().toISOString(),
    previous_updated_at: existing?.updated_at ?? null,
  });
  if (error) return { error: "We could not save your details. Please try again." };

  await admin.from("audit_logs").insert({
    user_id: viewer.userId, action: "payout_details_updated", entity_type: "partner",
    metadata: { partner_id: partnerId, currency: v.value.currency, country: v.value.country },
  });

  const { data: partner } = await admin.from("partners").select("name, email").eq("id", partnerId).maybeSingle();
  if (partner) {
    const { html, text } = brandedEmail({
      title: "Your payout details were updated",
      paragraphs: [
        `Your payout details (${v.value.currency}, account ending ${maskHint(v.value.account).slice(-4)}) were saved in your Knoxified Partners dashboard.`,
        "If this was not you, reply to this email straight away so we can hold your next payout.",
      ],
      cta: { label: "Open your dashboard", url: `${publicUrl()}/p/${partnerId}` },
    });
    await sendMail({ to: partner.email, toName: partner.name, subject: "Your payout details were updated", html, text, copyAdmin: true });
  }
  revalidatePath(`/p/${partnerId}`);
  return { ok: true };
}
