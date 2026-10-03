"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)", MID = "var(--band-middle)";
/** The survey behind the figure: TOTAL students, BAND_ONLY of whom play in the band without reading sheet music. */
export const TOTAL = 200, BAND_ONLY = 10;
export const BOTH_MIN = 10, BOTH_MAX = 40, BOTH_STEP = 5;
export const READ_ONLY_MIN = 20, READ_ONLY_MAX = 100, READ_ONLY_STEP = 10;
export type CondKey = "band" | "reads";
export type Counts = { both: number; bandOnly: number; readOnly: number; neither: number; band: number; reads: number; union: number; total: number };
/** The four disjoint cells of the survey, built from the two counts the student controls. */
export function counts(both: number, readOnly: number): Counts {
  const neither = TOTAL - both - BAND_ONLY - readOnly; return { both, bandOnly: BAND_ONLY, readOnly, neither, band: both + BAND_ONLY, reads: both + readOnly, union: TOTAL - neither, total: TOTAL };
}
/**
 * The two-way frequency table, as data (S-CP.4).
 *
 * These nine numbers used to be assembled inline in the JSX, so two of them
 * existed nowhere else and nothing pinned which count landed in which cell:
 * three mutations that broke the table's own row and column sums all passed
 * the suite. Building it here makes every cell reachable from a test.
 */
export function tableModel(c: Counts) {
  return {
    columns: ["reads music", "does not read", "total"] as const,
    rows: [
      { header: "in the band", cells: [c.both, c.bandOnly, c.band] },
      { header: "not in the band", cells: [c.readOnly, c.neither, TOTAL - c.band] },
      { header: "total", cells: [c.reads, TOTAL - c.reads, TOTAL] }
    ]
  };
}
export function gcd(a: number, b: number): number { return b === 0 ? Math.abs(a) : gcd(b, a % b); }
/**
 * n/d to two places, rounded half UP in integer arithmetic.
 *
 * `(n / d).toFixed(2)` resolves an exact 0.xx5 tie by whatever IEEE-754 binary
 * rounding happens to give, which sent 15/200 (0.075) down to 0.07 while
 * 25/200 (0.125) went up to 0.13. Every count here is out of 200, so an odd
 * count is always an exact tie, and the inconsistency broke the addition rule
 * the lesson teaches: P(A) + P(B) − P(A and B) no longer matched P(A or B) on
 * the four cards in 20 of the 63 survey states. Half-up is the convention the
 * lesson's own worked example uses, and it makes the four cards agree in all 63.
 */
