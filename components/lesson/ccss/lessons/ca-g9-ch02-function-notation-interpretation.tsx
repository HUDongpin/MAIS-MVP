"use client";

import { useId, useState, type ReactNode } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const MARK = "var(--band-upper)";

/* ---------- the ticket-sale model (pure helpers, exported for the test) ---------- */

export const SEATS = 600;
export const CONTROLS = {
  presale: { min: 0, max: 100, step: 25 },
  perDay: { min: 50, max: 150, step: 25 },
} as const;
export const TARGETS = [150, 300, 450, 600] as const;
export type Mode = "evaluate" | "solve";

/** T(d): tickets sold d days after the public sale opens. */
export function sold(presale: number, perDay: number, day: number): number { return presale + perDay * day; }
export function gcd(a: number, b: number): number { return b === 0 ? Math.abs(a) : gcd(b, a % b); }
export function reduce(n: number, d: number): { n: number; d: number } { const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; }
export function asNumber(f: { n: number; d: number }): number { return f.n / f.d; }
export function fractionShort(f: { n: number; d: number }): string { return f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`; }
/** "23/2 = 11.5" when the decimal terminates in two places, otherwise "40/3 (about 13.33)". */
export function fractionText(f: { n: number; d: number }): string {
  if (f.d === 1) return `${f.n}`;
  const exact = (f.n / f.d).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return 100 % f.d === 0 ? `${f.n}/${f.d} = ${exact}` : `${f.n}/${f.d} (about ${(f.n / f.d).toFixed(2)})`;
}
/** The exact day the hall fills, as a reduced fraction. */
export function selloutDay(presale: number, perDay: number) { return reduce(SEATS - presale, perDay); }
/** The last whole day whose ticket count still fits in the hall. */
export function lastDay(presale: number, perDay: number): number { return Math.floor((SEATS - presale) / perDay); }
/** The exact day the count reaches `target`, as a reduced fraction. */
export function dayFor(presale: number, perDay: number, target: number) { return reduce(target - presale, perDay); }
/** T(0), T(1), …, T(lastDay): the rule restricted to whole days. */
export function sequence(presale: number, perDay: number): number[] { return Array.from({ length: lastDay(presale, perDay) + 1 }, (_, i) => sold(presale, perDay, i)); }
export function averageRate(presale: number, perDay: number, a: number, b: number): number { return (sold(presale, perDay, b) - sold(presale, perDay, a)) / (b - a); }
export function ruleText(presale: number, perDay: number): string { return presale === 0 ? `${perDay}d` : `${presale} + ${perDay}d`; }
export function dayWord(n: number): string { return n === 1 ? "day" : "days"; }
export function evaluateText(presale: number, perDay: number, day: number): string {
  const c = sold(presale, perDay, day);
  return presale === 0 ? `T(${day}) = ${perDay} · ${day} = ${c}` : `T(${day}) = ${presale} + ${perDay} · ${day} = ${c}`;
}
export function solveText(presale: number, perDay: number, target: number): string {
  const f = dayFor(presale, perDay, target);
  return presale === 0
    ? `${perDay}d = ${target}, so d = ${fractionText(f)}`
    : `${presale} + ${perDay}d = ${target}, so ${perDay}d = ${target - presale} and d = ${fractionText(f)}`;
}
export function evaluateMeaning(presale: number, perDay: number, day: number): string {
  const c = sold(presale, perDay, day);
  const open = SEATS - c;
  const when = day === 0 ? "When the public sale opens" : `After ${day} ${dayWord(day)} of the public sale`;
  return open === 0 ? `${when}, every one of the ${SEATS} seats is taken.` : `${when}, ${c} of the ${SEATS} seats are taken and ${open} are still open.`;
}
export function solveMeaning(presale: number, perDay: number, target: number): string {
  const f = dayFor(presale, perDay, target);
  return f.d === 1
    ? `Ticket number ${target} goes out exactly ${f.n} ${dayWord(f.n)} into the sale.`
    : `The count passes ${target} partway through day ${Math.ceil(asNumber(f))}.`;
}

/* ---------- graph geometry: every coordinate stays inside the viewBox ---------- */

export const W = 380, H = 262, PAD_L = 52, PAD_R = 26, PAD_T = 26, PAD_B = 44;
export const PLOT_W = W - PAD_L - PAD_R;
export const PLOT_H = H - PAD_T - PAD_B;
/** The horizontal axis runs to the first whole day at or past the sell-out. */
export function axisDays(presale: number, perDay: number): number { return Math.ceil((SEATS - presale) / perDay); }
export function scaleX(day: number, xMax: number): number { return PAD_L + (day / xMax) * PLOT_W; }
export function scaleY(tickets: number): number { return H - PAD_B - (tickets / SEATS) * PLOT_H; }
export function markLabel(x: number, y: number) {
  const anchor: "start" | "end" = x > PAD_L + PLOT_W / 2 ? "end" : "start";
  return { anchor, x: anchor === "end" ? x - 9 : x + 9, y: y - 10 < PAD_T + 6 ? y + 18 : y - 10 };
}
export function graphAria(presale: number, perDay: number, mode: Mode, day: number, target: number): string {
  const base = `Tickets sold against days of the sale. The line starts at ${presale} on day 0, climbs ${perDay} tickets a day, and reaches the ${SEATS} seats after ${fractionText(selloutDay(presale, perDay))} ${dayWord(asNumber(selloutDay(presale, perDay)))}. Dots mark the whole days 0 through ${lastDay(presale, perDay)}.`;
  return mode === "evaluate"
    ? `${base} Reading day ${day} up to the line and across gives ${sold(presale, perDay, day)} tickets.`
    : `${base} Reading ${target} tickets across to the line and down gives day ${fractionShort(dayFor(presale, perDay, target))}.`;
}

/* ---------- worked example and "Try it", computed from constants ---------- */

export const EX = { cups: 240, perHour: 18, at: 5, target: 60 } as const;
/** Cups still in the cooler h hours after the snow-cone stand opens. */
export function cupsLeft(h: number): number { return EX.cups - EX.perHour * h; }
export function cupsSold(h: number): number { return EX.perHour * h; }
export function workedExample() {
  const left = cupsLeft(EX.at);
  const solved = reduce(EX.cups - EX.target, EX.perHour);
  const empty = reduce(EX.cups, EX.perHour);
  return { left, gone: cupsSold(EX.at), solved, empty, rate: (cupsLeft(asNumber(solved)) - left) / (asNumber(solved) - EX.at) };
}
export const TRY_AT = 9;
export const TRY_LEFT = cupsLeft(TRY_AT);
/** Reading C(9) as "C times 9" would need the rule to be a constant multiple of its input. */
export function readsAsProduct(): boolean { return [1, 2, 3, 4].every((h) => cupsLeft(h) === cupsLeft(1) * h); }
export function tryOptions() {
  const options = [
    { text: `The stand sold ${TRY_LEFT} cups during its first ${TRY_AT} hours.`, holds: cupsSold(TRY_AT) === TRY_LEFT, why: `In ${TRY_AT} hours the stand sells ${EX.perHour} × ${TRY_AT} = ${cupsSold(TRY_AT)} cups. The output of C counts what is left, not what is gone.` },
    { text: `After ${TRY_AT} hours, ${TRY_LEFT} cups are still in the cooler.`, holds: cupsLeft(TRY_AT) === TRY_LEFT, why: `C(${TRY_AT}) = ${EX.cups} − ${EX.perHour} × ${TRY_AT} = ${TRY_LEFT}. Hours go in, cups still in the cooler come out.` },
    { text: `C times ${TRY_AT} equals ${TRY_LEFT}, so C is ${TRY_LEFT} ÷ ${TRY_AT}.`, holds: readsAsProduct(), why: `C names the rule; it is not a factor. If C(h) meant C × h, doubling the input would double the output, but C(1) = ${cupsLeft(1)} while C(2) = ${cupsLeft(2)}, not ${cupsLeft(1) * 2}.` },
    { text: `After ${TRY_LEFT} hours, ${TRY_AT} cups are still in the cooler.`, holds: cupsLeft(TRY_LEFT) === TRY_AT, why: `That swaps the input with the output. C(${TRY_LEFT}) = ${EX.cups} − ${EX.perHour} × ${TRY_LEFT} = ${cupsLeft(TRY_LEFT)}, which is not a possible number of cups.` },
  ];
  return { options, correct: options.findIndex((o) => o.holds) };
}

const MODES: ReadonlyArray<{ key: Mode; label: string }> = [
  { key: "evaluate", label: "Evaluate T(d)" },
  { key: "solve", label: "Solve T(d) = b" },
];

export default function Lesson() {
  const [presale, setPresale] = useState(50);
  const [perDay, setPerDay] = useState(100);
  const [dayRaw, setDay] = useState(3);
  const [target, setTarget] = useState<number>(450);
  const [mode, setMode] = useState<Mode>("evaluate");
  const [shown, setShown] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const maxDay = lastDay(presale, perDay);
  const day = Math.min(dayRaw, maxDay);
  const count = sold(presale, perDay, day);
  const xMax = axisDays(presale, perDay);
  const sellout = selloutDay(presale, perDay);
  const solveDay = dayFor(presale, perDay, target);
  const seq = sequence(presale, perDay);
  const overDay = maxDay + 1;
  const overCount = sold(presale, perDay, overDay);
  const evaluating = mode === "evaluate";
  const markX = scaleX(evaluating ? day : asNumber(solveDay), xMax);
  const markY = scaleY(evaluating ? count : target);
  const label = markLabel(markX, markY);
  const we = workedExample();
  const tryIt = tryOptions();

  const steps: ReactNode[] = [
    <>Read the notation first. In C(h) = {EX.cups} − {EX.perHour}h the letter C names the rule, h is the input (hours since the stand opened), and C(h) is the output (cups still in the cooler). So C({EX.at}) asks for the output when h = {EX.at} (F-IF.2).</>,
    <>Evaluate by substituting: C({EX.at}) = {EX.cups} − {EX.perHour} · {EX.at} = {EX.cups} − {we.gone} = <strong>{we.left}</strong>.</>,
    <>Say it in the language of the story: {EX.at} hours in, <strong>{we.left} cups</strong> are still in the cooler, which also means {we.gone} have been sold (F-IF.4).</>,
    <>Run the notation the other way. &ldquo;When are only {EX.target} cups left?&rdquo; is the question C(h) = {EX.target}: {EX.cups} − {EX.perHour}h = {EX.target}, so {EX.perHour}h = {EX.cups - EX.target} and h = <strong>{fractionText(we.solved)}</strong>.</>,
    <>Let the story set the domain. The cooler runs dry when C(h) = 0, at h = {EX.cups} ÷ {EX.perHour} = <strong>{fractionText(we.empty)}</strong> hours, so only 0 ≤ h ≤ {fractionShort(we.empty)} describes a real afternoon; past that the rule keeps producing negative cups (F-IF.5).</>,
    <>Average rate of change from h = {EX.at} to h = {fractionShort(we.solved)}: (C({fractionShort(we.solved)}) − C({EX.at})) ÷ ({fractionShort(we.solved)} − {EX.at}) = ({EX.target} − {we.left}) ÷ {asNumber(we.solved) - EX.at} = <strong>{we.rate}</strong> cups per hour. The minus sign says the cooler is emptying, and {EX.perHour} is exactly the number multiplying h in the rule (F-IF.6).</>,
  ];

  return (
    <div className="prose-lesson max-w-none">
      <p>The box office screen for a school concert shows one number: how many tickets have gone out so far. Ask it on day 2 and it answers once; ask again on day 5 and it answers once. One input, one output, no arguing — that is what makes the ticket count a <strong>function</strong> of the day. This chapter is about the shorthand for such a rule, T(d), and about the harder half of the work: saying out loud what a statement like T({day}) = {count} actually claims about the sale.</p>
      <p>The hall holds {SEATS} seats. Some tickets go out in a presale before the public sale opens, and after that the box office moves the same number every day, so the count after d days is <strong>T(d) = {ruleText(presale, perDay)}</strong>. Two questions run this chapter, and the same rule answers both: put a day in and read a count out, or start from a count and work back to the day. Switch between them below and watch which way the dashed guides travel.</p>

      <Figure caption="One rule, read two ways. Evaluating turns a day into a ticket count; solving turns a ticket count back into a day.">
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">the rule</span>
            <div className="rounded-xl px-4 py-2 font-mono text-base font-black text-white" style={{ background: ACCENT }}>T(d) = {ruleText(presale, perDay)}</div>
            <span className="text-sm text-[var(--ink-soft)]">tickets sold after d days, in a hall of {SEATS} seats</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {MODES.map((m) => <button key={m.key} type="button" onClick={() => setMode(m.key)} aria-pressed={mode === m.key} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mode === m.key ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{m.label}</button>)}
          </div>

          <div className="flex w-full flex-wrap items-start justify-center gap-5">
            <svg className="mx-auto h-auto max-w-full" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={graphAria(presale, perDay, mode, day, target)}>
              {Array.from({ length: xMax + 1 }, (_, i) => <line key={i} x1={scaleX(i, xMax)} y1={PAD_T} x2={scaleX(i, xMax)} y2={scaleY(0)} stroke="var(--line)" strokeWidth={1} />)}
              {TARGETS.map((t) => <g key={t}><line x1={PAD_L} y1={scaleY(t)} x2={W - PAD_R} y2={scaleY(t)} stroke="var(--line)" strokeWidth={1} /><text x={PAD_L - 8} y={scaleY(t) + 4} textAnchor="end" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{t}</text></g>)}
              <text x={PAD_L - 8} y={scaleY(0) + 4} textAnchor="end" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">0</text>
              <line x1={PAD_L} y1={scaleY(0)} x2={W - PAD_R} y2={scaleY(0)} stroke="var(--ink-soft)" strokeWidth={2} />
              <line x1={PAD_L} y1={scaleY(0)} x2={PAD_L} y2={PAD_T} stroke="var(--ink-soft)" strokeWidth={2} />
              {Array.from({ length: xMax + 1 }, (_, i) => <text key={i} x={scaleX(i, xMax)} y={scaleY(0) + 16} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{i}</text>)}
              <text x={(PAD_L + W - PAD_R) / 2} y={H - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink-soft)">days since the sale opened (d)</text>
              <text x={4} y={14} fontSize={10} fontWeight={700} fill="var(--ink-soft)">tickets sold T(d)</text>
              <line x1={scaleX(0, xMax)} y1={scaleY(presale)} x2={scaleX(asNumber(sellout), xMax)} y2={scaleY(SEATS)} stroke={ACCENT} strokeWidth={2.5} />
              <circle cx={scaleX(asNumber(sellout), xMax)} cy={scaleY(SEATS)} r={4.5} fill="var(--surface)" stroke={ACCENT} strokeWidth={2} />
              {seq.map((t, i) => <circle key={i} cx={scaleX(i, xMax)} cy={scaleY(t)} r={3.5} fill="var(--surface)" stroke={ACCENT} strokeWidth={1.5} />)}
              {evaluating
                ? <g><line x1={markX} y1={scaleY(0)} x2={markX} y2={markY} stroke={MARK} strokeWidth={2} strokeDasharray="5 4" /><line x1={markX} y1={markY} x2={PAD_L} y2={markY} stroke={MARK} strokeWidth={2} strokeDasharray="5 4" /></g>
                : <g><line x1={PAD_L} y1={markY} x2={markX} y2={markY} stroke={MARK} strokeWidth={2} strokeDasharray="5 4" /><line x1={markX} y1={markY} x2={markX} y2={scaleY(0)} stroke={MARK} strokeWidth={2} strokeDasharray="5 4" /></g>}
              <circle cx={markX} cy={markY} r={6} fill={MARK} stroke="white" strokeWidth={2} />
              <text x={label.x} y={label.y} textAnchor={label.anchor} fontSize={11} fontWeight={800} fill={MARK} fontFamily="var(--font-mono)">{evaluating ? `T(${day}) = ${count}` : `d = ${fractionShort(solveDay)}`}</text>
            </svg>

            <div className="flex max-w-sm flex-col gap-2 text-[15px]">
              <div className="rounded-2xl border-2 px-4 py-3" style={{ borderColor: MARK }}>
                <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">{evaluating ? "A day goes in, a count comes out" : "A count goes in, a day comes out"}</div>
                <div className="mt-1 font-mono text-[15px] font-black" style={{ color: MARK }}>{evaluating ? evaluateText(presale, perDay, day) : `T(d) = ${target}: ${solveText(presale, perDay, target)}`}</div>
                <div className="mt-1 text-sm text-[var(--ink-soft)]">{evaluating ? evaluateMeaning(presale, perDay, day) : solveMeaning(presale, perDay, target)}</div>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] px-4 py-2"><div className="text-xs font-bold uppercase text-[var(--ink-faint)]">Where it starts</div>T(0) = {presale}{presale === 0 ? ": no seat is spoken for when the public sale opens, so the line starts at the origin." : `: the ${presale} presale tickets are already gone before day 1, so the line starts that high up the vertical axis.`}</div>
              <div className="rounded-xl bg-[var(--surface-2)] px-4 py-2"><div className="text-xs font-bold uppercase text-[var(--ink-faint)]">How fast</div>{day >= 1
                  ? <>(T({day}) − T(0)) ÷ ({day} − 0) = ({count} − {presale}) ÷ {day} = <strong style={{ color: MARK }}>{averageRate(presale, perDay, 0, day)}</strong> tickets per day, and the answer is the same on every interval because the graph is a straight line.</>
                  : <>Step to day 1 or later to compare two points; between any two of them the count climbs {perDay} tickets per day.</>}</div>
              <div className="rounded-xl bg-[var(--surface-2)] px-4 py-2"><div className="text-xs font-bold uppercase text-[var(--ink-faint)]">Where it stops</div>The hall fills at d = {fractionText(sellout)}, so the domain in this story is 0 ≤ d ≤ {fractionShort(sellout)}. Day {overDay} is outside it: the rule reports T({overDay}) = {overCount}, which is {overCount - SEATS} more than the hall holds.</div>
            </div>
          </div>

          <div className="w-full">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Whole days give a sequence: T(0), T(1), …, T({maxDay}). Tap a term to evaluate there.</p>
            <div className="flex flex-wrap justify-center gap-1.5">{seq.map((t, i) => <button key={i} type="button" onClick={() => { setDay(i); setMode("evaluate"); }} aria-pressed={evaluating && i === day} aria-label={`Evaluate T of ${i}`} className="rounded-lg border px-2 py-1 font-mono text-sm font-bold" style={evaluating && i === day ? { borderColor: ACCENT, background: "color-mix(in oklab, var(--band-high) 12%, var(--surface))" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{t}</button>)}</div>
            <p className="mt-1 text-center text-xs text-[var(--ink-soft)]">Each term is {perDay} more than the one before, so this sequence is T restricted to the whole numbers 0 through {maxDay}.</p>
          </div>

          <div className="w-full">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Or name a ticket count b and solve T(d) = b for the day.</p>
            <div className="flex flex-wrap justify-center gap-2">{TARGETS.map((t) => <button key={t} type="button" onClick={() => { setTarget(t); setMode("solve"); }} aria-pressed={!evaluating && t === target} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={!evaluating && t === target ? { borderColor: MARK, background: "color-mix(in oklab, var(--band-upper) 14%, var(--surface))" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>b = {t}</button>)}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Presale tickets" value={presale} min={0} max={100} step={25} onChange={setPresale} />
            <Stepper label="Tickets per day" value={perDay} min={50} max={150} step={25} color={ACCENT} onChange={setPerDay} />
            <Stepper label="Day d" value={day} min={0} max={maxDay} onChange={setDay} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: evaluate it, then say what it means</h2>
      <p>A snow-cone stand opens with {EX.cups} cups in the cooler and empties it at a steady {EX.perHour} cups an hour, so the number of cups left after h hours is C(h) = {EX.cups} − {EX.perHour}h. Reveal the reasoning one move at a time.</p>
      <div className="card my-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShown((s) => Math.min(steps.length, s + 1))} disabled={shown >= steps.length} aria-expanded={shown > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>{shown === 0 ? "Show the first step" : shown < steps.length ? "Next step" : "All steps shown"}</button>
          <button type="button" onClick={() => setShown(0)} disabled={shown === 0} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
          <span className="text-sm text-[var(--ink-faint)]">{shown} of {steps.length} steps</span>
        </div>
        <ol id={stepsId} className="mt-3 flex list-none flex-col gap-2 p-0">{steps.slice(0, shown).map((s, i) => <li key={i} className="rounded-xl bg-[var(--surface-2)] px-4 py-2.5 text-[15px]"><span className="mr-2 text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Step {i + 1}</span>{s}</li>)}</ol>
      </div>

      <h2>Try it</h2>
      <p>Same stand, C(h) = {EX.cups} − {EX.perHour}h, and C({TRY_AT}) = {TRY_LEFT}. Which sentence says the same thing?</p>
      <div className="grid gap-2 sm:grid-cols-2">{tryIt.options.map((o, i) => <button key={i} type="button" onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-xl border px-3 py-2 text-left text-sm" style={pick === i ? { borderColor: i === tryIt.correct ? ACCENT : "var(--ink-faint)", background: "color-mix(in oklab, var(--band-high) 12%, var(--surface))" } : { borderColor: "var(--line)" }}><span className="mr-2 font-bold">{String.fromCharCode(65 + i)}.</span>{o.text}</button>)}</div>
      <p aria-live="polite" className="mt-3 text-[15px]">{pick === null ? "Pick the sentence that reads the notation correctly." : pick === tryIt.correct ? `Correct. ${tryIt.options[pick].why}` : `Not this one. ${tryIt.options[pick].why}`}</p>

      <h2>Where this chapter goes</h2>
      <p>Four lessons follow, each taking one part of the figure further. <strong>Functions and Notation</strong> slows the rule down to a machine: what makes a relationship a function at all, how f(x) is read and evaluated, and why a list of terms is a function whose inputs are integers. <strong>Reading a Graph&rsquo;s Story</strong> trades this straight line for the arc of a rocket, where the peak, the intercepts, and an average rate of change that shifts from interval to interval all have to be read off the picture. <strong>Transforming Parabolas: Vertex Form</strong> goes the other way, from rule to graph: changing the numbers inside a rule slides and stretches the curve, and rewriting the rule can put a feature such as the vertex in plain sight. <strong>Comparing Functions</strong> closes the chapter by setting a formula beside a table and asking which function starts higher and which one climbs faster.</p>

      <MathCheck>
        <p>Each day of this sale has exactly one ticket count, so T is a <strong>function</strong>: every dot sits above a different day, and no vertical line meets the graph twice (F-IF.1). <strong>Function notation</strong> names those outputs. T({day}) = {count} is read &ldquo;T of {day}&rdquo;; evaluating it is substitution, {evaluateText(presale, perDay, day)}, and it never means T multiplied by {day} (F-IF.2). The same notation runs backwards: T(d) = {target} is a question about the input, answered by undoing the rule to get d = {fractionText(solveDay)} (F-IF.2). Whole days give the terms {seq[0]}, {seq[1]}, {seq[2]}, …, each {perDay} more than the last, so T restricted to the whole numbers 0 through {maxDay} is a <strong>sequence</strong>, a function defined on the integers (F-IF.3). The intercept T(0) = {presale} is the presale total and the line ends where it meets {SEATS}; both are <strong>key features</strong> of this story rather than facts about algebra (F-IF.4). The <strong>domain</strong> 0 ≤ d ≤ {fractionShort(sellout)} comes from the hall, not the formula, which cheerfully reports T({overDay}) = {overCount} — {overCount - SEATS} more tickets than there are seats (F-IF.5). Finally, the <strong>average rate of change</strong> (T(b) − T(a)) ÷ (b − a) equals {perDay} tickets per day on every interval; it is constant precisely because the graph is a straight line, which is what selling the same number each day looks like (F-IF.6).</p>
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
        <span className="w-12 text-center text-2xl font-black tabular-nums" style={color ? { color } : undefined}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
