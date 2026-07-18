/* ============================================================================
   audit-liketerms.mjs — numeric audit for LikeTermsLab.jsx
   Run:  node audit-liketerms.mjs
   Proves, exhaustively over the full dial ranges, the identity the lab teaches
       a·x + c + d·x + e  ===  (a+d)·x + (c+e)      for EVERY x
   and — the point of 6.EE.A.4 — that agreeing at ONE value of x is not
   equivalence, and can never fire the stamp. No dependencies.
   ========================================================================== */

const MINUS = '−';
let fail = 0;
const ok = (cond, msg) => {
  if (!cond) {
    fail++;
    console.error('  ✗ ' + msg);
  }
};

/* ---- mirror of the lab's pure model ------------------------------------- */
const X_RANGE = { min: -3, max: 5 };
const A_RANGE = { min: 1, max: 3 };
const D_RANGE = { min: 1, max: 3 };
const C_RANGE = { min: -3, max: 5 };
const E_RANGE = { min: -3, max: 5 };
const START = { x: 2, a: 2, c: 5, d: 3, e: 0 };

const evalScattered = (p, x) => p.a * x + p.c + p.d * x + p.e;
const collected = (p) => ({ A: p.a + p.d, C: p.c + p.e });
const evalCollected = (p, x) => {
  const { A, C } = collected(p);
  return A * x + C;
};
const fmt = (v) => (Object.is(v, -0) ? 0 : v).toString().replace('-', MINUS);
const coefStr = (k) => (k === 1 ? 'x' : `${k}x`);
function terms(p) {
  const out = [{ kind: 'x', sign: null, text: coefStr(p.a) }];
  if (p.c !== 0) out.push({ kind: 'c', sign: p.c > 0 ? '+' : MINUS, text: String(Math.abs(p.c)) });
  out.push({ kind: 'x', sign: '+', text: coefStr(p.d) });
  if (p.e !== 0) out.push({ kind: 'c', sign: p.e > 0 ? '+' : MINUS, text: String(Math.abs(p.e)) });
  return out;
}
const exprString = (p) => terms(p).map((t, i) => (i === 0 ? t.text : ` ${t.sign} ${t.text}`)).join('');
const simplifiedString = (A, C) => `${coefStr(A)}${C === 0 ? '' : ` ${C > 0 ? '+' : MINUS} ${Math.abs(C)}`}`;

const A_TARGET = { min: A_RANGE.min + D_RANGE.min, max: A_RANGE.max + D_RANGE.max };
const C_TARGET = { min: C_RANGE.min + E_RANGE.min, max: C_RANGE.max + E_RANGE.max };
const calErr = (p, t) => {
  const { A, C } = collected(p);
  return Math.abs(A - t.A) + Math.abs(C - t.C);
};
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 0.8)));
const MATCH_ERR = 0;

const range = (r) => {
  const o = [];
  for (let v = r.min; v <= r.max; v++) o.push(v);
  return o;
};
const XS = range(X_RANGE), AS = range(A_RANGE), DS = range(D_RANGE), CS = range(C_RANGE), ES = range(E_RANGE);
const ALL = [];
for (const a of AS) for (const c of CS) for (const d of DS) for (const e of ES) ALL.push({ a, c, d, e });

console.log('LikeTermsLab audit\n==================');
console.log(`   expressions: ${ALL.length}   values of x: ${XS.length}`);

/* ---- 1. THE identity, exhaustively, for every x ------------------------- */
{
  let n = 0;
  for (const p of ALL)
    for (const x of XS) {
      const s = evalScattered(p, x);
      const k = evalCollected(p, x);
      ok(Number.isInteger(s) && s === k, `a·x+c+d·x+e === (a+d)x+(c+e) at ${exprString(p)}, x=${x}`);
      n++;
    }
  console.log(`1. the identity ............. ${n} (expression × x) pairs agree exactly`);
  // and beyond the dial range, to show it is an identity and not a coincidence
  let m = 0;
  for (const p of ALL) for (let x = -200; x <= 200; x += 37) { ok(evalScattered(p, x) === evalCollected(p, x), `identity holds far out at x=${x}`); m++; }
  console.log(`   also verified at x well outside the dial range ... ${m} extra checks`);
}

