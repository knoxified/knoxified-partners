import { handoffIsOpen } from "@/lib/handoff";
import { Capture } from "./capture";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add your signature · Knoxified Partners", robots: { index: false } };

export default async function SigPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const open = await handoffIsOpen(token);
  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <div className="mb-6 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
        <span className="text-xl font-bold tracking-tight">Knoxified</span>
      </div>
      <div className="glow-border">
        <div className="glow-inner p-6">
          <h1 className="text-xl font-bold tracking-tight">Add your signature</h1>
          {open ? (
            <div className="mt-4"><Capture token={token} /></div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">This link has expired or was already used. Go back to your computer and refresh the QR code to try again.</p>
          )}
        </div>
      </div>
    </main>
  );
}
