/* ============================================================================
   audit-liketerms.mjs — numeric audit for LikeTermsLab.jsx.
   Run:  node audit-liketerms.mjs

   CONVERTED 2026-07-18 from a MIRROR to a SLICE. It used to keep a hand-written
   copy of the lab's model, which meant it could pass while the lab was wrong
   (see the mirror-audits note in project memory). It now SLICES the model out
   of LikeTermsLab.jsx (between MODEL:START and MODEL:END) and evaluates it, so
   the code under test is the code that ships. This conversion was the
   prerequisite for the 7.EE.A.2 markup extension below.

   What it proves:
     THE IDENTITY   a·x+c+d·x+e === (a+d)x+(c+e) for EVERY x (exhaustive + far out).
     COLLECTING     collecting is exactly "add the coefficients / add the constants".
     THE TRAP       agreeing at ONE x is not equivalence (6.EE.A.4) — and never stamps.
     CALIBRATION    stamp ⟺ equivalent, no false stamp; many solutions per target.
     FORMATTING     no "+ 0", coefficient 1 prints as x, always two x-terms.
     7.EE.A.2       a + (p/100)a = (1 + p/100)a as an EXACT fraction; the decimal
                    string is built from the integer p (no float artefact),
                    verified against BigInt.
   AND IT MUTATION-TESTS ITSELF.
   ========================================================================== */

import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('./LikeTermsLab.jsx', import.meta.url), 'utf8');
const m0 = SRC.match(/\/\* ==== MODEL:START[^\n]*\n([\s\S]*?)\/\* ==== MODEL:END/);
if (!m0) throw new Error('MODEL sentinels not found in LikeTermsLab.jsx');
const MODEL_BODY = m0[1];

