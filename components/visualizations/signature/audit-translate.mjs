/* ============================================================================
   audit-translate.mjs — numeric + linguistic audit for TranslateLab.jsx
   Run:  node audit-translate.mjs
   Re-implements the lab's pure model and proves, exhaustively over the full
   control ranges, that the PHRASE and the EXPRESSION really are translations
   of each other — including the two traps the lab exists to teach. No deps.
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
const A_RANGE = { min: 2, max: 5 };
const B_RANGE = { min: 1, max: 9 };
const N_RANGE = { min: -3, max: 8 };
const START = { a: 2, b: 3, op2: '+', form: 'A', n: 4 };
const MULT_WORD = { 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times' };

const sign = (op2) => (op2 === '+' ? 1 : -1);
const evalExpr = (p, n) => {
  const s = sign(p.op2);
  return p.form === 'A' ? p.a * n + s * p.b : p.a * (n + s * p.b);
};
const linear = (p) => {
  const s = sign(p.op2);
  return { m: p.a, c: p.form === 'A' ? s * p.b : p.a * s * p.b };
};
const equivalent = (p, q) => {
  const L = linear(p), M = linear(q);
  return L.m === M.m && L.c === M.c;
};
const sameStructure = (p, q) => p.a === q.a && p.b === q.b && p.op2 === q.op2 && p.form === q.form;

function buildTokens(p) {
  if (p.form === 'A') {
    return [
      { t: String(p.b), r: 'num' },
      { t: p.op2 === '+' ? 'more than' : 'less than', r: 'op' },
      { t: MULT_WORD[p.a], r: 'mult' },
      { t: 'a number', r: 'var' },
    ];
  }
  return [
    { t: MULT_WORD[p.a], r: 'mult' },
    { t: 'the', r: 'plain' },
    { t: p.op2 === '+' ? 'sum' : 'difference', r: 'op' },
    { t: 'of', r: 'plain' },
    { t: 'a number', r: 'var' },
    { t: 'and', r: 'plain' },
    { t: String(p.b), r: 'num' },
  ];
}
const phraseString = (p) => buildTokens(p).map((t) => t.t).join(' ');
const exprString = (p) => {
  const sym = p.op2 === '+' ? '+' : MINUS;
  return p.form === 'A' ? `${p.a}n ${sym} ${p.b}` : `${p.a}(n ${sym} ${p.b})`;
};
const COMPONENTS = ['a', 'b', 'op2', 'form'];
const structureScore = (p, t) => COMPONENTS.reduce((k, key) => k + (p[key] === t[key] ? 1 : 0), 0);
const matchPercent = (p, t) => (structureScore(p, t) / COMPONENTS.length) * 100;

/* enumerate every reachable setting */
const ALL = [];
for (let a = A_RANGE.min; a <= A_RANGE.max; a++)
  for (let b = B_RANGE.min; b <= B_RANGE.max; b++)
    for (const op2 of ['+', '−'])
      for (const form of ['A', 'B']) ALL.push({ a, b, op2, form });
const NS = [];
for (let n = N_RANGE.min; n <= N_RANGE.max; n++) NS.push(n);

console.log('TranslateLab audit\n==================');
console.log(`   settings: ${ALL.length}   test values of n: ${NS.length}`);

/* ---- 1. An INDEPENDENT reference parser of the English phrase ------------
   The real test of a translator: parse the generated English back into a
   value, without reusing evalExpr, and check it agrees. This catches a phrase
   that says one thing while the expression computes another.               */
{
  const WORD_NUM = { twice: 2, 'three times': 3, 'four times': 4, 'five times': 5 };
  // Parse "B more/less than MULT a number"  or  "MULT the sum/difference of a number and B"
  function parsePhrase(text, n) {
    let m = text.match(/^(\d+) (more|less) than (twice|three times|four times|five times) a number$/);
    if (m) {
      const b = parseInt(m[1], 10);
      const k = WORD_NUM[m[3]];
      // "b more than (k times a number)" -> k*n + b ; "b less than X" -> X - b
      return m[2] === 'more' ? k * n + b : k * n - b;
    }
    m = text.match(/^(twice|three times|four times|five times) the (sum|difference) of a number and (\d+)$/);
    if (m) {
      const k = WORD_NUM[m[1]];
      const b = parseInt(m[3], 10);
      // "k times the sum of a number and b" -> k*(n+b) ; difference -> k*(n-b)
      return m[2] === 'sum' ? k * (n + b) : k * (n - b);
    }
    return NaN;
  }
  let n = 0;
  for (const p of ALL) {
    const text = phraseString(p);
    for (const v of NS) {
      const fromWords = parsePhrase(text, v);
      ok(!Number.isNaN(fromWords), `phrase parses: "${text}"`);
      ok(fromWords === evalExpr(p, v), `phrase "${text}" == ${exprString(p)} at n=${v}`);
      n++;
    }
  }
  console.log(`1. phrase ⟷ expression ...... ${n} independent re-parses agree`);
}

