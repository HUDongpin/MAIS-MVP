"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const DOT_C = "var(--band-middle)";
const LINE_C = "var(--band-upper)";
const RESID_C = "var(--band-early)";

/** Nine students in a study group, one practice total each: 0 through 8 hours. */
export const HOURS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
/** The fixed off-the-line pattern, scaled by the spread control. It sums to 0 and its (hours − 4) weighted sum is 0, so the
 * least-squares line is exactly score = slope × (hours − 4) + 30 everywhere, and residual i is exactly spread × NOISE[i] — never 0. */
export const NOISE = [2, -1, -1, 1, -2, 1, -1, -1, 2];
export const MEAN_HOURS = 4, MEAN_SCORE = 30, MAX_HOURS = 8, MAX_SCORE = 50;
/** Sum of (hours − 4)², and sum of NOISE². */
export const SXX = 60, NOISE_SS = 18;
export const SLOPE_MIN = -3, SLOPE_MAX = 3, SPREAD_MIN = 1, SPREAD_MAX = 4, STUDENT_MIN = 1, STUDENT_MAX = 9;
/** Pixel geometry: a dot-plot strip above a scatter panel, both inside one 420 × 522 box. The lowest reachable score is 17, so both
 * score axes start at SCORE_LO = 15 rather than 0 and spend all 350 px on the data. One score point is then exactly 10 px, so even the
 * smallest residual (1 point) leaves 10 − MARK_R − MODEL_HALF = 6 px of bare gap between the marker it starts at and the line it ends on.
 * The space below SCAT_BASE holds two stacked rows, not one: the hour numbers, then the axis name under them. At H = 512 the name sat
 * 2 px inside the digits it was naming, so both rows are placed from named constants rather than from whatever height the drawing needed. */
export const W = 420, H = 522, PLOT_L = 48, PLOT_R = 404, SCORE_LO = 15;
export const HOUR_TICK_DY = 16, AXIS_NAME_Y = 512;
export const DOT_BASE = 72, DOT_LIFT = 10, DOT_STEP = 9, DOT_R = 4;
export const SCAT_TOP = 132, SCAT_BASE = 482, SCORE_TICKS = [15, 20, 25, 30, 35, 40, 45, 50];
/** The hours axis is inset from the drawn frame: at 0 hours a residual would otherwise be painted straight down the y-axis, in the axis colour, and vanish. */
export const HOUR_L = 64, HOUR_R = 396;
export const PX_PER_POINT = (SCAT_BASE - SCAT_TOP) / (MAX_SCORE - SCORE_LO), X_PER_POINT = (PLOT_R - PLOT_L) / (MAX_SCORE - SCORE_LO);
export const MARK_R = 3, MODEL_HALF = 1, MIN_GAP_PX = 6;

