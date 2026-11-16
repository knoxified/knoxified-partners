import { Pill, TableCard } from "@/components/ui";
import { day, money, paymentStatus } from "@/lib/format";
import type { PaymentRow } from "@/lib/data";

export function ExportLink({ id, type }: { id: string; type: "customers" | "payments" }) {
  return (
    <a href={`/p/${id}/export?type=${type}`} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 px-3 py-1.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/10 hover:shadow-[0_0_16px_rgba(34,211,238,0.2)]">
      ⬇ Download CSV
    </a>
  );
}

export function PaymentsTable({ rows, empty }: { rows: PaymentRow[]; empty?: string }) {
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
              <td className="td">{p.business_name}{p.note && <div className="text-xs text-slate-500">{p.note}</div>}</td>
              <td className="td text-slate-300">{p.plan_name ?? "—"}</td>
              <td className="td num text-right">{p.kind === "adjustment" ? "—" : money(p.commission_base, p.currency ?? "USD")}</td>
              <td className="td num text-right">{p.kind === "adjustment" ? "—" : `${p.rate_percent}%`}</td>
              <td className="td num text-right font-semibold">{money(p.commission_amount, p.currency ?? "USD")}</td>
              <td className="td"><Pill tone={tone}>{s.label}</Pill></td>
              <td className="td text-slate-300">{p.status === "paid" ? `Paid ${day(p.paid_out_at)}${p.payout_ref ? ` · ${p.payout_ref}` : ""}` : p.status === "void" ? "—" : day(p.scheduled_payout)}</td>
            </tr>
          );
        })}
        {rows.length === 0 && <tr><td colSpan={8} className="td py-12 text-center text-slate-500">{empty ?? "Nothing here yet."}</td></tr>}
      </tbody>
    </TableCard>
  );
}
