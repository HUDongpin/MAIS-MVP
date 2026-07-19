'use client';

/* ============================================================================
   LengthComparisonLab — an interactive "bench" for DIRECT LENGTH COMPARISON:
   deciding which of two objects is LONGER, which is SHORTER, or whether they
   are the SAME LENGTH — with no ruler, no numbers, and no measuring at all.

        line the near ends up  ⇒  the far end decides

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is a KINDERGARTEN
   lab — CCSS K.MD.A.2 ("directly compare two objects with a measurable
   attribute in common, to see which object has 'more of'/'less of' the
   attribute") with K.MD.A.1 (length as a describable attribute) underneath it
   and the Grade-1 reach 1.MD.A.1 ("order three objects by length").  It is the
   idea BEFORE measurement exists: you can compare two pencils without ever
   knowing how long either one is — but ONLY if you give them a fair start.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE VERDICT REFUSES AN UNFAIR RACE."
     Two strips lie on shelves before a gold START LINE, and the lab's verdict
     pill ("the red strip is longer") is SELF-GATING: it reads out only while
     every strip's near end touches the gold line.  Slide one strip to the
     right and the verdict goes silent — "not a fair start" — because with the
     near ends apart, the far ends genuinely say nothing.  The classic
     kindergarten error (judging by whichever tip sticks out farther) is not
     lectured against; the lab simply refuses to make the unfair call, and the
     child learns the PROTOCOL of comparison by needing it.  (The precedent is
     ComposingShapesLab's self-gating ledger: an arithmetic claim a child can
     see is wrong is worse than no claim.)

     The trap is staged honestly: a SHORTER strip is slid right until its tip
     pokes past the longer strip's tip.  Sliding never changes length — the
     strip carries its length with it — and dragging it home to the line shows
     the far ends telling the truth again.  Translation invariance is the whole
     mathematical content of "line them up first", and it is a thing you drag.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • MeasurementLab (Grade 2) owns measuring WITH UNITS: rods laid end to
       end, counts, "how much longer" as a NUMBER, estimation, the number-line
       ruler.  This lab is deliberately UPSTREAM of it: there is NO ruler, NO
       tick, NO count, and NO length is ever shown as a number — the audit
       greps the code to prove it.  Here comparison is decided by alignment
       alone; when the child later meets the ruler, it is because "line the
       ends up" stops being enough for two objects in different rooms.
     • ComparingLab owns comparing NUMBERS — magnitude bars on a shared scale,
       the place-value digit grid, and the symbols > < =.  This lab compares
       OBJECTS, its words are longer/shorter/same (never greater/less), and no
       comparison symbol appears anywhere.  ComparingLab's bars grow from a
       shared baseline BY CONSTRUCTION; this lab is about the child having to
       BUILD that shared baseline by hand — the step ComparingLab skips.
     • SortLab owns big/small as a CLASSIFICATION attribute (bins, counts).
       Nothing is binned here; two lengths are related, not grouped.
     • SubtractionLab/AddLab own the number line and its hops.  No number line.

   One-accent discipline, adapted for a two-object comparison lab (the
   ComparingLab precedent): strip A is CARMINE (the object under study), strip
   B is restrained BLUE, strip C (when it joins) is slate.  GOLD is the START
   LINE — the tool of fairness, exactly as gold marked MeasurementLab's
   measuring rods and UnitConversionLab's conversion factor: gold = the tool,
   never a quantity.  GREEN is reserved for the verdict, "correct", and the
   CALIBRATED stamp.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a five-year-old):
     • Strip lengths are INTEGERS (in an internal step never shown to the
       child).  Offsets from the start line are INTEGER half-steps.  Every
       fact the lab states — longer/shorter/same, "lined up", the trap's
       "tip pokes out farther", longest/shortest — is an exact integer
       comparison.  No float ever decides a verdict.
     • The verdict is a pure trichotomy: exactly one of longer/shorter/same,
       and verdict(a,b) is always the mirror of verdict(b,a).  Audited over
       every reachable pair.
     • The calibration stamp fires iff (every strip on the line) AND (the
       longest strip tapped as longest) AND (the shortest tapped as shortest)
       — three integer predicates.  The challenge generator only emits three
       DISTINCT lengths, so longest and shortest are unique and the stamp is
       provably unambiguous.  Audited exhaustively.
   Verified by audit-lengthcomparison.mjs (numeric proof + source greps) and
   verify-lengthcomparison.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/LengthComparisonLab.jsx
     2. Import and render it:
          import LengthComparisonLab from './LengthComparisonLab';
          export default function Page() { return <LengthComparisonLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the blue strip's
              length, each strip's offset from the line, the lesson step, the
              answers, the challenge).
     MODEL  — pure integer arithmetic; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  This lab is for five-year-olds, so it has exactly ONE
   dial: the blue strip's length.  The primary interaction is DRAGGING the
   strips to the gold line — that gesture is the lesson.
   ------------------------------------------------------------------------- */
