"use client";

import { useEffect, useRef } from "react";
import { SIG_H, SIG_W, type Stroke } from "@/lib/signature";

export function SignaturePad({ onChange, initial }: { onChange: (s: Stroke[]) => void; initial?: Stroke[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>(initial ?? []);
  const drawing = useRef(false);
  const total = useRef(0);

  function paint() {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, SIG_W, SIG_H);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokes.current) {
      ctx.beginPath();
      s.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      if (s.length === 1) ctx.lineTo(s[0][0] + 0.1, s[0][1] + 0.1);
      ctx.stroke();
    }
  }

  useEffect(() => {
    paint();
    onChange(strokes.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(SIG_W, Math.max(0, ((e.clientX - r.left) * SIG_W) / r.width));
    const y = Math.min(SIG_H, Math.max(0, ((e.clientY - r.top) * SIG_H) / r.height));
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    if (strokes.current.length < 55) strokes.current.push([point(e)]);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const s = strokes.current[strokes.current.length - 1];
    if (!s || s.length >= 1400 || total.current > 5500) return;
    const [x, y] = point(e);
    const [lx, ly] = s[s.length - 1];
    if (Math.hypot(x - lx, y - ly) < 1.5) return;
    s.push([x, y]);
    total.current += 1;
    paint();
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    paint();
    onChange(strokes.current.map((s) => [...s] as Stroke));
  }
  function clear() {
    strokes.current = [];
    total.current = 0;
    paint();
    onChange([]);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-slate-600/70 bg-slate-950/70">
        <canvas
          ref={canvas}
          width={SIG_W}
          height={SIG_H}
          className="block w-full cursor-crosshair"
          style={{ touchAction: "none", aspectRatio: `${SIG_W} / ${SIG_H}` }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
        />
        <span className="pointer-events-none absolute bottom-2 left-3 text-xs text-slate-500">Sign here with your finger or mouse</span>
      </div>
      <button type="button" onClick={clear} className="mt-2 text-sm text-slate-400 hover:text-slate-200">
        Clear and start again
      </button>
    </div>
  );
}
