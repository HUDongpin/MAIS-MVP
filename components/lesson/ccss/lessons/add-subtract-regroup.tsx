"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const MARK = "var(--band-early)";

export default function Lesson() {
  const [a, setA] = useState(47);
  const [b, setB] = useState(38);
  const [op, setOp] = useState<"add" | "sub">("add");

  const hi = Math.max(a, b), lo = Math.min(a, b);
  const top = op === "add" ? a : hi;
  const bot = op === "add" ? b : lo;
  const result = op === "add" ? a + b : hi - lo;

  const tO = top % 10, tT = Math.floor(top / 10);
  const bO = bot % 10, bT = Math.floor(bot / 10);

  const carry = op === "add" && tO + bO >= 10;
  const borrow = op === "sub" && tO < bO;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Line up the <strong>ones under ones</strong>{" "}and <strong>tens under
        tens</strong>. Work the ones first. If ten ones pile up, carry a ten. If
        you cannot take away enough ones, borrow a ten.
      </p>

      <Figure caption="The little red mark is the regroup — a carried ten (add) or a borrowed ten (subtract).">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {(["add", "sub"] as const).map((o) => (
              <button key={o} type="button" onClick={() => setOp(o)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={op === o ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o === "add" ? "Add" : "Subtract"}</button>
            ))}
          </div>

          <div className="font-mono text-3xl leading-tight">
            {/* regroup marks */}
            <div className="grid grid-cols-[1.5rem_2ch_2ch] items-end text-base" style={{ color: MARK }}>
              <span />
              <span className="text-center">{carry ? "1" : borrow ? "↘" : ""}</span>
              <span className="text-center">{borrow ? "+10" : ""}</span>
            </div>
            <div className="grid grid-cols-[1.5rem_2ch_2ch] justify-items-end font-black">
              <span /><span>{tT}</span><span>{tO}</span>
            </div>
            <div className="grid grid-cols-[1.5rem_2ch_2ch] justify-items-end border-b-2 border-[var(--ink)] pb-1 font-black">
              <span>{op === "add" ? "+" : "−"}</span><span>{bT}</span><span>{bO}</span>
            </div>
            <div className="grid grid-cols-[1.5rem_2ch_2ch] justify-items-end pt-1 font-black" style={{ color: ACCENT }}>
              <span />
              <span>{Math.floor(result / 10) || ""}</span>
              <span>{result % 10}</span>
            </div>
          </div>

          <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            {op === "add"
              ? carry ? `${tO} + ${bO} = ${tO + bO} ones → write ${(tO + bO) % 10}, carry 1 ten.` : `${tO} + ${bO} = ${tO + bO} ones — no carry needed.`
              : borrow ? `Can't do ${tO} − ${bO}: borrow a ten, making ${tO + 10} − ${bO} = ${tO + 10 - bO}.` : `${tO} − ${bO} = ${tO - bO} ones — no borrow needed.`}
          </p>

          <div className="font-mono text-2xl font-black">{top} {op === "add" ? "+" : "−"} {bot} = <span style={{ color: ACCENT }}>{result}</span></div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="First" value={a} onChange={setA} />
            <Stepper label="Second" value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Regrouping keeps places tidy</h2>
      <p>
        Ten ones make one ten, so a full ten “carries” to the next column when
        adding. Going the other way, one ten “breaks” into ten ones when you need
        to borrow. Each place only ever holds a single digit.
      </p>

      <MathCheck>
        <p>
          Fluently adding and subtracting within 100 (2.NBT.B.5) uses place value
          and regrouping: <strong>compose a ten</strong>{" "}when the ones reach ten
          (carry), and <strong>decompose a ten</strong>{" "}into ten ones when you
          need more (borrow). The digits line up by place so each column stays a
          single digit.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(10, Math.min(99, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 10} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 99} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
