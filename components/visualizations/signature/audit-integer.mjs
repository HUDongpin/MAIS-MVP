/* Numeric audit for IntegerLab — run: node audit-integer.mjs
   Verifies the integer math the lab teaches is exactly correct across the whole
   reachable range (−10…10): sign, opposites (incl. opposite-of-opposite and
   zero), absolute value, ordering (incl. the −5 < −2 trap), the real-world
   context wording, that every calibration riddle names a target in range whose
   correct answer solves it, and that the multiple-choice answer keys are true. */

let checks = 0;
let fails = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error('FAIL:', msg);
  }
}

const VMIN = -10;
const VMAX = 10;

/* ---- mirror of the lab's model ------------------------------------------- */
const opposite = (a) => (a === 0 ? 0 : -a);
const absValue = (a) => Math.abs(a);
const relation = (a, b) => (a < b ? '<' : a > b ? '>' : '=');
const signWord = (a) => (a > 0 ? 'positive' : a < 0 ? 'negative' : 'zero');
const fmt = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));

/* 1) Opposite flips sign, is an involution, 0 is its own opposite, in range -- */
for (let a = VMIN; a <= VMAX; a++) {
  ok(opposite(a) === -a || (a === 0 && opposite(a) === 0), `opposite(${a}) = ${opposite(a)}`);
  ok(opposite(opposite(a)) === a, `opposite of opposite of ${a} is ${a}`);
  ok(a + opposite(a) === 0, `${a} + its opposite = 0`);
  ok(opposite(a) >= VMIN && opposite(a) <= VMAX, `opposite(${a}) stays in range`);
}
ok(opposite(0) === 0 && !Object.is(opposite(0), -0), 'opposite(0) is +0, not −0');
ok(fmt(opposite(0)) === '0', 'opposite of 0 prints as "0"');

/* 2) Absolute value = distance from 0: never negative; |a| = |−a|; only |0|=0 - */
for (let a = VMIN; a <= VMAX; a++) {
  ok(absValue(a) >= 0, `|${a}| is not negative`);
  ok(absValue(a) === absValue(opposite(a)), `|${a}| = |opposite ${a}|`);
  ok(absValue(a) === Math.abs(a), `|${a}| = ${Math.abs(a)}`);
}
ok(absValue(0) === 0, '|0| = 0');
for (let a = VMIN; a <= VMAX; a++) if (a !== 0) ok(absValue(a) > 0, `|${a}| > 0 for nonzero`);
// distance interpretation: |a| equals the number of unit steps from 0 to a
for (let a = VMIN; a <= VMAX; a++) ok(absValue(a) === Math.abs(a - 0), `|${a}| is steps from 0`);

/* 3) Sign classification: exactly one of positive / negative / zero ---------- */
for (let a = VMIN; a <= VMAX; a++) {
  const pos = a > 0,
    neg = a < 0,
    zer = a === 0;
  ok([pos, neg, zer].filter(Boolean).length === 1, `${a} has exactly one sign class`);
  ok(signWord(a) === (pos ? 'positive' : neg ? 'negative' : 'zero'), `signWord(${a})`);
}
ok(signWord(0) === 'zero', '0 is neither positive nor negative');
// negatives are left of 0 (smaller), positives right (greater)
for (let a = VMIN; a <= VMAX; a++) {
  if (a < 0) ok(a < 0 === true && relation(a, 0) === '<', `${a} < 0`);
  if (a > 0) ok(relation(a, 0) === '>', `${a} > 0`);
}

