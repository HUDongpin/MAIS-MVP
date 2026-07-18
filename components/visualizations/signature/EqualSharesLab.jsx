'use client';

/* ============================================================================
   EqualSharesLab — an interactive "bench" for EQUAL SHARES: halves, thirds,
   and fourths — the words, the fairness they promise, and the fact that a
   share is an AMOUNT, not a SHAPE.

        two pieces ≠ halves        more shares ⇒ smaller shares
        a fourth can be a square, a strip, or a triangle — same share

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 1–2 lab —
   CCSS 1.G.A.3 ("partition circles and rectangles into two and four equal
   shares… describe the shares using the words halves, fourths, quarters…
   understand that decomposing into more equal shares creates smaller
   shares") and 2.G.A.3 (thirds join in; and the deep clause almost every
   classroom skips: "recognize that equal shares of identical wholes need not
   have the same shape").  This is the idea BEFORE fractions: no notation, no
   numerator, no naming of parts by numbers — just cakes, cuts, and fairness.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "A FOURTH IS A SHARE, NOT A SHAPE."
     Three identical square cakes, side by side, each cut fairly into four:
     one into little squares, one into strips, one into triangles.  One share
     is shaded in each — a square, a strip, a triangle — and all three are
     the SAME share: one of four equal shares of identical wholes.  The word
     "fourth" names an amount of cake, not an outline.  Underneath it runs
     THE FAIR TEST: within one cut, every piece must be the same size — the
     off-centre trap ("one big half and one small half") is sprung early, and
     the gold overlay lays one piece on the other so the overhang shows the
     lie.  Two pieces is counting; halves is fairness.  And the 1.G.A.3
     surprise closes the loop: MORE shares means SMALLER shares — a half
     beats a fourth of the same cake, even though 4 beats 2.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • FractionLab (grades 3–4) owns p/q: the partitioned BAR, the PIE, the
       number line, numerator and denominator.  This lab is strictly BEFORE
       all of that: no fraction is ever written (the audit greps the copy for
       slashes and the whole notation vocabulary), the wholes are squares —
       never a pie, never a bar being re-cut — and shares are named only by
       the words the standard gives: halves, thirds, fourths, quarters.
     • AreaLab owns area as a COUNT of unit squares, and the cut-and-slide
       proof.  Nothing is counted here and the word for that measure never
       appears: fairness is shown by the OVERLAY (one piece laid on another),
       not by counting cells.
     • ComposingShapesLab owns JOINING shapes into new wholes and the seam
       law.  This lab only ever cuts one whole apart, and never names the
       outline of a composite.
     • DecimalLab / PercentageLab own the 10×10 hundred-grid.  No grid of a
       hundred anything appears.
     • ShapesLab owns naming a SHAPE by its sides.  Here the payoff is the
       opposite: the share's name does NOT depend on its shape.

   One-accent discipline: CARMINE is THE SHARE — the shaded piece and the
   share-word that names it.  The whole and its cut lines are quiet blue; the
   fair-test overlay is GOLD (the tool); an unfair cut's overhang is hatched
   gold.  GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a seven-year-old):
     • Every cut is a data table of polygons with INTEGER vertices on a 12×12
       grid, and every piece's area is an exact integer count of grid cells —
       including the diagonal cuts (the triangles' doubled shoelace areas are
       even, so nothing is ever approximate).  The audit recomputes every
       area by the shoelace formula and checks each cut tiles the whole
       exactly: areas sum to 144, every vertex in bounds.
     • "Fair" is DERIVED, never declared: a cut is fair iff its piece areas
       are all equal — an integer comparison the audit verifies against the
       shipped geometry, cut by cut.
     • The calibration stamp needs two facts at once: the chosen cut's piece
       COUNT matches the ordered word, AND the chosen cut is FAIR.  The
       decoys include same-count unfair cuts, so counting alone can never
       stamp.  Audited over every cut × every order.
   Verified by audit-equalshares.mjs (numeric proof + source greps) and
   verify-equalshares.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/EqualSharesLab.jsx
     2. Import and render it:
          import EqualSharesLab from './EqualSharesLab';
          export default function Page() { return <EqualSharesLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the chosen cut, the
              shaded piece, the lesson step, answers, the bakery order).
     MODEL  — pure integer geometry; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  No dials at all: a cut is chosen by tapping a CHIP
   (the direct-manipulation precedent of the shape labs), and the chips
   unlock with the steps.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the share: the shaded piece, the share-word
const BLUE = '#3f74a6'; // the whole and its cut lines
const GOLD = '#b98718'; // the fair-test overlay
const INK_HEX = '#1c2b3a';

const DIALS = []; // chips, not dials — see EDIT 4

const G = 12; // the whole is a 12×12 integer grid; all areas exact cells
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Cuts as integer-vertex polygons; every fact derived.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/* exact size in cells: shoelace gives 2A, always even on this table */
function sizeOf(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

/* the cut table.  kind names what the cut WOULD be if fair; fair is derived. */
const CUTS = [
  { id: 'halvesV', word: 'halves', label: 'two tall pieces', polys: [
    [[0, 0], [6, 0], [6, 12], [0, 12]], [[6, 0], [12, 0], [12, 12], [6, 12]] ] },
  { id: 'halvesDiag', word: 'halves', label: 'two corner-to-corner pieces', polys: [
    [[0, 0], [12, 0], [12, 12]], [[0, 0], [12, 12], [0, 12]] ] },
  { id: 'offcenter', word: 'halves', label: 'two pieces, cut off-centre', polys: [
    [[0, 0], [4, 0], [4, 12], [0, 12]], [[4, 0], [12, 0], [12, 12], [4, 12]] ] },
  { id: 'thirdsStrips', word: 'thirds', label: 'three strips', polys: [
    [[0, 0], [4, 0], [4, 12], [0, 12]], [[4, 0], [8, 0], [8, 12], [4, 12]], [[8, 0], [12, 0], [12, 12], [8, 12]] ] },
  { id: 'thirdsUneq', word: 'thirds', label: 'three pieces, one greedy', polys: [
    [[0, 0], [3, 0], [3, 12], [0, 12]], [[3, 0], [6, 0], [6, 12], [3, 12]], [[6, 0], [12, 0], [12, 12], [6, 12]] ] },
  { id: 'fourthsGrid', word: 'fourths', label: 'four little squares', polys: [
    [[0, 0], [6, 0], [6, 6], [0, 6]], [[6, 0], [12, 0], [12, 6], [6, 6]],
    [[0, 6], [6, 6], [6, 12], [0, 12]], [[6, 6], [12, 6], [12, 12], [6, 12]] ] },
  { id: 'fourthsStrips', word: 'fourths', label: 'four strips', polys: [
    [[0, 0], [3, 0], [3, 12], [0, 12]], [[3, 0], [6, 0], [6, 12], [3, 12]],
    [[6, 0], [9, 0], [9, 12], [6, 12]], [[9, 0], [12, 0], [12, 12], [9, 12]] ] },
  { id: 'fourthsDiag', word: 'fourths', label: 'four triangles', polys: [
    [[0, 0], [12, 0], [6, 6]], [[12, 0], [12, 12], [6, 6]],
    [[12, 12], [0, 12], [6, 6]], [[0, 12], [0, 0], [6, 6]] ] },
];

const cutById = (id) => CUTS.find((c) => c.id === id);
const piecesOf = (cut) => cut.polys.length;
const isFair = (cut) => {
  const areas = cut.polys.map(sizeOf);
  return areas.every((a) => a === areas[0]);
};
const WORD_COUNT = { halves: 2, thirds: 3, fourths: 4 };
const SHARE_WORD = { halves: 'a half', thirds: 'a third', fourths: 'a fourth' };

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The fair bakery."  An order arrives — cut this
   cake into HALVES / THIRDS / FOURTHS — and every cut in the shop is on the
   counter, the fair ones and the greedy ones mixed.  Pick the cut that fills
   the order.

   No false stamp, provably: the stamp needs the chosen cut's piece count to
   match the ordered word AND the chosen cut to be fair — and fairness is
   derived from the shipped geometry, so a greedy same-count decoy can never
   stamp.  Audited over every cut × every order.
   ------------------------------------------------------------------------- */
function makeOrder(prev) {
  const words = ['halves', 'thirds', 'fourths'];
  let w;
  do {
    w = words[Math.floor(Math.random() * words.length)];
  } while (w === prev);
  return w;
}
const calibChecks = (cutId, order) => {
  if (cutId == null) return [false, false];
  const cut = cutById(cutId);
  return [piecesOf(cut) === WORD_COUNT[order], isFair(cut)];
};
const closeness = (cutId, order) => Math.round((100 * calibChecks(cutId, order).filter(Boolean).length) / 2);
const isCalibrated = (cutId, order) => calibChecks(cutId, order).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; each step's chips are declared, the
   scene is pinned, the reveal lives in the feedback.  The distractors are
   the real beliefs: that two pieces are automatically halves, that a bigger
   count means a bigger share, that the strip "looks longer" so it must be
   more.  Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Halves — two equal shares',
    body: 'One cake, one straight cut, two EQUAL pieces. Tap a piece to take it as your share.',
    chips: ['halvesV', 'halvesDiag'],
    demo: { cut: 'halvesV', shade: 0 },
    q: 'A cake cut into two equal shares — each share is called…',
    choices: ['A half', 'A third', 'The bigger piece'],
    answer: 0,
    feedback:
      'A half. Two EQUAL shares — that word "equal" is doing all the work, as the next cake ' +
      'shows. And notice the corner-to-corner cut also makes halves: equal does not care what ' +
      'the pieces look like, only how much cake each one is.',
  },
  {
    title: 'The fair test',
    body: 'The gold overlay lays one piece on the other — and the big one pokes out.',
    chips: ['offcenter'],
    demo: { cut: 'offcenter', shade: 0 },
    lens: 'overlay',
    q: 'This cake is in two pieces. Are they halves?',
    choices: [
      'No — the pieces are not the same size',
      'Yes — two pieces always make halves',
      'Yes — one big half and one small half',
    ],
    answer: 0,
    feedback:
      'Not halves — there is no such thing as a big half. If anything pokes out, ' +
      'the cut lied.',
  },
  {
    title: 'Thirds and fourths',
    body: 'Three equal shares are THIRDS; four are FOURTHS — or QUARTERS.',
    chips: ['thirdsStrips', 'fourthsGrid'],
    demo: { cut: 'thirdsStrips', shade: 1 },
    q: 'A cake in four equal shares — each share is…',
    choices: ['A fourth — also called a quarter', 'A four', 'The smallest piece wins'],
    answer: 0,
    feedback:
      'A fourth, and "quarter" is its other name — the same word as a quarter of an hour. ' +
      'Halves, thirds, fourths: the words simply count how many equal shares the whole was cut ' +
      'into.',
  },
  {
    title: 'More shares, smaller shares',
    body: 'Same cake, two offers. Tap between halves and fourths.',
    chips: ['halvesV', 'fourthsStrips'],
    demo: { cut: 'halvesV', shade: 0 },
    q: 'You may keep a half or a fourth of the same cake. Which share is more cake?',
    choices: [
      'A half — fewer shares means bigger shares',
      'A fourth — four beats two',
      'They are the same amount',
    ],
    answer: 0,
    feedback:
      'A half. Four beats two as a NUMBER, but cutting the same cake into more shares makes ' +
      'every share smaller — the more friends you share with, the less each one gets. That ' +
      'upside-down feeling is real, and the feeling only grows as the sharing table gets longer.',
  },
  {
    title: 'A fourth is a share, not a shape',
    body: 'Three identical cakes, three fair cuts into four: little squares, strips, triangles. One share shaded in each.',
    chips: ['fourthsGrid', 'fourthsStrips', 'fourthsDiag'],
    demo: { cut: 'fourthsGrid', shade: 0 },
    lens: 'trio',
    q: 'The shaded square, strip, and triangle — which is the biggest share of cake?',
    choices: [
      'None — each is one of four equal shares of identical cakes',
      'The strip — it is the longest',
      'The little square — it looks fattest',
    ],
    answer: 0,
    feedback:
      'They are all the same amount of cake: each is ONE of FOUR equal shares of identical ' +
      'wholes. A fourth names an AMOUNT, not an outline. Long, square, or pointy — cut fairly ' +
      'into four, every share is a fourth. That is the deepest sentence in this whole lab.',
  },
  {
    title: 'The fair bakery',
    body:
      'An order comes in. Every cut in the shop is on the counter — fair ones and greedy ones ' +
      'mixed. Pick the cut that truly fills the order.',
    chips: CUTS.map((c) => c.id),
    calib: true,
  },
];

