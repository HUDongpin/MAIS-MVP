'use client';

/* ============================================================================
   OddEvenLab — an interactive "bench" for ODD AND EVEN, told as the story of
   THE PAIR-OFF: everyone gets a partner, or exactly one is left standing.

        even  =  the pair-off comes out perfect        8 = 4 + 4
        odd   =  one is always left standing           9 = 4 + 4 + 1

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 2 lab — CCSS
   2.OA.C.3 ("determine whether a group of objects (up to 20) has an odd or
   even number of members, e.g., by pairing objects or counting them by 2s;
   write an equation to express an even number as a sum of two equal
   addends").  Both halves of the standard are here: the PAIRING is the
   centerpiece, and the equation N = a + a is the capstone's second gate.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE LONER, AND THE FLIP."
     N counters pair off into a line of two-high columns joined by little gold
     bonds.  Either everyone has a partner (EVEN) or exactly one counter is
     left standing at the end, spotlit carmine (ODD) — and the loner is not a
     failure of arranging, it is a fact about the number: however you shuffle
     the counters, the same one-or-none is left.  Then THE FLIP: press "one
     more" and the verdict always flips — the newcomer either partners the
     loner (odd → even) or becomes one (even → odd).  That single flip is why
     odd and even take turns all the way up the numbers, and it is what lets a
     child call 17 odd without pairing seventeen of anything.  The two-teams
     lens replays the pairs sideways: one partner from each pair to each team,
     so an even number splits into two equal teams — N = a + a, the double —
     while an odd number's teams are never fair.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • DivisionLab owns dividing with a quotient, and its leftover squares are
       "the remainder" (grades 3–5).  This lab is the Grade-2 idea BEFORE
       division exists: the divisor is never dialed (pairs are pairs), and the
       words are partner / left standing — the audit greps out the entire
       division vocabulary.
     • PrimeNumbersLab owns the 1–100 numeral grid where the multiples of 2
       are STRUCK OUT by the sieve.  No numeral grid here, nothing is struck;
       the object is a handful of counters and the gesture is pairing.
     • MultiplicationLab owns the a×b ARRAY of unit squares.  A pair column is
       deliberately not an array: nothing here has an area, and the two-high
       line exists only to expose the loner at its end.
     • NumberBondLab owns the whole fan of decompositions of one number.
       This lab draws no fan and no cut: it asks for exactly ONE split — the
       equal one, N = a + a — and its whole point is that this split exists
       precisely when N is even.
     • CountingLab owns one-to-one counting and cardinality; TeenNumbersLab
       owns the teen names; HundredChartLab owns the count to 100.  Nothing
       is counted aloud here and no numeral grid or chart appears.

   One-accent discipline: CARMINE is the PARITY — the loner, the verdict word,
   and the lonely "+ 1" in an odd number's equation.  Counters are quiet blue;
   the second team is teal; GOLD is the pair-bond (the little link that makes
   two counters a pair).  GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a seven-year-old):
     • Everything is exact integer arithmetic: parity is N % 2, pairs are
       ⌊N/2⌋, and 2·pairs + loner === N is audited for every N.
     • The scatter arrangement is DETERMINISTIC (a fixed golden-angle table,
       no randomness in render), and it never accidentally draws the pairing
       it is supposed to hide.
     • The calibration stamp needs two integer facts at once: the parity
       verdict tapped right, AND the team dial satisfying 2a + (N mod 2) = N
       — which has exactly one solution a for every N, so the stamp is
       provably unambiguous.  Audited over every N × every tap × every a.
   Verified by audit-oddeven.mjs (numeric proof + source greps) and
   verify-oddeven.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/OddEvenLab.jsx
     2. Import and render it:
          import OddEvenLab from './OddEvenLab';
          export default function Page() { return <OddEvenLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the count N, the
              lesson step, answers, the challenge and its two commitments).
     MODEL  — pure integer arithmetic; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  One dial in the lesson (the counters), one in the
   capstone (the team size), one button (one more friend).
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the parity: the loner, the verdict, the odd +1
const BLUE = '#3f74a6'; // the counters
const TEAL = '#2b8a8a'; // the second team
const GOLD = '#b98718'; // the pair-bond
const INK_HEX = '#1c2b3a';

const DIALS = [
  { key: 'n', name: 'Counters', role: 'how many friends · 1–20', min: 1, max: 20, unlock: 1, color: BLUE },
];

const START_N = 6;
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integers, nothing else.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

const isEven = (n) => n % 2 === 0;
const pairsOf = (n) => Math.floor(n / 2);
const lonerOf = (n) => n % 2; // 0 or 1 — there is never a second loner
const teamOf = (n) => Math.floor(n / 2); // each fair team, for even n

/* the standard's own equation: an even number is a sum of two equal addends */
function equationFor(n) {
  const h = teamOf(n);
  return isEven(n) ? `${n} = ${h} + ${h}` : `${n} = ${h} + ${h} + 1`;
}

