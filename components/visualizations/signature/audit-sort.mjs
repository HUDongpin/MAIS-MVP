/* ============================================================================
   audit-sort.mjs — exact numeric verification of SortLab's model.
   Run:  node audit-sort.mjs
   Mirrors the classification / Rand-index math in SortLab.jsx and asserts every
   pedagogical invariant a K-2 child must never see violated.
   ========================================================================== */

const OBJECTS = [
  { i: 0, color: 'blue', shape: 'circle', size: 'big' },
  { i: 1, color: 'blue', shape: 'square', size: 'small' },
  { i: 2, color: 'blue', shape: 'circle', size: 'small' },
  { i: 3, color: 'blue', shape: 'square', size: 'big' },
  { i: 4, color: 'yellow', shape: 'circle', size: 'big' },
  { i: 5, color: 'yellow', shape: 'square', size: 'small' },
  { i: 6, color: 'yellow', shape: 'triangle', size: 'big' },
  { i: 7, color: 'green', shape: 'square', size: 'big' },
  { i: 8, color: 'green', shape: 'triangle', size: 'small' },
];
const N = OBJECTS.length;

const ATTRS = {
  color: ['blue', 'yellow', 'green'],
  shape: ['circle', 'square', 'triangle'],
  size: ['big', 'small'],
};
const ATTR_ORDER = ['color', 'shape', 'size'];

function blocksOf(attr) {
  return ATTRS[attr].map((v) => ({
    v,
    ids: OBJECTS.filter((o) => o[attr] === v).map((o) => o.i),
  }));
}
function assignment(attr) {
  return OBJECTS.map((o) => ATTRS[attr].indexOf(o[attr]));
}
function countsFor(attr) {
  return blocksOf(attr).map((b) => b.ids.length);
}
function randIndex(a, b) {
  const A = assignment(a);
  const B = assignment(b);
  let agree = 0;
  let total = 0;
  for (let i = 0; i < N; i++)
    for (let j = i + 1; j < N; j++) {
      total++;
      if ((A[i] === A[j]) === (B[i] === B[j])) agree++;
    }
  return { agree, total };
}
function samePartition(a, b) {
  const A = assignment(a);
  const B = assignment(b);
  for (let i = 0; i < N; i++)
    for (let j = i + 1; j < N; j++) if ((A[i] === A[j]) !== (B[i] === B[j])) return false;
  return true;
}

let pass = 0;
let fail = 0;
function ok(cond, msg) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error('  ✗ FAIL:', msg);
  }
}

console.log('SortLab audit — 9 objects, 3 attributes\n');

/* 1. Every object has exactly one value of each attribute (counted once). */
for (const o of OBJECTS)
  for (const a of ATTR_ORDER) ok(ATTRS[a].includes(o[a]), `object ${o.i} has a valid ${a} value`);

/* 2. Expected counts per attribute (the numbers the lesson text quotes). */
const EXPECT = { color: [4, 3, 2], shape: [3, 4, 2], size: [5, 4] };
for (const a of ATTR_ORDER) {
  const c = countsFor(a);
  ok(JSON.stringify(c) === JSON.stringify(EXPECT[a]), `${a} counts = ${JSON.stringify(EXPECT[a])} (got ${JSON.stringify(c)})`);
}

/* 3. Bin counts sum to N for every attribute (the "counted once → adds up" law). */
for (const a of ATTR_ORDER) {
  const sum = countsFor(a).reduce((x, y) => x + y, 0);
  ok(sum === N, `${a}: bins sum to ${N} (got ${sum})`);
}
/* every object appears in exactly one bin per attribute */
for (const a of ATTR_ORDER) {
  const seen = new Set();
  for (const b of blocksOf(a)) for (const id of b.ids) ok(!seen.has(id), `${a}: object ${id} in one bin only`), seen.add(id);
  ok(seen.size === N, `${a}: all ${N} objects placed`);
}

/* 4. Each attribute's ranking (sort categories by count) is strict — no ties, so
      "most" and the full order are unambiguous. */
