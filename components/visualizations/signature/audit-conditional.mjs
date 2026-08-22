/* ============================================================================
   audit-conditional.mjs — numeric proof for ConditionalLab.jsx
   (S-CP.A.1–5 · the crop; the denominator is the frame).

   Run:  node audit-conditional.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./ConditionalLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function ConditionalLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, gcdOf, fracText, inB, LAYOUTS,
            countOf, countA, countB, countAB, condAgivenB, condBgivenA, probA,
            indepOf, CASES, DENOM_CHIPS, FRAC_CHIPS, askText, labelOf,
            denomTruth, fracTruth, makeCase, calibChecks, closeness,
            isCalibrated, STEPS,
            conditionalCanvasLayout:
              typeof conditionalCanvasLayout === 'function' ? conditionalCanvasLayout : null };`
)();
const {
  CALIB_STEP, fracText, inB, LAYOUTS, countOf, countA, countB, countAB,
  condAgivenB, condBgivenA, probA, indepOf, CASES, DENOM_CHIPS, FRAC_CHIPS,
  askText, labelOf, denomTruth, fracTruth, makeCase, calibChecks, closeness,
  isCalibrated, STEPS, conditionalCanvasLayout,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. MOBILE CANVAS LAYOUT — the learner surface must stay drawable.

   The formal Pixel 5 product run (393 x 727 viewport) yielded a 225 x 380
   stage.  The former fixed `W - 300` reservation therefore made the 10 x 10
   grid -75 px wide and passed a -2.1 radius to CanvasRenderingContext2D.arc.
   Keep that exact failure arithmetic here as the regression's provenance,
   then require the shipped layout to keep every region positive, on-canvas,
   and disjoint at the physical size plus realistic minimum/extreme canaries.
   ------------------------------------------------------------------------- */
const pixel5Stage = { width: 225, height: 380 };
const legacyPixel5Grid = Math.min(pixel5Stage.width - 300, pixel5Stage.height - 52 - 60);
const legacyPixel5Radius = (legacyPixel5Grid / 10) * 0.28;
check(legacyPixel5Grid === -75, 'Pixel 5 provenance: the former grid was exactly -75 px');
check(Math.abs(legacyPixel5Radius - -2.1) < 1e-12, 'Pixel 5 provenance: the former dot radius was exactly -2.1 px');
check(typeof conditionalCanvasLayout === 'function', 'a pure conditionalCanvasLayout geometry contract is shipped');

function boxFitsCanvas(box, width, height) {
  return (
    Number.isFinite(box.x) && Number.isFinite(box.y) &&
    Number.isFinite(box.width) && Number.isFinite(box.height) &&
    box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0 &&
    box.x + box.width <= width + 1e-9 && box.y + box.height <= height + 1e-9
  );
}

if (typeof conditionalCanvasLayout === 'function') {
  const canaries = [
    [152, 240, 'extreme narrow and short stage'],
    [152, 380, 'minimum mobile-width stage'],
    [225, 380, 'physical Pixel 5-derived stage'],
    [320, 380, 'wide mobile stage'],
    [690, 493, 'accepted desktop stage'],
    [1120, 800, 'extreme wide stage'],
  ];

  for (const [width, height, label] of canaries) {
    const layout = conditionalCanvasLayout(width, height);
    check(['compact', 'desktop'].includes(layout.mode), `${label}: layout mode is explicit`);
    check(Number.isFinite(layout.cell) && layout.cell > 0, `${label}: cell is finite and positive`);
    check(Number.isFinite(layout.dotRadius) && layout.dotRadius > 0, `${label}: arc radius is finite and positive`);
    check(boxFitsCanvas(layout.band, width, height), `${label}: band stays on-canvas`);
    check(boxFitsCanvas(layout.grid, width, height), `${label}: 10 x 10 grid stays on-canvas`);
    check(boxFitsCanvas(layout.readout, width, height), `${label}: census readout stays on-canvas`);
    check(layout.grid.y >= layout.band.y + layout.band.height, `${label}: band cannot collide with the grid`);
    if (layout.mode === 'compact') {
      check(
        layout.readout.y >= layout.grid.y + layout.grid.height,
        `${label}: compact readout is stacked below the grid without overlap`
      );
    } else {
      check(
        layout.readout.x >= layout.grid.x + layout.grid.width,
        `${label}: desktop readout remains beside the grid without overlap`
      );
    }
  }

  const pixel5 = conditionalCanvasLayout(pixel5Stage.width, pixel5Stage.height);
  check(pixel5.mode === 'compact', 'physical Pixel 5-derived stage selects compact geometry');
  check(pixel5.dotRadius > 0, 'physical Pixel 5-derived stage can never call arc with a negative radius');

  const desktop = conditionalCanvasLayout(690, 493);
  check(desktop.mode === 'desktop', 'accepted desktop stage preserves desktop geometry');
  check(desktop.grid.x === 30 && desktop.grid.y === 82, 'desktop grid keeps the original origin');
  check(desktop.grid.width === 381 && desktop.cell === 38.1, 'desktop grid keeps the original sizing formula');
  check(desktop.readout.x === 437, 'desktop census keeps the original horizontal anchor');
} else {
  check(false, 'physical Pixel 5-derived stage has a positive shipped arc radius');
  check(false, 'mobile grid and census readout have explicit non-overlapping bounds');
  check(false, 'accepted desktop geometry has an invariant-preserving branch');
}

