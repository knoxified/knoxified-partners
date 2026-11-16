import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/viewer";
import { adminClient } from "@/lib/supabase/admin";
import { decryptPayout } from "@/lib/payout";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";
const MIN_PAYOUT = 50;

// Bulk-transfer batch for the payout run. Admin only; contains decrypted bank details.
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return new NextResponse("Not found", { status: 404 });
  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new NextResponse("Bad date", { status: 400 });

  const admin = adminClient();
  const { data } = await admin.rpc("portal_payouts_due", { p_payout_date: date });
  const due = (data ?? []).filter((r: any) => Number(r.amount) >= MIN_PAYOUT);
  const ids = due.map((r: any) => r.partner_id);
  const { data: det } = ids.length ? await admin.from("partner_payout_details").select("partner_id, currency, method, country, ciphertext").in("partner_id", ids) : { data: [] as any[] };
  const byId = new Map((det ?? []).map((d: any) => [d.partner_id, d]));

  const rows: Array<Record<string, unknown>> = [];
  for (const r of due) {
    const d = byId.get(r.partner_id);
    if (!d) continue;
    let v;
    try { v = await decryptPayout(d.ciphertext); } catch { continue; }
    rows.push({
      affiliate: r.name, email: r.email, country: d.country ?? "", payout_currency: d.currency, method: d.method,
      account_holder: v.holder, bank: v.bank, account_iban_email_or_wallet: v.account, swift_bic: v.swift, crypto_asset: v.asset ?? "", crypto_network: v.network ?? "", gift_card: v.card ?? "",
      amount_usd: Number(r.amount).toFixed(2),
      reference: `KNX-${date}-${String(r.partner_id).slice(0, 6).toUpperCase()}`, notes: v.notes,
    });
  }
  return new NextResponse(toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="knoxified-payouts-${date}.csv"`, "Cache-Control": "no-store" },
  });
}
