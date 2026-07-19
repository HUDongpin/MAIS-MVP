"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const HC = "var(--band-upper)";
const TC = "var(--band-high)";
const OC = "var(--band-early)";

function Blocks({ n }: { n: number }) {
  const h = Math.floor(n / 100), t = Math.floor((n / 10) % 10), o = n % 10;
  return (
    <div className="flex items-end gap-2">
      <div className="flex gap-0.5">{Array.from({ length: h }, (_, i) => <div key={i} style={{ width: 16, height: 16, background: HC }} className="rounded-sm" />)}</div>
      <div className="flex items-end gap-0.5">{Array.from({ length: t }, (_, i) => <div key={i} style={{ width: 5, height: 16, background: TC }} className="rounded-sm" />)}</div>
      <div className="flex flex-wrap gap-0.5" style={{ width: 16 }}>{Array.from({ length: o }, (_, i) => <div key={i} style={{ width: 5, height: 5, background: OC }} className="rounded-sm" />)}</div>
    </div>
  );
}

export default function Lesson() {
  const [a, setA] = useState(256);
  const [b, setB] = useState(167);
  const [op, setOp] = useState<"add" | "sub">("add");

  const hi = Math.max(a, b), lo = Math.min(a, b);
  const result = op === "add" ? Math.min(999, a + b) : hi - lo;

  const carryOnes = op === "add" && (a % 10) + (b % 10) >= 10;
  const carryTens = op === "add" && (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) + (carryOnes ? 1 : 0) >= 10;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Bigger numbers work the same way — just with one more place. Add or
        subtract <strong>ones, tens, and hundreds</strong>{" "}separately. Ten ones
        make a ten; ten tens make a <strong>hundred</strong>.
      </p>

      <Figure caption="Big squares are hundreds, tall bars are tens, tiny squares are ones.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {(["add", "sub"] as const).map((o) => (
              <button key={o} type="button" onClick={() => setOp(o)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={op === o ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o === "add" ? "Add" : "Subtract"}</button>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2">
            <Blocks n={op === "add" ? a : hi} />
            <Blocks n={op === "add" ? b : lo} />
          </div>

          <div className="font-mono text-3xl font-black">
            {op === "add" ? a : hi} {op === "add" ? "+" : "−"} {op === "add" ? b : lo} ={" "}
            <span style={{ color: ACCENT }}>{result}</span>
          </div>

          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            {op === "add"
              ? `${carryOnes ? "Ten ones make a new ten. " : ""}${carryTens ? "Ten tens make a new hundred. " : ""}${!carryOnes && !carryTens ? "No regrouping needed here." : ""}`
              : "To subtract, break a hundred into tens or a ten into ones whenever you need more."}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Stepper label="First number" value={a} onChange={setA} />
            <Stepper label="Second number" value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Why regrouping works</h2>
      <p>
        A number never changes when you trade <strong>10 ones for 1 ten</strong>{" "}
        or <strong>10 tens for 1 hundred</strong>{" "}— you are just renaming the same
        amount. That trade is the whole secret behind carrying and borrowing.
      </p>

      <MathCheck>
        <p>
          Adding and subtracting within 1000 with place-value models (2.NBT.B.7)
          composes or decomposes hundreds, tens, and ones. It works because
          <strong>{" "}10 ones = 1 ten</strong>{" "}and <strong>10 tens = 1 hundred</strong>,
          so regrouping renames a quantity without changing its value (2.NBT.B.9).
          That is why you can add each place on its own and carry the extra.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(100, Math.min(899, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 100} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-12 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 899} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
