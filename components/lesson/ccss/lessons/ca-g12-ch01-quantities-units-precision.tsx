"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

/* Every length here is a whole number of millimeters and every area a whole number of square
   millimeters, so nothing the figure prints depends on binary floating point. */
export const MM_PER_M = 1000, MM2_PER_M2 = 1_000_000, MAX_DECIMALS = 3, TENTH_MM = 100;
export const L_MIN = 12, L_MAX = 40, L_STEP = 2; // plot length, in tenths of a meter
export const W_MIN = 6, W_MAX = 24, W_STEP = 2; // plot width, in tenths of a meter
export const PLACE_NAMES = ["ones", "tenths", "hundredths", "thousandths", "ten-thousandths"];

/** Half-up rounding of n / d for whole n >= 0 and d > 0, without floating point. */
export function roundDiv(n: number, d: number): number { return Math.floor((2 * n + d) / (2 * d)); }

/** Places the decimal point in an already-scaled whole number: (3607, 2) reads "36.07". */
export function writeDecimal(scaled: number, decimals: number): string { return decimals <= 0 ? String(scaled) : `${Math.floor(scaled / 10 ** decimals)}.${String(scaled % 10 ** decimals).padStart(decimals, "0")}`; }

/** A count of sub-units (mm, or mm squared) written as a decimal number of whole units. */
export function fixed(count: number, perWhole: number, decimals: number): string { return writeDecimal(roundDiv(count * 10 ** decimals, perWhole), decimals); }

/** The same count rounded outward to a SCALED WHOLE NUMBER, so the printed interval always contains the exact one and the width
 *  the page prints is exactly its own two printed ends' difference. */
export function outwardScaled(count: number, perWhole: number, decimals: number, dir: "down" | "up"): number {
  const exact = (count * 10 ** decimals) / perWhole; return dir === "down" ? Math.floor(exact) : Math.ceil(exact);
}

/** Accuracy is relative, not absolute, so a doubt band fixes not a COUNT of decimals but a PLACE: the first place whose single step
 *  is no wider than the band. One place coarser, a step is wider than the whole band; one place finer, the band runs through all ten
 *  digits. Stopping there is the significant-figure rule, read off the measurement. */
export function firstDoubtfulPlace(bandWidth: number, perWhole: number): number {
  for (let d = 0; d <= MAX_DECIMALS; d += 1) if (perWhole <= bandWidth * 10 ** d) return d;
  return MAX_DECIMALS;
}

/** Significant digits of a written decimal: leading zeros do not count, trailing ones do. */
export function significantDigits(text: string): number { return text.replace(".", "").replace(/^0+/, "").length; }

export type ToolKey = "tape" | "laser";
export type Tool = { key: ToolKey; name: string; division: string; halfMm: number; decimals: number; edgeDecimals: number };
export type QuantityKey = "area" | "perimeter";
export type Quantity = {
  key: QuantityKey; noun: string; formula: string; unit: string; unitStory: string; sold: string; perWhole: number; exactDecimals: number;
  intervalDecimals: number; value: number; lo: number; hi: number; band: number; place: number; placeName: string; nextPlaceName: string;
  sigFigs: number; step: string; coarserStep: string; finerStep: string; exact: string; loText: string; hiText: string; bandText: string;
  reported: string; metric: number; metricUnit: string; factor: string;
};

/** Two tools, each trustworthy to half of its smallest division. */
export const TOOLS: Tool[] = [
  { key: "tape", name: "tape marked in tenths", division: "0.1 m", halfMm: 50, decimals: 1, edgeDecimals: 2 },
  { key: "laser", name: "laser measure", division: "0.01 m", halfMm: 5, decimals: 2, edgeDecimals: 3 },
];

export function tool(key: ToolKey): Tool { return TOOLS.find((candidate) => candidate.key === key) ?? TOOLS[0]; }

