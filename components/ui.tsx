import type { ReactNode } from "react";

const PILL = {
  green: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
  amber: "bg-amber-500/15 text-amber-300 ring-amber-400/25",
  cyan: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/25",
  slate: "bg-slate-500/15 text-slate-300 ring-slate-400/20",
  red: "bg-rose-500/15 text-rose-300 ring-rose-400/25",
} as const;
export type Tone = keyof typeof PILL;

export function Pill({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${PILL[tone]}`}>{children}</span>;
}

const STAT = { amber: "text-amber-300", green: "text-emerald-300", cyan: "text-cyan-300", none: "text-slate-50" } as const;

export function Stat({ label, value, tone = "none", hint }: { label: string; value: string; tone?: keyof typeof STAT; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`num mt-1.5 text-2xl font-semibold tracking-tight ${STAT[tone]}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/80 to-blue-600/80 text-xs font-bold text-white shadow-[0_0_14px_rgba(6,182,212,0.35)]">
      {initials}
    </span>
  );
}

export function Section({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-50">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-slate-400">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TableCard({ children, min = 820 }: { children: ReactNode; min?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ minWidth: min }}>{children}</table>
      </div>
    </div>
  );
}
