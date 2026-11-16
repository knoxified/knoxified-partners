"use client";

import { useActionState, useState } from "react";
import { SignaturePicker, type PickerValue } from "@/components/signature-picker";
import { pollAdminHandoff, saveSignature, startAdminHandoff, type SigState } from "./actions";

export function SignatureForm({ name, title }: { name: string; title: string }) {
  const [state, action, pending] = useActionState<SigState, FormData>(saveSignature, {});
  const [value, setValue] = useState<PickerValue>({ method: "drawn", ready: false });
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" defaultValue={name} className="input" placeholder="Name on agreements" />
        <input name="title" defaultValue={title} className="input" placeholder="Title" />
      </div>
      <SignaturePicker name={name} modes={["draw", "paper"]} start={startAdminHandoff} poll={pollAdminHandoff} onChange={setValue} />
      <input type="hidden" name="sigMethod" value={value.method} />
      {value.method === "drawn" && <input type="hidden" name="strokes" value={JSON.stringify(value.strokes ?? [])} />}
      {value.method === "photo" && value.photoDataUrl && <input type="hidden" name="photo" value={value.photoDataUrl} />}
      {value.method === "photo" && value.handoff && <input type="hidden" name="handoff" value={value.handoff} />}
      {state.error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">Saved. New agreements will carry this signature.</p>}
      <button disabled={pending || !value.ready} className="btn btn-primary">{pending ? "Saving…" : "Save my signature"}</button>
    </form>
  );
}
