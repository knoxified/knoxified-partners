import { TERMS } from "@/lib/terms";

function Clause({ label, text }: { label: string; text: string }) {
  const [lead, ...bullets] = text.split("\n- ");
  return (
    <div className="mt-3">
      <p>
        <span className="font-semibold text-slate-100">{label}</span> {lead}
      </p>
      {bullets.length > 0 && (
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TermsView() {
  return (
    <div className="text-sm leading-relaxed text-slate-300">
      {TERMS.map((s, si) => (
        <section key={s.id}>
          <h3 className="mt-6 text-base font-semibold text-slate-50">
            {si + 1}. {s.title}
          </h3>
          {s.clauses.map((c, ci) => (
            <Clause key={ci} label={`${si + 1}.${ci + 1}`} text={c} />
          ))}
          {s.table && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-700/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900">
                  <tr>{s.table.head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {s.table.rows.map((r, ri) => (
                    <tr key={ri}>{r.map((c, ci) => <td key={ci} className="px-3 py-2">{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
