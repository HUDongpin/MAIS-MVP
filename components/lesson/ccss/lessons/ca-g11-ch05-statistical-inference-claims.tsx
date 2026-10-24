"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const MID = "var(--band-middle)";
const WARN = "var(--band-early)";
const SOFT = "var(--ink-soft)";

/** The population the survey is trying to describe. */
export const DISTRICT = 12000;
export const DISTRICT_LABEL = "12,000";
export const N_MIN = 60, N_MAX = 300, N_STEP = 60;
export const PCT_MIN = 30, PCT_MAX = 70, PCT_STEP = 5;
export const CLAIM_MIN = 30, CLAIM_MAX = 70, CLAIM_STEP = 10;

export type DesignKey = "random" | "volunteer" | "experiment";

/** Standard error of one sample percent, in percentage points. */
export function standardError(pct: number, n: number): number { return Math.sqrt((pct * (100 - pct)) / n); }
/** Margin of error: two standard errors, in percentage points. */
export function marginOfError(pct: number, n: number): number { return 2 * standardError(pct, n); }
/** Standard error of the GAP between two independent groups of n, which is wider than either group's own. */
export function seDifference(p1: number, p2: number, n: number): number { return Math.sqrt((p1 * (100 - p1) + p2 * (100 - p2)) / n); }
/**
 * The null swing of the gap: how far the two groups' rates can drift apart when
 * random assignment alone is at work and BOTH groups really sit at `pct`.
 *
 * The drawn band used to come from seDifference(pct, claim, n), which moves as
 * the marker moves — so the band breathed while the sentence beside it named a
 * set fixed by pct and n alone, and 183 of the 225 experiment states drew an
 * endpoint the lesson's own verdict rule calls "beyond". Conditioning on the
 * reminded group only, as the copy says, is this.
 */
export function seNull(pct: number, n: number): number { return Math.sqrt((2 * pct * (100 - pct)) / n); }
export function intervalOf(pct: number, n: number): { se: number; me: number; lo: number; hi: number } {
  const se = standardError(pct, n); return { se, me: 2 * se, lo: pct - 2 * se, hi: pct + 2 * se };
}
/** How many of the n people surveyed said yes. A whole number at every control setting. */
export function yesCount(pct: number, n: number): number { return (pct * n) / 100; }
export function points(k: number): string { return `${k} percentage point${k === 1 ? "" : "s"}`; }
/** One decimal place, kept as a number, so a printed operand and a printed result cannot disagree. */
export function round1(x: number): number { return Number(x.toFixed(1)); }
/** Inside the one-sample interval? Settled in whole numbers, so no rounding can flip it: |claim - pct| <= 2*sqrt(pct(100 - pct)/n) says exactly what (claim - pct)^2 * n <= 4*pct*(100 - pct) says, and the second never leaves the integers. */
export function claimIsPlausible(claim: number, pct: number, n: number): boolean {
  const gap = Math.abs(claim - pct);
  return gap * gap * n <= 4 * pct * (100 - pct);
}
/** An experiment compares two groups, so the yardstick is the swing in the GAP, not in one group: SE(gap)^2 = (p1(100 - p1) + p2(100 - p2))/n. Whole numbers again, and a gap can land exactly on the edge. */
export function gapVerdict(claim: number, pct: number, n: number): "routine" | "edge" | "beyond" {
  // Right-hand side is (2·seNull)² · n = 8·pct·(100−pct): whole numbers, so the
  // "edge" case stays exact, and it is the very bound the drawn band uses.
  const gap = Math.abs(claim - pct), left = gap * gap * n, right = 8 * pct * (100 - pct);
  return left < right ? "routine" : left === right ? "edge" : "beyond";
}

