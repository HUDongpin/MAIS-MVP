'use client';

/* ============================================================================
   MultiplicativeComparisonLab — an interactive "bench" for MULTIPLICATIVE
   COMPARISON: "k times as many" against "k more than".

        Ana has 4.       "Ben has 3 times as many"  →  3 copies of ALL of Ana:  12
                         "Ben has 3 more"           →  Ana plus a stub of 3:     7

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 4 lab — CCSS
   4.OA.A.1 ("interpret a multiplication equation as a comparison, e.g.
   35 = 5 × 7 as 35 is 5 times as many as 7") and 4.OA.A.2 ("multiply or
   divide to solve word problems involving multiplicative comparison …
   distinguishing multiplicative comparison from additive comparison").
   The additive/multiplicative confusion is one of the best-documented
   misconceptions in the middle grades, and the distinction IS this standard.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE COPY AND THE STUB."
     One base quantity (Ana's tape, quiet blue unit cells) and two claims
     about Ben, each BUILT on screen from Ana's tape by a different gesture:
       · "k TIMES AS MANY" — k whole COPIES of Ana's tape laid end to end,
         seamed copy by copy, braced "k copies of Ana".  The words "times as
         many" are a recipe: take ALL of her, k times.
       · "k MORE THAN" — Ana's tape again, plus a STUB of k loose units.
         The words "more than" are a different recipe: take her once, add k.
     The payoff is THE RACE: slide Ana up and the copy-tape grows by k cells
     for every cell she gains — its lead over her, (k−1)·a, widens — while
     the stub-tape's lead is k forever.  The two sentences do not just give
     different answers; they give answers that BEHAVE differently, and the
     lab lets a child watch the divergence.  Read backwards, the copy
     sentence becomes division ("Ben has 12, that is 3 times as many as Ana"
     → Ana is one copy: 12 ÷ 3), and the stub sentence becomes subtraction —
     the two reversals are as different as the two builds.
     The capstone is the classic two-clue mystery: Rio is k times as many as
     Ana AND m more than Ana — two claims that pin exactly one pair.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • RatioLab owns the BATCH TAPE (one whole made of repeated two-colour
       batches) and the double number line.  Here there is ONE quantity per
       tape, tapes are never built from two-colour batches, and no double
       number line appears.  RatioLab co-varies two quantities; this lab
       compares two CLAIMS about one pair.
     • MultiplicationLab owns the ARRAY / AREA model.  No rows-and-columns
       rectangle appears here: copies lie END TO END as a length of count,
       and nothing is read as an area.
     • AddLab owns the number line with count-on hops (and its joined
       unit-bar echo).  No number line is drawn here and nothing hops; the
       stub row exists as the FOIL this standard names, and its cost against
       AddLab's bars is paid by having no line, no hop arcs, and no sum
       taught — the additive claim is built only to be told apart.
     • MeasurementLab owns "how much longer" as a measuring act.  The lead
       brackets here annotate claims about COUNTS; nothing is measured and
       that phrase never appears.
     • ComparingLab owns WHICH of two numbers is greater (magnitude bars,
       the digit scan, the > < symbols).  This lab never asks which is
       bigger — it asks HOW a sentence builds one number from another; no
       relation symbol appears.
     • FractionTimesWholeLab owns repeated addition of a UNIT FRACTION.
       Every count here is a whole number; no fraction appears.

   One-accent discipline: CARMINE is THE CLAIM ABOUT BEN — the copied cells,
   the stub cells, the claim readouts.  Ana is the quiet slate-blue base
   (and her ghost inside Ben's builds).  GOLD marks the SEAMS and BRACES —
   the structure that shows how a build was made.  GREEN is reserved for
   "correct", a satisfied clue, and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a nine-year-old):
     • Everything is exact integer arithmetic on a, k, r, m.  times = k·a,
       more = a + k, the leads (k−1)·a and k — all audited exhaustively over
       every dial value.
     • The two claims agree at exactly ONE dial pair (k = 2, a = 2) — the
       audit finds it and proves it is alone, so the lesson's "different
       answers" language is honest everywhere else.
     • The capstone mystery (k, m) is generated only when m = (k−1)·a for
       an in-range a, and the audit brute-forces every (a, r) the dials can
       reach to prove exactly ONE pair satisfies both clues — the stamp is
       a uniqueness theorem, not a coincidence.
   Verified by audit-multiplicativecomparison.mjs (numeric proof + source
   greps) and verify-multiplicativecomparison.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/MultiplicativeComparisonLab.jsx
     2. Import and render it:
          import MultiplicativeComparisonLab from './MultiplicativeComparisonLab';
          export default function Page() { return <MultiplicativeComparisonLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, k, the capstone's
              r and mystery, the lesson step).
     MODEL  — pure integer arithmetic; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Ana's count, the claim number k, and (capstone only)
   the child's answer for Rio.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the claim about Ben: copied cells, stub cells, readouts
const BASE = '#5b7a99'; // Ana — the quiet slate-blue base quantity
const GOLD = '#b98718'; // the seams and braces: how a build was made

const DIALS = [
  { key: 'a', name: 'Ana', role: 'her count · 2–8', min: 2, max: 8, unlock: 2, color: BASE },
  { key: 'k', name: 'The number', role: 'in both sentences · 2–4', min: 2, max: 4, unlock: 3, color: GOLD },
  { key: 'r', name: 'Rio', role: 'your answer · 4–32', min: 4, max: 32, unlock: 5, color: CARMINE },
];
const START_A = 4;
const START_K = 3;
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integers, nothing else.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

const timesOf = (a, k) => k * a; // "k times as many": k whole copies
const moreOf = (a, k) => a + k; // "k more than": one Ana plus a stub
const leadTimes = (a, k) => (k - 1) * a; // the copy-tape's lead — grows with a
const leadMore = (a, k) => k; // the stub-tape's lead — k forever
const reverseTimes = (ben, k) => ben / k; // "ben IS k times Ana" → one copy

/* the one dial pair where the two claims agree: k·a = a + k ⇔ a = k/(k−1) */
const claimsAgree = (a, k) => timesOf(a, k) === moreOf(a, k);

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The two clues."  Rio is k times as many as Ana AND
   m more than Ana.  m is built as (k−1)·a★ for a hidden in-range a★, so a
   solution exists; the audit proves it is the ONLY one the dials can reach.
   The child sets BOTH dials — Ana and Rio — and the stamp needs both clues
   to hold at once.
   ------------------------------------------------------------------------- */
