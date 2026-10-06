"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { pickSpot, textBox, type LabelBox } from "@/components/lesson/ccss/labelSpacing";

const ACCENT = "var(--band-high)", SECANT = "var(--band-upper)", DATA_INK = "var(--band-middle)";

export type ClubKey = "chess" | "ski" | "game";
export type Rational = { num: number; den: number };

/** Weeks across, members up. Every model below stays inside 0..64 members over weeks 0..6. */
export const WEEK_MIN = 0, WEEK_MAX = 6, MEMBER_MAX = 64;
/** PAD_B carries two stacked rows below the axis — the week numbers, then the axis
 * name under them. At 28 the name was printed into the digits it names. */
export const CELL_X = 46, CELL_Y = 4, PAD_L = 34, PAD_R = 18, PAD_T = 20, PAD_B = 38;
export const WEEK_TICK_DY = 15;
export const W = PAD_L + WEEK_MAX * CELL_X + PAD_R, H = PAD_T + MEMBER_MAX * CELL_Y + PAD_B;
/** A generous per-character advance for the 10px bold face the secant labels use. */
export const SECANT_LABEL_SIZE = 10, SECANT_GLYPH = 6.4;
/** The row of week numbers under the axis and the column of member numbers beside it. */
export function axisNumberBands(): LabelBox[] {
  return [
    { x0: sx(WEEK_MIN) - 10, x1: sx(WEEK_MAX) + 10, y0: sy(0) + WEEK_TICK_DY - 8, y1: sy(0) + WEEK_TICK_DY + 3 },
    { x0: 0, x1: PAD_L - 4, y0: sy(MEMBER_MAX) - 8, y1: sy(0) + 3 },
  ];
}

/**
 * Where "run = …" and "rise = …" go. Both were pinned to the secant — the run
 * under its horizontal leg, the rise left of its vertical one — and those two
 * legs meet at a right angle, so on a one-week run the labels shared the corner.
 * A secant starting at 0 members put the run label into the week numbers as
 * well. Each label now takes the first side of its own leg that is clear.
 */
export function secantLabelSpots(a: number, b: number, fa: number, fb: number, runText: string, riseText: string) {
  const bounds: LabelBox = { x0: 0, y0: 0, x1: W, y1: H }, bands = axisNumberBands();
  const midX = (sx(a) + sx(b)) / 2, midY = (sy(fa) + sy(fb)) / 2 + 3;
  const box = (x: number, y: number, text: string, anchor: "start" | "middle" | "end") => textBox(x, y, text.length * SECANT_GLYPH, { anchor, fontSize: SECANT_LABEL_SIZE });
  const runChoices = [sy(fa) + 13, sy(fa) - 6].map((y) => ({ x: midX, y, anchor: "middle" as const, box: box(midX, y, runText, "middle") }));
  const run = pickSpot(runChoices, bands, { gap: 2, bounds });
  const riseChoices = ([["end", -7], ["start", 7]] as const).map(([anchor, dx]) => {
    const x = sx(b) + dx;
    return { x, y: midY, anchor, box: box(x, midY, riseText, anchor) };
  });
  return { run, rise: pickSpot(riseChoices, [...bands, run.box], { gap: 2, bounds }) };
}

/** Curve sampling step. 1/16 is exact in binary, so every sample lands on a clean pixel. */
export const STEP = 1 / 16;
export const sx = (w: number) => PAD_L + w * CELL_X;
export const sy = (m: number) => H - PAD_B - m * CELL_Y;

