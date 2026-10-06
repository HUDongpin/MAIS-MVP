"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const DOT_C = "var(--band-middle)";
const LINE_C = "var(--band-upper)";
const FLAG_C = "var(--band-early)";

/** Eight delivery routes: x = packages carried, y = minutes on the road. */
export const XS = [1, 2, 3, 4, 5, 6, 7, 8];
export const TRUE_M = 5;
export const TRUE_B = 12;
export const SLOPE_MIN = 4, SLOPE_MAX = 6, INTERCEPT_MIN = 10, INTERCEPT_MAX = 14, ROUTE_MIN = 1, ROUTE_MAX = 8;

export type ShapeKey = "ordinary" | "ends" | "closure";
export const SHAPE_KEYS: ShapeKey[] = ["ordinary", "ends", "closure"];
export const SHAPE_LABEL: Record<ShapeKey, string> = { ordinary: "Ordinary week", ends: "Downtown and suburbs", closure: "One road closure" };
/**
 * Each week's departures from y = 5x + 12. Every list sums to 0 and its
 * package-weighted sum is 0, so y = 5x + 12 is exactly the least-squares line
 * for all three weeks: only the SHAPE of what is left over changes.
 */
export const OFFSETS: Record<ShapeKey, number[]> = { ordinary: [1, -2, 2, -1, 1, -2, 0, 1], ends: [5, 1, -2, -4, -4, -2, 1, 5], closure: [-1, -1, -1, 6, -1, -1, -1, 0] };

export const PAD_L = 44, PAD_R = 20, GW = 300, DOT_W = 56;
export const W = PAD_L + GW + DOT_W + PAD_R;
export const SC_TOP = 14, SC_H = 190, SC_BOT = SC_TOP + SC_H;
export const R_MID = 301, R_HALF = 55, R_TOP = R_MID - R_HALF, R_BOT = R_MID + R_HALF;
export const H = 396, X_MAX = 8, Y_MAX = 64, R_MAX = 16;
export const DOT_X0 = PAD_L + GW + 8, DOT_STEP = 6, MAX_STACK = 8, DOT_R = 3;

export function sx(x: number) { return PAD_L + (x / X_MAX) * GW; }
export function sy(y: number) { return SC_BOT - (y / Y_MAX) * SC_H; }
export function ry(r: number) { return R_MID - (r / R_MAX) * R_HALF; }

export function fmtNum(n: number) { return n < 0 ? `−${-n}` : `${n}`; }
export function minutesWord(n: number) { return `${n} ${n === 1 ? "minute" : "minutes"}`; }
export function packagesWord(n: number) { return `${n} ${n === 1 ? "package" : "packages"}`; }

export function observedAt(key: ShapeKey, i: number) { return TRUE_M * XS[i] + TRUE_B + OFFSETS[key][i]; }
export function predictedAt(m: number, b: number, x: number) { return m * x + b; }
export function residualsFor(key: ShapeKey, m: number, b: number) { return XS.map((x, i) => observedAt(key, i) - predictedAt(m, b, x)); }
export function ssrFor(key: ShapeKey, m: number, b: number) { return residualsFor(key, m, b).reduce((total, r) => total + r * r, 0); }
export function meanResidual(key: ShapeKey, m: number, b: number) { return residualsFor(key, m, b).reduce((total, r) => total + r, 0) / XS.length; }
export function rangeOf(rs: number[]) { return Math.max(...rs) - Math.min(...rs); }
/** School quartiles for these eight residuals: median of the lower four, median of the upper four. */
export function quartiles(rs: number[]) { const s = [...rs].sort((p, q) => p - q), q1 = (s[1] + s[2]) / 2, q3 = (s[5] + s[6]) / 2; return { q1, q3, iqr: q3 - q1 }; }
/** Indices of the residuals that fall more than 1.5 IQRs past Q1 or Q3. */
export function outlierIndices(rs: number[]) {
  const { q1, q3, iqr } = quartiles(rs), lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr, out: number[] = [];
  for (let i = 0; i < rs.length; i += 1) if (rs[i] < lo || rs[i] > hi) out.push(i);
  return out;
}
/** Horizontal slot for the dot plot: equal residuals stack to the right. */
export function stackX(rs: number[], i: number) {
  let column = 0;
  for (let j = 0; j < i; j += 1) if (rs[j] === rs[i]) column += 1;
  return DOT_X0 + Math.min(column, MAX_STACK - 1) * DOT_STEP;
}

