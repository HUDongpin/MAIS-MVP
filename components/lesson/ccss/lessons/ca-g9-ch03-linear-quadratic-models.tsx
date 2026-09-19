"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const DRONE = "var(--band-upper)";
const MEET = "var(--band-early)";

/* ---------- pure helpers (exported so the test can walk every reachable state) ---------- */

export const CONTROLS = {
  speed: { min: 16, max: 64, step: 8 },   // launch speed v (ft/s)
  launch: { min: 0, max: 8, step: 1 },    // launch height h0 (ft)
  climb: { min: 0, max: 24, step: 8 },    // drone climb rate r (ft/s)
  base: { min: 0, max: 40, step: 10 },    // drone starting height s (ft)
  quarter: { min: 0, max: 18, step: 1 },  // time slider, in quarter seconds
} as const;
export const T_MAX = CONTROLS.quarter.max / 4;

/** Ball: h(t) = −16t² + vt + h0 (feet, seconds). */
export function ballHeight(v: number, h0: number, t: number) { return -16 * t * t + v * t + h0; }
/** Drone: d(t) = rt + s. */
export function droneHeight(r: number, s: number, t: number) { return r * t + s; }
/** Completing the square: −16t² + vt + h0 = −16(t − v/32)² + h0 + v²/64. */
export function vertex(v: number, h0: number) { return { t: v / 32, h: h0 + (v * v) / 64 }; }
export function isSquare(n: number) { if (n < 0 || !Number.isInteger(n)) return false; const m = Math.round(Math.sqrt(n)); return m * m === n; }
/** Positive root of h(t) = 0: the ball lands at t = (v + √(v² + 64h0)) / 32. */
export function landing(v: number, h0: number) { const D = v * v + 64 * h0; return { t: (v + Math.sqrt(D)) / 32, exact: isSquare(D) }; }
/** Ball meets drone when −16t² + vt + h0 = rt + s, i.e. 16t² − Bt − C = 0 with B = v − r and C = h0 − s. */
export function meetings(v: number, h0: number, r: number, s: number) {
  const B = v - r, C = h0 - s, D = B * B + 64 * C;
  const all = D < 0 ? [] : D === 0 ? [B / 32] : [(B - Math.sqrt(D)) / 32, (B + Math.sqrt(D)) / 32];
  return { B, C, D, exact: isSquare(D), times: all.filter((t) => t >= 0), rejected: all.filter((t) => t < 0) };
}
export function fmt(t: number, exact: boolean) { return exact ? String(t) : t.toFixed(2); }
export function timeLabel(t: number, exact: boolean) { return `t ${exact ? "=" : "≈"} ${fmt(t, exact)} s`; }
export function neg(n: number) { return n < 0 ? `−${Math.abs(n)}` : `${n}`; }
const signed = (k: number, sym: string) => (k === 0 ? "" : ` ${k < 0 ? "−" : "+"} ${Math.abs(k)}${sym}`);
export function ballExpr(v: number, h0: number) { return `−16t² + ${v}t${signed(h0, "")}`; }
export function droneExpr(r: number, s: number) { return r === 0 ? `${s}` : `${r}t${signed(s, "")}`; }
export function standardForm(B: number, C: number) { return `16t²${signed(-B, "t")}${signed(-C, "")} = 0`; }
export function meetingSummary(m: ReturnType<typeof meetings>) {
  if (m.D < 0) return "is negative, so the equation has no real solution: the two paths never meet.";
  if (m.D === 0) return m.times.length ? "is zero, so there is exactly one solution: the ball just grazes the drone's path." : "is zero, so there is exactly one solution, but it comes before the throw.";
  const gone = m.rejected.length;
  return `is positive, so the equation has two real solutions${gone === 0 ? ", both after the throw." : gone === 1 ? ", but one of them comes before the throw and does not count." : ", but both come before the throw."}`;
}

