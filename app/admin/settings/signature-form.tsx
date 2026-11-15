"use client";

import { useActionState, useState } from "react";
import { SignaturePad } from "@/components/signature-pad";
import type { Stroke } from "@/lib/signature";
import { saveSignature, type SigState } from "./actions";

export function SignatureForm({ name, title }: { name: string; title: string }) {
  const [state, action, pending] = useActionState<SigState, FormData>(saveSignature, {});
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" defaultValue={name} className="input" placeholder="Name on agreements" />
        <input name="title" defaultValue={title} className="input" placeholder="Title" />
      </div>
      <SignaturePad onChange={setStrokes} />
      <input type="hidden" name="strokes" value={JSON.stringify(strokes)} />
      {state.error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">Saved. New agreements will carry this signature.</p>}
      <button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : "Save my signature"}</button>
    </form>
  );
}
