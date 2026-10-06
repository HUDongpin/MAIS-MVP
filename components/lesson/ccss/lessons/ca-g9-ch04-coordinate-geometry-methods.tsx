"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)", RING = "var(--band-middle)", SPLIT = "var(--band-upper)";
/** One border colour per readout card, in the order `cardTexts` returns them. */
const CARD_COLORS = [ACCENT, ACCENT, SPLIT, RING];

export type Pt = { x: number; y: number };

/** Grid: R units each way from the origin, CELL pixels per unit, PAD pixels of margin. */
export const R = 7, CELL = 20, PAD = 20;
export const SIZE = 2 * R * CELL + 2 * PAD;
/** A is fixed. B stays right of A, so the run is never 0; AB never exceeds 5, so its circle always fits. */
export const A: Pt = { x: -2, y: -2 };
export const BX_MIN = 0, BX_MAX = 2, BY_MIN = -5, BY_MAX = 1;
/** P sits PART/DEN of the way from A to B, so P is always strictly between them. */
export const DEN = 4, PART_MIN = 1, PART_MAX = 3;
export const sx = (x: number) => PAD + (x + R) * CELL;
export const sy = (y: number) => SIZE - PAD - (y + R) * CELL;
export function gcd(a: number, b: number): number { return b === 0 ? Math.abs(a) : gcd(b, a % b); }

