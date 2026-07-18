/* ============================================================================
   audit-pythagoras.mjs — numeric + geometric + structural proof for
   PythagorasLab.jsx (8.G.B.6 · the rearrangement proof: four triangles,
   two squares, one identity).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the identity over the whole dial space, the two
   packings' GEOMETRY (shoelace areas, the same-triangle side² multiset,
   the tilted square's equal sides and right corners, the exact tiling),
   every quoted number, the stamp — and grep-enforce the refusals.

   Run:  node audit-pythagoras.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./PythagorasLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function PythagorasLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
/* the styled-jsx block would false-positive rotate()/180deg greps */
const codeSansCss = code.replace(/<style jsx>\{`[\s\S]*?`\}<\/style>/, '');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, LEG_MIN, LEG_MAX, CALIB_STEP, frameArea, triArea4,
            leftoverOf, cSquared, cOf, tiltPieces, packPieces, PACKINGS, packingIds,
            TRIPLES, makeCase, dedupe4, cSqTruth, cSqChips, cTruth, cChips, calibChecks,
            closeness, isCalibrated, STEPS };`
)();
const {
  LEG_MIN, LEG_MAX, CALIB_STEP, frameArea, triArea4, leftoverOf, cSquared, cOf, tiltPieces,
  packPieces, PACKINGS, packingIds, TRIPLES, makeCase, cSqTruth, cSqChips, cTruth, cChips,
  calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE IDENTITY — (a+b)² − 2ab = a² + b², over the whole dial space.
   ------------------------------------------------------------------------- */
check(LEG_MIN === 1 && LEG_MAX === 12, 'the legs dial 1..12');
for (let a = LEG_MIN; a <= LEG_MAX; a++)
  for (let b = LEG_MIN; b <= LEG_MAX; b++) {
    check(frameArea(a, b) === (a + b) * (a + b), `frame ${a},${b}`);
    check(triArea4(a, b) === 2 * a * b, `triangles ${a},${b}`);
    check(leftoverOf(a, b) === cSquared(a, b), `identity ${a},${b}: leftover = a² + b²`);
  }

/* ---------------------------------------------------------------------------
   3. THE GEOMETRY — the packings are honest: same triangles, exact tiling,
      and the tilted leftover really is a square on the hypotenuse.
   ------------------------------------------------------------------------- */
const shoelace2 = (pts) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s); /* twice the area, exactly (integer vertices) */
};
const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
const GEO_PAIRS = [
  [3, 4], [6, 8], [5, 12], [9, 12], [8, 15], [1, 1], [2, 7], [12, 12], [1, 12], [4, 4], [10, 3],
];
for (const [a, b] of GEO_PAIRS) {
  const side = a + b;
  const wantSides = [a * a, b * b, a * a + b * b].sort((x, y) => x - y).join(',');
  for (const id of packingIds) {
    const { triangles, leftovers } = PACKINGS[id].pieces(a, b);
    check(triangles.length === 4, `${id} ${a},${b}: four triangles`);
    let covered = 0;
    for (const T of triangles) {
      check(shoelace2(T) === a * b, `${id} ${a},${b}: triangle area ab/2`);
      const sides = [d2(T[0], T[1]), d2(T[1], T[2]), d2(T[2], T[0])].sort((x, y) => x - y).join(',');
      check(sides === wantSides, `${id} ${a},${b}: the SAME right triangle (side² multiset)`);
      covered += shoelace2(T);
    }
    for (const L of leftovers) covered += shoelace2(L);
    check(covered === 2 * side * side, `${id} ${a},${b}: pieces tile the frame exactly`);
    for (const piece of [...triangles, ...leftovers])
      for (const [x, y] of piece)
        check(x >= 0 && x <= side && y >= 0 && y <= side, `${id} ${a},${b}: vertex inside the frame`);
  }
  /* the tilted leftover: one square, side² = a² + b², corners exactly right */
  const tilt = PACKINGS.tilt.pieces(a, b).leftovers;
  check(tilt.length === 1 && tilt[0].length === 4, `tilt ${a},${b}: one four-sided leftover`);
  const Q = tilt[0];
  for (let i = 0; i < 4; i++) {
    check(d2(Q[i], Q[(i + 1) % 4]) === a * a + b * b, `tilt ${a},${b}: side ${i} is c`);
    const e1 = [Q[(i + 1) % 4][0] - Q[i][0], Q[(i + 1) % 4][1] - Q[i][1]];
    const e2 = [Q[(i + 2) % 4][0] - Q[(i + 1) % 4][0], Q[(i + 2) % 4][1] - Q[(i + 1) % 4][1]];
    check(e1[0] * e2[0] + e1[1] * e2[1] === 0, `tilt ${a},${b}: corner ${i} is right`);
  }
  check(shoelace2(Q) === 2 * (a * a + b * b), `tilt ${a},${b}: leftover area = a² + b²`);
  /* the flat leftovers: the a-square and the b-square, axis-aligned */
  const packs = PACKINGS.packs.pieces(a, b).leftovers;
  check(packs.length === 2, `packs ${a},${b}: two leftovers`);
  const areas = packs.map((L) => shoelace2(L) / 2).sort((x, y) => x - y).join(',');
  check(areas === [a * a, b * b].sort((x, y) => x - y).join(','), `packs ${a},${b}: areas a², b²`);
  for (const L of packs)
    for (let i = 0; i < 4; i++) {
      const p = L[i];
      const q = L[(i + 1) % 4];
      check(p[0] === q[0] || p[1] === q[1], `packs ${a},${b}: leftover axis-aligned`);
    }
}

/* the hypotenuse by integer search — never a square root */
check(cOf(3, 4) === 5 && cOf(6, 8) === 10 && cOf(5, 12) === 13 && cOf(9, 12) === 15 && cOf(8, 15) === 17, 'cOf finds the triples');
check(cOf(2, 3) === null && cOf(1, 1) === null, 'cOf refuses non-triples');

/* ---------------------------------------------------------------------------
   4. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(frameArea(3, 4) === 49 && triArea4(3, 4) === 24 && leftoverOf(3, 4) === 25, 'the 3-4 ledger: 49, 24, 25');
check(3 * 3 + 4 * 4 === 25, '9 + 16 = 25');
check(frameArea(6, 8) === 196 && triArea4(6, 8) === 96 && cSquared(6, 8) === 100, 'the 6-8 ledger: 196, 96, 100');
check(6 * 6 + 8 * 8 === 100, '36 + 64 agrees');
check(/49 − 24 = 25/.test(STEPS[0].feedback), 'step 1 quotes 49 − 24 = 25');
check(/9 \+ 16/.test(STEPS[2].feedback), 'step 3 quotes 9 + 16');
check(/196/.test(STEPS[3].feedback) && /100/.test(STEPS[3].feedback), 'step 4 quotes 196 and 100');

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Number.isInteger(s.a) && Number.isInteger(s.b) && s.a >= LEG_MIN && s.b <= LEG_MAX, `step ${i} legs valid`);
  check(!!PACKINGS[s.arr], `step ${i} packing exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].a === 3 && STEPS[0].b === 4, 'the story opens on legs 3 and 4');
