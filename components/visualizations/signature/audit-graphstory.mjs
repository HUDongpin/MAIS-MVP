/* ============================================================================
   audit-graphstory.mjs — structural proof for GraphStoryLab.jsx
   (8.F.B.5 · qualitative graphs; shape as meaning; no formula ever).

   Pattern (per the sibling audits): slice-and-eval the shipped model.
   There are no numbers to prove — the correctness surface is structural,
   and it is patrolled: silhouettes are DERIVED from clauses, pairwise
   distinct, never dip below zero; the hill compiles to one unbroken rise
   and the flask to a single accelerating curve; the capstone letters are
   reproduced by an independent sort; the gates are exhausted; and the
   refusals — above all, NO EQUATION ANYWHERE — are grep-enforced.

   Run:  node audit-graphstory.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./GraphStoryLab.jsx', import.meta.url));
const src = readFileSync(PATH, 'utf8');

let pass = 0;
let fail = 0;
const bad = [];
function check(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    if (bad.length < 30) bad.push(msg);
  }
}

/* ---------------------------------------------------------------------------
   1. SLICE AND EVAL the shipped model.
   ------------------------------------------------------------------------- */
const importAt = src.indexOf("import { useCallback");
const compAt = src.indexOf('export default function GraphStoryLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, SEGS, STORIES, storyIds, silhouetteOf,
            silhouetteText, heightsOf, makeCase, candIdsOf, orderedCandsOf, LETTERS,
            shapeTruth, Y_CHIPS, axisTruth, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, SEGS, STORIES, storyIds, silhouetteOf, silhouetteText, heightsOf, makeCase,
  candIdsOf, orderedCandsOf, LETTERS, shapeTruth, Y_CHIPS, axisTruth, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE STORIES — silhouettes derived, distinct, and physically sane.
   ------------------------------------------------------------------------- */
check(storyIds.length === 5, 'five stories');
for (const id of storyIds) {
  const st = STORIES[id];
  check(st.clauses.length >= 1, `${id}: has clauses`);
  for (const c of st.clauses) {
    check(!!SEGS[c.seg], `${id}: clause piece "${c.seg}" exists in the vocabulary`);
    check(typeof c.text === 'string' && c.text.length > 5, `${id}: clause has a sentence`);
  }
  /* the silhouette is the clause map — derived, not stored */
  check(
    JSON.stringify(silhouetteOf(st)) === JSON.stringify(st.clauses.map((c) => c.seg)),
    `${id}: silhouette derived from clauses`
  );
  /* the height never dips below the floor */
  const hs = heightsOf(st);
  check(hs[0] === 0, `${id}: starts at the floor`);
  check(hs.every((h) => h >= 0), `${id}: never dips below zero`);
}
/* pairwise distinct silhouettes — the capstone depends on it */
for (let i = 0; i < storyIds.length; i++)
  for (let j = i + 1; j < storyIds.length; j++) {
    check(
      silhouetteText(STORIES[storyIds[i]]) !== silhouetteText(STORIES[storyIds[j]]),
      `${storyIds[i]} vs ${storyIds[j]}: silhouettes distinct`
    );
  }
/* the famous hill: one unbroken rise, and its text says so */
{
  const segs = silhouetteOf(STORIES.hill);
  check(segs.every((s) => s === segs[0]) && SEGS[segs[0]].dy > 0, 'the hill compiles to one steady rise');
  check(silhouetteText(STORIES.hill) === 'rises gently the whole way', 'the hill’s silhouette says the whole way');
  check(STORIES.hill.clauses.length === 3, 'the hill has three clauses — near side, top, far side');
}
/* the flask: a single accelerating curve */
{
  const segs = silhouetteOf(STORIES.flask);
  check(segs.length === 1 && SEGS[segs[0]].curve === 1 && SEGS[segs[0]].dy > 0, 'the flask is one accelerating rise');
  check(silhouetteText(STORIES.flask) === 'rises ever faster the whole way', 'the flask’s silhouette text');
}
/* the walk and the U-turn read as quoted */
check(
  silhouetteText(STORIES.walk) === 'rises gently, then holds level, then rises steeply',
  'the walk’s silhouette reads in order'
);
{
  const hs = heightsOf(STORIES.backpack);
  check(hs[2] === 0, 'the backpack story returns exactly home');
}
{
  const hs = heightsOf(STORIES.bath);
  check(hs[hs.length - 1] === 0, 'the bath drains exactly empty');
}
/* the axis vocabulary */
for (const id of storyIds) check(Y_CHIPS.includes(STORIES[id].yLab), `${id}: its axis is a chip`);
check(!storyIds.some((id) => STORIES[id].yLab === 'speed'), '“speed” is never a truth — the standing foil');

/* ---------------------------------------------------------------------------
   3. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!STORIES[s.story], `step ${i} story exists`);
  check(
    s.hiSeg === -1 || (Number.isInteger(s.hiSeg) && s.hiSeg < STORIES[s.story].clauses.length),
    `step ${i} highlight valid`
  );
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].story === 'walk' && STEPS[2].story === 'backpack' && STEPS[3].story === 'hill' && STEPS[4].story === 'flask', 'the story ladder');
check(STEPS[0].hiSeg === 1 && STEPS[1].hiSeg === 2 && STEPS[2].hiSeg === 1, 'the highlights aim at the taught pieces');
check(STORIES.walk.clauses[1].seg === 'flat', 'step 1 highlights the flat piece');
check(STORIES.backpack.clauses[1].seg === 'down2', 'step 3 highlights the falling piece');
/* answer keys derived from the model */
check(/^Standing still — time keeps passing/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: flat is waiting');
check(/^Jogging covers more distance each minute/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: steepness is speed');
check(/^Heading home — the distance from home is shrinking/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: falling is direction');
check(/^A straight rising line the whole way/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the hill is scenery');
check(/^Each second’s water spreads across a narrower width/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the bend');
/* the famous misconception is offered and refuted */
check(/A hill shape — up, then down/.test(STEPS[3].choices.join('|')), 'the graph-as-photo belief is offered');
check(/The ground is level there/.test(STEPS[0].choices.join('|')), 'the scenery belief is offered early');
check(/Slowing down/.test(STEPS[2].choices.join('|')), 'the falling-means-slowing belief is offered');

/* ---------------------------------------------------------------------------
   4. CALIBRATION — both rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
for (let i = 0; i < storyIds.length; i++) {
  const cands = candIdsOf(i);
  check(cands.length === 4 && new Set(cands).size === 4, `case ${i}: four distinct candidates`);
  check(cands.includes(storyIds[i]), `case ${i}: the story is among its candidates`);
  const ordered = orderedCandsOf(i);
  /* reproduce the ordering independently */
  const myOrder = cands.slice().sort((a, b) => (silhouetteText(STORIES[a]) < silhouetteText(STORIES[b]) ? -1 : 1));
  check(JSON.stringify(ordered) === JSON.stringify(myOrder), `case ${i}: the lettering is the alphabetical order`);
  const sT = shapeTruth(i);
  const aT = axisTruth(i);
  check(LETTERS.includes(sT), `case ${i}: the shape truth is a letter`);
  check(ordered[LETTERS.indexOf(sT)] === storyIds[i], `case ${i}: the truth letter points at the story`);
  check(Y_CHIPS.includes(aT), `case ${i}: the axis truth is a chip`);
  for (const sp of [null, ...LETTERS, 'bogus']) {
    for (const ap of [null, ...Y_CHIPS]) {
      const should = sp === sT && ap === aT;
      check(isCalibrated(i, sp, ap) === should, `gate: case ${i} shape=${sp} axis=${ap}`);
      check([0, 50, 100].includes(closeness(i, sp, ap)), 'meter quantized');
    }
  }
  const wrongShape = LETTERS.find((x) => x !== sT);
  check(closeness(i, wrongShape, aT) === 0, `case ${i}: the axis without the shape earns nothing`);
}
check(calibChecks(null, 'A', 'water depth').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < storyIds.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   5. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   The first refusal is the bench's whole identity: no formula, ever.
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bformula\b|\bequation\b|f\(x\)|=\s*m?x\b/i, 'NO FORMULA EVER — the bench’s founding refusal'],
  [/vertical.line|one output/i, 'no function-definition machinery (FunctionLab)'],
  [/\bslope\b/i, 'the word slope never appears (LineFunctionLab)'],
  [/\bbars?\b/i, 'no bars (GraphsLab)'],
  [/\bmean\b|\baverage\b/i, 'no statistics of center (MeanLab)'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|packing|leftover|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sin|cos|tan|sqrt)/, 'no trig, no roots — there are no numbers here at all'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const silhouetteOf = \(story\) => story\.clauses\.map\(\(c\) => c\.seg\)/.test(code), 'the silhouette is the clause map');
check(/const shapeTruth = \(i\) => LETTERS\[orderedCandsOf\(i\)\.indexOf\(storyIds\[i\]\)\]/.test(code), 'the letter is found, not stored');
{
  const blockStart = code.indexOf('const STORIES = {');
  const blockEnd = code.indexOf('};', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/silhouette|letter|truth/i.test(block), 'no story ships its own silhouette');
}
/* the drawing reads the model */
check(/silhouetteOf\(story\)/.test(code) && /heightsOf\(story\)/.test(code), 'the stage draws the derived silhouette');
check(/orderedCandsOf\(S\.kase\)/.test(code), 'the capstone grid uses the model’s ordering');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-graphstory: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
