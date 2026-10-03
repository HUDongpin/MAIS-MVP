"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)", INVERSE = "var(--band-upper)", PARENT_INK = "var(--band-middle)";
export type ParentKey = "line" | "cube" | "exp";
export type Pt = { x: number; y: number };
/** Grid: R units each way from the origin, CELL pixels per unit, PAD pixels of margin. */
export const R = 6, CELL = 22, PAD = 24;
export const SIZE = 2 * R * CELL + 2 * PAD;
/** Curve sampling step. 1/16 is exact in binary, so every sample lands on a clean pixel. */
export const STEP = 1 / 16;
/** Declared control bounds. |a| never reaches 0, so g stays strictly monotonic and invertible. */
export const MAG_MIN = 1, MAG_MAX = 3, H_MIN = -3, H_MAX = 3, K_MIN = -3, K_MAX = 3;
export const sx = (x: number) => PAD + (x + R) * CELL;
export const sy = (y: number) => SIZE - PAD - (y + R) * CELL;
/** Integers plain, other values to two decimals, negatives with a true minus sign. */
export function num(n: number): string { const size = Math.abs(n); return (n < 0 ? "−" : "") + (Number.isInteger(size) ? String(size) : String(Math.round(size * 100) / 100)); }
/** The three parent functions offered. Each is strictly increasing, so each is one-to-one. */
export const PARENTS: { key: ParentKey; formula: string; doStep: string; undoStep: string }[] = [
  { key: "line", formula: "f(x) = x", doStep: "", undoStep: "" },
  { key: "cube", formula: "f(x) = x³", doStep: "cube it", undoStep: "take the cube root" },
  { key: "exp", formula: "f(x) = 2^x", doStep: "raise 2 to that power", undoStep: "take log base 2" },
];
export function parentInfo(key: ParentKey) {
  const found = PARENTS.find((p) => p.key === key);
  if (!found) throw new Error(`unknown parent ${key}`); return found;
}
export function parentValue(key: ParentKey, t: number): number { return key === "line" ? t : key === "cube" ? t * t * t : Math.pow(2, t); }
export function parentInverse(key: ParentKey, y: number): number { return key === "line" ? y : key === "cube" ? Math.cbrt(y) : Math.log2(y); }
/** g(x) = a·f(x − h) + k: shift right by h, apply the parent, stretch by a, lift by k. */
export function transform(key: ParentKey, a: number, h: number, k: number, x: number): number { return a * parentValue(key, x - h) + k; }
export function untransform(key: ParentKey, a: number, h: number, k: number, y: number): number { return h + parentInverse(key, (y - k) / a); }
/** x = h carries the parent's own anchor (0, f(0)) to this point, whatever the parent is. */
export function anchorPoint(key: ParentKey, a: number, h: number, k: number): Pt { return { x: h, y: a * parentValue(key, 0) + k }; }
/** The visible part of a curve. Every parent is monotonic, so the kept samples stay contiguous. */
export function curve(key: ParentKey, a: number, h: number, k: number): Pt[] {
  return Array.from({ length: (2 * R) / STEP + 1 }, (_, i) => -R + i * STEP)
    .map((x) => ({ x, y: transform(key, a, h, k, x) })).filter((p) => p.y >= -R && p.y <= R);
}
/** Pixels for a point list; `swap` reflects it across y = x, which is what an inverse does. */
export function polyline(points: Pt[], swap: boolean): string {
  return points.map((p) => `${sx(swap ? p.y : p.x).toFixed(2)},${sy(swap ? p.x : p.y).toFixed(2)}`).join(" ");
}
/** Forward: x − h, then f, then × a, then + k. The undo is that list reversed with every step
 *  replaced by its opposite; "" marks a step this state does not use. */
