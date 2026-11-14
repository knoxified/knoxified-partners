import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { listPartners } from "@/lib/data";
import { day, money } from "@/lib/format";
import { Shell } from "./shell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role === "partner" && viewer.partnerId) redirect(`/p/${viewer.partnerId}`);

  if (viewer.role !== "admin") {
    return (
      <Shell email={viewer.email} title="No access">
        <p className="text-slate-400">
          This account is not linked to an affiliate profile yet. Contact Knoxified and ask for a fresh invite link.
        </p>
      </Shell>
    );
  }

  const partners = await listPartners();
  const total = (key: "in_hold" | "payable_now" | "paid_to_date") => partners.reduce((s, p) => s + p[key], 0);

  return (
    <Shell email={viewer.email} title="Affiliates" subtitle="Everyone's numbers. Click a name to open their page, exactly as they see it.">
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Affiliates" value={String(partners.length)} />
        <Card label="Payable now" value={money(total("payable_now"))} tone="amber" />
        <Card label="In hold" value={money(total("in_hold"))} />
        <Card label="Paid to date" value={money(total("paid_to_date"))} tone="green" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Affiliate</th><th className="px-4 py-3">Code</th>
              <th className="px-4 py-3 text-right">Visits</th><th className="px-4 py-3 text-right">Signups</th>
              <th className="px-4 py-3 text-right">Paying</th><th className="px-4 py-3 text-right">In hold</th>
              <th className="px-4 py-3 text-right">Payable</th><th className="px-4 py-3 text-right">Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {partners.map((p) => (
              <tr key={p.partner_id} className="hover:bg-slate-900/60">
                <td className="px-4 py-3">
                  <Link href={`/p/${p.partner_id}`} className="font-medium text-emerald-400 hover:underline">{p.name}</Link>
                  <div className="text-xs text-slate-500">{p.company || p.email}{p.status !== "active" ? ` · ${p.status}` : ""}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.ref_code}</td>
                <td className="px-4 py-3 text-right">{p.visits}</td>
                <td className="px-4 py-3 text-right">{p.signups}</td>
                <td className="px-4 py-3 text-right">{p.paying_customers}</td>
                <td className="px-4 py-3 text-right">{money(p.in_hold)}</td>
                <td className="px-4 py-3 text-right text-amber-300">{money(p.payable_now)}</td>
                <td className="px-4 py-3 text-right text-emerald-300">{money(p.paid_to_date)}</td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No affiliates yet. Add one in Supabase with add_partner().</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-slate-500">As of {day(new Date().toISOString())}. Commission is calculated on the net amount after payment fees.</p>
    </Shell>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone?: "amber" | "green" }) {
  const color = tone === "amber" ? "text-amber-300" : tone === "green" ? "text-emerald-300" : "text-slate-100";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
