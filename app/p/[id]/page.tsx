import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canView, getViewer } from "@/lib/viewer";
import { getCustomers, getPartner, getPayments, type PaymentRow } from "@/lib/data";
import { day, money, paymentStatus } from "@/lib/format";
import { Pill, Section, Stat, TableCard } from "@/components/ui";
import { Shell } from "../../shell";
import { LinkTool } from "./link-tool";
import { AccessForm } from "./access-form";

export const dynamic = "force-dynamic";

export default async function PartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!canView(viewer, id)) notFound();

  const isAdmin = viewer.role === "admin";
  const partner = await getPartner(id);
  if (!partner) notFound();
  const [customers, payments] = await Promise.all([getCustomers(id, isAdmin), getPayments(id)]);

  const cur = partner.currency;
  const nextPayout = payments.filter(
    (p) => p.status === "pending" && new Date(p.scheduled_payout).getTime() <= new Date(partner.next_payout_date).getTime()
  );
  const mainSite = (process.env.MAIN_SITE_URL || "https://knoxified.org").replace(/\/$/, "");

  return (
    <Shell email={viewer.email} role={viewer.role}>
      {isAdmin && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3">
          <p className="text-sm text-cyan-100">
            <span className="font-semibold">Admin view.</span> You are seeing exactly what {partner.name} sees, plus admin tools at the bottom.
          </p>
          <Link href="/" className="btn btn-ghost !py-1.5">← All affiliates</Link>
        </div>
      )}

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{partner.name}</h1>
          <Pill tone={partner.status === "active" ? "green" : "amber"}>{partner.status === "active" ? "Active partner" : partner.status}</Pill>
        </div>
        <p className="mt-2 text-slate-400">
          {partner.company ? `${partner.company} · ` : ""}
          {partner.year1_rate}% of net revenue in a customer&apos;s first year, {partner.year2_rate}% in the second.
        </p>
      </div>

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

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Link visits" value={String(partner.visits)} />
        <Stat label="Signups" value={String(partner.signups)} />
        <Stat label="Paying" value={String(partner.paying_customers)} tone="cyan" />
        <Stat label="In hold" value={money(partner.in_hold, cur)} />
        <Stat label="Payable now" value={money(partner.payable_now, cur)} tone="amber" />
        <Stat label="Paid to date" value={money(partner.paid_to_date, cur)} tone="green" />
      </div>

      {nextPayout.length > 0 && (
        <Section title={`Scheduled for ${day(partner.next_payout_date)}`} hint="These commissions are included in your next payout.">
          <PaymentsTable rows={nextPayout} />
        </Section>
      )}

      <Section title="Referred customers" hint="Businesses that signed up through your link." action={<ExportLink id={id} type="customers" />}>
        <TableCard min={820}>
          <thead>
            <tr>
              <th className="th">Customer</th><th className="th">Location</th><th className="th">Plan</th><th className="th">Status</th>
              <th className="th">Signed up</th><th className="th">First paid</th><th className="th text-right">Payments</th><th className="th text-right">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {customers.map((c) => (
              <tr key={c.customer_key} className="row">
                <td className="td">
                  <div className="font-medium text-slate-50">{c.business_name}</div>
                  <div className="text-xs text-slate-500">Ref {c.customer_key}</div>
                </td>
                <td className="td text-slate-300">{c.location ?? "—"}</td>
                <td className="td text-slate-300">{c.plan_name}</td>
                <td className="td"><Pill tone={c.status === "Paying" ? "green" : "slate"}>{c.status}</Pill></td>
                <td className="td text-slate-300">{day(c.signed_up_at)}</td>
                <td className="td text-slate-300">{day(c.first_paid_at)}</td>
                <td className="td num text-right">{c.payments}</td>
                <td className="td num text-right font-medium">{money(c.total_commission, cur)}</td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={8} className="td py-12 text-center text-slate-500">No referred customers yet.</td></tr>}
          </tbody>
        </TableCard>
      </Section>

      <Section title="Payments and payouts" hint="Every commission, from payment to payout." action={<ExportLink id={id} type="payments" />}>
        <PaymentsTable rows={payments} empty="Commissions appear here after a referred customer pays." />
      </Section>

      <Section title="Your referral link" hint="The first link a visitor clicks gets the credit for 60 days. Add a source or campaign to see which posts convert.">
        <div className="card p-5"><LinkTool base={mainSite} code={partner.ref_code} /></div>
      </Section>

      {isAdmin && (
        <section className="mb-10 rounded-2xl border border-dashed border-amber-400/30 bg-amber-500/[0.04] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Pill tone="amber">Admin only</Pill>
            <span className="text-sm text-slate-400">Affiliates do not see this section.</span>
          </div>

          <h3 className="font-semibold">Sign-in access</h3>
          <p className="mb-3 mt-1 text-sm text-slate-400">Creates a one-time link for {partner.name} to set a password, for first access or a reset.</p>
          <AccessForm partnerId={id} defaultEmail={partner.email} />

          <h3 className="mt-8 font-semibold">Customer identities</h3>
          <p className="mb-3 mt-1 text-sm text-slate-400">Real names and emails behind each customer ref. Never shown to the affiliate.</p>
          <TableCard min={640}>
            <thead><tr><th className="th">Ref</th><th className="th">Business</th><th className="th">Owner</th><th className="th">Email</th></tr></thead>
            <tbody className="divide-y divide-slate-800/70">
              {customers.map((c) => (
                <tr key={c.customer_key} className="row">
                  <td className="td font-mono text-xs text-slate-400">{c.customer_key}</td>
                  <td className="td">{c.business_name}</td>
                  <td className="td text-slate-300">{c.full_name ?? "—"}</td>
                  <td className="td text-slate-300">{c.email ?? "—"}</td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={4} className="td py-8 text-center text-slate-500">No customers yet.</td></tr>}
            </tbody>
          </TableCard>
        </section>
      )}

      <p className="text-xs text-slate-500">
        Customers are shown by business name only. Amounts are in {cur}. Commission is calculated on net revenue after payment fees.
        Refunded or disputed payments are removed before payout.
      </p>
    </Shell>
  );
}

function ExportLink({ id, type }: { id: string; type: "customers" | "payments" }) {
  return (
    <a href={`/p/${id}/export?type=${type}`} className="text-sm font-medium text-cyan-400 hover:text-cyan-300">
      Download CSV
    </a>
  );
}

function PaymentsTable({ rows, empty }: { rows: PaymentRow[]; empty?: string }) {
  return (
    <TableCard min={880}>
      <thead>
        <tr>
          <th className="th">Paid on</th><th className="th">Customer</th><th className="th">Plan</th>
          <th className="th text-right">Net revenue</th><th className="th text-right">Rate</th><th className="th text-right">Commission</th>
          <th className="th">Status</th><th className="th">Payout</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/70">
        {rows.map((p, i) => {
          const s = paymentStatus(p);
          const tone = s.tone === "green" ? "green" : s.tone === "amber" ? "amber" : s.tone === "red" ? "red" : "cyan";
          return (
            <tr key={`${p.paid_at}-${i}`} className="row">
              <td className="td text-slate-300">{day(p.paid_at)}</td>
              <td className="td">
                {p.business_name}
                {p.note && <div className="text-xs text-slate-500">{p.note}</div>}
              </td>
              <td className="td text-slate-300">{p.plan_name ?? "—"}</td>
              <td className="td num text-right">{p.kind === "adjustment" ? "—" : money(p.commission_base, p.currency ?? "USD")}</td>
              <td className="td num text-right">{p.kind === "adjustment" ? "—" : `${p.rate_percent}%`}</td>
              <td className="td num text-right font-semibold">{money(p.commission_amount, p.currency ?? "USD")}</td>
              <td className="td"><Pill tone={tone}>{s.label}</Pill></td>
              <td className="td text-slate-300">
                {p.status === "paid" ? `Paid ${day(p.paid_out_at)}${p.payout_ref ? ` · ${p.payout_ref}` : ""}` : p.status === "void" ? "—" : day(p.scheduled_payout)}
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && <tr><td colSpan={8} className="td py-12 text-center text-slate-500">{empty ?? "Nothing here yet."}</td></tr>}
      </tbody>
    </TableCard>
  );
}
