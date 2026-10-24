import assert from "node:assert/strict";
import { collides, textBox } from "../labelSpacing";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  BAR_W,
  BASE_Y,
  CLEAR_YEARS,
  EV_TEXT_Y,
  FOOT_Y,
  GOLD_MAX,
  GOLD_MIN,
  GOLD_STEP,
  GRAND_PRIZE,
  H,
  HI,
  INDOOR_SURE,
  LO,
  LONG_RUN,
  OUTDOOR_CLEAR,
  OUTDOOR_RAIN,
  PAD_X,
  PRICE_MAX,
  PRICE_MIN,
  PRICE_STEP,
  PRIZE_MAX,
  PRIZE_MIN,
  PRIZE_STEP,
  PX_PER_SECTOR,
  RECORD_YEARS,
  SECTORS,
  SHOWS,
  SILVER_PRIZE,
  SILVER_SECTORS,
  SMALL_PRIZE,
  SMALL_PRIZES,
  TICKETS,
  TICKET_PRICE,
  TIP_Y,
  W,
  barTop,
  evCents,
  fairPriceCents,
  festival,
  figureLabel,
  labelX,
  money,
  outcomes,
  raffleAnswerIndex,
  raffleChoices,
  verdict,
  xOf,
  type Side,
  moneyLabelRows,
  MONEY_ROW_H,
  MONEY_GLYPH,
  MONEY_LABEL_SIZE,
} from "./ca-g12-ch03-decision-statistics";

const SLUG = "ca-g12-ch03-decision-statistics";
const BRIEF_STANDARDS = ["S-MD.1", "S-MD.2", "S-MD.3", "S-MD.4", "S-MD.5", "S-MD.6", "S-MD.7"];
const SIDES: Side[] = ["player", "booth"];
/** Rough half-glyph widths, used only to keep SVG text inside the viewBox. */
const HALF_11 = 3.2;
const HALF_10 = 3.0;

/** Reads a rendered amount back to whole cents, so money() is checked by its inverse. */
function parseMoney(text: string): number {
  const negative = text.startsWith("−");
  const body = negative ? text.slice(1) : text;
  assert.ok(body.startsWith("$"), `"${text}" must be an amount`);
  const [whole, fraction] = body.slice(1).split(".");
  assert.match(whole, /^\d+$/u, `"${text}" has no whole-dollar part`);
  assert.match(fraction ?? "", /^\d\d$/u, `"${text}" must show exactly two decimal places`);
  const cents = Number(whole) * 100 + Number(fraction);
  return negative ? -cents : cents;
}

test("money renders whole cents exactly and reads back to the same number", () => {
  assert.equal(money(0), "$0.00");
  assert.equal(money(70), "$0.70");
  assert.equal(money(-240), "−$2.40");
  assert.equal(money(57000), "$570.00");
  assert.equal(money(5), "$0.05");
  for (const cents of [-86000, -240, -5, 0, 5, 160, 550, 42000]) assert.equal(parseMoney(money(cents)), cents);
});

