"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

export const ACCENT = "var(--band-middle)";
export const JUICE = "var(--band-early)";
export const INK = "var(--ink)";
const TINT = "color-mix(in oklab, var(--band-middle) 14%, var(--surface))";

/** Control bounds. The controls below also declare these inline; the test checks they agree. */
export const JUICE_MIN = 1, JUICE_MAX = 6;
export const WATER_MIN = 1, WATER_MAX = 6;
export const BATCH_MIN = 1, BATCH_MAX = 5;

/** Double number line geometry (SVG units). */
export const W = 520, H = 150, PAD = 52, TOP_Y = 48, BOT_Y = 110, MARKER_R = 7, MARKER_STROKE = 2.5;
export const STEPS = BATCH_MAX;
export const tickX = (k: number) => PAD + (k * (W - 2 * PAD)) / STEPS;

export type Fraction = { num: number; den: number };

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const reduce = (num: number, den: number): Fraction => { const g = gcd(num, den) || 1; return { num: num / g, den: den / g }; };
export const sameFraction = (p: Fraction, q: Fraction) => p.num === q.num && p.den === q.den;
export const scaleRatio = (a: number, b: number, n: number): [number, number] => [a * n, b * n];
/** The unit rate for `per` of one amount and `of` the other: how much `of` goes with ONE `per`. */
export const unitRate = (per: number, of: number): Fraction => reduce(of, per);
export const percentOfWhole = (part: number, whole: number): Fraction => reduce(100 * part, whole);
/** True when num/den is exactly a decimal with at most `places` digits. */
export const isExactDecimal = (f: Fraction, places: number) => (f.num * 10 ** places) % f.den === 0;
/** Display: integers stay integers; anything else rounds to `places` decimals (no trailing zeros). */
export const fmt = (f: Fraction, places = 1) => (f.num % f.den === 0 ? String(f.num / f.den) : String(Number((f.num / f.den).toFixed(places))));
/** The exact value as a whole number and a fraction, e.g. 100/3 becomes "33 1/3". */
export const mixed = (f: Fraction): string => { if (f.num % f.den === 0) return String(f.num / f.den); const w = Math.floor(f.num / f.den), r = f.num - w * f.den; return w === 0 ? `${r}/${f.den}` : `${w} ${r}/${f.den}`; };
export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
export const cupWord = (f: Fraction) => plural(f.num === f.den ? 1 : 2, "cup");
/** A rounded decimal is never shown bare: marked with a symbol, in words, and with the exact value. */
export const approx = (f: Fraction, places: number) => (isExactDecimal(f, places) ? "" : "≈ ");
export const relate = (f: Fraction, places: number) => (isExactDecimal(f, places) ? "=" : "≈");
export const aboutWord = (f: Fraction, places: number) => (isExactDecimal(f, places) ? "" : "about ");
export const exactNote = (f: Fraction, places: number, unit = "") => (isExactDecimal(f, places) ? "" : ` (exactly ${mixed(f)}${unit})`);
export const figureLabel = (a: number, b: number, n: number) => `Double number line: the marked point at ${n} ${plural(n, "batch", "batches")} lines up ${a * n} ${plural(a * n, "cup")} of juice with ${b * n} ${plural(b * n, "cup")} of water`;

/** Try-it button colours. Both branches keep `--ink` on a tint, so they hold contrast in light and dark. */
export type ChoiceStyle = { background?: string; borderColor: string; color: string };
export function choiceStyle(selected: boolean, isCorrect: boolean): ChoiceStyle {
  const key = isCorrect ? "var(--band-upper)" : "var(--ink-faint)";
  return selected ? { background: `color-mix(in oklab, ${key} 18%, var(--surface))`, borderColor: key, color: "var(--ink)" } : { borderColor: "var(--line)", color: "var(--ink-soft)" };
}

export type Card = { label: string; headline: string; sub: string; color: string };
export type TableRow = { label: string; per: number; color: string; cells: number[] };
export type LineSpec = { label: string; color: string; y: number; per: number; ticks: number[] };
export type TapeCell = { index: number; part: string; color: string };

