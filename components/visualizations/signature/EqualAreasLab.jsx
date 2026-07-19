'use client';

/* ============================================================================
   EqualAreasLab — an interactive "bench" for PARTITIONING A SHAPE INTO PARTS
   WITH EQUAL AREAS, where the unit-fraction name is EARNED BY MEASUREMENT:

        four parts with equal areas   →  fourths: each is 1/4 of the whole
        four parts, one greedy        →  just four pieces.  No name.
        four DIFFERENT-shaped parts with equal areas → still fourths.

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is a GRADE 3
   lab — CCSS 3.G.A.2 is the anchor: partition shapes into parts with equal
   areas, and express the area of each part as a unit fraction of the whole.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE NAME IS EARNED BY AREA."
     A field (one rectangle — the whole) is partitioned by one of eight cut
     patterns, and the bench COMPUTES every part's area exactly.  The name
     pill — "each part = 1/4 of the whole" — is SELF-GATING: it lights only
     when the computed areas are all equal, and otherwise it refuses,
     outlines the part that holds the most and the part that holds the
     least, and says so.  (The precedent is LengthComparisonLab's verdict
     that refuses an unfair race: an arithmetic name a child can see is
     undeserved is worse than no name.)  Three exhibits carry the lesson:
     THE GREEDY CUT — four parts, one wide — which kills the deepest Grade-3
     error, "four parts = fourths"; THE ENVELOPE — the rectangle cut corner-
     to-centre into four triangles of two visibly different shapes, every
     one of them exactly 1/4 by computation; and THE SLANT — the rectangle's
     diagonal, a famously terrible mirror (SymmetryLab measured that) that
     is nonetheless a PERFECT fair cut, because folding needs matching but
     fairness needs only equal area.  The capstone hands over the knife: one
     adjustable first cut, the rest split evenly — the fair spot is exactly
     one, and the name fires only there.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • EqualSharesLab (Grades 1–2) owns the WORDS halves/thirds/fourths
       before notation: three identical cakes cut three ways, fairness as a
       promise, no numerator anywhere.  This lab is its Grade-3 sequel and
       never re-tells the cake story: ONE field, computed areas, the
       verdict, and the notation "1/n of the whole" — measurement where
       that lab had vocabulary.  Its more-pieces-smaller-pieces fact returns
       here once, upgraded into symbols (1/6 < 1/3 of the same field).
     • AreaLab owns area as a COUNT OF UNIT SQUARES, the tiling, and the
       cut-and-slide.  No grid is ever drawn inside this field, no square is
       counted, and no formula appears: areas live inside the model, and
       the student sees only comparisons and verdicts.
     • FractionLab owns the partitioned BAR with its split dial and shaded
       p-of-q parts.  This lab's parts are regions of a 2-D field, never a
       strip diagram; nothing is shaded as a numerator, and no p/q other
       than the earned 1/n is ever written.
     • SymmetryLab owns the fold test.  The diagonal step cites its verdict
       as a foil — same line, different question — and folds nothing.
     • MultiplicationLab / DistributiveLab own arrays and pull-aparts.  The
       window and pane patterns here are partitions to be JUDGED, not
       products to be counted, and no factor is ever named.

   One-accent discipline: CARMINE is THE VERDICT'S OBJECT — the part holding
   the most when the name is refused, and the earned name pill when it is
   granted.  BLUE marks the part holding the least.  GOLD is the CUT — the
   pattern lines, the adjustable knife, the capstone card.  GREEN is
   reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes an eight-year-old):
     • The field is 12 × 6 abstract units (never shown); every pattern's
       part areas are computed EXACTLY as integers in 72nds of the whole,
       they sum to 72 for every pattern (audited), and "equal" means
       integer equality — never a visual judgement.
     • The envelope's four triangles are proved equal in area (18 each) AND
       genuinely different in shape (their side-length sets differ) — the
       audit checks both, because "equal areas need not be congruent" is
       the standard's deep clause.
     • The adjustable cut is fair exactly when p·n === 12 — an integer
       identity (first part p of 12; the remaining 12 − p split among n − 1;
       equality ⟺ p(n−1) = 12−p ⟺ pn = 12).  The capstone stamp is that
       identity; the meter reads 100 only there (99 is its ceiling
       everywhere else), audited over every n × every p.
   Verified by audit-equalareas.mjs (numeric proof + source greps) and
   verify-equalareas.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/EqualAreasLab.jsx
     2. Import and render it:
          import EqualAreasLab from './EqualAreasLab';
          export default function Page() { return <EqualAreasLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the pattern, the
              adjustable cut, the lesson step, answers, the target).
     MODEL  — exact integer areas in 72nds of the whole; verdicts computed.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  A pattern dial and, later, the adjustable knife.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the verdict: the greedy part, the earned name
const BLUE = '#3f74a6'; // the part holding the least
const GOLD = '#b98718'; // the cuts, the knife, the capstone card

const DIALS = [
  { key: 'pattern', name: 'Pattern', role: 'walk the cut patterns', min: 0, max: 7, unlock: 0, color: GOLD },
  { key: 'knife', name: 'First cut', role: 'slide the fair-or-not first cut', min: 1, max: 11, unlock: 5, color: GOLD },
];

const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  The field is 12 × 6 (72 area-units, never shown); every
   pattern's areas are exact integers in 72nds.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

const FW = 12; // field width in abstract units
const FH = 6; // field height
const WHOLE = FW * FH; // 72

const PATTERNS = [
  { name: 'four tall strips', kind: 'vcuts', cuts: [3, 6, 9] },
  { name: 'the greedy cut', kind: 'vcuts', cuts: [6, 8, 10] },
  { name: 'the window', kind: 'grid', rows: 2, cols: 2 },
  { name: 'the envelope', kind: 'envelope' },
  { name: 'three flats', kind: 'hcuts', cuts: [2, 4] },
  { name: 'almost thirds', kind: 'vcuts', cuts: [3, 6] },
  { name: 'six panes', kind: 'grid', rows: 2, cols: 3 },
  { name: 'the slant', kind: 'diag' },
];

const filled = (k, v) => {
  const out = [];
  for (let i = 0; i < k; i++) out.push(v);
  return out;
};

/* every part's area, exactly, in 72nds of the whole */
const areasOf = (pat) => {
  if (pat.kind === 'vcuts') {
    const xs = [0, ...pat.cuts, FW];
    const out = [];
    for (let i = 0; i < xs.length - 1; i++) out.push((xs[i + 1] - xs[i]) * FH);
    return out;
  }
  if (pat.kind === 'hcuts') {
    const ys = [0, ...pat.cuts, FH];
    const out = [];
    for (let i = 0; i < ys.length - 1; i++) out.push((ys[i + 1] - ys[i]) * FW);
    return out;
  }
  if (pat.kind === 'grid') {
    const a = (FW / pat.cols) * (FH / pat.rows);
    return filled(pat.rows * pat.cols, a);
  }
  if (pat.kind === 'envelope') {
    /* four triangles, apex at the centre: top/bottom (base FW, height FH/2),
       left/right (base FH, height FW/2) — every one (FW·FH)/4 = 18 */
    return [
      (FW * (FH / 2)) / 2, // top: ½·12·3 = 18
      (FH * (FW / 2)) / 2, // right: ½·6·6 = 18
      (FW * (FH / 2)) / 2, // bottom: 18
      (FH * (FW / 2)) / 2, // left: 18
    ];
  }
  /* diag: the diagonal halves the rectangle exactly */
  return [WHOLE / 2, WHOLE / 2];
};
const allEqual = (areas) => areas.every((a) => a === areas[0]);
const biggestIdx = (areas) => areas.indexOf(Math.max(...areas));
const smallestIdx = (areas) => areas.indexOf(Math.min(...areas));
const NAME_FOR = { 2: 'halves', 3: 'thirds', 4: 'fourths', 6: 'sixths' };
const earnedName = (areas) => (allEqual(areas) ? NAME_FOR[areas.length] || `${areas.length} equal parts` : null);