test("every reachable wheel keeps the distribution, the expected value and the drawing true", () => {
  assert.deepEqual([GOLD_MIN, GOLD_MAX, GOLD_STEP], [1, 5, 1]);
  assert.deepEqual([PRIZE_MIN, PRIZE_MAX, PRIZE_STEP], [4, 20, 2]);
  assert.deepEqual([PRICE_MIN, PRICE_MAX, PRICE_STEP], [1, 5, 1]);
  assert.deepEqual([SECTORS, SILVER_SECTORS, SILVER_PRIZE, LONG_RUN], [20, 5, 2, 200]);
  assert.equal(xOf(LO), PAD_X);
  assert.equal(xOf(HI), W - PAD_X);

  let states = 0;
  for (let gold = GOLD_MIN; gold <= GOLD_MAX; gold += GOLD_STEP) {
    for (let prize = PRIZE_MIN; prize <= PRIZE_MAX; prize += PRIZE_STEP) {
      for (let price = PRICE_MIN; price <= PRICE_MAX; price += PRICE_STEP) {
        states += 1;
        const where = `gold=${gold}, prize=${prize}, price=${price}`;
        const rows = outcomes(gold, prize, price);
        const ev = evCents(gold, prize, price);
        const fair = fairPriceCents(gold, prize);

        // --- the distribution: three disjoint groups of sectors that tile the wheel ---
        assert.equal(rows.length, 3, where);
        assert.deepEqual(rows.map((o) => o.count), [gold, 5, 15 - gold], where);
        assert.equal(rows.reduce((sum, o) => sum + o.count, 0), SECTORS, where);
        assert.equal(rows.reduce((sum, o) => sum + o.percent, 0), 100, where);
        assert.deepEqual(rows.map((o) => o.net), [prize - price, 2 - price, -price], where);
        for (const o of rows) {
          assert.ok(o.count >= 1, `${o.key} must never be an empty group (${where})`);
          // Each sector is 1/20 of the wheel, so a count of k is 5k percent, an exact integer.
          assert.equal(o.percent, o.count * 5, where);
          assert.ok(Number.isInteger(o.percent), where);
          assert.equal(o.netCents, o.net * 100, where);
          // value x probability, in cents: net dollars x 100 x count / 20 = 5 x net x count.
          assert.equal(o.partCents, 5 * o.net * o.count, where);
          assert.ok(Number.isInteger(o.partCents), where);
          assert.equal(parseMoney(money(o.netCents)), o.netCents, where);
          assert.equal(parseMoney(money(o.partCents)), o.partCents, where);
        }
        // The three values are always distinct and at least $2 apart, so the bars never collide.
        const nets = rows.map((o) => o.net);
        assert.equal(new Set(nets).size, 3, where);
        for (let i = 0; i < 3; i += 1) {
          for (let j = i + 1; j < 3; j += 1) assert.ok(Math.abs(nets[i] - nets[j]) >= 2, `values ${nets[i]} and ${nets[j]} crowd together (${where})`);
        }

        // --- the expected value, recomputed from scratch ---
        // E = [gold(prize - price) + 5(2 - price) + (15 - gold)(-price)] / 20 dollars, in cents:
        const byHand = (gold * (prize - price) + 5 * (2 - price) + (15 - gold) * -price) * 100 / SECTORS;
        assert.equal(ev, byHand, where);
        assert.equal(ev, 5 * gold * prize + 50 - 100 * price, where);
        assert.equal(ev, rows.reduce((sum, o) => sum + o.partCents, 0), where);
        assert.ok(Number.isInteger(ev), where);
        // A weighted average always lies between the smallest and the largest value.
        assert.ok(ev >= Math.min(...nets) * 100 && ev <= Math.max(...nets) * 100, `the mean escapes the range of outcomes (${where})`);

        // --- the fair price is the average payout, and it is what zeroes the expected value ---
        assert.equal(fair, (gold * prize * 100 + 5 * 2 * 100) / SECTORS, where);
        assert.equal(fair, 5 * gold * prize + 50, where);
        assert.equal(ev, fair - 100 * price, where);
        assert.equal(ev === 0, 100 * price === fair, where);
        assert.equal(ev < 0, 100 * price > fair, where);
        assert.ok(fair > 0, where);

        // --- the two sides of the counter are exact opposites ---
        for (const side of SIDES) {
          const read = verdict(side, ev);
          const tag = `${where}, ${side}`;
          assert.equal(read.shownCents, side === "player" ? ev : -ev, tag);
          assert.equal(read.shownCents + verdict(side === "player" ? "booth" : "player", ev).shownCents, 0, tag);
          const who = side === "player" ? "A player" : "The booth";
          if (read.shownCents === 0) {
            assert.equal(read.sentence, `${who} breaks even on an average spin, so this game is fair.`, tag);
            assert.equal(read.longRun, `Over ${LONG_RUN} spins the two sides come out even.`, tag);
          } else {
            assert.equal(read.sentence, `${who} ${read.shownCents > 0 ? "gains" : "loses"} ${money(Math.abs(read.shownCents))} on an average spin.`, tag);
            assert.ok(read.sentence.includes(money(Math.abs(read.shownCents))), tag);
            assert.equal(read.longRun, `Over ${LONG_RUN} spins that is about ${money(Math.abs(read.shownCents) * LONG_RUN)} ${read.shownCents > 0 ? "gained" : "lost"}.`, tag);
            assert.equal(parseMoney(money(Math.abs(read.shownCents) * LONG_RUN)), Math.abs(ev) * 200, tag);
          }
        }

        // --- the drawing: every mark stays inside the viewBox and the bars stay apart ---
        for (const o of rows) {
          const cx = xOf(o.net);
          const top = barTop(o.count);
          assert.ok(cx - BAR_W / 2 >= 0 && cx + BAR_W / 2 <= W, `the ${o.key} bar leaves the viewBox (${where})`);
          assert.equal(top, BASE_Y - o.count * PX_PER_SECTOR, where);
          // Height is proportional to probability, and the tallest possible bar (14/20) still fits.
          assert.equal(BASE_Y - top, o.count * PX_PER_SECTOR, where);
          assert.ok(top >= BASE_Y - 14 * PX_PER_SECTOR && top < BASE_Y, `the ${o.key} bar overflows its plot (${where})`);
          assert.ok(top - 5 - 10 >= 0, `the ${o.key} probability label rides off the top (${where})`);
          const halfCount = `${o.count}/${SECTORS}`.length * HALF_10;
          assert.ok(cx - halfCount >= 0 && cx + halfCount <= W, `the ${o.key} probability label leaves the viewBox (${where})`);
          const halfValue = money(o.netCents).length * HALF_11;
          assert.ok(cx - halfValue >= 0 && cx + halfValue <= W, `the ${o.key} value label leaves the viewBox (${where})`);
          assert.ok(BASE_Y + 14 + 3 <= H, "the value labels must sit inside the viewBox");
        }
        for (let i = 0; i < 3; i += 1) {
          for (let j = i + 1; j < 3; j += 1) {
            assert.ok(Math.abs(xOf(nets[i]) - xOf(nets[j])) >= BAR_W, `bars ${i} and ${j} overlap (${where})`);
          }
        }
        const fulcrumX = xOf(ev / 100);
        assert.ok(fulcrumX >= PAD_X && fulcrumX <= W - PAD_X, `the balance point leaves the axis (${where})`);
        assert.ok(fulcrumX - 8 >= 0 && fulcrumX + 8 <= W, `the balance-point triangle leaves the viewBox (${where})`);
        assert.ok(BASE_Y < TIP_Y && TIP_Y < FOOT_Y && FOOT_Y < EV_TEXT_Y && EV_TEXT_Y + 3 <= H, "the balance point must sit below the axis and inside the viewBox");
        const evLabel = `E(X) = ${money(ev)}`;
        const lx = labelX(evLabel, fulcrumX);
        const halfLabel = evLabel.length * 3.4;
        assert.ok(lx - halfLabel >= 0 && lx + halfLabel <= W, `the balance-point caption leaves the viewBox (${where})`);
        assert.equal(lx, fulcrumX, `no clamping is needed anywhere on this grid (${where})`);

        // --- the accessible description repeats exactly what is drawn ---
        const label = figureLabel(gold, prize, price);
        assert.ok(label.startsWith(`Bar graph of one player's net result on a ${SECTORS}-sector wheel:`), where);
        for (const o of rows) assert.ok(label.includes(`${o.percent}% at ${money(o.netCents)}`), `${label} must name the ${o.key} bar (${where})`);
        assert.ok(label.endsWith(`marks the expected value, ${money(ev)} per spin.`), where);
      }
    }
  }
  assert.equal(states, 225, "the three steppers reach 5 x 9 x 5 wheels");
});

