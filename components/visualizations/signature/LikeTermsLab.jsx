'use client';

/* ============================================================================
   LikeTermsLab — an interactive "bench" for COMBINING LIKE TERMS and what
   "equivalent" actually means:
        2x + 5 + 3x        (as written — scattered)
        5x + 5             (collected — simplest form)
   Built for MAIS (math AI system, www.mais.ac), K-12. Grade 6:
     CCSS 6.EE.A.3 — apply the properties of operations to generate equivalent
                     expressions (y + y + y = 3y)
     CCSS 6.EE.A.4 — identify when two expressions are equivalent, i.e. they
                     name the same number REGARDLESS of which value is
                     substituted into them        ← no other lab owns this one

   THE SIGNATURE CENTERPIECE — TWO PARALLEL NUMBER LINES, ONE LANDING.
   The upper line walks the expression AS WRITTEN: a carmine x-jumps, then c
   blue unit-jumps, then d MORE carmine x-jumps, then e blue unit-jumps — the
   like terms are scattered, with a constant stranded between them. The lower
   line walks the COLLECTED form: (a+d) carmine x-jumps, then (c+e) blue
   unit-jumps. Two different journeys — and a vertical connector showing they
   land on exactly the same point. Then drag x: they stay locked together at
   EVERY value. That is what equivalent means, and it is a claim a single
   worked example can never make.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files
   before designing — distinctness is a correctness property here):
     • DistributiveLab owns the LAW a×(b+c) = a×b + a×c as a rectangle that
       physically pulls apart, plus factoring. Its factoring step explicitly
       forward-references this lab ("Every time you collect like terms later in
       algebra, this is the law doing the work"). So 2x + 3x = (2+3)x is ITS
       law; this lab CITES it and refuses to redraw the rectangle.
     • CommutativeLab owns "does order matter?" as an operation table mirrored
       about its crease. Reordering 2x + 5 + 3x → 2x + 3x + 5 is ITS property;
       this lab CITES it rather than re-teaching it.
     • ExpressionLab owns the negative case on a walk — a·x + b·y, two DIFFERENT
       variables, unlike terms that never merge. This lab owns the positive
       case: ONE variable in scattered terms that DO merge, plus equivalence.
     • VariableLab owns one clean walk a·x + b (variable term vs constant).
   Nothing else draws two walks, and nothing else owns 6.EE.A.4.

   PALETTE (the family's scheme, unchanged): CARMINE = the variable x and every
   term built from it; BLUE = constant terms; INK = the landing value.

   DROP-IN USAGE (Next.js, app router or pages router):
     import LikeTermsLab from './LikeTermsLab';
     export default function Page() { return <LikeTermsLab />; }
   Zero dependencies. Styles scoped with styled-jsx. JS/TS agnostic.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // the variable x and its terms
const CONST_COL = '#2f6f9f'; // constant terms
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const PAPER = '#fbfbf8';
const OK = '#1f8a5b';
const MINUS = '−';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. The expression is always the four-slot scattered form
        a·x + c + d·x + e
   with a zero constant simply not written. a, d ≥ 1 so BOTH x-terms always
   exist (that is the whole subject: two like terms, scattered).
   ------------------------------------------------------------------------- */
const X_RANGE = { min: -3, max: 5 };
const A_RANGE = { min: 1, max: 3 };
const D_RANGE = { min: 1, max: 3 };
const C_RANGE = { min: -3, max: 5 };
const E_RANGE = { min: -3, max: 5 };
// START is exactly the canonical example:  2x + 5 + 3x  →  5x + 5
const START = { x: 2, a: 2, c: 5, d: 3, e: 0 };

const UNLOCK = { x: 1, a: 2, d: 3, c: 4, e: 4 }; // c and e unlock TOGETHER — they are like terms
const COLLECT_STEP = 5; // the lower (collected) line appears here

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels. The identity the whole lab is about:
        a·x + c + d·x + e   ===   (a+d)·x + (c+e)
   ------------------------------------------------------------------------- */
const evalScattered = (p, x) => p.a * x + p.c + p.d * x + p.e;
const collected = (p) => ({ A: p.a + p.d, C: p.c + p.e });
const evalCollected = (p, x) => {
  const { A, C } = collected(p);
  return A * x + C;
};

