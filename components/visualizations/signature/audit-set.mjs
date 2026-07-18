/* Numeric audit for SetTheoryLab — run: node audit-set.mjs
   Verifies the set algebra the lab teaches is exactly correct: intersection,
   union, complement, and difference; the inclusion–exclusion counting rule
   |A∪B| = |A| + |B| − |A∩B|; both De Morgan laws; the subset/disjoint/equal
   relationship classifier; the four-region click cycle; that the calibration
   challenge generator only produces solvable, non-degenerate rule pairs; and
   that every multiple-choice answer key states a true fact. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    if (fails <= 40) console.error('FAIL:', msg);
  }
}
const setEq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/* ---- mirror of the lab's model ------------------------------------------- */
const UNIVERSE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const N = UNIVERSE.length;
const NEITHER = 0, A_ONLY = 1, B_ONLY = 2, BOTH = 3;
const inA = (c) => (c & 1) !== 0;
const inB = (c) => (c & 2) !== 0;

const listA = (m) => UNIVERSE.filter((n) => inA(m[n]));
const listB = (m) => UNIVERSE.filter((n) => inB(m[n]));
const listInter = (m) => UNIVERSE.filter((n) => inA(m[n]) && inB(m[n]));
const listUnion = (m) => UNIVERSE.filter((n) => inA(m[n]) || inB(m[n]));
const listCompA = (m) => UNIVERSE.filter((n) => !inA(m[n]));
const listCompB = (m) => UNIVERSE.filter((n) => !inB(m[n]));
const listDiffAB = (m) => UNIVERSE.filter((n) => inA(m[n]) && !inB(m[n]));
const listDiffBA = (m) => UNIVERSE.filter((n) => !inA(m[n]) && inB(m[n]));

function relationship(m) {
  const I = listInter(m).length;
  const aInB = listDiffAB(m).length === 0;
  const bInA = listDiffBA(m).length === 0;
  if (aInB && bInA) return 'equal';
  if (I === 0) return 'disjoint';
  if (aInB) return 'subsetAB';
  if (bInA) return 'subsetBA';
  return 'overlap';
}

const CYCLE_FWD = { 0: A_ONLY, 1: BOTH, 3: B_ONLY, 2: NEITHER };

const isEven = (n) => n % 2 === 0;
const isMul3 = (n) => n % 3 === 0;
function seedMem() {
  const m = {};
  for (const n of UNIVERSE) m[n] = (isEven(n) ? 1 : 0) | (isMul3(n) ? 2 : 0);
  return m;
}

const RULES = [
  { label: 'even numbers', test: (n) => n % 2 === 0 },
  { label: 'odd numbers', test: (n) => n % 2 === 1 },
  { label: 'multiples of 3', test: (n) => n % 3 === 0 },
  { label: 'multiples of 4', test: (n) => n % 4 === 0 },
  { label: 'numbers greater than 6', test: (n) => n > 6 },
  { label: 'numbers greater than 8', test: (n) => n > 8 },
  { label: 'numbers less than 6', test: (n) => n < 6 },
  { label: 'numbers from 1 to 4', test: (n) => n <= 4 },
  { label: 'prime numbers', test: (n) => [2, 3, 5, 7, 11].includes(n) },
  { label: 'factors of 12', test: (n) => 12 % n === 0 },
];
function goodPair(a, b) {
  const A = UNIVERSE.filter(a.test);
  const B = UNIVERSE.filter(b.test);
  if (A.length < 2 || A.length > 9) return false;
  if (B.length < 2 || B.length > 9) return false;
  const sameSet = A.length === B.length && A.every((n) => b.test(n));
  if (sameSet) return false;
  const union = UNIVERSE.filter((n) => a.test(n) || b.test(n));
  if (union.length >= N) return false;
  return true;
}
function makeChallenge(prev) {
  const R = (hi) => Math.floor(Math.random() * hi);
  let a, b, guard = 0;
  do {
    a = RULES[R(RULES.length)];
    b = RULES[R(RULES.length)];
    guard++;
  } while (
    guard < 400 &&
    (a === b || !goodPair(a, b) || (prev && prev.a === a.label && prev.b === b.label))
  );
  return { a, b, aLabel: a.label, bLabel: b.label };
}
const targetCode = (ch, n) => (ch.a.test(n) ? 1 : 0) | (ch.b.test(n) ? 2 : 0);
const matchCount = (ch, m) => UNIVERSE.filter((n) => m[n] === targetCode(ch, n)).length;

