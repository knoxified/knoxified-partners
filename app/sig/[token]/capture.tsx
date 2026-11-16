"use client";

import { useRef, useState } from "react";
import { photoToSignaturePng } from "@/lib/photo-signature-client";

export function Capture({ token }: { token: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function picked(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      setPreview(await photoToSignaturePng(file));
    } catch (e) {
      setPreview(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function send() {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/sig/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ png: preview }) });
      if (res.ok) setDone(true);
      else setError(((await res.json().catch(() => ({}))) as { error?: string }).error || "Could not send. Please try again.");
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="text-center">
        <div className="text-4xl">✅</div>
        <h2 className="mt-3 text-xl font-semibold">Sent to your computer</h2>
        <p className="mt-2 text-sm text-slate-400">You can close this page and go back to the computer you were signing on.</p>
      </div>
    );

  return (
    <div>
      <ol className="space-y-3 text-sm text-slate-300">
        <li><b className="text-slate-100">1.</b> Take any piece of plain white paper and sign it with a dark pen.</li>
        <li><b className="text-slate-100">2.</b> Lay it flat in good light, with no shadow across the signature.</li>
        <li><b className="text-slate-100">3.</b> Tap the button and take the photo. Let your signature fill most of the frame.</li>
      </ol>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => picked(e.target.files?.[0])} />
      {preview && (
        <div className="mt-5 rounded-xl bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your signature" className="mx-auto h-24 w-auto max-w-full" />
        </div>
      )}
      {error && <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
      <div className="mt-5 space-y-3">
        {preview ? (
          <>
            <button onClick={send} disabled={busy} className="btn btn-primary w-full">{busy ? "Sending…" : "Use this signature"}</button>
            <button onClick={() => input.current?.click()} disabled={busy} className="btn btn-ghost w-full">Retake photo</button>
          </>
        ) : (
          <button onClick={() => input.current?.click()} disabled={busy} className="btn btn-primary w-full">{busy ? "Processing…" : "Take photo of my signature"}</button>
        )}
      </div>
    </div>
  );
}