/* True when the user asks for reduced motion — every animation checks this. */
const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function EqualSharesLab() {
  const [cutId, setCutId] = useState('halvesV');
  const [shade, setShade] = useState(0);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [order, setOrder] = useState(null);
  const [picked, setPicked] = useState(null); // the capstone's chosen cut
  const [burst, setBurst] = useState(0); // confetti burst id (0 = none)

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const geomRef = useRef({ pieces: [] });
  const prevCalRef = useRef(false); // previous calibrated value, to fire the burst on the edge

  const current = STEPS[step];
  const calib = !!current.calib;

  const liveCutId = calib ? (picked != null ? picked : null) : cutId;
  const pct = calib && order != null ? closeness(picked, order) : 0;
  const calibrated = calib && order != null ? isCalibrated(picked, order) : false;
  const checks = calib && order != null ? calibChecks(picked, order) : [false, false];

  sceneRef.current = {
    cutId: liveCutId,
    shade,
    calib,
    lens: current.lens || null,
    trioIds: current.lens === 'trio' ? current.chips : null,
  };

  /* K-motion: confetti on the moment CALIBRATED becomes true. The stamp is
     driven by isCalibrated exactly as before — this effect only decorates the
     transition and never feeds back into it. */
  useEffect(() => {
    const was = prevCalRef.current;
    prevCalRef.current = calibrated;
    if (!calibrated || was || !calib) return;
    if (reduceMotion()) return;
    setBurst(Date.now());
    const t = setTimeout(() => setBurst(0), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibrated]);

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

    const bandH = 52;

    const drawCake = (cut, ox, oy, size, shadeIdx, collectGeom) => {
      const k = size / G;
      const px = (p) => [ox + p[0] * k, oy + p[1] * k];
      cut.polys.forEach((poly, i) => {
        ctx.beginPath();
        poly.forEach((p, j) => {
          const [x, y] = px(p);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        if (i === shadeIdx) {
          ctx.fillStyle = 'rgba(200,30,79,0.28)';
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.fill();
        }
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 2;
        ctx.stroke();
        if (collectGeom) geomRef.current.pieces.push({ poly: poly.map(px), idx: i });
      });
      if (shadeIdx != null && shadeIdx >= 0) {
        // the share label sits inside the shaded piece's centroid
        const poly = cut.polys[shadeIdx];
        let cx = 0;
        let cy = 0;
        poly.forEach((p) => {
          cx += p[0];
          cy += p[1];
        });
        const [lx, ly] = px([cx / poly.length, cy / poly.length]);
        ctx.fillStyle = CARMINE;
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('your share', lx, ly);
      }
    };

    geomRef.current = { pieces: [] };

    if (S.trioIds) {
      /* the centerpiece: three identical cakes, one share each */
      const size = Math.min((W - 90) / 3, H - bandH - 110);
      const y0 = bandH + (H - bandH - size) / 2 - 12;
      S.trioIds.forEach((id, i) => {
        const cut = cutById(id);
        const x0 = 24 + i * (size + 22);
        drawCake(cut, x0, y0, size, 0, false);
        ctx.fillStyle = INK_SOFT;
        ctx.font = 'italic 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(cut.label, x0 + size / 2, y0 + size + 20);
      });
      ctx.fillStyle = CARMINE;
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('three shapes — one share: a fourth of the cake', W / 2, bandH - 14);
    } else if (S.cutId != null) {
      const cut = cutById(S.cutId);
      const size = Math.min(W * 0.5, H - bandH - 120);
      const x0 = (W - size) / 2 - (S.lens === 'overlay' && !isFair(cut) ? size * 0.18 : 0);
      const y0 = bandH + (H - bandH - size) / 2 - 8;
      drawCake(cut, x0, y0, size, S.calib ? -1 : S.shade, true);

      /* the share-word band */
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isFair(cut)) {
        ctx.fillStyle = CARMINE;
        ctx.font = '600 16px system-ui, sans-serif';
        ctx.fillText(
          `${piecesOf(cut)} equal shares — each is ${SHARE_WORD[cut.word]}`,
          W / 2,
          bandH / 2
        );
      } else {
        ctx.fillStyle = INK_SOFT;
        ctx.font = 'italic 600 15px system-ui, sans-serif';
        ctx.fillText(`${piecesOf(cut)} pieces — but NOT ${cut.word}: the pieces are not equal`, W / 2, bandH / 2);
      }

      /* the fair test: overlay the smallest piece on the largest, hatch the
         overhang.  Static, honest, gold. */
      if ((S.lens === 'overlay' || S.calib) && !isFair(cut)) {
        const areas = cut.polys.map(sizeOf);
        const small = areas.indexOf(Math.min(...areas));
        const big = areas.indexOf(Math.max(...areas));
        const k = size / G;
        const bb = (poly) => {
          const xs = poly.map((p) => p[0]);
          const ys = poly.map((p) => p[1]);
          return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
        };
        const [sx, sy, sw, sh] = bb(cut.polys[small]);
        const [bxp, byp, bw, bh] = bb(cut.polys[big]);
        const ox2 = x0 + size + 34;
        const oy2 = y0 + (size - bh * k) / 2;
        // the big piece, ghosted
        ctx.fillStyle = 'rgba(91,107,123,0.10)';
        ctx.strokeStyle = INK_SOFT;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(ox2, oy2, bw * k, bh * k);
        ctx.fillRect(ox2, oy2, bw * k, bh * k);
        // the small piece laid on it, gold
        ctx.fillStyle = 'rgba(185,135,24,0.25)';
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.strokeRect(ox2, oy2, sw * k, sh * k);
        ctx.fillRect(ox2, oy2, sw * k, sh * k);
        // the overhang, hatched
        ctx.save();
        ctx.beginPath();
        ctx.rect(ox2 + sw * k, oy2, (bw - sw) * k, bh * k);
        ctx.clip();
        ctx.strokeStyle = 'rgba(185,135,24,0.8)';
        ctx.lineWidth = 1.4;
        for (let hx = -bh * k; hx < (bw - sw) * k + bh * k; hx += 8) {
          ctx.beginPath();
          ctx.moveTo(ox2 + sw * k + hx, oy2 + bh * k);
          ctx.lineTo(ox2 + sw * k + hx + bh * k, oy2);
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = GOLD;
        ctx.font = 'italic 600 12px system-ui, sans-serif';
        ctx.fillText('the fair test:', ox2 + (bw * k) / 2, oy2 - 26);
        ctx.fillText('lay one on the other — it pokes out', ox2 + (bw * k) / 2, oy2 - 11);
      }
    } else {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('the counter is full of cuts — pick one for the order', W / 2, H / 2);
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
    const d = STEPS[step].demo;
    if (d) {
      setCutId(d.cut);
      setShade(d.shade);
    }
  }, [step]);

  /* the bakery takes its first order */
  useEffect(() => {
    if (current.calib && order == null) {
      setOrder(makeOrder(null));
      setPicked(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const tapChip = (id) => {
    if (calib) {
      setPicked(id);
    } else {
      setCutId(id);
      setShade(0);
    }
  };
  const onPointerDown = (e) => {
    if (calib || current.lens === 'trio') return;
    const stage = stageRef.current;
    const rect = stage.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    // point-in-polygon over the drawn pieces: tap a piece to take it
    for (const piece of geomRef.current.pieces) {
      let inside = false;
      const poly = piece.poly;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) {
        setShade(piece.idx);
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
    if (calib) setPicked(null);
    else {
      const d = STEPS[step].demo;
      if (d) {
        setCutId(d.cut);
        setShade(d.shade);
      }
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const liveCut = liveCutId != null ? cutById(liveCutId) : null;
  const spoken = calib
    ? `The fair bakery: an order for ${order ?? '…'}. ${
        picked == null ? 'No cut picked yet.' : `Picked ${cutById(picked).label}.`
      } ${calibrated ? 'Calibrated.' : ''}`
    : liveCut
      ? `${liveCut.label}: ${piecesOf(liveCut)} pieces, ${isFair(liveCut) ? `fair — each is ${SHARE_WORD[liveCut.word]}` : 'not equal'}.`
      : '';

  return (
    <div className="sqlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Equal Shares: Halves, Thirds, Fourths</h1>
        <p className="lede">
          Cutting a cake into shares is a <em>promise of fairness</em> — two pieces are not halves
          unless they are <em>equal</em>. And a share is an <em>amount</em>, not a shape: a fourth
          can be <span className="mono">a square, a strip, or a triangle</span>.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken} onPointerDown={onPointerDown}>
            <canvas ref={canvasRef} />
            {burst > 0 && (
              <div className="confetti" aria-hidden="true">
                {Array.from({ length: 26 }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      left: `${(i * 137) % 100}%`,
                      background: ['#c81e4f', '#b98718', '#3f74a6', '#1f8a5b'][i % 4],
                      animationDelay: `${(i % 7) * 60}ms`,
                      '--drift': `${((i * 53) % 60) - 30}px`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="toolbar chips" role="group" aria-label="Cuts">
            {current.chips.map((id) => {
              const cut = cutById(id);
              const active = (calib ? picked : cutId) === id;
              return (
                <button
                  type="button"
                  key={id}
                  className={'chipbtn' + (active ? ' active' : '')}
                  onClick={() => tapChip(id)}
                >
                  {cut.label}
                </button>
              );
            })}
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

          {calib && order != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The order</span>
                <span className="target-word">cut it into {order}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} the right number of pieces
                  </li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} every piece equal — truly fair</li>
                </ol>
                <span className="target-hint mono">
                  {picked == null
                    ? 'pick a cut from the counter'
                    : calibrated
                      ? 'a fair order, fairly filled'
                      : checks[0]
                        ? 'right count — but look at the fair test'
                        : 'count the pieces the order asks for'}
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
                  <span className="mono target-hint">count · then fairness</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setOrder(makeOrder(order));
                  setPicked(null);
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
                  setOrder(null);
                  setPicked(null);
                  setCutId('halvesV');
                  setShade(0);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">equal shares — whatever their shape</span> &nbsp;·&nbsp; halves,
        thirds, fourths and quarters; more shares make smaller shares; equal shares of identical
        wholes need not match in shape (CCSS 1.G.A.3, 2.G.A.3). Fairness is the whole word.
      </footer>

      <style jsx>{`
        .sqlab {
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
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .chipbtn {
          font: 600 12.5px/1.2 system-ui, sans-serif;
          padding: 8px 11px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.active {
          border-color: var(--blue);
          background: rgba(63, 116, 166, 0.1);
          color: var(--blue);
        }
        .chipbtn:hover {
          border-color: var(--ink);
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
          font-size: 24px;
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
          transform-origin: 0 50%;
          animation: check-pop 0.45s cubic-bezier(0.2, 1.5, 0.4, 1);
        }
        @keyframes check-pop {
          from {
            transform: scale(1.35);
          }
          to {
            transform: scale(1);
          }
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
          animation: stamp-in 0.45s cubic-bezier(0.2, 1.5, 0.4, 1);
        }
        @keyframes stamp-in {
          from {
            transform: rotate(-3deg) scale(1.9);
            opacity: 0;
          }
          to {
            transform: rotate(-3deg) scale(1);
            opacity: 1;
          }
        }
        .confetti {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .confetti span {
          position: absolute;
          top: -12px;
          width: 9px;
          height: 13px;
          border-radius: 2px;
          opacity: 0;
          animation: confetti-fall 1.3s cubic-bezier(0.25, 0.4, 0.6, 1) forwards;
        }
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translate(var(--drift, 0px), 340px) rotate(560deg);
          }
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
        :global(.sqlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .chipbtn {
            transition: none;
          }
          .stamp,
          .confetti span,
          .tasks li.done {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