/** Integers plain, quarters as short decimals, negatives with a true minus sign. */
export function num(n: number): string {
  const size = Math.abs(n);
  const body = Number.isInteger(size) ? String(size) : size.toFixed(2).replace(/0+$/u, "").replace(/\.$/u, "");
  return (n < 0 ? "−" : "") + body;
}
export function pointText(p: Pt): string { return `(${num(p.x)}, ${num(p.y)})`; }
/** A negative number needs parentheses as a multiplier or a base: 0.5 · (−3) and (−3)². */
export function factorText(n: number): string { return n < 0 ? `(${num(n)})` : num(n); }
export function squareText(n: number): string { return `${factorText(n)}²`; }
export function minusText(left: number, right: number): string { return `${num(left)} − ${factorText(right)}`; }
/** A signed running sum: [−6, 20, −64] becomes "−6 + 20 − 64". */
export function sumText(values: number[]): string {
  return values.map((v, i) => (i === 0 ? num(v) : v < 0 ? ` − ${num(-v)}` : ` + ${num(v)}`)).join("");
}
/** Lowest terms with a positive denominator; a zero denominator has no value. */
export function fractionText(numerator: number, denominator: number): string {
  if (denominator === 0) return "undefined";
  const n = denominator < 0 ? -numerator : numerator, d = Math.abs(denominator);
  if (n === 0) return "0";
  const g = gcd(n, d);
  return d / g === 1 ? num(n / g) : `${num(n / g)}/${d / g}`;
}
/** (x − h)² + (y − k)² = r², signs folded in: h = −2 gives "(x + 2)²" and h = 0 gives "x²". */
export function circleEquation(center: Pt, r2: number): string {
  const term = (v: string, c: number) => (c === 0 ? `${v}²` : `(${v} ${c > 0 ? "−" : "+"} ${Math.abs(c)})²`);
  return `${term("x", center.x)} + ${term("y", center.y)} = ${num(r2)}`;
}
/** Every quantity this chapter reads off two points. */
export function segment(a: Pt, b: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d2 = dx * dx + dy * dy, d = Math.sqrt(d2), exact = Number.isInteger(d);
  return {
    dx, dy, d2, d, exact, slope: fractionText(dy, dx), circle: circleEquation(a, d2),
    lengthText: exact ? `√${d2} = ${d}` : `√${d2} ≈ ${d.toFixed(2)}`,
    lengthShort: exact ? String(d) : `√${d2}`,
    legsText: `√(${squareText(dx)} + ${squareText(dy)})`,
    perpSlope: dy === 0 ? "undefined" : fractionText(-dx, dy),
  };
}
/** A + (part/den)(B − A): each coordinate is a weighted average of the endpoints. */
export function partitionPoint(a: Pt, b: Pt, part: number, den: number): Pt {
  return { x: a.x + (part / den) * (b.x - a.x), y: a.y + (part / den) * (b.y - a.y) };
}
/** How P cuts AB, in lowest terms: part 2 of 4 gives "1 : 1". */
export function ratioText(part: number, den: number): string {
  const g = gcd(part, den - part);
  return `${num(part / g)} : ${num((den - part) / g)}`;
}
/** Every pixel the figure draws, from B and the partition step alone. */
export function layout(bx: number, by: number, part: number) {
  const b: Pt = { x: bx, y: by }, s = segment(A, b), p = partitionPoint(A, b, part, DEN);
  const pa = { x: sx(A.x), y: sy(A.y) }, pb = { x: sx(bx), y: sy(by) };
  const corner = { x: pb.x, y: pa.y }, pp = { x: sx(p.x), y: sy(p.y) };
  // No two labels may collide: B clears the rise leg by moving outward from the corner, the run
  // label takes the side of its leg AB does not use, and P steps off AB on the side away from the corner.
  const labels: { text: string; x: number; y: number; anchor: "start" | "middle" | "end" }[] = [
    { text: `A ${pointText(A)}`, x: pa.x - 8, y: pa.y + 15, anchor: "end" },
    { text: `B ${pointText(b)}`, x: pb.x + 8, y: s.dy >= 0 ? pb.y - 12 : pb.y + 20, anchor: "start" },
    { text: `run ${num(s.dx)}`, x: (pa.x + pb.x) / 2, y: s.dy < 0 ? pa.y - 8 : pa.y + 16, anchor: "middle" },
    { text: `rise ${num(s.dy)}`, x: pb.x + 8, y: (pa.y + pb.y) / 2 + 4, anchor: "start" },
    { text: "P", x: s.dy === 0 ? pp.x + 8 : pp.x - 8, y: s.dy >= 0 ? pp.y - 8 : pp.y + 18, anchor: s.dy === 0 ? "start" : "end" },
  ];
  // Right-angle mark at the corner, toward A and toward B; dropped when the legs are collinear.
  const mark = s.dy === 0 ? null : { x: corner.x - 8, y: s.dy > 0 ? corner.y - 8 : corner.y, size: 8 };
  return { s, p, a: pa, b: pb, corner, pp, mark, circle: { cx: pa.x, cy: pa.y, r: s.d * CELL }, labels };
}
export function figureLabel(bx: number, by: number, part: number): string {
  const b: Pt = { x: bx, y: by }, s = segment(A, b), p = partitionPoint(A, b, part, DEN);
  return `Coordinate grid with A at ${pointText(A)} and B at ${pointText(b)}. The run is ${num(s.dx)} and the rise is ${num(s.dy)}, so AB has slope ${s.slope} and length ${s.lengthText}. Point P at ${fractionText(part, DEN)} of the way from A to B is ${pointText(p)}, and a dashed circle centered at A passes through B.`;
}
/** The caption under the figure. When the rise is 0 there is no second leg, so nothing is a hypotenuse. */
export function figureCaption(bx: number, by: number): string {
  const s = segment(A, { x: bx, y: by });
  const legs = s.dy === 0 ? `The rise is ${num(s.dy)}, so AB lies flat along the dashed run leg and its length is that run of ${num(s.dx)}` : `The dashed legs are the run ${num(s.dx)} and the rise ${num(s.dy)}, and AB is their hypotenuse`;
  return `${legs}. P slides along AB, and the dashed circle collects every point exactly as far from A as B is.`;
}
/** The four readout cards as plain text, so the test can check every sentence the student reads. */
export function cardTexts(bx: number, by: number, part: number): { title: string; big: string; small: string; faint: string }[] {
  const b: Pt = { x: bx, y: by }, s = segment(A, b), p = partitionPoint(A, b, part, DEN), t = fractionText(part, DEN);
  return [
    { title: "Slope of AB", big: s.slope, small: `rise ÷ run = ${num(s.dy)} ÷ ${num(s.dx)}`, faint: s.dy === 0 ? "AB is horizontal, so a perpendicular line is vertical and has no slope" : `a perpendicular line has slope ${s.perpSlope}` },
    { title: "Length of AB", big: s.lengthText, small: s.legsText, faint: s.dy === 0 ? "a flat segment, so the length is the run itself" : "the Pythagorean theorem on the two dashed legs" },
    { title: "Point P", big: pointText(p), small: `(${num(A.x)} + ${t}·${factorText(s.dx)}, ${num(A.y)} + ${t}·${factorText(s.dy)})`, faint: `AP : PB = ${ratioText(part, DEN)}${part * 2 === DEN ? ", the midpoint" : ""}` },
    { title: "Circle through B centered at A", big: s.circle, small: `B fits: ${squareText(s.dx)} + ${squareText(s.dy)} = ${num(s.d2)}`, faint: `every point exactly ${s.lengthShort} from A` },
  ];
}
/** The Math check, sentence by sentence. The flat case never claims a right angle it does not have. */
export function mathCheckText(bx: number, by: number, part: number): { distance: string; slope: string; partition: string; circle: string } {
  const b: Pt = { x: bx, y: by }, s = segment(A, b), p = partitionPoint(A, b, part, DEN), t = fractionText(part, DEN);
  const squares = `${squareText(s.dx)} + ${squareText(s.dy)} = ${num(s.d2)}`;
  const legs = s.dy === 0 ? `AB lies flat along a grid line, so the second leg has no length and AB is the run itself; the distance formula still agrees, because AB² = ${squares}, so AB = ${s.lengthText}` : `Those dashed legs meet at a right angle, so AB is their hypotenuse: AB² = ${squares}, giving AB = ${s.lengthText}`;
  const perp = s.dy === 0 ? ", and a line perpendicular to this horizontal segment is vertical, so it has no slope" : `, while a perpendicular line has slope ${s.perpSlope}; whenever both slopes exist their product is −1`;
  return {
    distance: `For A${pointText(A)} and B${pointText(b)} the run is ${num(s.dx)} and the rise is ${num(s.dy)}. ${legs}. Distance in coordinates is the Pythagorean theorem in disguise, and chaining such lengths around a polygon gives its perimeter, while the shoelace formula gives its area.`,
    slope: `Reading the same legs as a ratio gives the slope ${num(s.dy)} ÷ ${num(s.dx)} = ${s.slope}${perp} — the criterion that lets algebra prove a figure has parallel sides or square corners.`,
    partition: `Point P is A + ${t}(B − A), so each coordinate of ${pointText(p)} is a weighted average of the endpoints, and P divides AB in the ratio ${ratioText(part, DEN)}.`,
    circle: `Asking which points sit exactly ${s.lengthShort} from A is the distance formula set equal to a constant; squaring both sides clears the root and leaves ${s.circle}, the boundary of the region within ${s.lengthShort} of A, with B on it because ${squares}.`,
  };
}
/** Worked example: three survey markers around a triangular field. */
export const EX_A: Pt = { x: -2, y: -1 }, EX_B: Pt = { x: 4, y: 7 }, EX_C: Pt = { x: 8, y: 4 };
/** Twice the signed area of a triangle, term by term — the shoelace sum. */
export function shoelaceTerms(p: Pt, q: Pt, r: Pt): number[] {
  return [p.x * (q.y - r.y), q.x * (r.y - p.y), r.x * (p.y - q.y)];
}
export function workedExample() {
  const ab = segment(EX_A, EX_B), bc = segment(EX_B, EX_C), ca = segment(EX_C, EX_A);
  const terms = shoelaceTerms(EX_A, EX_B, EX_C), shoelaceSum = terms.reduce((total, t) => total + t, 0);
  const perimeter = ab.d + bc.d + ca.d;
  return {
    ab, bc, ca, terms, shoelaceSum, perimeter, perimeterText: perimeter.toFixed(2),
    area: Math.abs(shoelaceSum) / 2, legArea: (ab.d * bc.d) / 2,
    quarter: partitionPoint(EX_A, EX_B, 1, DEN), circle: circleEquation(EX_B, bc.d2),
  };
}
/** Try it: which point is one third of the way from K to L? */
export const TRY_K: Pt = { x: -4, y: 2 }, TRY_L: Pt = { x: 8, y: 8 };
export function tryChoices(): { point: Pt; why: string }[] {
  const delta = { x: TRY_L.x - TRY_K.x, y: TRY_L.y - TRY_K.y };
  return [
    { point: partitionPoint(TRY_K, TRY_L, 1, 2), why: "is the midpoint, which splits KL as 1 : 1 instead of 1 : 2" },
    { point: { x: delta.x / 3, y: delta.y / 3 }, why: "is one third of the change from K to L, but it was never added on to K" },
    { point: partitionPoint(TRY_K, TRY_L, 1, 3), why: "correct" },
    { point: partitionPoint(TRY_K, TRY_L, 2, 3), why: "is two thirds of the way, so it splits KL as 2 : 1" },
  ];
}
export function tryAnswerIndex(): number {
  const third = partitionPoint(TRY_K, TRY_L, 1, 3);
  return tryChoices().findIndex((c) => c.point.x === third.x && c.point.y === third.y);
}

