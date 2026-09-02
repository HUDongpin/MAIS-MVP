"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const PRE = "var(--band-middle)";
const MARK = "var(--band-upper)";

export type Pt = { x: number; y: number };
export type Tri = { a: Pt; b: Pt; c: Pt };
export type Motion = { id: string; short: string; name: string; rule: string; apply: (p: Pt) => Pt; fixed: string };
export type Label = { text: string; x: number; y: number; anchor: "start" | "middle" | "end"; image: boolean };

/** Grid: R units each way from the origin, CELL pixels per unit, PAD pixels of margin. */
export const R = 6, CELL = 22, PAD = 22;
export const SIZE = 2 * R * CELL + 2 * PAD;
/** Triangle ABC starts at A and turns the right angle at B; the two legs are the steppers. */
export const START: Pt = { x: -5, y: -5 };
export const LEG_MIN = 2, LEG_MAX = 5;
/** Label geometry: a bold glyph at font size 11 is about 7px wide. */
export const FONT = 11, GLYPH = 7;

export const sx = (x: number) => PAD + (x + R) * CELL;
export const sy = (y: number) => SIZE - PAD - (y + R) * CELL;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A true minus sign on negatives, so every readout and the aria-label agree. */
export function num(n: number): string { return n < 0 ? `−${Math.abs(n)}` : String(n); }
export function point(p: Pt): string { return `(${num(p.x)}, ${num(p.y)})`; }
export function dist2(p: Pt, q: Pt): number { return (q.x - p.x) ** 2 + (q.y - p.y) ** 2; }
/** An exact length: the integer when the square is perfect, otherwise a radical. */
export function lengthText(d2: number): string { const root = Math.sqrt(d2); return Number.isInteger(root) ? String(root) : `√${d2}`; }
/** Twice the signed area; positive exactly when A → B → C runs counterclockwise. */
export function signedArea2(t: Tri): number { return (t.b.x - t.a.x) * (t.c.y - t.a.y) - (t.c.x - t.a.x) * (t.b.y - t.a.y); }
export function triangle(legX: number, legY: number): Tri { return { a: { ...START }, b: { x: START.x + legX, y: START.y }, c: { x: START.x + legX, y: START.y + legY } }; }
export function sides(t: Tri) { return { ab: dist2(t.a, t.b), bc: dist2(t.b, t.c), ca: dist2(t.c, t.a) }; }
export function mapTri(m: Motion, t: Tri): Tri { return { a: m.apply(t.a), b: m.apply(t.b), c: m.apply(t.c) }; }
export function sameTri(t: Tri, u: Tri): boolean { return (["a", "b", "c"] as const).every((k) => t[k].x === u[k].x && t[k].y === u[k].y); }
export function polygonPoints(t: Tri): string { return `${sx(t.a.x)},${sy(t.a.y)} ${sx(t.b.x)},${sy(t.b.y)} ${sx(t.c.x)},${sy(t.c.y)}`; }

export const MOTIONS: Motion[] = [
  { id: "translate", short: "Slide", name: "translation 6 right and 6 up", rule: "(x, y) → (x + 6, y + 6)", apply: (p) => ({ x: p.x + 6, y: p.y + 6 }), fixed: "No point stays put: every point travels the same distance in the same direction." },
  { id: "rotate90", short: "Turn 90°", name: "rotation of 90° counterclockwise about the origin", rule: "(x, y) → (−y, x)", apply: (p) => ({ x: -p.y, y: p.x }), fixed: "The origin is the only point that holds still; every other point swings a quarter turn around it." },
  { id: "rotate180", short: "Turn 180°", name: "rotation of 180° about the origin", rule: "(x, y) → (−x, −y)", apply: (p) => ({ x: -p.x, y: -p.y }), fixed: "The origin is the only point that holds still; every other point lands directly opposite it." },
  { id: "reflect", short: "Flip", name: "reflection across the y-axis", rule: "(x, y) → (−x, y)", apply: (p) => ({ x: -p.x, y: p.y }), fixed: "Every point of the y-axis holds still; every other point crosses to the matching spot on the far side." },
];

/** +1 when a motion keeps the sense of a traversal, −1 when it reverses it — read off a unit triangle. */
export function orientationSign(m: Motion): number { return Math.sign(signedArea2(mapTri(m, { a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, c: { x: 0, y: 1 } }))); }

