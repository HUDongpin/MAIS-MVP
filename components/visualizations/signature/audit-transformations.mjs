/* ============================================================================
   audit-transformations.mjs — numeric + structural proof for
   TransformationsLab.jsx (8.G.A.1, 8.G.A.3 · rigid motions as chain presses).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the exact rules, the preservation inventory over an
   exhaustive bounded walk, the orientation–flip-parity identity, the base
   flag's asymmetry certificate, the stamp — grep-enforce the refusals.

   Run:  node audit-transformations.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./TransformationsLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function TransformationsLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, WIN, CALIB_STEP, BASE, MOVES, MOVE_KEYS, applyMove, applyChain,
            inWindow, canPress, edgeSq, orientation, flipsOf, sameSet, DOCKET, targetPts,
            makeCase, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  WIN, CALIB_STEP, BASE, MOVES, MOVE_KEYS, applyMove, applyChain, inWindow, canPress, edgeSq,
  orientation, flipsOf, sameSet, DOCKET, targetPts, makeCase, calibChecks, closeness,
  isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE RULES — each move is exactly its stamped rule, on a lattice.
   ------------------------------------------------------------------------- */
const RULE_TRUTH = {
  tR: ([x, y]) => [x + 2, y],
  tL: ([x, y]) => [x - 2, y],
  tU: ([x, y]) => [x, y + 2],
  tD: ([x, y]) => [x, y - 2],
  fy: ([x, y]) => [-x, y],
  fx: ([x, y]) => [x, -y],
  r90: ([x, y]) => [-y, x],
};
check(MOVE_KEYS.length === 7 && MOVE_KEYS.every((k) => MOVES[k]), 'the seven moves');
for (const k of MOVE_KEYS) {
  for (let x = -6; x <= 6; x += 3) {
    for (let y = -6; y <= 6; y += 3) {
      const got = MOVES[k].f([x, y]);
      const want = RULE_TRUTH[k]([x, y]);
      check(got[0] === want[0] && got[1] === want[1], `${k}: rule exact at (${x},${y})`);
    }
  }
}
/* the algebra of the moves, as point maps */
const eq = (p, q) => p[0] === q[0] && p[1] === q[1];
for (let x = -5; x <= 5; x += 2) {
  for (let y = -5; y <= 5; y += 2) {
    const p = [x, y];
    check(eq(MOVES.r90.f(MOVES.r90.f(MOVES.r90.f(MOVES.r90.f(p)))), p), 'four quarter-turns come home');
    check(eq(MOVES.fy.f(MOVES.fy.f(p)), p), 'two up-axis flips come home');
    check(eq(MOVES.fx.f(MOVES.fx.f(p)), p), 'two across-axis flips come home');
    /* fx then fy = the half-turn = two quarter-turns (the composition fact) */
    check(eq(MOVES.fy.f(MOVES.fx.f(p)), MOVES.r90.f(MOVES.r90.f(p))), 'flip-then-flip IS the half-turn');
  }
}

/* ---------------------------------------------------------------------------
   3. THE FLAG — integer, in window, lopsided; the inventory over an
   exhaustive bounded walk of chains.
   ------------------------------------------------------------------------- */
check(BASE.length === 6, 'six vertices');
for (const [x, y] of BASE) check(Number.isInteger(x) && Number.isInteger(y) && Math.abs(x) <= WIN && Math.abs(y) <= WIN, 'flag on the integer grid');
const O0 = orientation(BASE);
check(O0 !== 0, 'the flag has a definite lettering');
const E0 = edgeSq(BASE).join(',');

let frontier = [[]];
const seenImg = new Set();
let walked = 0;
let symmetricPlacements = 0;
for (let depth = 0; depth <= 4; depth++) {
  const next = [];
  for (const chain of frontier) {
    const img = applyChain(BASE, chain);
    const key = img.map((p) => p.join(',')).join('|');
    if (seenImg.has(key)) continue;
    seenImg.add(key);
    walked++;
    /* 8.G.A.1: side lengths preserved, exactly */
    check(edgeSq(img).join(',') === E0, `lengths kept at chain [${chain}]`);
    /* the lettering law: orientation flips exactly with flip parity */
    check(orientation(img) === (flipsOf(chain) % 2 === 0 ? O0 : -O0), `lettering law at [${chain}]`);
    /* the asymmetry certificate: if the image occupies the flag's own place,
       it must BE the flag, vertex for vertex, unflipped */
    if (sameSet(img, BASE)) {
      symmetricPlacements++;
      check(img.every((p, i) => eq(p, BASE[i])), 'a landing on home is the identity correspondence');
      check(flipsOf(chain) % 2 === 0, 'no flipped chain occupies home');
    }
    if (depth < 4) {
      for (const k of MOVE_KEYS) {
        if (canPress(BASE, chain, k)) next.push([...chain, k]);
      }
    }
  }
  frontier = next;
}
check(walked > 100, `the walk genuinely covered placements (${walked})`);
check(symmetricPlacements >= 1, 'home itself was visited (the empty chain)');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — chips legal; answer keys computed from the rules.
   ------------------------------------------------------------------------- */
