"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const A = "var(--band-middle)";
const B = "var(--band-upper)";
const BOTH = "var(--band-high)";

function factors(n: number) {
  const f: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i);
  return f;
}
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function Lesson() {
  const [a, setA] = useState(12);
  const [b, setB] = useState(18);
  const [mode, setMode] = useState<"gcf" | "lcm">("gcf");

  const fa = factors(a), fb = factors(b);
  const g = gcd(a, b);
  const lcm = (a * b) / g;
  const multA = Array.from({ length: 6 }, (_, i) => a * (i + 1));
  const multB = Array.from({ length: 6 }, (_, i) => b * (i + 1));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <strong>greatest common factor</strong>{" "}is the biggest number that
        divides both. The <strong>least common multiple</strong>{" "}is the smallest
        number both divide into. Both come from looking at factors and multiples.
      </p>

      <Figure caption="Highlighted numbers are shared. The GCF is the biggest shared factor; the LCM is the smallest shared multiple.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {([["gcf", "Greatest Common Factor"], ["lcm", "Least Common Multiple"]] as const).map(([m, lbl]) => (
              <button key={m} type="button" onClick={() => setMode(m)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mode === m ? { background: BOTH, color: "white", borderColor: BOTH } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{lbl}</button>
            ))}
          </div>

          {mode === "gcf" ? (
            <div className="flex flex-col gap-3">
              <Row label={`Factors of ${a}`} nums={fa} color={A} highlight={(n) => fb.includes(n)} />
              <Row label={`Factors of ${b}`} nums={fb} color={B} highlight={(n) => fa.includes(n)} />
              <div className="text-center font-mono text-xl font-black">GCF({a}, {b}) = <span style={{ color: BOTH }}>{g}</span></div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Row label={`Multiples of ${a}`} nums={multA} color={A} highlight={(n) => n % lcm === 0} />
              <Row label={`Multiples of ${b}`} nums={multB} color={B} highlight={(n) => n % lcm === 0} />
              <div className="text-center font-mono text-xl font-black">LCM({a}, {b}) = <span style={{ color: BOTH }}>{lcm}</span></div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="First" value={a} onChange={setA} />
            <Stepper label="Second" value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Factoring out the GCF</h2>
      <p>
        The GCF lets you use the <strong>distributive property</strong>{" "}in reverse:{" "}
        {a} + {b} = {g} × {a / g} + {g} × {b / g} = <strong>{g} × ({a / g} + {b / g})</strong>. Pulling out the common factor {g} rewrites the sum as a product.
      </p>

      <MathCheck>
        <p>
          The <strong>GCF</strong>{" "}of two numbers (≤ 100) is their largest shared
          factor; the <strong>LCM</strong>{" "}is their smallest shared multiple
          (6.NS.B.4). Here GCF({a}, {b}) = {g} and LCM({a}, {b}) = {lcm}. The GCF
          also factors a sum with the distributive property: {a} + {b} = {g}({a / g} + {b / g}).
        </p>
      </MathCheck>
    </div>
  );
}

function Row({ label, nums, color, highlight }: { label: string; nums: number[]; color: string; highlight: (n: number) => boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-28 shrink-0 text-right text-xs font-bold" style={{ color }}>{label}:</span>
      {nums.map((n) => (
        <span key={n} className="grid h-8 min-w-8 place-items-center rounded px-1.5 font-mono text-sm font-bold" style={{ background: highlight(n) ? "var(--band-high)" : "var(--surface-2)", color: highlight(n) ? "white" : "var(--ink-soft)" }}>{n}</span>
      ))}
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(2, Math.min(30, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 2} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 30} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
