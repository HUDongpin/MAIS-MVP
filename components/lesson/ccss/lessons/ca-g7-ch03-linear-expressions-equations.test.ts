import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CONTROL,
  SCALE_MAX,
  TAPE,
  TAPE_W,
  TRY,
  TRY_ANSWER,
  TRY_OPTIONS,
  UNIT,
  WORKED,
  affordableTicket,
  budgetLines,
  exactBoundText,
  exactTicketBound,
  fixedPart,
  groupedTotal,
  linearTotal,
  matchesTarget,
  plural,
  solveForTicket,
  tapeAriaLabel,
  tapeCaptions,
  tapeChrome,
  tapeRows,
  tryTarget,
  workedExample,
  workedSteps
} from "./ca-g7-ch03-linear-expressions-equations";

const SLUG = "ca-g7-ch03-linear-expressions-equations";
const BRIEF_STANDARDS = ["7.EE.A.1", "7.EE.A.2", "7.EE.B.3", "7.EE.B.4"];
const source = readFileSync(path.join(process.cwd(), `components/lesson/ccss/lessons/${SLUG}.tsx`), "utf8");
const EPS = 1e-9;

// The drawing scale, written out independently: 520 - 2*16 = 488 px of tape stand for $160.
const PX_PER_DOLLAR = 3.05;
const LEFT = 16;
const RIGHT = 504;

/** Read a printed bound ("20", "20.5", "13 5/6") back as an exact fraction, so nothing is compared in floating point. */
function parseBound(text: string) {
  const mixed = /^(\d+) (\d+)\/(\d+)$/u.exec(text);
  if (mixed) return { num: Number(mixed[1]) * Number(mixed[3]) + Number(mixed[2]), den: Number(mixed[3]) };
  const decimal = /^(\d+)\.(\d+)$/u.exec(text);
  if (decimal) return { num: Number(decimal[1]) * 10 ** decimal[2].length + Number(decimal[2]), den: 10 ** decimal[2].length };
  assert.match(text, /^\d+$/u, `a printed bound must be a whole number, a decimal, or a mixed number: "${text}"`);
  return { num: Number(text), den: 1 };
}

function inlineRange(re: RegExp, label: string) {
  const m = source.match(re);
  assert.ok(m, `${label} must declare an inline min and max in the lesson source`);
  return { min: Number(m[1]), max: Number(m[2]) };
}

// Read the control grid out of the JSX, so the enumeration below covers exactly what a student can reach.
const RANGES = {
  members: inlineRange(/value=\{members\} min=\{(\d+)\} max=\{(\d+)\} step=\{1\}/u, "members stepper"),
  guide: inlineRange(/value=\{guide\} min=\{(\d+)\} max=\{(\d+)\} step=\{1\}/u, "audio-guide stepper"),
  parking: inlineRange(/value=\{parking\} min=\{(\d+)\} max=\{(\d+)\} step=\{3\}/u, "parking stepper"),
  budget: inlineRange(/value=\{budget\} min=\{(\d+)\} max=\{(\d+)\} step=\{10\}/u, "budget stepper"),
  ticket: inlineRange(/type="range" min=\{(\d+)\} max=\{(\d+)\} value=\{ticket\}/u, "ticket slider")
};

test("declared control bounds match the exported contract", () => {
  assert.deepEqual(RANGES.members, { min: CONTROL.members.min, max: CONTROL.members.max });
  assert.deepEqual(RANGES.guide, { min: CONTROL.guide.min, max: CONTROL.guide.max });
  assert.deepEqual(RANGES.parking, { min: CONTROL.parking.min, max: CONTROL.parking.max });
  assert.deepEqual(RANGES.budget, { min: CONTROL.budget.min, max: CONTROL.budget.max });
  assert.deepEqual(RANGES.ticket, { min: CONTROL.ticket.min, max: CONTROL.ticket.max });
  assert.deepEqual(RANGES.members, { min: 2, max: 6 });
  assert.deepEqual(RANGES.guide, { min: 2, max: 8 });
  assert.deepEqual(RANGES.parking, { min: 3, max: 15 });
  assert.deepEqual(RANGES.budget, { min: 70, max: 160 });
  assert.deepEqual(RANGES.ticket, { min: 4, max: 15 });
  assert.equal(plural(1, "block"), "block");
  assert.equal(plural(2, "block"), "blocks");
});