/* ---------------------------------------------------------------------------
   3. THE FIELD'S LAWS — censuses against brute dot-by-dot enumeration.
   ------------------------------------------------------------------------- */
check(countB() === 50, 'the left block holds exactly 50 dots');
for (const key of Object.keys(LAYOUTS)) {
  /* brute censuses, independent loops */
  let bA = 0;
  let bAB = 0;
  let bBnotA = 0;
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
      const a = LAYOUTS[key].inA(r, c);
      const b = c < 5;
      if (a) bA++;
      if (a && b) bAB++;
      if (b && !a) bBnotA++;
    }
  check(countA(key) === bA, `${key}: A census matches brute`);
  check(countAB(key) === bAB, `${key}: overlap census matches brute`);
  check(bAB + bBnotA === 50, `${key}: the crop partitions cleanly`);
  check(bA === 40, `${key}: every layout posts exactly 40 glowers`);
  /* the formula identity: P(A|B) = P(A∩B)/P(B), by cross-multiplication */
  const [n1, d1] = condAgivenB(key);
  check(n1 === bAB && d1 === 50, `${key}: the crop's fraction is overlap over frame`);
  check(n1 * 100 * 100 === bAB * 100 * 100, `${key}: identity sanity`);
  /* independence law: exact iff cross-multiplication balances */
  check(indepOf(key) === (bAB * 100 === bA * 50), `${key}: independence by integers`);
  /* the product law holds exactly when independent */
  const productHolds = bAB * 100 * 100 === bA * 50 * 100;
  check((bAB * 100 === bA * 50) === productHolds, `${key}: product law tracks independence`);
}
/* the three layouts tell three different stories */
check(indepOf('indep') === true, 'the even field is independent, exactly (20·100 = 40·50)');
check(indepOf('dep') === false && countAB('dep') === 30, 'the left-leaning field is dependent: 30 in the crop');
check(indepOf('avoid') === false && countAB('avoid') === 5, 'the right-leaning field avoids: 5 in the crop');
/* the quoted fractions */
check(fracText(condAgivenB('indep')) === '2/5' && fracText(probA('indep')) === '2/5', 'the crop leaves 2/5 untouched');
check(fracText(condAgivenB('dep')) === '3/5' && fracText(condBgivenA('dep')) === '3/4', 'the reversal pair 3/5 vs 3/4');
check(fracText(condAgivenB('avoid')) === '1/10' && fracText(condBgivenA('avoid')) === '1/8', 'the avoiding pair 1/10 vs 1/8');
check(fracText(condBgivenA('indep')) === '1/2', 'P(left | glow) on the even field is 1/2');
check(20 * 100 === 40 * 50, 'the independence identity, by hand');
check(20 * 5 * 2 === 100 * 2 && 2 * 1 * 100 === 5 * 2 * 20, 'the product law 1/5 = (2/5)(1/2), cross-multiplied');

