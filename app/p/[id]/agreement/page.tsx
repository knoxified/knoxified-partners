import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canView, getViewer } from "@/lib/viewer";
import { adminClient } from "@/lib/supabase/admin";
import { day } from "@/lib/format";
import { getSignatureStatus } from "@/lib/data";
import { Pill } from "@/components/ui";
import { Shell } from "../../../shell";

export const dynamic = "force-dynamic";

export default async function AgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!canView(viewer, id)) notFound();
  const { data } = await adminClient()
    .from("partner_agreements")
    .select("record_html, record_sha256, terms_version, terms_sha256, signed_at, signer_name, tsa_status, tsa_url, tsa_stamped_at")
    .eq("partner_id", id)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) notFound();
  const sig = await getSignatureStatus(id);
  const { data: addendum } = await adminClient()
    .from("partner_signature_addenda")
    .select("record_sha256, signed_at, tsa_status")
    .eq("partner_id", id)
    .order("signed_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <Shell email={viewer.email} role={viewer.role}>
      <Link href={`/p/${id}`} className="text-sm text-slate-400 hover:text-slate-200">← Back to dashboard</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Signed <span className="gradient-text">agreement</span></h1>
      <p className="mt-2 text-slate-400">Signed by {data.signer_name} on {day(data.signed_at)} · Terms version {data.terms_version}</p>

      <div className="card mt-6 space-y-3 p-5 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400">Independent timestamp:</span>
          <Pill tone={data.tsa_status === "stamped" ? "green" : data.tsa_status === "pending" ? "amber" : "red"}>
            {data.tsa_status === "stamped" ? `Stamped ${day(data.tsa_stamped_at)}` : data.tsa_status === "pending" ? "In progress" : "Retrying automatically"}
          </Pill>
        </div>
        <div><div className="text-xs uppercase tracking-wide text-slate-500">Fingerprint (SHA-256 of the agreement file)</div><div className="mt-1 break-all font-mono text-xs text-slate-200">{data.record_sha256}</div></div>
        <div className="flex flex-wrap gap-3 pt-1">
          <a className="btn btn-primary" href={`/p/${id}/agreement/file?type=html`}>Download agreement</a>
          <a className="btn btn-ghost" href={`/p/${id}/agreement/file?type=print`} target="_blank" rel="noreferrer">Save as PDF</a>
          <a className="btn btn-ghost" href={`/p/${id}/agreement/file?type=json`}>Signing record (JSON)</a>
          {data.tsa_status === "stamped" && <a className="btn btn-ghost" href={`/p/${id}/agreement/file?type=tsr`}>Timestamp token</a>}
        </div>
        <details className="text-slate-400">
          <summary className="cursor-pointer text-cyan-300">How to check that nothing has changed</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Download the agreement file and compute its SHA-256 (Windows: <code>certutil -hashfile knoxified-affiliate-agreement.html SHA256</code>; Mac or Linux: <code>shasum -a 256 knoxified-affiliate-agreement.html</code>). It must equal the fingerprint above.</li>
            <li>The timestamp token proves a public time-stamping authority saw that fingerprint at that time. Verify it with OpenSSL: <code>openssl ts -verify -data knoxified-affiliate-agreement.html -in knoxified-affiliate-agreement.tsr -CAfile ca-bundle.pem</code>, using the authority&apos;s root certificates.</li>
          </ol>
        </details>
      </div>

      {sig?.pending && (
        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Agreement accepted ✓ · Signature image missing. {viewer.role === "partner" ? <Link href={`/p/${id}/signature`} className="font-semibold underline">Add it now</Link> : "The affiliate has not added it yet."}
        </div>
      )}
      {addendum && (
        <div className="card mt-6 space-y-3 p-5 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-100">Signature addendum</span>
            <Pill tone={addendum.tsa_status === "stamped" ? "green" : "amber"}>{addendum.tsa_status === "stamped" ? "Timestamped" : "Timestamp in progress"}</Pill>
            <span className="text-slate-400">Added {day(addendum.signed_at)}</span>
          </div>
          <div className="break-all font-mono text-xs text-slate-300">SHA-256 {addendum.record_sha256}</div>
          <div className="flex flex-wrap gap-3">
            <a className="btn btn-ghost" href={`/p/${id}/agreement/file?type=addendum`}>Download addendum</a>
            <a className="btn btn-ghost" href={`/p/${id}/agreement/file?type=addendum-print`} target="_blank" rel="noreferrer">Save as PDF</a>
            <a className="btn btn-ghost" href={`/p/${id}/agreement/file?type=addendum-json`}>Record (JSON)</a>
            {addendum.tsa_status === "stamped" && <a className="btn btn-ghost" href={`/p/${id}/agreement/file?type=addendum-tsr`}>Timestamp token</a>}
          </div>
        </div>
      )}
      <iframe title="Signed agreement" sandbox="" srcDoc={data.record_html} className="mt-6 h-[75vh] w-full rounded-xl border border-slate-700 bg-white" />
    </Shell>
  );
}
