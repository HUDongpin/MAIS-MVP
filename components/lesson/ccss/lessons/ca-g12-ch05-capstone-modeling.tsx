"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)", MID = "var(--band-middle)";

export type Vec = { x: number; y: number };
export type Mat = { a: number; b: number; c: number; d: number };

/** The canopy is a parallelogram spanned by two edge vectors; the steppers set the edges BEFORE the move, in meters. */
export const W_MIN = 2, W_MAX = 5, H_MIN = 1, H_MAX = 4;
/** Laminated canopy glass weighs about 30 kg for each square meter, and this frame is rated to carry 900 kg. */
export const GLASS_KG_PER_M2 = 30, FRAME_LIMIT_KG = 900;

export function det(m: Mat): number { return m.a * m.d - m.b * m.c; }
export function apply(m: Mat, v: Vec): Vec { return { x: m.a * v.x + m.b * v.y, y: m.c * v.x + m.d * v.y }; }
export function cross(p: Vec, q: Vec): number { return p.x * q.y - p.y * q.x; }
export function magnitude(v: Vec): number { return Math.sqrt(v.x * v.x + v.y * v.y); }
/** The components of the vector from one point to another: the tip's coordinates minus the tail's. */
export function componentsBetween(from: Vec, to: Vec): Vec { return { x: to.x - from.x, y: to.y - from.y }; }
/** Direction measured counterclockwise from the east direction, in whole degrees. */
export function directionDeg(v: Vec): number { return Math.round((Math.atan2(v.y, v.x) * 180) / Math.PI); }
export function plural(n: number, one: string, many: string): string { return n === 1 ? one : many; }
/** An exact length prints as itself; an irrational one is marked as rounded. */
export function lengthText(v: Vec): string { const len = magnitude(v); return Number.isInteger(len) ? `${len} m` : `about ${len.toFixed(2)} m`; }

export const MOVES: { key: string; label: string; aria: string; m: Mat; note: string }[] = [
  { key: "keep", label: "leave as drawn", aria: "with no transformation applied", m: { a: 1, b: 0, c: 0, d: 1 }, note: "The identity matrix sends every vector to itself, so nothing on the plan moves." },
  { key: "slant", label: "slant the top", aria: "after a shear that slants the top edge", m: { a: 1, b: 1, c: 0, d: 1 }, note: "A shear slides the top edge sideways. The panel leans, yet its area is unchanged." },
  { key: "double", label: "double both edges", aria: "after doubling both edge vectors", m: { a: 2, b: 0, c: 0, d: 2 }, note: "Each edge vector is multiplied by the scalar 2, so both arrows double in length and the area grows by a factor of four." },
  { key: "turn", label: "quarter turn", aria: "after a quarter turn", m: { a: 0, b: -1, c: 1, d: 0 }, note: "A rotation turns every direction by 90 degrees and changes no length and no area." },
  { key: "mirror", label: "mirror the plan", aria: "after a mirror reflection", m: { a: 1, b: 0, c: 0, d: -1 }, note: "A reflection keeps every length and area the same size but reverses the plan, which is exactly what a negative determinant records." },
];

export type Panel = { u: Vec; v: Vec; au: Vec; av: Vec; corner: Vec; baseArea: number; area: number; mass: number; factor: number };
/** The panel the plan shows: the two transformed edge vectors, the corner they add to, and what the glass would weigh. */
export function panel(w: number, h: number, m: Mat): Panel {
  const u = { x: w, y: 0 }, v = { x: 0, y: h };
  const au = apply(m, u), av = apply(m, v), area = Math.abs(cross(au, av));
  return { u, v, au, av, corner: { x: au.x + av.x, y: au.y + av.y }, baseArea: w * h, area, mass: area * GLASS_KG_PER_M2, factor: det(m) };
}
export function holds(mass: number): boolean { return mass <= FRAME_LIMIT_KG; }

/* Every sentence the plan prints is built here, so the test can check the words as well as the numbers. */
export function edgeCaption(v: Vec): string { return `length ${lengthText(v)}, direction ${directionDeg(v)}°`; }
export function detCaption(p: Panel): string { return `area factor |${p.factor}| = ${Math.abs(p.factor)}`; }
export function areaCaption(p: Panel, w: number, h: number): string { return `${Math.abs(p.factor)} × ${w} × ${h} = ${p.area} square ${plural(p.area, "meter", "meters")}`; }
export function glassCaption(p: Panel): string { return `${p.area} × ${GLASS_KG_PER_M2} kg per square meter`; }
export function verdictLine(p: Panel): string { return `${p.mass} kg is ${holds(p.mass) ? "within" : "over"} the ${FRAME_LIMIT_KG} kg rating`; }
export function summaryLine(p: Panel, w: number, h: number): string { return `Before the move the panel is ${w} ${plural(w, "meter", "meters")} by ${h} ${plural(h, "meter", "meters")} and covers ${p.baseArea} square ${plural(p.baseArea, "meter", "meters")}; after the move it covers ${p.area} square ${plural(p.area, "meter", "meters")}, because the determinant multiplies every area by ${Math.abs(p.factor)}.`; }