/* ---------------------------------------------------------------------------
   4. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/40\/100 = 2\/5/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 counts the field');
check(/20\/50 = 2\/5/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 recounts the crop');
check(/\(20\/100\)\/\(50\/100\)/.test(STEPS[1].note), 'step 2 note runs the formula');
check(/20·100 =\s*40·50/.test(STEPS[2].feedback.replace(/\s+/g, ' ')), 'step 3 cross-multiplies');
check(/\(2\/5\)·\(1\/2\)/.test(STEPS[2].feedback), 'step 3 runs the product law');
check(/30\/50 = 3\/5/.test(STEPS[3].q) || /3\/5/.test(STEPS[3].q), 'step 4 posts the moved share');
check(/30\/50 = 3\/5 against 30\/40 = 3\/4/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 poses the reversal');
check(/table bench/.test(STEPS[4].feedback), 'the kinship is cited once');
check(/lurking-variable\s+bench/.test(STEPS[3].note.replace(/\s+/g, ' ')), 'the causation border is ceded');

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!LAYOUTS[s.layout], `step ${i} layout exists`);
  check(['none', 'B', 'A'].includes(s.crop), `step ${i} crop valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].crop === 'none' && STEPS[1].crop === 'B' && STEPS[3].layout === 'dep' && !!STEPS[4].dial, 'the scene ladder; the dial swaps crops');
/* answer keys */
check(/^40\/100 = 2\/5 — a probability here is a SHARE/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key');
check(/^20\/50 = 2\/5 — recount inside the crop/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key');
check(/^Independence — learning a dot is in the left block/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key');
check(/^Dependent — the crop CHANGED the share/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key');
check(/^30\/50 = 3\/5 against 30\/40 = 3\/4/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key');
check(/20\/100 — the glowing left dots over the whole field/.test(STEPS[1].choices.join('|')), 'the stale-denominator error is offered');
check(/conditioning is symmetric/.test(STEPS[4].choices.join('|')), 'the symmetry belief is offered');
check(/glowing causes left-ness/.test(STEPS[2].choices.join('|')), 'the causation leap is offered');

/* ---------------------------------------------------------------------------
   6. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted questions');
const denomsPosted = new Set(CASES.map((_, i) => denomTruth(i)));
const fracsPosted = new Set(CASES.map((_, i) => fracTruth(i)));
check(denomsPosted.has('40') && denomsPosted.has('50'), 'both honest frames are posted');
check(!denomsPosted.has('100'), 'the chip 100 is NEVER a truth — the stale frame is always wrong');
check(DENOM_CHIPS.includes('100'), 'and yet 100 stays on the chips as the standing temptation');
check(FRAC_CHIPS.every((f) => fracsPosted.has(f)), 'every share chip is some case’s truth');
/* the reversal near-miss: same layout, both directions posted */
for (const key of ['indep', 'dep', 'avoid'])
  check(
    CASES.some((c) => c.layout === key && c.ask === 'AgB') && CASES.some((c) => c.layout === key && c.ask === 'BgA'),
    `both crops of ${key} are posted`
  );
for (let i = 0; i < CASES.length; i++) {
  const dT = denomTruth(i);
  const fT = fracTruth(i);
  check(DENOM_CHIPS.includes(dT) && FRAC_CHIPS.includes(fT), `case ${i}: truths are chips`);
  for (const dp of [null, ...DENOM_CHIPS, 'bogus']) {
    for (const fp of [null, ...FRAC_CHIPS]) {
      const should = dp === dT && fp === fT;
      check(isCalibrated(i, dp, fp) === should, `gate: case ${i} d=${dp} f=${fp}`);
      check([0, 50, 100].includes(closeness(i, dp, fp)), 'meter quantized');
    }
  }
  check(closeness(i, '100', fT) === 0, `case ${i}: the stale frame earns nothing, even with the right share`);
  check(labelOf(i).includes(askText(CASES[i].ask)), `case ${i}: label posts the question`);
}
check(calibChecks(null, '50', '2/5').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bVenn\b|overlapping ovals|\bblobs?\b/i, 'no Venn (SetTheoryLab)'],
  [/two-way|row percent|column percent/i, 'no table machinery (TableLab; the kinship is one citation)'],
  [/\btrees?\b|paths multiply|\bleaves\b/i, 'no branching (TreeDiagramLab)'],
  [/spinner|long.run|simulat|\btrials?\b/i, 'no convergence (ProbabilityLab)'],
  [/mean-cross|sign tally/i, 'no correlation machinery (CorrelationLab)'],
  [/census machinery|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp|sin|acos)/, 'no float math'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const countOf = \(pred\) => \{/.test(code), 'censuses scan the rules');
check(/const indepOf = \(key\) => countAB\(key\) \* 100 === countA\(key\) \* countB\(\)/.test(code), 'independence is an integer identity');
{
  const blockStart = code.indexOf('const LAYOUTS = {');
  const blockEnd = code.indexOf('};', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/counts?:|frac:|truth|answer|verdict|overlap:/i.test(block), 'no layout ships its own censuses (indep is a NAME, not a verdict)');
}
/* the drawing reads the model */
check(/LAYOUTS\[S\.layout\]\.inA\(r, c\)/.test(code), 'the glow is painted from the rule');
check(/fracText\(\[scene\.cAB, denom\]\)/.test(code), 'the share line reads the model');
check(/const canvasLayout = conditionalCanvasLayout\(W, H2\)/.test(code), 'draw consumes the audited responsive geometry');
check(/drawConditionalCanvasBand\(ctx, S\.bandLabel, canvasLayout\)/.test(code), 'band text uses the collision-aware canvas helper');
check(/drawConditionalCanvasReadout\(ctx, S, canvasLayout\)/.test(code), 'census text uses the bounded responsive readout helper');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-conditional: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
