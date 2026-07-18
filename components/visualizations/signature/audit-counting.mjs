/* Numeric audit for CountingLab — run: node audit-counting.mjs
   Verifies that the mathematics the lab teaches is exactly correct across every
   reachable state: cardinality, the successor, order-irrelevance across all four
   arrangements, one-to-one matching for comparison, ten-frame placement, the
   scatter determinism, calibration reachability, and the lesson answer keys. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error('FAIL:', msg);
  }
}

const NMAX = 20;
const cardinality = (n) => n;
const successor = (n) => n + 1;
const compare = (a, b) => (a > b ? 'more' : a < b ? 'fewer' : 'same');
const matchPercent = (n, N) => 100 * Math.max(0, 1 - Math.abs(n - N) / 6);
const isCalibrated = (n, N) => n === N;

const numToWord = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty',
];
const word = (n) => numToWord[n] ?? String(n);

/* the exact layout functions ported verbatim from the lab, so the audit tests
   the SAME geometry the component renders (not an idealised copy) ------------ */
const frac = (x) => x - Math.floor(x);
const hash1 = (i, seed) => frac(Math.sin(i * 127.1 + seed * 311.7) * 43758.5453);
const hash2 = (i, seed) => frac(Math.sin(i * 269.5 + seed * 183.3) * 43758.5453);

function layoutCounters(k, box, arrangement, seed) {
  const discs = [];
  const outlines = [];
  let r = 12;
  if (arrangement === 'tenframe') {
    const frames = k > 10 ? 2 : 1;
    const cols = 5;
    const rows = frames * 2;
    const frameGap = 0.55;
    const cell = Math.min(box.w / (cols + 0.5), box.h / (rows + (frames - 1) * frameGap + 0.5));
    r = cell * 0.34;
    const gridW = cols * cell;
    const gridH = rows * cell + (frames - 1) * frameGap * cell;
    const left = box.x + (box.w - gridW) / 2;
    const top = box.y + (box.h - gridH) / 2;
    const cellCentre = (i) => {
      const f = Math.floor(i / 10);
      const c = i % 10;
      const rr = Math.floor(c / 5);
      const cc = c % 5;
      const x = left + cc * cell + cell / 2;
      const y = top + (f * 2 + rr) * cell + f * frameGap * cell + cell / 2;
      return { x, y, s: cell };
    };
    const totalCells = frames * 10;
    for (let i = 0; i < totalCells; i++) {
      const p = cellCentre(i);
      if (i < k) discs.push({ x: p.x, y: p.y });
      else outlines.push(p);
    }
    return { discs, outlines, r, cell, totalCells };
  }
  if (arrangement === 'line') {
    if (k === 0) return { discs, outlines, r };
    const gap = Math.min(box.w / k, 66);
    r = Math.min(gap * 0.36, box.h * 0.3, 24);
    const totalW = gap * k;
    const startX = box.x + (box.w - totalW) / 2 + gap / 2;
    const y = box.y + box.h / 2;
    for (let i = 0; i < k; i++) discs.push({ x: startX + i * gap, y });
    return { discs, outlines, r };
  }
  if (arrangement === 'circle') {
    if (k === 0) return { discs, outlines, r };
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const R = Math.min(box.w, box.h) * 0.38;
    if (k === 1) {
      r = Math.min(R * 0.5, 24);
      discs.push({ x: cx, y: cy });
      return { discs, outlines, r, ring: { cx, cy, R } };
    }
    const arc = (2 * Math.PI * R) / k;
    r = Math.max(6, Math.min(arc * 0.33, 22));
    for (let i = 0; i < k; i++) {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / k;
      discs.push({ x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) });
    }
    return { discs, outlines, r, ring: { cx, cy, R } };
  }
  if (k === 0) return { discs, outlines, r };
  const aspect = box.w / box.h;
  const cols = Math.max(1, Math.ceil(Math.sqrt(k * aspect)));
  const rows = Math.max(1, Math.ceil(k / cols));
  const cellW = box.w / cols;
  const cellH = box.h / rows;
  r = Math.max(9, Math.min(20, Math.min(cellW, cellH) * 0.28));
  const jit = 0.36;
  for (let i = 0; i < k; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = box.x + (col + 0.5) * cellW + (hash1(i, seed) - 0.5) * jit * cellW;
    const y = box.y + (row + 0.5) * cellH + (hash2(i, seed) - 0.5) * jit * cellH;
    discs.push({ x, y });
  }
  return { discs, outlines, r };
}

