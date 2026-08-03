"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const POS = "var(--band-upper)";
const NEG = "var(--band-early)";

export default function Lesson() {
  const [a, setA] = useState(-3);
  const [b, setB] = useState(4);
  const [op, setOp] = useState<"mul" | "div">("mul");

  const result = op === "mul" ? a * b : b === 0 ? 0 : a / b;
  const sameSign = a > 0 === b > 0 || a === 0 || b === 0;
  const resultColor = result > 0 ? POS : result < 0 ? NEG : "var(--ink)";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Multiplying and dividing signed numbers has one simple rule about the{" "}
        <strong>sign</strong>: <strong>same signs make a positive</strong>,{" "}
        <strong>different signs make a negative</strong>. The size is just the
        usual product or quotient.
      </p>

      <Figure caption="Set the two numbers and their signs. The sign rule decides positive or negative.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {(["mul", "div"] as const).map((o) => (
              <button key={o} type="button" onClick={() => { setOp(o); if (o === "div") setB((p) => (p === 0 ? 1 : p)); }} className="grid h-10 w-10 place-items-center rounded-lg border text-xl font-black" style={op === o ? { background: "var(--band-middle)", color: "white", borderColor: "var(--band-middle)" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o === "mul" ? "×" : "÷"}</button>
            ))}
          </div>

          <div className="font-mono text-4xl font-black">
            <span style={{ color: a >= 0 ? POS : NEG }}>{a}</span> {op === "mul" ? "×" : "÷"} <span style={{ color: b >= 0 ? POS : NEG }}>{b}</span> = <span style={{ color: resultColor }}>{op === "div" && result % 1 !== 0 ? result.toFixed(2) : result}</span>
          </div>

          <div className="rounded-xl px-5 py-2 text-center text-lg font-black" style={{ color: sameSign ? POS : NEG }}>
            {sameSign ? "Same signs → positive result" : "Different signs → negative result"}
          </div>

          {/* sign rules table */}
          <table className="font-mono text-sm">
            <tbody>
              {[["+", "+", "+"], ["+", "−", "−"], ["−", "+", "−"], ["−", "−", "+"]].map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-0.5 text-center">{row[0]}</td>
                  <td className="px-1 text-center text-[var(--ink-faint)]">{op === "mul" ? "×" : "÷"}</td>
                  <td className="px-3 py-0.5 text-center">{row[1]}</td>
                  <td className="px-1 text-center text-[var(--ink-faint)]">=</td>
                  <td className="px-3 py-0.5 text-center font-black" style={{ color: row[2] === "+" ? POS : NEG }}>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* Switching to ÷ must also move b off zero: allowZero only gated
                the stepper, so a 0 chosen in × mode survived the switch and the
                page printed "−3 ÷ 0 = 0" beside a Math Check saying division by
                0 is undefined. */}
            <Stepper label="First" value={a} onChange={setA} />
            <Stepper label="Second" value={b} onChange={setB} allowZero={op === "mul"} />
          </div>
        </div>
      </Figure>

      <h2>Why two negatives make a positive</h2>
      <p>
        Multiplying by a negative &ldquo;flips&rdquo; the direction. Flip once and
        you are negative; flip <em>again</em>{" "}and you are back to positive. That is
        why (−) × (−) = (+). Division follows the exact same sign rule.
      </p>

      <MathCheck>
        <p>
          Multiplying and dividing rational numbers (7.NS.A.2): the{" "}
          <strong>sign rule</strong>{" "}is that like signs give a positive result and
          unlike signs give a negative one. So {a} {op === "mul" ? "×" : "÷"} {b} = {op === "div" && result % 1 !== 0 ? result.toFixed(2) : result}. Division by 0 is
          undefined, but every other quotient of integers is a rational number.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange, allowZero = true }: { label: string; value: number; onChange: (n: number) => void; allowZero?: boolean }) {
  const set = (v: number) => {
    let nv = Math.max(-6, Math.min(6, v));
    if (!allowZero && nv === 0) nv = value > 0 ? 1 : -1;
    onChange(nv);
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= -6} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 6} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