check(STEPS[1].arr === 'tilt' && !STEPS[1].toggle, 'step 2 pins the tilted packing');
check(STEPS[2].arr === 'packs', 'step 3 opens on the two squares');
check(!!STEPS[3].dials && !!STEPS[4].dials && !STEPS[0].dials, 'the legs unlock at step 4');
/* answer keys derived from the model */
check(/^It stays 25/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the invariant leftover');
check(/^25 — it is the leftover/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: c² by subtraction');
check(/^c² = a² \+ b² — both leftovers/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the identity');
check(/^100 — the frame 196/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: 100 both ways');
check(/^Same frame, same four triangles, two ways/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: why it is a proof');
/* the classic errors are offered and refuted */
check(/196 — the whole frame/.test(STEPS[3].choices.join('|')), 'the (a+b)² belief is offered');
check(/measured c very carefully|measured with a ruler/.test(STEPS.map((s) => (s.choices || []).join('|')).join('|')), 'the ruler belief is offered');
/* the spenders are cited without their devices */
check(/distance bench/.test(STEPS[4].feedback), 'the distance bench is cited');

/* ---------------------------------------------------------------------------
   6. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(TRIPLES.length >= 4, 'several posted triples');
for (const [a, b] of TRIPLES) {
  const c = cOf(a, b);
  check(c != null && c * c === a * a + b * b, `triple ${a},${b}: integer hypotenuse`);
}
check(TRIPLES.every((t) => t.length === 2), 'no triple ships its own c');
for (const [a, b] of TRIPLES) {
  const k = { a, b };
  const sqChipsK = cSqChips(k);
  const cChipsK = cChips(k);
  const sqT = String(cSqTruth(k));
  const cT = String(cTruth(k));
  check(sqChipsK.length === 4 && new Set(sqChipsK).size === 4, `${a},${b}: four distinct c² chips`);
  check(cChipsK.length === 4 && new Set(cChipsK).size === 4, `${a},${b}: four distinct c chips`);
  check(sqChipsK.includes(sqT), `${a},${b}: the c² truth is on a chip`);
  check(cChipsK.includes(cT), `${a},${b}: the c truth is on a chip`);
  for (const chips of [sqChipsK, cChipsK])
    for (let i = 0; i + 1 < chips.length; i++)
      check(Number(chips[i]) < Number(chips[i + 1]), `${a},${b}: chips sorted ascending`);
  for (const sp of [null, ...sqChipsK, 'bogus']) {
    for (const cp of [null, ...cChipsK]) {
      const should = sp === sqT && cp === cT;
      check(isCalibrated(k, sp, cp) === should, `gate: ${a},${b} c²=${sp} c=${cp}`);
      check([0, 50, 100].includes(closeness(k, sp, cp)), 'meter quantized');
    }
  }
  const wrongSq = sqChipsK.find((x) => x !== sqT);
  check(closeness(k, wrongSq, cT) === 0, `${a},${b}: c without c² earns nothing`);
}
check(calibChecks(null, '25', '5').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(TRIPLES.some((t) => t[0] === k.a && t[1] === k.b), 'cases from the triples');
}
for (let i = 0; i < 100; i++) {
  const k = makeCase({ a: 3, b: 4 });
  check(!(k.a === 3 && k.b === 4), 'a new case is genuinely new');
}

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/cut-and-slide|cut and slide|\bslides?\b|\bslid\b/i, 'nothing slides (AreaLab)', code],
  [/coordinate|distance formula/i, 'no coordinate plane (DistanceLab; citing its bench by name is allowed)', code],
  [/\bdrag/i, 'no draggable vertices (TriangleLab)', code],
  [/angle sum/i, 'no angle-sum tour (TriangleLab)', code],
  [/rotat|reflect|translat/i, 'the repacking is never narrated as rigid motions (TransformationsLab)', codeSansCss],
  [/\bseam\b|composing/i, 'no seam-counting (ComposingShapesLab)', code],
  [/\bfold/i, 'no paper fold (EqualAreasLab)', code],
  [/\bslats?\b|odometer|brigade|\btrap\b/i, 'no slats or traps (IntegralLab)', code],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)', code],
  [/Math\.sqrt|√/, 'the hypotenuse is never square-rooted — integer search only', code],
  [/requestAnimationFrame/, 'nothing animates — the packings are chips', code],
];
for (const [re, why, hay] of forbid) check(!re.test(hay), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const cOf = \(a, b\) => \{/.test(code), 'c is found by search');
check(/for \(let c = 1; c <= a \+ b; c\+\+\)/.test(code), 'the search is integer, bounded');
check(/const leftoverOf = \(a, b\) => frameArea\(a, b\) - triArea4\(a, b\)/.test(code), 'the leftover is a difference, not a constant');
/* the drawing reads the model */
check(/PACKINGS\[S\.arr\]\.pieces\(S\.a, S\.b\)/.test(code), 'the stage draws the model’s pieces');
check(/frameArea\(S\.a, S\.b\)/.test(code), 'the ledger reads the model');
check(/cSqChips\(kase\)/.test(code) && /cChips\(kase\)/.test(code), 'the stamp chips come from the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-pythagoras: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