/** The quantity, the interval the reading allows, and where that interval stops the number. */
export function quantity(key: QuantityKey, lengthMm: number, widthMm: number, halfMm: number): Quantity {
  const isArea = key === "area", value = isArea ? lengthMm * widthMm : 2 * (lengthMm + widthMm);
  const lo = isArea ? (lengthMm - halfMm) * (widthMm - halfMm) : value - 4 * halfMm;
  const hi = isArea ? (lengthMm + halfMm) * (widthMm + halfMm) : value + 4 * halfMm;
  const perWhole = isArea ? MM2_PER_M2 : MM_PER_M, band = hi - lo, place = firstDoubtfulPlace(band, perWhole);
  const intervalDecimals = place + 1, exactDecimals = 2, reported = fixed(value, perWhole, place);
  const stepAt = (d: number) => fixed(perWhole / 10 ** d, perWhole, d);
  const loS = outwardScaled(lo, perWhole, intervalDecimals, "down"), hiS = outwardScaled(hi, perWhole, intervalDecimals, "up");
  return {
    key, perWhole, exactDecimals, intervalDecimals, value, lo, hi, band, place, reported, noun: isArea ? "area" : "perimeter",
    unit: isArea ? "m²" : "m", unitStory: isArea ? "m × m = m²" : "m + m = m", sigFigs: significantDigits(reported),
    placeName: PLACE_NAMES[place], nextPlaceName: PLACE_NAMES[place + 1], step: stepAt(place), coarserStep: stepAt(Math.max(place - 1, 0)), finerStep: stepAt(place + 1),
    formula: isArea ? "area = length × width" : "perimeter = 2 × (length + width)", sold: isArea ? "turf is priced by the square meter" : "edging is priced by the meter",
    exact: fixed(value, perWhole, exactDecimals), loText: writeDecimal(loS, intervalDecimals), hiText: writeDecimal(hiS, intervalDecimals), bandText: writeDecimal(hiS - loS, intervalDecimals),
    metric: isArea ? value / 100 : value / 10, metricUnit: isArea ? "cm²" : "cm", factor: isArea ? "(100 cm / 1 m)²" : "(100 cm / 1 m)",
  };
}

export const SVG_W = 372, SVG_H = 236;
export const ORIGIN_X = 64, ORIGIN_Y = 26, PX_PER_M = 72, LABEL_DROP = 24, LABEL_GAP = 10, MIN_BAND_HALF_PX = 7;
export type Box = { x: number; y: number; w: number; h: number };
export type Layout = { outer: Box; measured: Box; inner: Box; grid: { x: number[]; y: number[] }; bandPx: number; exaggeration: number; lengthLabelX: number; lengthLabelY: number; widthLabelX: number; widthLabelY: number };

/** The laser's half-division is 0.005 m, which here is a third of a pixel — thinner than the line drawing the plot, so at true
 *  scale its band would vanish. This is the smallest whole factor lifting it to 3.5 px; 1 means the band is already true to scale. */
export function bandExaggeration(halfMm: number): number {
  for (let f = 1; f <= 100; f += 1) if (2 * f * halfMm * PX_PER_M >= MIN_BAND_HALF_PX * MM_PER_M) return f;
  return 100;
}

/** Millimeters to pixels through one scale, with the doubt band widened only when it must be. */
export function layout(lengthMm: number, widthMm: number, halfMm: number): Layout {
  const px = (mm: number) => (mm / MM_PER_M) * PX_PER_M, exaggeration = bandExaggeration(halfMm);
  const w = px(lengthMm), h = px(widthMm), d = px(halfMm) * exaggeration;
  const grid = { x: [] as number[], y: [] as number[] };
  for (let k = 1; k * PX_PER_M < w; k += 1) grid.x.push(ORIGIN_X + k * PX_PER_M);
  for (let k = 1; k * PX_PER_M < h; k += 1) grid.y.push(ORIGIN_Y + k * PX_PER_M);
  return {
    grid, bandPx: d, exaggeration, measured: { x: ORIGIN_X, y: ORIGIN_Y, w, h }, lengthLabelX: ORIGIN_X + w / 2, lengthLabelY: ORIGIN_Y + h + LABEL_DROP,
    outer: { x: ORIGIN_X - d, y: ORIGIN_Y - d, w: w + 2 * d, h: h + 2 * d }, inner: { x: ORIGIN_X + d, y: ORIGIN_Y + d, w: w - 2 * d, h: h - 2 * d }, widthLabelX: ORIGIN_X - d - LABEL_GAP, widthLabelY: ORIGIN_Y + h / 2 + 4,
  };
}

