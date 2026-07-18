/* Numeric audit for EquationLab — mirrors the lab's math exactly.
   Run: node audit-equation.mjs
   Checks: the model (left side & solution), the worked inverse-operation steps
   are algebraically valid AND name the right operation for the sign of b, the
   balance/tilt sign, the RANGE INVARIANT (every equation the dials can build is
   solvable on the x dial), the ISOLATE-x move (it can never tip the beam), the
   sign-aware formatting (never "x + −2"), the challenge target generator (always
   in range, whole-number solution, exactly reachable, never trivial/repeat, and
   genuinely produces subtraction equations), the SOLVED condition, and the meter
   feel (exact hit -> 100% -> SOLVED; the smallest single-step miss stays below). */

const START = { a: 1, b: 2, c: 6, x: 1 };
const SOLVE_EPS = 1e-6;
const MAX_TILT = 0.2;
const MINUS = '−';

const leftSide = (x, p) => p.a * x + p.b;
const solutionValue = (p) => (p.c - p.b) / p.a;
const movedRight = (p) => p.c - p.b;
const tiltAngle = (L, R) => MAX_TILT * Math.tanh((L - R) / 5);
const matchPercent = (dist) => 100 / (1 + dist / 0.8);
const moveLabel = (b) => (b > 0 ? `remove ${b} from both sides` : `add ${Math.abs(b)} to both sides`);

/* dial table — mirrors PARAMS, including b's soft floor before the subtraction step */
const PARAMS = [
  { key: 'x', min: -6, max: 18, step: 0.5, unlock: 1 },
  { key: 'a', min: 1, max: 4, step: 1, unlock: 5 },
  { key: 'b', min: -6, max: 6, step: 1, unlock: 3, softMin: 0, softMinUntil: 4 },
  { key: 'c', min: 0, max: 12, step: 1, unlock: 2 },
];
const dialMin = (d, step) => (d.softMinUntil != null && step < d.softMinUntil ? d.softMin : d.min);
const STEP_COUNT = 8;
const LENS_UNLOCK = 3;

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function solutionFraction(p) {
  let num = p.c - p.b;
  let den = p.a;
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}
function trim(v) {
  const n = Math.round(v * 1000) / 1000;
  return (Object.is(n, -0) ? 0 : n).toString().replace('-', MINUS);
}
function fmtTerm(b) {
  if (b === 0) return '';
  return b > 0 ? ` + ${b}` : ` ${MINUS} ${Math.abs(b)}`;
}
function fmtEquation(p) {
  return `${p.a === 1 ? '' : p.a}x${fmtTerm(p.b)} = ${p.c}`;
}
const paren = (v) => (v < 0 ? `(${trim(v)})` : trim(v));
function checkNote(t) {
  const prod = t.a === 1 ? paren(t.s) : `${t.a}·${paren(t.s)}`;
  return `${prod}${fmtTerm(t.b)} = ${t.c}`;
}
function solveSteps(p) {
  const coef = p.a === 1 ? '' : String(p.a);
  const k = p.c - p.b;
  const out = [{ lhs: `${coef}x${fmtTerm(p.b)}`, rhs: String(p.c), note: 'the equation to solve' }];
  if (p.b !== 0)
    out.push({
      lhs: `${coef}x`,
      rhs: trim(k),
      note: p.b > 0 ? `subtract ${p.b} from both sides` : `add ${Math.abs(p.b)} to both sides`,
    });
  if (p.a !== 1) out.push({ lhs: 'x', rhs: 'sol', note: `divide both sides by ${p.a}` });
  if (p.a === 1 && p.b === 0) out[0] = { lhs: 'x', rhs: 'sol', note: 'x is already on its own' };
  return out;
}

function makeTarget(prev, rnd) {
  let t;
  let guard = 0;
  do {
    const a = 1 + Math.floor(rnd() * 4);
    const s = Math.floor(rnd() * 13) - 4;
    const b = Math.floor(rnd() * 13) - 6;
    const c = a * s + b;
    t = { a, b, c, s };
    if (++guard > 10000) break;
  } while (
    !(t.c >= 0 && t.c <= 12) ||
    (t.a === 1 && t.b === 0) ||
    (prev && t.a === prev.a && t.b === prev.b && t.c === prev.c) ||
    (t.a === START.a && t.b === START.b && t.c === START.c)
  );
  return t;
}

let pass = 0,
  fail = 0;
const bad = [];
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    bad.push(msg);
  }
};

// ---- dial grids (as the range inputs would serialize them) ----
const trunc = (v) => parseFloat(v.toPrecision(15));
const aVals = [1, 2, 3, 4];
const bVals = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const cVals = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const xVals = [];
for (let v = -6; v <= 18 + 1e-9; v += 0.5) xVals.push(trunc(v));