export default function Lesson() {
  const [bx, setBx] = useState(2);
  const [by, setBy] = useState(1);
  const [part, setPart] = useState(2);
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();
  const L = layout(bx, by, part);
  const cards = cardTexts(bx, by, part).map((c, i) => ({ ...c, color: CARD_COLORS[i] }));
  const check = mathCheckText(bx, by, part);
  const w = workedExample(), steps = [
    <>Subtract coordinates for each side. A to B: run {minusText(EX_B.x, EX_A.x)} = {num(w.ab.dx)}, rise {minusText(EX_B.y, EX_A.y)} = {num(w.ab.dy)}. B to C: run {minusText(EX_C.x, EX_B.x)} = {num(w.bc.dx)}, rise {minusText(EX_C.y, EX_B.y)} = {num(w.bc.dy)}.</>,
    <>Slopes are rise over run: AB has slope {num(w.ab.dy)}/{num(w.ab.dx)} = {w.ab.slope}, and BC has slope {w.bc.slope}. Their product is {w.ab.slope} × ({w.bc.slope}) = −1, so the two sides are perpendicular and the corner at B is a right angle.</>,
    <>Each length is a hypotenuse: AB = {w.ab.legsText} = {w.ab.lengthText}, BC = {w.bc.legsText} = {w.bc.lengthText}, CA = {w.ca.legsText} = {w.ca.lengthText}. The fence around the field is {num(w.ab.d)} + {num(w.bc.d)} + √{num(w.ca.d2)} ≈ {w.perimeterText} units.</>,
    <>Because the right angle is at B, sides AB and BC are the legs, so the area is ½ × {num(w.ab.d)} × {num(w.bc.d)} = {num(w.legArea)} square units. The shoelace formula needs no right angle and agrees: ½ |{sumText(w.terms)}| = ½ × {num(Math.abs(w.shoelaceSum))} = {num(w.area)}.</>,
    <>A gate one quarter of the way from A to B sits at A + ¼(B − A) = ({num(EX_A.x)} + ¼·{num(w.ab.dx)}, {num(EX_A.y)} + ¼·{num(w.ab.dy)}) = {pointText(w.quarter)}, splitting AB in the ratio {ratioText(1, DEN)}.</>,
    <>A sprinkler at B that reaches exactly as far as C traces the circle of points {num(w.bc.d)} units from B: {w.circle}; the ground it waters is everything on or inside that circle. C is on the circle itself because {squareText(w.bc.dx)} + {squareText(w.bc.dy)} = {num(w.bc.d2)}.</>,
  ];
  const choices = tryChoices(), answer = tryAnswerIndex(), tryDelta = { x: TRY_L.x - TRY_K.x, y: TRY_L.y - TRY_K.y };
  const trySentence = `From K to L the change is (${minusText(TRY_L.x, TRY_K.x)}, ${minusText(TRY_L.y, TRY_K.y)}) = (${num(tryDelta.x)}, ${num(tryDelta.y)}). One third of that change is (${num(tryDelta.x / 3)}, ${num(tryDelta.y / 3)}), and adding it to K gives ${pointText(choices[answer].point)}.`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Every dock on a bike-share map is stored as nothing but a pair of numbers. From two of those pairs the app answers questions that once needed a ruler and a folded paper map: how far apart two docks are in a straight line, how steep the direct route between them is, where to put a repair stand a third of the way along, and which docks fall on or inside a service circle drawn around the depot. Every answer is arithmetic.
      </p>
      <p>
        That is the move this chapter makes again and again. Put a figure on a grid and its geometry turns into algebra you can check: length comes from the Pythagorean theorem, steepness from a ratio of differences, a point part-way along a segment from a weighted average of its endpoints, and a circle from the distance formula set equal to a constant. Move B below and watch one segment answer four questions at once.
      </p>
      <Figure caption={figureCaption(bx, by)}>
        <div className="flex flex-col items-center gap-5">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto h-auto max-w-full" style={{ maxHeight: 330 }} role="img" aria-label={figureLabel(bx, by, part)}>
            {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((v) => (
              <g key={v} stroke="var(--line)" strokeWidth={1}><line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} /><line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} /></g>
            ))}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} /><line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />
            <circle cx={L.circle.cx} cy={L.circle.cy} r={L.circle.r} fill={RING} fillOpacity={0.07} stroke={RING} strokeWidth={2} strokeDasharray="5 4" />
            <line x1={L.a.x} y1={L.a.y} x2={L.corner.x} y2={L.corner.y} stroke="var(--ink-faint)" strokeWidth={2} strokeDasharray="4 3" /><line x1={L.corner.x} y1={L.corner.y} x2={L.b.x} y2={L.b.y} stroke="var(--ink-faint)" strokeWidth={2} strokeDasharray="4 3" />
            {L.mark && <rect x={L.mark.x} y={L.mark.y} width={L.mark.size} height={L.mark.size} fill="none" stroke="var(--ink-faint)" strokeWidth={1.5} />}
            <line x1={L.a.x} y1={L.a.y} x2={L.b.x} y2={L.b.y} stroke={ACCENT} strokeWidth={3} /><circle cx={L.pp.x} cy={L.pp.y} r={6} fill={SPLIT} stroke="white" strokeWidth={2} />
            <circle cx={L.a.x} cy={L.a.y} r={5} fill={ACCENT} /><circle cx={L.b.x} cy={L.b.y} r={5} fill={ACCENT} />
            {L.labels.map((lb) => <text key={lb.text} x={lb.x} y={lb.y} textAnchor={lb.anchor} fontSize={11} fontWeight={800} fill={lb.text === "P" ? SPLIT : "var(--ink)"}>{lb.text}</text>)}
          </svg>
          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 text-center sm:grid-cols-2">
            {cards.map((c) => (
              <div key={c.title} className="rounded-xl border-2 px-4 py-3" style={{ borderColor: c.color }}>
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: c.color }}>{c.title}</div><div className="font-mono text-lg font-black">{c.big}</div><div className="font-mono text-xs text-[var(--ink-soft)]">{c.small}</div><div className="mt-0.5 text-xs text-[var(--ink-faint)]">{c.faint}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="B x-coordinate" value={bx} min={0} max={2} onChange={setBx} />
            <Stepper label="B y-coordinate" value={by} min={-5} max={1} onChange={setBy} />
            <Stepper label="P: quarters from A" value={part} min={1} max={3} onChange={setPart} />
          </div>
        </div>
      </Figure>
      <h2>Worked example: a triangular field</h2>
      <p>
        Three survey markers sit at A{pointText(EX_A)}, B{pointText(EX_B)} and C{pointText(EX_C)}, one unit to a meter. Show that the corner at B is square, find how much fencing the field needs and how much ground it covers, place a gate a quarter of the way from A to B, and write the equation of a sprinkler circle centered at B that just reaches C.
      </p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, shown).map((body, i) => <li key={i} className="flex gap-3 text-[15px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span><span>{body}</span></li>)}
        </ol>
        {shown === 0 && <p className="m-0 text-sm text-[var(--ink-faint)]">Press &ldquo;Next step&rdquo; to watch the solution unfold.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={shown > 0} aria-controls={stepsId} disabled={shown >= steps.length} onClick={() => setShown((n) => Math.min(steps.length, n + 1))} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next step</button>
          <button type="button" disabled={shown === 0} onClick={() => setShown(0)} className="rounded-lg border border-[var(--line)] px-4 py-1.5 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>
      <h2>Try it</h2>
      <p>A cable runs from K{pointText(TRY_K)} to L{pointText(TRY_L)}. A junction box goes one third of the way from K to L. Which point is it?</p>
      <div className="flex flex-wrap gap-2">
        {choices.map((c, i) => (
          <button key={i} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={picked === i ? { background: i === answer ? "var(--band-upper)" : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{pointText(c.point)}</button>))}
      </div>
      {picked !== null && <p className="mt-3 text-[15px]">{picked === answer ? `Right. ${trySentence}` : `Not quite: ${pointText(choices[picked].point)} ${choices[picked].why}. ${trySentence}`}</p>}
      <h2>Where this chapter goes</h2>
      <p>
        <strong>The Equation of a Circle</strong>{" "}starts where the fourth card above stops, and shows how completing the square pulls a center and radius back out of an expanded equation. <strong>Parabolas, Ellipses, Hyperbolas</strong>{" "}repeats the same derivation with other distance rules, so each curve&apos;s equation comes straight from its definition. <strong>Coordinate Proofs &amp; Slopes</strong>{" "}turns the slope card into a proof tool: equal slopes mean parallel, a product of −1 means perpendicular, and those two facts settle what kind of figure four points make. <strong>Partitioning a Segment</strong>{" "}generalizes point P from quarters to any ratio at all.{" "}<strong>Perimeter &amp; Area by Coordinates</strong>{" "}chains the distance formula around a polygon and adds the shoelace formula you saw in step 4.
      </p>
      <MathCheck>
        <p>{check.distance} (G-GPE.7)</p>
        <p>{check.slope} (G-GPE.4, G-GPE.5)</p>
        <p>{check.partition} (G-GPE.6)</p>
        <p>{check.circle} (G-GPE.1)</p>
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
        <span className="w-9 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