test("the tape is one fixed dollar ruler that the whole grid fits inside", () => {
  assert.equal(TAPE_W, 488);
  assert.equal(SCALE_MAX, 160);
  assert.ok(Math.abs(UNIT - PX_PER_DOLLAR) < 1e-12, "488 px of tape stand for $160, i.e. $1 is 3.05 px wide");
  // the priciest reachable trip is 6 members x $15 tickets + 6 x $8 guides + $15 parking = $153, inside the $160 ruler
  const dearest = 6 * 15 + 6 * 8 + 15;
  assert.equal(dearest, 153);
  assert.equal(linearTotal(6, 15, 8, 15), dearest);
  assert.ok(dearest <= SCALE_MAX, "the longest possible bar still fits the ruler");
  // the label clamps must be wide enough for the longest captions they carry
  assert.ok(`total bill $${dearest}`.length * TAPE.CHAR_W <= 2 * TAPE.TOTAL_HALF);
  assert.ok(`budget $${SCALE_MAX}`.length * TAPE.CHAR_W <= 2 * TAPE.BUDGET_HALF);
});

test("every reachable state keeps the two bars, the equation, and the inequality true", () => {
  let states = 0;
  let budgetStates = 0;

  for (let members = RANGES.members.min; members <= RANGES.members.max; members += CONTROL.members.step) {
    for (let ticket = RANGES.ticket.min; ticket <= RANGES.ticket.max; ticket += CONTROL.ticket.step) {
      for (let guide = RANGES.guide.min; guide <= RANGES.guide.max; guide += CONTROL.guide.step) {
        for (let parking = RANGES.parking.min; parking <= RANGES.parking.max; parking += CONTROL.parking.step) {
          states += 1;

          // 1. the distributive property: the two written forms are the same number, recomputed here from scratch
          const fixed = members * guide + parking;
          const bill = members * ticket + members * guide + parking;
          assert.equal(fixedPart(members, guide, parking), fixed);
          assert.equal(groupedTotal(members, ticket, guide, parking), bill, `${members}(${ticket} + ${guide}) + ${parking}`);
          assert.equal(linearTotal(members, ticket, guide, parking), bill);
          assert.equal(groupedTotal(members, ticket, guide, parking), linearTotal(members, ticket, guide, parking));

          // 2. solving px + q = r by undoing gives back exactly the ticket price
          assert.equal(solveForTicket(bill, members, fixed), ticket);
          assert.equal(Number.isInteger(solveForTicket(bill, members, fixed)), true);
          assert.equal(members * solveForTicket(bill, members, fixed) + fixed, bill);

          // 3. tape geometry: both rows tile the same span on the shared ruler and stay in the viewBox
          const rows = tapeRows(members, ticket, guide, parking);
          assert.equal(rows.bill, bill);
          const paidAmounts: number[] = [];
          for (let i = 0; i < members; i += 1) paidAmounts.push(ticket, guide);
          paidAmounts.push(parking);
          const regroupedAmounts = [members * ticket, fixed];
          assert.equal(paidAmounts.reduce((a, b) => a + b, 0), bill);
          assert.equal(regroupedAmounts.reduce((a, b) => a + b, 0), bill);

          for (const [segments, amounts] of [[rows.paid, paidAmounts], [rows.regrouped, regroupedAmounts]] as const) {
            assert.equal(segments.length, amounts.length);
            let cum = 0;
            let widthSum = 0;
            for (let i = 0; i < segments.length; i += 1) {
              const s = segments[i];
              assert.equal(s.label, `$${amounts[i]}`, "a block is labelled with the money it stands for");
              assert.ok(Math.abs(s.w - amounts[i] * PX_PER_DOLLAR) < EPS, "a block is as many dollars wide as it is worth");
              assert.ok(Math.abs(s.x - (LEFT + cum * PX_PER_DOLLAR)) < EPS, "blocks are laid end to end");
              assert.ok(s.w > 0);
              assert.ok(s.x >= LEFT - EPS, `block starts inside the viewBox (${s.x})`);
              assert.ok(s.x + s.w <= RIGHT + EPS, `block ends inside the viewBox (${s.x + s.w})`);
              if (s.showLabel) assert.ok(s.label.length * TAPE.CHAR_W <= s.w + EPS, `label ${s.label} must fit its block`);
              cum += amounts[i];
              widthSum += s.w;
            }
            assert.equal(cum, bill);
            assert.ok(Math.abs(widthSum - bill * PX_PER_DOLLAR) < 1e-6, "the row is exactly as long as the bill is big");
          }
          assert.ok(Math.abs(rows.paid[rows.paid.length - 1].x + rows.paid[rows.paid.length - 1].w - (rows.regrouped[1].x + rows.regrouped[1].w)) < 1e-6, "both bars end at the same place");
          assert.ok(Math.abs(rows.end - (LEFT + bill * PX_PER_DOLLAR)) < EPS);
          // the ticket blocks of the top bar total the variable block of the bottom bar
          assert.equal(members * ticket, regroupedAmounts[0]);

          // 3b. the promise the prose makes: the fixed block keeps its size while the bars grow with x
          const atMin = tapeRows(members, RANGES.ticket.min, guide, parking);
          const atMax = tapeRows(members, RANGES.ticket.max, guide, parking);
          assert.ok(Math.abs(rows.regrouped[1].w - atMin.regrouped[1].w) < EPS, "the fixed block never changes width when the ticket price moves");
          assert.ok(Math.abs(atMax.regrouped[1].w - atMin.regrouped[1].w) < EPS);
          assert.ok(atMax.end > atMin.end + 1, "raising the ticket price makes both bars visibly longer");
          assert.ok(Math.abs(atMax.end - atMin.end - members * (15 - 4) * PX_PER_DOLLAR) < 1e-6, "the bar grows by exactly the extra money");

          // 4. captions, chrome and the accessible description are true in this state
          for (let budget = RANGES.budget.min; budget <= RANGES.budget.max; budget += CONTROL.budget.step) {
            budgetStates += 1;

            const caps = tapeCaptions(members, ticket, guide, parking, budget);
            assert.equal(caps.total, `total bill $${bill}`);
            assert.equal(caps.budget, `budget $${budget}`);
            assert.ok(caps.paid.includes(`${members} × ($${ticket} ticket + $${guide} guide) + $${parking} parking`));
            assert.ok(caps.regrouped.includes(`${members}x + $${fixed}`));
            for (const line of [caps.paid, caps.bridge, caps.regrouped, caps.total, caps.budget]) {
              assert.ok(line.length * TAPE.CHAR_W <= TAPE_W, `caption must fit the tape width: ${line}`);
            }

            const chrome = tapeChrome(bill, budget);
            assert.ok(Math.abs(chrome.budgetX - (LEFT + budget * PX_PER_DOLLAR)) < EPS, "the dashed line stands at the budget on the same ruler");
            assert.ok(chrome.budgetX >= LEFT - EPS && chrome.budgetX <= RIGHT + EPS, "the budget line stays in the viewBox");
            assert.equal(chrome.budgetX > rows.end, bill < budget, "the budget line is past the bar exactly when the bill fits");
            for (const [labelX, textLine] of [[chrome.budgetLabelX, caps.budget], [chrome.totalLabelX, caps.total]] as const) {
              const half = (textLine.length * TAPE.CHAR_W) / 2;
              assert.ok(labelX - half >= LEFT - EPS, `caption "${textLine}" must not spill off the left edge`);
              assert.ok(labelX + half <= RIGHT + EPS, `caption "${textLine}" must not spill off the right edge`);
            }

            const label = tapeAriaLabel(members, ticket, guide, parking, budget);
            assert.ok(label.includes(`each worth ${bill} dollars`));
            assert.ok(label.includes(`alternates ${members} ticket blocks of ${ticket} dollars with ${members} guide blocks of ${guide} dollars`), label);
            assert.ok(label.includes(`then one ${parking} dollar parking block`));
            assert.ok(label.includes(`merges the ${members} ticket blocks into one ${members * ticket} dollar block and the guides and parking into one ${fixed} dollar block`));
            assert.ok(label.includes(`marks the ${budget} dollar budget, ${bill < budget ? "past" : bill === budget ? "exactly at" : "before"} the end of both bars`));

            // 5. the inequality: the printed derivation, the printed answer and the arithmetic all agree
            //    largest whole-dollar ticket, found by counting up instead of by dividing
            let k = 0;
            while (members * (k + 1) + fixed <= budget) k += 1;
            assert.ok(k >= 1, `the budget must always leave room for a ticket (${budget}, ${fixed}, ${members})`);
            assert.ok(members * k + fixed <= budget, "the advertised ticket price fits the budget");
            assert.ok(members * (k + 1) + fixed > budget, "one dollar more would not fit");

            const most = affordableTicket(budget, members, fixed);
            assert.equal(most, k);
            assert.equal(Math.floor(exactTicketBound(budget, members, fixed)), k, "the whole-dollar answer is the exact bound rounded down");

            const lines = budgetLines(budget, members, fixed, bill);
            const printedExact = /^x ≤ \((\d+) − (\d+)\) ÷ (\d+) = (.+)$/u.exec(lines.divide);
            assert.ok(printedExact, `the budget card must print the division it performs: ${lines.divide}`);
            assert.equal(Number(printedExact[1]), budget);
            assert.equal(Number(printedExact[2]), fixed);
            assert.equal(Number(printedExact[3]), members);
            const bound = parseBound(printedExact[4]);
            assert.equal(bound.num * members, (budget - fixed) * bound.den, `the printed bound ${printedExact[4]} must equal (${budget} − ${fixed}) / ${members} exactly`);
            const printedMost = /^whole dollars: at most \$(\d+)$/u.exec(lines.conclusion);
            assert.ok(printedMost, `the budget card must print its answer: ${lines.conclusion}`);
            assert.equal(Number(printedMost[1]), k, "the printed answer is the largest whole-dollar ticket that fits");
            assert.ok(k * bound.den <= bound.num, "the printed answer is not larger than the printed bound");
            assert.ok((k + 1) * bound.den > bound.num, "the printed answer is the printed bound rounded down, not further");
            assert.equal(lines.inequality, `${members}x + ${fixed} ≤ ${budget}`);
            assert.ok(lines.rounding.includes(printedExact[4]) && lines.rounding.includes(`$${k}`), `the rounding sentence must name both numbers: ${lines.rounding}`);
            assert.equal(exactBoundText(budget, members, fixed), printedExact[4]);
            assert.ok(lines.fits.includes(bill < budget ? `with $${budget - bill} to spare` : bill === budget ? "uses the budget exactly" : `runs $${bill - budget} over the budget`), lines.fits);
            assert.equal(bill <= budget, ticket <= k, "the fits/over readout agrees with the inequality");
          }
        }
      }
    }
  }

  assert.equal(states, 5 * 12 * 7 * 5);
  assert.equal(budgetStates, 5 * 12 * 7 * 5 * 10);
});

