'use client';

/* ============================================================================
   ComplexPlaneLab — an interactive "bench" for COMPLEX NUMBERS and the
   COMPLEX PLANE: ×i is a quarter-turn, i² = −1 is geometry, and with
   a + bi admitted every quadratic finally has its roots.

        a + bi  =  the address (a, b): a along the real floor, b up the wall
        ×i  =  a quarter-turn of the whole plane   ·   (a, b) → (−b, a)
        i² = −1  — two quarter-turns are the half-turn
        i⁴ = 1  — four turns and every arm is home

   Built for MAIS (math AI system, www.mais.ac), K-12.  GRADES 9–12 ·
   CCSS N-CN.A.1–2, N-CN.C.7.  SignedNumbersLab proved ×(−1) turns the
   number line halfway around; this bench is its exact sibling: ×i is the
   half of that gesture the LINE could never hold.  It also retires
   QuadraticEquationLab's "no real solution" — the Δ < 0 case closes here.

   THE SIGNATURE CENTERPIECE — "THE QUARTER-TURN NUMBER."
     An arm from the origin to a Gaussian-integer address, and a press
     counter for ×i.  Press once: 1 becomes i.  Twice: −1 — which is why
     i² = −1 is a fact about turning, not a decree.  Four times: home,
     so the powers of i circulate forever and i²⁶ is settled by a
     remainder.  Load the arm with 2 + i and the same press turns it to
     −1 + 2i — perpendicular, length² intact: the whole plane turns at
     once.  Then the payoff: 1 ± 2i solve x² − 2x + 5 = 0 on the nose,
     checked in exact integer arithmetic.  The capstone posts an arm, a
     press count, and one lonely power of i: rule the landing, then the
     power — both exact, or no stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • SignedNumbersLab owns ×(−1) as the half-turn of the LINE and the
       parity of chains; it is cited by name as this bench's sibling, and
       nothing here re-proves the one-dimensional case.
     • SignedAdditionLab owns tip-to-tail arrow marches; no addition is
       chained here — a + bi is read as an ADDRESS, not a march.
     • UnitCircleLab owns the wrapping and the radian; no circle is drawn
       and no angle is measured — turns are counted in presses.
     • TransformationsLab owns naming the rigid motions on shapes; the
       turn here is an arithmetic FACT about numbers, never a named
       motion applied to a polygon.
     • QuadraticEquationLab owns completing the square and the ± of Δ;
       its unfinished Δ < 0 case is closed here by direct substitution.
     • IntegerLab owns the mirror at zero; conjugate partners here are
       described across the real floor without that device.
     • Math.sin, Math.cos, Math.atan and Math.sqrt appear NOWHERE — even
       the renderer works from integer coordinates.

   One-accent discipline: CARMINE is THE ARM — the current number, the
   verdicts.  GOLD is the press counter and ghosts of earlier positions
   (the tool).  BLUE is the quiet grid and axis labels.  GREEN only for
   correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Every number on this bench is a Gaussian integer (a, b).  ×i is
       the exact map (a, b) → (−b, a); general products use exact integer
       FOIL with i² = −1.  No float exists in the model, and no trig
       exists anywhere in the file.
     • The audit proves: mulI agrees with mulC(z, i) everywhere on the
       grid; four presses return every arm; each press preserves length²
       and lands perpendicular to the previous arm (dot product zero,
       exactly); the powers of i cycle with remainder arithmetic checked
       out to m = 100; and (1 ± 2i) solve x² − 2x + 5 = 0 by exact
       substitution.
     • The navigator's stamp needs two exact rulings (the landing, then
       the lonely power), audited over every posted case × chip pair;
       the truth chip is always present and never duplicated.
   Verified by audit-complexplane.mjs (numeric proof + source greps) and
   verify-complexplane.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ComplexPlaneLab.jsx
     2. Import and render it:
          import ComplexPlaneLab from './ComplexPlaneLab';
          export default function Page() { return <ComplexPlaneLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the arm, the
              press count, the lesson step, answers, the rulings).
     MODEL  — exact Gaussian-integer arithmetic; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the arm — the current number
const BLUE = '#3f74a6'; // the quiet grid
const GOLD = '#b98718'; // the press counter and the ghosts
const INK_HEX = '#1c2b3a';

const PRESS_MAX = 8; // the ×i press counter
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact Gaussian-integer arithmetic.
   ------------------------------------------------------------------------- */