export function slopeSentence(m: number, b: number) {
  return `Slope ${m}: this line says every extra package adds ${minutesWord(m)} to the route. Intercept ${b}: it puts loading and paperwork at ${minutesWord(b)} before the van moves at all.`;
}
export function routeSentence(key: ShapeKey, m: number, b: number, route: number) {
  const i = route - 1, observed = observedAt(key, i), predicted = predictedAt(m, b, XS[i]), r = observed - predicted;
  const tail = r === 0 ? "exactly what the model said" : `${minutesWord(Math.abs(r))} ${r > 0 ? "longer" : "shorter"} than the model said`;
  return `Route ${route} carried ${packagesWord(XS[i])} and took ${minutesWord(observed)}. The line predicts ${minutesWord(predicted)}, so its residual is ${observed} − ${predicted} = ${fmtNum(r)}: ${tail}.`;
}
export function fitVerdict(key: ShapeKey, m: number, b: number) {
  const here = ssrFor(key, m, b);
  const best = ssrFor(key, TRUE_M, TRUE_B);
  if (here > best) return `Squared residual total ${here}. Setting the line to y = ${TRUE_M}x + ${TRUE_B} brings the total down to ${best}, the smallest any straight line reaches on this week, so this line is not the best fit yet.`;
  if (key === "ordinary") return `This is the least-squares line, squared total ${best}. The residuals scatter on both sides of zero with no run and no drift, so a straight line is a good model for this week.`;
  if (key === "ends") return `This is the least-squares line, squared total ${best}. Even so the residual plot bends into a U: high at both ends, low in the middle. That U is left-over structure, so a straight line is the wrong shape for this week.`;
  return `This is the least-squares line, squared total ${best}. Seven routes land within ${minutesWord(1)} of the line and one route sits ${minutesWord(6)} above it, so the model is sound and one route was unusual.`;
}
export function spreadSentence(key: ShapeKey, m: number, b: number) {
  const rs = residualsFor(key, m, b), lo = Math.min(...rs), hi = Math.max(...rs), mean = meanResidual(key, m, b);
  const centre = mean === 0
    ? "They average exactly 0, so the misses above the line cancel the misses below."
    : `They average ${fmtNum(mean)}, ${mean > 0 ? "above" : "below"} 0, so overall this line predicts ${mean > 0 ? "less" : "more"} time than the routes really took.`;
  return `Those eight residuals run from ${fmtNum(lo)} to ${fmtNum(hi)}, a spread of ${minutesWord(hi - lo)}. ${centre}`;
}
/** The two-set comparison the open circles put on the plot: your line against the least-squares line. */
export function compareSentence(key: ShapeKey, m: number, b: number) {
  const here = residualsFor(key, m, b), best = residualsFor(key, TRUE_M, TRUE_B);
  const hRange = rangeOf(here), bRange = rangeOf(best), hIqr = quartiles(here).iqr, bIqr = quartiles(best).iqr;
  if (m === TRUE_M && b === TRUE_B) return `Your line is the least-squares line right now, so the filled dots sit on the open circles and there is only one set to read: center 0, range ${minutesWord(hRange)}, IQR ${fmtNum(hIqr)}. Move a stepper and the open circles stay behind as the set to compare against.`;
  const verdict = hRange > bRange ? "Off center and more spread out, so the open set is the tighter of the two."
    : hRange < bRange ? "Off center though less spread out, so the ranges alone do not settle it and the squared totals do."
      : "The same spread, but shifted off zero, so the open set still sits closer to zero overall.";
  return `Filled dots, your line: center ${fmtNum(meanResidual(key, m, b))}, range ${minutesWord(hRange)}, IQR ${fmtNum(hIqr)}. Open circles, the least-squares line y = ${TRUE_M}x + ${TRUE_B}: center 0, range ${minutesWord(bRange)}, IQR ${fmtNum(bIqr)}. ${verdict}`;
}
/** The S-ID.3 clause, derived from the residuals actually on screen rather than asserted. */
export function outlierNote(key: ShapeKey, m: number, b: number) {
  const rs = residualsFor(key, m, b), flagged = outlierIndices(rs), { q1, q3, iqr } = quartiles(rs);
  const fences = `Q1 ${fmtNum(q1)}, Q3 ${fmtNum(q3)}, IQR ${fmtNum(iqr)}`;
  if (flagged.length === 0) return `right now none of these eight is that far out (${fences}), so no single route is stretching this spread by itself.`;
  if (flagged.length === 1) return `right now route ${flagged[0] + 1} is (${fences}): its residual of ${fmtNum(rs[flagged[0]])} stretches the spread while the other seven routes stay put.`;
  return `right now ${flagged.length} of them are (${fences}): routes ${flagged.map((i) => i + 1).join(", ")} are each pulling on this spread.`;
}
export function figureLabel(key: ShapeKey, m: number, b: number, route: number) {
  const rs = residualsFor(key, m, b), best = residualsFor(key, TRUE_M, TRUE_B);
  return `Week labelled ${SHAPE_LABEL[key]}: a scatter plot of eight delivery routes with the line y = ${m}x + ${b} and a vertical residual drawn at each route, above a residual plot and a dot plot of those same eight residuals, which run from ${fmtNum(Math.min(...rs))} to ${fmtNum(Math.max(...rs))} and have squared total ${ssrFor(key, m, b)}; open circles mark the residuals of the least-squares line y = ${TRUE_M}x + ${TRUE_B}, which run from ${fmtNum(Math.min(...best))} to ${fmtNum(Math.max(...best))}; route ${route} is highlighted, with residual ${fmtNum(rs[route - 1])}.`;
}

