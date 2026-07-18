/* ============================================================================
   audit-congruence.mjs — numeric + structural proof for CongruenceLab.jsx
   (8.G.A.2, G-CO.B.6–8 · congruence via rigid motions).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — each congruent case is LANDABLE (a chain exhibited by
   search), the impostor is UNLANDABLE (proved by invariant AND by
   exhausting the entire reachable component), the alibi is genuine, the
   stamp needs verdict + evidence — grep-enforce the refusals.

   Run:  node audit-congruence.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./CongruenceLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function CongruenceLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, GREEN, WIN, CALIB_STEP, MOVES, MOVE_KEYS, applyMove,
            applyChain, inWindow, canPress, sameSet, edgesSq, sortedEdges, alibiEdge,
            edgeMultisetsMatch, A_BASE, CASES, caseIds, makeCase, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  WIN, CALIB_STEP, MOVES, MOVE_KEYS, applyMove, applyChain, inWindow, canPress, sameSet,
  edgesSq, sortedEdges, alibiEdge, edgeMultisetsMatch, A_BASE, CASES, caseIds, makeCase,
  calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE MOVES — exact rules (the sibling bench's, re-verified here).
   ------------------------------------------------------------------------- */
const RULE_TRUTH = {
  tR: ([x, y]) => [x + 1, y],
  tL: ([x, y]) => [x - 1, y],
  tU: ([x, y]) => [x, y + 1],
  tD: ([x, y]) => [x, y - 1],
  fy: ([x, y]) => [-x, y],
  r90: ([x, y]) => [-y, x],
};
for (const k of MOVE_KEYS) {
  for (let x = -6; x <= 6; x += 2) {
    for (let y = -6; y <= 6; y += 2) {
      const got = MOVES[k].f([x, y]);
      const want = RULE_TRUTH[k]([x, y]);
      check(got[0] === want[0] && got[1] === want[1], `${k}: rule exact at (${x},${y})`);
    }
  }
}

/* ---------------------------------------------------------------------------
   3. THE COMPONENT WALK — enumerate EVERY placement reachable from A, and
   with it prove landability and unlandability outright.
   ------------------------------------------------------------------------- */
const keyOf = (pts) => pts.map((p) => p.join(',')).join('|');
const reachable = new Map(); // placementKey -> a chain that reaches it
{
  let frontier = [{ pts: A_BASE, chain: [] }];
  reachable.set(keyOf(A_BASE), []);
  while (frontier.length > 0) {
    const next = [];
    for (const node of frontier) {
      for (const k of MOVE_KEYS) {
        const img = applyMove(node.pts, k);
        if (!inWindow(img)) continue;
        const kk = keyOf(img);
        if (!reachable.has(kk)) {
          reachable.set(kk, [...node.chain, k]);
          next.push({ pts: img, chain: [...node.chain, k] });
        }
      }
    }
    frontier = next;
  }
}
check(reachable.size > 1500, `the reachable component is fully enumerated (${reachable.size} placements)`);
/* every reachable placement preserves the edge multiset (the invariant) */
const E0 = sortedEdges(A_BASE).join(',');
let checkedInv = 0;
for (const kk of reachable.keys()) {
  if (checkedInv % 7 === 0) {
    const pts = kk.split('|').map((s) => s.split(',').map(Number));
    check(sortedEdges(pts).join(',') === E0, 'invariant: edges preserved across the component');
  }
  checkedInv++;
}

/* the cases */
for (const id of caseIds) {
  const B = CASES[id].B;
  check(B.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y)), `${id}: integer vertices`);
  check(inWindow(B), `${id}: in window`);
  const congruent = edgeMultisetsMatch(A_BASE, B);
  if (congruent) {
    const chain = reachable.get(keyOf(B));
    check(chain != null, `${id}: LANDABLE — the walk exhibits a chain (${chain ? chain.length : '∅'} moves)`);
    if (chain) check(sameSet(applyChain(A_BASE, chain), B), `${id}: the exhibited chain genuinely lands`);
    check(alibiEdge(A_BASE, B) === null, `${id}: no alibi exists for a congruent case`);
  } else {
    /* unlandable, proved two ways: by invariant, and by exhaustion */
    check(!reachable.has(keyOf(B)), `${id}: UNLANDABLE — absent from the entire reachable component`);
    const a = alibiEdge(A_BASE, B);
    check(a !== null, `${id}: an alibi exists`);
    const eA = edgesSq(A_BASE);
    const eB = edgesSq(B);
    check(
      eB.filter((v) => v === eB[a]).length > eA.filter((v) => v === eB[a]).length,
      `${id}: the alibi side is a genuine mismatch`
    );
  }
}
check(caseIds.filter((id) => edgeMultisetsMatch(A_BASE, CASES[id].B)).length === 3, 'three congruent cases');
check(caseIds.filter((id) => !edgeMultisetsMatch(A_BASE, CASES[id].B)).length === 1, 'one impostor');
/* the named cases play their parts */
check(edgeMultisetsMatch(A_BASE, CASES.slid.B) && edgeMultisetsMatch(A_BASE, CASES.turned.B) && edgeMultisetsMatch(A_BASE, CASES.flipped.B), 'slid/turned/flipped are congruent');
check(!edgeMultisetsMatch(A_BASE, CASES.impostor.B), 'the impostor is not');
check(sameSet(applyChain(A_BASE, ['r90']), CASES.turned.B), 'turned IS the quarter-turn of A');
/* flipped genuinely needs the flip: no chain without fy lands it */
{
  const frontierNF = [{ pts: A_BASE }];
  const seenNF = new Set([keyOf(A_BASE)]);
  let q = frontierNF;
  while (q.length > 0) {
    const next = [];
    for (const node of q) {
      for (const k of MOVE_KEYS.filter((m) => m !== 'fy')) {
        const img = applyMove(node.pts, k);
        if (!inWindow(img)) continue;
        const kk = keyOf(img);
        if (!seenNF.has(kk)) {
          seenNF.add(kk);
          next.push({ pts: img });
        }
      }
    }
    q = next;
  }
  check(!seenNF.has(keyOf(CASES.flipped.B)), 'flipped: unreachable without the flip — the mirror twin needs it');
}

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!CASES[s.caseId], `step ${i} case exists`);
  check(Array.isArray(s.chips) && s.chips.every((k) => MOVE_KEYS.includes(k)), `step ${i} chips legal`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].caseId === 'slid' && STEPS[1].caseId === 'turned' && STEPS[2].caseId === 'flipped' && STEPS[3].caseId === 'impostor', 'the case ladder: slid, turned, flipped, impostor');
