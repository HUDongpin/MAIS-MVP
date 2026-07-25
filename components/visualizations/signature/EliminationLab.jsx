'use client';

/* ============================================================================
   EliminationLab — an interactive "bench" for WHY ELIMINATION IS ALLOWED: you
   may replace one equation of a system by that equation plus a multiple of the
   other, and the solution does not move.

        E₂  →  E₂ + k·E₁          the line swings…
        the crossing point         …and the crossing stays exactly put
        D = a₁b₂ − a₂b₁            the determinant is UNCHANGED by the move
        and so are Dx and Dy       so the solution is identically the same

   Built for MAIS (math AI system, www.mais.ac), K-12.  GRADES 9–11 —
   CCSS A-REI.C.5 ("Prove that, given a system of two equations in two
   variables, replacing one equation by the sum of that equation and a multiple
   of the other produces a system with the same solutions").

   ---------------------------------------------------------------------------
   HOW THIS LAB STAYS DISTINCT  (the library's hard rule)
   ---------------------------------------------------------------------------
     • SystemsOfEquationsLab — owns WHAT a system is: two lines, the crossing
                        point, and "one, none, or infinitely many". Its "add the
                        second equation" step adds a LINE TO THE PICTURE. This
                        bench adds an EQUATION TO AN EQUATION, which is a
                        different act entirely, and it is the act A-REI.5 is
                        about. This bench never re-teaches what a system is.
     • SubstitutionLab — owns the OTHER legal move: replacing a letter by
                        something equal to it. Elimination and substitution are
                        siblings; this bench cites substitution rather than
                        re-deriving it.
     • MatrixLab      — owns the matrix form of a system and the inverse.
     • EquationLab    — owns the balance scale for ONE equation.

   What no sibling owns: the INVARIANT. The move is legal not because a teacher
   says so but because the crossing point provably cannot move — and the bench
   makes that provable rather than plausible, by showing the determinant and
   both numerators come out to the very same integers after the move.

   EXACT INTEGER ARITHMETIC. Coefficients are whole numbers, so the solution is
   an exact pair of REDUCED FRACTIONS from Cramer's rule (Dx/D, Dy/D) — never a
   decimal. The invariance is an INTEGER IDENTITY: D' = D, Dx' = Dx, Dy' = Dy,
   exactly, for every k. The CALIBRATED stamp is an integer equality (a
   coefficient hitting exactly zero), which a rounded value could never fire.

   The block between MODEL:START and MODEL:END is pure, React-free JavaScript;
   audit-elimination.mjs slices it out and evaluates it, so the audit tests the
   code that ships.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==== MODEL:START — pure math. No React, no pixels, no DOM. =============== */

const K_MIN = -5, K_MAX = 5;          // the multiplier applied to E₁
const COEF_MIN = -6, COEF_MAX = 6;

const gcdI = (x, y) => (y ? gcdI(y, Math.abs(x % y)) : Math.abs(x));

