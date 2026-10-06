"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const EXP = "var(--band-high)";
const LIN = "var(--band-middle)";
const MARK = "var(--band-early)";

/* ---------- pure helpers (exported so the test can walk every reachable state) ---------- */

export const CAP = 100;   // both ponds are completely covered at 100 square meters
export const WEEKS = 10;  // weeks drawn along the horizontal axis
export const SCAN = 40;   // how far ahead the two models are compared

/** Growth per week, kept as an exact fraction so every power stays exact in binary. */
export const GROWTHS = [{ percent: 25, num: 5, den: 4 }, { percent: 50, num: 3, den: 2 }, { percent: 100, num: 2, den: 1 }] as const;
export type Growth = (typeof GROWTHS)[number];
export const CONTROLS = { start: { min: 2, max: 10, step: 2 }, add: { min: 2, max: 10, step: 2 }, week: { min: 0, max: WEEKS, step: 1 } } as const;

/** The growth factor b = 1 + percent/100. */
export function factor(g: Growth) { return g.num / g.den; }
export function ipow(base: number, exp: number) { let out = 1; for (let i = 0; i < exp; i += 1) out *= base; return out; }
/** Pond A adds the same area every week: A(t) = start + add·t. */
export function steady(start: number, add: number, t: number) { return start + add * t; }
/** Pond B multiplies every week: B(t) = start·b^t, exact at whole weeks because den is a power of two. */
export function boom(start: number, g: Growth, t: number) { return (start * ipow(g.num, t)) / ipow(g.den, t); }
/** Pond B between weeks, used only to draw a smooth curve. */
export function boomAt(start: number, g: Growth, t: number) { return start * Math.pow(factor(g), t); }
/** Solve start + add·t = CAP by dividing. */
export function steadyFill(start: number, add: number) { return (CAP - start) / add; }
/** Solve start·b^t = CAP: the unknown is an exponent, so take a logarithm. */
export function boomFill(start: number, g: Growth) { return Math.log(CAP / start) / Math.log(factor(g)); }
/** First whole week at which the multiplying model is strictly ahead of the adding model. */
export function crossover(start: number, add: number, g: Growth) {
  let v = start;
  for (let w = 1; w <= SCAN; w += 1) { v *= factor(g); if (v > steady(start, add, w)) return w; }
  return null;
}
export function gcd(a: number, b: number): number { return b === 0 ? Math.abs(a) : gcd(b, a % b); }
export function reduce(n: number, d: number) { const k = gcd(n, d); return { p: n / k, q: d / k }; }
/** Two decimals, flagged with "≈" only when rounding to two decimals really does lose something. */
export function round2(v: number) { return Number(v.toFixed(2)); }
export function show(v: number) { return Number.isInteger(v) ? `${v}` : round2(v) === v ? v.toFixed(2) : `≈${v.toFixed(2)}`; }
export function spoken(v: number) { return Number.isInteger(v) ? `${v}` : round2(v) === v ? v.toFixed(2) : `about ${v.toFixed(2)}`; }

export const SVG_W = 470, SVG_H = 268, PAD_L = 54, PAD_R = 18, PAD_T = 26, PAD_B = 42, CURVE_STEPS = 60;
export function scaleX(t: number) { return PAD_L + (t / WEEKS) * (SVG_W - PAD_L - PAD_R); }
export function scaleY(v: number) { return SVG_H - PAD_B - (v / CAP) * (SVG_H - PAD_T - PAD_B); }
/** Each model is drawn only while it still fits the pond, so no point can leave the plot. */
export function steadyPath(start: number, add: number) { const end = Math.min(WEEKS, steadyFill(start, add)); return [{ t: 0, v: start }, { t: end, v: Math.min(CAP, steady(start, add, end)) }]; }
export function boomPath(start: number, g: Growth) { const end = Math.min(WEEKS, boomFill(start, g)); return Array.from({ length: CURVE_STEPS + 1 }, (_, i) => { const t = (end * i) / CURVE_STEPS; return { t, v: Math.min(CAP, boomAt(start, g, t)) }; }); }

