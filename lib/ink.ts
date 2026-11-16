// Pure image maths (no DOM) that pulls the pen ink out of a photo of a signature on paper.
// It estimates the paper brightness block by block (so shadows do not matter), keeps only the
// strokes that form one signature, and ignores specks, paper edges and table edges.

export type InkResult = { alpha: Uint8Array; box: { x0: number; y0: number; x1: number; y1: number } } | { error: string };

const BLOCK = 24;

export function extractInk(rgba: Uint8ClampedArray, w: number, h: number): InkResult {
  const n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];

  // Paper brightness per block: a high percentile, so ink inside the block does not darken it.
  const bw = Math.ceil(w / BLOCK), bh = Math.ceil(h / BLOCK);
  const bg = new Float32Array(bw * bh);
  const hist = new Uint32Array(256);
  for (let by = 0; by < bh; by++)
    for (let bx = 0; bx < bw; bx++) {
      hist.fill(0);
      let cnt = 0;
      for (let y = by * BLOCK; y < Math.min(h, (by + 1) * BLOCK); y++)
        for (let x = bx * BLOCK; x < Math.min(w, (bx + 1) * BLOCK); x++) {
          hist[Math.min(255, Math.round(lum[y * w + x]))]++;
          cnt++;
        }
      let acc = 0, v = 255;
      for (let k = 0; k < 256; k++) {
        acc += hist[k];
        if (acc >= cnt * 0.92) { v = k; break; }
      }
      bg[by * bw + bx] = Math.max(v, 70);
    }
  // Light 3x3 smoothing of the paper map.
  const bg2 = new Float32Array(bg.length);
  for (let by = 0; by < bh; by++)
    for (let bx = 0; bx < bw; bx++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const yy = by + dy, xx = bx + dx;
          if (yy >= 0 && yy < bh && xx >= 0 && xx < bw) { s += bg[yy * bw + xx]; c++; }
        }
      bg2[by * bw + bx] = s / c;
    }
  const paper = (x: number, y: number) => {
    const fx = Math.min(bw - 1, Math.max(0, x / BLOCK - 0.5));
    const fy = Math.min(bh - 1, Math.max(0, y / BLOCK - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(bw - 1, x0 + 1), y1 = Math.min(bh - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const a = bg2[y0 * bw + x0] * (1 - tx) + bg2[y0 * bw + x1] * tx;
    const b = bg2[y1 * bw + x0] * (1 - tx) + bg2[y1 * bw + x1] * tx;
    return a * (1 - ty) + b * ty;
  };

  // Ink strength 0..1 (soft), and a firm mask for deciding what is a stroke.
  const alpha = new Float32Array(n);
  const mask = new Uint8Array(n);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const r = lum[y * w + x] / paper(x, y);
      const a = r >= 0.8 ? 0 : r <= 0.5 ? 1 : (0.8 - r) / 0.3;
      alpha[y * w + x] = a;
      if (r < 0.72) mask[y * w + x] = 1;
    }

  // Group nearby ink: dilate the mask a little, label connected groups, then keep real signatures.
  const rad = Math.max(3, Math.round(Math.max(w, h) * 0.012));
  const dil = new Uint8Array(n);
  const tmp = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    let last = -1e9;
    for (let x = 0; x < w; x++) { if (mask[y * w + x]) last = x; if (x - last <= rad) tmp[y * w + x] = 1; }
    last = 1e9;
    for (let x = w - 1; x >= 0; x--) { if (mask[y * w + x]) last = x; if (last - x <= rad) tmp[y * w + x] = 1; }
  }
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    for (let y = 0; y < h; y++) { if (tmp[y * w + x]) last = y; if (y - last <= rad) dil[y * w + x] = 1; }
    last = 1e9;
    for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) last = y; if (last - y <= rad) dil[y * w + x] = 1; }
  }
  const label = new Int32Array(n);
  type G = { ink: number; x0: number; y0: number; x1: number; y1: number };
  const groups: G[] = [];
  const stack: number[] = [];
  for (let s = 0; s < n; s++) {
    if (!dil[s] || label[s]) continue;
    const id = groups.length + 1;
    const g: G = { ink: 0, x0: w, y0: h, x1: 0, y1: 0 };
    label[s] = id;
    stack.push(s);
    while (stack.length) {
      const p = stack.pop()!;
      const px = p % w, py = (p / w) | 0;
      if (mask[p]) {
        g.ink++;
        if (px < g.x0) g.x0 = px; if (px > g.x1) g.x1 = px;
        if (py < g.y0) g.y0 = py; if (py > g.y1) g.y1 = py;
      }
      if (px > 0 && dil[p - 1] && !label[p - 1]) { label[p - 1] = id; stack.push(p - 1); }
      if (px < w - 1 && dil[p + 1] && !label[p + 1]) { label[p + 1] = id; stack.push(p + 1); }
      if (py > 0 && dil[p - w] && !label[p - w]) { label[p - w] = id; stack.push(p - w); }
      if (py < h - 1 && dil[p + w] && !label[p + w]) { label[p + w] = id; stack.push(p + w); }
    }
    groups.push(g);
  }

  // A paper or table edge is a long dark line that runs to the border: drop those.
  const edgeish = (g: G) => {
    const touches = (g.x0 <= 1 ? 1 : 0) + (g.y0 <= 1 ? 1 : 0) + (g.x1 >= w - 2 ? 1 : 0) + (g.y1 >= h - 2 ? 1 : 0);
    const spanW = (g.x1 - g.x0) / w, spanH = (g.y1 - g.y0) / h;
    return touches >= 1 && (spanW > 0.85 || spanH > 0.85);
  };
  const cands = groups.map((g, i) => ({ g, id: i + 1 })).filter(({ g }) => g.ink >= 20 && !edgeish(g));
  if (!cands.length) return { error: "We could not see a signature. Use a dark pen on plain white paper, in good light, and fill the frame." };
  const biggest = Math.max(...cands.map(({ g }) => g.ink));
  const keep = new Set(cands.filter(({ g }) => g.ink >= biggest * 0.06).map(({ id }) => id));

  const out = new Uint8Array(n);
  let x0 = w, y0 = h, x1 = 0, y1 = 0, inkPx = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (alpha[p] > 0 && keep.has(label[p])) {
        out[p] = Math.round(alpha[p] * 255);
        if (alpha[p] > 0.5) {
          inkPx++;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
  const bw2 = x1 - x0 + 1, bh2 = y1 - y0 + 1;
  if (inkPx < 60 || bw2 < 12 || bh2 < 8) return { error: "We could not see a signature. Use a dark pen on plain white paper, in good light, and fill the frame." };
  if (inkPx / (bw2 * bh2) > 0.6) return { error: "The photo is too dark or busy. Try plain white paper in even light." };
  return { alpha: out, box: { x0, y0, x1, y1 } };
}
