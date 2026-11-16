"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

export type NeonOption = { value: string; label: string; sub?: string; icon?: ReactNode };

// A glowing dropdown that replaces the browser's plain <select>. Works with forms (hidden input),
// the keyboard (arrows, Enter, Escape, type to search) and touch.
export function NeonSelect({
  name, options, value, defaultValue, onChange, placeholder = "Choose…", searchable = false, required = false,
}: {
  name: string; options: NeonOption[]; value?: string; defaultValue?: string; onChange?: (v: string) => void;
  placeholder?: string; searchable?: boolean; required?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value !== undefined ? value : inner;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.label.toLowerCase().includes(t) || (o.sub ?? "").toLowerCase().includes(t)) : options;
  }, [options, q]);
  const selected = options.find((o) => o.value === current);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent | TouchEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("touchstart", away); };
  }, [open]);
  useEffect(() => { if (open && searchable) searchBox.current?.focus(); }, [open, searchable]);

  function openMenu() {
    setQ("");
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  }
  function pick(v: string) {
    if (value === undefined) setInner(v);
    onChange?.(v);
    setOpen(false);
  }
  function key(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(shown.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[active]) pick(shown[active].value); }
  }
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);

  return (
    <div ref={root} className="relative" onKeyDown={key}>
      <input type="hidden" name={name} value={current} required={required} />
      <button type="button" className="neon-trigger" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} onClick={() => (open ? setOpen(false) : openMenu())}>
        {selected?.icon && <span className="flex h-6 w-6 shrink-0 items-center justify-center">{selected.icon}</span>}
        <span className="min-w-0 flex-1 truncate">{selected ? selected.label : <span className="text-slate-500">{placeholder}</span>}</span>
        <svg className={`h-4 w-4 shrink-0 text-cyan-300 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" /></svg>
      </button>
      {open && (
        <div className="neon-menu" id={`${id}-list`} role="listbox">
          {searchable && (
            <input ref={searchBox} className="neon-search" value={q} placeholder="Type to search…" onChange={(e) => { setQ(e.target.value); setActive(0); }} />
          )}
          {shown.map((o, i) => (
            <button key={o.value} id={`${id}-opt-${i}`} type="button" role="option" aria-selected={o.value === current} data-active={i === active} data-selected={o.value === current} className="neon-option" onMouseEnter={() => setActive(i)} onClick={() => pick(o.value)}>
              {o.icon && <span className="flex h-6 w-6 shrink-0 items-center justify-center">{o.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate">{o.label}</span>
                {o.sub && <span className="block truncate text-xs text-slate-500">{o.sub}</span>}
              </span>
              {o.value === current && <svg className="h-4 w-4 shrink-0 text-cyan-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0z" /></svg>}
            </button>
          ))}
          {shown.length === 0 && <div className="px-3 py-4 text-center text-sm text-slate-500">No match</div>}
        </div>
      )}
    </div>
  );
}