/** How the drawn doubt band relates to the drawn plot, in words that are true in every state. */
export function bandScaleNote(exaggeration: number): string {
  return exaggeration === 1 ? "drawn at the same scale as the plot" : `drawn ${exaggeration} times wider than the plot's scale, because at true scale this band would be thinner than the line`;
}

export function figureLabel(lengthMm: number, widthMm: number, t: Tool, q: Quantity, exaggeration: number): string {
  const edge = (mm: number) => fixed(mm, MM_PER_M, t.edgeDecimals);
  return `Scale drawing of a plot recorded as ${fixed(lengthMm, MM_PER_M, t.decimals)} m by ${fixed(widthMm, MM_PER_M, t.decimals)} m with the ${t.name}, which reads to the nearest ${t.division}. Two dashed rectangles mark the smallest and largest plots that reading allows, from ${edge(lengthMm - t.halfMm)} m by ${edge(widthMm - t.halfMm)} m up to ${edge(lengthMm + t.halfMm)} m by ${edge(widthMm + t.halfMm)} m, ${bandScaleNote(exaggeration)}. The ${q.noun} is highlighted: ${q.exact} ${q.unit} as computed, and in truth between ${q.loText} and ${q.hiText} ${q.unit} — a band ${q.bandText} ${q.unit} wide, which stops the honest answer at ${q.reported} ${q.unit}.`;
}

/* Worked example: a van logs fuel and distance, and the fleet reports liters per 100 km. */
export const FUEL_ML = 46_000, FUEL_HALF_ML = 50; // the pump reads to the nearest 0.1 L
export const TRIP_M = 512_000, TRIP_HALF_M = 500; // the odometer reads to the nearest km
export const PER_KM = 100;

export function fuelExample() {
  const nominal = (PER_KM * FUEL_ML) / TRIP_M;
  const low = (PER_KM * (FUEL_ML - FUEL_HALF_ML)) / (TRIP_M + TRIP_HALF_M);
  const high = (PER_KM * (FUEL_ML + FUEL_HALF_ML)) / (TRIP_M - TRIP_HALF_M);
  const band = high - low, place = firstDoubtfulPlace(band, 1), reported = nominal.toFixed(place);
  return {
    nominal, low, high, band, place, reported, sigFigs: significantDigits(reported), placeName: PLACE_NAMES[place], perKm: FUEL_ML / TRIP_M,
    step: (10 ** -place).toFixed(place), coarserStep: (10 ** -(place - 1)).toFixed(Math.max(place - 1, 0)), tripText: fixed(TRIP_M, MM_PER_M, 0),
    fuelText: fixed(FUEL_ML, MM_PER_M, 1), fuelLoText: fixed(FUEL_ML - FUEL_HALF_ML, MM_PER_M, 2), fuelHiText: fixed(FUEL_ML + FUEL_HALF_ML, MM_PER_M, 2),
    tripLoText: fixed(TRIP_M - TRIP_HALF_M, MM_PER_M, 1), tripHiText: fixed(TRIP_M + TRIP_HALF_M, MM_PER_M, 1),
  };
}

/* Try it: a board read off a ruler marked every 0.1 cm, in thousandths of a centimeter. */
export const READING = 12_400, TICK = 100;

export function tryChoices(): { lo: number; hi: number; why: string }[] {
  return [
    { lo: READING - TICK, hi: READING + TICK, why: "does contain every such board, but it is twice as wide as it needs to be: it spends a whole division on each side, and a reading only promises half a division" },
    { lo: READING - TICK / 2, hi: READING + TICK / 2, why: "correct" },
    { lo: READING - TICK / 20, hi: READING + TICK / 20, why: "belongs to a ruler marked every 0.01 cm, which is finer than the one used" },
    { lo: READING, hi: READING + TICK, why: "assumes the reading always rounds down, but a slightly shorter board reads the same way" },
  ];
}

