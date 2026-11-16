import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { getAgreementMeta, getCustomers, getPartner, getPayoutMeta } from "@/lib/data";
import { day } from "@/lib/format";
import { Pill, Section, TableCard } from "@/components/ui";
import { methodLabel } from "@/lib/payout-options";
import { PartnerFrame } from "../frame";
import { AccessForm } from "../access-form";

export const dynamic = "force-dynamic";

export default async function PartnerAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "admin") notFound();
  const partner = await getPartner(id);
  if (!partner) notFound();
  const [customers, agreement, payout] = await Promise.all([getCustomers(id, true), getAgreementMeta(id), getPayoutMeta(id)]);

  return (
    <PartnerFrame viewer={viewer} partner={partner} id={id} title="Admin" subtitle={<><Pill tone="amber">Admin only</Pill> <span className="ml-2">Affiliates never see this page.</span></>}>
      <div className="card mb-8 grid gap-2 p-5 text-sm text-slate-300 sm:grid-cols-2">
        <div>Agreement: {agreement ? <Link href={`/p/${id}/agreement`} className="text-cyan-300 hover:underline">signed {day(agreement.signed_at)} (v{agreement.terms_version}, timestamp {agreement.tsa_status})</Link> : <span className="text-amber-300">none on file</span>}</div>
        <div>Payout details: {payout ? <span>{methodLabel(payout.method)} · {payout.currency} · {payout.country} · updated {day(payout.updated_at)}</span> : <span className="text-amber-300">not added yet</span>}</div>
      </div>

      <Section title="Sign-in access" hint={`Creates a one-time link for ${partner.name} to set a password, for first access or a reset.`}>
        <div className="card p-5"><AccessForm partnerId={id} defaultEmail={partner.email} /></div>
      </Section>

      <Section title="Customer identities" hint="Real names and emails behind each customer ref. Never shown to the affiliate.">
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
      </Section>
    </PartnerFrame>
  );
}
