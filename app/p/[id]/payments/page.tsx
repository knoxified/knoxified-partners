import { notFound, redirect } from "next/navigation";
import { canView, getViewer } from "@/lib/viewer";
import { getPartner, getPayments, getPayoutMeta } from "@/lib/data";
import { day, money } from "@/lib/format";
import { Section, Stat, TableCard } from "@/components/ui";
import { ExportLink, PaymentsTable } from "@/components/partner-tables";
import { MethodIcon } from "@/components/payout-icons";
import { methodLabel } from "@/lib/payout-options";
import { PartnerFrame } from "../frame";
import { PayoutForm } from "../payout-form";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!canView(viewer, id)) notFound();
  const partner = await getPartner(id);
  if (!partner) notFound();
  const [payments, payout] = await Promise.all([getPayments(id), getPayoutMeta(id)]);
  const isOwner = viewer.role === "partner";
  const cur = partner.currency;

  const nextPayout = payments.filter((p) => p.status === "pending" && new Date(p.scheduled_payout).getTime() <= new Date(partner.next_payout_date).getTime());

  // Group paid commissions into the payouts they were sent in.
  const sent = new Map<string, { when: string; ref: string | null; count: number; total: number }>();
  for (const p of payments) {
    if (p.status !== "paid" || !p.paid_out_at) continue;
    const key = `${p.payout_ref ?? ""}|${p.paid_out_at.slice(0, 10)}`;
    const e = sent.get(key) ?? { when: p.paid_out_at, ref: p.payout_ref, count: 0, total: 0 };
    e.count++;
    e.total += p.commission_amount;
    sent.set(key, e);
  }
  const payouts = [...sent.values()].sort((a, b) => b.when.localeCompare(a.when));

  return (
    <PartnerFrame viewer={viewer} partner={partner} id={id} title="Payments" subtitle="Your commissions, your payouts, and where we send them.">
      <div className="glow-border mb-6">
        <div className="glow-inner flex flex-wrap items-end justify-between gap-6 p-6">
          <div>
            <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-cyan-300">Next payout · {day(partner.next_payout_date)}</div>
            <div className="num gradient-text mt-2 text-5xl font-bold tracking-tight">{money(partner.scheduled_amount, cur)}</div>
          </div>
          <p className="max-w-sm text-sm text-slate-400">{partner.scheduled_count} payment{partner.scheduled_count === 1 ? "" : "s"} scheduled. Payouts go out on the 15th, from US$50.</p>
        </div>
      </div>

      <div className="mb-10 grid grid-cols-3 gap-3">
        <Stat label="In hold" value={money(partner.in_hold, cur)} />
        <Stat label="Payable now" value={money(partner.payable_now, cur)} tone="amber" />
        <Stat label="Paid to date" value={money(partner.paid_to_date, cur)} tone="green" />
      </div>

      <div id="payout-details" className="scroll-mt-24">
        <Section title="Payout preference" hint={payout ? "Your payout details are saved." : "Add these so we can pay you on the 15th."}>
          {payout && (
            <div className="card mb-4 flex items-center gap-4 p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 ring-1 ring-cyan-400/25"><MethodIcon method={payout.method} /></span>
              <div className="text-sm">
                <div className="font-semibold text-slate-100">{methodLabel(payout.method)} · {payout.hint ?? "••••"}</div>
                <div className="text-xs text-slate-500">{payout.currency} · {payout.country} · updated {day(payout.updated_at)}. For your security we never show saved details again.</div>
              </div>
            </div>
          )}
          {isOwner ? (
            <div className="card p-5"><PayoutForm partnerId={id} saved={payout ? { method: payout.method, hint: payout.hint } : null} /></div>
          ) : (
            !payout && <p className="text-sm text-amber-300">This affiliate has not added payout details yet.</p>
          )}
        </Section>
      </div>

      {nextPayout.length > 0 && (
        <Section title={`Scheduled for ${day(partner.next_payout_date)}`} hint="These commissions are included in your next payout.">
          <PaymentsTable rows={nextPayout} />
        </Section>
      )}

      <Section title="Payout history" hint="Each payout we have sent you.">
        <TableCard min={520}>
          <thead><tr><th className="th">Sent on</th><th className="th">Reference</th><th className="th text-right">Commissions</th><th className="th text-right">Amount</th></tr></thead>
          <tbody className="divide-y divide-slate-800/70">
            {payouts.map((p) => (
              <tr key={`${p.when}-${p.ref}`} className="row">
                <td className="td text-slate-300">{day(p.when)}</td>
                <td className="td text-slate-300">{p.ref ?? "—"}</td>
                <td className="td num text-right">{p.count}</td>
                <td className="td num text-right font-semibold">{money(p.total, cur)}</td>
              </tr>
            ))}
            {payouts.length === 0 && <tr><td colSpan={4} className="td py-10 text-center text-slate-500">No payouts sent yet.</td></tr>}
          </tbody>
        </TableCard>
      </Section>

      <Section title="All commissions" hint="Every commission, from payment to payout." action={<ExportLink id={id} type="payments" />}>
        <PaymentsTable rows={payments} empty="Commissions appear here after a referred customer pays." />
      </Section>
    </PartnerFrame>
  );
}
