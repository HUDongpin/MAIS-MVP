"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const WATER = "var(--band-high)";
const LAWN = "var(--band-upper)";

/** One grid unit of the plan is CELL pixels; the plan panel is sized for the largest plan. */
export const CELL = 30;
export const PAD = 30;
export const DW_MIN = 2, DW_MAX = 8;
export const DH_MIN = 3, DH_MAX = 6;
export const K_MIN = 2, K_MAX = 6;
/** The fountain sits on a half-unit grid, so it stays adjustable on every plan. */
export const R_MIN = 0.5, R_STEP = 0.5, D_MIN = 1, D_MAX = 3;
/** Plan panel, then a side panel holding the pool's cross-section at MPP pixels per meter. */
export const PW = DW_MAX * CELL + 2 * PAD;
/**
 * Two labels that cannot be pinned to the thing they name.
 *
 * "r = 0.5 units = 1 m" is about 120px wide and a 2-unit plan is 60px across,
 * so beside the fountain the radius label overran the plan on both sides: it
 * struck through the plan's own border and landed on the rotated height label.
 * Neither shrinking the label nor nudging it helps at that size, so the radius
 * label gets its own line under the plan and the height label its own gutter
 * left of the widest plan. Both are drawn in the colour of what they name.
 */
export const HEIGHT_LABEL_X = 13;
/** The plan's three labels are all 11px bold; 6.4 is a generous per-character advance for that face. */
export const PLAN_LABEL_SIZE = 11, PLAN_GLYPH = 6.4;
export const SIDE = 120;
export const MPP = 14;
export const SURFACE_Y = 100;
export const W = PW + SIDE;
export const H = DH_MAX * CELL + 2 * PAD;
export const RADIUS_LABEL_Y = H - 8;

/** The bottom row is the pool, so the circle must fit the width and the rows above it: 2r <= min(dw, dh - 1). */
export function maxRadius(dw: number, dh: number): number {
  return Math.min(dw, dh - 1) / 2;
}

export function clampRadius(raw: number, dw: number, dh: number): number {
  return Math.min(Math.max(R_MIN, Math.round(raw / R_STEP) * R_STEP), maxRadius(dw, dh));
}

/** Top-left corner of the plan rectangle, centered in the plan panel. */
export function origin(dw: number, dh: number): { ox: number; oy: number } { return { ox: (PW - dw * CELL) / 2, oy: (H - dh * CELL) / 2 }; }

export function units(n: number): string { return `${n} ${n === 1 ? "unit" : "units"}`; }
/** Same job as units(), for the noun the aria-label spells out in full. */
export function meters(n: number): string { return `${n} ${n === 1 ? "meter" : "meters"}`; }

/** Every measurement the figure reports, from the plan, the fountain radius, the scale, and the pool depth. */
export function plan(dw: number, dh: number, r: number, k: number, depth: number) {
  const aw = dw * k, ah = dh * k, parkArea = aw * ah, radius = r * k;
  const fountainArea = Math.PI * radius * radius;
  const poolLong = (dw - 1) * k, poolShort = k; // the pool runs along the south edge, one plan unit deep on the page
  const poolFloor = poolLong * poolShort, poolWalls = 2 * poolLong * depth + 2 * poolShort * depth;
  return {
    aw, ah, parkArea, radius, fountainArea, poolLong, poolShort, poolFloor, poolWalls,
    circumference: 2 * Math.PI * radius, drawArea: dw * dh, areaFactor: k * k,
    poolVolume: poolFloor * depth, poolSurface: poolFloor + poolWalls, lawnArea: parkArea - poolFloor - fountainArea,
  };
}

export function figureLabel(dw: number, dh: number, r: number, k: number, depth: number): string {
  const p = plan(dw, dh, r, k, depth);
  return `Plan of a park ${dw} by ${units(dh)} drawn at 1 unit = ${meters(k)}, so the real park is ${p.aw} by ${meters(p.ah)}. A fountain of radius ${units(r)} sits at the center of the lawn and a pool runs along the south edge. The fountain's real radius is ${meters(p.radius)}; the pool is ${p.poolLong} by ${meters(p.poolShort)}, and the cross-section beside the plan cuts straight across the pool and shows it ${meters(depth)} deep`;
}

