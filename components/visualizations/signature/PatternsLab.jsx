'use client';

/* ============================================================================
   PatternsLab — an interactive "bench" for PATTERNS AND RULES: generate a
   pattern from a rule, and spot the feature the rule never mentions.

        Machine A: start 0, add 3   →  0, 3, 6, 9, 12
        Machine B: start 0, add 6   →  0, 6, 12, 18, 24
        the secret neither rule states:  every B is DOUBLE its partner A —
        and the ordered pairs (A, B) march up one straight ray.

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADES 4–5 lab —
   CCSS 4.OA.C.5 ("generate a number pattern that follows a given rule;
   identify apparent features of the pattern that were not explicit in the
   rule itself" — the parity example in step 1 is the standard's own),
   5.OA.B.3 ("generate two numerical patterns using two given rules; identify
   apparent relationships between corresponding terms; form ordered pairs …
   and graph the ordered pairs" — the add-3/add-6 double is the standard's
   own example), with 3.OA.D.9 (arithmetic patterns, explained) underneath.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "TWO MACHINES, ONE SECRET."
     Two rule machines share one CRANK.  Each press stamps the next term of
     both patterns into a T-table — corresponding terms side by side — and,
     once the pairing step arrives, welds each row into an ordered pair and
     drops it onto the grid.  The lab's thesis is that a rule UNDERSTATES
     its pattern: "add 3" never mentions parity, yet the terms alternate
     odd/even; "add 3" and "add 6" never mention each other, yet every B is
     double its partner A; neither rule mentions geometry, yet the pairs
     line up on one ray through the origin — because every crank repeats
     the same move (a right, b up).  The trap is THE ADDITIVE ILLUSION:
     B = A + 3 fits the first honest row (3, 6) perfectly and dies at the
     second (6, 12) — a relation must survive EVERY crank, and the only one
     that does is the multiplicative one.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • SequencesLab (HS) owns THE SEQUENCE as an object: the term track of
       indexed tiles, hop arcs, the recursive ⇄ explicit translation and
       a₁ + (n−1)d.  Nothing here is called a sequence (the audit greps the
       word out); there is no term track, no arc between terms, no index
       notation, and no closed form — terms live in a plain T-table and the
       subject is the UNSTATED FEATURE, not the formula.
     • MultiplesLab owns the skip-count number line.  No number line is
       drawn and nothing skip-counts; that A's terms happen to be multiples
       is never the lesson.
     • LineFunctionLab owns y = mx + b and the slope triangle.  No equation
       of a line, no slope word, no rise/run triangle appears; the dots are
       never joined into a line.  The one arrow drawn is the crank's own
       repeated move — the reason for straightness a fourth-grader can own.
     • PointLab owns what an ordered pair IS (the smear, the collapse, the
       route, the quadrant map).  Pairs here are USED, first quadrant only,
       with none of that anatomy — 5.OA.B.3 asks for forming and plotting,
       and that is all this lab does.
     • TableLab owns the two-way frequency table (margins, grand total).
       The T-table here is a list of terms, not a crosstab — nothing counts
       people and nothing has margins.
     • DataLab owns the dot plot and the measures of center.  The graph here
       is a scatter of ordered pairs, never stacked, never averaged.

   One-accent discipline: CARMINE is THE SECRET — the B-double tags, the
   plotted pairs, the target ray, the relation readout.  The machines and
   their lists are quiet slate-blue (A) and teal-blue (B is drawn in the
   same restrained family; the SECRET is what glows, not the lists).  GOLD
   marks the CRANK'S MOVE — the repeated (a right, b up) arrow and the
   pairing welds.  GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a ten-year-old):
     • Terms are exact integers: term(i) = start + i·add, audited for every
       dial value and every crank.  Nothing floats.
     • The stated features are proved, not asserted: the parity alternation
       of start-1-add-3 (adding an odd flips parity), the B = 2A identity of
       the CCSS pair, the death of the additive illusion at the second row,
       and the collinearity identity b·A(i) − a·B(i) = 0 for zero starts —
       each audited exhaustively.
     • The capstone stamp needs the relation to hold for EVERY plotted pair
       (equivalently b = c·a, proved equivalent in the audit) AND at least
       four cranks of evidence — so the stamp can never fire on a lucky
       origin dot or an empty table.
   Verified by audit-patterns.mjs (numeric proof + source greps) and
   verify-patterns.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/PatternsLab.jsx
     2. Import and render it:
          import PatternsLab from './PatternsLab';
          export default function Page() { return <PatternsLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the two add-rules,
              the crank count, the lesson step, the capstone target).
     MODEL  — pure integer arithmetic; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Two add-rule dials (the machines' rules); the crank
   is the lab's verb.  Starts are pinned by the lesson scenes (1 for the solo
   parity step, 0 everywhere else) — they are story, not dials.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the secret: the relation, the pairs, the target ray
const LISTA = '#5b7a99'; // machine A and its list — quiet slate-blue
const LISTB = '#4a8896'; // machine B and its list — the restrained teal twin
const GOLD = '#b98718'; // the crank's move and the pairing welds

const DIALS = [
  { key: 'b', name: 'B adds', role: 'machine B’s rule · +1 to +8', min: 1, max: 8, unlock: 3, color: LISTB },
  { key: 'a', name: 'A adds', role: 'machine A’s rule · +1 to +5', min: 1, max: 5, unlock: 4, color: LISTA },
];
const MAX_CRANKS = 5;
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integers, nothing else.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/* term i of a machine: the start, plus i cranks of the rule */
const term = (start, add, i) => start + i * add;

