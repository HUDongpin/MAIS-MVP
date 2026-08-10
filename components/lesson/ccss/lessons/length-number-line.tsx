"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const MAXN = 30;
const PAD = 26;
const STEP = 17;
const W = MAXN * STEP + 2 * PAD;
const ADD = "var(--band-middle)";
const SUB = "var(--band-early)";

export default function Lesson() {
  const [start, setStart] = useState(8);
  const [amt, setAmt] = useState(12);
  const [op, setOp] = useState<"add" | "sub">("add");

  const end = op === "add" ? Math.min(MAXN, start + amt) : Math.max(0, start - amt);
  const realAmt = Math.abs(end - start);
  const color = op === "add" ? ADD : SUB;
  const x = (n: number) => PAD + n * STEP;
  const from = Math.min(start, end), to = Math.max(start, end);

  function changeOperation(nextOp: "add" | "sub") {
    const nextStart = nextOp === "add"
      ? Math.min(start, MAXN - 1)
      : Math.max(start, 1);
    setStart(nextStart);
    setAmt((previous) => Math.max(1, Math.min(previous, nextOp === "add" ? MAXN - nextStart : nextStart)));
    setOp(nextOp);
  }

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A number line is like a ruler for numbers. Each number is a{" "}
        <strong>length</strong>{" "}from 0. Adding or subtracting is a{" "}
        <strong>jump</strong>{" "}along the line — perfect for length problems.
      </p>

      <Figure caption="The arrow is the length you add or subtract. Where it lands is the answer.">
        <div className="flex flex-col items-center gap-6">
          <p className="m-0 max-w-md text-center text-lg font-semibold">
            {op === "add"
              ? <>A ribbon is {start} cm long. You tape on {realAmt} cm more. How long is it now?</>
              : <>A ribbon is {start} cm long. You cut off {realAmt} cm. How long is left?</>}
          </p>

          <FigureScroll>
            <svg width={W} height={92} viewBox={`0 0 ${W} 92`} className="mx-auto" role="img" aria-label={`number line ${start} ${op === "add" ? "plus" : "minus"} ${realAmt}`}>
              <line x1={PAD} y1={64} x2={W - PAD} y2={64} stroke="var(--ink-soft)" strokeWidth={2} />
              {Array.from({ length: MAXN + 1 }, (_, n) => (
                <g key={n}>
                  <line x1={x(n)} y1={n % 5 === 0 ? 57 : 60} x2={x(n)} y2={68} stroke="var(--ink-soft)" strokeWidth={n % 5 === 0 ? 1.8 : 1} />
                  {n % 5 === 0 && <text x={x(n)} y={84} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{n}</text>}
                </g>
              ))}
              {/* length arrow */}
              {/* from/to are min/max, so in subtract mode the arrowhead sat on
                  the START and pointed right — the caption says "where it lands
                  is the answer". Draw it in jump order instead. */}
              <line x1={x(start)} y1={40} x2={x(end)} y2={40} stroke={color} strokeWidth={3} markerEnd="url(#lh)" />
              <defs>
                <marker id="lh" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill={color} />
                </marker>
              </defs>
              <text x={(x(from) + x(to)) / 2} y={30} textAnchor="middle" fontSize={12} fontWeight={800} fill={color}>{op === "add" ? "+" : "−"}{realAmt}</text>
              <circle cx={x(start)} cy={64} r={5} fill="var(--ink)" />
              <circle cx={x(end)} cy={64} r={6} fill={color} stroke="white" strokeWidth={2} />
            </svg>
          </FigureScroll>

          <div className="font-mono text-3xl font-black">{start} {op === "add" ? "+" : "−"} {realAmt} = <span style={{ color }}>{end}</span> cm</div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              {(["add", "sub"] as const).map((o) => (
                <button key={o} type="button" onClick={() => changeOperation(o)} aria-pressed={op === o} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={op === o ? { background: o === "add" ? ADD : SUB, color: "white", borderColor: o === "add" ? ADD : SUB } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o === "add" ? "Tape on" : "Cut off"}</button>
              ))}
            </div>
            {/* Bound the RIBBON so at least 1 cm of travel always fits. The
                Math.max(1, …) floor previously re-created the silent clamp: at
                Ribbon 30 in "Tape on" mode there is no room at all, yet the
                stepper still offered an Amount of 1. */}
            <Stepper label="Ribbon (cm)" value={start} min={op === "add" ? 0 : 1} max={op === "add" ? MAXN - 1 : MAXN} onChange={(v) => { setStart(v); setAmt((p) => Math.max(1, Math.min(p, op === "add" ? MAXN - v : v))); }} />
            <Stepper label="Amount (cm)" value={amt} min={1} max={op === "add" ? MAXN - start : start} onChange={setAmt} />
          </div>
        </div>
      </Figure>

      <h2>Numbers are lengths</h2>
      <p>
        Each whole number sits a fixed distance from 0. So a length problem is
        just a jump: {start} {op === "add" ? "+" : "−"} {realAmt} = {end}. The
        number line shows the answer as a place you land.
      </p>

      <MathCheck>
        <p>
          Representing whole numbers as <strong>lengths on a number line</strong>{" "}
          with equally spaced points (2.MD.B.6) turns addition and subtraction into
          jumps. Using those jumps to solve length word problems within 100 is
          2.MD.B.5 — here, {start} {op === "add" ? "+" : "−"} {realAmt} = {end} cm.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