/** Integers plain, other values to two decimals, negatives with a true minus sign. */
export function numText(n: number): string {
  const size = Math.abs(n);
  return (n < 0 ? "−" : "") + (Number.isInteger(size) ? String(size) : String(Math.round(size * 100) / 100));
}
export function gcd(a: number, b: number): number { let x = Math.abs(a), y = Math.abs(b); while (y > 0) { const t = x % y; x = y; y = t; } return x; }
/** A fraction in lowest terms, with the sign carried by the numerator. */
export function reduce(numerator: number, denominator: number): Rational {
  const sign = denominator < 0 ? -1 : 1, g = gcd(numerator, denominator) || 1;
  return { num: (sign * numerator) / g, den: (sign * denominator) / g };
}
export function rationalValue(r: Rational): number { return r.num / r.den; }
export function rationalText(r: Rational): string { return r.den === 1 ? numText(r.num) : `${numText(r.num)}/${r.den}`; }
/** A rate of exactly 1 takes a singular noun; every other value, negatives included, takes the plural. */
export function rateNoun(r: Rational): string { return r.num === 1 && r.den === 1 ? "member" : "members"; }
/** A fraction that is not a whole number also gets a rounded decimal, so its size reads at a glance. */
export function rationalLong(r: Rational): string { return r.den === 1 ? numText(r.num) : `${numText(r.num)}/${r.den} ≈ ${numText(Math.round(rationalValue(r) * 100) / 100)}`; }
/** A count beside its noun: "1 member", "14 members". */
export function memberPhrase(n: number): string { return `${n} ${n === 1 ? "member" : "members"}`; }
/** The whole sentence, so the verb agrees with the count as well as the noun does. */
export function countedText(n: number): string { return n === 1 ? "1 member was counted that week" : `${n} members were counted that week`; }

/** Three clubs, three shapes, one shared axis — and two different ways of reaching you. */
export const CLUBS: { key: ClubKey; name: string; letter: string; formula: string | null; shape: string }[] = [
  { key: "chess", name: "Chess club", letter: "C", formula: "C(w) = 10w + 4", shape: "a straight line" },
  { key: "ski", name: "Ski club", letter: "S", formula: "S(w) = 64 − 4(w − 3)²", shape: "a parabola opening downward" },
  { key: "game", name: "Game club", letter: "G", formula: null, shape: "dashed segments joining the counts, climbing ever more steeply" },
];
export function clubInfo(key: ClubKey) {
  const found = CLUBS.find((c) => c.key === key);
  if (!found) throw new Error(`unknown club ${key}`);
  return found;
}
/** How the club is handed to you: a rule you can evaluate at any week, or a row of recorded numbers. */
export function givenBy(key: ClubKey): "formula" | "table" { return clubInfo(key).formula === null ? "table" : "formula"; }
export function sourceText(key: ClubKey): string {
  const club = clubInfo(key);
  return club.formula ? `${club.name} arrives as a rule, so you can evaluate it at any week:` : `${club.name} arrives as a table and nothing more — no rule was ever written down, so these seven numbers are the whole of what you know:`;
}
export function members(key: ClubKey, w: number): number { return key === "chess" ? 10 * w + 4 : key === "ski" ? MEMBER_MAX - 4 * (w - 3) * (w - 3) : Math.pow(2, w); }
/** The seven recorded counts. Membership is only ever counted at whole weeks. */
export function memberCounts(key: ClubKey): number[] { return Array.from({ length: WEEK_MAX + 1 }, (_, w) => members(key, w)); }
/** The six week-to-week changes: the rate of change on each single-week interval. */
export function stepChanges(key: ClubKey): number[] { return Array.from({ length: WEEK_MAX }, (_, i) => members(key, i + 1) - members(key, i)); }
/** (f(b) − f(a))/(b − a) as an exact fraction; every count is a whole number, so it always is one. */
export function averageRate(key: ClubKey, a: number, b: number): Rational { return reduce(members(key, b) - members(key, a), b - a); }

/** What the six weekly changes do among themselves — the fingerprint of the function family. The three
 *  tests are ordered and mutually exclusive: no change at all, then a fixed non-zero step, then a fixed
 *  ratio other than 1. The ratios are only formed once no weekly change is zero, so none is ever 0/0. */
export function rateSignature(key: ClubKey): { kind: "constant" | "arithmetic" | "geometric"; value: number } {
  const changes = stepChanges(key), diffs = stepChanges(key).slice(1).map((v, i) => v - changes[i]);
  if (diffs.every((d) => d === 0)) return { kind: "constant", value: changes[0] };
  if (diffs.every((d) => d === diffs[0])) return { kind: "arithmetic", value: diffs[0] };
  const ratios = changes.every((c) => c !== 0) ? changes.slice(1).map((v, i) => v / changes[i]) : [];
  if (ratios.length > 0 && ratios.every((q) => q === ratios[0]) && ratios[0] !== 1) return { kind: "geometric", value: ratios[0] };
  throw new Error(`no rate signature for ${key}`);
}
export function signatureName(key: ClubKey): string {
  const kind = rateSignature(key).kind;
  return kind === "constant" ? "same change every week" : kind === "arithmetic" ? "the change steps down evenly" : "the change multiplies";
}
export function signatureText(key: ClubKey): string {
  const s = rateSignature(key), letter = clubInfo(key).letter;
  if (s.kind === "constant") return `Every weekly change is the same ${s.value}, so ${letter} is linear and its average rate is ${s.value} on every interval you can pick.`;
  if (s.kind === "arithmetic") return `Each weekly change is ${Math.abs(s.value)} ${s.value < 0 ? "less" : "more"} than the one before, so the changes themselves fall in a straight line and ${letter} is quadratic.`;
  return `Each weekly change is ${s.value} times the one before, so the changes grow exactly the way the counts do and ${letter} is exponential.`;
}