/* ---------------------------------------------------------------------------
   Pure layout, kept out of the canvas so the audit can check it.  All three
   arrangements return unit positions (later scaled to pixels).

   scatterOf is DETERMINISTIC — a golden-angle spiral — so the picture never
   changes under the child's feet, and it is provably NOT the pairing (the
   audit checks no two scatter positions sit in a pairs-style column).
   ------------------------------------------------------------------------- */
function pairsLayout(n) {
  // pair k = column k, partners stacked; the loner stands alone at the end
  const pts = [];
  const p = pairsOf(n);
  for (let k = 0; k < p; k++) {
    pts.push({ x: k, y: 0, role: 'a' });
    pts.push({ x: k, y: 1, role: 'b' });
  }
  if (lonerOf(n)) pts.push({ x: p, y: 0.5, role: 'loner' });
  return pts;
}
function teamsLayout(n) {
  // one partner from each pair to each row; the odd one stands between rows
  const pts = [];
  const t = teamOf(n);
  for (let k = 0; k < t; k++) {
    pts.push({ x: k, y: 0, role: 'a' });
    pts.push({ x: k, y: 1, role: 'b' });
  }
  if (lonerOf(n)) pts.push({ x: t, y: 0.5, role: 'loner' });
  return pts;
}
function scatterLayout(n) {
  // golden-angle spiral: deterministic, and visibly not a pairing
  const pts = [];
  const GA = 2.399963229728653;
  for (let k = 0; k < n; k++) {
    const r = 0.62 * Math.sqrt(k + 0.6);
    pts.push({ x: r * Math.cos(k * GA), y: r * Math.sin(k * GA), role: 'free' });
  }
  return pts;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The team captain."  N counters land SCATTERED (the
   pairing is hidden — it would answer the question).  The child commits
   twice: tap ODD or EVEN, then set the Team size so the equation holds.

   No false stamp, provably: the stamp needs  pick === parity(N)  AND
   2a + (N mod 2) === N.  For each N exactly one a works (a = ⌊N/2⌋), so the
   gate is two independent integer identities.  Audited over every N in the
   generator's range × both taps × every dial position.
   ------------------------------------------------------------------------- */
