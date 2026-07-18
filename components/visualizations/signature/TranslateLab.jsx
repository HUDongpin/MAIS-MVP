'use client';

/* ============================================================================
   TranslateLab — an interactive "bench" for the verbal↔symbolic translation
   skill: turning an English phrase into an algebraic expression.
       "3 more than twice a number"      ⟷   2n + 3
       "twice the sum of a number and 3" ⟷   2(n + 3)

   Built for MAIS (math AI system, www.mais.ac), K-12.
   Grade 6 · CCSS 6.EE.A.2.a ("Write expressions that record operations with
   numbers and with letters standing for numbers"), 6.EE.A.2.b (identify parts
   of an expression), 6.EE.B.6.

   THE SIGNATURE CENTERPIECE — the WORD→STRUCTURE BRIDGE + the EXPRESSION TREE.
   The phrase is rendered as word-chips across the top of the canvas; faint
   dashed links drop from each operative word to the tree node it becomes; and
   the tree below shows the STRUCTURE — whatever sits LOWER happens FIRST.
   Flipping the phrase form mirrors the tree, which is exactly why one form
   needs parentheses and the other does not:

        "3 more than twice a number"          "twice the sum of a number and 3"
                  [+]                                     [×]
                 /   \                                   /   \
              [×]     3            vs                  2     [+]
             /   \                                          /   \
            2     n                                        n     3
         (× is lower → happens first)          (+ is lower → happens first)
              →  2n + 3                              →  2(n + 3)

   DELIBERATELY DISTINCT from its siblings:
     • VariableLab (a·x + b) owns variable-term-vs-constant on a number-line
       WALK; it only mentions word phrases in passing in one feedback line.
     • ExpressionLab (a·x + b·y) owns two independent variables, also on the
       walk. Neither has a tree, and neither owns TRANSLATION.
     • EquationLab solves on a balance scale; the function labs graph curves.
       This lab neither solves, graphs, nor walks a number line — it parses
       language into structure. The tree is unique in the library.

   PRINCIPLED THREE-COLOUR SCHEME (a documented relaxation of the one-accent
   rule, as in SystemsOfEquations carmine/blue/gold):
       CARMINE = the variable n (and the words "a number" that become it),
       BLUE    = operations (the operative words and the tree's op nodes),
       INK     = plain numbers.
   The colour is the bridge: a word and the node it becomes share a colour.

   DROP-IN USAGE (Next.js, app router or pages router):
     import TranslateLab from './TranslateLab';
     export default function Page() { return <TranslateLab />; }
   Zero dependencies. Styles scoped with styled-jsx. JS/TS agnostic.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // the variable n
const OPC = '#2f6f9f'; // operations (words + tree nodes)
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const PAPER = '#fbfbf8';
const OK = '#1f8a5b';
const MINUS = '−';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
     a    — the multiplier word: twice / three times / four times / five times.
            Kept at a ≥ 2 ON PURPOSE: at a = 1 the two phrase forms collapse
            ("3 more than a number" and "the sum of a number and 3" are both
            n + 3), which would make the grouping lesson vacuous and could fire
            a false CALIBRATED. With a ≥ 2 and b ≥ 1 the two forms ALWAYS differ.
     b    — the number that is added or subtracted.
     op2  — more than / sum (+)   vs   less than / difference (−).
     form — 'A' multiply first  a·n ± b   vs   'B' group first  a·(n ± b).
     n    — a test value to substitute, so the two forms can be SEEN to differ.
   ------------------------------------------------------------------------- */
const A_RANGE = { min: 2, max: 5 };
const B_RANGE = { min: 1, max: 9 };
const N_RANGE = { min: -3, max: 8 };
const START = { a: 2, b: 3, op2: '+', form: 'A', n: 4 }; // "3 more than twice a number" ⟷ 2n + 3

const UNLOCK = { a: 1, b: 2, op2: 3, form: 4, n: 5 };