/** A club given by a rule gets a finely sampled model curve; a club given by a table gets only its counts joined. */
export function curvePoints(key: ClubKey): string {
  if (givenBy(key) === "table") return memberCounts(key).map((m, w) => `${sx(w).toFixed(2)},${sy(m).toFixed(2)}`).join(" ");
  const pts: string[] = [];
  for (let i = 0; i <= WEEK_MAX / STEP; i += 1) pts.push(`${sx(WEEK_MIN + i * STEP).toFixed(2)},${sy(members(key, WEEK_MIN + i * STEP)).toFixed(2)}`);
  return pts.join(" ");
}
export function figureLabel(key: ClubKey, a: number, b: number): string {
  const club = clubInfo(key), fa = members(key, a), fb = members(key, b), run = b - a, rate = averageRate(key, a, b);
  const given = club.formula ? `follows the rule ${club.formula}` : "is given only as a table of counts, with no rule";
  return `Weeks ${WEEK_MIN} to ${WEEK_MAX} across, 0 to ${MEMBER_MAX} members up. ${club.name} membership ${given}, drawn as ${club.shape}. The seven recorded counts are ${memberCounts(key).join(", ")}. A secant joins week ${a} at ${memberPhrase(fa)} to week ${b} at ${memberPhrase(fb)}, changing by ${numText(fb - fa)} over a run of ${run} ${run === 1 ? "week" : "weeks"}, an average of ${rationalText(rate)} ${rateNoun(rate)} per week.`;
}

/** Worked example: a ball fired straight up from a pier launcher, its height a quadratic in the time since launch. */
export const BALL_A = -5, BALL_B = 30, BALL_C = 20, BALL_T1 = 1, BALL_T2 = 5;
export function ballHeight(t: number): number { return BALL_A * t * t + BALL_B * t + BALL_C; }
export function ballWorked() {
  const peakT = -BALL_B / (2 * BALL_A), square = peakT * peakT, added = -BALL_A * square;
  const h1 = ballHeight(BALL_T1), h2 = ballHeight(BALL_T2), hPeak = ballHeight(peakT), climb = hPeak - h1, drop = hPeak - h2;
  return {
    h1, h2, hPeak, peakT, square, added, climb, drop, distance: climb + drop, speed: reduce(climb + drop, BALL_T2 - BALL_T1),
    whole: reduce(h2 - h1, BALL_T2 - BALL_T1), up: reduce(climb, peakT - BALL_T1), down: reduce(h2 - hPeak, BALL_T2 - peakT),
    inner: -BALL_B / BALL_A, radicand: hPeak / -BALL_A, landing: peakT + Math.sqrt(hPeak / -BALL_A),
  };
}

/** Try it: over weeks 2 to 5, whose average rate is the greatest? */
export const TRY_A_WEEK = 2, TRY_B_WEEK = 5, LATE_A_WEEK = 3, LATE_B_WEEK = 6;
export const TRY_ORDER: ClubKey[] = ["game", "chess", "ski"];
export function tryChoices(): { text: string; rate: Rational | null }[] {
  return [...TRY_ORDER.map((key) => ({ text: clubInfo(key).name, rate: averageRate(key, TRY_A_WEEK, TRY_B_WEEK) })), { text: "All three at the same rate", rate: null }];
}
export function tryAnswerIndex(): number {
  const rates = tryChoices().map((c) => (c.rate ? rationalValue(c.rate) : Number.NEGATIVE_INFINITY)), best = Math.max(...rates);
  return rates.filter((r) => r === best).length === 1 ? rates.indexOf(best) : rates.length - 1;
}

