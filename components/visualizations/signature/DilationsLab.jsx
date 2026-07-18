'use client';

/* ============================================================================
   DilationsLab — an interactive "bench" for the DILATION: every vertex
   slides along its own ray from the center to k times its distance — angles
   survive, lengths scale, and SIMILARITY is what remains when congruence
   lets go of size.

        dilate by k from O:  (x, y) → (kx, ky)
        angles survive · every length scales by exactly k
        similar  =  a dilation away from congruent

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 8 lab with
   the HS hand-off — CCSS 8.G.A.4 ("a two-dimensional figure is similar to
   another if the second can be obtained from the first by a sequence of
   rotations, reflections, translations, and DILATIONS"), G-SRT.A.1–2 (the
   properties of dilations; similarity in terms of transformations), and
   the quiet payoff 8.EE.B.6 — WHY a line has one slope everywhere, which
   LineFunctionLab asserts and this bench finally justifies.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions gated
   on ANSWERED (not correct), and a calibration challenge with a live meter
   and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE RAYS FROM THE CENTER."
     Gold rays run from the center O through every vertex of the blue
     figure, and the k dial slides each image vertex ALONG ITS OWN RAY to
     k times its distance — that is what a dilation IS, drawn as its own
     definition.  Two ledgers run live: LENGTHS multiply by exactly k (the
     squared lengths by k², kept exact by a half-integer dial), while the
     figure's ANGLES never move — the shape is the thing size cannot touch.
     The second act is the SLOPE TRIANGLE PAYOFF: a staircase triangle on a
     line, dilated from a point of that line, lands as a bigger staircase
     ON THE SAME LINE — rise and run scale together, so their ratio cannot
     change.  "A line has one slope" stops being a habit and becomes a
     consequence of similar triangles, exactly as 8.EE.B.6 asks.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • TransformationsLab owns the rigid moves and their chain;
       CongruenceLab owns the congruence definition and the alibi.  This
       lab adds the ONE move they both refused — the dilation — and the
       word SIMILAR, which is spoken here for the first time.  No move
       chain returns: the dilation is a dial, because its parameter is a
       NUMBER, not a sequence.
     • LineFunctionLab owns y = mx + b and the slope triangle as a reading
       device.  Here the slope triangle appears as a THEOREM'S WITNESS —
       two dilated staircases on one line — and no equation of a line is
       ever written.  (The word "slope" appears exactly in that payoff
       step, as the standard requires, and nowhere else.)
     • ScalingLab (5.NF.B.5) owns one-dimensional scaling of a LENGTH by a
       factor and the ×-makes-bigger misconception.  This lab scales a
       two-dimensional FIGURE from a CENTER along rays — the center is the
       new idea, and no bare number line appears.
     • PiLab's comb and AreaLab's tiling stay untouched: area is mentioned
       once, as a trap (it scales by k², not k), and never computed on
       screen.
     • RatioLab owns ratio tables and unit rates; nothing tabular here.

   One-accent discipline: CARMINE is THE IMAGE — the dilated figure and the
   factor k.  BLUE is the pre-image (the given).  GOLD is the APPARATUS —
   the center O and the rays.  GREEN is reserved for "correct" and
   CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a fourteen-year-old):
     • The dial holds k in HALVES (k2 = 2k an integer, from 1/2 to 2) and
       every pre-image vertex is an EVEN integer pair, so every image
       vertex is an exact integer pair: (x, y) → (k2·x/2, k2·y/2).  No
       float ever decides a stated fact.
     • The two ledgers are theorems, audited: squared image lengths equal
       k²·(squared pre-image lengths) for every edge at every dial stop,
       and the angle inventory is checked by exact cross/dot products of
       matched edge pairs (equal up to the k² factor on both terms).
     • The slope payoff is exact: the staircase triangle's rise and run
       both multiply by k2/2, and the audit verifies the dilated triangle's
       hypotenuse vertices satisfy the same line equation (cleared of
       denominators, integer cross-multiplication).
     • The calibration stamp needs two facts at once: the dial k matches
       the posted dilation (read off the image's size), AND the CENTER is
       identified among three marked candidates — only the true center's
       rays pass through matched vertex pairs (collinearity checked by
       exact cross products).  Audited over every case × every k × every
       candidate center.
   Verified by audit-dilations.mjs (numeric proof + source greps) and
   verify-dilations.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/DilationsLab.jsx
     2. Import and render it:
          import DilationsLab from './DilationsLab';
          export default function Page() { return <DilationsLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (k2, the scene,
              the lesson step, answers, the case, the chosen center).
     MODEL  — exact integer/half-integer arithmetic; it knows nothing of
              pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  ONE dial: the factor k, held in halves.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the image and the factor k
const BLUE = '#3f74a6'; // the pre-image
const GOLD = '#b98718'; // the center and its rays
const INK_HEX = '#1c2b3a';

const K_DIAL = { min: 1, max: 4, step: 1 }; // k2 = 2k: 1 → k=1/2 … 4 → k=2
const STAIR_DIAL = { min: 2, max: 4, step: 2 }; // whole k only — the staircase has odd coordinates
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact dilation; ledgers derived.
   ------------------------------------------------------------------------- */