const EXPORTS = [
  'X_RANGE', 'A_RANGE', 'D_RANGE', 'C_RANGE', 'E_RANGE', 'START', 'COLLECT_STEP',
  'evalScattered', 'collected', 'evalCollected', 'exprString', 'simplifiedString',
  'coefStr', 'terms', 'A_TARGET', 'C_TARGET', 'calErr', 'matchPercent', 'MATCH_ERR', 'makeTarget',
  'markupCoef', 'markupDecimal', 'pctCoef', 'MARKUP_MIN', 'MARKUP_MAX', 'MARKUP_STEP', 'STEPS',
];
function build(body) {
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${EXPORTS.join(', ')} };`)();
}

function runSuite(M) {
  let checks = 0; const failures = [];
  const ok = (c, msg) => { checks++; if (!c) failures.push(msg); };

  const range = (r) => { const o = []; for (let v = r.min; v <= r.max; v++) o.push(v); return o; };
  const XS = range(M.X_RANGE), AS = range(M.A_RANGE), DS = range(M.D_RANGE), CS = range(M.C_RANGE), ES = range(M.E_RANGE);
  const ALL = [];
  for (const a of AS) for (const c of CS) for (const d of DS) for (const e of ES) ALL.push({ a, c, d, e });

  /* 1. THE identity, exhaustively + far outside the dial range */
  for (const p of ALL) {
    for (const x of XS) {
      const s = M.evalScattered(p, x), k = M.evalCollected(p, x);
      ok(Number.isInteger(s) && s === k, `identity at ${M.exprString(p)}, x=${x}`);
    }
    for (let x = -200; x <= 200; x += 37) ok(M.evalScattered(p, x) === M.evalCollected(p, x), `identity far out x=${x}`);
  }

  /* 2. collecting = add coefficients / add constants */
  for (const p of ALL) {
    const { A, C } = M.collected(p);
    ok(A === p.a + p.d, `x-terms add (${p.a}+${p.d})`);
    ok(C === p.c + p.e, `constants add (${p.c}+${p.e})`);
  }
  ok(M.exprString({ a: 2, c: 5, d: 3, e: 0 }) === '2x + 5 + 3x', 'START reads "2x + 5 + 3x"');
  {
    const cc = M.collected({ a: 2, c: 5, d: 3, e: 0 });
    ok(M.simplifiedString(cc.A, cc.C) === '5x + 5', 'START collects to "5x + 5"');
    const c2 = M.collected({ a: 2, c: 5, d: 3, e: 1 });
    ok(M.simplifiedString(c2.A, c2.C) === '5x + 6', '2x+5+3x+1 → 5x+6');
  }

  /* 3. the "agrees at one x" trap */
  {
    const f = (A, C, x) => A * x + C;
    ok(f(3, 9, 2) === 15 && f(5, 5, 2) === 15, '3x+9 and 5x+5 both 15 at x=2');
    ok(f(3, 9, 3) !== f(5, 5, 3), 'they part at x=3');
    const forms = [];
    for (let A = M.A_TARGET.min; A <= M.A_TARGET.max; A++) for (let C = M.C_TARGET.min; C <= M.C_TARGET.max; C++) forms.push({ A, C });
    for (const u of forms) for (const v of forms) {
      if (u.A === v.A && u.C === v.C) continue;
      const agree = XS.filter((x) => f(u.A, u.C, x) === f(v.A, v.C, x));
      ok(XS.some((x) => f(u.A, u.C, x) !== f(v.A, v.C, x)), `distinct forms differ somewhere`);
      ok(agree.length <= 1, `two distinct lines meet at most once`);
    }
  }

  /* 4. calibration: stamp ⟺ equivalent, no false stamp */
  {
    const forms = [];
    for (let A = M.A_TARGET.min; A <= M.A_TARGET.max; A++) for (let C = M.C_TARGET.min; C <= M.C_TARGET.max; C++) forms.push({ A, C });
    for (const t of forms) ok(ALL.some((p) => M.calErr(p, t) === 0), `target ${M.simplifiedString(t.A, t.C)} reachable`);
    let falseStamp = 0;
    for (const t of forms) for (const p of ALL) {
      const err = M.calErr(p, t);
      const equiv = XS.every((x) => M.evalScattered(p, x) === t.A * x + t.C);
      ok((err === M.MATCH_ERR) === equiv, `stamp ⟺ equivalent`);
      if (err === M.MATCH_ERR && !equiv) falseStamp++;
    }
    ok(falseStamp === 0, `no false CALIBRATED (found ${falseStamp})`);
    // the foil that shares one landing is refused
    const t = { A: 5, C: 5 };
    const fake = ALL.find((p) => { const k = M.collected(p); return k.A === 3 && k.C === 9; });
    ok(!!fake && M.calErr(fake, t) > M.MATCH_ERR, 'foil sharing x=2 landing is refused');
  }

  /* 5. formatting */
  for (const p of ALL) {
    const s = M.exprString(p);
    ok(!/\+ 0\b/.test(s), `no "+ 0": "${s}"`);
    ok(!/\b1x\b/.test(s), `coef 1 prints as x: "${s}"`);
    ok((s.match(/x/g) || []).length === 2, `two x-terms: "${s}"`);
    const { A, C } = M.collected(p);
    ok(!/\b1x\b/.test(M.simplifiedString(A, C)), 'simplified coef 1 → x');
  }

  /* 6. makeTarget reachable + non-trivial */
  {
    const s0 = M.collected(M.START);
    let prev = null;
    for (let i = 0; i < 8000; i++) {
      const t = M.makeTarget(prev);
      ok(t.A >= M.A_TARGET.min && t.A <= M.A_TARGET.max, `target A reachable (${t.A})`);
      ok(!(t.A === s0.A && t.C === s0.C), 'target is not the on-screen form');
      ok(ALL.some((p) => M.calErr(p, t) === 0), `target buildable`);
      prev = t;
    }
  }

  /* === 7. 7.EE.A.2 — REWRITING REVEALS MEANING, held EXACTLY ============== */
  {
    // parse a decimal STRING into an integer count of hundredths — NO float.
    // (Number("1.14")*100 is 113.999…, the very artefact the lab avoids; the
    // audit must not reintroduce it to check the lab.)
    const toH = (str) => {
      const [w, f = ''] = String(str).split('.');
      return parseInt(w, 10) * 100 + parseInt((f + '00').slice(0, 2), 10);
    };
    ok(M.MARKUP_MIN === 1 && M.MARKUP_MAX === 50, 'markup range is 1..50 %');
    ok(M.STEPS[M.MARKUP_STEP] && M.STEPS[M.MARKUP_STEP].focus === 'markup',
      'MARKUP_STEP indexes the markup step');
    ok(M.MARKUP_STEP < M.STEPS.findIndex((s) => s.calib), 'markup comes before the calibration');
    for (let p = M.MARKUP_MIN; p <= M.MARKUP_MAX; p++) {
      // the collected multiplier (1 + p/100) as an exact reduced fraction
      const cf = M.markupCoef(p);
      // exact: cf.n / cf.d must equal (100+p)/100, checked in BigInt (no float)
      ok(BigInt(cf.n) * 100n === BigInt(100 + p) * BigInt(cf.d),
        `markupCoef(${p}) = (100+p)/100 exactly (got ${cf.n}/${cf.d})`);
      // fully reduced
      const g = (a, b) => (b ? g(b, a % b) : a);
      ok(g(cf.n, cf.d) === 1, `markupCoef(${p}) is reduced`);
      // the decimal string is built from digits and equals the true value
      const dec = M.markupDecimal(p);
      ok(toH(dec) === 100 + p, `markupDecimal(${p})="${dec}" is exactly 1+p/100 (in hundredths)`);
      ok(!/e|\.\d{3,}/.test(dec) && dec.startsWith('1.'), `markupDecimal(${p}) is a clean decimal`);
      // the percent term coefficient 0.0p
      ok(toH(M.pctCoef(p)) === p, `pctCoef(${p}) is exactly p/100 (in hundredths)`);
      // the CORE IDENTITY, in hundredths: 100% + p% = (100+p)% — the like terms combine
      ok(100 + toH(M.pctCoef(p)) === toH(dec), `a + ${M.pctCoef(p)}a = ${dec}a (the like-terms combine)`);
    }
    // the famous case, exactly
    ok(M.markupDecimal(5) === '1.05' && M.pctCoef(5) === '0.05', '5% → 0.05a, 1.05a');
    ok(M.markupDecimal(20) === '1.2' && M.markupDecimal(25) === '1.25', 'trailing-zero trim: 1.2, 1.25');
    // the step's answer key
    const ms = M.STEPS[M.MARKUP_STEP];
    ok(ms.choices[ms.answer] === '1.05a', "the markup step's answer is 1.05a");
    // NO FLOAT ARTEFACT: the naive route (1 + p/100 via float) can round; ours does not
    ok(M.markupDecimal(5) === '1.05', 'no 1.0500000001 — the string is built from digits');
  }

  /* === 8. the lesson still has one calib, and the markup step is new ===== */
  ok(M.STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
  ok(M.STEPS.length === 9, 'nine steps (eight, plus the 7.EE.A.2 markup step)');

  return { checks, failures };
}

const MUTANTS = [
  ['the identity breaks (collect drops d)',
    'const collected = (p) => ({ A: p.a + p.d, C: p.c + p.e });',
    'const collected = (p) => ({ A: p.a, C: p.c + p.e });'],
  ['the stamp goes fuzzy',
    'const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 0.8)));\nconst MATCH_ERR = 0;',
    'const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 0.8)));\nconst MATCH_ERR = 1;'],
  ['markupCoef drops the +p (says every markup is ×1)',
    'const n = 100 + p, d = 100, g = gcdI(n, d) || 1;',
    'const n = 100, d = 100, g = gcdI(n, d) || 1;'],
  ['markupDecimal loses the hundredths (5% prints as 1.5)',
    'return p % 10 === 0 ? `1.${p / 10}` : `1.${String(p).padStart(2, \'0\')}`;',
    'return `1.${p}`;'],
  ['pctCoef drops the leading zero on <10% (5% → 0.5)',
    'return p % 10 === 0 ? `0.${p / 10}` : `0.${String(p).padStart(2, \'0\')}`;',
    'return `0.${p}`;'],
  ['coefficient 1 stops printing as x (shows 1x)',
    'const coefStr = (k) => (k === 1 ? \'x\' : `${k}x`);',
    'const coefStr = (k) => `${k}x`;'],
];

