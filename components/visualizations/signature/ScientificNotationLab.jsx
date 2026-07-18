'use client';

/* ============================================================================
   ScientificNotationLab — an interactive "bench" for SCIENTIFIC NOTATION:
   a zoomable magnitude ladder from an atom to a galaxy, where a number is
   a coefficient and a rung, and comparisons are counted in rungs.

        a × 10ⁿ   with   1 ≤ a < 10  — one legal address per number
        one rung up = ×10 · the exponent GAP counts the rungs
        Sun (1×10⁹ m) vs Earth (1×10⁷ m): two rungs — 10² = 100 times

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 8.EE.A.3–4.
   ExponentRulesLab owns the algebra of exponents; this bench owns
   MAGNITUDE — why the notation exists, what a rung means, and how to
   compare an atom with a galaxy without ever counting a zero.

   THE SIGNATURE CENTERPIECE — "THE LADDER OF RUNGS."
     A pannable window onto the ladder of powers of ten, with real sizes
     pinned to it: atom, virus, sand, ant, human, whale, mountain, Earth,
     Sun, solar system, light-year, galaxy.  Every rung multiplies by ten;
     the bench opens on 0.0000000001 m — the unwritable atom — and
     renames it 1×10⁻¹⁰.  Same-coefficient pairs make comparison pure
     rung-counting (the Sun is 10² Earths wide), the coefficient rule
     gives every number exactly one legal address (25×10⁶ is 2.5×10⁷ in
     its lawful dress), and negative rungs count smallness the same way.
     The capstone posts a plain number and a ladder pair: rename the
     number legally, then rule how many times bigger — both exact, or no
     stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • ExponentRulesLab owns the factor train and the tiles of exponent
       algebra; no tile is drawn and no product-of-powers rule is stated —
       rung gaps are COUNTED on the picture, never derived by algebra.
     • PowersOfTenLab owns place-value climbing for young students; the
       phrase "place value" never appears here.
     • RoundingLab owns rounding; the sizes here are posted as "about"
       and never rounded on stage.
     • DecimalLab owns decimal place devices; the plain forms here exist
       only to be escaped from.
     • IntegerLab owns where negatives live; negative EXPONENTS here are
       rungs below the meter, cited as smallness, not position.

   One-accent discipline: CARMINE is THE FEATURED NUMBERS — the notation
   and the comparison verdicts.  GOLD is the window and the dial (the
   tool).  BLUE is the quiet pinned objects.  GREEN only for
   correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • A number is a pair (a10, n): an integer coefficient-in-tenths
       (10–99) and an integer exponent.  Every displayed string — the
       scientific form, the superscripts, and the written-out plain form —
       is built by integer string construction; no float is ever
       formatted.  Math.log appears only in the renderer, for pixels.
     • The audit re-derives every plain form independently and parses it
       back to (a10, n); it proves the illegal chips (34×10⁵, 0.34×10⁷)
       EQUAL the truth in value while wearing outlaw names, and that the
       wrong-value chip differs by exactly one rung.
     • Every posted pair shares its coefficient, so the ratio IS the rung
       gap: 10^(n₁−n₂), proved exactly for all pairs.
     • The astronomer's stamp needs two exact rulings (the legal rename,
       then the ratio), audited over every case × chip pair; the truth
       chip is always present and never duplicated.
   Verified by audit-scientificnotation.mjs (numeric proof + source greps)
   and verify-scientificnotation.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ScientificNotationLab.jsx
     2. Import and render it:
          import ScientificNotationLab from './ScientificNotationLab';
          export default function Page() { return <ScientificNotationLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the window, the
              lesson step, answers, the rulings).
     MODEL  — integer pairs (a10, n) and exact string construction.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the featured numbers and verdicts
const BLUE = '#3f74a6'; // the quiet pinned objects
const GOLD = '#b98718'; // the window and the dial
const INK_HEX = '#1c2b3a';

const WIN_SPAN = 7; // the window shows 7 rungs
const WIN_MIN = -10;
const WIN_MAX = 14; // window start; 14 … 21 reaches the galaxy
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Numbers are integer pairs (a10, n): coefficient-in-
   tenths and exponent.  All strings are built by integer construction.
   ------------------------------------------------------------------------- */
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map((c) => SUP[c]).join('');
const coefText = (a10) => (a10 % 10 === 0 ? `${a10 / 10}` : `${Math.trunc(a10 / 10)}.${a10 % 10}`);
const sciText = (a10, n) => `${coefText(a10)}×10${sup(n)}`;
/* the written-out plain form, by pure string construction */
const plainTextOf = (a10, n) => {
  let digits = String(a10).replace(/0+$/, '');
  const pow = n - 1 + (String(a10).length - digits.length);
  if (pow >= 0) return digits + '0'.repeat(pow);
  const shift = -pow;
  if (shift < digits.length) return digits.slice(0, digits.length - shift) + '.' + digits.slice(digits.length - shift);
  return '0.' + '0'.repeat(shift - digits.length) + digits;
};
/* the ladder's pinned objects — sizes in meters, posted as "about" */
const OBJECTS = {
  atom: { label: 'atom', a10: 10, n: -10 },
  virus: { label: 'virus', a10: 10, n: -7 },
  sand: { label: 'sand grain', a10: 50, n: -4 },
  ant: { label: 'ant', a10: 50, n: -3 },
  human: { label: 'human', a10: 20, n: 0 },
  whale: { label: 'blue whale', a10: 20, n: 1 },
  mountain: { label: 'mountain', a10: 90, n: 3 },
  earth: { label: 'Earth', a10: 10, n: 7 },
  sun: { label: 'Sun', a10: 10, n: 9 },
  solar: { label: 'solar system', a10: 90, n: 12 },
  lightyear: { label: 'light-year', a10: 90, n: 15 },
  galaxy: { label: 'galaxy', a10: 90, n: 20 },
};
/* a same-coefficient pair's ratio IS the rung gap */
const rungGap = (bigId, smallId) => OBJECTS[bigId].n - OBJECTS[smallId].n;
const ratioText = (bigId, smallId) => `×10${sup(rungGap(bigId, smallId))}`;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The astronomer's stamp."  A plain number and a
   ladder pair are posted; rename legally, then rule the ratio.
   ------------------------------------------------------------------------- */
