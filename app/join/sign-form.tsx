"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { SignaturePad } from "@/components/signature-pad";
import type { Stroke } from "@/lib/signature";

function Submit({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={!ready || pending} className="btn btn-primary w-full">
      {pending ? "Signing and setting up your account…" : "Sign and join the program"}
    </button>
  );
}

export function SignForm({ action, name, children }: { action: (fd: FormData) => void | Promise<void>; name: string; children: React.ReactNode }) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [typed, setTyped] = useState("");
  const points = strokes.reduce((n, s) => n + s.length, 0);
  const typedOk = typed.trim().toLowerCase().replace(/\s+/g, " ") === name.trim().toLowerCase().replace(/\s+/g, " ");
  const ready = accepted && points >= 20 && typedOk;

  return (
    <form action={action} className="space-y-6">
      <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-950/50 p-4">{children}</div>

      <label className="flex items-start gap-3 text-sm text-slate-300">
        <input type="checkbox" name="accept" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-cyan-400" />
        <span>I have read and agree to the Affiliate Program Terms and the Partner Order Form, and I agree that my typed name and drawn signature below are my electronic signature.</span>
      </label>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">Type your full name exactly as entered: {name}</label>
        <input name="typedName" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="input" placeholder={name} />
        {typed && !typedOk && <p className="mt-1 text-xs text-amber-300">It needs to match {name}.</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">Draw your signature</label>
        <SignaturePad onChange={setStrokes} />
        <input type="hidden" name="strokes" value={JSON.stringify(strokes)} />
      </div>

      <Submit ready={ready} />
      <p className="text-xs text-slate-500">
        We record your IP address, the time, and that your email was verified. You and Knoxified both receive a copy with a SHA-256 fingerprint and an independent timestamp.
      </p>
    </form>
  );
}