export const EX_POINTS: [number, number][] = [[2, 22], [5, 40], [9, 60]];
export const EX_A = { m: 6, b: 8 };
export const EX_B = { m: 5, b: 14 };
export function exPredictions(line: { m: number; b: number }) { return EX_POINTS.map(([x]) => line.m * x + line.b); }
export function exResiduals(line: { m: number; b: number }) { return EX_POINTS.map(([x, y]) => y - (line.m * x + line.b)); }
export function exSsr(line: { m: number; b: number }) { return exResiduals(line).reduce((total, r) => total + r * r, 0); }
export function exSum(line: { m: number; b: number }) { return exResiduals(line).reduce((total, r) => total + r, 0); }
export function exampleSteps() {
  const pA = exPredictions(EX_A), pB = exPredictions(EX_B), rA = exResiduals(EX_A), rB = exResiduals(EX_B);
  const ys = EX_POINTS.map(([, y]) => y), list = (values: number[]) => values.map(fmtNum).join(", ");
  return [
    { title: "Predict, then subtract", text: `Model A is y = ${EX_A.m}x + ${EX_A.b}. For the route that carried ${packagesWord(EX_POINTS[0][0])} it predicts ${EX_A.m} · ${EX_POINTS[0][0]} + ${EX_A.b} = ${pA[0]}, and that route really took ${minutesWord(ys[0])}. Residual = observed − predicted = ${ys[0]} − ${pA[0]} = ${fmtNum(rA[0])}.` },
    { title: "Do all three routes", text: `Model A predicts ${list(pA)} minutes; the routes took ${list(ys)}. Subtracting one route at a time leaves the residuals ${list(rA)}.` },
    { title: "Square them, then add", text: `${rA.map((r) => `(${fmtNum(r)})²`).join(" + ")} = ${rA.map((r) => r * r).join(" + ")} = ${exSsr(EX_A)}. One number now stands for how badly Model A misses.` },
    { title: "Score Model B the same way", text: `Model B is y = ${EX_B.m}x + ${EX_B.b}. It predicts ${list(pB)}, so its residuals are ${list(rB)} and its squared total is ${rB.map((r) => r * r).join(" + ")} = ${exSsr(EX_B)}.` },
    { title: "Compare, then keep looking", text: `${exSsr(EX_B)} < ${exSsr(EX_A)}, so Model B fits these three routes better. Model B's residuals also add to ${fmtNum(exSum(EX_B))} while Model A's add to ${fmtNum(exSum(EX_A))}, so Model A sits below the three points on average. A smaller total is evidence, not proof: on a full data set you would still read the residual plot for left-over pattern.` },
  ];
}

