import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import {
  CONTROLS,
  EX,
  H,
  PAD_B,
  PAD_L,
  PAD_R,
  PAD_T,
  PLOT_W,
  SEATS,
  TARGETS,
  TRY_AT,
  TRY_LEFT,
  W,
  asNumber,
  averageRate,
  axisDays,
  cupsLeft,
  cupsSold,
  dayFor,
  dayWord,
  evaluateMeaning,
  evaluateText,
  fractionShort,
  fractionText,
  gcd,
  graphAria,
  lastDay,
  markLabel,
  readsAsProduct,
  reduce,
  ruleText,
  scaleX,
  scaleY,
  selloutDay,
  sequence,
  sold,
  solveMeaning,
  solveText,
  tryOptions,
  workedExample
} from "./ca-g9-ch02-function-notation-interpretation";

const SLUG = "ca-g9-ch02-function-notation-interpretation";
const BRIEF_STANDARDS = ["F-BF.3", "F-IF.1", "F-IF.2", "F-IF.3", "F-IF.4", "F-IF.5", "F-IF.6", "F-IF.7", "F-IF.8", "F-IF.9"];
const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
const sourceFile = ts.createSourceFile(`${SLUG}.tsx`, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const PRESALES = [0, 25, 50, 75, 100];
const PER_DAYS = [50, 75, 100, 125, 150];
/** Generous width of the widest marker label ("T(12) = 600" at 11px monospace). */
const LABEL_W = 78;

type Opening = ts.JsxOpeningElement | ts.JsxSelfClosingElement;

function openings(tag: string): Opening[] {
  const found: Opening[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(sourceFile) === tag) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function attribute(node: Opening, name: string): ts.JsxAttribute | undefined {
  const found = node.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sourceFile) === name);
  return found && ts.isJsxAttribute(found) ? found : undefined;
}

