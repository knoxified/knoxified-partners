import { setPassword } from "./actions";

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
      <div className="glow-border w-full">
        <div className="glow-inner p-8">
          <h1 className="text-2xl font-bold tracking-tight">Choose a <span className="gradient-text">password</span></h1>
          <p className="mt-1 text-sm text-slate-400">You will use it, with your email, to sign in next time.</p>
          <form action={setPassword} className="mt-6 space-y-4">
            <input name="password" type="password" required minLength={10} autoComplete="new-password" placeholder="New password (10+ characters)" className="input" />
            <input name="confirm" type="password" required minLength={10} autoComplete="new-password" placeholder="Repeat password" className="input" />
            {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
            <button className="btn btn-primary w-full">Save password</button>
          </form>
        </div>
      </div>
    </main>
  );
}
