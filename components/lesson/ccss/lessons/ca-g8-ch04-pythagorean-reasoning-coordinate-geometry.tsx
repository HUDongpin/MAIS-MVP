"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const RUN_C = "var(--band-middle)";
const RISE_C = "var(--band-high)";
const HYP_C = "var(--band-upper)";
const WRONG_C = "var(--band-early)";

/* ---------- pure helpers, exported so the test can drive every reachable state ---------- */

export type Point = { x: number; y: number };

export const N = 8;            // the grid runs 0..N on both axes
export const CELL = 32;
export const GX = 52;          // pixel x of grid column 0
export const GY0 = 282;        // pixel y of grid row 0
export const W = 360;
export const H = 390;
export const TICK_Y = GY0 + 26;
export const NL_Y = 356;       // baseline of the square-root number line
export const NL_L = 40;
export const NL_R = 320;
export const NL_MAX = 12;      // c can never exceed sqrt(2) * N, about 11.32

export const sx = (x: number) => GX + x * CELL;
export const sy = (y: number) => GY0 - y * CELL;
export const nx = (v: number) => NL_L + (v / NL_MAX) * (NL_R - NL_L);

export function plural(n: number, word: string) { return n === 1 ? word : `${word}s`; }
export function legs(p: Point, q: Point) { return { a: Math.abs(q.x - p.x), b: Math.abs(q.y - p.y) }; }

/** Largest whole number whose square is at most n. */
export function floorSqrt(n: number) {
  let f = Math.floor(Math.sqrt(n));
  while (f > 0 && f * f > n) f -= 1;
  while ((f + 1) * (f + 1) <= n) f += 1;
  return f;
}

/** The positive solution of c² = n, with the whole numbers that bracket it. */
export function root(n: number) {
  const floor = floorSqrt(n), perfect = floor * floor === n, value = Math.sqrt(n);
  return { value, perfect, floor, ceil: floor + 1, text: perfect ? `${floor}` : value.toFixed(2), relation: perfect ? "=" : "≈" };
}

/** What is true about this distance — said differently for each shape the two points can make. */
export function describe(a: number, b: number): string {
  const s = a * a + b * b, r = root(s);
  if (s === 0) return "P and Q are the same point, so the distance between them is 0.";
  if (a === 0) return `P and Q sit in the same column, so the distance is just the vertical gap: ${b} ${plural(b, "unit")}.`;
  if (b === 0) return `P and Q sit in the same row, so the distance is just the horizontal gap: ${a} ${plural(a, "unit")}.`;
  if (r.perfect) return `${s} is a perfect square, since ${r.floor} × ${r.floor} = ${s}, so c is exactly ${r.floor} and ${Math.min(a, b)}, ${Math.max(a, b)}, ${r.floor} is a Pythagorean triple.`;
  return `${s} is not a perfect square: ${r.floor}² = ${r.floor * r.floor} and ${r.ceil}² = ${r.ceil * r.ceil}, so c lands between ${r.floor} and ${r.ceil}, at about ${r.text}. No fraction squares to exactly ${s}, so this length is irrational.`;
}

/** Only said when a real right triangle is on screen: the corner route is longer than the straight one. */
export function walkSentence(a: number, b: number): string | null {
  if (a === 0 || b === 0) return null;
  const r = root(a * a + b * b);
  return `Going along the grid means ${a} + ${b} = ${a + b} ${plural(a + b, "unit")}. The straight line is ${r.perfect ? "" : "about "}${r.text}, shorter than turning the corner but longer than either leg on its own.`;
}

export function figureLabel(p: Point, q: Point): string {
  const { a, b } = legs(p, q), s = a * a + b * b, r = root(s);
  const dist = r.perfect ? `${r.floor}` : `about ${r.text}`;
  const middle = s === 0
    ? "P and Q are the same point, so the distance from P to Q is 0"
    : a === 0 || b === 0
      ? `P and Q lie on one grid line, so the distance from P to Q is ${dist}`
      : `The right triangle joining them has a horizontal leg of ${a} and a vertical leg of ${b}, so the distance from P to Q is ${dist}`;
  return `Coordinate grid from 0 to ${N} on both axes. P is at (${p.x}, ${p.y}) and Q is at (${q.x}, ${q.y}). ${middle}. The number line below the grid runs from 0 to ${NL_MAX} and marks that distance, the square root of ${s}.`;
}