export function twoPlaces(n: number, d: number): string {
  const neg = n * d < 0;
  const num = Math.abs(n), den = Math.abs(d);
  const scaled = num * 100;
  const whole = Math.floor(scaled / den);
  const hundredths = whole + (2 * (scaled - whole * den) >= den ? 1 : 0);
  return `${neg && hundredths !== 0 ? "-" : ""}${(hundredths - (hundredths % 100)) / 100}.${String(hundredths % 100).padStart(2, "0")}`;
}
/** "40/50 = 4/5 = 0.80": the count fraction, its lowest terms, and two decimals ("≈" when that decimal is rounded). */
export function ratioText(n: number, d: number): string {
  const g = gcd(n, d) || 1;
  const head = `${n}/${d}`, lowest = d / g === 1 ? `${n / g}` : `${n / g}/${d / g}`;
  const tail = `${(100 * n) % d === 0 ? "=" : "≈"} ${twoPlaces(n, d)}`;
  return head === lowest ? `${head} ${tail}` : `${head} = ${lowest} ${tail}`;
}
/** A count as an exact percent of the 200 students: a whole number, or one decimal for a half. */
export function shareText(count: number): string { return `${Number.isInteger(count / 2) ? count / 2 : (count / 2).toFixed(1)}%`; }
export type View = {
  condShort: string; otherShort: string; condPhrase: string; condPhraseOne: string; condNegPhrase: string; otherPhrase: string;
  condCount: number; otherCount: number; restCount: number; restTop: number;
  compare: "higher" | "lower" | "the same"; comparePhrase: string; verb: string; independent: boolean;
};
/** Everything that depends on which event is being conditioned on. */
export function view(c: Counts, condOn: CondKey): View {
  const band = condOn === "band";
  const condCount = band ? c.band : c.reads, otherCount = band ? c.reads : c.band;
  // P(other | cond) = both/condCount against P(other) = otherCount/TOTAL, compared by cross-multiplication.
  const conditioned = c.both * TOTAL, plain = condCount * otherCount;
  const compare = conditioned > plain ? "higher" : conditioned < plain ? "lower" : "the same";
  return {
    condShort: band ? "band" : "reads", otherShort: band ? "reads" : "band",
    condPhrase: band ? "are in the marching band" : "read sheet music", condPhraseOne: band ? "is in the marching band" : "reads sheet music",
    condNegPhrase: band ? "are not in the marching band" : "do not read sheet music", otherPhrase: band ? "read sheet music" : "are in the marching band",
    condCount, otherCount, restCount: TOTAL - condCount, restTop: band ? c.readOnly : c.bandOnly,
    compare, comparePhrase: compare === "the same" ? "exactly equal to" : `${compare} than`, independent: conditioned === plain,
    verb: compare === "higher" ? "raises" : compare === "lower" ? "lowers" : "does not change",
  };
}
export const AW = 300, AH = 180, PAD_X = 10, PAD_TOP = 10, SHARE_BAND = 18;
export const SVG_W = AW + 2 * PAD_X, SVG_H = PAD_TOP + AH + SHARE_BAND;
export const LABEL_MIN_W = 26, LABEL_MIN_H = 15, SHARE_MIN_W = 34;
export type Cell = { key: string; count: number; x: number; y: number; w: number; h: number; tone: "strong" | "soft" | "mid" | "pale"; showCount: boolean };
export type Column = { key: "given" | "rest"; count: number; x: number; w: number; centerX: number; share: string; showShare: boolean };
export type Model = { cells: Cell[]; columns: Column[]; focus: { x: number; y: number; w: number; h: number } };
/** The area model: the left column is the event conditioned on, the top of each column is the other event, and every area is that cell's share of the 200. */
export function areaModel(c: Counts, condOn: CondKey): Model {
  const v = view(c, condOn);
  const leftW = (AW * v.condCount) / TOTAL, rightW = AW - leftW;
  const leftTopH = (AH * c.both) / v.condCount, rightTopH = (AH * v.restTop) / v.restCount;
  const cell = (key: string, count: number, x: number, y: number, w: number, h: number, tone: Cell["tone"]): Cell => ({ key, count, x, y, w, h, tone, showCount: w >= LABEL_MIN_W && h >= LABEL_MIN_H });
  const column = (key: Column["key"], count: number, x: number, w: number): Column => ({ key, count, x, w, centerX: x + w / 2, share: shareText(count), showShare: w >= SHARE_MIN_W });
  return {
    cells: [
      cell("given-yes", c.both, PAD_X, PAD_TOP, leftW, leftTopH, "strong"), cell("given-no", v.condCount - c.both, PAD_X, PAD_TOP + leftTopH, leftW, AH - leftTopH, "soft"),
      cell("rest-yes", v.restTop, PAD_X + leftW, PAD_TOP, rightW, rightTopH, "mid"), cell("rest-no", v.restCount - v.restTop, PAD_X + leftW, PAD_TOP + rightTopH, rightW, AH - rightTopH, "pale"),
    ],
    columns: [column("given", v.condCount, PAD_X, leftW), column("rest", v.restCount, PAD_X + leftW, rightW)],
    focus: { x: PAD_X, y: PAD_TOP, w: leftW, h: AH },
  };
}