/** A real minus sign for negatives; integers print bare. */
export function num(n: number): string { return (n < 0 ? "−" : "") + Math.abs(n); }
export function rText(r: number): string { return (r < 0 ? "−" : "") + Math.abs(r).toFixed(2); }
export function pointsWord(n: number): string { return `${num(n)} ${Math.abs(n) === 1 ? "point" : "points"}`; }
export function hoursWord(n: number): string { return `${num(n)} ${Math.abs(n) === 1 ? "hour" : "hours"}`; }
export function cmWord(n: number): string { return `${num(n)} cm`; }
export function intercept(slope: number): number { return MEAN_SCORE - slope * MEAN_HOURS; }
export function predicted(slope: number, hours: number): number { return slope * hours + intercept(slope); }
export function scores(slope: number, spread: number): number[] { return HOURS.map((h, i) => predicted(slope, h) + spread * NOISE[i]); }
export function mean(values: number[]): number { return values.reduce((sum, v) => sum + v, 0) / values.length; }
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
export function summarize(values: number[]) { return { mean: mean(values), median: median(values), low: Math.min(...values), high: Math.max(...values), range: Math.max(...values) - Math.min(...values) }; }
/** r = Sxy / √(Sxx · Syy). Syy is never 0, because the spread control never reaches 0. */
export function correlation(slope: number, spread: number): number { return (SXX * slope) / Math.sqrt(SXX * (SXX * slope * slope + NOISE_SS * spread * spread)); }
export function strengthPhrase(r: number): string {
  const size = Math.abs(r);
  return size === 0 ? "no linear association at all" : `a ${size >= 0.8 ? "strong" : size >= 0.5 ? "moderate" : "weak"} ${r > 0 ? "positive" : "negative"} linear association`;
}
/** mean − median is the average of the nine signed distances from the median, so the gap is a real claim. */
export function centerSentence(values: number[]): string {
  const s = summarize(values), gap = s.mean - s.median;
  if (gap === 0) return `Mean and median agree at ${s.mean}: added up, the scores above the middle sit exactly as far from it as the scores below.`;
  return `The mean ${s.mean} sits ${pointsWord(Math.abs(gap))} ${gap > 0 ? "above" : "below"} the median ${s.median}, so the ${gap > 0 ? "higher" : "lower"} scores reach further from the middle, added up, than the others.`;
}
export function slopeSentence(slope: number): string {
  const b = intercept(slope);
  if (slope === 0) return `slope 0 means the model predicts ${pointsWord(b)} for every student, however long they practiced`;
  return `slope ${num(slope)} means one more hour of practice goes with ${pointsWord(Math.abs(slope))} ${slope > 0 ? "more" : "fewer"} in the prediction, and intercept ${b} is the prediction at 0 hours`;
}
export function modelText(slope: number): string { return slope === 0 ? `score = ${intercept(0)}` : `score = ${slope === 1 ? "hours" : slope === -1 ? "−hours" : `${num(slope)} × hours`} + ${intercept(slope)}`; }
export function residualSentence(slope: number, spread: number, student: number): string {
  const i = student - 1, actual = scores(slope, spread)[i], model = predicted(slope, HOURS[i]), residual = actual - model;
  return `Student ${student} practiced ${hoursWord(HOURS[i])} and scored ${actual}, while the model predicts ${model}. Residual = ${actual} − ${model} = ${num(residual)}, so the model ${residual > 0 ? "under" : "over"}-predicts this student by ${pointsWord(Math.abs(residual))}.`;
}
export function figureLabel(slope: number, spread: number, student: number): string {
  const values = scores(slope, spread), s = summarize(values), i = student - 1;
  return `Two panels of the same nine unit-test scores. The top dot plot runs from ${s.low} to ${s.high}, with a triangle at the mean ${s.mean} and a dashed line at the median ${s.median}. The bottom scatter plot pairs practice hours with score and draws the least-squares line ${modelText(slope)}; the correlation is r = ${rText(correlation(slope, spread))}. A ring marks the point of averages, ${MEAN_HOURS} hours and ${MEAN_SCORE} points, which every least-squares line passes through, and a vertical gap runs from each point down or up to the line. Student ${student} is highlighted: ${hoursWord(HOURS[i])} of practice, an actual score of ${values[i]}, a predicted score of ${predicted(slope, HOURS[i])}.`;
}
export function scoreX(v: number): number { return PLOT_L + (v - SCORE_LO) * X_PER_POINT; }
export function hourX(h: number): number { return HOUR_L + (h / MAX_HOURS) * (HOUR_R - HOUR_L); }
export function scoreY(v: number): number { return SCAT_BASE - (v - SCORE_LO) * PX_PER_POINT; }
/** Every pixel the figure draws, from the two data controls alone. Each residual is drawn as the BARE run between marker and fitted line — it
 * starts MARK_R past the point and stops MODEL_HALF short of the line — so `gap` is the length a reader sees, not one the markers have eaten. */
export function layout(slope: number, spread: number) {
  const values = scores(slope, spread), seen = new Map<number, number>();
  const dots = values.map((v) => { const stacked = seen.get(v) ?? 0; seen.set(v, stacked + 1); return { value: v, x: scoreX(v), y: DOT_BASE - DOT_LIFT - stacked * DOT_STEP }; });
  const points = values.map((v, i) => {
    const model = predicted(slope, HOURS[i]), y = scoreY(v), yModel = scoreY(model), dir = Math.sign(yModel - y);
    return { hours: HOURS[i], value: v, model, x: hourX(HOURS[i]), y, yModel, gapY1: y + dir * MARK_R, gapY2: yModel - dir * MODEL_HALF, gap: Math.abs(yModel - y) - MARK_R - MODEL_HALF };
  });
  return { values, dots, points };
}