/** Leg labels and the right-angle tick, each pushed to the side that faces away from the triangle. */
export function labelSpots(p: Point, q: Point) {
  const { a, b } = legs(p, q);
  const qRight = q.x >= p.x, qAbove = q.y >= p.y;
  const runY = qAbove ? (p.y > 0 ? sy(p.y) + 15 : sy(p.y) - 8) : (p.y < N ? sy(p.y) - 8 : sy(p.y) + 15);
  const riseRight = qRight || sx(q.x) - 9 < GX;   // left of the axis is where the y-axis numbers are drawn
  return {
    run: a === 0 ? null : { x: (sx(p.x) + sx(q.x)) / 2, y: runY },
    rise: b === 0 ? null : { x: sx(q.x) + (riseRight ? 9 : -9), y: (sy(p.y) + sy(q.y)) / 2 + 4, anchor: (riseRight ? "start" : "end") as "start" | "end" },
    corner: a === 0 || b === 0 ? null : { x: sx(q.x) + (qRight ? -9 : 0), y: sy(p.y) + (qAbove ? -9 : 0) },
  };
}

/** The one string the number-line readout draws, so its text and its measured width cannot drift apart. */
export function readoutText(s: number) { const r = root(s); return `c = √${s} ${r.relation} ${r.text}`; }
/** The readout rides above its marker but never leaves the frame: 0.7 em a character is wider than any mono face draws. */
export function markerLabelX(c: number, text: string) { const half = (text.length * 11 * 0.7) / 2; return Math.min(W - half, Math.max(half, nx(c))); }

/* ---------- worked example: a ladder, where the unknown side is a leg ---------- */

export const LADDER = { hypotenuse: 25, base: 7 };
export function ladderExample() {
  const c2 = LADDER.hypotenuse * LADDER.hypotenuse, base2 = LADDER.base * LADDER.base;
  const height2 = c2 - base2, height = Math.sqrt(height2);
  return { c2, base2, height2, height, check: base2 + height * height };
}
export function ladderSteps() {
  const e = ladderExample();
  return [
    { title: "Name the three sides", math: `${LADDER.base}² + h² = ${LADDER.hypotenuse}²`, note: `The wall meets the ground at a right angle, so the ladder — the side opposite that angle — is the hypotenuse. The ground is one leg, ${LADDER.base} ft, and the height h is the other.` },
    { title: "Square the sides you know", math: `${e.base2} + h² = ${e.c2}`, note: `Squaring turns each length into an area: ${LADDER.base} × ${LADDER.base} = ${e.base2} and ${LADDER.hypotenuse} × ${LADDER.hypotenuse} = ${e.c2}. Only h² is still unknown.` },
    { title: "Undo the addition", math: `h² = ${e.c2} − ${e.base2} = ${e.height2}`, note: "Subtract the known leg's square from both sides. This is the theorem running backwards: it hands you a leg instead of the hypotenuse." },
    { title: "Undo the square", math: `h = √${e.height2} = ${e.height} ft`, note: `${e.height} × ${e.height} = ${e.height2}, and a height cannot be negative, so the positive root is the answer.` },
    { title: "Check that it fits", math: `${LADDER.base}² + ${e.height}² = ${e.base2} + ${e.height * e.height} = ${e.check}`, note: `That total is ${LADDER.hypotenuse}², so the sides really do make a right triangle — and ${e.height} ft is shorter than the ${LADDER.hypotenuse} ft ladder, as every leg must be.` },
  ];
}

/* ---------- "Try it": the coordinate version, with the classic wrong turns ---------- */

