"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: [string, string][] = [
  ["/", "Overview"],
  ["/admin/invites", "Invites"],
  ["/admin/payouts", "Payouts"],
  ["/admin/settings", "Settings"],
];

// Phone-sized admin navigation. The desktop links in the header are hidden below the md breakpoint,
// so this strip carries the same four destinations on small screens.
export function AdminNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="border-t border-slate-800/70 md:hidden" aria-label="Admin sections">
      <div className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none]">
        {ITEMS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium ${active(href) ? "neon-tab-active" : "text-slate-400"}`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