const CASES = [
  { a10: 34, n: 6, big: 'sun', small: 'earth' },
  { a10: 72, n: 5, big: 'virus', small: 'atom' },
  { a10: 52, n: -4, big: 'whale', small: 'human' },
  { a10: 81, n: 7, big: 'galaxy', small: 'lightyear' },
  { a10: 90, n: -7, big: 'lightyear', small: 'solar' },
  { a10: 16, n: 3, big: 'ant', small: 'sand' },
];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const sciTruth = (i) => sciText(CASES[i].a10, CASES[i].n);
const sciChips = (i) => {
  const { a10, n } = CASES[i];
  const chips = [
    sciText(a10, n) /* the one legal name */,
    `${a10}×10${sup(n - 1)}` /* same value, outlaw coefficient */,
    sciText(a10, n - 1) /* legal dress, wrong rung */,
    `0.${a10}×10${sup(n + 1)}` /* same value, coefficient below 1 */,
  ];
  return chips.sort();
};
const RATIO_CHIPS = ['×10¹', '×10²', '×10³', '×10⁵'];
const ratioTruth = (i) => ratioText(CASES[i].big, CASES[i].small);
const calibChecks = (i, sciPick, ratioPick) => {
  if (i == null) return [false, false];
  const sciOK = sciPick != null && sciPick === sciTruth(i);
  const ratioOK = sciOK && ratioPick != null && ratioPick === ratioTruth(i);
  return [sciOK, ratioOK];
};
const closeness = (i, s, r) =>
  Math.round((100 * calibChecks(i, s, r).filter(Boolean).length) / 2);
