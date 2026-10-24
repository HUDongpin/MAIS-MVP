"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const RIVAL = "var(--band-upper)";
const MISS = "var(--band-early)";
const TINT = "color-mix(in oklab, var(--band-middle) 16%, var(--surface))";
const GHOST = "color-mix(in oklab, var(--band-upper) 45%, var(--surface))";

/* ---------- control bounds: the controls below declare these same numbers inline ---------- */
export const RATE_MIN = 0, RATE_MAX = 6; // liters added each minute — the slope
export const START_MIN = 0, START_MAX = 20, START_STEP = 4; // liters already in the barrel — the starting value
export const MINUTE_MIN = 0, MINUTE_MAX = 6; // the input the student marks
export const RUN_MIN = 1, RUN_MAX = 3; // how many minutes wide the drawn step is
/** Barrel B is never graphed. It is only ever given as a table, read every `every` minutes. */
export const BARREL_B = { start: 24, rate: -3, every: 2 } as const;
/** A hand-opened second pipe: one minute is read twice, so this table is not a function. */
export const NOT_A_FUNCTION = [[0, 24], [1, 27], [2, 30], [2, 34], [3, 37]] as const;
/* ---------- pure helpers, exported so the test can drive every reachable state ---------- */
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export const volume = (start: number, rate: number, minute: number) => rate * minute + start;
export const barrelB = (minute: number) => BARREL_B.rate * minute + BARREL_B.start;
export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
export const signed = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
export const fmt = (n: number) => (Number.isInteger(n) ? signed(n) : signed(Number(n.toFixed(2))));
/** Rise over run between two readings of one linear function. */
export const rateOfChange = (y1: number, y2: number, x1: number, x2: number) => (y2 - y1) / (x2 - x1);
export const volumes = (start: number, rate: number) => Array.from({ length: MINUTE_MAX + 1 }, (_, t) => volume(start, rate, t));
/** Minute-to-minute differences down the table — the rate of change read off by subtraction. */
export const differences = (start: number, rate: number) => volumes(start, rate).slice(1).map((y, i) => y - volume(start, rate, i));
export const bMinutes = () => Array.from({ length: MINUTE_MAX / BARREL_B.every + 1 }, (_, i) => i * BARREL_B.every);
export const bDrop = () => BARREL_B.rate * BARREL_B.every;
export const fuller = (start: number, rate: number, minute: number) => volume(start, rate, minute) > barrelB(minute) ? "A" : barrelB(minute) > volume(start, rate, minute) ? "B" : "same";
/** The input a table repeats with two different outputs, if it has one — the test for a function. */
export function repeatedInput(rows: readonly (readonly [number, number])[]) {
  const seen = new Map<number, number[]>();
  for (const [x, y] of rows) seen.set(x, [...(seen.get(x) ?? []), y]);
  for (const [x, ys] of seen) if (new Set(ys).size > 1) return { x, ys };
  return null;
}
/* ---------- graph geometry (SVG units) ---------- */
export const W = 540, H = 270, PAD_L = 44, PAD_R = 66, PAD_T = 26, PAD_B = 56;
/** ONE fixed liters axis for every state: a liter is always the same number of pixels, so doubling the rate doubles the steepness on screen. */
export const Y_MAX = 60;
export const TICKS = [0, 1, 2, 3, 4].map((i) => (Y_MAX / 4) * i);
export const scaleX = (minute: number) => PAD_L + (minute / MINUTE_MAX) * (W - PAD_L - PAD_R);
export const scaleY = (liters: number) => H - PAD_B - (liters / Y_MAX) * (H - PAD_T - PAD_B);
export const TICK_Y = H - PAD_B + 30, CAPTION_Y = H - 4, RUN_DY = 14, RISE_DX = 6, POINT_DY = 13;
/** The step starts here: never on top of the fixed one-minute step at minutes 0 to 1, never past the right edge. */
export const stepLeft = (minute: number, run: number) => clamp(minute, 1, MINUTE_MAX - run);
export type Label = { x: number; y: number; anchor: "start" | "middle" | "end"; text: string };
/** "run n" goes BELOW the run segment, "rise n" to the RIGHT of the rise segment, the reading ABOVE its dot: three labels, no shared ink. */
export function runLabel(start: number, rate: number, minute: number, run: number): Label {
  const l = stepLeft(minute, run);
  return { x: (scaleX(l) + scaleX(l + run)) / 2, y: scaleY(volume(start, rate, l)) + RUN_DY, anchor: "middle", text: `run ${run}` };
}
export function riseLabel(start: number, rate: number, minute: number, run: number): Label {
  const l = stepLeft(minute, run), y = (scaleY(volume(start, rate, l)) + scaleY(volume(start, rate, l + run))) / 2;
  return { x: scaleX(l + run) + RISE_DX, y, anchor: "start", text: `rise ${rate * run}` };
}
export function pointLabel(start: number, rate: number, minute: number): Label {
  const v = volume(start, rate, minute), atEnd = minute === MINUTE_MAX, atStart = minute === MINUTE_MIN;
  return { x: scaleX(minute) + (atStart ? 6 : atEnd ? -6 : 0), y: scaleY(v) - POINT_DY, anchor: atStart ? "start" : atEnd ? "end" : "middle", text: `(${minute}, ${v})` };
}
/* ---------- every sentence and readout the figure paints ---------- */
export const ruleBadge = (start: number, rate: number) => `× ${rate}, then + ${start}`;
export const readout = (litres: number) => `${litres} ${plural(litres, "liter")}`;
export const stepCellText = (d: number) => (d === 0 ? "0" : `+${d}`);
export const equationText = (start: number, rate: number) => `liters = ${rate} × minutes${start === 0 ? "" : ` + ${start}`}`;
export function shapeNote(start: number, rate: number) {
  if (rate === 0 && start === 0) return "Nothing is coming in and the barrel began empty, so every minute reads 0 liters: a flat line lying along the axis, rate of change 0.";
  if (rate === 0) return `Nothing is coming in, so every minute reads the same ${start} ${plural(start, "liter")}: a flat line, rate of change 0.`;
  if (start === 0) return `The line passes through (0, 0), so liters and minutes are proportional: ${equationText(start, rate)}. That ${rate} is the unit rate, and it is also the slope.`;
  return `The line starts at (0, ${start}) rather than the origin, so it is linear but not proportional: ${equationText(start, rate)}.`;
}
export function stepSentence(start: number, rate: number, minute: number, run: number) {
  const left = stepLeft(minute, run), right = left + run, rise = rate * run;
  if (rate === 0) return `Every step down the table is 0. The step you set runs from minute ${left} to minute ${right}, ${run} ${plural(run, "minute")} across, and rises nothing, so rise ÷ run is 0 ÷ ${run} = 0 and the line is flat.`;
  return `The faint step at the far left is 1 minute across and ${readout(rate)} tall. The step you set, from minute ${left} to minute ${right}, is ${run} ${plural(run, "minute")} across and ${readout(rise)} tall: the same shape at ${run} times the size. Both give the same rise ÷ run, ${rise} ÷ ${run} = ${rate} and ${rate} ÷ 1 = ${rate}, which is why the graph is straight.`;
}
export function barrelSentence(start: number, rate: number, minute: number) {
  const a = volume(start, rate, minute), b = barrelB(minute), who = fuller(start, rate, minute);
  return `B drops ${-bDrop()} ${plural(-bDrop(), "liter")} every ${BARREL_B.every} minutes, so its rate of change is ${signed(bDrop())} ÷ ${BARREL_B.every} = ${signed(BARREL_B.rate)} ${plural(BARREL_B.rate, "liter")} per minute: B is emptying while A is ${rate === 0 ? "holding steady" : "filling"}. At minute ${minute}, A holds ${readout(a)} and B holds ${readout(b)}${who === "same" ? ", the same amount" : `, so barrel ${who} holds more`}. No graph of B was needed.`;
}
export function nonFunctionSentence() {
  const hit = repeatedInput(NOT_A_FUNCTION);
  if (!hit) return "Every minute in this table has exactly one reading, so it is a function.";
  return `Minute ${hit.x} is listed twice, once at ${hit.ys[0]} and once at ${hit.ys[1]} ${plural(hit.ys[1], "liter")}. One input, two different outputs: this rule is not a function. The barrel rule never does that — name a minute and it answers with exactly one reading.`;
}
export function figureLabel(start: number, rate: number, minute: number, run: number) {
  const v = volume(start, rate, minute), left = stepLeft(minute, run);
  const climb = rate === 0 ? "staying level because nothing is being added" : `climbing ${rate} ${plural(rate, "liter")} every minute`;
  return `Graph of barrel A, drawn on a liters axis fixed from 0 to ${Y_MAX}: a straight line beginning at ${readout(start)} and ${climb}, with minute ${minute} marked at ${readout(v)} and a step from minute ${left} to minute ${left + run} of run ${run} and rise ${rate * run}.`;
}
export function similarSentence(rate: number, run: number) {
  if (rate === 0) return `With nothing coming in, the step you set is ${run} ${plural(run, "minute")} across and rises 0, so rise ÷ run is 0 and no triangle forms at all.`;
  return `The faint step at the left of the graph has run 1 and rise ${rate}; the step you set has run ${run} and rise ${rate * run}, so the two right triangles are similar and rise ÷ run is ${rate * run} ÷ ${run} = ${rate} either way.`;
}
export const compareSentence = () => `dividing ${signed(bDrop())} by ${BARREL_B.every} recovers its rate of ${signed(BARREL_B.rate)} ${plural(BARREL_B.rate, "liter")} per minute, so two functions given in different forms can still be compared`;
/* ---------- worked example: a candle, every number derived from these readings ---------- */
export const EXAMPLE = { t1: 2, h1: 17, t2: 5, h2: 11, target: 7 } as const;
export function solveExample() {
  const rise = EXAMPLE.h2 - EXAMPLE.h1, run = EXAMPLE.t2 - EXAMPLE.t1, rate = rise / run, start = EXAMPLE.h1 - rate * EXAMPLE.t1;
  return { rise, run, rate, start, check: rate * EXAMPLE.t2 + start, height: rate * EXAMPLE.target + start, burnout: -start / rate };
}
export function exampleSteps() {
  const ex = solveExample();
  return [
    { title: "Find the two changes", math: `Δ height = ${EXAMPLE.h2} − ${EXAMPLE.h1} = ${signed(ex.rise)} cm     Δ time = ${EXAMPLE.t2} − ${EXAMPLE.t1} = ${ex.run} h`, note: "Subtract the earlier reading from the later one, in the height column and in the time column." },
    { title: "Divide to get the rate of change", math: `${signed(ex.rise)} ÷ ${ex.run} = ${fmt(ex.rate)} cm per hour`, note: `The rate is negative because the candle gets shorter: it loses ${-ex.rate} cm each hour.` },
    { title: "Back up to hour 0", math: `${EXAMPLE.h1} − (${fmt(ex.rate)})(${EXAMPLE.t1}) = ${ex.start} cm`, note: `At ${EXAMPLE.t1} hours it measured ${EXAMPLE.h1} cm, so undo ${EXAMPLE.t1} ${plural(EXAMPLE.t1, "hour")} of burning to reach the starting value.` },
    { title: "Write the rule", math: `h = ${fmt(ex.rate)}t + ${ex.start}`, note: "Rate of change in front of t, starting value on its own: that is what y = mx + b means here." },
    { title: "Check the other reading", math: `(${fmt(ex.rate)})(${EXAMPLE.t2}) + ${ex.start} = ${ex.check} cm`, note: `The rule reproduces the second measurement, ${EXAMPLE.h2} cm, so it fits both readings.` },
    { title: "Predict and finish", math: `h(${EXAMPLE.target}) = ${ex.height} cm     ${fmt(ex.rate)}t + ${ex.start} = 0 → t = ${fmt(ex.burnout)} h`, note: `After ${EXAMPLE.target} hours the candle is ${ex.height} cm tall, and it burns out when the height reaches 0.` },
  ];
}
/* ---------- try it: one function as an equation, one as a table ---------- */
export const TRY = { p: { rate: 4, start: 3 }, q: [[0, 7], [2, 15], [4, 23]] } as const;
export function tryChoices() {
  const qRise = TRY.q[1][1] - TRY.q[0][1], qRun = TRY.q[1][0] - TRY.q[0][0], pRate = TRY.p.rate;
  const qRate = rateOfChange(TRY.q[0][1], TRY.q[1][1], TRY.q[0][0], TRY.q[1][0]);
  const tableRate = `Q's table climbs ${qRise} over ${qRun} steps of x, so its rate is ${qRise} ÷ ${qRun} = ${fmt(qRate)} per step`;
  const options = [
    { label: "P changes faster", why: `P's rate is the coefficient ${pRate}, and ${tableRate}.` },
    { label: "Q changes faster", why: `Q's outputs are the larger numbers, but size is not speed: ${tableRate}, matching P's ${pRate}.` },
    { label: "They change at the same rate", why: `${tableRate}, exactly P's ${pRate}. Q only starts higher, at ${TRY.q[0][1]} instead of ${TRY.p.start}.` },
    { label: "A table cannot show a rate", why: `Two rows are enough: ${tableRate}.` },
  ];
  return { options, pRate, qRate, correct: pRate > qRate ? 0 : qRate > pRate ? 1 : 2 };
}