export type Band = { show: boolean; se: number; half: number; lo: number; hi: number };
/** What the figure draws: an estimation interval, a chance band for a gap, or no band at all. */
export function bandOf(key: DesignKey, pct: number, n: number, claim: number): Band {
  if (key === "volunteer") return { show: false, se: standardError(pct, n), half: 0, lo: pct, hi: pct };
  const se = key === "experiment" ? seNull(pct, n) : standardError(pct, n);
  return { show: true, se, half: 2 * se, lo: pct - 2 * se, hi: pct + 2 * se };
}
export type Shown = { seText: string; halfText: string; loText: string; hiText: string };
/** The band rounded ONCE, before anything is printed: the shown margin is twice the shown standard error, and the shown endpoints are the estimate plus and minus the shown margin, so no printed line can contradict another. The drawing and the verdicts keep the exact numbers. */
export function shownBand(key: DesignKey, pct: number, n: number, claim: number): Shown {
  const se = round1(bandOf(key, pct, n, claim).se), half = round1(2 * se);
  return { seText: se.toFixed(1), halfText: half.toFixed(1), loText: round1(pct - half).toFixed(1), hiText: round1(pct + half).toFixed(1) };
}

export type Design = { key: DesignKey; button: string; gathered: string; marker: string };
/** Everything that depends on how the data were collected. */
export function design(key: DesignKey, pct: number, n: number, claim: number): Design {
  const yes = yesCount(pct, n);
  if (key === "volunteer") return { key, button: "sign-up sheet", marker: `claim ${claim}%`, gathered: `The ${n} answers came from a sheet left by the gym door, so students put themselves in the sample.` };
  if (key === "experiment") return { key, button: "randomized experiment", marker: `no reminder ${claim}%`, gathered: `${n} students were assigned at random to get a reminder text and ${n} others to get none; ${yes} of the reminded students rode.` };
  return { key, button: "random sample", marker: `claim ${claim}%`, gathered: `All ${n} students were drawn at random from the ${DISTRICT_LABEL} in the district, and ${yes} said yes.` };
}

export type Readout = { headline: string; meaning: string; arithmetic: string };
/** The three lines of the readout box, built from the rounded band so the arithmetic shown comes out. */
export function readout(key: DesignKey, pct: number, n: number, claim: number): Readout {
  const s = shownBand(key, pct, n, claim);
  if (key === "volunteer") return { headline: `${pct}% of the ${n} who answered, and no band`, meaning: "a percent measured on the students who chose to answer, and an estimate for nobody at all", arithmetic: `${yesCount(pct, n)} of ${n} answers · a margin of error measures the luck of the draw, and this design never drew, so there is no band to put around the number` };
  if (key === "experiment") return { headline: `${s.loText}% to ${s.hiText}%`, meaning: `no-reminder rates that random assignment alone can produce when the reminded group lands on ${pct}%`, arithmetic: `standard error of the gap when both groups sit at ${pct}% sqrt(2 × ${pct} × ${100 - pct} / ${n}) = ${s.seText} · chance swing 2 × ${s.seText} = ${s.halfText} points` };
  return { headline: `${s.loText}% to ${s.hiText}%`, meaning: `plausible values for the percent of all ${DISTRICT_LABEL} district students who would ride`, arithmetic: `${pct}% of ${n} students · standard error sqrt(${pct} × ${100 - pct} / ${n}) = ${s.seText} · margin of error 2 × ${s.seText} = ${s.halfText} points` };
}

/** The sentence under the number line. True in every reachable state. */
export function verdict(key: DesignKey, pct: number, n: number, claim: number): string {
  const s = shownBand(key, pct, n, claim), gap = Math.abs(claim - pct);
  if (key === "volunteer") return `The sheet measured ${pct}% among the students who chose to answer, and for them that is a count, not an estimate. Whether ${claim}% is right for the ${DISTRICT_LABEL} district students is a question this design cannot answer at any sample size: the students who walked past the sheet were never given a chance to be counted, and no margin of error reaches them.`;
  if (key === "experiment") {
    if (gap === 0) return `Both groups came out at ${pct}%, so there is no gap here for the reminder to explain.`;
    const swing = `the ${s.halfText} points that random assignment alone swings the gap between two groups of ${n}`, where = gapVerdict(claim, pct, n);
    if (where === "routine") return `The two groups differ by ${points(gap)}, less than ${swing}, so the marker stands inside the band and nothing here credits the reminder.`;
    if (where === "edge") return `The two groups differ by ${points(gap)}, exactly ${swing}. The marker sits on the edge of the band, which settles nothing by itself: re-randomizing the two groups is what decides a gap this close.`;
    return `The two groups differ by ${points(gap)}, more than ${swing}, so the marker stands outside the band. Random assignment was the only thing separating the groups, so the reminder is the leading explanation for a gap that size.`;
  }
  return claimIsPlausible(claim, pct, n)
    ? `${claim}% sits inside the interval, so the survey does not rule the claim out: a district where ${claim}% would ride turns out samples like this one routinely.`
    : `${claim}% sits outside the interval — ${points(gap)} from the estimate, past the ${s.halfText}-point margin of error — so this sample is evidence against the claim.`;
}