/* ---- 2. The "less than" trap is encoded the RIGHT way round ------------- */
{
  // "b less than a·n" must be a·n − b, never b − a·n.
  let n = 0;
  for (const p of ALL.filter((q) => q.form === 'A' && q.op2 === '−')) {
    for (const v of NS) {
      ok(evalExpr(p, v) === p.a * v - p.b, `"${p.b} less than ${MULT_WORD[p.a]} a number" = ${p.a}n − ${p.b}`);
      const reversed = p.b - p.a * v;
      if (evalExpr(p, v) !== reversed) n++; // count the cases where the trap actually bites
    }
  }
  ok(n > 0, 'the reversal trap is observable (a·n − b ≠ b − a·n somewhere)');
  console.log(`2. "less than" order ........ correct on all ${ALL.filter((q) => q.form === 'A' && q.op2 === '−').length} settings; differs from the reversed reading in ${n}/${ALL.filter((q) => q.form === 'A' && q.op2 === '−').length * NS.length} (setting, n) cases`);
  // the specific worked example quoted in the lesson feedback
  ok(evalExpr({ a: 2, b: 3, op2: '−', form: 'A' }, 4) === 5, 'lesson: 2n − 3 at n=4 is 5');
  ok(3 - 2 * 4 === -5, 'lesson: the reversed reading 3 − 2n at n=4 is −5');
}

/* ---- 3. Grouping always matters (this is why a ≥ 2 is enforced) --------- */
{
  let n = 0;
  for (let a = A_RANGE.min; a <= A_RANGE.max; a++)
    for (let b = B_RANGE.min; b <= B_RANGE.max; b++)
      for (const op2 of ['+', '−']) {
        const A = { a, b, op2, form: 'A' };
        const B = { a, b, op2, form: 'B' };
        ok(!equivalent(A, B), `forms differ for a=${a}, b=${b}, op=${op2}`);
        // and they differ at every single test value, not just "somewhere"
        for (const v of NS) ok(evalExpr(A, v) !== evalExpr(B, v), `forms differ at n=${v} (a=${a},b=${b})`);
        n++;
      }
  console.log(`3. grouping always matters .. ${n} (a,b,op) triples: form A ≠ form B for every n`);
  // the lesson's worked example
  ok(evalExpr({ a: 2, b: 3, op2: '+', form: 'A' }, 4) === 11, 'lesson: 2n + 3 at n=4 is 11');
  ok(evalExpr({ a: 2, b: 3, op2: '+', form: 'B' }, 4) === 14, 'lesson: 2(n + 3) at n=4 is 14');
  // expansion identity: a(n ± b) == a·n ± a·b
  for (const p of ALL.filter((q) => q.form === 'B'))
    for (const v of NS) {
      const L = linear(p);
      ok(evalExpr(p, v) === L.m * v + L.c, `expansion a(n±b) = ${L.m}n + ${L.c} at n=${v}`);
    }
  console.log('   expanded form a(n±b) = a·n ± a·b verified on every setting × n ... ok');
}

/* ---- 4. Calibration: structural meter, no false stamp ------------------- */
{
  let checked = 0;
  let falseStamp = 0;
  for (const t of ALL)
    for (const p of ALL) {
      const exact = sameStructure(p, t);
      const pct = matchPercent(p, t);
      if (exact) ok(pct === 100, `100% at the exact translation of "${phraseString(t)}"`);
      else {
        ok(pct < 100, `non-exact never reads 100% (${exprString(p)} vs ${exprString(t)})`);
        if (pct === 100) falseStamp++;
      }
      checked++;
    }
  ok(falseStamp === 0, `no false CALIBRATED (found ${falseStamp})`);
  console.log(`4. calibration uniqueness ... ${checked} (answer,target) pairs, 0 false stamps`);
  // 100% <=> identical settings <=> identical phrase AND identical expression
  for (const t of ALL)
    for (const p of ALL) {
      if (matchPercent(p, t) === 100) {
        ok(phraseString(p) === phraseString(t), 'a 100% match reproduces the exact phrase');
        ok(exprString(p) === exprString(t), 'a 100% match reproduces the exact expression');
      }
    }
  console.log('   100% ⟺ same phrase AND same expression ... ok');
}