check(STEPS.length === 7, 'seven steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Array.isArray(s.chips) && s.chips.every((k) => MOVE_KEYS.includes(k)), `step ${i} chips legal`);
  check(Array.isArray(s.chain), `step ${i} scene pinned`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
/* keys from the model */
const fmt = (p) => `(${p[0]}, ${p[1]})`;
check(STEPS[0].choices[STEPS[0].answer].startsWith(fmt(MOVES.tR.f([1, 4]))), 'step 1 key: the slide of (1,4)');
check(
  STEPS[1].choices[STEPS[1].answer].startsWith(fmt(MOVES.fy.f([4, 1])).replace('(-', '(−')),
  'step 2 key: the flip of (4,1)'
);
check(
  STEPS[2].choices[STEPS[2].answer].startsWith(fmt(MOVES.r90.f([4, 1])).replace('(-', '(−')),
  'step 3 key: the quarter-turn of (4,1)'
);
check(/^The facing/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the odd one out');
check(/^One half-turn/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: composition');
check(STEPS[5].choices[STEPS[5].answer] === '(x, y) → (−y, x)', 'step 6 key: the rule card');
check(MOVES.r90.rule === '(x, y) → (−y, x)', 'the rule card matches the shipped rule');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — land exactly AND read the lettering; alternative landing
   chains are legal (moves compose).
   ------------------------------------------------------------------------- */
for (const kase of DOCKET) {
  const tgt = targetPts(kase);
  check(inWindow(tgt), `${kase.id}: target in window`);
  /* the shipped chain is pressable press by press */
  let c = [];
  for (const k of kase.chain) {
    check(canPress(BASE, c, k), `${kase.id}: chain pressable at ${k}`);
    c = [...c, k];
  }
  const flippedTruth = orientation(tgt) !== O0;
  check(flippedTruth === (flipsOf(kase.chain) % 2 === 1), `${kase.id}: lettering truth matches flip parity`);
  /* the gate */
  check(isCalibrated(kase, kase.chain, flippedTruth ? 'flipped' : 'unflipped'), `${kase.id}: landing + true plea stamps`);
  check(!isCalibrated(kase, kase.chain, flippedTruth ? 'unflipped' : 'flipped'), `${kase.id}: wrong plea never stamps`);
  check(closeness(kase, kase.chain, null) === 50, `${kase.id}: landing alone is half`);
  check(calibChecks(kase, [], 'flipped').every((x) => x === false) || sameSet(BASE, tgt), `${kase.id}: empty chain earns nothing`);
  check([0, 50, 100].includes(closeness(kase, ['tR'], null)), 'meter quantized');
}
/* composition honored: m5's half-turn placement is reachable by two flips too */
{
  const m5 = DOCKET.find((c) => c.id === 'm5');
  const alt = ['fx', 'fy', 'tR', 'tU'];
  check(sameSet(applyChain(BASE, alt), targetPts(m5)), 'm5: the two-flips chain lands the same placement');
  check(isCalibrated(m5, alt, 'unflipped'), 'm5: the alternative chain stamps — any landing chain is legal');
}
check(calibChecks(null, ['tR'], 'flipped').every((x) => x === false), 'no order, no credit');
for (let i = 0; i < 200; i++) {
  const drawn = makeCase(null);
  check(DOCKET.some((c) => c.id === drawn.id), 'orders from the docket');
}
for (let i = 0; i < 100; i++) check(makeCase('m2').id !== 'm2', 'a new order is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/onto itself|lands on itself|mirror census|claim this line/i, 'no self-landing (SymmetryLab owns the census)'],
  [/congruen/i, 'the C-word is the next bench’s definition (roadmap G3)'],
  [/similar|dilat|scale factor/i, 'no similarity (roadmap G4)'],
  [/\bfold\b|crease/i, 'no fold (AbsoluteValueLab/CommutativeLab)'],
  [/\by\s*=\s*x\b/, 'no y = x mirror (LogarithmLab); the mirrors here are the axes'],
  [/\bslope\b/i, 'no slope (LineFunctionLab / G4’s payoff)'],
  [/\baddress\b|\bsmear\b|route arrow/i, 'no address language (PointLab)'],
  [/expression tree|word chip/i, 'no verbal translation (TranslateLab)'],
  [/°|\bdegrees?\b|radian/i, 'turns are named in quarters and halves, never measured'],
  [/requestAnimationFrame/, 'nothing animates — moves are pressed'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* invariants must be DERIVED, never stored */
check(!/orientation:\s*-?1/.test(code), 'no figure ships its own lettering');
check(!/tgt:\s*\[\[/.test(code), 'no docket target ships its own vertices — targets are chains');
check(/const targetPts = \(kase\) => applyChain\(BASE, kase\.chain\)/.test(code), 'targets derived by applying the chain');
check(/const edgeSq = \(pts\) =>/.test(code), 'the inventory is computed');
check(/const orientation = \(pts\) => \{/.test(code), 'the lettering is the shoelace sign');
/* the drawing reads the model */
check(/applyChain\(BASE, chain\)/.test(code), 'the image is the chain, applied');
check(/S\.flips % 2 === 1/.test(code), 'the band’s lettering verdict is the model’s parity');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-transformations: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