export const W = 540, H = 176, PAD = 44;
export const AXIS_Y = 140, BAR_Y = 94, BAR_H = 18, CLAIM_TOP = 34, CLAIM_LABEL_Y = 26;
export const ARROW_LO = 4, ARROW_HI = 96, ARROW_HEAD = 8, MID_Y = BAR_Y + BAR_H / 2, TICKS = [0, 25, 50, 75, 100];

export function xAt(pct: number): number { return PAD + (pct / 100) * (W - 2 * PAD); }

/** The accessible name: the design, the drawing that design produces, and where the marker falls. */
export function figureLabel(key: DesignKey, pct: number, n: number, claim: number): string {
  const s = shownBand(key, pct, n, claim), marker = design(key, pct, n, claim).marker, scale = "A number line from 0 to 100 percent.";
  if (key === "volunteer") return `Sign-up sheet sample. ${scale} No band is drawn: the hollow dot for the ${pct} percent measured on ${n} self-selected answers sits between two dashed arrows running outward to both ends of the line, because the bias could push the district percent either way by an unknown amount, and the dashed marker labelled ${marker} has no band to be judged against.`;
  if (key === "experiment") {
    const where = gapVerdict(claim, pct, n);
    return `Randomized experiment. ${scale} A dashed band from ${s.loText} percent to ${s.hiText} percent around the reminded group's ${pct} percent covers the no-reminder rates random assignment alone can produce, and the dashed marker labelled ${marker} stands ${where === "beyond" ? "outside" : where === "edge" ? "on the edge of" : "inside"} the band.`;
  }
  return `Random sample. ${scale} A solid bar from ${s.loText} percent to ${s.hiText} percent surrounds the sample estimate of ${pct} percent from ${n} students, and the dashed marker labelled ${marker} stands ${claimIsPlausible(claim, pct, n) ? "inside" : "outside"} the bar.`;
}

/** Worked example: 225 of 300 randomly chosen families say they would use a late bus. */
export const WE_N = 300, WE_YES = 225, WE_CLAIM = 65, WE_BIG_N = 1200;

export function workedExample() {
  const pct = (WE_YES / WE_N) * 100, gap = Math.abs(pct - WE_CLAIM), small = intervalOf(pct, WE_N), big = intervalOf(pct, WE_BIG_N);
  return { pct, gap, small, big, errors: gap / small.se, ratio: WE_BIG_N / WE_N };
}
/** The six revealed steps as text, so the test reads every number the student is shown. */
export function workedExampleSteps(): string[] {
  const we = workedExample();
  return [
    `Start with the sample itself: ${WE_YES} of the ${WE_N} families said yes, and ${WE_YES}/${WE_N} = ${(WE_YES / WE_N).toFixed(2)}, so the sample estimate is ${we.pct}%.`,
    `Samples of ${WE_N} do not all land on the same number. Their typical distance from the truth is the standard error, sqrt(${we.pct} × ${100 - we.pct} / ${WE_N}) = sqrt(${(we.pct * (100 - we.pct)) / WE_N}) = ${we.small.se} points.`,
    `About 95% of random samples land within two standard errors of the population percent, so the margin of error is 2 × ${we.small.se} = ${we.small.me} points.`,
    `The interval of plausible population percents is ${we.pct}% plus or minus ${we.small.me} points: ${we.small.lo}% to ${we.small.hi}%.`,
    `The budget assumed ${WE_CLAIM}%. That is ${points(we.gap)} below the estimate, a distance of ${we.gap} / ${we.small.se} = ${we.errors} standard errors, so it falls outside ${we.small.lo}% to ${we.small.hi}% and the sample is evidence that the office planned for too few riders.`,
    `Want half the margin? You need ${we.ratio} times the families, not ${we.ratio / 2}: at ${WE_BIG_N} the standard error is ${we.big.se} and the margin is ${we.big.me} points, giving ${we.big.lo}% to ${we.big.hi}%.`,
  ];
}