export const TRY = { m: 7, b: 5, x: 4, observed: 30 };
export const TRY_PREDICTED = TRY.m * TRY.x + TRY.b;
export const TRY_ANSWER = TRY.observed - TRY_PREDICTED;
export const TRY_CHOICES = [TRY.observed - TRY.m * TRY.x, TRY_ANSWER, -TRY_ANSWER, TRY_PREDICTED];
export const TRY_CORRECT = TRY_CHOICES.indexOf(TRY_ANSWER);
export function tryFeedback(i: number) {
  const choice = TRY_CHOICES[i];
  if (i === TRY_CORRECT) return `Correct. The model predicts ${TRY.m} · ${TRY.x} + ${TRY.b} = ${TRY_PREDICTED}, the route took ${TRY.observed}, so the residual is ${TRY.observed} − ${TRY_PREDICTED} = ${fmtNum(TRY_ANSWER)}: the route beat the prediction by ${minutesWord(Math.abs(TRY_ANSWER))}.`;
  if (choice === TRY_PREDICTED) return `Not quite. ${TRY_PREDICTED} is the prediction itself. The residual is what the prediction left over: ${TRY.observed} − ${TRY_PREDICTED} = ${fmtNum(TRY_ANSWER)}.`;
  if (choice === -TRY_ANSWER) return `Not quite. ${fmtNum(-TRY_ANSWER)} is predicted minus observed. A residual is observed minus predicted: ${TRY.observed} − ${TRY_PREDICTED} = ${fmtNum(TRY_ANSWER)}.`;
  return `Not quite. ${fmtNum(choice)} drops the intercept. The prediction is ${TRY.m} · ${TRY.x} + ${TRY.b} = ${TRY_PREDICTED}, not ${TRY.m * TRY.x}, so the residual is ${fmtNum(TRY_ANSWER)}.`;
}

