"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const LINE_C = "var(--band-upper)";
const CUT_C = "var(--band-early)";

export const SLOPE_MIN = -3, SLOPE_MAX = 3, SCATTER_MIN = 0, SCATTER_MAX = 3, PREDICT_MIN = 0, PREDICT_MAX = 10;
/** Eight players: hours of practice per week. */
export const HOURS = [1, 2, 3, 4, 5, 6, 7, 8];
/** Fixed scatter pattern, scaled by the scatter control. It sums to 0 and its hour-weighted sum is 0, so the least-squares line is exactly y = mx + b in every state. */
export const OFFSETS = [1, -1, 2, -2, 0, -1, -1, 2];
export const CENTER = 25, PIVOT = 4, SHOTS_MAX = 50, CUT_HOURS = 5, X_AXIS_MAX = 10;
export const PAD_L = 42, PAD_R = 16, PAD_T = 16, PAD_B = 40, GW = 300, GH = 200;
export const W = PAD_L + GW + PAD_R, H = PAD_T + GH + PAD_B;

export type Point = { x: number; y: number };
export function fmtNum(n: number) { return n < 0 ? `−${-n}` : `${n}`; }
export function intercept(m: number) { return CENTER - PIVOT * m; }
export function predict(m: number, hours: number) { return m * hours + intercept(m); }
export function pointsFor(m: number, s: number): Point[] { return HOURS.map((x, i) => ({ x, y: predict(m, x) + s * OFFSETS[i] })); }
export function sx(x: number) { return PAD_L + (x / X_AXIS_MAX) * GW; }
export function sy(y: number) { return PAD_T + GH - (y / SHOTS_MAX) * GH; }
export function percent(part: number, whole: number) { return (part * 100) / whole; }
export function hoursWord(n: number) { return `${n} ${n === 1 ? "hour" : "hours"}`; }
export function shotsWord(n: number) { return `${n} ${n === 1 ? "shot" : "shots"}`; }
export function lineEquation(m: number) {
  const b = intercept(m);
  if (m === 0) return `y = ${b}`;
  const coef = m === 1 ? "" : m === -1 ? "−" : fmtNum(m);
  return `y = ${coef}x + ${b}`;
}
export function slopeRatePhrase(m: number) {
  return `${fmtNum(m)} ${Math.abs(m) === 1 ? "shot" : "shots"} per extra hour`;
}
export function slopeSentence(m: number) {
  const b = intercept(m);
  const rate = m === 0 ? "extra practice predicts no change in shots made" : `each extra hour of practice predicts ${Math.abs(m)} ${m > 0 ? "more" : "fewer"} ${Math.abs(m) === 1 ? "shot" : "shots"}`;
  return `Slope ${fmtNum(m)}: ${rate}. Intercept ${b}: a player who practices 0 hours is predicted to make ${b} shots.`;
}
export function trendSentence(m: number, s: number) {
  const rise = Math.abs(m) * (HOURS[HOURS.length - 1] - HOURS[0]);
  const stray = s === 0 ? "Every dot sits exactly on the line." : `Every dot stays within ${shotsWord(2 * s)} of the line.`;
  if (m > 0) return `The line climbs ${rise} shots from 1 to 8 hours: a positive association. ${stray}`;
  if (m < 0) return `The line drops ${rise} shots from 1 to 8 hours: a negative association. ${stray}`;
  return `The line is flat, so practice hours do not predict shots made: no association. ${stray}`;
}
export function twoWayCounts(points: Point[]) {
  const low = points.filter((p) => p.x < CUT_HOURS);
  const high = points.filter((p) => p.x >= CUT_HOURS);
  const made = (g: Point[]) => g.filter((p) => p.y >= CENTER).length;
  return { lowYes: made(low), lowTotal: low.length, highYes: made(high), highTotal: high.length };
}
export function tableVerdict(pLow: number, pHigh: number) {
  const gap = pHigh - pLow;
  if (gap >= 50) return `Players who practiced 5 to 8 hours made 25 or more far more often, ${pHigh}% versus ${pLow}%: the table shows a positive association.`;
  if (gap <= -50) return `Players who practiced 5 to 8 hours made 25 or more far less often, ${pHigh}% versus ${pLow}%: the table shows a negative association.`;
  if (gap > 0) return `The 5-to-8-hour row is just one player ahead, ${pHigh}% versus ${pLow}%: a small difference, so the table gives only weak evidence of a positive association.`;
  if (gap < 0) return `The 5-to-8-hour row is just one player behind, ${pHigh}% versus ${pLow}%: a small difference, so the table gives only weak evidence of a negative association.`;
  return `Both rows made 25 or more at the same rate, ${pHigh}%: the table shows no association.`;
}
export function figureLabel(m: number, s: number, hours: number) {
  const direction = m > 0 ? "rising" : m < 0 ? "falling" : "flat";
  return `Scatter plot of eight players' practice hours and free throws made, with the ${direction} line of best fit ${lineEquation(m)}, which predicts ${shotsWord(predict(m, hours))} for ${hoursWord(hours)} of practice; scatter level ${s}`;
}