/** Try it: a report gives the estimate and the margin of error, and you read the interval off it. */
export const TRY_PCT = 58, TRY_ME = 6;
export type TryOption = { text: string; ok: boolean; why: string };
export function tryOptions(): TryOption[] {
  const lo = TRY_PCT - TRY_ME, hi = TRY_PCT + TRY_ME, stated = { lo: 52, hi: 64 };
  return [
    { text: `Exactly ${TRY_PCT}% of all registered voters back the measure.`, ok: lo === hi, why: `a sample pins nothing down exactly; the report's own margin leaves everything from ${lo}% to ${hi}% in play` },
    { text: `Every percent from ${stated.lo}% to ${stated.hi}% is a plausible value for all registered voters.`, ok: stated.lo === lo && stated.hi === hi, why: "correct" },
    { text: "Fewer than half of all registered voters may well back the measure.", ok: lo < 50, why: `50% is below the low end ${lo}%, so this report does not leave that open` },
    { text: "A sample four times as large would carry the same 6-point margin of error.", ok: TRY_ME / Math.sqrt(4) === TRY_ME, why: `four times the sample halves the margin to ${TRY_ME / 2} points, since the margin shrinks with the square root of the sample size` },
  ];
}
export function tryAnswerIndex(): number { return tryOptions().findIndex((option) => option.ok); }
export function trySentence(): string { return `The report gives ${TRY_PCT}% give or take ${TRY_ME} points, so the plausible values run from ${TRY_PCT} − ${TRY_ME} = ${TRY_PCT - TRY_ME}% up to ${TRY_PCT} + ${TRY_ME} = ${TRY_PCT + TRY_ME}%.`; }