/* ---------------------------------------------------------------------------
   Formatting.
   ------------------------------------------------------------------------- */
const fmt = (v) => (Object.is(v, -0) ? 0 : v).toString().replace('-', MINUS);
const coefStr = (k) => (k === 1 ? 'x' : `${k}x`);

/* The expression as written, as a list of terms (a zero constant is omitted —
   nobody writes "+ 0"). The first term needs no sign; the rest carry one. */
function terms(p) {
  const out = [{ kind: 'x', sign: null, text: coefStr(p.a) }];
  if (p.c !== 0) out.push({ kind: 'c', sign: p.c > 0 ? '+' : MINUS, text: String(Math.abs(p.c)) });
  out.push({ kind: 'x', sign: '+', text: coefStr(p.d) });
  if (p.e !== 0) out.push({ kind: 'c', sign: p.e > 0 ? '+' : MINUS, text: String(Math.abs(p.e)) });
  return out;
}
const exprString = (p) =>
  terms(p)
    .map((t, i) => (i === 0 ? t.text : ` ${t.sign} ${t.text}`))
    .join('');

const simplifiedString = (A, C) => `${coefStr(A)}${C === 0 ? '' : ` ${C > 0 ? '+' : MINUS} ${Math.abs(C)}`}`;

/* The substitution written out:  2·(2) + 5 + 3·(2) = 4 + 5 + 6 = 15 */
function substString(p, x) {
  const paren = (v) => (v < 0 ? `(${fmt(v)})` : fmt(v));
  let s1 = `${p.a}·(${fmt(x)})`;
  let s2 = fmt(p.a * x);
  if (p.c !== 0) {
    const g = ` ${p.c > 0 ? '+' : MINUS} ${Math.abs(p.c)}`;
    s1 += g;
    s2 += g;
  }
  s1 += ` + ${p.d}·(${fmt(x)})`;
  s2 += ` + ${paren(p.d * x)}`;
  if (p.e !== 0) {
    const g = ` ${p.e > 0 ? '+' : MINUS} ${Math.abs(p.e)}`;
    s1 += g;
    s2 += g;
  }
  return `${s1} = ${s2} = ${fmt(evalScattered(p, x))}`;
}

/* nice tick step + an auto-fit window that frames BOTH walks ---------------- */
function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const n = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return n * p;
}
function fitWindow(p, x) {
  const { A } = collected(p);
  const marks = [
    0,
    p.a * x,
    p.a * x + p.c,
    p.a * x + p.c + p.d * x,
    A * x,
    evalScattered(p, x),
  ];
  let lo = Math.min(...marks);
  let hi = Math.max(...marks);
  const pad = Math.max(1, Math.round(0.12 * (hi - lo)));
  lo -= pad;
  hi += pad;
  if (hi - lo < 8) {
    const c = (lo + hi) / 2;
    lo = c - 4;
    hi = c + 4;
  }
  const step = niceStep((hi - lo) / 9);
  return { wmin: Math.floor(lo / step) * step, wmax: Math.ceil(hi / step) * step, step };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A construction goal with MANY right answers, which is
   the point: lots of different expressions are equivalent to one another.
   Given a simplified target A*x + C*, build ANY a·x + c + d·x + e whose
   x-terms total A* and whose constants total C*. The meter measures the
   COLLECTED form, so it is exactly "is your expression equivalent to the
   target" — true for every x, not just the one on screen. err is a
   non-negative integer, so err === 0 (⟺ equivalent) is the only stamp: a false
   CALIBRATED is impossible.

   The grey ghost ring marks the TARGET's landing for the current x. It is a
   probe, not the test: a wrong expression can share the landing at one lucky x
   (3x + 9 and 5x + 5 both hit 15 at x = 2) and then separate the moment x
   moves. That trap is step 7's lesson, and the meter never falls for it.
   ------------------------------------------------------------------------- */
const A_TARGET = { min: A_RANGE.min + D_RANGE.min, max: A_RANGE.max + D_RANGE.max }; // 2..6
const C_TARGET = { min: C_RANGE.min + E_RANGE.min, max: C_RANGE.max + E_RANGE.max }; // −6..10

const calErr = (p, t) => {
  const { A, C } = collected(p);
  return Math.abs(A - t.A) + Math.abs(C - t.C);
};
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 0.8)));
const MATCH_ERR = 0; // integers: only an exact collected-form match is equivalent

