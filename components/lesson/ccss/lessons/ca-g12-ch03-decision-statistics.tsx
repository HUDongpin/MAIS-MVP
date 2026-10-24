"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { collides, textBox } from "@/components/lesson/ccss/labelSpacing";

const ACCENT = "var(--band-high)";
const MID = "var(--band-middle)";

/** The fair's prize wheel: SECTORS equal sectors, five of them silver, the rest gold or blank. */
export const SECTORS = 20, SILVER_SECTORS = 5, SILVER_PRIZE = 2, LONG_RUN = 200;
export const GOLD_MIN = 1, GOLD_MAX = 5, GOLD_STEP = 1;
export const PRIZE_MIN = 4, PRIZE_MAX = 20, PRIZE_STEP = 2;
export const PRICE_MIN = 1, PRICE_MAX = 5, PRICE_STEP = 1;

export type Side = "player" | "booth";
export type Outcome = { key: string; label: string; count: number; percent: number; net: number; netCents: number; partCents: number };
export type Verdict = { shownCents: number; sentence: string; longRun: string };

/** Every amount is carried in whole cents, so nothing on screen is a rounded decimal. */
export function money(cents: number): string {
  const size = Math.abs(cents);
  return `${cents < 0 ? "−" : ""}$${Math.floor(size / 100)}.${String(size % 100).padStart(2, "0")}`;
}

/** The three values of the random variable "what one spin does to the player's wallet". */
export function outcomes(gold: number, prize: number, price: number): Outcome[] {
  const build = (key: string, label: string, count: number, net: number): Outcome => ({ key, label, count, percent: (count * 100) / SECTORS, net, netCents: net * 100, partCents: (net * 100 * count) / SECTORS });
  return [build("gold", "gold", gold, prize - price), build("silver", "silver", SILVER_SECTORS, SILVER_PRIZE - price), build("blank", "blank", SECTORS - gold - SILVER_SECTORS, -price)];
}

/** E(X) for the player, in cents: the sum of value times probability over all three sectors. */
export function evCents(gold: number, prize: number, price: number): number {
  return outcomes(gold, prize, price).reduce((sum, o) => sum + o.partCents, 0);
}

/** The price that makes E(X) zero: exactly the average prize the wheel pays out. */
export function fairPriceCents(gold: number, prize: number): number {
  return (gold * prize * 100 + SILVER_SECTORS * SILVER_PRIZE * 100) / SECTORS;
}

/** The same expected value read from whichever side of the counter the student picks. */
export function verdict(side: Side, playerCents: number): Verdict {
  const shownCents = side === "player" ? playerCents : -playerCents;
  const who = side === "player" ? "A player" : "The booth";
  if (shownCents === 0) return { shownCents, sentence: `${who} breaks even on an average spin, so this game is fair.`, longRun: `Over ${LONG_RUN} spins the two sides come out even.` };
  const move = shownCents > 0 ? "gains" : "loses";
  return { shownCents, sentence: `${who} ${move} ${money(Math.abs(shownCents))} on an average spin.`, longRun: `Over ${LONG_RUN} spins that is about ${money(Math.abs(shownCents) * LONG_RUN)} ${shownCents > 0 ? "gained" : "lost"}.` };
}

/* The strip under the axis holds two rows of net-result labels, then the balance
 * point. The second row is reserved whether or not a given spin needs it, so the
 * figure keeps one height instead of growing and shrinking under the student. */
export const W = 540, H = 231, PAD_X = 30, BASE_Y = 150, LO = -6, HI = 20, BAR_W = 22, PX_PER_SECTOR = 7.5;
export const TIP_Y = 189, FOOT_Y = 201, EV_TEXT_Y = 215;
export function xOf(dollars: number): number { return PAD_X + ((dollars - LO) / (HI - LO)) * (W - 2 * PAD_X); }
export function barTop(count: number): number { return BASE_Y - count * PX_PER_SECTOR; }
/** Keeps the balance-point caption inside the viewBox when the mean sits near an edge. */
/**
 * Which row each net-result label sits in.
 *
 * The bars are placed by value, so when two outcomes are only a couple of
 * dollars apart their labels are wider than the gap between them and "$0.00"
 * lands inside "−$2.00". Rather than shrink or drop a label, a label that
 * cannot fit beside the one before it drops to a second row underneath. Bars
 * are generated left to right, so comparing each against the rows already
 * filled is enough.
 */