export const SVG_W = 480, SVG_H = 270, PAD_L = 50, PAD_R = 18, PAD_T = 28, PAD_B = 40, PATH_STEPS = 48;
/** Axis top: tall enough for the peak AND for one second of climb, so the drone's line is always a visible, climb-dependent segment. */
export function axisMax(v: number, h0: number, s: number, r: number) { return Math.max(40, Math.ceil(Math.max(vertex(v, h0).h, s + r) / 20) * 20); }
export function scaleX(t: number) { return PAD_L + (t / T_MAX) * (SVG_W - PAD_L - PAD_R); }
export function scaleY(y: number, yMax: number) { return SVG_H - PAD_B - (y / yMax) * (SVG_H - PAD_T - PAD_B); }
export function ballPath(v: number, h0: number) {
  const end = landing(v, h0).t; // the last sample is touchdown itself, where the height is 0 by definition
  return Array.from({ length: PATH_STEPS + 1 }, (_, i) => { const t = (end * i) / PATH_STEPS; return i === PATH_STEPS ? { t: end, h: 0 } : { t, h: Math.max(0, ballHeight(v, h0, t)) }; });
}
export function droneSegment(r: number, s: number, yMax: number) {
  const t1 = r > 0 ? Math.min(T_MAX, (yMax - s) / r) : T_MAX;
  return { t1, y1: Math.min(yMax, droneHeight(r, s, t1)) };
}

/* ---------- the sentences the figure renders (exported so the test can check the words, not just the numbers) ---------- */

export function droneWords(r: number, s: number) { return r === 0 ? `hovers at ${s} ft` : `starts at ${s} ft and climbs ${r} ft every second`; }
export function secondsText(t: number) { return `${fmt(t, true)} ${t === 1 ? "second" : "seconds"}`; }
export function discriminantLine(B: number, C: number, D: number) { return `(${neg(-B)})² − 4(16)(${neg(-C)}) = ${neg(D)}`; }
export function nowReadout(v: number, h0: number, r: number, s: number, q: number) { const t = q / 4, h = ballHeight(v, h0, t), d = droneHeight(r, s, t); return `At ${timeLabel(t, true)}: ball ${h < 0 ? "on the ground" : `${h} ft`}, drone ${d} ft${d > axisMax(v, h0, s, r) ? " (off the top of the graph)" : ""}.`; }
export function heightComparison(v: number, h0: number, r: number, s: number, q: number) { const t = q / 4, h = ballHeight(v, h0, t), d = droneHeight(r, s, t), l = landing(v, h0); return h < 0 ? `The ball already landed when ${timeLabel(l.t, l.exact)}.` : h > d ? "The ball is higher." : h < d ? "The drone is higher." : "Same height: a meeting point."; }
export function figureAriaLabel(v: number, h0: number, r: number, s: number, q: number) {
  const p = vertex(v, h0), l = landing(v, h0), m = meetings(v, h0, r, s), yMax = axisMax(v, h0, s, r), seg = droneSegment(r, s, yMax), t = q / 4, d = droneHeight(r, s, t);
  const met = m.times.length ? `The two paths meet when ${m.times.map((x) => timeLabel(x, m.exact)).join(" and ")}` : "The two paths do not meet after the throw";
  return `Height against time, drawn to ${yMax} ft. The ball's parabola starts at ${h0} ft, peaks at ${p.h} ft when ${timeLabel(p.t, true)}, and lands when ${timeLabel(l.t, l.exact)}. The drone's line ${droneWords(r, s)}${seg.t1 < T_MAX ? `, leaving the top of the graph at ${timeLabel(seg.t1, false)}` : ""}. ${met}. Markers show ${timeLabel(t, true)}${d > yMax ? `, where the drone is off the top of the graph at ${d} ft` : ""}.`;
}

