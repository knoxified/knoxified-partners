import { requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";
import { day } from "@/lib/format";
import { Pill, Section, TableCard } from "@/components/ui";
import { Shell } from "../../shell";
import { InviteForm } from "./invite-form";
import { revokeInvite } from "./actions";

export const dynamic = "force-dynamic";

export default async function InvitesPage() {
  const viewer = await requireAdmin();
  const { data } = await adminClient()
    .from("partner_invites")
    .select("id, code_hint, label, commission_rate, commission_rate_year2, created_at, expires_at, used_at, revoked_at, partners:used_partner_id(name)")
    .order("created_at", { ascending: false })
    .limit(60);

  const rows = (data ?? []).map((r: any) => {
    const partner = Array.isArray(r.partners) ? r.partners[0] : r.partners;
    const status = r.used_at ? "Used" : r.revoked_at ? "Revoked" : new Date(r.expires_at).getTime() < Date.now() ? "Expired" : "Unused";
    return { ...r, status, partnerName: partner?.name as string | undefined };
  });

  return (
    <Shell email={viewer.email} role="admin">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Invitation <span className="gradient-text">codes</span></h1>
      <p className="mt-2 text-slate-400">Create a code, send it to the affiliate, and they do the rest: details, email check, signature, and their dashboard.</p>

      <div className="mt-8 card p-5"><InviteForm /></div>

      <div className="mt-10">
        <Section title="Recent invitations">
          <TableCard min={780}>
            <thead><tr><th className="th">Note</th><th className="th">Code ends</th><th className="th text-right">Rates</th><th className="th">Created</th><th className="th">Expires</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((r: any) => (
                <tr key={r.id} className="row">
                  <td className="td">{r.label || "—"}{r.partnerName && <div className="text-xs text-slate-500">Joined as {r.partnerName}</div>}</td>
                  <td className="td font-mono text-xs text-slate-400">…{r.code_hint}</td>
                  <td className="td num text-right">{r.commission_rate}% / {r.commission_rate_year2}%</td>
                  <td className="td text-slate-300">{day(r.created_at)}</td>
                  <td className="td text-slate-300">{day(r.expires_at)}</td>
                  <td className="td"><Pill tone={r.status === "Used" ? "green" : r.status === "Unused" ? "cyan" : "slate"}>{r.status}</Pill></td>
                  <td className="td text-right">
                    {r.status === "Unused" && (
                      <form action={revokeInvite}><input type="hidden" name="id" value={r.id} /><button className="text-sm text-rose-300 hover:text-rose-200">Revoke</button></form>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="td py-10 text-center text-slate-500">No invitations yet.</td></tr>}
            </tbody>
          </TableCard>
        </Section>
      </div>
    </Shell>
  );
}
