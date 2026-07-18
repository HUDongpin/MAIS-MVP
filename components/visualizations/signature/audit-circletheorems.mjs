/* ============================================================================
   audit-circletheorems.mjs — numeric + geometric + structural proof for
   CircleTheoremsLab.jsx (G-C.A.1–4 · inscribed = central/2; Thales; the
   cyclic quadrilateral).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the integer tick laws, and then the GEOMETRY itself:
   points are placed on a real unit circle and the vector angle at every
   legal vertex position is compared against the model's integer claim to
   1e-7 degrees.  The invariance is proved by exhaustion, the supplementary
   law over every arc, the stamp over every case × chip pair — and the
   refusals are grep-enforced.

   Run:  node audit-circletheorems.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./CircleTheoremsLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function CircleTheoremsLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const codeSansCss = code.replace(/<style jsx>\{`[\s\S]*?`\}<\/style>/, '');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, TICKS, RATE, CALIB_STEP, centralOf, inscribedOf,
            oppositeOf, vertexMin, vertexMax, diameterStop, quadTick, ARC_CASES, makeCase,
            dedupe4, inscTruth, inscChips, oppTruth, oppChips, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  TICKS, RATE, CALIB_STEP, centralOf, inscribedOf, oppositeOf, vertexMin, vertexMax,
  diameterStop, quadTick, ARC_CASES, makeCase, inscTruth, inscChips, oppTruth, oppChips,
  calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE TICK LAWS — integers everywhere a student can look.
   ------------------------------------------------------------------------- */
check(TICKS === 36 && RATE === 10, '36 ticks at 10° per tick');
for (let a = 1; a < TICKS; a++) {
  check(centralOf(a) === 10 * a, `a=${a}: central = 10a`);
  check(inscribedOf(a) === 5 * a, `a=${a}: inscribed = 5a`);
  check(Number.isInteger(inscribedOf(a)), `a=${a}: inscribed is an integer`);
  check(inscribedOf(a) * 2 === centralOf(a), `a=${a}: inscribed is half the central`);
  check(inscribedOf(a) + oppositeOf(a) === 180, `a=${a}: the two rim readings split 180`);
}
check(inscribedOf(18) === 90, 'Thales: the semicircle reads 90°');
check(centralOf(18) === 180, 'the semicircle’s central angle is straight');
for (let a = 2; a <= 18; a++) {
  check(vertexMin(a) === a + 1 && vertexMax() === TICKS - 1, `a=${a}: the vertex range`);
  check(diameterStop(a) === (a + 18) % TICKS, `a=${a}: the diameter stop is antipodal to B`);
  check(quadTick(a) > 0 && quadTick(a) < a, `a=${a}: Q stands strictly between the posts`);
}

/* ---------------------------------------------------------------------------
   3. THE GEOMETRY ITSELF — the plane agrees with the integer bookkeeping.
   Points go on a real unit circle; the vector angle at every legal vertex
   is compared with the model's claim to 1e-7 degrees.
   ------------------------------------------------------------------------- */
const pt = (t) => {
  const rad = ((t * RATE - 90) * Math.PI) / 180;
  return [Math.cos(rad), Math.sin(rad)];
};
const angleAt = (V, A, B) => {
  const u = [A[0] - V[0], A[1] - V[1]];
  const v = [B[0] - V[0], B[1] - V[1]];
  const dot = u[0] * v[0] + u[1] * v[1];
  const nu = Math.hypot(u[0], u[1]);
  const nv = Math.hypot(v[0], v[1]);
  return (Math.acos(Math.min(1, Math.max(-1, dot / (nu * nv)))) * 180) / Math.PI;
};
for (let a = 2; a <= 18; a++) {
  const A = pt(0);
  const B = pt(a);
  /* the central angle */
  check(Math.abs(angleAt([0, 0], A, B) - centralOf(a)) < 1e-7, `a=${a}: the plane’s central angle is 10a`);
  /* the inscribed angle, at EVERY legal vertex — the invariance, exhausted */
  for (let p = vertexMin(a); p <= vertexMax(); p++) {
    check(
      Math.abs(angleAt(pt(p), A, B) - inscribedOf(a)) < 1e-7,
      `a=${a} p=${p}: the plane’s inscribed angle is 5a`
    );
  }
  /* the far-side reader, at every strict interior tick of the minor arc */
  for (let q = 1; q < a; q++) {
    check(
      Math.abs(angleAt(pt(q), A, B) - oppositeOf(a)) < 1e-7,
      `a=${a} q=${q}: the far side reads 180 − 5a`
    );
  }
  /* the diameter stop really is a diameter: P and B antipodal */
  const P = pt(diameterStop(a));
  check(Math.abs(P[0] + B[0]) < 1e-12 && Math.abs(P[1] + B[1]) < 1e-12, `a=${a}: the stop is antipodal to B`);
}

