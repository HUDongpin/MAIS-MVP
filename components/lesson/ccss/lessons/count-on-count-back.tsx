"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const MAXN = 20;
const PAD = 24;
const STEP = 34;
const W = MAXN * STEP + 2 * PAD;
const ADD = "var(--band-middle)";
const SUB = "var(--band-early)";

export default function Lesson() {
  const [start, setStart] = useState(7);
  const [jump, setJump] = useState(5);
  const [op, setOp] = useState<"add" | "sub">("add");

  // Bound the jump by what the line can actually show, rather than clamping
  // the endpoint and reporting the shortened jump as if it were the one the
  // student chose.
  const jumpMax = op === "add" ? MAXN - start : start;
  const end = op === "add" ? start + Math.min(jump, jumpMax) : start - Math.min(jump, jumpMax);
  const realJump = Math.abs(end - start);
  const color = op === "add" ? ADD : SUB;
  const x = (n: number) => PAD + n * STEP;

  // hop arcs
  const hops = Array.from({ length: realJump }, (_, i) => (op === "add" ? start + i : start - i));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        You do not have to count everything from 1. To <strong>add</strong>,
        start at a number and <strong>hop forward</strong>. To{" "}
        <strong>subtract</strong>, <strong>hop backward</strong>. Counting and
        adding are the same idea.
      </p>

      <Figure caption="Each hop is one step. Count the hops to see how far you moved.">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll>
            <svg width={W} height={110} viewBox={`0 0 ${W} 110`} className="mx-auto" role="img" aria-label={`number line from ${start} ${op === "add" ? "adding" : "subtracting"} ${realJump}`}>
              {/* line */}
              <line x1={PAD} y1={78} x2={W - PAD} y2={78} stroke="var(--ink-soft)" strokeWidth={2} />
              {Array.from({ length: MAXN + 1 }, (_, n) => (
                <g key={n}>
                  <line x1={x(n)} y1={73} x2={x(n)} y2={83} stroke="var(--ink-soft)" strokeWidth={1.5} />
                  <text x={x(n)} y={98} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{n}</text>
                </g>
              ))}
              {/* hops */}
              {hops.map((from, i) => {
                const to = op === "add" ? from + 1 : from - 1;
                const mx = (x(from) + x(to)) / 2;
                return (
                  <path key={i} d={`M ${x(from)} 74 Q ${mx} ${44} ${x(to)} 74`} fill="none" stroke={color} strokeWidth={2.5} markerEnd="url(#ah)" opacity={0.85} />
                );
              })}
              <defs>
                <marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill={color} />
                </marker>
              </defs>
              {/* start & end dots */}
              <circle cx={x(start)} cy={78} r={6} fill="var(--ink)" />
              <circle cx={x(end)} cy={78} r={7} fill={color} stroke="white" strokeWidth={2} />
              <text x={x(end)} y={26} textAnchor="middle" fontSize={13} fontWeight={800} fill={color}>{end}</text>
            </svg>
          </FigureScroll>

          <div className="font-mono text-3xl font-black">
            {start} {op === "add" ? "+" : "−"} {realJump} = <span style={{ color }}>{end}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              {(["add", "sub"] as const).map((o) => (
                <button key={o} type="button" onClick={() => { setOp(o); setJump((p) => Math.max(1, Math.min(p, o === "add" ? MAXN - start : start))); }} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={op === o ? { background: o === "add" ? ADD : SUB, color: "white", borderColor: o === "add" ? ADD : SUB } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
                  {o === "add" ? "Count on (+)" : "Count back (−)"}
                </button>
              ))}
            </div>
            <Stepper label="Start" value={start} min={op === "add" ? 0 : 1} max={op === "add" ? MAXN - 1 : 20} onChange={(v) => { setStart(v); setJump((p) => Math.max(1, Math.min(p, op === "add" ? MAXN - v : v))); }} />
            <Stepper label="Jumps" value={jump} min={1} max={Math.min(10, jumpMax)} onChange={setJump} />
          </div>
        </div>
      </Figure>

      <h2>Hopping is counting</h2>
      <p>
        Adding {realJump} means hopping forward {realJump} times. Subtracting
        means hopping back. The number you land on is the answer.
      </p>

      <MathCheck>
        <p>
          Counting on and counting back on the number line{" "}
          <strong>relates counting to addition and subtraction</strong>{" "}
          (1.OA.C.5): to add you count forward, to subtract you count back. This
          is why the number that comes next when counting is always “one more.”
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
        <span className="w-7 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