/** The exact strings the figure prints, so the component and the test share one source of truth. */
export function figureStrings(dw: number, dh: number, r: number, k: number, depth: number) {
  const p = plan(dw, dh, r, k, depth);
  return {
    scaleChip: `Scale: 1 unit = ${k} m`,
    factorChip: `Lengths ×${k}, areas ×${k}² = ×${p.areaFactor}`,
    widthLabel: `${units(dw)} = ${p.aw} m`,
    heightLabel: `${units(dh)} = ${p.ah} m`,
    radiusLabel: `r = ${units(r)} = ${p.radius} m`,
    sideTitle: "pool, cross-section", sideWidth: `${p.poolShort} m across`, sideDepth: `${depth} m deep`,
    park: [`${p.aw} × ${p.ah} m`, `area ${p.parkArea} m²`, `${p.drawArea} sq units × ${p.areaFactor} = ${p.parkArea}`],
    fountain: [`radius ${p.radius} m`, `${units(r)} × ${k} = ${p.radius} m`, `C = 2π(${p.radius}) ≈ ${p.circumference.toFixed(2)} m`, `A = π(${p.radius})² ≈ ${p.fountainArea.toFixed(2)} m²`],
    pool: [`${p.poolLong} × ${p.poolShort} × ${depth} m`, `floor ${p.poolLong} × ${p.poolShort} = ${p.poolFloor} m²`, `V = ${p.poolFloor} × ${depth} = ${p.poolVolume} m³`, `floor + 4 walls = ${p.poolFloor} + ${p.poolWalls} = ${p.poolSurface} m²`],
    lawn: [`≈ ${p.lawnArea.toFixed(2)} m²`, "park − pool floor − fountain", `${p.parkArea} − ${p.poolFloor} − ${p.fountainArea.toFixed(2)}`],
  };
}

/** Worked example: a school field 90 m by 60 m with a center circle of radius 9 m, drawn at 1 cm = 6 m. */
export const FIELD = { realW: 90, realH: 60, scale: 6, circleR: 9 };
/** A rectangular sand pit on that same field, dug to a real depth the flat drawing cannot show. */
export const PIT = { long: 8, short: 3, depth: 0.5 };

export function workedExample() {
  const drawW = FIELD.realW / FIELD.scale, drawH = FIELD.realH / FIELD.scale;
  const pitFloor = PIT.long * PIT.short, pitWalls = 2 * PIT.long * PIT.depth + 2 * PIT.short * PIT.depth;
  return {
    drawW, drawH, pitFloor, pitWalls,
    drawArea: drawW * drawH, realArea: FIELD.realW * FIELD.realH,
    areaPerSquare: FIELD.scale * FIELD.scale, // square meters of ground per square centimeter of paper
    drawR: FIELD.circleR / FIELD.scale, circumference: 2 * Math.PI * FIELD.circleR,
    circleArea: Math.PI * FIELD.circleR * FIELD.circleR,
    pitVolume: pitFloor * PIT.depth, pitSurface: pitFloor + pitWalls,
  };
}

/** Try it: a square patio drawn 2 units on a side at 1 unit = 3 m. */
export const PATIO = { side: 2, scale: 3 };

export function patioSentence(): string {
  const real = PATIO.side * PATIO.scale;
  return `Each side scales: ${PATIO.side} × ${PATIO.scale} = ${real} m, so the real patio is ${real} m by ${real} m and its area is ${real} × ${real} = ${real * real} m².`;
}

/** Each rationale carries its own unit, because three of the four numbers are not areas in square meters. */
export function tryChoices(): { value: number; why: string }[] {
  const drawArea = PATIO.side * PATIO.side, real = PATIO.side * PATIO.scale;
  return [
    { value: drawArea, why: `the drawing's own area, ${drawArea} square units, never scaled up to the ground` },
    { value: drawArea * PATIO.scale, why: `the drawing's area scaled only once, ${drawArea} × ${PATIO.scale} — but both sides scale, so area scales twice` },
    { value: real * real, why: "correct" },
    { value: 4 * real, why: `the real patio's perimeter, 4 × ${real} = ${4 * real} m, which is a length and not an area` },
  ];
}