export default function Lesson() {
  const [n, setN] = useState(180);
  const [pct, setPct] = useState(60);
  const [claim, setClaim] = useState(50);
  const [key, setKey] = useState<DesignKey>("random");
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();

  const inside = claimIsPlausible(claim, pct, n), est = shownBand("random", pct, n, claim);
  const band = bandOf(key, pct, n, claim), d = design(key, pct, n, claim), box = readout(key, pct, n, claim);
  const markerColor = key === "volunteer" ? SOFT : key === "experiment" ? (gapVerdict(claim, pct, n) === "beyond" ? WARN : MID) : (inside ? MID : WARN);
  const steps = workedExampleSteps(), options = tryOptions(), answer = tryAnswerIndex();

  return (
    <div className="prose-lesson max-w-none">
      <p>A student paper prints one line: <em>60% of students would ride a late activity bus.</em>{" "}Nobody asked all {DISTRICT_LABEL} students in the district — a few hundred were asked, and the rest were left to the arithmetic. Ask a different few hundred and the number moves. So what, exactly, does the district now know?</p>
      <p>Enough to act, if you say it carefully. A random sample misses the truth, but it misses by an amount you can predict from the sample size, and that predictable miss becomes a band of population values the data leave standing. Everything in this chapter grows out of that band: how wide it is, which claims it rules out, and — the part no arithmetic can fix — whether the way the data were gathered lets a band be drawn at all.</p>

      <Figure caption="Each design draws its own picture: a random sample earns a band of population values, a sign-up sheet earns none, and an experiment is judged against the swing in the gap between its two groups.">
        <div className="flex flex-col items-center gap-5">
          <div className="flex max-w-full flex-wrap justify-center gap-2">
            {(["random", "volunteer", "experiment"] as DesignKey[]).map((option) => (
              <button key={option} type="button" onClick={() => setKey(option)} aria-pressed={key === option} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={key === option ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: SOFT }}>{design(option, pct, n, claim).button}</button>
            ))}
          </div>

          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(key, pct, n, claim)}>
            <line x1={xAt(claim)} y1={CLAIM_TOP} x2={xAt(claim)} y2={AXIS_Y} stroke={markerColor} strokeWidth={2} strokeDasharray="5 4" />
            <text x={xAt(claim)} y={CLAIM_LABEL_Y} textAnchor="middle" fontSize={11} fontWeight={800} fill={markerColor}>{d.marker}</text>
            <polygon points={`${xAt(claim) - 6},${AXIS_Y - 10} ${xAt(claim) + 6},${AXIS_Y - 10} ${xAt(claim)},${AXIS_Y}`} fill={markerColor} />
            {band.show ? (
              <g>
                <rect x={xAt(band.lo)} y={BAR_Y} width={xAt(band.hi) - xAt(band.lo)} height={BAR_H} rx={9} fill={ACCENT} fillOpacity={key === "experiment" ? 0.1 : 0.22} stroke={ACCENT} strokeWidth={2} strokeDasharray={key === "experiment" ? "7 5" : undefined} />
                <line x1={xAt(band.lo)} y1={BAR_Y - 6} x2={xAt(band.lo)} y2={BAR_Y + BAR_H + 6} stroke={ACCENT} strokeWidth={2} />
                <line x1={xAt(band.hi)} y1={BAR_Y - 6} x2={xAt(band.hi)} y2={BAR_Y + BAR_H + 6} stroke={ACCENT} strokeWidth={2} />
              </g>
            ) : (
              <g>
                <line x1={xAt(ARROW_LO)} y1={MID_Y} x2={xAt(ARROW_HI)} y2={MID_Y} stroke={WARN} strokeWidth={2} strokeDasharray="3 6" />
                <polygon points={`${xAt(ARROW_LO) - ARROW_HEAD},${MID_Y} ${xAt(ARROW_LO)},${BAR_Y + 1} ${xAt(ARROW_LO)},${BAR_Y + BAR_H - 1}`} fill={WARN} />
                <polygon points={`${xAt(ARROW_HI) + ARROW_HEAD},${MID_Y} ${xAt(ARROW_HI)},${BAR_Y + 1} ${xAt(ARROW_HI)},${BAR_Y + BAR_H - 1}`} fill={WARN} />
              </g>
            )}
            <circle cx={xAt(pct)} cy={MID_Y} r={7} fill={band.show ? ACCENT : "var(--surface)"} stroke={band.show ? "var(--surface)" : WARN} strokeWidth={2} />
            <line x1={xAt(0)} y1={AXIS_Y} x2={xAt(100)} y2={AXIS_Y} stroke={SOFT} strokeWidth={2} />
            {TICKS.map((tick) => (
              <g key={tick}><line x1={xAt(tick)} y1={AXIS_Y - 5} x2={xAt(tick)} y2={AXIS_Y + 6} stroke={SOFT} strokeWidth={1.5} /><text x={xAt(tick)} y={AXIS_Y + 22} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">{tick}%</text></g>
            ))}
          </svg>
          <div className="w-full max-w-2xl rounded-2xl border-2 px-5 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-lg font-black" style={{ color: ACCENT }}>{box.headline}</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">{box.meaning}</div>
            <div className="mt-1 font-mono text-xs text-[var(--ink-faint)]">{box.arithmetic}</div>
          </div>
          <div className="w-full max-w-2xl space-y-2 text-center text-[15px]">
            <p className="m-0 text-[var(--ink-soft)]">{d.gathered}</p>
            <p className="m-0"><strong>{verdict(key, pct, n, claim)}</strong></p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Students surveyed" value={n} min={N_MIN} max={N_MAX} step={N_STEP} onChange={setN} />
            <Stepper label="Percent saying yes" value={pct} min={PCT_MIN} max={PCT_MAX} step={PCT_STEP} onChange={setPct} suffix="%" />
            <Stepper label="Marked value" value={claim} min={CLAIM_MIN} max={CLAIM_MAX} step={CLAIM_STEP} onChange={setClaim} suffix="%" />
          </div>
        </div>
      </Figure>

      <h2>Worked example: does the budget figure survive?</h2>
      <p>A transportation office budgeted on the assumption that {WE_CLAIM}% of families would use a late bus. A survey then reaches {WE_N}{" "}randomly chosen families, and {WE_YES} of them say they would use it. Is {WE_CLAIM}% still a live possibility?</p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, shown).map((body, i) => (
            <li key={i} className="flex gap-3 text-[15px]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span><span>{body}</span>
            </li>
          ))}
        </ol>
        {shown === 0 && <p className="m-0 text-sm text-[var(--ink-faint)]">Press &ldquo;Next step&rdquo; to watch the solution unfold.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={shown > 0} aria-controls={stepsId} disabled={shown >= steps.length} onClick={() => setShown((v) => Math.min(steps.length, v + 1))} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next step</button>
          <button type="button" disabled={shown === 0} onClick={() => setShown(0)} className="rounded-lg border border-[var(--line)] px-4 py-1.5 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>A city paper reports: <em>in a random sample of registered voters, {TRY_PCT}% said they would vote for the bond measure, with a margin of error of {TRY_ME} percentage points.</em>{" "}Which conclusion does that report support?</p>
      <div className="flex flex-col gap-2">
        {options.map((option, i) => (
          <button key={i} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-2 text-left text-sm font-semibold" style={picked === i ? { background: i === answer ? "var(--band-upper)" : WARN, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: SOFT }}>{option.text}</button>
        ))}
      </div>
      {picked !== null && <p className="mt-3 text-[15px]">{picked === answer ? `Right. ${trySentence()}` : `Not quite — ${options[picked].why}. ${trySentence()}`}</p>}

      <h2>Your path through this chapter</h2>
      <p><strong>Sampling &amp; Inference</strong>{" "}draws sample after sample from a population you can see, so the scatter that produced the two-standard-error rule stops being a formula and becomes a picture. <strong>Surveys, Studies, Experiments</strong>{" "}sorts out the three buttons above: which design supports a statement about a population, which supports a statement about cause, and which supports very little. <strong>Margin of Error</strong>{" "}builds the bar you have been sliding and works out how fast it tightens as the sample grows.{" "}<strong>Comparing Two Treatments</strong>{" "}replaces the two-standard-error shortcut above with re-randomization: shuffle the two groups thousands of times and see how often chance alone makes a gap this large. <strong>Evaluating Data Reports</strong>{" "}turns the whole chapter on a published headline — who was asked, what was counted, and what the margin of error was never covering.</p>

      <MathCheck>
        <p>A sample percent is an estimate of a population percent, not the population percent: {pct}% came from {n} students, and a different{" "}{n} would have given something else (S-IC.1). What makes the estimate usable is that the miss is predictable — sample percents pile up around the population value with a standard error of sqrt(p(100 − p)/n), which at {pct}% of {n} is {est.seText} points, and about 95% of samples land within two of those, so a random sample of this size leaves {est.loText}% to {est.hiText}% standing (S-IC.4). Because n sits under a square root, four times the sample halves the band and no sample size shrinks it to nothing. That band is also a test of a proposed model: {claim}% falls {inside ? "inside" : "outside"} it, so data like these{" "}{inside ? "are consistent with that value" : "would be a surprise if that value were the truth, and it is the value that has to go"}{" "}(S-IC.2, S-IC.6). None of this arithmetic knows how the data arrived. Only a random sample makes the band a statement about the{" "}{DISTRICT_LABEL} students; a self-selected sheet gets no band at all, because a margin of error measures the luck of the draw and that design never drew (S-IC.3). Comparing two treatments needs a wider yardstick still: both groups swing, so their gap swings by sqrt(p1(100 − p1)/n + p2(100 − p2)/n) — about 1.4 times one group&rsquo;s own standard error — and only a gap past two of those is evidence that the reminder, the one thing random assignment left different between the groups, caused it (S-IC.5).</p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-14 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}{suffix}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
