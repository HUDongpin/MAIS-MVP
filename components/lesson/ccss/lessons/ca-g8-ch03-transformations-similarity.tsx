"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { pickSpot, textBox, type LabelBox } from "@/components/lesson/ccss/labelSpacing";

const ACCENT = "var(--band-middle)";
const IMAGE = "var(--band-upper)";
const MISS = "var(--band-early)";

/* ---------- pure helpers (exported so the test can drive every reachable state) ---------- */

export type Pt = readonly [number, number];
export type Tri = readonly [Pt, Pt, Pt];

export const TRI: Tri = [[1, 1], [5, 1], [1, 4]];
export const NAMES = ["A", "B", "C"] as const;
export const SIDE_NAMES = ["A′B′", "A′C′", "B′C′"] as const;
export const K_CHOICES = [0.5, 1, 2] as const;
export const SLIDE = { min: -3, max: 3 } as const;
export const GRID = 13, CELL = 12, PAD_LEFT = 30, PAD_TOP = 14, PAD_RIGHT = 14, PAD_BOTTOM = 26;
export const SVG_W = PAD_LEFT + 2 * GRID * CELL + PAD_RIGHT;
export const SVG_H = PAD_TOP + 2 * GRID * CELL + PAD_BOTTOM;
export const TICK_Y = SVG_H - 8, TICK_STEP = 4;
export const sx = (x: number) => PAD_LEFT + (x + GRID) * CELL;
export const sy = (y: number) => PAD_TOP + (GRID - y) * CELL;

export type Motion = { key: string; name: string; phrase: string; reverses: boolean; m: readonly [number, number, number, number] };
/** Each rigid motion is the matrix [a b; c d] acting on (x, y); every row has exactly one non-zero entry. */
export const MOTIONS: readonly Motion[] = [
  { key: "id", name: "No flip or turn", phrase: "no flip or turn", reverses: false, m: [1, 0, 0, 1] },
  { key: "rx", name: "Reflect over x-axis", phrase: "a reflection over the x-axis", reverses: true, m: [1, 0, 0, -1] },
  { key: "ry", name: "Reflect over y-axis", phrase: "a reflection over the y-axis", reverses: true, m: [-1, 0, 0, 1] },
  { key: "r90", name: "Rotate 90° counterclockwise", phrase: "a 90 degree counterclockwise turn about the origin", reverses: false, m: [0, -1, 1, 0] },
  { key: "r180", name: "Rotate 180°", phrase: "a 180 degree turn about the origin", reverses: false, m: [-1, 0, 0, -1] },
];