export const TRY_P = { x: 1, y: 2 };
export const TRY_Q = { x: 9, y: 17 };
export function tryOptions() {
  const run = TRY_Q.x - TRY_P.x, rise = TRY_Q.y - TRY_P.y;
  const sum = run * run + rise * rise, answer = Math.sqrt(sum);
  const label = (v: number) => (Number.isInteger(v) ? `${v}` : `about ${v.toFixed(2)}`);
  const raw = [
    { value: rise - run, why: `${rise} − ${run} subtracts the legs. The theorem squares them and adds them: ${run}² + ${rise}² = ${sum}, and √${sum} = ${answer}.` },
    { value: answer, why: `Run = ${TRY_Q.x} − ${TRY_P.x} = ${run} and rise = ${TRY_Q.y} − ${TRY_P.y} = ${rise}, so ${run}² + ${rise}² = ${run * run} + ${rise * rise} = ${sum}. Since ${answer} × ${answer} = ${sum}, the distance is exactly ${answer}.` },
    { value: run + rise, why: `${run} + ${rise} = ${run + rise} is the trip along the grid, not the straight line. Square the legs first: √${sum} = ${answer}.` },
    { value: Math.sqrt(rise * rise - run * run), why: `Subtracting the squares, √(${rise * rise} − ${run * run}), is the move for finding a leg when the hypotenuse is already known. Here both legs are known, so add: √${sum} = ${answer}.` },
  ];
  const options = raw.map((o) => ({ ...o, label: label(o.value) }));
  return { run, rise, sum, answer, options, correct: options.findIndex((o) => o.value === answer) };
}