function chain(key: ParentKey, a: number, h: number, k: number, undo: boolean): string[] {
  const parent = parentInfo(key);
  const shift = (delta: number) => `${delta > 0 ? "add" : "subtract"} ${Math.abs(delta)}`;
  const scale = a === 1 ? "" : a === -1 ? "flip the sign" : `${undo ? "divide" : "multiply"} by ${num(a)}`;
  const steps = undo
    ? [k === 0 ? "" : shift(-k), scale, parent.undoStep, h === 0 ? "" : shift(h)]
    : [h === 0 ? "" : shift(-h), parent.doStep, scale, k === 0 ? "" : shift(k)];
  const used = steps.filter((s) => s !== "");
  return used.length ? used : ["leave x alone"];
}
export function forwardSteps(key: ParentKey, a: number, h: number, k: number): string[] { return chain(key, a, h, k, false); }
export function undoSteps(key: ParentKey, a: number, h: number, k: number): string[] { return chain(key, a, h, k, true); }
export function gText(key: ParentKey, a: number, h: number, k: number): string {
  const inner = h === 0 ? "x" : `(x ${h > 0 ? "−" : "+"} ${Math.abs(h)})`;
  const body = key === "line" ? inner : key === "cube" ? `${inner}³` : `2^${inner}`;
  const scaled = a === 1 ? body : a === -1 ? `−${body}` : `${num(a)}${/^\d/u.test(body) ? "·" : ""}${body}`;
  return `g(x) = ${scaled}${k === 0 ? "" : ` ${k > 0 ? "+" : "−"} ${Math.abs(k)}`}`;
}
export function gInverseText(key: ParentKey, a: number, h: number, k: number): string {
  const core = k === 0 ? "x" : `(x ${k > 0 ? "−" : "+"} ${Math.abs(k)})`;
  const divided = a === 1 ? core : a === -1 ? `−${core}` : a > 0 ? `${core}/${a}` : `−${core}/${Math.abs(a)}`;
  // Dividing by 1 changes nothing, so in that one case the core already carries its own brackets.
  const arg = a === 1 && k !== 0 ? divided : `(${divided})`;
  const applied = key === "line" ? divided : key === "cube" ? (divided === "x" ? "∛x" : `∛${arg}`) : `log₂${arg}`;
  return `g⁻¹(x) = ${applied}${h === 0 ? "" : ` ${h > 0 ? "+" : "−"} ${Math.abs(h)}`}`;
}
/** 1/a in lowest terms: the slope of the inverse of a line of slope a. */
export function reciprocalText(a: number): string { return a === 1 ? "1" : a === -1 ? "−1" : a > 0 ? `1/${a}` : `−1/${Math.abs(a)}`; }
/** The coefficient of 2^x once a·2^(x − h) is multiplied out: a/2^h, exact in binary, in lowest terms. */
export function powerCoefficientText(a: number, h: number): string {
  let top = h > 0 ? a : a * Math.pow(2, -h), bottom = h > 0 ? Math.pow(2, h) : 1;
  while (bottom % 2 === 0 && top % 2 === 0) { top /= 2; bottom /= 2; }
  return bottom === 1 ? num(top) : `${num(top)}/${bottom}`;
}
/** Signed terms written left to right: the first keeps a bare minus, the rest read "+ 3" or "− 3". */
function terms(parts: { c: number; symbol: string }[]): string {
  return parts.filter((t) => t.c !== 0).map((t, i) => { const size = Math.abs(t.c), body = t.symbol === "" ? String(size) : size === 1 ? t.symbol : `${size}${t.symbol}`;
    return i === 0 ? `${t.c < 0 ? "−" : ""}${body}` : ` ${t.c < 0 ? "−" : "+"} ${body}`; }).join("");
}
/** The same rule multiplied out and collected — the spelling that hides the moves (F-IF.8). */
export function expandedText(key: ParentKey, a: number, h: number, k: number): string {
  if (key === "line") return `g(x) = ${terms([{ c: a, symbol: "x" }, { c: k - a * h, symbol: "" }])}`;
  if (key === "cube") return `g(x) = ${terms([{ c: a, symbol: "x³" }, { c: -3 * a * h, symbol: "x²" }, { c: 3 * a * h * h, symbol: "x" }, { c: k - a * h * h * h, symbol: "" }])}`;
  const c = powerCoefficientText(a, h), scaled = c === "1" ? "2^x" : c === "−1" ? "−2^x" : `${c.includes("/") ? `(${c})` : c}·2^x`;
  return `g(x) = ${scaled}${k === 0 ? "" : ` ${k > 0 ? "+" : "−"} ${Math.abs(k)}`}`;
}
/** What the multiplied-out spelling costs — and, at h = 0, that it costs nothing. */
export function expandedNote(key: ParentKey, h: number): string {
  return h === 0 ? "with h = 0 there is nothing to multiply out, so both spellings agree" : key === "line" ? "the slope survives, but the point (h, k) the line was built around is buried"
    : key === "cube" ? "the stretch survives, but the center (h, k) the curve turns around is buried" : "the base 2 survives, but the shift h is buried inside the coefficient";
}
/** True exactly when the marked point lands on y = x, where it is its own mirror image. */
export function anchorOnMirror(key: ParentKey, a: number, h: number, k: number): boolean { const p = anchorPoint(key, a, h, k); return p.x === p.y; }
/** What the reflection does to the marked point — two dots, or one dot sitting on the line. */
export function mirrorClaim(key: ParentKey, a: number, h: number, k: number): string {
  const p = anchorPoint(key, a, h, k);
  return p.x === p.y ? `the marked point (${num(p.x)}, ${num(p.y)}) is its own mirror image: it already lies on that dashed line, so g and its inverse agree there`
    : `the marked pair (${num(p.x)}, ${num(p.y)}) and (${num(p.y)}, ${num(p.x)}) sit on opposite sides of that dashed line`;
}
export function keyFeature(key: ParentKey, a: number, h: number, k: number): string {
  return key === "line" ? `a straight line of slope ${num(a)} through (${num(h)}, ${num(k)})`
    : key === "cube" ? `a cubic that flattens out at its center (${num(h)}, ${num(k)})` : `an exponential curve that never reaches its horizontal asymptote y = ${num(k)}`;
}
export function inverseFeature(key: ParentKey, a: number, h: number, k: number): string {
  return key === "line" ? `a straight line of slope ${reciprocalText(a)} through (${num(k)}, ${num(h)})`
    : key === "cube" ? `a cube-root curve, vertical at its center (${num(k)}, ${num(h)})` : `a logarithmic curve that never reaches its vertical asymptote x = ${num(k)}`;
}
export function figureLabel(key: ParentKey, a: number, h: number, k: number): string {
  const anchor = anchorPoint(key, a, h, k);
  const parentLine = key === "line" ? "The parent f(x) = x is the dashed line y = x itself, so that diagonal is drawn only once." : `The parent ${parentInfo(key).formula} is drawn faintly as a second dashed curve.`;
  const markLine = anchor.x === anchor.y ? `The marked point (${num(anchor.x)}, ${num(anchor.y)}) lies on that dashed line, so it is its own mirror image and the two dots sit on the same spot.`
    : `The marked point (${num(anchor.x)}, ${num(anchor.y)}) on g mirrors to (${num(anchor.y)}, ${num(anchor.x)}) on the inverse.`;
  return `Coordinate grid from −${R} to ${R}. ${parentLine} ${gText(key, a, h, k)} is drawn as ${keyFeature(key, a, h, k)}, and its inverse ${gInverseText(key, a, h, k)} is the mirror image across the dashed line y = x. Both are ${a > 0 ? "increasing" : "decreasing"}. ${markLine}`;
}
/** Worked example: cocoa cooling toward room temperature, and the inverse that reads back a time. */
export const ROOM_TEMP = 20, START_TEMP = 80, HALF_LIFE = 10, TARGET_TEMP = 35;
export const START_GAP = START_TEMP - ROOM_TEMP;
export function cocoaTemp(m: number): number { return ROOM_TEMP + START_GAP * Math.pow(0.5, m / HALF_LIFE); }
export function cocoaTime(t: number): number { return HALF_LIFE * Math.log2(START_GAP / (t - ROOM_TEMP)); }
export function workedExample() {
  const checkpoints = [0, 10, 20, 30].map((m) => ({ m, t: cocoaTemp(m), gap: cocoaTemp(m) - ROOM_TEMP })), ratio = START_GAP / (TARGET_TEMP - ROOM_TEMP);
  return { checkpoints, ratio, halvings: Math.log2(ratio), minutes: cocoaTime(TARGET_TEMP), targetGap: TARGET_TEMP - ROOM_TEMP,
    table: checkpoints.slice(1).map((c) => `T(${c.m}) = ${num(c.t)}`).join(", "), gaps: checkpoints.map((c) => num(c.gap)).join(", ") };
}
/** Try it: which expression really undoes g(x) = 2(x − 5)³ + 7? */
export const TRY_A = 2, TRY_H = 5, TRY_K = 7;
export const TRY_INPUTS = [3, 4, 5, 6, 7];
export function tryG(x: number): number { return TRY_A * Math.pow(x - TRY_H, 3) + TRY_K; }
export function tryCandidates(): { text: string; fn: (y: number) => number; why: string }[] {
  return [
    { text: "∛((x − 7)/2) − 5", fn: (y) => Math.cbrt((y - 7) / 2) - 5, why: "undoes the shift the wrong way: the machine subtracted 5 from x, so the undo has to add 5 back" },
    { text: "∛((x − 7)/2) + 5", fn: (y) => Math.cbrt((y - 7) / 2) + 5, why: "correct" },
    { text: "(∛x − 7)/2 + 5", fn: (y) => (Math.cbrt(y) - 7) / 2 + 5, why: "undoes the steps in the original order instead of reversing the order" },
    { text: "2(x − 7)³ + 5", fn: (y) => 2 * Math.pow(y - 7, 3) + 5, why: "repeats the machine's own operations instead of the opposite ones" },
  ];
}
export function tryAnswerIndex(): number { return tryCandidates().findIndex((c) => TRY_INPUTS.every((x) => Math.abs(c.fn(tryG(x)) - x) < 1e-9)); }

