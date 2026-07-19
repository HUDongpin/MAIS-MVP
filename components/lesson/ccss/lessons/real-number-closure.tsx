"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const RAT = "var(--band-middle)";
const IRR = "var(--band-upper)";

type Kind = "rational" | "irrational";
const A = [
  { label: "1/2", kind: "rational" as Kind },
  { label: "3", kind: "rational" as Kind },
  { label: "√2", kind: "irrational" as Kind },
  { label: "π", kind: "irrational" as Kind },
];
const OPS = ["+", "×"] as const;

function classify(a: Kind, b: Kind, op: "+" | "×"): { kind: Kind; why: string } {
  if (a === "rational" && b === "rational")
    return { kind: "rational", why: "Rationals are closed under + and ×: the result is again a ratio of integers." };
  if (a === "irrational" && b === "irrational")
    return { kind: "rational", why: "Two irrationals can combine either way — e.g. √2 · √2 = 2. So the result is not guaranteed; here it can be rational." };
  // exactly one irrational
  if (op === "×")
    return { kind: "irrational", why: "A nonzero rational times an irrational is always irrational — if it were rational, dividing back out would make the irrational rational." };
  return { kind: "irrational", why: "A rational plus an irrational is always irrational — otherwise subtracting the rational would leave a rational." };
}

export default function Lesson() {
  const [ai, setAi] = useState(0);
  const [bi, setBi] = useState(2);
  const [oi, setOi] = useState(0);

  const a = A[ai], b = A[bi], op = OPS[oi];
  const res = classify(a.kind, b.kind, op);
  const col = (k: Kind) => (k === "rational" ? RAT : IRR);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Adding and multiplying <strong>rational</strong>{" "}numbers always gives a
        rational number. But mix in an <strong>irrational</strong>{" "}number and the
        outcome follows strict rules — rooted in a simple contradiction argument.
      </p>

      <Figure caption="Pick two numbers and an operation. The result's type is forced by the algebra.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center justify-center gap-3 font-mono text-2xl font-black">
            <span style={{ color: col(a.kind) }}>{a.label}</span>
            <span>{op}</span>
            <span style={{ color: col(b.kind) }}>{b.label}</span>
            <span>→</span>
            <span className="rounded-lg px-3 py-1" style={{ background: "var(--surface-2)", color: col(res.kind) }}>{res.kind}</span>
          </div>

          <p className="m-0 max-w-lg text-center text-[15px] text-[var(--ink-soft)]">{res.why}</p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Picker label="first" items={A.map((x) => x.label)} colors={A.map((x) => col(x.kind))} idx={ai} onPick={setAi} />
            <Picker label="op" items={[...OPS]} colors={OPS.map(() => "var(--ink)")} idx={oi} onPick={setOi} />
            <Picker label="second" items={A.map((x) => x.label)} colors={A.map((x) => col(x.kind))} idx={bi} onPick={setBi} />
          </div>

          <div className="flex gap-4 text-xs font-bold uppercase tracking-wide">
            <span style={{ color: RAT }}>● rational</span>
            <span style={{ color: IRR }}>● irrational</span>
          </div>
        </div>
      </Figure>

      <h2>Why the rules hold</h2>
      <p>
        Suppose a rational r plus an irrational x were rational, call it s. Then
        x = s − r would be a difference of two rationals — hence rational, a
        contradiction. The same trick (with division) handles a{" "}
        <strong>nonzero rational times an irrational</strong>. Two irrationals,
        though, are unpredictable: √2 · √2 = 2 is rational, but √2 · √3 is not.
      </p>

      <MathCheck>
        <p>
          The rationals are <strong>closed</strong>{" "}under addition and
          multiplication. Combining a rational with an irrational (N-RN.3):{" "}
          <strong>rational + irrational is irrational</strong>{" "}and a{" "}
          <strong>nonzero rational × irrational is irrational</strong>, each
          proved by assuming the result is rational and deriving a contradiction.
          Sums or products of two irrationals may be either.
        </p>
      </MathCheck>
    </div>
  );
}

function Picker({ label, items, colors, idx, onPick }: { label: string; items: string[]; colors: string[]; idx: number; onPick: (i: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        {items.map((it, i) => (
          <button key={it} type="button" onClick={() => onPick(i)} className="grid h-10 min-w-10 place-items-center rounded-lg border px-2 font-mono text-lg font-black" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: colors[i] }}>{it}</button>
        ))}
      </div>
    </div>
  );
}
