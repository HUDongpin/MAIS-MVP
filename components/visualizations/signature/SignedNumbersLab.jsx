'use client';

/* ============================================================================
   SignedNumbersLab — an interactive "bench" for MULTIPLYING AND DIVIDING
   SIGNED NUMBERS: ×(−1) as a 180° FLIP of the whole number line, the sign
   of a product as the PARITY of its flips, and the round trip that settles
   the most-asked question in middle school —

        flip the line once  →  every number trades with its opposite
        flip it twice       →  home.   THAT is why (−1)(−1) = +1.

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 7 lab —
   CCSS 7.NS.A.2 is the anchor: "understand that multiplication is extended
   … to rational numbers by requiring that operations continue to satisfy
   the properties of operations, particularly the distributive property,
   leading to products such as (−1)(−1) = 1", plus 7.NS.A.2b–c (divide,
   and the sign rules as consequences, not commandments).

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge
   with a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE SHEET, AND THE FLIP TALLY."
     The number line rides on a glass sheet.  Press ×2 and the sheet
     STRETCHES — every number slides away from 0, all at once, 0 alone
     staying put.  Press ×(−1) and the sheet FLIPS about zero: 5 lands on
     −5, −3 lands on 3, the whole world trades places in one gesture.
     Multiplication by any signed number is now a CHAIN of presses, and
     the product's sign stops being a rule to memorize: it is the PARITY
     on the flip tally.  Two flips undo each other — press ×(−1) twice
     and watch every number come home — so (−1)(−1) = +1 is a ROUND TRIP,
     not a decree.  The lab then pays the standard's own bill: the
     distributive certification 0 = (−1)·(1 + (−1)) = −1 + (−1)(−1),
     which leaves (−1)(−1) no choice but +1 unless zero itself breaks.
     Division rides the same sheet backwards (÷(−2) is the un-stretch
     plus a flip), and the lab stands guard at its own border: the
     two-negatives law belongs to × and ÷ ONLY — the sheet never flips
     for addition, and the lab says so out loud.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • IntegerLab (6.NS.C) owns the MIRROR AT ZERO for one number — the
       dashed line, one dot and its ghost twin, |a| as a bracket.  This
       lab never mirrors one dot: its object is the LINE ITSELF as a
       moving sheet, and its owned idea is COMPOSITION — flip upon flip —
       which a static mirror can structurally never show.
     • AddLab owns count-on hops; roadmap N2 owns signed ADDITION.  No
       addition or subtraction is ever performed on the sheet (the lone
       (1 + (−1)) inside the distributive certification is quoted as
       algebra, not enacted), and the misconception step explicitly
       returns additive questions to their own bench.
     • MultiplicationLab owns a×b as an ARRAY of unit squares.  No array,
       no area, no tiling: multiplication here is a MOTION of the line.
     • CommutativeLab owns the operation TABLE.  The classic ± sign table
       is deliberately refused — the flip tally replaces it, because a
       parity you can count beats a table you must trust.
     • AbsoluteValueLab owns the fold of a GRAPH on the plane; nothing
       here has a y-axis.  UnitCircleLab wraps; nothing here wraps.  (The
       kinship is noted in the lesson: ×(−1) is a half-turn of the line,
       and the complex bench to come — ×i as a quarter-turn — is this
       lab's older sibling.  i² = −1 and (−1)² = +1 are the same music.)

   One-accent discipline: CARMINE is THE SIGN — the flip tally, the flipped
   state, the parity verdict.  BLUE is the sheet and its numbers (the
   object being moved).  GOLD is the probe — one marked number you track
   through the chain.  GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a thirteen-year-old):
     • The chain state is EXACT: the running multiplier M is an integer
       (factors from ±2, ±3, ±1; chips disable rather than overflow past
       |M| = 96), the flip tally is an integer, and the audited identity
       sign(M) = (−1)^flips holds at every reachable state — proved by
       exhaustive walks over the chain space, not sampled.
     • Undo is honest: it pops the last factor and DIVIDES exactly — the
       audit walks random chains with undos and the state never drifts.
     • The distributive certification is verified as arithmetic, not
       prose: the audit computes (−1)·(1 + (−1)) both ways.
     • The calibration stamp needs two facts at once: the probe LANDS on
       the posted target exactly, AND the flip parity is declared
       correctly — and because the target's sign forces the parity, a
       student who lands but misdeclares has been caught believing the
       sign came from somewhere else.  Audited over every target × every
       reachable chain value × both declarations.
   Verified by audit-signednumbers.mjs (numeric proof + source greps) and
   verify-signednumbers.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/SignedNumbersLab.jsx
     2. Import and render it:
          import SignedNumbersLab from './SignedNumbersLab';
          export default function Page() { return <SignedNumbersLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the factor chain,
              the lesson step, answers, the order, the parity plea).
     MODEL  — exact integer arithmetic on the chain; it knows nothing of
              pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  No dials: factors are CHIPS pressed into a chain,
   with an honest Undo.  The probe starts at 1.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the sign: flip tally, flipped state, parity
const BLUE = '#3f74a6'; // the sheet and its numbers
const GOLD = '#b98718'; // the probe — one tracked number
const INK_HEX = '#1c2b3a';

const FACTORS = [2, 3, -1, -2, -3];
const M_CAP = 96; // chips disable rather than let |M| overflow the stage
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  The chain, exactly.
   ------------------------------------------------------------------------- */