function makeTarget(prev) {
  const s0 = collected(START);
  let t;
  do {
    t = {
      A: A_TARGET.min + Math.floor(Math.random() * (A_TARGET.max - A_TARGET.min + 1)),
      C: C_TARGET.min + Math.floor(Math.random() * (C_TARGET.max - C_TARGET.min + 1)),
    };
  } while ((t.A === s0.A && t.C === s0.C) || (prev && t.A === prev.A && t.C === prev.C));
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One control unlocks per step (c and e together — they are
   like terms). Distractors are the documented errors: 2x + 5 + 3x = 10x
   (sweeping the constant into the x-count), "a term in between blocks it",
   and the big one — "they're equal at x = 2 so they're equivalent".
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Terms, and which are alike',
    body:
      'An expression is built from TERMS — the pieces separated by + and −. Here there are three: ' +
      '2x, 5 and 3x. Two are LIKE terms: both carry the same variable, x. The 5 is a constant — no ' +
      'variable at all. Only like terms can ever be combined.',
    q: 'In 2x + 5 + 3x, which terms are LIKE terms?',
    choices: ['2x and 3x — both count x’s', '5 and 3x — they sit next to each other', 'All three — they are all in one expression'],
    answer: 0,
    feedback:
      '2x and 3x both count the SAME variable, x — like terms. The 5 is a constant: plain units, ' +
      'not x’s. Like terms must match on the variable part exactly; sitting side by side has ' +
      'nothing to do with it.',
  },
  {
    title: 'Both terms carry the same x',
    body:
      'The x dial is live. Drag it and watch BOTH carmine groups resize together — both terms ' +
      'carry the same variable, standing for the same number. That is what “like” means, and why ' +
      'they can be gathered into one group.',
    q: 'Set x = 4. What are 2x and 3x worth?',
    choices: ['8 and 12 — and together 20, which is 5x', '8 and 12 — but they still cannot be added', '24 — because 2 and 3 make 6'],
    answer: 0,
    feedback:
      '2x = 8 and 3x = 12 — together 20, exactly 5·4 = 5x. Both terms count the same x, so 2 of ' +
      'them plus 3 of them is 5 of them, for ANY value of x. That is the whole idea of combining ' +
      'like terms.',
  },
  {
    title: 'a — the first x-term',
    body:
      'The a dial sets how many x’s the first term counts. That number in front is the coefficient; ' +
      'watch the first carmine group grow and shrink with it.',
    q: 'Which of these is NOT a like term with 3x?',
    choices: ['3 — it has no variable', 'x — that is really 1x', '7x'],
    answer: 0,
    feedback:
      '3 is a constant — no variable — so it is not like 3x. But x IS 1x (the 1 simply goes ' +
      'unwritten), and 7x counts the same variable: both ARE like terms with 3x.',
  },
  {
    title: 'd — a second x-term, stranded apart',
    body:
      'The d dial adds a second x-term. The walk now shows two carmine groups with a constant ' +
      'stranded between them: a·x + c + d·x. The like terms are SCATTERED — not sitting next to ' +
      'each other.',
    q: 'Why can 2x and 3x be combined even though the 5 sits between them?',
    choices: [
      'Addition can be reordered, so they can be moved together',
      'They cannot — a term in between blocks it',
      'Only if the 5 happens to be zero',
    ],
    answer: 0,
    feedback:
      'Addition reorders freely — the commutative property (the Commutative lab owns that story) — ' +
      'so 2x + 5 + 3x rearranges to 2x + 3x + 5. Nothing in between blocks it. One rule: each term ' +
      'travels WITH its own sign.',
  },
  {
    title: 'Constants are like terms too',
    body:
      'c and e unlock together because they are like terms with EACH OTHER: constants combine ' +
      'with constants, 5 + 1 = 6. The expression can now hold four terms — two of each kind.',
    q: 'Simplify 2x + 5 + 3x + 1.',
    choices: ['5x + 6', '11x', '5x + 51'],
    answer: 0,
    feedback:
      'Collect each kind: x-terms 2x + 3x = 5x, constants 5 + 1 = 6 — giving 5x + 6, and no ' +
      'further: 5x and 6 are unlike, so that IS the simplest form. Not 11x, which sweeps the ' +
      'constants into the x-count.',
  },
  {
    title: 'Collect them',
    body:
      'A second number line appears: the same expression COLLECTED into (a+d)x then (c+e). Top ' +
      'walk: as written, scattered. Bottom: the tidy one. Different journeys, same destination — ' +
      'the connector shows they land on the very same point.',
    q: '2x + 3x = 5x. Which law actually does the merging?',
    choices: [
      'The distributive property, backwards: 2x + 3x = (2+3)x',
      'A special new rule that only applies to letters',
      'The commutative property',
    ],
    answer: 0,
    feedback:
      '2x + 3x = (2 + 3)x = 5x — both terms share the factor x, so it comes out front: the ' +
      'distributive property run backwards, factoring (the Distributive lab owns that law). ' +
      'Commutativity only MOVED the terms together; distributivity MERGES them.',
  },
  {
    title: 'Equivalent means: for every x',
    body:
      'Drag x and watch the two walks. Different routes, same landing — every single time. THAT ' +
      'is equivalence: the two expressions name the same number for EVERY value of x, not for one ' +
      'lucky one.',
    q: '3x + 9 and 5x + 5 both equal 15 when x = 2. Are they equivalent?',
    choices: ['No — they only agree at x = 2; try x = 3', 'Yes — they are equal, so they are equivalent', 'Yes — both simplify to 15'],
    answer: 0,
    feedback:
      'No. At x = 2 both give 15, but at x = 3 they give 18 and 20 — they part company. Equivalent ' +
      'expressions agree at EVERY value. A single matching landing proves nothing: drag x, and a ' +
      'fake separates.',
  },
  {
    title: 'Simplify challenge',
    body:
      'Final challenge. A simplified target is given. Build ANY expression whose x-terms and ' +
      'constants total the right numbers — MANY answers are correct, and that is the point. The ' +
      'grey ring marks the target’s landing; drag x to check yours tracks it at every value.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function LikeTermsLab() {
  const [x, setX] = useState(START.x);
  const [a, setA] = useState(START.a);
  const [c, setC] = useState(START.c);
  const [d, setD] = useState(START.d);
  const [e, setE] = useState(START.e);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const p = { a, c, d, e };
  const { A, C } = collected(p);
  const value = evalScattered(p, x);
  const showCollected = step >= COLLECT_STEP;

  sceneRef.current = { ...sceneRef.current, x, a, c, d, e, calib, target, showCollected };

  const err = target ? calErr(p, target) : Infinity;
  const pct = target ? matchPercent(err) : 0;
  const calibrated = target ? err === MATCH_ERR : false;

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
    const P = { a: S.a, c: S.c, d: S.d, e: S.e };
    const sx0 = S.x;
    const col = collected(P);
    const val = evalScattered(P, sx0);
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

    const { wmin, wmax, step: gstep } = fitWindow(P, sx0);
    const padL = 30;
    const padR = 22;
    const axisLeft = padL;
    const axisRight = W - padR;
    const sx = (wx) => axisLeft + ((wx - wmin) / (wmax - wmin)) * (axisRight - axisLeft);

    const rows = S.showCollected
      ? [{ y: H * 0.31, kind: 'written' }, { y: H * 0.73, kind: 'collected' }]
      : [{ y: H * 0.55, kind: 'written' }];
    const labelRow = rows[rows.length - 1]; // ticks are labelled on the bottom line only

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    for (let gx = Math.ceil(wmin); gx <= wmax; gx++) {
      const X = Math.round(sx(gx)) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let i = 0; i <= 6; i++) {
      const Y = Math.round((i / 6) * H) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    const varPeak = Math.min(34, H * 0.11);
    const unitPeak = Math.min(16, H * 0.05);

    /* a hop: bezier bump above `baseY`, arrowhead at the landing */
    const hop = (X0, X1, baseY, peak, color, width, label) => {
      const cc = peak / 0.75;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(X0, baseY);
      ctx.bezierCurveTo(X0, baseY - cc, X1, baseY - cc, X1, baseY);
      ctx.stroke();
      const dir = Math.sign(X1 - X0) || 1;
      ctx.beginPath();
      ctx.moveTo(X1, baseY);
      ctx.lineTo(X1 - dir * 5, baseY - 3.5);
      ctx.moveTo(X1, baseY);
      ctx.lineTo(X1 - dir * 5, baseY + 3.5);
      ctx.stroke();
      if (label) {
        ctx.fillStyle = color;
        ctx.font = `600 11px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, (X0 + X1) / 2, baseY - peak - 2);
      }
    };

    /* the walk for one row, as an ordered list of jump-groups */
    const walkSegments = (kind) =>
      kind === 'written'
        ? [
            { n: P.a, len: sx0, color: CURVE, label: 'x' },
            { n: Math.abs(P.c), len: Math.sign(P.c), color: CONST_COL, label: null },
            { n: P.d, len: sx0, color: CURVE, label: 'x' },
            { n: Math.abs(P.e), len: Math.sign(P.e), color: CONST_COL, label: null },
          ]
        : [
            { n: col.A, len: sx0, color: CURVE, label: 'x' },
            { n: Math.abs(col.C), len: Math.sign(col.C), color: CONST_COL, label: null },
          ];

    const unitPx = Math.abs(sx(1) - sx(0));

    for (const row of rows) {
      const bY = Math.round(row.y) + 0.5;

      /* the number line + end arrows */
      ctx.strokeStyle = 'rgba(28,43,58,0.6)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(axisLeft - 6, bY);
      ctx.lineTo(axisRight + 6, bY);
      ctx.stroke();
      const axEnd = (X, dir) => {
        ctx.beginPath();
        ctx.moveTo(X, bY);
        ctx.lineTo(X - dir * 6, bY - 3.5);
        ctx.moveTo(X, bY);
        ctx.lineTo(X - dir * 6, bY + 3.5);
        ctx.stroke();
      };
      axEnd(axisLeft - 6, -1);
      axEnd(axisRight + 6, 1);

      /* ticks (both lines) + labels (bottom line only — the scale is shared) */
      const tickStart = Math.ceil(wmin / gstep) * gstep;
      ctx.font = `11px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let t = tickStart; t <= wmax + 1e-9; t += gstep) {
        const X = sx(t);
        ctx.strokeStyle = 'rgba(28,43,58,0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(X, bY - 3.5);
        ctx.lineTo(X, bY + 3.5);
        ctx.stroke();
        if (row === labelRow) {
          ctx.fillStyle = 'rgba(91,107,123,0.95)';
          ctx.fillText(fmt(t), X, bY + 6);
        }
      }

      /* start-at-0 marker */
      ctx.strokeStyle = 'rgba(28,43,58,0.55)';
      ctx.fillStyle = PAPER;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(sx(0), row.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      /* the walk */
      let pos = 0;
      for (const seg of walkSegments(row.kind)) {
        if (seg.n === 0 || seg.len === 0) continue; // x = 0, or a zero constant: nothing to draw
        const isUnit = seg.color === CONST_COL;
        if (isUnit && unitPx < 8) {
          // units would be too cramped to count — draw one labelled bracket instead
          const total = seg.n * seg.len;
          hop(sx(pos), sx(pos + total), row.y, unitPeak, seg.color, 2, `${total > 0 ? '+' : MINUS}${Math.abs(total)}`);
          pos += total;
          continue;
        }
        for (let i = 0; i < seg.n; i++) {
          hop(
            sx(pos),
            sx(pos + seg.len),
            row.y,
            isUnit ? unitPeak : varPeak,
            seg.color,
            isUnit ? 2 : 2.4,
            isUnit ? null : seg.label
          );
          pos += seg.len;
        }
      }

      /* the landing */
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(sx(val), row.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      /* row caption, tucked under the line's left end (walks live above it) */
      if (S.showCollected) {
        const cap = row.kind === 'written' ? 'as written' : 'collected';
        ctx.font = `10px ${MONO}`;
        const tw = ctx.measureText(cap).width;
        const ly = row === labelRow ? row.y + 21 : row.y + 6;
        ctx.fillStyle = 'rgba(251,251,248,0.9)';
        ctx.fillRect(axisLeft - 4, ly, tw + 8, 13);
        ctx.fillStyle = INK_SOFT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(cap, axisLeft, ly + 1);
      }
    }

    /* the equivalence connector: both walks land on the SAME point */
    if (S.showCollected) {
      const X = sx(val);
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.5)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(X, rows[0].y);
      ctx.lineTo(X, rows[1].y);
      ctx.stroke();
      ctx.restore();

      const lab = `same landing = ${fmt(val)}`;
      ctx.font = `600 11px ${MONO}`;
      const tw = ctx.measureText(lab).width;
      const lx = Math.min(Math.max(X + 8, axisLeft), axisRight - tw - 6);
      const ly = (rows[0].y + rows[1].y) / 2 - 7;
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(lx - 4, ly - 1, tw + 8, 16);
      ctx.strokeStyle = 'rgba(28,43,58,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx - 3.5, ly - 0.5, tw + 7, 15);
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(lab, lx, ly + 1);
    }

    /* calibration: the target's landing, as a probe (NOT the test — see EDIT 6) */
    if (S.calib && S.target) {
      const tv = S.target.A * sx0 + S.target.C;
      const row = rows[rows.length - 1];
      ctx.strokeStyle = 'rgba(91,107,123,0.9)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx(tv), row.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `10px ${MONO}`;
      ctx.fillStyle = 'rgba(91,107,123,0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      // lift the label clear of every jump on this row, not just the ring
      ctx.fillText('target', sx(tv), row.y - varPeak - 6);
    }

    /* the current x, as a carmine chip in the free space up top */
    {
      const lab = `x = ${fmt(sx0)}`;
      ctx.font = `600 12px ${MONO}`;
      const tw = ctx.measureText(lab).width;
      ctx.fillStyle = 'rgba(200,30,79,0.10)';
      ctx.fillRect(10, 9, tw + 12, 18);
      ctx.fillStyle = CURVE;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(lab, 16, 18.5);
    }
  }, []);

  useEffect(() => {
    draw();
  }, [x, a, c, d, e, step, target, draw]);

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
    setX(START.x);
    setA(START.a);
    setC(START.c);
    setD(START.d);
    setE(START.e);
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken =
    `The expression is ${exprString(p)}. It collects to ${simplifiedString(A, C)}. ` +
    `With x equal to ${fmt(x)}, both are worth ${fmt(value)}.` +
    (calib && calibrated ? ' Calibrated — your expression is equivalent to the target.' : '');

  const DIALS = [
    { key: 'x', label: 'x', v: x, set: setX, r: X_RANGE, unlock: UNLOCK.x, star: true, role: 'the variable · both x-terms share it' },
    { key: 'a', label: 'a', v: a, set: setA, r: A_RANGE, unlock: UNLOCK.a, role: 'first x-term · how many x’s' },
    { key: 'd', label: 'd', v: d, set: setD, r: D_RANGE, unlock: UNLOCK.d, role: 'second x-term · how many x’s' },
    { key: 'c', label: 'c', v: c, set: setC, r: C_RANGE, unlock: UNLOCK.c, role: 'first constant' },
    { key: 'e', label: 'e', v: e, set: setE, r: E_RANGE, unlock: UNLOCK.e, role: 'second constant · like term with c' },
  ];

  return (
    <div className="ltlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Combining Like Terms</h1>
        <p className="lede">
          <span className="mono">2x&nbsp;+&nbsp;5&nbsp;+&nbsp;3x</span> and{' '}
          <span className="mono">5x&nbsp;+&nbsp;5</span> take{' '}
          <em>different journeys</em> along the number line — and always land on the{' '}
          <em>same point</em>. Collect the scattered terms, then drag x to see why{' '}
          <em>equivalent</em> means “for every value,” not “for one lucky one.”
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              {terms(p).map((t, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: INK_SOFT }}>{` ${t.sign} `}</span>}
                  <span style={{ color: t.kind === 'x' ? CURVE : CONST_COL }}>{t.text}</span>
                </span>
              ))}
              {showCollected && (
                <>
                  <span style={{ color: INK_SOFT }}>&nbsp;=&nbsp;</span>
                  <span style={{ color: INK }}>{simplifiedString(A, C)}</span>
                </>
              )}
            </p>
            <p className="equation-sub mono">{substString(p, x)}</p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {showCollected ? 'drag x — they never separate' : 'the x-terms are scattered'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="legend" aria-hidden="true">
            <span className="lg">
              <span className="sw" style={{ background: CURVE }} /> x-terms
            </span>
            <span className="lg">
              <span className="sw" style={{ background: CONST_COL }} /> constants
            </span>
            <span className="lg">
              <span className="dt" /> landing
            </span>
            {calib && (
              <span className="lg">
                <span className="ring" /> target
              </span>
            )}
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">x-terms collect to</span>
              <span className="fact-v mono" style={{ color: CURVE }}>
                {coefStr(a)} + {coefStr(d)} = {coefStr(A)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Constants collect to</span>
              <span className="fact-v mono" style={{ color: CONST_COL }}>
                {fmt(c)} + {fmt(e)} = {fmt(C)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Simplest form</span>
              <span className="fact-v mono" style={{ fontWeight: 700 }}>
                {simplifiedString(A, C)}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Both worth (x = {fmt(x)})</span>
              <span className="fact-v mono" style={{ fontWeight: 700 }}>
                {fmt(value)}
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
            {DIALS.map((dl) => {
              const unlocked = step >= dl.unlock;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked') + (dl.star ? ' star' : '')} key={dl.key}>
                  <span className="dk">{dl.label}</span>
                  <span className="drole">{unlocked ? dl.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={dl.r.min}
                    max={dl.r.max}
                    step={1}
                    value={dl.v}
                    disabled={!unlocked}
                    aria-label={`Dial ${dl.label} — ${dl.role}`}
                    onChange={(ev) => dl.set(parseInt(ev.target.value, 10))}
                  />
                  <output className="dv">{unlocked ? fmt(dl.v) : '🔒'}</output>
                </label>
              );
            })}
          </div>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((ch, i) => {
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
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
                      <span className="mark" aria-hidden="true">
                        {chosen != null && isCorrect ? '✓' : chosen != null && isChosen ? '✕' : ''}
                      </span>
                      {ch}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {current.calib && target && (
            <div className="calib">
              <p className="goal">
                Build any expression that simplifies to{' '}
                <strong className="mono">{simplifiedString(target.A, target.C)}</strong>
              </p>

              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  yours&nbsp;{simplifiedString(A, C)}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    x-terms {A === target.A ? '✓' : `${A}→${target.A}`} · constants{' '}
                    {C === target.C ? '✓' : `${C}→${target.C}`}
                  </span>
                )}
              </div>

              {calibrated && (
                <p className="equiv-note">
                  Equivalent. <span className="mono">{exprString(p)}</span> and{' '}
                  <span className="mono">{simplifiedString(target.A, target.C)}</span> name the same
                  number for <em>every</em> x — and yours is only one of the many expressions that do.
                </p>
              )}

              <button type="button" className="btn ghost" onClick={() => setTarget(makeTarget(target))}>
                New target
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
        <span className="mono">a·x + c + d·x + e = (a+d)x + (c+e)</span> &nbsp;·&nbsp; collecting
        like terms, and equivalence for every value of x. CCSS&nbsp;6.EE.A.3, 6.EE.A.4.
      </footer>

      <style jsx>{`
        .ltlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --const: #2f6f9f;
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
          /* minmax(0, …) not 1fr — a bare 1fr track takes its automatic minimum
             from the item and lets a wide child push the panel off-screen */
          .bench {
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
          font-size: 19px;
          font-weight: 600;
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12px;
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
        /* Two stacked number lines need height. Use a taller RATIO on a phone —
           never a min-height, which combines with aspect-ratio to inflate the
           element's intrinsic width and blow out the grid track. */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
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
          white-space: nowrap;
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
        .sw {
          width: 16px;
          height: 5px;
          border-radius: 3px;
          display: inline-block;
        }
        .dt {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--ink);
          display: inline-block;
        }
        .ring {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          border: 2px dashed var(--ink-soft);
          display: inline-block;
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
          gap: 11px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 48px;
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
          font-size: 13.5px;
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
        .goal {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          background: rgba(47, 111, 159, 0.07);
          border-left: 3px solid var(--const);
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
          gap: 8px;
          font-size: 12.5px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 11.5px;
        }
        .equiv-note {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--ink);
          background: rgba(31, 138, 91, 0.07);
          border-left: 3px solid var(--ok);
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
        :global(.ltlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
