"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const icons: Record<string, ReactNode> = {
  overview: <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...s} d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z" /></svg>,
  analytics: <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...s} d="M4 20V10m6 10V4m6 16v-7m4 7H3" /></svg>,
  payments: <svg viewBox="0 0 24 24" className="h-5 w-5"><rect {...s} x="3" y="6" width="18" height="13" rx="2" /><path {...s} d="M3 10h18M16 15h2" /></svg>,
  agreement: <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...s} d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" /></svg>,
  admin: <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...s} d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /></svg>,
};

export function PartnerTabs({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const path = usePathname();
  const base = `/p/${id}`;
  const tabs = [
    { key: "overview", label: "Overview", href: base },
    { key: "analytics", label: "Analytics", href: `${base}/analytics` },
    { key: "payments", label: "Payments", href: `${base}/payments` },
    { key: "agreement", label: "Agreement", href: `${base}/agreement` },
    ...(isAdmin ? [{ key: "admin", label: "Admin", href: `${base}/admin` }] : []),
  ];
  const active = (href: string) => (href === base ? path === base : path.startsWith(href));
  return (
    <>
      <nav className="mb-8 hidden gap-2 md:flex" aria-label="Sections">
        {tabs.map((t) => (
          <Link key={t.key} href={t.href} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${active(t.href) ? "neon-tab-active" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"}`}>
            {icons[t.key]}{t.label}
          </Link>
        ))}
      </nav>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-400/20 bg-slate-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Sections">
        <div className="mx-auto flex max-w-lg justify-around px-2 py-1.5">
          {tabs.map((t) => (
            <Link key={t.key} href={t.href} className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[0.68rem] font-medium ${active(t.href) ? "neon-tab-active" : "text-slate-500"}`}>
              {icons[t.key]}<span className="truncate">{t.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
