import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canView, getViewer } from "@/lib/viewer";
import { getAgreementMeta, getPartner, getPayments, getPayoutMeta, getSignatureStatus } from "@/lib/data";
import { milestones, nextGoal } from "@/lib/milestones";
import { day, money } from "@/lib/format";
import { Section, Stat } from "@/components/ui";
import { PaymentsTable } from "@/components/partner-tables";
import { PartnerFrame } from "./frame";
import { LinkTool } from "./link-tool";

export const dynamic = "force-dynamic";

export default async function PartnerOverview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const { id } = await params;
  const { welcome } = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!canView(viewer, id)) notFound();
  const partner = await getPartner(id);
  if (!partner) notFound();
  const [payments, payout, sig, agreement] = await Promise.all([getPayments(id), getPayoutMeta(id), getSignatureStatus(id), getAgreementMeta(id)]);
  const isOwner = viewer.role === "partner";
  const goal = nextGoal(partner);
  const badges = milestones(partner);
  const cur = partner.currency;
  const mainSite = (process.env.MAIN_SITE_URL || "https://knoxified.org").replace(/\/$/, "");
  const recent = payments.slice(0, 5);

  return (
    <PartnerFrame viewer={viewer} partner={partner} id={id} title="Overview" subtitle={<>{partner.company ? `${partner.company} · ` : ""}{partner.year1_rate}% of net revenue in a customer&apos;s first year, {partner.year2_rate}% in the second.</>}>
      {welcome && isOwner && (
        <div className="glow-border mb-6">
          <div className="glow-inner p-5">
            <div className="text-lg font-semibold">🎉 Welcome aboard, {partner.name.split(" ")[0]}. You&apos;re in.</div>
            <p className="mt-1 text-sm text-slate-400">Your agreement is {sig?.pending ? "accepted" : "signed"} and your link is live below. Add your payout details under Payments so your first commission can be paid, and check your email for your signed copy.</p>
          </div>
        </div>
      )}

      {sig?.pending && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-100">
            <span className="font-semibold">Agreement accepted ✓ · Signature image missing.</span>{" "}
            {isOwner ? "Add it to complete your record. It takes a minute." : `${partner.name} has not added a signature image yet.`}
          </p>
          {isOwner && <Link href={`/p/${id}/signature`} className="btn btn-primary !py-1.5">Add my signature</Link>}
        </div>
      )}

      <div className="glow-border mb-6">
        <div className="glow-inner flex flex-wrap items-end justify-between gap-6 p-6">
          <div>
            <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-cyan-300">Next payout · {day(partner.next_payout_date)}</div>
            <div className="num gradient-text mt-2 text-5xl font-bold tracking-tight">{money(partner.scheduled_amount, cur)}</div>
          </div>
          <p className="max-w-sm text-sm text-slate-400">
            {partner.scheduled_count} payment{partner.scheduled_count === 1 ? "" : "s"} scheduled. Each commission is paid on the first 15th after its 21-day hold ends.
          </p>
        </div>
      </div>

      {isOwner && !payout && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3">
          <p className="text-sm text-cyan-100"><span className="font-semibold">One step left to get paid.</span> Tell us where to send your payouts.</p>
          <Link href={`/p/${id}/payments#payout-details`} className="btn btn-primary !py-1.5">Add payout details</Link>
        </div>
      )}

      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Paying customers" value={String(partner.paying_customers)} tone="cyan" />
        <Stat label="In hold" value={money(partner.in_hold, cur)} />
        <Stat label="Payable now" value={money(partner.payable_now, cur)} tone="amber" />
        <Stat label="Paid to date" value={money(partner.paid_to_date, cur)} tone="green" />
      </div>

      <Section title="Your referral link" hint="The first link a visitor clicks gets the credit for 60 days. Add a source or campaign to see which posts convert.">
        <div className="card p-5"><LinkTool base={mainSite} code={partner.ref_code} /></div>
      </Section>

      <Section title="Your progress" hint="Small wins, tracked automatically.">
        <div className="card p-5">
          {goal ? (
            <div className="mb-4">
              <div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">Next goal: {goal.label}</span><span className="text-slate-400">{goal.remaining}</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${Math.max(4, Math.round(goal.progress * 100))}%` }} /></div>
            </div>
          ) : <p className="mb-4 text-sm text-emerald-300">You have reached every milestone so far. More are coming.</p>}
          <div className="flex flex-wrap gap-2">
            {badges.map((m) => (
              <span key={m.id} className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${m.achieved ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25" : "bg-slate-800/60 text-slate-500 ring-slate-700"}`}>
                {m.achieved ? "✓ " : ""}{m.label}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Recent activity" hint="Your latest five commissions." action={<Link href={`/p/${id}/payments`} className="text-sm font-medium text-cyan-400 hover:text-cyan-300">See all →</Link>}>
        <PaymentsTable rows={recent} empty="Commissions appear here after a referred customer pays." />
      </Section>

      {agreement && (
        <p className="text-xs text-slate-500">
          Agreement {sig?.pending ? "accepted" : "signed"} {day(agreement.signed_at)} · <Link href={`/p/${id}/agreement`} className="text-cyan-400 hover:underline">view and download</Link>. Amounts are in {cur}. Commission is calculated on what the customer pays, before payment fees. Refunded or disputed payments are removed before payout.
        </p>
      )}
    </PartnerFrame>
  );
}