export const MONEY_LABEL_SIZE = 11, MONEY_GLYPH = 6.6, MONEY_ROW_H = 15;

export function moneyLabelRows(nets: readonly number[], texts: readonly string[]): number[] {
  const placed: { row: number; box: ReturnType<typeof textBox> }[] = [];
  return nets.map((net, i) => {
    const width = texts[i].length * MONEY_GLYPH;
    let row = 0;
    for (; row < nets.length; row += 1) {
      const box = textBox(xOf(net), BASE_Y + 14 + row * MONEY_ROW_H, width, { fontSize: MONEY_LABEL_SIZE });
      if (placed.every((q) => q.row !== row || !collides(q.box, box, 3))) {
        placed.push({ row, box });
        break;
      }
    }
    return row;
  });
}

export function labelX(text: string, x: number): number { const half = text.length * 3.4; return Math.min(W - 2 - half, Math.max(2 + half, x)); }

export function figureLabel(gold: number, prize: number, price: number): string {
  const bars = outcomes(gold, prize, price).map((o) => `${o.percent}% at ${money(o.netCents)}`).join(", ");
  return `Bar graph of one player's net result on a ${SECTORS}-sector wheel: ${bars}. The triangle under the axis marks the expected value, ${money(evCents(gold, prize, price))} per spin.`;
}

/** Worked example: an outdoor show weighed against a guaranteed indoor show. */
export const RECORD_YEARS = 20, CLEAR_YEARS = 14, OUTDOOR_CLEAR = 900, OUTDOOR_RAIN = -200, INDOOR_SURE = 500, SHOWS = 6;

export function festival() {
  const rainYears = RECORD_YEARS - CLEAR_YEARS;
  const clearPartCents = (CLEAR_YEARS * OUTDOOR_CLEAR * 100) / RECORD_YEARS, rainPartCents = (rainYears * OUTDOOR_RAIN * 100) / RECORD_YEARS;
  const outdoorCents = clearPartCents + rainPartCents, indoorCents = INDOOR_SURE * 100;
  return { rainYears, clearPercent: (CLEAR_YEARS * 100) / RECORD_YEARS, rainPercent: (rainYears * 100) / RECORD_YEARS, clearPartCents, rainPartCents, outdoorCents, indoorCents, gapCents: outdoorCents - indoorCents, seasonCents: SHOWS * (outdoorCents - indoorCents) };
}

/** Try it: the expected value of one raffle ticket. */
export const TICKETS = 500, TICKET_PRICE = 4, GRAND_PRIZE = 600, SMALL_PRIZES = 4, SMALL_PRIZE = 50;

export function raffleChoices(): { cents: number; why: string }[] {
  const prizeCents = (GRAND_PRIZE * 100 + SMALL_PRIZES * SMALL_PRIZE * 100) / TICKETS;
  return [
    { cents: prizeCents, why: `is the prize money a ticket returns on average, but the $${TICKET_PRICE} you hand over is part of the net result too` },
    { cents: -TICKET_PRICE * 100, why: "treats every ticket as a total loss, yet a ticket does return some prize money on average" },
    { cents: prizeCents - TICKET_PRICE * 100, why: "correct" },
    { cents: (GRAND_PRIZE * 100) / TICKETS - TICKET_PRICE * 100, why: `counts the grand prize only and forgets the ${SMALL_PRIZES} prizes of $${SMALL_PRIZE}` },
  ];
}

export function raffleAnswerIndex(): number {
  const target = (GRAND_PRIZE * 100 + SMALL_PRIZES * SMALL_PRIZE * 100 - TICKETS * TICKET_PRICE * 100) / TICKETS;
  return raffleChoices().findIndex((choice) => choice.cents === target);
}

const TONE: Record<string, string> = { gold: ACCENT, silver: MID, blank: "var(--ink-faint)" };