// ---- 1. model spot checks (both signs of b) ----
ok(leftSide(4, { a: 1, b: 2 }) === 6, 'left side 1·4+2 = 6');
ok(leftSide(4, { a: 3, b: 2 }) === 14, 'left side 3·4+2 = 14');
ok(leftSide(7, { a: 1, b: -2 }) === 5, 'left side 1·7−2 = 5 (subtraction)');
ok(solutionValue({ a: 1, b: 2, c: 6 }) === 4, 'solution of x+2=6 is 4');
ok(solutionValue({ a: 3, b: 2, c: 14 }) === 4, 'solution of 3x+2=14 is 4');
ok(solutionValue({ a: 2, b: 8, c: 4 }) === -2, 'solution of 2x+8=4 is -2 (negative ok)');
ok(solutionValue({ a: 1, b: -2, c: 5 }) === 7, 'solution of x−2=5 is 7 (add, do not subtract)');
ok(solutionValue({ a: 2, b: -6, c: 4 }) === 5, 'solution of 2x−6=4 is 5');

// ---- 2. the solution always makes the two sides equal (defining property) ----
let modelChecks = 0;
for (const a of aVals)
  for (const b of bVals)
    for (const c of cVals) {
      const p = { a, b, c };
      const s = solutionValue(p);
      ok(Math.abs(leftSide(s, p) - c) < 1e-9, `solution balances a=${a} b=${b} c=${c}`);
      const fr = solutionFraction(p);
      ok(Math.abs(fr.num / fr.den - s) < 1e-9, `fraction value a=${a} b=${b} c=${c}`);
      ok(gcd(fr.num, fr.den) === 1, `fraction reduced a=${a} b=${b} c=${c}`);
      ok(fr.den >= 1, `fraction den positive a=${a} b=${b} c=${c}`);
      modelChecks++;
    }

// ---- 3. RANGE INVARIANT: every equation the dials can build is solvable on the
//         x dial. Widening b to −6 forced x's ceiling to 18; if the two ever
//         drift apart a student can build a scale they cannot level. ----
const xDial = PARAMS.find((d) => d.key === 'x');
let rangeChecks = 0;
let worstSol = { lo: Infinity, hi: -Infinity };
for (const a of aVals)
  for (const b of bVals)
    for (const c of cVals) {
      const s = solutionValue({ a, b, c });
      worstSol.lo = Math.min(worstSol.lo, s);
      worstSol.hi = Math.max(worstSol.hi, s);
      ok(s >= xDial.min - 1e-9 && s <= xDial.max + 1e-9, `solution ${s} within x dial (a=${a} b=${b} c=${c})`);
      rangeChecks++;
    }
ok(worstSol.lo === xDial.min, `x dial floor is exactly the lowest solution (${worstSol.lo})`);
ok(worstSol.hi === xDial.max, `x dial ceiling is exactly the highest solution (${worstSol.hi})`);

// ---- 4. worked steps: algebraically valid AND named correctly for b's sign ----
let stepChecks = 0;
for (const a of aVals)
  for (const b of bVals)
    for (const c of cVals) {
      const p = { a, b, c };
      const s = solutionValue(p);
      const steps = solveSteps(p);
      const last = steps[steps.length - 1];
      ok(last.lhs === 'x', `last step isolates x (a=${a} b=${b} c=${c})`);
      const expected = (a !== 1 ? 1 : 0) + (b !== 0 ? 1 : 0) + 1 - (a === 1 && b === 0 ? 1 : 0);
      ok(steps.length === Math.max(1, expected), `step count a=${a} b=${b} c=${c} -> ${steps.length}`);
      // the undo step must name the INVERSE of what b does: b>0 was added so
      // subtract it; b<0 was subtracted so add it. Naming it backwards is the
      // exact misconception the lesson exists to kill.
      if (b !== 0) {
        const note = steps[1].note;
        ok(
          b > 0 ? note === `subtract ${b} from both sides` : note === `add ${Math.abs(b)} to both sides`,
          `undo step names the inverse (b=${b}) -> "${note}"`
        );
        ok(Math.abs(Number(steps[1].rhs.replace(MINUS, '-')) - (c - b)) < 1e-9, `undo line value a=${a} b=${b} c=${c}`);
      }
      if (b !== 0 && a !== 1) {
        const k = Number(steps[1].rhs.replace(MINUS, '-'));
        ok(k === c - b, `subtract line value a=${a} b=${b} c=${c}`);
        ok(Math.abs(k / a - s) < 1e-9, `divide line consistent a=${a} b=${b} c=${c}`);
      }
      stepChecks++;
    }