check(!STEPS[0].chips.includes('r90') && !STEPS[0].chips.includes('fy'), 'step 1: slides only');
check(STEPS[1].chips.includes('r90') && !STEPS[1].chips.includes('fy'), 'step 2: the turn arrives');
check(STEPS[2].chips.includes('fy'), 'step 3: the flip arrives');
/* answer keys */
check(/^Some sequence of slides, flips and turns/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the definition');
check(/^Yes — a turn is a rigid motion/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: turned counts');
check(/^Congruent — reflections are rigid motions too/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: flipped counts');
check(/^Rigid motions never change side lengths/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the alibi logic');
check(/^A landed chain, or a mismatched side/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: two kinds of evidence');
/* the "flipped is not congruent" belief is offered and refuted */
check(/Not congruent — it is backwards/.test(STEPS[2].choices.join('|')), 'the backwards belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — verdict AND evidence, brute-forced.
   ------------------------------------------------------------------------- */
for (const id of caseIds) {
  const B = CASES[id].B;
  const congruent = edgeMultisetsMatch(A_BASE, B);
  const landingChain = reachable.get(keyOf(B)) || null;
  const a = alibiEdge(A_BASE, B);
  const verdicts = [null, 'congruent', 'not'];
  const chains = [[], ['tR'], ...(landingChain ? [landingChain] : [])];
  const taps = [null, 0, 1, 2];
  for (const v of verdicts) {
    for (const c of chains) {
      for (const t of taps) {
        const landed = sameSet(applyChain(A_BASE, c), B);
        const should =
          v === (congruent ? 'congruent' : 'not') && (congruent ? landed : t != null && t === a);
        check(isCalibrated(id, c, v, t) === should, `gate: ${id} v=${v} chain=${c.length} tap=${t}`);
        check([0, 50, 100].includes(closeness(id, c, v, t)), 'meter quantized');
      }
    }
  }
  /* a landed chain under the WRONG verdict earns only the evidence-less half */
  if (congruent && landingChain) {
    check(closeness(id, landingChain, 'not', null) === 0, `${id}: landing under a wrong verdict earns nothing`);
  }
  if (!congruent) {
    const innocent = [0, 1, 2].find((i) => i !== a);
    check(!isCalibrated(id, [], 'not', innocent), `${id}: an innocent side is not an alibi`);
  }
}
check(calibChecks(null, [], 'congruent', null).every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) check(caseIds.includes(makeCase(null)), 'cases from the table');
for (let i = 0; i < 100; i++) check(makeCase('slid') !== 'slid', 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bSSS\b|\bSAS\b|\bASA\b|\bSSA\b/, 'no triangle criteria (roadmap G7/H16-adjacent HS labs)'],
  [/preservation panel|lettering|flip tally/i, 'no G2 devices — this lab spends what that one earned'],
  [/onto itself|mirror census/i, 'no self-landing (SymmetryLab)'],
  [/dilat|similar|scale factor/i, 'no similarity (roadmap G4)'],
  [/°|\bdegrees?\b|radian/i, 'nothing measured in angle units'],
  [/\bcm\b|\binches\b|square units/i, 'no measurement units'],
  [/\bslope\b/i, 'no slope'],
  [/area of|area =|shoelace.*area|½.*base/i, 'no area computed — the impostor is convicted by SIDES (naming area as a failed definition is allowed)'],
  [/requestAnimationFrame/, 'nothing animates — the carrying is pressed'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(!/congruent:\s*(true|false)/.test(code), 'no case ships its own verdict');
check(/const edgeMultisetsMatch = \(A, B\) =>/.test(code), 'the verdict is the edge-multiset comparison');
check(/function alibiEdge\(A, B\)/.test(code), 'the alibi is computed');
check(/sameSet\(applyChain\(A_BASE, chain\), B\)/.test(code), 'landing is exact set equality');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-congruence: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
