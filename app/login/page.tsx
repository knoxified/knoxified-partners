import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-2">
      <section>
        <div className="mb-8 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.55)]" />
          <span className="text-2xl font-bold tracking-tight">Knoxified</span>
        </div>
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-cyan-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" /> Partner program
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Grow with <span className="gradient-text">AI voice agents</span>
        </h1>
        <p className="mt-5 max-w-md text-lg text-slate-400">
          See every visit, signup and payment your link brings in, and exactly what you are paid and when.
        </p>
        <ul className="mt-8 space-y-3 text-slate-300">
          {["Live tracking from click to first payment", "Clear commission on every customer payment", "Scheduled monthly payouts you can check any time"].map((t) => (
            <li key={t} className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400">✓</span>{t}
            </li>
          ))}
        </ul>
      </section>

      <section className="glow-border">
        <div className="glow-inner p-8">
          <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-slate-400">Use the email your invitation was sent to.</p>
          <form action={signIn} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Email</label>
              <input name="email" type="email" required autoComplete="email" placeholder="you@company.com" className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Password</label>
              <input name="password" type="password" required autoComplete="current-password" placeholder="••••••••••" className="input" />
            </div>
            {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
            <button className="btn btn-primary w-full">Sign in</button>
          </form>
          <p className="mt-6 text-xs text-slate-500">Access is by invitation. Forgot your password? Ask Knoxified for a new sign-in link.</p>
        </div>
      </section>
    </main>
  );
}
