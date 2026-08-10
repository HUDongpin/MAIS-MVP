"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const LEGA = "var(--band-middle)";
const LEGB = "var(--band-high)";
const HYP = "var(--band-upper)";
const S = 16; // px per unit

export default function Lesson() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const c = Math.sqrt(a * a + b * b);
  const perfect = Number.isInteger(c);

  // model bounds: x in [-b, a+b], y in [-a, a+b]
  const minX = -b, maxX = a + b, minY = -a, maxY = a + b;
  const pad = 14;
  const W = (maxX - minX) * S + 2 * pad;
  const H = (maxY - minY) * S + 2 * pad;
  const mx = (x: number) => pad + (x - minX) * S;
  const my = (y: number) => H - pad - (y - minY) * S;
  const poly = (pts: [number, number][]) => pts.map(([x, y]) => `${mx(x)},${my(y)}`).join(" ");

  return (
    <div className="prose-lesson max-w-none">
      <p>
        In a right triangle, the square on the <strong>hypotenuse</strong>{" "}equals
        the sum of the squares on the two <strong>legs</strong>:{" "}
        <strong>a² + b² = c²</strong>. The picture illustrates the three square
        areas. A complete area proof also supplies a dissection or rearrangement
        showing why the two leg-square areas equal the hypotenuse-square area.
      </p>

      <Figure caption="The two leg squares (a² and b²) together equal the hypotenuse square (c²).">
        <div className="flex flex-col items-center gap-6">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="max-w-full" style={{ maxHeight: 320 }} role="img" aria-label={`Right triangle with legs ${a} and ${b}, a square drawn on each leg and on the hypotenuse — the two smaller squares together have the same area as the largest`}>
            {/* square on leg a (below) */}
            <polygon points={poly([[0, 0], [a, 0], [a, -a], [0, -a]])} fill={LEGA} fillOpacity={0.5} stroke={LEGA} strokeWidth={1.5} />
            {/* square on leg b (left) */}
            <polygon points={poly([[0, 0], [0, b], [-b, b], [-b, 0]])} fill={LEGB} fillOpacity={0.5} stroke={LEGB} strokeWidth={1.5} />
            {/* square on hypotenuse */}
            <polygon points={poly([[a, 0], [0, b], [b, a + b], [a + b, a]])} fill={HYP} fillOpacity={0.4} stroke={HYP} strokeWidth={1.5} />
            {/* the triangle */}
            <polygon points={poly([[0, 0], [a, 0], [0, b]])} fill="var(--ink)" fillOpacity={0.15} stroke="var(--ink)" strokeWidth={2} />
            <text x={mx(a / 2)} y={my(-a / 2)} textAnchor="middle" fontSize={12} fontWeight={800} fill={LEGA} fontFamily="var(--font-mono)">{a}²</text>
            <text x={mx(-b / 2)} y={my(b / 2)} textAnchor="middle" fontSize={12} fontWeight={800} fill={LEGB} fontFamily="var(--font-mono)">{b}²</text>
          </svg>

          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: HYP }}>
            <div className="font-mono text-xl font-black">{a}² + {b}² = {a * a} + {b * b} = {a * a + b * b}</div>
            {/* "≈" for the irrational case: "= 2.83…" both rounded (2.8284…) and
                asserted equality with a terminating decimal, right beside prose
                calling the same length irrational. */}
            <div className="mt-1 font-mono text-2xl font-black" style={{ color: HYP }}>c = √{a * a + b * b} {perfect ? `= ${c}` : `≈ ${c.toFixed(2)}`}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Leg a" value={a} color={LEGA} onChange={setA} />
            <Stepper label="Leg b" value={b} color={LEGB} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Finding the missing side</h2>
      <p>
        With legs {a} and {b}, the hypotenuse is √({a}² + {b}²) = √{a * a + b * b} {perfect ? `= ${c}` : `≈ ${c.toFixed(2)}`}. {perfect ? `${a}, ${b}, ${c} is a Pythagorean triple.` : "This length is irrational, so the decimal never ends."}{" "}
        Rearranging also finds a leg when the hypotenuse is known.
      </p>

      <MathCheck>
        <p>
          The <strong>Pythagorean theorem</strong>, a² + b² = c², holds for every
          right triangle (8.G.B.6). The displayed square construction illustrates
          the area relationship; a rearrangement of congruent right triangles and
          their remaining square areas gives a complete area proof. Applied
          in reverse, it finds an unknown side length (8.G.B.7): the hypotenuse is{" "}
          √(a² + b²), and a leg is √(c² − a²).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(2, Math.min(6, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 2} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-6 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 6} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
