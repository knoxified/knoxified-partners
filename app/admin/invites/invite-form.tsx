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
      <form action={action} className="grid gap-3 sm:grid-cols-5">
        <input name="label" placeholder="Who is this for? (private note)" className="input sm:col-span-2" />
        <input name="rate1" type="number" step="0.5" min="0" max="100" defaultValue={30} className="input" title="Year one rate %" />
        <input name="rate2" type="number" step="0.5" min="0" max="100" defaultValue={20} className="input" title="Year two rate %" />
        <input name="days" type="number" min="1" max="60" defaultValue={14} className="input" title="Valid for days" />
        <button disabled={pending} className="btn btn-primary sm:col-span-5">{pending ? "Creating…" : "Create invitation code"}</button>
      </form>
      <p className="text-xs text-slate-500">Fields: private note, year-one rate %, year-two rate %, days the code stays valid.</p>
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