test("the printed bound is exact wherever the division does not come out even", () => {
  // written out by hand: (100 - 18)/4 = 20.5, (80 - 15)/6 = 10 5/6, (90 - 20)/5 = 14, (70 - 12)/3 = 19 1/3
  assert.equal(exactBoundText(100, 4, 18), "20.5");
  assert.equal(exactBoundText(80, 6, 15), "10 5/6");
  assert.equal(exactBoundText(90, 5, 20), "14");
  assert.equal(exactBoundText(70, 3, 12), "19 1/3");
  assert.equal(exactBoundText(100, 4, 19), "20.25");
  assert.equal(exactBoundText(100, 4, 17), "20.75");
  // the default state the student first sees: 4x + 18 <= 100 gives x <= 20.5, and $20 is the largest whole-dollar ticket
  const start = budgetLines(100, 4, fixedPart(4, 3, 6), linearTotal(4, 9, 3, 6));
  assert.equal(fixedPart(4, 3, 6), 18);
  assert.equal(start.inequality, "4x + 18 ≤ 100");
  assert.equal(start.divide, "x ≤ (100 − 18) ÷ 4 = 20.5");
  assert.equal(start.conclusion, "whole dollars: at most $20");
  assert.equal(start.rounding, "A ticket price is a whole number of dollars, so 20.5 rounds down to $20.");
  assert.equal(start.fits, "The $54 bill fits, with $46 to spare.");
  assert.equal(4 * 20 + 18, 98);
  assert.ok(98 <= 100 && 4 * 21 + 18 > 100);
});