/* the rows on the table after n cranks: i = 0 (the starts) … n */
function rowsOf(startA, a, startB, b, n) {
  const rows = [];
  for (let i = 0; i <= n; i++) rows.push([term(startA, a, i), term(startB, b, i)]);
  return rows;
}

/* the features the rules never mention — each one proved in the audit */
const parityAlternates = (start, add, upTo) => {
  for (let i = 0; i < upTo; i++) {
    if ((term(start, add, i) + term(start, add, i + 1)) % 2 === 0) return false; // consecutive terms same parity
  }
  return true;
};
const isDouble = (rows) => rows.every(([A, B]) => B === 2 * A);
/* zero-start collinearity: every pair sits on the ray b·A = a·B */
const onRay = (A, B, c) => B === c * A;
const allOnRay = (rows, c) => rows.every(([A, B]) => onRay(A, B, c));

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The mystery machine."  A dashed target ray demands
   B = c·A for every pair.  The child sets both rules and cranks out at least
   four rows of evidence.  With zero starts, every pair lands on the ray
   exactly when b = c·a (proved equivalent in the audit) — but the stamp
   checks the pairs themselves, and it checks that the evidence exists.
   ------------------------------------------------------------------------- */
function makeTarget(prev) {
  let c;
  do {
    c = 2 + Math.floor(Math.random() * 3); // 2…4
  } while (prev != null && c === prev);
  return c;
}
const calibChecks = (rows, c, n) => [n >= 1 && allOnRay(rows.slice(1), c), n >= 4];
const isCalibrated = (rows, c, n) => calibChecks(rows, c, n).every(Boolean);
const closeness = (rows, c, n) => {
  const ck = calibChecks(rows, c, n);
  return (ck[0] ? 50 : 0) + (ck[1] ? 50 : 0);
};

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback; the
   trap is the additive illusion.  Next gates on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One machine, one rule',
    startA: 1,
    solo: true,
    maxCranks: 4,
    title2: null,
    body: 'Machine A: start at 1, add 3. Crank it four times and read the list: 1, 4, 7, 10, 13. Now look at something the rule never said.',
    q: 'The rule only says “add 3.” What did the terms do anyway?',
    choices: ['They alternate odd, even, odd, even…', 'They are all odd', 'They all end in 1'],
    answer: 0,
    feedback:
      'Odd, even, odd, even — and the rule never mentioned parity. It happens because adding an ' +
      'ODD number flips parity every time. This is the standard’s own example: a pattern always ' +
      'knows more than its rule says out loud, and the extra features have reasons.',
  },
  {
    title: 'A second machine',
    startA: 0,
    startB: 0,
    maxCranks: 5,
    body: 'Machine B joins: start at 0, add 6. A restarts at 0, add 3. One crank now feeds BOTH machines. Crank a few rows and compare across.',
    q: 'The rules say “add 3” and “add 6” — nothing more. What is each B term, next to its partner A?',
    choices: ['Exactly double it', 'Three more than it', 'There is no connection'],
    answer: 0,
    feedback:
      'Double, every single row — 0·2=0, 3·2=6, 6·2=12… Neither rule mentions the other, yet a ' +
      'relation BETWEEN the lists is there anyway, because each crank feeds B twice what it ' +
      'feeds A. That across-the-table look is exactly what CCSS 5.OA.B.3 asks for.',
  },
  {
    title: 'Welding pairs',
    startA: 0,
    startB: 0,
    maxCranks: 5,
    body: 'Each row welds into an ordered pair: partner terms, A first, B second. The table grows a third column.',
    q: 'After the crank that writes A = 9, the welded pair is…',
    choices: ['(9, 18)', '(18, 9)', '(9, 12)'],
    answer: 0,
    feedback:
      '(9, 18) — A first, B second, always. The order is a promise, and it is what makes the ' +
      'pair one OBJECT: “the row where A is 9” travels as a single thing, carrying both partner ' +
      'terms with it.',
  },
  {
    title: 'The illusion and the ray',
    startA: 0,
    startB: 0,
    maxCranks: 5,
    graph: true,
    body: 'The pairs drop onto the grid — and Machine B’s dial is unlocked. First, with add-3 and add-6: look at the honest first row, (3, 6).',
    q: '(3, 6) fits “B = A + 3” perfectly. Does that relation survive the next crank?',
    choices: [
      'No — (6, 12) breaks it; only B = 2 × A fits every pair',
      'Yes — B is always A + 3',
      'Both relations fit all the pairs',
    ],
    answer: 0,
    feedback:
      'It dies at the second row: 6 + 3 is 9, but B is 12. One row is a coincidence; a relation ' +
      'must survive EVERY crank. B = 2 × A does — and this is the classic trap: the additive ' +
      'guess always fits somewhere. Check it against the whole table before you believe it.',
  },
  {
    title: 'Why a ray?',
    startA: 0,
    startB: 0,
    maxCranks: 5,
    graph: true,
    body: 'Machine A’s dial is unlocked too. Whatever the rules, the dots refuse to scatter — they line up from the origin. The gold arrow is the reason.',
    q: 'Why do the pairs always line up straight from (0, 0)?',
    choices: [
      'Every crank repeats the same move — a right, b up — so every dot continues the same direction',
      'Because the terms are all even',
      'They only line up for add-3 and add-6',
    ],
    answer: 0,
    feedback:
      'One crank = one identical move: a to the right, b upward. Repeat the same step from the ' +
      'same start and you must walk a straight path — change either dial and the path tilts, ' +
      'but it is always one ray. The geometry is the rules’ repetition made visible.',
  },
  {
    title: 'The mystery machine',
    startA: 0,
    startB: 0,
    maxCranks: 5,
    graph: true,
    calib: true,
    body: 'A dashed ray appears with a demand: every pair must satisfy B = c × A. Set both rules, then crank out at least four rows of proof.',
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PatternsLab() {
  const [a, setA] = useState(3); // machine A's add-rule
  const [b, setB] = useState(6); // machine B's add-rule
  const [n, setN] = useState(0); // cranks so far
  const [targetC, setTargetC] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const startA = current.startA ?? 0;
  const startB = current.startB ?? 0;
  const solo = !!current.solo;

  const rows = rowsOf(startA, a, startB, b, n);
  const pct = calib && targetC != null ? closeness(rows, targetC, n) : 0;
  const calibrated = calib && targetC != null ? isCalibrated(rows, targetC, n) : false;
  const checks = calib && targetC != null ? calibChecks(rows, targetC, n) : [false, false];

  sceneRef.current = { a, b, n, rows, step, solo, startA, startB, calib, targetC, graph: !!current.graph };

  /* ---- full redraw from state ------------------------------------------- */
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

    const INK = '#1c2b3a';
    const INK_SOFT = '#5b6b7b';
    const S = sceneRef.current;

    ctx.clearRect(0, 0, W, H);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let x = gs; x < W; x += gs) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, H);
    }
    for (let y = gs; y < H; y += gs) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(W, Math.round(y) + 0.5);
    }
    ctx.stroke();

    const leftW = S.graph ? W * 0.46 : W;

    /* ---- the machines ------------------------------------------------------ */
    const machine = (x, y, w, label, rule, color) => {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, 44, 8) : ctx.rect(x, y, w, 44);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 10, y + 18);
      ctx.fillStyle = INK;
      ctx.font = '600 12.5px ui-monospace, Menlo, monospace';
      ctx.fillText(rule, x + 10, y + 35);
    };
    const mW = Math.min(180, leftW * 0.44);
    machine(24, 16, mW, 'Machine A', `start ${S.startA}, add ${S.a}`, LISTA);
    if (!S.solo) machine(24 + mW + 14, 16, mW, 'Machine B', `start ${S.startB}, add ${S.b}`, LISTB);

    /* ---- the T-table ------------------------------------------------------- */
    const tx = 24;
    const ty = 84;
    const rowH = Math.min(34, (H - ty - 30) / (MAX_CRANKS + 1.6));
    const colCrank = tx;
    const colA = tx + 64;
    const colB = colA + 74;
    const colPair = colB + 74;
    const showPairs = S.step >= 2;

    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = INK_SOFT;
    ctx.fillText('crank', colCrank, ty);
    ctx.fillStyle = LISTA;
    ctx.fillText('A', colA, ty);
    if (!S.solo) {
      ctx.fillStyle = LISTB;
      ctx.fillText('B', colB, ty);
      if (showPairs) {
        ctx.fillStyle = GOLD;
        ctx.fillText('the pair', colPair, ty);
      }
    } else {
      ctx.fillStyle = INK_SOFT;
      ctx.fillText('what the rule never said', colB, ty);
    }
    ctx.strokeStyle = 'rgba(28,43,58,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, ty + 6.5);
    ctx.lineTo(showPairs ? colPair + 74 : colB + 90, ty + 6.5);
    ctx.stroke();

    ctx.font = '600 14px ui-monospace, Menlo, monospace';
    S.rows.forEach(([A, B], i) => {
      const y = ty + 10 + (i + 1) * rowH - rowH * 0.3;
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px ui-monospace, Menlo, monospace';
      ctx.fillText(i === 0 ? 'start' : `${i}`, colCrank, y);
      ctx.font = '600 14px ui-monospace, Menlo, monospace';
      ctx.fillStyle = LISTA;
      ctx.fillText(String(A), colA, y);
      if (!S.solo) {
        ctx.fillStyle = LISTB;
        ctx.fillText(String(B), colB, y);
        if (showPairs) {
          ctx.fillStyle = GOLD;
          ctx.fillText(`(${A}, ${B})`, colPair, y);
        }
        /* the secret, tagged where it lives: beside the row */
        if (S.step === 1 && B === 2 * A) {
          ctx.fillStyle = CARMINE;
          ctx.font = 'italic 600 11px system-ui, sans-serif';
          ctx.fillText('double', colB + 44, y);
          ctx.font = '600 14px ui-monospace, Menlo, monospace';
        }
      } else {
        ctx.fillStyle = A % 2 === 1 ? CARMINE : INK_SOFT;
        ctx.font = 'italic 600 11.5px system-ui, sans-serif';
        ctx.fillText(A % 2 === 1 ? 'odd' : 'even', colB, y);
        ctx.font = '600 14px ui-monospace, Menlo, monospace';
      }
    });
    if (S.n < (STEPS[S.step].maxCranks ?? MAX_CRANKS)) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 12px system-ui, sans-serif';
      ctx.fillText('crank for the next row…', colCrank, ty + 10 + (S.rows.length + 1) * rowH - rowH * 0.3);
    }

    /* ---- the graph --------------------------------------------------------- */
    if (S.graph) {
      const gx = leftW + 18;
      const gw = W - gx - 22;
      const gy = 30;
      const gh = H - gy - 46;
      const maxA = 26;
      const maxB = 42;
      const px = (A) => gx + (A / maxA) * gw;
      const py = (B) => gy + gh - (B / maxB) * gh;

      /* axes + light ticks every 5 — a grid to read, not a coordinate lesson */
      ctx.strokeStyle = 'rgba(28,43,58,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let v = 5; v <= maxA; v += 5) {
        ctx.moveTo(px(v) + 0.5, gy);
        ctx.lineTo(px(v) + 0.5, gy + gh);
      }
      for (let v = 5; v <= maxB; v += 5) {
        ctx.moveTo(gx, py(v) + 0.5);
        ctx.lineTo(gx + gw, py(v) + 0.5);
      }
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx, gy + gh);
      ctx.lineTo(gx + gw, gy + gh);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 11px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      for (let v = 5; v <= maxA; v += 5) ctx.fillText(String(v), px(v), gy + gh + 16);
      ctx.textAlign = 'right';
      for (let v = 5; v <= maxB; v += 5) ctx.fillText(String(v), gx - 6, py(v) + 4);
      ctx.textAlign = 'left';
      ctx.fillStyle = LISTA;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText('A →', gx + gw - 30, gy + gh + 30);
      ctx.fillStyle = LISTB;
      ctx.fillText('↑ B', gx + 6, gy + 12);

      /* the capstone's demand: the dashed target ray B = c·A */
      if (S.calib && S.targetC != null) {
        const c = S.targetC;
        const endA = Math.min(maxA, maxB / c);
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([7, 6]);
        ctx.beginPath();
        ctx.moveTo(px(0), py(0));
        ctx.lineTo(px(endA), py(c * endA));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = CARMINE;
        ctx.font = 'italic 600 12px system-ui, sans-serif';
        ctx.fillText(`the demand: B = ${c} × A`, px(endA * 0.45), py(c * endA * 0.45) - 10);
      }

      /* the crank's move, drawn once between the first two dots */
      if (S.rows.length >= 2) {
        const [A0, B0] = S.rows[0];
        const [A1, B1] = S.rows[1];
        if (A1 <= 26 && B1 <= 42) {
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px(A0), py(B0));
          ctx.lineTo(px(A1), py(B1));
          ctx.stroke();
          const angX = px(A1) - px(A0);
          const angY = py(B1) - py(B0);
          const len = Math.hypot(angX, angY) || 1;
          ctx.beginPath();
          ctx.moveTo(px(A1), py(B1));
          ctx.lineTo(px(A1) - (angX / len) * 9 - (angY / len) * 4, py(B1) - (angY / len) * 9 + (angX / len) * 4);
          ctx.moveTo(px(A1), py(B1));
          ctx.lineTo(px(A1) - (angX / len) * 9 + (angY / len) * 4, py(B1) - (angY / len) * 9 - (angX / len) * 4);
          ctx.stroke();
          ctx.fillStyle = GOLD;
          ctx.font = 'italic 600 11px system-ui, sans-serif';
          ctx.fillText(`the move: ${S.a} right, ${S.b} up`, px(A1) + 8, py(B1) + 2);
        }
      }

      /* the pairs */
      for (const [A, B] of S.rows) {
        if (A > 26 || B > 42) continue;
        const hit = S.calib && S.targetC != null && B === S.targetC * A;
        ctx.fillStyle = hit || !S.calib ? CARMINE : INK_SOFT;
        ctx.beginPath();
        ctx.arc(px(A), py(B), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.font = '600 10.5px ui-monospace, Menlo, monospace';
        ctx.fillText(`(${A},${B})`, px(A) + 8, py(B) - 6);
      }
    }
  }, []);

  useEffect(() => {
    draw();
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* every step opens on the scene its words describe */
  useEffect(() => {
    if (current.calib) {
      setTargetC(makeTarget(null));
      setA(1);
      setB(1);
      setN(0);
      return;
    }
    setTargetC(null);
    setA(3);
    setB(6);
    setN(step === 0 ? 0 : step === 1 ? 0 : 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const maxCranks = current.maxCranks ?? MAX_CRANKS;
  const crank = () => {
    if (n >= maxCranks) return;
    setN(n + 1);
  };
  const resetLists = () => setN(0);
  const setDial = (key, v) => {
    if (key === 'a') setA(clampInt(v, 1, 5));
    if (key === 'b') setB(clampInt(v, 1, 8));
    setN(0); // a new rule starts fresh lists — old rows were another machine's
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const newTarget = () => {
    setTargetC(makeTarget(targetC));
    setA(1);
    setB(1);
    setN(0);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = solo
    ? `Machine A, start ${startA} add ${a}: ${rows.map(([A]) => A).join(', ')}.`
    : `After ${n} cranks the pairs are ${rows.map(([A, B]) => `(${A}, ${B})`).join(' ')}.${calibrated ? ' Calibrated.' : ''}`;

  return (
    <div className="palab">
      <header className="head">
        <h1>Two Rules, One Secret</h1>
        <p className="lede">
          A rule tells you how to make the <em>next</em> term. Crank two rules side by side and
          something appears that neither rule mentions —{' '}
          <span className="mono">a relation between the lists</span>, and a straight ray of pairs
          to prove it.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="toolbar">
            <button type="button" className="btn crank" onClick={crank} disabled={n >= maxCranks}>
              Crank {solo ? 'the machine' : 'both machines'}
            </button>
            <button type="button" className="btn ghost" onClick={resetLists}>
              Reset the lists
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
            {DIALS.map((d) => {
              const unlocked = step >= d.unlock;
              const v = d.key === 'a' ? a : b;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk" style={{ color: d.color }}>
                    {d.name}
                  </span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={1}
                    value={v}
                    disabled={!unlocked}
                    aria-label={`${d.name} — ${d.role}`}
                    onChange={(e) => setDial(d.key, Number(e.target.value))}
                    style={{ accentColor: d.color }}
                  />
                  <output className="dv" style={unlocked ? { color: d.color } : undefined}>
                    {unlocked ? `+${v}` : '🔒'}
                  </output>
                </label>
              );
            })}
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
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
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

          {calib && targetC != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The mystery machine</span>
                <p className="patient mono">every pair must satisfy B = {targetC} × A</p>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} every cranked pair on the ray</li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} at least four rows of evidence ({n}/4)
                  </li>
                </ol>
                <span className="target-hint mono">
                  {calibrated
                    ? 'the rules obey the demand'
                    : n === 0
                      ? 'set the rules, then crank'
                      : checks[0]
                        ? 'on the ray — keep cranking'
                        : 'a pair missed the ray — rethink the rules'}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">{checks.filter(Boolean).length}/2</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">rule · crank · relation</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={newTarget}>
                New demand
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
                  setA(3);
                  setB(6);
                  setN(0);
                  setTargetC(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">a rule understates its pattern</span> &nbsp;·&nbsp; generate
        patterns from rules and identify features not explicit in the rules; with two rules,
        identify relationships between corresponding terms, form ordered pairs, and graph them
        (CCSS 4.OA.C.5, 5.OA.B.3, 3.OA.D.9). One crank, one row, one dot.
      </footer>

      <style jsx>{`
        .palab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
          --lista: #5b7a99;
          --listb: #4a8896;
          --gold: #b98718;
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
          max-width: 72ch;
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
            /* minmax(0,1fr), never a bare 1fr (the TeenNumbersLab phone lesson) */
            grid-template-columns: minmax(0, 1fr);
          }
        }
        .panel {
          min-width: 0;
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 7 / 5;
          min-height: 430px;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
            min-height: 400px;
          }
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
        .btn.crank {
          background: var(--gold);
          border-color: var(--gold);
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
          background: var(--carmine);
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
          grid-template-columns: 96px 1fr 40px;
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
          font-weight: 600;
          font-size: 15px;
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
          cursor: pointer;
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 17px;
          font-weight: 700;
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
          border-left: 3px solid var(--carmine);
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
        .target-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 12px;
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 8px;
          background: rgba(185, 135, 24, 0.07);
        }
        .target-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .patient {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
        }
        .tasks {
          margin: 0;
          padding: 0 0 0 4px;
          list-style: none;
          font-size: 13.5px;
          display: grid;
          gap: 4px;
        }
        .tasks li.done {
          color: var(--ok);
          font-weight: 600;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--carmine));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
          white-space: nowrap;
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
        :global(.palab) :focus-visible {
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