/** Every sentence the figure says out loud, built from the numbers it draws: `marks` gates the markers AND the spoken label, so the label can never promise a marker that is not drawn, and the overtaking is put in pond language only while both ponds still have open water at the crossing week. */
export function figureCopy(start: number, add: number, g: Growth, week: number) {
  const b = factor(g), tA = steadyFill(start, add), tB = boomFill(start, g), full = Math.min(tA, tB);
  const aNow = steady(start, add, week), bNow = boom(start, g, week), done = `the model passed ${CAP} m², so this pond is already covered`;
  const marks = [aNow <= CAP ? "pond A" : "", bNow <= CAP ? "pond B" : ""].filter((m) => m !== "");
  const markers = marks.length === 0 ? `Both ponds are covered before week ${week}, so no marker is drawn.` : marks.length === 1 ? `One marker, on ${marks[0]}, shows week ${week}.` : `Markers on pond A and pond B show week ${week}.`;
  const cross = crossover(start, add, g), inPond = cross !== null && cross < full;
  return {
    marks, markers, cross, inPond,
    aria: `Area covered, in square meters, against week number, up to the full pond at ${CAP}. Pond A is a straight line starting at ${start} and rising ${add} each week; its model reaches the full pond at week ${spoken(tA)}. Pond B is a curve starting at ${start} and multiplying by ${b} each week; its model reaches the full pond at week ${spoken(tB)}. ${markers}`,
    aWeek: aNow > CAP ? done : `${aNow} m² covered`,
    bWeek: bNow > CAP ? done : `${show(bNow)} m² covered`,
    legend: cross === null ? "" : inPond ? `pond B pulls ahead at week ${cross}` : `the models cross at week ${cross}, past a full pond`,
    first: `Pond ${tB < tA ? "B" : "A"} is completely covered first, after ${show(full)} weeks.`,
    banner: cross === null ? `Pond A's line is still ahead ${SCAN} weeks out, though a model that multiplies has to overtake it sooner or later.` : !inPond ? `The two models cross at week ${cross}, but by then at least one pond has already been completely covered, so that crossing happens on paper and not in the water. A bigger weekly percent brings it back inside the pond.` : cross <= WEEKS ? `The curve crosses the line at week ${cross}, while both ponds still have room: from then on the multiplying model is ahead for good.` : `The curve is still below the line at week ${WEEKS}. It crosses at week ${cross}, before either pond is full, and stays ahead after that.`,
    check: cross === null ? "" : inPond ? `, and with these settings it does so at week ${cross}, while both ponds still have room` : `, though with these settings a pond fills first, so the crossing at week ${cross} is one the models make only on paper`,
  };
}

export const EXAMPLE = { start: 1024, addPerDay: 300, percent: 25, days: 5, target: 3000 } as const;
export function workedExample() {
  const g = GROWTHS[0], b = factor(g);
  const rows = Array.from({ length: EXAMPLE.days + 1 }, (_, t) => ({ t, a: steady(EXAMPLE.start, EXAMPLE.addPerDay, t), b: boom(EXAMPLE.start, g, t) }));
  const lead = rows.findIndex((r) => r.t > 0 && r.b > r.a), { p, q } = reduce(EXAMPLE.target, EXAMPLE.start);
  const solved = Math.log(EXAMPLE.target / EXAMPLE.start) / Math.log(b), day = Math.ceil(solved);
  return { g, b, rows, lead, p, q, solved, day, below: boom(EXAMPLE.start, g, day - 1), check: boom(EXAMPLE.start, g, day) };
}

