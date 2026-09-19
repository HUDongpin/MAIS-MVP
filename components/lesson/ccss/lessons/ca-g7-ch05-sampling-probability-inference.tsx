"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const YES_FILL = "var(--band-upper)";

/** Controls. Every school size is a multiple of every sample size, so the estimate is always a whole count. */
export const N_MIN = 10, N_MAX = 40, N_STEP = 10, YES_MIN = 0;
export const SCHOOL_SIZES = [360, 600, 840] as const;

/** Figure geometry: a 0-to-1 probability scale above a two-stage tree diagram. */
export const W = 520, H = 330, PAD = 46, LINE_Y = 58, LINE_W = W - 2 * PAD;
export const ROOT_X = 66, ROOT_Y = 212, NODE_X = 198, NODE_YES_Y = 160, NODE_NO_Y = 264, NODE_R = 14;
export const LEAF_X = 318, LEAF_Y = [130, 190, 238, 298] as const;

export function scaleX(p: number): number { return PAD + p * LINE_W; }
/** Flip the marker label inward near the ends of the scale so its text never leaves the viewBox. */
export function labelAnchor(p: number): "start" | "middle" | "end" { return p < 0.12 ? "start" : p > 0.88 ? "end" : "middle"; }
export function clampYes(yes: number, n: number): number { return Math.min(Math.max(YES_MIN, yes), n); }
export function estimateForSchool(yes: number, n: number, school: number): number { return (yes * school) / n; }
export function students(k: number): string { return `${k} ${k === 1 ? "student" : "students"}`; }
/** "= 0.50" when the decimal terminates within `places` digits, otherwise "≈ 0.03". */
export function ratioText(num: number, den: number, places: number): string { return `${(num * 10 ** places) % den === 0 ? "=" : "≈"} ${(num / den).toFixed(places)}`; }

/** Where yes/n sits on the 0-to-1 scale, in words. Integer comparisons only, so no rounding decides it. */
export function likelihoodWord(yes: number, n: number): string {
  if (yes === 0) return "impossible";
  if (yes === n) return "certain";
  return 2 * yes === n ? "as likely as not" : 2 * yes < n ? "unlikely" : "likely";
}

/** "= 30%", "= 7.5%", or "≈ 3.3%" — exact whenever the arithmetic is exact. */
export function percentText(num: number, den: number): string {
  const pct = (num * 100) / den;
  if ((num * 100) % den === 0) return `= ${pct}%`;
  return `${(num * 1000) % den === 0 ? "=" : "≈"} ${pct.toFixed(1)}%`;
}

/** The four endings of two independent picks, each counted out of the n × n equally likely ordered pairs. */
export function treeOutcomes(yes: number, n: number) {
  const no = n - yes;
  return [
    { words: "yes, then yes", second: yes, num: yes * yes }, { words: "yes, then no", second: no, num: yes * no },
    { words: "no, then yes", second: yes, num: no * yes }, { words: "no, then no", second: no, num: no * no },
  ];
}

export function figureLabel(yes: number, n: number): string {
  const no = n - yes;
  return `A probability scale from 0 to 1 with the sample proportion ${yes} out of ${n} marked on it, above a tree diagram for two independent picks whose four outcome counts ${yes * yes}, ${yes * no}, ${no * yes} and ${no * no} add to ${n * n}.`;
}

/** Worked example: two random samples of eight students, minutes of homework last night. */
export const SAMPLE_7 = [20, 30, 30, 40, 40, 50, 50, 60] as const;
export const SAMPLE_8 = [40, 45, 55, 60, 65, 70, 70, 75] as const;
export function total(xs: readonly number[]): number { return xs.reduce((sum, x) => sum + x, 0); }
export function mean(xs: readonly number[]): number { return total(xs) / xs.length; }
export function absoluteDeviationTotal(xs: readonly number[]): number { const m = mean(xs); return total(xs.map((x) => Math.abs(x - m))); }

