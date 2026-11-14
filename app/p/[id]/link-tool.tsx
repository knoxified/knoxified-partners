"use client";

import { useMemo, useState } from "react";

export function LinkTool({ base, code }: { base: string; code: string }) {
  const [campaign, setCampaign] = useState("");
  const [source, setSource] = useState("");
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    const clean = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    const params = new URLSearchParams({ ref: code });
    if (clean(source)) params.set("utm_source", clean(source));
    if (clean(campaign)) params.set("utm_campaign", clean(campaign));
    return `${base}/?${params.toString()}`;
  }, [base, code, campaign, source]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the field below is selectable.
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source (optional), e.g. youtube"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Campaign (optional), e.g. march-video"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
      </div>
      <div className="flex gap-2">
        <input readOnly value={link} onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-200" />
        <button onClick={copy} type="button"
          className="shrink-0 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
