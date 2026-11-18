import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { listPartners } from "@/lib/data";
import { money } from "@/lib/format";
import { Avatar, Pill, Stat, TableCard } from "@/components/ui";
import { Shell } from "./shell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role === "partner" && viewer.partnerId) redirect(`/p/${viewer.partnerId}`);

  if (viewer.role !== "admin") {
    return (
      <Shell email={viewer.email} role="none">
        <div className="card mx-auto mt-16 max-w-lg p-8 text-center">
          <h1 className="text-xl font-semibold">No access yet</h1>
          <p className="mt-2 text-slate-400">
            This login is not linked to an affiliate profile. Contact Knoxified and ask for a fresh sign-in link.
          </p>
        </div>
      </Shell>
    );
  }

  const partners = await listPartners();
  const total = (key: "in_hold" | "payable_now" | "paid_to_date") => partners.reduce((s, p) => s + p[key], 0);

  return (
    <Shell email={viewer.email} role="admin">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Affiliate <span className="gradient-text">overview</span>
        </h1>
        <p className="mt-2 text-slate-400">Everyone in one place. Open an affiliate to see their page exactly as they see it.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Affiliates" value={String(partners.length)} tone="cyan" />
        <Stat label="Payable now" value={money(total("payable_now"))} tone="amber" hint="Hold has passed" />
        <Stat label="In hold" value={money(total("in_hold"))} hint="21 days after payment" />
        <Stat label="Paid to date" value={money(total("paid_to_date"))} tone="green" />
      </div>

      <TableCard min={860}>
        <thead>
          <tr>
            <th className="th">Affiliate</th><th className="th">Code</th>
            <th className="th text-right">Visits</th><th className="th text-right">Signups</th><th className="th text-right">Paying</th>
            <th className="th text-right">In hold</th><th className="th text-right">Payable</th><th className="th text-right">Paid</th><th className="th" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {partners.map((p) => (
            <tr key={p.partner_id} className="row">
              <td className="td">
                <Link href={`/p/${p.partner_id}`} className="flex items-center gap-3">
                  <Avatar name={p.name} />
                  <span>
                    <span className="block font-semibold text-slate-50 hover:text-cyan-300">{p.name}</span>
                    <span className="block text-xs text-slate-500">{p.company || p.email}</span>
                  </span>
                  {p.status !== "active" && <Pill tone="amber">{p.status}</Pill>}
                </Link>
              </td>
              <td className="td font-mono text-xs text-slate-400">{p.ref_code}</td>
              <td className="td num text-right">{p.visits}</td>
              <td className="td num text-right">{p.signups}</td>
              <td className="td num text-right">{p.paying_customers}</td>
              <td className="td num text-right">{money(p.in_hold)}</td>
              <td className="td num text-right text-amber-300">{money(p.payable_now)}</td>
              <td className="td num text-right text-emerald-300">{money(p.paid_to_date)}</td>
              <td className="td text-right">
                <Link href={`/p/${p.partner_id}`} className="text-sm font-medium text-cyan-400 hover:text-cyan-300">Open →</Link>
              </td>
            </tr>
          ))}
          {partners.length === 0 && (
            <tr><td colSpan={9} className="td py-12 text-center text-slate-500">No affiliates yet. Add one in Supabase with add_partner().</td></tr>
          )}
        </tbody>
      </TableCard>
      <p className="mt-4 text-xs text-slate-500">Commission is calculated on what the customer pays, before payment fees.</p>
    </Shell>
  );
}
