"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

export default function Lesson() {
  const [shear, setShear] = useState(0); // 0..4 lean of the stack

  const lean = shear * 12;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Where do volume formulas come from? Not magic — from <strong>informal
        limiting arguments</strong>. Slice a shape into thin layers and add them up.{" "}
        <strong>Cavalieri&apos;s principle</strong>{" "}says: if two solids have equal
        cross-sections at every height, they have equal volume.
      </p>

      <Figure caption="Lean a stack of coins and its volume doesn't change — same layers, same total. That's Cavalieri.">
        <div className="flex flex-col items-center gap-6">
          <svg className="mx-auto h-auto max-w-full" width={240} height={200} viewBox="0 0 240 200" role="img" aria-label="sheared stack of layers">
            {Array.from({ length: 8 }, (_, i) => {
              const y = 176 - i * 20;
              const x = 60 + (i / 7) * lean;
              return <rect key={i} x={x} y={y} width={90} height={16} rx={4} fill={ACCENT} fillOpacity={0.4} stroke={ACCENT} strokeWidth={1.5} />;
            })}
          </svg>

          <p className="m-0 max-w-md text-center text-[15px] text-[var(--ink-soft)]">
            {shear === 0 ? "A straight stack (a prism)." : "A leaning stack (an oblique prism) — same layers, so the same volume."}
          </p>

          <Stepper label="lean" value={shear} min={0} max={4} onChange={setShear} />

          <div className="rounded-xl border-2 px-6 py-2 text-center font-mono text-sm" style={{ borderColor: ACCENT }}>
            volume = base area × height — unchanged by the lean
          </div>
        </div>
      </Figure>

      <h2>Slices add up to the whole</h2>
      <p>
        A circle&apos;s area πr² comes from slicing it into thin wedges that rearrange
        into a rectangle of size πr by r. A cylinder is a stack of disks, so its
        volume is (πr²)·h. Leaning the stack doesn&apos;t change how much is there —
        <strong>Cavalieri&apos;s principle</strong>{" "}— which is why an oblique cylinder
        has the same volume as a right one.
      </p>

      <MathCheck>
        <p>
          <strong>Informal limiting arguments</strong>{" "}(dissection and approximation)
          justify the formulas for a circle&apos;s circumference and area and a
          cylinder&apos;s volume (G-GMD.1). <strong>Cavalieri&apos;s principle</strong>{" "}
          — equal cross-sectional areas at every height mean equal volume (G-GMD.2) —
          extends these to oblique solids, pyramids, and cones.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
