import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canView, getViewer } from "@/lib/viewer";
import { getCustomers, getPartner, getPayments } from "@/lib/data";
import { day, money } from "@/lib/format";
import { Pill, Section, TableCard } from "@/components/ui";
import { ExportLink } from "@/components/partner-tables";
import { PartnerFrame } from "../frame";

export const dynamic = "force-dynamic";

const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(a / b >= 0.1 ? 0 : 1)}%` : "—");

function Seg({ items, current, href }: { items: Array<[string, string]>; current: string; href: (v: string) => string }) {
  return (
    <div className="inline-flex gap-1 rounded-xl border border-slate-700/70 bg-slate-950/60 p-1">
      {items.map(([v, label]) => (
        <Link key={v} href={href(v)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${current === v ? "neon-tab-active" : "text-slate-400 hover:text-slate-100"}`}>{label}</Link>
      ))}
    </div>
  );
}

export default async function AnalyticsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string; status?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const range = ["30", "90", "all"].includes(sp.range ?? "") ? (sp.range as string) : "all";
  const status = ["paying", "signed"].includes(sp.status ?? "") ? (sp.status as string) : "all";
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!canView(viewer, id)) notFound();
  const partner = await getPartner(id);
  if (!partner) notFound();
  const [customers, payments] = await Promise.all([getCustomers(id, false), getPayments(id)]);
  const cur = partner.currency;

  // Funnel
  const steps = [
    { label: "Link visits", n: partner.visits, note: "People who clicked your link" },
    { label: "Signups", n: partner.signups, note: `${pct(partner.signups, partner.visits)} of visits` },
    { label: "Paying customers", n: partner.paying_customers, note: `${pct(partner.paying_customers, partner.signups)} of signups` },
  ];
  const top = Math.max(1, partner.visits);

  // Earnings by month (last 6), excluding voided commissions
  const months: Array<{ key: string; label: string; total: number }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleString("en", { month: "short", timeZone: "UTC" }), total: 0 });
  }
  for (const p of payments) {
    if (p.status === "void") continue;
    const m = months.find((x) => x.key === p.paid_at.slice(0, 7));
    if (m) m.total += p.commission_amount;
  }
  const maxM = Math.max(1, ...months.map((m) => m.total));

  // Customer filters
  const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 86_400_000;
  const rows = customers.filter((c) => (status === "all" || (status === "paying" ? c.status === "Paying" : c.status !== "Paying")) && (!cutoff || new Date(c.signed_up_at).getTime() >= cutoff));
  const href = (over: Record<string, string>) => {
    const q = new URLSearchParams({ range, status, ...over });
    return `/p/${id}/analytics?${q.toString()}`;
  };

  return (
    <PartnerFrame viewer={viewer} partner={partner} id={id} title="Analytics" subtitle="How your link turns into customers and commission.">
      <Section title="Your funnel" hint="From a click on your link to a paying customer.">
        <div className="card space-y-5 p-5">
          {steps.map((s) => (
            <div key={s.label}>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="font-medium text-slate-100">{s.label}</span>
                <span><span className="num text-lg font-semibold text-slate-50">{s.n}</span> <span className="ml-2 text-xs text-slate-500">{s.note}</span></span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_14px_rgba(34,211,238,0.5)]" style={{ width: `${Math.max(s.n > 0 ? 3 : 0, Math.round((s.n / top) * 100))}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Commission by month" hint="Your last six months, before holds and payouts.">
        <div className="card p-5">
          <div className="flex h-44 items-end gap-3">
            {months.map((m) => (
              <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="num text-[0.68rem] text-slate-400">{m.total > 0 ? money(m.total, cur) : ""}</div>
                <div className="flex w-full flex-1 items-end"><div className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.35)]" style={{ height: `${m.total > 0 ? Math.max(6, Math.round((m.total / maxM) * 100)) : 2}%`, opacity: m.total > 0 ? 1 : 0.25 }} /></div>
                <div className="text-xs text-slate-500">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Referred customers" hint="Businesses that signed up through your link." action={<ExportLink id={id} type="customers" />}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Seg items={[["all", "All time"], ["90", "90 days"], ["30", "30 days"]]} current={range} href={(v) => href({ range: v })} />
          <Seg items={[["all", "Everyone"], ["paying", "Paying"], ["signed", "Signed up"]]} current={status} href={(v) => href({ status: v })} />
          <span className="text-sm text-slate-500">{rows.length} customer{rows.length === 1 ? "" : "s"}</span>
        </div>
        <TableCard min={820}>
          <thead>
            <tr>
              <th className="th">Customer</th><th className="th">Location</th><th className="th">Plan</th><th className="th">Status</th>
              <th className="th">Signed up</th><th className="th">First paid</th><th className="th text-right">Payments</th><th className="th text-right">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {rows.map((c) => (
              <tr key={c.customer_key} className="row">
                <td className="td"><div className="font-medium text-slate-50">{c.business_name}</div><div className="text-xs text-slate-500">Ref {c.customer_key}</div></td>
                <td className="td text-slate-300">{c.location ?? "—"}</td>
                <td className="td text-slate-300">{c.plan_name}</td>
                <td className="td"><Pill tone={c.status === "Paying" ? "green" : "slate"}>{c.status}</Pill></td>
                <td className="td text-slate-300">{day(c.signed_up_at)}</td>
                <td className="td text-slate-300">{day(c.first_paid_at)}</td>
                <td className="td num text-right">{c.payments}</td>
                <td className="td num text-right font-medium">{money(c.total_commission, cur)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="td py-12 text-center text-slate-500">No customers match these filters.</td></tr>}
          </tbody>
        </TableCard>
        <p className="mt-3 text-xs text-slate-500">Customers are shown by business name only. The CSV contains everything on the full list, not just the current filter.</p>
      </Section>
    </PartnerFrame>
  );
}
