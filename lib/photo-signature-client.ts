import { extractInk } from "@/lib/ink";

// Browser-only. Turns a photo of a signature on paper into a small transparent PNG: dark ink only,
// cropped tight and scaled to fill the picture. The heavy maths lives in lib/ink.ts.
// The server re-checks the result, so nothing here is trusted.

const MAX_SIDE = 900;
const OUT_W = 480;
const OUT_H = 170;

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
  const res = extractInk(sctx.getImageData(0, 0, w, h).data, w, h);
  if ("error" in res) throw new Error(res.error);

  // Tight crop with a small margin, then scale to fill the output box.
  const { x0, y0, x1, y1 } = res.box;
  const padX = Math.round((x1 - x0) * 0.04) + 3;
  const padY = Math.round((y1 - y0) * 0.1) + 3;
  const cx0 = Math.max(0, x0 - padX), cy0 = Math.max(0, y0 - padY);
  const cx1 = Math.min(w - 1, x1 + padX), cy1 = Math.min(h - 1, y1 + padY);
  const cw = cx1 - cx0 + 1, ch = cy1 - cy0 + 1;

  const crop = document.createElement("canvas");
  crop.width = cw;
  crop.height = ch;
  const cctx = crop.getContext("2d")!;
  const img = cctx.createImageData(cw, ch);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const o = (y * cw + x) * 4;
      img.data[o] = 11; img.data[o + 1] = 18; img.data[o + 2] = 32;
      img.data[o + 3] = res.alpha[(cy0 + y) * w + (cx0 + x)];
    }
  cctx.putImageData(img, 0, 0);

  const fit = Math.min(OUT_W / cw, OUT_H / ch);
  const dw = Math.max(1, Math.round(cw * fit)), dh = Math.max(1, Math.round(ch * fit));
  const out = document.createElement("canvas");
  out.width = Math.max(120, dw);
  out.height = Math.max(60, dh);
  const octx = out.getContext("2d")!;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(crop, Math.round((out.width - dw) / 2), Math.round((out.height - dh) / 2), dw, dh);
  const dataUrl = out.toDataURL("image/png");
  if (dataUrl.length > 60_000) throw new Error("That signature is too detailed to save. Please retake it with a thicker pen.");
  return dataUrl;
}