const productOf = (chain) => chain.reduce((m, f) => m * f, 1);
const flipsOf = (chain) => chain.filter((f) => f < 0).length;
const signOf = (m) => (m > 0 ? 1 : m < 0 ? -1 : 0);
/* the audited identity: the product's sign IS the parity of the flips */
const parityLawHolds = (chain) => signOf(productOf(chain)) === (flipsOf(chain) % 2 === 0 ? 1 : -1);
const canPress = (chain, f) => Math.abs(productOf(chain) * f) <= M_CAP;
/* the distributive certification, as arithmetic the audit re-runs */
const certification = () => -1 * (1 + -1) === -1 * 1 + -1 * -1 && -1 * (1 + -1) === 0;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The dispatcher."  A target is posted; press a
   chain that lands the probe there exactly, then declare the flip parity —
   which the target's sign already forced, if you believe the law.
   ------------------------------------------------------------------------- */
const TARGETS = [-36, -24, -18, -12, -8, 8, 12, 18, 24, 36];
function makeOrder(prev) {
  let t;
  do {
    t = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  } while (t === prev);
  return t;
}
const calibChecks = (target, chain, parity) => {
  if (target == null) return [false, false];
  const landed = productOf(chain) === target;
  const trueParity = target < 0 ? 'odd' : 'even';
  return [landed, landed && parity != null && parity === trueParity];
};
const closeness = (target, chain, parity) =>
  Math.round((100 * calibChecks(target, chain, parity).filter(Boolean).length) / 2);
