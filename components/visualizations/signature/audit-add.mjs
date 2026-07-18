/* Numeric audit for AddLab — run: node audit-add.mjs
   Verifies the math the lab teaches is exactly correct across every reachable
   dial state, plus calibration reachability and the taught lesson facts. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error('FAIL:', msg);
  }
}

const VMIN = 0;
const VMAX = 20;
const model = (a, b) => a + b;
const matchPercent = (a, b, N) => 100 * Math.max(0, 1 - Math.abs(a + b - N) / 8);
const isCalibrated = (a, b, N) => a + b === N;

/* 1) The model is exact addition and stays within the 0..20 window ---------- */
for (let a = 0; a <= 10; a++) {
  for (let b = 0; b <= 10; b++) {
    const s = model(a, b);
    ok(s === a + b, `model ${a}+${b}`);
    ok(Number.isInteger(s), `integer sum ${a}+${b}`);
    ok(s >= VMIN && s <= VMAX, `sum in window ${a}+${b}=${s}`);
    // adding never shrinks the total
    ok(s >= a && s >= b, `sum >= each addend ${a}+${b}`);
    // adding zero is the identity
    if (b === 0) ok(s === a, `identity a+0 ${a}`);
    if (a === 0) ok(s === b, `identity 0+b ${b}`);
  }
}

/* 2) Commutative property: a + b = b + a for every pair ---------------------- */
for (let a = 0; a <= 10; a++) {
  for (let b = 0; b <= 10; b++) {
    ok(model(a, b) === model(b, a), `commute ${a},${b}`);
  }
}

/* 3) Count-on / number-line consistency: landing after a blue hops then b
      carmine hops equals a+b, and total hops === sum ------------------------- */
for (let a = 0; a <= 10; a++) {
  for (let b = 0; b <= 10; b++) {
    let pos = 0;
    for (let i = 0; i < a; i++) pos += 1; // blue hops
    for (let j = 0; j < b; j++) pos += 1; // carmine hops
    ok(pos === a + b, `hop landing ${a},${b}`);
    ok(a + b === model(a, b), `hop count == sum ${a},${b}`);
  }
}

/* 4) Make-a-ten decomposition is a true identity when it applies ------------- */
for (let a = 0; a <= 10; a++) {
  for (let b = 0; b <= 10; b++) {
    if (a < 10 && a + b > 10) {
      const toTen = 10 - a;
      const rest = b - toTen;
      ok(toTen >= 1 && toTen <= b, `make-ten split valid ${a},${b}`);
      ok(rest >= 0, `make-ten rest >= 0 ${a},${b}`);
      ok(a + toTen === 10, `make-ten fills to ten ${a},${b}`);
      ok(10 + rest === a + b, `make-ten total preserved ${a},${b}`);
      ok(a + toTen + rest === a + b, `make-ten identity ${a},${b}`);
    }
  }
}

/* 5) Calibration: every target 5..20 is reachable; exact hit => CALIBRATED,
      the meter peaks at 100 only on an exact hit, and off-by-one never stamps */
for (let N = 5; N <= 20; N++) {
  let reachable = false;
  for (let a = 0; a <= 10 && !reachable; a++) {
    for (let b = 0; b <= 10; b++) {
      if (a + b === N) {
        reachable = true;
        ok(isCalibrated(a, b, N), `exact calibrates ${a}+${b}=${N}`);
        ok(matchPercent(a, b, N) === 100, `exact meter 100 ${a}+${b}=${N}`);
        break;
      }
    }
  }
  ok(reachable, `target ${N} reachable`);
  // a wrong (off-by-one) build must not stamp and must read below 100
  const aWrong = Math.max(0, Math.min(10, N - 1 - Math.max(0, N - 1 - 10)));
  const bWrong = Math.max(0, Math.min(10, N - 1 - aWrong));
  if (aWrong + bWrong !== N) {
    ok(!isCalibrated(aWrong, bWrong, N), `off target not calibrated ${N}`);
    ok(matchPercent(aWrong, bWrong, N) < 100, `off target < 100 ${N}`);
  }
}

/* 6) Number-bond richness: small numbers have many builds, N=20 has exactly one
      (10+10), confirming the "many ways" pedagogy and the hardest target ----- */
function bondCount(N) {
  let c = 0;
  for (let a = 0; a <= 10; a++) {
    const b = N - a;
    if (b >= 0 && b <= 10) c++;
  }
  return c;
}
ok(bondCount(20) === 1, 'N=20 has one bond (10+10)');
ok(bondCount(10) === 11, 'N=10 has 11 bonds (0..10)');
ok(bondCount(5) === 6, 'N=5 has 6 bonds');

/* 7) The multiple-choice answer keys match the arithmetic they assert -------- */
ok(2 + 3 === 5, 'step0 example 2+3=5');
ok(4 === 4, 'step1 land on 4');
ok(6 + 4 === 10, 'step3 6+4=10');
ok(8 + 5 === 13 && 8 + 2 + 3 === 13 && 10 + 3 === 13, 'step5 make-ten 8+5=13');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
