"use client";

import { useActionState } from "react";
import { createAccessLink, type AccessLinkState } from "./actions";

export function AccessForm({ partnerId, defaultEmail }: { partnerId: string; defaultEmail: string }) {
  const [state, action, pending] = useActionState<AccessLinkState, FormData>(createAccessLink, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="partnerId" value={partnerId} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input name="email" type="email" required defaultValue={defaultEmail} className="input" />
        <button disabled={pending} className="btn btn-primary shrink-0">{pending ? "Creating…" : "Create sign-in link"}</button>
      </div>
      {state.error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>}
      {state.link && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-3">
          <p className="mb-2 text-xs text-slate-400">Send this to the affiliate yourself. It works once and expires soon (about an hour by default).</p>
          <input readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} className="input font-mono !text-xs" />
        </div>
      )}
    </form>
  );
}