test("worked example values and the steps the student reads match independent arithmetic", () => {
  assert.deepEqual({ ...WORKED }, { offNum: 1, offDen: 4, credit: 12, paid: 87 });
  const ex = workedExample();

  // 1 - 1/4 = 3/4, i.e. 75% of the tag price is still owed
  assert.equal(ex.keepNum, 3);
  assert.equal(ex.keepDen, 4);
  assert.equal(ex.offPct, 25);
  assert.equal(ex.keepPct, 75);

  // (3/4)b - 12 = 87  ->  (3/4)b = 99  ->  b = 99 * 4/3 = 132
  assert.equal(ex.beforeCredit, 99);
  assert.equal(ex.tag, 132);
  // check by walking the story forwards: 1/4 of 132 is 33, 132 - 33 = 99, 99 - 12 = 87
  assert.equal(ex.off, 33);
  assert.equal(ex.sale, 99);
  assert.equal(ex.check, 87);
  assert.equal(ex.check, WORKED.paid);

  // the six lines the card actually prints, written out here by hand
  const steps = workedSteps();
  assert.equal(steps.length, 6);
  assert.deepEqual(steps.map((s) => s.math), [
    "b − (1/4)b − 12",
    "(3/4)b − 12",
    "(3/4)b − 12 = 87",
    "(3/4)b = 99",
    "b = 99 × 4/3 = 132",
    "132 − 33 = 99, and 99 − 12 = 87"
  ]);
  assert.deepEqual(steps.map((s) => s.title), [
    "Name the unknown",
    "Combine the like terms",
    "Write the equation",
    "Undo the subtraction",
    "Undo the multiplication",
    "Check it"
  ]);
  assert.equal(steps[1].note, "b and (1/4)b are like terms: b − (1/4)b = (1 − 1/4)b = (3/4)b. The rewrite says you pay 75% of the tag price, then use the credit.");
  assert.equal(steps[5].note, "1/4 of 132 is 33, so the sale price is $99; the credit leaves $87, exactly what the receipt says.");
});

