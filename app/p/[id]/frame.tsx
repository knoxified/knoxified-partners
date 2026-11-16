import Link from "next/link";
import type { ReactNode } from "react";
import { Shell } from "../../shell";
import { PartnerTabs } from "./tabs";
import { Pill } from "@/components/ui";
import type { PartnerDetail } from "@/lib/data";

// Shared top of every affiliate page: admin banner, the affiliate's name, and the section tabs.
export function PartnerFrame({
  viewer, partner, id, title, subtitle, children,
}: {
  viewer: { email: string; role: "admin" | "partner" | "none" }; partner: PartnerDetail; id: string; title: string; subtitle?: ReactNode; children: ReactNode;
}) {
  const isAdmin = viewer.role === "admin";
  return (
    <Shell email={viewer.email} role={viewer.role}>
      {isAdmin && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3">
          <p className="text-sm text-cyan-100"><span className="font-semibold">Admin view.</span> You see exactly what {partner.name} sees. Admin tools are under the Admin tab.</p>
          <Link href="/" className="btn btn-ghost !py-1.5">← All affiliates</Link>
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-400">
        <span className="font-medium text-slate-200">{partner.name}</span>
        <Pill tone={partner.status === "active" ? "green" : "amber"}>{partner.status === "active" ? "Active partner" : partner.status}</Pill>
      </div>
      <PartnerTabs id={id} isAdmin={isAdmin} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-slate-400">{subtitle}</p>}
      </div>
      <div className="pb-24 md:pb-0">{children}</div>
    </Shell>
  );
}
