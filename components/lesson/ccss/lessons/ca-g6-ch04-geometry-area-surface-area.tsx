"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const BASE_FILL = "var(--band-upper)"; // top and bottom faces: length x width
const FRONT_FILL = "var(--band-middle)"; // front and back faces: length x height
const SIDE_FILL = "var(--band-high)"; // left and right faces: width x height

type Pt = [number, number];
const pts = (poly: Pt[]) => poly.map(([x, y]) => `${x},${y}`).join(" ");

const EIGHTHS: Record<number, string> = { 1: "⅛", 2: "¼", 3: "⅜", 4: "½", 5: "⅝", 6: "¾", 7: "⅞" };

/** Writes a multiple of one eighth as a whole or mixed number: 2.5 becomes "2½". */
export function mixed(value: number): string {
  const eighths = Math.round(value * 8);
  const whole = Math.floor(eighths / 8);
  const rest = eighths - whole * 8;
  if (rest === 0) return String(whole);
  return `${whole === 0 ? "" : whole}${EIGHTHS[rest]}`;
}

/** "1 unit" but "1½ units" and "6 units": the noun is singular only at exactly one. */
export function amount(value: number, noun: string): string {
  return `${mixed(value)} ${value === 1 ? noun : `${noun}s`}`;
}

// --- the box --------------------------------------------------------------
/** Edges are counted in half-units, so L = 5 means a length of 2½ units. */
export const EDGES = { L: [2, 10], W: [2, 8], H: [2, 6] } as const;

export function boxFacts(L: number, W: number, H: number) {
  const l = L / 2, w = W / 2, h = H / 2;
  const base = l * w, front = l * h, side = w * h;
  // layerCubes: half-unit cubes in one layer; cubes: half-unit cubes in the whole box, eight to a cubic unit.
  return { l, w, h, base, front, side, surface: 2 * base + 2 * front + 2 * side, layerCubes: L * W, layers: H, cubes: L * W * H, volume: (L * W * H) / 8 };
}

// --- the net --------------------------------------------------------------
export const NET_S = 12; // px per half-unit
export const NET_PAD = 12; // keeps the widest net clear of the viewBox edge
export const NET_W = (2 * EDGES.W[1] + EDGES.L[1]) * NET_S + 2 * NET_PAD;
export const NET_H = (2 * EDGES.W[1] + 2 * EDGES.H[1]) * NET_S + 2 * NET_PAD;

export type Face = { key: string; x: number; y: number; w: number; h: number; fill: string; area: number };

/** The cross net, centered inside a viewBox sized for the largest reachable box. */
export function netLayout(L: number, W: number, H: number) {
  const f = boxFacts(L, W, H);
  const ox = (NET_W - (2 * W + L) * NET_S) / 2, oy = (NET_H - (2 * W + 2 * H) * NET_S) / 2;
  const at = (key: string, gx: number, gy: number, gw: number, gh: number, fill: string, area: number): Face => ({ key, x: ox + gx * NET_S, y: oy + gy * NET_S, w: gw * NET_S, h: gh * NET_S, fill, area });
  const faces: Face[] = [
    at("top", W, 0, L, W, BASE_FILL, f.base),
    at("left", 0, W, W, H, SIDE_FILL, f.side),
    at("front", W, W, L, H, FRONT_FILL, f.front),
    at("right", W + L, W, W, H, SIDE_FILL, f.side),
    at("bottom", W, W + H, L, W, BASE_FILL, f.base),
    at("back", W, 2 * W + H, L, H, FRONT_FILL, f.front),
  ];
  const p = (gx: number, gy: number): Pt => [ox + gx * NET_S, oy + gy * NET_S];
  const outline: Pt[] = [p(W, 0), p(W + L, 0), p(W + L, W), p(2 * W + L, W), p(2 * W + L, W + H), p(W + L, W + H), p(W + L, 2 * W + 2 * H), p(W, 2 * W + 2 * H), p(W, W + H), p(0, W + H), p(0, W), p(W, W)];
  return { faces, bottom: faces[4], outline };
}

// --- worked example: an L-shaped plot on the coordinate plane -------------
export const PLOT = { x0: 2, y0: 1, x1: 10, y1: 6, cutX: 5, cutY: 3 } as const;
export const GRID = { cols: 12, rows: 7, cell: 20, pad: 26 } as const;
export const PLOT_W = GRID.cols * GRID.cell + 2 * GRID.pad, PLOT_H = GRID.rows * GRID.cell + 2 * GRID.pad;
export const gx = (x: number) => GRID.pad + x * GRID.cell;
export const gy = (y: number) => GRID.pad + (GRID.rows - y) * GRID.cell;

