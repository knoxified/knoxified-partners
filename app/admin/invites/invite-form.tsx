"use client";

import { useActionState, useState } from "react";
import { createInvite, type InviteState } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvite, {});
  const [copied, setCopied] = useState(false);
  const message = state.code
    ? `Hi! Here is your Knoxified affiliate invitation.\n\n1. Go to ${state.link}\n2. Enter this code: ${state.code}\n3. Add your details, verify your email and sign online.\n\nIt takes about five minutes. The code works once.`
    : "";

  return (
    <div className="space-y-4">
      <form action={action} className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        <div className="col-span-3 sm:col-span-2"><label className="mb-1.5 block text-xs font-medium text-slate-400">Who is this for? (private note)</label><input name="label" className="input" /></div>
        <div><label className="mb-1.5 block text-xs font-medium text-slate-400">Year 1 %</label><input name="rate1" type="number" inputMode="decimal" step="0.5" min="0" max="100" defaultValue={30} className="input" /></div>
        <div><label className="mb-1.5 block text-xs font-medium text-slate-400">Year 2 %</label><input name="rate2" type="number" inputMode="decimal" step="0.5" min="0" max="100" defaultValue={20} className="input" /></div>
        <div><label className="mb-1.5 block text-xs font-medium text-slate-400">Valid days</label><input name="days" type="number" inputMode="numeric" min="1" max="60" defaultValue={14} className="input" /></div>
        <button disabled={pending} className="btn btn-primary col-span-3 sm:col-span-5">{pending ? "Creating…" : "Create invitation code"}</button>
      </form>
      {state.error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>}
      {state.code && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4">
          <p className="text-xs text-emerald-300">Shown once. Copy it now, it cannot be displayed again.</p>
          <div className="mt-1 font-mono text-2xl font-semibold tracking-widest">{state.code}</div>
          <textarea readOnly value={message} rows={6} className="input mt-3 !text-xs" onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className="btn btn-ghost mt-2"
            onClick={async () => {
              try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
            }}
          >
            {copied ? "Copied ✓" : "Copy message"}
          </button>
        </div>
      )}
    </div>
  );
}
