import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import {
  CONTROLS,
  EXAMPLE,
  N_MAX,
  PAD_B,
  PAD_L,
  PAD_R,
  PAD_T,
  SVG_H,
  SVG_W,
  TRY,
  axisMax,
  exactShirts,
  formatFraction,
  gcd,
  labelBaseline,
  modelText,
  mostShirts,
  pointLabel,
  scaleX,
  scaleY,
  shirtWord,
  solveChain,
  solvedForShirts,
  totalCost,
  tryItOptions,
  undoWords,
  workedExample
} from "./ca-g9-ch01-equations-context";

const SLUG = "ca-g9-ch01-equations-context";
const BRIEF_STANDARDS = ["A-CED.1", "A-CED.2", "A-CED.3", "A-CED.4", "N-RN.1", "N-RN.2", "N-RN.3"];
const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
const sourceFile = ts.createSourceFile(`${SLUG}.tsx`, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

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

function attributeNumber(node: Opening, name: string): number | null {
  const init = attribute(node, name)?.initializer;
  if (init && ts.isJsxExpression(init) && init.expression && ts.isNumericLiteral(init.expression)) return Number(init.expression.text);
  return null;
}

function attributeIdentifier(node: Opening, name: string): string | null {
  const init = attribute(node, name)?.initializer;
  if (init && ts.isJsxExpression(init) && init.expression && ts.isIdentifier(init.expression)) return init.expression.text;
  return null;
}

function line(node: ts.Node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

const TEXT_HALF_WIDTH = 30; // generous width of a "$280"-style label at 12px

function assertInside(label: string, x: number, y: number, margin: number) {
  assert.ok(x - margin >= 0 && x + margin <= SVG_W, `${label}: x=${x} (margin ${margin}) leaves the ${SVG_W}px viewBox`);
  assert.ok(y - margin >= 0 && y + margin <= SVG_H, `${label}: y=${y} (margin ${margin}) leaves the ${SVG_H}px viewBox`);
}

test("the scale functions map the declared plot corners exactly", () => {
  assert.equal(scaleX(0), PAD_L);
  assert.equal(scaleX(N_MAX), SVG_W - PAD_R);
  for (const yMax of [100, 150, 200, 250, 300]) {
    assert.equal(scaleY(0, yMax), SVG_H - PAD_B);
    assert.equal(scaleY(yMax, yMax), PAD_T);
  }
  assert.equal(N_MAX, CONTROLS.shirts.max);
  assert.ok(PAD_L - 8 - 26 >= 0, "y-axis tick labels ($300 at 11px) need room left of the axis");
  assert.ok(SVG_W - PAD_R - 70 >= PAD_L, "the budget label needs room inside the plot at the right edge");
});

test("every reachable control state keeps the figure true and inside its viewBox", () => {
  let states = 0;
  for (let fee: number = CONTROLS.fee.min; fee <= CONTROLS.fee.max; fee += CONTROLS.fee.step) {
    for (let rate: number = CONTROLS.rate.min; rate <= CONTROLS.rate.max; rate += CONTROLS.rate.step) {
      for (let budget: number = CONTROLS.budget.min; budget <= CONTROLS.budget.max; budget += CONTROLS.budget.step) {
        // Solving fee + rate·n = budget: exact reduced fraction, largest whole order, and the displayed chains.
        const f = exactShirts(fee, rate, budget);
        const where0 = `fee=${fee} rate=${rate} budget=${budget}`;
        assert.ok(Number.isInteger(f.n) && Number.isInteger(f.d) && f.d >= 1, where0);
        assert.equal(gcd(f.n, f.d), 1, `${where0}: fraction must be reduced`);
        assert.equal(f.n * rate, (budget - fee) * f.d, `${where0}: n/d must equal (budget - fee)/rate`);
        assert.equal(fee * f.d + rate * f.n, budget * f.d, `${where0}: fee + rate·(n/d) must equal budget`);
        assert.ok(f.n > 0, `${where0}: the budget always exceeds the setup fee in this grid`);

        const most = mostShirts(fee, rate, budget);
        assert.ok(Number.isInteger(most) && most >= 1, `${where0}: most=${most}`);
        assert.ok(fee + rate * most <= budget, `${where0}: ${most} shirts must fit the budget`);
        assert.ok(fee + rate * (most + 1) > budget, `${where0}: ${most + 1} shirts must not fit`);
        assert.ok(most * f.d <= f.n && (most + 1) * f.d > f.n, `${where0}: most must be the floor of n/d`);
        assert.ok(budget - (fee + rate * most) < rate, `${where0}: leftover money is less than one more shirt`);

        const shown = formatFraction(f);
        if (f.d === 1) assert.equal(shown, `${f.n}`, where0);
        else if (100 % f.d === 0) {
          assert.ok(shown.startsWith(`${f.n}/${f.d} = `), `${where0}: ${shown}`);
          assert.equal(Math.round(Number(shown.split(" = ")[1]) * 100), (f.n * 100) / f.d, `${where0}: ${shown}`);
        } else {
          assert.equal(shown, `${f.n}/${f.d} (about ${(f.n / f.d).toFixed(2)})`, where0);
        }

        const model = fee === 0 ? `${rate}n` : `${fee} + ${rate}n`;
        assert.equal(modelText(fee, rate), model, where0);
        assert.equal(solvedForShirts(fee, rate), fee === 0 ? `n = C ÷ ${rate}` : `n = (C − ${fee}) ÷ ${rate}`, where0);
        assert.equal(undoWords(fee, rate), fee === 0 ? `divide both sides by ${rate}` : `subtract ${fee} from both sides, then divide by ${rate}`, where0);
        for (const sign of ["=", "≤"] as const) {
          const chain = solveChain(fee, rate, budget, sign);
          const tail = `${rate}n ${sign} ${budget - fee} → n ${sign} ${shown}`;
          assert.equal(chain, fee === 0 ? tail : `${model} ${sign} ${budget} → ${tail}`, `${where0} ${sign}`);
        }

        // Drawing: axis scale and every painted element, for every order size.
        const lineEnd = fee + rate * N_MAX;
        const yMax = axisMax(Math.max(budget, lineEnd));
        assert.ok(yMax >= budget && yMax >= lineEnd && yMax % 50 === 0 && yMax >= 100, `${where0}: yMax=${yMax}`);
        assert.ok(Number.isInteger(yMax / 5), `${where0}: grid labels must be whole dollars`);
        assertInside(`${where0} line start`, scaleX(0), scaleY(fee, yMax), 2);
        assertInside(`${where0} line end`, scaleX(N_MAX), scaleY(lineEnd, yMax), 2);
        assertInside(`${where0} budget line`, PAD_L, scaleY(budget, yMax), 1);
        const goalBaseline = labelBaseline(scaleY(budget, yMax));
        assert.ok(goalBaseline - 10 >= 0 && goalBaseline <= SVG_H - 4, `${where0}: budget label baseline ${goalBaseline}`);
        const crossing = f.n / f.d;
        const bandRight = scaleX(Math.min(crossing, N_MAX));
        assert.ok(bandRight >= scaleX(0) && bandRight <= SVG_W - PAD_R, `${where0}: feasible band right edge ${bandRight}`);
        assert.ok(scaleY(budget, yMax) >= PAD_T && scaleY(0, yMax) <= SVG_H, `${where0}: feasible band vertical extent`);
        if (crossing <= N_MAX) assertInside(`${where0} crossing marker`, scaleX(crossing), scaleY(budget, yMax), 6);

        for (let shirts: number = CONTROLS.shirts.min; shirts <= CONTROLS.shirts.max; shirts += CONTROLS.shirts.step) {
          states += 1;
          const where = `${where0} shirts=${shirts}`;
          const cost = totalCost(fee, rate, shirts);
          assert.equal(cost, fee + rate * shirts, where);
          // The "within budget" verdict agrees with the inequality's whole-number solution set.
          assert.equal(cost <= budget, shirts <= most, `${where}: verdict must match n ≤ ${most}`);
          assert.equal(shirtWord(shirts), shirts === 1 ? "shirt" : "shirts", where);
          assertInside(`${where} current point`, scaleX(shirts), scaleY(cost, yMax), 7);
          const label = pointLabel(shirts, cost, yMax);
          const labelLeft = label.anchor === "end" ? label.x - TEXT_HALF_WIDTH : label.x;
          const labelRight = label.anchor === "end" ? label.x : label.x + TEXT_HALF_WIDTH;
          assert.ok(labelLeft >= 0 && labelRight <= SVG_W, `${where}: point label x`);
          assert.ok(label.y - 10 >= 0 && label.y <= SVG_H, `${where}: point label y=${label.y}`);
        }
      }
    }
  }
  assert.equal(states, 9 * 9 * 15 * 21);
});

test("worked example values recompute independently from the three constants", () => {
  assert.deepEqual(EXAMPLE, { fee: 45, rate: 6.5, paid: 175 });
  const ex = workedExample();
  // Step 4: 45 + 6.5m = 175  ->  6.5m = 175 - 45 = 130
  assert.equal(175 - 45, 130);
  assert.equal(ex.afterFee, 130);
  // Step 5: m = 130 / 6.5 = 20 (exact: 6.5 × 20 = 130)
  assert.equal(6.5 * 20, 130);
  assert.equal(130 / 6.5, 20);
  assert.equal(ex.meals, 20);
  assert.ok(Number.isInteger(ex.meals), "the meal count must be a whole number");
  // Step 6: 45 + 6.5 × 20 = 45 + 130 = 175
  assert.equal(45 + 130, 175);
  assert.equal(ex.check, 175);
  assert.equal(ex.check, EXAMPLE.paid);
  // The step-6 display multiplies rate × meals in code; it must be the same 130.
  assert.equal(EXAMPLE.rate * ex.meals, 130);
});

test("the Try it correct option is the only statement equivalent to 18 + 7b ≤ 60", () => {
  assert.deepEqual(TRY, { kit: 18, bag: 7, money: 60 });
  const { options, correct, most } = tryItOptions();
  assert.equal(options.length, 4);
  assert.ok(correct >= 0 && correct < options.length);
  assert.equal(options[correct].text, "18 + 7b ≤ 60");
  // (60 - 18) / 7 = 42 / 7 = 6, exactly, so the explanation may print "b ≤ 6"
  assert.equal(60 - 18, 42);
  assert.equal(42 % 7, 0);
  assert.equal(42 / 7, 6);
  assert.equal(most, 6);
  assert.ok(18 + 7 * 6 <= 60 && 18 + 7 * 7 > 60, "6 bags fit, 7 do not");
  const counts = Array.from({ length: 21 }, (_, b) => b);
  options.forEach((o, i) => {
    const equivalent = counts.every((b) => o.holds(b) === (18 + 7 * b <= 60));
    assert.equal(equivalent, i === correct, `option ${i} (${o.text})`);
  });
  assert.equal(new Set(options.map((o) => o.text)).size, 4, "all four choices must read differently");
});

test("formatFraction, exactShirts and mostShirts agree on spot values", () => {
  assert.deepEqual(exactShirts(20, 8, 150), { n: 65, d: 4 });
  assert.equal(formatFraction(exactShirts(20, 8, 150)), "65/4 = 16.25");
  assert.equal(formatFraction(exactShirts(0, 5, 100)), "20");
  assert.equal(formatFraction(exactShirts(10, 4, 60)), "25/2 = 12.5");
  assert.equal(formatFraction(exactShirts(5, 6, 60)), "55/6 (about 9.17)");
  assert.equal(mostShirts(20, 8, 150), 16);
  assert.equal(mostShirts(0, 5, 100), 20);
  assert.equal(mostShirts(40, 12, 60), 1);
  assert.equal(mostShirts(50, 12, 60), 0);
});

test("lesson source honors the authoring contract", () => {
  assert.ok(source.startsWith('"use client";'), "file must start with the client directive");
  assert.doesNotMatch(source, /[　-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|dangerouslySetInnerHTML|<form|next\/image/u);

  const cited = [...source.matchAll(/\b(?:[K1-8]\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.\d+)\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the lesson must cite its standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const id of ["A-CED.1", "A-CED.2", "A-CED.3", "A-CED.4"]) assert.ok(mathCheck.includes(`(${id})`), `Math check must cite ${id}`);

  const svgs = openings("svg");
  assert.equal(svgs.length, 1);
  for (const svg of svgs) {
    assert.ok(attribute(svg, "viewBox"), `svg at line ${line(svg)} needs a viewBox`);
    assert.ok(attribute(svg, "role"), `svg at line ${line(svg)} needs role="img"`);
    assert.ok(attribute(svg, "aria-label"), `svg at line ${line(svg)} needs an aria-label`);
  }

  const buttons = openings("button");
  // Source-level openings: two inside Stepper, the disclosure button, Start over, and the mapped choice button.
  assert.equal(buttons.length, 5, "stepper pair, disclosure, reset and choice buttons expected");
  for (const button of buttons) {
    const init = attribute(button, "type")?.initializer;
    assert.ok(init && ts.isStringLiteral(init) && init.text === "button", `button at line ${line(button)} needs type="button"`);
  }

  // Inline min/max literals on every control must agree with the exported CONTROLS grid the tests enumerate.
  const steppers = openings("Stepper");
  assert.equal(steppers.length, 3);
  for (const stepper of steppers) {
    const name = attributeIdentifier(stepper, "value") as keyof typeof CONTROLS | null;
    assert.ok(name && name in CONTROLS, `Stepper at line ${line(stepper)} must bind a declared control`);
    const declared = CONTROLS[name as keyof typeof CONTROLS];
    assert.equal(attributeNumber(stepper, "min"), declared.min, `${name} min`);
    assert.equal(attributeNumber(stepper, "max"), declared.max, `${name} max`);
    assert.equal(attributeNumber(stepper, "step") ?? 1, declared.step, `${name} step`);
  }
  const ranges = openings("input");
  assert.equal(ranges.length, 1);
  assert.equal(attributeIdentifier(ranges[0], "value"), "shirts");
  assert.equal(attributeNumber(ranges[0], "min"), CONTROLS.shirts.min);
  assert.equal(attributeNumber(ranges[0], "max"), CONTROLS.shirts.max);

  // The disclosure button controls a real element, and the choice buttons announce their pressed state.
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /<ol id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{pick === i\}/u);
});