/** Worked example: one basil seedling, measured once a week for five weeks. */
export const EX_WEEKS = [0, 1, 2, 3, 4], EX_HEIGHTS = [15, 16, 20, 22, 27], EX_CHECK_WEEK = 4, EX_FORECAST_WEEK = 6;
export function exampleFit() {
  const mw = mean(EX_WEEKS), mh = mean(EX_HEIGHTS);
  const sxy = EX_WEEKS.reduce((sum, w, i) => sum + (w - mw) * (EX_HEIGHTS[i] - mh), 0), sxx = EX_WEEKS.reduce((sum, w) => sum + (w - mw) ** 2, 0);
  const slope = sxy / sxx, b = mh - slope * mw, fitted = (w: number) => slope * w + b;
  return { mw, mh, sxy, sxx, slope, b, fitted, fits: EX_WEEKS.map(fitted), residuals: EX_HEIGHTS.map((h, i) => h - fitted(EX_WEEKS[i])) };
}
/** Try it: a second pot from the same tray, measured in week 3. It was never part of the fit, so its gap is a prediction error, not a residual. */
export const TRY_WEEK = 3, TRY_HEIGHT = 21;
export function tryChoices(): { value: number; why: string }[] {
  const model = exampleFit().fitted(TRY_WEEK);
  return [
    { value: model - TRY_HEIGHT, why: "subtracts the wrong way round: the gap is always actual minus predicted" },
    { value: TRY_HEIGHT - model, why: "correct" },
    { value: TRY_HEIGHT, why: "is the measured height itself, not the gap between it and the model" },
    { value: model, why: "is the prediction from the model, not the gap between the measurement and it" },
  ];
}
export function tryAnswerIndex(): number { return tryChoices().findIndex((c) => c.value === TRY_HEIGHT - exampleFit().fitted(TRY_WEEK)); }