test("the worked example weighs an outdoor show against a certain indoor one", () => {
  assert.deepEqual([RECORD_YEARS, CLEAR_YEARS, OUTDOOR_CLEAR, OUTDOOR_RAIN, INDOOR_SURE, SHOWS], [20, 14, 900, -200, 500, 6]);
  const f = festival();
  // 20 recorded weekends, 14 clear, so 6 rainy; 14/20 = 70% and 6/20 = 30%, which add to 100%.
  assert.equal(f.rainYears, 6);
  assert.equal(f.clearPercent, 70);
  assert.equal(f.rainPercent, 30);
  assert.equal(f.clearPercent + f.rainPercent, 100);
  assert.equal(14 * 5, 70);
  assert.equal(6 * 5, 30);
  // 0.70(900) = 630 and 0.30(-200) = -60, so E(outdoors) = 630 - 60 = 570 dollars.
  assert.equal(f.clearPartCents, 63000);
  assert.equal(f.rainPartCents, -6000);
  assert.equal((14 * 900) / 20, 630);
  assert.equal((6 * -200) / 20, -60);
  assert.equal(f.outdoorCents, 57000);
  assert.equal(630 - 60, 570);
  assert.equal((14 * 900 + 6 * -200) / 20, 570);
  // The indoor plan takes one value, so its mean is that value.
  assert.equal(f.indoorCents, 50000);
  // Outdoors leads by 570 - 500 = 70 a show, and 6 x 70 = 420 across the season.
  assert.equal(f.gapCents, 7000);
  assert.equal(570 - 500, 70);
  assert.equal(f.seasonCents, 42000);
  assert.equal(6 * 70, 420);
  assert.ok(f.outdoorCents > f.indoorCents, "the outdoor plan must be the one with the larger mean");
  // The honest caveat is real: the losing branch happens 30% of the time and costs 200.
  assert.ok(f.rainPercent > 0 && OUTDOOR_RAIN < 0);
  assert.equal(money(f.clearPartCents), "$630.00");
  assert.equal(money(-f.rainPartCents), "$60.00");
  assert.equal(money(f.outdoorCents), "$570.00");
  assert.equal(money(f.indoorCents), "$500.00");
  assert.equal(money(f.gapCents), "$70.00");
  assert.equal(money(f.seasonCents), "$420.00");
});

