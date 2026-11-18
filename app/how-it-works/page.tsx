import Link from "next/link";

export const metadata = { title: "How the Knoxified affiliate program works" };

const STEPS = [
  ["Join", "Redeem your invitation code, confirm your email, read and sign the agreement online. It takes about five minutes."],
  ["Share your link", "Your personal link is waiting in your dashboard. Add a source or campaign tag to see which posts convert."],
  ["Customers sign up", "When someone clicks your link and creates an account within 60 days, they are credited to you. First click wins."],
  ["They subscribe", "New customers get a sign-up offer. When a customer pays, you earn commission on what Knoxified actually receives."],
  ["You get paid", "Commission is held 21 days, then paid on the next 15th. Minimum payout is US$50, and anything below rolls over."],
];

export default function HowItWorks() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/login" className="mb-8 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-9 w-9 object-contain drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
        <span className="text-xl font-bold tracking-tight">Knoxified</span>
        <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 ring-1 ring-inset ring-cyan-400/25">Partners</span>
      </Link>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">How the program <span className="gradient-text">works</span></h1>
      <p className="mt-3 text-slate-400">The plain-English version. The binding rules are in the Affiliate Program Terms you sign when you join.</p>

      <ol className="mt-8 space-y-3">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="card flex gap-4 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-sm font-bold">{i + 1}</span>
            <div><div className="font-semibold">{title}</div><p className="mt-0.5 text-sm text-slate-400">{text}</p></div>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">What you earn</h2>
      <div className="card mt-3 p-5 text-sm text-slate-300">
        <p>Commission is a percentage of what the customer actually pays (before payment processing fees, which we cover, and excluding taxes and refunds). The standard rates are <b className="text-slate-50">30% in a customer&apos;s first year</b> and <b className="text-slate-50">20% in the second year</b>. Your own rates are on your Order Form.</p>
        <p className="mt-3"><b className="text-slate-50">Example.</b> A customer&apos;s first payment is US$348.50 because of the sign-up offer, so you earn 30% of that, US$104.55. If they pay the full US$697.00 next month, you earn US$209.10.</p>
        <p className="mt-3"><b className="text-slate-50">When.</b> A payment on 20 November is held until 11 December and paid on 15 December. A payment on 25 November is held until 16 December and paid on 15 January.</p>
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">Do and don&apos;t</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="card p-4 text-sm text-slate-300"><div className="mb-2 font-semibold text-emerald-300">Do</div>
          <ul className="list-disc space-y-1.5 pl-5"><li>Say you earn a commission, next to your link</li><li>Describe Knoxified in plain, accurate words</li><li>Use the current offer shown in your dashboard</li><li>Ask us if you are unsure</li></ul></div>
        <div className="card p-4 text-sm text-slate-300"><div className="mb-2 font-semibold text-rose-300">Don&apos;t</div>
          <ul className="list-disc space-y-1.5 pl-5"><li>Promise results or earnings</li><li>Say calling rules do not apply, or that Knoxified makes anyone automatically compliant</li><li>Send unsolicited messages or use bought lists</li><li>Bid on the Knoxified name in ads</li><li>Contact referred customers or sign yourself up</li></ul></div>
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">Questions</h2>
      <div className="card mt-3 divide-y divide-slate-800/70 text-sm">
        {[
          ["Can I see who signed up?", "Yes, by business name, location and plan. Owner names and emails stay private."],
          ["Can I get paid in my own currency?", "Yes. Choose your currency and add your bank details in your dashboard."],
          ["What if a customer is refunded?", "The commission for that payment is cancelled before payout, and deducted from your next payout if already paid."],
          ["Where is the full agreement?", "In your dashboard after you sign, with a fingerprint and an independent timestamp. The standard text is at knoxified.org/legal/affiliate-terms."],
        ].map(([q, a]) => (<div key={q} className="p-4"><div className="font-medium text-slate-100">{q}</div><p className="mt-1 text-slate-400">{a}</p></div>))}
      </div>
      <p className="mt-8 text-center text-sm text-slate-500">Questions? Email affiliates@knoxified.org · <Link href="/join" className="text-cyan-400 hover:underline">Join the program</Link></p>
    </main>
  );
}
