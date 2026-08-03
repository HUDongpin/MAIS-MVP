"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const R = 6;
const CELL = 24;
const PAD = 24;
const U = "var(--band-high)";
const V = "var(--band-upper)";
const RES = "var(--band-middle)";

type Op = "add" | "sub" | "scale";

export default function Lesson() {
  const [u, setU] = useState({ x: 3, y: 1 });
  const [v, setV] = useState({ x: -1, y: 3 });
  const [k, setK] = useState(2);
  const [op, setOp] = useState<Op>("add");

  const res =
    op === "add" ? { x: u.x + v.x, y: u.y + v.y } :
    op === "sub" ? { x: u.x - v.x, y: u.y - v.y } :
    { x: k * u.x, y: k * u.y };

  // Grow the grid to whatever the result needs. Components run ±6 and k runs
  // ±3, so `res` reaches ⟨18, 18⟩ — well outside a fixed R = 6 grid — and the
  // result arrow was silently clipped away while the readout still quoted it.
  const extent = Math.max(R, Math.abs(res.x), Math.abs(res.y), Math.abs(u.x), Math.abs(u.y), Math.abs(v.x), Math.abs(v.y));
  const cell = (2 * R * CELL) / (2 * extent);
  const size = 2 * extent * cell + 2 * PAD;

  const sx = (x: number) => PAD + (x + extent) * cell;
  const sy = (y: number) => size - PAD - (y + extent) * cell;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Vectors combine <strong>component by component</strong>. To add, line them
        up <strong>tip to tail</strong>{" "}— the sum runs from the first tail to the
        last tip. Scaling by k stretches the arrow and keeps (or reverses) its
        direction.
      </p>

      <Figure caption="Add tip-to-tail, subtract by adding the opposite, or scale by a number.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {(["add", "sub", "scale"] as Op[]).map((o) => (
              <button key={o} type="button" onClick={() => setOp(o)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={op === o ? { background: U, color: "white", borderColor: U } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
                {o === "add" ? "u + v" : o === "sub" ? "u − v" : `${k}·u`}
              </button>
            ))}
          </div>

          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="max-w-full" style={{ maxHeight: 330 }} role="img" aria-label="vector operations">
            {Array.from({ length: 2 * extent + 1 }, (_, i) => {
              const c = i - extent;
              return (
                <g key={c} stroke="var(--line)" strokeWidth={1}>
                  <line x1={sx(c)} y1={sy(-extent)} x2={sx(c)} y2={sy(extent)} />
                  <line x1={sx(-extent)} y1={sy(c)} x2={sx(extent)} y2={sy(c)} />
                </g>
              );
            })}
            <line x1={sx(-extent)} y1={sy(0)} x2={sx(extent)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-extent)} x2={sx(0)} y2={sy(extent)} stroke="var(--ink-soft)" strokeWidth={2} />
            <defs>
              {[U, V, RES].map((c, i) => (
                <marker key={i} id={`arr${i}`} markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={c} /></marker>
              ))}
            </defs>
            {/* u from origin */}
            <line x1={sx(0)} y1={sy(0)} x2={sx(u.x)} y2={sy(u.y)} stroke={U} strokeWidth={3} markerEnd="url(#arr0)" />
            {op === "add" && (
              <line x1={sx(u.x)} y1={sy(u.y)} x2={sx(res.x)} y2={sy(res.y)} stroke={V} strokeWidth={3} markerEnd="url(#arr1)" />
            )}
            {op !== "add" && op !== "scale" && (
              <line x1={sx(0)} y1={sy(0)} x2={sx(v.x)} y2={sy(v.y)} stroke={V} strokeWidth={3} markerEnd="url(#arr1)" />
            )}
            {op === "sub" && (
              <line x1={sx(0)} y1={sy(0)} x2={sx(v.x)} y2={sy(v.y)} stroke={V} strokeWidth={2} markerEnd="url(#arr1)" opacity={0.5} />
            )}
            {/* result */}
            <line x1={sx(0)} y1={sy(0)} x2={sx(res.x)} y2={sy(res.y)} stroke={RES} strokeWidth={3.5} markerEnd="url(#arr2)" />
          </svg>

          <div className="flex flex-wrap justify-center gap-4 font-mono text-lg">
            <span style={{ color: U }}>u = ⟨{u.x}, {u.y}⟩</span>
            {op !== "scale" && <span style={{ color: V }}>v = ⟨{v.x}, {v.y}⟩</span>}
            {op === "scale" && <span>k = {k}</span>}
            <span className="font-black" style={{ color: RES }}>= ⟨{res.x}, {res.y}⟩</span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5">
            <Stepper label="u x" value={u.x} onChange={(x) => setU({ ...u, x })} />
            <Stepper label="u y" value={u.y} onChange={(y) => setU({ ...u, y })} />
            <Stepper label="v x" value={v.x} onChange={(x) => setV({ ...v, x })} />
            <Stepper label="v y" value={v.y} onChange={(y) => setV({ ...v, y })} />
            <Stepper label="k" value={k} min={-3} max={3} onChange={setK} />
          </div>
        </div>
      </Figure>

      <h2>Add the pieces, scale the whole</h2>
      <p>
        u + v = ⟨{u.x}+{v.x}, {u.y}+{v.y}⟩ = ⟨{u.x + v.x}, {u.y + v.y}⟩. Subtracting
        is adding the opposite. Multiplying by a <strong>scalar</strong>{" "}k
        multiplies both components — k = {k} makes {k > 0 ? "a longer arrow in the same direction" : k < 0 ? "a flipped, reversed arrow" : "the zero vector"}.
      </p>

      <MathCheck>
        <p>
          Vectors <strong>add and subtract componentwise</strong>, visualized
          tip-to-tail or as a parallelogram (N-VM.4). Multiplying a vector by a{" "}
          <strong>scalar</strong>{" "}k scales each component, changing magnitude by
          |k| and reversing direction when k &lt; 0 (N-VM.5). These operations
          make vectors an algebraic system, not just arrows.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min = -6, max = 6, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-lg font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