export const X_MIN = -5, X_MAX = 11, Y_MIN = -5, Y_MAX = 9, CELL = 22, PAD = 24;
export const SVG_W = (X_MAX - X_MIN) * CELL + 2 * PAD, SVG_H = (Y_MAX - Y_MIN) * CELL + 2 * PAD;
export const LABEL_OFFSET = 14, LABEL_MARGIN = 12;
export function px(x: number): number { return PAD + (x - X_MIN) * CELL; }
export function py(y: number): number { return SVG_H - PAD - (y - Y_MIN) * CELL; }
/** An arrow's name sits beside its midpoint, pushed off the shaft and clamped inside the viewBox. */
export function edgeLabelSpot(tip: Vec): { x: number; y: number } {
  const len = magnitude(tip) || 1;
  const rawX = px(tip.x / 2) + (tip.y / len) * LABEL_OFFSET, rawY = py(tip.y / 2) + (tip.x / len) * LABEL_OFFSET;
  return { x: Math.min(SVG_W - LABEL_MARGIN, Math.max(LABEL_MARGIN, rawX)), y: Math.min(SVG_H - LABEL_MARGIN, Math.max(LABEL_MARGIN, rawY)) };
}
export function figureLabel(p: Panel, aria: string): string {
  return `Site plan on a one meter grid, ${aria}. The canopy is the parallelogram with corners at the origin, (${p.au.x}, ${p.au.y}), (${p.corner.x}, ${p.corner.y}), and (${p.av.x}, ${p.av.y}). Its area is ${p.area} square ${plural(p.area, "meter", "meters")}.`;
}

/** Worked example: a surveyed concrete pad, poured DEPTH_CM deep, then widened by the client. */
export const PEG: Vec = { x: 0, y: 0 }, STAKE_U: Vec = { x: 9, y: 2 }, STAKE_V: Vec = { x: 11, y: 10 };
export const PAD_U: Vec = componentsBetween(PEG, STAKE_U), PAD_V: Vec = componentsBetween(STAKE_U, STAKE_V);
export const DEPTH_CM = 15, CONCRETE_KG_PER_M3 = 2400, TRUCK_KG = 8000;
export const WIDEN: Mat = { a: 2, b: 0, c: 0, d: 1 };
export function padExample() {
  const area = Math.abs(cross(PAD_U, PAD_V));
  const wu = apply(WIDEN, PAD_U), wv = apply(WIDEN, PAD_V), wideArea = Math.abs(cross(wu, wv));
  const mass = (area * DEPTH_CM * CONCRETE_KG_PER_M3) / 100, wideMass = (wideArea * DEPTH_CM * CONCRETE_KG_PER_M3) / 100;
  return { area, volume: (area * DEPTH_CM) / 100, mass, wu, wv, wideArea, wideVolume: (wideArea * DEPTH_CM) / 100, wideMass, loads: Math.ceil(wideMass / TRUCK_KG), factor: det(WIDEN) };
}
export function loadsSentence(ex: ReturnType<typeof padExample>): string { return `At ${TRUCK_KG} kg a truckload the crew books ${ex.loads} ${plural(ex.loads, "load", "loads")}, because ${ex.loads - 1} would leave ${ex.wideMass - (ex.loads - 1) * TRUCK_KG} kg on the ground.`; }

