import Link from "next/link";
import { TermsView } from "@/components/terms-view";
import { TERMS, TERMS_DATE, TERMS_VERSION } from "@/lib/terms";

export const metadata = {
  title: "Knoxified Affiliate Program Terms",
  description: "The full terms of the Knoxified affiliate and referral partner program, readable without an account.",
};

// Public, read-only copy of the exact Terms affiliates sign. No login needed.
export default function PublicTermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/how-it-works" className="mb-8 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-9 w-9 object-contain drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
        <span className="text-xl font-bold tracking-tight">Knoxified</span>
        <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 ring-1 ring-inset ring-cyan-400/25">Partners</span>
      </Link>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Affiliate Program <span className="gradient-text">Terms</span></h1>
      <p className="mt-3 text-slate-400">
        Version {TERMS_VERSION}, {TERMS_DATE}. This is the exact text affiliates sign. Prefer the short version? Read <Link href="/how-it-works" className="text-cyan-400 hover:underline">how the program works</Link>.
      </p>

      <nav className="card mt-6 p-4" aria-label="Sections">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Jump to</div>
        <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {TERMS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block py-1 text-slate-300 hover:text-cyan-300">{i + 1}. {s.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="card mt-6 p-5 sm:p-7">
        <TermsView />
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        Questions? Email affiliates@knoxified.org · <Link href="/join" className="text-cyan-400 hover:underline">Join the program</Link>
      </p>
    </main>
  );
}