/* pre-image vertices are EVEN integers, so k in halves keeps images integer */
const FIG = [[2, 2], [6, 2], [4, 6]]; // the main triangle
const STAIR = [[2, 1], [6, 1], [6, 3]]; // the slope staircase (line 2y = x through O)
const kOf = (k2) => k2 / 2;
const dilate = (pts, k2, O = [0, 0]) =>
  pts.map(([x, y]) => [O[0] + ((x - O[0]) * k2) / 2, O[1] + ((y - O[1]) * k2) / 2]);
const edgesSq = (pts) =>
  pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
  });
/* lengths scale by k: image edgeSq = (k2²/4)·pre edgeSq — exact when pre is even */
const lengthsScaleExactly = (pre, img, k2) =>
  edgesSq(pre).every((e, i) => 4 * edgesSq(img)[i] === k2 * k2 * e);
/* angles survive: at each vertex, the (cross, dot) pair of the two edge
   vectors scales by k² in BOTH coordinates — the angle is their ratio */
const angleSignature = (pts) =>
  pts.map((p, i) => {
    const a = pts[(i + 2) % pts.length];
    const b = pts[(i + 1) % pts.length];
    const u = [a[0] - p[0], a[1] - p[1]];
    const v = [b[0] - p[0], b[1] - p[1]];
    return [u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]];
  });
const anglesSurvive = (pre, img) => {
  const sa = angleSignature(pre);
  const sb = angleSignature(img);
  /* equal ratios: crossA·dotB === crossB·dotA and same cross sign */
  return sa.every(
    (s, i) => s[0] * sb[i][1] === sb[i][0] * s[1] && Math.sign(s[0]) === Math.sign(sb[i][0])
  );
};
/* the staircase's slanted side rides the line 2y = x (through O): verified
   by integer substitution for both triangles */
const onLine2yx = (p) => 2 * p[1] === p[0];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The enlarger's order."  A dilation is posted as a
   done deed — pre-image and image drawn, three candidate centers marked.
   Recover k on the dial and identify the true center.
   ------------------------------------------------------------------------- */
const DOCKET = [
  { id: 'e1', k2: 4, O: [0, 0], centers: [[0, 0], [-4, 2], [4, -4]] }, // k = 2
  { id: 'e2', k2: 3, O: [-4, -4], centers: [[-4, -4], [0, 0], [2, 2]] }, // k = 3/2
  { id: 'e3', k2: 1, O: [2, 0], centers: [[2, 0], [0, 0], [-2, -2]] }, // k = 1/2
  { id: 'e4', k2: 3, O: [-2, 0], centers: [[-2, 0], [0, 2], [2, -2]] }, // k = 3/2, another centre
];
/* the case's small pre-image, kept near its center so images stay in window */
const CASE_FIG = [[0, 2], [2, 0], [2, 2]];
const casePre = (kase) => CASE_FIG.map(([x, y]) => [kase.O[0] + x, kase.O[1] + y]);
const caseImg = (kase) => dilate(casePre(kase), kase.k2, kase.O);
/* a candidate center is TRUE iff every (pre, image) vertex pair is collinear
   with it — exact cross products */