/**
 * Every number and every sentence the figure shows, derived once from the three controls.
 * The component renders only what this returns, so the test can check the figure's claims.
 */
export function figureState(a: number, b: number, n: number) {
  const [ja, wa] = scaleRatio(a, b, n), whole = a + b, simplest = reduce(a, b);
  /** For the displayed ratio a : b the standard unit rate is a / b; `flip` is the other one, b / a. */
  const rate = unitRate(b, a), flip = unitRate(a, b);
  const pct = percentOfWhole(a, whole), waterPct = percentOfWhole(b, whole);
  const cells = (per: number) => Array.from({ length: STEPS }, (_, i) => per * (i + 1));
  const ticks = (per: number) => Array.from({ length: STEPS + 1 }, (_, k) => per * k);
  const rateText = `${approx(rate, 2)}${fmt(rate, 2)} ${cupWord(rate)} of juice per 1 cup of water`;
  const flipText = `${approx(flip, 2)}${fmt(flip, 2)} ${cupWord(flip)} of water per 1 cup of juice`;
  const rows: TableRow[] = [
    { label: "juice (cups)", per: a, color: JUICE, cells: cells(a) },
    { label: "water (cups)", per: b, color: ACCENT, cells: cells(b) },
    { label: "punch (cups)", per: whole, color: INK, cells: cells(whole) },
  ];
  const cards: Card[] = [
    { label: "Equivalent ratio", color: INK, headline: `${ja} : ${wa}`, sub: `same as ${a} : ${b}${simplest.num !== a ? `, or ${simplest.num} : ${simplest.den}` : ""}` },
    { label: "Unit rate", color: ACCENT, headline: rateText, sub: `${a} ÷ ${b} ${relate(rate, 2)} ${fmt(rate, 2)}${exactNote(rate, 2)}` },
    { label: "Percent juice", color: JUICE, headline: `${approx(pct, 1)}${fmt(pct)}%`, sub: `juice is ${a} of every ${whole} cups, so ${a}/${whole} ${relate(pct, 1)} ${fmt(pct)}/100${exactNote(pct, 1, " per 100")}; water is ${approx(waterPct, 1)}${fmt(waterPct)}%` },
  ];
  const mathCheck = {
    ratio: `A ratio such as ${a} : ${b} says how two amounts go together: ${a} ${plural(a, "cup")} of juice for every ${b} ${plural(b, "cup")} of water (6.RP.A.1).`,
    equivalent: `Multiplying both parts by the same number of batches gives an equivalent ratio, ${ja} : ${wa} at ${n} ${plural(n, "batch", "batches")}, which is why every column of the table and every pair of tick marks on the double number line stay in step (6.RP.A.3).`,
    unitRate: `Dividing instead of multiplying gives a unit rate, and every ratio has two of them: ${a} ÷ ${b} ${relate(rate, 2)} ${fmt(rate, 2)}${exactNote(rate, 2)} gives ${rateText}, and ${b} ÷ ${a} ${relate(flip, 2)} ${fmt(flip, 2)}${exactNote(flip, 2)} gives ${flipText}. For a ratio a : b the standard form is a ÷ b, the first amount per one of the second; that is the rate on the card above, and it is the form the Unit Rate lesson uses (6.RP.A.2).`,
    percent: `A percent is a rate per 100, and it measures the juice against the whole batch instead of against the water: juice is ${a} of every ${whole} cups, so out of 100 cups it is ${aboutWord(pct, 1)}${fmt(pct)}, written ${aboutWord(pct, 1)}${fmt(pct)}%${exactNote(pct, 1, " per 100")} (6.RP.A.3).`,
    tape: `The tape diagram makes that split visible: one batch is cut into ${whole} equal parts and ${a} of them ${a === 1 ? "is" : "are"} juice, so the juice's share of the whole strip is the percent. Scaling multiplies the part and the whole by the same factor, so that share is the same in every batch (6.RP.A.3).`,
  };
  return {
    ja, wa, whole, simplest, rate, flip, pct, waterPct, rows, cards, mathCheck,
    batchCols: Array.from({ length: STEPS }, (_, i) => i + 1),
    recipeLine: `${a} ${plural(a, "cup")} of orange juice for every ${b} ${plural(b, "cup")} of sparkling water`,
    ratioText: `${a} : ${b}`,
    flipNote: `Every ratio has two unit rates: ${rateText}, and, the other way round, ${flipText}.`,
    /** The strip is drawn as `whole` equal cells, the first `a` of them juice, so it really is an equal-part diagram. */
    tapeCells: Array.from({ length: whole }, (_, i): TapeCell => ({ index: i, part: i < a ? "juice" : "water", color: i < a ? JUICE : ACCENT })),
    tapeCaption: `Tape diagram: one whole batch, cut into equal parts, ${a} juice and ${b} water`,
    tapeLabel: `Tape diagram: one batch is cut into ${whole} equal parts, ${a} juice and ${b} water, so the juice fills ${aboutWord(pct, 1)}${fmt(pct)} percent of the strip`,
    lines: [{ label: "juice", color: JUICE, y: TOP_Y, per: a, ticks: ticks(a) }, { label: "water", color: ACCENT, y: BOT_Y, per: b, ticks: ticks(b) }] as LineSpec[],
    markerX: tickX(n), svgLabel: figureLabel(a, b, n),
  };
}