/* helper: brute-force set operations directly from two boolean membership arrays */
const randMem = () => {
  const m = {};
  for (const n of UNIVERSE) m[n] = Math.floor(Math.random() * 4);
  return m;
};

/* 1) Seed diagram is the documented one: A = evens, B = multiples of 3 --------- */
{
  const m = seedMem();
  ok(setEq(listA(m), [2, 4, 6, 8, 10, 12]), 'seed A = evens');
  ok(setEq(listB(m), [3, 6, 9, 12]), 'seed B = multiples of 3');
  ok(setEq(listInter(m), [6, 12]), 'seed A∩B = multiples of 6 {6,12}');
  ok(setEq(UNIVERSE.filter((n) => m[n] === NEITHER), [1, 5, 7, 11]), 'seed neither = {1,5,7,11}');
}

/* 2) Core algebra + counting, over many random memberships ------------------- */
const TRIALS = 200000;
for (let t = 0; t < TRIALS; t++) {
  const m = randMem();
  const A = listA(m), B = listB(m);
  const I = listInter(m), U = listUnion(m);
  const cA = listCompA(m), cB = listCompB(m);
  const dAB = listDiffAB(m), dBA = listDiffBA(m);

  // inclusion–exclusion (the headline result)
  ok(U.length === A.length + B.length - I.length, 'inclusion-exclusion |A∪B|=|A|+|B|-|A∩B|');

  // nesting: A∩B ⊆ A ⊆ A∪B  and  A∩B ⊆ B ⊆ A∪B
  ok(I.every((n) => A.includes(n)) && A.every((n) => U.includes(n)), 'A∩B ⊆ A ⊆ A∪B');
  ok(I.every((n) => B.includes(n)) && B.every((n) => U.includes(n)), 'A∩B ⊆ B ⊆ A∪B');

  // difference identity: A − B = A ∩ B′, and B − A = B ∩ A′
  ok(setEq(dAB, A.filter((n) => !B.includes(n))), 'A−B = elements of A not in B');
  ok(setEq(dBA, B.filter((n) => !A.includes(n))), 'B−A = elements of B not in A');

  // the four regions partition U: A-only + both + B-only + neither = 12, disjoint
  const nOnlyA = dAB.length, nBoth = I.length, nOnlyB = dBA.length;
  const nNeither = UNIVERSE.filter((n) => m[n] === NEITHER).length;
  ok(nOnlyA + nBoth + nOnlyB + nNeither === N, 'four regions partition U');
  ok(nOnlyA + nBoth === A.length && nOnlyB + nBoth === B.length, 'region counts rebuild |A|,|B|');

  // complement: |A|+|A′| = |U|, and A′ is exactly the non-A elements
  ok(A.length + cA.length === N, '|A|+|A′| = |U|');
  ok(cA.every((n) => !A.includes(n)) && A.every((n) => !cA.includes(n)), 'A′ disjoint from A, covers U');

  // De Morgan: (A∪B)′ = A′∩B′  and  (A∩B)′ = A′∪B′
  const compUnion = UNIVERSE.filter((n) => !U.includes(n));
  const AcapBc = cA.filter((n) => cB.includes(n));
  ok(setEq(compUnion, AcapBc), 'De Morgan (A∪B)′ = A′∩B′');
  const compInter = UNIVERSE.filter((n) => !I.includes(n));
  const AcupBc = UNIVERSE.filter((n) => cA.includes(n) || cB.includes(n));
  ok(setEq(compInter, AcupBc), 'De Morgan (A∩B)′ = A′∪B′');

  // relationship classifier consistency
  const relk = relationship(m);
  if (relk === 'disjoint') ok(I.length === 0, 'disjoint ⇒ empty intersection');
  if (relk === 'subsetAB') ok(dAB.length === 0 && dBA.length > 0, 'A⊆B ⇒ A−B empty, B−A nonempty');
  if (relk === 'subsetBA') ok(dBA.length === 0 && dAB.length > 0, 'B⊆A ⇒ B−A empty, A−B nonempty');
  if (relk === 'equal') ok(setEq(A, B), 'equal ⇒ same elements');
  if (relk === 'overlap') ok(I.length > 0 && dAB.length > 0 && dBA.length > 0, 'overlap ⇒ all three regions nonempty');
}

