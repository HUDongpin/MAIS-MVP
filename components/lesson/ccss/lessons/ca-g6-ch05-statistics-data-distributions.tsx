"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const MEAN_C = "var(--band-early)";
const MED_C = "var(--band-upper)";

export const CENTER_MIN = 10;
export const CENTER_MAX = 15;
export const SPACING_MIN = 0;
export const SPACING_MAX = 3;
export const AXIS_MAX = 24;
export const PAD = 28;
export const STEP = 20;
export const W = AXIS_MAX * STEP + 2 * PAD;
export const H = 170;
export const AXIS_Y = 132;
export const DOT_R = 6;
export const DOT_GAP = 13;
export const MEAN_HALF = 5;   // half-width of the mean triangle, in px
export const MED_W = 2.5;     // stroke width of the median line, in px

export type Shape = "symmetric" | "right" | "left";
/** Nine offsets from the typical answer, each multiplied by the spacing. The 5th sorted offset is
 *  always 0 (median = typical answer) and every pattern spans 4 (range = 4 x the spacing). */
export const SHAPES: { key: Shape; label: string; offsets: number[] }[] = [
  { key: "symmetric", label: "Symmetric", offsets: [-2, -1, -1, 0, 0, 0, 1, 1, 2] },
  { key: "right", label: "Tail to the right", offsets: [-1, 0, 0, 0, 0, 1, 1, 2, 3] },
  { key: "left", label: "Tail to the left", offsets: [-3, -2, -1, -1, 0, 0, 0, 0, 1] },
];