export const EXAMPLE = { bringTotal: 40, bringVeg: 24, buyTotal: 60, buyVeg: 27 };
export function exampleSteps() {
  const { bringTotal, bringVeg, buyTotal, buyVeg } = EXAMPLE;
  const pBring = percent(bringVeg, bringTotal);
  const pBuy = percent(buyVeg, buyTotal);
  const gap = pBring - pBuy;
  return [
    { title: "Do not trust the raw counts", text: `${buyVeg} buyers ate a vegetable and only ${bringVeg} bringers did, but there were ${buyTotal} buyers and just ${bringTotal} bringers. Counts from groups of different sizes cannot be compared directly.` },
    { title: "Turn each row into a percentage", text: `Bring lunch: ${bringVeg} ÷ ${bringTotal} = ${pBring / 100} = ${pBring}%. Buy lunch: ${buyVeg} ÷ ${buyTotal} = ${pBuy / 100} = ${pBuy}%.` },
    { title: "Compare the percentages", text: `${pBring}% − ${pBuy}% = ${gap} percentage points. Students who bring lunch ate a vegetable more often, even though fewer of them did in raw numbers.` },
    { title: "Answer the claim", text: `The data support the claim: bringing lunch is associated with eating a vegetable, ${pBring}% versus ${pBuy}%. That is an association in this survey, not proof that bringing lunch causes it.` },
  ];
}

export const TRY = { m: 4, b: 10, hours: 5 };
export const TRY_ANSWER = TRY.m * TRY.hours + TRY.b;
export const TRY_CHOICES = [TRY.m + TRY.hours + TRY.b, TRY_ANSWER, TRY.m * TRY.b + TRY.hours, TRY.hours + TRY.b];
export const TRY_CORRECT = TRY_CHOICES.indexOf(TRY_ANSWER);
export function tryFeedback(i: number) {
  const { m, b, hours } = TRY;
  if (i === TRY_CORRECT) return `Correct. Substitute x = ${hours}: y = ${m} · ${hours} + ${b} = ${m * hours} + ${b} = ${TRY_ANSWER} shots.`;
  if (TRY_CHOICES[i] === m + hours + b) return `Not quite. ${m + hours + b} comes from adding ${m} + ${hours} + ${b}. The slope multiplies the hours: ${m} · ${hours} = ${m * hours}, then add ${b}.`;
  if (TRY_CHOICES[i] === m * b + hours) return `Not quite. ${m * b + hours} swaps the roles of the numbers (${m} · ${b} + ${hours}). The slope ${m} multiplies the hours, ${hours}; the intercept ${b} is added once.`;
  return `Not quite. ${hours + b} skips the slope: ${hours} + ${b} leaves out the ${m} shots gained per hour. y = ${m} · ${hours} + ${b} = ${TRY_ANSWER}.`;
}