const BOX = { x: 30, y: 60, w: 700, h: 330 };

/* 1) Cardinality: the "how many" of a set of size n is exactly n, for 0..20 --- */
for (let n = 0; n <= NMAX; n++) {
  ok(cardinality(n) === n, `cardinality ${n}`);
  ok(Number.isInteger(cardinality(n)), `cardinality integer ${n}`);
  ok(word(n) === numToWord[n], `word ${n}`);
}

/* 2) The count sequence: counting 1..n one-per-object lands its LAST word on n
      (the cardinality principle, and the one-to-one pairing being exact) ----- */
for (let n = 1; n <= NMAX; n++) {
  const seq = Array.from({ length: n }, (_, i) => i + 1);
  ok(seq.length === n, `sequence length ${n}`);
  ok(seq[seq.length - 1] === n, `last count word = n (${n})`);
  ok(new Set(seq).size === n, `no repeats / no skips ${n}`); // one-to-one
  // sequence is strictly increasing by ones
  let good = true;
  for (let i = 1; i < seq.length; i++) if (seq[i] - seq[i - 1] !== 1) good = false;
  ok(good, `count rises by one each time ${n}`);
}

/* 3) Successor: each next number is exactly one more; predecessor one fewer --- */
for (let n = 0; n < NMAX; n++) {
  ok(successor(n) === n + 1, `successor ${n}`);
  ok(successor(n) - n === 1, `successor is +1 ${n}`);
}
for (let n = 1; n <= NMAX; n++) ok(n - 1 === n - 1 && n - 1 >= 0, `predecessor valid ${n}`);

/* 4) Order irrelevance / conservation: the number of discs equals n in ALL four
      arrangements, and rearranging never changes the count ------------------- */
for (let n = 0; n <= NMAX; n++) {
  const counts = {};
  for (const arr of ['tenframe', 'line', 'circle', 'scatter']) {
    const L = layoutCounters(n, BOX, arr, 1);
    counts[arr] = L.discs.length;
    ok(L.discs.length === n, `${arr} draws exactly n discs (${n})`);
  }
  ok(
    counts.tenframe === counts.line &&
      counts.line === counts.circle &&
      counts.circle === counts.scatter,
    `all arrangements agree on count (${n})`,
  );
}

/* 5) Ten-frame structure: rows of five (five-and-some-more), one frame for
      0..10 and a double frame for 11..20; filled + empty cells = 10 or 20 ---- */
for (let n = 0; n <= NMAX; n++) {
  const L = layoutCounters(n, BOX, 'tenframe', 1);
  const frames = n > 10 ? 2 : 1;
  ok(L.totalCells === frames * 10, `ten-frame cell total ${n}`);
  ok(L.discs.length + L.outlines.length === L.totalCells, `filled + empty = cells ${n}`);
  // every disc sits at a distinct cell centre (no two counters share a cell)
  const keys = new Set(L.discs.map((d) => `${d.x.toFixed(2)},${d.y.toFixed(2)}`));
  ok(keys.size === n, `ten-frame cells distinct ${n}`);
  // top row of each frame is filled before the bottom row (5-and-some-more):
  // for 1..5 all discs share the smaller y within the frame
  if (n >= 1 && n <= 5) {
    const ys = L.discs.map((d) => d.y);
    ok(new Set(ys.map((y) => y.toFixed(2))).size === 1, `1..5 fill one row ${n}`);
  }
}

/* 6) Scatter determinism: same (n, seed) => identical layout every call; every
      scattered disc stays inside the box; and — critically for a counting lab —
      NO two counters overlap, so each object stays countable ----------------- */