const RED = '#c81e4f'; // carmine — strip A, the object under study
const BLUE = '#3f74a6'; // strip B
const SLATE = '#5b6b7b'; // strip C (joins at step 5)
const GOLD = '#b98718'; // the START LINE — the tool of fairness
const OK = '#1f8a5b'; // the verdict / CALIBRATED

const LEN_A = 7; // the red strip never changes: the fixed reference
const LEN_C = 9; // the slate strip is longer than red BY CONSTRUCTION (9 > 7),
// so step 5's question has one true answer at every dial position
const OFF_MAX = 10; // farthest a strip can slide, in half-steps

const DIALS = [
  { key: 'lenB', name: 'Blue strip', role: 'make it longer or shorter', min: 2, max: 12, unlock: 3, color: BLUE },
];

const START_LEN_B = 4;
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  All exact.  A strip is {len, off}: len in whole steps,
   off in half-steps from the gold line (0 = touching it).  The far tip sits at
   2·len + off half-steps, so every geometric claim is an integer comparison.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/* the trichotomy — the one fact this lab exists to read out */
function verdictOf(lenX, lenY) {
  if (lenX > lenY) return 'longer';
  if (lenX < lenY) return 'shorter';
  return 'same';
}

/* where a strip's far tip sits, in half-steps from the line */
const tipHalves = (len, off) => 2 * len + off;

/* the fairness gate: a verdict may only be read when every strip in play has
   its near end exactly on the line */
const allAligned = (offs) => offs.every((o) => o === 0);

/* which strip is longest / shortest (only ever asked of distinct lengths) */
const idxOfLongest = (lens) => lens.indexOf(Math.max(...lens));
const idxOfShortest = (lens) => lens.indexOf(Math.min(...lens));

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The line-up judge."  Three strips land scattered,
   every one of them off the line.  The child must (1) drag all three to the
   gold line, then (2) tap the longest, then (3) tap the shortest.  Taps do not
   even register until the line-up is fair — the fairness gate is the thesis,
   and the capstone runs on it.

   No false stamp, provably: the generator only emits three DISTINCT lengths,
   so the longest and shortest are unique; the stamp is three integer
   predicates ANDed.  The audit sweeps every distinct triple and every pick
   pair and confirms the gate.
   ------------------------------------------------------------------------- */
function makeChallenge() {
  const pool = [4, 5, 6, 7, 8, 9, 10, 11, 12];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const lens = pool.slice(0, 3);
  const offs = lens.map(() => 2 + Math.floor(Math.random() * (OFF_MAX - 2 + 1))); // 2…OFF_MAX, never 0
  return { lens, offs };
}

