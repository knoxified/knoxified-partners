"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { SignaturePicker, type PickerValue } from "@/components/signature-picker";
import { addSignature, pollPartnerHandoff, startPartnerHandoff } from "./actions";

function Submit({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={!ready || pending} className="btn btn-primary w-full">{pending ? "Saving…" : "Add my signature"}</button>;
}

export function AddendumForm({ partnerId, name }: { partnerId: string; name: string }) {
  const [value, setValue] = useState<PickerValue>({ method: "drawn", ready: false });
  const [confirm, setConfirm] = useState(false);
  return (
    <form action={addSignature} className="space-y-6">
      <input type="hidden" name="partnerId" value={partnerId} />
      <input type="hidden" name="sigMethod" value={value.method} />
      {value.method === "drawn" && <input type="hidden" name="strokes" value={JSON.stringify(value.strokes ?? [])} />}
      {value.method === "photo" && value.photoDataUrl && <input type="hidden" name="photo" value={value.photoDataUrl} />}
      {value.method === "photo" && value.handoff && <input type="hidden" name="handoff" value={value.handoff} />}
      <SignaturePicker name={name} start={() => startPartnerHandoff(partnerId)} poll={(t) => pollPartnerHandoff(partnerId, t)} onChange={setValue} />
      <label className="flex items-start gap-3 text-sm text-slate-300">
        <input type="checkbox" name="confirm" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1 h-4 w-4 accent-cyan-400" />
        <span>I confirm this signature is mine and I want it added to the agreement I accepted. It does not change the terms.</span>
      </label>
      <Submit ready={value.ready && confirm} />
    </form>
  );
}