/** The worked example, one revealed step at a time: every number in it is computed from EXAMPLE. */
export function workedSteps() {
  const ex = workedExample();
  return [
    { title: "Name each pattern", math: `Post A: + ${EXAMPLE.addPerDay} views a day`, math2: `Post B: × ${ex.b} each day`, note: "Equal differences over equal intervals mean a linear model; equal ratios mean an exponential model. The description alone tells you which family to build." },
    { title: "Write both models", math: `A(t) = ${EXAMPLE.start} + ${EXAMPLE.addPerDay}t`, math2: `B(t) = ${EXAMPLE.start}(${ex.b})^t`, note: `The growth factor is b = 1 + ${EXAMPLE.percent}/100 = ${ex.b}. Both posts go up on the same day, so ${EXAMPLE.start} is the day-0 count in both models.` },
    { title: "Compare them day by day", math: `A: ${ex.rows.map((r) => r.a).join(", ")}`, math2: `B: ${ex.rows.map((r) => r.b).join(", ")}`, note: `Post A leads for the first ${ex.lead - 1} ${ex.lead - 1 === 1 ? "day" : "days"}. From day ${ex.lead} on, post B is ahead, and the gap widens every day after that.` },
    { title: "Set the exponential model equal to the target", math: `${EXAMPLE.start}(${ex.b})^t = ${EXAMPLE.target}`, math2: `(${ex.b})^t = ${ex.p}/${ex.q}`, note: `Dividing both sides by ${EXAMPLE.start} isolates the power. The unknown is now an exponent, so no amount of dividing will finish the job.` },
    { title: "Take a logarithm to bring t down", math: `t · log(${ex.b}) = log(${ex.p}/${ex.q})`, math2: `t = log(${ex.p}/${ex.q}) ÷ log(${ex.b}) = ${ex.solved.toFixed(2)}`, note: `Here log(x) means the exponent you put on 10 to get x, and a log turns a power into a product: log(b^t) = t · log(b). That is the whole trick — the exponent comes down in front, and one division sets t free. Divide the two logs; the division cannot move inside a single log, so log(${ex.p}/${ex.q}) ÷ log(${ex.b}) is not log of (${ex.p}/${ex.q} ÷ ${ex.b}).` },
    { title: "Turn the decimal answer back into a day", math: `B(${ex.day - 1}) = ${ex.below}`, math2: `B(${ex.day}) = ${ex.check}`, note: `t = ${ex.solved.toFixed(2)} is not a whole number, so no lucky exact power was ever going to turn up here; the logarithm is the only thing that locates it. Day ${ex.day - 1} is still short at ${ex.below} views, so day ${ex.day} is the first whole day with at least ${EXAMPLE.target}.` },
    { title: "Read the parameters back into the story", math: `${EXAMPLE.start} = day-0 views`, math2: `${EXAMPLE.addPerDay} = views added per day; ${ex.b} = ${EXAMPLE.percent}% more each day`, note: `In A(t) the ${EXAMPLE.addPerDay} is a rate of change with units of views per day. In B(t) the ${ex.b} is a multiplier with no units at all, and b > 1 is exactly what makes it growth instead of decay.` },
  ];
}

export const TRY = { start: 40, percent: 50, days: 3 } as const;
export function tryItOptions() {
  const g = GROWTHS[1];
  const right = boom(TRY.start, g, TRY.days);
  const options = [
    { value: boom(TRY.start, g, 1), why: `That is one day of growth: ${TRY.start} × ${factor(g)} = ${boom(TRY.start, g, 1)}. Three days means multiplying by ${factor(g)} three times.` },
    { value: TRY.start + TRY.days * ((TRY.start * TRY.percent) / 100), why: `That adds ${(TRY.start * TRY.percent) / 100} shares every day, which is a linear model. Here the ${TRY.percent}% is taken of the new total each day, so the amount added grows too.` },
    { value: right, why: `${TRY.start} × ${factor(g)}³ = ${TRY.start} × ${ipow(g.num, TRY.days)}/${ipow(g.den, TRY.days)} = ${right}. Day by day: ${boom(TRY.start, g, 1)}, then ${boom(TRY.start, g, 2)}, then ${right}.` },
    { value: TRY.start * factor(g) * TRY.days, why: `That multiplies by ${factor(g)} once and then by ${TRY.days}. An exponent is repeated multiplication, not a factor: ${factor(g)}³ = ${ipow(g.num, TRY.days) / ipow(g.den, TRY.days)}, not ${factor(g) * TRY.days}.` },
  ];
  return { options, correct: options.findIndex((o) => o.value === right) };
}