const mulI = (z) => ({ re: -z.im, im: z.re }); /* ×i: (a, b) → (−b, a) */
const mulC = (z, w) => ({
  re: z.re * w.re - z.im * w.im,
  im: z.re * w.im + z.im * w.re,
}); /* exact FOIL with i² = −1 */
const addC = (z, w) => ({ re: z.re + w.re, im: z.im + w.im });
const rotK = (z, k) => {
  let out = z;
  for (let j = 0; j < ((k % 4) + 4) % 4; j++) out = mulI(out);
  return out;
};
const powI = (m) => rotK({ re: 1, im: 0 }, m); /* i^m as the unit arm, turned */
const len2 = (z) => z.re * z.re + z.im * z.im; /* length², always an integer */
const dot = (z, w) => z.re * w.re + z.im * w.im;
const fmtSignedC = (v) => (v < 0 ? `−${-v}` : `${v}`);
const fmtC = (z) => {
  const { re, im } = z;
  if (im === 0) return fmtSignedC(re);
  const mag = Math.abs(im) === 1 ? '' : `${Math.abs(im)}`;
  if (re === 0) return `${im < 0 ? '−' : ''}${mag}i`;
  return `${fmtSignedC(re)} ${im < 0 ? '−' : '+'} ${mag}i`;
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The navigator's stamp."  An arm and a press
   count are posted, plus one lonely power of i.
   ------------------------------------------------------------------------- */
const ARMS = [
  { re: 2, im: 1 },
  { re: 1, im: 2 },
  { re: 3, im: -1 },
  { re: -2, im: 1 },
  { re: 1, im: -3 },
];
const CASES = [
  { z: 0, k: 1, m: 26 },
  { z: 1, k: 2, m: 17 },
  { z: 2, k: 3, m: 100 },
  { z: 3, k: 1, m: 39 },
  { z: 4, k: 2, m: 51 },
  { z: 0, k: 3, m: 64 },
];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const armTruth = (i) => fmtC(rotK(ARMS[CASES[i].z], CASES[i].k));
const armChips = (i) => {
  const z = ARMS[CASES[i].z];
  return [0, 1, 2, 3].map((k) => fmtC(rotK(z, k))).sort();
};
const POWER_CHIPS = ['1', 'i', '−1', '−i'];
const powTruth = (i) => fmtC(powI(CASES[i].m));
const calibChecks = (i, armPick, powPick) => {
  if (i == null) return [false, false];
  const armOK = armPick != null && armPick === armTruth(i);
  const powOK = armOK && powPick != null && powPick === powTruth(i);
  return [armOK, powOK];
};
const closeness = (i, a, p) =>
  Math.round((100 * calibChecks(i, a, p).filter(Boolean).length) / 2);
const isCalibrated = (i, a, p) => calibChecks(i, a, p).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that imaginary means fake, that
   i·i is 2i, that even powers must be positive, that Δ < 0 is the end.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A number off the line',
    body:
      'Numbers gain a second direction: the real floor runs left-right, the imaginary ' +
      'wall climbs. i lives one unit up. Every complex number a + bi is an address — ' +
      'a along, b up.',
    arm: { re: 3, im: 2 },
    presses: 0,
    q: 'Where does 3 + 2i live?',
    choices: [
      '(3, 2) — three along the real floor, two up the wall; one number, two coordinates',
      'At 5 — just add the parts',
      'Nowhere — imaginary means invented',
    ],
    answer: 0,
    feedback:
      'A complex number is a two-part number, plotted as a point — or an arm from the ' +
      'origin. “Imaginary” is a four-century-old insult that stuck; the wall direction ' +
      'is as concrete as the floor once numbers are allowed a plane. The real question, ' +
      'answered next: what does i DO?',
  },
  {
    title: 'The ×i machine',
    body:
      'Load the arm with 1 and press ×i. Again. Read the arm each time: 1, then i, ' +
      'then… watch where two presses land.',
    arm: { re: 1, im: 0 },
    presses: 0,
    dial: true,
    q: 'Two presses of ×i do what one press of ×(−1) does. So i² = …',
    choices: [
      '−1 — a quarter-turn twice is the half-turn; i² = −1 is geometry, not decree',
      '2i — i times i doubles it',
      'Nothing — i² cannot be evaluated',
    ],
    answer: 0,
    feedback:
      'i² = −1. The signed-numbers bench showed ×(−1) turning the whole line halfway ' +
      'around; ×i is the half of that gesture the line could never hold — a quarter-turn ' +
      'needs a plane. i is not a trick number: it is the name of the turn whose square ' +
      'is the half-turn.',
  },
  {
    title: 'Four turns home',
    body:
      'Keep pressing: i³ = −i, and i⁴ = 1 — home. The powers of i circulate every four ' +
      'presses, forever; they never grow.',
    arm: { re: 1, im: 0 },
    presses: 4,
    dial: true,
    q: 'i²⁶ = ?',
    choices: [
      '−1 — twenty-six presses is six full trips plus two; only the remainder matters',
      'An enormous number — twenty-six multiplications',
      '1 — even powers are always positive',
    ],
    answer: 0,
    feedback:
      'i²⁶ = i² = −1, because 26 = 4 · 6 + 2 and every four presses come home. Powers ' +
      'of i circulate instead of growing, so the remainder after dividing by four decides ' +
      'everything — huge exponents collapse to one line of arithmetic.',
  },
  {
    title: 'Any arm, same turn',
    body:
      'Load the arm with 2 + i and press ×i once: the whole plane turns a quarter, ' +
      'every arm with it.',
    arm: { re: 2, im: 1 },
    presses: 1,
    dial: true,
    q: '(2 + i) · i = ?',
    choices: [
      '−1 + 2i — the arm turns a quarter and keeps its length',
      '3i — collect the i’s',
      '2 − i — the sign hops to the other part',
    ],
    answer: 0,
    feedback:
      '(2 + i)·i = 2i + i² = −1 + 2i. Check the picture: the addresses (2, 1) and ' +
      '(−1, 2) are perpendicular, and both arms carry length² = 5. Multiplying by i turns ' +
      'EVERY number a quarter, exactly — the algebra and the geometry are one machine.',
  },
  {
    title: 'The closed shop',
    body:
      'The quadratic bench had to say “no real solution” whenever Δ < 0. This plane ' +
      'retires the sentence: x² + 1 = 0 has roots ±i, and x² − 2x + 5 = 0 has roots ' +
      '1 ± 2i.',
    arm: { re: 1, im: 2 },
    presses: 0,
    roots: true,
    q: 'How would you CHECK that 1 + 2i solves x² − 2x + 5 = 0?',
    choices: [
      'Substitute and compute with i² = −1: (1 + 2i)² − 2(1 + 2i) + 5 lands exactly on 0',
      'Graph it and look for x-axis crossings',
      'You cannot check claims about imaginary numbers',
    ],
    answer: 0,
    feedback:
      '(1 + 2i)² = 1 + 4i + 4i² = −3 + 4i; subtract 2 + 4i, add 5: zero, exactly. ' +
      'Complex arithmetic is checkable arithmetic — no faith required. With a + bi ' +
      'admitted, every quadratic owns its two roots, and this plane is the receipt.',
  },
  {
    title: 'The navigator’s stamp',
    body:
      'An arm and a press count are posted, plus one lonely power of i. Rule where the ' +
      'arm lands, then rule the power. Both exact, or no stamp.',
    arm: { re: 2, im: 1 },
    presses: 0,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ComplexPlaneLab() {
  const [presses, setPresses] = useState(0);
  const [armPick, setArmPick] = useState(null);
  const [powPick, setPowPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const baseArm = calib && kase != null ? ARMS[CASES[kase].z] : current.arm;
  const kNow = calib && kase != null ? CASES[kase].k : presses;

  const checks = calib ? calibChecks(kase, armPick, powPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, armPick, powPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, armPick, powPick) : false;

  sceneRef.current = {
    z: baseArm,
    k: kNow,
    roots: !!current.roots,
    calib,
    kase,
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

    const bandH = 54;
    const cx = W / 2;
    const cy = bandH + (H - bandH) / 2;
    const R = 4.6; /* world half-range */
    const scale = Math.min((W - 60) / (2 * R), (H - bandH - 40) / (2 * R));
    const px = (re, im) => [cx + re * scale, cy - im * scale];

    /* axes */
    ctx.strokeStyle = 'rgba(91,107,123,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(...px(-R, 0));
    ctx.lineTo(...px(R, 0));
    ctx.moveTo(...px(0, -R));
    ctx.lineTo(...px(0, R));
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 10.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = -4; v <= 4; v++) {
      if (v === 0) continue;
      ctx.fillText(String(v), px(v, 0)[0], px(0, 0)[1] + 6);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(v === 1 ? 'i' : v === -1 ? '−i' : `${fmtSignedC(v)}i`, px(0, 0)[0] - 6, px(0, v)[1]);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
    }
    ctx.fillStyle = BLUE;
    ctx.font = 'italic 600 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('real', px(R, 0)[0] - 26, px(0, 0)[1] + 18);
    ctx.fillText('imaginary', px(0, R)[0] + 8, px(0, R)[1] + 2);

    const arm = (z, color, lw, withDot) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(...px(0, 0));
      ctx.lineTo(...px(z.re, z.im));
      ctx.stroke();
      if (withDot) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(...px(z.re, z.im), 5.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    };

    if (S.roots) {
      /* the closed shop: the conjugate root pair */
      const r1 = { re: 1, im: 2 };
      const r2 = { re: 1, im: -2 };
      arm(r1, CARMINE, 2.4, true);
      arm(r2, 'rgba(200,30,79,0.55)', 2, true);
      ctx.fillStyle = CARMINE;
      ctx.font = '700 12.5px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('1 + 2i', px(1, 2)[0] + 8, px(1, 2)[1]);
      ctx.textBaseline = 'top';
      ctx.fillText('1 − 2i', px(1, -2)[0] + 8, px(1, -2)[1]);
    } else {
      /* the ghosts of earlier presses, then the arm */
      for (let j = 0; j < ((S.k % 4) + 4) % 4; j++) arm(rotK(S.z, j), 'rgba(185,135,24,0.4)', 1.6, false);
      const zNow = rotK(S.z, S.k);
      arm(zNow, S.calib ? 'rgba(200,30,79,0.35)' : CARMINE, 2.8, !S.calib);
      ctx.fillStyle = CARMINE;
      ctx.font = '700 12.5px ui-monospace, monospace';
      ctx.textAlign = zNow.re >= 0 ? 'left' : 'right';
      ctx.textBaseline = zNow.im >= 0 ? 'bottom' : 'top';
      ctx.fillText(
        S.calib ? '?' : fmtC(zNow),
        px(zNow.re, zNow.im)[0] + (zNow.re >= 0 ? 8 : -8),
        px(zNow.re, zNow.im)[1] + (zNow.im >= 0 ? -4 : 4)
      );
      /* the loaded arm, always visible in calib */
      if (S.calib) {
        arm(S.z, BLUE, 2.2, true);
        ctx.fillStyle = BLUE;
        ctx.textAlign = S.z.re >= 0 ? 'left' : 'right';
        ctx.textBaseline = S.z.im >= 0 ? 'bottom' : 'top';
        ctx.fillText(fmtC(S.z), px(S.z.re, S.z.im)[0] + (S.z.re >= 0 ? 8 : -8), px(S.z.re, S.z.im)[1] + (S.z.im >= 0 ? -4 : 4));
      }
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    let bandText;
    if (S.calib && S.kase != null) {
      const c = CASES[S.kase];
      bandText = `${fmtC(ARMS[c.z])} · press ×i ${c.k} time${c.k > 1 ? 's' : ''} · and: i${String(c.m).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]).join('')}`;
    } else if (S.roots) {
      bandText = 'x² − 2x + 5 = 0 · roots 1 ± 2i · checked exactly';
    } else {
      const zNow = rotK(S.z, S.k);
      bandText = `${fmtC(S.z)} · ×i pressed ${S.k}× → ${fmtC(zNow)} · length² ${len2(zNow)}`;
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
    setPresses(st.presses);
    setArmPick(null);
    setPowPick(null);
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
    setPresses(current.presses);
    setArmPick(null);
    setPowPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? `${fmtC(ARMS[CASES[kase].z])}, ${CASES[kase].k} presses, and i to the ${CASES[kase].m}` : ''}. Landing ${armPick ?? 'unruled'}; power ${powPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : current.roots
      ? 'The roots 1 plus 2i and 1 minus 2i, plotted; the check lands exactly on zero.'
      : `${fmtC(baseArm)} with ${kNow} presses of times i: now ${fmtC(rotK(baseArm, kNow))}, length squared ${len2(rotK(baseArm, kNow))}.`;

  return (
    <div className="cplab">
      <header className="head">
        <h1>The Complex Plane: The Quarter-Turn Number</h1>
        <p className="lede">
          A complex number <span className="mono">a + bi</span> is an address on a plane
          of numbers — and multiplying by i turns every arm a quarter. Two turns make the
          half-turn, so <em>i² = −1 is geometry</em>; four turns come home, and every
          quadratic finally gets its roots.
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

          {current.dial && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the ×i press counter</span>
                  <span className="dial-v mono">
                    {presses} press{presses === 1 ? '' : 'es'} · i
                    {String(presses).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]).join('')} ={' '}
                    {fmtC(powI(presses))}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={PRESS_MAX}
                  step={1}
                  value={presses}
                  onChange={(e) => setPresses(Number(e.target.value))}
                  aria-label={`Times i, pressed ${presses} times`}
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
                <span className="target-k">The posted course</span>
                <span className="target-word mono">
                  {fmtC(ARMS[CASES[kase].z])} · ×i pressed {CASES[kase].k}×
                </span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the landing, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} i
                    {String(CASES[kase].m).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]).join('')}, ruled
                  </li>
                </ol>
                <div className="declare" role="group" aria-label="Landing ruling">
                  {armChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (armPick === c2 ? ' active' : '')}
                      onClick={() => setArmPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Power ruling">
                  {POWER_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (powPick === c2 ? ' active' : '')}
                      onClick={() => setPowPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — course plotted'
                    : checks[0]
                      ? 'landed — now the lonely power'
                      : 'a quarter-turn per press'}
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
                  <span className="mono target-hint">the landing · then the power</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setArmPick(null);
                  setPowPick(null);
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
                  setArmPick(null);
                  setPowPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">a + bi is an address · ×i is a quarter-turn · i² = −1</span>{' '}
        &nbsp;·&nbsp; two turns make the signed bench’s half-turn, four come home, and the
        quadratic bench’s Δ &lt; 0 verdicts are hereby overturned.
      </footer>

      <style jsx>{`
        .cplab {
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
        :global(.cplab) :focus-visible {
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