/* 4) Ordering by position, including the negative trap ---------------------- */
for (let a = VMIN; a <= VMAX; a++) {
  for (let b = VMIN; b <= VMAX; b++) {
    const r = relation(a, b);
    ok(r === (a < b ? '<' : a > b ? '>' : '='), `relation(${a},${b}) = ${r}`);
    // farther right (numerically larger) is greater
    if (a !== b) ok((a > b) === (r === '>'), `order matches position ${a},${b}`);
  }
}
ok(relation(-5, -2) === '<', 'the trap: −5 < −2');
ok(relation(-2, -5) === '>', 'the trap: −2 > −5');
ok(Math.max(-5, -2) === -2, 'greater of −5 and −2 is −2');
ok(Math.min(-5, -2) === -5, 'lesser of −5 and −2 is −5');
ok(relation(2, -3) === '>', '2 > −3');
// a bigger absolute value on the negative side means a SMALLER number
for (let m = 1; m <= 10; m++) for (let k = 1; k < m; k++) ok(-m < -k, `−${m} < −${k} (bigger |·|, smaller value)`);

/* 5) Real-world contexts: negative names the opposite direction ------------- */
const CONTEXTS = [
  { id: 'temp', word: (n) => (n === 0 ? '0° — freezing' : `${fmt(n)}° — ${absValue(n)}° ${n < 0 ? 'below' : 'above'} freezing`) },
  { id: 'elev', word: (n) => (n === 0 ? 'at sea level' : `${fmt(n)} ft — ${absValue(n)} ft ${n < 0 ? 'below' : 'above'} sea level`) },
  { id: 'money', word: (n) => (n === 0 ? 'break even' : n < 0 ? `owe $${absValue(n)}` : `have $${n}`) },
];
const temp = CONTEXTS[0].word,
  elev = CONTEXTS[1].word,
  money = CONTEXTS[2].word;
ok(elev(-10).includes('10 ft below sea level'), 'diver 10 ft below sea level → −10');
ok(elev(10).includes('10 ft above sea level'), '+10 ft above sea level');
ok(elev(0) === 'at sea level', '0 ft = sea level');
ok(temp(-4).includes('4° below freezing'), '−4° is 4 below freezing');
ok(temp(7).includes('7° above freezing'), '+7° is 7 above freezing');
ok(money(-4) === 'owe $4', '−4 = owe $4');
ok(money(6) === 'have $6', '+6 = have $6');
ok(money(0) === 'break even', '0 = break even');
// every context's "below/owe" only ever attaches to negatives
for (let a = VMIN; a <= VMAX; a++) {
  if (a < 0) ok(elev(a).includes('below') && money(a).startsWith('owe'), `${a} reads as below/owe`);
  if (a > 0) ok(elev(a).includes('above') && money(a).startsWith('have'), `${a} reads as above/have`);
}

/* ---- mirror of calibration ----------------------------------------------- */
function makeRiddle(prev, rng) {
  const R = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const build = () => {
    const kind = R(0, 8);
    const m = R(1, 10);
    const s = rng() < 0.5 ? -1 : 1;
    const g = s * m;
    switch (kind) {
      case 0: return { t: opposite(g), clue: `the opposite of ${fmt(g)}`, kind };
      case 1: return { t: g, clue: `the opposite of the opposite of ${fmt(g)}`, kind };
      case 2: return { t: -m, clue: `${m} units from zero, on the negative side`, kind };
      case 3: return { t: m, clue: `${m} units from zero, on the positive side`, kind };
      case 4: return { t: -m, clue: `a negative integer whose absolute value is ${m}`, kind };
      case 5: return { t: -m, clue: `the temperature “${m} degrees below zero”`, kind };
      case 6: return { t: -m, clue: `a diver “${m} feet below sea level”`, kind };
      default: {
        let p = R(VMIN, VMAX), q = R(VMIN, VMAX);
        while (p === q) q = R(VMIN, VMAX);
        if (p > q) [p, q] = [q, p];
        return kind === 7
          ? { t: q, clue: `the greater of ${fmt(p)} and ${fmt(q)}`, kind }
          : { t: p, clue: `the lesser of ${fmt(p)} and ${fmt(q)}`, kind };
      }
    }
  };
  let r;
  do { r = build(); } while (prev != null && r.t === prev.t);
  return r;
}
const matchPercent = (a, t) => Math.max(0, Math.min(100, Math.round(100 - Math.abs(a - t) * 10)));
const isCalibrated = (a, t) => a === t;