export default function Lesson() {
  const [clubKey, setClubKey] = useState<ClubKey>("chess");
  const [a, setA] = useState(2);
  const [b, setB] = useState(5);
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();

  const club = clubInfo(clubKey);
  const fa = members(clubKey, a), fb = members(clubKey, b), rise = fb - fa, run = b - a;
  const runText = `run = ${run}`, riseText = `rise = ${numText(rise)}`;
  const secant = secantLabelSpots(a, b, fa, fb, runText, riseText);
  const rate = averageRate(clubKey, a, b), changes = stepChanges(clubKey);
  const cards = [
    { title: `Week ${a}`, color: DATA_INK, big: `${club.letter}(${a}) = ${fa}`, small: countedText(fa), faint: "one input, exactly one output" },
    { title: `Week ${b}`, color: DATA_INK, big: `${club.letter}(${b}) = ${fb}`, small: countedText(fb), faint: "the same club, a different input" },
    { title: "Average rate", color: SECANT, big: `${rationalLong(rate)} per week`, small: `(${fb} − ${fa}) / (${b} − ${a}) = ${numText(rise)}/${run}`, faint: "rise over run: the slope of the secant" },
    { title: "Rate signature", color: ACCENT, big: signatureName(clubKey), small: changes.map(numText).join(", "), faint: signatureText(clubKey) },
  ];

  const k = ballWorked();
  const steps = [
    <>Evaluate, using the notation exactly as written. h({BALL_T1}) = {numText(BALL_A)}({BALL_T1})² + {BALL_B}({BALL_T1}) + {BALL_C} = {numText(BALL_A * BALL_T1 * BALL_T1)} + {BALL_B * BALL_T1} + {BALL_C} = {k.h1}, and h({BALL_T2}) = {numText(BALL_A)}({BALL_T2 * BALL_T2}) + {BALL_B * BALL_T2} + {BALL_C} = {numText(BALL_A * BALL_T2 * BALL_T2)} + {BALL_B * BALL_T2 + BALL_C} = {k.h2}.</>,
    <>Average rate of change on [{BALL_T1}, {BALL_T2}] = (h({BALL_T2}) − h({BALL_T1})) / ({BALL_T2} − {BALL_T1}) = ({k.h2} − {k.h1}) / {BALL_T2 - BALL_T1} = {rationalText(k.whole)} meters per second. The line joining the two points is perfectly level.</>,
    <>A zero average is not a motionless ball. Halfway across, at t = {k.peakT}, the height is h({k.peakT}) = {k.hPeak}, so on [{BALL_T1}, {k.peakT}] the average is ({k.hPeak} − {k.h1}) / {k.peakT - BALL_T1} = {rationalText(k.up)} meters per second, and on [{k.peakT}, {BALL_T2}] it is ({k.h2} − {k.hPeak}) / {BALL_T2 - k.peakT} = {rationalText(k.down)}. The climb and the fall cancel exactly over the whole interval.</>,
    <>So {rationalText(k.whole)} is the average rate of change of the <em>height</em>, and it is not the average speed. The ball rose {k.climb} meters and came back down {k.drop}, covering {k.distance} meters of travel in {BALL_T2 - BALL_T1} seconds, an average speed of {rationalText(k.speed)} meters per second. One average rate of change can hide all of that.</>,
    <>Where does {k.hPeak} come from? Rewrite the rule instead of hunting on the graph: h(t) = {numText(BALL_A)}(t² − {k.inner}t) + {BALL_C} = {numText(BALL_A)}(t² − {k.inner}t + {k.square}) + {k.added} + {BALL_C} = {numText(BALL_A)}(t − {k.peakT})² + {k.hPeak}. Because {numText(BALL_A)}(t − {k.peakT})² is never positive, the greatest height is {k.hPeak} meters, reached at t = {k.peakT} seconds.</>,
    <>Finally, which inputs make sense. The ball is at {BALL_C} meters when t = 0 and meets the water when {numText(BALL_A)}(t − {k.peakT})² + {k.hPeak} = 0, that is (t − {k.peakT})² = {k.hPeak} / {-BALL_A} = {k.radicand}, so t = {k.peakT} + the square root of {k.radicand} ≈ {numText(Math.round(k.landing * 100) / 100)} seconds. Outside 0 ≤ t ≤ {numText(Math.round(k.landing * 100) / 100)} the formula still returns numbers, but they are not heights of anything.</>,
  ];

  const choices = tryChoices(), answer = tryAnswerIndex(), answerRate = choices[answer].rate;
  const trySentence = `Between week ${TRY_A_WEEK} and week ${TRY_B_WEEK} the chess club runs ${members("chess", TRY_A_WEEK)} to ${members("chess", TRY_B_WEEK)}, an average of ${rationalText(averageRate("chess", TRY_A_WEEK, TRY_B_WEEK))} a week; the game club runs ${members("game", TRY_A_WEEK)} to ${members("game", TRY_B_WEEK)}, which is only ${rationalLong(averageRate("game", TRY_A_WEEK, TRY_B_WEEK))} a week; the ski club is already shrinking at ${rationalText(averageRate("ski", TRY_A_WEEK, TRY_B_WEEK))} a week. Notice what the comparison needed: a rule for the chess club, two table entries for the game club, and the same subtraction and division for both. Doubling wins eventually, not immediately: from week ${LATE_A_WEEK} to week ${LATE_B_WEEK} the game club averages ${rationalLong(averageRate("game", LATE_A_WEEK, LATE_B_WEEK))} a week.`;

  return (
    <div className="prose-lesson max-w-none">
      <p>Almost every serious question about a changing quantity is a question about <strong>rate</strong>. A transit planner asks how fast ridership is climbing before ordering more buses. A coach asks whether a runner is still gaining speed in the final kilometer. A club treasurer asks whether this month beat last month. Underneath each question is a <strong>function</strong>{" "}— a rule that hands back exactly one output for each input — and each answer is one number pulled off that function: how much the output moved for each unit the input moved.</p>
      <p>That number is the <strong>average rate of change</strong>, and it is nothing more exotic than the slope of the line through two points of the graph. What earns it a whole chapter is that each family of functions leaves a different fingerprint in its rates. A line repeats the same rate forever. A parabola changes its rate by the same amount every step. An exponential multiplies its rate. Pick a club below, move the two week markers, and watch the secant, the arithmetic and the strip of weekly changes move together.</p>

      <Figure caption="Three clubs, three shapes, one axis. Two of them come with a rule and one comes with nothing but a table, yet the same secant arithmetic reads a rate off all three.">
        <div className="flex flex-col items-center gap-5">
          <div className="flex max-w-full flex-wrap justify-center gap-2">
            {CLUBS.map((c) => <button key={c.key} type="button" onClick={() => setClubKey(c.key)} aria-pressed={clubKey === c.key} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={clubKey === c.key ? { background: ACCENT, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{c.name}</button>)}
          </div>
          <div className="w-full max-w-2xl text-center">
            <p className="m-0 text-sm text-[var(--ink-soft)]">{sourceText(clubKey)}</p>
            {club.formula ? <p className="m-0 font-mono text-base font-black" style={{ color: ACCENT }}>{club.formula}</p> : (
              <table className="mx-auto mt-2 border-collapse font-mono text-xs"><tbody>
                <tr><th scope="row" className="border border-[var(--line)] px-2 py-1 font-normal text-[var(--ink-faint)]">week</th>{Array.from({ length: WEEK_MAX + 1 }, (_, w) => <td key={w} className="border border-[var(--line)] px-2 py-1 text-[var(--ink-soft)]">{w}</td>)}</tr>
                <tr><th scope="row" className="border border-[var(--line)] px-2 py-1 font-normal text-[var(--ink-faint)]">members</th>{memberCounts(clubKey).map((m, w) => <td key={w} className="border border-[var(--line)] px-2 py-1 font-black">{m}</td>)}</tr>
              </tbody></table>
            )}
          </div>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" style={{ maxHeight: 320 }} role="img" aria-label={figureLabel(clubKey, a, b)}>
            <text x={4} y={12} fontSize={9} fill="var(--ink-faint)">members</text>
            {Array.from({ length: MEMBER_MAX / 8 + 1 }, (_, i) => i * 8).map((m) => <g key={m}><line x1={sx(WEEK_MIN)} y1={sy(m)} x2={sx(WEEK_MAX)} y2={sy(m)} stroke="var(--line)" strokeWidth={1} />{m % 16 === 0 ? <text x={PAD_L - 6} y={sy(m) + 3} textAnchor="end" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{m}</text> : null}</g>)}
            {Array.from({ length: WEEK_MAX + 1 }, (_, w) => <g key={w}><line x1={sx(w)} y1={sy(0)} x2={sx(w)} y2={sy(MEMBER_MAX)} stroke="var(--line)" strokeWidth={1} /><text x={sx(w)} y={sy(0) + WEEK_TICK_DY} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{w}</text></g>)}
            <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--ink-faint)">week</text>
            <line x1={sx(WEEK_MIN)} y1={sy(0)} x2={sx(WEEK_MAX)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(WEEK_MIN)} y1={sy(0)} x2={sx(WEEK_MIN)} y2={sy(MEMBER_MAX)} stroke="var(--ink-soft)" strokeWidth={2} />
            <polyline points={curvePoints(clubKey)} fill="none" stroke={ACCENT} strokeWidth={3} strokeLinecap="round" strokeDasharray={givenBy(clubKey) === "table" ? "7 5" : undefined} />
            {memberCounts(clubKey).map((m, w) => <circle key={w} cx={sx(w)} cy={sy(m)} r={3.5} fill={DATA_INK} />)}
            <line x1={sx(a)} y1={sy(fa)} x2={sx(b)} y2={sy(fa)} stroke={SECANT} strokeWidth={1.5} strokeDasharray="4 3" />
            <line x1={sx(b)} y1={sy(fa)} x2={sx(b)} y2={sy(fb)} stroke={SECANT} strokeWidth={1.5} strokeDasharray="4 3" />
            <line x1={sx(a)} y1={sy(fa)} x2={sx(b)} y2={sy(fb)} stroke={SECANT} strokeWidth={2.5} />
            <text x={secant.run.x} y={secant.run.y} textAnchor={secant.run.anchor} fontSize={SECANT_LABEL_SIZE} fontWeight={700} fill={SECANT}>{runText}</text>
            <text x={secant.rise.x} y={secant.rise.y} textAnchor={secant.rise.anchor} fontSize={SECANT_LABEL_SIZE} fontWeight={700} fill={SECANT}>{riseText}</text>
            <circle cx={sx(a)} cy={sy(fa)} r={6} fill={SECANT} stroke="white" strokeWidth={2} />
            <circle cx={sx(b)} cy={sy(fb)} r={6} fill={SECANT} stroke="white" strokeWidth={2} />
          </svg>
          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 text-center sm:grid-cols-2">
            {cards.map((c) => (
              <div key={c.title} className="rounded-xl border-2 px-4 py-3" style={{ borderColor: c.color }}><div className="text-xs font-bold uppercase tracking-wide" style={{ color: c.color }}>{c.title}</div><div className="font-mono text-base font-black">{c.big}</div><div className="font-mono text-xs text-[var(--ink-soft)]">{c.small}</div><div className="mt-0.5 text-xs text-[var(--ink-faint)]">{c.faint}</div></div>
            ))}
          </div>
          <div className="flex w-full max-w-2xl flex-col items-center gap-2">
            <div className="flex flex-wrap justify-center gap-2">
              {changes.map((d, i) => (
                <div key={i} className="rounded-lg border px-2.5 py-1 text-center" style={i >= a && i < b ? { borderColor: SECANT, background: "color-mix(in oklab, var(--band-upper) 12%, var(--surface))" } : { borderColor: "var(--line)" }}><div className="font-mono text-[11px] text-[var(--ink-faint)]">week {i} to {i + 1}</div><div className="font-mono text-sm font-black" style={{ color: i >= a && i < b ? SECANT : "var(--ink-soft)" }}>{numText(d)}</div></div>
              ))}
            </div>
            <p className="m-0 text-center text-xs text-[var(--ink-faint)]">Averaging the {run} highlighted weekly {run === 1 ? "change" : "changes"} gives exactly {rationalText(rate)} — that is all an average rate of change is.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Week a" value={a} min={WEEK_MIN} max={b - 1} onChange={setA} />
            <Stepper label="Week b" value={b} min={a + 1} max={WEEK_MAX} onChange={setB} />
          </div>
        </div>
      </Figure>

      <p>Two habits are worth naming now. First, the dots are the data and a curve is only a model laid over them: membership is counted once a week, so the honest inputs are the whole numbers 0 through 6, and a reading at week 2.7 would mean nothing. The game club makes that plain — nobody wrote a rule for it, so its counts are joined by dashed segments instead of a smooth model, and its rates still come out by exactly the same arithmetic. Second, a single average rate hides everything that happened in between — which is exactly the trap the next example springs.</p>

      <h2>Worked example: an average of zero</h2>
      <p>A ball is fired straight up from a spring launcher on a pier {BALL_C} meters above the water, and t seconds later its height is modeled by h(t) = {numText(BALL_A)}t² + {BALL_B}t + {BALL_C} meters. Find its average rate of change from t = {BALL_T1} to t = {BALL_T2}, say what that number really tells you, and find the greatest height the ball reaches.</p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, shown).map((body, i) => <li key={i} className="flex gap-3 text-[15px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span><span>{body}</span></li>)}
        </ol>
        {shown === 0 ? <p className="m-0 text-sm text-[var(--ink-faint)]">Press &ldquo;Next step&rdquo; to watch the solution unfold.</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={shown > 0} aria-controls={stepsId} disabled={shown >= steps.length} onClick={() => setShown((n) => Math.min(steps.length, n + 1))} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next step</button>
          <button type="button" disabled={shown === 0} onClick={() => setShown(0)} className="rounded-lg border border-[var(--line)] px-4 py-1.5 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>Back to the three clubs — two of them handed to you as a rule, one as nothing but its table. Between week {TRY_A_WEEK} and week {TRY_B_WEEK}, which club gained members fastest on average?</p>
      <div className="flex flex-wrap gap-2">
        {choices.map((c, i) => <button key={c.text} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 text-sm font-bold" style={picked === i ? { background: i === answer ? SECANT : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{c.text}</button>)}
      </div>
      {picked !== null ? <p className="mt-3 text-[15px]">{picked === answer ? `Right, and it wins by a whisker. ${trySentence}` : `Not quite — the ${choices[answer].text.toLowerCase()} takes that interval at ${answerRate ? rationalText(answerRate) : ""} a week. ${trySentence}`}</p> : null}

      <h2>Where this chapter goes</h2>
      <p><strong>Functions and Notation</strong>{" "}slows down the machine you just used: what makes a rule a function at all, how C(2) is read and evaluated, and why a list of weekly counts is itself a function whose inputs happen to be integers. <strong>Reading a Graph&apos;s Story</strong>{" "}takes the second half of this figure and makes it the whole lesson, hunting a rocket&apos;s peak, its intercepts and its average rate over an interval you choose. <strong>Transforming Parabolas: Vertex Form</strong>{" "}hands you the completing-the-square move from step 5 as three sliders, so you can watch a, h and k reshape a parabola before you ever solve for them. <strong>Comparing Functions</strong>{" "}then spends a whole lesson setting a formula beside a table, the way the chess club sat beside the game club here, and asks which one wins and when.</p>

      <MathCheck>
        <p>A <strong>function</strong>{" "}assigns exactly one output to each input, which is why {club.letter}({a}) names a single number, {fa} (F-IF.1, F-IF.2); and because these counts exist only at whole weeks, {club.letter} is also a <strong>sequence</strong>, a function whose domain is a set of integers (F-IF.3, F-IF.5). The{" "}
          <strong>average rate of change</strong>{" "}of {club.letter} on [{a}, {b}] is ({club.letter}({b}) − {club.letter}({a})) / ({b} − {a}) = {numText(rise)}/{run} = {rationalText(rate)} {rateNoun(rate)} per week, and that is exactly the slope of the secant drawn through the two marked points, because slope is defined as rise over run (F-IF.6). Averaging the {run} highlighted weekly {run === 1 ? "change" : "changes"} gives the same number: the {run === 1 ? "single change is" : "changes total"} {numText(rise)}, shared over {run} {run === 1 ? "week" : "weeks"}. Reading a graph means reading these{" "}
          <strong>key features</strong>{" "}— where it rises, where it falls, where it peaks (F-IF.4, F-IF.7) — and the weekly changes tell you which family you are looking at, tested in this order: changes that never move at all mean linear; changes that step by the same non-zero amount mean quadratic; changes that multiply by a fixed factor other than 1 mean exponential. That arithmetic asks only for two counts and never for the rule, which is why the game club, handed to you as a bare table, can be set beside the chess club, handed to you as a rule, and compared rate against rate (F-IF.9). Rewriting a rule can also hand you a feature outright: completing the square turned h(t) = {numText(BALL_A)}t² + {BALL_B}t + {BALL_C} into {numText(BALL_A)}(t − {k.peakT})² + {k.hPeak}, and since a squared quantity is never negative, the maximum height {k.hPeak} at t = {k.peakT} can be read straight off (F-IF.8).</p>
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
        <span className="w-9 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
