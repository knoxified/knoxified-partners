import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Knoxified Partners</h1>
      <p className="mt-1 text-sm text-slate-400">Sign in to see your referrals and payouts.</p>
      <form action={signIn} className="mt-8 space-y-4">
        <input name="email" type="email" required autoComplete="email" placeholder="Email"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
        <input name="password" type="password" required autoComplete="current-password" placeholder="Password"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="w-full rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-medium text-slate-950 hover:bg-emerald-400">
          Sign in
        </button>
      </form>
      <p className="mt-6 text-xs text-slate-500">Access is by invitation. Forgot your password? Ask Knoxified for a new link.</p>
    </main>
  );
}
