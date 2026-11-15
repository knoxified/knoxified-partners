import { requireAdmin } from "@/lib/admin";
import { getSetting } from "@/lib/data";
import { strokesToSvg, sanitizeStrokes } from "@/lib/signature";
import { Pill, Section } from "@/components/ui";
import { Shell } from "../../shell";
import { SignatureForm } from "./signature-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewer = await requireAdmin();
  const sig = await getSetting<{ name?: string; title?: string; strokes?: [number, number][][] }>("knoxified_signature");
  const strokes = sig?.strokes ? sanitizeStrokes(sig.strokes) : null;
  const notifyUrl = await getSetting<string>("notify_url");
  const notifySecret = await getSetting<string>("notify_secret");

  const checks: Array<[string, boolean, string]> = [
    ["Brevo API key", !!process.env.BREVO_API_KEY, "Needed to send login codes and notifications"],
    ["Verified sender email", !!process.env.MAIL_FROM_EMAIL, "MAIL_FROM_EMAIL must be a sender verified in Brevo"],
    ["Portal master secret", (process.env.PORTAL_SECRET ?? "").length >= 24, "Protects codes, cookies and bank details"],
    ["Notification secret", !!process.env.PORTAL_HOOK_SECRET, "Lets the database trigger emails"],
    ["Database notifications linked", !!notifyUrl && !!notifySecret, "notify_url and notify_secret saved in portal_settings"],
    ["Your signature saved", !!strokes, "Drawn below; used on every agreement"],
  ];

  return (
    <Shell email={viewer.email} role="admin">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Program <span className="gradient-text">settings</span></h1>

      <div className="mt-8">
        <Section title="Setup checklist" hint="Everything the automatic onboarding and emails depend on.">
          <div className="card divide-y divide-slate-800/70">
            {checks.map(([label, ok, hint]) => (
              <div key={label} className="flex items-center justify-between gap-4 p-4">
                <div><div className="font-medium">{label}</div><div className="text-xs text-slate-500">{hint}</div></div>
                <Pill tone={ok ? "green" : "red"}>{ok ? "Ready" : "Not set"}</Pill>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Your signature" hint="Signed in advance on every agreement. Draw it once.">
          {strokes && (
            <div className="card mb-4 flex items-center gap-4 p-4">
              <div className="rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: strokesToSvg(strokes, 70) }} />
              <div className="text-sm text-slate-400">Current signature for <span className="text-slate-100">{sig?.name}</span>, {sig?.title}</div>
            </div>
          )}
          <div className="card p-5"><SignatureForm name={sig?.name ?? "Knox Favour"} title={sig?.title ?? "Founder, Knoxified"} /></div>
        </Section>
      </div>
    </Shell>
  );
}