export const EXAMPLE = { rate: 8, start: 6, speed: 40, target: 30 } as const;
export function gcd(a: number, b: number): number { return b === 0 ? Math.abs(a) : gcd(b, a % b); }
export function reduce(n: number, d: number) { const g = gcd(n, d); return { p: n / g, q: d / g }; }
export function factorText({ p, q }: { p: number; q: number }) { return `${q === 1 ? "" : q}t ${p < 0 ? "+" : "−"} ${Math.abs(p)}`; }
export function workedExample() {
  const { rate, start, speed, target } = EXAMPLE;
  const droneStep = target - start, droneTime = droneStep / rate;
  const C = start - target;                                 // −16t² + speed·t + C = 0
  const g = gcd(gcd(16, speed), Math.abs(C));
  const a = 16 / g, b = -speed / g, c = -C / g;            // divide every term by −g
  const disc = b * b - 4 * a * c, root = Math.sqrt(disc);
  const fr = [reduce(-b - root, 2 * a), reduce(-b + root, 2 * a)];
  const roots = fr.map(({ p, q }) => p / q);
  const lead = a / (fr[0].q * fr[1].q);
  const checks = roots.map((t) => ballHeight(speed, start, t));
  const vx = vertex(speed, start);
  return { droneStep, droneTime, C, g, a, b, c, disc, roots, lead, factored: `${lead === 1 ? "" : lead}(${factorText(fr[0])})(${factorText(fr[1])}) = 0`, checks, peakT: vx.t, peak: vx.h };
}

export const TRY = { speed: 64, launch: 5 } as const;
export function tryItOptions() {
  const { speed, launch } = TRY;
  const { t, h } = vertex(speed, launch);
  const options = [
    { value: ballHeight(speed, launch, 1), why: `That is the height at t = 1 s, but the ball keeps rising until t = ${speed}/32 = ${t} s.` },
    { value: h, why: `The vertex is at t = ${speed}/32 = ${t} s, and h(${t}) = −16(${t})² + ${speed}(${t}) + ${launch} = ${h}. Completing the square shows the same thing: h(t) = −16(t − ${t})² + ${h}.` },
    { value: ballHeight(speed, launch, 2 * t), why: `That is the height at t = ${2 * t} s, when the ball is back down at its launch height. The vertex is halfway there, at t = ${t} s, not at t = ${speed}/16.` },
    { value: h - launch, why: `${speed}²/64 = ${h - launch} is how far the ball rises above its launch point; add the ${launch} ft launch height to get the peak.` },
  ];
  return { options, correct: options.findIndex((o) => o.value === h) };
}