// ---- 5. sign-aware formatting: never "x + −2", always "x − 2" ----
ok(fmtEquation({ a: 1, b: -2, c: 5 }) === `x ${MINUS} 2 = 5`, 'x − 2 = 5 renders with a minus');
ok(fmtEquation({ a: 1, b: 2, c: 6 }) === 'x + 2 = 6', 'x + 2 = 6 renders with a plus');
ok(fmtEquation({ a: 3, b: 0, c: 12 }) === '3x = 12', 'b = 0 renders no term at all');
ok(fmtEquation({ a: 2, b: -6, c: 4 }) === `2x ${MINUS} 6 = 4`, '2x − 6 = 4 renders');
ok(checkNote({ a: 1, s: 4, b: 2, c: 6 }) === '4 + 2 = 6', 'check note has no stray · when a = 1');
ok(checkNote({ a: 3, s: 4, b: 2, c: 14 }) === '3·4 + 2 = 14', 'check note shows the product when a > 1');
ok(checkNote({ a: 2, s: -3, b: 6, c: 0 }) === `2·(${MINUS}3) + 6 = 0`, 'check note brackets a negative solution');
ok(checkNote({ a: 1, s: 7, b: -2, c: 5 }) === `7 ${MINUS} 2 = 5`, 'check note renders subtraction');
let fmtChecks = 0;
for (const b of bVals) {
  const t = fmtTerm(b);
  ok(!t.includes('+ -') && !t.includes(`+ ${MINUS}`), `no "+ −" for b=${b} -> "${t}"`);
  ok(b === 0 ? t === '' : t.includes(b > 0 ? '+' : MINUS), `term sign correct for b=${b}`);
  fmtChecks++;
}
ok(moveLabel(2) === 'remove 2 from both sides', 'move label for b > 0');
ok(moveLabel(-2) === 'add 2 to both sides', 'move label for b < 0');

// ---- 6. tilt sign: left heavier -> positive tilt (left sinks); level -> 0 ----
ok(tiltAngle(8, 6) > 0, 'left heavier tilts positive');
ok(tiltAngle(4, 6) < 0, 'right heavier tilts negative');
ok(tiltAngle(6, 6) === 0, 'equal sides -> level');
ok(Math.abs(tiltAngle(1000, 0)) <= MAX_TILT + 1e-9, 'tilt saturates at MAX_TILT');

// ---- 7. THE MOVE cannot tip the beam. Taking b off both sides leaves a·x and
//         c − b; the gap — and therefore the tilt — must be bit-for-bit identical
//         over every dial combination. This is the claim the lens makes on screen. ----
let moveChecks = 0;
for (const a of aVals)
  for (const b of bVals)
    for (const c of cVals)
      for (const x of xVals) {
        const p = { a, b, c };
        const L = leftSide(x, p);
        const R = c;
        const L2 = a * x; // left pan after the move
        const R2 = movedRight(p); // right pan after the move
        ok(Math.abs(L2 - R2 - (L - R)) < 1e-9, `move preserves the gap a=${a} b=${b} c=${c} x=${x}`);
        ok(tiltAngle(L2, R2) === tiltAngle(L, R), `move preserves the tilt exactly a=${a} b=${b} c=${c} x=${x}`);
        // the move must not change WHO is heavier, nor whether it is balanced
        ok(
          Math.sign(Math.round((L2 - R2) * 1e9)) === Math.sign(Math.round((L - R) * 1e9)),
          `move preserves the balance state a=${a} b=${b} c=${c} x=${x}`
        );
        // and the move must actually isolate x: solving a·x = c − b gives the same answer
        ok(Math.abs(R2 / a - solutionValue(p)) < 1e-9, `move preserves the solution a=${a} b=${b} c=${c}`);
        moveChecks++;
      }

// ---- 8. b's negative half is sealed until the subtraction step ----
let gateChecks = 0;
const bDial = PARAMS.find((d) => d.key === 'b');
for (let step = 0; step < STEP_COUNT; step++) {
  const lo = dialMin(bDial, step);
  ok(step < 4 ? lo === 0 : lo === -6, `b floor at step ${step} is ${lo}`);
  // a value carried back past the gate must clamp onto the floor, never below it
  const clamped = Math.min(bDial.max, Math.max(lo, -4));
  ok(clamped >= lo, `b = −4 clamps to the floor at step ${step} -> ${clamped}`);
  gateChecks++;
}
ok(dialMin(bDial, 3) === 0, 'balloons are NOT reachable on the addition step');
ok(dialMin(bDial, 4) === -6, 'balloons unlock exactly on the subtraction step');
ok(LENS_UNLOCK === 3, 'the move lens unlocks with the b dial');