export function figureLabel(c: Counts, condOn: CondKey): string {
  const v = view(c, condOn); return `Area model of ${TOTAL} students. The outlined left column holds the ${v.condCount} students who ${v.condPhrase}; its solid top part is the ${c.both} of them who ${v.otherPhrase}, so P(${v.otherShort} | ${v.condShort}) is ${c.both} out of ${v.condCount}. The right column holds the ${v.restCount} students who ${v.condNegPhrase}, of whom ${v.restTop} ${v.otherPhrase}.`;
}
/* Every sentence the figure shows is built by one of these pure functions, so the test can pin each one to numbers it rebuilds itself. */
/** "P(reads | band) = 30/40 = 3/4 = 0.75". */
export function conditionalHeadline(c: Counts, condOn: CondKey): string { const v = view(c, condOn); return `P(${v.otherShort} | ${v.condShort}) = ${ratioText(c.both, v.condCount)}`; }
export function columnSentence(c: Counts, condOn: CondKey): string { const v = view(c, condOn); return `The outlined column holds the ${v.condCount} students who ${v.condPhrase}; ${c.both} of them ${v.otherPhrase}.`; }
export function comparisonSentence(c: Counts, condOn: CondKey): string { const v = view(c, condOn); return `Without that information, P(${v.otherShort}) = ${ratioText(v.otherCount, TOTAL)}. Being told that a student ${v.condPhraseOne} ${v.verb} the probability, so the two events are ${v.independent ? "independent" : "not independent"}.`; }
/** The general multiplication rule on the live counts: P(A and B) = P(A) × P(B | A). */
export function jointText(c: Counts, condOn: CondKey): string { const v = view(c, condOn); return `P(band and reads) = P(${v.condShort}) × P(${v.otherShort} | ${v.condShort}) = (${v.condCount}/${TOTAL}) × (${c.both}/${v.condCount}) = ${c.both}/${TOTAL}`; }
/** The independence test in whole students: P(band)P(reads) = P(band and reads) exactly when band × reads = both × TOTAL. */
export function independenceCheckLine(c: Counts): string { const product = c.band * c.reads, joint = c.both * TOTAL; return `band × reads = ${c.band} × ${c.reads} = ${product}, both × ${TOTAL} = ${c.both} × ${TOTAL} = ${joint} — ${product === joint ? "equal, so independent" : "not equal, so not independent"}`; }
export type Card = { title: string; big: string; small: string };
export function cardTexts(c: Counts): Card[] {
  return [{ title: "P(band)", big: ratioText(c.band, TOTAL), small: `${c.both} + ${c.bandOnly} band members out of ${TOTAL}` },
    { title: "P(reads)", big: ratioText(c.reads, TOTAL), small: `${c.both} + ${c.readOnly} readers out of ${TOTAL}` },
    { title: "P(band and reads)", big: ratioText(c.both, TOTAL), small: "the one cell that is in both groups" },
    { title: "P(band or reads)", big: ratioText(c.union, TOTAL), small: `(${c.band} + ${c.reads} − ${c.both})/${TOTAL} = ${c.union}/${TOTAL}` }];
}
/** Worked example: DRAW reeds taken from a drawer, without replacement. */
export const REEDS_NEW = 6, REEDS_USED = 9, DRAW = 2;
export function choose(n: number, k: number): number {
  let result = 1;
  for (let i = 0; i < k; i += 1) result = (result * (n - i)) / (i + 1);
  return Math.round(result);
}
/** "(6 × 5)/(2 × 1) = 15": the k falling factors of n over the k orders each choice could arrive in. */
export function chooseText(n: number, k: number): string {
  const top: number[] = [], bottom: number[] = [];
  for (let i = 0; i < k; i += 1) { top.push(n - i); bottom.push(k - i); }
  return `(${top.join(" × ")})/(${bottom.join(" × ")}) = ${choose(n, k)}`; }

export function reedExample() {
  const stock = REEDS_NEW + REEDS_USED; return {
    stock, firstN: REEDS_NEW, firstD: stock, secondN: REEDS_NEW - 1, secondD: stock - 1,
    jointN: REEDS_NEW * (REEDS_NEW - 1), jointD: stock * (stock - 1), replacedN: REEDS_NEW * REEDS_NEW, replacedD: stock * stock,
    waysBoth: choose(REEDS_NEW, DRAW), waysAny: choose(stock, DRAW),
  };
}
export function stepTexts(): string[] {
  const ex = reedExample(); return [
    `The drawer holds ${ex.stock} reeds and ${REEDS_NEW} of them are new, so the first reed is new with probability ${ratioText(ex.firstN, ex.firstD)}.`,
    `Nothing goes back. Once a new reed is gone, ${ex.secondN} of the ${ex.secondD} reeds still in the drawer are new, so P(second new | first new) = ${ratioText(ex.secondN, ex.secondD)}. The condition changed the pool, so it changed the probability.`,
    `The multiplication rule chains them: P(both new) = P(first new) × P(second new | first new) = (${ex.firstN}/${ex.firstD}) × (${ex.secondN}/${ex.secondD}) = ${ratioText(ex.jointN, ex.jointD)}.`,
    `Counting gives the same answer. Order does not matter, so count combinations: C(${REEDS_NEW}, ${DRAW}) = ${chooseText(REEDS_NEW, DRAW)} pairs of new reeds, out of C(${ex.stock}, ${DRAW}) = ${chooseText(ex.stock, DRAW)} equally likely pairs from all ${ex.stock} reeds, so P(both new) = ${ratioText(ex.waysBoth, ex.waysAny)} — the same value.`,
    `If the first reed went back in, the draws would be independent, both would be ${ratioText(ex.firstN, ex.firstD)}, and P(both new) = ${ratioText(ex.replacedN, ex.replacedD)} — larger, because replacing keeps the new share at ${ex.firstN}/${ex.firstD} instead of dropping it to ${ex.secondN}/${ex.secondD}.`];
}
/** Try it: the addition rule in a class of CLASS_SIZE students. */
export const CLASS_SIZE = 32, PLAYS_SPORT = 18, IN_CLUB = 12, SPORT_AND_CLUB = 7;

