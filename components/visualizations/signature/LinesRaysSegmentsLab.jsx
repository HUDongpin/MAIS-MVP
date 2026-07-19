'use client';

/* ============================================================================
   LinesRaysSegmentsLab — an interactive "bench" for the VOCABULARY OF
   STRAIGHTNESS: point, line, line segment, ray — and the relations parallel
   and perpendicular.  The whole grammar is carried by THE ENDS:

        two dots   = SEGMENT   (two ends — the only one with a length)
        dot+arrow  = RAY       (one end — it starts, and never stops)
        two arrows = LINE      (no ends — it never started either)
        same direction = PARALLEL (the gap never changes ⇒ they never meet)
        crossing that fits a square corner = PERPENDICULAR

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is a GRADE 4
   lab — CCSS 4.G.A.1 is the anchor: draw and identify points, lines, line
   segments, rays, angles (right, acute, obtuse — NAMED, never measured
   here), and perpendicular and parallel lines.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE ENDS TELL YOU EVERYTHING."
     One straight object lies on the paper, with a TOGGLE AT EACH END: dot,
     or arrowhead.  An arrowhead is a promise — "this keeps going, past the
     paper, past everything" — and the bench draws the promise by running
     the object clear off the stage edge.  Flip the toggles and the NAME
     PLATE follows, computed from the ends alone: two dots make a segment,
     one arrow makes a ray, two arrows make a line.  Nothing else about the
     object matters to its name — not its direction, not where it sits —
     and only the segment, the one with two ends, has a length at all.
     Then a second straight joins, and the relations arrive the same honest
     way: PARALLEL is drawn as THE CONSTANT GAP (measured nowhere, shown
     twice — the same gap here and further along, which is WHY they never
     meet, even past the paper); PERPENDICULAR is certified by the SQUARE
     CORNER that fits snugly into the crossing — no numbers, no measuring,
     just the carpenter's test.  Slanted crossings get their honest names —
     sharp (acute) and wide (obtuse) — by comparison with the square corner,
     never with an instrument.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • PointLab owns the COORDINATE PLANE: ordered pairs, the two guides,
       the address of a location.  This lab has no coordinates whatsoever —
       no grid numbers, no origin, no address.  Its objects live on plain
       paper, which is the point: the vocabulary precedes the plane.
     • LineFunctionLab owns y = mx + b and the slope triangle.  Nothing here
       has a slope or an equation; direction is set by a dial and never
       quantified.
     • AngleLab (and the additive-angle lab) own MEASURING turn in degrees
       and radians, arcs, and the protractor.  This lab never shows a degree
       number: right angles are certified by the square-corner fit, and
       acute/obtuse are NAMES assigned by comparison, exactly as 4.G.A.1
       lists them.  When a student asks "how big exactly?", that is the
       angle labs' story.
     • MeasurementLab owns rulers and unit-counting.  The segment's length
       is ASSERTED to exist (it is the only one of the three that has one)
       and never measured.
     • ShapesLab owns the name-as-function-of-attributes for CLOSED figures
       with its welded ticks.  This lab's objects are 1-dimensional, its
       attribute is the pair of ENDS, and no figure ever closes.
     • SymmetryLab owns folding; ParallelogramLab owns the half-turn.  No
       object here reflects or spins.

   One-accent discipline: CARMINE is the FIRST object — its body, its ends,
   its name plate.  BLUE is the second straight (the ComparingLab two-object
   convention).  GOLD marks the RELATION EVIDENCE: the constant-gap bracket,
   the square corner, and the capstone card.  GREEN is reserved for
   "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a nine-year-old):
     • The name is a pure function of the two end toggles — audited over all
       four combinations — and endsCount(name) inverts it.
     • Directions are INTEGER twelfths of a half-turn (internal index 0…11;
       no degree value exists anywhere in the code).  The relation is pure
       index arithmetic:  parallel ⟺ (i₁ − i₂) ≡ 0 (mod 12),  perpendicular
       ⟺ (i₁ − i₂) ≡ 6 (mod 12) — audited over all 144 pairs.
     • Two distinct-anchored straights meet in exactly one point unless
       parallel — the intersection function returns null precisely on
       parallel pairs, audited.
     • The calibration stamp is the exact predicate match satisfies(card,
       state) — never a look-alike.  The meter reads 100 only then (50 for
       the honest near-miss, 0 otherwise), audited over every card × every
       reachable state.
   Verified by audit-linesrayssegments.mjs (numeric proof + source greps)
   and verify-linesrayssegments.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/LinesRaysSegmentsLab.jsx
     2. Import and render it:
          import LinesRaysSegmentsLab from './LinesRaysSegmentsLab';
          export default function Page() { return <LinesRaysSegmentsLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the end toggles,
              two direction indices, the lesson step, answers, the card).
     MODEL  — pure functions of toggles and integer direction indices.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Two direction dials; the end toggles are buttons.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the first object: body, ends, name plate
const BLUE = '#3f74a6'; // the second straight
const GOLD = '#b98718'; // relation evidence: the gap bracket, the square corner

const DIALS = [
  { key: 'dir1', name: 'Direction', role: 'swing the first object', min: 0, max: 11, unlock: 0, color: CARMINE },
  { key: 'dir2', name: 'Direction 2', role: 'swing the second line', min: 0, max: 11, unlock: 3, color: BLUE },
];

const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Names from ends; relations from integer direction indices
   (twelve equal steps around the direction dial — no measured-turn value
   exists anywhere in this file).
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
const DIR_UNIT = Math.PI / 12; // one direction step, for drawing only

/* THE NAME IS A FUNCTION OF THE ENDS — nothing else */
const nameOf = (leftArrow, rightArrow) =>
  leftArrow && rightArrow ? 'line' : leftArrow || rightArrow ? 'ray' : 'segment';