/* the adjustable knife: first part p wide; the rest split evenly among n−1.
   Fair ⟺ p·(n−1) === (12 − p)  ⟺  p·n === 12 — an integer identity. */
const knifeAreasScaled = (n, p) => {
  /* scaled by (n−1) so everything stays integer: first = p(n−1)·FH, each
     other = (12−p)·FH */
  const first = p * (n - 1) * FH;
  const rest = (FW - p) * FH;
  return [first, ...filled(n - 1, rest)];
};
const knifeIsFair = (n, p) => p * n === FW;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Earn the name."  The part count is posted; only
   the first cut moves; the rest of the field splits evenly behind it.  The
   fair spot is exactly one, and the name fires only there.

   No false stamp, provably: CALIBRATED ⟺ p·n === 12, an integer identity.
   The meter reads 100 only at equality (99 is its ceiling everywhere else),
   audited over every posted count × every knife position.
   ------------------------------------------------------------------------- */
const TARGET_NS = [2, 3, 4, 6];
function makeTarget(prev) {
  let n;
  do {
    n = TARGET_NS[Math.floor(Math.random() * TARGET_NS.length)];
  } while (prev && n === prev);
  return n;
}
const closeness = (n, p) =>
  knifeIsFair(n, p) ? 100 : Math.max(0, Math.min(99, Math.round(100 - (Math.abs(p * n - FW) * 100) / 36)));