export default function Lesson() {
  const [x1, setX1] = useState(1), [y1, setY1] = useState(2);
  const [x2, setX2] = useState(5), [y2, setY2] = useState(5);
  const [shown, setShown] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const p = { x: x1, y: y1 }, q = { x: x2, y: y2 };
  const { a, b } = legs(p, q), s = a * a + b * b, r = root(s);
  const spot = labelSpots(p, q);
  const walk = walkSentence(a, b);
  const steps = ladderSteps(), e = ladderExample(), tryIt = tryOptions();

  return (
    <div className="prose-lesson max-w-none">
      <p>A map app that says the museum is 1.2 km away is not measuring the streets you would walk. It is measuring the straight line. Every place on that map is a pair of coordinates, and the straight line between two of them is almost never purely across or purely up: it is the long side of a <strong>right triangle</strong> whose two short sides run along the grid. Learn to measure that long side and you can measure the gap between any two points at all.</p>
      <p>The tool is the <strong>Pythagorean theorem</strong>: in every right triangle the legs a and b and the hypotenuse c satisfy <strong>a² + b² = c²</strong>. Look at what that asks you to do. Square two lengths, add the results, then undo the squaring with a <strong>square root</strong> to get back to a length. Powers going one way and roots coming back the other — that pairing is what holds this whole chapter together, from a ladder against a wall to the volume of a sphere.</p>

      <Figure caption="Move P and Q with the steppers. The dashed legs are the coordinate differences, and the number line underneath shows exactly where the distance lands among the whole numbers.">
        <div className="flex flex-col items-center gap-5">
          <svg className="mx-auto h-auto max-w-full" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={figureLabel(p, q)}>
            {Array.from({ length: N + 1 }, (_, i) => (
              <g key={i} fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">
                <line x1={sx(i)} y1={sy(0)} x2={sx(i)} y2={sy(N)} stroke="var(--line)" strokeWidth={1} /><line x1={sx(0)} y1={sy(i)} x2={sx(N)} y2={sy(i)} stroke="var(--line)" strokeWidth={1} />
                <text x={sx(i)} y={TICK_Y} textAnchor="middle">{i}</text><text x={GX - 10} y={sy(i) + 3.5} textAnchor="end">{i}</text>
              </g>
            ))}
            <line x1={sx(0)} y1={sy(0)} x2={sx(N)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(N)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <line x1={sx(x1)} y1={sy(y1)} x2={sx(x2)} y2={sy(y1)} stroke={RUN_C} strokeWidth={2.5} strokeDasharray="5 4" />
            <line x1={sx(x2)} y1={sy(y1)} x2={sx(x2)} y2={sy(y2)} stroke={RISE_C} strokeWidth={2.5} strokeDasharray="5 4" />
            {spot.corner && <rect x={spot.corner.x} y={spot.corner.y} width={9} height={9} fill="none" stroke="var(--ink-faint)" strokeWidth={1} />}
            <line x1={sx(x1)} y1={sy(y1)} x2={sx(x2)} y2={sy(y2)} stroke={HYP_C} strokeWidth={3} />
            {spot.run && <text x={spot.run.x} y={spot.run.y} textAnchor="middle" fontSize={11} fontWeight={800} fill={RUN_C} fontFamily="var(--font-mono)">{a}</text>}
            {spot.rise && <text x={spot.rise.x} y={spot.rise.y} textAnchor={spot.rise.anchor} fontSize={11} fontWeight={800} fill={RISE_C} fontFamily="var(--font-mono)">{b}</text>}
            {[{ pt: p, name: "P" }, { pt: q, name: "Q" }].map(({ pt, name }) => (
              <g key={name}><circle cx={sx(pt.x)} cy={sy(pt.y)} r={7} fill={HYP_C} stroke="white" strokeWidth={2} /><text x={sx(pt.x)} y={sy(pt.y) + 3.5} textAnchor="middle" fontSize={9} fontWeight={800} fill="white">{name}</text></g>
            ))}
            {!r.perfect && <rect x={nx(r.floor)} y={NL_Y - 6} width={nx(r.ceil) - nx(r.floor)} height={12} fill={ACCENT} fillOpacity={0.18} />}
            <line x1={nx(0)} y1={NL_Y} x2={nx(NL_MAX)} y2={NL_Y} stroke="var(--ink-soft)" strokeWidth={1.5} />
            {Array.from({ length: NL_MAX + 1 }, (_, i) => (
              <g key={i}><line x1={nx(i)} y1={NL_Y - 4} x2={nx(i)} y2={NL_Y + 4} stroke="var(--ink-soft)" strokeWidth={1} /><text x={nx(i)} y={NL_Y + 17} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{i}</text></g>
            ))}
            <line x1={nx(0)} y1={NL_Y - 10} x2={nx(r.value)} y2={NL_Y - 10} stroke={HYP_C} strokeWidth={3} />
            <circle cx={nx(r.value)} cy={NL_Y} r={5} fill={HYP_C} stroke="white" strokeWidth={2} />
            <text x={markerLabelX(r.value, readoutText(s))} y={NL_Y - 19} textAnchor="middle" fontSize={11} fontWeight={800} fill={HYP_C} fontFamily="var(--font-mono)">{readoutText(s)}</text>
          </svg>

          <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Legs straight from the coordinates</div>
              <div className="mt-1 font-mono text-lg font-black" style={{ color: RUN_C }}>a = |{x2} − {x1}| = {a}</div>
              <div className="font-mono text-lg font-black" style={{ color: RISE_C }}>b = |{y2} − {y1}| = {b}</div>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Square them, then add</div>
              <div className="mt-1 font-mono text-lg font-black">{a}² + {b}² = {a * a} + {b * b} = {s}</div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">That total is c². Square the straight-line distance from P to Q and you land on the same number.</div>
            </div>
          </div>

          <div className="w-full max-w-xl rounded-2xl border-2 px-5 py-3 text-center" style={{ borderColor: HYP_C }}>
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Undo the square with a square root</div>
            <div className="mt-1 font-mono text-2xl font-black" style={{ color: HYP_C }}>{readoutText(s)}</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">{describe(a, b)}</div>
            {walk && <div className="mt-1 text-sm text-[var(--ink-soft)]">{walk}</div>}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Stepper label="x₁" value={x1} min={0} max={N} color={HYP_C} onChange={setX1} />
            <Stepper label="y₁" value={y1} min={0} max={N} color={HYP_C} onChange={setY1} />
            <Stepper label="x₂" value={x2} min={0} max={N} color={HYP_C} onChange={setX2} />
            <Stepper label="y₂" value={y2} min={0} max={N} color={HYP_C} onChange={setY2} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: how high does the ladder reach?</h2>
      <p>A {LADDER.hypotenuse} ft ladder leans against a flat wall with its feet {LADDER.base} ft out from the base of the wall. How far up the wall does the top of the ladder reach? This time the missing side is a <em>leg</em>, not the hypotenuse. Reveal the reasoning one move at a time.</p>
      <div className="card my-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShown((v) => Math.min(steps.length, v + 1))} disabled={shown >= steps.length} aria-expanded={shown > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>{shown === 0 ? "Show the first step" : shown < steps.length ? "Next step" : "All steps shown"}</button>
          <button type="button" onClick={() => setShown(0)} disabled={shown === 0} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
          <span className="text-sm text-[var(--ink-faint)]">{shown} of {steps.length} shown</span>
        </div>
        <ol id={stepsId} aria-live="polite" className="mt-3 flex list-none flex-col gap-2 p-0">
          {steps.slice(0, shown).map((step, i) => (
            <li key={step.title} className="rounded-xl bg-[var(--surface-2)] px-4 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Step {i + 1}: {step.title}</div>
              <div className="font-mono text-lg font-black">{step.math}</div>
              <div className="text-sm text-[var(--ink-soft)]">{step.note}</div>
            </li>
          ))}
        </ol>
      </div>

      <h2>Try it</h2>
      <p>A drone flies straight from A({TRY_P.x}, {TRY_P.y}) to B({TRY_Q.x}, {TRY_Q.y}) on a grid marked in kilometers. How long is that flight?</p>
      <div className="flex flex-wrap gap-2">
        {tryIt.options.map((o, i) => (
          <button key={i} type="button" onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={pick === i ? { background: i === tryIt.correct ? HYP_C : WRONG_C, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o.label}</button>
        ))}
      </div>
      <p aria-live="polite" className="mt-3 text-[15px]">{pick === null ? "Pick the distance you think is right." : <><strong>{pick === tryIt.correct ? "Correct." : "Not this one."}</strong> {tryIt.options[pick].why}</>}</p>

      <h2>Where this chapter goes</h2>
      <p>Six lessons follow, and the first three sharpen the algebra. <strong>Exponent Rules</strong> sets out what a² and its relatives obey when you multiply them, divide them, or raise a power to a power. <strong>Square &amp; Cube Roots</strong> is the undo button, solving equations like c² = {tryIt.sum} and x³ = 64. <strong>Scientific Notation</strong> puts those powers to work on numbers too large or too small to write out, from the width of a state to the width of a chip. Then the geometry arrives. <strong>The Pythagorean Theorem</strong> shows why a² + b² = c² has to be true and applies it to triangles anywhere, not only on a grid. <strong>Distance Between Points</strong> turns the picture above into a formula you can use on any pair of coordinates. And <strong>Volume of Round Solids</strong> carries the squared length one dimension further, into the πr² hiding inside every cylinder, cone, and sphere.</p>

      <MathCheck>
        <p>In a right triangle the legs a and b and the hypotenuse c always satisfy a² + b² = c². Seeing why that must be true — cutting and rearranging the squares built on the three sides — is the work of the theorem's own lesson; what this opener uses is what the equation buys you. Because it ties all three sides together, any two of them fix the third: add the squares to reach the hypotenuse, subtract to reach a leg, the way the ladder gave h = √({LADDER.hypotenuse}² − {LADDER.base}²) = √{e.height2} = {e.height} ft (8.G.B.7). On a coordinate grid the legs are handed to you: the horizontal one is |x₂ − x₁| and the vertical one is |y₂ − y₁|, so the distance between (x₁, y₁) and (x₂, y₂) is √((x₂ − x₁)² + (y₂ − y₁)²) — for P and Q above that is √({a}² + {b}²) = √{s} {r.relation} {r.text} (8.G.B.8). The final move always solves an equation of the form c² = p, whose positive solution is the square root √p. Every p this figure can build is a whole number, because it is a sum of two squares of whole numbers: when that p is a perfect square the root is a whole number, and when a whole number is not a perfect square its square root is irrational and sits between the two whole numbers whose squares surround it — the pair the number line shades whenever the root is not exact (8.EE.A.2).</p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