/** Worked example: every number it shows is derived from these three constants. */
export const EXAMPLE = { juice: 2, water: 3, targetJuice: 10 } as const;
export function solveExample(ex: { juice: number; water: number; targetJuice: number } = EXAMPLE) {
  const factor = ex.targetJuice / ex.juice, water = ex.water * factor;
  const total = ex.juice + ex.water, scaledTotal = ex.targetJuice + water;
  return { factor, water, total, scaledTotal, rate: unitRate(ex.juice, ex.water), percent: percentOfWhole(ex.juice, total), scaledPercent: percentOfWhole(ex.targetJuice, scaledTotal) };
}
export function exampleSteps() {
  const ex = solveExample();
  return [
    { title: "Find the scale factor", text: `${EXAMPLE.targetJuice} ÷ ${EXAMPLE.juice} = ${ex.factor}, so the bigger recipe is ${ex.factor} batches of the original.` },
    { title: "Scale the water by the same factor", text: `${EXAMPLE.water} × ${ex.factor} = ${ex.water} cups of water. Both parts were multiplied by ${ex.factor}, so ${EXAMPLE.targetJuice} : ${ex.water} is equivalent to ${EXAMPLE.juice} : ${EXAMPLE.water}.` },
    { title: "Check with the unit rate", text: `${EXAMPLE.water} ÷ ${EXAMPLE.juice} = ${fmt(ex.rate, 2)} cups of water for each cup of juice, and ${fmt(ex.rate, 2)} × ${EXAMPLE.targetJuice} = ${ex.water}. Same answer.` },
    { title: "Find the percent that is juice", text: `One batch is ${EXAMPLE.juice} + ${EXAMPLE.water} = ${ex.total} cups, and ${EXAMPLE.juice}/${ex.total} = ${fmt(ex.percent)}/100, so the punch is ${fmt(ex.percent)}% juice. After scaling, ${EXAMPLE.targetJuice}/${ex.scaledTotal} is still ${fmt(ex.scaledPercent)}%.` },
  ];
}

/** Try it: the correct choice is located by value, never by position. */
export const TRY = { juice: 1, water: 4 } as const;
export const TRY_ANSWER = percentOfWhole(TRY.juice, TRY.juice + TRY.water);
export function tryChoices(): { value: Fraction; text: string; why: string }[] {
  const whole = TRY.juice + TRY.water;
  const choice = (value: Fraction, why: string) => ({ value, text: `${fmt(value)}%`, why });
  return [
    choice(percentOfWhole(TRY.juice, TRY.water), "That compares juice to water (part to part), not juice to the whole punch."),
    choice(TRY_ANSWER, `Yes. Juice is ${TRY.juice} of the ${whole} cups in a batch, and ${TRY.juice}/${whole} = ${fmt(TRY_ANSWER)}/100.`),
    choice(percentOfWhole(TRY.water, whole), "That is the water's share of the punch, not the juice's."),
    choice(reduce(2 * TRY_ANSWER.num, TRY_ANSWER.den), `That would mean ${2 * TRY.juice} cups of juice in every ${whole} cups of punch, twice what this recipe has.`),
  ];
}
export const tryCorrectIndex = () => tryChoices().findIndex((c) => sameFraction(c.value, TRY_ANSWER));

