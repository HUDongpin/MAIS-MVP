/* ============================================================================
   audit-sequences.mjs — numeric audit for SequencesLab.jsx
   Run:  node audit-sequences.mjs

   Re-implements the lab's pure math and proves, exhaustively over (and beyond)
   the dial ranges, every invariant a K-12 student would rely on. No deps.

   Unlike a pure mirror, this audit PARSES the real SequencesLab.jsx for its
   dial ranges, calibration targets and start states — so it cannot pass while
   the shipped file drifts underneath it.
   ========================================================================== */

import { readFileSync } from 'node:fs';

let fail = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) {
    fail++;
    if (fail <= 40) console.error('  ✗ ' + msg);
  }
};
const section = (s) => console.log('\n· ' + s);

/* ---- read the REAL constants out of the shipped component --------------- */
const SRC = readFileSync(new URL('./SequencesLab.jsx', import.meta.url), 'utf8');
const num = (name) => {
  const m = SRC.match(new RegExp('const\\s+' + name + '\\s*=\\s*(-?\\d+)\\s*;'));
  if (!m) throw new Error('audit could not find constant ' + name + ' in SequencesLab.jsx');
  return parseInt(m[1], 10);
};
const A1_MIN = num('A1_MIN');
const A1_MAX = num('A1_MAX');
const D_MIN = num('D_MIN');
const D_MAX = num('D_MAX');
const N_MAX_ARITH = num('N_MAX_ARITH');
const N_MAX_GEOM = num('N_MAX_GEOM');
const R_VALUES = JSON.parse(SRC.match(/const\s+R_VALUES\s*=\s*(\[[^\]]*\])/)[1]);
const CALIB_TARGETS = JSON.parse(
  SRC.match(/const\s+CALIB_TARGETS\s*=\s*(\[[\s\S]*?\n\]);/)[1]
    .replace(/\/\/[^\n]*/g, '') // strip the trailing solution comments
    .replace(/(\w+):/g, '"$1":')
    .replace(/'/g, '"')
    .replace(/,(\s*[}\]])/g, '$1')
);
const CALIB_START = (() => {
  const m = SRC.match(/const\s+CALIB_START\s*=\s*\{([^}]*)\}/)[1].replace(/\/\*[\s\S]*?\*\//g, '');
  const g = (k) => {
    const mm = m.match(new RegExp(k + ':\\s*(-?\\d+|\'\\w+\')'));
    return mm ? mm[1].replace(/'/g, '') : null;
  };
  return { type: g('type'), a1: +g('a1'), d: +g('d'), rIdx: +g('rIdx') };
})();

console.log('SequencesLab audit — parsed from the real source:');
console.log(`  a₁ ∈ [${A1_MIN}, ${A1_MAX}]  d ∈ [${D_MIN}, ${D_MAX}]  r ∈ {${R_VALUES.join(', ')}}`);
console.log(`  n ≤ ${N_MAX_ARITH} (arith) / ${N_MAX_GEOM} (geom)  ·  ${CALIB_TARGETS.length} calibration targets`);

/* ---- mirror of the lab's pure math -------------------------------------- */
const ipow = (r, e) => {
  let out = 1;
  for (let i = 0; i < e; i++) out *= r;
  return out;
};
const term = (type, a1, d, r, n) => (type === 'geom' ? a1 * ipow(r, n - 1) : a1 + (n - 1) * d);
const hops = (n) => n - 1;
const explicitLinear = (a1, d) => ({ slope: d, intercept: a1 - d });
const geomLegal = (a1) => a1 !== 0;

/* the calibration gate, exactly as the component computes it */
const gate = (T, type, a1, d, r) =>
  type === T.type && term(type, a1, d, r, T.i1) === T.v1 && term(type, a1, d, r, T.i2) === T.v2;

const meter = (T, type, a1, d, r) => {
  const hitBoth = term(type, a1, d, r, T.i1) === T.v1 && term(type, a1, d, r, T.i2) === T.v2;
  const calibrated = hitBoth && type === T.type;
  if (calibrated) return 100;
  if (hitBoth) return 96;
  const err = Math.abs(term(type, a1, d, r, T.i1) - T.v1) + Math.abs(term(type, a1, d, r, T.i2) - T.v2);
  const scale = Math.max(8, Math.abs(T.v1) + Math.abs(T.v2));
  return Math.min(94, Math.max(0, Math.round(100 * (1 - Math.min(1, err / scale)))));
};

/* every legal dial state, as the UI can actually produce it */
function* allStates() {
  for (let a1 = A1_MIN; a1 <= A1_MAX; a1++) {
    for (let d = D_MIN; d <= D_MAX; d++) yield { type: 'arith', a1, d, r: 1 };
    if (!geomLegal(a1)) continue; // the a₁ = 0 guard: geometric mode steps over it
    for (const r of R_VALUES) yield { type: 'geom', a1, d: 0, r };
  }
}
const STATES = [...allStates()];

/* ========================================================================== */
section('1. Arithmetic: the explicit rule, and recursive ⇔ explicit');
for (const s of STATES) {
  if (s.type !== 'arith') continue;
  for (let n = 1; n <= N_MAX_ARITH; n++) {
    ok(term('arith', s.a1, s.d, 1, n) === s.a1 + (n - 1) * s.d, `aₙ = a₁+(n−1)d at a₁=${s.a1} d=${s.d} n=${n}`);
    ok(Number.isSafeInteger(term('arith', s.a1, s.d, 1, n)), `arith term is an exact safe integer`);
    if (n > 1) {
      // THE recursive law: every term is the one before it, plus d — exactly
      const cur = term('arith', s.a1, s.d, 1, n);
      const prev = term('arith', s.a1, s.d, 1, n - 1);
      ok(cur - prev === s.d, `recursive: aₙ − aₙ₋₁ = d at a₁=${s.a1} d=${s.d} n=${n}`);
      ok(cur === prev + s.d, `recursive ⇔ explicit agree at a₁=${s.a1} d=${s.d} n=${n}`);
    }
  }
  ok(term('arith', s.a1, s.d, 1, 1) === s.a1, `a₁ is the first term (a₁=${s.a1})`);
}

section('2. THE FENCE-POST — the (n−1) the whole lab turns on');
for (let n = 1; n <= N_MAX_ARITH; n++) {
  ok(hops(n) === n - 1, `hops(${n}) = ${n - 1}`);
}
for (const s of STATES) {
  if (s.type !== 'arith') continue;
  for (let n = 1; n <= N_MAX_ARITH; n++) {
    // reaching aₙ takes exactly hops(n) additions of d — walk it and compare
    let walk = s.a1;
    for (let h = 0; h < hops(n); h++) walk += s.d;
    ok(walk === term('arith', s.a1, s.d, 1, n), `walking ${hops(n)} hops of d lands on aₙ (a₁=${s.a1} d=${s.d} n=${n})`);
    // and the off-by-one the lesson warns about overshoots by exactly one d
    if (s.d !== 0) {
      const wrong = s.a1 + n * s.d; // the classic a₁ + n·d error
      ok(wrong - term('arith', s.a1, s.d, 1, n) === s.d, `the n-instead-of-(n−1) error overshoots by exactly one d`);
    }
  }
}

section('3. The multiplied-out explicit form aₙ = d·n + (a₁ − d)');
for (const s of STATES) {
  if (s.type !== 'arith') continue;
  const { slope, intercept } = explicitLinear(s.a1, s.d);
  ok(Number.isSafeInteger(slope) && Number.isSafeInteger(intercept), 'the linear form has integer coefficients');
  for (let n = 1; n <= N_MAX_ARITH; n++) {
    ok(slope * n + intercept === term('arith', s.a1, s.d, 1, n), `d·n+(a₁−d) = a₁+(n−1)d at a₁=${s.a1} d=${s.d} n=${n}`);
  }
}

section('4. Geometric: the explicit rule and the constant ratio');
for (const s of STATES) {
  if (s.type !== 'geom') continue;
  for (let n = 1; n <= N_MAX_GEOM; n++) {
    const v = term('geom', s.a1, 0, s.r, n);
    ok(v === s.a1 * ipow(s.r, n - 1), `aₙ = a₁·r^(n−1) at a₁=${s.a1} r=${s.r} n=${n}`);
    ok(Number.isSafeInteger(v), `geom term stays an exact safe integer (a₁=${s.a1} r=${s.r} n=${n} → ${v})`);
    ok(v !== 0, `no geometric term is ever 0 (a₁≠0, r≠0) — the ratio always exists`);
    if (n > 1) {
      const prev = term('geom', s.a1, 0, s.r, n - 1);
      // the ratio law, checked by exact integer multiplication — never division
      ok(v === prev * s.r, `recursive: aₙ = aₙ₋₁·r at a₁=${s.a1} r=${s.r} n=${n}`);
      ok(v % prev === 0 && v / prev === s.r, `aₙ ÷ aₙ₋₁ = r exactly at a₁=${s.a1} r=${s.r} n=${n}`);
    }
  }
  ok(term('geom', s.a1, 0, s.r, 1) === s.a1, `geom a₁ is the first term`);
  // the exponent is the hop count — the shared fence-post, walked
  for (let n = 1; n <= N_MAX_GEOM; n++) {
    let walk = s.a1;
    for (let h = 0; h < hops(n); h++) walk *= s.r;
    ok(walk === term('geom', s.a1, 0, s.r, n), `multiplying ${hops(n)} times lands on aₙ (a₁=${s.a1} r=${s.r} n=${n})`);
  }
}

section('5. The taught boundary cases are correct, not excluded');
for (let a1 = A1_MIN; a1 <= A1_MAX; a1++) {
  // d = 0 → a constant arithmetic sequence (legitimate, and labelled as such)
  for (let n = 1; n <= N_MAX_ARITH; n++) ok(term('arith', a1, 0, 1, n) === a1, `d=0 is constant at a₁=${a1}`);
  if (!geomLegal(a1)) continue;
  // r = 1 → constant; r = −1 → alternating a₁, −a₁, a₁, …
  for (let n = 1; n <= N_MAX_GEOM; n++) {
    ok(term('geom', a1, 0, 1, n) === a1, `r=1 is constant at a₁=${a1}`);
    ok(term('geom', a1, 0, -1, n) === (n % 2 === 1 ? a1 : -a1), `r=−1 alternates at a₁=${a1} n=${n}`);
  }
  // a negative ratio flips the sign every single hop
  for (const r of R_VALUES.filter((v) => v < 0)) {
    for (let n = 2; n <= N_MAX_GEOM; n++) {
      const a = term('geom', a1, 0, r, n - 1);
      const b = term('geom', a1, 0, r, n);
      ok(Math.sign(a) !== Math.sign(b), `r<0 alternates sign every hop (a₁=${a1} r=${r} n=${n})`);
    }
  }
}
ok(!R_VALUES.includes(0), 'r = 0 is unreachable BY CONSTRUCTION (not by a guard) — R_VALUES excludes it');
ok(!STATES.some((s) => s.type === 'geom' && s.a1 === 0), 'a₁ = 0 is unreachable in geometric mode — no 0,0,0,… sequence');

section('6. Calibration — every target is solvable on the real dial grid');
for (const T of CALIB_TARGETS) {
  const sols = STATES.filter((s) => gate(T, s.type, s.a1, s.d, s.r));
  ok(
    sols.length >= 1,
    `target ${T.type} a${T.i1}=${T.v1}, a${T.i2}=${T.v2} is REACHABLE on the dials ` +
      `(needs ${T.type === 'arith' ? `d=${(T.v2 - T.v1) / (T.i2 - T.i1)}, a₁=${T.v1 - ((T.v2 - T.v1) / (T.i2 - T.i1)) * (T.i1 - 1)}` : '?'})`
  );
  // and it is not already solved the moment the challenge opens
  const startR = R_VALUES[CALIB_START.rIdx];
  ok(
    !gate(T, CALIB_START.type, CALIB_START.a1, CALIB_START.d, startR),
    `the calibration start state does not pre-solve ${T.type} a${T.i1}=${T.v1}`
  );
  if (sols.length) {
    const shown = sols.map((s) => `a₁=${s.a1},${s.type === 'geom' ? 'r' : 'd'}=${s.type === 'geom' ? s.r : s.d}`);
    console.log(`  ${T.type} a${T.i1}=${T.v1}, a${T.i2}=${T.v2} → ${sols.length} solution(s): ${shown.join(' · ')}`);
  }
}

section('7. THE STAMP IS SOUND — pct = 100 ⟺ calibrated, over every state × target');
for (const T of CALIB_TARGETS) {
  for (const s of STATES) {
    const g = gate(T, s.type, s.a1, s.d, s.r);
    const p = meter(T, s.type, s.a1, s.d, s.r);
    ok(
      (p === 100) === g,
      `no false stamp: target ${T.type} a${T.i1}=${T.v1} vs ${s.type} a₁=${s.a1} hop=${s.type === 'geom' ? s.r : s.d} → pct=${p}, gate=${g}`
    );
    ok(p >= 0 && p <= 100, 'the meter stays in [0,100]');
    // a near miss must never reach the stamp
    if (!g) ok(p <= 96, `a non-solution never exceeds 96% (got ${p})`);
  }
}

section('8. Two terms do not determine the family — the lab teaches this, so check it');
let ambiguous = 0;
for (const T of CALIB_TARGETS) {
  // states that hit BOTH terms while being the OTHER family: reachable ⇒ the
  // "both terms land, wrong family" branch in the UI is a real state a student
  // can reach, not dead code
  const crossers = STATES.filter(
    (s) => s.type !== T.type && term(s.type, s.a1, s.d, s.r, T.i1) === T.v1 && term(s.type, s.a1, s.d, s.r, T.i2) === T.v2
  );
  if (crossers.length) {
    ambiguous++;
    const c = crossers[0];
    ok(
      !gate(T, c.type, c.a1, c.d, c.r),
      `a wrong-family state hitting both terms is NOT stamped (target ${T.type} a${T.i1}=${T.v1})`
    );
    ok(meter(T, c.type, c.a1, c.d, c.r) === 96, 'the wrong-family near-solution reads exactly 96%');
    console.log(
      `  ambiguity reachable: ${T.type} a${T.i1}=${T.v1}, a${T.i2}=${T.v2} is ALSO hit by ` +
        `${c.type} a₁=${c.a1}, ${c.type === 'geom' ? 'r=' + c.r : 'd=' + c.d} — the "wrong family" lesson fires`
    );
  }
}
console.log(`  ${ambiguous} of ${CALIB_TARGETS.length} targets are hit by both families`);

section('9. Arithmetic reconstruction from two terms is UNIQUE (the capstone skill is well-posed)');
for (const T of CALIB_TARGETS.filter((t) => t.type === 'arith')) {
  const sols = STATES.filter((s) => gate(T, s.type, s.a1, s.d, s.r));
  ok(sols.length === 1, `two terms + "arithmetic" pin down exactly one sequence (a${T.i1}=${T.v1} → ${sols.length} found)`);
  const d = (T.v2 - T.v1) / (T.i2 - T.i1);
  ok(Number.isInteger(d), `the implied d is a whole number (${d}) — reachable on an integer dial`);
  if (sols.length === 1) {
    ok(sols[0].d === d, `the found d matches (v₂−v₁)/(i₂−i₁) = ${d}`);
    ok(sols[0].a1 === T.v1 - d * (T.i1 - 1), `the found a₁ matches v₁ − d(i₁−1)`);
  }
}

section('10. The render window never asks for a term the model cannot give');
for (const T of CALIB_TARGETS) {
  ok(T.i1 >= 1 && T.i2 >= 1, 'target indices are ≥ 1 (there is no a₀ in this lab)');
  ok(T.i1 < T.i2, 'the two given indices are ordered and distinct');
  ok(T.i2 <= 8, `the far ghost at a${T.i2} still fits the track (≤ 8 tiles stay readable)`);
  ok(T.v1 !== T.v2 || T.type === 'arith', 'equal values would make a geometric target degenerate');
}
// the geometric cap is what keeps the tiles honest: the largest term must print
const biggest = Math.max(...STATES.filter((s) => s.type === 'geom').map((s) => Math.abs(term('geom', s.a1, 0, s.r, N_MAX_GEOM))));
ok(Number.isSafeInteger(biggest), `the largest geometric term (${biggest.toLocaleString('en-US')}) is still an exact integer`);
console.log(`  largest term the geometric dials can produce: ${biggest.toLocaleString('en-US')} (exact)`);

section('11. WHAT IS PRINTED EQUALS WHAT IS COMPUTED (the negative-base trap)');
// The lab prints the explicit rule beside the sequence it generates. If the
// printed base is not parenthesised, "−2ⁿ⁻¹" reads as −(2ⁿ⁻¹) — a different
// number from the (−2)ⁿ⁻¹ actually computed — and the formula on screen
// contradicts the terms next to it. Mirror the renderer and evaluate it.
const paren = (v) => (v < 0 ? '(' + v + ')' : String(v));
ok(SRC.includes('function paren('), 'the component still has the paren() guard');
// every place the component raises the ratio to a power must go through paren()
const rendersRatioPower = [...SRC.matchAll(/\$\{fmt\(S?\.?r\)\}\$\{supDigits/g)];
ok(rendersRatioPower.length === 0, `no ratio is raised to a power without paren() (found ${rendersRatioPower.length} bare)`);
for (const s of STATES) {
  if (s.type !== 'geom') continue;
  for (let n = 1; n <= N_MAX_GEOM; n++) {
    const printed = `${s.a1} * ${paren(s.r)}**${n - 1}`;
    ok(eval(printed) === term('geom', s.a1, 0, s.r, n), `the printed rule evaluates to the printed term: ${printed}`);
    // and prove the parentheses are load-bearing, not decoration
    if (s.r < 0 && (n - 1) % 2 === 0 && n > 1) {
      const ambiguous = -(Math.abs(s.r) ** (n - 1)) * s.a1; // how a bare "−2ⁿ⁻¹" would read
      ok(ambiguous !== term('geom', s.a1, 0, s.r, n), `an unparenthesised base would print a WRONG value at a₁=${s.a1} r=${s.r} n=${n}`);
    }
  }
}

/* ========================================================================== */
console.log(`\n${checks.toLocaleString('en-US')} checks, ${fail} failure${fail === 1 ? '' : 's'}`);
process.exit(fail ? 1 : 0);