const endsCount = (leftArrow, rightArrow) => (leftArrow ? 0 : 1) + (rightArrow ? 0 : 1);
const hasLength = (leftArrow, rightArrow) => nameOf(leftArrow, rightArrow) === 'segment';

/* relations, as pure index arithmetic mod 12 */
const dirDiff = (i1, i2) => (((i1 - i2) % 12) + 12) % 12;
const relationOf = (i1, i2) => {
  const k = dirDiff(i1, i2);
  return k === 0 ? 'parallel' : k === 6 ? 'perpendicular' : 'slant';
};
/* at a slanted crossing, a sharp pair and a wide pair appear; at a square
   crossing, all four corners are right — named, never measured */
const crossingNames = (i1, i2) => {
  const r = relationOf(i1, i2);
  if (r === 'parallel') return null;
  if (r === 'perpendicular') return { kind: 'right' };
  return { kind: 'slant' };
};
/* two straights through distinct anchors meet in one point unless parallel */
const intersectPoint = (A1, i1, A2, i2) => {
  if (relationOf(i1, i2) === 'parallel') return null;
  const d1 = [Math.cos(i1 * DIR_UNIT), Math.sin(i1 * DIR_UNIT)];
  const d2 = [Math.cos(i2 * DIR_UNIT), Math.sin(i2 * DIR_UNIT)];
  const det = d1[0] * -d2[1] - -d2[0] * d1[1];
  const bx = A2[0] - A1[0];
  const by = A2[1] - A1[1];
  const t = (bx * -d2[1] + d2[0] * by) / det;
  return [A1[0] + t * d1[0], A1[1] + t * d1[1]];
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Build what the card asks."  Five cards: the three
   objects (set the ends) and the two relations (swing the second line).

   No false stamp, provably: CALIBRATED ⟺ satisfies(card, state), an exact
   predicate — a ray with the wrong end count or a crossing one click off
   square never stamps.  The meter reads 100 only then (50 for the honest
   near-miss), audited over every card × every reachable state.
   ------------------------------------------------------------------------- */
const CARDS = ['segment', 'ray', 'line', 'parallel', 'perpendicular'];
const cardIsRelation = (card) => card === 'parallel' || card === 'perpendicular';
function makeTarget(prev) {
  let c;
  do {
    c = CARDS[Math.floor(Math.random() * CARDS.length)];
  } while (prev && c === prev);
  return c;
}
const satisfies = (card, la, ra, i1, i2) =>
  cardIsRelation(card) ? relationOf(i1, i2) === card : nameOf(la, ra) === card;
const closeness = (card, la, ra, i1, i2) => {
  if (satisfies(card, la, ra, i1, i2)) return 100;
  if (cardIsRelation(card)) {
    const k = dirDiff(i1, i2);
    const want = card === 'parallel' ? 0 : 6;
    const off = Math.min(Math.abs(k - want), 12 - Math.abs(k - want));
    return off === 1 ? 50 : 0;
  }
  const wantArrows = card === 'line' ? 2 : card === 'ray' ? 1 : 0;
  const arrows = (la ? 1 : 0) + (ra ? 1 : 0);
  return Math.abs(arrows - wantArrows) === 1 ? 50 : 0;
};
const isCalibrated = satisfies;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; every scene a step's words depend on
   is pinned by STEPS[].demo; the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Dot, or arrow',
    body:
      'One straight object, and a toggle at each end. A DOT means "stops here." An ARROW ' +
      'means "keeps going — past the paper, past everything." Flip the ends and watch.',
    demo: { la: false, ra: false, d1: 2, d2: 8 },
    buttons: ['left', 'right'],
    q: 'An arrowhead drawn at the end of a straight path means…',
    choices: [
      'It keeps going forever — the paper just ran out first',
      'It stops exactly at the arrow tip',
      'It is pointing at something important',
    ],
    answer: 0,
    feedback:
      'Forever. The arrow is geometry’s way of drawing what cannot fit: the object runs off ' +
      'the paper’s edge, and the edge means nothing — the paper ended, the object did not. ' +
      'Every name in this lab comes from counting the ends that actually stop.',
  },
  {
    title: 'The three names',
    body:
      'Two dots: a SEGMENT. Two arrows: a LINE. One of each: a RAY — it starts at its dot ' +
      'and never stops, like a beam from a flashlight. Build all three.',
    demo: { la: false, ra: true, d1: 2, d2: 8 },
    buttons: ['left', 'right'],
    q: 'Dot on one end, arrow on the other. The object is a…',
    choices: ['Ray', 'Line', 'Segment'],
    answer: 0,
    feedback:
      'A ray: ONE end. It begins — at the dot — and never finishes. A line has no ends at ' +
      'all (it never began either), and a segment has both. Count the stops: two, one, zero — ' +
      'segment, ray, line. That count is the entire naming rule.',
  },
  {
    title: 'Only one of them has a length',
    body:
      'Here is the strangest and most useful fact in the vocabulary: a LINE is not "long" — ' +
      'it has NO length at all, because length needs two ends to run between.',
    demo: { la: true, ra: true, d1: 2, d2: 8 },
    buttons: ['left', 'right'],
    q: 'Which of the three objects HAS a length?',
    choices: [
      'Only the segment — length runs between two ends, and it alone has two',
      'The line — it is the longest of the three',
      'All three, if you could walk far enough to check',
    ],
    answer: 0,
    feedback:
      '"How long is a line?" has no answer — not "very long", NO answer, because there are ' +
      'no ends to run between. The same goes for a ray. Only the segment can be measured, ' +
      'which is why real-world things (fences, roads-between-towns, sides of shapes) are ' +
      'segments, while lines and rays live in geometry.',
  },
  {
    title: 'Parallel: the constant gap',
    body:
      'A second line joins the paper. Swing it to match the first direction exactly: the gold ' +
      'brackets show the gap between them — here, and further along. It never changes.',
    demo: { la: true, ra: true, d1: 2, d2: 2 },
    q: 'Parallel lines never meet — even past the paper. What makes the promise safe?',
    choices: [
      'Same direction, so the gap between them never changes',
      'They are drawn far apart',
      'The paper ends before they could meet',
    ],
    answer: 0,
    feedback:
      'The gap. Same direction means the distance between them is the same here, there, and ' +
      'a mile off the paper — and a gap that never shrinks can never reach zero. "They don’t ' +
      'meet ON MY PAPER" is the trap: lines that are NOT parallel always meet somewhere, even ' +
      'if the crossing lies past the edge. Swing the second line one click and look.',
  },
  {
    title: 'Perpendicular: the square corner',
    body:
      'Swing the second line until the gold SQUARE CORNER fits snugly into the crossing. ' +
      'That fit — not a number — is what perpendicular means.',
    demo: { la: true, ra: true, d1: 1, d2: 7 },
    q: 'How do you CHECK that two lines are perpendicular, with no measuring at all?',
    choices: [
      'A square corner (a folded paper corner works) fits exactly into the crossing',
      'They look straight and tidy',
      'The crossing sits in the middle of the paper',
    ],
    answer: 0,
    feedback:
      'The square-corner test — carpenters have used it for five thousand years. The corner ' +
      'of any sheet of paper is exactly square; if it nests into the crossing with no gap and ' +
      'no overlap, the lines are perpendicular. All four corners of such a crossing are RIGHT ' +
      'angles — the square corner fits into every one of them.',
  },
  {
    title: 'Sharp and wide',
    body:
      'Swing the second line off square. The crossing now makes two SHARP corners and two ' +
      'WIDE ones, in matching pairs. Their proper names: acute and obtuse.',
    demo: { la: true, ra: true, d1: 1, d2: 4 },
    q: 'Two lines cross, and the square corner does NOT fit. The four angles are…',
    choices: [
      'Two sharp (acute) and two wide (obtuse), in matching opposite pairs',
      'All four still right angles',
      'Impossible to name without a protractor',
    ],
    answer: 0,
    feedback:
      'Sharp pair, wide pair — and naming them needs no instrument at all: sharper than the ' +
      'square corner is ACUTE, wider is OBTUSE. That comparison is the whole Grade-4 job. ' +
      'HOW MUCH sharper — the number of the turn — is a different lab’s story (the angle ' +
      'labs measure; this one only names).',
  },
  {
    title: 'Build what the card asks',
    body:
      'A card is posted. Objects are built with the end toggles; relations are built by ' +
      'swinging the second line. The bench only stamps the exact thing asked.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function LinesRaysSegmentsLab() {
  const [la, setLa] = useState(false);
  const [ra, setRa] = useState(false);
  const [d1, setD1] = useState(2);
  const [d2, setD2] = useState(8);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const buttons = current.buttons || [];
  const relationScene = !calib && step >= 3;
  const calibRelation = calib && target != null && cardIsRelation(target);
  const twoLines = relationScene || calibRelation;
  const objectMode = !twoLines;
  /* relations are line-talk: in two-line scenes both objects are lines */
  const laEff = twoLines ? true : la;
  const raEff = twoLines ? true : ra;

  const stamped = calib && target != null ? isCalibrated(target, laEff, raEff, d1, d2) : false;
  const pct = calib && target != null ? closeness(target, laEff, raEff, d1, d2) : 0;

  sceneRef.current = { la: laEff, ra: raEff, d1, d2, twoLines, calib, stamped, target: calib ? target : null };

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

    const A1 = [W * 0.5, H * 0.42];
    const A2 = [W * 0.5 + 40, H * 0.42 + 92];
    const dir = (i) => [Math.cos(i * DIR_UNIT), -Math.sin(i * DIR_UNIT)];

    const arrowHead = (x, y, dx, dy, color) => {
      const s = 11;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - dx * s - dy * s * 0.55, y - dy * s + dx * s * 0.55);
      ctx.lineTo(x - dx * s + dy * s * 0.55, y - dy * s - dx * s * 0.55);
      ctx.closePath();
      ctx.fill();
    };
    const endDot = (x, y, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      ctx.fill();
    };
    /* how far to run from the anchor to leave the stage, along ±dir */
    const runToEdge = (A, dx, dy) => {
      let t = 1e9;
      if (dx > 1e-9) t = Math.min(t, (W + 20 - A[0]) / dx);
      if (dx < -1e-9) t = Math.min(t, (-20 - A[0]) / dx);
      if (dy > 1e-9) t = Math.min(t, (H + 20 - A[1]) / dy);
      if (dy < -1e-9) t = Math.min(t, (-20 - A[1]) / dy);
      return t === 1e9 ? Math.max(W, H) : t;
    };
    const drawStraight = (A, i, leftArrow, rightArrow, color) => {
      const [dx, dy] = dir(i);
      const SEG = Math.min(W, H) * 0.3;
      const tR = rightArrow ? runToEdge(A, dx, dy) - 6 : SEG;
      const tL = leftArrow ? runToEdge(A, -dx, -dy) - 6 : SEG;
      const xR = A[0] + dx * tR;
      const yR = A[1] + dy * tR;
      const xL = A[0] - dx * tL;
      const yL = A[1] - dy * tL;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(xL, yL);
      ctx.lineTo(xR, yR);
      ctx.stroke();
      if (rightArrow) arrowHead(xR + dx * 6, yR + dy * 6, dx, dy, color);
      else endDot(xR, yR, color);
      if (leftArrow) arrowHead(xL - dx * 6, yL - dy * 6, -dx, -dy, color);
      else endDot(xL, yL, color);
    };

    /* the first object */
    drawStraight(A1, S.d1, S.la, S.ra, CARMINE);

    if (S.twoLines) {
      /* the second straight — always a line in relation scenes */
      drawStraight(A2, S.d2, true, true, BLUE);
      const rel = relationOf(S.d1, S.d2);
      if (rel === 'parallel') {
        /* THE CONSTANT GAP: the same bracket, twice along the pair */
        const [dx, dy] = dir(S.d1);
        const nx = -dy;
        const ny = dx;
        /* signed gap from line 1 to A2 along the normal */
        const gap = (A2[0] - A1[0]) * nx + (A2[1] - A1[1]) * ny;
        for (const t of [-Math.min(W, H) * 0.22, Math.min(W, H) * 0.24]) {
          const bx = A1[0] + dx * t;
          const by = A1[1] + dy * t;
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + nx * gap, by + ny * gap);
          ctx.stroke();
          for (const [px2, py2] of [[bx, by], [bx + nx * gap, by + ny * gap]]) {
            ctx.beginPath();
            ctx.arc(px2, py2, 2.4, 0, Math.PI * 2);
            ctx.fillStyle = GOLD;
            ctx.fill();
          }
        }
        ctx.fillStyle = GOLD;
        ctx.font = '600 12.5px system-ui, sans-serif';
        ctx.fillText('the same gap, here and there — they can never meet', W / 2, H - 64);
      } else {
        const P = intersectPoint(A1, S.d1, A2, S.d2);
        if (P) {
          if (rel === 'perpendicular') {
            /* the square corner, nested into the crossing */
            const [dx, dy] = dir(S.d1);
            const s = 16;
            ctx.strokeStyle = GOLD;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(P[0] + dx * s, P[1] + dy * s);
            ctx.lineTo(P[0] + dx * s - dy * s, P[1] + dy * s + dx * s);
            ctx.lineTo(P[0] - dy * s, P[1] + dx * s);
            ctx.stroke();
            ctx.fillStyle = GOLD;
            ctx.font = '600 12.5px system-ui, sans-serif';
            ctx.fillText('the square corner fits — perpendicular', W / 2, H - 64);
          } else {
            ctx.fillStyle = INK_SOFT;
            ctx.font = '600 12.5px system-ui, sans-serif';
            ctx.fillText('they cross at a slant — a sharp pair and a wide pair', W / 2, H - 64);
          }
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.arc(P[0], P[1], 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    /* the NAME PLATE — computed from the ends alone */
    const nm = S.twoLines ? relationOf(S.d1, S.d2) : nameOf(S.la, S.ra);
    const plate = S.twoLines
      ? nm === 'slant'
        ? 'crossing lines'
        : nm.toUpperCase()
      : nm.toUpperCase();
    ctx.fillStyle = CARMINE;
    ctx.font = `600 ${Math.min(26, W / 24)}px 'Iowan Old Style', Palatino, Georgia, serif`;
    ctx.fillText(plate, W / 2, 36);
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 600 13px system-ui, sans-serif';
    ctx.fillText(
      S.twoLines
        ? nm === 'parallel'
          ? 'same direction — the gap is forever'
          : nm === 'perpendicular'
            ? 'a crossing all of whose corners are right'
            : 'not parallel, not square — just a crossing'
        : `ends that stop: ${endsCount(S.la, S.ra)}` +
            (hasLength(S.la, S.ra) ? ' — this one has a length' : ' — no length to speak of'),
      W / 2,
      62
    );
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
      setLa(dm.la);
      setRa(dm.ra);
      setD1(dm.d1);
      setD2(dm.d2);
    }
    if (STEPS[step].calib) {
      setTarget(makeTarget(null));
      setLa(false);
      setRa(false);
      setD1(2);
      setD2(8);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const toggleLeft = () => setLa((v) => !v);
  const toggleRight = () => setRa((v) => !v);
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    const dm = current.demo;
    if (dm) {
      setLa(dm.la);
      setRa(dm.ra);
      setD1(dm.d1);
      setD2(dm.d2);
    } else if (calib) {
      setLa(false);
      setRa(false);
      setD1(2);
      setD2(8);
    }
  };

  const setDial = (key, raw) => {
    if (key === 'dir1') setD1(clampInt(raw, 0, 11));
    else setD2(clampInt(raw, 0, 11));
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const showToggles = buttons.includes('left') || (calib && target != null && !cardIsRelation(target));

  const spoken = twoLines
    ? `Two lines, relation: ${relationOf(d1, d2)}.`
    : `The object is a ${nameOf(laEff, raEff)} with ${endsCount(laEff, raEff)} stopping end${endsCount(laEff, raEff) === 1 ? '' : 's'}.` +
      (calib && target ? ` The card asks for a ${target}.` : '');

  return (
    <div className="lrslab">
      <header className="head">
        <h1>Lines, Rays &amp; Segments</h1>
        <p className="lede">
          The whole vocabulary is carried by the <em>ends</em>: two dots make a segment, one
          arrow makes a ray, two arrows make a line — and parallel is a gap that never changes.
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
            {stamped ? ' Calibrated — the build matches the card exactly.' : ''}
          </p>

          <div className="toolbar">
            {showToggles && (
              <button type="button" className="btn count" onClick={toggleLeft}>
                left end: {la ? '→ arrow' : '● dot'}
              </button>
            )}
            {showToggles && (
              <button type="button" className="btn count" onClick={toggleRight}>
                right end: {ra ? '→ arrow' : '● dot'}
              </button>
            )}
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
            {DIALS.filter((dl) => (calib && target != null && !cardIsRelation(target) ? dl.key === 'dir1' : true)).map(
              (dl) => {
                const unlocked = step >= dl.unlock;
                const value = dl.key === 'dir1' ? d1 : d2;
                return (
                  <label className={'dial' + (unlocked ? '' : ' locked')} key={dl.key}>
                    <span className="dk" style={{ color: dl.color }}>
                      {dl.name}
                    </span>
                    <span className="drole">{unlocked ? dl.role : 'unlocks soon'}</span>
                    <input
                      type="range"
                      min={dl.min}
                      max={dl.max}
                      step={1}
                      value={value}
                      disabled={!unlocked}
                      aria-label={`${dl.name} — ${dl.role}`}
                      onChange={(e) => setDial(dl.key, e.target.value)}
                      style={{ accentColor: dl.color }}
                    />
                    <output className="dv" style={unlocked ? { color: dl.color } : undefined}>
                      {unlocked ? value + 1 : '🔒'}
                    </output>
                  </label>
                );
              }
            )}
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
                <span className="target-k">Build</span>
                <span className="target-word">
                  {cardIsRelation(target) ? `${target} lines` : `a ${target}`}
                </span>
                <span className="target-hint mono">
                  {stamped
                    ? 'built exactly as asked'
                    : cardIsRelation(target)
                      ? 'swing the second line'
                      : 'set the two ends'}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {stamped
                    ? 'the card is satisfied'
                    : pct === 50
                      ? 'close — one change away'
                      : 'not yet'}
                </span>
                {stamped ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    now showing: {cardIsRelation(target) ? relationOf(d1, d2) : nameOf(la, ra)}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setLa(false);
                  setRa(false);
                  setD1(2);
                  setD2(8);
                }}
              >
                New card
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
                  setLa(false);
                  setRa(false);
                  setD1(2);
                  setD2(8);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">2 dots = segment · 1 = ray · 0 = line · same direction = parallel</span>{' '}
        &nbsp;·&nbsp; the vocabulary of straightness (CCSS 4.G.A.1): names from the ends, right
        angles from the square-corner fit, sharp and wide by comparison. The address of a point,
        the size of a turn, and the count of a length each have labs of their own.
      </footer>

      <style jsx>{`
        .lrslab {
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
        .btn.count {
          background: var(--carmine);
          border-color: var(--carmine);
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
          font-size: 26px;
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
        :global(.lrslab) :focus-visible {
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