export default function Lesson() {
  const [speed, setSpeed] = useState(48);
  const [launch, setLaunch] = useState(3);
  const [climb, setClimb] = useState(16);
  const [base, setBase] = useState(10);
  const [quarter, setQuarter] = useState(4);
  const [shown, setShown] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const peak = vertex(speed, launch);
  const land = landing(speed, launch);
  const meet = meetings(speed, launch, climb, base);
  const yMax = axisMax(speed, launch, base, climb);
  const path = ballPath(speed, launch);
  const seg = droneSegment(climb, base, yMax);
  const tNow = quarter / 4;
  const hNow = ballHeight(speed, launch, tNow);
  const dNow = droneHeight(climb, base, tNow);
  const meetTimes = meet.times.map((t) => timeLabel(t, meet.exact)).join(" and ");
  const ex = workedExample();
  const tryIt = tryItOptions();

  const steps = [
    { title: "Drone: set the model equal to the target", math: `${EXAMPLE.rate}t + ${EXAMPLE.start} = ${EXAMPLE.target}`, note: `The drone is ${EXAMPLE.target} ft high when d(t) = ${EXAMPLE.target}. One unknown and no square: a linear equation.` },
    { title: "Undo the addition, then undo the multiplication", math: `${EXAMPLE.rate}t = ${ex.droneStep} → t = ${ex.droneTime}`, note: `Subtracting ${EXAMPLE.start} from both sides, then dividing both sides by ${EXAMPLE.rate}, keeps exactly the same solutions. The drone reaches ${EXAMPLE.target} ft once, at t = ${ex.droneTime} s.` },
    { title: "Ball: set the model equal to the target", math: `${ballExpr(EXAMPLE.speed, EXAMPLE.start)} = ${EXAMPLE.target}`, note: "Same setup, but the t² term makes this a quadratic equation, so expect up to two answers." },
    { title: "Collect on one side, then divide out the common factor", math: `−16t² + ${EXAMPLE.speed}t${signed(ex.C, "")} = 0 → ${ex.a}t²${signed(ex.b, "t")}${signed(ex.c, "")} = 0`, note: `Subtract ${EXAMPLE.target} from both sides, then divide every term by −${ex.g}. Dividing by a nonzero number keeps the solutions and makes the numbers small.` },
    { title: "Check the discriminant", math: `b² − 4ac = (${neg(ex.b)})² − 4(${ex.a})(${ex.c}) = ${ex.b * ex.b} − ${4 * ex.a * ex.c} = ${ex.disc}`, note: "Positive, so there are two real times; a perfect square, so the quadratic factors with whole numbers." },
    { title: "Factor, then use the zero-product property", math: `${ex.factored} → t = ${fmt(ex.roots[0], true)} or t = ${fmt(ex.roots[1], true)}`, note: "A product is zero only when one of its factors is zero, so each factor hands you one time." },
    { title: "Check both answers in the original model, then interpret", math: ex.roots.map((t, i) => `h(${fmt(t, true)}) = ${neg(-16 * t * t)} + ${EXAMPLE.speed * t} + ${EXAMPLE.start} = ${ex.checks[i]}`).join(";  "), note: `Both check. The peak is at t = ${EXAMPLE.speed}/32 = ${fmt(ex.peakT, true)} s, where h = ${ex.peak} ft, just above ${EXAMPLE.target}. The ball passes ${EXAMPLE.target} ft going up at t = ${fmt(ex.roots[0], true)} s and coming down at t = ${fmt(ex.roots[1], true)} s. The linear model gave one time; the quadratic model gives two.` },
  ];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Throw a ball straight up while a drone rises beside it. The drone climbs the same number of feet every second, so its height is a <strong>linear model</strong>: a line. The ball slows, hangs for an instant, and falls, and gravity writes that story as a <strong>quadratic model</strong>: h(t) = {ballExpr(speed, launch)}, where {speed} is the launch speed in feet per second and {launch} is the height it left from.
      </p>
      <p>Once a situation is an equation, every question about it becomes algebra. How high does the ball get? Rewrite the quadratic so its vertex shows. When are the ball and the drone at the same height? Set the two models equal and solve. And each solving move is a step that keeps the equation&apos;s solutions, which is what makes the answer trustworthy. This chapter is about making every step, and every graph, tell you something true.</p>

      <Figure caption="Change the throw, the drone, or the time. The graph, the vertex form, and the meeting-time equation all update together.">
        <div className="flex flex-col items-center gap-5">
          <svg className="mx-auto h-auto max-w-full" width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} role="img" aria-label={figureAriaLabel(speed, launch, climb, base, quarter)}>
            {[0, 1, 2, 3, 4].map((i) => (yMax / 4) * i).map((y) => (<g key={y}><line x1={PAD_L} y1={scaleY(y, yMax)} x2={SVG_W - PAD_R} y2={scaleY(y, yMax)} stroke="var(--line)" strokeWidth={1} /><text x={PAD_L - 8} y={scaleY(y, yMax) + 4} textAnchor="end" fontSize={11} fill="var(--ink-faint)">{y} ft</text></g>))}
            <line x1={PAD_L} y1={scaleY(0, yMax)} x2={SVG_W - PAD_R} y2={scaleY(0, yMax)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={scaleY(0, yMax)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            {[0, 1, 2, 3, 4].map((t) => <text key={t} x={scaleX(t)} y={SVG_H - PAD_B + 16} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">{t}</text>)}
            <text x={(PAD_L + SVG_W - PAD_R) / 2} y={SVG_H - 6} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">seconds</text>
            <line x1={scaleX(tNow)} y1={PAD_T} x2={scaleX(tNow)} y2={scaleY(0, yMax)} stroke="var(--ink-faint)" strokeWidth={1.5} strokeDasharray="4 4" />
            <line x1={scaleX(0)} y1={scaleY(base, yMax)} x2={scaleX(seg.t1)} y2={scaleY(seg.y1, yMax)} stroke={DRONE} strokeWidth={2.5} />
            <polyline points={path.map((p) => `${scaleX(p.t).toFixed(1)},${scaleY(p.h, yMax).toFixed(1)}`).join(" ")} fill="none" stroke={ACCENT} strokeWidth={2.5} />
            <circle cx={scaleX(peak.t)} cy={scaleY(peak.h, yMax)} r={4} fill="var(--surface)" stroke={ACCENT} strokeWidth={2} />
            <text x={scaleX(peak.t)} y={scaleY(peak.h, yMax) - 9} textAnchor="middle" fontSize={11} fontWeight={700} fill={ACCENT}>peak {peak.h} ft</text>
            {meet.times.map((t) => <circle key={t} cx={scaleX(t)} cy={scaleY(droneHeight(climb, base, t), yMax)} r={5} fill={MEET} stroke="white" strokeWidth={2} />)}
            <circle cx={scaleX(tNow)} cy={scaleY(Math.max(0, hNow), yMax)} r={6} fill={ACCENT} stroke="white" strokeWidth={2} />
            {dNow <= yMax && <circle cx={scaleX(tNow)} cy={scaleY(dNow, yMax)} r={6} fill={DRONE} stroke="white" strokeWidth={2} />}
          </svg>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-bold"><span style={{ color: ACCENT }}>ball (quadratic)</span><span style={{ color: DRONE }}>drone (linear)</span><span style={{ color: MEET }}>same height</span></div>

          <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Ball: quadratic model</div>
              <div className="mt-1 font-mono text-lg font-black" style={{ color: ACCENT }}>h(t) = {ballExpr(speed, launch)}</div>
              <div className="font-mono text-sm text-[var(--ink-soft)]">= −16(t − {fmt(peak.t, true)})² + {peak.h}</div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">Completing the square shows the peak: {peak.h} ft at t = {fmt(peak.t, true)} s. The ball lands (h = 0) when {timeLabel(land.t, land.exact)}.</div>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Drone: linear model</div>
              <div className="mt-1 font-mono text-lg font-black" style={{ color: DRONE }}>d(t) = {droneExpr(climb, base)}</div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">The drone {droneWords(climb, base)}{climb === 0 ? ", so its graph is a flat line." : ": the same change each second, so its graph is a straight line."}</div>
              <div className="mt-1 font-mono text-sm">{nowReadout(speed, launch, climb, base, quarter)}</div>
              <div className="text-sm text-[var(--ink-soft)]">{heightComparison(speed, launch, climb, base, quarter)}</div>
            </div>
          </div>

          <div className="w-full max-w-xl rounded-2xl border-2 px-5 py-3 text-center" style={{ borderColor: MEET }}>
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">When are they at the same height? Set h(t) = d(t)</div>
            <div className="mt-1 font-mono text-[15px] font-semibold">{ballExpr(speed, launch)} = {droneExpr(climb, base)} → {standardForm(meet.B, meet.C)}</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">The discriminant b² − 4ac = {discriminantLine(meet.B, meet.C, meet.D)} {meetingSummary(meet)}{meet.times.length > 0 && <> Meeting {meet.times.length === 1 ? "time" : "times"}: <strong>{meetTimes}</strong>.</>}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Stepper label="Launch speed (ft/s)" value={speed} min={16} max={64} step={8} color={ACCENT} onChange={setSpeed} />
            <Stepper label="Launch height (ft)" value={launch} min={0} max={8} color={ACCENT} onChange={setLaunch} />
            <Stepper label="Drone climb (ft/s)" value={climb} min={0} max={24} step={8} color={DRONE} onChange={setClimb} />
            <Stepper label="Drone start (ft)" value={base} min={0} max={40} step={10} color={DRONE} onChange={setBase} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Time: <span className="text-[var(--ink)]">{fmt(tNow, true)} s</span></span>
            <input type="range" min={0} max={18} value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className="w-56 accent-[var(--band-high)]" aria-label="Time in quarter seconds" aria-valuetext={secondsText(tNow)} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: one target, two kinds of model</h2>
      <p>A drone rises from {EXAMPLE.start} ft at {EXAMPLE.rate} ft/s, so d(t) = {EXAMPLE.rate}t + {EXAMPLE.start}. A ball is thrown up from the same {EXAMPLE.start} ft at {EXAMPLE.speed} ft/s, so h(t) = {ballExpr(EXAMPLE.speed, EXAMPLE.start)}. When is each one {EXAMPLE.target} ft high? Reveal the reasoning one move at a time.</p>
      <div className="card my-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShown((s) => Math.min(steps.length, s + 1))} disabled={shown >= steps.length} aria-expanded={shown > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>
            {shown === 0 ? "Show the first step" : shown < steps.length ? "Next step" : "All steps shown"}
          </button>
          <button type="button" onClick={() => setShown(0)} disabled={shown === 0} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
          <span className="text-sm text-[var(--ink-faint)]">{shown} of {steps.length} steps</span>
        </div>
        <ol id={stepsId} className="mt-3 flex list-none flex-col gap-2 p-0">
          {steps.slice(0, shown).map((s, i) => (
            <li key={s.title} className="rounded-xl bg-[var(--surface-2)] px-4 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Step {i + 1}: {s.title}</div>
              <div className="font-mono text-base font-black">{s.math}</div><div className="text-sm text-[var(--ink-soft)]">{s.note}</div>
            </li>
          ))}
        </ol>
      </div>

      <h2>Try it</h2>
      <p>A ball is thrown straight up from {TRY.launch} ft at {TRY.speed} ft/s, so h(t) = {ballExpr(TRY.speed, TRY.launch)}. What is the greatest height it reaches?</p>
      <div className="flex flex-wrap gap-2">
        {tryIt.options.map((o, i) => (
          <button key={o.value} type="button" onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={pick === i ? { background: i === tryIt.correct ? DRONE : MEET, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o.value} ft</button>
        ))}
      </div>
      <p aria-live="polite" className="mt-3 text-sm">{pick === null ? "Pick the height you think is the peak." : pick === tryIt.correct ? `Correct. ${tryIt.options[pick].why}` : `Not quite. ${tryIt.options[pick].why}`}</p>

      <h2>Where this chapter goes</h2>
      <p>
        The rest of the chapter takes each move in this picture and makes it a skill. <strong>Every Step Has a Reason</strong> slows the drone equation down until every line, subtract or divide, comes with its justification. <strong>Reading an Expression&apos;s Parts</strong> asks what −16, {speed}, and {launch} each mean in the ball&apos;s model, and <strong>Completing the Square</strong> turns that rewriting into the vertex form that revealed the peak here. <strong>Four Ways to Solve a Quadratic</strong> grows the discriminant-and-factor routine into a full toolkit, while <strong>Radical &amp; Rational Equations</strong> meets equations whose solving moves can invent false answers, which is exactly why the worked example checks its solutions. Three systems lessons, <strong>Solving Systems by Elimination</strong>, <strong>A Line Meets a Parabola</strong>, and <strong>Systems as Matrix Equations</strong>, take the ball-meets-drone idea from one picture to any number of equations. Finally, <strong>A Graph IS the Solution Set</strong> and <strong>Graphing Inequalities</strong> make the graph itself the object of study: every point on a curve is a solution, and shading a region answers questions like &ldquo;when is the ball above the drone?&rdquo;
      </p>

      <MathCheck>
        <p>
          The ball&apos;s height is the quadratic model h(t) = {ballExpr(speed, launch)}: the −16 comes from gravity (in feet and seconds), {speed} is the launch speed in ft/s, and {launch} is the launch height in feet (A-SSE.1). Completing the square rewrites it as −16(t − {fmt(peak.t, true)})² + {peak.h}; a squared quantity is never negative, so the height can never exceed {peak.h} ft and reaches it exactly when t = {fmt(peak.t, true)} s (A-SSE.3). The drone&apos;s height d(t) = {droneExpr(climb, base)} is a linear model. Every point on either graph is a solution of that model&apos;s equation (A-REI.10), so the graphs cross exactly at the t-values where h(t) = d(t) (A-REI.11). Setting the two models equal gives {standardForm(meet.B, meet.C)}, a single quadratic in t (A-REI.7); its discriminant, {neg(meet.D)} (A-REI.4), {meetingSummary(meet)} In the worked example, subtracting the same number from both sides, dividing both sides by −{ex.g}, and factoring so the zero-product property applies each keep the solution set unchanged: the linear model gives one time, t = {ex.droneTime} s, and the quadratic gives two, t = {fmt(ex.roots[0], true)} s and t = {fmt(ex.roots[1], true)} s (A-REI.1, A-REI.3, A-SSE.2).
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
