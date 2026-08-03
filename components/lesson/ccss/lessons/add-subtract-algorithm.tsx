"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";
const MARK = "var(--band-early)";

function digs(n: number) {
  return [Math.floor(n / 100), Math.floor((n / 10) % 10), n % 10];
}

export default function Lesson() {
  const [a, setA] = useState(365);
  const [b, setB] = useState(248);
  const [op, setOp] = useState<"add" | "sub">("add");

  const hi = Math.max(a, b), lo = Math.min(a, b);
  const top = op === "add" ? a : hi;
  const bot = op === "add" ? b : lo;
  const result = op === "add" ? a + b : hi - lo;

  const [tH, tT, tO] = digs(top);
  const [, bT, bO] = digs(bot);

  const carryOnes = op === "add" && tO + bO >= 10;
  const carryTens = op === "add" && tT + bT + (carryOnes ? 1 : 0) >= 10;
  const borrowOnes = op === "sub" && tO < bO;
  const borrowTens = op === "sub" && (tT - (borrowOnes ? 1 : 0)) < bT;

  const rd = digs(result);
  const showH = result >= 100;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <strong>standard algorithm</strong>{" "}stacks numbers by place and works
        one column at a time, right to left. Regroup whenever a column overflows
        (carry) or comes up short (borrow).
      </p>

      {/* MARK is --band-early, the ORANGE token; nothing red is in the figure. */}
      <Figure caption="Ones, then tens, then hundreds. The orange marks show each regroup.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {(["add", "sub"] as const).map((o) => (
              <button key={o} type="button" onClick={() => setOp(o)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={op === o ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o === "add" ? "Add" : "Subtract"}</button>
            ))}
          </div>

          <div className="font-mono text-3xl leading-tight">
            <div className="grid grid-cols-[1.5rem_2ch_2ch_2ch] justify-items-end text-sm" style={{ color: MARK }}>
              <span /><span>{carryTens ? "1" : borrowTens ? "↘" : ""}</span><span>{carryOnes ? "1" : borrowOnes ? "↘" : ""}</span><span />
            </div>
            <div className="grid grid-cols-[1.5rem_2ch_2ch_2ch] justify-items-end font-black">
              <span /><span>{tH}</span><span>{tT}</span><span>{tO}</span>
            </div>
            <div className="grid grid-cols-[1.5rem_2ch_2ch_2ch] justify-items-end border-b-2 border-[var(--ink)] pb-1 font-black">
              <span>{op === "add" ? "+" : "−"}</span><span>{digs(bot)[0] || ""}</span><span>{bT}</span><span>{bO}</span>
            </div>
            <div className="grid grid-cols-[1.5rem_2ch_2ch_2ch] justify-items-end pt-1 font-black" style={{ color: ACCENT }}>
              <span /><span>{showH ? rd[0] : ""}</span><span>{rd[1]}</span><span>{rd[2]}</span>
            </div>
          </div>

          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            {op === "add"
              ? `${carryOnes ? "Carry a ten. " : ""}${carryTens ? "Carry a hundred. " : ""}${!carryOnes && !carryTens ? "No regrouping needed." : ""}`
              : `${borrowOnes ? "Borrow a ten for the ones. " : ""}${borrowTens ? "Borrow a hundred for the tens. " : ""}${!borrowOnes && !borrowTens ? "No borrowing needed." : ""}`}
          </p>

          <div className="font-mono text-2xl font-black">{top} {op === "add" ? "+" : "−"} {bot} = <span style={{ color: ACCENT }}>{result}</span></div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="First" value={a} onChange={setA} />
            <Stepper label="Second" value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Column by column</h2>
      <p>
        Keeping each digit in its own place is what makes the algorithm work. A
        carried 1 is really one ten (or one hundred) moving to the next column; a
        borrow breaks one of those back into ten smaller units.
      </p>

      <MathCheck>
        <p>
          Fluently adding and subtracting within 1000 (3.NBT.A.2) uses place
          value, properties of operations, and the relationship between addition
          and subtraction. The standard algorithm lines up ones, tens, and
          hundreds and regroups between them — here, {top} {op === "add" ? "+" : "−"} {bot} = {result}.
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
