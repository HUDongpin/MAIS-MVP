'use client';

/* ============================================================================
   AssociativeMultiplicationLab — an interactive "bench" for the ASSOCIATIVE LAW
   OF MULTIPLICATION, (a × b) × c = a × (b × c), told as the story of ONE board
   of marbles that can be BUNDLED two different ways.

   Built for MAIS (math AI system, www.mais.ac), K-12. Grades 3-5 territory —
   CCSS 3.OA.B.5 ("Apply properties of operations as strategies to multiply and
   divide … 3 × 5 × 2 can be found by 3 × 5 = 15, then 15 × 2 = 30, or by
   5 × 2 = 10, then 3 × 10 = 30. (Associative property of multiplication.)").

   House style: the interactive-math-bench standard — a quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with a
   live match meter and a CALIBRATED stamp.

   THE SIGNATURE CENTERPIECE — "the marbles never move, only the brackets move."
     The board holds a TRAYS; each tray holds b BAGS; each bag holds c MARBLES.
     Every marble on screen is pinned by three numbers, so the total is a·b·c.
     Multiplication is BINARY — it eats exactly two numbers — so a × b × c is not
     yet an instruction: you must choose a pair to do first. There are exactly
     two ways to bracket three factors in a fixed order, and the board shows both
     WITHOUT MOVING A SINGLE MARBLE:
       (a × b) × c  — outline every BAG. a×b of them; each holds c.
       a × (b × c)  — outline every TRAY. a of them; each holds b×c.
     Toggling the brackets re-outlines the board and changes nothing else. That
     is the whole proof, and it is why the two routes must agree.

   Because the object being taught is THE BRACKET, the one accent colour
   (carmine) is spent on the brackets — on canvas AND in the equation readout —
   while the marbles/bags/trays stay neutral blue. Gold marks only the payoff:
   a pair that lands on a friendly ten.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files):
     • VolumeLab owns the a×b×c BOX OF UNIT CUBES, and already teaches
       V = (l·w)·h = base-area × height — which IS one of these two routes. So
       this lab draws no box, no cubes and no 3-D at all: it is a flat board of
       discrete containers, and its subject is the OTHER route existing and
       agreeing, not the count itself.
     • MultiplicationLab owns the unit-square ARRAY, the COMMUTATIVE flip
       (a×b = b×a — where the picture genuinely MOVES: it transposes) and the
       DISTRIBUTIVE break-apart a×(b₁+b₂). This lab is the deliberate contrast:
       nothing moves, the factors keep their order, and only the bracketing
       changes. Step 6 names all three laws precisely so they never blur.
     • MultiDigitMultiplicationLab owns place-value partial products.
     • TwoDigitNumberLab owns BUNDLING, but base-ten bundling — loose ones into
       tens, one fixed bundle size of 10, one level deep. This lab's bundles are
       a free 3-level hierarchy and the question is which PAIR merges first.

   DROP-IN USAGE (Next.js, app or pages router):
     1. Save anywhere, e.g. app/labs/AssociativeMultiplicationLab.jsx
     2. import AssociativeMultiplicationLab from './AssociativeMultiplicationLab';
        export default function Page() { return <AssociativeMultiplicationLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the three factors, the
              bracketing, the lesson step, answers, the challenge target).
     MODEL  — every quantity is an INTEGER product; the maths knows nothing about
              pixels and stays EXACT (no float ever decides a stated fact).
     RENDER — the canvas is fully redrawn from a state snapshot on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---- palette (kept in sync with the styled-jsx tokens below) ------------- */
const CURVE = '#c81e4f'; // THE accent — the BRACKET (the thing being taught)
const BLUE = '#2f6f9f'; // the neutral stuff: marbles, bags, trays
const GOLD = '#c8891e'; // the payoff only — a pair that makes a ten
const GOLD_DK = '#8f6410';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';
const TIMES = '×';

/* Dial ranges. a = rows of trays (vertical room), b = bags across a tray
   (horizontal room), c = marbles in a bag (must stay subitizable, so ≤ 6).
   Every reachable board is ≤ 5·6·6 = 180 marbles — drawable and countable. */
const A_MAX = 5;
const B_MAX = 6;
const C_MAX = 6;

const START = { a: 3, b: 4, c: 5 }; // 3 × 4 × 5 = 60, the canonical example

/* ===========================================================================
   MODEL — pure integer math, no pixels, no floats.
   =========================================================================== */

/* The pair that the CURRENT bracketing multiplies FIRST.
     'left'  → (a × b) × c  ... the bag count
     'right' → a × (b × c)  ... the marbles in one tray  */
function routePair(route, a, b, c) {
  return route === 'right' ? b * c : a * b;
}

/* "1 marble", not "1 marbles" — a board of one is a real, reachable state */
function marbles(n) {
  return `${n} marble${n === 1 ? '' : 's'}`;
}

