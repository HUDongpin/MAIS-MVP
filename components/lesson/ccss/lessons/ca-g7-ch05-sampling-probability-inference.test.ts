import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  H,
  LEAF_X,
  LEAF_Y,
  LINE_W,
  LINE_Y,
  NODE_NO_Y,
  NODE_R,
  NODE_X,
  NODE_YES_Y,
  N_MAX,
  N_MIN,
  N_STEP,
  PAD,
  ROOT_X,
  ROOT_Y,
  SAMPLE_7,
  SAMPLE_8,
  SCHOOL_SIZES,
  TRY,
  W,
  YES_MIN,
  clampYes,
  estimateForSchool,
  figureLabel,
  labelAnchor,
  likelihoodWord,
  percentText,
  ratioText,
  scaleX,
  students,
  treeOutcomes,
  tryAnswerIndex,
  tryChoices,
  workedExample,
} from "./ca-g7-ch05-sampling-probability-inference";

const SLUG = "ca-g7-ch05-sampling-probability-inference";
const BRIEF_STANDARDS = [
  "7.SP.A.1", "7.SP.A.2", "7.SP.B.3", "7.SP.B.4",
  "7.SP.C.5", "7.SP.C.6", "7.SP.C.7", "7.SP.C.8",
];
/** Generous upper bound on the widest marker label, "P(yes) = 40/40 = 1.00", at fontSize 11. */
const LABEL_W = 150;

function checkRatioText(num: number, den: number, places: number) {
  const text = ratioText(num, den, places);
  const match = /^([=≈]) (-?[\d.]+)$/u.exec(text);
  assert.ok(match, `ratioText(${num}, ${den}, ${places}) = "${text}" is malformed`);
  const shown = Number(match[2]);
  const truth = num / den;
  assert.ok(Math.abs(shown - truth) <= 0.5 * 10 ** -places + 1e-12, `${text} misreports ${num}/${den}`);
  const terminates = (num * 10 ** places) % den === 0;
  assert.equal(match[1], terminates ? "=" : "≈");
  if (terminates) assert.ok(Math.abs(shown - truth) < 1e-12, `${text} claims to be exact but is not`);
}

function checkPercentText(num: number, den: number) {
  const text = percentText(num, den);
  const match = /^([=≈]) ([\d.]+)%$/u.exec(text);
  assert.ok(match, `percentText(${num}, ${den}) = "${text}" is malformed`);
  const shown = Number(match[2]);
  const truth = (num * 100) / den;
  assert.ok(Math.abs(shown - truth) <= 0.05 + 1e-12, `${text} misreports ${num}/${den}`);
  if (match[1] === "=") assert.ok(Math.abs(shown - truth) < 1e-9, `${text} claims to be exact but is not`);
}