export function tryChoices(): { n: number; d: number; why: string }[] {
  return [
    { n: PLAYS_SPORT + IN_CLUB, d: CLASS_SIZE, why: `counts the ${SPORT_AND_CLUB} students who do both twice, once in each group` },
    { n: PLAYS_SPORT + IN_CLUB - SPORT_AND_CLUB, d: CLASS_SIZE, why: "correct" },
    { n: PLAYS_SPORT + IN_CLUB - 2 * SPORT_AND_CLUB, d: CLASS_SIZE, why: `throws the ${SPORT_AND_CLUB} students who do both out of the union, but they do play a sport` },
    { n: SPORT_AND_CLUB, d: CLASS_SIZE, why: "is P(sport and club), the overlap itself rather than the union" },
  ];
}
export function tryAnswerIndex(): number {
  const target = PLAYS_SPORT + IN_CLUB - SPORT_AND_CLUB;
  return tryChoices().findIndex((choice) => choice.n * CLASS_SIZE === target * choice.d); }
export function trySentence(): string { return `Of the ${CLASS_SIZE} students, ${PLAYS_SPORT} play a sport and ${IN_CLUB} are in a club, but the ${SPORT_AND_CLUB} who do both sit in each of those counts, so P(sport or club) = (${PLAYS_SPORT} + ${IN_CLUB} − ${SPORT_AND_CLUB})/${CLASS_SIZE} = ${ratioText(PLAYS_SPORT + IN_CLUB - SPORT_AND_CLUB, CLASS_SIZE)}.`; }
export type MathCheckText = { partition: string; addition: string; conditional: string; multiplication: string; independence: string; counting: string };
export function mathCheckSentences(c: Counts, condOn: CondKey): MathCheckText {
  const v = view(c, condOn), ex = reedExample(), product = c.band * c.reads, joint = c.both * TOTAL; return {
    partition: `Every student lands in exactly one of the four cells, so band and reads are subsets of one sample space and their intersection (${c.both}), union (${c.union}), and complements are just collections of whole cells`,
    addition: `Adding the band total ${c.band} to the reads total ${c.reads} counts the ${c.both} students in both cells twice, which is why P(band or reads) = ${c.band}/${TOTAL} + ${c.reads}/${TOTAL} − ${c.both}/${TOTAL} = ${ratioText(c.union, TOTAL)}`,
    conditional: `Conditioning discards every cell outside the given event, so P(${v.otherShort} | ${v.condShort}) = ${ratioText(c.both, v.condCount)} is a fraction of the ${v.condCount} outcomes in that column rather than of all ${TOTAL}`,
    multiplication: `Multiplying that conditional back by P(${v.condShort}) = ${v.condCount}/${TOTAL} returns the joint probability ${c.both}/${TOTAL}, the general multiplication rule`,
    independence: `Independence would mean P(band) × P(reads) = P(band and reads); clearing the denominators, that asks whether band × reads = both × ${TOTAL}, and here ${c.band} × ${c.reads} = ${product} against ${c.both} × ${TOTAL} = ${joint}, so the events are ${product === joint ? "independent, and the conditional above matches the unconditional exactly" : `not independent, and the conditional above is ${v.comparePhrase} the unconditional`}`,
    counting: `The worked example counts one event two ways — the multiplication rule, and combinations C(${REEDS_NEW}, ${DRAW}) = ${chooseText(REEDS_NEW, DRAW)} and C(${ex.stock}, ${DRAW}) = ${chooseText(ex.stock, DRAW)}, where dividing by ${DRAW} × 1 removes the orders the same pair could arrive in — and both give ${ratioText(ex.jointN, ex.jointD)}`, };
}
const TONE: Record<Cell["tone"], { fill: string; opacity: number; text: string }> = {
  strong: { fill: ACCENT, opacity: 0.9, text: "white" }, soft: { fill: ACCENT, opacity: 0.22, text: "var(--ink)" },
  mid: { fill: MID, opacity: 0.45, text: "var(--ink)" }, pale: { fill: "var(--ink-faint)", opacity: 0.14, text: "var(--ink)" } };

