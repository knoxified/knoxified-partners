"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { SignaturePicker, type PickerValue } from "@/components/signature-picker";
import { ContractPreview } from "@/components/contract-preview";
import { pollJoinHandoff, startJoinHandoff } from "./handoff-actions";

function Submit({ ready, label }: { ready: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={!ready || pending} className="btn btn-primary w-full">
      {pending ? "Setting up your account…" : label}
    </button>
  );
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export type KnoxPreview = { html: string; name: string; title: string };

export function SignForm({ action, name, knox, lines, version, children }: { action: (fd: FormData) => void | Promise<void>; name: string; knox: KnoxPreview; lines: string[]; version: string; children: React.ReactNode }) {
  const form = useRef<HTMLFormElement>(null);
  const [stage, setStage] = useState<"read" | "sign">("read");
  const [accepted, setAccepted] = useState(false);
  const [typed, setTyped] = useState("");
  const [value, setValue] = useState<PickerValue>({ method: "drawn", ready: false });
  const [askSkip, setAskSkip] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const typedOk = norm(typed) === norm(name);
  const canContinue = accepted && typedOk;

  useEffect(() => {
    if (skipped) form.current?.requestSubmit();
  }, [skipped]);

  const method = skipped ? "none" : value.method;

  return (
    <form ref={form} action={action} className="space-y-6">
      <input type="hidden" name="sigMethod" value={method} />
      {!skipped && value.method === "drawn" && <input type="hidden" name="strokes" value={JSON.stringify(value.strokes ?? [])} />}
      {!skipped && value.method === "photo" && value.photoDataUrl && <input type="hidden" name="photo" value={value.photoDataUrl} />}
      {!skipped && value.method === "photo" && value.handoff && <input type="hidden" name="handoff" value={value.handoff} />}

      <div className={stage === "read" ? "space-y-6" : "hidden"}>
        <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-950/50 p-4">{children}</div>

        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input type="checkbox" name="accept" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-cyan-400" />
          <span>I have read and agree to the Affiliate Program Terms and the Partner Order Form, and I agree that my typed name, together with any signature I add, is my electronic signature.</span>
        </label>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Type your full name exactly as entered: {name}</label>
          <input name="typedName" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="input" placeholder={name} />
          {typed && !typedOk && <p className="mt-1 text-xs text-amber-300">It needs to match {name}.</p>}
        </div>

        <button type="button" disabled={!canContinue} onClick={() => setStage("sign")} className="btn btn-primary w-full">Continue to signature</button>
        <p className="text-xs text-slate-500">Next you add your signature. We record your IP address, the time, and that your email was verified. You and Knoxified both receive a copy with a SHA-256 fingerprint and an independent timestamp.</p>
      </div>

      {stage === "sign" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Add your signature</h2>
            <p className="mt-1 text-sm text-slate-400">Choose whichever is easiest. Any of them works.</p>
          </div>
          <ContractPreview
            heading="Affiliate Program Agreement"
            intro={`Between Knoxified and ${name}. Version ${version}. You have read and accepted the full terms in the previous step. Your signature goes here.`}
            lines={lines} partyName={name} knox={knox} value={value} skipped={skipped}
          />
          <SignaturePicker name={name} start={startJoinHandoff} poll={pollJoinHandoff} onChange={setValue} />
          <div className="space-y-3">
            <Submit ready={value.ready && !skipped} label="Sign and join the program" />
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStage("read")} className="text-slate-400 hover:text-slate-200">← Back to the terms</button>
              <button type="button" onClick={() => setAskSkip(true)} className="text-slate-400 hover:text-slate-200">Skip for now</button>
            </div>
          </div>
        </div>
      )}

      {askSkip && !skipped && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5" role="dialog" aria-modal="true">
          <div className="glow-border w-full max-w-md">
            <div className="glow-inner p-6">
              <h3 className="text-lg font-semibold">Skip adding a signature?</h3>
              <p className="mt-2 text-sm text-slate-400">
                Your agreement is already accepted. A signature makes your record complete and easier to prove later. Your dashboard will keep a reminder until you add one, and you can do it any time.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row-reverse">
                <button type="button" onClick={() => { setAskSkip(false); setSkipped(true); }} className="btn btn-ghost sm:flex-1">Yes, I understand, skip</button>
                <button type="button" onClick={() => setAskSkip(false)} className="btn btn-primary sm:flex-1">Take me back, let me finish</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
