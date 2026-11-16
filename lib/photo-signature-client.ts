// Browser-only. Turns a photo of a signature on paper into a small transparent PNG (dark ink, no
// paper). The background is estimated block by block so shadows and uneven light do not matter.
// The server re-checks the result, so nothing here is trusted.

const MAX_SIDE = 1000;
const BLOCK = 32;

export async function photoToSignaturePng(file: File): Promise<string> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("We could not open that image. Please take the photo again.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error("This browser cannot process images.");
  sctx.drawImage(bmp, 0, 0, w, h);
  const { data } = sctx.getImageData(0, 0, w, h);

  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];

  // Paper brightness per block = a high percentile, so ink inside a block does not darken it.
  const bw = Math.ceil(w / BLOCK);
  const bh = Math.ceil(h / BLOCK);
  const bg = new Float32Array(bw * bh);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const hist = new Uint32Array(256);
      let n = 0;
      for (let y = by * BLOCK; y < Math.min(h, (by + 1) * BLOCK); y++)
        for (let x = bx * BLOCK; x < Math.min(w, (bx + 1) * BLOCK); x++) {
          hist[Math.min(255, Math.round(lum[y * w + x]))]++;
          n++;
        }
      let acc = 0;
      let v = 255;
      for (let k = 0; k < 256; k++) {
        acc += hist[k];
        if (acc >= n * 0.9) {
          v = k;
          break;
        }
      }
      bg[by * bw + bx] = Math.max(v, 60);
    }
  }
  const bgAt = (x: number, y: number) => {
    const fx = Math.min(bw - 1, Math.max(0, x / BLOCK - 0.5));
    const fy = Math.min(bh - 1, Math.max(0, y / BLOCK - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(bw - 1, x0 + 1), y1 = Math.min(bh - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const a = bg[y0 * bw + x0] * (1 - tx) + bg[y0 * bw + x1] * tx;
    const b = bg[y1 * bw + x0] * (1 - tx) + bg[y1 * bw + x1] * tx;
    return a * (1 - ty) + b * ty;
  };

  const alpha = new Float32Array(w * h);
  let ink = 0;
  let minX = w, maxX = 0, minY = h, maxY = 0;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ratio = lum[y * w + x] / bgAt(x, y);
      const a = ratio >= 0.86 ? 0 : ratio <= 0.55 ? 1 : (0.86 - ratio) / 0.31;
      alpha[y * w + x] = a;
      if (a > 0.5) {
        ink++;
        xs.push(x);
        ys.push(y);
      }
    }
  }
  const share = ink / (w * h);
  if (share < 0.0004) throw new Error("We could not see a signature. Use a dark pen on plain white paper, in good light, and fill the frame.");
  if (share > 0.3) throw new Error("The photo is too dark or busy. Try plain white paper in even light.");

  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  minX = xs[Math.floor(xs.length * 0.005)];
  maxX = xs[Math.floor(xs.length * 0.995)];
  minY = ys[Math.floor(ys.length * 0.005)];
  maxY = ys[Math.floor(ys.length * 0.995)];
  const padX = Math.round((maxX - minX) * 0.05) + 4;
  const padY = Math.round((maxY - minY) * 0.12) + 4;
  const cx0 = Math.max(0, minX - padX), cx1 = Math.min(w - 1, maxX + padX);
  const cy0 = Math.max(0, minY - padY), cy1 = Math.min(h - 1, maxY + padY);
  const cw = cx1 - cx0 + 1;
  const ch = cy1 - cy0 + 1;

  const out = document.createElement("canvas");
  const fit = Math.min(600 / cw, 220 / ch);
  out.width = Math.max(120, Math.round(cw * fit));
  out.height = Math.max(60, Math.round(ch * fit));
  const crop = document.createElement("canvas");
  crop.width = cw;
  crop.height = ch;
  const cctx = crop.getContext("2d")!;
  const img = cctx.createImageData(cw, ch);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const o = (y * cw + x) * 4;
      img.data[o] = 11; img.data[o + 1] = 18; img.data[o + 2] = 32;
      img.data[o + 3] = Math.round(alpha[(cy0 + y) * w + (cx0 + x)] * 255);
    }
  cctx.putImageData(img, 0, 0);
  const octx = out.getContext("2d")!;
  octx.imageSmoothingQuality = "high";
  const dw = Math.round(cw * fit), dh = Math.round(ch * fit);
  octx.drawImage(crop, Math.round((out.width - dw) / 2), Math.round((out.height - dh) / 2), dw, dh);
  const dataUrl = out.toDataURL("image/png");
  if (dataUrl.length > 140_000) throw new Error("That signature is too detailed to save. Please retake it with a thicker pen.");
  return dataUrl;
}
