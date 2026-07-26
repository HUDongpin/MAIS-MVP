"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const R = 8;
const PAD = 24;
const STEP = 28;
const W = 2 * R * STEP + 2 * PAD;
const ACCENT = "var(--band-upper)";

type Op = ">" | "<" | "≥" | "≤";

export default function Lesson() {
  const [c, setC] = useState(2);
  const [op, setOp] = useState<Op>(">");

  const x = (n: number) => PAD + (n + R) * STEP;
  const closed = op === "≥" || op === "≤";
  const goesRight = op === ">" || op === "≥";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        An <strong>inequality</strong>{" "}describes a whole range of numbers. Unlike
        an equation with one solution, <strong>x {op} {c}</strong>{" "}is true for{" "}
        <strong>infinitely many</strong>{" "}values — and we show them all on a number
        line.
      </p>

      <Figure caption="Open circle = not included; filled circle = included. The arrow covers every solution.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {(["<", "≤", "≥", ">"] as Op[]).map((o) => (
              <button key={o} type="button" onClick={() => setOp(o)} className="grid h-10 w-10 place-items-center rounded-lg border text-lg font-black" style={op === o ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o}</button>
            ))}
          </div>

          <div className="font-mono text-3xl font-black">x {op} {c}</div>

          <FigureScroll>
            <svg width={W} height={70} viewBox={`0 0 ${W} 70`} className="mx-auto" role="img" aria-label={`x ${op} ${c}`}>
              <line x1={PAD} y1={40} x2={W - PAD} y2={40} stroke="var(--ink-soft)" strokeWidth={2} />
              {Array.from({ length: 2 * R + 1 }, (_, i) => {
                const n = i - R;
                return (
                  <g key={n}>
                    <line x1={x(n)} y1={35} x2={x(n)} y2={45} stroke="var(--ink-soft)" strokeWidth={1} />
                    {n % 2 === 0 && <text x={x(n)} y={60} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{n}</text>}
                  </g>
                );
              })}
              {/* shaded ray */}
              <line x1={x(c)} y1={40} x2={goesRight ? W - PAD : PAD} y2={40} stroke={ACCENT} strokeWidth={5} opacity={0.6} />
              <polygon points={goesRight ? `${W - PAD},40 ${W - PAD - 10},35 ${W - PAD - 10},45` : `${PAD},40 ${PAD + 10},35 ${PAD + 10},45`} fill={ACCENT} />
              {/* boundary circle */}
              <circle cx={x(c)} cy={40} r={7} fill={closed ? ACCENT : "var(--surface)"} stroke={ACCENT} strokeWidth={2.5} />
            </svg>
          </FigureScroll>

          <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            For example, x = {goesRight ? c + 2 : c - 2} works ({goesRight ? c + 2 : c - 2} {op} {c}), but x = {goesRight ? c - 2 : c + 2} does not. {closed ? `x = ${c} is included.` : `x = ${c} is not included.`}
          </p>

          <Stepper label="c" value={c} onChange={setC} />
        </div>
      </Figure>

      <h2>A range, not a point</h2>
      <p>
        The circle at {c} marks the boundary — {closed ? "filled in because " + c + " itself is a solution" : "hollow because " + c + " is not a solution"}. The
        arrow shows the direction where every number makes x {op} {c} true.
      </p>

      <MathCheck>
        <p>
          Writing an inequality like <strong>x {op} {c}</strong>{" "}represents a
          constraint with infinitely many solutions (6.EE.B.8). On the number
          line, an <strong>open circle</strong>{" "}({op === ">" || op === "<" ? "used here" : "for > or <"}) excludes the endpoint, a{" "}
          <strong>closed circle</strong>{" "}includes it, and the shaded ray shows the
          full solution set.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(-6, Math.min(6, v)));
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