const isCalibrated = (n, p) => knifeIsFair(n, p);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; every scene a step's words depend on
   is pinned by STEPS[].demo; the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Equal parts means equal areas',
    body:
      'Three cuts, four strips — the bench measured every part. The pill ' +
      'says FOURTHS.',
    demo: { pat: 0 },
    q: 'What must be equal before parts are FOURTHS?',
    choices: ['Their areas', 'Their shapes', 'Their edge lengths'],
    answer: 0,
    feedback:
      'Their AREAS. Each part holds exactly a quarter of the field — ' +
      'and the bench measures it.',
  },
  {
    title: 'The greedy cut',
    body: 'Four parts again — but the first cut was greedy. The pill refuses.',
    demo: { pat: 1 },
    q: 'The field is in four parts. Is each part 1/4?',
    choices: ['No — just four pieces', 'Yes — four parts always make fourths', 'Yes — straight cuts'],
    answer: 0,
    feedback: 'No. The COUNT of parts says nothing until the areas are equal.',
  },
  {
    title: 'The envelope',
    body: 'Corner to centre: four triangles, wide and tall. Watch the pill.',
    demo: { pat: 3 },
    q: 'Different shapes — still fourths?',
    choices: ['Yes — area is the judge', 'No — same shape needed', 'Only two of them'],
    answer: 0,
    feedback: 'Yes. Equal areas need not look alike — the envelope proves it.',
  },
  {
    title: 'The slant that is fair',
    body: 'This diagonal FAILED the fold test — yet the pill says HALVES.',
    demo: { pat: 7 },
    q: 'It failed the fold test. How can both be true?',
    choices: ['Different questions — fold vs fairness', 'One lab is wrong', 'Diagonals are unfair'],
    answer: 0,
    feedback:
      'Folding needs parts to MATCH; fairness needs only equal areas. ' +
      'Two tests, two honest answers.',
  },
  {
    title: 'More parts, smaller parts',
    body: 'Three flats: each part is 1/3. Six panes: each is 1/6. Compare one part.',
    demo: { pat: 4 },
    q: 'Cut the SAME field into 6 parts, not 3. Each part is…',
    choices: ['Smaller — 1/6 is less than 1/3', 'Bigger', 'The same'],
    answer: 0,
    feedback: 'Smaller: more parts leaves less for each, so 1/6 < 1/3 even though 6 > 3.',
  },
  {
    title: 'The adjustable knife',
    body: 'The knife is yours. Slide the first cut until the pill grants FOURTHS.',
    demo: { pat: -1, n: 4, p: 5 },
    q: 'The cut sits at the fair spot when…',
    choices: ['It holds exactly as much as each of the others', 'It is biggest', 'It hugs the edge'],
    answer: 0,
    feedback: 'One spot and only one — fairness is a point, not a region.',
  },
  {
    title: 'Earn the name',
    body: 'Slide the cut until every part holds the same — and the name is earned.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function EqualAreasLab() {
  const [pat, setPat] = useState(0);
  const [p, setP] = useState(5);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const adj = calib || (current.demo && current.demo.pat === -1);
  const knifeN = calib && target != null ? target : current.demo && current.demo.n ? current.demo.n : 4;

  const stamped = calib && target != null ? isCalibrated(target, p) : false;
  const pct = calib && target != null ? closeness(target, p) : 0;

  sceneRef.current = { pat, p, adj, knifeN, calib, stamped };

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

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    /* field geometry */
    const fw = Math.min(W * 0.7, 460);
    const fh = fw / 2; // 12 : 6
    const x0 = (W - fw) / 2;
    const y0 = H * 0.2;
    const ux = fw / FW;
    const uy = fh / FH;

    /* compute this scene's areas and part polygons */
    let areas;
    let polys = [];
    if (S.adj) {
      const n = S.knifeN;
      areas = knifeAreasScaled(n, S.p);
      const xs = [0, S.p];
      const restW = (FW - S.p) / (n - 1);
      for (let i = 1; i < n; i++) xs.push(S.p + restW * i);
      for (let i = 0; i < n; i++)
        polys.push([[xs[i], 0], [xs[i + 1], 0], [xs[i + 1], FH], [xs[i], FH]]);
    } else {
      const P = PATTERNS[S.pat];
      areas = areasOf(P);
      if (P.kind === 'vcuts') {
        const xs = [0, ...P.cuts, FW];
        for (let i = 0; i < xs.length - 1; i++)
          polys.push([[xs[i], 0], [xs[i + 1], 0], [xs[i + 1], FH], [xs[i], FH]]);
      } else if (P.kind === 'hcuts') {
        const ys = [0, ...P.cuts, FH];
        for (let i = 0; i < ys.length - 1; i++)
          polys.push([[0, ys[i]], [FW, ys[i]], [FW, ys[i + 1]], [0, ys[i + 1]]]);
      } else if (P.kind === 'grid') {
        const cw = FW / P.cols;
        const ch = FH / P.rows;
        for (let r = 0; r < P.rows; r++)
          for (let c = 0; c < P.cols; c++)
            polys.push([[c * cw, r * ch], [(c + 1) * cw, r * ch], [(c + 1) * cw, (r + 1) * ch], [c * cw, (r + 1) * ch]]);
      } else if (P.kind === 'envelope') {
        const C = [FW / 2, FH / 2];
        polys = [
          [[0, 0], [FW, 0], C],
          [[FW, 0], [FW, FH], C],
          [[FW, FH], [0, FH], C],
          [[0, FH], [0, 0], C],
        ];
      } else {
        polys = [
          [[0, 0], [FW, 0], [FW, FH]],
          [[0, 0], [FW, FH], [0, FH]],
        ];
      }
    }

    const equal = allEqual(areas);
    const big = biggestIdx(areas);
    const small = smallestIdx(areas);

    /* draw the parts */
    const toPx = ([qx, qy]) => [x0 + qx * ux, y0 + qy * uy];
    polys.forEach((poly, i) => {
      ctx.beginPath();
      poly.forEach((pt, j) => {
        const [px2, py2] = toPx(pt);
        if (j === 0) ctx.moveTo(px2, py2);
        else ctx.lineTo(px2, py2);
      });
      ctx.closePath();
      ctx.fillStyle = equal
        ? 'rgba(200,30,79,0.14)'
        : i === big
          ? 'rgba(200,30,79,0.3)'
          : i === small
            ? 'rgba(63,116,166,0.25)'
            : 'rgba(91,107,123,0.12)';
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    /* the field's outline */
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(x0, y0, fw, fh);

    /* verdict callouts on the unequal case */
    if (!equal) {
      const centroid = (poly) => {
        let sx = 0;
        let sy = 0;
        for (const pt of poly) {
          sx += pt[0];
          sy += pt[1];
        }
        return toPx([sx / poly.length, sy / poly.length]);
      };
      const [bx, by] = centroid(polys[big]);
      ctx.fillStyle = CARMINE;
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('holds the most', bx, by);
      const [sx2, sy2] = centroid(polys[small]);
      ctx.fillStyle = BLUE;
      ctx.fillText('holds the least', sx2, sy2);
    }

    /* scene caption, tight under the field */
    ctx.fillStyle = INK;
    ctx.font = '600 12.5px system-ui, sans-serif';
    ctx.fillText(
      S.adj ? `the adjustable knife — ${S.knifeN} parts wanted` : PATTERNS[S.pat].name,
      W / 2,
      y0 + fh + 16
    );

    /* the area bars: one quiet bar per part, length ∝ area */
    {
      const byX = x0;
      const byY = y0 + fh + 42;
      const maxA = Math.max(...areas);
      const barMax = fw * 0.55;
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 11.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('what each part holds:', byX, byY - 2);
      areas.forEach((a2, i) => {
        const bw = (a2 / maxA) * barMax;
        ctx.fillStyle = equal
          ? 'rgba(200,30,79,0.4)'
          : i === big
            ? 'rgba(200,30,79,0.55)'
            : i === small
              ? 'rgba(63,116,166,0.5)'
              : 'rgba(91,107,123,0.35)';
        ctx.fillRect(byX, byY + 8 + i * 13, bw, 8);
      });
      ctx.textAlign = 'center';
    }

    /* THE NAME PILL — self-gating */
    const name = earnedName(areas);
    const pillY = y0 - 34;
    if (name) {
      ctx.fillStyle = CARMINE;
      ctx.font = `700 ${Math.min(19, W / 30)}px 'Iowan Old Style', Palatino, Georgia, serif`;
      ctx.fillText(
        `${name.toUpperCase()} — each part is 1/${areas.length} of the whole`,
        W / 2,
        pillY
      );
    } else {
      ctx.fillStyle = INK_SOFT;
      ctx.font = `italic 600 ${Math.min(16, W / 34)}px system-ui, sans-serif`;
      ctx.fillText(`${areas.length} parts — but NOT equal. No name is earned.`, W / 2, pillY);
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

  /* every step whose words name a scene opens on that scene */
  useEffect(() => {
    const dm = STEPS[step].demo;
    if (dm) {
      if (dm.pat >= 0) setPat(dm.pat);
      if (dm.p != null) setP(dm.p);
    }
    if (STEPS[step].calib) {
      const t = makeTarget(null);
      setTarget(t);
      setP(5);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    const dm = current.demo;
    if (dm) {
      if (dm.pat >= 0) setPat(dm.pat);
      if (dm.p != null) setP(dm.p);
    } else if (calib) {
      setP(5);
    }
  };

  const setDial = (key, raw) => {
    if (key === 'pattern') setPat(clampInt(raw, 0, PATTERNS.length - 1));
    else setP(clampInt(raw, 1, 11));
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const sceneAreas = adj ? knifeAreasScaled(knifeN, p) : areasOf(PATTERNS[pat]);
  const spoken =
    (adj
      ? `The adjustable knife makes ${knifeN} parts; ${allEqual(sceneAreas) ? 'they are equal' : 'they are not equal yet'}.`
      : `Pattern: ${PATTERNS[pat].name}. ${earnedName(sceneAreas) ? `The parts are ${earnedName(sceneAreas)} — each 1/${sceneAreas.length} of the whole.` : 'The parts are not equal; no name is earned.'}`) +
    (calib && target ? ` The posted count is ${target}.` : '');

  return (
    <div className="eqarealab">
      <header className="head">
        <h1>Equal Areas: Earning the Name</h1>
        <p className="lede">
          Four parts are not fourths until the <em>areas</em> say so. The bench measures every
          part — the name 1/n lights only when it is earned, whatever shapes the parts wear.
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
            {stamped ? ' Calibrated — every part holds the same, and the name is earned.' : ''}
          </p>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={reset}>
              Start over
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
            {DIALS.filter((dl) => (adj ? dl.key === 'knife' : dl.key === 'pattern')).map((dl) => {
              const unlocked = step >= dl.unlock;
              const value = dl.key === 'pattern' ? pat : p;
              const role = dl.key === 'pattern' ? PATTERNS[pat].name : dl.role;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={dl.key}>
                  <span className="dk" style={{ color: dl.color }}>
                    {dl.name}
                  </span>
                  <span className="drole">{unlocked ? role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={dl.min}
                    max={dl.max}
                    step={1}
                    value={value}
                    disabled={!unlocked}
                    aria-label={`${dl.name} — ${role}`}
                    onChange={(e) => setDial(dl.key, e.target.value)}
                    style={{ accentColor: dl.color }}
                  />
                  <output className="dv" style={unlocked ? { color: dl.color } : undefined}>
                    {unlocked ? (dl.key === 'pattern' ? value + 1 : value) : '🔒'}
                  </output>
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

          {calib && target != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">Cut the field into</span>
                <span className="target-word">{target} equal parts</span>
                <span className="target-hint mono">
                  {stamped
                    ? `earned: each part is exactly 1/${target} of the whole`
                    : `slide the first cut; the rest split evenly behind it`}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {stamped ? 'perfectly fair' : p * target > FW ? 'first part too greedy' : p * target < FW ? 'first part starved' : ''}
                </span>
                {stamped ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">the pill lights only at the fair spot</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target);
                  setTarget(t);
                  setP(5);
                }}
              >
                New count
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
                  setPat(0);
                  setP(5);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">4 unequal parts ≠ fourths · the envelope: 4 shapes, one 1/4</span>{' '}
        &nbsp;·&nbsp; partition shapes into parts with equal areas and express each part as a
        unit fraction of the whole (CCSS 3.G.A.2). The name is earned by measurement — the bench
        computes every area, and the pill refuses until they match.
      </footer>

      <style jsx>{`
        .eqarealab {
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
            /* minmax(0,1fr), never a bare 1fr (the TeenNumbersLab lesson) */
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
          aspect-ratio: 4 / 3;
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
            min-height: 340px;
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
        .target-word {
          font-family: var(--serif);
          font-size: 27px;
          font-weight: 600;
          letter-spacing: 0.01em;
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
        .foot em {
          font-style: italic;
          color: var(--ink);
        }
        :global(.eqarealab) :focus-visible {
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