/** A vertex label pushed outward from the center of its triangle, then clamped inside the viewBox. */
export function labelFor(text: string, p: Pt, cx: number, cy: number, image: boolean): Label {
  const px = sx(p.x), py = sy(p.y), len = Math.hypot(px - cx, py - cy) || 1;
  const ux = (px - cx) / len, uy = (py - cy) / len, width = text.length * GLYPH;
  const anchor: "start" | "middle" | "end" = ux > 0.3 ? "start" : ux < -0.3 ? "end" : "middle";
  let x = px + ux * 13;
  const left = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
  if (left < 3) x += 3 - left; else if (left + width > SIZE - 3) x -= left + width - (SIZE - 3);
  return { text, x, y: clamp(py + uy * 13 + 4, FONT + 2, SIZE - 3), anchor, image };
}

/** The square that marks the right angle at V, drawn one step along VU and one along VW. */
export function rightAngleMark(v: Pt, u: Pt, w: Pt, size = 9): string {
  const vx = sx(v.x), vy = sy(v.y);
  const unit = (q: Pt) => { const dx = sx(q.x) - vx, dy = sy(q.y) - vy, len = Math.hypot(dx, dy) || 1; return { x: dx / len, y: dy / len }; };
  const g = unit(u), h = unit(w);
  return `${vx + g.x * size},${vy + g.y * size} ${vx + (g.x + h.x) * size},${vy + (g.y + h.y) * size} ${vx + h.x * size},${vy + h.y * size}`;
}

/** Every pixel the figure draws, from the chosen motion and the two leg lengths. */
export function layout(motionIdx: number, legX: number, legY: number) {
  const m = MOTIONS[motionIdx], pre = triangle(legX, legY), img = mapTri(m, pre), keys = ["a", "b", "c"] as const;
  const mid = (t: Tri) => ({ x: (sx(t.a.x) + sx(t.b.x) + sx(t.c.x)) / 3, y: (sy(t.a.y) + sy(t.b.y) + sy(t.c.y)) / 3 });
  const cp = mid(pre), ci = mid(img);
  return {
    m, pre, img, sPre: sides(pre), sImg: sides(img), prePoints: polygonPoints(pre), imgPoints: polygonPoints(img),
    preMark: rightAngleMark(pre.b, pre.a, pre.c), imgMark: rightAngleMark(img.b, img.a, img.c),
    connectors: keys.map((k) => ({ x1: sx(pre[k].x), y1: sy(pre[k].y), x2: sx(img[k].x), y2: sy(img[k].y) })),
    dots: [...keys.map((k) => ({ x: sx(pre[k].x), y: sy(pre[k].y), image: false })), ...keys.map((k) => ({ x: sx(img[k].x), y: sy(img[k].y), image: true }))],
    labels: [labelFor("A", pre.a, cp.x, cp.y, false), labelFor("B", pre.b, cp.x, cp.y, false), labelFor("C", pre.c, cp.x, cp.y, false),
      labelFor("A′", img.a, ci.x, ci.y, true), labelFor("B′", img.b, ci.x, ci.y, true), labelFor("C′", img.c, ci.x, ci.y, true)],
  };
}

export function figureLabel(motionIdx: number, legX: number, legY: number): string {
  const m = MOTIONS[motionIdx], pre = triangle(legX, legY), img = mapTri(m, pre), s = sides(pre);
  return `Coordinate grid from −6 to 6. Triangle ABC has vertices A ${point(pre.a)}, B ${point(pre.b)}, C ${point(pre.c)}, with the right angle at B. The rule ${m.rule} sends it to triangle A prime B prime C prime with vertices ${point(img.a)}, ${point(img.b)}, ${point(img.c)}. Both triangles have side lengths ${lengthText(s.ab)}, ${lengthText(s.bc)} and ${lengthText(s.ca)}.`;
}

/** Worked example: two stamped brackets, and the half turn that matches them. */
export const EX_ABC: Tri = { a: { x: 1, y: 1 }, b: { x: 5, y: 1 }, c: { x: 5, y: 4 } };
export const EX_DEF: Tri = { a: { x: -1, y: -1 }, b: { x: -5, y: -1 }, c: { x: -5, y: -4 } };
export const EX_MOTION = MOTIONS[2];