/* ---- 2. Collecting is exactly "add the coefficients / add the constants" - */
{
  for (const p of ALL) {
    const { A, C } = collected(p);
    ok(A === p.a + p.d, `x-terms collect by adding coefficients (${p.a}+${p.d})`);
    ok(C === p.c + p.e, `constants collect by adding constants (${p.c}+${p.e})`);
    ok(A >= 2 && A <= 6, `A in 2..6 (got ${A})`);
    ok(C >= -6 && C <= 10, `C in −6..10 (got ${C})`);
  }
  // the canonical example from the brief
  const canon = { a: 2, c: 5, d: 3, e: 0 };
  ok(exprString(canon) === '2x + 5 + 3x', `START reads "2x + 5 + 3x" (got "${exprString(canon)}")`);
  const cc = collected(canon);
  ok(simplifiedString(cc.A, cc.C) === '5x + 5', `START collects to "5x + 5" (got "${simplifiedString(cc.A, cc.C)}")`);
  ok(exprString({ a: 2, c: 5, d: 3, e: 1 }) === '2x + 5 + 3x + 1', 'four-term form reads correctly');
  const c2 = collected({ a: 2, c: 5, d: 3, e: 1 });
  ok(simplifiedString(c2.A, c2.C) === '5x + 6', 'lesson: 2x + 5 + 3x + 1 → 5x + 6');
  console.log('2. collecting rule .......... coefficients & constants add; canonical example exact');
}

/* ---- 3. Equivalence is NOT "agrees at one x" (the 6.EE.A.4 trap) -------- */
{
  // the lesson's own claim: 3x + 9 and 5x + 5 agree at x = 2 and part at x = 3
  const f = (A, C, x) => A * x + C;
  ok(f(3, 9, 2) === 15 && f(5, 5, 2) === 15, 'lesson: 3x+9 and 5x+5 both give 15 at x=2');
  ok(f(3, 9, 3) === 18 && f(5, 5, 3) === 20, 'lesson: at x=3 they give 18 and 20');
  ok(f(3, 9, 3) !== f(5, 5, 3), 'lesson: so they are NOT equivalent');

  // in general: distinct collected forms MUST differ at some x in range, even
  // though they may coincide at one. Count how often the trap is available.
  let distinctPairs = 0;
  let coincideSomewhere = 0;
  const forms = [];
  for (let A = A_TARGET.min; A <= A_TARGET.max; A++)
    for (let C = C_TARGET.min; C <= C_TARGET.max; C++) forms.push({ A, C });
  for (const u of forms)
    for (const v of forms) {
      if (u.A === v.A && u.C === v.C) continue;
      distinctPairs++;
      const agreeAt = XS.filter((x) => f(u.A, u.C, x) === f(v.A, v.C, x));
      const differAt = XS.filter((x) => f(u.A, u.C, x) !== f(v.A, v.C, x));
      ok(differAt.length > 0, `distinct forms differ somewhere in range (${u.A}x+${u.C} vs ${v.A}x+${v.C})`);
      ok(agreeAt.length <= 1, `two distinct lines meet at most once (${u.A}x+${u.C} vs ${v.A}x+${v.C})`);
      if (agreeAt.length === 1) coincideSomewhere++;
    }
  console.log(`3. "agrees at one x" trap ... ${distinctPairs} distinct form-pairs; all differ somewhere`);
  console.log(`   ${coincideSomewhere} of them DO share a landing at exactly one x (the trap is real, and never stamps)`);
}

/* ---- 4. Calibration: stamp iff equivalent, no false stamp --------------- */
{
  const forms = [];
  for (let A = A_TARGET.min; A <= A_TARGET.max; A++)
    for (let C = C_TARGET.min; C <= C_TARGET.max; C++) forms.push({ A, C });

  // every target is reachable by some (a,c,d,e)
  for (const t of forms) {
    const sol = ALL.filter((p) => calErr(p, t) === 0);
    ok(sol.length > 0, `target ${simplifiedString(t.A, t.C)} is reachable`);
  }
  // MANY solutions per target — that multiplicity is the pedagogical point
  const counts = forms.map((t) => ALL.filter((p) => calErr(p, t) === 0).length);
  const minSol = Math.min(...counts);
  const maxSol = Math.max(...counts);
  ok(minSol >= 1, 'every target has at least one solution');

  let checked = 0;
  let falseStamp = 0;
  for (const t of forms)
    for (const p of ALL) {
      const err = calErr(p, t);
      const equiv = XS.every((x) => evalScattered(p, x) === t.A * x + t.C);
      // the meter's verdict must agree with true equivalence, exactly
      ok((err === MATCH_ERR) === equiv, `stamp ⟺ equivalent for ${exprString(p)} vs ${simplifiedString(t.A, t.C)}`);
      if (err === MATCH_ERR && !equiv) falseStamp++;
      checked++;
    }
  ok(falseStamp === 0, `no false CALIBRATED (found ${falseStamp})`);
  console.log(`4. calibration .............. ${checked} (answer,target) pairs; stamp ⟺ equivalent; 0 false stamps`);
  console.log(`   solutions per target: ${minSol}..${maxSol} — many expressions are equivalent (the point)`);
  console.log(`   meter: exact=${matchPercent(0).toFixed(0)}%  off-by-1=${matchPercent(1).toFixed(0)}%  off-by-2=${matchPercent(2).toFixed(0)}%`);

  // a wrong answer that shares the landing at the CURRENT x must still not stamp
  const t = { A: 5, C: 5 };
  const fake = ALL.find((p) => { const k = collected(p); return k.A === 3 && k.C === 9; });
  ok(!!fake, 'the 3x + 9 foil is buildable from the dials');
  ok(evalScattered(fake, 2) === 15 && t.A * 2 + t.C === 15, 'foil shares the landing at x = 2');
  ok(calErr(fake, t) > MATCH_ERR, 'foil sharing one landing is still NOT stamped');
  console.log('   a foil that shares the landing at x=2 is correctly refused ... ok');
}

