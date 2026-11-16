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

// ---------------------------------------------------------------------------
// How an affiliate's signature is captured. "none" means they accepted the terms (verified email,
// ticked agreement, typed name) and will add a signature image later as a timestamped addendum.
// ---------------------------------------------------------------------------
export type AffiliateSignature =
  | { method: "drawn"; strokes: Stroke[] }
  | { method: "photo"; png: string } // base64 PNG, already validated
  | { method: "typed" }
  | { method: "none" };

export type VisibleSignature = Exclude<AffiliateSignature, { method: "none" }>;

const PNG_B64_PREFIX = "iVBORw0KGgo"; // base64 of the 8-byte PNG signature
const PHOTO_MAX_B64 = 80_000;

// The browser re-encodes the photo to a small transparent PNG. Here we only accept exactly that:
// a PNG of sensible size. It is embedded as an <img> data URI, which cannot run code.
export function sanitizePhotoB64(b64: unknown): string | null {
  if (typeof b64 !== "string" || b64.length < 200 || b64.length > PHOTO_MAX_B64) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || !b64.startsWith(PNG_B64_PREFIX)) return null;
  let head: string;
  try {
    head = atob(b64.slice(0, 48));
  } catch {
    return null;
  }
  if (head.slice(12, 16) !== "IHDR") return null;
  const be = (o: number) => ((head.charCodeAt(o) << 24) | (head.charCodeAt(o + 1) << 16) | (head.charCodeAt(o + 2) << 8) | head.charCodeAt(o + 3)) >>> 0;
  const w = be(16);
  const h = be(20);
  if (w < 100 || w > 1200 || h < 40 || h > 600) return null;
  return b64;
}

export function sanitizePhotoDataUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const prefix = "data:image/png;base64,";
  return input.startsWith(prefix) ? sanitizePhotoB64(input.slice(prefix.length)) : null;
}

export function photoToImg(png: string, height = 90): string {
  return `<img alt="Signature" height="${height}" style="height:${height}px;width:auto;max-width:100%" src="data:image/png;base64,${png}"/>`;
}