/** Try it: a shear has determinant 1, so it changes the shape of the courtyard without changing its area. */
export const TRY_AREA = 12, TRY_MATRIX: Mat = { a: 1, b: 3, c: 0, d: 1 };
export function tryChoices(): { area: number; why: string }[] {
  const m = TRY_MATRIX;
  return [
    { area: TRY_AREA * m.b, why: `scales by the single entry ${m.b}, but one entry on its own is not the area factor` },
    { area: TRY_AREA * Math.abs(det(m)), why: "correct" },
    { area: TRY_AREA * (m.a + m.b + m.c + m.d), why: "adds the four entries, which is not how a matrix changes an area" },
    { area: TRY_AREA * (m.a + m.d), why: `uses ${m.a} + ${m.d} down the diagonal instead of the determinant` },
  ];
}
export function tryAnswerIndex(): number {
  const target = TRY_AREA * Math.abs(TRY_MATRIX.a * TRY_MATRIX.d - TRY_MATRIX.b * TRY_MATRIX.c);
  return tryChoices().findIndex((choice) => choice.area === target);
}
export function tryFactText(): string {
  const d = det(TRY_MATRIX);
  return `That matrix has determinant ${TRY_MATRIX.a} x ${TRY_MATRIX.d} - ${TRY_MATRIX.b} x ${TRY_MATRIX.c} = ${d}, so the shear slides the courtyard into a slanted shape of exactly the same size: ${TRY_AREA} x ${Math.abs(d)} = ${TRY_AREA * Math.abs(d)} square meters.`;
}
export function tryFeedback(picked: number): string {
  return picked === tryAnswerIndex() ? `Right. ${tryFactText()}` : `Not quite — that answer ${tryChoices()[picked].why}. ${tryFactText()}`;
}