/* ---- 5. Formatting: no "+ 0", coefficient 1 prints as x ----------------- */
{
  for (const p of ALL) {
    const s = exprString(p);
    ok(!/\+ 0\b/.test(s), `no "+ 0" term: "${s}"`);
    ok(!/\b1x\b/.test(s), `coefficient 1 prints as x: "${s}"`);
    ok(!/\s\s/.test(s), `no double spaces: "${s}"`);
    ok((s.match(/x/g) || []).length === 2, `always exactly two x-terms: "${s}"`);
    const { A, C } = collected(p);
    const t = simplifiedString(A, C);
    ok(!/\b1x\b/.test(t), `simplified coefficient 1 prints as x: "${t}"`);
    ok(!/[+−]\s*0$/.test(t), `simplified never ends "+ 0": "${t}"`);
  }
  console.log(`5. formatting ............... ${ALL.length} expressions well-formed (no "+ 0", no "1x")`);
  console.log(`   e.g. "${exprString({ a: 1, c: -3, d: 2, e: 0 })}" → "${(() => { const k = collected({ a: 1, c: -3, d: 2, e: 0 }); return simplifiedString(k.A, k.C); })()}"`);
  console.log(`        "${exprString({ a: 2, c: 5, d: 3, e: 1 })}" → "${(() => { const k = collected({ a: 2, c: 5, d: 3, e: 1 }); return simplifiedString(k.A, k.C); })()}"`);
}

/* ---- 6. makeTarget: reachable, non-trivial, re-rollable ---------------- */
{
  const s0 = collected(START);
  const makeTarget = (prev) => {
    let t;
    let guard = 0;
    do {
      t = {
        A: A_TARGET.min + Math.floor(Math.random() * (A_TARGET.max - A_TARGET.min + 1)),
        C: C_TARGET.min + Math.floor(Math.random() * (C_TARGET.max - C_TARGET.min + 1)),
      };
      guard++;
    } while (((t.A === s0.A && t.C === s0.C) || (prev && t.A === prev.A && t.C === prev.C)) && guard < 999);
    return t;
  };
  let prev = null;
  const seen = new Set();
  for (let i = 0; i < 20000; i++) {
    const t = makeTarget(prev);
    ok(t.A >= A_TARGET.min && t.A <= A_TARGET.max, `target A reachable (${t.A})`);
    ok(t.C >= C_TARGET.min && t.C <= C_TARGET.max, `target C reachable (${t.C})`);
    ok(!(t.A === s0.A && t.C === s0.C), 'target is never the form already on screen (5x + 5)');
    if (prev) ok(!(t.A === prev.A && t.C === prev.C), 'target never repeats the previous');
    ok(ALL.some((p) => calErr(p, t) === 0), `target ${simplifiedString(t.A, t.C)} is buildable`);
    seen.add(`${t.A}|${t.C}`);
    prev = t;
  }
  const total = (A_TARGET.max - A_TARGET.min + 1) * (C_TARGET.max - C_TARGET.min + 1) - 1;
  console.log(`6. makeTarget ............... 20000 draws all reachable & non-trivial, ${seen.size}/${total} distinct reached`);
}

console.log('\n' + (fail === 0 ? '✓ ALL CHECKS PASSED' : `✗ ${fail} CHECK(S) FAILED`));
process.exit(fail === 0 ? 0 : 1);
