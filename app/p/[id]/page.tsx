import { notFound, redirect } from "next/navigation";
import { canView, getViewer } from "@/lib/viewer";
import { getCustomers, getPartner, getPayments, type PaymentRow } from "@/lib/data";
import { day, money, paymentStatus } from "@/lib/format";
import { Shell } from "../../shell";
import { LinkTool } from "./link-tool";
import { AccessForm } from "./access-form";

export const dynamic = "force-dynamic";

const TONES = {
  green: "bg-emerald-500/15 text-emerald-300",
  amber: "bg-amber-500/15 text-amber-300",
  slate: "bg-slate-500/15 text-slate-300",
  red: "bg-red-500/15 text-red-300",
} as const;

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
    <Shell email={viewer.email} title={partner.name}
      subtitle={`${partner.company ? partner.company + " · " : ""}${partner.year1_rate}% of net revenue in a customer's first year, ${partner.year2_rate}% in the second.`}
      showAll={isAdmin}>
      {/* Next payout */}
      <section className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <div className="text-xs uppercase tracking-wide text-emerald-300">Next payout · {day(partner.next_payout_date)}</div>
        <div className="mt-1 text-3xl font-semibold">{money(partner.scheduled_amount, cur)}</div>
        <div className="mt-1 text-sm text-slate-400">
          {partner.scheduled_count} payment{partner.scheduled_count === 1 ? "" : "s"} scheduled. Each commission is paid on the first 15th after its 21-day hold ends.
          {partner.status !== "active" && <span className="ml-1 text-amber-300">Account status: {partner.status}.</span>}
        </div>
      </section>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Link visits" value={String(partner.visits)} />
        <Stat label="Signups" value={String(partner.signups)} />
        <Stat label="Paying customers" value={String(partner.paying_customers)} />
        <Stat label="In hold" value={money(partner.in_hold, cur)} />
        <Stat label="Payable now" value={money(partner.payable_now, cur)} tone="amber" />
        <Stat label="Paid to date" value={money(partner.paid_to_date, cur)} tone="green" />
      </div>

      {nextPayout.length > 0 && (
        <Section title={`Scheduled for ${day(partner.next_payout_date)}`}>
          <PaymentsTable rows={nextPayout} />
        </Section>
      )}

      <Section title="Referred customers" action={<ExportLink id={id} type="customers" />}>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Customer</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th><th className="px-4 py-3">Signed up</th><th className="px-4 py-3">First paid</th>
                <th className="px-4 py-3 text-right">Payments</th><th className="px-4 py-3 text-right">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {customers.map((c) => (
                <tr key={c.customer_key}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.business_name}</div>
                    <div className="text-xs text-slate-500">
                      Ref {c.customer_key}{isAdmin && (c.full_name || c.email) ? ` · ${[c.full_name, c.email].filter(Boolean).join(" · ")}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{c.location ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{c.plan_name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "Paying" ? TONES.green : TONES.slate}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{day(c.signed_up_at)}</td>
                  <td className="px-4 py-3 text-slate-300">{day(c.first_paid_at)}</td>
                  <td className="px-4 py-3 text-right">{c.payments}</td>
                  <td className="px-4 py-3 text-right">{money(c.total_commission, cur)}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No referred customers yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="All payments and payouts" action={<ExportLink id={id} type="payments" />}>
        <PaymentsTable rows={payments} empty="Commissions appear here after a referred customer pays." />
      </Section>

      <Section title="Your referral link">
        <p className="mb-3 text-sm text-slate-400">
          Share this link. The first affiliate link someone clicks gets the credit for 60 days. Add a source or campaign to see which
          of your posts brings customers.
        </p>
        <LinkTool base={mainSite} code={partner.ref_code} />
      </Section>

      {isAdmin && (
        <Section title="Sign-in access (admin)">
          <p className="mb-3 text-sm text-slate-400">
            Creates a one-time link for this affiliate to set their password. Use it for first access or if they forget their password.
          </p>
          <AccessForm partnerId={id} defaultEmail={partner.email} />
        </Section>
      )}

      <p className="mt-10 text-xs text-slate-500">
        Customer names are shown as business names only. Amounts are in {cur}. Commission is calculated on net revenue after payment fees.
        Refunded or disputed payments are removed before payout.
      </p>
    </Shell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "amber" | "green" }) {
  const color = tone === "amber" ? "text-amber-300" : tone === "green" ? "text-emerald-300" : "text-slate-100";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ExportLink({ id, type }: { id: string; type: "customers" | "payments" }) {
  return (
    <a href={`/p/${id}/export?type=${type}`} className="text-sm text-emerald-400 hover:underline">
      Download CSV
    </a>
  );
}

function PaymentsTable({ rows, empty }: { rows: PaymentRow[]; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3">Paid on</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3 text-right">Net revenue</th><th className="px-4 py-3 text-right">Rate</th>
            <th className="px-4 py-3 text-right">Commission</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payout</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((p, i) => {
            const s = paymentStatus(p);
            return (
              <tr key={`${p.paid_at}-${i}`}>
                <td className="px-4 py-3 text-slate-300">{day(p.paid_at)}</td>
                <td className="px-4 py-3">
                  {p.business_name}
                  {p.note && <div className="text-xs text-slate-500">{p.note}</div>}
                </td>
                <td className="px-4 py-3 text-slate-300">{p.plan_name ?? "—"}</td>
                <td className="px-4 py-3 text-right">{p.kind === "adjustment" ? "—" : money(p.commission_base, p.currency ?? "USD")}</td>
                <td className="px-4 py-3 text-right">{p.kind === "adjustment" ? "—" : `${p.rate_percent}%`}</td>
                <td className="px-4 py-3 text-right font-medium">{money(p.commission_amount, p.currency ?? "USD")}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${TONES[s.tone]}`}>{s.label}</span></td>
                <td className="px-4 py-3 text-slate-300">
                  {p.status === "paid" ? `Paid ${day(p.paid_out_at)}${p.payout_ref ? ` · ${p.payout_ref}` : ""}` : p.status === "void" ? "—" : day(p.scheduled_payout)}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">{empty ?? "Nothing here yet."}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