export function tryAnswerIndex(): number { return tryChoices().findIndex((choice) => choice.hi - choice.lo === TICK && choice.lo + choice.hi === 2 * READING); }

/** Thousandths of a centimeter as a trimmed decimal: 12350 reads "12.35". */
export function cmText(thousandths: number): string {
  const frac = String(thousandths % 1000).padStart(3, "0").replace(/0+$/, "");
  return `${Math.floor(thousandths / 1000)}${frac ? `.${frac}` : ""}`;
}

export default function Lesson() {
  const [lengthT, setLengthT] = useState(24);
  const [widthT, setWidthT] = useState(12);
  const [toolKey, setToolKey] = useState<ToolKey>("tape");
  const [quantityKey, setQuantityKey] = useState<QuantityKey>("area");
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();

  const t = tool(toolKey);
  const lengthMm = lengthT * TENTH_MM, widthMm = widthT * TENTH_MM;
  const q = quantity(quantityKey, lengthMm, widthMm, t.halfMm);
  const box = layout(lengthMm, widthMm, t.halfMm);
  const lengthText = fixed(lengthMm, MM_PER_M, t.decimals), widthText = fixed(widthMm, MM_PER_M, t.decimals);
  const edge = (mm: number) => fixed(mm, MM_PER_M, t.edgeDecimals);

  const ex = fuelExample();
  const steps = [
    <>Decide what to measure. &ldquo;Good mileage&rdquo; is not a quantity; fuel used per distance driven is, and the fleet records it in liters per {PER_KM} kilometers. Naming the quantity and its unit is the first decision, before any arithmetic.</>,
    <>Divide, and read the unit off the division: {ex.fuelText} L ÷ {ex.tripText} km = {ex.perKm.toFixed(8)} L/km. Liters over kilometers is a rate, so the setup itself settles what unit the answer carries.</>,
    <>Scale to {PER_KM} km: {ex.perKm.toFixed(8)} L/km × {PER_KM} km = {ex.nominal.toFixed(6)} L per {PER_KM} km. The kilometers cancel, so what survives is liters — a volume, as it should be.</>,
    <>Now ask what the instruments actually knew. The pump reads to the nearest 0.1 L, so the fuel was between {ex.fuelLoText} and {ex.fuelHiText} L; the odometer reads to the nearest kilometer, so the trip was between {ex.tripLoText} and {ex.tripHiText} km.</>,
    <>Push both to their extremes: the least fuel over the longest trip gives {ex.low.toFixed(4)}, the most fuel over the shortest gives {ex.high.toFixed(4)} — a band about {ex.band.toFixed(4)} L per {PER_KM} km wide. A step of {ex.coarserStep} is wider than that whole band, a step of {ex.step} is not, so the {ex.placeName} digit is the first doubtful one: report <strong>{ex.reported} L per {PER_KM} km</strong>, {ex.sigFigs} significant figures, not {ex.nominal.toFixed(6)}.</>,
  ];

  const choices = tryChoices(), answer = tryAnswerIndex();
  const trySentence = `A ruler marked every ${cmText(TICK)} cm can only say the board is nearer to ${cmText(READING)} cm than to ${cmText(READING - TICK)} or ${cmText(READING + TICK)} cm, so the board is anywhere from ${cmText(READING - TICK / 2)} cm to ${cmText(READING + TICK / 2)} cm.`;

  return (
    <div className="prose-lesson max-w-none">
      <p>A landscaping crew quotes a job from two numbers on a clipboard: a plot measured <strong>{lengthText} m by {widthText} m</strong>. Somebody has to turn that into turf to buy, edging to cut, and a price to charge. The bare numbers cannot do it. Each one carries a unit, and each one came off a tool that can only see so fine.</p>
      <p>That is this chapter in one picture. A quantity is three things at once — a number, a unit, and a level of precision — and all three travel through every calculation you do with it. Multiply two lengths and the units multiply too. Allow each side the half-division of doubt its tool leaves behind and the answer inherits a band instead of a point. How wide that band is <em>compared with the answer itself</em> decides how many digits you get to keep. Change the plot, the tool, and the quantity below, and watch one rectangle answer all three questions at once.</p>

      <Figure caption={`The solid rectangle is what was recorded. The dashed rectangles are the smallest and largest plots that same reading allows, ${bandScaleNote(box.exaggeration)}.`}>
        <div className="flex flex-col items-center gap-5">
          <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(lengthMm, widthMm, t, q, box.exaggeration)}>
            <rect x={box.outer.x} y={box.outer.y} width={box.outer.w} height={box.outer.h} fill={ACCENT} fillOpacity={0.1} stroke={ACCENT} strokeOpacity={0.7} strokeWidth={1} strokeDasharray="4 3" />
            <rect x={box.inner.x} y={box.inner.y} width={box.inner.w} height={box.inner.h} fill="none" stroke={ACCENT} strokeOpacity={0.7} strokeWidth={1} strokeDasharray="4 3" />
            {q.key === "area" && box.grid.x.map((gx) => <line key={`v${gx}`} x1={gx} y1={box.measured.y} x2={gx} y2={box.measured.y + box.measured.h} stroke={ACCENT} strokeOpacity={0.35} strokeWidth={1} />)}
            {q.key === "area" && box.grid.y.map((gy) => <line key={`h${gy}`} x1={box.measured.x} y1={gy} x2={box.measured.x + box.measured.w} y2={gy} stroke={ACCENT} strokeOpacity={0.35} strokeWidth={1} />)}
            <rect x={box.measured.x} y={box.measured.y} width={box.measured.w} height={box.measured.h} fill={ACCENT} fillOpacity={q.key === "area" ? 0.18 : 0} stroke={ACCENT} strokeWidth={q.key === "perimeter" ? 3 : 2} />
            <text x={box.lengthLabelX} y={box.lengthLabelY} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--ink-soft)">{lengthText} m</text>
            <text x={box.widthLabelX} y={box.widthLabelY} textAnchor="end" fontSize={12} fontWeight={700} fill="var(--ink-soft)">{widthText} m</text>
          </svg>
          <div className="flex flex-wrap justify-center gap-2">
            {TOOLS.map((option) => (<button key={option.key} type="button" onClick={() => setToolKey(option.key)} aria-pressed={toolKey === option.key} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={toolKey === option.key ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>read to the nearest {option.division}</button>))}
            {(["area", "perimeter"] as QuantityKey[]).map((key) => (<button key={key} type="button" onClick={() => setQuantityKey(key)} aria-pressed={quantityKey === key} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={quantityKey === key ? { background: "var(--band-middle)", color: "white", borderColor: "var(--band-middle)" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>report the {key}</button>))}
          </div>
          <div className="w-full max-w-xl rounded-2xl border-2 px-5 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">{q.formula}</div>
            <div className="mt-1 font-mono text-lg font-black" style={{ color: ACCENT }}>{q.exact} {q.unit}</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">The units travel with the numbers: {q.unitStory}, so this quantity is {q.key === "area" ? "an amount of surface" : "a distance"}, and {q.sold}.</div>
            <div className="mt-1 font-mono text-xs text-[var(--ink-faint)]">{q.exact} {q.unit} × {q.factor} = {q.metric} {q.metricUnit} — the same quantity, no more precise for having more digits in front of the decimal point.</div>
          </div>
          <div className="w-full max-w-xl rounded-xl bg-[var(--surface-2)] px-5 py-3 text-center text-[15px]">
            <div>Read to the nearest {t.division}, each side is known only within half a division: the length lies between <strong>{edge(lengthMm - t.halfMm)} m</strong> and <strong>{edge(lengthMm + t.halfMm)} m</strong>, the width between <strong>{edge(widthMm - t.halfMm)} m</strong> and <strong>{edge(widthMm + t.halfMm)} m</strong>.</div>
            <div className="mt-1">So the true {q.noun} runs from <strong>{q.loText}</strong> to <strong>{q.hiText} {q.unit}</strong> — a band <strong>{q.bandText} {q.unit}</strong> wide. A step of {q.coarserStep} {q.unit} is wider than that whole band, but a step of {q.step} {q.unit} fits inside it, so the {q.placeName} digit is the first doubtful one, and the band by itself runs through all ten digits of the {q.nextPlaceName} place. Stop the number there: <strong style={{ color: ACCENT }}>{q.reported} {q.unit}</strong>, {q.sigFigs} significant {q.sigFigs === 1 ? "figure" : "figures"}.</div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Plot length" value={lengthT} display={`${lengthText} m`} min={L_MIN} max={L_MAX} step={L_STEP} onChange={setLengthT} />
            <Stepper label="Plot width" value={widthT} display={`${widthText} m`} min={W_MIN} max={W_MAX} step={W_STEP} onChange={setWidthT} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: liters per {PER_KM} kilometers</h2>
      <p>A delivery van comes back from a run. The pump shows {ex.fuelText} L and the odometer shows {ex.tripText} km. How much fuel does the van use, and how much of that answer can you defend?</p>
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
      <p>A board is reported as {cmText(READING)} cm, measured on a ruler marked every {cmText(TICK)} cm. Which interval is exactly the set of board lengths that could have produced that reading — no wider, no narrower?</p>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice, i) => (<button key={i} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={picked === i ? { background: i === answer ? "var(--band-upper)" : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{cmText(choice.lo)} to {cmText(choice.hi)} cm</button>))}
      </div>
      {picked !== null && <p className="mt-3 text-[15px]">{picked === answer ? `Right. ${trySentence}` : `Not quite — that interval ${choices[picked].why}. ${trySentence}`}</p>}

      <h2>Where this chapter goes next</h2>
      <p><strong>Units Guide the Math</strong>{" "}takes the unit bookkeeping you just did by eye and turns it into a method. Instead of checking after the fact that m × m came out as m², you chain fractions that are equal to 1 — 5280 ft over 1 mi, 1 hr over 3600 s — until the units you do not want cancel and only the ones you asked for survive. That lesson also returns to the question this opener leaves you with: once the conversion is finished, which of the digits on the screen did the measurement pay for?</p>

      <MathCheck>
        <p>Units are part of the arithmetic, not a label added afterwards: multiplying {lengthText} m by {widthText} m multiplies the units too,{" "}
          {q.key === "area" ? "m × m = m²" : "while adding two lengths leaves m + m = m"}, which is why this plot has an area in square meters and a perimeter in plain meters — and why converting by {q.factor} restates it as {q.metric} {q.metricUnit} without changing the quantity at all (N-Q.1). Which of the two you compute is a modeling choice made before any calculating, because {q.sold} (N-Q.2).</p>
        <p>Finally, {q.exact} {q.unit} is a point, but the measurement is a band. Read to the nearest {t.division}, each side is known only within {fixed(t.halfMm, MM_PER_M, t.edgeDecimals)} m — the dashed rectangles are the extreme plots that reading allows — so the true {q.noun} runs from {q.loText} to {q.hiText} {q.unit}, a band {q.bandText} {q.unit} wide. Accuracy is relative, not absolute, so what that band settles is not a count of decimals but a <em>place</em>: one step of {q.coarserStep} {q.unit} is wider than the entire band, while one step of {q.step} {q.unit} fits inside it, which makes the {q.placeName} digit the first doubtful one. Keeping the digits down to there and no further gives {q.reported} {q.unit} — {q.sigFigs} significant {q.sigFigs === 1 ? "figure" : "figures"} — a value the band really does allow, unlike the {q.nextPlaceName} digit, where the band alone covers every value from 0 to 9. Digits past the last significant one were produced by the multiplication, not by the plot (N-Q.3).</p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, display, min, max, step, onChange }: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-20 text-center text-xl font-black tabular-nums" style={{ color: ACCENT }}>{display}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