const isCalibrated = (target, chain, parity) => calibChecks(target, chain, parity).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; scenes pinned as preset chains; the
   reveal lives in the feedback.  The distractors are the real beliefs:
   that a negative product "just is" negative, that two negatives make a
   positive EVERYWHERE (even in sums), that the flip moves only one number.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The sheet stretches',
    body:
      'The number line rides on a glass sheet, and one number wears the gold probe: 1. Press ' +
      '×2 — the WHOLE sheet stretches. Every number slides away from zero at once; only zero ' +
      'stays.',
    chain: [],
    chips: [2, 3],
    q: 'Press ×2. What happens to the number −3 (not the probe — just watch it)?',
    choices: [
      'It lands on −6 — the stretch moves every number, both sides of zero',
      'Nothing — ×2 only moves the probe',
      'It lands on +6',
    ],
    answer: 0,
    feedback:
      'Every number doubles its distance from zero on its OWN side: −3 → −6, 5 → 10, 0 → 0. ' +
      'Multiplication acts on the whole line — that is the picture this lab runs on, and it ' +
      'is why one gesture can settle questions about every number at once.',
  },
  {
    title: 'The flip',
    body:
      'Now the star gesture. Press ×(−1): the sheet turns HALF WAY AROUND about zero. Watch ' +
      'the whole world trade places — 5 to −5, −3 to 3 — in one motion.',
    chain: [],
    chips: [-1],
    q: 'After one press of ×(−1), where does 5 sit?',
    choices: [
      'On −5 — and −5 sits on 5: every number traded with its opposite, all at once',
      'Still on 5 — the flip only moves negative numbers',
      'On 0',
    ],
    answer: 0,
    feedback:
      'Everyone trades at once. The Integer bench showed you ONE number’s opposite in a ' +
      'mirror; the flip is that idea grown up — the whole line moves, which is exactly what ' +
      '"multiply by −1" means. One press = one flip = one factor of −1. Keep count.',
  },
  {
    title: 'Flip twice — home',
    body:
      'Press ×(−1). Press it again. Watch closely the second time: every number comes HOME. ' +
      'Two flips undo each other — that is the whole secret.',
    chain: [-1],
    chips: [-1],
    q: 'So (−1) · (−1) = ?',
    choices: [
      '+1 — two flips are a round trip; the sheet is exactly where it started',
      '−1 — negatives stay negative',
      '−2',
    ],
    answer: 0,
    feedback:
      '+1, and now you know WHY: flipping twice restores every number, so multiplying by −1 ' +
      'twice must multiply by +1. The standard’s own bookkeeping agrees: ' +
      '0 = (−1)·(1 + (−1)) = (−1)·1 + (−1)·(−1) = −1 + (−1)(−1) — if (−1)(−1) were anything ' +
      'but +1, zero itself would break. A rule you can re-derive is a rule you cannot forget.',
  },
  {
    title: 'The flip tally',
    body:
      'Chains now. Press ×(−2), then ×(−3): stretch 2 with a flip, stretch 3 with a flip. ' +
      'The tally counts the flips; the parity calls the sign.',
    chain: [],
    chips: [2, 3, -1, -2, -3],
    q: '(−2) · (−3) = ?',
    choices: [
      '+6 — two flips cancel; the stretches multiply to 6',
      '−6 — there are negatives in it, so it must be negative',
      '−5',
    ],
    answer: 0,
    feedback:
      '+6. The sizes multiply (2·3 = 6) and the flips cancel in pairs — even tally, positive ' +
      'product; odd tally, negative product. "It has negatives so it’s negative" dies here: ' +
      'the sign never counts the negatives’ PRESENCE, only their PARITY.',
  },
  {
    title: 'Division rides the same sheet',
    body:
      'Undo is division: pressing Undo after ×(−2) divides by −2 — the un-stretch plus the ' +
      'un-flip. Same sheet, same tally, run backwards.',
    chain: [-3, -2, 2],
    chips: [2, 3, -1, -2, -3],
    q: '(−12) ÷ (−3) = ?',
    choices: [
      '+4 — dividing by a negative removes one flip: odd tally becomes even',
      '−4 — division keeps the minus',
      '+9',
    ],
    answer: 0,
    feedback:
      '+4. Dividing by −3 un-stretches by 3 and un-flips once, so −12’s single flip is ' +
      'removed: the answer lands positive. Multiplication and division share one law because ' +
      'they share one sheet — every ÷ is an × read backwards (7.NS.A.2b).',
  },
  {
    title: 'Where the law STOPS',
    body:
      'The border post. The two-negatives law belongs to × and ÷ — the sheet flips for ' +
      'FACTORS only. Addition never touches the sheet.',
    chain: [-1],
    chips: [-1],
    q: 'Does the two-negatives rule make (−1) + (−1) positive?',
    choices: [
      'No — addition never flips anything: (−1) + (−1) = −2, and that question belongs to the addition benches',
      'Yes — two negatives always make a positive',
      'Yes, but only past zero',
    ],
    answer: 0,
    feedback:
      '(−1) + (−1) = −2. "Two negatives make a positive" is a law about FLIPS — about ' +
      'factors — and adding is not flipping. Over-stretching the rule to sums is the single ' +
      'most common sign error in Grade 7, and now you can see why it is wrong: no press, no ' +
      'flip, no parity.',
  },
  {
    title: 'The dispatcher',
    body:
      'A target is posted. Press a chain that lands the gold probe EXACTLY on it — then ' +
      'declare the flip parity. (The target’s sign has already decided it; the declaration ' +
      'checks whether you know that.)',
    chain: [],
    chips: [2, 3, -1, -2, -3],
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SignedNumbersLab() {
  const [chain, setChain] = useState([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);
  const [parity, setParity] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const M = productOf(chain);
  const flips = flipsOf(chain);

  const checks = calib ? calibChecks(target, chain, parity) : [false, false];
  const pct = calib && target != null ? closeness(target, chain, parity) : 0;
  const calibrated = calib && target != null ? isCalibrated(target, chain, parity) : false;

  sceneRef.current = { chain, M, flips, calib, target };

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

    const bandH = 58;
    const cx = W / 2;

    /* ---- the REFERENCE line (top): the world before the chain ---- */
    const refY = bandH + (H - bandH) * 0.28;
    const sheetY = bandH + (H - bandH) * 0.68;
    const span = Math.max(12, Math.abs(S.M) * 1.15 + 2);
    const k = (W - 70) / (2 * span);

    const drawLine = (y, label) => {
      ctx.strokeStyle = 'rgba(28,43,58,0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - span * k - 8, y);
      ctx.lineTo(cx + span * k + 8, y);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, cx - span * k - 8, y - 22);
      /* zero, always anchored */
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(cx, y, 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = '600 10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('0', cx, y + 8);
    };

    drawLine(refY, 'the line, before the chain');
    drawLine(sheetY, 'the sheet, after the chain');

    /* reference marks: ±1 … ±4 on the top line */
    const marks = [-4, -3, -2, -1, 1, 2, 3, 4];
    ctx.font = '600 10.5px ui-monospace, monospace';
    for (const m of marks) {
      const x = cx + m * k;
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, refY - 5);
      ctx.lineTo(x, refY + 5);
      ctx.stroke();
      ctx.fillStyle = m === 1 ? GOLD : BLUE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(String(m), x, refY + 8);
      if (m === 1) {
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(x, refY, 5.4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    /* the sheet's marks: each reference number m lands at m·M */
    const flipped = S.flips % 2 === 1;
    for (const m of marks) {
      const x = cx + m * S.M * k;
      if (Math.abs(m * S.M) > span) continue;
      ctx.strokeStyle = flipped ? CARMINE : BLUE;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, sheetY - 5);
      ctx.lineTo(x, sheetY + 5);
      ctx.stroke();
      ctx.fillStyle = m === 1 ? GOLD : flipped ? CARMINE : BLUE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(String(m), x, sheetY + 8);
      /* the ghost path from reference to sheet, for ±1 only (legibility) */
      if (m === 1 || m === -1) {
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = m === 1 ? 'rgba(185,135,24,0.5)' : 'rgba(91,107,123,0.4)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx + m * k, refY + 18);
        ctx.lineTo(x, sheetY - 8);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (m === 1) {
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(x, sheetY, 6.2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = GOLD;
        ctx.font = '700 12px ui-monospace, monospace';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`probe: ${S.M}`, x, sheetY - 10);
        ctx.font = '600 10.5px ui-monospace, monospace';
      }
    }

    /* the target post (capstone) */
    if (S.calib && S.target != null && Math.abs(S.target) <= span) {
      const x = cx + S.target * k;
      ctx.strokeStyle = '#1f8a5b';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, sheetY - 26);
      ctx.lineTo(x, sheetY + 22);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#1f8a5b';
      ctx.font = '700 12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(S.target), x, sheetY - 30);
    }

    /* ---- the readout band: the chain and the tally ---- */
    ctx.textBaseline = 'middle';
    ctx.font = '700 16px ui-monospace, monospace';
    const chainText = S.chain.length === 0 ? '1' : '1 ' + S.chain.map((f) => `× (${f})`).join(' ');
    const parts = [
      [chainText + ` = ${S.M}`, INK_HEX],
      ['   ·   ', INK_SOFT],
      [`flips: ${S.flips}`, CARMINE],
      [` (${S.flips % 2 === 0 ? 'even → +' : 'odd → −'})`, CARMINE],
    ];
    const totalW = parts.reduce((a, [s]) => a + ctx.measureText(s).width, 0);
    let xPen = Math.max(14, W / 2 - totalW / 2);
    ctx.textAlign = 'left';
    for (const [s, col] of parts) {
      ctx.fillStyle = col;
      ctx.fillText(s, xPen, bandH / 2);
      xPen += ctx.measureText(s).width;
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
    setChain(STEPS[step].chain.slice());
    if (STEPS[step].calib) {
      setTarget(makeOrder(null));
      setParity(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const press = (f) => {
    if (!canPress(chain, f)) return;
    setChain((c) => [...c, f]);
  };
  const undo = () => setChain((c) => c.slice(0, -1));
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setChain(STEPS[step].chain.slice());
    setParity(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = calib
    ? `The dispatcher: land the probe on ${target ?? '…'}. Chain ${
        chain.length === 0 ? 'empty' : chain.map((f) => `times ${f}`).join(', ')
      }; probe at ${M}; ${flips} flips. Parity declared: ${parity ?? 'none'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Chain: 1 ${chain.map((f) => `times (${f})`).join(' ')} = ${M}; ${flips} flip${
        flips === 1 ? '' : 's'
      } — ${flips % 2 === 0 ? 'even, so positive' : 'odd, so negative'}.`;

  return (
    <div className="snlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Signed Numbers: Flip Twice, You’re Home</h1>
        <p className="lede">
          The number line rides on a sheet: positive factors <em>stretch</em> it, ×(−1){' '}
          <em>flips</em> it about zero. The product’s sign is the <em>parity</em> of the flips
          — and <span className="mono">(−1)(−1) = +1</span> because two flips are a round trip.
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

          <div className="toolbar" role="group" aria-label="Factors">
            {current.chips.map((f) => (
              <button
                type="button"
                key={f}
                className={'chipbtn' + (f < 0 ? ' neg' : '')}
                disabled={!canPress(chain, f)}
                onClick={() => press(f)}
              >
                × ({f})
              </button>
            ))}
            <button type="button" className="btn ghost" onClick={undo} disabled={chain.length === 0}>
              Undo (divide)
            </button>
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

          {calib && target != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The order</span>
                <span className="target-word mono">land the probe on {target}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} the probe sits on {target}, exactly
                  </li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} the flip parity declared
                  </li>
                </ol>
                <div className="declare" role="group" aria-label="Parity">
                  <button
                    type="button"
                    className={'declbtn' + (parity === 'even' ? ' active' : '')}
                    onClick={() => setParity('even')}
                  >
                    even flips → +
                  </button>
                  <button
                    type="button"
                    className={'declbtn' + (parity === 'odd' ? ' active' : '')}
                    onClick={() => setParity('odd')}
                  >
                    odd flips → −
                  </button>
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'dispatched — the sign was never a guess'
                    : checks[0]
                      ? 'landed — now read your own tally'
                      : 'stretches build the size; flips set the sign'}
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
                  <span className="mono target-hint">land · then declare</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeOrder(target));
                  setChain([]);
                  setParity(null);
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
                  setTarget(null);
                  setParity(null);
                  setChain([]);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">stretches build the size · flips set the sign</span> &nbsp;·&nbsp;
        multiplication extends to signed numbers by keeping the properties of operations —
        the distributive law leaves (−1)(−1) no choice but +1 (CCSS 7.NS.A.2); division rides
        the same sheet backwards. The law counts parity, never presence.
      </footer>

      <style jsx>{`
        .snlab {
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
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .chipbtn {
          font: 700 13px/1.2 ui-monospace, monospace;
          padding: 9px 12px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(63, 116, 166, 0.55);
          background: var(--paper);
          color: var(--blue);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.neg {
          border-color: rgba(200, 30, 79, 0.55);
          color: var(--carmine);
        }
        .chipbtn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .chipbtn:not(:disabled):hover {
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
          font-size: 21px;
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
        .declare {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .declbtn {
          font: 700 12.5px/1 ui-monospace, monospace;
          padding: 8px 11px;
          border-radius: 6px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
        }
        .declbtn.active {
          border-color: var(--carmine);
          background: rgba(200, 30, 79, 0.1);
          color: var(--carmine);
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
        :global(.snlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (max-width: 460px) {
          .toolbar {
            gap: 6px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .chipbtn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