/* ---------------------------------------------------------------------------
   4. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(centralOf(8) === 80 && inscribedOf(8) === 40, 'the opening scene: 80° and 40°');
check(oppositeOf(8) === 140 && TICKS - 8 === 28, 'the far side: 28 ticks, 140°');
check(TICKS * 5 === 180, '36 ticks at the half rate is 180°');
check(/8 ticks/.test(STEPS[0].body), 'step 1 posts the 8-tick arc');
check(/Central 80°, inscribed 40°/.test(STEPS[0].q), 'step 1 quotes both readings');
check(/18 ticks/.test(STEPS[3].body), 'step 4 posts the semicircle');
check(/other 28 ticks/.test(STEPS[4].choices[0]), 'step 5 quotes the complementary arc');
check(/36 × 5° = 180°/.test(STEPS[4].feedback), 'step 5 quotes the split of the circle');

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Number.isInteger(s.arc) && s.arc >= 2 && s.arc <= 18, `step ${i} arc valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(!!STEPS[1].vertexDial && !!STEPS[2].vertexDial && !STEPS[0].vertexDial, 'the vertex dial unlocks at step 2');
check(!!STEPS[3].arcDial && !STEPS[2].arcDial, 'the arc dial unlocks at step 4');
check(!!STEPS[4].quad && !STEPS[3].quad, 'the far-side reader arrives at step 5');
/* answer keys derived from the model */
check(/^The inscribed angle is exactly half/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the half');
check(/^Never moves/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the invariance');
check(/^Isosceles: the base angles/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the two radii');
check(/^90° — half of the straight angle/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: Thales');
check(/^140° — Q’s arc is the other 28 ticks/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the split');
/* the real beliefs are offered and refuted */
check(/Grows near the middle/.test(STEPS[1].choices.join('|')), 'the vertex-matters belief is offered');
check(/coincidence/i.test(STEPS[0].choices.join('|')), 'the coincidence belief is offered');

/* ---------------------------------------------------------------------------
   6. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(ARC_CASES.every((a) => a >= 2 && a < 18), 'the posted arcs avoid the degenerate semicircle');
for (const a of ARC_CASES) {
  check(inscTruth(a) !== oppTruth(a), `a=${a}: the two rulings are distinct numbers`);
  const iChips = inscChips(a);
  const oChips = oppChips(a);
  const iT = String(inscTruth(a));
  const oT = String(oppTruth(a));
  check(iChips.length === 4 && new Set(iChips).size === 4, `a=${a}: four distinct P chips`);
  check(oChips.length === 4 && new Set(oChips).size === 4, `a=${a}: four distinct Q chips`);
  check(iChips.includes(iT), `a=${a}: the P truth is on a chip`);
  check(oChips.includes(oT), `a=${a}: the Q truth is on a chip`);
  for (const chips of [iChips, oChips])
    for (let i = 0; i + 1 < chips.length; i++)
      check(Number(chips[i]) < Number(chips[i + 1]), `a=${a}: chips sorted ascending`);
  /* first principles: P = half the central; Q = the supplement */
  check(Number(iT) * 2 === centralOf(a), `a=${a}: the P truth is half the posted central`);
  check(Number(iT) + Number(oT) === 180, `a=${a}: the rulings split 180`);
  for (const ip of [null, ...iChips, 'bogus']) {
    for (const op of [null, ...oChips]) {
      const should = ip === iT && op === oT;
      check(isCalibrated(a, ip, op) === should, `gate: a=${a} P=${ip} Q=${op}`);
      check([0, 50, 100].includes(closeness(a, ip, op)), 'meter quantized');
    }
  }
  const wrongInsc = iChips.find((x) => x !== iT);
  check(closeness(a, wrongInsc, oT) === 0, `a=${a}: Q without P earns nothing`);
}
check(calibChecks(null, '40', '140').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) check(ARC_CASES.includes(makeCase(null)), 'cases from the space');
for (let i = 0; i < 100; i++) check(makeCase(8) !== 8, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/coordinate|parametric/i, 'no coordinate circle (CircleLab)', code],
  [/\broll/i, 'nothing rolls (PiLab)', code],
  [/circumference/i, 'no circumference (PiLab)', code],
  [/\bradians?\b|wrapping|unwrap/i, 'no radian, no wrapping (UnitCircleLab)', code],
  [/\bturns?\b/i, 'no turn language (AngleLab / AngleTurnLab)', codeSansCss],
  [/hypotenuse|\bSOH\b|opp\/hyp/i, 'no side quotients (TrigRatioLab)', code],
  [/\bdrag/i, 'the vertex wanders by dial (TriangleLab)', code],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)', code],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)', code],
  [/mason|packing|leftover/i, 'no rearrangement machinery (PythagorasLab)', code],
  [/Math\.acos/, 'no angle a student sees is computed by inverse trig — ticks only', code],
  [/requestAnimationFrame/, 'nothing animates — the wandering is a dial', code],
];
for (const [re, why, hay] of forbid) check(!re.test(hay), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const inscribedOf = \(a\) => \(a \* RATE\) \/ 2/.test(code), 'the inscribed reading is arithmetic on ticks');
check(/const oppositeOf = \(a\) => 180 - inscribedOf\(a\)/.test(code), 'the far-side reading is the supplement, derived');
check(/const centralOf = \(a\) => a \* RATE/.test(code), 'the central reading is arithmetic on ticks');
/* the drawing reads the model */
check(/inscribedOf\(S\.a\)/.test(code), 'the readout is the model’s inscribed angle');
check(/centralOf\(S\.a\)/.test(code), 'the readout is the model’s central angle');
check(/inscChips\(kase\)/.test(code) && /oppChips\(kase\)/.test(code), 'the stamp chips come from the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-circletheorems: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
