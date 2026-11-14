"use client";

import { useActionState } from "react";
import { createAccessLink, type AccessLinkState } from "./actions";

export function AccessForm({ partnerId, defaultEmail }: { partnerId: string; defaultEmail: string }) {
  const [state, action, pending] = useActionState<AccessLinkState, FormData>(createAccessLink, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="partnerId" value={partnerId} />
      <input name="email" type="email" required defaultValue={defaultEmail}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
      <button disabled={pending}
        className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60">
        {pending ? "Creating…" : "Create sign-in link"}
      </button>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.link && (
        <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
          <p className="mb-2 text-xs text-slate-400">Send this to the affiliate yourself. It works once and expires soon (about an hour by default).</p>
          <input readOnly value={state.link} onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded bg-slate-900 px-2 py-1.5 font-mono text-xs text-slate-200" />
        </div>
      )}
    </form>
  );
}
