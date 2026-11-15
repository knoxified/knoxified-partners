import Link from "next/link";
import { requireAdmin, nextPayoutDate } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";
import { decryptPayout, type PayoutDetails } from "@/lib/payout";
import { day, money } from "@/lib/format";
import { Pill, Section, Stat, TableCard } from "@/components/ui";
import { Shell } from "../../shell";
import { markPaid } from "./actions";

export const dynamic = "force-dynamic";
const MIN_PAYOUT = 50;

type Row = { partner_id: string; name: string; email: string; currency: string; amount: number; payments: number };

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ date?: string; error?: string; notice?: string }> }) {
  const viewer = await requireAdmin();
  const sp = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? (sp.date as string) : nextPayoutDate();
  const admin = adminClient();

  const { data } = await admin.rpc("portal_payouts_due", { p_payout_date: date });
  const rows: Row[] = (data ?? []).map((r: any) => ({ ...r, amount: Number(r.amount), payments: Number(r.payments) }));

  const ids = rows.map((r) => r.partner_id);
  const { data: detailRows } = ids.length
    ? await admin.from("partner_payout_details").select("partner_id, currency, method, country, ciphertext, updated_at, previous_updated_at").in("partner_id", ids)
    : { data: [] as any[] };
  const details = new Map<string, { meta: any; value: PayoutDetails | null }>();
  for (const d of detailRows ?? []) {
    let value: PayoutDetails | null = null;
    try { value = await decryptPayout(d.ciphertext); } catch { value = null; }
    details.set(d.partner_id, { meta: d, value });
  }

  const payable = rows.filter((r) => r.amount >= MIN_PAYOUT && details.get(r.partner_id)?.value);
  const total = payable.reduce((s, r) => s + r.amount, 0);
  const weekAgo = Date.now() - 7 * 86400_000;

  return (
    <Shell email={viewer.email} role="admin">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Payout <span className="gradient-text">run</span></h1>
      <p className="mt-2 text-slate-400">Review on the 13th and 14th, send on the 15th, then mark each affiliate paid. Amounts include everything whose 21-day hold ends by the payout date.</p>

      {sp.error && <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{sp.error}</p>}
      {sp.notice && <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{sp.notice}</p>}

      <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
        <div><label className="mb-1.5 block text-xs font-medium text-slate-400">Payout date</label><input type="date" name="date" defaultValue={date} className="input" /></div>
        <button className="btn btn-ghost">Show</button>
        {payable.length > 0 && <a href={`/admin/payouts/export?date=${date}`} className="btn btn-primary">Download payment batch (CSV)</a>}
      </form>

      <div className="mb-8 mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Payout date" value={day(date)} tone="cyan" />
        <Stat label="Ready to pay" value={money(total)} tone="green" hint={`${payable.length} affiliate${payable.length === 1 ? "" : "s"}`} />
        <Stat label="Waiting" value={String(rows.length - payable.length)} tone="amber" hint="Below minimum or no details" />
        <Stat label="Minimum payout" value={money(MIN_PAYOUT)} />
      </div>

      <Section title="Affiliates due">
        <TableCard min={900}>
          <thead><tr><th className="th">Affiliate</th><th className="th text-right">Payments</th><th className="th text-right">Amount</th><th className="th">Payout details</th><th className="th">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-800/70">
            {rows.map((r) => {
              const d = details.get(r.partner_id);
              const recent = d && new Date(d.meta.updated_at).getTime() > weekAgo;
              const below = r.amount < MIN_PAYOUT;
              return (
                <tr key={`${r.partner_id}-${r.currency}`} className="row align-top">
                  <td className="td"><Link href={`/p/${r.partner_id}`} className="font-semibold text-cyan-300 hover:underline">{r.name}</Link><div className="text-xs text-slate-500">{r.email}</div></td>
                  <td className="td num text-right">{r.payments}</td>
                  <td className="td num text-right font-semibold">{money(r.amount, r.currency)}</td>
                  <td className="td">
                    {!d?.value ? <Pill tone="red">Missing</Pill> : (
                      <details>
                        <summary className="cursor-pointer text-sm text-cyan-300">
                          {d.meta.currency} · {d.meta.country} {recent && <Pill tone="amber">Changed recently, verify</Pill>}
                        </summary>
                        <div className="mt-2 space-y-0.5 rounded-lg bg-slate-950/60 p-3 text-xs text-slate-300">
                          <div>Holder: {d.value.holder}</div><div>Bank: {d.value.bank || "—"}</div>
                          <div>Account / IBAN: <span className="font-mono">{d.value.account || "—"}</span></div>
                          <div>SWIFT/BIC: {d.value.swift || "—"}</div>{d.value.notes && <div>Notes: {d.value.notes}</div>}
                          <div className="pt-1 text-slate-500">Updated {day(d.meta.updated_at)}</div>
                        </div>
                      </details>
                    )}
                  </td>
                  <td className="td">
                    {below ? <span className="text-xs text-slate-500">Under {money(MIN_PAYOUT)}: rolls over</span>
                      : !d?.value ? <span className="text-xs text-amber-300">Waiting for payout details</span>
                      : (
                        <form action={markPaid} className="flex gap-2">
                          <input type="hidden" name="partnerId" value={r.partner_id} /><input type="hidden" name="currency" value={r.currency} /><input type="hidden" name="date" value={date} />
                          <input name="reference" required placeholder="Transfer reference" className="input !py-1.5 !text-xs" />
                          <button className="btn btn-primary !px-3 !py-1.5">Mark paid</button>
                        </form>
                      )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={5} className="td py-12 text-center text-slate-500">Nothing is due for this payout date.</td></tr>}
          </tbody>
        </TableCard>
      </Section>
      <p className="text-xs text-slate-500">Mark paid only after the transfer is sent. It closes out those commissions, emails the affiliate, and cannot be undone (corrections are made with an adjustment).</p>
    </Shell>
  );
}