const centerFits = (kase, C) =>
  casePre(kase).every((p, i) => {
    const q = caseImg(kase)[i];
    return (p[0] - C[0]) * (q[1] - C[1]) === (p[1] - C[1]) * (q[0] - C[0]);
  });
function makeCase(prevId) {
  let c;
  do {
    c = DOCKET[Math.floor(Math.random() * DOCKET.length)];
  } while (prevId && c.id === prevId);
  return c;
}
const calibChecks = (kase, k2, centerIdx) => {
  if (!kase) return [false, false];
  const kOK = k2 === kase.k2;
  const cOK =
    centerIdx != null &&
    kase.centers[centerIdx] != null &&
    kase.centers[centerIdx][0] === kase.O[0] &&
    kase.centers[centerIdx][1] === kase.O[1];
  return [kOK, cOK];
};
const closeness = (kase, k2, centerIdx) =>
  Math.round((100 * calibChecks(kase, k2, centerIdx).filter(Boolean).length) / 2);
const isCalibrated = (kase, k2, centerIdx) => calibChecks(kase, k2, centerIdx).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that dilation moves everything the
   same distance, that angles grow with the figure, that area scales by k.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The rays from the center',
    body:
      'A blue triangle, the center O, and a gold ray through every vertex. The k dial slides ' +
      'each carmine image vertex along ITS OWN ray to k times its distance from O. That ' +
      'sentence is the whole definition — watch it happen.',
    scene: 'fig',
    demo: 4,
    q: 'Dilating by k = 2: how far from O does each image vertex sit?',
    choices: [
      'Twice as far as its own vertex — each along its own ray',
      'Two squares further, all in the same direction',
      'The same distance, but rotated',
    ],
    answer: 0,
    feedback:
      'Twice ITS OWN distance, along ITS OWN ray — vertices far from O move far, vertices ' +
      'near O move little. That is why a dilation is not a slide: there is no single ' +
      'direction, only the center’s starburst. (And k = 1 leaves everything exactly home — ' +
      'try it.)',
  },
  {
    title: 'Lengths scale — by exactly k',
    body:
      'The length ledger is on. Every side of the image is exactly k times its blue partner ' +
      '— halved at k = 1/2, doubled at k = 2, never approximately.',
    scene: 'fig',
    demo: 3,
    ledger: true,
    q: 'At k = 3/2, a side of length 4 becomes…',
    choices: ['Exactly 6 — every length multiplies by k', '4 + 3/2 = 5.5', 'It depends which side'],
    answer: 0,
    feedback:
      'Exactly 6. Dilation MULTIPLIES lengths — it never adds. And "every length" means every ' +
      'length: all three sides, the heights, any segment you could draw inside — the whole ' +
      'metric of the figure, rescaled by one number. (A trap for later: the AREA does not ' +
      'multiply by k. It multiplies by k². Hold that thought.)',
  },
  {
    title: 'Angles survive',
    body:
      'The angle ledger is on. Sweep k from 1/2 to 2 and watch the three corners: the figure ' +
      'grows and shrinks, and not one angle moves.',
    scene: 'fig',
    demo: 4,
    ledger: true,
    q: 'Why do the angles refuse to change while everything grows?',
    choices: [
      'Both arms of each corner scale by the same k — the opening between them is a ratio, and ratios cancel',
      'Angles grow too, but too slowly to see',
      'The corners are pinned to the grid',
    ],
    answer: 0,
    feedback:
      'Each corner’s two arms stretch by the same factor, so the opening — which compares the ' +
      'arms, not their sizes — cannot move. Angles are the SHAPE of the figure, lengths are ' +
      'its SIZE, and the dilation touches only size. This is exactly what "similar" will ' +
      'mean: same shape, freely re-sized.',
  },
  {
    title: 'Similar — the word arrives',
    body:
      'Two figures are SIMILAR when a sequence of rigid moves AND dilations carries one onto ' +
      'the other. The rigid benches supplied the moves; this dial supplies the missing one.',
    scene: 'fig',
    demo: 2,
    ledger: true,
    q: 'Congruent figures are always similar. Are similar figures always congruent?',
    choices: [
      'No — similar allows a dilation; congruent is the special case k = 1',
      'Yes — the words mean the same thing',
      'No — similar figures are never congruent',
    ],
    answer: 0,
    feedback:
      'Similarity contains congruence as its k = 1 special case. The two definitions differ ' +
      'by exactly one legal move: the dilation. Same shape and same size is congruent; same ' +
      'shape, any size, is similar — and both are now DEFINITIONS with carrying sequences, ' +
      'not slogans (8.G.A.4).',
  },
  {
    title: 'The slope payoff',
    body:
      'A staircase triangle rides the line through O — run 4, rise 2. Dilate it from O: the ' +
      'bigger staircase lands ON THE SAME LINE, run and rise scaled together.',
    scene: 'stair',
    demo: 4,
    ledger: true,
    q: 'The two staircases sit on one line. What does their similarity prove about the line?',
    choices: [
      'Its slope is the same everywhere — rise and run scale together, so their ratio cannot change',
      'The line gets steeper further from O',
      'Nothing — staircases are decoration',
    ],
    answer: 0,
    feedback:
      'One slope, everywhere — because ANY two staircase triangles on the line are dilations ' +
      'of each other from a point of the line, and dilation scales rise and run by the same ' +
      'k, leaving rise ÷ run fixed. The line bench asserted this for years; the dilation just ' +
      'proved it (8.EE.B.6). Similar triangles carry the whole idea of slope on their backs.',
  },
  {
    title: 'The enlarger’s order',
    body:
      'A dilation has already happened — blue original, carmine enlargement, and three marked ' +
      'candidate centers. Recover the deed: set the dial to the k that was used, and tap the ' +
      'true center (only its rays pass through matched corners).',
    scene: 'case',
    demo: 2,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function DilationsLab() {
  const [k2, setK2] = useState(4);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);
  const [centerIdx, setCenterIdx] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const geomRef = useRef([]);

  const current = STEPS[step];
  const calib = !!current.calib;

  const checks = calib ? calibChecks(kase, k2, centerIdx) : [false, false];
  const pct = calib && kase ? closeness(kase, k2, centerIdx) : 0;
  const calibrated = calib && kase ? isCalibrated(kase, k2, centerIdx) : false;

  sceneRef.current = { k2, scene: current.scene, ledger: !!current.ledger, calib, kase, centerIdx };

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
    const WIN = 13;

    ctx.clearRect(0, 0, W, H);

    const bandH = 58;
    const cx = W / 2;
    const cy = bandH + (H - bandH) / 2;
    const k = Math.min((W - 40) / (2 * WIN + 2), (H - bandH - 36) / (2 * WIN + 2));
    const px = (X, Y) => [cx + X * k, cy - Y * k];

    /* grid */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.55)';
    ctx.beginPath();
    for (let v = -WIN; v <= WIN; v++) {
      const [gx] = px(v, 0);
      ctx.moveTo(gx, cy - WIN * k);
      ctx.lineTo(gx, cy + WIN * k);
      const [, gy] = px(0, v);
      ctx.moveTo(cx - WIN * k, gy);
      ctx.lineTo(cx + WIN * k, gy);
    }
    ctx.stroke();

    const poly = (pts, stroke, fill, width, dash) => {
      ctx.save();
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      pts.forEach(([X, Y], i) => {
        const [dx, dy] = px(X, Y);
        if (i === 0) ctx.moveTo(dx, dy);
        else ctx.lineTo(dx, dy);
      });
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.restore();
    };
    const dot = (P, r, fill, stroke) => {
      const [dx, dy] = px(P[0], P[1]);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, 2 * Math.PI);
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    };

    let bandText = '';
    let bandColor = CARMINE;

    if (S.scene === 'case' && S.kase) {
      const pre = casePre(S.kase);
      const img = caseImg(S.kase);
      /* the deed, already done */
      poly(pre, BLUE, 'rgba(63,116,166,0.13)', 2.2);
      poly(img, CARMINE, 'rgba(200,30,79,0.10)', 2.4);
      /* candidate centers */
      geomRef.current = [];
      S.kase.centers.forEach((C, i) => {
        const [dx2, dy2] = px(C[0], C[1]);
        geomRef.current.push({ dx: dx2, dy: dy2, i });
        dot(C, S.centerIdx === i ? 7 : 5.5, S.centerIdx === i ? GOLD : '#fff', GOLD);
        ctx.fillStyle = GOLD;
        ctx.font = '700 11px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(['P', 'Q', 'R'][i], dx2, dy2 - 8);
      });
      /* if a center is chosen, draw its rays through the pre-image vertices —
         the student SEES whether they catch the image corners */
      if (S.centerIdx != null && S.kase.centers[S.centerIdx]) {
        const C = S.kase.centers[S.centerIdx];
        ctx.strokeStyle = 'rgba(185,135,24,0.6)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 5]);
        pre.forEach((p) => {
          const dx = p[0] - C[0];
          const dy = p[1] - C[1];
          const t = 14 / Math.max(0.01, Math.hypot(dx, dy));
          const [x1, y1] = px(C[0], C[1]);
          const [x2, y2] = px(C[0] + dx * t, C[1] + dy * t);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }
      const kNow = S.k2 % 2 === 0 ? String(S.k2 / 2) : `${S.k2}/2`;
      bandText = `dial k = ${kNow} — which candidate’s rays catch every matched corner?`;
      bandColor = INK_SOFT;
    } else {
      const base = S.scene === 'stair' ? STAIR : FIG;
      const O = [0, 0];
      const img = dilate(base, S.k2, O);
      /* the line, for the staircase payoff */
      if (S.scene === 'stair') {
        ctx.strokeStyle = 'rgba(28,43,58,0.5)';
        ctx.lineWidth = 1.6;
        const [x1, y1] = px(-10, -5);
        const [x2, y2] = px(10, 5);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      /* the rays */
      ctx.strokeStyle = 'rgba(185,135,24,0.55)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 5]);
      base.forEach((p) => {
        const t = 16 / Math.max(0.01, Math.hypot(p[0], p[1]));
        const [x1, y1] = px(0, 0);
        const [x2, y2] = px(p[0] * t, p[1] * t);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      /* figures */
      poly(base, BLUE, 'rgba(63,116,166,0.13)', 2.2);
      poly(img, CARMINE, 'rgba(200,30,79,0.12)', 2.6);
      /* the center */
      dot([0, 0], 4.5, GOLD, '#fff');
      ctx.fillStyle = GOLD;
      ctx.font = '700 12px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('O', cx + 7, cy + 6);

      const kNow = S.k2 % 2 === 0 ? String(S.k2 / 2) : `${S.k2}/2`;
      if (S.ledger) {
        const ok1 = lengthsScaleExactly(base, img, S.k2);
        const ok2 = anglesSurvive(base, img);
        bandText = `k = ${kNow}   ·   lengths ×${kNow}: ${ok1 ? 'exact' : '?'}   ·   angles: ${
          ok2 ? 'unmoved' : '?'
        }${S.scene === 'stair' && img.every((p, i) => (i === 2 ? true : onLine2yx(p))) ? '   ·   same line' : ''}`;
      } else {
        bandText = `k = ${kNow} — each image vertex sits ${kNow}× its distance from O, on its own ray`;
      }
    }

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = bandColor;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(bandText, W / 2, bandH / 2);
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
    setK2(STEPS[step].demo);
    setCenterIdx(null);
    if (STEPS[step].calib) setKase(makeCase(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const onPointerDown = (e) => {
    if (!sceneRef.current.calib) return;
    const stage = stageRef.current;
    const rect = stage.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const g of geomRef.current) {
      if ((g.dx - mx) ** 2 + (g.dy - my) ** 2 < 16 * 16) {
        setCenterIdx(g.i);
        return;
      }
    }
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setK2(STEPS[step].demo);
    setCenterIdx(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const kText = k2 % 2 === 0 ? String(k2 / 2) : `${k2}/2`;
  const spoken = calib
    ? `The enlarger's order: recover the dilation. Dial k = ${kText}; center ${
        centerIdx != null ? ['P', 'Q', 'R'][centerIdx] : 'not chosen'
      }. ${calibrated ? 'Calibrated.' : ''}`
    : `Dilation by k = ${kText} from O: lengths scale by ${kText}, angles unmoved.`;

  return (
    <div className="dllab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Dilations: Rays From the Center</h1>
        <p className="lede">
          Every vertex slides along <em>its own ray</em> from O to k times its distance:
          lengths multiply by exactly <span className="mono">k</span>, angles never move — and{' '}
          <em>similar</em> is what congruent becomes when size is allowed to change.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken} onPointerDown={onPointerDown}>
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="dials">
            <div className="dial">
              <div className="dial-head">
                <span className="dial-k">the factor k</span>
                <span className="dial-v mono">{kText}</span>
              </div>
              <input
                type="range"
                min={(current.scene === 'stair' ? STAIR_DIAL : K_DIAL).min}
                max={(current.scene === 'stair' ? STAIR_DIAL : K_DIAL).max}
                step={(current.scene === 'stair' ? STAIR_DIAL : K_DIAL).step}
                value={k2}
                onChange={(e) => setK2(Number(e.target.value))}
                aria-label={`Dilation factor k, ${kText}`}
              />
            </div>
          </div>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={reset}>
              Reset
            </button>
            {calib && <span className="hint">tap P, Q or R — the true center’s rays catch every corner</span>}
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

          {calib && kase && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The order</span>
                <span className="target-word">recover the dilation</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the factor k, on the dial</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the true center, tapped</li>
                </ol>
                <span className="target-hint mono">
                  {calibrated
                    ? 'the deed is reconstructed — factor and center both'
                    : checks[0]
                      ? 'k found — now whose rays catch the corners?'
                      : 'compare matched sides to read k off the picture'}
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
                  <span className="mono target-hint">the factor · then the center</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase.id));
                  setCenterIdx(null);
                }}
              >
                Next order
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
                  setKase(null);
                  setCenterIdx(null);
                  setK2(4);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">along its own ray, to k times its distance</span> &nbsp;·&nbsp;
        dilations scale every length by k and move no angle; similar figures are those a
        sequence of rigid moves and dilations carries onto each other (CCSS 8.G.A.4, G-SRT.A) —
        and two staircases on one line prove why slope is a single number (8.EE.B.6).
      </footer>

      <style jsx>{`
        .dllab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
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
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
            min-height: 380px;
          }
        }
        .dials {
          margin: 12px 4px 0;
        }
        .dial {
          padding: 8px 10px;
          border: 1px solid rgba(28, 43, 58, 0.14);
          border-radius: 8px;
          background: var(--paper);
        }
        .dial-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        .dial-k {
          font-size: 12.5px;
          font-weight: 600;
        }
        .dial-v {
          font-size: 13px;
          color: var(--carmine);
          font-weight: 700;
        }
        .dial input[type='range'] {
          width: 100%;
          accent-color: var(--carmine);
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .hint {
          font-size: 12px;
          font-style: italic;
          color: var(--ink-soft);
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
        .quiz {
          margin-top: 4px;
          padding-top: 6px;
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
        .target-word {
          font-family: var(--serif);
          font-size: 21px;
          font-weight: 600;
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
        :global(.dllab) :focus-visible {
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
