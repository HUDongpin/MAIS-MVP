"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const BARW = 260;
const A = "var(--band-upper)";
const B = "var(--band-middle)";
const SUM = "var(--band-high)";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
function Bar({ num, den, color }: { num: number; den: number; color: string }) {
  return (
    <div className="flex overflow-hidden rounded-lg border-2 border-[var(--line)]" style={{ width: BARW, height: 30 }}>
      {Array.from({ length: den }, (_, i) => (
        <div key={i} className="border-r border-white/60 last:border-r-0" style={{ width: BARW / den, background: i < num ? color : "var(--surface-2)" }} />
      ))}
    </div>
  );
}

export default function Lesson() {
  const [n1, setN1] = useState(1);
  const [d1, setD1] = useState(2);
  const [n2, setN2] = useState(1);
  const [d2, setD2] = useState(3);
  const [op, setOp] = useState<"add" | "sub">("add");

  // Subtract mode must never go negative (5.NF.A.1 has no negative fractions).
  // Lower the second fraction where possible; when it is already at its floor
  // of 1/d2, raise the first instead so the invariant is always satisfiable.
  const applyState = (nn1: number, dd1: number, nn2: number, dd2: number) => {
    let a1 = Math.max(1, Math.min(nn1, dd1));
    let a2 = Math.max(1, Math.min(nn2, dd2));
    if (op === "sub") {
      const maxSecond = Math.floor((a1 / dd1) * dd2);
      if (maxSecond >= 1) {
        a2 = Math.min(a2, maxSecond);
      } else {
        a2 = 1;
        a1 = Math.max(a1, Math.min(dd1, Math.ceil(dd1 / dd2)));
      }
    }
    setN1(a1); setD1(dd1); setN2(a2); setD2(dd2);
  };

  const lcm = (d1 * d2) / gcd(d1, d2);
  const na = n1 * (lcm / d1);
  const nc = n2 * (lcm / d2);
  // Math.abs() here printed a positive answer for a negative difference:
  // 1/2 − 2/3 showed "3/6 − 4/6 = 1/6" beside correct renaming rows. Grade 5
  // (5.NF.A.1) does not cover negative fractions, so the subtraction is kept
  // non-negative by the controls below rather than by hiding the sign.
  const resNum = op === "add" ? na + nc : na - nc;
  const whole = Math.floor(resNum / lcm);
  const rem = resNum % lcm;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        You cannot add fractions until the pieces are the <strong>same size</strong>.
        So first rewrite both with a <strong>common denominator</strong>, then add
        (or subtract) the numerators.
      </p>

      <Figure caption="Rewrite each fraction with the common denominator, then combine the pieces.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {(["add", "sub"] as const).map((o) => (
              // Switching to Subtract also has to bring the second fraction
              // down, or the pair chosen while adding could go negative.
              <button key={o} type="button" onClick={() => { setOp(o); if (o === "sub") { const m = Math.floor((n1 / d1) * d2); if (m >= 1) setN2((p) => Math.max(1, Math.min(p, m))); else { setN2(1); setN1((p) => Math.max(p, Math.min(d1, Math.ceil(d1 / d2)))); } } }} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={op === o ? { background: A, color: "white", borderColor: A } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o === "add" ? "Add" : "Subtract"}</button>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3"><Bar num={n1} den={d1} color={A} /><span className="w-12 font-mono font-bold" style={{ color: A }}>{n1}/{d1}</span></div>
            <div className="flex items-center gap-3"><Bar num={n2} den={d2} color={B} /><span className="w-12 font-mono font-bold" style={{ color: B }}>{n2}/{d2}</span></div>
          </div>

          <div className="rounded-xl bg-[var(--surface-2)] px-5 py-3 text-center font-mono text-[15px]">
            <span style={{ color: A }}>{n1}/{d1} = {na}/{lcm}</span>
            <span className="mx-2 text-[var(--ink-faint)]">{op === "add" ? "+" : "−"}</span>
            <span style={{ color: B }}>{n2}/{d2} = {nc}/{lcm}</span>
          </div>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">
              = <span style={{ color: SUM }}>{resNum}/{lcm}</span>
              {resNum >= lcm && rem === 0 && <span className="text-[var(--ink-soft)]"> = {whole}</span>}
              {resNum > lcm && rem > 0 && <span className="text-[var(--ink-soft)]"> = {whole} {rem}/{lcm}</span>}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            {/* Every transition goes through one normaliser. Four divergent
                inline clamps left a gap: the FIRST denominator's handler never
                re-clamped n2, so raising it twice in subtract mode produced
                "= −1/12" and prose reading "so you can subtract them: −1/12". */}
            <FracControl label="First" color={A} num={n1} den={d1}
              onNum={(v) => applyState(v, d1, n2, d2)}
              onDen={(v) => applyState(Math.min(n1, v), v, n2, d2)} />
            <FracControl label="Second" color={B} num={n2} den={d2}
              onNum={(v) => applyState(n1, d1, v, d2)}
              onDen={(v) => applyState(n1, d1, Math.min(n2, v), v)} />
          </div>
        </div>
      </Figure>

      <h2>Common denominator first</h2>
      <p>
        The smallest whole both {d1} and {d2} divide is {lcm}. Renaming{" "}
        {n1}/{d1} as {na}/{lcm} and {n2}/{d2} as {nc}/{lcm} makes the pieces match,
        so you can {op === "add" ? "add" : "subtract"} them: {resNum}/{lcm}.
      </p>

      <MathCheck>
        <p>
          Adding and subtracting fractions with unlike denominators (5.NF.A.1)
          means replacing them with <strong>equivalent fractions</strong>{" "}that
          share a common denominator, then combining numerators. Estimating with{" "}
          <strong>benchmarks</strong>{" "}like 1/2 (5.NF.A.2) checks the result is
          sensible — here the answer {na}/{lcm} {op === "add" ? "+" : "−"} {nc}/{lcm} = {resNum}/{lcm}.
        </p>
      </MathCheck>
    </div>
  );
}

function FracControl({ label, color, num, den, onNum, onDen }: { label: string; color: string; num: number; den: number; onNum: (v: number) => void; onDen: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{label}: {num}/{den}</span>
      <div className="flex items-center gap-3">
        <Mini label={`${label} numerator`} value={num} min={1} max={den} onChange={onNum} />
        <span className="text-2xl text-[var(--ink-faint)]">/</span>
        <Mini label={`${label} denominator`} value={den} min={2} max={6} onChange={onDen} />
      </div>
    </div>
  );
}

function Mini({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
      <span className="w-5 text-center text-lg font-black tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
    </div>
  );
}