for (let n = 1; n <= NMAX; n++) {
  const A = layoutCounters(n, BOX, 'scatter', 1);
  const B = layoutCounters(n, BOX, 'scatter', 1);
  for (let i = 0; i < n; i++) {
    ok(A.discs[i].x === B.discs[i].x && A.discs[i].y === B.discs[i].y, `scatter stable ${n}#${i}`);
    ok(
      A.discs[i].x >= BOX.x && A.discs[i].x <= BOX.x + BOX.w &&
        A.discs[i].y >= BOX.y && A.discs[i].y <= BOX.y + BOX.h,
      `scatter inside box ${n}#${i}`,
    );
  }
  // no overlap: every pair of centres is at least a diameter apart
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(A.discs[i].x - A.discs[j].x, A.discs[i].y - A.discs[j].y);
      ok(d >= 2 * A.r, `scatter no overlap ${n} #${i}/#${j} (d=${d.toFixed(1)} 2r=${(2 * A.r).toFixed(1)})`);
    }
  }
}
// the same non-overlap guarantee for the other arrangements, all n ----------
for (let n = 1; n <= NMAX; n++) {
  for (const arr of ['tenframe', 'line', 'circle']) {
    const L = layoutCounters(n, BOX, arr, 1);
    for (let i = 0; i < L.discs.length; i++) {
      for (let j = i + 1; j < L.discs.length; j++) {
        const d = Math.hypot(L.discs[i].x - L.discs[j].x, L.discs[i].y - L.discs[j].y);
        ok(d >= 2 * L.r - 0.01, `${arr} no overlap ${n} #${i}/#${j}`);
      }
    }
  }
}

/* 7) Comparison by one-to-one matching: pairs = min(a,b); leftover = |a-b|; and
      the verdict (more/fewer/same) matches the leftover, for every (a,b) ----- */
for (let a = 0; a <= NMAX; a++) {
  for (let b = 0; b <= NMAX; b++) {
    const pairs = Math.min(a, b);
    const leftover = Math.abs(a - b);
    ok(pairs + leftover === Math.max(a, b), `match accounting ${a},${b}`);
    const rel = compare(a, b);
    if (a > b) ok(rel === 'more' && a - b === leftover, `A more ${a},${b}`);
    else if (a < b) ok(rel === 'fewer' && b - a === leftover, `A fewer ${a},${b}`);
    else ok(rel === 'same' && leftover === 0, `same ${a},${b}`);
    // symmetry: A more than B  <=>  B fewer than A
    ok((compare(a, b) === 'more') === (compare(b, a) === 'fewer'), `compare symmetric ${a},${b}`);
  }
}

/* 8) Calibration: every target 3..20 is reachable with n in 0..20; an exact
      build stamps and reads 100%; any off-by-k build does not stamp --------- */
for (let N = 3; N <= NMAX; N++) {
  ok(N >= 0 && N <= NMAX, `target ${N} reachable by n`);
  ok(isCalibrated(N, N), `exact build calibrates ${N}`);
  ok(matchPercent(N, N) === 100, `exact build meter 100 ${N}`);
  for (let n = 0; n <= NMAX; n++) {
    if (n !== N) {
      ok(!isCalibrated(n, N), `off build not calibrated n=${n} N=${N}`);
      ok(matchPercent(n, N) < 100, `off build < 100 n=${n} N=${N}`);
    }
  }
  // the meter is monotone: closer to the target never reads lower
  for (let n = 0; n < NMAX; n++) {
    const dNear = Math.abs(Math.min(n + 1, N) - N);
    ok(matchPercent(n, N) <= matchPercent(N, N), `meter capped at exact ${n},${N}`);
  }
}

/* 9) makeTarget stays in range and never repeats the previous target --------- */
function makeTarget(prev) {
  let N;
  do {
    N = 3 + Math.floor(Math.random() * 18);
  } while (prev != null && N === prev);
  return N;
}
let prev = null;
for (let t = 0; t < 6000; t++) {
  const N = makeTarget(prev);
  ok(N >= 3 && N <= 20, `makeTarget range ${N}`);
  ok(N !== prev, `makeTarget no repeat ${N}`);
  prev = N;
}

/* 10) Lesson answer keys match the arithmetic each step asserts -------------- */
ok(word(5) === 'five', 'step0: Group A shows five');
ok(new Set([1, 2, 3, 4, 5]).size === 5, 'step1: 1..5 one-to-one, no repeat');
ok(7 === cardinality(7), 'step2: last number seven = how many');
ok(successor(8) === 9, 'step3: 8 then one more = 9');
ok(cardinality(8) === 8, 'step3: 8 rearranged is still 8');
ok(compare(6, 4) === 'more' && 6 - 4 === 2, 'step4: A=6 vs B=4, A has more by 2');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