export default function Lesson() {
  const [slope, setSlope] = useState(2);
  const [spread, setSpread] = useState(2);
  const [student, setStudent] = useState(9);
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const stepsId = useId();

  const L = layout(slope, spread), s = summarize(L.values), r = correlation(slope, spread), focus = L.points[student - 1];
  const cards = [
    { title: "One variable: center and spread", color: DOT_C, big: `mean ${s.mean} · median ${s.median}`, small: `range ${s.high} − ${s.low} = ${pointsWord(s.range)}`, faint: "read off the top panel alone" },
    { title: "Two variables: the fitted model", color: LINE_C, big: modelText(slope), small: `the least-squares line, through (${MEAN_HOURS}, ${MEAN_SCORE})`, faint: `In context, ${slopeSentence(slope)}.` },
    { title: "Correlation r", color: ACCENT, big: `r = ${rText(r)}`, small: strengthPhrase(r), faint: "r never leaves −1 to 1 and shares the sign of the slope" },
    { title: `Residual, student ${student}`, color: RESID_C, big: pointsWord(focus.value - focus.model), small: `actual ${focus.value} − predicted ${focus.model}`, faint: "the part of this score the model does not explain" },
  ];

  const ex = exampleFit();
  const grown = EX_HEIGHTS[EX_HEIGHTS.length - 1] - EX_HEIGHTS[0], worst = Math.max(...ex.residuals.map(Math.abs));
  const steps = [
    <>Find the center of the data. Mean week = ({EX_WEEKS.join(" + ")}) ÷ {EX_WEEKS.length} = {ex.mw}, and mean height = ({EX_HEIGHTS.join(" + ")}) ÷ {EX_HEIGHTS.length} = {cmWord(ex.mh)}. The least-squares line has to pass through ({ex.mw}, {ex.mh}).</>,
    <>Find the slope. The sum of (week − {ex.mw})(height − {ex.mh}) is {ex.sxy}, and the sum of (week − {ex.mw})² is {ex.sxx}. Slope = {ex.sxy} ÷ {ex.sxx} = {ex.slope}, so the model grows {cmWord(ex.slope)} per week.</>,
    <>Find the intercept. The line goes through ({ex.mw}, {ex.mh}), so {ex.mh} = {ex.slope} × {ex.mw} + b, which gives b = {ex.mh} − {ex.slope * ex.mw} = {ex.b}. The model is height = {ex.slope}w + {ex.b}.</>,
    <>Check the fit with residuals. The predictions for weeks {EX_WEEKS.join(", ")} are {ex.fits.join(", ")}, so the residuals are {ex.residuals.map(num).join(", ")}. They add to {ex.residuals.reduce((a, b) => a + b, 0)}, as the residuals of any least-squares line must, so that total on its own is no evidence at all. What is evidence: no residual is bigger than {cmWord(worst)} against the {cmWord(grown)} the plant actually grew, and they do not drift from the early weeks to the late ones.</>,
    <>Read one residual in context. In week {EX_CHECK_WEEK} the plant measured {cmWord(EX_HEIGHTS[EX_CHECK_WEEK])} while the model predicted {cmWord(ex.fitted(EX_CHECK_WEEK))}. Residual = {EX_HEIGHTS[EX_CHECK_WEEK]} − {ex.fitted(EX_CHECK_WEEK)} = {cmWord(EX_HEIGHTS[EX_CHECK_WEEK] - ex.fitted(EX_CHECK_WEEK))}: the plant stands that much taller than the model says.</>,
    <>Know where the model stops. At week {EX_FORECAST_WEEK} it predicts {cmWord(ex.fitted(EX_FORECAST_WEEK))}, but the evidence only runs to week {EX_WEEKS[EX_WEEKS.length - 1]}. Nothing in the data promises the growth stays straight, so that number is an extrapolation, not a measurement.</>,
  ];
  const choices = tryChoices(), answer = tryAnswerIndex();
  const tryWhy = `The model predicts ${ex.slope} × ${TRY_WEEK} + ${ex.b} = ${cmWord(ex.fitted(TRY_WEEK))}, and the pot measured ${cmWord(TRY_HEIGHT)}. Actual − predicted = ${TRY_HEIGHT} − ${ex.fitted(TRY_WEEK)} = ${cmWord(TRY_HEIGHT - ex.fitted(TRY_WEEK))}, so this pot is running behind the model. Because it was never part of the fit, that ${cmWord(TRY_HEIGHT - ex.fitted(TRY_WEEK))} is a prediction error, not one of the five residuals that add to 0.`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        &ldquo;The new practice sessions are working.&rdquo; That is a claim, and a claim is not evidence. Nine students in a study group each carry two numbers this month:
        the hours they spent on practice sets, and their score out of {MAX_SCORE} on the unit test. Nine pairs of numbers cannot argue back — but they cannot answer anything either, until someone organizes them.
      </p>
      <p>
        This chapter organizes them twice. First you <strong>describe</strong>{" "}one variable on its own: where the scores pile up, where the middle sits, how far they spread. Then you try to{" "}
        <strong>explain</strong>{" "}that variation with a second variable, by fitting a model and asking how much of the story it really captures — what its slope means, how tightly the points follow it,
        and what it missed for each student. Move the controls below and watch the same nine scores answer both questions at once.
      </p>

      <Figure caption={`Top: the nine scores by themselves, with a triangle at the mean and a dashed line at the median. Bottom: the same nine scores against practice hours, with the least-squares line, a ring at the point of averages (${MEAN_HOURS}, ${MEAN_SCORE}) that every least-squares line passes through, and every residual drawn as the bare vertical gap between a point and the line.`}>
        <div className="flex flex-col items-center gap-5">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(slope, spread, student)}>
            <text x={PLOT_L} y={14} fontSize={11} fontWeight={800} fill="var(--ink-soft)">1. The nine scores on their own</text>
            <line x1={scoreX(SCORE_LO)} y1={DOT_BASE} x2={scoreX(MAX_SCORE)} y2={DOT_BASE} stroke="var(--ink-soft)" strokeWidth={2} />
            {SCORE_TICKS.map((v) => (
              <g key={v}><line x1={scoreX(v)} y1={DOT_BASE} x2={scoreX(v)} y2={DOT_BASE + 5} stroke="var(--ink-soft)" strokeWidth={1.5} /><text x={scoreX(v)} y={DOT_BASE + 26} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{v}</text></g>
            ))}
            <polygon points={`${scoreX(s.mean) - 5},${DOT_BASE + 13} ${scoreX(s.mean) + 5},${DOT_BASE + 13} ${scoreX(s.mean)},${DOT_BASE + 3}`} fill={ACCENT} />
            {L.dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={DOT_R} fill={DOT_C} />)}
            <line x1={scoreX(s.median)} y1={DOT_BASE - 52} x2={scoreX(s.median)} y2={DOT_BASE} stroke={LINE_C} strokeWidth={2} strokeDasharray="4 3" />
            <text x={PLOT_L} y={118} fontSize={11} fontWeight={800} fill="var(--ink-soft)">2. The same scores against practice hours</text>
            {SCORE_TICKS.map((v) => (
              <g key={v}><line x1={PLOT_L} y1={scoreY(v)} x2={PLOT_R} y2={scoreY(v)} stroke="var(--line)" strokeWidth={1} /><text x={PLOT_L - 7} y={scoreY(v) + 4} textAnchor="end" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{v}</text></g>
            ))}
            {HOURS.map((h) => <text key={h} x={hourX(h)} y={SCAT_BASE + HOUR_TICK_DY} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{h}</text>)}
            <line x1={PLOT_L} y1={SCAT_BASE} x2={PLOT_R} y2={SCAT_BASE} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={PLOT_L} y1={SCAT_BASE} x2={PLOT_L} y2={SCAT_TOP} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={hourX(0)} y1={scoreY(predicted(slope, 0))} x2={hourX(MAX_HOURS)} y2={scoreY(predicted(slope, MAX_HOURS))} stroke={LINE_C} strokeWidth={MODEL_HALF * 2} />
            <circle cx={hourX(MEAN_HOURS)} cy={scoreY(MEAN_SCORE)} r={9} fill="none" stroke={ACCENT} strokeWidth={2} />
            {L.points.map((p, i) => <line key={i} x1={p.x} y1={p.gapY1} x2={p.x} y2={p.gapY2} stroke={i === student - 1 ? RESID_C : "var(--ink-soft)"} strokeWidth={i === student - 1 ? 3 : 2} />)}
            {L.points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={MARK_R} fill={i === student - 1 ? RESID_C : DOT_C} />)}
            <text x={PLOT_R} y={SCAT_BASE - 5} textAnchor="end" fontSize={10} fill={ACCENT}>ring = point of averages ({MEAN_HOURS}, {MEAN_SCORE})</text>
            <text x={hourX(MEAN_HOURS)} y={AXIS_NAME_Y} textAnchor="middle" fontSize={10} fill="var(--ink-faint)">hours of practice</text>
            <text transform={`translate(14 ${(SCAT_TOP + SCAT_BASE) / 2}) rotate(-90)`} textAnchor="middle" fontSize={10} fill="var(--ink-faint)">unit-test score</text>
          </svg>

          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 text-center sm:grid-cols-2">
            {cards.map((c) => (
              <div key={c.title} className="rounded-xl border-2 px-4 py-3" style={{ borderColor: c.color }}>
                <div className="text-xs font-bold uppercase" style={{ color: c.color }}>{c.title}</div>
                <div className="font-mono text-lg font-black">{c.big}</div>
                <div className="text-xs text-[var(--ink-soft)]">{c.small}</div><div className="text-xs text-[var(--ink-faint)]">{c.faint}</div>
              </div>
            ))}
          </div>
          <p className="m-0 max-w-xl text-center text-[15px] text-[var(--ink-soft)]">{centerSentence(L.values)} {residualSentence(slope, spread, student)}</p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Points per hour" value={slope} min={-3} max={3} onChange={setSlope} />
            <Stepper label="Off-the-line spread" value={spread} min={1} max={4} onChange={setSpread} />
            <Stepper label="Highlight student" value={student} min={1} max={9} onChange={setStudent} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: how fast is the basil growing?</h2>
      <p>
        A biology class measures one seedling once a week for five weeks and records {EX_HEIGHTS.map(cmWord).join(", ")}. Fit a straight-line model to
        that evidence, check it against the measurements, and say what it can and cannot predict.
      </p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, step).map((body, i) => <li key={i} className="flex gap-3 text-[15px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span><span>{body}</span></li>)}
        </ol>
        {step === 0 && <p className="m-0 text-sm text-[var(--ink-faint)]">Press &ldquo;Next step&rdquo; to watch the solution unfold.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={step > 0} aria-controls={stepsId} disabled={step >= steps.length} onClick={() => setStep((n) => Math.min(steps.length, n + 1))} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next step</button>
          <button type="button" disabled={step === 0} onClick={() => setStep(0)} className="rounded-lg border border-[var(--line)] px-4 py-1.5 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>
        A second pot, grown from the same tray, measures {cmWord(TRY_HEIGHT)} in week {TRY_WEEK}. This pot was never one of the five measurements the line was fitted to, so what it leaves is a
        prediction error rather than one of the model&apos;s residuals — but you measure it exactly the same way, actual minus predicted. How far off is the model here?
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map((c, i) => <button key={i} type="button" onClick={() => setChoice(i)} aria-pressed={choice === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={choice === i ? { background: i === answer ? "var(--band-upper)" : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{cmWord(c.value)}</button>)}
      </div>
      {choice !== null && (
        <p className="mt-3 text-[15px]">{choice === answer ? `Right. ${tryWhy}` : `Not quite: ${cmWord(choices[choice].value)} ${choices[choice].why}. ${tryWhy}`}</p>
      )}

      <h2>Your path through this chapter</h2>
      <p>
        <strong>Dot Plots, Histograms, Box Plots</strong>{" "}takes the top panel apart and rebuilds the same data set three ways, so a feature you cannot see in one display shows up in another. <strong>Comparing Distributions</strong>{" "}is where two data sets finally sit
        side by side, so their centers and spreads can be compared and an outlier can be caught dragging the mean while the median barely moves. <strong>The Normal Distribution</strong>{" "}handles the special bell shape, where the mean and the standard deviation alone
        estimate what percentage of a population falls in any range. <strong>Two-Way Frequency Tables</strong>{" "}does all of this for categories instead of numbers. Then <strong>Fitting a Line &amp; Residuals</strong>{" "}explains where the line in the bottom panel comes
        from and how a residual plot exposes a model of the wrong shape; <strong>Interpreting Slope &amp; Intercept</strong>{" "}turns a slope into a sentence about the real situation; and <strong>Correlation, Not Causation</strong>{" "}pins down what r does — and does not — license you to say.
      </p>

      <MathCheck>
        <p>
          The top panel is a dot plot of the nine scores (S-ID.1). Their mean is {s.mean} and their median is {s.median}; because mean − median is the average of the nine signed distances from the median, any gap between them is a real statement about which side stretches
          further, while the range {s.high} − {s.low} = {s.range} measures the spread that a center cannot show (S-ID.3). The bottom panel explains those same scores with a second variable. The drawn line, {modelText(slope)}, is the least-squares line: no other line makes the
          squared gaps add up to less. One consequence of that minimum is that its nine residuals add to 0, which is exactly what makes the line pass through the ringed point of averages ({MEAN_HOURS}, {MEAN_SCORE}) — but a total of 0 is an identity every least-squares line
          satisfies, so it is never on its own evidence that a line fits. Read in context, {slopeSentence(slope)} (S-ID.7). Each vertical gap is a residual, actual minus predicted — {pointsWord(focus.value - focus.model)} for student {student} — and it is the size and the
          pattern of those gaps, not their total, that tell you whether a straight line was the right model at all (S-ID.6). The correlation r = {rText(r)} compresses that fit into one number that never leaves −1 to 1: {strengthPhrase(r)} (S-ID.8). Even at r = 1 the evidence
          would only show that hours and scores move together; a hidden third factor could drive both, so association is never proof of cause (S-ID.9).
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
        <span className="w-9 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{num(value)}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