export default function Lesson() {
  const [a, setA] = useState(2); // cups of juice per batch
  const [b, setB] = useState(3); // cups of water per batch
  const [n, setN] = useState(2); // batches
  const [revealed, setRevealed] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const s = figureState(a, b, n);
  const steps = exampleSteps();
  const choices = tryChoices();
  const correct = tryCorrectIndex();

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Imagine mixing punch for a class party: <strong>{s.recipeLine}</strong>. Twice as many guests means twice as much of each. That &ldquo;for every&rdquo; is a <strong>ratio</strong>, and this chapter is about the different ways to describe that mix.
        A table of batches, a pair of number lines that move together, and a <strong>unit rate</strong> are all names for the same juice-to-water ratio. A <strong>percent</strong> answers a different question about the same mix: how much of the <em>whole</em> punch is juice, out of 100.
      </p>
      <p>Once you can move between those views you can price groceries per ounce, read a map scale, compare two speeds, and check a discount. Every &ldquo;per&rdquo; you meet is a ratio in disguise.</p>

      <Figure caption="Change the recipe or the number of batches. The table, the double number line, and the unit rate all read the same ratio; the tape diagram and the percent measure the juice against the whole batch.">
        <div className="flex flex-col items-center gap-5">
          <FigureScroll>
            <table className="mx-auto border-collapse text-center font-mono text-sm">
              <thead>
                <tr><th scope="col" className="px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Batches</th>
                  {s.batchCols.map((k) => (<th key={k} scope="col" className="w-11 px-2 py-1" style={k === n ? { background: TINT, color: ACCENT } : undefined}>{k}</th>))}</tr>
              </thead>
              <tbody>
                {s.rows.map((row) => (<tr key={row.label}><th scope="row" className="px-2 py-1 text-left text-xs font-semibold" style={{ color: row.color }}>{row.label}</th>
                  {row.cells.map((value, i) => (<td key={i} className="px-2 py-1 tabular-nums" style={i + 1 === n ? { background: TINT, fontWeight: 800 } : undefined}>{value}</td>))}</tr>))}
              </tbody>
            </table>
          </FigureScroll>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={s.svgLabel}>
            <line x1={s.markerX} y1={TOP_Y} x2={s.markerX} y2={BOT_Y} stroke={ACCENT} strokeWidth={2} strokeDasharray="4 4" opacity={0.6} />
            {s.lines.map((line) => (<NumberLine key={line.label} y={line.y} ticks={line.ticks} markerIndex={n} markerX={s.markerX} color={line.color} label={line.label} />))}
          </svg>
          <div className="w-full max-w-md">
            <div role="img" aria-label={s.tapeLabel} className="flex h-8 w-full gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)]">
              {s.tapeCells.map((cell) => (<div key={cell.index} className="flex-1" style={{ background: cell.color }} />))}</div>
            <p className="m-0 mt-1 text-center text-xs text-[var(--ink-faint)]">{s.tapeCaption}</p>
          </div>
          <div className="grid w-full max-w-lg gap-3 sm:grid-cols-3">
            {s.cards.map((card) => (
              <div key={card.label} className="rounded-xl bg-[var(--surface-2)] px-3 py-2 text-center"><div className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{card.label}</div>
                <div className="font-mono text-base font-black" style={{ color: card.color }}>{card.headline}</div>
                <div className="text-xs text-[var(--ink-soft)]">{card.sub}</div>
              </div>
            ))}
          </div>
          <p className="m-0 max-w-lg text-center text-xs text-[var(--ink-soft)]">{s.flipNote}</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Juice per batch" value={a} min={1} max={6} color={JUICE} onChange={setA} />
            <Stepper label="Water per batch" value={b} min={1} max={6} color={ACCENT} onChange={setB} />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Batches: <span className="text-[var(--ink)]">{n}</span></span>
              <input type="range" min={1} max={5} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-40 accent-[var(--band-middle)]" aria-label="Number of batches" />
            </div>
          </div>
        </div>
      </Figure>

      <h2>Worked example: scale it, then find the percent</h2>
      <p>A punch recipe uses <strong>{EXAMPLE.juice} cups of juice for every {EXAMPLE.water} cups of water</strong>. How much water goes with {EXAMPLE.targetJuice} cups of juice, and what percent of the punch is juice?</p>
      <div className="card p-4">
        <ol id={stepsId} className="m-0 list-decimal space-y-2 pl-6" aria-live="polite">
          {steps.slice(0, revealed).map((step) => (<li key={step.title}><strong>{step.title}.</strong> {step.text}</li>))}
        </ol>
        {revealed === 0 && <p className="m-0 text-sm text-[var(--ink-soft)]">Press the button to reveal the reasoning one step at a time.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setRevealed((k) => Math.min(steps.length, k + 1))} disabled={revealed >= steps.length} aria-expanded={revealed > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>{revealed >= steps.length ? "All steps shown" : `Next step (${revealed + 1} of ${steps.length})`}</button>
          <button type="button" onClick={() => setRevealed(0)} disabled={revealed === 0} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>Another recipe uses <strong>{TRY.juice} {plural(TRY.juice, "cup")} of juice for every {TRY.water} cups of water</strong>. What percent of that punch is juice?</p>
      <div className="flex flex-wrap gap-2">
        {choices.map((c, i) => (<button key={i} type="button" onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-4 py-2 font-mono text-sm font-bold" style={choiceStyle(pick === i, i === correct)}>{c.text}</button>))}
      </div>
      {pick !== null && (<p className="mt-3 rounded-xl px-4 py-3 text-[15px]" style={{ background: TINT }} role="status"><strong>{pick === correct ? "Correct." : "Not quite."}</strong> {choices[pick].why}</p>)}

      <h2>Where this chapter goes</h2>
      <p>
        Each lesson that follows picks up one of the views you just used. <strong>Ratios &amp; the Double Number Line</strong> scales a recipe up and down and shows why equivalent ratios stay in step on two number lines. <strong>Unit Rate</strong> divides a ratio down to &ldquo;per one,&rdquo; the form that makes prices and speeds easy to compare.
        <strong>Percents</strong> treats a percent as a rate per 100 and uses it to find a percent of any number. Keep the punch in mind: the table, the number lines, and the unit rate all read the same ratio {s.ratioText}, while the percent measures the juice against the whole batch.
      </p>

      <MathCheck>
        <p>{s.mathCheck.ratio} {s.mathCheck.equivalent}</p>
        <p>{s.mathCheck.unitRate}</p>
        <p>{s.mathCheck.percent} {s.mathCheck.tape}</p>
      </MathCheck>
    </div>
  );
}

function NumberLine({ y, ticks, markerIndex, markerX, color, label }: { y: number; ticks: number[]; markerIndex: number; markerX: number; color: string; label: string }) {
  return (
    <g>
      <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--ink-soft)" strokeWidth={2} />
      {ticks.map((value, k) => (<g key={k}>
          <line x1={tickX(k)} y1={y - 7} x2={tickX(k)} y2={y + 7} stroke="var(--ink-soft)" strokeWidth={1.5} />
          <text x={tickX(k)} y={y + 24} textAnchor="middle" fontSize={13} fontWeight={k === markerIndex ? 800 : 500} fill={k === markerIndex ? color : "var(--ink-faint)"} fontFamily="var(--font-mono)">{value}</text>
        </g>))}
      <text x={4} y={y + 4} fontSize={12} fontWeight={700} fill={color}>{label}</text>
      <circle cx={markerX} cy={y} r={MARKER_R} fill={color} stroke="white" strokeWidth={MARKER_STROKE} />
    </g>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