/* Which route is genuinely EASIER by mental arithmetic?
   The only claim made — and the only one that is defensible without hand-waving
   — is "this pair lands on a multiple of ten". If both routes make a ten, or
   neither does, the lab says so instead of inventing a winner. */
function easierRoute(a, b, c) {
  const lTen = (a * b) % 10 === 0;
  const rTen = (b * c) % 10 === 0;
  if (lTen && !rTen) return 'left';
  if (rTen && !lTen) return 'right';
  return null;
}

/* ---- calibration targets. Each is a·b·c for SEVERAL (a,b,c) in range that ALSO
   have a bracketing whose first pair is a multiple of ten, so the two-part
   challenge is always winnable and never a unique-answer guessing game. (180 was
   dropped: 5×6×6 is its only triple once a ≤ 5.) Proven by audit-associative. */
const TARGETS = [30, 40, 60, 80, 90, 100, 120, 150];

function pickTarget(prev) {
  let t = prev;
  while (t === prev) t = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  return t;
}

/* ===========================================================================
   LAYOUT — centred auto-fit. Deliberately does NOT depend on `route`: the whole
   thesis is that changing the bracketing moves nothing, so the gutter that the
   per-tray badges live in is reserved at ALL times, whether or not it is used.
   =========================================================================== */
const PAD_X = 22;
const PAD_TOP = 30;
const PAD_BOT = 38;
const GUTTER = 58; // always reserved, so toggling brackets never shifts a marble
const BADGE_GAP = 9; // board → per-tray badge
const BADGE_MAX = 40; // hard cap; GUTTER/2 + PAD_X must exceed BADGE_GAP + this
const TRAY_GAP = 12;
const TRAY_PAD = 9;
const BAG_GAP = 7;

function computeLayout(W, H, a, b) {
  const availW = Math.max(60, W - PAD_X * 2 - GUTTER);
  const availH = Math.max(60, H - PAD_TOP - PAD_BOT);

  const bagHRaw = Math.min((availH - (a - 1) * TRAY_GAP) / a - 2 * TRAY_PAD, 88);
  const bagWRaw = Math.min((availW - 2 * TRAY_PAD - (b - 1) * BAG_GAP) / b, 106);

  /* bags read best near-square (a bag, not a letterbox); allow a little extra
     width when the board is short and wide */
  const side = Math.max(8, Math.min(bagWRaw, bagHRaw));
  const bagH = side;
  const bagW = Math.max(8, Math.min(bagWRaw, side * 1.25));

  const trayH = bagH + 2 * TRAY_PAD;
  const trayW = b * bagW + (b - 1) * BAG_GAP + 2 * TRAY_PAD;
  const boardH = a * trayH + (a - 1) * TRAY_GAP;

  /* The board is sized against availW (which already gives up GUTTER) but is
     CENTRED on the full stage: shifting it back by GUTTER/2 leaves ≥ GUTTER/2 +
     PAD_X of free lane on the right for the per-tray badges, while the board
     itself sits honestly in the middle. Reserving the lane only on the right
     would centre the board in the left-hand part of the stage and read as a
     centring bug on the steps where no badge is drawn. */
  const x0 = PAD_X + (availW - trayW) / 2 + GUTTER / 2;
  const y0 = PAD_TOP + Math.max(0, (availH - boardH) / 2);
  return { x0, y0, trayW, trayH, bagW, bagH, boardH };
}

/* Where the c marbles sit inside a bag, in bag-normalised coords. 1-3 stack in a
   single column and 4-6 pair up, so a count is read at a glance (subitizing)
   without ever looking like a die face. */
const PIP_POS = {
  1: [[0.5, 0.5]],
  2: [[0.5, 0.22], [0.5, 0.78]],
  3: [[0.5, 0.22], [0.5, 0.5], [0.5, 0.78]],
  4: [[0.26, 0.22], [0.74, 0.22], [0.26, 0.78], [0.74, 0.78]],
  5: [[0.26, 0.22], [0.74, 0.22], [0.5, 0.5], [0.26, 0.78], [0.74, 0.78]],
  6: [[0.26, 0.22], [0.74, 0.22], [0.26, 0.5], [0.74, 0.5], [0.26, 0.78], [0.74, 0.78]],
};

/* ===========================================================================
   LESSON — one capability unlocks per step; the last step is the challenge.
   `body` may be a function of the live board so it can never go stale when a
   learner presses Back with different dials; every QUESTION is a self-contained
   word problem with its own numbers, so it never leans on the live dials.
   =========================================================================== */
