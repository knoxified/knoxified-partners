import { setPassword } from "./actions";

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Choose a password</h1>
      <p className="mt-1 text-sm text-slate-400">You will use it, with your email, to sign in next time.</p>
      <form action={setPassword} className="mt-8 space-y-4">
        <input name="password" type="password" required minLength={10} autoComplete="new-password" placeholder="New password (10+ characters)"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
        <input name="confirm" type="password" required minLength={10} autoComplete="new-password" placeholder="Repeat password"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="w-full rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-medium text-slate-950 hover:bg-emerald-400">
          Save password
        </button>
      </form>
    </main>
  );
}