/** Try it: which single motion carries JKL onto its image? */
export const TRY_PRE: Tri = { a: { x: 2, y: 1 }, b: { x: 6, y: 1 }, c: { x: 6, y: 3 } };
export const TRY_IMG: Tri = { a: { x: -2, y: 1 }, b: { x: -6, y: 1 }, c: { x: -6, y: 3 } };
export const TRY_NAMES = ["J", "K", "L"] as const;
export const TRY_CANDIDATES: Motion[] = [
  { id: "shift4", short: "Slide 4 units left", name: "translation 4 units left", rule: "(x, y) → (x − 4, y)", apply: (p) => ({ x: p.x - 4, y: p.y }), fixed: "" },
  { id: "flipY", short: "Flip across the y-axis", name: "reflection across the y-axis", rule: "(x, y) → (−x, y)", apply: (p) => ({ x: -p.x, y: p.y }), fixed: "" },
  { id: "turn180", short: "Turn 180° about the origin", name: "rotation of 180° about the origin", rule: "(x, y) → (−x, −y)", apply: (p) => ({ x: -p.x, y: -p.y }), fixed: "" },
  { id: "flipX", short: "Flip across the x-axis", name: "reflection across the x-axis", rule: "(x, y) → (x, −y)", apply: (p) => ({ x: p.x, y: -p.y }), fixed: "" },
];

export function tryAnswerIndex(): number { return TRY_CANDIDATES.findIndex((m) => sameTri(mapTri(m, TRY_PRE), TRY_IMG)); }

/** The first vertex a candidate rule sends to the wrong place — null when it maps all three correctly. */
export function firstMismatch(m: Motion): { name: string; from: Pt; to: Pt; want: Pt } | null {
  for (const [i, k] of (["a", "b", "c"] as const).entries()) {
    const from = TRY_PRE[k], want = TRY_IMG[k], to = m.apply(from);
    if (to.x !== want.x || to.y !== want.y) return { name: TRY_NAMES[i], from, to, want };
  }
  return null;
}