const STEPS = [
  {
    title: 'Two at a time',
    body: (v) =>
      `${v.a} trays × ${v.b} bags × ${v.c} marbles. But × works on TWO numbers ` +
      `at a time — you must pick a pair.`,
    q: 'Why can’t you multiply 3 × 4 × 5 all at once?',
    choices: [
      '× takes exactly two numbers',
      'It is not a real expression',
      'Left to right is the only legal route',
    ],
    answer: 0,
    feedback: 'Two rounds — and YOU choose the first pair. Left-to-right is only a convention.',
  },
  {
    title: 'a — the trays',
    body: 'Slide a: whole trays appear. The inside of a tray never changes.',
    q: 'Each tray holds 20 marbles. What does raising a do to the total?',
    choices: ['Multiplies it — the total is a × 20', 'Adds a', 'Nothing'],
    answer: 0,
    feedback: 'Each new tray brings a full 20 with it, so a trays hold a × 20.',
  },
  {
    title: 'b — the bags in each tray',
    body: 'Every tray gets the same b bags. Slide b: all trays fill together.',
    q: 'a = 3 trays, b = 4 bags in each. How many bags?',
    choices: ['12 — that is 3 × 4', '7 — that is 3 + 4', '3'],
    answer: 0,
    feedback: '3 × 4 = 12 bags — a complete multiplication hiding inside 3 × 4 × 5.',
  },
  {
    title: 'c — the marbles in each bag',
    body: (v) =>
      `Each bag holds ${v.c} marbles, so the total is ` +
      `${v.a} × ${v.b} × ${v.c} = ${v.a * v.b * v.c}.`,
    q: 'b = 4 bags, each with c = 5 marbles. How many in ONE tray?',
    choices: ['20 — that is 4 × 5', '9 — that is 4 + 5', '5'],
    answer: 0,
    feedback: '4 × 5 = 20 — the OTHER pair inside 3 × 4 × 5. Which goes first?',
  },
  {
    title: 'Route L — count the bags first',
    body: (v) =>
      `(${v.a} × ${v.b}) × ${v.c}: every BAG is outlined — ${v.a * v.b} bags, ` +
      `each with ${v.c} marbles, gives ${v.a * v.b * v.c}.`,
    q: 'In (a × b) × c, what does a × b count?',
    choices: ['The bags', 'One bag’s marbles', 'The leftover trays'],
    answer: 0,
    feedback: '“Deal with bags before looking inside one.” Then each bag adds its c marbles.',
  },
  {
    title: 'Route R — fill one tray first',
    body: (v) =>
      `${v.a} × (${v.b} × ${v.c}): now each TRAY wears a badge — ${v.b * v.c} ` +
      `marbles per tray. Same board, different first move.`,
    q: 'In a × (b × c), what does b × c count?',
    choices: ['ONE tray’s marbles', 'All the bags', 'The whole total'],
    answer: 0,
    feedback: '“Finish one tray before counting trays.” A genuinely different order of work.',
  },
  {
    title: 'The associative law',
    body:
      'Press “Move the brackets” and watch the marbles. They do not move. ' +
      'Not one: (a × b) × c = a × (b × c).',
    q: 'Which describes the ASSOCIATIVE law?',
    choices: [
      'Order stays; only the brackets move',
      'The factors swap places',
      'A factor splits into a sum',
    ],
    answer: 0,
    feedback:
      'Swapping factors is the COMMUTATIVE law; splitting one is DISTRIBUTIVE. ' +
      'This lab owns the brackets.',
  },
  {
    title: 'Use it: take the easy route',
    body:
      'Both routes agree — so take the easier one! Hunt for a pair that makes ' +
      'a friendly ten. The gold tag marks it.',
    q: 'What is the smartest FIRST move for 7 × 5 × 2?',
    choices: [
      'Bracket 5 × 2 = 10, then 7 × 10 = 70',
      'Left to right: 7 × 5 = 35 first',
      'Add them: 7 + 5 + 2',
    ],
    answer: 0,
    feedback:
      '7 × (5 × 2) = 7 × 10 = 70, in your head. The law is the permission ' +
      'to bracket the friendly pair.',
  },
  {
    title: 'Challenge — hit the target the easy way',
    body:
      'Make the board hold exactly the target — AND bracket a first pair ' +
      'that makes a multiple of ten.',
    calib: true,
  },
];

const bodyOf = (s, v) => (typeof s.body === 'function' ? s.body(v) : s.body);

/* ===========================================================================
   COMPONENT
   =========================================================================== */