test("every reachable (sample size, yes count, school size) state keeps the figure true and inside the viewBox", () => {
  assert.deepEqual([N_MIN, N_MAX, N_STEP, YES_MIN], [10, 40, 10, 0]);
  assert.deepEqual([...SCHOOL_SIZES], [360, 600, 840]);
  assert.deepEqual([W, H, PAD, LINE_W, LINE_Y], [520, 330, 46, 428, 58]);
  assert.equal(LINE_W, W - 2 * PAD);
  assert.ok(LINE_Y - 16 - 11 >= 0, "the marker label sits below the top edge");
  assert.equal(students(1), "1 student");
  assert.equal(students(0), "0 students");
  assert.equal(students(12), "12 students");

  // Fixed tree geometry is inside the viewBox, with room for the leaf rows and the total line.
  for (const [x, y] of [[ROOT_X, ROOT_Y], [NODE_X, NODE_YES_Y], [NODE_X, NODE_NO_Y]] as const) {
    assert.ok(x - NODE_R >= 0 && x + NODE_R <= W && y - NODE_R >= 0 && y + NODE_R <= H);
  }
  assert.equal(LEAF_Y.length, 4);
  for (const y of LEAF_Y) assert.ok(y - 5 >= 0 && y + 5 <= H, `leaf row ${y} is inside the viewBox`);
  assert.ok(LEAF_X + 12 < W - PAD, "the leaf wording starts left of the right-aligned fraction");
  assert.ok(322 + 4 <= H, "the total line fits above the bottom edge");

  let states = 0;
  for (let n = N_MIN; n <= N_MAX; n += N_STEP) {
    // Every school size divides evenly by every sample size, so no estimate ever needs rounding.
    for (const school of SCHOOL_SIZES) assert.equal(school % n, 0);
    // A yes count left over from a bigger sample is pulled back into range, never past it.
    for (let raw = -3; raw <= N_MAX + 3; raw += 1) {
      const c = clampYes(raw, n);
      assert.ok(c >= 0 && c <= n);
      assert.equal(c, Math.min(Math.max(0, raw), n));
    }

    for (let yes = 0; yes <= n; yes += 1) {
      const no = n - yes;
      const p = yes / n;

      // The marker never leaves the scale, and its label is anchored so the text stays in the viewBox.
      const x = scaleX(p);
      assert.ok(x >= PAD && x <= W - PAD, `marker x ${x} for ${yes}/${n}`);
      assert.equal(x, PAD + (yes / n) * (W - 2 * PAD));
      const anchor = labelAnchor(p);
      if (anchor === "start") assert.ok(x + LABEL_W <= W);
      else if (anchor === "end") assert.ok(x - LABEL_W >= 0);
      else assert.ok(x - LABEL_W / 2 >= 0 && x + LABEL_W / 2 <= W);

      // 0 to 1 in words, decided by integers so no rounding can flip it.
      const word = likelihoodWord(yes, n);
      if (yes === 0) assert.equal(word, "impossible");
      else if (yes === n) assert.equal(word, "certain");
      else if (yes * 2 === n) assert.equal(word, "as likely as not");
      else assert.equal(word, yes < n / 2 ? "unlikely" : "likely");
      assert.ok(p >= 0 && p <= 1, "a probability never leaves 0 to 1");

      // The two-outcome model is complete: P(yes) + P(no) = 1.
      assert.equal(yes + no, n);

      // Two independent picks: four counts that partition the n x n ordered pairs.
      const outcomes = treeOutcomes(yes, n);
      assert.equal(outcomes.length, 4);
      assert.deepEqual(outcomes.map((o) => o.num), [yes * yes, yes * no, no * yes, no * no]);
      assert.equal(outcomes.reduce((sum, o) => sum + o.num, 0), n * n);
      // (yes + no)^2 expanded is the same partition, computed a different way.
      assert.equal(yes * yes + 2 * yes * no + no * no, n * n);
      for (const o of outcomes) assert.ok(o.num >= 0 && o.num <= n * n);
      assert.deepEqual(outcomes.map((o) => o.second), [yes, no, yes, no]);

      checkRatioText(yes, n, 2);
      checkRatioText(no, n, 2);
      checkRatioText(yes * yes, n * n, 3);
      checkPercentText(yes, n);

      const label = figureLabel(yes, n);
      assert.ok(label.includes(`${yes} out of ${n} marked on it`));
      assert.ok(label.includes(`${yes * yes}, ${yes * no}, ${no * yes} and ${no * no} add to ${n * n}`));

      for (const school of SCHOOL_SIZES) {
        states += 1;
        const estimate = estimateForSchool(yes, n, school);
        // The estimate is exactly the sample fraction of the school, and always a whole count.
        assert.ok(Number.isInteger(estimate), `${yes}/${n} of ${school} must be a whole number`);
        assert.equal(estimate * n, yes * school);
        assert.equal(estimate, yes * (school / n));
        assert.ok(estimate >= 0 && estimate <= school);
        // Scaling up a bigger fraction never predicts fewer students.
        if (yes > 0) assert.ok(estimate > estimateForSchool(yes - 1, n, school));
      }
    }
  }
  // 11 + 21 + 31 + 41 = 104 (sample size, yes count) pairs, each with 3 school sizes.
  assert.equal(states, 312);
});