function frac(n, d) {
  if (d === 0) return null;
  const s = d < 0 ? -1 : 1;
  const nn = n * s, dd = d * s;
  const g = gcdI(nn, dd) || 1;
  return { n: nn / g, d: dd / g };
}
const fracString = (f) => (f == null ? '—' : f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
const fracValue = (f) => (f == null ? NaN : f.n / f.d);
const eqF = (p, q) => p != null && q != null && p.n === q.n && p.d === q.d;

/* an equation ax + by = c, all whole numbers */
const eq = (a, b, c) => ({ a, b, c });

/* THE MOVE: E₂ ← E₂ + k·E₁. Whole numbers in, whole numbers out. */
const combine = (E1, E2, k) => eq(E2.a + k * E1.a, E2.b + k * E1.b, E2.c + k * E1.c);
/* and its inverse — the move is reversible, which is half the proof */
const undoCombine = (E1, E2p, k) => eq(E2p.a - k * E1.a, E2p.b - k * E1.b, E2p.c - k * E1.c);

/* Cramer's rule, exact. D = 0 means the lines are parallel or identical, and the
   bench says so rather than inventing a point. */
const detD = (E1, E2) => E1.a * E2.b - E2.a * E1.b;
const detDx = (E1, E2) => E1.c * E2.b - E2.c * E1.b;
const detDy = (E1, E2) => E1.a * E2.c - E2.a * E1.c;
function solve(E1, E2) {
  const D = detD(E1, E2);
  if (D === 0) return null;
  return { x: frac(detDx(E1, E2), D), y: frac(detDy(E1, E2), D), D };
}
/* does a point satisfy an equation? An exact rational check, never a distance. */
function satisfies(E, P) {
  if (P == null) return false;
  // a·x + b·y = c, with x = px.n/px.d and y = py.n/py.d
  const lhsN = E.a * P.x.n * P.y.d + E.b * P.y.n * P.x.d;
  const rhsN = E.c * P.x.d * P.y.d;
  return lhsN === rhsN;
}

/* THE INVARIANT, computed rather than asserted: the three determinants after
   the move are the SAME INTEGERS as before. This is the whole proof of
   A-REI.5, and the bench prints both columns so a student can compare them. */
function invariant(E1, E2, k) {
  const E2p = combine(E1, E2, k);
  return {
    E2p,
    before: { D: detD(E1, E2), Dx: detDx(E1, E2), Dy: detDy(E1, E2) },
    after: { D: detD(E1, E2p), Dx: detDx(E1, E2p), Dy: detDy(E1, E2p) },
    get holds() {
      return this.before.D === this.after.D
        && this.before.Dx === this.after.Dx
        && this.before.Dy === this.after.Dy;
    },
  };
}

/* the multiplier that kills a chosen coefficient of E₂, when a whole one exists.
   Killing x needs a₂ + k·a₁ = 0, i.e. k = −a₂/a₁ — a whole number only when a₁
   divides a₂. The bench is honest when no whole k works. */
function killK(E1, E2, which) {
  const num = which === 'x' ? -E2.a : -E2.b;
  const den = which === 'x' ? E1.a : E1.b;
  if (den === 0) return null;
  if (num % den !== 0) return null;
  const k = num / den;
  if (k < K_MIN || k > K_MAX) return null;
  return k;
}

/* ---- parameters --------------------------------------------------------- */
const DIALS = [{ key: 'k', label: 'k — the multiple of E₁ added to E₂', min: K_MIN, max: K_MAX, step: 1 }];
/* a system with a clean crossing, and coefficients that make a whole-number
   elimination reachable in both variables */
const E1_0 = eq(1, 2, 4);    //  x + 2y = 4
const E2_0 = eq(3, -1, 5);   // 3x −  y = 5   → crossing at (2, 1)
const START = { k: 0 };

/* ---- calibration --------------------------------------------------------
   "The eliminator's stamp." A variable is posted; find the k that removes it
   from E₂ entirely. CALIBRATED is an exact integer zero — a coefficient of
   0.0001 is not a coefficient of 0, and only the integer fires the stamp. */
const CALIB_SYSTEMS = [
  { E1: eq(1, 2, 4), E2: eq(3, -1, 5) },
  { E1: eq(2, 1, 5), E2: eq(-4, 3, 5) },
  { E1: eq(1, -3, -2), E2: eq(2, 1, 3) },
  { E1: eq(3, 1, 7), E2: eq(-3, 2, 2) },
  { E1: eq(1, 4, 9), E2: eq(5, -2, 1) },
];
function makeTarget(prev, rnd) {
  const rand = rnd || Math.random;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  let t = null, guard = 0;
  while (guard < 999) {
    guard += 1;
    const sys = pick(CALIB_SYSTEMS);
    const which = rand() < 0.5 ? 'x' : 'y';
    const k = killK(sys.E1, sys.E2, which);
    if (k == null || k === 0) continue;             // 0 would be already solved
    if (detD(sys.E1, sys.E2) === 0) continue;       // the system must have a crossing
    if (prev && prev.E1.a === sys.E1.a && prev.E1.b === sys.E1.b && prev.which === which) continue;
    t = { E1: sys.E1, E2: sys.E2, which, k };
    break;
  }
  return t || { E1: E1_0, E2: E2_0, which: 'x', k: killK(E1_0, E2_0, 'x') };
}
function isCalibrated(k, target) {
  if (!target) return false;
  const E2p = combine(target.E1, target.E2, k);
  const coef = target.which === 'x' ? E2p.a : E2p.b;
  return coef === 0;
}
function matchPercent(k, target) {
  if (!target) return 0;
  const E2p = combine(target.E1, target.E2, k);
  const coef = Math.abs(target.which === 'x' ? E2p.a : E2p.b);
  const worst = Math.abs(target.which === 'x' ? target.E2.a : target.E2.b) + Math.abs(K_MAX) * 6;
  return Math.max(0, Math.min(100, 100 * (1 - coef / (worst || 1))));
}

/* ---- the lesson ---------------------------------------------------------- */
const STEPS = [
  {
    title: 'One crossing, two descriptions',
    focus: 'system',
    unlock: 0,
    body:
      'Two equations, two lines, one crossing. The crossing is the SOLUTION — the single (x, y) that ' +
      'makes both true at once. Everything that follows is about changing the equations without ' +
      'losing that point.',
    q: 'What exactly is “the solution” of this system?',
    choices: [
      'The one point lying on BOTH lines at once',
      'Any point on either line',
      'The point where either line meets an axis',
    ],
    answer: 0,
    feedback:
      'A single equation has a whole line of solutions; the system asks which of those also satisfies ' +
      'the other. SystemsOfEquationsLab builds that idea in full — this bench takes it as read and ' +
      'asks what you are ALLOWED to do to the equations.',
  },
  {
    title: 'Swing the second line',
    focus: 'move',
    unlock: 1,
    body:
      'Now the move itself: replace E₂ by E₂ + k·E₁. Turn the dial and watch. The second line swings ' +
      'to a genuinely different line — different slope, different intercept — and yet the crossing ' +
      'point does not budge, for any k you choose.',
    q: 'The new line is clearly a different line. Why is the crossing unmoved?',
    choices: [
      'The old crossing satisfies both equations, so it satisfies any combination of them',
      'Because the lines happen to be arranged conveniently',
      'It does move — the picture is just too small to show it',
    ],
    answer: 0,
    feedback:
      'If a point makes E₁ true and E₂ true, then it makes E₂ + k·E₁ true as well — you are adding ' +
      'zero to zero. So no solution is LOST. The next step handles the other half: none is GAINED.',
  },
  {
    title: 'Nothing lost, nothing gained',
    focus: 'reverse',
    unlock: 1,
    body:
      'Half a proof is not a proof. Losing no solutions is easy; the danger is GAINING one. But the ' +
      'move is reversible: subtract k·E₁ from the new equation and E₂ comes back exactly. So any ' +
      'solution of the new system is a solution of the old one too. The two systems have identical ' +
      'solution sets.',
    q: 'Why does reversibility matter to the proof?',
    choices: [
      'It shows no NEW solutions appear — the new system implies the old one just as much',
      'It lets you undo a mistake with the dial',
      'It does not matter; losing no solutions is enough',
    ],
    answer: 0,
    feedback:
      'Equivalence runs both ways. Forward: every old solution survives. Backward: every new solution ' +
      'was already an old one, because you can undo the move. Only both together make the systems ' +
      'EQUIVALENT rather than merely related.',
  },
  {
    title: 'The invariant, in whole numbers',
    focus: 'invariant',
    unlock: 1,
    body:
      'Here is the same claim with nothing left to trust. Cramer’s rule reads the crossing off three ' +
      'determinants: D, Dx, Dy. Compare the two columns as you turn the dial — the k terms cancel and ' +
      'all three come out the SAME INTEGERS. The solution is not merely close; it is the identical ' +
      'pair of fractions.',
    q: 'D = a₁b₂ − a₂b₁. After the move, D′ = a₁(b₂ + k·b₁) − (a₂ + k·a₁)b₁. Why is D′ = D?',
    choices: [
      'The two k·a₁b₁ terms appear with opposite signs and cancel',
      'Because k is a whole number',
      'They are not equal in general — only for this system',
    ],
    answer: 0,
    feedback:
      'Expand: a₁b₂ + k·a₁b₁ − a₂b₁ − k·a₁b₁ = a₁b₂ − a₂b₁ = D. The k vanishes algebraically, for ' +
      'every k and every system — which is why the crossing cannot move no matter how far you swing ' +
      'the line.',
  },
  {
    title: 'The point of it all',
    focus: 'purpose',
    unlock: 1,
    body:
      'Why bother swinging a line at all? Because one particular k makes a coefficient hit exactly ' +
      'zero — and an equation with no x in it is an equation you can solve on sight. That is ' +
      'elimination: use a legal move to reach an easy system.',
    q: 'What makes the resulting system easier, given it has the same solution?',
    choices: [
      'One equation now has a single unknown, so it can be solved directly',
      'The numbers are smaller',
      'It is not easier — it is only tidier',
    ],
    answer: 0,
    feedback:
      'Equivalence is what makes the move SAFE; the zero coefficient is what makes it USEFUL. You ' +
      'have not changed the answer, you have changed how much work is left to read it off.',
  },
  {
    title: 'The eliminator’s stamp',
    focus: 'calib',
    unlock: 1,
    body:
      'Last challenge. A variable is posted. Find the k that removes it from E₂ completely. The stamp ' +
      'wants an exact zero coefficient — nearly gone is still there. Press New target for another.',
    calib: true,
  },
];

/* ==== MODEL:END ========================================================== */

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function EliminationLab() {
  const [k, setK] = useState(START.k);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const focus = current.focus;

  const E1 = current.calib && target ? target.E1 : E1_0;
  const E2 = current.calib && target ? target.E2 : E2_0;
  const E2p = combine(E1, E2, k);
  const inv = invariant(E1, E2, k);
  const sol = solve(E1, E2);
  const solAfter = solve(E1, E2p);

  sceneRef.current = { E1, E2, E2p, k, focus, sol, target };

  const calibrated = current.calib && target ? isCalibrated(k, target) : false;
  const pct = current.calib && target ? matchPercent(k, target) : 0;

  const draw = useCallback(() => {
    const stage = stageRef.current, canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const INK = '#1c2b3a', SOFT = '#5b6b7b', CARM = '#c81e4f', BLUE = '#3a6ea5';
    const GOLD = '#b8860b', OK = '#1f8a5b', QUAD = '#c7d8e4';

    const LIMV = 8, pad = 20;
    const size = Math.min(W, H) - pad * 2;
    const ox = W / 2, oy = H / 2, u = size / (2 * LIMV);
    const px = (x) => ox + x * u, py = (y) => oy - y * u;

    ctx.lineWidth = 1; ctx.strokeStyle = QUAD;
    for (let g = -LIMV; g <= LIMV; g++) {
      ctx.globalAlpha = g === 0 ? 0 : 0.5;
      ctx.beginPath(); ctx.moveTo(px(g), py(-LIMV)); ctx.lineTo(px(g), py(LIMV)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px(-LIMV), py(g)); ctx.lineTo(px(LIMV), py(g)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(28,43,58,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px(-LIMV), py(0)); ctx.lineTo(px(LIMV), py(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(0), py(-LIMV)); ctx.lineTo(px(0), py(LIMV)); ctx.stroke();

    /* draw ax + by = c across the window */
    const line = (E, color, width, dash) => {
      if (E.a === 0 && E.b === 0) return;
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.save(); if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      if (E.b !== 0) {
        const y1 = (E.c - E.a * -LIMV) / E.b, y2 = (E.c - E.a * LIMV) / E.b;
        ctx.moveTo(px(-LIMV), py(y1)); ctx.lineTo(px(LIMV), py(y2));
      } else {
        const x0 = E.c / E.a;
        ctx.moveTo(px(x0), py(-LIMV)); ctx.lineTo(px(x0), py(LIMV));
      }
      ctx.stroke(); ctx.restore();
    };

    // the original E₂, kept as a ghost so the swing is visible
    if (S.k !== 0) line(S.E2, 'rgba(91,107,123,0.45)', 2, [5, 5]);
    line(S.E1, CARM, 3);
    line(S.E2p, BLUE, 3);

    // the crossing — the thing that does not move
    if (S.sol) {
      const sx = fracValue(S.sol.x), sy = fracValue(S.sol.y);
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(px(sx), py(sy), 13, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.beginPath(); ctx.arc(px(sx), py(sy), 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.font = '700 13px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`(${fracString(S.sol.x)}, ${fracString(S.sol.y)})`, px(sx) + 17, py(sy) - 12);
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = SOFT;
      ctx.fillText('unmoved', px(sx) + 17, py(sy) + 5);
    } else {
      ctx.fillStyle = CARM; ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('these lines never cross (D = 0)', W / 2, 10);
    }

    // the two equations, printed
    const eqStr = (E) => `${E.a}x ${E.b < 0 ? '−' : '+'} ${Math.abs(E.b)}y = ${E.c}`;
    ctx.font = '600 13px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = CARM; ctx.fillText(`E₁ : ${eqStr(S.E1)}`, 12, 10);
    ctx.fillStyle = BLUE;
    ctx.fillText(`E₂${S.k !== 0 ? '′' : ' '}: ${eqStr(S.E2p)}`, 12, 30);
    if (S.k !== 0) {
      ctx.fillStyle = SOFT; ctx.font = '11px ui-monospace, Menlo, monospace';
      ctx.fillText(`E₂ was ${eqStr(S.E2)}   ·   E₂′ = E₂ + (${S.k})·E₁`, 12, 50);
    }
    void INK; void OK;
  }, []);

  useEffect(() => { draw(); }, [k, step, target, focus, draw]);
  useEffect(() => {
    const st = stageRef.current;
    if (!st || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(st);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (current.calib && !target) { setTarget(makeTarget(null)); setK(0); }
    if (!current.calib) { setTarget(null); setK(focus === 'system' ? 0 : focus === 'purpose' ? -3 : 2); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (i) => { if (answers[step] == null) setAnswers((p) => ({ ...p, [step]: i })); };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const answered = answers[step] != null;
  const canNext = step < STEPS.length - 1 && (!current.q || answered);

  const spoken = sol
    ? `The crossing is ${fracString(sol.x)}, ${fracString(sol.y)}, and it stays there for every k.`
    : 'These lines do not cross.';

  return (
    <div className="ellab">
      <header className="head">
        <h1>Why Elimination Is Allowed</h1>
        <p className="lede">
          Replace one equation by itself plus a multiple of the other and the second line{' '}
          <em>swings</em> — new slope, new intercept — yet the crossing point never moves. Not
          approximately: the three determinants that locate it come out the <strong>same whole
          numbers</strong> every time.
        </p>
      </header>

      <div className="bench">
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label={`Two lines and their crossing. ${spoken}`} role="img" />
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>
          <div className="readout" role="group" aria-label="Exact readouts">
            <div className="cell">
              <span className="k2">solution before</span>
              <span className="v">{sol ? `(${fracString(sol.x)}, ${fracString(sol.y)})` : 'none'}</span>
            </div>
            <div className="cell">
              <span className="k2">solution after</span>
              <span className={'v ' + (sol && solAfter && eqF(sol.x, solAfter.x) && eqF(sol.y, solAfter.y) ? 'ok' : '')}>
                {solAfter ? `(${fracString(solAfter.x)}, ${fracString(solAfter.y)})` : 'none'}
              </span>
            </div>
            <div className="cell wide">
              <span className="k2">the invariant — D, Dx, Dy before and after</span>
              <span className="v">
                before {inv.before.D}, {inv.before.Dx}, {inv.before.Dy} &nbsp;·&nbsp; after{' '}
                {inv.after.D}, {inv.after.Dx}, {inv.after.Dy}{' '}
                {inv.holds ? <em className="ok">✓ identical</em> : <em className="bad">changed</em>}
              </span>
            </div>
            <div className="cell wide">
              <span className="k2">the crossing satisfies both</span>
              <span className="v">
                E₁: {satisfies(E1, sol) ? 'true' : 'false'} · E₂′: {satisfies(E2p, sol) ? 'true' : 'false'}
                <em className="soft"> · checked as exact fractions, not by distance</em>
              </span>
            </div>
          </div>
        </section>

        <aside className="panel tutor">
          <div className="progress" role="list" aria-label="Lesson progress">
            {STEPS.map((_, i) => (
              <span key={i} role="listitem"
                className={'pip' + (i === step ? ' cur' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined} />
            ))}
          </div>
          <p className="eyebrow small">Step {step + 1} of {STEPS.length}</p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          {current.unlock > 0 && (
            <label className="dial">
              <span className="drole">{DIALS[0].label}</span>
              <input type="range" min={DIALS[0].min} max={DIALS[0].max} step={DIALS[0].step}
                value={k} aria-label={DIALS[0].label} onChange={(e) => setK(parseInt(e.target.value, 10))} />
              <output className="dv">{k}</output>
            </label>
          )}

          {current.q && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((ch, i) => {
                  const chosen = answers[step];
                  let c = 'choice';
                  if (chosen != null) {
                    if (i === current.answer) c += ' correct';
                    else if (i === chosen) c += ' wrong';
                    else c += ' dim';
                  }
                  return (
                    <button type="button" key={i} className={c} onClick={() => choose(i)} disabled={chosen != null}>
                      <span className="mark" aria-hidden="true">
                        {chosen != null && i === current.answer ? '✓' : chosen != null && i === chosen ? '✕' : ''}
                      </span>{ch}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {current.calib && target && (
            <div className="calib">
              <p className="calib-goal">
                Remove <span className="mono goal">{target.which}</span> from E₂ by choosing k.
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {target.which} coefficient: {target.which === 'x' ? E2p.a : E2p.b}
                </span>
                {calibrated
                  ? <span className="stamp">CALIBRATED</span>
                  : <span className="mono hint">not zero yet</span>}
              </div>
              <button type="button" className="btn ghost"
                onClick={() => { setTarget(makeTarget(target)); setK(0); }}>
                New target
              </button>
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={goBack} disabled={step === 0}>← Back</button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} disabled={!canNext}>
                {current.q && !answered ? 'Answer to continue' : 'Next →'}
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => {
                setStep(0); setAnswers({}); setTarget(null); setK(START.k);
              }}>Restart lab</button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">E₂ → E₂ + k·E₁ · D = a₁b₂ − a₂b₁ unchanged · solution = (Dx/D, Dy/D)</span>
        &nbsp;·&nbsp; exact in whole numbers, drawn live on a dependency-free canvas.
      </footer>

      <style jsx>{`
        .ellab{
          --page:#eff1ee;--paper:#fbfbf8;--ink:#1c2b3a;--ink-soft:#5b6b7b;
          --curve:#c81e4f;--quad:#c7d8e4;--ok:#1f8a5b;--blue:#3a6ea5;
          --mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
          --serif:'Iowan Old Style',Palatino,Georgia,serif;
          background:var(--page);color:var(--ink);
          font:16px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;
          padding:28px 18px 44px;border-radius:16px;max-width:1120px;margin:0 auto;
        }
        .mono{font-family:var(--mono);}
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
        .eyebrow{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--ink-soft);margin:0 0 6px;}
        .eyebrow.small{margin:0 0 4px;}
        h1{font-family:var(--serif);font-weight:600;font-size:clamp(26px,4vw,34px);margin:0 0 6px;}
        .lede{color:var(--ink-soft);margin:0 0 22px;max-width:64ch;}
        .bench{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:22px;align-items:start;}
        @media (max-width:920px){.bench{grid-template-columns:1fr;}}
        .panel{background:#fff;border:1px solid rgba(28,43,58,.15);border-radius:12px;box-shadow:0 1px 2px rgba(28,43,58,.05);}
        .stage-panel{padding:14px;}
        .stage{position:relative;width:100%;aspect-ratio:1/1;border:1px solid var(--quad);border-radius:8px;overflow:hidden;
          background:radial-gradient(120% 120% at 30% 18%,#fdfefe 0%,#eef3f7 60%,#e3ebf1 100%);}
        .stage canvas{display:block;width:100%;height:100%;}
        .readout{margin:12px 2px 2px;display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .cell{background:var(--paper);border:1px solid rgba(28,43,58,.14);border-radius:8px;padding:8px 10px;display:grid;gap:2px;}
        .cell.wide{grid-column:1/-1;}
        .cell .k2{font-size:11px;letter-spacing:.06em;color:var(--ink-soft);font-family:var(--mono);}
        .cell .v{font-family:var(--mono);font-weight:700;font-size:14.5px;}
        .cell .v.ok,.cell .ok{color:var(--ok);font-style:normal;}
        .cell .bad{color:var(--curve);font-style:normal;}
        .cell .soft{color:var(--ink-soft);font-weight:400;font-size:12px;font-style:normal;}
        .btn{font:600 14px/1 system-ui,sans-serif;padding:10px 16px;border-radius:8px;cursor:pointer;
          border:1px solid var(--ink);background:var(--ink);color:#fff;transition:filter .15s,opacity .15s;}
        .btn.ghost{background:transparent;color:var(--ink);}
        .btn:disabled{opacity:.4;cursor:not-allowed;}
        .btn:not(:disabled):hover{filter:brightness(1.08);}
        .tutor{padding:18px 20px 20px;}
        .progress{display:flex;gap:6px;margin-bottom:14px;}
        .pip{height:6px;flex:1;border-radius:3px;background:rgba(28,43,58,.14);}
        .pip.done{background:rgba(200,30,79,.45);}
        .pip.cur{background:var(--curve);}
        h2{font-family:var(--serif);font-weight:600;font-size:21px;margin:0 0 10px;padding-bottom:9px;border-bottom:3px double rgba(200,30,79,.45);}
        .body{margin:0 0 16px;font-size:14.5px;}
        .dial{display:grid;grid-template-columns:1fr 52px;grid-template-rows:auto auto;align-items:center;gap:2px 10px;margin-bottom:14px;}
        .drole{grid-column:1/3;font-size:12px;color:var(--ink-soft);}
        .dial input[type=range]{grid-column:1;width:100%;accent-color:var(--ink);cursor:pointer;}
        .dv{grid-column:2;font-family:var(--mono);text-align:right;font-size:17px;font-weight:700;}
        .quiz{margin-top:4px;}
        .q{font-size:14px;font-weight:600;margin:0 0 10px;}
        .choices{display:grid;gap:8px;}
        .choice{text-align:left;font:14px/1.4 system-ui,sans-serif;padding:11px 11px 11px 32px;
          border:1px solid rgba(28,43,58,.2);border-radius:8px;background:var(--paper);color:var(--ink);
          cursor:pointer;position:relative;transition:border-color .15s,background .15s;}
        .choice:not(:disabled):hover{border-color:var(--ink);}
        .choice .mark{position:absolute;left:11px;font-weight:700;}
        .choice.correct{border-color:var(--ok);background:rgba(31,138,91,.08);}
        .choice.correct .mark{color:var(--ok);}
        .choice.wrong{border-color:var(--ink-soft);background:rgba(91,107,123,.08);}
        .choice.wrong .mark{color:var(--ink-soft);}
        .choice.dim{opacity:.55;}
        .choice:disabled{cursor:default;}
        .feedback{margin:12px 0 0;font-size:13px;line-height:1.55;background:rgba(200,30,79,.05);
          border-left:3px solid var(--curve);padding:10px 12px;border-radius:0 6px 6px 0;}
        .calib{margin-top:6px;display:grid;gap:11px;}
        .calib-goal{margin:0;font-size:15px;background:rgba(58,110,165,.08);border-radius:8px;padding:11px 13px;}
        .calib-goal .mono{font-weight:700;}
        .calib-goal .goal{color:var(--curve);}
        .meter{height:12px;border-radius:6px;background:rgba(28,43,58,.1);overflow:hidden;}
        .meter-fill{height:100%;background:linear-gradient(90deg,rgba(200,30,79,.55),var(--curve));transition:width .12s ease-out;}
        .meter-row{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;}
        .hint{color:var(--ink-soft);font-size:12.5px;}
        .stamp{font:700 12px/1 var(--mono);letter-spacing:.16em;color:var(--ok);border:2px solid var(--ok);border-radius:6px;padding:5px 9px;transform:rotate(-3deg);}
        .nav{margin-top:20px;display:flex;justify-content:space-between;gap:10px;}
        .foot{margin-top:24px;font-size:12.5px;color:var(--ink-soft);}
        :global(.ellab) :focus-visible{outline:2px solid var(--ink);outline-offset:2px;border-radius:4px;}
        @media (prefers-reduced-motion:reduce){.btn,.choice,.meter-fill{transition:none;}}
      `}</style>
    </div>
  );
}