export default function Lesson() {
  const [gold, setGold] = useState(2);
  const [prize, setPrize] = useState(10);
  const [price, setPrice] = useState(2);
  const [side, setSide] = useState<Side>("player");
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();

  const rows = outcomes(gold, prize, price);
  const moneyRows = moneyLabelRows(rows.map((o) => o.net), rows.map((o) => money(o.netCents)));
  const ev = evCents(gold, prize, price);
  const fair = fairPriceCents(gold, prize);
  const read = verdict(side, ev);
  const evLabel = `E(X) = ${money(ev)}`;
  const f = festival();
  const steps = [
    <>Name the random variable. Let P be the profit of one show. Outdoors P takes two values, ${OUTDOOR_CLEAR} in clear weather and a loss of ${-OUTDOOR_RAIN} if rain forces refunds. Indoors P takes the single value ${INDOOR_SURE}.</>,
    <>Read the probabilities off the record book. Of the last {RECORD_YEARS} festival weekends, {CLEAR_YEARS} were clear and {f.rainYears} were rainy, so P(clear) = {CLEAR_YEARS}/{RECORD_YEARS} = {f.clearPercent}% and P(rain) = {f.rainYears}/{RECORD_YEARS} = {f.rainPercent}%. The two add to 100%, as any distribution must.</>,
    <>Weight each value by its probability and add. E(outdoors) = ({CLEAR_YEARS}/{RECORD_YEARS})({OUTDOOR_CLEAR}) + ({f.rainYears}/{RECORD_YEARS})({OUTDOOR_RAIN}) = {money(f.clearPartCents)} &minus; {money(-f.rainPartCents)} = {money(f.outdoorCents)}.</>,
    <>The indoor plan is a random variable with one value, so E(indoors) = {money(f.indoorCents)}. Outdoors wins the comparison by {money(f.gapCents)} a show, or {money(f.seasonCents)} across a {SHOWS}-show season.</>,
    <>Read the answer honestly. {money(f.outdoorCents)} is a long-run average, not a promise: about {f.rainPercent} nights in 100 the outdoor show ends {money(-OUTDOOR_RAIN * 100)} in the red. If one bad night would sink the season, the smaller but certain {money(f.indoorCents)} is the better decision.</>,
  ];

  const choices = raffleChoices();
  const answer = raffleAnswerIndex();
  const prizeCents = (GRAND_PRIZE * 100 + SMALL_PRIZES * SMALL_PRIZE * 100) / TICKETS;
  const raffleWhy = `The ${TICKETS} tickets share ${money(GRAND_PRIZE * 100 + SMALL_PRIZES * SMALL_PRIZE * 100)} of prizes, so one ticket returns ${money(prizeCents)} on average; subtract the $${TICKET_PRICE} you paid and the expected value is ${money(prizeCents - TICKET_PRICE * 100)}.`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Every fair has a booth that looks generous: big gold prize, cheap ticket, a crowd around it. The question a statistician asks is not &ldquo;can I win?&rdquo; &mdash; of course you can &mdash; but &ldquo;what happens to my money if I play all afternoon?&rdquo; Answering it means turning chance into a number: a <strong>random variable</strong>{" "}that records what one spin does to your wallet, a <strong>distribution</strong>{" "}that says how often each value comes up, and one weighted average that summarizes the whole picture.
      </p>
      <p>
        That average is the <strong>expected value</strong>, and this chapter is about using it to decide things. Move the wheel and the ticket price below, watch the balance point slide across the break-even line, and notice that a fair price is never a matter of opinion &mdash; it is a computation.
      </p>

      <Figure caption="Each bar is one value of the player's net result; its height is that value's probability. The triangle under the axis is the expected value, the balance point of the distribution.">
        <div className="flex flex-col items-center gap-5">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(gold, prize, price)}>
            <line x1={xOf(0)} y1={34} x2={xOf(0)} y2={BASE_Y} stroke="var(--line)" strokeWidth={1.5} strokeDasharray="4 4" />
            <text x={xOf(0) + 5} y={32} fontSize={9} fill="var(--ink-faint)">break even</text>
            {rows.map((o, i) => (
              <g key={o.key}>
                <rect x={xOf(o.net) - BAR_W / 2} y={barTop(o.count)} width={BAR_W} height={o.count * PX_PER_SECTOR} rx={3} fill={TONE[o.key]} fillOpacity={0.85} />
                <text x={xOf(o.net)} y={barTop(o.count) - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--ink-soft)">{o.count}/{SECTORS}</text>
                <text x={xOf(o.net)} y={BASE_Y + 14 + moneyRows[i] * MONEY_ROW_H} textAnchor="middle" fontSize={MONEY_LABEL_SIZE} fontWeight={800} fill={TONE[o.key]}>{money(o.netCents)}</text>
              </g>
            ))}
            <line x1={PAD_X} y1={BASE_Y} x2={W - PAD_X} y2={BASE_Y} stroke="var(--ink-soft)" strokeWidth={2} />
            <polygon points={`${xOf(ev / 100)},${TIP_Y} ${xOf(ev / 100) - 8},${FOOT_Y} ${xOf(ev / 100) + 8},${FOOT_Y}`} fill={ACCENT} />
            <text x={labelX(evLabel, xOf(ev / 100))} y={EV_TEXT_Y} textAnchor="middle" fontSize={11} fontWeight={800} fill={ACCENT}>{evLabel}</text>
          </svg>

          <table className="border-collapse text-center font-mono text-sm">
            <thead>
              <tr className="text-[var(--ink-faint)]"><th className="px-3 py-1">sector</th><th className="px-3 py-1">net result</th><th className="px-3 py-1">probability</th><th className="px-3 py-1">value &times; probability</th></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.key}>
                  <th className="px-3 py-1 text-right font-sans text-xs font-bold" style={{ color: TONE[o.key] }}>{o.label}</th>
                  <td className="px-3 py-1 font-bold">{money(o.netCents)}</td><td className="px-3 py-1">{o.count}/{SECTORS} = {o.percent}%</td>
                  <td className="px-3 py-1" style={{ color: ACCENT }}>{money(o.partCents)}</td>
                </tr>
              ))}
              <tr className="border-t border-[var(--line)]">
                <th className="px-3 py-1 text-right font-sans text-xs font-bold">total</th>
                <td className="px-3 py-1 text-[var(--ink-faint)]">&mdash;</td><td className="px-3 py-1 text-[var(--ink-soft)]">{SECTORS}/{SECTORS} = 100%</td>
                <td className="px-3 py-1 font-black" style={{ color: ACCENT }}>{money(ev)}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex flex-wrap justify-center gap-2">
            {(["player", "booth"] as Side[]).map((key) => (
              <button key={key} type="button" onClick={() => setSide(key)} aria-pressed={side === key} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={side === key ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
                {key === "player" ? "decide as the player" : "decide as the booth"}
              </button>
            ))}
          </div>

          <div className="w-full max-w-xl rounded-2xl border-2 px-5 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-2xl font-black" style={{ color: ACCENT }}>{money(read.shownCents)} per spin</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">{read.sentence} {read.longRun}</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">
              The wheel pays out {money(fair)} a spin on average, so {money(fair)} is the fair ticket price. This ticket costs ${price}, which is{" "}
              {100 * price === fair ? "exactly fair" : 100 * price > fair ? `${money(100 * price - fair)} above fair` : `${money(fair - 100 * price)} below fair`}.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Gold sectors" value={gold} min={GOLD_MIN} max={GOLD_MAX} step={GOLD_STEP} onChange={setGold} />
            <Stepper label="Gold prize ($)" value={prize} min={PRIZE_MIN} max={PRIZE_MAX} step={PRIZE_STEP} onChange={setPrize} />
            <Stepper label="Ticket price ($)" value={price} min={PRICE_MIN} max={PRICE_MAX} step={PRICE_STEP} onChange={setPrice} />
          </div>
          <p className="m-0 text-center text-xs text-[var(--ink-faint)]">
            The wheel always has {SILVER_SECTORS} silver sectors paying ${SILVER_PRIZE}, plus {gold} gold{" "}
            {gold === 1 ? "sector" : "sectors"} paying ${prize} and {SECTORS - gold - SILVER_SECTORS} blank sectors paying nothing.
          </p>
        </div>
      </Figure>

      <h2>Worked example: rain on the drama club</h2>
      <p>
        The drama club can stage the spring show outdoors in the courtyard or indoors in the small hall. Outdoors it clears ${OUTDOOR_CLEAR} in good weather but loses ${-OUTDOOR_RAIN} if rain forces refunds. Indoors it clears a steady ${INDOOR_SURE}. Which plan should the club choose?
      </p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, shown).map((body, i) => (
            <li key={i} className="flex gap-3 text-[15px]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span>
              <span>{body}</span>
            </li>
          ))}
        </ol>
        {shown === 0 && <p className="m-0 text-sm text-[var(--ink-faint)]">Press &ldquo;Next step&rdquo; to watch the decision take shape.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={shown > 0} aria-controls={stepsId} disabled={shown >= steps.length} onClick={() => setShown((n) => Math.min(steps.length, n + 1))} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next step</button>
          <button type="button" disabled={shown === 0} onClick={() => setShown(0)} className="rounded-lg border border-[var(--line)] px-4 py-1.5 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>
        A booster club sells {TICKETS} raffle tickets at ${TICKET_PRICE} each. One winner takes a ${GRAND_PRIZE} prize and{" "}
        {SMALL_PRIZES} more win ${SMALL_PRIZE} each. What is the expected value of a single ticket to the person who buys it?
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice, i) => (
          <button key={i} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={picked === i ? { background: i === answer ? "var(--band-upper)" : "var(--band-early)", color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
            {money(choice.cents)}
          </button>
        ))}
      </div>
      {picked !== null && (
        <p className="mt-3 text-[15px]">{picked === answer ? `Right. ${raffleWhy}` : `Not quite — that answer ${choices[picked].why}. ${raffleWhy}`}</p>
      )}

      <h2>Your path through this chapter</h2>
      <p>
        <strong>Random Variables</strong>{" "}builds the object these bars are drawn from, using the sum of two dice, and shows why its graph peaks where it does. <strong>Expected Value</strong>{" "}takes the last column of the table apart, computing the weighted average both from a distribution known in advance and from one collected as data.{" "}
        <strong>Making Decisions with Probability</strong>{" "}finishes what this opener starts: judging a carnival game, pricing a ticket so neither side is favored, and comparing whole strategies against one another.
      </p>

      <MathCheck>
        <p>
          The net result of one spin is a <strong>random variable</strong>&mdash; a number attached to each outcome of a chance process &mdash; and the three bars, {rows[0].percent}%, {rows[1].percent}% and {rows[2].percent}%, are its probability distribution, which always totals 100% (S-MD.1). Its{" "}
          <strong>expected value</strong>{" "}is the sum of value times probability down the last column, {money(ev)} here, and that weighted average is the long-run mean per spin rather than a prediction about any single spin (S-MD.2). These probabilities come from the wheel's known geometry &mdash; {gold} gold, {SILVER_SECTORS} silver and {SECTORS - gold - SILVER_SECTORS} blank out of {SECTORS} equal sectors &mdash; so the distribution is theoretical (S-MD.3), while the worked example estimates P(clear) as {CLEAR_YEARS}/{RECORD_YEARS} from {RECORD_YEARS} years of records, an empirical one (S-MD.4).{" "}
          Weighing {money(f.outdoorCents)} against {money(f.indoorCents)} is exactly how expected values and payoffs settle a decision (S-MD.5), and the two buttons show why that comparison is symmetric: the booth's expected value is the negative of the player's, so one side's gain is the other's loss. A price is <strong>fair</strong>{" "}precisely when the shared expected value is zero, which happens at {money(fair)}, the average payout of the wheel (S-MD.6). Even so, the mean is not the whole decision &mdash; a plan with the higher average can carry a loss you cannot afford, so strategies are judged by their spread as well (S-MD.7).
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
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>&minus;</button>
        <span className="w-10 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