const calibChecks = (offs, lens, pickL, pickS) => [
  allAligned(offs),
  pickL != null && pickL === idxOfLongest(lens),
  pickS != null && pickS === idxOfShortest(lens),
];
const matchPercent = (offs, lens, pickL, pickS) => {
  const done = calibChecks(offs, lens, pickL, pickS).filter(Boolean).length;
  return Math.round((100 * done) / 3);
};
const isCalibrated = (offs, lens, pickL, pickS) => calibChecks(offs, lens, pickL, pickS).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step.  The scenes a step's words describe are
   PINNED by STEPS[].demo (offsets in half-steps, and the blue length where the
   copy depends on it), so the card and the canvas can never disagree.  The
   trap's numbers are chosen so the lie is guaranteed: blue len 4, slid 9
   half-steps → tip at 17 halves; red len 7 on the line → tip at 14.  The
   shorter strip visibly pokes out farther.  Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The far end decides',
    body: 'Two strips start at the gold line. Look at the far ends.',
    strips: 2,
    demo: { offs: [0, 0, 0], lenB: 4 },
    q: 'Which strip is longer?',
    choices: ['Red — it reaches farther', 'Blue', 'Cannot tell'],
    answer: 0,
    feedback: 'Red reaches farther — but only a fair start makes that true.',
  },
  {
    title: 'The sneaky slide',
    body: 'Blue slid off the line! Drag it back to the gold line.',
    strips: 2,
    demo: { offs: [0, 9, 0], lenB: 4 },
    drag: true,
    q: 'Blue’s tip pokes out now. Did blue get longer?',
    choices: ['No — a head start', 'Yes', 'Red shrank'],
    answer: 0,
    feedback: 'Sliding changes WHERE a strip is — never how LONG it is.',
  },
  {
    title: 'A strip carries its length',
    body: 'Slide a strip anywhere. Its brace rides along.',
    strips: 2,
    demo: { offs: [0, 4, 0] },
    drag: true,
    lens: { brace: true },
    q: 'You slide a strip. What changes?',
    choices: ['Only where it sits', 'It gets longer', 'Its colour'],
    answer: 0,
    feedback: 'Length belongs to the strip, not the spot.',
  },
  {
    title: 'Longer, shorter — or the same',
    body: 'Make blue longer, shorter — then exactly the same as red.',
    strips: 2,
    demo: { offs: [0, 0, 0] },
    drag: true,
    q: 'Blue exactly as long as red. The verdict?',
    choices: ['Same length', 'Red is longer', 'It cannot say'],
    answer: 0,
    feedback: 'A fair start, and the far ends land together — the same!',
  },
  {
    title: 'Three strips in a row',
    body: 'A grey strip joins. Drag all three to the gold line.',
    strips: 3,
    demo: { offs: [3, 6, 1] },
    drag: true,
    q: 'Lined up — is grey longer than red?',
    choices: ['Longer', 'Shorter', 'The same'],
    answer: 0,
    feedback: 'Grey reaches past red. Read the order: longest, middle, shortest.',
  },
  {
    title: 'The line-up judge',
    body: 'Drag all three to the line. Tap the LONGEST, then the SHORTEST.',
    strips: 3,
    drag: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function LengthComparisonLab() {
  const [lenB, setLenB] = useState(START_LEN_B);
  const [offs, setOffs] = useState([0, 0, 0]); // half-steps from the line, per strip
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [chal, setChal] = useState(null); // { lens:[l0,l1,l2], offs:[…] }
  const [pickL, setPickL] = useState(null);
  const [pickS, setPickS] = useState(null);
  const [sel, setSel] = useState(1); // keyboard-selected strip

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const geomRef = useRef({ rods: [] });
  const dragRef = useRef(null);

  const current = STEPS[step];
  const calib = !!current.calib;
  const nStrips = current.strips;

  /* the strips on stage: lesson strips are (red 7, blue dial, grey 9); the
     calibration hands out its own mystery lengths */
  const lens = calib && chal ? chal.lens : [LEN_A, lenB, LEN_C];
  const liveOffs = offs.slice(0, nStrips);
  const fair = allAligned(liveOffs);

  const verdict = verdictOf(lens[0], lens[1]); // red vs blue, the lesson pair
  const pct = calib && chal ? matchPercent(liveOffs, lens, pickL, pickS) : 0;
  const calibrated = calib && chal ? isCalibrated(liveOffs, lens, pickL, pickS) : false;
  const checks = calib && chal ? calibChecks(liveOffs, lens, pickL, pickS) : [false, false, false];

  sceneRef.current = {
    lens,
    offs: liveOffs,
    nStrips,
    fair,
    verdict,
    calib,
    calibrated,
    pickL,
    pickS,
    sel,
    brace: !calib && !!(current.lens && current.lens.brace),
    canDrag: !!current.drag,
  };

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

    const rr = (x, y, w, h, rad) => {
      const rC = Math.max(0, Math.min(rad, w / 2, h / 2));
      ctx.beginPath();
      ctx.moveTo(x + rC, y);
      ctx.arcTo(x + w, y, x + w, y + h, rC);
      ctx.arcTo(x + w, y + h, x, y + h, rC);
      ctx.arcTo(x, y + h, x, y, rC);
      ctx.arcTo(x, y, x + w, y, rC);
      ctx.closePath();
    };

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

    /* layout: a reserved verdict band on top (so the hint can never sit on a
       strip — the NumberBond collision lesson), then the shelves */
    const bandH = 56;
    const x0 = Math.max(46, Math.round(W * 0.075));
    // worst tip: longest strip (12) fully slid (OFF_MAX): 2·12+10 = 34 halves
    const U = (W - x0 - 18) / 17; // px per whole step; 17 steps of room
    const half = U / 2;
    const rodH = Math.min(36, Math.max(24, H * 0.08));
    const laneGap = (H - bandH - 30) / (S.nStrips + 1);

    const colors = [RED, BLUE, SLATE];
    const names = ['red', 'blue', 'grey'];

    /* the gold start line — the tool of the whole lab */
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, bandH - 6);
    ctx.lineTo(x0, H - 12);
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.font = '700 11px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('start', x0, H - 2);

    /* shelves + rods */
    const rods = [];
    for (let i = 0; i < S.nStrips; i++) {
      const cy = bandH + laneGap * (i + 1);
      // shelf
      ctx.strokeStyle = 'rgba(28,43,58,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(14, cy + rodH / 2 + 4.5);
      ctx.lineTo(W - 14, cy + rodH / 2 + 4.5);
      ctx.stroke();

      const x = x0 + S.offs[i] * half;
      const w = S.lens[i] * U;
      const y = cy - rodH / 2;
      const col = colors[i];

      // the rod
      ctx.fillStyle = col;
      rr(x, y, w, rodH, rodH / 2.6);
      ctx.fill();
      // a soft top light so it reads as a solid thing, not a bar chart
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      rr(x + 3, y + 3, Math.max(0, w - 6), rodH * 0.32, rodH / 3.4);
      ctx.fill();

      // picked badges in the calibration
      const badge = S.pickL === i ? 'LONGEST?' : S.pickS === i ? 'SHORTEST?' : null;
      if (S.calib && badge) {
        ctx.font = '700 10px ui-monospace, Menlo, monospace';
        const bw = ctx.measureText(badge).width + 12;
        ctx.fillStyle = '#fff';
        rr(x + w + 8, cy - 9, bw, 18, 5);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        rr(x + w + 8, cy - 9, bw, 18, 5);
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(badge, x + w + 14, cy + 0.5);
      }

      // keyboard focus ring
      if (S.canDrag && S.sel === i) {
        ctx.strokeStyle = 'rgba(28,43,58,0.55)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 4]);
        rr(x - 4, y - 4, w + 8, rodH + 8, rodH / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // the riding brace (step 3's lens): the strip carries its length
      if (S.brace && i === 1) {
        const by = y + rodH + 10;
        ctx.strokeStyle = INK_SOFT;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, by);
        ctx.lineTo(x, by + 6);
        ctx.lineTo(x + w, by + 6);
        ctx.lineTo(x + w, by);
        ctx.stroke();
        ctx.fillStyle = INK_SOFT;
        ctx.font = 'italic 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('its length — it rides along', x + w / 2, by + 20);
      }

      // a small gap flag when a strip is off the line
      if (S.offs[i] > 0) {
        ctx.strokeStyle = 'rgba(185,135,24,0.75)';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x0, cy);
        ctx.lineTo(x, cy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      rods.push({ x, y, w, h: rodH, i });
    }
    geomRef.current = { rods };

    /* the verdict band */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bandCy = bandH / 2 + 2;
    if (S.calib) {
      /* the capstone must not read the order out loud — that is the child's job */
      const msg = !S.fair
        ? 'not a fair start — drag every strip to the gold line'
        : S.calibrated
          ? 'a fair line-up, judged right'
          : S.pickL == null
            ? 'fair start ✓ — now tap the LONGEST strip'
            : S.pickS == null
              ? 'now tap the SHORTEST strip'
              : 'look again — tap Pick again to retry';
      ctx.font = '600 14px system-ui, sans-serif';
      ctx.fillStyle = S.fair ? (S.calibrated ? OK : INK) : INK_SOFT;
      ctx.fillText(msg, W / 2, bandCy);
    } else if (!S.fair) {
      ctx.font = 'italic 600 14px system-ui, sans-serif';
      ctx.fillStyle = INK_SOFT;
      ctx.fillText('not a fair start — drag every strip to the gold line', W / 2, bandCy);
    } else {
      const line =
        S.nStrips === 2
          ? S.verdict === 'same'
            ? 'the red and blue strips are the same length'
            : `the red strip is ${S.verdict} than the blue strip`
          : orderSentence(S.lens);
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillStyle = OK;
      ctx.fillText(line, W / 2, bandCy);
    }
    function orderSentence(ls) {
      const order = ls
        .map((l, i) => ({ l, i }))
        .sort((a, b) => b.l - a.l)
        .map((e) => names[e.i]);
      // ties read honestly: "longest → shortest" only offered on distinct triples
      return `longest → shortest:  ${order.join(' · ')}`;
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

  /* every step opens on the scene its words describe (card/canvas agreement) */
  useEffect(() => {
    const d = STEPS[step].demo;
    if (d) {
      setOffs(d.offs.slice());
      if (d.lenB != null) setLenB(d.lenB);
    }
  }, [step]);

  /* hand the calibration its challenge on first arrival */
  useEffect(() => {
    if (current.calib && chal == null) {
      const c = makeChallenge();
      setChal(c);
      setOffs(c.offs.slice());
      setPickL(null);
      setPickS(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction: drag a strip; tap to pick in the capstone ------------ */
  const stripAt = (px, py) => {
    const { rods } = geomRef.current;
    for (let k = rods.length - 1; k >= 0; k--) {
      const r = rods[k];
      if (px >= r.x - 6 && px <= r.x + r.w + 6 && py >= r.y - 8 && py <= r.y + r.h + 8) return r.i;
    }
    return null;
  };

  const setOff = (i, v) => {
    setOffs((prev) => {
      const next = prev.slice();
      next[i] = clampInt(v, 0, OFF_MAX);
      return next;
    });
  };

  const onPointerDown = (e) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const i = stripAt(px, py);
    if (i == null) return;
    setSel(i);
    if (!sceneRef.current.canDrag) return;
    const rod = geomRef.current.rods.find((r) => r.i === i);
    dragRef.current = { i, grabDX: px - rod.x, moved: false, startX: px };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      /* no capture, no problem */
    }
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const stage = stageRef.current;
    const rect = stage.getBoundingClientRect();
    const px = e.clientX - rect.left;
    if (Math.abs(px - d.startX) > 4) d.moved = true;
    if (!d.moved) return;
    const W = stage.clientWidth;
    const x0 = Math.max(46, Math.round(W * 0.075));
    const half = (W - x0 - 18) / 34;
    setOff(d.i, (px - d.grabDX - x0) / half);
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (!d.moved && sceneRef.current.calib) {
      /* a TAP in the capstone: it only registers on a fair line-up — the
         fairness gate is the thesis, so the capstone runs on it too */
      if (!sceneRef.current.fair) return;
      if (pickL == null) setPickL(d.i);
      else if (pickS == null && d.i !== pickL) setPickS(d.i);
    }
  };

  const onKeyDown = (e) => {
    const S = sceneRef.current;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => (s + (e.key === 'ArrowDown' ? 1 : S.nStrips - 1)) % S.nStrips);
    } else if (S.canDrag && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      setOff(sel, offs[sel] + (e.key === 'ArrowRight' ? 1 : -1));
    } else if (S.canDrag && e.key === 'Home') {
      e.preventDefault();
      setOff(sel, 0);
    } else if (S.calib && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (!S.fair) return;
      if (pickL == null) setPickL(sel);
      else if (pickS == null && sel !== pickL) setPickS(sel);
    }
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    if (calib && chal) {
      setOffs(chal.offs.slice());
      setPickL(null);
      setPickS(null);
    } else {
      const d = STEPS[step].demo;
      if (d) {
        setOffs(d.offs.slice());
        if (d.lenB != null) setLenB(d.lenB);
      }
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = calib
    ? `Line-up judge: ${fair ? 'fair start' : 'strips are scattered'}. ${calibrated ? 'Calibrated.' : ''}`
    : fair
      ? nStrips === 2
        ? verdict === 'same'
          ? 'Fair start. The red and blue strips are the same length.'
          : `Fair start. The red strip is ${verdict} than the blue strip.`
        : 'Fair start. All three strips can be read: longest to shortest.'
      : 'Not a fair start yet. Drag every strip to the gold line.';

  return (
    <div className="lclab">
      <header className="head">
        <h1>Longer or Shorter: The Fair Line-Up</h1>
        <p className="lede">
          You can tell which strip is <em>longer</em> without a single number — but only if
          every strip gets a <em>fair start</em>. Line the near ends up on the gold line, and the
          far end decides.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div
            className="stage"
            ref={stageRef}
            role="img"
            aria-label={spoken}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={reset}>
              Reset
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
            {!calib &&
              DIALS.map((d) => {
                const unlocked = step >= d.unlock;
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
                      value={lenB}
                      disabled={!unlocked}
                      aria-label={`${d.name} — ${d.role}`}
                      onChange={(e) => setLenB(clampInt(e.target.value, d.min, d.max))}
                      style={{ accentColor: d.color }}
                    />
                    <output className="dv" style={unlocked ? { color: d.color } : undefined}>
                      {unlocked ? '↔' : '🔒'}
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

          {calib && chal != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The line-up judge</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} every strip on the gold line</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the longest strip tapped</li>
                  <li className={checks[2] ? 'done' : ''}>{checks[2] ? '✓' : '·'} the shortest strip tapped</li>
                </ol>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {checks.filter(Boolean).length}/3 {calibrated ? '' : '· a fair judge checks the start first'}
                </span>
                {calibrated && <span className="stamp">CALIBRATED</span>}
              </div>
              <div className="calib-btns">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setPickL(null);
                    setPickS(null);
                  }}
                  disabled={pickL == null && pickS == null}
                >
                  Pick again
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    const c = makeChallenge();
                    setChal(c);
                    setOffs(c.offs.slice());
                    setPickL(null);
                    setPickS(null);
                  }}
                >
                  New line-up
                </button>
              </div>
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
                  setChal(null);
                  setPickL(null);
                  setPickS(null);
                  setLenB(START_LEN_B);
                  setOffs([0, 0, 0]);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">same start ⇒ the far end decides</span> &nbsp;·&nbsp; comparing lengths
        directly, with <em>no</em> numbers at all (CCSS K.MD.A.2; ordering three, 1.MD.A.1). Putting a
        number on a length is the next lab — it starts exactly where this rule runs out.
      </footer>

      <style jsx>{`
        .lclab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --red: #c81e4f;
          --blue: #3f74a6;
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
            /* minmax(0,1fr), never a bare 1fr — a bare 1fr floors at the
               stage's intrinsic width and blows the lab out sideways on a
               phone (the TeenNumbersLab lesson) */
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
          min-height: 400px;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
          cursor: grab;
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
            min-height: 360px;
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
          background: var(--red);
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
          border-left: 3px solid var(--red);
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
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--red));
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
        .calib-btns {
          display: flex;
          gap: 9px;
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
        .foot em {
          font-style: italic;
          color: var(--ink);
        }
        :global(.lclab) :focus-visible {
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
