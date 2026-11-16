import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canView, getViewer } from "@/lib/viewer";
import { getAgreementMeta, getSignatureStatus } from "@/lib/data";
import { Shell } from "../../../shell";
import { AddendumForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SignaturePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!canView(viewer, id) || viewer.role !== "partner") notFound();
  const [sig, agreement] = await Promise.all([getSignatureStatus(id), getAgreementMeta(id)]);
  if (!sig || !agreement || !sig.pending) redirect(`/p/${id}`);

  return (
    <Shell email={viewer.email} role={viewer.role}>
      <Link href={`/p/${id}`} className="text-sm text-slate-400 hover:text-slate-200">← Back to dashboard</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Add your <span className="gradient-text">signature</span></h1>
      <p className="mt-2 max-w-2xl text-slate-400">Your agreement is already accepted. Adding a signature completes your record. It is saved as a signed, timestamped addendum, and the original agreement is never changed.</p>
      <div className="card mt-6 max-w-2xl p-5">
        {error && <p className="mb-5 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
        <AddendumForm partnerId={id} name={agreement.signer_name} />
      </div>
    </Shell>
  );
}