export default function Lesson() {
  const [idx, setIdx] = useState(3);
  const [legX, setLegX] = useState(4);
  const [legY, setLegY] = useState(3);
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();

  const L = layout(idx, legX, legY);
  const keys = ["a", "b", "c"] as const, names = ["A", "B", "C"] as const, keepsSense = orientationSign(L.m) > 0;
  const cards = [
    { title: "The rule, on every vertex", color: ACCENT, big: L.m.rule, mono: true, rows: keys.map((k, i) => `${names[i]} ${point(L.pre[k])} → ${names[i]}′ ${point(L.img[k])}`) },
    { title: "What holds still", color: MARK, big: "", mono: false, rows: [L.m.fixed, `A → B → C runs counterclockwise, and A′ → B′ → C′ runs ${keepsSense ? "counterclockwise as well" : "clockwise: a flip reverses the sense of the traversal"}.`] },
    { title: "Matching parts", color: PRE, big: "", mono: true, rows: [`AB = ${lengthText(L.sPre.ab)} and A′B′ = ${lengthText(L.sImg.ab)}`, `BC = ${lengthText(L.sPre.bc)} and B′C′ = ${lengthText(L.sImg.bc)}`, `CA = ${lengthText(L.sPre.ca)} and C′A′ = ${lengthText(L.sImg.ca)}`] },
    { title: "The conclusion", color: ACCENT, big: "△ABC ≅ △A′B′C′", mono: false, rows: [`One ${L.m.name} maps every vertex onto its partner. Three parts already force it: AB = A′B′, the right angle at B matches the one at B′, and BC = B′C′ — that is SAS.`] },
  ];

  const exS = sides(EX_ABC), exT = sides(EX_DEF), exImage = mapTri(EX_MOTION, EX_ABC);
  const steps = [
    <>Subtract coordinates instead of measuring. In △ABC, AB² = {exS.ab}, BC² = {exS.bc} and CA² = {exS.ca}, so AB = {lengthText(exS.ab)}, BC = {lengthText(exS.bc)} and CA = {lengthText(exS.ca)}.</>,
    <>The same subtraction in △DEF gives DE = {lengthText(exT.ab)}, EF = {lengthText(exT.bc)} and FD = {lengthText(exT.ca)}. Three matching measurements are a strong hint — but in this chapter congruence is not defined by measurements, so keep going.</>,
    <>Test the half turn about the origin, {EX_MOTION.rule}. It sends A{point(EX_ABC.a)} to {point(exImage.a)}, which is D; B{point(EX_ABC.b)} to {point(exImage.b)}, which is E; and C{point(EX_ABC.c)} to {point(exImage.c)}, which is F. One rotation carries all three vertices at once.</>,
    <>A rotation never changes a distance, so △ABC ≅ △DEF (G-CO.6). Because the motion paired A with D, B with E and C with F, every corresponding part matches: ∠A = ∠D, ∠B = ∠E = 90°, ∠C = ∠F, and FD = CA = {lengthText(exS.ca)} — read off without measuring FD (G-CO.7).</>,
    <>Three parts would have been enough. AB = DE = {lengthText(exS.ab)}, the right angle at B matches the right angle at E, and BC = EF = {lengthText(exT.bc)}: two sides with the angle between them, which is SAS (G-CO.8). SSS and ASA would also have settled it here; SSA would not.</>,
  ];

  const answer = tryAnswerIndex(), right = TRY_CANDIDATES[answer];
  const rightSentence = `${right.rule} sends J${point(TRY_PRE.a)} to ${point(right.apply(TRY_PRE.a))}, K${point(TRY_PRE.b)} to ${point(right.apply(TRY_PRE.b))} and L${point(TRY_PRE.c)} to ${point(right.apply(TRY_PRE.c))} — exactly J′, K′ and L′, so the triangles are congruent.`;
  const wrongSentence = (i: number) => {
    const miss = firstMismatch(TRY_CANDIDATES[i]);
    if (miss === null) return `Right. ${rightSentence}`;
    return `Not quite. ${TRY_CANDIDATES[i].rule} sends ${miss.name}${point(miss.from)} to ${point(miss.to)}, but ${miss.name}′ is ${point(miss.want)}. A rigid motion has to carry every vertex onto its partner, not just one. ${rightSentence}`;
  };

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A machinist who wants to know whether a stamped bracket matches the drawing does not reach for a ruler first. She picks the bracket up, turns it, maybe flips it over, and sets it down on the outline to see whether the two coincide. If they do, every edge and every corner agrees — and she never measured a thing. That physical test, slide and turn and flip and check, is the whole idea this chapter turns into mathematics.
      </p>
      <p>
        So <strong>congruent</strong>{" "}will not mean &ldquo;same size and shape&rdquo; here. It will mean there is a sequence of{" "}
        <strong>rigid motions</strong>{" "}carrying one figure exactly onto the other, and each motion is a rule you can write down and feed a coordinate to,
        the way {MOTIONS[1].rule} turns the entire plane a quarter turn. Since such a rule never changes a distance or an angle, anything that matches after the move already matched before it — and that one sentence is the engine behind every proof ahead. Pick a motion and watch it act on all three vertices at once.
      </p>

      <Figure caption="Choose a motion and resize the triangle. The dashed lines join each vertex to its image, and the two triangles keep the same three side lengths no matter what you choose.">
        <div className="flex flex-col items-center gap-5">
          <div className="flex max-w-full flex-wrap justify-center gap-2">
            {MOTIONS.map((mo, i) => <button key={mo.id} type="button" onClick={() => setIdx(i)} aria-pressed={idx === i} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{mo.short}</button>)}
          </div>

          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto h-auto max-w-full" style={{ maxHeight: 330 }} role="img" aria-label={figureLabel(idx, legX, legY)}>
            {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((v) => <g key={v} stroke="var(--line)" strokeWidth={1}><line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} /><line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} /></g>)}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke={L.m.id === "reflect" ? MARK : "var(--ink-soft)"} strokeWidth={L.m.id === "reflect" ? 3.5 : 2} strokeDasharray={L.m.id === "reflect" ? "6 4" : undefined} />
            {L.connectors.map((c, i) => <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="var(--ink-faint)" strokeWidth={1.5} strokeDasharray="4 4" />)}
            <polygon points={L.prePoints} fill={PRE} fillOpacity={0.14} stroke={PRE} strokeWidth={2} strokeDasharray="5 4" />
            <polygon points={L.imgPoints} fill={ACCENT} fillOpacity={0.22} stroke={ACCENT} strokeWidth={2.5} />
            <polyline points={L.preMark} fill="none" stroke={PRE} strokeWidth={1.5} />
            <polyline points={L.imgMark} fill="none" stroke={ACCENT} strokeWidth={1.5} />
            {(L.m.id === "rotate90" || L.m.id === "rotate180") && <circle cx={sx(0)} cy={sy(0)} r={4.5} fill={MARK} />}
            {L.dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={4} fill={d.image ? ACCENT : PRE} />)}
            {L.labels.map((lb) => <text key={lb.text} x={lb.x} y={lb.y} textAnchor={lb.anchor} fontSize={FONT} fontWeight={800} fill={lb.image ? ACCENT : PRE}>{lb.text}</text>)}
          </svg>

          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            {cards.map((card) => (
              <div key={card.title} className="rounded-xl border-2 px-4 py-3" style={{ borderColor: card.color }}>
                <div className="text-xs font-bold uppercase" style={{ color: card.color }}>{card.title}</div>
                {card.big ? <div className={card.mono ? "font-mono text-sm font-black" : "font-mono text-lg font-black"} style={{ color: card.color }}>{card.big}</div> : null}
                {card.rows.map((row) => <div key={row} className={card.mono ? "font-mono text-xs text-[var(--ink-soft)]" : "text-xs text-[var(--ink-soft)]"}>{row}</div>)}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Horizontal leg AB" value={legX} min={2} max={5} onChange={setLegX} />
            <Stepper label="Vertical leg BC" value={legY} min={2} max={5} onChange={setLegY} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: two stamped brackets</h2>
      <p>
        A drawing places bracket △ABC at A{point(EX_ABC.a)}, B{point(EX_ABC.b)}, C{point(EX_ABC.c)}, and a second bracket comes off the press as △DEF at D{point(EX_DEF.a)}, E{point(EX_DEF.b)}, F{point(EX_DEF.c)}, with each unit one centimeter. Are the two congruent, and how long is FD?
      </p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, shown).map((body, i) => <li key={i} className="flex gap-3 text-[15px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span><span>{body}</span></li>)}
        </ol>
        {shown === 0 && <p className="m-0 text-sm text-[var(--ink-faint)]">Press &ldquo;Next step&rdquo; to watch the reasoning unfold.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={shown > 0} aria-controls={stepsId} disabled={shown >= steps.length} onClick={() => setShown((n) => Math.min(steps.length, n + 1))} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next step</button>
          <button type="button" disabled={shown === 0} onClick={() => setShown(0)} className="rounded-lg border border-[var(--line)] px-4 py-1.5 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>
        Triangle JKL has J{point(TRY_PRE.a)}, K{point(TRY_PRE.b)}, L{point(TRY_PRE.c)}, and its image J′K′L′ has J′{point(TRY_IMG.a)}, K′{point(TRY_IMG.b)}, L′{point(TRY_IMG.c)}. Which single rigid motion maps JKL onto J′K′L′?
      </p>
      <div className="flex flex-wrap gap-2">
        {TRY_CANDIDATES.map((c, i) => <button key={c.id} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 text-sm font-bold" style={picked === i ? { background: i === answer ? "var(--band-upper)" : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{c.short}</button>)}
      </div>
      {picked !== null && <p className="mt-3 text-[15px]">{picked === answer ? `Right. ${rightSentence}` : wrongSentence(picked)}</p>}

      <h2>Your path through this chapter</h2>
      <p>
        <strong>Precise Geometric Definitions</strong>{" "}goes back to the beginning and builds angle, circle, parallel and perpendicular out of nothing but point, line and distance — the vocabulary every later proof leans on. <strong>Transformations as Functions</strong>{" "}takes the rule in the figure above seriously as a function of the plane and applies it vertex by vertex, while <strong>Symmetries of a Figure</strong>{" "}asks which motions send a figure back onto <em>itself</em>{" "}and counts them for a regular polygon.{" "}
        <strong>SSS, SAS, ASA Congruence</strong>{" "}proves the shortcuts the last card above only announced. <strong>Proving Angle Theorems</strong>{" "}and <strong>Proving Triangle Theorems</strong>{" "}put the machinery to work on vertical angles, parallel-line angles, the 180° angle sum and the isosceles base angles; <strong>Proving Parallelogram Theorems</strong>{" "}gets every property of a parallelogram out of a single diagonal. <strong>Compass &amp; Straightedge</strong>{" "}closes the chapter by building these figures with no coordinates at all.
      </p>

      <MathCheck>
        <p>
          A rigid motion is a rule that moves every point of the plane without changing any distance, written as a function of coordinates — here {L.m.rule}{" "}(G-CO.2) — and each kind is pinned down by what it holds fixed: a translation fixes no point, a rotation fixes its center, a reflection fixes every point of its mirror line (G-CO.4). Feeding A, B and C to the rule and joining the three images is all it takes to draw the image triangle (G-CO.5).{" "}
          Because the rule preserves distance, the figure shows AB = A′B′ = {lengthText(L.sPre.ab)}, BC = B′C′ = {lengthText(L.sPre.bc)} and CA = C′A′ = {lengthText(L.sPre.ca)}, and the right angle at B is still a right angle at B′. That is exactly the definition of congruence used from here on: △ABC ≅ △A′B′C′ because a rigid motion carries one onto the other (G-CO.6), and once one does, every pair of corresponding sides and angles must agree (G-CO.7).{" "}
          Read backwards, the same fact yields the shortcuts — matching two sides and the angle between them is enough to build such a motion, which is why SAS, and likewise SSS and ASA, are theorems rather than assumptions (G-CO.8).
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
        <span className="w-9 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
