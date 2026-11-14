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
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the field is selectable.
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source (optional), e.g. youtube" className="input" />
        <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Campaign (optional), e.g. march-video" className="input" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="input font-mono !text-xs" />
        <button onClick={copy} type="button" className="btn btn-primary shrink-0">{copied ? "Copied ✓" : "Copy link"}</button>
      </div>
    </div>
  );
}
