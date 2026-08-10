"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const MARK = "var(--band-early)";
const placeCount = (count: number, singular: "ten" | "one") =>
  `${count} ${count === 1 ? singular : `${singular}s`}`;

export default function Lesson() {
  const [a, setA] = useState(47);
  const [b, setB] = useState(38);
  const [op, setOp] = useState<"add" | "sub">("add");
  const CEILING = 99;

  const top = a;
  const bot = b;
  const result = op === "add" ? a + b : a - b;

  function changeOperation(nextOp: "add" | "sub") {
    if (nextOp === "add") {
      const nextA = Math.min(a, CEILING - 10);
      setA(nextA);
      setB(Math.min(b, CEILING - nextA));
    } else if (b > a) {
      setA(b);
      setB(a);
    }
    setOp(nextOp);
  }

  function changeFirst(nextA: number) {
    setA(nextA);
    if (op === "sub") setB((previous) => Math.min(previous, nextA));
  }

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

      {/* MARK is --band-early, the orange token; nothing red is drawn. Same
          defect as add-subtract-algorithm, fixed in round 6. */}
      <Figure caption="The little orange mark is the regroup — a carried ten (add) or a borrowed ten (subtract).">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {(["add", "sub"] as const).map((o) => (
              <button key={o} type="button" onClick={() => changeOperation(o)} aria-pressed={op === o} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={op === o ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o === "add" ? "Add" : "Subtract"}</button>
            ))}
          </div>

          <div
            className="font-mono text-3xl leading-tight"
            role="img"
            aria-label={op === "add"
              ? carry
                ? `${top} plus ${bot}. ${placeCount(tO + bO, "one")} are regrouped as ${placeCount((tO + bO) % 10, "one")} and 1 carried ten. The sum is ${result}.`
                : `${top} plus ${bot}. No regrouping is needed. The sum is ${result}.`
              : borrow
                ? `${top} minus ${bot}. ${placeCount(tT, "ten")} and ${placeCount(tO, "one")} are regrouped as ${placeCount(tT - 1, "ten")} and ${placeCount(tO + 10, "one")}. The difference is ${result}.`
                : `${top} minus ${bot}. No regrouping is needed. The difference is ${result}.`}
          >
            {/* regroup marks */}
            <div className="grid grid-cols-[1.5rem_4.5rem_4.5rem] items-end text-center text-sm font-bold" style={{ color: MARK }} aria-hidden="true">
              <span />
              <span>{carry ? "+1 ten" : borrow ? `${tT}→${tT - 1}` : ""}</span>
              <span>{borrow ? `${tO}→${tO + 10}` : ""}</span>
            </div>
            <div className="grid grid-cols-[1.5rem_4.5rem_4.5rem] justify-items-end font-black" aria-hidden="true">
              <span /><span>{tT}</span><span>{tO}</span>
            </div>
            <div className="grid grid-cols-[1.5rem_4.5rem_4.5rem] justify-items-end border-b-2 border-[var(--ink)] pb-1 font-black" aria-hidden="true">
              <span>{op === "add" ? "+" : "−"}</span><span>{bT}</span><span>{bO}</span>
            </div>
            <div className="grid grid-cols-[1.5rem_4.5rem_4.5rem] justify-items-end pt-1 font-black" style={{ color: ACCENT }} aria-hidden="true">
              <span />
              <span>{Math.floor(result / 10) || ""}</span>
              <span>{result % 10}</span>
            </div>
          </div>

          <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            {op === "add"
              ? carry ? `${tO} + ${bO} = ${placeCount(tO + bO, "one")} → write ${(tO + bO) % 10}, carry 1 ten.` : `${tO} + ${bO} = ${placeCount(tO + bO, "one")} — no carry needed.`
              : borrow ? `Can't do ${tO} − ${bO}: borrow a ten, making ${tO + 10} − ${bO} = ${tO + 10 - bO}.` : `${tO} − ${bO} = ${placeCount(tO - bO, "one")} — no borrow needed.`}
          </p>

          <div className="font-mono text-2xl font-black">{top} {op === "add" ? "+" : "−"} {bot} = <span style={{ color: ACCENT }}>{result}</span></div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="First" value={a} min={10} max={op === "add" ? CEILING - b : CEILING} onChange={changeFirst} />
            <Stepper label="Second" value={b} min={10} max={op === "add" ? CEILING - a : a} onChange={setB} />
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

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