function makeN(prev) {
  let n;
  do {
    n = 5 + Math.floor(Math.random() * 16); // 5 … 20
  } while (n === prev);
  return n;
}
const pickRight = (pick, n) => pick != null && pick === (isEven(n) ? 'even' : 'odd');
const teamRight = (a, n) => 2 * a + lonerOf(n) === n;
const calibChecks = (pick, a, n) => [pickRight(pick, n), teamRight(a, n)];
const closeness = (pick, a, n) => Math.round((100 * calibChecks(pick, a, n).filter(Boolean).length) / 2);
const isCalibrated = (pick, a, n) => calibChecks(pick, a, n).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; every scene the words depend on is
   pinned by STEPS[].demo; the reveal lives in the feedback.  The wrong
   answers are the real second-grade beliefs: that trying harder re-arranges
   a loner away, that teams of 4 and 5 are "fair enough", that you cannot
   know parity without pairing.  Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Pair up',
    body: 'Six counters walk in and pair off — every counter gets a partner, and the gold links show the pairs.',
    lens: 'pairs',
    demo: 6,
    q: 'Every counter has a partner and no one is left. So 6 is…',
    choices: ['Even — the pair-off is perfect', 'Odd', 'You cannot say yet'],
    answer: 0,
    feedback:
      'Even. That is the whole meaning of the word: an even number of things can pair off with ' +
      'no one left standing. Keep that picture — everything else about odd and even comes from it.',
  },
  {
    title: 'One left standing',
    body: 'Slide the Counters dial to 7 and watch the pair-off. Someone is out of luck.',
    lens: 'pairs',
    demo: 7,
    q: 'Pair up 7 counters. What happens?',
    choices: [
      'One is left standing — 7 is odd',
      'It works out if you arrange them more carefully',
      'Two are left standing',
    ],
    answer: 0,
    feedback:
      'Exactly one is left standing, and no clever arranging can fix it — shuffle the counters ' +
      'any way you like and the same single loner appears. The loner is not a mistake; it is a ' +
      'fact about the number 7. And there is never a SECOND loner: two loners would just pair up.',
  },
  {
    title: 'One more friend',
    body: 'Press “one more”. Watch what the newcomer does to the loner — then press it again.',
    lens: 'pairs',
    demo: 7,
    plusOne: true,
    q: '13 is odd. One more friend arrives. What is 14?',
    choices: [
      'Even — the newcomer partners the loner',
      'Odd — it stays odd',
      'You must pair all 14 up again to know',
    ],
    answer: 0,
    feedback:
      'Even. The newcomer walks straight to the loner and the pair-off is perfect again. One ' +
      'more always FLIPS the answer: odd becomes even, even becomes odd. That flip is why odd ' +
      'and even take turns all the way up the numbers.',
  },
  {
    title: 'Two fair teams',
    body: 'Now split for a game: one partner from each pair to each team. The pairs become two equal rows.',
    lens: 'teams',
    demo: 8,
    q: 'Can 9 counters make two fair teams?',
    choices: [
      'No — teams of 4 and 4, with one left over',
      'Yes — teams of 4 and 5 are fair enough',
      'Yes — 9 splits evenly',
    ],
    answer: 0,
    feedback:
      'Teams of 4 and 5 are NOT fair — ask the team of 4. An even number splits into two equal ' +
      'teams because each pair donates one counter to each side: 8 = 4 + 4. Writing that ' +
      'equation — a number as a sum of two EQUAL addends — is exactly what it means to be even. ' +
      'An odd number can never write it; its extra one always sticks out: 9 = 4 + 4 + 1.',
  },
  {
    title: 'Know without pairing',
    body: 'You do not need to pair up seventeen counters to call 17. Evens and odds take turns — ride the flip.',
    lens: 'pairs',
    demo: 16,
    plusOne: true,
    q: '15 is odd. Without pairing anything, what is 17?',
    choices: [
      'Odd — 16 is even, and 17 flips back',
      'Even — bigger numbers are even',
      'You cannot know without pairing',
    ],
    answer: 0,
    feedback:
      'Odd. 15 is odd, so 16 is even, so 17 is odd — the flip does all the work, two steps of ' +
      'it. Pairing is the MEANING; the flip is the shortcut it earns you.',
  },
  {
    title: 'The team captain',
    body:
      'A crowd lands, scattered — no pairs drawn, no help. Call it: odd or even? Then set the ' +
      'Team size to make the equation true. The pairs appear once you call it right.',
    lens: 'scatter',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function OddEvenLab() {
  const [n, setN] = useState(START_N);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [chalN, setChalN] = useState(null);
  const [pick, setPick] = useState(null); // 'odd' | 'even' | null
  const [team, setTeam] = useState(0); // the capstone's team-size dial

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const shownN = calib ? (chalN != null ? chalN : START_N) : n;

  const pct = calib && chalN != null ? closeness(pick, team, chalN) : 0;
  const calibrated = calib && chalN != null ? isCalibrated(pick, team, chalN) : false;
  const checks = calib && chalN != null ? calibChecks(pick, team, chalN) : [false, false];

  /* in the capstone the pairing stays hidden until the verdict is committed
     correctly — the reveal is the reward, not the hint */
  const lens = calib ? (checks[0] ? 'pairs' : 'scatter') : current.lens;

  sceneRef.current = {
    n: shownN,
    lens,
    calib,
    calibrated,
    verdictShown: !calib,
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
    const OK = '#1f8a5b';
    const S = sceneRef.current;
    const N = S.n;

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

    /* reserved verdict band on top; equation band at the bottom */
    const bandH = 56;
    const eqH = 54;

    const even = isEven(N);
    const loner = lonerOf(N);

    /* ---- the verdict band -------------------------------------------------- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (S.verdictShown || (S.calib && S.lens === 'pairs')) {
      const word = even ? 'EVEN' : 'ODD';
      const tail = even ? 'everyone has a partner' : 'one left standing';
      ctx.fillStyle = CARMINE;
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.fillText(`${N} is ${word}`, W / 2, bandH / 2 - 9);
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 13px system-ui, sans-serif';
      ctx.fillText(tail, W / 2, bandH / 2 + 12);
    } else {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 14px system-ui, sans-serif';
      ctx.fillText(
        S.calib ? 'no pairs drawn — call it yourself: odd or even?' : ' ',
        W / 2,
        bandH / 2
      );
    }

    /* ---- the counters ------------------------------------------------------ */
    const pts = S.lens === 'teams' ? teamsLayout(N) : S.lens === 'scatter' ? scatterLayout(N) : pairsLayout(N);

    // world bounds of the layout
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const availW = W - 60;
    const availH = H - bandH - eqH - 40;
    const unit = Math.min(availW / (spanX + 1), availH / (spanY + 1), 64);
    const R = Math.min(15, unit * 0.34);
    const ox = W / 2 - ((minX + maxX) / 2) * unit;
    const oy = bandH + (H - bandH - eqH) / 2 - ((minY + maxY) / 2) * unit;

    // gold pair-bonds first (under the counters)
    if (S.lens === 'pairs') {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      for (let k = 0; k < pairsOf(N); k++) {
        const ax = ox + k * unit;
        ctx.beginPath();
        ctx.moveTo(ax, oy + 0 * unit);
        ctx.lineTo(ax, oy + 1 * unit);
        ctx.stroke();
      }
    }
    if (S.lens === 'teams') {
      // two shelf lines so the rows read as teams
      ctx.strokeStyle = 'rgba(28,43,58,0.16)';
      ctx.lineWidth = 1;
      for (const ry of [0, 1]) {
        ctx.beginPath();
        ctx.moveTo(30, oy + ry * unit + R + 5.5);
        ctx.lineTo(W - 30, oy + ry * unit + R + 5.5);
        ctx.stroke();
      }
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('team one', 30, oy - R - 8);
      ctx.fillStyle = TEAL;
      ctx.fillText('team two', 30, oy + unit + R + 18);
      ctx.textAlign = 'center';
    }

    for (const p of pts) {
      const cx = ox + p.x * unit;
      const cy = oy + p.y * unit;
      const isLoner = p.role === 'loner';
      const col = isLoner ? CARMINE : p.role === 'b' && S.lens === 'teams' ? TEAL : BLUE;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(cx - R * 0.3, cy - R * 0.3, R * 0.45, 0, Math.PI * 2);
      ctx.fill();
      if (isLoner) {
        // the spotlight: a dashed carmine ring and the word
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(cx, cy, R + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = CARMINE;
        ctx.font = 'italic 600 12px system-ui, sans-serif';
        ctx.fillText('left standing', cx, cy + R + 20);
      }
    }

    /* ---- the equation band (the standard's own payoff) --------------------- */
    if (S.lens === 'teams' || (S.calib && S.lens === 'pairs')) {
      const eq = equationFor(N);
      ctx.font = '700 22px ui-monospace, Menlo, monospace';
      const base = eq.slice(0, even ? eq.length : eq.length - 4);
      const tail = even ? '' : ' + 1';
      const wAll = ctx.measureText(eq).width;
      let x0 = W / 2 - wAll / 2;
      ctx.textAlign = 'left';
      ctx.fillStyle = INK;
      ctx.fillText(base, x0, H - eqH / 2);
      if (!even) {
        ctx.fillStyle = CARMINE;
        ctx.fillText(tail, x0 + ctx.measureText(base).width, H - eqH / 2);
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 12px system-ui, sans-serif';
      ctx.fillText(
        even ? 'two equal addends — the double' : 'the extra one always sticks out',
        W / 2,
        H - eqH / 2 + 24
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
    const d = STEPS[step].demo;
    if (d != null) setN(d);
  }, [step]);

  /* hand the capstone its crowd on first arrival */
  useEffect(() => {
    if (current.calib && chalN == null) {
      setChalN(makeN(null));
      setPick(null);
      setTeam(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const oneMore = () => setN((v) => Math.min(20, v + 1));
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    if (calib) {
      setPick(null);
      setTeam(0);
    } else {
      setN(STEPS[step].demo != null ? STEPS[step].demo : START_N);
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = calib
    ? `The team captain: ${shownN} counters, scattered. ${checks[0] ? 'Called right.' : 'Not yet called.'} ${
        calibrated ? 'Calibrated.' : ''
      }`
    : `${shownN} counters, ${lens} view. ${shownN} is ${isEven(shownN) ? 'even' : 'odd'}.`;

  return (
    <div className="oelab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Odd or Even: The Pair-Off</h1>
        <p className="lede">
          Pair everyone up. Either the pair-off is <em>perfect</em> — even — or exactly{' '}
          <em>one is left standing</em> — odd. And an even number keeps a promise: it splits into{' '}
          <span className="mono">two equal teams</span>.
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
            {!calib && current.plusOne && (
              <button type="button" className="btn count" onClick={oneMore} disabled={n >= 20}>
                one more friend
              </button>
            )}
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
                      value={n}
                      disabled={!unlocked}
                      aria-label={`${d.name} — ${d.role}`}
                      onChange={(e) => setN(clampInt(e.target.value, d.min, d.max))}
                      style={{ accentColor: d.color }}
                    />
                    <output className="dv" style={unlocked ? { color: d.color } : undefined}>
                      {unlocked ? n : '🔒'}
                    </output>
                  </label>
                );
              })}

            {calib && chalN != null && (
              <label className="dial">
                <span className="dk" style={{ color: INK_HEX }}>
                  Team size
                </span>
                <span className="drole">make the equation true</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={team}
                  aria-label="Team size — make the equation true"
                  onChange={(e) => setTeam(clampInt(e.target.value, 0, 10))}
                />
                <output className="dv">{team}</output>
              </label>
            )}
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

          {calib && chalN != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">Call it, captain</span>
                <div className="verdict-btns">
                  <button
                    type="button"
                    className={'chip' + (pick === 'odd' ? ' picked' : '') + (checks[0] && pick === 'odd' ? ' right' : '')}
                    onClick={() => setPick('odd')}
                  >
                    ODD
                  </button>
                  <button
                    type="button"
                    className={'chip' + (pick === 'even' ? ' picked' : '') + (checks[0] && pick === 'even' ? ' right' : '')}
                    onClick={() => setPick('even')}
                  >
                    EVEN
                  </button>
                </div>
                <span className="target-hint mono">
                  {checks[0]
                    ? isEven(chalN)
                      ? `called right — now make ${chalN} = a + a true`
                      : `called right — now make ${chalN} = a + a + 1 true`
                    : pick != null
                      ? 'look again — count them off in twos'
                      : `${chalN} counters — odd or even?`}
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
                  <span className="mono target-hint">verdict, then the team dial</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setChalN(makeN(chalN));
                  setPick(null);
                  setTeam(0);
                }}
              >
                New crowd
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
                  setChalN(null);
                  setPick(null);
                  setTeam(0);
                  setN(START_N);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">even ⇔ N = a + a</span> &nbsp;·&nbsp; odd or even by pairing, and an even
        number as a sum of two equal addends (CCSS 2.OA.C.3). One more always flips the answer —
        that is why odds and evens take turns.
      </footer>

      <style jsx>{`
        .oelab {
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
        .btn.count {
          background: var(--blue);
          border-color: var(--blue);
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
          gap: 8px;
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
        .verdict-btns {
          display: flex;
          gap: 9px;
        }
        .chip {
          flex: 1;
          font: 700 14px/1 var(--mono);
          letter-spacing: 0.1em;
          padding: 10px 0;
          border-radius: 8px;
          border: 1.5px solid rgba(28, 43, 58, 0.3);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
        }
        .chip.picked {
          border-color: var(--ink);
          background: rgba(28, 43, 58, 0.07);
        }
        .chip.right {
          border-color: var(--ok);
          color: var(--ok);
          background: rgba(31, 138, 91, 0.08);
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
        :global(.oelab) :focus-visible {
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