export function workedExample() {
  const size = SAMPLE_7.length;
  const mean7 = mean(SAMPLE_7), mean8 = mean(SAMPLE_8);
  const dev7 = absoluteDeviationTotal(SAMPLE_7), dev8 = absoluteDeviationTotal(SAMPLE_8);
  const mad7 = dev7 / size, mad8 = dev8 / size, gap = mean8 - mean7, typicalSpread = (mad7 + mad8) / 2;
  return { size, sum7: total(SAMPLE_7), sum8: total(SAMPLE_8), mean7, mean8, dev7, dev8, mad7, mad8, gap, typicalSpread, gapInSpreads: gap / typicalSpread };
}

/** Try it: 15 of 25 said yes, so P(both of two independent picks say yes) = (15/25)². */
export const TRY = { yes: 15, n: 25 } as const;

export function tryChoices(): { percent: number; why: string }[] {
  const { yes, n } = TRY, no = n - yes;
  return [
    { percent: (yes * no * 100) / (n * n), why: "the chance the first pick says yes and the second says no" },
    { percent: (yes * yes * 100) / (n * n), why: "correct" },
    { percent: (yes * 100) / n, why: "the chance for one pick, not for two" },
    { percent: (2 * yes * 100) / n, why: "the two chances added; a probability can never pass 100%" },
  ];
}

export function tryAnswerIndex(): number { return tryChoices().findIndex((c) => c.percent === (TRY.yes * TRY.yes * 100) / (TRY.n * TRY.n)); }

