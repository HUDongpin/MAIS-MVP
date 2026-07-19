"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const STEP1 = "var(--band-middle)";
const STEP2 = "var(--band-upper)";

export default function Lesson() {
  const [packs, setPacks] = useState(4);
  const [per, setPer] = useState(6);
  const [give, setGive] = useState(5);

  const made = packs * per;
  const left = made - give;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>two-step problem</strong>{" "}needs two operations, one after the
        other. The trick is doing them <strong>in the right order</strong>:
        multiply and divide before you add or subtract.
      </p>

      <Figure caption="Do the multiplication first, then the subtraction. Order matters!">
        <div className="flex flex-col items-center gap-6">
          <p className="m-0 max-w-md text-center text-lg font-semibold">
            You buy <strong>{packs}</strong>{" "}packs of pens with <strong>{per}</strong>{" "}
            pens in each. You give <strong>{give}</strong>{" "}pens to friends. How many
            pens do you keep?
          </p>

          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl border-2 px-5 py-2" style={{ borderColor: STEP1 }}>
              <span className="text-xs font-bold uppercase" style={{ color: STEP1 }}>Step 1 · multiply</span>
              <div className="font-mono text-lg font-black">{packs} × {per} = {made} pens</div>
            </div>
            <span className="text-[var(--ink-faint)]">↓</span>
            <div className="rounded-xl border-2 px-5 py-2" style={{ borderColor: STEP2 }}>
              <span className="text-xs font-bold uppercase" style={{ color: STEP2 }}>Step 2 · subtract</span>
              <div className="font-mono text-lg font-black">{made} − {give} = {left} pens</div>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--surface-2)] px-5 py-3 text-center">
            <div className="font-mono text-lg font-black">
              (<span style={{ color: STEP1 }}>{packs} × {per}</span>) − {give} = <span style={{ color: STEP2 }}>{left}</span>
            </div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">Multiply first — that is the order of operations.</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Packs" value={packs} min={1} max={8} onChange={setPacks} />
            <Stepper label="Pens each" value={per} min={1} max={9} onChange={setPer} />
            <Stepper label="Give away" value={give} min={0} max={made} onChange={setGive} />
          </div>
        </div>
      </Figure>

      <h2>Order keeps it correct</h2>
      <p>
        If you subtracted first, you would get the wrong answer. Multiplication
        groups the pens together, so it has to happen before the subtraction.
        That is why <strong>{packs} × {per} − {give} = {left}</strong>, not{" "}
        {packs} × ({per} − {give}).
      </p>

      <MathCheck>
        <p>
          Two-step word problems use two of the four operations (3.OA.D.8). The{" "}
          <strong>order of operations</strong>{" "}says multiplication and division
          come before addition and subtraction, so{" "}
          <strong>{packs} × {per} − {give}</strong>{" "}means &ldquo;multiply {packs}×{per} first
          ({made}), then subtract {give}&rdquo; = {left}. Estimating first ({packs}×{per} ≈ {Math.round(made / 10) * 10}) helps check that the answer is reasonable.
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
        <span className="w-7 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
