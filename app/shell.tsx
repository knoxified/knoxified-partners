import Link from "next/link";

export function Shell({ email, role, children }: { email: string; role: "admin" | "partner" | "none"; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-8 w-8 object-contain opacity-90 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-opacity group-hover:opacity-100" />
            <span className="text-xl font-bold tracking-tight text-slate-50">Knoxified</span>
            <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 ring-1 ring-inset ring-cyan-400/25">
              {role === "admin" ? "Admin console" : "Partners"}
            </span>
          </Link>
          <form action="/signout" method="post" className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:inline">{email}</span>
            <button className="btn btn-ghost !py-1.5">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Knoxified · Partner program
      </footer>
    </div>
  );
}