export function tryAnswerIndex(): number {
  return tryChoices().findIndex((c) => c.value === (PATIO.side * PATIO.scale) * (PATIO.side * PATIO.scale));
}

export function tryFeedback(picked: number): string {
  const choice = tryChoices()[picked];
  return choice.why === "correct" ? `Right. ${patioSentence()}` : `Not quite. That is ${choice.why}. ${patioSentence()}`;
}

export default function Lesson() {
  const [dw, setDw] = useState(5);
  const [dh, setDh] = useState(5);
  const [rRaw, setRRaw] = useState(1);
  const [k, setK] = useState(3);
  const [depth, setDepth] = useState(2);
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();

  const rMax = maxRadius(dw, dh);
  const r = clampRadius(rRaw, dw, dh);
  const p = plan(dw, dh, r, k, depth);
  const s = figureStrings(dw, dh, r, k, depth);
  const { ox, oy } = origin(dw, dh);
  const cx = ox + (dw * CELL) / 2, cy = oy + ((dh - 1) * CELL) / 2;
  const poolTop = oy + (dh - 1) * CELL, sideX = PW + (SIDE - p.poolShort * MPP) / 2;

  const ex = workedExample();
  const steps = [
    <>Divide each real length by the scale: {FIELD.realW} ÷ {FIELD.scale} = {ex.drawW} cm and {FIELD.realH} ÷ {FIELD.scale} = {ex.drawH} cm. The field is drawn {ex.drawW} cm by {ex.drawH} cm.</>,
    <>Area of the drawing: {ex.drawW} × {ex.drawH} = {ex.drawArea} cm². Area of the real field: {FIELD.realW} × {FIELD.realH} = {ex.realArea} m².</>,
    <>Those two areas are measured in different units, so convert the factor instead of dividing them. Each 1 cm of paper stands for {FIELD.scale} m of ground, so each 1 cm² of paper stands for {FIELD.scale} × {FIELD.scale} = {ex.areaPerSquare} m² of ground. Then {ex.drawArea} cm² × {ex.areaPerSquare} m² per cm² = {ex.drawArea * ex.areaPerSquare} m², which matches {FIELD.realW} × {FIELD.realH}. Area is multiplied by the scale squared.</>,
    <>The center circle has real radius {FIELD.circleR} m, so on paper its radius is {FIELD.circleR} ÷ {FIELD.scale} = {ex.drawR} cm. On the ground, C = 2π({FIELD.circleR}) ≈ {ex.circumference.toFixed(2)} m and A = π({FIELD.circleR})² ≈ {ex.circleArea.toFixed(2)} m².</>,
    <>The sand pit is a right prism {PIT.long} m by {PIT.short} m, dug {PIT.depth} m deep. Its floor is {PIT.long} × {PIT.short} = {ex.pitFloor} m², so it holds {ex.pitFloor} × {PIT.depth} = {ex.pitVolume} m³ of sand, and lining its floor and four walls takes {ex.pitFloor} + 2({PIT.long} × {PIT.depth}) + 2({PIT.short} × {PIT.depth}) = {ex.pitSurface} m².</>,
  ];

  const choices = tryChoices(), answer = tryAnswerIndex();

  return (
    <div className="prose-lesson max-w-none">
      <p>A landscape designer hands the city a plan for a new park. The sheet of paper is smaller than a desk, yet everyone can read the real park from it: how long the fence will be, how much lawn to seed, how wide the fountain is, how much water the pool holds. That works because the plan is a <strong>scale drawing</strong>: every length on paper stands for a fixed number of meters on the ground.</p>
      <p>This chapter is about figures and the measurements that come with them: lengths, angles, areas, and volumes. The big idea is that those measurements are tied together by rules you can trust. A scale multiplies every length by the same number, and every area by that number <em>squared</em>. A circle&apos;s circumference and area both come from its radius through π. Two angles that together form a straight line always add to 180°. A prism&apos;s volume is its base area times the length it is stretched through — for the pool below, its depth. Depth is the one measurement the flat plan cannot draw, so the panel on the right shows a <strong>cross-section</strong>: the flat shape you would expose by cutting straight across the pool. Change the plan and watch every measurement respond.</p>

      <Figure caption="Resize the plan, the fountain, the pool depth, or the scale. Lengths multiply by the scale and areas by the scale squared; the fountain's circumference and area follow from its real radius; the pool's volume is its floor area times the depth drawn in the cross-section.">
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-wrap justify-center gap-2 text-sm font-bold">
            <span className="rounded-lg bg-[var(--surface-2)] px-3 py-1.5">{s.scaleChip}</span>
            <span className="rounded-lg bg-[var(--surface-2)] px-3 py-1.5">{s.factorChip}</span>
          </div>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(dw, dh, r, k, depth)}>
            {Array.from({ length: dh }, (_, row) => Array.from({ length: dw }, (_, col) => (
              <rect key={`${row}-${col}`} x={ox + col * CELL} y={oy + row * CELL} width={CELL} height={CELL} fill={LAWN} fillOpacity={0.18} stroke="var(--line)" strokeWidth={1} />
            )))}
            <rect x={ox + CELL / 2} y={poolTop} width={(dw - 1) * CELL} height={CELL} fill={WATER} fillOpacity={0.45} stroke={WATER} strokeWidth={2} />
            <rect x={ox} y={oy} width={dw * CELL} height={dh * CELL} fill="none" stroke={ACCENT} strokeWidth={2.5} />
            <circle cx={cx} cy={cy} r={r * CELL} fill={WATER} fillOpacity={0.3} stroke={WATER} strokeWidth={2} />
            <line x1={cx} y1={cy} x2={cx + r * CELL} y2={cy} stroke={WATER} strokeWidth={2} />
            <text x={PW / 2} y={RADIUS_LABEL_Y} textAnchor="middle" fontSize={11} fontWeight={800} fill={WATER}>{s.radiusLabel}</text>
            <text x={PW / 2} y={oy - 9} textAnchor="middle" fontSize={11} fontWeight={700} fill={ACCENT}>{s.widthLabel}</text>
            <text x={HEIGHT_LABEL_X} y={H / 2} transform={`rotate(-90 ${HEIGHT_LABEL_X} ${H / 2})`} textAnchor="middle" fontSize={11} fontWeight={700} fill={ACCENT}>{s.heightLabel}</text>
            <text x={PW + SIDE / 2} y={SURFACE_Y - 24} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--ink-faint)">{s.sideTitle}</text>
            <text x={PW + SIDE / 2} y={SURFACE_Y - 10} textAnchor="middle" fontSize={10} fontWeight={700} fill={WATER}>{s.sideWidth}</text>
            <rect x={sideX} y={SURFACE_Y} width={p.poolShort * MPP} height={depth * MPP} fill={WATER} fillOpacity={0.45} stroke={WATER} strokeWidth={2} />
            <text x={PW + SIDE / 2} y={SURFACE_Y + depth * MPP + 13} textAnchor="middle" fontSize={10} fontWeight={700} fill={WATER}>{s.sideDepth}</text>
          </svg>
          <div className="grid w-full grid-cols-1 gap-3 text-center sm:grid-cols-2 lg:grid-cols-4">
            <Card title="Park" color={ACCENT} lines={s.park} />
            <Card title="Fountain" color={WATER} lines={s.fountain} />
            <Card title="Pool" color={WATER} lines={s.pool} />
            <Card title="Lawn" color={LAWN} lines={s.lawn} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Plan width" value={dw} min={2} max={8} color={ACCENT} onChange={setDw} />
            <Stepper label="Plan height" value={dh} min={3} max={6} color={ACCENT} onChange={setDh} />
            <Stepper label="Fountain radius" value={r} min={0.5} max={rMax} step={0.5} color={WATER} onChange={setRRaw} />
            <Stepper label="Pool depth (m)" value={depth} min={1} max={3} color={WATER} onChange={setDepth} />
            <Stepper label="Scale (m per unit)" value={k} min={2} max={6} color="var(--ink)" onChange={setK} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: drawing a field to scale</h2>
      <p>A school field is {FIELD.realW} m long and {FIELD.realH} m wide, with a center circle of radius {FIELD.circleR} m and a rectangular sand pit {PIT.long} m by {PIT.short} m dug {PIT.depth} m deep. Draw the field at the scale 1 cm = {FIELD.scale} m. How big is the drawing, how do the two areas compare, what are the circle&apos;s real circumference and area, and how much sand fills the pit?</p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, shown).map((body, i) => (
            <li key={i} className="flex gap-3 text-[15px]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span>
              <span>{body}</span>
            </li>
          ))}
        </ol>
        {shown === 0 && <p className="m-0 text-sm text-[var(--ink-faint)]">Press &ldquo;Next step&rdquo; to watch the solution unfold.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={shown > 0} aria-controls={stepsId} disabled={shown >= steps.length} onClick={() => setShown((v) => Math.min(steps.length, v + 1))} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>
            Next step
          </button>
          <button type="button" disabled={shown === 0} onClick={() => setShown(0)} className="rounded-lg border border-[var(--line)] px-4 py-1.5 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">
            Start over
          </button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>A plan uses the scale 1 unit = {PATIO.scale} m. A square patio is drawn {PATIO.side} units on each side. What is the real area of the patio?</p>
      <div className="flex flex-wrap gap-2">
        {choices.map((c, i) => (
          <button key={i} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={picked === i ? { background: i === answer ? "var(--band-upper)" : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
            {c.value} m²
          </button>
        ))}
      </div>
      {picked !== null && <p className="mt-3 text-[15px]">{tryFeedback(picked)}</p>}

      <h2>Your path through this chapter</h2>
      <p><strong>Scale Drawings</strong>{" "}takes the rule you just used from drawing length to real length and shows again why area grows by the scale squared. <strong>Building Triangles</strong>{" "}sets three side lengths and uses the triangle inequality to decide whether they close up — and when they do, they make exactly one triangle. <strong>Cross-Sections</strong>{" "}cuts a cube three ways and names the flat shape each cut exposes, the way the pool&apos;s cross-section above names a rectangle: a square, a rectangle, a triangle. <strong>π, Circumference, and Area of a Circle</strong>{" "}resizes a circle to show why circumference ÷ diameter is always π, then reads off C = 2πr and A = πr². <strong>Angle Relationships</strong>{" "}uses complementary, supplementary, and vertical pairs to find an unknown angle from a known one. <strong>Area, Volume &amp; Surface Area</strong>{" "}stretches a triangle along a length to build a prism and finds its volume the same way the pool&apos;s was found: base area times length.</p>

      <MathCheck>
        <p>In a scale drawing, real length = drawing length × the scale, so at 1 unit = {k} m the {dw}-by-{dh}-unit plan becomes a {p.aw} m by {p.ah} m park. Area is length × length, so one square unit of the plan stands for {k} × {k} = {p.areaFactor} m² of ground: {p.drawArea} sq units × {p.areaFactor} m² per sq unit = {p.parkArea} m² (7.G.A.1). The fountain&apos;s real radius is {p.radius} m; its circumference C = 2πr ≈ {p.circumference.toFixed(2)} m and area A = πr² ≈ {p.fountainArea.toFixed(2)} m² follow from π being circumference ÷ diameter for every circle (7.G.B.4). The pool is a right prism: its rectangular floor measures {p.poolLong} × {p.poolShort} = {p.poolFloor} m², and stacking that floor through a depth of {depth} m holds {p.poolFloor} × {depth} = {p.poolVolume} m³ of water, while tiling the floor and four walls covers {p.poolFloor} + 2({p.poolLong} × {depth}) + 2({p.poolShort} × {depth}) = {p.poolSurface} m². What is left for lawn is the park rectangle with the pool rectangle and the fountain circle taken out: {p.parkArea} − {p.poolFloor} − {p.fountainArea.toFixed(2)} ≈ {p.lawnArea.toFixed(2)} m² (7.G.B.6).</p>
      </MathCheck>
    </div>
  );
}

function Card({ title, color, lines }: { title: string; color: string; lines: string[] }) {
  return (<div className="rounded-xl border-2 px-4 py-3" style={{ borderColor: color }}>
    <div className="text-xs font-bold uppercase" style={{ color }}>{title}</div>
    <div className="font-mono text-base font-black">{lines[0]}</div>
    {lines.slice(1).map((line, i) => <div key={i} className="text-xs text-[var(--ink-soft)]">{line}</div>)}
  </div>);
}

function Stepper({ label, value, min, max, step = 1, color, onChange }: { label: string; value: number; min: number; max: number; step?: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-12 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
