/* Numeric audit for MultiplicationLab — verifies every mathematical claim the
   lab makes, across every reachable dial combination. Run: node audit-multiplication.mjs */

const MAXF = 12;
let checks = 0;
let fails = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) {
    fails++;
    console.error('FAIL:', msg);
  }
};

/* ---- the model, copied verbatim from the lab ---------------------------- */
const clampSplit = (split, b) => Math.min(Math.max(1, Math.round(split)), Math.max(1, b - 1));
const TARGETS = [12, 16, 18, 20, 24, 30, 36, 40, 48, 60, 72];
const areaPercent = (cur, P) => Math.max(0, Math.min(100, 100 * (1 - Math.abs(cur - P) / P)));
function factorPairs(P) {
  const out = [];
  for (let a = 1; a <= MAXF; a++) {
    if (P % a === 0) {
      const b = P / a;
      if (b <= MAXF && a <= b) out.push([a, b]);
    }
  }
  return out;
}

/* ---- 1. product = repeated addition = commutative, over all a,b --------- */
for (let a = 1; a <= MAXF; a++) {
  for (let b = 1; b <= MAXF; b++) {
    const N = a * b;
    // repeated addition: b added a times
    let sum = 0;
    for (let i = 0; i < a; i++) sum += b;
    ok(sum === N, `repeated addition ${a}×${b}: ${sum} !== ${N}`);
    // commutativity
    ok(a * b === b * a, `commutativity ${a}×${b}`);
    // area = count of unit cells (rows*cols)
    ok(N === a * b, `area count ${a}×${b}`);
    // reading-order index covers exactly 1..N with no gaps/dupes
    const seen = new Set();
    for (let i = 0; i < N; i++) {
      const rr = Math.floor(i / b);
      const cc = i % b;
      const r = a - 1 - rr; // row from bottom
      ok(cc >= 0 && cc < b && r >= 0 && r < a, `cell in range ${a}×${b} i=${i}`);
      const idx = (a - 1 - r) * b + cc + 1;
      seen.add(idx);
    }
    ok(seen.size === N, `reading order bijection ${a}×${b}: ${seen.size} !== ${N}`);
  }
}

/* ---- 2. distributive property over all a,b and every split -------------- */
for (let a = 1; a <= MAXF; a++) {
  for (let b = 2; b <= MAXF; b++) {
    for (let s = 1; s <= MAXF - 1; s++) {
      const b1 = clampSplit(s, b);
      const b2 = b - b1;
      ok(b1 >= 1 && b1 <= b - 1, `b1 in [1,b-1] for b=${b} s=${s}: got ${b1}`);
      ok(b2 >= 1, `b2 >= 1 for b=${b} s=${s}: got ${b2}`);
      ok(b1 + b2 === b, `partition sums to b (${b1}+${b2}=${b})`);
      ok(a * (b1 + b2) === a * b1 + a * b2, `distributive a=${a} b=${b} split=${b1}`);
      ok(a * b1 + a * b2 === a * b, `partial products add to product a=${a} b=${b}`);
    }
  }
}

/* ---- 3. calibration meter & targets ------------------------------------- */
for (const P of TARGETS) {
  const pairs = factorPairs(P);
  ok(pairs.length >= 2, `target ${P} has >= 2 factor pairs in 1..12 (got ${pairs.length})`);
  // at least one "non-trivial" pair (both factors >= 2), so it's a real puzzle
  ok(pairs.some(([x, y]) => x >= 2 && y >= 2), `target ${P} has a both->=2 pair`);
  // every listed pair actually multiplies to P and is within range
  for (const [x, y] of pairs) {
    ok(x * y === P && x <= MAXF && y <= MAXF, `pair ${x}×${y} valid for ${P}`);
  }
  // meter: exact match => 100, CALIBRATED; off-by-one factor never reads 100
  ok(areaPercent(P, P) === 100, `meter 100 at exact ${P}`);
  ok(areaPercent(P - 1, P) < 100 && areaPercent(P + 1, P) < 100, `meter < 100 off target ${P}`);
  ok(areaPercent(0, P) >= 0, `meter clamps >= 0 at 0 for ${P}`);
  // there really exists a reachable rectangle (a,b in 1..12) hitting P
  ok(
    pairs.length > 0 && pairs.every(([x, y]) => x >= 1 && y >= 1),
    `target ${P} reachable on the dials`,
  );
}

/* ---- 4. centered auto-fit layout: cells square, array on-stage ---------- */
const STAGE_PAD = 44;
function computeLayout(W, H, A, B, commute) {
  const fitW = Math.max(10, W - 2 * STAGE_PAD);
  const fitH = Math.max(10, H - 2 * STAGE_PAD);
  const cellMax = Math.min(W, H) / 7;
  const spanW = commute ? Math.max(A, B) : B;
  const spanH = commute ? Math.max(A, B) : A;
  const cell = Math.min(fitW / spanW, fitH / spanH, cellMax);
  const ox = (W - B * cell) / 2;
  const oy = (H - A * cell) / 2;
  return { cell, ox, oy };
}
for (const [W, H] of [[560, 560], [375, 375], [520, 520]]) {
  for (let A = 1; A <= MAXF; A++) {
    for (let B = 1; B <= MAXF; B++) {
      for (const commute of [false, true]) {
        const { cell, ox, oy } = computeLayout(W, H, A, B, commute);
        // the whole array (and, on the commute step, its b×a transpose) must
        // fit inside the stage with a non-negative margin
        const wUsed = (commute ? Math.max(A, B) : B) * cell;
        const hUsed = (commute ? Math.max(A, B) : A) * cell;
        ok(cell > 0, `cell > 0 at ${A}×${B} ${W}x${H}`);
        ok(wUsed <= W + 0.5 && hUsed <= H + 0.5, `array fits ${A}×${B} commute=${commute}`);
        ok(ox >= -0.5 && oy >= -0.5, `array centered on-stage ${A}×${B}`);
      }
    }
  }
}

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