const MULT_WORD = { 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times' };

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels.
     Form A (multiply first):  a·n + s·b
     Form B (group first):     a·(n + s·b)      where s = +1 for '+', −1 for '−'
   ------------------------------------------------------------------------- */
const sign = (op2) => (op2 === '+' ? 1 : -1);

function evalExpr(p, n) {
  const s = sign(p.op2);
  return p.form === 'A' ? p.a * n + s * p.b : p.a * (n + s * p.b);
}

/* Every setting is a linear function of n; this is its (slope, intercept).
   Two settings are VALUE-EQUIVALENT exactly when both agree. */
function linear(p) {
  const s = sign(p.op2);
  return { m: p.a, c: p.form === 'A' ? s * p.b : p.a * s * p.b };
}
const equivalent = (p, q) => {
  const L = linear(p), M = linear(q);
  return L.m === M.m && L.c === M.c;
};
const sameStructure = (p, q) => p.a === q.a && p.b === q.b && p.op2 === q.op2 && p.form === q.form;

/* ---------------------------------------------------------------------------
   The phrase, built as tokens so the canvas knows where every word sits (the
   bridge needs each operative word's x position). phraseString() is derived
   from the very same tokens, so the words and the links can never disagree.
   ------------------------------------------------------------------------- */
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

/* The symbolic expression:  "2n + 3"  or  "2(n + 3)" */
function exprString(p) {
  const sym = p.op2 === '+' ? '+' : MINUS;
  return p.form === 'A' ? `${p.a}n ${sym} ${p.b}` : `${p.a}(n ${sym} ${p.b})`;
}

/* The substitution written out:
     Form A:  2·(4) + 3 = 8 + 3 = 11
     Form B:  2·((4) + 3) = 2·(7) = 14                                        */
function substString(p, n) {
  const sym = p.op2 === '+' ? '+' : MINUS;
  const fmt = (v) => (Object.is(v, -0) ? 0 : v).toString().replace('-', MINUS);
  const s = sign(p.op2);
  if (p.form === 'A') {
    return `${p.a}·(${fmt(n)}) ${sym} ${p.b} = ${fmt(p.a * n)} ${sym} ${p.b} = ${fmt(evalExpr(p, n))}`;
  }
  const inner = n + s * p.b;
  return `${p.a}·((${fmt(n)}) ${sym} ${p.b}) = ${p.a}·(${fmt(inner)}) = ${fmt(evalExpr(p, n))}`;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A construction goal (there is no curve to match): read
   a mystery PHRASE and build its exact translation.

   The meter measures STRUCTURE, not value — deliberately. Value alone would be
   wrong here: "6 more than twice a number" (2n + 6) is value-equivalent to
   "twice the sum of a number and 3" (2(n + 3)), yet it is NOT the direct
   translation of that phrase. So the meter counts matching structural choices
   (a, b, op2, form) and CALIBRATED requires all four — which is true if and
   only if the settings are identical, so a false stamp is impossible. The
   near-miss is turned into pedagogy: when a student's answer is equivalent in
   value but structurally different, the panel says exactly that.
   ------------------------------------------------------------------------- */
const COMPONENTS = ['a', 'b', 'op2', 'form'];
const structureScore = (p, t) => COMPONENTS.reduce((k, key) => k + (p[key] === t[key] ? 1 : 0), 0);
const matchPercent = (p, t) => (structureScore(p, t) / COMPONENTS.length) * 100;

function makeTarget(prev) {
  let t;
  do {
    t = {
      a: A_RANGE.min + Math.floor(Math.random() * (A_RANGE.max - A_RANGE.min + 1)),
      b: B_RANGE.min + Math.floor(Math.random() * (B_RANGE.max - B_RANGE.min + 1)),
      op2: Math.random() < 0.5 ? '+' : '−',
      form: Math.random() < 0.5 ? 'A' : 'B',
    };
  } while (
    sameStructure(t, START) || // never hand back the phrase already on screen
    (prev && sameStructure(t, prev))
  );
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One control unlocks per step. The reveal lives in
   `feedback`. Distractors are the real, documented translation errors:
   "3 less than 2n" → 3 − 2n (reversal), 5n + 2 (swapped roles), 2(n+5) vs
   2n+5 (grouping), "product" mistaken for subtraction. Next is gated on
   ANSWERED, not CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Words into symbols',
    body:
      'Algebra begins with translation. An English phrase describes a calculation; an expression ' +
      'records it in symbols. Here “3 more than twice a number” is 2n + 3. The letter n stands for ' +
      'the unspoken “a number.” The tree shows the structure — whatever sits LOWER happens FIRST. ' +
      'Dashed links tie each word to the piece it becomes.',
    q: 'In the phrase “twice a number”, what does the word “twice” tell you to do?',
    choices: ['Multiply the number by 2', 'Add 2 to the number', 'Write the digit 2 next to the number'],
    answer: 0,
    feedback:
      '“Twice” means multiply by 2, so “twice a number” is 2n. Keyword families: sum / plus / more ' +
      'than → add; difference / minus / less than → subtract; times / twice / product / of → ' +
      'multiply; quotient / per / divided by → divide.',
  },
  {
    title: 'The multiplier',
    body:
      'The a dial changes the multiplier word: twice → three times → four times → five times. Watch the ' +
      'phrase, the tree and the expression all change together, and watch the link from the multiplier ' +
      'word run to the × node.',
    q: 'Which phrase matches the expression 4n?',
    choices: ['four times a number', 'a number more than four', 'four less than a number'],
    answer: 0,
    feedback:
      '4n is “four times a number” — the coefficient 4 is the multiplier sitting in front of the ' +
      'variable. “A number more than four” would be 4 + n, and “four less than a number” would be ' +
      'n − 4. Neither is a multiplication.',
  },
  {
    title: 'The number in the phrase',
    body:
      'The b dial sets the number that gets added or taken away. It is a constant — its value does not ' +
      'depend on n at all.',
    q: 'Which expression is “5 more than twice a number”?',
    choices: ['2n + 5', '5n + 2', '2(n + 5)'],
    answer: 0,
    feedback:
      '“Twice a number” is 2n, and “5 more than” it adds 5, giving 2n + 5. Watch out: 5n + 2 swaps the ' +
      'jobs of the two numbers, and 2(n + 5) is “twice the SUM of a number and 5” — a different phrase ' +
      'in which the addition happens first.',
  },
  {
    title: '“Less than” reverses the order',
    body:
      'Switch between “more than” (+) and “less than” (−). This is the single most common trap in ' +
      'algebra. “Less than” reverses the reading order: “5 less than twice a number” is 2n − 5, NOT ' +
      '5 − 2n. Whatever is taken away goes SECOND.',
    q: 'Translate: “3 less than twice a number.”',
    choices: ['2n − 3', '3 − 2n', '3 − 2 − n'],
    answer: 0,
    feedback:
      'It is 2n − 3: “take 3 away from twice a number,” so 2n comes first and the 3 is subtracted. ' +
      '“Less than” flips the reading order — 3 − 2n would be “twice a number less than 3,” a ' +
      'different expression. The values prove it: at n = 4, 2n − 3 = 5 but 3 − 2n = −5.',
  },
  {
    title: 'Parentheses: what happens first',
    body:
      'The form toggle rewrites the phrase. “Twice the sum of a number and 3” bundles the addition ' +
      'FIRST, so it needs parentheses: 2(n + 3). Compare “3 more than twice a number” = 2n + 3, where ' +
      'the multiplying happens first. Watch the tree mirror itself — the node that sits lower goes first.',
    q: 'Which phrase needs parentheses in its expression?',
    choices: ['twice the sum of a number and 3', '3 more than twice a number', 'Neither needs parentheses'],
    answer: 0,
    feedback:
      '“Twice the SUM of a number and 3” = 2(n + 3): the words “the sum of … and …” bundle n + 3 into a ' +
      'single quantity, and only then is it doubled. Without parentheses, 2n + 3 doubles only the n. The ' +
      'tree makes it visible — in 2(n + 3) the + node sits BELOW the ×, so it happens first.',
  },
  {
    title: 'Substitute and see the difference',
    body:
      'The n dial substitutes a value. Values flow up the tree from the bottom: each operation node ' +
      'shows its result. Flip the form toggle and watch the two expressions give DIFFERENT answers — ' +
      'that is proof the parentheses are not decoration.',
    q: 'At n = 4, compare 2n + 3 with 2(n + 3).',
    choices: ['11 and 14 — they are different', '11 and 11 — they are the same', '14 and 14 — they are the same'],
    answer: 0,
    feedback:
      '2n + 3 = 2·4 + 3 = 11, but 2(n + 3) = 2·(4 + 3) = 2·7 = 14. Different phrases, different trees, ' +
      'different values. Expanding shows why: 2(n + 3) = 2n + 6, which is always 3 more than 2n + 3.',
  },
  {
    title: 'Keyword families',
    body:
      'A quick consolidation before the challenge. The operative words tell you WHICH operation; their ' +
      'order and grouping tell you the STRUCTURE.',
    q: 'Which of these does NOT mean subtraction?',
    choices: ['the product of', 'the difference of', 'decreased by'],
    answer: 0,
    feedback:
      '“The product of” means MULTIPLY. Subtraction words: difference, minus, less than, decreased by, ' +
      'take away, fewer than. Addition: sum, plus, more than, increased by, total. Multiplication: ' +
      'product, times, twice, double, of. Division: quotient, per, divided by, split into.',
  },
  {
    title: 'Translation challenge',
    body:
      'Final challenge. Read the phrase on the canvas and set your dials so your expression is its ' +
      'exact translation — the same STRUCTURE, not merely the same value. Your own phrase is hidden, so ' +
      'you have to do the translating. Reach CALIBRATED, then press New phrase.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TranslateLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [op2, setOp2] = useState(START.op2);
  const [form, setForm] = useState(START.form);
  const [n, setN] = useState(START.n);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const p = { a, b, op2, form };
  const showN = step >= UNLOCK.n;
  const value = evalExpr(p, n);

  sceneRef.current = { ...sceneRef.current, a, b, op2, form, n, calib, target, showN };

  const score = target ? structureScore(p, target) : 0;
  const pct = target ? matchPercent(p, target) : 0;
  const calibrated = target ? sameStructure(p, target) : false;
  const isEquivalentMiss = target ? !calibrated && equivalent(p, target) : false;

  /* ---- full redraw from state -------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const P = { a: S.a, b: S.b, op2: S.op2, form: S.form };
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
    const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    const cell = Math.max(22, Math.min(30, W / 22));
    for (let gx = cell; gx < W; gx += cell) {
      const X = Math.round(gx) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let gy = cell; gy < H; gy += cell) {
      const Y = Math.round(gy) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    /* ---- the phrase, laid out as word tokens ---------------------------- */
    // In calibration the phrase belongs to the TARGET (it is the thing to
    // translate); the tree below always belongs to the student's own dials.
    const phraseP = S.calib && S.target ? S.target : P;
    const tokens = buildTokens(phraseP);

    const roleColor = (r) =>
      r === 'var' ? CURVE : r === 'op' || r === 'mult' ? OPC : r === 'num' ? INK : INK_SOFT;
    const roleWeight = (r) => (r === 'plain' ? '400' : '600');

    let fs = Math.max(11, Math.min(16, W * 0.027));
    const gap = Math.max(5, fs * 0.42);
    const measure = () => {
      let total = 0;
      for (const t of tokens) {
        ctx.font = `${roleWeight(t.r)} ${fs}px ${SANS}`;
        t.w = ctx.measureText(t.t).width;
        total += t.w;
      }
      return total + gap * (tokens.length - 1);
    };
    let totalW = measure();
    const availW = W - 28;
    while (totalW > availW && fs > 9) {
      fs -= 0.5;
      totalW = measure();
    }
    const phraseY = H * 0.11;
    let px = (W - totalW) / 2;
    for (const t of tokens) {
      t.cx = px + t.w / 2;
      px += t.w + gap;
    }

    // calibration: frame the target phrase as the thing to translate
    if (S.calib && S.target) {
      const bx = (W - totalW) / 2 - 12;
      const bw = totalW + 24;
      const by = phraseY - fs * 0.95 - 7;
      const bh = fs * 1.9 + 14;
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.85)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 8) : ctx.rect(bx, by, bw, bh);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `10px ${MONO}`;
      ctx.fillStyle = 'rgba(91,107,123,0.95)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('translate this', bx + 2, by - 3);
      ctx.restore();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of tokens) {
      ctx.font = `${roleWeight(t.r)} ${fs}px ${SANS}`;
      ctx.fillStyle = roleColor(t.r);
      ctx.fillText(t.t, t.cx, phraseY);
    }

    /* ---- the expression tree (always the student's own dials) ----------- */
    const s = sign(P.op2);
    const opSym = P.op2 === '+' ? '+' : MINUS;
    const cx = W / 2;
    const R = Math.max(13, Math.min(20, W * 0.032));
    // Tree bands. Kept clear of the hint chip pinned to the stage's bottom-left:
    // the leaves plus their value labels must finish above it, or a narrow
    // canvas buries the leaf nodes under the hint (caught in mobile QA).
    const yRoot = H * 0.37;
    const yMid = H * 0.55;
    const yLeaf = H * 0.72;
    const dx1 = W * 0.19;
    const dx2 = W * 0.095;
    const val = evalExpr(P, S.n);

    let nodes;
    let edges;
    let firstKey;
    let linkMap;
    if (P.form === 'A') {
      nodes = {
        root: { x: cx, y: yRoot, label: opSym, kind: 'op', val },
        mul: { x: cx - dx1, y: yMid, label: '×', kind: 'op', val: P.a * S.n },
        bLeaf: { x: cx + dx1, y: yMid, label: String(P.b), kind: 'num' },
        aLeaf: { x: cx - dx1 - dx2, y: yLeaf, label: String(P.a), kind: 'num' },
        nLeaf: { x: cx - dx1 + dx2, y: yLeaf, label: 'n', kind: 'var', val: S.n },
      };
      edges = [['root', 'mul'], ['root', 'bLeaf'], ['mul', 'aLeaf'], ['mul', 'nLeaf']];
      firstKey = 'mul';
      linkMap = { var: 'nLeaf', num: 'bLeaf', op: 'root', mult: 'mul' };
    } else {
      nodes = {
        root: { x: cx, y: yRoot, label: '×', kind: 'op', val },
        aLeaf: { x: cx - dx1, y: yMid, label: String(P.a), kind: 'num' },
        op: { x: cx + dx1, y: yMid, label: opSym, kind: 'op', val: S.n + s * P.b },
        nLeaf: { x: cx + dx1 - dx2, y: yLeaf, label: 'n', kind: 'var', val: S.n },
        bLeaf: { x: cx + dx1 + dx2, y: yLeaf, label: String(P.b), kind: 'num' },
      };
      edges = [['root', 'aLeaf'], ['root', 'op'], ['op', 'nLeaf'], ['op', 'bLeaf']];
      firstKey = 'op';
      linkMap = { var: 'nLeaf', num: 'bLeaf', op: 'op', mult: 'root' };
    }

    /* word→node bridges (only outside calibration, where the phrase on screen
       is the student's own; in calibration the phrase is the target's, so
       linking it to the student's tree would be a lie) */
    if (!S.calib) {
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1.2;
      for (const t of tokens) {
        const key = linkMap[t.r];
        if (!key) continue;
        const nd = nodes[key];
        const x0 = t.cx;
        const y0 = phraseY + fs * 0.75;
        const x1 = nd.x;
        const y1 = nd.y - R - 2;
        ctx.strokeStyle = roleColor(t.r) + '55';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(x0, (y0 + y1) / 2, x1, (y0 + y1) / 2, x1, y1);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* edges */
    ctx.save();
    ctx.strokeStyle = 'rgba(28,43,58,0.45)';
    ctx.lineWidth = 1.6;
    for (const [f, c] of edges) {
      const A = nodes[f];
      const B = nodes[c];
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const L = Math.hypot(dx, dy) || 1;
      ctx.beginPath();
      ctx.moveTo(A.x + (dx / L) * R, A.y + (dy / L) * R);
      ctx.lineTo(B.x - (dx / L) * R, B.y - (dy / L) * R);
      ctx.stroke();
    }
    ctx.restore();

    /* nodes */
    const drawNode = (nd, key) => {
      const col = nd.kind === 'var' ? CURVE : nd.kind === 'op' ? OPC : INK;
      ctx.save();
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, R, 0, Math.PI * 2);
      ctx.fillStyle = PAPER;
      ctx.fill();
      ctx.lineWidth = key === 'root' ? 2.6 : 2;
      ctx.strokeStyle = col;
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = `600 ${Math.round(R * 0.95)}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(nd.label, nd.x, nd.y + 0.5);
      ctx.restore();

      // value flowing up the tree (op nodes and the n leaf carry a value)
      if (S.showN && nd.val != null) {
        const txt = (Object.is(nd.val, -0) ? 0 : nd.val).toString().replace('-', MINUS);
        ctx.save();
        ctx.font = `${key === 'root' ? '700 ' : ''}11px ${MONO}`;
        const tw = ctx.measureText(txt).width;
        const ly = nd.y + R + 3;
        ctx.fillStyle = 'rgba(251,251,248,0.9)';
        ctx.fillRect(nd.x - tw / 2 - 3, ly, tw + 6, 14);
        ctx.fillStyle = key === 'root' ? INK : INK_SOFT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(txt, nd.x, ly + 1);
        ctx.restore();
      }
    };
    for (const key of Object.keys(nodes)) drawNode(nodes[key], key);

    /* the "happens first" badge on the deepest operation node */
    {
      const nd = nodes[firstKey];
      ctx.save();
      ctx.font = `600 9.5px ${MONO}`;
      const txt = 'first';
      const tw = ctx.measureText(txt).width;
      const bx = nd.x - tw / 2 - 4;
      const by = nd.y - R - 15;
      ctx.fillStyle = 'rgba(47,111,159,0.12)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bx, by, tw + 8, 13, 6) : ctx.rect(bx, by, tw + 8, 13);
      ctx.fill();
      ctx.fillStyle = OPC;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, nd.x, by + 7);
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    draw();
  }, [a, b, op2, form, n, step, target, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- handlers ---------------------------------------------------------- */
  const resetDials = () => {
    setA(START.a);
    setB(START.b);
    setOp2(START.op2);
    setForm(START.form);
    setN(START.n);
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((v) => Math.min(STEPS.length - 1, v + 1));
  const goBack = () => setStep((v) => Math.max(0, v - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken =
    (calib && target
      ? `Translate the phrase: ${phraseString(target)}. Your expression is ${exprString(p)}.`
      : `The phrase is ${phraseString(p)}. The expression is ${exprString(p)}.`) +
    (showN ? ` At n equals ${n}, it evaluates to ${value}.` : '') +
    (calib && calibrated ? ' Calibrated — your expression is the exact translation.' : '');

  /* the expression, coloured so each symbol matches its tree node */
  const ExprView = () => {
    const sym = op2 === '+' ? '+' : MINUS;
    return form === 'A' ? (
      <>
        <span style={{ color: INK }}>{a}</span>
        <span style={{ color: CURVE }}>n</span>
        <span style={{ color: OPC }}>&nbsp;{sym}&nbsp;</span>
        <span style={{ color: INK }}>{b}</span>
      </>
    ) : (
      <>
        <span style={{ color: INK }}>{a}</span>
        <span style={{ color: INK_SOFT }}>(</span>
        <span style={{ color: CURVE }}>n</span>
        <span style={{ color: OPC }}>&nbsp;{sym}&nbsp;</span>
        <span style={{ color: INK }}>{b}</span>
        <span style={{ color: INK_SOFT }}>)</span>
      </>
    );
  };

  const Seg = ({ label, unlocked, options, value: v, onPick, role }) => (
    <div className={'dial seg-dial' + (unlocked ? '' : ' locked')}>
      <span className="dk">{label}</span>
      <span className="drole">{unlocked ? role : 'unlocks soon'}</span>
      <div className="seg" role="group" aria-label={`${label} — ${role}`}>
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            className={'segb' + (v === o.v ? ' on' : '')}
            aria-pressed={v === o.v}
            disabled={!unlocked}
            onClick={() => onPick(o.v)}
          >
            {o.t}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="tlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Words into Expressions</h1>
        <p className="lede">
          Translate English into algebra. Every operative word becomes a piece of the{' '}
          <em>expression tree</em> — and whatever sits <em>lower</em> in the tree happens{' '}
          <em>first</em>. That is why{' '}
          <span className="mono">2n&nbsp;+&nbsp;3</span> and{' '}
          <span className="mono">2(n&nbsp;+&nbsp;3)</span> are different sentences, and different
          numbers.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <ExprView />
            </p>
            <p className="equation-sub mono">{showN ? substString(p, n) : phraseString(p)}</p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {calib ? 'you translate it' : 'words → tree → expression'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="dot" style={{ borderColor: CURVE, color: CURVE }}>
                n
              </span>{' '}
              the variable
            </span>
            <span className="lg">
              <span className="dot" style={{ borderColor: OPC, color: OPC }}>
                ×
              </span>{' '}
              an operation
            </span>
            <span className="lg">
              <span className="dot" style={{ borderColor: INK, color: INK }}>
                3
              </span>{' '}
              a number
            </span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Happens first</span>
              <span className="fact-v mono" style={{ color: OPC }}>
                {form === 'A' ? 'the × (multiply)' : `the ${op2} (inside the parentheses)`}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Parentheses needed?</span>
              <span className="fact-v mono">{form === 'A' ? 'no — 2n + 3 style' : 'yes — 2(n + 3) style'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Expanded form</span>
              <span className="fact-v mono">
                {(() => {
                  const L = linear(p);
                  const c = L.c;
                  return `${L.m}n ${c < 0 ? MINUS : '+'} ${Math.abs(c)}`;
                })()}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Value{showN ? ` at n = ${n}` : ''}</span>
              <span className="fact-v mono" style={{ fontWeight: 700 }}>
                {showN ? String(value).replace('-', MINUS) : 'unlock n to evaluate'}
              </span>
            </div>
          </div>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={resetDials}>
              Reset dials
            </button>
          </div>
        </section>

        {/* ---------- TUTOR ---------- */}
        <aside className="panel tutor">
          <div className="progress" role="list" aria-label="Lesson progress">
            {STEPS.map((_, i) => (
              <span
                key={i}
                role="listitem"
                className={'pip' + (i === step ? ' cur' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined}
              />
            ))}
          </div>

          <p className="eyebrow small">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          <div className="dials">
            <label className={'dial' + (step >= UNLOCK.a ? '' : ' locked')}>
              <span className="dk">a</span>
              <span className="drole">
                {step >= UNLOCK.a ? 'multiplier · twice, three times…' : 'unlocks soon'}
              </span>
              <input
                type="range"
                min={A_RANGE.min}
                max={A_RANGE.max}
                step={1}
                value={a}
                disabled={step < UNLOCK.a}
                aria-label="Dial a — the multiplier"
                onChange={(e) => setA(parseInt(e.target.value, 10))}
              />
              <output className="dv">{step >= UNLOCK.a ? MULT_WORD[a] : '🔒'}</output>
            </label>

            <label className={'dial' + (step >= UNLOCK.b ? '' : ' locked')}>
              <span className="dk">b</span>
              <span className="drole">
                {step >= UNLOCK.b ? 'the number added / taken away' : 'unlocks soon'}
              </span>
              <input
                type="range"
                min={B_RANGE.min}
                max={B_RANGE.max}
                step={1}
                value={b}
                disabled={step < UNLOCK.b}
                aria-label="Dial b — the number in the phrase"
                onChange={(e) => setB(parseInt(e.target.value, 10))}
              />
              <output className="dv">{step >= UNLOCK.b ? b : '🔒'}</output>
            </label>

            <Seg
              label="±"
              unlocked={step >= UNLOCK.op2}
              role="more than / sum  ·  less than / difference"
              options={[
                { v: '+', t: '+ more / sum' },
                { v: '−', t: '− less / difference' },
              ]}
              value={op2}
              onPick={setOp2}
            />

            <Seg
              label="()"
              unlocked={step >= UNLOCK.form}
              role="which operation happens first"
              options={[
                { v: 'A', t: 'multiply first' },
                { v: 'B', t: 'group first' },
              ]}
              value={form}
              onPick={setForm}
            />

            <label className={'dial star' + (step >= UNLOCK.n ? '' : ' locked')}>
              <span className="dk">n</span>
              <span className="drole">
                {step >= UNLOCK.n ? 'the variable · substitute to test' : 'unlocks soon'}
              </span>
              <input
                type="range"
                min={N_RANGE.min}
                max={N_RANGE.max}
                step={1}
                value={n}
                disabled={step < UNLOCK.n}
                aria-label="Dial n — the variable's test value"
                onChange={(e) => setN(parseInt(e.target.value, 10))}
              />
              <output className="dv">{step >= UNLOCK.n ? String(n).replace('-', MINUS) : '🔒'}</output>
            </label>
          </div>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((c, i) => {
                  const chosen = answers[step];
                  const isChosen = chosen === i;
                  const isCorrect = i === current.answer;
                  let cls = 'choice';
                  if (chosen != null) {
                    if (isCorrect) cls += ' correct';
                    else if (isChosen) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button
                      type="button"
                      key={i}
                      className={cls}
                      onClick={() => choose(i)}
                      disabled={chosen != null}
                    >
                      <span className="mark" aria-hidden="true">
                        {chosen != null && isCorrect ? '✓' : chosen != null && isChosen ? '✕' : ''}
                      </span>
                      {c}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {current.calib && target && (
            <div className="calib">
              <p className="phrase-target">
                “<strong>{phraseString(target)}</strong>”
              </p>

              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  structure&nbsp;{score}/4
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">match all four choices</span>
                )}
              </div>

              {isEquivalentMiss && (
                <p className="equiv-note">
                  Equivalent in value — both simplify to{' '}
                  <span className="mono">
                    {(() => {
                      const L = linear(p);
                      return `${L.m}n ${L.c < 0 ? MINUS : '+'} ${Math.abs(L.c)}`;
                    })()}
                  </span>{' '}
                  — but this is not the <em>direct</em> translation. Re-read the phrase: it{' '}
                  {target.form === 'B'
                    ? `groups the ${target.op2 === '+' ? 'sum' : 'difference'} first, so it needs parentheses`
                    : 'multiplies first, so it needs no parentheses'}
                  .
                </p>
              )}

              <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
                New phrase
              </button>
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={goBack} disabled={step === 0}>
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} disabled={!canNext}>
                {hasQuestion && !answered ? 'Answer to continue' : 'Next →'}
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setStep(0);
                  setAnswers({});
                  setTarget(null);
                  resetDials();
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">phrase ⟷ expression</span> &nbsp;·&nbsp; writing expressions that
        record operations with numbers and letters. CCSS&nbsp;6.EE.A.2.a, 6.EE.A.2.b, 6.EE.B.6.
      </footer>

      <style jsx>{`
        .tlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --op: #2f6f9f;
          --quad: #c7d8e4;
          --ok: #1f8a5b;
          --mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
          --serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
          background: var(--page);
          color: var(--ink);
          font: 16px/1.55 system-ui, -apple-system, 'Segoe UI', sans-serif;
          padding: 28px 18px 44px;
          border-radius: 16px;
          max-width: 1120px;
          margin: 0 auto;
        }
        .mono {
          font-family: var(--mono);
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 6px;
        }
        .eyebrow.small {
          margin: 0 0 4px;
        }
        h1 {
          font-family: var(--serif);
          font-weight: 600;
          font-size: clamp(26px, 4vw, 34px);
          margin: 0 0 6px;
        }
        .lede {
          color: var(--ink-soft);
          margin: 0 0 22px;
          max-width: 70ch;
        }
        .lede em {
          font-style: italic;
          color: var(--ink);
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 920px) {
          .bench {
            /* minmax(0, …) not 1fr: a bare 1fr track takes its automatic
               minimum size from the item, letting a wide child push the panel
               past the viewport */
            grid-template-columns: minmax(0, 1fr);
          }
        }
        .panel {
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .equation {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 21px;
          font-weight: 600;
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .stage {
          position: relative;
          width: min(100%, 640px);
          aspect-ratio: 16 / 11;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        /* On a phone the 16/11 box is too short for a 3-deep tree — the leaves
           would land on the hint chip. Give it a squarer box instead of a
           min-height: a min-height combined with aspect-ratio inflates the
           stage's intrinsic WIDTH and blows out the grid track (real bug,
           caught in mobile QA). Changing the ratio keeps width at 100%. */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 1 / 1;
          }
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .hint {
          position: absolute;
          left: 10px;
          bottom: 9px;
          font-size: 11px;
          white-space: nowrap; /* never wrap onto a second line over the tree */
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.78);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          justify-content: center;
          margin: 10px 4px 2px;
          font-size: 12px;
          color: var(--ink-soft);
        }
        .lg {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font: 600 10px/1 var(--mono);
          background: var(--paper);
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 12px 4px 4px;
        }
        @media (max-width: 460px) {
          .facts {
            grid-template-columns: 1fr;
          }
        }
        .fact {
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 6px 0;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 13.5px;
          font-variant-numeric: tabular-nums;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }
        .btn {
          font: 600 13px/1 system-ui, sans-serif;
          padding: 9px 14px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: #fff;
          transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .btn.ghost {
          background: transparent;
          color: var(--ink);
        }
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn:not(:disabled):hover {
          filter: brightness(1.08);
        }
        .tutor {
          padding: 18px 20px 20px;
        }
        .progress {
          display: flex;
          gap: 6px;
          margin-bottom: 14px;
        }
        .pip {
          height: 5px;
          flex: 1;
          border-radius: 3px;
          background: rgba(28, 43, 58, 0.14);
        }
        .pip.done {
          background: rgba(200, 30, 79, 0.45);
        }
        .pip.cur {
          background: var(--curve);
        }
        h2 {
          font-family: var(--serif);
          font-weight: 600;
          font-size: 20px;
          margin: 0 0 10px;
          padding-bottom: 9px;
          border-bottom: 3px double rgba(200, 30, 79, 0.45);
        }
        .body {
          margin: 0 0 16px;
          font-size: 14.5px;
        }
        .dials {
          display: grid;
          gap: 12px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 84px;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
        }
        .dial.locked {
          opacity: 0.5;
        }
        .dk {
          grid-row: 1 / 3;
          font-family: var(--serif);
          font-style: italic;
          font-size: 19px;
        }
        .dial.star .dk {
          color: var(--curve);
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          accent-color: var(--ink);
          cursor: pointer;
        }
        .dial.star input[type='range'] {
          accent-color: var(--curve);
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 11.5px;
        }
        .seg-dial .seg {
          grid-column: 2 / 4;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .segb {
          font: 600 11.5px/1.2 system-ui, sans-serif;
          padding: 7px 6px;
          border-radius: 7px;
          border: 1px solid rgba(28, 43, 58, 0.22);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .segb.on {
          background: var(--op);
          border-color: var(--op);
          color: #fff;
        }
        .segb:disabled {
          cursor: not-allowed;
        }
        .segb:not(:disabled):hover {
          border-color: var(--op);
        }
        .quiz {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1);
        }
        .q {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 10px;
        }
        .choices {
          display: grid;
          gap: 7px;
        }
        .choice {
          text-align: left;
          font: 13.5px/1.4 system-ui, sans-serif;
          padding: 9px 11px 9px 30px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          position: relative;
          transition: border-color 0.15s, background 0.15s;
        }
        .choice:not(:disabled):hover {
          border-color: var(--ink);
        }
        .choice .mark {
          position: absolute;
          left: 10px;
          font-weight: 700;
        }
        .choice.correct {
          border-color: var(--ok);
          background: rgba(31, 138, 91, 0.08);
        }
        .choice.correct .mark {
          color: var(--ok);
        }
        .choice.wrong {
          border-color: var(--ink-soft);
          background: rgba(91, 107, 123, 0.08);
        }
        .choice.wrong .mark {
          color: var(--ink-soft);
        }
        .choice.dim {
          opacity: 0.55;
        }
        .choice:disabled {
          cursor: default;
        }
        .feedback {
          margin: 12px 0 0;
          font-size: 13px;
          line-height: 1.55;
          color: var(--ink);
          background: rgba(200, 30, 79, 0.05);
          border-left: 3px solid var(--curve);
          padding: 10px 12px;
          border-radius: 0 6px 6px 0;
        }
        .calib {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1);
          display: grid;
          gap: 10px;
        }
        .phrase-target {
          margin: 0;
          font-size: 15px;
          line-height: 1.5;
          color: var(--ink);
          background: rgba(47, 111, 159, 0.07);
          border-left: 3px solid var(--op);
          padding: 10px 12px;
          border-radius: 0 6px 6px 0;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .equiv-note {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--ink);
          background: rgba(47, 111, 159, 0.07);
          border-left: 3px solid var(--op);
          padding: 9px 11px;
          border-radius: 0 6px 6px 0;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
        }
        .nav {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }
        .foot {
          margin-top: 24px;
          font-size: 12.5px;
          color: var(--ink-soft);
        }
        :global(.tlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .segb {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