export default function Lesson() {
  const [m, setM] = useState(2);
  const [s, setS] = useState(1);
  const [hours, setHours] = useState(6);
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const points = pointsFor(m, s);
  const yHat = predict(m, hours);
  const counts = twoWayCounts(points);
  const pLow = percent(counts.lowYes, counts.lowTotal);
  const pHigh = percent(counts.highYes, counts.highTotal);
  const rows = [
    { label: "1–4 hours", yes: counts.lowYes, total: counts.lowTotal, pct: pLow },
    { label: "5–8 hours", yes: counts.highYes, total: counts.highTotal, pct: pHigh },
  ];
  const steps = exampleSteps();

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A coach says, &ldquo;The players who practice more make more free throws.&rdquo; A friend says, &ldquo;Eighth graders who bring lunch from home eat more vegetables.&rdquo; Each is a <strong>claim about two things at once</strong>: two variables measured on the same people.
        One player or one lunch cannot settle it. What settles it is a whole collection of pairs, looked at together.
      </p>
      <p>
        That is what this chapter is about: turning a claim into a question that data can answer. When both variables are numbers, you plot the pairs as a <strong>scatter plot</strong>, look for a trend, fit a line, and read its slope.
        When the variables are categories, you count into a <strong>two-way table</strong> and compare percentages. Below, you control the hidden truth behind eight players&apos; seasons; watch how every summary reports it.
      </p>

      <Figure caption="Eight players: hours of practice per week and free throws made out of 50. The green line is the line of best fit; the dashed orange lines sort the same players into the two-way table below.">
        <div className="flex flex-col items-center gap-5">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(m, s, hours)}>
            {[0, 10, 20, 30, 40, 50].map((y) => (
              <g key={y}><line x1={sx(0)} y1={sy(y)} x2={sx(X_AXIS_MAX)} y2={sy(y)} stroke="var(--line)" strokeWidth={1} /><text x={sx(0) - 6} y={sy(y) + 4} textAnchor="end" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{y}</text></g>
            ))}
            {Array.from({ length: X_AXIS_MAX + 1 }, (_, x) => <text key={x} x={sx(x)} y={sy(0) + 16} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{x}</text>)}
            <line x1={sx(0)} y1={sy(0)} x2={sx(X_AXIS_MAX)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(SHOTS_MAX)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(CENTER)} x2={sx(X_AXIS_MAX)} y2={sy(CENTER)} stroke={CUT_C} strokeWidth={1.5} strokeDasharray="3 3" />
            <line x1={sx(CUT_HOURS - 0.5)} y1={sy(0)} x2={sx(CUT_HOURS - 0.5)} y2={sy(SHOTS_MAX)} stroke={CUT_C} strokeWidth={1.5} strokeDasharray="3 3" />
            <line x1={sx(0)} y1={sy(predict(m, 0))} x2={sx(X_AXIS_MAX)} y2={sy(predict(m, X_AXIS_MAX))} stroke={LINE_C} strokeWidth={3} />
            <line x1={sx(hours)} y1={sy(0)} x2={sx(hours)} y2={sy(yHat)} stroke={ACCENT} strokeWidth={1.5} strokeDasharray="4 3" />
            <circle cx={sx(hours)} cy={sy(yHat)} r={7} fill="var(--surface)" stroke={ACCENT} strokeWidth={3} />
            {points.map((p) => <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={5} fill={ACCENT} />)}
            <text x={sx(X_AXIS_MAX / 2)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--ink-faint)">hours of practice per week</text>
            <text transform={`translate(12 ${sy(SHOTS_MAX / 2)}) rotate(-90)`} textAnchor="middle" fontSize={10} fill="var(--ink-faint)">free throws made (of 50)</text>
          </svg>

          <div className="rounded-xl bg-[var(--surface-2)] px-6 py-3 text-center">
            <div className="font-mono text-xl font-black" style={{ color: LINE_C }}>{lineEquation(m)}</div>
            <div className="mt-1 max-w-md text-sm text-[var(--ink-soft)]">{slopeSentence(m)}</div>
            <div className="mt-2 text-[15px] font-bold" style={{ color: ACCENT }}>For {hoursWord(hours)} of practice, the line predicts {shotsWord(yHat)} made.</div>
          </div>
          <p className="m-0 max-w-md text-center text-[15px] text-[var(--ink-soft)]">{trendSentence(m, s)}</p>

          <div className="flex flex-wrap items-start justify-center gap-6">
            <Stepper label="Slope (shots per hour)" value={m} min={-3} max={3} onChange={setM} />
            <Stepper label="Scatter" value={s} min={0} max={3} onChange={setS} />
            <Stepper label="Predict for (hours)" value={hours} min={0} max={10} onChange={setHours} />
          </div>

          <div className="w-full border-t border-[var(--line)] pt-4">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">The same eight players as categories</p>
            <table className="mx-auto w-max max-w-none border-collapse text-center font-mono text-sm">
              <thead>
                <tr>
                  <th className="p-2" />
                  {["made 25+", "under 25", "total", "% made 25+"].map((h, i) => <th key={h} className="p-2" style={{ color: i === 0 ? ACCENT : i === 1 ? "var(--ink-soft)" : "var(--ink-faint)" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <th className="p-2 text-right font-semibold">{r.label}</th>
                    <td className="p-2 font-black">{r.yes}</td>
                    <td className="p-2">{r.total - r.yes}</td>
                    <td className="p-2 text-[var(--ink-soft)]">{r.total}</td>
                    <td className="p-2 font-black" style={{ color: ACCENT }}>{r.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="m-0 mt-2 text-center text-[15px] text-[var(--ink-soft)]">{tableVerdict(pLow, pHigh)}</p>
          </div>
        </div>
      </Figure>

      <h2>Worked example: test a claim with a two-way table</h2>
      <p>
        A survey of 100 eighth graders asked two yes-or-no questions: Do you bring lunch from home? Did you eat a vegetable at lunch today? Of the <strong>{EXAMPLE.bringTotal}</strong> who bring lunch, <strong>{EXAMPLE.bringVeg}</strong> ate a vegetable.
        Of the <strong>{EXAMPLE.buyTotal}</strong> who buy lunch, <strong>{EXAMPLE.buyVeg}</strong> did. Does the data support the friend&apos;s claim?
      </p>
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setStep((k) => Math.min(steps.length, k + 1))} disabled={step >= steps.length} aria-expanded={step > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next step</button>
          <button type="button" onClick={() => setStep(0)} disabled={step === 0} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
          <span className="text-sm text-[var(--ink-faint)]">{step} of {steps.length} steps shown</span>
        </div>
        <ol id={stepsId} className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
          {steps.slice(0, step).map((st, i) => (
            <li key={st.title} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-[15px]">
              <strong style={{ color: ACCENT }}>Step {i + 1}: {st.title}.</strong> {st.text}
            </li>
          ))}
        </ol>
      </div>

      <h2>Try it</h2>
      <p>
        For another team, the line of best fit is <strong>y = {TRY.m}x + {TRY.b}</strong>, where x is hours of practice per week and y is free throws made out of 50.
        How many free throws does the line predict for a player who practices <strong>{hoursWord(TRY.hours)}</strong> a week?
      </p>
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {TRY_CHOICES.map((c, i) => (
            <button type="button" key={c} onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-4 py-2 font-mono text-sm font-bold" style={pick === i ? { borderColor: i === TRY_CORRECT ? LINE_C : CUT_C, background: `color-mix(in oklab, ${i === TRY_CORRECT ? LINE_C : CUT_C} 12%, var(--surface))` } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{c}</button>
          ))}
        </div>
        <p className="m-0 mt-3 text-[15px] text-[var(--ink-soft)]">{pick === null ? "Choose the predicted number of free throws." : tryFeedback(pick)}</p>
      </div>

      <h2>Your map for this chapter</h2>
      <p>
        Three lessons follow this one. <strong>Scatter Plots</strong> trains your eye on the cloud of dots itself: positive, negative, or no association, and the outliers that break the pattern.{" "}
        <strong>Line of Best Fit</strong> puts the line in your hands; you will slide it through the middle of the cloud, then read its slope and intercept as real-world rates and starting values and use them to predict.{" "}
        <strong>Two-Way Tables</strong> returns to categories, where you will build the tables yourself and learn why percentages within a row, not raw counts, are what reveal an association.
      </p>

      <MathCheck>
        <p>
          A <strong>scatter plot</strong> shows each player as one point, and its overall trend, rising, falling, or flat, is the association between the two measurements (8.SP.A.1).
          The green line is the <strong>line of best fit</strong>: the dots&apos; misses above and below it cancel out, both overall and from left to right, so no tilt or shift would bring a straight line closer to all eight at once (8.SP.A.2).
          Its equation {lineEquation(m)} has a <strong>slope</strong> that is a rate, {slopeRatePhrase(m)}, and an <strong>intercept</strong>, {intercept(m)}, the prediction for 0 hours; substituting {hours} for x gives the prediction {yHat} (8.SP.A.3).
          Sorting the same players into a <strong>two-way table</strong> and comparing the percentage in each row who made 25 or more, {pLow}% versus {pHigh}%, tests the claim with categories; percentages within each row, not raw counts, are what make rows of different sizes comparable (8.SP.A.4).
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
        <span className="w-9 text-center text-2xl font-black tabular-nums">{fmtNum(value)}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
