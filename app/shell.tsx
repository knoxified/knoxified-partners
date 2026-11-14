import Link from "next/link";

export function Shell({
  email, title, subtitle, children, showAll,
}: { email: string; title: string; subtitle?: string; children: React.ReactNode; showAll?: boolean }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold tracking-wide text-emerald-400">KNOXIFIED PARTNERS</span>
          {showAll && <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">← All affiliates</Link>}
        </div>
        <form action="/signout" method="post" className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">{email}</span>
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-900">Sign out</button>
        </form>
      </header>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}