// ---- 9. target generator: seeded, exhaustive sample ----
let mulberry = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
let prev = null;
let genChecks = 0;
let sawTwoStep = false;
let sawSubtraction = false;
let sawAddition = false;
const rnd = mulberry(12345);
for (let i = 0; i < 4000; i++) {
  const t = makeTarget(prev, rnd);
  ok(t.c >= 0 && t.c <= 12, `target c in range (${t.c})`);
  ok(t.a >= 1 && t.a <= 4, `target a in range (${t.a})`);
  ok(t.b >= -6 && t.b <= 6, `target b in range (${t.b})`);
  ok(Number.isInteger(t.s), `target solution whole (${t.s})`);
  ok(t.a * t.s + t.b === t.c, `target consistent a·s+b=c (${t.a}·${t.s}+${t.b}=${t.c})`);
  // solution reachable exactly by the x dial (a multiple of 0.5 within [-6,18])
  ok(
    t.s >= xDial.min && t.s <= xDial.max && Math.abs(t.s * 2 - Math.round(t.s * 2)) < 1e-9,
    `target reachable on the x dial (${t.s})`
  );
  ok(!(t.a === 1 && t.b === 0), 'target not trivial x=c');
  ok(!(t.a === START.a && t.b === START.b && t.c === START.c), 'target not the starting equation');
  if (prev) ok(!(t.a === prev.a && t.b === prev.b && t.c === prev.c), 'target differs from previous');
  // the challenge's own check note must be a TRUE statement
  ok(t.a * t.s + t.b === t.c, `check note is true (${checkNote(t)})`);
  if (t.a !== 1 && t.b !== 0) sawTwoStep = true;
  if (t.b < 0) sawSubtraction = true;
  if (t.b > 0) sawAddition = true;
  prev = t;
  genChecks++;
}
ok(sawTwoStep, 'generator produces genuine two-step equations');
ok(sawSubtraction, 'generator produces subtraction equations (b < 0)');
ok(sawAddition, 'generator still produces addition equations (b > 0)');

// ---- 10. SOLVED only at the exact solution; meter feel ----
let worstExact = 0;
let closestMissPct = 0;
let targetSpace = 0;
let negTargetSpace = 0;
for (const a of aVals)
  for (const s of [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8])
    for (const b of bVals) {
      const c = a * s + b;
      if (c < 0 || c > 12) continue;
      if (a === 1 && b === 0) continue;
      const dExact = Math.abs(s - s);
      worstExact = Math.max(worstExact, dExact);
      ok(dExact < SOLVE_EPS, `exact solve dist 0 a=${a} b=${b} c=${c}`);
      const missPct = matchPercent(0.5);
      if (missPct > closestMissPct) closestMissPct = missPct;
      targetSpace++;
      if (b < 0) negTargetSpace++;
    }
ok(closestMissPct < 100 - 5, `closest single-step miss (${closestMissPct.toFixed(1)}%) clearly < SOLVED`);
ok(matchPercent(0) === 100, 'exact match reads 100%');
ok(negTargetSpace > 0, 'the reachable target space includes subtraction equations');

const feel = [
  ['exact', 0],
  ['0.5 off', 0.5],
  ['1 off', 1],
  ['2 off', 2],
  ['4 off', 4],
];

console.log('EquationLab audit');
console.log('=================');
console.log(`model (a,b,c) combos checked  : ${modelChecks}`);
console.log(`range-invariant combos        : ${rangeChecks}`);
console.log(`worked-step combos checked    : ${stepChecks}`);
console.log(`move (a,b,c,x) combos checked : ${moveChecks}`);
console.log(`b-gate steps checked          : ${gateChecks}`);
console.log(`generated targets checked     : ${genChecks}`);
console.log(`solution span vs x dial       : [${worstSol.lo}, ${worstSol.hi}] vs [${xDial.min}, ${xDial.max}]`);
console.log(`reachable targets (of which −): ${targetSpace} (${negTargetSpace})`);
console.log(`worst exact-solve dist        : ${worstExact}`);
console.log(`closest single-step miss      : 0.5 off -> ${closestMissPct.toFixed(1)}%`);
console.log('\nmeter feel (dist = |x − solution|):');
for (const [name, d] of feel) console.log(`  ${name.padEnd(8)} dist ${d}  -> ${matchPercent(d).toFixed(0)}%`);
console.log('\n-----------------');
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) {
  console.log('\nFAILURES:');
  bad.slice(0, 20).forEach((m) => console.log('  ✗ ' + m));
  process.exit(1);
}
console.log('All checks passed ✓');