export default function Lesson() {
  const [both, setBoth] = useState(30);
  const [readOnly, setReadOnly] = useState(50);
  const [condOn, setCondOn] = useState<CondKey>("band");
  const [shown, setShown] = useState(0), [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();

  const c = counts(both, readOnly), v = view(c, condOn), model = areaModel(c, condOn);
  const rowLit = condOn === "band", colLit = condOn === "reads", wash = (on: boolean, strength: number) => ({ background: on ? `color-mix(in srgb, var(--band-high) ${strength}%, transparent)` : "transparent" });

  const cards = cardTexts(c), steps = stepTexts(), mc = mathCheckSentences(c, condOn);
  const ex = reedExample(), choices = tryChoices(), answer = tryAnswerIndex(), tryText = trySentence();

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A school paper reports what fraction of the marching band can read sheet music. A week later a letter to the editor turns that sentence around and
        reports the same fraction back, this time as the share of sheet-music readers who are in the band. Same survey, same two facts recorded about every
        student, and the flip is wrong every time: the band is the smaller group, because the choir, the piano students, and the guitar club read music
        without ever marching. Set the two counts below however you like, and the outlined column will show it.
      </p>
      <p>
        That flip is this whole chapter in one move. A probability answers a question about some set of outcomes, and the moment you are told something —
        this student is in the band, the first reed you pulled was new — the set you are choosing from shrinks to the outcomes that match. Conditioning on
        information is the single idea behind two-way tables, the addition and multiplication rules, and the test for independence.
      </p>

      <Figure caption="Each rectangle's area is that group's share of the 200 students. Conditioning keeps only the outlined column, and the conditional probability is the solid part of that column.">
        <div className="flex flex-col items-center gap-5">
          <table className="border-collapse text-center font-mono text-sm">
            <thead><tr className="text-[var(--ink-faint)]"><th className="p-2" /><th className="p-2" style={wash(colLit, 18)}>reads music</th><th className="p-2">does not read</th><th className="p-2">total</th></tr></thead>
            <tbody>
              {tableModel(c).rows.map((row, rowIndex) => (
                <tr key={row.header} className={rowIndex === 2 ? "text-[var(--ink-soft)]" : undefined}>
                  <th className="p-2 text-right font-sans text-xs">{row.header}</th>
                  {row.cells.map((count, colIndex) => (
                    <td
                      key={`${row.header}-${tableModel(c).columns[colIndex]}`}
                      className={`p-2 ${colIndex === 2 || rowIndex === 2 ? "font-bold" : "text-lg"}${rowIndex === 0 && colIndex === 0 ? " font-black" : ""}${colIndex === 2 && rowIndex !== 2 ? " text-[var(--ink-soft)]" : ""}`}
                      style={
                        rowIndex === 0 && colIndex === 0 ? wash(rowLit || colLit, 24)
                          : rowIndex === 0 && colIndex === 1 ? wash(rowLit, 18)
                            : rowIndex === 1 && colIndex === 0 ? wash(colLit, 18)
                              : undefined
                      }
                    >
                      {count}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(c, condOn)}>
            {model.cells.map((cell) => (
              <g key={cell.key}>
                <rect x={cell.x} y={cell.y} width={cell.w} height={cell.h} fill={TONE[cell.tone].fill} fillOpacity={TONE[cell.tone].opacity} stroke="var(--surface)" strokeWidth={1} />
                {cell.showCount && <text x={cell.x + cell.w / 2} y={cell.y + cell.h / 2 + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill={TONE[cell.tone].text}>{cell.count}</text>}
              </g>))}
            <rect x={model.focus.x} y={model.focus.y} width={model.focus.w} height={model.focus.h} fill="none" stroke={ACCENT} strokeWidth={3} />
            {model.columns.map((col) => col.showShare && (
              <text key={col.key} x={col.centerX} y={PAD_TOP + AH + 14} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--ink-faint)">{col.share}</text>))}
          </svg>
          <div className="flex flex-wrap justify-center gap-2">
            {(["band", "reads"] as CondKey[]).map((key) => (
              <button key={key} type="button" onClick={() => setCondOn(key)} aria-pressed={condOn === key} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={condOn === key ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{key === "band" ? "given: in the band" : "given: reads music"}</button>))}
          </div>
          <div className="w-full max-w-2xl rounded-2xl border-2 px-5 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-lg font-black" style={{ color: ACCENT }}>{conditionalHeadline(c, condOn)}</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">{columnSentence(c, condOn)}</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">{comparisonSentence(c, condOn)}</div>
            <div className="mt-2 font-mono text-xs text-[var(--ink-faint)]">{jointText(c, condOn)}</div>
            <div className="mt-1 font-mono text-xs text-[var(--ink-faint)]">{independenceCheckLine(c)}</div>
          </div>
          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 text-center sm:grid-cols-2">
            {cards.map((card) => (
              <div key={card.title} className="rounded-xl border border-[var(--line)] px-4 py-2">
                <div className="text-xs font-bold uppercase text-[var(--ink-faint)]">{card.title}</div>
                <div className="font-mono text-base font-black">{card.big}</div>
                <div className="text-xs text-[var(--ink-soft)]">{card.small}</div>
              </div>))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Band members who read music" value={both} min={BOTH_MIN} max={BOTH_MAX} step={BOTH_STEP} onChange={setBoth} />
            <Stepper label="Other students who read music" value={readOnly} min={READ_ONLY_MIN} max={READ_ONLY_MAX} step={READ_ONLY_STEP} onChange={setReadOnly} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: two reeds from the drawer</h2>
      <p>
        A band room drawer holds {ex.stock} clarinet reeds: {REEDS_NEW} new and {REEDS_USED} already used. Without looking, you take one reed and then a second one. What is the probability that both are new?
      </p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, shown).map((body, i) => (
            <li key={i} className="flex gap-3 text-[15px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span><span>{body}</span></li>))}
        </ol>
        {shown === 0 && <p className="m-0 text-sm text-[var(--ink-faint)]">Press &ldquo;Next step&rdquo; to watch the solution unfold.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={shown > 0} aria-controls={stepsId} disabled={shown >= steps.length} onClick={() => setShown((n) => Math.min(steps.length, n + 1))} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next step</button>
          <button type="button" disabled={shown === 0} onClick={() => setShown(0)} className="rounded-lg border border-[var(--line)] px-4 py-1.5 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>
        In a class of {CLASS_SIZE} students, {PLAYS_SPORT} play a sport, {IN_CLUB} are in a club, and {SPORT_AND_CLUB} do both. One student is picked at random. What is P(plays a sport or is in a club)?
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice, i) => (
          <button key={i} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={picked === i ? { background: i === answer ? "var(--band-upper)" : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{ratioText(choice.n, choice.d)}</button>))}
      </div>
      {picked !== null && (
        <p className="mt-3 text-[15px]">{picked === answer ? `Right. ${tryText}` : `Not quite — that answer ${choices[picked].why}. ${tryText}`}</p>
      )}

      <h2>Your path through this chapter</h2>
      <p>
        <strong>Events as Sets</strong>{" "}gives the four cells above their proper names, shading unions, intersections, and complements on a Venn diagram.{" "}
        <strong>Independent Events</strong>{" "}turns the whole-number test in the outlined panel into a procedure you can run on any pair of events.{" "}
        <strong>Conditional Probability</strong>{" "}stays with the restricted column and works P(A | B) = P(A and B)/P(B) in both directions.{" "}
        <strong>Probability from Two-Way Tables</strong>{" "}reads joint, marginal, and conditional values straight off a table like the one above.{" "}
        <strong>The Addition Rule</strong>{" "}explains the subtraction you met in the Try it, and <strong>The Multiplication Rule</strong>{" "}generalizes the reed
        calculation to any two events. <strong>Permutations &amp; Combinations</strong>{" "}takes the counting shortcut from step 4 further, to ordered arrangements as well.
      </p>

      <MathCheck>
        <p>
          {mc.partition} (S-CP.1, S-CP.4). {mc.addition} (S-CP.7).{" "}
          {mc.conditional} (S-CP.3, S-CP.6). {mc.multiplication} (S-CP.8).{" "}
          {mc.independence} (S-CP.2, S-CP.5). {mc.counting} (S-CP.9).
        </p>
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
        <span className="w-12 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