export default function Lesson() {
  const [rate, setRate] = useState(3);
  const [start, setStart] = useState(8);
  const [minute, setMinute] = useState(4);
  const [runWidth, setRunWidth] = useState(2);
  const [shown, setShown] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [trap, setTrap] = useState(false);
  const stepsId = useId(), trapId = useId();
  const litres = volume(start, rate, minute);
  const table = volumes(start, rate), gaps = differences(start, rate);
  const left = stepLeft(minute, runWidth), right = left + runWidth;
  const runLab = runLabel(start, rate, minute, runWidth), riseLab = riseLabel(start, rate, minute, runWidth), pointLab = pointLabel(start, rate, minute);
  const steps = exampleSteps(), tryIt = tryChoices();
  const cell = "px-1 py-1.5", head = `bg-[var(--surface-2)] ${cell} text-[11px] font-bold uppercase text-[var(--ink-faint)]`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A rain barrel outside the science room already holds <strong>{readout(start)}</strong>, and the downpipe adds <strong>{readout(rate)}</strong>{" "}
        every minute it rains. Name a minute and the barrel has one answer for you &mdash; one minute in, exactly one reading out. A rule like that is a{" "}
        <strong>function</strong>, and the amount it adds each minute is its <strong>rate of change</strong>.
      </p>
      <p>
        The same function can be shown three ways at once: as the rule you set, as a table of readings, and as a graph. Because the barrel gains the same
        amount every minute, the table climbs by a constant step and the graph is a straight line. The liters axis below never rescales, so a bigger step
        really is a steeper line, and a step twice as wide is twice as tall.
      </p>
      <Figure caption={`Set the rate, the starting amount and the width of the step, then slide the marked minute. The liters axis is fixed at 0 to ${Y_MAX} for every setting, so two settings look different exactly when they are different.`}>
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-wrap items-center justify-center gap-2 text-center">
            <span className="rounded-xl px-3 py-2 font-mono text-sm font-bold" style={{ background: TINT }}>minute {minute}</span>
            <span className="text-[var(--ink-faint)]">&rarr;</span>
            <span className="rounded-xl border-2 px-3 py-2 font-mono text-sm font-bold" style={{ borderColor: ACCENT }}>{ruleBadge(start, rate)}</span>
            <span className="text-[var(--ink-faint)]">&rarr;</span>
            <span className="rounded-xl px-3 py-2 font-mono text-sm font-black text-white" style={{ background: ACCENT }}>{readout(litres)}</span>
          </div>
          <svg className="mx-auto h-auto max-w-full" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={figureLabel(start, rate, minute, runWidth)}>
            {TICKS.map((v) => <line key={v} x1={PAD_L} y1={scaleY(v)} x2={W - PAD_R} y2={scaleY(v)} stroke="var(--line)" strokeWidth={1} />)}
            {TICKS.map((v) => <text key={v} x={PAD_L - 8} y={scaleY(v) + 4} textAnchor="end" fontSize={11} fill="var(--ink-faint)">{v}</text>)}
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={scaleY(0)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <line x1={PAD_L} y1={scaleY(0)} x2={W - PAD_R} y2={scaleY(0)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            {table.map((_, t) => <text key={t} x={scaleX(t)} y={TICK_Y} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">{t}</text>)}
            <text x={(PAD_L + W - PAD_R) / 2} y={CAPTION_Y} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">minutes</text>
            <text x={4} y={PAD_T - 14} textAnchor="start" fontSize={11} fill="var(--ink-faint)">liters</text>
            {/* the fixed one-minute step (faint), then the step you move and widen: run across, rise = rate × run up */}
            <line x1={scaleX(0)} y1={scaleY(table[0])} x2={scaleX(1)} y2={scaleY(table[0])} stroke={GHOST} strokeWidth={2} />
            {rate > 0 && <line x1={scaleX(1)} y1={scaleY(table[0])} x2={scaleX(1)} y2={scaleY(table[1])} stroke={GHOST} strokeWidth={2} />}
            <line x1={scaleX(left)} y1={scaleY(table[left])} x2={scaleX(right)} y2={scaleY(table[left])} stroke={RIVAL} strokeWidth={2.5} />
            <text x={runLab.x} y={runLab.y} textAnchor={runLab.anchor} fontSize={11} fontWeight={700} fill={RIVAL}>{runLab.text}</text>
            {rate > 0 && <line x1={scaleX(right)} y1={scaleY(table[left])} x2={scaleX(right)} y2={scaleY(table[right])} stroke={RIVAL} strokeWidth={2.5} />}
            {rate > 0 && <text x={riseLab.x} y={riseLab.y} textAnchor={riseLab.anchor} fontSize={11} fontWeight={700} fill={RIVAL}>{riseLab.text}</text>}
            <line x1={scaleX(0)} y1={scaleY(table[0])} x2={scaleX(MINUTE_MAX)} y2={scaleY(table[MINUTE_MAX])} stroke={ACCENT} strokeWidth={3} strokeLinecap="round" />
            {table.map((v, t) => <circle key={t} cx={scaleX(t)} cy={scaleY(v)} r={3.5} fill={ACCENT} />)}
            <circle cx={scaleX(minute)} cy={scaleY(litres)} r={7} fill={ACCENT} stroke="white" strokeWidth={2.5} />
            <text x={pointLab.x} y={pointLab.y} textAnchor={pointLab.anchor} fontSize={12} fontWeight={800} fill="var(--ink)">{pointLab.text}</text>
          </svg>
          <div className="grid w-full max-w-lg grid-cols-8 gap-px overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--line)] text-center font-mono text-[13px]">
            <div className={head}>min</div>
            {table.map((_, t) => <div key={t} className={`${cell} font-bold`} style={t === minute ? { background: TINT } : { background: "var(--surface)" }}>{t}</div>)}
            <div className={head}>L</div>
            {table.map((v, t) => <div key={t} className={`${cell} font-black`} style={t === minute ? { background: TINT, color: ACCENT } : { background: "var(--surface)" }}>{v}</div>)}
            <div className={head}>step</div>
            <div className={`bg-[var(--surface)] ${cell} text-[var(--ink-faint)]`}>&mdash;</div>
            {gaps.map((d, i) => <div key={i} className={`bg-[var(--surface)] ${cell} font-bold`} style={{ color: RIVAL }}>{stepCellText(d)}</div>)}
          </div>
          <p className="m-0 max-w-lg text-center text-sm text-[var(--ink-soft)]">{stepSentence(start, rate, minute, runWidth)}{" "}{shapeNote(start, rate)}</p>
          <div className="w-full max-w-lg rounded-2xl border-2 px-4 py-3" style={{ borderColor: RIVAL }}>
            <div className="text-center text-xs font-bold uppercase tracking-wide" style={{ color: RIVAL }}>Barrel B, given only as a table</div>
            <div className="mx-auto mt-2 grid max-w-sm grid-cols-5 gap-px overflow-hidden rounded-lg bg-[var(--line)] text-center font-mono text-[13px]">
              <div className={head}>min</div>
              {bMinutes().map((t) => <div key={t} className={`bg-[var(--surface)] ${cell} font-bold`}>{t}</div>)}
              <div className={head}>L</div>
              {bMinutes().map((t) => <div key={t} className={`bg-[var(--surface)] ${cell} font-black`}>{barrelB(t)}</div>)}
            </div>
            <p className="m-0 mt-2 text-center text-sm text-[var(--ink-soft)]">{barrelSentence(start, rate, minute)}</p>
          </div>
          <div className="w-full max-w-lg rounded-2xl border border-[var(--line)] px-4 py-3 text-center">
            <button type="button" onClick={() => setTrap((v) => !v)} aria-expanded={trap} aria-controls={trapId} className="text-sm font-bold underline" style={{ color: ACCENT }}>{trap ? "Hide the rule that is not a function" : "One minute, two readings: is that still a function?"}</button>
            <div id={trapId} hidden={!trap} className="mt-2">
              <div className="mx-auto grid max-w-xs grid-cols-6 gap-px overflow-hidden rounded-lg bg-[var(--line)] text-center font-mono text-[13px]">
                <div className={head}>min</div>
                {NOT_A_FUNCTION.map(([x], i) => <div key={i} className={`bg-[var(--surface)] ${cell} font-bold`}>{x}</div>)}
                <div className={head}>L</div>
                {NOT_A_FUNCTION.map(([, y], i) => <div key={i} className={`bg-[var(--surface)] ${cell} font-black`} style={{ color: MISS }}>{y}</div>)}
              </div>
              <p className="m-0 mt-2 text-sm text-[var(--ink-soft)]">{nonFunctionSentence()}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Stepper label="Liters added each minute" value={rate} min={0} max={6} color={ACCENT} onChange={setRate} />
            <Stepper label="Liters at the start" value={start} min={0} max={20} step={4} color={ACCENT} onChange={setStart} />
            <Stepper label="Minutes across the step" value={runWidth} min={1} max={3} color={RIVAL} onChange={setRunWidth} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Marked minute: <span className="text-[var(--ink)]">{minute}</span></span>
            <input type="range" min={0} max={6} value={minute} onChange={(e) => setMinute(Number(e.target.value))} className="w-56 accent-[var(--band-middle)]" aria-label="Marked minute" />
          </div>
        </div>
      </Figure>
      <h2>Worked example: two readings are enough</h2>
      <p>
        A candle is measured twice while it burns: <strong>{EXAMPLE.h1} cm</strong>{" "}after {EXAMPLE.t1} hours, and <strong>{EXAMPLE.h2} cm</strong>{" "}
        after {EXAMPLE.t2} hours. It burns steadily, so its height is a linear function of time. Find the rule, the height at {EXAMPLE.target} hours, and
        the hour it burns out. Reveal one move at a time.
      </p>
      <div className="card my-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShown((s) => Math.min(steps.length, s + 1))} disabled={shown >= steps.length} aria-expanded={shown > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>{shown === 0 ? "Show the first step" : shown < steps.length ? "Next step" : "All steps shown"}</button>
          <button type="button" onClick={() => setShown(0)} disabled={shown === 0} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
          <span className="text-sm text-[var(--ink-faint)]">{shown} of {steps.length} shown</span>
        </div>
        <ol id={stepsId} className="mt-3 flex list-none flex-col gap-2 p-0">
          {steps.slice(0, shown).map((s, i) => (
            <li key={s.title} className="rounded-xl bg-[var(--surface-2)] px-4 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Step {i + 1}: {s.title}</div>
              <div className="whitespace-pre-wrap font-mono text-base font-black">{s.math}</div>
              <div className="text-sm text-[var(--ink-soft)]">{s.note}</div>
            </li>))}
        </ol>
      </div>
      <h2>Try it</h2>
      <p>
        Function P is given by the equation <strong>y = {TRY.p.rate}x + {TRY.p.start}</strong>. Function Q is given only by this table:{" "}
        {TRY.q.map(([x, y]) => `(${x}, ${y})`).join(", ")}. Which one changes faster?
      </p>
      <div className="flex flex-wrap gap-2">
        {tryIt.options.map((o, i) => <button type="button" key={o.label} onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={pick === i ? { background: i === tryIt.correct ? RIVAL : MISS, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o.label}</button>)}
      </div>
      <p aria-live="polite" className="mt-3 text-sm">{pick === null ? "Pick the statement you think is true." : `${pick === tryIt.correct ? "Correct." : "Not quite."} ${tryIt.options[pick].why}`}</p>
      <h2>Where this chapter goes</h2>
      <p>
        Every lesson ahead pulls on one thread of the figure above. <strong>Slope as Unit Rate</strong>{" "}stays with the proportional case, where the line
        runs through the origin and the steeper of two graphs is simply the faster rate. <strong>Slope: Rise over Run</strong>{" "}drags the two ends of the
        step to any pair of points on a line and shows that rise divided by run never changes. <strong>What Is a Function?</strong>{" "}asks which rules
        deserve the name at all &mdash; exactly one output per input &mdash; and lines up two functions given in different forms.{" "}
        <strong>Building Linear Functions</strong>{" "}turns a situation into y = mx + b the way the candle example does, and{" "}
        <strong>Graphs Tell Stories</strong>{" "}reads a graph with no numbers on it at all: rising, falling, flat, or bending.
      </p>
      <MathCheck>
        <p>
          The barrel rule sends each minute to exactly one reading, which is what makes it a <strong>function</strong>{" "}(8.F.A.1); the hand-opened pipe
          hidden in the figure fails that same test, because one of its minutes is answered twice. Since every minute changes the reading by the same{" "}
          {readout(rate)}, the differences down the table are all equal and the points land on a straight line, so {equationText(start, rate)} is a{" "}
          <strong>linear function</strong>{" "}with slope {rate} and starting value {start} (8.F.A.3), built from a rate of change and an initial amount
          exactly as a model should be (8.F.B.4). {similarSentence(rate, runWidth)} Two steps of different widths on one line always make{" "}
          <strong>similar</strong>{" "}right triangles, which is why the slope is the same between any two points and the equation of the line never
          changes (8.EE.B.6). When the barrel starts empty the line passes through the origin, and that same slope is the <strong>unit rate</strong>{" "}
          of a proportional relationship &mdash; on this fixed axis, the faster rate is visibly the steeper line (8.EE.B.5). Barrel B arrives as a table
          only, yet {compareSentence()} (8.F.A.2).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step = 1, color, onChange }: { label: string; value: number; min: number; max: number; step?: number; color?: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(clamp(value - step, min, max))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>&minus;</button>
        <span className="w-10 text-center text-2xl font-black tabular-nums" style={color ? { color } : undefined}>{value}</span>
        <button type="button" onClick={() => onChange(clamp(value + step, min, max))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
