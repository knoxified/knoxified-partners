import Link from "next/link";
import { getJoin } from "@/lib/joinsession";
import { TermsView } from "@/components/terms-view";
import { TERMS_DATE, TERMS_VERSION } from "@/lib/terms";
import { editDetails, redeemCode, resendCode, saveDetails, signAgreement, verifyEmail } from "./actions";
import { SignForm } from "./sign-form";
import { adminClient } from "@/lib/supabase/admin";
import { getSetting } from "@/lib/data";
import { savedSignatureHtml, type SavedSignature } from "@/lib/signature";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join the Knoxified affiliate program" };

const STEPS = ["Invitation", "Your details", "Verify email", "Sign"];

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { error, notice } = await searchParams;
  const state = await getJoin();
  const step = !state ? 0 : !state.email ? 1 : !state.verified ? 2 : 3;

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/login" className="mb-8 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-9 w-9 object-contain drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
        <span className="text-xl font-bold tracking-tight">Knoxified</span>
        <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 ring-1 ring-inset ring-cyan-400/25">Partners</span>
      </Link>

      <ol className="mb-8 flex items-center gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold ${i < step ? "bg-emerald-500/80 text-white" : i === step ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" : "bg-slate-800 text-slate-500"}`}>
              {i < step ? "✓" : i + 1}
            </span>
            <span className={i === step ? "font-medium text-slate-100" : "text-slate-500"}>{s}</span>
          </li>
        ))}
      </ol>

      <div className="glow-border">
        <div className="glow-inner p-6 sm:p-8">
          {error && <p className="mb-5 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
          {notice && <p className="mb-5 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{notice}</p>}

          {step === 0 && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Join the <span className="gradient-text">affiliate program</span></h1>
              <p className="mt-2 text-sm text-slate-400">Enter the invitation code Knoxified gave you. It works once.</p>
              <form action={redeemCode} className="mt-6 space-y-4">
                <input name="code" required autoComplete="off" autoCapitalize="characters" placeholder="KNX-XXXX-XXXX-XXXX" className="input text-center font-mono tracking-widest" />
                <button className="btn btn-primary w-full">Continue</button>
              </form>
              <p className="mt-6 text-xs text-slate-500">Already an affiliate? <Link href="/login" className="text-cyan-400 hover:underline">Sign in</Link> · <Link href="/how-it-works" className="text-cyan-400 hover:underline">How it works</Link></p>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Your details</h1>
              <p className="mt-2 text-sm text-slate-400">Use the name that will appear on your agreement and the email you want to sign in with.</p>
              <form action={saveDetails} className="mt-6 space-y-4">
                <div><label className="mb-1.5 block text-xs font-medium text-slate-400">Full name</label><input name="name" required className="input" autoComplete="name" /></div>
                <div><label className="mb-1.5 block text-xs font-medium text-slate-400">Business or channel name (optional)</label><input name="company" className="input" autoComplete="organization" /></div>
                <div><label className="mb-1.5 block text-xs font-medium text-slate-400">Email</label><input name="email" type="email" required className="input" autoComplete="email" /></div>
                <div><label className="mb-1.5 block text-xs font-medium text-slate-400">Country</label><input name="country" required className="input" autoComplete="country-name" /></div>
                <button className="btn btn-primary w-full">Send me a verification code</button>
              </form>
            </>
          )}

          {step === 2 && state && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
              <p className="mt-2 text-sm text-slate-400">We sent a 6-digit code to <span className="text-slate-200">{state.email}</span>. It expires in 10 minutes.</p>
              <form action={verifyEmail} className="mt-6 space-y-4">
                <input name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="123456" className="input text-center font-mono text-xl tracking-[0.5em]" />
                <button className="btn btn-primary w-full">Verify email</button>
              </form>
              <div className="mt-4 flex gap-4 text-sm">
                <form action={resendCode}><button className="text-cyan-400 hover:underline">Send a new code</button></form>
                <form action={editDetails}><button className="text-slate-400 hover:text-slate-200">Change my details</button></form>
              </div>
            </>
          )}

          {step === 3 && state?.name && await (async () => {
            const [{ data: inv }, saved] = await Promise.all([
              adminClient().from("partner_invites").select("commission_rate, commission_rate_year2").eq("id", state.inviteId).maybeSingle(),
              getSetting<SavedSignature>("knoxified_signature"),
            ]);
            const knox = { html: savedSignatureHtml(saved, "Knox Favour"), name: saved?.name || "Knox Favour", title: saved?.title || "Founder, Knoxified" };
            const lines = [
              inv ? `Commission: ${Number(inv.commission_rate)}% of net revenue in a customer's first year, ${Number(inv.commission_rate_year2)}% in the second.` : "Commission rates as set out in your Order Form.",
              "Payouts are made on the 15th, from US$50, after a 21-day hold on each commission.",
              "Signed electronically, fingerprinted with SHA-256 and timestamped by an independent authority.",
            ];
            return (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Read and sign</h1>
              <p className="mt-2 text-sm text-slate-400">
                Affiliate Program Terms, version {TERMS_VERSION} ({TERMS_DATE}). Knoxified has already signed. Scroll through the terms, then sign below.
              </p>
              <div className="mt-6">
                <SignForm action={signAgreement} name={state.name as string} knox={knox} lines={lines} version={TERMS_VERSION}>
                  <TermsView />
                </SignForm>
              </div>
            </>
            );
          })()}
        </div>
      </div>
    </main>
  );
}