export default function Lesson() {
  const [parent, setParent] = useState<ParentKey>("line"), [flip, setFlip] = useState(false);
  const [mag, setMag] = useState(2), [h, setH] = useState(2), [k, setK] = useState(-1);
  const [shown, setShown] = useState(0), [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();
  const a = flip ? -mag : mag, info = parentInfo(parent);
  const gPts = curve(parent, a, h, k), fPts = curve(parent, 1, 0, 0), anchor = anchorPoint(parent, a, h, k);
  const onMirror = anchorOnMirror(parent, a, h, k);
  const cards = [
    { title: "The machine", color: ACCENT, big: gText(parent, a, h, k), small: forwardSteps(parent, a, h, k).join(" → "), faint: keyFeature(parent, a, h, k) },
    { title: "The undo", color: INVERSE, big: gInverseText(parent, a, h, k), small: undoSteps(parent, a, h, k).join(" → "), faint: inverseFeature(parent, a, h, k) },
    { title: "Round trip", color: ACCENT, big: `g(${num(h)}) = ${num(anchor.y)}`, small: `g⁻¹(${num(anchor.y)}) = ${num(h)}`, faint: "the inverse hands back the input the output came from" },
    { title: "One-to-one", color: PARENT_INK, big: a > 0 ? "increasing" : "decreasing", small: "every output comes from exactly one input", faint: "so the mirror image across y = x is a function too" },
    { title: "Multiplied out", color: ACCENT, big: expandedText(parent, a, h, k), small: "the very same rule, collected", faint: expandedNote(parent, h) },
  ];

  const w = workedExample();
  const steps = [
    <>The room stays at {ROOM_TEMP} degrees and the cocoa starts at {START_TEMP}, so the gap between them starts at {START_TEMP} − {ROOM_TEMP} = {START_GAP} degrees, and every {HALF_LIFE} minutes that gap is cut in half.</>,
    <>Build the rule. After m minutes the gap has been halved m/{HALF_LIFE} times, so the gap is {START_GAP}·(1/2)^(m/{HALF_LIFE}) and the temperature is T(m) = {ROOM_TEMP} + {START_GAP}·(1/2)^(m/{HALF_LIFE}). Check the start: T(0) = {ROOM_TEMP} + {START_GAP}·1 = {num(w.checkpoints[0].t)}.</>,
    <>Read it as a transformed parent. From p(x) = (1/2)^x, replacing x by m/{HALF_LIFE} stretches the graph horizontally by a factor of {HALF_LIFE}, multiplying by {START_GAP} stretches it vertically, and adding {ROOM_TEMP} lifts the whole curve — which is what puts the horizontal asymptote at T = {ROOM_TEMP}.</>,
    <>Evaluate by halving the gap each time. The gaps run {w.gaps} degrees, so {w.table}.</>,
    <>Undo it. Subtract {ROOM_TEMP}: T − {ROOM_TEMP} = {START_GAP}·(1/2)^(m/{HALF_LIFE}). Divide by {START_GAP}: (T − {ROOM_TEMP})/{START_GAP} = (1/2)^(m/{HALF_LIFE}). Turn both sides over: {START_GAP}/(T − {ROOM_TEMP}) = 2^(m/{HALF_LIFE}). Take log base 2, then multiply by {HALF_LIFE}: m(T) = {HALF_LIFE}·log₂({START_GAP}/(T − {ROOM_TEMP})) — the same operations as the build, reversed.</>,
    <>Use it. At T = {TARGET_TEMP} the gap is {TARGET_TEMP} − {ROOM_TEMP} = {w.targetGap}, and {START_GAP}/{w.targetGap} = {num(w.ratio)}, so the gap has been halved log₂ {num(w.ratio)} = {num(w.halvings)} times, because 2 to the power {num(w.halvings)} is {num(w.ratio)}. That gives m = {HALF_LIFE} × {num(w.halvings)} = {num(w.minutes)} minutes, matching step 4. The inverse accepts exactly the temperatures T produces — above {ROOM_TEMP} degrees and at most {START_TEMP} — because an inverse swaps the input set with the output set.</>,
  ];

  const choices = tryCandidates(), answer = tryAnswerIndex(), probe = TRY_INPUTS[3];
  const trySentence = `g subtracts ${TRY_H}, cubes, multiplies by ${TRY_A}, then adds ${TRY_K}. Reversing that order and reversing each step gives subtract ${TRY_K}, divide by ${TRY_A}, take the cube root, add ${TRY_H}. Test it at x = ${probe}: g(${probe}) = ${num(tryG(probe))}, and ${choices[answer].text} sends ${num(tryG(probe))} back to ${num(choices[answer].fn(tryG(probe)))}.`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A ride-share app turns a distance into a fare. A rider with twelve dollars in their account asks that same app the opposite question: how far can I go? A biologist writes a
        rule for how a culture grows over days, then needs the day it will reach a target count. Each of those second questions runs a function <em>backwards</em>, and you cannot
        run a function backwards until you know exactly what it does forwards.
      </p>
      <p>
        That is this chapter in one picture. Almost every function you meet this year is a plain parent function that has been slid sideways, stretched, flipped and lifted — a few
        operations applied in a fixed order. Its inverse undoes those same operations in the opposite order, and on a graph that undoing looks like a single mirror flip across the
        line y = x. Change the parent and the transformations below, and watch both directions move.
      </p>

      <Figure caption={`${parent === "line" ? "The dashed diagonal is both the parent f(x) = x and the mirror line y = x, so it is drawn once." : "The faint dashed curve is the parent."} The solid curve is the transformed function, and its mirror image across y = x is the inverse. The two dots are one input-output pair seen from both sides${onMirror ? ", and here they merge into one dot because the marked point lands on y = x" : ""}.`}>
        <div className="flex flex-col items-center gap-5">
          <div className="flex max-w-full flex-wrap justify-center gap-2">
            {PARENTS.map((p) => (
              <button key={p.key} type="button" onClick={() => setParent(p.key)} aria-pressed={parent === p.key} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={parent === p.key ? { background: PARENT_INK, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{p.formula}</button>
            ))}
          </div>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto h-auto max-w-full" style={{ maxHeight: 340 }} role="img" aria-label={figureLabel(parent, a, h, k)}>
            {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((v) => (
              <g key={v} stroke="var(--line)" strokeWidth={1}><line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} /><line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} /></g>
            ))}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(-R)} y1={sy(-R)} x2={sx(R)} y2={sy(R)} stroke="var(--ink-faint)" strokeWidth={1.5} strokeDasharray="5 4" />
            {parent !== "line" && <polyline points={polyline(fPts, false)} fill="none" stroke={PARENT_INK} strokeWidth={2} strokeDasharray="4 4" opacity={0.75} />}
            <polyline points={polyline(gPts, true)} fill="none" stroke={INVERSE} strokeWidth={3} strokeLinecap="round" />
            <polyline points={polyline(gPts, false)} fill="none" stroke={ACCENT} strokeWidth={3} strokeLinecap="round" />
            {!onMirror && <line x1={sx(anchor.x)} y1={sy(anchor.y)} x2={sx(anchor.y)} y2={sy(anchor.x)} stroke="var(--ink-faint)" strokeWidth={1.5} strokeDasharray="3 3" />}
            {!onMirror && <circle cx={sx(anchor.y)} cy={sy(anchor.x)} r={6} fill={INVERSE} stroke="white" strokeWidth={2} />}
            <circle cx={sx(anchor.x)} cy={sy(anchor.y)} r={6} fill={ACCENT} stroke={onMirror ? INVERSE : "white"} strokeWidth={2} />
          </svg>
          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 text-center sm:grid-cols-2">
            {cards.map((c) => (
              <div key={c.title} className="rounded-xl border-2 px-4 py-3" style={{ borderColor: c.color }}>
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: c.color }}>{c.title}</div>
                <div className="font-mono text-base font-black">{c.big}</div>
                <div className="font-mono text-xs text-[var(--ink-soft)]">{c.small}</div><div className="mt-0.5 text-xs text-[var(--ink-faint)]">{c.faint}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <button type="button" onClick={() => setFlip((v) => !v)} aria-pressed={flip} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={flip ? { background: ACCENT, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>Reflect: make a negative</button>
            <Stepper label="Stretch |a|" value={mag} min={1} max={3} onChange={setMag} />
            <Stepper label="Shift h" value={h} min={-3} max={3} onChange={setH} />
            <Stepper label="Lift k" value={k} min={-3} max={3} onChange={setK} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: reading a time off a cooling curve</h2>
      <p>
        A thermos of cocoa is poured at {START_TEMP} degrees into a room held at {ROOM_TEMP} degrees, and measurements show the gap between the cocoa and the room halving
        every {HALF_LIFE} minutes. Write the temperature as a function of time, say which transformations of a parent exponential it uses, then invert it to answer the reverse
        question: when is the cocoa at {TARGET_TEMP} degrees?
      </p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, shown).map((body, i) => (
            <li key={i} className="flex gap-3 text-[15px]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span><span>{body}</span>
            </li>
          ))}
        </ol>
        {shown === 0 && <p className="m-0 text-sm text-[var(--ink-faint)]">Press &ldquo;Next step&rdquo; to watch the solution unfold.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={shown > 0} aria-controls={stepsId} disabled={shown >= steps.length} onClick={() => setShown((n) => Math.min(steps.length, n + 1))} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next step</button>
          <button type="button" disabled={shown === 0} onClick={() => setShown(0)} className="rounded-lg border border-[var(--line)] px-4 py-1.5 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>A machine is built from the parent x³ like this: g(x) = {TRY_A}(x − {TRY_H})³ + {TRY_K}. Which expression is g⁻¹(x)?</p>
      <div className="flex flex-wrap gap-2">
        {choices.map((c, i) => (
          <button key={c.text} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={picked === i ? { background: i === answer ? INVERSE : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{c.text}</button>
        ))}
      </div>
      {picked !== null && (
        <p className="mt-3 text-[15px]">{picked === answer ? `Right. ${trySentence}` : `Not quite: ${choices[picked].text} ${choices[picked].why}. ${trySentence}`}</p>
      )}

      <h2>Where this chapter goes</h2>
      <p>
        <strong>Transforming Parabolas: Vertex Form</strong>{" "}takes the same dials — stretch, shift, lift — and fixes the parent at x², where the shift and the lift land the
        vertex exactly at (h, k). It is also the cautionary case for this opener: a parabola fails the one-to-one test, so it has no inverse until you cut its domain in half.{" "}
        <strong>Building Sequences</strong>{" "}builds functions a different way, from a starting value and a repeated step, and matches each recursive rule with an explicit
        formula for the nth term. <strong>Inverse Functions</strong>{" "}slows down the mirror flip you just used, works through the swap-and-solve method on its own, and gives the
        exponential and logarithm pair the attention it deserves.
      </p>

      <MathCheck>
        <p>
          Replacing x by (x − h) slides a graph h to the right, multiplying the output by a stretches it vertically by |a| and reflects it when a is negative, and adding k lifts it
          by k, so {gText(parent, a, h, k)} is the parent {info.formula} redrawn as {keyFeature(parent, a, h, k)} (F-BF.3, F-IF.7). Because |a| is never 0 and each parent here is
          one-to-one, g is strictly {a > 0 ? "increasing" : "decreasing"} and every output traces back to a single input, so its inverse is a function too (F-BF.4). Finding it is
          bookkeeping: reverse the order of the steps and replace each step by its opposite, turning {forwardSteps(parent, a, h, k).join(", ")} into {undoSteps(parent, a, h,
          k).join(", ")} — which is exactly {gInverseText(parent, a, h, k)}. Swapping input with output is the same as reflecting across the line y = x, which is why{" "}
          {mirrorClaim(parent, a, h, k)}. When the parent is 2^x the undo step is a logarithm, because log₂ is defined as the exponent you need: log₂(2^t) = t and
          2^(log₂ v) = v for every positive v (F-BF.5). Keeping the transformed spelling is what makes that bookkeeping possible: {gText(parent, a, h, k)} names the parent and
          every move made to it, while the same rule multiplied out is {expandedText(parent, a, h, k)} — {expandedNote(parent, h)} (F-IF.8). The cooling model above was
          assembled the same way: name what changes, describe how it changes, and only then write the rule (F-BF.1).
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
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button><span className="w-9 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