test("the Try it answer is the average prize minus the price paid", () => {
  assert.deepEqual([TICKETS, TICKET_PRICE, GRAND_PRIZE, SMALL_PRIZES, SMALL_PRIZE], [500, 4, 600, 4, 50]);
  // Prizes total 600 + 4(50) = 800 dollars spread over 500 tickets: 800/500 = 1.6 dollars a ticket.
  const prizePot = GRAND_PRIZE + SMALL_PRIZES * SMALL_PRIZE;
  assert.equal(prizePot, 800);
  assert.equal((800 * 100) / 500, 160);
  // Net expected value = 160 - 400 = -240 cents, that is -$2.40.
  const target = 160 - 400;
  assert.equal(target, -240);

  const choices = raffleChoices();
  const answer = raffleAnswerIndex();
  assert.equal(choices.length, 4);
  assert.equal(new Set(choices.map((c) => c.cents)).size, 4, "the four options are distinct");
  assert.equal(answer, 2);
  assert.equal(choices[answer].cents, target);
  assert.equal(choices[answer].why, "correct");
  assert.equal(choices.filter((c) => c.why === "correct").length, 1);
  assert.equal(money(choices[answer].cents), "−$2.40");
  choices.forEach((choice, i) => {
    assert.equal(choice.cents === target, i === answer, `option ${i} must ${i === answer ? "" : "not "}equal ${target} cents`);
    assert.ok(Number.isInteger(choice.cents), `option ${i} must be a whole number of cents`);
    assert.equal(parseMoney(money(choice.cents)), choice.cents);
  });
  // The three distractors are the three classic mistakes, each recomputed by hand.
  assert.equal(choices[0].cents, 160); // the prize side only: 800/500 = 1.60
  assert.equal(choices[1].cents, -400); // the price only: the ticket treated as a pure loss
  assert.equal(choices[3].cents, -280); // the grand prize only: 600/500 - 4 = 1.20 - 4 = -2.80
  assert.equal((600 * 100) / 500 - 400, -280);
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = [...source.matchAll(/\b(?:(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of BRIEF_STANDARDS) assert.ok(cited.includes(must), `${must} must be cited`);

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 1);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"') && tag.includes("aria-label"), "every <svg> needs role=img and an aria-label");
  }

  // The side toggle, the mapped Try-it option, Next step, Start over, and the stepper's decrease/increase pair.
  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(buttonTags.length, 6);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");

  assert.match(source, /value=\{gold\} min=\{GOLD_MIN\} max=\{GOLD_MAX\} step=\{GOLD_STEP\}/u);
  assert.match(source, /value=\{prize\} min=\{PRIZE_MIN\} max=\{PRIZE_MAX\} step=\{PRIZE_STEP\}/u);
  assert.match(source, /value=\{price\} min=\{PRICE_MIN\} max=\{PRICE_MAX\} step=\{PRICE_STEP\}/u);
  assert.match(source, /disabled=\{value <= min\}/u);
  assert.match(source, /disabled=\{value >= max\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{side === key\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  // The one control whose floor is 1 and whose readout names a noun must agree in number.
  assert.match(source, /\{gold === 1 \? "sector" : "sectors"\}/u);
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|<form|dangerouslySetInnerHTML|next\/image/u);
});

test("two net-result labels never share a row and a place", () => {
  let states = 0;
  for (let gold = GOLD_MIN; gold <= GOLD_MAX; gold += GOLD_STEP) {
    for (let prize = PRIZE_MIN; prize <= PRIZE_MAX; prize += PRIZE_STEP) {
      for (let price = PRICE_MIN; price <= PRICE_MAX; price += PRICE_STEP) {
        const rows = outcomes(gold, prize, price);
        const texts = rows.map((o) => money(o.netCents));
        const which = moneyLabelRows(rows.map((o) => o.net), texts);
        const boxes = rows.map((o, i) => textBox(xOf(o.net), BASE_Y + 14 + which[i] * MONEY_ROW_H, texts[i].length * MONEY_GLYPH, { fontSize: MONEY_LABEL_SIZE }));
        const where = `${gold} gold, $${prize} prize, $${price} ticket`;
        for (let i = 0; i < boxes.length; i += 1) {
          for (let j = i + 1; j < boxes.length; j += 1) {
            assert.ok(which[i] !== which[j] || !collides(boxes[i], boxes[j], 3), `"${texts[i]}" and "${texts[j]}" overlap at ${where}`);
          }
          // The reserved second row must stay clear of the balance-point marker.
          assert.ok(boxes[i].y1 < TIP_Y, `a net-result label reaches the expected-value marker at ${where}`);
        }
        states += 1;
      }
    }
  }
  assert.ok(states > 0);
});