export default function Lesson() {
  const [shape, setShape] = useState<ShapeKey>("ordinary");
  const [m, setM] = useState(4);
  const [b, setB] = useState(13);
  const [route, setRoute] = useState(4);
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();
  const rs = residualsFor(shape, m, b);
  const bestRs = residualsFor(shape, TRUE_M, TRUE_B);
  const steps = exampleSteps();

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A model is a confident sentence about data that is never exactly right. &ldquo;Twelve minutes to load, then five more per package&rdquo; will hand you a predicted time for any route you
        like, and no real route will land on it. The gap between what happened and what the model claimed &mdash; the <strong>residual</strong> &mdash; is not an embarrassment to hide. It is the most useful number in this chapter.
      </p>
      <p>
        Read one residual and you learn about one route. Collect all of them, and read them as their own small data set, and you learn about the <em>model</em>: whether the line sits too
        high, whether one strange day is dragging it, whether the relationship was ever straight to begin with. Below, a courier&apos;s eight routes are waiting. Move the line and watch what is left over answer back.
      </p>

      <Figure caption="Top: eight routes and your model line, with each residual drawn as a vertical gap. Bottom: those same eight residuals plotted against route size and stacked again as a dot plot, with open circles holding the least-squares line's residuals beside them.">
        <div className="flex flex-col items-center gap-5">
          <div className="flex max-w-full flex-wrap justify-center gap-2">
            {SHAPE_KEYS.map((key) => (
              <button type="button" key={key} onClick={() => setShape(key)} aria-pressed={shape === key} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={shape === key ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{SHAPE_LABEL[key]}</button>
            ))}
          </div>

          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(shape, m, b, route)}>
            {[0, 10, 20, 30, 40, 50, 60].map((y) => (
              <g key={y}><line x1={sx(0)} y1={sy(y)} x2={sx(X_MAX)} y2={sy(y)} stroke="var(--line)" strokeWidth={1} /><text x={sx(0) - 6} y={sy(y) + 4} textAnchor="end" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{y}</text></g>
            ))}
            <line x1={sx(0)} y1={sy(0)} x2={sx(X_MAX)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={SC_TOP} stroke="var(--ink-soft)" strokeWidth={2} />
            {XS.map((x, i) => <line key={x} x1={sx(x)} y1={sy(observedAt(shape, i))} x2={sx(x)} y2={sy(predictedAt(m, b, x))} stroke={x === route ? FLAG_C : "var(--ink-faint)"} strokeWidth={x === route ? 3 : 1.5} strokeDasharray="3 2" />)}
            <line x1={sx(0)} y1={sy(predictedAt(m, b, 0))} x2={sx(X_MAX)} y2={sy(predictedAt(m, b, X_MAX))} stroke={LINE_C} strokeWidth={3} />
            {XS.map((x, i) => <circle key={x} cx={sx(x)} cy={sy(observedAt(shape, i))} r={x === route ? 6 : 4.5} fill={DOT_C} stroke={x === route ? FLAG_C : "none"} strokeWidth={2.5} />)}
            <text transform={`translate(12 ${(SC_TOP + SC_BOT) / 2}) rotate(-90)`} textAnchor="middle" fontSize={10} fill="var(--ink-faint)">route time (minutes)</text>
            <text x={sx(0)} y={SC_BOT + 26} fontSize={10} fontWeight={700} fill="var(--ink-faint)">residual plot: observed − predicted</text>
            <text x={sx(0)} y={SC_BOT + 38} fontSize={9} fill="var(--ink-faint)">open circles: residuals from y = {TRUE_M}x + {TRUE_B}</text>
            {[-16, -8, 8, 16].map((r) => (
              <g key={r}><line x1={sx(0)} y1={ry(r)} x2={sx(X_MAX)} y2={ry(r)} stroke="var(--line)" strokeWidth={1} strokeDasharray="2 3" /><text x={sx(0) - 6} y={ry(r) + 4} textAnchor="end" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{fmtNum(r)}</text></g>
            ))}
            <line x1={sx(0)} y1={ry(0)} x2={W - PAD_R} y2={ry(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <text x={sx(0) - 6} y={ry(0) + 4} textAnchor="end" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">0</text>
            <line x1={PAD_L + GW + 4} y1={R_TOP} x2={PAD_L + GW + 4} y2={R_BOT} stroke="var(--line)" strokeWidth={1} />
            <text x={DOT_X0} y={R_TOP - 6} fontSize={9} fill="var(--ink-faint)">dot plot</text>
            {XS.map((x, i) => <circle key={x} cx={sx(x)} cy={ry(bestRs[i])} r={5} fill="none" stroke="var(--ink-faint)" strokeWidth={1.5} />)}
            {XS.map((x, i) => (
              <g key={x}><line x1={sx(x)} y1={ry(0)} x2={sx(x)} y2={ry(rs[i])} stroke={x === route ? FLAG_C : "var(--ink-faint)"} strokeWidth={x === route ? 3 : 1.5} /><circle cx={sx(x)} cy={ry(rs[i])} r={x === route ? 6 : 4.5} fill={ACCENT} stroke={x === route ? FLAG_C : "none"} strokeWidth={2.5} /><circle cx={stackX(rs, i)} cy={ry(rs[i])} r={DOT_R} fill={x === route ? FLAG_C : ACCENT} /></g>
            ))}
            {XS.concat(0).map((x) => <text key={x} x={sx(x)} y={R_BOT + 16} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{x}</text>)}
            <text transform={`translate(12 ${R_MID}) rotate(-90)`} textAnchor="middle" fontSize={10} fill="var(--ink-faint)">residual (minutes)</text>
            <text x={sx(X_MAX / 2)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--ink-faint)">packages carried on the route</text>
          </svg>

          <div className="rounded-xl bg-[var(--surface-2)] px-6 py-3 text-center">
            <div className="font-mono text-xl font-black" style={{ color: LINE_C }}>y = {m}x + {b}</div>
            <div className="mt-1 max-w-md text-sm text-[var(--ink-soft)]">{slopeSentence(m, b)}</div>
            <div className="mt-2 max-w-md text-[15px] font-bold" style={{ color: ACCENT }}>{fitVerdict(shape, m, b)}</div>
          </div>
          <p className="m-0 max-w-md text-center text-[15px] text-[var(--ink-soft)]">{spreadSentence(shape, m, b)}</p>
          <p className="m-0 max-w-md text-center text-[15px] text-[var(--ink-soft)]">{compareSentence(shape, m, b)}</p>
          <p className="m-0 max-w-md text-center text-[15px]" style={{ color: FLAG_C }}>{routeSentence(shape, m, b, route)}</p>

          <div className="flex flex-wrap items-start justify-center gap-6">
            <Stepper label="Slope (minutes per package)" value={m} min={4} max={6} onChange={setM} />
            <Stepper label="Intercept (fixed minutes)" value={b} min={10} max={14} onChange={setB} />
            <Stepper label="Route to inspect" value={route} min={1} max={8} onChange={setRoute} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: score two models</h2>
      <p>
        A second courier logs three routes as (packages, minutes): <strong>({EX_POINTS[0][0]}, {EX_POINTS[0][1]})</strong>,{" "}
        <strong>({EX_POINTS[1][0]}, {EX_POINTS[1][1]})</strong>, and <strong>({EX_POINTS[2][0]}, {EX_POINTS[2][1]})</strong>. Model A is
        y = {EX_A.m}x + {EX_A.b}; Model B is y = {EX_B.m}x + {EX_B.b}. Which model fits these routes better, and how would you know?
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
        A delivery model is y = {TRY.m}x + {TRY.b}, with x in packages and y in minutes. A route carrying {packagesWord(TRY.x)} took{" "}
        {minutesWord(TRY.observed)}. What is that route&apos;s residual?
      </p>
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {TRY_CHOICES.map((choice, i) => (
            <button type="button" key={choice} onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-4 py-2 font-mono text-sm font-bold" style={pick === i ? { borderColor: i === TRY_CORRECT ? LINE_C : FLAG_C, background: `color-mix(in oklab, ${i === TRY_CORRECT ? LINE_C : FLAG_C} 12%, var(--surface))` } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{fmtNum(choice)}</button>
          ))}
        </div>
        <p className="m-0 mt-3 text-[15px] text-[var(--ink-soft)]">{pick === null ? "Choose the residual for that route." : tryFeedback(pick)}</p>
      </div>

      <h2>Where this chapter goes</h2>
      <p>
        Seven lessons follow. <strong>Dot Plots, Histograms, Box Plots</strong> and <strong>Comparing Distributions</strong> build the one-variable toolkit you just used on the residuals, then turn it on
        real classes, where an outlier drags a mean but leaves a median alone. <strong>The Normal Distribution</strong> adds the bell curve and the 68&ndash;95&ndash;99.7 rule, so a center and a spread become a
        percentage of a population. <strong>Two-Way Frequency Tables</strong> leaves numbers for categories and counts them into rows and columns. <strong>Fitting a Line &amp; Residuals</strong> puts the
        least-squares idea under a microscope, and <strong>Interpreting Slope &amp; Intercept</strong> takes those two numbers back out into the world as a price per gigabyte and a monthly fee.{" "}
        <strong>Correlation, Not Causation</strong> closes the chapter by measuring how tight a linear relationship is, then explaining why even a very tight one settles nothing about cause.
      </p>

      <MathCheck>
        <p>
          A <strong>residual</strong> is observed minus predicted, so the eight vertical gaps in the top panel become the eight numbers the bottom panel displays &mdash; the residual plot and the dot
          plot beside it are two displays of one small data set (S-ID.1). The open circles keep a second set on that plot, the one the least-squares line leaves behind, so its center and spread can be
          read against your line&apos;s; that comparison, not either number on its own, is how you decide which fit is tighter (S-ID.2). Center and spread still hide one thing, because a single unusual
          route can stretch a spread by itself: the usual test flags any residual more than 1.5 IQRs past Q1 or Q3 (S-ID.3), and {outlierNote(shape, m, b)}{" "}
          <strong>Fitting a function and analyzing residuals</strong> (S-ID.6) is those two moves in order: y = {m}x + {b} scores {ssrFor(shape, m, b)}, and because each week&apos;s misses cancel both
          overall and across route sizes, no straight line scores below {ssrFor(shape, TRUE_M, TRUE_B)} &mdash; yet that score alone cannot tell a good model from a wrong one, only the shape of the
          residuals can. The two numbers in the model carry meaning of their own (S-ID.7): {slopeSentence(m, b)}
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
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