export default function Lesson() {
  const [start, setStart] = useState(4);
  const [add, setAdd] = useState(8);
  const [gi, setGi] = useState(1);
  const [week, setWeek] = useState(4);
  const [shown, setShown] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const g = GROWTHS[gi], b = factor(g), tA = steadyFill(start, add), tB = boomFill(start, g);
  const aNow = steady(start, add, week), bNow = boom(start, g, week), linePts = steadyPath(start, add), curvePts = boomPath(start, g);
  const copy = figureCopy(start, add, g, week), cross = copy.cross, tryIt = tryItOptions();

  const steps = workedSteps();

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two ponds are choked by the same weed. In pond A the weed spreads by runners along the bottom and covers the same extra area every week. In pond B it floats and doubles back on itself, so each week the patch is a fixed <em>percentage</em> larger than the week before. Pond A <strong>adds</strong>; pond B <strong>multiplies</strong>. Start them at the same patch, and how long the steady pond keeps the lead — several weeks, one week, or none at all — depends entirely on the numbers you choose.
      </p>
      <p>
        However long that lead lasts, it never lasts forever. A model that multiplies scales its whole self each step, so it eventually passes any model that only adds. This chapter is about telling those two families apart, building each one from a description, reading what its numbers mean, and answering the question a caretaker actually asks: <em>when?</em> For pond A that is a division. For pond B the unknown sits up in the exponent, and getting it down is what logarithms are for.
      </p>

      <Figure caption="Change the starting patch, pond A's weekly gain, or pond B's growth rate. Each model is drawn only while it still fits the pond.">
        <div className="flex flex-col items-center gap-5">
          <svg className="mx-auto h-auto max-w-full" width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} role="img" aria-label={copy.aria}>
            {[0, 25, 50, 75, 100].map((v) => (
              <g key={v}><line x1={PAD_L} y1={scaleY(v)} x2={SVG_W - PAD_R} y2={scaleY(v)} stroke="var(--line)" strokeWidth={1} /><text x={PAD_L - 8} y={scaleY(v) + 4} textAnchor="end" fontSize={11} fill="var(--ink-faint)">{v}</text></g>
            ))}
            <text x={PAD_L + 4} y={PAD_T - 9} fontSize={10} fill="var(--ink-faint)">pond completely covered ({CAP} m²)</text>
            <line x1={PAD_L} y1={scaleY(0)} x2={SVG_W - PAD_R} y2={scaleY(0)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={scaleY(0)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            {[0, 2, 4, 6, 8, 10].map((t) => <text key={t} x={scaleX(t)} y={SVG_H - PAD_B + 17} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">{t}</text>)}
            <text x={(PAD_L + SVG_W - PAD_R) / 2} y={SVG_H - 7} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">weeks</text>
            <line x1={scaleX(week)} y1={PAD_T} x2={scaleX(week)} y2={scaleY(0)} stroke="var(--ink-faint)" strokeWidth={1.5} strokeDasharray="4 4" />
            {cross !== null && copy.inPond && cross <= WEEKS && <line x1={scaleX(cross)} y1={PAD_T} x2={scaleX(cross)} y2={scaleY(0)} stroke={MARK} strokeWidth={1.5} strokeDasharray="2 4" />}
            <polyline points={linePts.map((p) => `${scaleX(p.t).toFixed(1)},${scaleY(p.v).toFixed(1)}`).join(" ")} fill="none" stroke={LIN} strokeWidth={2.5} strokeLinecap="round" />
            <polyline points={curvePts.map((p) => `${scaleX(p.t).toFixed(1)},${scaleY(p.v).toFixed(1)}`).join(" ")} fill="none" stroke={EXP} strokeWidth={2.5} strokeLinecap="round" />
            {copy.marks.includes("pond A") && <circle cx={scaleX(week)} cy={scaleY(aNow)} r={5.5} fill={LIN} stroke="white" strokeWidth={2} />}
            {copy.marks.includes("pond B") && <circle cx={scaleX(week)} cy={scaleY(bNow)} r={5.5} fill={EXP} stroke="white" strokeWidth={2} />}
          </svg>

          <div className="flex flex-wrap justify-center gap-4 text-xs font-bold">
            <span style={{ color: LIN }}>pond A: adds {add} m² a week</span>
            <span style={{ color: EXP }}>pond B: multiplies by {b} a week</span>
            {copy.legend !== "" && <span style={{ color: MARK }}>{copy.legend}</span>}
          </div>

          <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Pond A: constant difference</div>
              <div className="mt-1 font-mono text-lg font-black" style={{ color: LIN }}>A(t) = {start} + {add}t</div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">Week {week}: {copy.aWeek}. Solve {start} + {add}t = {CAP} by dividing: t = {CAP - start}/{add} = <strong>{show(tA)} weeks</strong>.</div>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Pond B: constant ratio</div>
              <div className="mt-1 font-mono text-lg font-black" style={{ color: EXP }}>B(t) = {start}({b})<sup>t</sup></div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">Week {week}: {copy.bWeek}. Solve {start}({b})<sup>t</sup> = {CAP}: the unknown is an exponent, so take a log of both sides and use log(b<sup>t</sup>) = t · log(b). That gives t = log({CAP}/{start}) ÷ log({b}) = <strong>{show(tB)} weeks</strong>.</div>
            </div>
          </div>

          <div className="w-full max-w-2xl rounded-2xl border-2 px-5 py-3 text-center" style={{ borderColor: MARK }}>
            <div className="text-sm text-[var(--ink-soft)]">{copy.first} {copy.banner} Growth of {g.percent}% a week means a growth factor of b = 1 + {g.percent}/100 = {b}.</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Stepper label="Starting patch (m²)" value={start} min={2} max={10} step={2} color={MARK} onChange={setStart} />
            <Stepper label="Pond A gain (m² a week)" value={add} min={2} max={10} step={2} color={LIN} onChange={setAdd} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Pond B growth a week</span>
            <div className="flex flex-wrap justify-center gap-2">
              {GROWTHS.map((option, i) => (
                <button key={option.percent} type="button" onClick={() => setGi(i)} aria-pressed={gi === i} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={gi === i ? { background: EXP, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{option.percent}%</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Week: <span className="text-[var(--ink)]">{week}</span></span>
            <input type="range" min={0} max={10} value={week} onChange={(e) => setWeek(Number(e.target.value))} className="w-56 accent-[var(--band-high)]" aria-label="Week number" aria-valuetext={`week ${week}`} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: two posts, one target</h2>
      <p>
        Two posts go up the same morning, each already at {EXAMPLE.start} views. Post A gains a steady {EXAMPLE.addPerDay} views a day. Post B gains {EXAMPLE.percent}% more views than it had the day before. Which one leads, and on what day does post B first reach {EXAMPLE.target} views? Reveal the reasoning one move at a time.
      </p>
      <div className="card my-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShown((s) => Math.min(steps.length, s + 1))} disabled={shown >= steps.length} aria-expanded={shown > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: EXP }}>
            {shown === 0 ? "Show the first step" : shown < steps.length ? "Next step" : "All steps shown"}
          </button>
          <button type="button" onClick={() => setShown(0)} disabled={shown === 0} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
          <span className="text-sm text-[var(--ink-faint)]">{shown} of {steps.length} steps</span>
        </div>
        <ol id={stepsId} className="mt-3 flex list-none flex-col gap-2 p-0">
          {steps.slice(0, shown).map((s, i) => (
            <li key={s.title} className="rounded-xl bg-[var(--surface-2)] px-4 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: EXP }}>Step {i + 1}: {s.title}</div>
              <div className="font-mono text-base font-black">{s.math}</div><div className="font-mono text-base font-black">{s.math2}</div>
              <div className="text-sm text-[var(--ink-soft)]">{s.note}</div>
            </li>
          ))}
        </ol>
      </div>

      <h2>Try it</h2>
      <p>A post has {TRY.start} shares. Each day the share count grows by {TRY.percent}%. How many shares does it have {TRY.days} days later?</p>
      <div className="flex flex-wrap gap-2">
        {tryIt.options.map((o, i) => (
          <button key={o.value} type="button" onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={pick === i ? { background: i === tryIt.correct ? EXP : MARK, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o.value} shares</button>
        ))}
      </div>
      <p aria-live="polite" className="mt-3 text-sm">
        {pick === null ? "Pick the count you think is right." : pick === tryIt.correct ? `Correct. ${tryIt.options[pick].why}` : `Not quite. ${tryIt.options[pick].why}`}
      </p>

      <h2>Where this chapter goes</h2>
      <p>
        The three lessons ahead take one move from this picture each. <strong>Exponential vs. Linear Growth</strong> stays with the race you just watched: it puts a line and a curve on the same axes and lets you hunt for the week the curve wins, so that &ldquo;eventually it always passes&rdquo; stops being a slogan and becomes something you have seen happen. <strong>Linear vs. Exponential Models</strong> works the other direction, starting from a sentence or a table and building y = mx + b or y = a·b<sup>t</sup> from it, then asking what each letter is doing in the story, which is what turned {g.percent}% a week into the factor {b} above. <strong>Logarithms Solve Exponentials</strong> takes the tool that answered &ldquo;when?&rdquo; for pond B and slows it down: what a log actually is, why it undoes an exponential, and how to use it on any equation where the unknown has climbed into the exponent.
      </p>

      <MathCheck>
        <p>
          Pond A gains the same {add} m² over every week, so equal intervals give equal <strong>differences</strong>: that is what makes A(t) = {start} + {add}t linear. Pond B is multiplied by the same factor every week, so equal intervals give equal <strong>ratios</strong>, which is what makes B(t) = {start}({b})<sup>t</sup> exponential (F-LE.1). Each model was built straight from its description, one from a per-week amount and one from a per-week percent (F-LE.2), and each number keeps its meaning: {start} is the week-0 patch in m², {add} is a rate of change in m² per week, and b = 1 + {g.percent}/100 = {b} is a unitless multiplier that is greater than 1, which is exactly what makes this growth rather than decay (F-LE.5). Because every week rescales the whole patch, pond B&rsquo;s model grows by a larger and larger amount each week and must eventually pass any adding model, however big its weekly gain (F-LE.3){copy.check}. Asking when a pond is covered is asking when the model equals {CAP}: for pond A that is a division, t = {CAP - start}/{add} = {show(tA)}. For pond B the unknown is an exponent, so we use the inverse of the exponential. A logarithm asks &ldquo;what exponent?&rdquo;, and because a log carries a power down in front of it &mdash; log(b<sup>t</sup>) = t · log(b) &mdash; taking a log of both sides of {start}({b})<sup>t</sup> = {CAP} turns that exponent into a factor, and dividing by log({b}) leaves t = log({CAP}/{start}) ÷ log({b}) = {show(tB)} (F-LE.4).
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
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-10 text-center text-2xl font-black tabular-nums" style={color ? { color } : undefined}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