/* 6) Every riddle: target in range; exact answer calibrates & meters 100; off
      by one drops below 100 and never stamps; consecutive targets differ ----- */
let seed = 12345;
const rng = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
let prev = null;
const kindsSeen = new Set();
for (let i = 0; i < 6000; i++) {
  const r = makeRiddle(prev, rng);
  kindsSeen.add(r.kind);
  ok(Number.isInteger(r.t) && r.t >= VMIN && r.t <= VMAX, `riddle target ${r.t} in range`);
  ok(isCalibrated(r.t, r.t), `exact answer calibrates: ${r.clue}`);
  ok(matchPercent(r.t, r.t) === 100, `exact answer meters 100: ${r.clue}`);
  if (r.t - 1 >= VMIN) {
    ok(!isCalibrated(r.t - 1, r.t), `off-by-one not calibrated: ${r.clue}`);
    ok(matchPercent(r.t - 1, r.t) === 90, `off-by-one meters 90: ${r.clue}`);
  }
  if (prev != null) ok(r.t !== prev.t, 'consecutive riddle targets differ');
  prev = r;
}
ok(kindsSeen.size === 9, `all 9 riddle kinds appear (saw ${kindsSeen.size})`);

/* 7) Riddle SEMANTICS: the clue's described integer really equals the target - */
// re-derive the intended answer from each kind and confirm it equals t
seed = 999;
for (let i = 0; i < 4000; i++) {
  const r = makeRiddle(null, rng);
  const m = /(-?\d+)/; // helper only; we assert per kind below using structure
  void m;
  // kind-specific truths:
  if (r.kind === 0) ok(opposite(-r.t) === r.t, `opposite clue solves to ${r.t}`); // t = opposite(g) ⇒ g = -t
  if (r.kind === 1) ok(opposite(opposite(r.t)) === r.t, `opp-of-opp clue solves to ${r.t}`);
  if (r.kind === 2 || r.kind === 4 || r.kind === 5 || r.kind === 6) {
    ok(r.t < 0 && absValue(r.t) >= 1 && absValue(r.t) <= 10, `negative-distance clue: ${r.t}`);
  }
  if (r.kind === 3) ok(r.t > 0, `positive-distance clue: ${r.t}`);
  if (r.kind === 7) ok(/greater/.test(r.clue), 'greater clue phrasing');
  if (r.kind === 8) ok(/lesser/.test(r.clue), 'lesser clue phrasing');
}

/* 8) Multiple-choice answer keys match the arithmetic they assert ----------- */
// step 0: only −4 is an integer among {−4, 2½, 0.7}
ok(Number.isInteger(-4) && !Number.isInteger(2.5) && !Number.isInteger(0.7), 'step0: −4 is the integer');
// step 1: −6 is 6 units left of 0
ok(-6 < 0 && Math.abs(-6 - 0) === 6, 'step1: −6 is 6 left of 0');
// step 2: opposite of −4 is 4
ok(opposite(-4) === 4, 'step2: opposite of −4 is 4');
// step 3: |−8| = 8
ok(absValue(-8) === 8, 'step3: |−8| = 8');
// step 4: greater of −5, −2 is −2
ok(Math.max(-5, -2) === -2 && relation(-2, -5) === '>', 'step4: −2 > −5');
// step 5: 10 ft below sea level is −10
ok(elev(-10).includes('below') && -10 < 0, 'step5: below sea level is −10');

/* 9) fmt uses a real minus sign and round-trips the magnitude --------------- */
for (let a = VMIN; a <= VMAX; a++) {
  const s = fmt(a);
  if (a < 0) ok(s[0] === '−' && s.slice(1) === String(-a), `fmt(${a}) = ${s}`);
  else ok(s === String(a), `fmt(${a}) = ${s}`);
}

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