export function plotPieces() {
  // Every length is a difference of coordinates, so the plot needs no ruler.
  const wide = PLOT.x1 - PLOT.x0, tall = PLOT.y1 - PLOT.y0;
  const lowerTall = PLOT.cutY - PLOT.y0, upperWide = PLOT.cutX - PLOT.x0, upperTall = PLOT.y1 - PLOT.cutY, missingWide = PLOT.x1 - PLOT.cutX;
  const lower = wide * lowerTall, upper = upperWide * upperTall, whole = wide * tall, missing = missingWide * upperTall;
  return { wide, tall, lowerTall, upperWide, upperTall, missingWide, lower, upper, total: lower + upper, whole, missing, remaining: whole - missing };
}

/** The six corners, in order round the plot, each with the offset its coordinate label is drawn at. */
export const PLOT_CORNERS: { at: Pt; dx: number; dy: number; anchor: "start" | "end" }[] = [
  { at: [PLOT.x0, PLOT.y0], dx: -6, dy: 13, anchor: "end" }, { at: [PLOT.x1, PLOT.y0], dx: 6, dy: 13, anchor: "start" },
  { at: [PLOT.x1, PLOT.cutY], dx: 6, dy: 4, anchor: "start" }, { at: [PLOT.cutX, PLOT.cutY], dx: 5, dy: 13, anchor: "start" },
  { at: [PLOT.cutX, PLOT.y1], dx: 6, dy: -6, anchor: "start" }, { at: [PLOT.x0, PLOT.y1], dx: -6, dy: -6, anchor: "end" },
];

/** The four reveal steps of the worked example; every number is read off the computed pieces. */
export function plotSteps() {
  const plot = plotPieces();
  return [
    { title: "Read the sides off the coordinates", text: `The bottom edge joins (${PLOT.x0}, ${PLOT.y0}) and (${PLOT.x1}, ${PLOT.y0}). Both corners have the same second coordinate, so that edge is horizontal and ${PLOT.x1} − ${PLOT.x0} = ${plot.wide} units long. The left edge joins (${PLOT.x0}, ${PLOT.y0}) and (${PLOT.x0}, ${PLOT.y1}), so it is ${PLOT.y1} − ${PLOT.y0} = ${plot.tall} units.` },
    { title: "Cut the plot into rectangles", text: `Slice straight across at y = ${PLOT.cutY}. Below the cut is a rectangle ${plot.wide} wide and ${plot.lowerTall} tall; above it is one ${plot.upperWide} wide and ${plot.upperTall} tall.` },
    { title: "Measure the pieces and add", text: `${plot.wide} × ${plot.lowerTall} = ${plot.lower} and ${plot.upperWide} × ${plot.upperTall} = ${plot.upper}, so the plot covers ${plot.lower} + ${plot.upper} = ${plot.total} square units.` },
    { title: "Check it a second way", text: `Fill in the missing corner instead. The full rectangle is ${plot.wide} × ${plot.tall} = ${plot.whole}, the corner you added is ${plot.missingWide} × ${plot.upperTall} = ${plot.missing}, and ${plot.whole} − ${plot.missing} = ${plot.remaining}. The same number, found by subtracting instead of adding.` },
  ];
}

/** The plot figure's accessible name: each clause appears exactly at the step that draws those marks — the cut and its
 *  two rectangles at step 2, the two area numerals at step 3, the outlined missing corner and its numeral at step 4. */
export function plotAriaLabel(step: number): string {
  const plot = plotPieces();
  const corners = PLOT_CORNERS.map(({ at: [x, y] }) => `(${x}, ${y})`).join(", ");
  const cut = step >= 2 ? `, cut at y = ${PLOT.cutY} into rectangles ${plot.wide} by ${plot.lowerTall} and ${plot.upperWide} by ${plot.upperTall}` : "";
  const numerals = step >= 3 ? `, labeled ${plot.lower} and ${plot.upper} square units` : "";
  const corner = step >= 4 ? `, with the missing corner ${plot.missingWide} by ${plot.upperTall} outlined and labeled ${plot.missing}` : "";
  return `L-shaped plot on a coordinate grid with corners at ${corners}${cut}${numerals}${corner}`;
}

// --- try it: wrapping a gift box ------------------------------------------
export const GIFT = { l: 4, w: 3, h: 2 } as const;

export function giftChoices() {
  const { l, w, h } = GIFT;
  const threeFaces = l * w + l * h + w * h, surface = 2 * threeFaces, volume = l * w * h, edges = 4 * (l + w + h);
  const choices = [threeFaces, surface, volume, edges];
  return { threeFaces, surface, volume, edges, choices, correct: choices.indexOf(surface) };
}

