"use client";

import { useEffect, useState } from "react";
import { strokesToSvg } from "@/lib/signature";
import type { PickerValue } from "@/components/signature-picker";

// A paper-style page that shows the signature landing on the agreement: the affiliate's on the left,
// Knoxified's (already applied) on the right. It updates live as the affiliate signs.
export function ContractPreview({
  heading, intro, lines, partyName, knox, value, skipped = false,
}: {
  heading: string; intro: string; lines: string[]; partyName: string;
  knox: { html: string; name: string; title: string }; value: PickerValue | null; skipped?: boolean;
}) {
  const [today, setToday] = useState("");
  useEffect(() => setToday(new Date().toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" })), []);

  let mine: React.ReactNode = null;
  if (!skipped && value?.ready) {
    if (value.method === "drawn" && value.strokes) mine = <div dangerouslySetInnerHTML={{ __html: strokesToSvg(value.strokes, 64) }} />;
    else if (value.method === "typed") mine = <span style={{ fontFamily: "'Brush Script MT','Segoe Script',cursive", fontSize: 30 }}>{partyName}</span>;
    else if (value.method === "photo" && value.preview) /* eslint-disable-next-line @next/next/no-img-element */ mine = <img src={value.preview} alt="" style={{ height: 64, width: "auto", maxWidth: "100%" }} />;
  }
  const key = `${value?.method}-${value?.ready}-${skipped}`;

  return (
    <div className="mx-auto w-full overflow-hidden rounded-xl bg-[#fbfaf5] text-slate-800 shadow-[0_0_40px_rgba(34,211,238,0.18)] ring-1 ring-cyan-300/40" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <div className="px-6 pb-2 pt-6 sm:px-8">
        <div className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">Knoxified</div>
        <h3 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{heading}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{intro}</p>
        <ul className="mt-3 space-y-1 text-[0.82rem] leading-relaxed text-slate-600">
          {lines.map((l) => <li key={l} className="flex gap-2"><span className="text-slate-400">§</span><span>{l}</span></li>)}
        </ul>
        <div className="mt-4 space-y-1.5" aria-hidden>
          {[92, 100, 86, 96, 60].map((w, i) => <div key={i} className="h-1.5 rounded-full bg-slate-200/80" style={{ width: `${w}%` }} />)}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-dashed border-slate-300 px-6 pb-6 pt-4 sm:gap-8 sm:px-8">
        <div>
          <div className="mb-1 text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">Affiliate</div>
          <div className="flex h-[78px] items-end border-b border-slate-500 pb-1 text-slate-900">
            {mine ? <div key={key} className="sig-reveal">{mine}</div> : (
              <span className="text-xs italic text-slate-400">{skipped ? "Signature to be added later" : "Your signature appears here"}</span>
            )}
          </div>
          <div className="mt-1.5 text-sm font-semibold text-slate-900">{partyName}</div>
          <div className="text-xs text-slate-500">{mine || skipped ? `Signed ${today}` : "Not signed yet"}</div>
        </div>
        <div>
          <div className="mb-1 text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">For Knoxified</div>
          <div className="flex h-[78px] items-end border-b border-slate-500 pb-1 text-slate-900"><div dangerouslySetInnerHTML={{ __html: knox.html }} /></div>
          <div className="mt-1.5 text-sm font-semibold text-slate-900">{knox.name}</div>
          <div className="text-xs text-slate-500">{knox.title} · signed in advance</div>
        </div>
      </div>
    </div>
  );
}
