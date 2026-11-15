// Signatures are captured as stroke coordinates and drawn as vector paths, so the signed record
// is self-contained and needs no image files. Input from the browser is never trusted:
// everything is re-validated and re-serialised here.

export const SIG_W = 600;
export const SIG_H = 220;
export type Stroke = Array<[number, number]>;

export function sanitizeStrokes(input: unknown): Stroke[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 60) return null;
  const out: Stroke[] = [];
  let points = 0;
  for (const raw of input) {
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > 1500) return null;
    const stroke: Stroke = [];
    for (const p of raw) {
      if (!Array.isArray(p) || p.length !== 2) return null;
      const x = Number(p[0]);
      const y = Number(p[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > SIG_W || y < 0 || y > SIG_H) return null;
      stroke.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    }
    points += stroke.length;
    if (points > 6000) return null;
    out.push(stroke);
  }
  return points >= 20 ? out : null; // a real signature has more than a dot
}

export function strokesToSvg(strokes: Stroke[], height = 90): string {
  const d = strokes
    .map((s) => (s.length === 1 ? `M${s[0][0]} ${s[0][1]}l0.1 0.1` : "M" + s.map((p) => `${p[0]} ${p[1]}`).join("L")))
    .join("");
  const width = Math.round((height * SIG_W) / SIG_H);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIG_W} ${SIG_H}" width="${width}" height="${height}" role="img" aria-label="Signature">` +
    `<path d="${d}" fill="none" stroke="#0b1220" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  );
}