for (const a of ATTR_ORDER) {
  const sorted = [...countsFor(a)].sort((x, y) => y - x);
  let strict = true;
  for (let i = 1; i < sorted.length; i++) if (sorted[i] === sorted[i - 1]) strict = false;
  ok(strict, `${a}: strict descending order, unique winner (${JSON.stringify(sorted)})`);
}
/* named winners the lesson quotes */
ok(blocksOf('color')[0].ids.length === 4, 'color winner is Blue (4)');
ok(blocksOf('shape')[1].ids.length === 4, 'shape winner is Square (4)');
ok(blocksOf('size')[0].ids.length === 5, 'size winner is Big (5)');

/* 5. Color and shape SHARE the count-signature (4,3,2) but are DIFFERENT
      partitions — the calibration "counting isn't enough" trap. */
const sig = (a) => [...countsFor(a)].sort((x, y) => y - x).join(',');
ok(sig('color') === '4,3,2' && sig('shape') === '4,3,2', 'color & shape share signature 4,3,2');
ok(!samePartition('color', 'shape'), 'color & shape are DIFFERENT partitions despite equal signature');

/* 6. All three partitions pairwise distinct → calibration has a UNIQUE 100%. */
for (let i = 0; i < ATTR_ORDER.length; i++)
  for (let j = i + 1; j < ATTR_ORDER.length; j++)
    ok(!samePartition(ATTR_ORDER[i], ATTR_ORDER[j]), `${ATTR_ORDER[i]} ≠ ${ATTR_ORDER[j]} partition`);

/* 7. Rand index: self-match is exactly 36/36; every cross-pair is < 1 (so only
      the true rule can hit 100% CALIBRATED). C(9,2) = 36 pairs. */
for (const a of ATTR_ORDER) {
  const r = randIndex(a, a);
  ok(r.total === 36, `pair count C(9,2)=36 (got ${r.total})`);
  ok(r.agree === 36, `${a} vs itself: exact 36/36 = 100%`);
}
for (let i = 0; i < ATTR_ORDER.length; i++)
  for (let j = 0; j < ATTR_ORDER.length; j++) {
    if (i === j) continue;
    const a = ATTR_ORDER[i];
    const b = ATTR_ORDER[j];
    const r = randIndex(a, b);
    const pct = Math.round((r.agree * 100) / r.total);
    ok(r.agree < r.total, `${a} vs ${b}: RI < 1 (${r.agree}/${r.total} = ${pct}%) — no false CALIBRATED`);
  }

/* 8. samePartition ⟺ Rand index == 1 (the stamp test and the meter agree). */
for (const a of ATTR_ORDER)
  for (const b of ATTR_ORDER) {
    const r = randIndex(a, b);
    const ri1 = r.agree === r.total;
    ok(ri1 === samePartition(a, b), `${a}/${b}: RI==1 iff samePartition`);
  }

/* 9. newSecret never repeats the previous secret (avoid a stale puzzle). */
function newSecret(prev) {
  let s;
  let guard = 0;
  do {
    s = ATTR_ORDER[Math.floor(Math.random() * ATTR_ORDER.length)];
    guard++;
  } while (prev && s === prev && guard < 20);
  return s;
}
let repeats = 0;
for (let t = 0; t < 20000; t++) {
  const prev = ATTR_ORDER[t % 3];
  if (newSecret(prev) === prev) repeats++;
}
ok(repeats === 0, `newSecret avoided the previous secret across 20000 draws (repeats=${repeats})`);

/* 10. Cross-pair Rand-index reference table (informational + regression guard). */
console.log('\n  Rand-index match table (guess vs secret):');
for (const a of ATTR_ORDER) {
  const row = ATTR_ORDER.map((b) => {
    const r = randIndex(a, b);
    return `${b}:${Math.round((r.agree * 100) / r.total)}%`;
  });
  console.log(`    ${a.padEnd(6)} → ${row.join('   ')}`);
}

console.log(`\n${fail === 0 ? '✓ ALL PASS' : '✗ FAILURES'} — ${pass} checks passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