export default function AssociativeMultiplicationLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [c, setC] = useState(START.c);
  const [route, setRoute] = useState('none'); // 'none' | 'left' | 'right'
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const current = STEPS[step];
  const calib = !!current.calib;

  /* ---- refs -------------------------------------------------------------- */
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const seededRef = useRef(false);

  /* ---- derived, exact integer math --------------------------------------- */
  const P = a * b * c; // the total — identical along both routes, which is the theorem
  const bagCount = a * b; // (a × b)
  const perTray = b * c; // (b × c)
  const pair = routePair(route, a, b, c);
  const tenPair = pair % 10 === 0;
  const easier = easierRoute(a, b, c);

  /* dials unlock one per step. The bracket toggle waits for step 5 — the Route R
     step — because until both bracketings have been introduced there is nothing
     to toggle between, and offering the second one early would put the picture
     ahead of the idea. */
  const aOn = step >= 1;
  const bOn = step >= 2;
  const cOn = step >= 3;
  const routeOn = step >= 5;

  /* ---- calibration ------------------------------------------------------- */
  const hitTotal = target != null && P === target;
  /* CALIBRATED is gated on two EXACT integer conditions, never on the meter, so
     no rounding can ever award a false stamp. */
  const calibrated = calib && hitTotal && tenPair && route !== 'none';
  const pct =
    !calib || target == null
      ? 0
      : calibrated
      ? 100
      : hitTotal
      ? 65
      : tenPair
      ? 40
      : Math.round(30 * Math.max(0, 1 - Math.abs(P - target) / target));

  sceneRef.current = { ...sceneRef.current, a, b, c, route, step, P, bagCount, perTray };

  /* the bracketing each step wants to show. Kept in an effect keyed on `step`
     alone, so a learner is free to toggle the brackets within a step. */
  useEffect(() => {
    if (step <= 3) setRoute('none');
    else if (step === 5) setRoute('right');
    else setRoute('left');
  }, [step]);

  /* Step 7 is the strategy step, so seed a board whose easy route is NOT simply
     left-to-right (5 × 2 makes the ten) — otherwise the point makes itself
     invisibly. Seeded once, so returning to the step never fights the learner. */
  useEffect(() => {
    if (step === 7 && !seededRef.current) {
      seededRef.current = true;
      setA(3);
      setB(5);
      setC(2);
    }
  }, [step]);

  /* hand the challenge a fresh target the first time we reach it, and reset the
     board to 1 × 1 × 1 so it can never open already-solved */
  useEffect(() => {
    if (STEPS[step].calib && target == null) {
      setTarget(pickTarget(null));
      setA(1);
      setB(1);
      setC(1);
    }
  }, [step, target]);

  /* =======================================================================
     RENDER — the board, redrawn from the state snapshot on every change.
     Everything read here comes from sceneRef, never the render closure.
     ======================================================================= */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const S = sceneRef.current;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

    /* faint quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    const GRID = 28;
    for (let gx = GRID; gx < W; gx += GRID) {
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, H);
    }
    for (let gy = GRID; gy < H; gy += GRID) {
      ctx.moveTo(0, gy + 0.5);
      ctx.lineTo(W, gy + 0.5);
    }
    ctx.stroke();

    const L = computeLayout(W, H, S.a, S.b);
    const bagAccent = S.route === 'left';
    const trayAccent = S.route === 'right';
    const pr = Math.max(1.8, Math.min(L.bagW, L.bagH) * 0.115);

    for (let i = 0; i < S.a; i++) {
      const ty = L.y0 + i * (L.trayH + TRAY_GAP);

      /* ---- the tray ---- */
      roundRect(ctx, L.x0, ty, L.trayW, L.trayH, 9);
      if (trayAccent) {
        ctx.fillStyle = 'rgba(200,30,79,0.07)';
        ctx.fill();
        ctx.strokeStyle = CURVE;
        ctx.lineWidth = 2.4;
        ctx.setLineDash([]);
      } else if (bagAccent) {
        /* Route L ignores the tray AS A GROUPING, so it recedes to a dashed
           hint — but it is still drawn, because a·b is read off the a rows. */
        ctx.strokeStyle = 'rgba(28,43,58,0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
      } else {
        ctx.fillStyle = 'rgba(28,43,58,0.03)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(28,43,58,0.22)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      /* ---- the per-tray badge: b × c, the inner bracket's value ---- */
      if (trayAccent) {
        const bx = L.x0 + L.trayW + BADGE_GAP;
        const by = ty + L.trayH / 2;
        ctx.font = `700 13px ${MONO}`;
        const label = String(S.perTray);
        /* b·c ≤ 36 is always two digits, so 40px is ample — but CAP it rather
           than trusting measureText, whose result depends on which mono font the
           machine actually resolved. The cap is what makes "the badge always
           fits its lane" a guarantee instead of a hope (audited). */
        const bw = Math.max(30, Math.min(BADGE_MAX, ctx.measureText(label).width + 16));
        roundRect(ctx, bx, by - 11, bw, 22, 11);
        ctx.fillStyle = 'rgba(200,30,79,0.1)';
        ctx.fill();
        ctx.strokeStyle = CURVE;
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.fillStyle = CURVE;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, bx + bw / 2, by);
      }

      /* ---- the bags, and the marbles inside them ---- */
      for (let j = 0; j < S.b; j++) {
        const bx = L.x0 + TRAY_PAD + j * (L.bagW + BAG_GAP);
        const by = ty + TRAY_PAD;

        roundRect(ctx, bx, by, L.bagW, L.bagH, 6);
        if (bagAccent) {
          ctx.fillStyle = 'rgba(200,30,79,0.07)';
          ctx.fill();
          ctx.strokeStyle = CURVE;
          ctx.lineWidth = 2.2;
        } else {
          ctx.fillStyle = 'rgba(47,111,159,0.05)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(47,111,159,0.5)';
          ctx.lineWidth = 1.2;
        }
        ctx.stroke();

        const pips = PIP_POS[S.c] || PIP_POS[1];
        ctx.fillStyle = BLUE;
        for (let k = 0; k < pips.length; k++) {
          ctx.beginPath();
          ctx.arc(bx + pips[k][0] * L.bagW, by + pips[k][1] * L.bagH, pr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    /* ---- the bottom pill: what the current bracketing is counting ---- */
    let pill;
    if (S.route === 'left') {
      pill = `${S.a} ${TIMES} ${S.b} = ${S.bagCount} bags · each holds ${S.c}`;
    } else if (S.route === 'right') {
      pill = `${S.b} ${TIMES} ${S.c} = ${S.perTray} in each tray · ${S.a} tray${S.a === 1 ? '' : 's'}`;
    } else {
      pill = `${marbles(S.P)} on the board`;
    }
    const py = H - 19;
    ctx.font = `${S.route === 'none' ? '' : '700 '}12.5px ${MONO}`;
    const pw = ctx.measureText(pill).width + 24;
    roundRect(ctx, W / 2 - pw / 2, py - 12, pw, 24, 12);
    ctx.fillStyle = S.route === 'none' ? 'rgba(28,43,58,0.06)' : 'rgba(200,30,79,0.1)';
    ctx.fill();
    ctx.strokeStyle = S.route === 'none' ? 'rgba(28,43,58,0.2)' : CURVE;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = S.route === 'none' ? INK_SOFT : CURVE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pill, W / 2, py);
  }, []);

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  useEffect(() => {
    draw();
  }, [a, b, c, route, step, target, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* ---- controls ---------------------------------------------------------- */
  const flipBrackets = () => setRoute((r) => (r === 'right' ? 'left' : 'right'));
  const newTarget = () => {
    setTarget((x) => pickTarget(x));
    setA(1);
    setB(1);
    setC(1);
    setRoute('left');
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

  /* ---- the equation readout, with the BRACKETS as the accent ------------- */
  const Eq = () => {
    if (route === 'left') {
      return (
        <p className="prod mono">
          <span className="br">(</span>
          <span className="fa">{a}</span>
          <span className="op"> {TIMES} </span>
          <span className="fb">{b}</span>
          <span className="br">)</span>
          <span className="op"> {TIMES} </span>
          <span className="fc">{c}</span>
          <span className="op"> = </span>
          <span className="tot">{P}</span>
        </p>
      );
    }
    if (route === 'right') {
      return (
        <p className="prod mono">
          <span className="fa">{a}</span>
          <span className="op"> {TIMES} </span>
          <span className="br">(</span>
          <span className="fb">{b}</span>
          <span className="op"> {TIMES} </span>
          <span className="fc">{c}</span>
          <span className="br">)</span>
          <span className="op"> = </span>
          <span className="tot">{P}</span>
        </p>
      );
    }
    return (
      <p className="prod mono">
        <span className="fa">{a}</span>
        <span className="op"> {TIMES} </span>
        <span className="fb">{b}</span>
        <span className="op"> {TIMES} </span>
        <span className="fc">{c}</span>
        <span className="op"> = </span>
        <span className="tot">{P}</span>
      </p>
    );
  };

  /* ---- spoken description for screen readers ----------------------------- */
  const spoken =
    `A board of ${a} tray${a === 1 ? '' : 's'}, each holding ${b} bag${b === 1 ? '' : 's'}, ` +
    `each holding ${c} marble${c === 1 ? '' : 's'}: ${P} marbles in total. ` +
    (route === 'left'
      ? `The brackets are on the bags: ${a} times ${b} equals ${bagCount} bags, each of ${c}, giving ${P}.`
      : route === 'right'
      ? `The brackets are on the trays: ${b} times ${c} equals ${perTray} marbles in each tray, and ${a} trays give ${P}.`
      : 'No brackets have been chosen yet.') +
    (calibrated ? ' Calibrated.' : '');

  return (
    <div className="amlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Associative Law of Multiplication</h1>
        <p className="lede">
          Multiplication only ever eats <em>two</em> numbers, so <em>a × b × c</em> is not an
          instruction until you choose a pair to do first. There are exactly two ways to choose — and
          this board shows both without moving a single marble. <em>The marbles never move. Only the
          brackets move.</em>
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <Eq />
            <p className="expo mono" aria-hidden="true">
              {route === 'left'
                ? `do ${a} ${TIMES} ${b} = ${bagCount} first, then ${bagCount} ${TIMES} ${c}`
                : route === 'right'
                ? `do ${b} ${TIMES} ${c} = ${perTray} first, then ${a} ${TIMES} ${perTray}`
                : `${a} tray${a === 1 ? '' : 's'} · ${b} bag${b === 1 ? '' : 's'} in each · ${c} marble${
                    c === 1 ? '' : 's'
                  } in each bag`}
            </p>
          </div>

          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {route === 'none' ? 'one board · three factors' : 'carmine = the brackets'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          {/* the bracket toggle — the lab's one real instrument */}
          {routeOn && (
            <div className="seg" role="group" aria-label="Where the brackets go">
              <span className="seglab mono">brackets</span>
              <button
                type="button"
                className={'segb mono' + (route === 'left' ? ' on' : '')}
                aria-pressed={route === 'left'}
                onClick={() => setRoute('left')}
              >
                ({a} {TIMES} {b}) {TIMES} {c}
              </button>
              <button
                type="button"
                className={'segb mono' + (route === 'right' ? ' on' : '')}
                aria-pressed={route === 'right'}
                onClick={() => setRoute('right')}
              >
                {a} {TIMES} ({b} {TIMES} {c})
              </button>
            </div>
          )}

          {/* the two routes, side by side — the money shot */}
          {step >= 4 && (
            <div className="routes">
              <div className={'route' + (route === 'left' ? ' on' : '')}>
                <span className="rtag">Route L · bags first</span>
                <span className="rline mono">
                  <b>(</b>
                  {a} {TIMES} {b}
                  <b>)</b> {TIMES} {c}
                </span>
                <span className="rline mono step2">
                  {bagCount} {TIMES} {c}
                </span>
                <span className="rtot mono">{P}</span>
                {step >= 7 && easier === 'left' && <span className="easy mono">↑ makes a ten</span>}
              </div>

              {step >= 5 && (
                <div className="reql" aria-hidden="true">
                  <span className="eqs">=</span>
                  {step >= 6 && <span className="eqn mono">same answer</span>}
                </div>
              )}

              {step >= 5 && (
                <div className={'route' + (route === 'right' ? ' on' : '')}>
                  <span className="rtag">Route R · one tray first</span>
                  <span className="rline mono">
                    {a} {TIMES} <b>(</b>
                    {b} {TIMES} {c}
                    <b>)</b>
                  </span>
                  <span className="rline mono step2">
                    {a} {TIMES} {perTray}
                  </span>
                  <span className="rtot mono">{P}</span>
                  {step >= 7 && easier === 'right' && <span className="easy mono">↑ makes a ten</span>}
                </div>
              )}
            </div>
          )}

          {step >= 7 && easier === null && (
            <p className="nonote mono">
              Neither pair lands on a ten here — the two routes are about equally hard. Try other
              factors.
            </p>
          )}

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Trays · a</span>
              <span className="fact-v mono">{a}</span>
            </div>
            {/* these read the board, not the dials: a locked dial means "you
                cannot change it yet", never "it has no value" — the marbles are
                right there on screen */}
            <div className="fact">
              <span className="fact-k">Bags in each tray · b</span>
              <span className="fact-v mono">{b}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Marbles in each bag · c</span>
              <span className="fact-v mono">{c}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Marbles in total · a·b·c</span>
              <span className="fact-v mono" style={{ fontWeight: 700 }}>
                {P}
              </span>
            </div>
            {step >= 2 && (
              <div className="fact">
                <span className="fact-k">Bags on the board · a × b</span>
                <span className="fact-v mono">
                  {a} {TIMES} {b} = {bagCount}
                </span>
              </div>
            )}
            {step >= 3 && (
              <div className="fact">
                <span className="fact-k">Marbles per tray · b × c</span>
                <span className="fact-v mono">
                  {b} {TIMES} {c} = {perTray}
                </span>
              </div>
            )}
          </div>

          {routeOn && (
            <div className="toolbar">
              <button type="button" className="btn ghost" onClick={flipBrackets}>
                ⇄ Move the brackets
              </button>
            </div>
          )}
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
          <p className="body">{bodyOf(current, { a, b, c })}</p>

          {!calib ? (
            <div className="picker">
              <label className={'dial' + (aOn ? '' : ' off')}>
                <span className="dk">a</span>
                <span className="drole">trays</span>
                <input
                  type="range"
                  min={1}
                  max={A_MAX}
                  step={1}
                  value={a}
                  disabled={!aOn}
                  aria-label="Number of trays"
                  onChange={(e) => setA(parseInt(e.target.value, 10))}
                />
                <output className="dv">{a}</output>
              </label>
              <label className={'dial' + (bOn ? '' : ' off')}>
                <span className="dk">b</span>
                <span className="drole">bags in each tray</span>
                <input
                  type="range"
                  min={1}
                  max={B_MAX}
                  step={1}
                  value={b}
                  disabled={!bOn}
                  aria-label="Bags in each tray"
                  onChange={(e) => setB(parseInt(e.target.value, 10))}
                />
                <output className="dv">{b}</output>
              </label>
              <label className={'dial' + (cOn ? '' : ' off')}>
                <span className="dk">c</span>
                <span className="drole">marbles in each bag</span>
                <input
                  type="range"
                  min={1}
                  max={C_MAX}
                  step={1}
                  value={c}
                  disabled={!cOn}
                  aria-label="Marbles in each bag"
                  onChange={(e) => setC(parseInt(e.target.value, 10))}
                />
                <output className="dv">{c}</output>
              </label>
            </div>
          ) : (
            <div className="challenge">
              <div className="chbox">
                <span className="chk mono">Target marbles</span>
                <span className="chv mono">{target}</span>
              </div>
              <div className="picker">
                <label className="dial">
                  <span className="dk">a</span>
                  <span className="drole">trays</span>
                  <input
                    type="range"
                    min={1}
                    max={A_MAX}
                    step={1}
                    value={a}
                    aria-label="Number of trays"
                    onChange={(e) => setA(parseInt(e.target.value, 10))}
                  />
                  <output className="dv">{a}</output>
                </label>
                <label className="dial">
                  <span className="dk">b</span>
                  <span className="drole">bags in each tray</span>
                  <input
                    type="range"
                    min={1}
                    max={B_MAX}
                    step={1}
                    value={b}
                    aria-label="Bags in each tray"
                    onChange={(e) => setB(parseInt(e.target.value, 10))}
                  />
                  <output className="dv">{b}</output>
                </label>
                <label className="dial">
                  <span className="dk">c</span>
                  <span className="drole">marbles in each bag</span>
                  <input
                    type="range"
                    min={1}
                    max={C_MAX}
                    step={1}
                    value={c}
                    aria-label="Marbles in each bag"
                    onChange={(e) => setC(parseInt(e.target.value, 10))}
                  />
                  <output className="dv">{c}</output>
                </label>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {marbles(P)} · first pair {pair}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">aim for {target}</span>
                )}
              </div>
              {/* a DIAGNOSTIC hint: it names which of the two conditions is missing */}
              {!calibrated && (
                <p className="diag">
                  {hitTotal
                    ? `The total is right. Now the other half: the pair you multiply FIRST is ${pair}, which is not a multiple of ten. Move the brackets — or re-pick the factors — until it is.`
                    : tenPair
                    ? `Good — ${pair} is a ten. But the board holds ${marbles(P)}, not ${target}.`
                    : `The board holds ${marbles(P)}; you need ${target}, with a first pair that makes a ten.`}
                </p>
              )}
              {calibrated && (
                <p className="diag ok">
                  {route === 'left'
                    ? `(${a} ${TIMES} ${b}) ${TIMES} ${c} = ${bagCount} ${TIMES} ${c} = ${P}`
                    : `${a} ${TIMES} (${b} ${TIMES} ${c}) = ${a} ${TIMES} ${perTray} = ${P}`}{' '}
                  — a ten first, then one easy step. The other route gets the same {P}, just with more
                  work.
                </p>
              )}
              <div className="chbtns">
                <button type="button" className="btn ghost" onClick={flipBrackets}>
                  ⇄ Move the brackets
                </button>
                <button type="button" className="btn" onClick={newTarget}>
                  New target
                </button>
              </div>
            </div>
          )}

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
                      {ch}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
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
                  seededRef.current = false;
                  setA(START.a);
                  setB(START.b);
                  setC(START.c);
                  setRoute('none');
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">(a × b) × c = a × (b × c)</span> &nbsp;·&nbsp; the associative law of
        multiplication. Three factors can be bracketed two ways, and both count the same objects, so
        both give the same product — which is exactly the permission to multiply the friendly pair
        first. Not to be confused with the commutative law (which reorders factors) or the
        distributive law (which splits one factor into a sum). CCSS&nbsp;3.OA.B.5.
      </footer>

      <style jsx>{`
        .amlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #2f6f9f;
          --gold: #c8891e;
          --gold-dk: #8f6410;
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
          max-width: 74ch;
        }
        .lede em {
          font-style: italic;
          color: var(--ink);
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 350px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 940px) {
          .bench {
            grid-template-columns: 1fr;
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
          margin-bottom: 10px;
          min-height: 42px;
        }
        .prod {
          font-variant-numeric: tabular-nums;
          font-size: 21px;
          font-weight: 600;
          margin: 0;
          line-height: 1.3;
        }
        .prod .op {
          color: var(--ink-soft);
          font-weight: 400;
        }
        .prod .fa,
        .prod .fb,
        .prod .fc {
          color: var(--ink);
        }
        /* the BRACKETS are the accent — they are what this lab teaches */
        .prod .br {
          color: var(--curve);
          font-weight: 700;
        }
        .prod .tot {
          color: var(--ink);
          font-weight: 700;
        }
        .expo {
          margin: 3px 0 0;
          font-size: 13px;
          color: var(--ink-soft);
          font-variant-numeric: tabular-nums;
        }
        .stage {
          position: relative;
          width: min(100%, 720px);
          aspect-ratio: 3 / 2;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        /* the board is roughly square, so on a phone give the stage the height
           it needs rather than a letterbox that squashes the trays */
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
          top: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.82);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        @media (max-width: 560px) {
          .hint {
            display: none;
          }
        }
        .seg {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
          margin: 12px 4px 0;
        }
        .seglab {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .segb {
          font-size: 13px;
          font-variant-numeric: tabular-nums;
          padding: 6px 11px;
          border-radius: 7px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink-soft);
          cursor: pointer;
          transition: border-color 0.14s, background 0.14s, color 0.14s;
        }
        .segb:hover {
          border-color: var(--ink);
        }
        .segb.on {
          border-color: var(--curve);
          background: rgba(200, 30, 79, 0.08);
          color: var(--curve);
          font-weight: 700;
        }
        .routes {
          display: flex;
          align-items: stretch;
          justify-content: center;
          gap: 10px;
          margin: 14px 4px 2px;
          flex-wrap: wrap;
        }
        .route {
          flex: 1 1 190px;
          max-width: 260px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 10px 12px 11px;
          border-radius: 10px;
          border: 1px solid rgba(28, 43, 58, 0.14);
          background: var(--paper);
          opacity: 0.5;
          transition: opacity 0.16s, border-color 0.16s, background 0.16s;
        }
        .route.on {
          opacity: 1;
          border-color: var(--curve);
          background: rgba(200, 30, 79, 0.045);
        }
        .rtag {
          font-size: 10.5px;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 3px;
        }
        .rline {
          font-size: 15px;
          font-variant-numeric: tabular-nums;
          color: var(--ink);
        }
        .rline b {
          color: var(--curve);
        }
        .rline.step2 {
          font-size: 13.5px;
          color: var(--ink-soft);
        }
        .rtot {
          font-size: 22px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          margin-top: 2px;
        }
        .easy {
          margin-top: 3px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--gold-dk);
          background: rgba(200, 137, 30, 0.14);
          border: 1px solid var(--gold);
          border-radius: 5px;
          padding: 2px 6px;
        }
        .reql {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 0 2px;
        }
        /* Two 190px cards cannot sit side by side on a phone, and letting them
           wrap strands the "=" beside Route L. Stack the whole comparison
           instead, so the "=" stays BETWEEN the two routes where it belongs. */
        @media (max-width: 560px) {
          .routes {
            flex-direction: column;
            align-items: stretch;
          }
          .route {
            max-width: 100%;
            /* the 190px basis is a WIDTH hint for the row layout; in a column it
               would become a height and pad each card with dead space */
            flex: 0 0 auto;
          }
          .reql {
            flex-direction: row;
            gap: 8px;
            padding: 2px 0;
          }
          .eqs {
            font-size: 20px;
          }
        }
        .eqs {
          font-family: var(--serif);
          font-size: 24px;
          color: var(--ink-soft);
        }
        .eqn {
          font-size: 9.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--gold-dk);
          white-space: nowrap;
        }
        .nonote {
          margin: 8px 4px 0;
          font-size: 12px;
          color: var(--ink-soft);
          text-align: center;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin: 14px 4px 4px;
        }
        @media (max-width: 480px) {
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
          letter-spacing: 0.05em;
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
        .picker {
          display: grid;
          gap: 10px;
          margin-bottom: 6px;
        }
        .dial {
          display: grid;
          grid-template-columns: 22px 1fr 46px;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
        }
        .dial.off {
          opacity: 0.38;
        }
        .dk {
          grid-row: 1 / 3;
          font-family: var(--serif);
          font-style: italic;
          font-size: 19px;
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
          accent-color: var(--blue);
        }
        .dial input[type='range']:disabled {
          cursor: not-allowed;
        }
        .dv {
          grid-column: 3;
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-size: 14px;
          font-weight: 700;
        }
        .challenge {
          display: grid;
          gap: 10px;
          margin-bottom: 6px;
        }
        .chbox {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(28, 43, 58, 0.15);
          background: linear-gradient(180deg, #fff 0%, #f6f8f9 100%);
        }
        .chk {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .chv {
          font-size: 34px;
          font-weight: 700;
          color: var(--gold-dk);
          font-variant-numeric: tabular-nums;
        }
        .chbtns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 137, 30, 0.55), var(--gold));
          transition: width 0.18s ease-out;
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
          font-size: 12px;
        }
        .diag {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--ink-soft);
        }
        .diag.ok {
          color: var(--ink);
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
          background: rgba(200, 137, 30, 0.08);
          border-left: 3px solid var(--gold);
          padding: 10px 12px;
          border-radius: 0 6px 6px 0;
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
        :global(.amlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .segb,
          .route {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