function makeMystery(prev) {
  let m;
  do {
    const k = 2 + Math.floor(Math.random() * 3); // 2…4
    const aStar = 2 + Math.floor(Math.random() * 7); // 2…8
    m = { k, m: (k - 1) * aStar };
  } while (prev != null && m.k === prev.k && m.m === prev.m);
  return m;
}
const calibChecks = (a, r, my) => [my != null && r === my.k * a, my != null && r === a + my.m];
const isCalibrated = (a, r, my) => calibChecks(a, r, my).every(Boolean);
const closeness = (a, r, my) => {
  const c = calibChecks(a, r, my);
  return (c[0] ? 50 : 0) + (c[1] ? 50 : 0);
};

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback; the
   trap is treating "times as many" as "more than".  Next gates on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Two sentences about Ben',
    body: 'Ana has 4 marbles — her tape, four quiet cells. Two sentences describe Ben: “Ben has 3 times as many” and “Ben has 3 more.” Both use the 3.',
    q: 'Do the two sentences give Ben the same count?',
    choices: [
      'No — “times” copies all of Ana; “more” only adds a few',
      'Yes — both sentences use the number 3',
      'Cannot tell without seeing Ben',
    ],
    answer: 0,
    feedback:
      'No — and the whole lab lives in that gap. “3 times as many” is a recipe that takes ALL of ' +
      'Ana, three times. “3 more” takes her once and adds a stub of three. Same little word ' +
      'THREE, two builds. Watch both get built in the next steps.',
  },
  {
    title: 'The copy: “3 times as many”',
    body: 'Ben’s first build: three whole copies of Ana’s tape, laid end to end, seam by seam. Take all of her, three times.',
    q: 'Ana has 4. “Ben has 3 times as many” — Ben has…',
    choices: ['12 — three whole copies of 4', '7 — that is 3 more', '34'],
    answer: 0,
    feedback:
      '12 = 3 × 4 — and CCSS 4.OA.A.1 asks for exactly this reading: “12 is 3 times as many as ' +
      '4.” A multiplication equation IS a comparison sentence. The seams show the recipe: one ' +
      'copy, another, another — the whole of Ana, every time.',
  },
  {
    title: 'The stub: “3 more than”',
    body: 'Ben’s second build: Ana’s tape once, then a stub of 3 loose cells. The Ana dial is yours — slide her to 6 and watch both builds react.',
    q: 'With Ana at 6: the copy-build and the stub-build hold…',
    choices: ['18 and 9 — the copy grew with her, the stub barely moved', '9 and 18', 'Both 9'],
    answer: 0,
    feedback:
      'The copy-build tripled her new count: 3 × 6 = 18. The stub-build just tracks her: 6 + 3 ' +
      '= 9. The stub NEVER cares how big Ana is — three more is three more. The copy cares ' +
      'about nothing else.',
  },
  {
    title: 'The race',
    body: 'The claim-number dial is unlocked. The gold brackets mark each build’s LEAD over Ana. Slide her and watch the two leads.',
    q: 'If Ana doubles, what happens to each build’s lead over her?',
    choices: [
      'The copy’s lead doubles too; the stub’s lead stays exactly k',
      'Both leads double',
      'Neither lead changes',
    ],
    answer: 0,
    feedback:
      'The copy’s lead is (k−1) copies of Ana — it grows every time she does. The stub’s lead ' +
      'is the stub: k cells, forever. That is the honest difference between the sentences: not ' +
      'just two answers, two BEHAVIOURS. Any claim whose lead grows with the base is ' +
      'multiplicative at heart.',
  },
  {
    title: 'Reading backwards',
    lens: 'reverse',
    body: 'Now Ben is known and Ana is not: “Ben has 12, and that is 3 times as many as Ana.” Read the copy-build in reverse.',
    q: 'Ben’s 12 must be 3 equal copies of Ana. So Ana has…',
    choices: ['4 — one copy: 12 ÷ 3', '9 — three fewer: 12 − 3', '36 — three times 12'],
    answer: 0,
    feedback:
      '4 — division is the copy-sentence read backwards: 12 ÷ 3 asks “how big is one copy?” ' +
      '(4.OA.A.2, the unknown factor). And notice the foil: “12 is 3 MORE than Ana” reverses by ' +
      'subtraction to 9. The two sentences even UNDO differently — multiply ⇄ divide, add ⇄ ' +
      'subtract.',
  },
  {
    title: 'The two clues',
    body: 'A mystery pair. Clue 1: Rio has k times as many as Ana. Clue 2: Rio has m more than Ana. Set BOTH dials until both clues hold at once.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function MultiplicativeComparisonLab() {
  const [a, setA] = useState(START_A);
  const [k, setK] = useState(START_K);
  const [r, setR] = useState(10); // capstone: the child's Rio
  const [mystery, setMystery] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const reverse = current.lens === 'reverse';

  const pct = calib ? closeness(a, r, mystery) : 0;
  const calibrated = calib ? isCalibrated(a, r, mystery) : false;
  const checks = calib ? calibChecks(a, r, mystery) : [false, false];

  sceneRef.current = { a, k, r, mystery, calib, reverse, answered: answers[step] != null, step };

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
    const OK = '#1f8a5b';
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

    /* one shared scale: every tape starts at x0; a cell is `unit` px wide */
    const x0 = 30;
    const maxCells = 33;
    const unit = (W - x0 - 24) / maxCells;
    const cellH = Math.min(30, H * 0.075);

    /* one unit cell */
    const cell = (i, y, fill, stroke) => {
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke || 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1;
      ctx.fillRect(x0 + i * unit, y, unit, cellH);
      ctx.strokeRect(x0 + i * unit + 0.5, y + 0.5, unit - 1, cellH - 1);
    };
    /* a horizontal brace with a label, above a span of cells */
    const brace = (from, to, y, label, color) => {
      const xa = x0 + from * unit;
      const xb = x0 + to * unit;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(xa, y + 6);
      ctx.lineTo(xa, y);
      ctx.lineTo(xb, y);
      ctx.lineTo(xb, y + 6);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = '600 11.5px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, (xa + xb) / 2, y - 5);
    };
    const rowLabel = (y, text, color) => {
      ctx.fillStyle = color || INK_SOFT;
      ctx.font = 'italic 600 12.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(text, x0, y - 8);
    };
    const countTag = (n, cells, y, color) => {
      ctx.fillStyle = color;
      ctx.font = '700 15px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(String(n), x0 + cells * unit + 8, y + cellH * 0.72);
    };

    if (!S.calib) {
      const yAna = H * 0.17;
      const yTimes = H * 0.42;
      const yMore = H * 0.70;
      const showTimes = S.step >= 1;
      const showMore = S.step >= 2 || S.step === 0;

      /* ---- Ana ------------------------------------------------------------ */
      rowLabel(yAna, S.reverse ? 'Ana — unknown' : 'Ana', BASE);
      for (let i = 0; i < S.a; i++) cell(i, yAna, BASE);
      countTag(S.reverse && !S.answered ? '?' : S.a, S.a, yAna, BASE);

      /* ---- the copy build --------------------------------------------------- */
      if (showTimes) {
        rowLabel(yTimes - 30, `“${S.k} times as many” — ${S.k} whole copies of Ana`, CARMINE);
        const total = timesOf(S.a, S.k);
        for (let i = 0; i < total; i++) cell(i, yTimes, CARMINE);
        /* gold seams between copies */
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.4;
        for (let cpy = 1; cpy < S.k; cpy++) {
          const x = x0 + cpy * S.a * unit;
          ctx.beginPath();
          ctx.moveTo(x, yTimes - 3);
          ctx.lineTo(x, yTimes + cellH + 3);
          ctx.stroke();
        }
        brace(0, total, yTimes - 14, `${S.k} copies of Ana = ${S.k} × ${S.reverse && !S.answered ? '?' : S.a} = ${total}`, GOLD);
        countTag(total, total, yTimes, CARMINE);
        /* the lead bracket, once the race step arrives */
        if (S.step >= 3) brace(S.a, total, yTimes + cellH + 24, `lead: ${leadTimes(S.a, S.k)} — grows with Ana`, CARMINE);
      }

      /* ---- the stub build --------------------------------------------------- */
      if (showMore && S.step >= 2) {
        rowLabel(yMore - 30, `“${S.k} more than” — Ana again, plus a stub of ${S.k}`, CARMINE);
        for (let i = 0; i < S.a; i++) cell(i, yMore, 'rgba(91,122,153,0.45)');
        for (let i = S.a; i < moreOf(S.a, S.k); i++) cell(i, yMore, CARMINE);
        brace(0, moreOf(S.a, S.k), yMore - 14, `Ana + ${S.k} = ${moreOf(S.a, S.k)}`, GOLD);
        countTag(moreOf(S.a, S.k), moreOf(S.a, S.k), yMore, CARMINE);
        if (S.step >= 3) brace(S.a, moreOf(S.a, S.k), yMore + cellH + 24, `lead: ${leadMore(S.a, S.k)} — k, forever`, CARMINE);
      } else if (S.step === 0) {
        ctx.fillStyle = INK_SOFT;
        ctx.font = 'italic 600 13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('“Ben has 3 times as many”  ·  “Ben has 3 more”  — two builds, coming up', x0, yTimes + 10);
      }
    } else if (S.mystery) {
      /* ---- the capstone: Ana, Rio, and the two clue overlays ---------------- */
      const my = S.mystery;
      const yAna = H * 0.18;
      const yRio = H * 0.48;

      rowLabel(yAna, 'Ana — your dial', BASE);
      for (let i = 0; i < S.a; i++) cell(i, yAna, BASE);
      countTag(S.a, S.a, yAna, BASE);

      rowLabel(yRio - 30, 'Rio — your dial', CARMINE);
      for (let i = 0; i < S.r; i++) cell(i, yRio, CARMINE);
      countTag(S.r, S.r, yRio, CARMINE);

      /* clue 1: does Rio end exactly at k copies of Ana? gold seams say */
      const c1 = S.r === my.k * S.a;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.4;
      for (let cpy = 1; cpy <= my.k; cpy++) {
        const x = x0 + Math.min(cpy * S.a, maxCells) * unit;
        ctx.setLineDash(cpy * S.a > S.r ? [3, 3] : []);
        ctx.beginPath();
        ctx.moveTo(x, yRio - 3);
        ctx.lineTo(x, yRio + cellH + 3);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      brace(0, Math.min(my.k * S.a, maxCells), yRio - 14, `clue 1: ${my.k} copies of Ana = ${my.k * S.a}`, c1 ? OK : GOLD);

      /* clue 2: does Rio end exactly m past Ana? */
      const c2 = S.r === S.a + my.m;
      brace(S.a, Math.min(S.a + my.m, maxCells), yRio + cellH + 26, `clue 2: Ana + ${my.m} = ${S.a + my.m}`, c2 ? OK : GOLD);

      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 12.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        c1 && c2 ? 'both clues hold — that is the only pair that can do it' : 'slide both dials until both clue marks land on Rio’s end',
        x0,
        H * 0.88
      );
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
      setMystery(makeMystery(null));
      setA(2);
      setR(10);
      return;
    }
    setMystery(null);
    if (step === 0 || step === 1) {
      setA(4);
      setK(3);
    } else if (step === 2) {
      setA(6);
      setK(3);
    } else if (step === 3) {
      setA(4);
    } else if (step === 4) {
      setA(4);
      setK(3); // Ben 12 = 3 × 4, the reverse story
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const setDial = (key, v) => {
    if (key === 'a') setA(clampInt(v, 2, 8));
    if (key === 'k') setK(clampInt(v, 2, 4));
    if (key === 'r') setR(clampInt(v, 4, 32));
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const newMystery = () => {
    setMystery(makeMystery(mystery));
    setA(2);
    setR(10);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);
  const dialValue = (key) => (key === 'a' ? a : key === 'k' ? k : r);
  const visibleDials = calib ? DIALS.filter((d) => d.key !== 'k') : DIALS.filter((d) => d.key !== 'r');

  const spoken = calib
    ? `Ana ${a}, Rio ${r}. ${checks[0] ? 'Clue one holds.' : ''} ${checks[1] ? 'Clue two holds.' : ''}${calibrated ? ' Calibrated.' : ''}`
    : `Ana has ${a}. ${k} times as many is ${timesOf(a, k)}; ${k} more is ${moreOf(a, k)}.`;

  return (
    <div className="mclab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Times As Many, or Just More?</h1>
        <p className="lede">
          “Ben has 3 <em>times as many</em>” and “Ben has 3 <em>more</em>” share a word and nothing
          else. One sentence <span className="mono">copies all of Ana</span>; the other adds a
          stub — and as Ana grows, the difference explodes.
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
            {visibleDials.map((d) => {
              const unlocked = step >= d.unlock;
              const v = dialValue(d.key);
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
                    {unlocked ? v : '🔒'}
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

          {calib && mystery && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The two clues</span>
                <p className="patient">
                  Rio has <strong>{mystery.k} times as many</strong> as Ana.
                  <br />
                  Rio has <strong>{mystery.m} more</strong> than Ana.
                </p>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} Rio = {mystery.k} × Ana</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} Rio = Ana + {mystery.m}</li>
                </ol>
                <span className="target-hint mono">
                  {calibrated
                    ? 'exactly one pair can do both'
                    : checks[0]
                      ? 'clue 1 holds — now make clue 2 true as well'
                      : checks[1]
                        ? 'clue 2 holds — now make clue 1 true as well'
                        : 'two dials, two clues, one pair'}
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
                  <span className="mono target-hint">copy · stub · agree</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={newMystery}>
                New mystery
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
                  setA(START_A);
                  setK(START_K);
                  setR(10);
                  setMystery(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">“times as many” copies the whole tape ⇒ its lead grows</span>{' '}
        &nbsp;·&nbsp; interpret a multiplication equation as a comparison and distinguish
        multiplicative from additive comparison (CCSS 4.OA.A.1–2). Read forwards it multiplies;
        read backwards it divides.
      </footer>

      <style jsx>{`
        .mclab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
          --base: #5b7a99;
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
        .patient {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
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
        :global(.mclab) :focus-visible {
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