function mutationTest() {
  const survivors = [];
  for (const [name, find, replace] of MUTANTS) {
    if (!MODEL_BODY.includes(find)) { survivors.push(`${name} — STALE ANCHOR`); continue; }
    let caught = false;
    try { caught = runSuite(build(MODEL_BODY.replace(find, replace))).failures.length > 0; }
    catch { caught = true; }
    if (!caught) survivors.push(name);
  }
  return survivors;
}

const M = build(MODEL_BODY);
const { checks, failures } = runSuite(M);
console.log('audit-liketerms — LikeTermsLab.jsx  (sliced, not mirrored)');
console.log('─'.repeat(64));
console.log(`model sliced from the shipped component: ${MODEL_BODY.split('\n').length} lines`);
console.log(`checks run: ${checks.toLocaleString()}`);
console.log(`failures:   ${failures.length}`);
for (const f of failures.slice(0, 20)) console.log('  ✗ ' + f);
console.log('─'.repeat(64));
console.log(`mutation test: ${MUTANTS.length} deliberate defects injected…`);
const survivors = mutationTest();
if (survivors.length === 0) console.log(`all ${MUTANTS.length} caught — the suite has teeth.`);
else { console.log(`${survivors.length} SURVIVED:`); for (const s of survivors) console.log('  ⚠ ' + s); }
console.log('─'.repeat(64));
const pass = failures.length === 0 && survivors.length === 0;
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