/* ---- 5. The equivalent-but-not-a-translation case (the teaching moment) - */
{
  // These pairs are exactly why the meter scores STRUCTURE and not VALUE.
  const pairs = [];
  for (const t of ALL)
    for (const p of ALL) {
      if (!sameStructure(p, t) && equivalent(p, t)) pairs.push([p, t]);
    }
  ok(pairs.length > 0, 'value-equivalent, structurally-different pairs exist');
  // every such pair must be scored as a MISS by the structural meter
  for (const [p, t] of pairs) ok(matchPercent(p, t) < 100, 'equivalent-but-different is never stamped');
  // the canonical example from the design notes: 2n + 6  vs  2(n + 3)
  const p1 = { a: 2, b: 6, op2: '+', form: 'A' };
  const t1 = { a: 2, b: 3, op2: '+', form: 'B' };
  ok(equivalent(p1, t1), '2n + 6 is value-equivalent to 2(n + 3)');
  ok(!sameStructure(p1, t1), '2n + 6 is NOT the direct translation of "twice the sum of a number and 3"');
  for (const v of NS) ok(evalExpr(p1, v) === evalExpr(t1, v), `2n+6 == 2(n+3) at n=${v}`);
  console.log(`5. equivalent ≠ translation . ${pairs.length} such pairs, all correctly scored as misses`);
  console.log('   canonical case 2n + 6 ≡ 2(n + 3) verified equivalent yet structurally distinct ... ok');

  // The hint shown on that near-miss must name the phrase's OWN grouping word.
  // (Regression guard: it once hard-coded "sum", which misdescribed every
  //  "difference of" phrase — caught in browser QA, not by the math checks.)
  const hintWord = (t) => (t.op2 === '+' ? 'sum' : 'difference');
  for (const t of ALL.filter((x) => x.form === 'B')) {
    ok(
      phraseString(t).includes(hintWord(t)),
      `equivalence hint word "${hintWord(t)}" appears in its own phrase "${phraseString(t)}"`
    );
  }
  ok(hintWord({ op2: '−' }) === 'difference', 'a "difference of" target is never described as a "sum"');
  console.log('   near-miss hint names the phrase’s own word (sum / difference) ... ok');
}

/* ---- 6. Phrase well-formedness (no "1 times", no double spaces, etc.) --- */
{
  const seenA = new Set();
  for (const p of ALL) {
    const s = phraseString(p);
    ok(!/\s\s/.test(s), `no double spaces: "${s}"`);
    ok(!/^\s|\s$/.test(s), `no edge whitespace: "${s}"`);
    ok(!/\bone times\b|\b1 times\b/.test(s), `no "one times": "${s}"`);
    ok(MULT_WORD[p.a] !== undefined, `multiplier word exists for a=${p.a}`);
    ok(s === s.toLowerCase() || /\d/.test(s), `phrase is lower-case prose: "${s}"`);
    // the expression must mention n exactly once and the two numbers correctly
    const e = exprString(p);
    ok((e.match(/n/g) || []).length === 1, `expression names n exactly once: "${e}"`);
    ok(e.includes(String(p.a)) && e.includes(String(p.b)), `expression carries a and b: "${e}"`);
    ok(p.form === 'B' ? e.includes('(') && e.includes(')') : !e.includes('('), `parens iff grouped: "${e}"`);
    seenA.add(s);
  }
  ok(seenA.size === ALL.length, `every setting yields a DISTINCT phrase (${seenA.size}/${ALL.length})`);
  console.log(`6. phrase well-formedness ... ${ALL.length} phrases distinct & well-formed`);
  console.log(`   e.g. "${phraseString({ a: 2, b: 3, op2: '+', form: 'A' })}" ⟷ ${exprString({ a: 2, b: 3, op2: '+', form: 'A' })}`);
  console.log(`        "${phraseString({ a: 2, b: 3, op2: '+', form: 'B' })}" ⟷ ${exprString({ a: 2, b: 3, op2: '+', form: 'B' })}`);
  console.log(`        "${phraseString({ a: 4, b: 7, op2: '−', form: 'B' })}" ⟷ ${exprString({ a: 4, b: 7, op2: '−', form: 'B' })}`);
}

/* ---- 7. makeTarget: reachable, never trivial, re-rollable -------------- */
{
  const makeTarget = (prev) => {
    let t;
    let guard = 0;
    do {
      t = {
        a: A_RANGE.min + Math.floor(Math.random() * (A_RANGE.max - A_RANGE.min + 1)),
        b: B_RANGE.min + Math.floor(Math.random() * (B_RANGE.max - B_RANGE.min + 1)),
        op2: Math.random() < 0.5 ? '+' : '−',
        form: Math.random() < 0.5 ? 'A' : 'B',
      };
      guard++;
    } while ((sameStructure(t, START) || (prev && sameStructure(t, prev))) && guard < 999);
    return t;
  };
  let prev = null;
  const seen = new Set();
  for (let i = 0; i < 20000; i++) {
    const t = makeTarget(prev);
    ok(t.a >= A_RANGE.min && t.a <= A_RANGE.max, `target a reachable (${t.a})`);
    ok(t.b >= B_RANGE.min && t.b <= B_RANGE.max, `target b reachable (${t.b})`);
    ok(!sameStructure(t, START), 'target is never the phrase already on screen');
    if (prev) ok(!sameStructure(t, prev), 'target never repeats the previous one');
    seen.add(`${t.a}|${t.b}|${t.op2}|${t.form}`);
    prev = t;
  }
  console.log(`7. makeTarget ............... 20000 draws, all reachable & non-trivial, ${seen.size}/${ALL.length - 1} distinct reached`);
}

console.log('\n' + (fail === 0 ? '✓ ALL CHECKS PASSED' : `✗ ${fail} CHECK(S) FAILED`));
process.exit(fail === 0 ? 0 : 1);