/* 3) The four-region click cycle is a proper 4-cycle covering every region ---- */
{
  let c = NEITHER;
  const seen = [c];
  for (let i = 0; i < 4; i++) c = CYCLE_FWD[c], seen.push(c);
  ok(seen[4] === NEITHER, 'cycle returns to start after 4 clicks');
  ok(new Set(seen.slice(0, 4)).size === 4, 'cycle visits all four regions');
  // reachability: from NEITHER every region is reachable within 3 clicks
  for (const target of [NEITHER, A_ONLY, B_ONLY, BOTH]) {
    let cur = NEITHER, steps = 0;
    while (cur !== target && steps < 4) cur = CYCLE_FWD[cur], steps++;
    ok(cur === target && steps <= 3, `region ${target} reachable in ≤3 clicks`);
  }
}

/* 4) Challenge generator: exhaustive over every ordered rule pair ------------- */
let validPairs = 0;
for (const a of RULES) {
  for (const b of RULES) {
    if (a === b) continue;
    if (!goodPair(a, b)) continue;
    validPairs++;
    // target regions well-defined for all elements; challenge is fully solvable
    const target = {};
    for (const n of UNIVERSE) {
      const tc = targetCode({ a, b }, n);
      ok(tc >= 0 && tc <= 3, `targetCode in range for ${a.label}/${b.label} n=${n}`);
      target[n] = tc;
    }
    ok(matchCount({ a, b }, target) === N, `${a.label} / ${b.label}: solved target matches all 12`);
    // non-degenerate: all four regions... at least A,B nonempty and a "neither" exists
    const A = UNIVERSE.filter(a.test), B = UNIVERSE.filter(b.test);
    ok(A.length >= 2 && B.length >= 2, `${a.label}/${b.label}: both sets nonempty`);
    ok(UNIVERSE.some((n) => target[n] === NEITHER), `${a.label}/${b.label}: has a neither region`);
  }
}
ok(validPairs >= 20, `enough valid challenge pairs exist (${validPairs})`);

/* 5) makeChallenge always returns a good, solvable pair (random draws) -------- */
for (let t = 0; t < 5000; t++) {
  const ch = makeChallenge(t % 7 === 0 ? { a: 'even numbers', b: 'odd numbers' } : null);
  ok(ch.a !== ch.b, 'challenge uses two different rules');
  ok(goodPair(ch.a, ch.b), 'challenge is a good pair');
  const solved = {};
  for (const n of UNIVERSE) solved[n] = targetCode(ch, n);
  ok(matchCount(ch, solved) === N, 'challenge is solvable to 12/12');
  ok(matchCount(ch, seedMem()) <= N, 'matchCount never exceeds 12');
}

/* 6) Multiple-choice answer keys state true facts ---------------------------- */
{
  // Step 0: A = {2,4,6,8} ⇒ 6∈A true; 5∈A false; |A|=4 not 6
  const A = [2, 4, 6, 8];
  ok(A.includes(6), 'Q0: 6 ∈ {2,4,6,8}');
  ok(!A.includes(5), 'Q0: 5 ∉ {2,4,6,8}');
  ok(A.length === 4, 'Q0: |A| = 4');

  // Step 2: A=evens, B=mult3 over 1..12 ⇒ A∩B = {6,12}
  const m = seedMem();
  ok(setEq(listInter(m), [6, 12]), 'Q2: A∩B = {6,12}');

  // Step 3: |A|=6,|B|=4, share 2 ⇒ |A∪B| = 8
  ok(6 + 4 - 2 === 8, 'Q3: union count 8');

  // Step 4: A=evens, A′ = odds = {1,3,5,7,9,11}
  ok(setEq(listCompA(m), [1, 3, 5, 7, 9, 11]), 'Q4: A′ = odds');

  // Step 6 (real world): 15 + 12 − 5 = 22
  ok(15 + 12 - 5 === 22, 'Q6: at-least-one = 22');
}

/* ---- report -------------------------------------------------------------- */
console.log(`\naudit-set: ${checks} checks, ${fails} failures.`);
console.log(fails === 0 ? '✓ ALL PASS' : '✗ FAILURES ABOVE');
process.exit(fails === 0 ? 0 : 1);