export default function Lesson() {
  const [n, setN] = useState(20);
  const [yesRaw, setYes] = useState(12);
  const [school, setSchool] = useState<number>(SCHOOL_SIZES[1]);
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();

  const yes = clampYes(yesRaw, n), no = n - yes, p = yes / n;
  const estimate = estimateForSchool(yes, n, school);
  const outcomes = treeOutcomes(yes, n);
  const panels = [
    { title: "The sample", tone: YES_FILL, head: `${yes} of ${n} said yes`, note: `that is ${yes}/${n} ${percentText(yes, n)} of the ${students(n)} you asked` },
    { title: "Estimate for the school", tone: ACCENT, head: `${yes}/${n} × ${school} = ${estimate}`, note: `about ${estimate} of the ${school} students would say yes` },
    { title: "Model for one pick", tone: null, head: `P(yes) = ${yes}/${n} ${ratioText(yes, n, 2)} and P(no) = ${no}/${n} ${ratioText(no, n, 2)}`, note: `${yes}/${n} + ${no}/${n} = ${n}/${n} = 1, and on the scale above a yes reads as ${likelihoodWord(yes, n)}` },
    { title: "Two independent picks", tone: null, head: `P(both yes) = ${yes}/${n} × ${yes}/${n} = ${yes * yes}/${n * n} ${ratioText(yes * yes, n * n, 3)}`, note: `the ${n * n} ordered pairs split ${yes * yes} + ${yes * no} + ${no * yes} + ${no * no} = ${n * n}` },
  ];

  const ex = workedExample();
  const steps = [
    <>Find each center. The grade 7 sample adds to {ex.sum7} minutes, so its mean is {ex.sum7} ÷ {ex.size} = {ex.mean7} minutes. The grade 8 sample adds to {ex.sum8}, so its mean is {ex.sum8} ÷ {ex.size} = {ex.mean8} minutes.</>,
    <>Find each spread. In grade 7 the distances from {ex.mean7} add to {ex.dev7}, so the mean absolute deviation is {ex.dev7} ÷ {ex.size} = {ex.mad7} minutes. In grade 8 the distances from {ex.mean8} also add to {ex.dev8}, giving a MAD of {ex.mad8} minutes.</>,
    <>Measure the gap between the two centers: {ex.mean8} − {ex.mean7} = {ex.gap} minutes.</>,
    <>Say how big that gap is in the samples&apos; own unit of spread: {ex.gap} ÷ {ex.typicalSpread} = {ex.gapInSpreads}. The centers sit {ex.gapInSpreads} MADs apart — twice as far as a typical student sits from their own group&apos;s mean — so the two grades really do differ, and this is not a wobble you would shrug off.</>,
  ];

  const choices = tryChoices(), answer = tryAnswerIndex(), tryNo = TRY.n - TRY.yes;
  const trySentence = `P(yes) = ${TRY.yes}/${TRY.n} = ${(TRY.yes / TRY.n).toFixed(1)}, so for two independent picks P(both yes) = ${TRY.yes}/${TRY.n} × ${TRY.yes}/${TRY.n} = ${TRY.yes * TRY.yes}/${TRY.n * TRY.n} = ${choices[answer].percent}%.`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Your school is deciding whether to open the library on Saturday mornings, and nobody has time to ask every student. So you ask a small group chosen{" "}
        <strong>at random</strong>{" "}and let their answers stand in for everyone. That move is <strong>sampling</strong>, and it works only because of a
        second idea: <strong>chance</strong>. A random pick plays no favorites, which is why a randomly chosen sample tends to look like its school.
      </p>
      <p>
        This chapter turns that into arithmetic, and one fraction does most of the work. If <strong>{yes}</strong>{" "}of the <strong>{n}</strong>{" "}students you
        asked say yes, then {yes}/{n} is your estimate of the fraction of the whole school that would say yes — and it is also the{" "}
        <strong>probability</strong>{" "}that one student picked at random says yes. Scale it up and it predicts a population. Multiply it by itself and it
        gives the chance that two picks both come back yes. Move the controls and watch every reading change together.
      </p>

      <Figure caption="The dots are the sample. The scale shows where that fraction sits between impossible and certain, and the tree splits two independent picks into four endings whose counts add back to every possible pair.">
        <div className="flex flex-col items-center gap-5">
          <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">&ldquo;Would you use the library on a Saturday morning?&rdquo; (filled = yes)</p>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(10, 1.15rem)" }}>
            {Array.from({ length: n }, (_, i) => <span key={i} className="h-4 w-4 rounded-full border" style={i < yes ? { background: YES_FILL, borderColor: YES_FILL } : { background: "var(--surface-2)", borderColor: "var(--line)" }} />)}
          </div>

          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(yes, n)}>
            <text x={W / 2} y={20} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink-faint)">Probability scale: 0 is impossible, 1 is certain</text>
            <line x1={PAD} y1={LINE_Y} x2={W - PAD} y2={LINE_Y} stroke="var(--ink-soft)" strokeWidth={2} />
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}><line x1={scaleX(t)} y1={LINE_Y - 6} x2={scaleX(t)} y2={LINE_Y + 6} stroke="var(--ink-soft)" strokeWidth={1.5} /><text x={scaleX(t)} y={LINE_Y + 20} textAnchor="middle" fontSize={10} fill="var(--ink-faint)">{t}</text></g>
            ))}
            <circle cx={scaleX(p)} cy={LINE_Y} r={7} fill={ACCENT} stroke="var(--surface)" strokeWidth={2} />
            <text x={scaleX(p)} y={LINE_Y - 16} textAnchor={labelAnchor(p)} fontSize={11} fontWeight={800} fill={ACCENT}>P(yes) = {yes}/{n} {ratioText(yes, n, 2)}</text>
            <line x1={PAD} y1={92} x2={W - PAD} y2={92} stroke="var(--line)" strokeWidth={1} />
            <text x={W / 2} y={110} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink-faint)">Pick a student, put the name back, pick again</text>
            <line x1={ROOT_X} y1={ROOT_Y} x2={NODE_X} y2={NODE_YES_Y} stroke={YES_FILL} strokeWidth={2} />
            <line x1={ROOT_X} y1={ROOT_Y} x2={NODE_X} y2={NODE_NO_Y} stroke="var(--ink-faint)" strokeWidth={2} />
            <text x={(ROOT_X + NODE_X) / 2} y={(ROOT_Y + NODE_YES_Y) / 2 - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill={YES_FILL}>{yes}/{n}</text>
            <text x={(ROOT_X + NODE_X) / 2} y={(ROOT_Y + NODE_NO_Y) / 2 + 14} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--ink-faint)">{no}/{n}</text>
            <circle cx={ROOT_X} cy={ROOT_Y} r={13} fill="var(--surface-2)" stroke="var(--line)" strokeWidth={1.5} />
            <text x={ROOT_X} y={ROOT_Y + 3} textAnchor="middle" fontSize={9} fill="var(--ink-soft)">start</text>
            <circle cx={NODE_X} cy={NODE_YES_Y} r={NODE_R} fill={YES_FILL} />
            <text x={NODE_X} y={NODE_YES_Y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="white">yes</text>
            <circle cx={NODE_X} cy={NODE_NO_Y} r={NODE_R} fill="var(--surface-2)" stroke="var(--line)" strokeWidth={1.5} />
            <text x={NODE_X} y={NODE_NO_Y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--ink-soft)">no</text>
            {outcomes.map((o, i) => {
              const fromY = i < 2 ? NODE_YES_Y : NODE_NO_Y, leafY = LEAF_Y[i], tone = i === 0 ? ACCENT : "var(--ink-soft)";
              return (
                <g key={o.words}>
                  <line x1={NODE_X + NODE_R} y1={fromY} x2={LEAF_X} y2={leafY} stroke="var(--line)" strokeWidth={1.5} /><circle cx={LEAF_X} cy={leafY} r={5} fill={tone} />
                  <text x={(NODE_X + NODE_R + LEAF_X) / 2} y={(fromY + leafY) / 2 - 5} textAnchor="middle" fontSize={9} fill="var(--ink-faint)">{o.second}/{n}</text>
                  <text x={LEAF_X + 12} y={leafY + 4} textAnchor="start" fontSize={11} fontWeight={i === 0 ? 800 : 500} fill={tone}>{o.words}</text><text x={W - PAD} y={leafY + 4} textAnchor="end" fontSize={11} fontWeight={i === 0 ? 800 : 500} fill={tone}>{o.num}/{n * n}</text>
                </g>
              );
            })}
            <text x={W - PAD} y={322} textAnchor="end" fontSize={10} fill="var(--ink-faint)">the four endings total {n * n}/{n * n} = 1</text>
          </svg>

          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            {panels.map((panel) => (
              <div key={panel.title} className={panel.tone ? "rounded-xl border-2 px-4 py-3" : "rounded-xl bg-[var(--surface-2)] px-4 py-3"} style={panel.tone ? { borderColor: panel.tone } : undefined}>
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: panel.tone ?? "var(--ink-faint)" }}>{panel.title}</div>
                <div className="font-mono text-sm font-black">{panel.head}</div><div className="text-sm text-[var(--ink-soft)]">{panel.note}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end justify-center gap-6">
            <Stepper label="Sample size" value={n} min={10} max={40} step={10} onChange={(v) => { setN(v); setYes((k) => Math.min(k, v)); }} />
            <Stepper label="Yes answers" value={yes} min={0} max={n} step={1} onChange={setYes} />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">School size</span>
              <div className="flex gap-2">
                {SCHOOL_SIZES.map((s) => <button key={s} type="button" onClick={() => setSchool(s)} aria-pressed={school === s} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={school === s ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{s}</button>)}
              </div>
            </div>
          </div>
        </div>
      </Figure>

      <h2>Worked example: is the difference real?</h2>
      <p>
        A random sample of {students(ex.size)} in grade 7 and another {ex.size} in grade 8 report last night&apos;s homework minutes. Grade 7:{" "}
        {SAMPLE_7.join(", ")}. Grade 8: {SAMPLE_8.join(", ")}. Grade 8 looks like the longer-working group — but every sample wobbles, so how do you decide
        whether the two grades really differ?
      </p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, shown).map((body, i) => (
            <li key={i} className="flex gap-3 text-[15px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span><span>{body}</span></li>
          ))}
        </ol>
        {shown === 0 && <p className="m-0 text-sm text-[var(--ink-faint)]">Press &ldquo;Next step&rdquo; to watch the reasoning unfold.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={shown > 0} aria-controls={stepsId} disabled={shown >= steps.length} onClick={() => setShown((s) => Math.min(steps.length, s + 1))} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next step</button>
          <button type="button" disabled={shown === 0} onClick={() => setShown(0)} className="rounded-lg border border-[var(--line)] px-4 py-1.5 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>
        In a different random sample, {TRY.yes} of {TRY.n} students said yes and {tryNo} said no. Using that sample as your model, you pick one
        of the {TRY.n} at random, put the name back, and pick again. What is the probability that <em>both</em>{" "}picks say yes?
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map((c, i) => <button key={c.percent} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={picked === i ? { background: i === answer ? "var(--band-upper)" : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{c.percent}%</button>)}
      </div>
      {picked !== null && (
        <p className="mt-3 text-[15px]">{picked === answer ? `Right. ${trySentence}` : `Not quite — ${choices[picked].percent}% is ${choices[picked].why}. ${trySentence}`}</p>
      )}

      <h2>Your path through this chapter</h2>
      <p>
        <strong>Sampling &amp; Inference</strong>{" "}takes the first move apart: what makes a sample random, why a biased one lies, and how resampling shows a
        single estimate wobbling. <strong>Comparing Two Populations</strong>{" "}picks the worked example back up and compares two groups properly, by overlap,
        center, and spread. <strong>Probability 0 to 1</strong>{" "}slows down on the scale itself and on estimating a probability by running trials and
        counting. <strong>Probability Models</strong>{" "}builds spinners and bags whose outcome probabilities add to 1, including lopsided ones where the
        outcomes are not equally likely. <strong>Compound Events</strong>{" "}finishes the tree you just read by listing the whole sample space of two dice.
      </p>

      <MathCheck>
        <p>
          A <strong>random sample</strong>{" "}can stand in for a population because random selection gives every student the same chance of being
          chosen, so the sample tends to be representative rather than tilted (7.SP.A.1). That is what licenses the estimate: treating the sample
          fraction as the school-wide fraction gives {yes}/{n} × {school} = {estimate}, so about {estimate} of the {school} students would say yes
          (7.SP.A.2). The same fraction is a <strong>probability</strong>{" "}— a number on a scale where 0 means impossible and 1 means certain — and {yes}/{n}{" "}
          {ratioText(yes, n, 2)} reads there as {likelihoodWord(yes, n)} (7.SP.C.5). It was built by counting real answers, which is how a probability is
          approximated from collected data: the relative frequency of yes in the sample (7.SP.C.6). Listing P(yes) = {yes}/{n} beside P(no) = {no}/{n} is a{" "}
          <strong>probability model</strong>{" "}for one pick, and the two add to {n}/{n} = 1 because every student answered one way or the other (7.SP.C.7).
          Two picks with the name put back have {n} × {n} = {n * n} equally likely ordered pairs, and the tree&apos;s four endings count {yes * yes} +{" "}
          {yes * no} + {no * yes} + {no * no} = {n * n} of them, so P(both yes) = {yes * yes}/{n * n} (7.SP.C.8). Comparing two groups needs one step more,
          the one in the worked example: put both centers on the same scale and measure the gap in units of the spread inside a group, where {ex.gap}{" "}
          minutes is {ex.gapInSpreads} mean absolute deviations, a gap you can see rather than a wobble you would shrug off (7.SP.B.3, 7.SP.B.4).</p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
