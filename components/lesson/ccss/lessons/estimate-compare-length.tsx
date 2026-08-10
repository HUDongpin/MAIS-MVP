"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const U = 30;
const A = "var(--band-middle)";
const B = "var(--band-early)";
const DIFF = "var(--band-high)";
const resultId = "ccss-estimate-compare-length-result";

export default function Lesson() {
  const [la, setLa] = useState(7);
  const [lb, setLb] = useState(4);
  const [reveal, setReveal] = useState(false);

  const longer = la >= lb ? "top" : "bottom";
  const diff = Math.abs(la - lb);

  const Bar = ({ len, color, extra }: { len: number; color: string; extra?: number }) => (
    <div className="flex items-center gap-2">
      <div className="flex rounded" style={{ height: 24, overflow: "hidden" }}>
        <div style={{ width: (len - (extra ?? 0)) * U, background: color }} />
        {extra ? <div style={{ width: extra * U, background: DIFF }} /> : null}
      </div>
      {reveal && <span className="font-mono text-sm font-bold" style={{ color }}>{len}</span>}
    </div>
  );

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Before you measure, <strong>estimate</strong>{" "}— make a smart guess. Then
        measure to check. To <strong>compare</strong>{" "}two objects, line them up at
        the same start and see how much longer one is.
      </p>

      <Figure caption="Guess first, then reveal the lengths. The purple piece at the end of the longer bar shows how much longer.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col gap-3">
            <Bar len={la} color={A} extra={longer === "top" ? diff : 0} />
            <Bar len={lb} color={B} extra={longer === "bottom" ? diff : 0} />
          </div>

          <div id={resultId} className="text-center">
            {reveal ? (
              <div className="text-2xl font-black">
                {/* At equal lengths `longer` arbitrarily picked "top" and the
                    widget announced "The top bar is 0 units longer." */}
                {diff === 0 ? <>The two bars are the <span style={{ color: DIFF }}>same length</span>.</> : <>The {longer === "top" ? "top" : "bottom"} bar is{" "}
                <span style={{ color: DIFF }}>{diff} unit{diff === 1 ? "" : "s"}</span> longer.</>}
                <div className="mt-1 font-mono text-lg text-[var(--ink-soft)]">{Math.max(la, lb)} − {Math.min(la, lb)} = {diff}</div>
              </div>
            ) : (
              <div className="text-lg font-semibold text-[var(--ink-faint)]">Estimate: how much longer is one bar? Then reveal.</div>
            )}
          </div>

          <button type="button" onClick={() => setReveal((r) => !r)} aria-expanded={reveal} aria-controls={resultId} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: reveal ? "var(--ink-soft)" : DIFF }}>
            {reveal ? "Hide & estimate again" : "Reveal the measurements"}
          </button>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Top bar" value={la} color={A} onChange={(v) => { setLa(v); setReveal(false); }} />
            <Stepper label="Bottom bar" value={lb} color={B} onChange={(v) => { setLb(v); setReveal(false); }} />
          </div>
        </div>
      </Figure>

      <h2>How much longer?</h2>
      <p>
        “How much longer” is a <strong>subtraction</strong>. Line the objects up,
        measure both in the same unit, and subtract the shorter length from the
        longer length.
        {reveal ? <> Here, {Math.max(la, lb)} − {Math.min(la, lb)} = {diff}.</> : null}
      </p>

      <MathCheck>
        <p>
          <strong>Estimating</strong>{" "}length builds a feel for units like inches,
          feet, centimeters, and meters (2.MD.A.3). To <strong>compare</strong>{" "}
          two lengths, measure both in the same unit and subtract — the difference
          tells how much longer one is (2.MD.A.4).
          {reveal ? <> For these bars, {Math.max(la, lb)} − {Math.min(la, lb)} = {diff}.</> : null}
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(10, value + 1))} disabled={value >= 10} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