/** Print a number with a true minus sign and no rounding: 0.25 prints as 0.25, not 0.3. */
export function fmt(v: number) { return `${v < 0 ? "−" : ""}${Number(Math.abs(v).toFixed(2))}`; }
export function transform(p: Pt, k: number, motion: number, dx: number, dy: number): Pt {
  const [a, b, c, d] = MOTIONS[motion].m, x = k * p[0], y = k * p[1];
  return [a * x + b * y + dx, c * x + d * y + dy];
}
export function mapTri(t: Tri, f: (p: Pt) => Pt): Tri { return [f(t[0]), f(t[1]), f(t[2])]; }
export function imageTri(k: number, motion: number, dx: number, dy: number): Tri { return mapTri(TRI, (p) => transform(p, k, motion, dx, dy)); }
export function dist(p: Pt, q: Pt) { return Math.sqrt((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2); }
export function sides(t: Tri): [number, number, number] { return [dist(t[0], t[1]), dist(t[0], t[2]), dist(t[1], t[2])]; }
export function angleAt(v: Pt, p: Pt, q: Pt) {
  const ux = p[0] - v[0], uy = p[1] - v[1], wx = q[0] - v[0], wy = q[1] - v[1];
  const cos = (ux * wx + uy * wy) / (Math.sqrt(ux * ux + uy * uy) * Math.sqrt(wx * wx + wy * wy));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}
export function angles(t: Tri): [number, number, number] { return [angleAt(t[0], t[1], t[2]), angleAt(t[1], t[0], t[2]), angleAt(t[2], t[0], t[1])]; }
/** Positive when the vertices run counterclockwise; reflections flip the sign. */
export function signedArea(t: Tri) { return ((t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (t[1][1] - t[0][1])) / 2; }
export function polyPoints(t: Tri) { return t.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" "); }
/** Image vertex tags are pushed back toward the middle of the grid so they never leave the viewBox. */
export function labelSpot([x, y]: Pt, reach = 8) { return { x: sx(x) + (x >= 0 ? -reach : reach), y: sy(y) + (y >= 0 ? reach + 9 : -(reach + 1)), anchor: (x >= 0 ? "end" : "start") as "end" | "start" }; }

/** Type sizes for the vertex names: A B C on the pre-image, A′ B′ C′ on the image. */
export const VERTEX_SIZE = 11, PRE_LABEL_W = 9, IMAGE_LABEL_W = 14;
type Spot = { x: number; y: number; anchor: "start" | "end" };
const boxOf = (s: Spot, w: number) => textBox(s.x, s.y, w, { anchor: s.anchor, fontSize: VERTEX_SIZE });

/** Where A, B and C sit — fixed, because the pre-image triangle never moves. */
export function preLabelSpot(i: number): Spot {
  const [x, y] = TRI[i];
  return { x: sx(x) + (i === 1 ? 8 : -8), y: sy(y) + (i === 2 ? -8 : 15), anchor: i === 1 ? "start" : "end" };
}

/** The corners around an image vertex: its own, then across, then above or below, then two further out. */
export function imageLabelChoices([x, y]: Pt) {
  const near = labelSpot([x, y]), far = labelSpot([x, y], 17);
  const flip = (s: Spot, dx: number, dy: number): Spot => ({ x: s.x + dx, y: s.y + dy, anchor: dx === 0 ? s.anchor : s.anchor === "end" ? "start" : "end" });
  const spots: Spot[] = [near, flip(near, x >= 0 ? 16 : -16, 0), flip(near, 0, y >= 0 ? -26 : 26), far, flip(far, x >= 0 ? 34 : -34, 0)];
  return spots.map((spot) => ({ ...spot, box: boxOf(spot, IMAGE_LABEL_W) }));
}

/**
 * Where A′, B′ and C′ go. The image may land on the pre-image — that is what the
 * identity looks like, and it is the first state a student sees — and then six
 * names compete for three points. Each image name takes the first corner that
 * clears the three fixed pre-image names and the image names already placed.
 */
export function imageLabelSpots(img: Tri) {
  const bounds: LabelBox = { x0: 0, y0: 0, x1: SVG_W, y1: SVG_H };
  const taken: LabelBox[] = [0, 1, 2].map((i) => boxOf(preLabelSpot(i), PRE_LABEL_W));
  return img.map((pt) => {
    const chosen = pickSpot(imageLabelChoices(pt), taken, { gap: 2, bounds });
    taken.push(chosen.box);
    return chosen;
  });
}
export function term(coef: number, variable: "x" | "y") { return `${coef < 0 ? "−" : ""}${Math.abs(coef) === 1 ? "" : fmt(Math.abs(coef))}${variable}`; }
export function offset(d: number) { return d === 0 ? "" : d > 0 ? ` + ${d}` : ` − ${-d}`; }
export function ruleText(k: number, motion: number, dx: number, dy: number) {
  const [a, b, c, d] = MOTIONS[motion].m;
  const first = a !== 0 ? term(k * a, "x") : term(k * b, "y"), second = c !== 0 ? term(k * c, "x") : term(k * d, "y");
  return `(x, y) → (${first}${offset(dx)}, ${second}${offset(dy)})`;
}
export function scalePhrase(k: number) { return k === 1 ? "no resizing" : `a dilation by ${fmt(k)} about the origin`; }
export function slidePhrase(dx: number, dy: number) {
  const units = (n: number) => `${Math.abs(n)} ${Math.abs(n) === 1 ? "unit" : "units"}`;
  const parts = [dx === 0 ? null : `${units(dx)} ${dx > 0 ? "right" : "left"}`, dy === 0 ? null : `${units(dy)} ${dy > 0 ? "up" : "down"}`].filter(Boolean);
  return parts.length === 0 ? "no slide" : `a slide of ${parts.join(" and ")}`;
}
export function figureLabel(k: number, motion: number, dx: number, dy: number) {
  const pts = imageTri(k, motion, dx, dy).map((p) => `(${fmt(p[0])}, ${fmt(p[1])})`).join(", "), size = k === 1 ? "the same size" : `${fmt(k)} times as long on every side`;
  return `Coordinate grid from ${fmt(-GRID)} to ${GRID}. Triangle A B C has vertices (1, 1), (5, 1), (1, 4). Its image has vertices ${pts} after ${scalePhrase(k)}, then ${MOTIONS[motion].phrase}, then ${slidePhrase(dx, dy)}. The image has the same three angle measures as triangle A B C and is ${size}.`;
}
/** The three rows of the side-length card: name, scale factor, base length, image length. */
export function sideRows(k: number, img: Tri) {
  const base = sides(TRI), scaled = sides(img);
  return SIDE_NAMES.map((name, i) => `${name} = ${fmt(k)} × ${fmt(base[i])} = ${fmt(scaled[i])}`);
}
export function areaSentence(k: number, img: Tri) { return `Area ${fmt(Math.abs(signedArea(TRI)))} → ${fmt(Math.abs(signedArea(img)))} square units, a factor of ${fmt(k)}² = ${fmt(k * k)}.`; }
export function verdict(k: number) {
  if (k === 1) return { headline: "Congruent", detail: "Flips, turns, and slides are rigid motions: they change no length and no angle, so the image can be carried right back onto triangle ABC." };
  return { headline: "Similar, not congruent", detail: `The dilation multiplies every length by ${fmt(k)} and the area by ${fmt(k)}² = ${fmt(k * k)}, but leaves every angle exactly as it was — same shape, different size.` };
}

export const EX_START: Tri = [[1, 1], [3, 1], [1, 2]];
export const EX_K = 3, EX_DX = 5, EX_DY = -2;
export function workedExample() {
  const dilated = mapTri(EX_START, ([x, y]) => [x * EX_K, y * EX_K]);
  const turned = mapTri(dilated, ([x, y]) => [-y, x]);
  const target = mapTri(turned, ([x, y]) => [x + EX_DX, y + EX_DY]);
  const sideStart = dist(EX_START[0], EX_START[1]), sideTarget = dist(target[0], target[1]);
  return { dilated, turned, target, sideStart, sideTarget, ratio: sideTarget / sideStart, areaStart: Math.abs(signedArea(EX_START)), areaTarget: Math.abs(signedArea(target)) };
}

export const TRY_POINT: Pt = [6, -2], TRY_K = 0.5;
export function tryItOptions() {
  const half = ([x, y]: Pt): Pt => [x * TRY_K, y * TRY_K], twice = ([x, y]: Pt): Pt => [x * 2, y * 2];
  const turn180 = ([x, y]: Pt): Pt => [-x, -y], turn90 = ([x, y]: Pt): Pt => [-y, x];
  const right = half(turn180(TRY_POINT)), spot = (p: Pt) => `(${fmt(p[0])}, ${fmt(p[1])})`;
  const raw: { pt: Pt; why: string }[] = [
    { pt: right, why: `The 180° turn changes both signs, ${spot(TRY_POINT)} → ${spot(turn180(TRY_POINT))}, and the dilation halves both coordinates, giving ${spot(right)}.` },
    { pt: half(TRY_POINT), why: `${spot(half(TRY_POINT))} halves the coordinates but skips the turn. Turn first: ${spot(turn180(TRY_POINT))}, then halve, and you land on ${spot(right)}.` },
    { pt: twice(turn180(TRY_POINT)), why: `Doubling instead of halving gives that point. A scale factor of ${TRY_K} shrinks: ${spot(turn180(TRY_POINT))} becomes ${spot(right)}.` },
    { pt: half(turn90(TRY_POINT)), why: `That is the quarter turn: swapping the coordinates and changing the sign of the new first coordinate sends ${spot(TRY_POINT)} → ${spot(turn90(TRY_POINT))}, and halving gives ${spot(half(turn90(TRY_POINT)))}. The 180° turn changes both signs instead, so the answer is ${spot(right)}.` },
  ];
  const options = raw.map((o) => ({ ...o, label: spot(o.pt) }));
  return { options, correct: options.findIndex((o) => o.pt[0] === right[0] && o.pt[1] === right[1]) };
}

export const ANGLE_GIVENS = [40, 75] as const, ANGLE_K = 2;
export function thirdAngleOptions() {
  const [first, second] = ANGLE_GIVENS, third = 180 - first - second;
  const raw = [
    { deg: first + second, why: `${first}° + ${second}° is what the two known angles use up. What is left for the third is 180° − ${first + second}° = ${third}°.` },
    { deg: third * ANGLE_K, why: `The dilation multiplies lengths by ${ANGLE_K}, never angle measures. The third angle stays 180° − ${first}° − ${second}° = ${third}°.` },
    { deg: third, why: `The three angles of PQR sum to 180°, so ∠R = 180° − ${first}° − ${second}° = ${third}°, and neither the dilation nor the turn changes an angle measure.` },
    { deg: 180 - second, why: `180° − ${second}° = ${180 - second}° forgets ∠P. Take away both known angles: 180° − ${first}° − ${second}° = ${third}°.` },
  ];
  const options = raw.map((o) => ({ ...o, label: `${o.deg}°` }));
  return { third, options, correct: options.findIndex((o) => o.deg === third) };
}

export default function Lesson() {
  const [k, setK] = useState<number>(2), [motion, setMotion] = useState(1);
  const [dx, setDx] = useState(2), [dy, setDy] = useState(1);
  const [shown, setShown] = useState(0), [pick, setPick] = useState<number | null>(null), [anglePick, setAnglePick] = useState<number | null>(null);
  const stepsId = useId();

  const img = imageTri(k, motion, dx, dy);
  const imgLabels = imageLabelSpots(img);
  const angs = angles(img), v = verdict(k);
  const ex = workedExample(), tryIt = tryItOptions(), angleIt = thirdAngleOptions();

  const steps = [
    { title: "Match one pair of sides", math: `${fmt(ex.sideTarget)} ÷ ${fmt(ex.sideStart)} = ${fmt(ex.ratio)}`, note: `DE runs from (1, 1) to (3, 1), so it is ${fmt(ex.sideStart)} units long, and the matching side D′E′ is ${fmt(ex.sideTarget)} units long. If one dilation is doing the resizing, its scale factor must be ${fmt(ex.ratio)}.` },
    { title: "Dilate about the origin", math: `(x, y) → (${EX_K}x, ${EX_K}y)`, note: `D, E, F land on (${fmt(ex.dilated[0][0])}, ${fmt(ex.dilated[0][1])}), (${fmt(ex.dilated[1][0])}, ${fmt(ex.dilated[1][1])}), and (${fmt(ex.dilated[2][0])}, ${fmt(ex.dilated[2][1])}). Every side is now ${fmt(ex.ratio)} times as long, so the sizes already match — only the placement is wrong.` },
    { title: "Turn it", math: "(x, y) → (−y, x)", note: `In the target, D′E′ points straight up, while the dilated side still points right. A quarter turn counterclockwise about the origin sends the three points to (${fmt(ex.turned[0][0])}, ${fmt(ex.turned[0][1])}), (${fmt(ex.turned[1][0])}, ${fmt(ex.turned[1][1])}), and (${fmt(ex.turned[2][0])}, ${fmt(ex.turned[2][1])}).` },
    { title: "Slide it home", math: `(x, y) → (x + ${EX_DX}, y − ${-EX_DY})`, note: `(${fmt(ex.turned[0][0])}, ${fmt(ex.turned[0][1])}) has to reach D′(${fmt(ex.target[0][0])}, ${fmt(ex.target[0][1])}), which is ${EX_DX} right and ${-EX_DY} down. The same slide sends the other two vertices to (${fmt(ex.target[1][0])}, ${fmt(ex.target[1][1])}) and (${fmt(ex.target[2][0])}, ${fmt(ex.target[2][1])}) — exactly E′ and F′.` },
    { title: "Say what the sequence proves", math: `area ${fmt(ex.areaStart)} → ${fmt(ex.areaTarget)} = ${EX_K}² × ${fmt(ex.areaStart)}`, note: `One dilation followed by rigid motions carries DEF onto D′E′F′, so the two triangles are similar with ratio ${fmt(ex.ratio)}: equal angles, sides ${fmt(ex.ratio)} times as long, and an area ${EX_K}² = ${fmt(ex.ratio * ex.ratio)} times as big.` },
  ];

  return (
    <div className="prose-lesson max-w-none">
      <p>Slide a sticker across a locker door, flip it over, spin it a quarter turn — it is the same sticker every time. Pinch a photo on a phone and it grows, but nobody in it gets stretched wide. This chapter is about those two different kinds of change: the moves that leave a figure exactly as it was, and the resizing that keeps its shape while changing its size.</p>
      <p>On a coordinate grid both kinds become arithmetic you can do to the coordinates. A slide adds, a flip changes a sign, a quarter turn swaps the coordinates and changes a sign, and a dilation multiplies. Two figures are <strong>congruent</strong>{" "}when some sequence of slides, flips, and turns carries one exactly onto the other; they are <strong>similar</strong>{" "}when the sequence is also allowed one dilation.</p>

      <Figure caption="Choose a scale factor, a flip or turn, and a slide. Every readout below the grid is computed from the coordinates of the image.">
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-wrap justify-center gap-2">
            {MOTIONS.map((mo, i) => <button key={mo.key} type="button" onClick={() => setMotion(i)} aria-pressed={motion === i} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={motion === i ? { background: IMAGE, color: "white", borderColor: IMAGE } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{mo.name}</button>)}
          </div>

          <svg className="mx-auto h-auto max-w-full" width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} role="img" aria-label={figureLabel(k, motion, dx, dy)}>
            {Array.from({ length: 2 * GRID + 1 }, (_, i) => i - GRID).map((t) => (
              <g key={t}>
                <line x1={sx(t)} y1={sy(GRID)} x2={sx(t)} y2={sy(-GRID)} stroke="var(--line)" strokeWidth={1} /><line x1={sx(-GRID)} y1={sy(t)} x2={sx(GRID)} y2={sy(t)} stroke="var(--line)" strokeWidth={1} />
                {t % TICK_STEP === 0 ? <text x={sx(t)} y={TICK_Y} textAnchor="middle" fontSize={9} fill="var(--ink-faint)">{fmt(t)}</text> : null}
                {t % TICK_STEP === 0 ? <text x={PAD_LEFT - 7} y={sy(t) + 3} textAnchor="end" fontSize={9} fill="var(--ink-faint)">{fmt(t)}</text> : null}
              </g>
            ))}
            <line x1={sx(-GRID)} y1={sy(0)} x2={sx(GRID)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={1.6} />
            <line x1={sx(0)} y1={sy(GRID)} x2={sx(0)} y2={sy(-GRID)} stroke="var(--ink-soft)" strokeWidth={1.6} />
            <polygon points={polyPoints(TRI)} fill={ACCENT} fillOpacity={0.18} stroke={ACCENT} strokeWidth={2} strokeDasharray="5 4" />
            <polygon points={polyPoints(img)} fill={IMAGE} fillOpacity={0.45} stroke={IMAGE} strokeWidth={2.5} />
            {TRI.map((p, i) => <g key={NAMES[i]}><circle cx={sx(p[0])} cy={sy(p[1])} r={4} fill={ACCENT} /><text x={preLabelSpot(i).x} y={preLabelSpot(i).y} textAnchor={preLabelSpot(i).anchor} fontSize={VERTEX_SIZE} fontWeight={800} fill={ACCENT}>{NAMES[i]}</text></g>)}
            {img.map((p, i) => <g key={`${NAMES[i]}-image`}><circle cx={sx(p[0])} cy={sy(p[1])} r={4.5} fill={IMAGE} stroke="white" strokeWidth={1.5} /><text x={imgLabels[i].x} y={imgLabels[i].y} textAnchor={imgLabels[i].anchor} fontSize={VERTEX_SIZE} fontWeight={800} fill={IMAGE}>{NAMES[i]}&#8242;</text></g>)}
          </svg>

          <div className="w-full max-w-xl rounded-2xl border-2 px-5 py-3 text-center" style={{ borderColor: IMAGE }}>
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">One rule for the whole sequence</div>
            <div className="mt-1 font-mono text-xl font-black" style={{ color: IMAGE }}>{ruleText(k, motion, dx, dy)}</div>
            <div className="mt-1 font-mono text-[13px] text-[var(--ink-soft)]">{TRI.map((p, i) => `${NAMES[i]}(${fmt(p[0])}, ${fmt(p[1])}) → ${NAMES[i]}′(${fmt(img[i][0])}, ${fmt(img[i][1])})`).join("  ·  ")}</div>
          </div>

          <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Side lengths</div>
              {sideRows(k, img).map((row) => <div key={row} className="font-mono text-sm font-bold">{row}</div>)}
              <div className="mt-1 text-sm text-[var(--ink-soft)]">{areaSentence(k, img)}</div>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Angle measures</div>
              <div className="font-mono text-sm font-bold">{angs.map((a, i) => `∠${NAMES[i]}′ = ${a.toFixed(1)}°`).join("  ·  ")}</div>
              <div className="font-mono text-sm">{angs.map((a) => a.toFixed(1)).join(" + ")} = {(angs[0] + angs[1] + angs[2]).toFixed(1)}°</div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">{MOTIONS[motion].reverses ? "The reflection reversed the orientation: ABC runs counterclockwise, A′B′C′ runs clockwise. Angle measures are unchanged." : "ABC and A′B′C′ both run counterclockwise, with matching angles equal."}</div>
            </div>
          </div>

          <div className="w-full max-w-xl rounded-xl px-4 py-3 text-center" style={{ background: "color-mix(in oklab, var(--band-upper) 10%, var(--surface))" }}>
            <div className="text-lg font-black" style={{ color: IMAGE }}>{v.headline}</div>
            <div className="text-sm text-[var(--ink-soft)]">{v.detail}</div>
          </div>

          <div className="flex flex-wrap items-end justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Scale factor k</span>
              <div className="flex items-center gap-2">{K_CHOICES.map((choice) => <button key={choice} type="button" onClick={() => setK(choice)} aria-pressed={k === choice} className="grid h-9 w-14 place-items-center rounded-lg border text-base font-black" style={k === choice ? { background: IMAGE, color: "white", borderColor: IMAGE } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{fmt(choice)}&#215;</button>)}</div>
            </div>
            <Stepper label="Horizontal slide" value={dx} min={-3} max={3} onChange={setDx} />
            <Stepper label="Vertical slide" value={dy} min={-3} max={3} onChange={setDy} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: proving two triangles are similar</h2>
      <p>Triangle DEF has vertices D(1, 1), E(3, 1), F(1, 2). Triangle D&#8242;E&#8242;F&#8242; has vertices ({fmt(ex.target[0][0])}, {fmt(ex.target[0][1])}), ({fmt(ex.target[1][0])}, {fmt(ex.target[1][1])}), ({fmt(ex.target[2][0])}, {fmt(ex.target[2][1])}). Similar figures need a sequence that carries one exactly onto the other, so build one, one move at a time.</p>
      <div className="card my-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShown((s) => Math.min(steps.length, s + 1))} disabled={shown >= steps.length} aria-expanded={shown > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>{shown === 0 ? "Show the first step" : shown < steps.length ? "Next step" : "All steps shown"}</button>
          <button type="button" onClick={() => setShown(0)} disabled={shown === 0} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
          <span className="text-sm text-[var(--ink-faint)]">{shown} of {steps.length} steps</span>
        </div>
        <ol id={stepsId} className="mt-3 flex list-none flex-col gap-2 p-0">
          {steps.slice(0, shown).map((step, i) => (
            <li key={step.title} className="rounded-xl bg-[var(--surface-2)] px-4 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Step {i + 1}: {step.title}</div>
              <div className="font-mono text-lg font-black">{step.math}</div><div className="text-sm text-[var(--ink-soft)]">{step.note}</div>
            </li>
          ))}
        </ol>
      </div>

      <h2>Try it</h2>
      <p>The point M({fmt(TRY_POINT[0])}, {fmt(TRY_POINT[1])}) is rotated 180&#176; about the origin and then dilated by {TRY_K} about the origin. Where does it land?</p>
      <div className="flex flex-wrap gap-2">
        {tryIt.options.map((o, i) => <button key={o.label} type="button" onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={pick === i ? { background: i === tryIt.correct ? IMAGE : MISS, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o.label}</button>)}
      </div>
      <p aria-live="polite" className="mt-3 text-sm">{pick === null ? "Pick the image of M." : pick === tryIt.correct ? `Correct. ${tryIt.options[pick].why}` : `Not quite. ${tryIt.options[pick].why}`}</p>
      <p className="mt-5">Now use an angle fact. In triangle PQR, &#8736;P = {ANGLE_GIVENS[0]}&#176; and &#8736;Q = {ANGLE_GIVENS[1]}&#176;. Triangle P&#8242;Q&#8242;R&#8242; is the image of PQR after a dilation by {ANGLE_K} about the origin followed by a 90&#176; turn. How big is &#8736;R&#8242;?</p>
      <div className="flex flex-wrap gap-2">
        {angleIt.options.map((o, i) => <button key={o.label} type="button" onClick={() => setAnglePick(i)} aria-pressed={anglePick === i} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={anglePick === i ? { background: i === angleIt.correct ? IMAGE : MISS, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o.label}</button>)}
      </div>
      <p aria-live="polite" className="mt-3 text-sm">{anglePick === null ? "Pick the measure of angle R prime." : anglePick === angleIt.correct ? `Correct. ${angleIt.options[anglePick].why}` : `Not quite. ${angleIt.options[anglePick].why}`}</p>

      <h2>Where this chapter goes</h2>
      <p><strong>Transformations</strong>{" "}takes the three rigid motions one at a time and pins down the coordinate rule for each, so you can predict an image without drawing it. <strong>Congruence</strong>{" "}turns those moves into an argument: naming a sequence that lands one figure on another is what proves the two are congruent. <strong>Similarity &amp; Dilation</strong>{" "}is the resizing move on its own — centers, scale factors, and what happens to lengths, angles, and area. <strong>Triangle Angles</strong>{" "}then builds on the angle sum you just used, and adds the equal angles that parallel lines cut by a transversal hand you.</p>

      <MathCheck>
        <p>Rotations, reflections, and translations send segments to segments of the same length and angles to angles of the same measure (8.G.A.1) — that is why the readout above never changes an angle and, at k = 1, never changes a length. (Those same motions take parallel lines to parallel lines, a property this figure does not draw; the Transformations lesson makes it visible.) Two figures are <strong>congruent</strong>{" "}exactly when some sequence of those rigid motions carries one onto the other (8.G.A.2). Each move has a coordinate rule, and composing the rules gives the single rule shown in the figure, {ruleText(k, motion, dx, dy)} (8.G.A.3). Adding a <strong>dilation</strong>{" "}of scale factor k about the origin multiplies every coordinate, and therefore every length, by k while every angle stays put; a figure reachable this way is <strong>similar</strong>{" "}(8.G.A.4). The three angles of any triangle sum to 180&#176;, and because the moves leave every angle alone, the missing angle of an image is the missing angle of the original: {ANGLE_GIVENS[0]}&#176; and {ANGLE_GIVENS[1]}&#176; force the third to be 180&#176; &#8722; {ANGLE_GIVENS[0]}&#176; &#8722; {ANGLE_GIVENS[1]}&#176; = {angleIt.third}&#176; in both triangles, which is also why two pairs of equal angles are enough to call two triangles similar (8.G.A.5).</p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>&#8722;</button>
        <span className="w-8 text-center text-2xl font-black tabular-nums">{fmt(value)}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