function lineOf(node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

test("the declared control grid is exactly the one the test enumerates", () => {
  assert.deepEqual(PRESALES, Array.from({ length: (CONTROLS.presale.max - CONTROLS.presale.min) / CONTROLS.presale.step + 1 }, (_, i) => CONTROLS.presale.min + i * CONTROLS.presale.step));
  assert.deepEqual(PER_DAYS, Array.from({ length: (CONTROLS.perDay.max - CONTROLS.perDay.min) / CONTROLS.perDay.step + 1 }, (_, i) => CONTROLS.perDay.min + i * CONTROLS.perDay.step));
  assert.deepEqual([...TARGETS], [150, 300, 450, 600]);
  assert.equal(SEATS, 600);
});

test("the scales map the declared plot corners exactly", () => {
  assert.equal(scaleY(0), H - PAD_B);
  assert.equal(scaleY(SEATS), PAD_T);
  assert.equal(scaleY(SEATS / 2), (PAD_T + H - PAD_B) / 2);
  for (const xMax of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    assert.equal(scaleX(0, xMax), PAD_L);
    assert.equal(scaleX(xMax, xMax), W - PAD_R);
  }
  assert.equal(PLOT_W, W - PAD_L - PAD_R);
  assert.ok(PAD_L - 8 - 20 >= 0, "the '600' axis label at 10px needs room left of the axis");
});

test("gcd and reduce return reduced fractions", () => {
  assert.equal(gcd(240, 18), 6);
  assert.equal(gcd(7, 0), 7);
  assert.deepEqual(reduce(240, 18), { n: 40, d: 3 });
  assert.deepEqual(reduce(400, 100), { n: 4, d: 1 });
});

test("every reachable control state keeps the figure true and inside its viewBox", () => {
  let states = 0;
  for (const presale of PRESALES) {
    for (const perDay of PER_DAYS) {
      const where = `presale=${presale} perDay=${perDay}`;

      // --- the sell-out day, computed independently as an exact fraction ----
      const sellout = selloutDay(presale, perDay);
      assert.equal(gcd(sellout.n, sellout.d), 1, `${where}: sell-out fraction must be reduced`);
      assert.equal(presale * sellout.d + perDay * sellout.n, SEATS * sellout.d, `${where}: presale + perDay·(n/d) must be ${SEATS}`);
      assert.ok(sellout.d >= 1 && sellout.d <= 6, `${where}: denominator ${sellout.d}`);

      // --- the last whole day is the floor of that, and the hall is honest --
      const L = lastDay(presale, perDay);
      assert.ok(Number.isInteger(L) && L >= 3, `${where}: last whole day ${L}`);
      assert.ok(presale + perDay * L <= SEATS, `${where}: day ${L} must still fit the hall`);
      assert.ok(presale + perDay * (L + 1) > SEATS, `${where}: day ${L + 1} must overflow the hall`);
      assert.ok(SEATS - (presale + perDay * L) < perDay, `${where}: fewer than one day of seats are left at day ${L}`);
      assert.equal(L, Math.floor(asNumber(sellout)), where);

      const xMax = axisDays(presale, perDay);
      assert.equal(xMax, Math.ceil(asNumber(sellout)), where);
      assert.ok(asNumber(sellout) <= xMax, `${where}: the sell-out point must sit on the drawn axis`);
      assert.ok(scaleX(asNumber(sellout), xMax) <= W - PAD_R + 1e-9, `${where}: sell-out marker leaves the plot`);
      assert.equal(scaleY(SEATS), PAD_T);

      // --- the sequence of whole-day counts --------------------------------
      const seq = sequence(presale, perDay);
      assert.equal(seq.length, L + 1, where);
      for (let i = 0; i <= L; i += 1) {
        assert.equal(seq[i], presale + perDay * i, `${where}: term ${i}`);
        assert.ok(seq[i] <= SEATS, `${where}: term ${i} = ${seq[i]} must fit ${SEATS} seats`);
        if (i > 0) assert.equal(seq[i] - seq[i - 1], perDay, `${where}: consecutive terms differ by the daily total`);
      }
      assert.equal(seq[0], presale, `${where}: T(0) is the presale total`);
      assert.equal(ruleText(presale, perDay), presale === 0 ? `${perDay}d` : `${presale} + ${perDay}d`, where);

      // --- average rate of change is the daily total on EVERY interval ------
      for (let a = 0; a <= L; a += 1) {
        for (let b = a + 1; b <= L; b += 1) {
          assert.equal(averageRate(presale, perDay, a, b), perDay, `${where}: average rate on [${a}, ${b}]`);
        }
      }

      // --- evaluating: every whole day in the domain ------------------------
      for (let day = 0; day <= L; day += 1) {
        const count = presale + perDay * day; // recomputed, not read back from sold()
        assert.equal(sold(presale, perDay, day), count, `${where} day=${day}`);
        assert.ok(count >= 0 && count <= SEATS, `${where} day=${day}: ${count} tickets must fit the hall`);

        const expected = presale === 0 ? `T(${day}) = ${perDay} · ${day} = ${count}` : `T(${day}) = ${presale} + ${perDay} · ${day} = ${count}`;
        assert.equal(evaluateText(presale, perDay, day), expected, `${where} day=${day}`);

        const meaning = evaluateMeaning(presale, perDay, day);
        if (count === SEATS) assert.ok(meaning.includes(`every one of the ${SEATS} seats is taken`), `${where} day=${day}: ${meaning}`);
        else assert.ok(meaning.includes(`${count} of the ${SEATS} seats are taken and ${SEATS - count} are still open`), `${where} day=${day}: ${meaning}`);
        assert.ok(!/\b1 (days|seats)\b/.test(meaning), `${where} day=${day}: plural agreement in "${meaning}"`);
        assert.equal(dayWord(day), day === 1 ? "day" : "days");

        const x = scaleX(day, xMax);
        const y = scaleY(count);
        assert.ok(x >= PAD_L - 1e-9 && x <= W - PAD_R + 1e-9, `${where} day=${day}: x=${x}`);
        assert.ok(y >= PAD_T - 1e-9 && y <= H - PAD_B + 1e-9, `${where} day=${day}: y=${y}`);
        const label = markLabel(x, y);
        const left = label.anchor === "end" ? label.x - LABEL_W : label.x;
        const right = label.anchor === "end" ? label.x : label.x + LABEL_W;
        assert.ok(left >= 0 && right <= W, `${where} day=${day}: label spans ${left}..${right} outside 0..${W}`);
        assert.ok(label.y >= 8 && label.y <= H - 4, `${where} day=${day}: label baseline ${label.y}`);

        const aria = graphAria(presale, perDay, "evaluate", day, 300);
        assert.ok(aria.includes(`Reading day ${day} up to the line and across gives ${count} tickets`), `${where} day=${day}: ${aria}`);
        assert.ok(aria.includes(`starts at ${presale} on day 0`) && aria.includes(`climbs ${perDay} tickets a day`), `${where}: ${aria}`);
        assert.ok(aria.includes(`whole days 0 through ${L}`), `${where}: ${aria}`);
        states += 1;
      }

      // --- solving: every milestone the buttons offer ------------------------
      for (const target of TARGETS) {
        const f = dayFor(presale, perDay, target);
        assert.equal(gcd(f.n, f.d), 1, `${where} target=${target}: fraction must be reduced`);
        assert.equal(presale * f.d + perDay * f.n, target * f.d, `${where} target=${target}: presale + perDay·d must be the target`);
        assert.ok(f.n > 0 && f.d >= 1, `${where} target=${target}: d = ${f.n}/${f.d} must be positive`);
        assert.ok(asNumber(f) <= asNumber(sellout) + 1e-9, `${where} target=${target}: the solution must be inside the domain`);
        if (f.d === 1) assert.equal(sold(presale, perDay, f.n), target, `${where} target=${target}: whole-day solution must land on the target`);

        const shown = fractionText(f);
        if (f.d === 1) assert.equal(shown, `${f.n}`, `${where} target=${target}`);
        else if (100 % f.d === 0) {
          assert.ok(shown.startsWith(`${f.n}/${f.d} = `), `${where} target=${target}: ${shown}`);
          assert.equal(Number(shown.split(" = ")[1]), f.n / f.d, `${where} target=${target}: ${shown}`);
        } else {
          assert.equal(shown, `${f.n}/${f.d} (about ${(f.n / f.d).toFixed(2)})`, `${where} target=${target}`);
        }
        assert.equal(fractionShort(f), f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`, `${where} target=${target}`);

        const solveLine = solveText(presale, perDay, target);
        assert.equal(
          solveLine,
          presale === 0 ? `${perDay}d = ${target}, so d = ${shown}` : `${presale} + ${perDay}d = ${target}, so ${perDay}d = ${target - presale} and d = ${shown}`,
          `${where} target=${target}`
        );

        const meaning = solveMeaning(presale, perDay, target);
        if (f.d === 1) assert.ok(meaning.includes(`exactly ${f.n} ${f.n === 1 ? "day" : "days"} into the sale`), `${where} target=${target}: ${meaning}`);
        else {
          const during = Math.ceil(asNumber(f));
          assert.ok(meaning.includes(`partway through day ${during}`), `${where} target=${target}: ${meaning}`);
          assert.ok(sold(presale, perDay, during - 1) < target && sold(presale, perDay, during) > target, `${where} target=${target}: day ${during} must be the day the count crosses`);
        }

        const x = scaleX(asNumber(f), xMax);
        const y = scaleY(target);
        assert.ok(x >= PAD_L - 1e-9 && x <= W - PAD_R + 1e-9, `${where} target=${target}: x=${x}`);
        assert.ok(y >= PAD_T - 1e-9 && y <= H - PAD_B + 1e-9, `${where} target=${target}: y=${y}`);
        const label = markLabel(x, y);
        const left = label.anchor === "end" ? label.x - LABEL_W : label.x;
        const right = label.anchor === "end" ? label.x : label.x + LABEL_W;
        assert.ok(left >= 0 && right <= W, `${where} target=${target}: label spans ${left}..${right}`);
        assert.ok(label.y >= 8 && label.y <= H - 4, `${where} target=${target}: label baseline ${label.y}`);

        const aria = graphAria(presale, perDay, "solve", 0, target);
        assert.ok(aria.includes(`Reading ${target} tickets across to the line and down gives day ${fractionShort(f)}`), `${where} target=${target}: ${aria}`);
        states += 1;
      }
    }
  }
  assert.ok(states >= 200, `expected the whole control grid, saw ${states} states`);
});

test("the worked example's arithmetic is right, step by step", () => {
  const we = workedExample();

  // C(5) = 240 − 18·5
  assert.equal(EX.cups, 240);
  assert.equal(EX.perHour, 18);
  assert.equal(we.gone, 90);
  assert.equal(we.left, 150);
  assert.equal(240 - 18 * 5, 150);
  assert.equal(cupsLeft(EX.at), 240 - 90);

  // C(h) = 60 → 18h = 180 → h = 10
  assert.deepEqual(we.solved, { n: 10, d: 1 });
  assert.equal(EX.cups - EX.target, 180);
  assert.equal(180 / 18, 10);
  assert.equal(cupsLeft(10), 60);

  // C(h) = 0 → h = 240/18 = 40/3
  assert.deepEqual(we.empty, { n: 40, d: 3 });
  assert.equal(18 * 40, 240 * 3); // 240/18 = 40/3, cross-multiplied
  assert.ok(Math.abs(cupsLeft(40 / 3)) < 1e-9);
  assert.equal(fractionText(we.empty), "40/3 (about 13.33)");
  assert.equal(fractionShort(we.empty), "40/3");
  assert.ok(Math.abs(40 / 3 - 13.333333333333334) < 1e-12);

  // average rate of change on [5, 10]
  assert.equal(we.rate, -18);
  assert.equal((60 - 150) / (10 - 5), -18);
  assert.equal(we.rate, -EX.perHour);
});

test("exactly one Try it option is true, and it is the notation read correctly", () => {
  const { options, correct } = tryOptions();
  assert.equal(options.length, 4);
  assert.equal(TRY_AT, 9);
  assert.equal(TRY_LEFT, 78);
  assert.equal(240 - 18 * 9, 78); // recomputed independently of cupsLeft
  assert.equal(options.filter((o) => o.holds).length, 1);
  assert.equal(correct, 1);
  assert.ok(options[correct].text.includes(`After ${TRY_AT} hours, ${TRY_LEFT} cups are still in the cooler.`));

  // the three distractors are false for concrete, checkable reasons
  assert.equal(cupsSold(TRY_AT), 162);
  assert.notEqual(cupsSold(TRY_AT), TRY_LEFT);
  assert.equal(cupsLeft(TRY_LEFT), 240 - 18 * 78);
  assert.notEqual(cupsLeft(TRY_LEFT), TRY_AT);
  assert.equal(readsAsProduct(), false);
  assert.notEqual(cupsLeft(2), cupsLeft(1) * 2);
});

test("the lesson source obeys the structural rules the gates enforce", () => {
  const cited = new Set([...source.matchAll(/\b[A-Z]-[A-Z]{1,3}\.\d+\b/g)].map((m) => m[0]));
  assert.ok(cited.size > 0, "the lesson must cite the standards it develops");
  for (const code of [...cited].sort()) {
    assert.ok(BRIEF_STANDARDS.includes(code), `${code} is not one of this chapter's standards`);
  }
  assert.ok(cited.has("F-IF.1") && cited.has("F-IF.2") && cited.has("F-IF.3"));
  assert.ok(cited.has("F-IF.4") && cited.has("F-IF.5") && cited.has("F-IF.6"));

  const svgs = openings("svg");
  assert.equal(svgs.length, 1);
  for (const svg of svgs) {
    assert.ok(attribute(svg, "viewBox"), `<svg> at line ${lineOf(svg)} needs a viewBox`);
    assert.ok(attribute(svg, "role"), `<svg> at line ${lineOf(svg)} needs role="img"`);
    assert.ok(attribute(svg, "aria-label"), `<svg> at line ${lineOf(svg)} needs an aria-label`);
  }

  const buttons = openings("button");
  assert.ok(buttons.length >= 7, `expected the figure's controls, saw ${buttons.length} buttons`);
  for (const button of buttons) {
    const type = attribute(button, "type");
    assert.equal(type?.initializer && ts.isStringLiteral(type.initializer) ? type.initializer.text : null, "button", `<button> at line ${lineOf(button)} needs type="button"`);
  }

  assert.ok(!/[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/.test(source), "the lesson must be English only");
  assert.ok(!/Math\.random|fetch\(|localStorage|dangerouslySetInnerHTML|<form\b/.test(source));
  assert.ok(/id=\{stepsId\}/.test(source) && /aria-controls=\{stepsId\}/.test(source), "the step-by-step disclosure needs a useId-backed target");
});
