"use client";

import { useEffect, useRef, useState } from "react";
import qrcode from "qrcode-generator";
import { SignaturePad } from "@/components/signature-pad";
import { photoToSignaturePng } from "@/lib/photo-signature-client";
import type { Stroke } from "@/lib/signature";

export type PickerValue = {
  method: "drawn" | "typed" | "photo";
  ready: boolean;
  strokes?: Stroke[];
  photoDataUrl?: string; // photo taken or uploaded on this device
  handoff?: string; // photo that arrived from the phone (kept on the server)
  preview?: string; // data URL of the photo, for showing it on the document
};
type Start = () => Promise<{ ok: true; token: string; url: string } | { ok: false; error: string }>;
type Poll = (token: string) => Promise<{ status: "waiting" | "received" | "expired"; png?: string }>;
type Mode = "draw" | "type" | "paper";

function Qr({ url }: { url: string }) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  return <div className="h-44 w-44 rounded-xl bg-white p-2 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }) }} />;
}

export function SignaturePicker({ name, start, poll, onChange, modes = ["draw", "type", "paper"] }: { name: string; start: Start; poll: Poll; onChange: (v: PickerValue) => void; modes?: Mode[] }) {
  const [mode, setMode] = useState<Mode>(modes[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [photo, setPhoto] = useState<{ preview: string; dataUrl?: string; handoff?: string } | null>(null);
  const [qr, setQr] = useState<{ token: string; url: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "waiting" | "expired">("idle");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCoarse(window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 900);
  }, []);

  const points = strokes.reduce((n, s) => n + s.length, 0);
  useEffect(() => {
    if (mode === "draw") onChange({ method: "drawn", ready: points >= 20, strokes });
    else if (mode === "type") onChange({ method: "typed", ready: true });
    else onChange({ method: "photo", ready: !!photo, photoDataUrl: photo?.dataUrl, handoff: photo?.handoff, preview: photo?.preview });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, strokes, photo]);

  // Wait for the phone.
  useEffect(() => {
    if (!qr || status !== "waiting") return;
    let stop = false;
    const timer = setInterval(async () => {
      const r = await poll(qr.token).catch(() => null);
      if (stop || !r) return;
      if (r.status === "received" && r.png) {
        setPhoto({ preview: `data:image/png;base64,${r.png}`, handoff: qr.token });
        setStatus("idle");
        setQr(null);
      } else if (r.status === "expired") setStatus("expired");
    }, 2000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [qr, status, poll]);

  async function showQr() {
    setError("");
    setBusy(true);
    const r = await start().catch(() => ({ ok: false as const, error: "Something went wrong. Please try again." }));
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setQr({ token: r.token, url: r.url });
    setStatus("waiting");
  }

  async function picked(f?: File) {
    if (!f) return;
    setError("");
    setBusy(true);
    try {
      const dataUrl = await photoToSignaturePng(f);
      setPhoto({ preview: dataUrl, dataUrl });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }

  const tab = (m: Mode, label: string) => (
    <button type="button" onClick={() => setMode(m)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${mode === m ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30" : "text-slate-400 hover:text-slate-200"}`}>
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {modes.includes("draw") && tab("draw", "Draw it")}
        {modes.includes("type") && tab("type", "Type it")}
        {modes.includes("paper") && tab("paper", "Use my paper signature")}
      </div>

      {mode === "draw" && (
        <div>
          <SignaturePad onChange={setStrokes} />
          <p className="mt-2 text-xs text-slate-500">No signature handy? Choose “Use my paper signature” and sign on any sheet of paper.</p>
        </div>
      )}

      {mode === "type" && (
        <div className="rounded-xl border border-slate-600/70 bg-slate-950/70 p-6 text-center">
          <div className="text-4xl text-slate-100" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}>{name}</div>
          <p className="mt-3 text-xs text-slate-500">Your name, in a signature style, will be used as your signature.</p>
        </div>
      )}

      {mode === "paper" && (
        <div className="rounded-xl border border-slate-600/70 bg-slate-950/70 p-5">
          {photo ? (
            <div>
              <div className="rounded-lg bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.preview} alt="Your signature" className="mx-auto h-24 w-auto max-w-full" />
              </div>
              <button type="button" onClick={() => { setPhoto(null); setError(""); }} className="mt-3 text-sm text-slate-400 hover:text-slate-200">Use a different photo</button>
            </div>
          ) : (
            <div>
              <ol className="space-y-1.5 text-sm text-slate-300">
                <li><b className="text-slate-100">1.</b> Sign any plain white paper with a dark pen.</li>
                <li><b className="text-slate-100">2.</b> Lay it flat in good light.</li>
                <li><b className="text-slate-100">3.</b> {coarse ? "Tap the button and photograph it." : "Scan the code with your phone and photograph it. We crop and clean it for you."}</li>
              </ol>
              <input ref={file} type="file" accept="image/*" capture={coarse ? "environment" : undefined} className="hidden" onChange={(e) => picked(e.target.files?.[0])} />
              {coarse ? (
                <button type="button" disabled={busy} onClick={() => file.current?.click()} className="btn btn-primary mt-4 w-full">{busy ? "Processing…" : "Take photo of my signature"}</button>
              ) : (
                <div className="mt-4 flex flex-wrap items-center gap-5">
                  {qr && status === "waiting" ? (
                    <>
                      <Qr url={qr.url} />
                      <div className="text-sm text-slate-400">
                        <p className="font-medium text-slate-200">Waiting for your phone…</p>
                        <p className="mt-1">Point your phone camera at the code and follow the steps. This page updates by itself.</p>
                        <button type="button" onClick={showQr} className="mt-2 text-cyan-300 hover:underline">New code</button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      {status === "expired" && <p className="text-sm text-amber-300">That code expired. Get a new one.</p>}
                      <button type="button" disabled={busy} onClick={showQr} className="btn btn-primary">{busy ? "Preparing…" : "Show QR code for my phone"}</button>
                      <div><button type="button" disabled={busy} onClick={() => file.current?.click()} className="text-sm text-cyan-300 hover:underline">Or upload a photo from this computer</button></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {error && <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
        </div>
      )}
    </div>
  );
}