export default function Lesson() {
  const [w, setW] = useState(4);
  const [h, setH] = useState(3);
  const [moveKey, setMoveKey] = useState("keep");
  const [shown, setShown] = useState(0), [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();

  const mv = MOVES.find((option) => option.key === moveKey) ?? MOVES[0];
  const p = panel(w, h, mv.m);
  const uName = mv.key === "keep" ? "u" : "Au", vName = mv.key === "keep" ? "v" : "Av";
  const lu = edgeLabelSpot(p.au), lv = edgeLabelSpot(p.av);

  const ex = padExample(), choices = tryChoices(), answer = tryAnswerIndex();
  const steps = [
    <>The surveyor drives three stakes and reads their grid coordinates, in meters: the corner peg at ({PEG.x}, {PEG.y}), the far end of one edge at ({STAKE_U.x}, {STAKE_U.y}), and the opposite corner at ({STAKE_V.x}, {STAKE_V.y}). The components of a vector between two points are the tip minus the tail, so u = ({STAKE_U.x}, {STAKE_U.y}) &minus; ({PEG.x}, {PEG.y}) = ({PAD_U.x}, {PAD_U.y}) and v = ({STAKE_V.x}, {STAKE_V.y}) &minus; ({STAKE_U.x}, {STAKE_U.y}) = ({PAD_V.x}, {PAD_V.y}).</>,
    <>Each pair says how far east and how far north that edge runs: u goes {PAD_U.x} m east and {PAD_U.y} m north, v goes {PAD_V.x} m east and {PAD_V.y} m north, and the pad is the parallelogram those two arrows span.</>,
    <>Put those two vectors in the columns of a matrix, and the size of its determinant measures that parallelogram: |{PAD_U.x}&middot;{PAD_V.y} &minus; {PAD_V.x}&middot;{PAD_U.y}| = |{PAD_U.x * PAD_V.y} &minus; {PAD_V.x * PAD_U.y}| = {ex.area} square meters.</>,
    <>The slab is poured {DEPTH_CM} cm deep, which is {DEPTH_CM / 100} m, so the concrete fills {ex.area} &times; {DEPTH_CM / 100} = {ex.volume.toFixed(1)} cubic meters.</>,
    <>Concrete runs about {CONCRETE_KG_PER_M3} kg per cubic meter, so the pour weighs {ex.volume.toFixed(1)} &times; {CONCRETE_KG_PER_M3} = {ex.mass} kg.</>,
    <>The client widens the pad east to west, which is the matrix with columns ({WIDEN.a}, {WIDEN.c}) and ({WIDEN.b}, {WIDEN.d}). It sends u to ({ex.wu.x}, {ex.wu.y}) and v to ({ex.wv.x}, {ex.wv.y}), and its determinant is {ex.factor}, so the area is multiplied by {ex.factor}: {ex.wideArea} square meters, {ex.wideVolume.toFixed(1)} cubic meters, {ex.wideMass} kg. {loadsSentence(ex)}</>,
  ];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Every model in this chapter begins with the same trade. Something real — a glass canopy, a concrete pad, a delivery route — is swapped for objects you can compute with. An arrow stands in for a route leg or a wind load. A parallelogram stands in for a panel of glass. A small square block of numbers stands in for a move the designer makes to the whole plan at once.
      </p>
      <p>
        The plan below runs that trade end to end. Two arrows fix the shape of a canopy panel; a matrix reshapes it; the determinant of that matrix reports how much the area changed; area and density give the weight; and the weight decides whether the frame holds. Change any input and every link in the chain answers.
      </p>

      <Figure caption="The two steppers set the panel before the move; the buttons then apply a two-by-two matrix to the whole plan. That matrix's determinant is the factor every area is multiplied by, and the glass weight follows from the area.">
        <div className="flex flex-col items-center gap-5">
          <div className="flex max-w-full flex-wrap justify-center gap-2">
            {MOVES.map((option) => (
              <button key={option.key} type="button" onClick={() => setMoveKey(option.key)} aria-pressed={moveKey === option.key} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={moveKey === option.key ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{option.label}</button>))}
          </div>

          <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(p, mv.aria)}>
            <defs>
              <marker id="capstoneHeadU" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={ACCENT} /></marker>
              <marker id="capstoneHeadV" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={MID} /></marker>
            </defs>
            {Array.from({ length: X_MAX - X_MIN + 1 }, (_, i) => X_MIN + i).map((gx) => (
              <line key={`gx${gx}`} x1={px(gx)} y1={py(Y_MIN)} x2={px(gx)} y2={py(Y_MAX)} stroke="var(--line)" strokeWidth={1} />))}
            {Array.from({ length: Y_MAX - Y_MIN + 1 }, (_, i) => Y_MIN + i).map((gy) => (
              <line key={`gy${gy}`} x1={px(X_MIN)} y1={py(gy)} x2={px(X_MAX)} y2={py(gy)} stroke="var(--line)" strokeWidth={1} />))}
            <line x1={px(X_MIN)} y1={py(0)} x2={px(X_MAX)} y2={py(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={px(0)} y1={py(Y_MIN)} x2={px(0)} y2={py(Y_MAX)} stroke="var(--ink-soft)" strokeWidth={2} />
            <polygon points={`${px(0)},${py(0)} ${px(p.au.x)},${py(p.au.y)} ${px(p.corner.x)},${py(p.corner.y)} ${px(p.av.x)},${py(p.av.y)}`} fill={ACCENT} fillOpacity={0.16} stroke={ACCENT} strokeWidth={1.5} strokeDasharray="5 4" />
            <line x1={px(0)} y1={py(0)} x2={px(p.au.x)} y2={py(p.au.y)} stroke={ACCENT} strokeWidth={3.5} markerEnd="url(#capstoneHeadU)" />
            <line x1={px(0)} y1={py(0)} x2={px(p.av.x)} y2={py(p.av.y)} stroke={MID} strokeWidth={3.5} markerEnd="url(#capstoneHeadV)" />
            <circle cx={px(p.corner.x)} cy={py(p.corner.y)} r={4.5} fill="var(--ink)" />
            <circle cx={px(0)} cy={py(0)} r={4} fill="var(--ink)" />
            <text x={lu.x} y={lu.y} textAnchor="middle" fontSize={13} fontWeight={800} fill={ACCENT}>{uName}</text>
            <text x={lv.x} y={lv.y} textAnchor="middle" fontSize={13} fontWeight={800} fill={MID}>{vName}</text>
          </svg>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 font-mono text-base font-black">
              <span>A =</span><span className="text-3xl font-thin">[</span>
              <span className="grid grid-cols-2 gap-x-4 text-center"><span>{mv.m.a}</span><span>{mv.m.b}</span><span>{mv.m.c}</span><span>{mv.m.d}</span></span>
              <span className="text-3xl font-thin">]</span>
            </div>
            <div className="max-w-sm text-sm text-[var(--ink-soft)]">{mv.note}</div>
          </div>

          <div className="grid w-full max-w-2xl grid-cols-2 gap-2 text-center sm:grid-cols-3">
            <Info label={uName} value={`(${p.au.x}, ${p.au.y})`} small={edgeCaption(p.au)} />
            <Info label={vName} value={`(${p.av.x}, ${p.av.y})`} small={edgeCaption(p.av)} />
            <Info label={`${uName} + ${vName}`} value={`(${p.corner.x}, ${p.corner.y})`} small="the far corner of the panel" />
            <Info label="det A" value={`${p.factor}`} small={detCaption(p)} />
            <Info label="area" value={`${p.area} m²`} small={areaCaption(p, w, h)} />
            <Info label="glass" value={`${p.mass} kg`} small={glassCaption(p)} />
          </div>

          <div className="w-full max-w-2xl rounded-2xl border-2 px-5 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-lg font-black" style={{ color: ACCENT }}>{verdictLine(p)}</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">{summaryLine(p, w, h)}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Edge u before the move (m)" value={w} min={W_MIN} max={W_MAX} onChange={setW} />
            <Stepper label="Edge v before the move (m)" value={h} min={H_MIN} max={H_MAX} onChange={setH} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: what the concrete pad weighs</h2>
      <p>
        A crew stakes out a parallelogram pad on a sloping lot and the surveyor hands over stake coordinates instead of a length
        and a width. How heavy is the pour, and how many truckloads does the widened version take?
      </p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, shown).map((body, i) => (
            <li key={i} className="flex gap-3 text-[15px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span><span>{body}</span></li>))}
        </ol>
        {shown === 0 && <p className="m-0 text-sm text-[var(--ink-faint)]">Press &ldquo;Next step&rdquo; to watch the model come together.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={shown > 0} aria-controls={stepsId} disabled={shown >= steps.length} onClick={() => setShown((n) => Math.min(steps.length, n + 1))} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next step</button>
          <button type="button" disabled={shown === 0} onClick={() => setShown(0)} className="rounded-lg border border-[var(--line)] px-4 py-1.5 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>
        A courtyard covers {TRY_AREA} square meters. A designer applies the matrix with columns ({TRY_MATRIX.a}, {TRY_MATRIX.c})
        and ({TRY_MATRIX.b}, {TRY_MATRIX.d}) to the whole site plan. What area does the courtyard cover afterwards?
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice, i) => (
          <button key={i} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={picked === i ? { background: i === answer ? "var(--band-upper)" : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{choice.area} m&sup2;</button>))}
      </div>
      {picked !== null && <p className="mt-3 text-[15px]">{tryFeedback(picked)}</p>}

      <h2>Your path through this chapter</h2>
      <p>
        <strong>Vectors: Magnitude and Direction</strong>{" "}slows down the two arrows above and reads their components, lengths, and angles off a grid.{" "}<strong>Adding and Scaling Vectors</strong>{" "}earns the far corner you saw at the tip of one arrow laid off the other, and the doubling move.{" "}<strong>Matrices and Their Operations</strong>{" "}opens up the block of four numbers and builds the row-times-column rule that produced each transformed edge.{" "}<strong>Matrix Algebra: Order Matters</strong>{" "}shows why slanting and then turning is not the same plan as turning and then slanting, and meets the identity matrix behind the &ldquo;leave as drawn&rdquo; button.{" "}<strong>Matrices Transform the Plane</strong>{" "}takes the determinant apart as an area factor.{" "}<strong>Modeling with Geometry</strong>{" "}closes the loop with volume, density, and the design questions they answer.
      </p>

      <MathCheck>
        <p>
          Each arrow carries two facts at once, a length and a direction, and its components record both: {uName} = ({p.au.x}, {p.au.y}) has length {lengthText(p.au)} and points {directionDeg(p.au)}&deg; from east (N-VM.1). When a surveyor hands over stakes instead of arrows, the components are the tip minus the tail, which is how the pad&rsquo;s second edge is read off its two stakes: ({STAKE_V.x}, {STAKE_V.y}) &minus; ({STAKE_U.x}, {STAKE_U.y}) = ({PAD_V.x}, {PAD_V.y}) (N-VM.2). The far corner of the panel sits at {uName} + {vName} = ({p.corner.x}, {p.corner.y}) because adding vectors means laying one off the tip of the other (N-VM.4), and the doubling move multiplies each edge vector by the scalar 2, which lengthens both arrows without turning either one (N-VM.5). Multiplying by a two-by-two matrix sends each edge vector somewhere new and so carries the whole panel with it (N-VM.11, N-VM.12). The determinant of the move's matrix, not of the panel, is the one number that reports the effect on area: here det A = {p.factor}, so the {p.baseArea} square {plural(p.baseArea, "meter", "meters")} the panel started with become {Math.abs(p.factor)} &times; {p.baseArea} = {p.area}. A negative determinant, as the mirror gives, means the plan was turned over, and the area factor is its absolute value. Treating the canopy as a parallelogram at all is the modeling step (G-MG.1); multiplying {p.area} square {plural(p.area, "meter", "meters")} by {GLASS_KG_PER_M2} kg per square meter is a density calculation (G-MG.2); and testing {p.mass} kg against the frame&rsquo;s {FRAME_LIMIT_KG} kg rating is the design decision the whole model was built to answer (G-MG.3). The concrete pad settles the same chain with vectors that are not lined up with the grid (N-VM.3).
        </p>
      </MathCheck>
    </div>
  );
}

function Info({ label, value, small }: { label: string; value: string; small: string }) {
  return (
    <div className="flex flex-col rounded-lg bg-[var(--surface-2)] px-2 py-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <span className="font-mono text-base font-black" style={{ color: ACCENT }}>{value}</span>
      <span className="text-[11px] text-[var(--ink-soft)]">{small}</span>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>&minus;</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
