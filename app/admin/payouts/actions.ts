"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";
import { UUID_RE } from "@/lib/viewer";
import { sendPayoutEmail } from "@/lib/notify";

const MIN_PAYOUT = 50;

// Run after the money has been sent: closes out every payable commission for that partner up to the payout date.
export async function markPaid(formData: FormData) {
  await requireAdmin();
  const partnerId = String(formData.get("partnerId") ?? "");
  const currency = String(formData.get("currency") ?? "USD");
  const reference = String(formData.get("reference") ?? "").trim().slice(0, 80);
  const date = String(formData.get("date") ?? "");
  const back = `/admin/payouts?date=${encodeURIComponent(date)}`;
  if (!UUID_RE.test(partnerId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) redirect(back + "&error=Invalid+request");
  if (reference.length < 3) redirect(back + "&error=Enter+the+transfer+reference");

  const admin = adminClient();
  const { data: due } = await admin.rpc("portal_payouts_due", { p_payout_date: date });
  const row = (due ?? []).find((r: any) => r.partner_id === partnerId && r.currency === currency);
  if (!row || Number(row.amount) < MIN_PAYOUT) redirect(back + "&error=Nothing+payable+above+the+minimum+for+that+affiliate");

  const { data, error } = await admin.rpc("mark_commissions_paid", {
    p_partner_id: partnerId,
    p_currency: currency,
    p_payout_ref: reference,
    p_through: `${date}T23:59:59.999Z`,
  });
  if (error) redirect(back + "&error=" + encodeURIComponent(error.message));
  const result = Array.isArray(data) ? data[0] : data;
  await sendPayoutEmail(partnerId, Number(result?.total_paid ?? row.amount), currency, reference);
  revalidatePath("/admin/payouts");
  redirect(back + "&notice=" + encodeURIComponent(`Marked paid: ${row.name}`));
}