const isCalibrated = (i, s, r) => calibChecks(i, s, r).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that rungs add, that the gap is
   the answer, that tiny numbers are all basically zero.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The unwritable number',
    body:
      'A hydrogen atom is about 0.0000000001 meters wide. Count the zeros — carefully. ' +
      'Scientific notation refuses that job: name the rung, state the coefficient.',
    win: -10,
    focus: ['atom'],
    q: 'Which is the honest name for the atom’s width?',
    choices: [
      '1×10⁻¹⁰ m — a coefficient of one, ten rungs below the meter',
      '10⁻¹ m, with nine decorative zeros',
      '0.000000001 m — nine zeros is close enough',
    ],
    answer: 0,
    feedback:
      'One miscounted zero is a tenfold error — that is why written-out zeros are the ' +
      'wrong technology for size. 1×10⁻¹⁰ carries the same fact in two readable parts: ' +
      'a coefficient and a rung. The ladder below is built from those rungs.',
  },
  {
    title: 'The ladder of rungs',
    body:
      'Pan the window from atom to galaxy. Every rung is one power of ten, and ' +
      'neighboring rungs differ by ×10 — at the bacteria and at the planets alike.',
    win: -4,
    pan: true,
    focus: [],
    q: 'What does moving up one rung DO to a size?',
    choices: [
      'Multiplies it by 10 — so three rungs is ×1000, not ×30',
      'Adds 10 to it',
      'It depends where you stand on the ladder',
    ],
    answer: 0,
    feedback:
      'Rungs multiply. Equal steps are equal FACTORS — that is the ladder’s whole trick. ' +
      'The atom-to-galaxy trip is thirty rungs, ×10³⁰, a number with no everyday name; ' +
      'adding was never in the game, anywhere on the ladder.',
  },
  {
    title: 'How many times as big',
    body:
      'The Sun sits at 1×10⁹ m and Earth at 1×10⁷ m. Same coefficient — so the ' +
      'comparison is pure rungs.',
    win: 4,
    pan: true,
    focus: ['earth', 'sun'],
    q: 'The Sun is … times as wide as Earth.',
    choices: [
      '100 — two rungs apart, 10² exactly',
      '2 — nine minus seven',
      '10⁹ — read the Sun’s rung',
    ],
    answer: 0,
    feedback:
      'Two rungs is ×10² = 100. The exponent GAP counts the rungs between two numbers; ' +
      'the classic error is reporting the gap (2) instead of climbing it (10²). This is ' +
      'what the notation is FOR: comparing sizes no ruler could hold, in one subtraction ' +
      'and one climb.',
  },
  {
    title: 'One address each',
    body:
      'The bench posts 25×10⁶. A legal name keeps ONE digit before the point: 2.5×10⁷ ' +
      '— the same number in its lawful dress.',
    win: 4,
    rename: true,
    focus: [],
    q: 'Why insist on 1 ≤ coefficient < 10?',
    choices: [
      'So every number gets exactly one address on the ladder — then exponents alone rank any two at a glance',
      'Because 25 is not allowed in mathematics',
      'To make the numbers smaller',
    ],
    answer: 0,
    feedback:
      '25×10⁶ and 2.5×10⁷ are the same number; the rule picks one canonical name so the ' +
      'ladder stays sortable — compare exponents first, coefficients as tie-breakers. ' +
      'Conventions serve readers, and this one turns every size comparison into a glance.',
  },
  {
    title: 'Tiny numbers too',
    body:
      'Below the meter the exponents turn negative: virus 1×10⁻⁷, atom 1×10⁻¹⁰. ' +
      'Negative rungs are smallness — counted exactly the same way.',
    win: -10,
    pan: true,
    focus: ['atom', 'virus'],
    q: 'Which is bigger, and by how much?',
    choices: [
      'The virus — 10⁻⁷ sits three rungs above 10⁻¹⁰: a thousand atoms across',
      'The atom — its exponent looks bigger',
      'Neither — both are basically zero',
    ],
    answer: 0,
    feedback:
      'Less negative means higher rung: −7 is three rungs above −10, so the virus is ' +
      '10³ = 1000 atoms wide. The exponent’s sign picks a side of the meter; the gap ' +
      'still counts rungs. Nothing about the ladder changes below one.',
  },
  {
    title: 'The astronomer’s stamp',
    body:
      'A plain number and a ladder pair are posted. Rename the number legally, then ' +
      'rule how many times bigger. Both exact, or no stamp.',
    win: 4,
    calib: true,
    focus: [],
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ScientificNotationLab() {
  const [winStart, setWinStart] = useState(-10);
  const [sciPick, setSciPick] = useState(null);
  const [ratioPick, setRatioPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;

  const checks = calib ? calibChecks(kase, sciPick, ratioPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, sciPick, ratioPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, sciPick, ratioPick) : false;

  const focus = calib && kase != null ? [CASES[kase].big, CASES[kase].small] : current.focus;
  sceneRef.current = { winStart, focus, rename: !!current.rename, calib, kase };

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

    const bandH = 56;
    const lineY = H * 0.55;
    const pad = 40;
    const kx = (W - 2 * pad) / WIN_SPAN;
    const px = (pos) => pad + (pos - S.winStart) * kx;

    /* the ladder's rail */
    ctx.strokeStyle = 'rgba(91,107,123,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(pad, lineY);
    ctx.lineTo(W - pad, lineY);
    ctx.stroke();
    /* rungs */
    for (let n = S.winStart; n <= S.winStart + WIN_SPAN; n++) {
      const x = px(n);
      ctx.strokeStyle = 'rgba(185,135,24,0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, lineY - 22);
      ctx.lineTo(x, lineY + 22);
      ctx.stroke();
      ctx.fillStyle = INK_HEX;
      ctx.font = '600 11.5px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`10${sup(n)}`, x, lineY + 28);
    }
    /* ×10 between the first two rungs */
    ctx.fillStyle = GOLD;
    ctx.font = '700 11px ui-monospace, monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillText('×10', px(S.winStart + 0.5), lineY - 26);

    /* the pinned objects */
    let flip = 1;
    for (const [id, o] of Object.entries(OBJECTS)) {
      const pos = o.n + Math.log10(o.a10 / 10); /* pixels only */
      if (pos < S.winStart - 0.2 || pos > S.winStart + WIN_SPAN + 0.2) continue;
      const x = px(pos);
      const featured = S.focus.includes(id);
      const y = lineY + (flip > 0 ? -52 : 58) - (featured ? 14 : 0) * flip;
      flip = -flip;
      ctx.fillStyle = featured ? CARMINE : BLUE;
      ctx.beginPath();
      ctx.arc(x, lineY, featured ? 6.5 : 4.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = featured ? '700 12px ui-monospace, monospace' : '600 11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.label, x, y);
      ctx.font = '600 10.5px ui-monospace, monospace';
      ctx.fillText(sciText(o.a10, o.n) + ' m', x, y + 15);
      ctx.strokeStyle = featured ? 'rgba(200,30,79,0.4)' : 'rgba(63,116,166,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, lineY + (flip > 0 ? -8 : 8) * -1);
      ctx.lineTo(x, y + (y < lineY ? 24 : -24));
      ctx.stroke();
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    let bandText;
    if (S.calib && S.kase != null) {
      const c = CASES[S.kase];
      bandText = `${plainTextOf(c.a10, c.n)} m · and: ${OBJECTS[c.big].label} vs ${OBJECTS[c.small].label}`;
    } else if (S.rename) {
      bandText = '25×10⁶ = 2.5×10⁷ — one number, one legal name';
    } else {
      bandText = `window: 10${sup(S.winStart)} … 10${sup(S.winStart + WIN_SPAN)} meters`;
    }
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
    const st = STEPS[step];
    setWinStart(st.win);
    setSciPick(null);
    setRatioPick(null);
    if (st.calib) setKase(makeCase(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setWinStart(current.win);
    setSciPick(null);
    setRatioPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? plainTextOf(CASES[kase].a10, CASES[kase].n) : ''} meters, and ${kase != null ? OBJECTS[CASES[kase].big].label + ' versus ' + OBJECTS[CASES[kase].small].label : ''}. Rename ${sciPick ?? 'unruled'}; ratio ${ratioPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `The ladder window runs from ten to the ${winStart} to ten to the ${winStart + WIN_SPAN} meters${focus.length ? '; featured: ' + focus.map((id) => `${OBJECTS[id].label} at ${sciText(OBJECTS[id].a10, OBJECTS[id].n)} meters`).join(', ') : ''}.`;

  return (
    <div className="snlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Scientific Notation: The Ladder of Rungs</h1>
        <p className="lede">
          From an atom to a galaxy is thirty rungs of ×10. A number in scientific
          notation is a <em>coefficient and a rung</em> — <span className="mono">a×10ⁿ</span>{' '}
          with one digit before the point — and comparing two sizes is counting the rungs
          between them.
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

          {current.pan && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the window</span>
                  <span className="dial-v mono">
                    10{sup(winStart)} … 10{sup(winStart + WIN_SPAN)}
                  </span>
                </div>
                <input
                  type="range"
                  min={WIN_MIN}
                  max={WIN_MAX}
                  step={1}
                  value={winStart}
                  onChange={(e) => setWinStart(Number(e.target.value))}
                  aria-label={`Window start, ten to the ${winStart}`}
                />
              </div>
            </div>
          )}

          <div className="toolbar" role="group" aria-label="Scene">
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

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted pair</span>
                <span className="target-word mono">{plainTextOf(CASES[kase].a10, CASES[kase].n)} m</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the legal rename, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} {OBJECTS[CASES[kase].big].label} vs {OBJECTS[CASES[kase].small].label}, ruled
                  </li>
                </ol>
                <div className="declare" role="group" aria-label="Rename ruling">
                  {sciChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (sciPick === c2 ? ' active' : '')}
                      onClick={() => setSciPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Ratio ruling">
                  {RATIO_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (ratioPick === c2 ? ' active' : '')}
                      onClick={() => setRatioPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — logged in the almanac'
                    : checks[0]
                      ? 'renamed — now count the rungs'
                      : 'one digit before the point'}
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
                  <span className="mono target-hint">the rename · then the rungs</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setSciPick(null);
                  setRatioPick(null);
                }}
              >
                Next case
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
                  setSciPick(null);
                  setRatioPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">a coefficient and a rung · rungs multiply · gaps count</span>{' '}
        &nbsp;·&nbsp; scientific notation gives every size one legal address on the ladder
        of tens, and turns comparison into counting rungs.
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
        .dials {
          margin: 12px 4px 0;
          display: grid;
          gap: 8px;
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
          color: var(--gold);
          font-weight: 700;
        }
        .dial input[type='range'] {
          width: 100%;
          accent-color: var(--gold);
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
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
        .declare {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .declbtn {
          font-size: 12.5px;
          font-weight: 700;
          padding: 7px 11px;
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
