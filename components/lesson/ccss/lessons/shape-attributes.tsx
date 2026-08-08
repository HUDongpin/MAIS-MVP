"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const COLORS = ["var(--band-early)", "var(--band-middle)", "var(--band-high)", "var(--band-upper)"];

export default function Lesson() {
  const [rot, setRot] = useState(0);
  const [scale, setScale] = useState(1);
  const [ci, setCi] = useState(0);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        What makes a triangle a triangle? Not its color. Not its size. Not which
        way it points. A triangle is a triangle because it has{" "}
        <strong>3 straight sides</strong>{" "}and <strong>3 corners</strong>{" "}— those
        are its <strong>defining</strong>{" "}attributes.
      </p>

      <Figure caption="Change the color, size, and direction all you like — it is still a triangle.">
        <div className="flex flex-col items-center gap-6">
          <svg width="180" height="180" viewBox="0 0 180 180" role="img" aria-label={`A triangle, rotated ${rot} degrees and scaled to ${scale}× — still a triangle with 3 straight sides`}>
            {/* One centring mechanism, not two. The SVG transform attribute
                already rotates about (90,90), and the CSS transform-origin was
                applied on top of it, so the shape actually rotated about
                (180,180) — the bottom-right corner of the viewBox — and swung
                out of frame. */}
            <g transform={`rotate(${rot} 90 90) translate(90 90) scale(${scale}) translate(-90 -90)`} style={{ transition: "transform 0.3s ease" }}>
              <polygon points="90,35 145,135 35,135" fill={COLORS[ci]} />
            </g>
          </svg>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border-2 px-4 py-3" style={{ borderColor: "var(--band-upper)" }}>
              <div className="text-sm font-black" style={{ color: "var(--band-upper)" }}>✓ Defining (must be true)</div>
              <div className="text-sm text-[var(--ink-soft)]">3 straight sides · 3 corners · a closed shape</div>
            </div>
            <div className="rounded-xl border-2 border-[var(--line)] px-4 py-3">
              <div className="text-sm font-black text-[var(--ink-faint)]">✗ Not defining (can change)</div>
              <div className="text-sm text-[var(--ink-soft)]">color · size · which way it points</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Slider label="turn" value={rot} min={0} max={360} onChange={setRot} />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">size</span>
              <input type="range" min={0.6} max={1.1} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-28 accent-[var(--band-early)]" aria-label="size" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">color</span>
              <div className="flex gap-1.5">
                {COLORS.map((c, i) => (
                  <button key={c} type="button" onClick={() => setCi(i)} className="h-7 w-7 rounded-full border-2" style={{ background: c, borderColor: i === ci ? "var(--ink)" : "transparent" }} aria-label={`Colour swatch ${i + 1} of ${COLORS.length} — colour is not a defining attribute`} aria-pressed={i === ci} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Figure>

      <h2>What matters and what doesn't</h2>
      <p>
        A big red triangle, a tiny blue one, and one turned upside down are{" "}
        <em>all</em>{" "}triangles. The only thing that matters is the sides and
        corners.
      </p>

      <MathCheck>
        <p>
          Shapes have <strong>defining attributes</strong>{" "}(a triangle has three
          sides; a rectangle has four sides and four square corners) and{" "}
          <strong>non-defining attributes</strong>{" "}(color, size, orientation,
          overall shape position). Telling these apart — knowing which features
          actually make the shape what it is — is 1.G.A.1.
        </p>
      </MathCheck>
    </div>
  );
}

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-28 accent-[var(--band-early)]" aria-label={label} />
    </div>
  );
}