test("worked example centers, spreads, and the gap are recomputed independently", () => {
  assert.deepEqual([...SAMPLE_7], [20, 30, 30, 40, 40, 50, 50, 60]);
  assert.deepEqual([...SAMPLE_8], [40, 45, 55, 60, 65, 70, 70, 75]);
  const ex = workedExample();
  assert.equal(ex.size, 8);

  // 20+30+30+40+40+50+50+60 = 320; 320 / 8 = 40.
  assert.equal(ex.sum7, 320);
  assert.equal(ex.mean7, 40);
  // 40+45+55+60+65+70+70+75 = 480; 480 / 8 = 60.
  assert.equal(ex.sum8, 480);
  assert.equal(ex.mean8, 60);

  // Distances from 40: 20,10,10,0,0,10,10,20 -> 80; MAD = 80 / 8 = 10.
  assert.equal(ex.dev7, 20 + 10 + 10 + 0 + 0 + 10 + 10 + 20);
  assert.equal(ex.dev7, 80);
  assert.equal(ex.mad7, 10);
  // Distances from 60: 20,15,5,0,5,10,10,15 -> 80; MAD = 80 / 8 = 10.
  assert.equal(ex.dev8, 20 + 15 + 5 + 0 + 5 + 10 + 10 + 15);
  assert.equal(ex.dev8, 80);
  assert.equal(ex.mad8, 10);

  // 60 - 40 = 20 minutes, and 20 / 10 = 2 MADs.
  assert.equal(ex.gap, 20);
  assert.equal(ex.typicalSpread, 10);
  assert.equal(ex.gapInSpreads, 2);
  assert.ok(Number.isInteger(ex.gapInSpreads), "the displayed multiple must not need rounding");
  // Grade 8 really is the slower group, so the sign of the gap matches the story.
  assert.ok(ex.mean8 > ex.mean7);
});

test("the Try it answer is the square of the sample proportion", () => {
  assert.deepEqual({ ...TRY }, { yes: 15, n: 25 });
  const percents = tryChoices().map((c) => c.percent);
  // 15*10*100/625 = 24; 15*15*100/625 = 36; 15*100/25 = 60; 30*100/25 = 120.
  assert.deepEqual(percents, [24, 36, 60, 120]);
  assert.equal(new Set(percents).size, 4, "the four choices are distinct");
  assert.equal(percents.length, 4);

  const answer = tryAnswerIndex();
  assert.equal(answer, 1);
  // (15/25)^2 = (3/5)^2 = 9/25 = 0.36 = 36%.
  assert.equal(percents[answer], 36);
  assert.ok(Math.abs((15 / 25) * (15 / 25) * 100 - percents[answer]) < 1e-12);
  assert.equal(tryChoices().filter((c) => c.why === "correct").length, 1);
  assert.equal(tryChoices()[answer].why, "correct");
  // The three distractors are all wrong, and the largest one is not even a legal probability.
  for (const [i, c] of tryChoices().entries()) if (i !== answer) assert.notEqual(c.percent, 36);
  assert.ok(percents[3] > 100);
});

test("lesson source cites only brief standards and keeps its markup contract", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");

  const cited = [...source.matchAll(/\b(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+\b/gu)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the Math check must cite standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const must of BRIEF_STANDARDS) assert.ok(cited.includes(must), `${must} is developed but never cited`);

  const svgTags = source.split("<svg").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  assert.equal(svgTags.length, 1);
  for (const tag of svgTags) {
    assert.ok(tag.includes("viewBox"), "every <svg> needs a viewBox");
    assert.ok(tag.includes('role="img"'), "every <svg> needs role=img");
    assert.ok(tag.includes("aria-label"), "every <svg> needs an aria-label computed from state");
  }

  const buttonTags = source.split("<button").slice(1).map((rest) => rest.slice(0, rest.indexOf(">")));
  // School size, Next step, Start over, the mapped Try-it choice, and the stepper's decrease/increase pair.
  assert.equal(buttonTags.length, 6);
  for (const tag of buttonTags) assert.ok(tag.includes('type="button"'), "every <button> needs type=button");

  // Declared inline control bounds match the grid the first test enumerated.
  assert.match(source, /label="Sample size" value=\{n\} min=\{10\} max=\{40\} step=\{10\}/u);
  assert.match(source, /label="Yes answers" value=\{yes\} min=\{0\} max=\{n\} step=\{1\}/u);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/u);
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/u);
  assert.match(source, /disabled=\{value <= min\}/u);
  assert.match(source, /disabled=\{value >= max\}/u);
  // Choice buttons announce the current selection; the worked example is a labelled disclosure.
  assert.match(source, /aria-pressed=\{school === s\}/u);
  assert.match(source, /aria-pressed=\{picked === i\}/u);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);

  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|sessionStorage|<form|dangerouslySetInnerHTML|next\/image/u);
  assert.doesNotMatch(source, /bg-linear-|inset-shadow-|text-shadow-|field-sizing-|not-\[/u, "Tailwind 3.4 only");
});