/** Feedback keyed by the number the student tapped, so it cannot drift out of step with the button order. */
export function giftNotes(): Record<number, string> {
  const { l, w, h } = GIFT;
  const gift = giftChoices();
  return {
    [gift.threeFaces]: `${gift.threeFaces} counts only three faces, ${l * w} + ${l * h} + ${w * h}. Every face has a matching partner on the opposite side, so double it.`,
    [gift.surface]: `The three pairs are 2 × ${l * w} = ${2 * l * w}, 2 × ${l * h} = ${2 * l * h} and 2 × ${w * h} = ${2 * w * h}, and they add to ${gift.surface} square inches.`,
    [gift.volume]: `${gift.volume} is the volume, ${l} × ${w} × ${h} — how much fits inside, not how much covers the outside.`,
    [gift.edges]: `${gift.edges} inches is the total length of the twelve edges, 4 × (${l} + ${w} + ${h}). That is a length, not an area.`,
  };
}

export default function Lesson() {
  const [L, setL] = useState(6); // 3 units long
  const [W, setW] = useState(4); // 2 units wide
  const [H, setH] = useState(3); // 1½ units tall
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const box = boxFacts(L, W, H), net = netLayout(L, W, H);
  const netLabel = `Unfolded net of a box ${mixed(box.l)} by ${mixed(box.w)} by ${mixed(box.h)} units: six rectangles labeled with their areas, with the bottom face divided into half-unit squares`;

  const plot = plotPieces();
  const steps = plotSteps();
  const revealed = step > 0;
  const plotLabel = plotAriaLabel(step);

  const gift = giftChoices();
  const notes = giftNotes();

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A cereal box on the kitchen counter can be measured three different ways, and each answer means something different. How much counter it takes up
        is <strong>area</strong>. How much cardboard was printed, cut and folded to make it is <strong>surface area</strong>. How much cereal it holds is{" "}
        <strong>volume</strong>. One box, three questions, three units: square, square, cubic.
      </p>
      <p>
        Every answer in this chapter comes from the same move: <strong>break the shape into pieces you can already count</strong>. A flat shape breaks into
        rectangles. A box breaks into six flat faces, or into a stack of small cubes. Count the pieces, add them up, and label the answer with the right unit.
      </p>

      <Figure caption="Change any edge by half a unit. The six faces of the unfolded box and the cubes that pack it both update.">
        <div className="flex flex-col items-center gap-5">
          <svg width={NET_W} height={NET_H} viewBox={`0 0 ${NET_W} ${NET_H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={netLabel}>
            {net.faces.map((f) => <rect key={f.key} x={f.x} y={f.y} width={f.w} height={f.h} fill={f.fill} fillOpacity={0.4} stroke="var(--ink-soft)" strokeWidth={1} strokeDasharray="3 2" />)}
            {Array.from({ length: L - 1 }, (_, i) => <line key={`v${i}`} x1={net.bottom.x + (i + 1) * NET_S} y1={net.bottom.y} x2={net.bottom.x + (i + 1) * NET_S} y2={net.bottom.y + net.bottom.h} stroke="var(--ink)" strokeWidth={0.5} opacity={0.5} />)}
            {Array.from({ length: W - 1 }, (_, j) => <line key={`h${j}`} x1={net.bottom.x} y1={net.bottom.y + (j + 1) * NET_S} x2={net.bottom.x + net.bottom.w} y2={net.bottom.y + (j + 1) * NET_S} stroke="var(--ink)" strokeWidth={0.5} opacity={0.5} />)}
            <polygon points={pts(net.outline)} fill="none" stroke="var(--ink)" strokeWidth={2} />
            {net.faces.map((f) => <text key={`t${f.key}`} x={f.x + f.w / 2} y={f.y + f.h / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="var(--ink)" fontFamily="var(--font-mono)">{mixed(f.area)}</text>)}
          </svg>

          <div className="w-full max-w-xl space-y-2 rounded-xl bg-[var(--surface-2)] px-5 py-3 text-[15px]">
            <p className="m-0">This box is {amount(box.l, "unit")} long, {amount(box.w, "unit")} wide and {amount(box.h, "unit")} tall.</p>
            <p className="m-0">
              <strong style={{ color: BASE_FILL }}>Six faces, three pairs.</strong> Top and bottom are {mixed(box.l)} × {mixed(box.w)} = {mixed(box.base)} each, front and back are {mixed(box.l)} × {mixed(box.h)} = {mixed(box.front)} each, the two sides are {mixed(box.w)} × {mixed(box.h)} = {mixed(box.side)} each.
              Together: 2 × {mixed(box.base)} + 2 × {mixed(box.front)} + 2 × {mixed(box.side)} = <strong>{amount(box.surface, "square unit")}</strong> of cardboard.
            </p>
            <p className="m-0">
              <strong style={{ color: SIDE_FILL }}>Cubes inside.</strong> The grid on the bottom face is one layer of half-unit cubes, {L} across by {W} deep, so {L} × {W} = {box.layerCubes} cubes. The box is {box.layers} such layers tall, so it packs {box.cubes} of them.
              Eight half-unit cubes make one cubic unit, so the volume is {box.cubes} ÷ 8 = <strong>{amount(box.volume, "cubic unit")}</strong> — exactly {mixed(box.l)} × {mixed(box.w)} × {mixed(box.h)}.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Length" value={L} min={2} max={10} display={mixed(L / 2)} onChange={setL} />
            <Stepper label="Width" value={W} min={2} max={8} display={mixed(W / 2)} onChange={setW} />
            <Stepper label="Height" value={H} min={2} max={6} display={mixed(H / 2)} onChange={setH} />
          </div>
          <p className="m-0 text-center text-xs text-[var(--ink-faint)]">Each click changes that edge by half a unit.</p>
        </div>
      </Figure>

      <h2>Worked example: an L-shaped plot</h2>
      <p>
        A community garden marks out an L-shaped plot on a map grid. Its corners are at {PLOT_CORNERS.map(({ at: [x, y] }) => `(${x}, ${y})`).join(", ")}.
        Nobody measured it with a tape — every side length is already hiding in the coordinates. Reveal the reasoning one step at a time.
      </p>
      <div className="card my-4 flex flex-col items-center gap-4 p-4 sm:p-6">
        <svg width={PLOT_W} height={PLOT_H} viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={plotLabel}>
          {Array.from({ length: GRID.cols + 1 }, (_, i) => <line key={`gx${i}`} x1={gx(i)} y1={gy(0)} x2={gx(i)} y2={gy(GRID.rows)} stroke="var(--line)" strokeWidth={1} />)}
          {Array.from({ length: GRID.rows + 1 }, (_, j) => <line key={`gy${j}`} x1={gx(0)} y1={gy(j)} x2={gx(GRID.cols)} y2={gy(j)} stroke="var(--line)" strokeWidth={1} />)}
          {Array.from({ length: GRID.cols / 2 + 1 }, (_, i) => <text key={`lx${i}`} x={gx(i * 2)} y={gy(0) + 14} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{i * 2}</text>)}
          {Array.from({ length: 4 }, (_, j) => <text key={`ly${j}`} x={gx(0) - 7} y={gy(j * 2) + 3} textAnchor="end" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{j * 2}</text>)}
          <line x1={gx(0)} y1={gy(0)} x2={gx(GRID.cols)} y2={gy(0)} stroke="var(--ink-soft)" strokeWidth={1.5} />
          <line x1={gx(0)} y1={gy(0)} x2={gx(0)} y2={gy(GRID.rows)} stroke="var(--ink-soft)" strokeWidth={1.5} />
          {step >= 4 && <rect x={gx(PLOT.cutX)} y={gy(PLOT.y1)} width={plot.missingWide * GRID.cell} height={plot.upperTall * GRID.cell} fill={ACCENT} fillOpacity={0.12} stroke={ACCENT} strokeWidth={1.5} strokeDasharray="5 3" />}
          {step >= 2 && <rect x={gx(PLOT.x0)} y={gy(PLOT.cutY)} width={plot.wide * GRID.cell} height={plot.lowerTall * GRID.cell} fill={BASE_FILL} fillOpacity={0.45} />}
          {step >= 2 && <rect x={gx(PLOT.x0)} y={gy(PLOT.y1)} width={plot.upperWide * GRID.cell} height={plot.upperTall * GRID.cell} fill={SIDE_FILL} fillOpacity={0.45} />}
          <polygon points={pts(PLOT_CORNERS.map(({ at: [x, y] }) => [gx(x), gy(y)] as Pt))} fill={step >= 2 ? "none" : ACCENT} fillOpacity={0.25} stroke="var(--ink)" strokeWidth={2} />
          {step >= 2 && <line x1={gx(PLOT.x0)} y1={gy(PLOT.cutY)} x2={gx(PLOT.x1)} y2={gy(PLOT.cutY)} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="4 3" />}
          {step >= 3 && <text x={gx((PLOT.x0 + PLOT.x1) / 2)} y={gy((PLOT.y0 + PLOT.cutY) / 2) + 4} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--ink)" fontFamily="var(--font-mono)">{plot.lower}</text>}
          {step >= 3 && <text x={gx((PLOT.x0 + PLOT.cutX) / 2)} y={gy((PLOT.cutY + PLOT.y1) / 2) + 4} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--ink)" fontFamily="var(--font-mono)">{plot.upper}</text>}
          {step >= 4 && <text x={gx((PLOT.cutX + PLOT.x1) / 2)} y={gy((PLOT.cutY + PLOT.y1) / 2) + 4} textAnchor="middle" fontSize={13} fontWeight={800} fill={ACCENT} fontFamily="var(--font-mono)">{plot.missing}</text>}
          {PLOT_CORNERS.map(({ at: [x, y], dx, dy, anchor }) => <text key={`c${x}-${y}`} x={gx(x) + dx} y={gy(y) + dy} textAnchor={anchor} fontSize={9} fontWeight={700} fill="var(--ink-soft)" fontFamily="var(--font-mono)">({x}, {y})</text>)}
        </svg>
        <ol id={stepsId} className="m-0 w-full max-w-lg list-none space-y-2 p-0" aria-live="polite">
          {steps.slice(0, step).map((s, i) => (
            <li key={s.title} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-[15px]">
              <span className="chip mr-2">Step {i + 1}</span><strong>{s.title}.</strong> {s.text}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => setStep((s) => Math.min(steps.length, s + 1))} disabled={step >= steps.length} aria-expanded={revealed} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>{step === 0 ? "Show the first step" : step < steps.length ? "Next step" : `All ${steps.length} steps shown`}</button>
          <button type="button" onClick={() => setStep(0)} disabled={step === 0} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>
        You are wrapping a gift box that measures {GIFT.l} inches by {GIFT.w} inches by {GIFT.h} inches. How many square inches of paper cover the outside exactly, with none left over?
      </p>
      <div className="card my-4 flex flex-col items-center gap-3 p-4">
        <div className="flex flex-wrap justify-center gap-2">
          {gift.choices.map((c, i) => (
            <button key={c} type="button" onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-4 py-2 font-mono text-sm font-bold" style={pick === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{c}</button>
          ))}
        </div>
        {pick !== null && (
          <p role="status" className="m-0 text-center text-[15px]" style={{ color: pick === gift.correct ? "var(--band-upper)" : "var(--band-early)" }}><strong>{pick === gift.correct ? "Correct." : "Not quite."}</strong> {notes[gift.choices[pick]]}</p>
        )}
      </div>

      <h2>Where this chapter goes</h2>
      <p>
        The four lessons after this one take the pieces apart one at a time. <strong>Area of Triangles</strong> shows why a triangle is exactly half of a
        rectangle, which is what lets you cut up shapes with slanted sides. <strong>Volume with Fractional Edges</strong> works through the cube-packing
        argument in full, so half-unit and third-unit edges stop being scary. <strong>Polygons on the Coordinate Plane</strong> is the plot above, generalized:
        plot the corners, subtract the coordinates, read the sides. And <strong>Surface Area with Nets</strong> folds and unfolds boxes and prisms until the
        six-faces-in-three-pairs pattern is automatic.
      </p>

      <MathCheck>
        <p>
          Cutting a flat shape into pieces never changes how much surface it covers, so the pieces&rsquo; areas add back to the whole (6.G.A.1). The plot came
          out at {plot.lower} + {plot.upper} = {plot.total} square units by adding two rectangles, and {plot.whole} − {plot.missing} = {plot.remaining} by
          filling in the missing corner and then taking it away again — two decompositions, one area. Those side lengths came from the corners: when a side
          joins two corners that share a second coordinate, that side is horizontal and its length is the difference of their first coordinates,{" "}
          {PLOT.x1} − {PLOT.x0} = {plot.wide} (6.G.A.3). A <strong>net</strong> unfolds a box into its six rectangular faces, so the surface area is nothing more than their total,{" "}
          {amount(box.surface, "square unit")} here (6.G.A.4). And <strong>volume</strong> stays length × width × height even when the edges are fractions,
          because cubes half a unit on each side pack the box with none left over: {L} along the length, {W} along the width and {H} up the height make{" "}
          {L} × {W} × {H} = {box.cubes} cubes of ⅛ cubic unit each, which is {amount(box.volume, "cubic unit")} — the same answer multiplying{" "}
          {mixed(box.l)} × {mixed(box.w)} × {mixed(box.h)} gives (6.G.A.2).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, display, onChange }: { label: string; value: number; min: number; max: number; display: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-10 text-center text-2xl font-black tabular-nums">{display}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