export function sortAsc(values: number[]) { return [...values].sort((a, b) => a - b); }
export function answersFor(center: number, spacing: number, shape: Shape) {
  const offsets = (SHAPES.find((s) => s.key === shape) ?? SHAPES[0]).offsets;
  return sortAsc(offsets.map((o) => center + o * spacing));
}
export function mean(values: number[]) { return values.reduce((s, v) => s + v, 0) / values.length; }
export function median(values: number[]) {
  const s = sortAsc(values);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export function rangeOf(values: number[]) { return Math.max(...values) - Math.min(...values); }
/** Exact when the value is a whole number; otherwise flagged as rounded. */
export function fmt(x: number) { return Number.isInteger(x) ? String(x) : x.toFixed(1); }
export function approx(x: number) { return Number.isInteger(x) ? String(x) : `about ${x.toFixed(1)}`; }
export function xOf(v: number) { return PAD + v * STEP; }
export function dotY(level: number) { return AXIS_Y - DOT_R - 2 - (level - 1) * DOT_GAP; }
/** A tick at every whole minute the data can land on; only the even ones carry a number. */
export function axisTicks() { return Array.from({ length: AXIS_MAX + 1 }, (_, i) => i); }
export function isLabeledTick(v: number) { return v % 2 === 0; }
export function stackDots(values: number[]) {
  const seen: Record<number, number> = {};
  return sortAsc(values).map((v) => { seen[v] = (seen[v] ?? 0) + 1; return { v, level: seen[v] }; });
}
export function shapeNote(spacing: number, shape: Shape, med: number, mu: number) {
  if (spacing === 0) return `All nine answers are ${med} minutes, so the range is 0. With no variability there is no shape to describe, and the mean sits exactly on the median.`;
  if (shape === "right") return `Four of the nine trips sit at ${med} minutes and a few longer ones trail off to the right, so the mean (${approx(mu)}) is pulled above the median (${med}).`;
  if (shape === "left") return `Four of the nine trips sit at ${med} minutes and a few shorter ones trail off to the left, so the mean (${approx(mu)}) is pulled below the median (${med}).`;
  return `The dots balance evenly around ${med}, so the mean and the median are both ${med} minutes.`;
}
export function figureLabel(med: number, mu: number, range: number) {
  return `Dot plot of nine answers: median ${med} minutes, mean ${approx(mu)} minutes, range ${range} minutes`;
}
/** The skew claim, gated on the live spacing: at spacing 0 all three shapes coincide. */
export function skewClaim(spacing: number) {
  if (spacing === 0) {
    return "The spacing is 0 right now, so all three shapes give the same nine dots and the mean sits exactly on the median. Raise the spacing above 0 and the shapes come apart: a tail to the right then pulls the mean above the median, and a tail to the left pulls it below, because the mean is the balance point of all nine values while the median only counts positions.";
  }
  return "With the spacing above 0, a tail to the right pulls the mean above the median and a tail to the left pulls it below, because the mean is the balance point of all nine values and one far answer tips it, while the median only counts positions and does not move.";
}

export const EXAMPLE = [2, 3, 3, 4, 5, 6, 12];
export function exampleSteps() {
  const s = sortAsc(EXAMPLE);
  const sum = s.reduce((a, b) => a + b, 0);
  const med = median(s), mu = mean(s), r = rangeOf(s), lo = s[0], hi = s[s.length - 1];
  return [
    { title: "Put the answers in order", text: `${s.join(", ")}. The middle value, the ${(s.length + 1) / 2}th of ${s.length}, is ${med}, so the median is ${med} books.` },
    { title: "Find the mean", text: `${s.join(" + ")} = ${sum}, and ${sum} ÷ ${s.length} = ${approx(mu)}. The mean is ${approx(mu)} books.` },
    { title: "Find the range", text: `Largest minus smallest: ${hi} − ${lo} = ${r}. The answers vary by ${r} books.` },
    { title: "Describe the distribution in context", text: `A typical club member read about ${med} books. The one student who read ${hi} makes a tail to the right and pulls the mean up to ${approx(mu)}, above the median. A range of ${r} says reading habits in the club vary a lot.` },
  ];
}

export const TRY_DATA = [6, 7, 7, 8, 8, 8, 9, 10, 18];
export const TRY_CHOICES = [7, 8, 9, 18];
export const TRY_CORRECT = TRY_CHOICES.indexOf(median(TRY_DATA));
export function tryFeedback(i: number) {
  const s = sortAsc(TRY_DATA);
  const sum = s.reduce((a, b) => a + b, 0), mu = mean(s), med = median(s), hi = s[s.length - 1];
  if (i === TRY_CORRECT) return `Correct. In order, the 5th of the 9 values is ${med}, so the median is ${med} minutes, even though the mean is ${approx(mu)}.`;
  if (TRY_CHOICES[i] === mu) return `Not quite. ${approx(mu)} is the mean (${sum} ÷ ${s.length}); the single answer of ${hi} pulls it above the middle value, which is ${med}.`;
  if (TRY_CHOICES[i] === hi) return `Not quite. ${hi} is the largest answer; it stretches the range, but it is not the middle value, which is ${med}.`;
  return `Not quite. ${TRY_CHOICES[i]} appears in the data, but the median is the middle of the ordered list, the 5th of 9 values, which is ${med}.`;
}

export default function Lesson() {
  const [center, setCenter] = useState(12);
  const [spacing, setSpacing] = useState(2);
  const [shape, setShape] = useState<Shape>("symmetric");
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const answers = answersFor(center, spacing, shape);
  const med = median(answers);
  const mu = mean(answers);
  const range = rangeOf(answers);
  const dots = stackDots(answers);
  const steps = exampleSteps();

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Ask one student, &ldquo;How many minutes does it take you to get to school?&rdquo; and you
        get one number. Ask the whole class and you get a crowd of different numbers: some walk two
        blocks, some ride a bus across town. A question whose answers you <em>expect</em> to vary is a{" "}
        <strong>statistical question</strong>, and the pile of answers it collects is a{" "}
        <strong>distribution</strong>.
      </p>
      <p>
        This chapter is about reading that pile. Every distribution has a <strong>center</strong> (a
        typical answer), a <strong>spread</strong> (how far the answers fan out), and a{" "}
        <strong>shape</strong> (where they bunch up and where they trail off). Nine students answered
        below. Move the typical answer, the spacing between neighboring answers, and the shape, then
        watch the dot plot and its summary numbers change together.
      </p>

      <Figure caption="Nine answers to one statistical question. The green dashed line is the median; the orange triangle is the mean, the balance point of all nine values.">
        <div className="flex flex-col items-center gap-5">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(med, mu, range)}>
            <line x1={PAD} y1={AXIS_Y} x2={W - PAD} y2={AXIS_Y} stroke="var(--ink-soft)" strokeWidth={2} />
            {axisTicks().map((v) => (
              <g key={v}>
                <line x1={xOf(v)} y1={AXIS_Y - (isLabeledTick(v) ? 5 : 3)} x2={xOf(v)} y2={AXIS_Y + (isLabeledTick(v) ? 5 : 3)} stroke="var(--ink-soft)" strokeWidth={isLabeledTick(v) ? 1.5 : 1} />
                {isLabeledTick(v) ? (
                  <text x={xOf(v)} y={AXIS_Y + 28} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{v}</text>
                ) : null}
              </g>
            ))}
            <line x1={xOf(med)} y1={10} x2={xOf(med)} y2={AXIS_Y + 5} stroke={MED_C} strokeWidth={MED_W} strokeDasharray="4 3" />
            {dots.map((d, i) => (
              <circle key={i} cx={xOf(d.v)} cy={dotY(d.level)} r={DOT_R} fill={ACCENT} stroke="var(--surface)" strokeWidth={1} />
            ))}
            <polygon points={`${xOf(mu)},${AXIS_Y + 5} ${xOf(mu) - MEAN_HALF},${AXIS_Y + 16} ${xOf(mu) + MEAN_HALF},${AXIS_Y + 16}`} fill={MEAN_C} />
          </svg>
          <div className="-mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">minutes to get to school</div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <Fact label="Median (center)" value={`${med}`} color={MED_C} />
            <Fact label="Mean (center)" value={fmt(mu)} color={MEAN_C} />
            <Fact label="Range (variability)" value={`${range}`} />
          </div>
          <p className="m-0 max-w-md text-center text-[15px] text-[var(--ink-soft)]">{shapeNote(spacing, shape, med, mu)}</p>

          <div className="flex flex-wrap items-start justify-center gap-6">
            <Stepper label="Typical answer (minutes)" value={center} min={10} max={15} onChange={setCenter} />
            <Stepper label="Spacing (minutes)" value={spacing} min={0} max={3} onChange={setSpacing} />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Shape</span>
              <div className="flex flex-wrap justify-center gap-2">
                {SHAPES.map((s) => (
                  <button type="button" key={s.key} onClick={() => setShape(s.key)} aria-pressed={shape === s.key} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={shape === s.key ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{s.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Figure>

      <h2>Worked example: describe a distribution</h2>
      <p>
        Seven students in a reading club were asked, &ldquo;How many books did you finish in June?&rdquo;
        Their answers: <strong>{EXAMPLE.join(", ")}</strong>. Describe the distribution.
      </p>
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setStep((k) => Math.min(steps.length, k + 1))} disabled={step >= steps.length} aria-expanded={step > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next step</button>
          <button type="button" onClick={() => setStep(0)} disabled={step === 0} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
          <span className="text-sm text-[var(--ink-faint)]">{step} of {steps.length} steps shown</span>
        </div>
        <ol id={stepsId} className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
          {steps.slice(0, step).map((s, i) => (
            <li key={s.title} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-[15px]">
              <strong style={{ color: ACCENT }}>Step {i + 1}: {s.title}.</strong> {s.text}
            </li>
          ))}
        </ol>
      </div>

      <h2>Try it</h2>
      <p>
        Nine more students answered the trip question: <strong>{TRY_DATA.join(", ")}</strong> minutes.
        The mean is {approx(mean(TRY_DATA))}. What is the <strong>median</strong>?
      </p>
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {TRY_CHOICES.map((c, i) => (
            <button type="button" key={c} onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-4 py-2 font-mono text-sm font-bold" style={pick === i ? { borderColor: i === TRY_CORRECT ? MED_C : MEAN_C, background: `color-mix(in oklab, ${i === TRY_CORRECT ? MED_C : MEAN_C} 12%, var(--surface))` } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{c}</button>
          ))}
        </div>
        <p className="m-0 mt-3 text-[15px] text-[var(--ink-soft)]">{pick === null ? "Choose the median." : tryFeedback(pick)}</p>
      </div>

      <h2>Your map for this chapter</h2>
      <p>
        Three lessons follow this one. <strong>Statistical Questions</strong> sharpens the first idea:
        which questions deserve a whole distribution of answers and which have just one.{" "}
        <strong>Mean, Median &amp; Spread</strong> takes the summary numbers apart: you will edit a data
        set one value at a time and watch measures of center and measures of variability respond
        differently. <strong>Dot Plots, Histograms &amp; Box Plots</strong> shows the same data three
        ways so you can choose the picture that tells the story best.
      </p>

      <MathCheck>
        <p>
          A <strong>statistical question</strong> is one whose answers are expected to vary (6.SP.A.1).
          The question still anticipates variety even when a class happens to answer the same: set the
          spacing to 0 and all nine answers land on one number, so the range is 0 and there is no
          variability left to describe. Varied answers form a <strong>distribution</strong> with a
          center, a spread, and a shape (6.SP.A.2). The <strong>median</strong> and <strong>mean</strong>{" "}
          measure center, while the <strong>range</strong> measures variability (6.SP.A.3): here the
          median is {med}, the mean is {approx(mu)}, and the range is {range} minutes. A{" "}
          <strong>dot plot</strong> displays every one of the nine answers (6.SP.B.4), and reporting how
          many answers there are, their summary numbers, and their shape in the context of the question
          is what it means to summarize a data set (6.SP.B.5). Center and variability answer different
          questions, which is why neither one replaces the other: every setting above with the same
          typical answer has median {med}, yet the range moves from 0 to {4 * SPACING_MAX} minutes as
          the answers fan out. {skewClaim(spacing)}
        </p>
      </MathCheck>
    </div>
  );
}

function Fact({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</div>
      <div className="font-mono text-xl font-black" style={color ? { color } : undefined}>{value}</div>
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