test("the Try it question has exactly one correct expression and it is the marked answer", () => {
  assert.deepEqual({ ...TRY }, { outer: 5, inner: 2, plus: 3, minus: 4 });
  assert.equal(TRY_OPTIONS.length, 4);

  // 5(2x + 3) - 4x = 10x + 15 - 4x = 6x + 15
  for (const x of [-5, -1, 0, 1, 3, 10]) {
    assert.equal(tryTarget(x), 6 * x + 15);
    // the distributed form of the printed question, which is a different expression from the helper's body
    assert.equal(tryTarget(x), (TRY.outer * TRY.inner - TRY.minus) * x + TRY.outer * TRY.plus);
  }
  assert.equal(TRY_OPTIONS.filter(matchesTarget).length, 1);
  assert.equal(TRY_ANSWER, 2);
  assert.equal(TRY_OPTIONS[TRY_ANSWER].m, 6);
  assert.equal(TRY_OPTIONS[TRY_ANSWER].b, 15);
  for (let i = 0; i < TRY_OPTIONS.length; i += 1) {
    if (i === TRY_ANSWER) continue;
    const o = TRY_OPTIONS[i];
    assert.notEqual(o.m * 1 + o.b, tryTarget(1), `distractor ${o.m}x + ${o.b} must differ from the target at x = 1`);
  }
});

test("lesson source obeys the house rules", () => {
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = new Set(
    [...source.matchAll(/\b((?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/gu)].map((m) => m[1])
  );
  assert.ok(cited.size > 0, "the lesson must cite its standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const id of BRIEF_STANDARDS) assert.ok(mathCheck.includes(`(${id})`), `Math check must cite ${id}`);
  // the Math check quotes the same exact bound and the same rounded answer the budget card prints
  assert.ok(mathCheck.includes("{bl.exact}") && mathCheck.includes("{bl.most}"), "the Math check must reuse the budget card's own numbers");

  // the budget card renders the tested strings, so the derivation and the answer cannot drift apart
  for (const line of ["{bl.inequality}", "{bl.divide}", "{bl.conclusion}", "{bl.rounding}", "{bl.fits}"]) {
    assert.ok(source.includes(line), `the budget card must render ${line}`);
  }
  assert.ok(source.includes("{chrome.budgetX}"), "the figure must draw the budget line");

  const svgs = [...source.matchAll(/<svg\b[^>]*>/gu)].map((m) => m[0]);
  assert.equal(svgs.length, 1);
  for (const tag of svgs) {
    assert.match(tag, /viewBox=/u);
    assert.match(tag, /role="img"/u);
    assert.match(tag, /aria-label=/u);
  }

  // the mapped Try-it choice, Next step, Start over, and the two Stepper buttons
  const buttons = [...source.matchAll(/<button\b[^>]*>/gu)].map((m) => m[0]);
  assert.equal(buttons.length, 5);
  for (const tag of buttons) assert.match(tag, /type="button"/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{pick === i\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  // green is the "verified" colour of the shared Math check badge, so a wrong pick must never be painted green
  assert.ok(!/i === TRY_ANSWER \? ACCENT : FIXED_COLOR/u.test(source), "a wrong choice must not reuse the success colour");
  assert.match(source, /i === TRY_ANSWER \? ACCENT : MISS_COLOR/u);

  assert.doesNotMatch(source, /[⺀-鿿豈-﫿＀-￯]/u, "no CJK characters");
  for (const forbidden of ["Math.random", "fetch(", "localStorage", "sessionStorage", "<form", "dangerouslySetInnerHTML", "next/image"]) {
    assert.ok(!source.includes(forbidden), `${forbidden} is forbidden`);
  }
  for (const internal of ["Codex", "S18", "QA", "candidate", "us-ca-math", "topicId"]) {
    assert.ok(!source.includes(internal), `internal identifier ${internal} must not appear`);
  }
});
