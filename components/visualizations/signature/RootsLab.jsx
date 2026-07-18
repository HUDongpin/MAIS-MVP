'use client';

/* ============================================================================
   RootsLab — an interactive "bench" for SQUARE AND CUBE ROOTS: the side
   that a given area forces, the twin that x² = p refuses to forget, and
   the sign that a cube remembers.

        √p  =  the side of a square whose area is p
        x² = p  has TWO solutions, ±√p — squaring forgets the sign
        x³ = p  has ONE — an odd power keeps the sign
        between the perfect squares, an honest INTEGER BRACKET

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 8.EE.A.2.
   IrrationalLab owns the endless telescope past the bracket;
   QuadraticEquationLab owns the ± that falls out of completing the
   square.  This bench owns the geometry that STARTS both stories: area
   to side, volume to edge, and why the equation keeps a twin the
   symbol √ deliberately drops.

   THE SIGNATURE CENTERPIECE — "THE AREA-TO-SIDE MACHINE."
     Dial an area and the machine reports the side: 81 → 9, exactly,
     because 9 × 9 = 81.  Then the twin: (−7)² = 49 too — the signed
     bench showed minus times minus lands positive — so x² = 49 owns
     BOTH 7 and −7, while the symbol √49 names only the non-negative
     one.  Dial an area between the perfect squares and the machine
     answers with an integer bracket: 36 < 40 < 49, so 6 < √40 < 7 —
     and stops there, honestly, leaving the endless part to the
     telescope bench.  Volumes work the cube way: ∛64 = 4, and
     x³ = −27 has the lone solution −3, because odd powers keep the
     sign.  The capstone posts an equation and a stray area: rule the
     full solution set, then the bracket — both exact, or no stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • IrrationalLab owns the endless zoom telescope of nested number
       lines; this bench never zooms and never shows a digit past the
       integer bracket — it is cited as the next chapter.
     • QuadraticEquationLab owns completing the square and its ±; the
       twin here comes straight from the sign law of multiplication,
       and no quadratic is ever rearranged.
     • PythagorasLab owns the two-packing frame; squares here are
       single areas, never packed or compared by rearrangement.
     • SignedNumbersLab owns the sign law itself; it is cited by name
       as the reason (−7)² is positive, without redrawing its device.
     • Math.sqrt and Math.cbrt appear NOWHERE — every root is found by
       integer search, and every bracket by integer squaring.

   One-accent discipline: CARMINE is THE ROOT — the reported side and
   the verdicts.  GOLD is the machine (the dial, the square).  BLUE is
   quiet labels.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Integers only.  Roots are found by bounded integer search;
       brackets satisfy n² ≤ p < (n+1)² by construction, and the audit
       re-proves it for every area up to 150.  The twin law is proved by
       exhaustive scan: the integer solutions of x² = p are exactly
       {r, −r}, and of x³ = p exactly {r}, over the whole dial space.
     • The assessor's stamp needs two exact rulings (the solution set,
       then the bracket), audited over every posted case × chip pair;
       the truth chip is always present and never duplicated.
   Verified by audit-roots.mjs (numeric proof + source greps) and
   verify-roots.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/RootsLab.jsx
     2. Import and render it:
          import RootsLab from './RootsLab';
          export default function Page() { return <RootsLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the area, the
              mode, the lesson step, answers, the rulings).
     MODEL  — bounded integer search; no pixels, no float roots.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the root
const BLUE = '#3f74a6'; // quiet labels
const GOLD = '#b98718'; // the machine
const INK_HEX = '#1c2b3a';

const AREA_MAX = 150;
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Bounded integer search; the twin law; the bracket.
   ------------------------------------------------------------------------- */
const sqrtInt = (p) => {
  for (let s = 0; s * s <= p; s++) if (s * s === p) return s;
  return null;
};
const cbrtInt = (p) => {
  const a = Math.abs(p);
  for (let s = 0; s * s * s <= a; s++) if (s * s * s === a) return p < 0 ? -s : s;
  return null;
};
/* the integer bracket: n with n² ≤ p < (n+1)² */
const bracketOf = (p) => {
  let n = 0;
  while ((n + 1) * (n + 1) <= p) n++;
  return n;
};
/* the solution sets, as integer scans would find them */
const solsSquare = (p) => {
  const r = sqrtInt(p);
  return r == null ? null : r === 0 ? [0] : [r, -r];
};
const solsCube = (p) => {
  const r = cbrtInt(p);
  return r == null ? null : [r];
};
const fmtInt = (v) => (v < 0 ? `−${-v}` : `${v}`);

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The assessor's stamp."  An equation is posted
   with a stray area; rule the solution set, then the bracket.
   ------------------------------------------------------------------------- */
const CASES = [
  { pow: 2, p: 49, bp: 40 },
  { pow: 2, p: 121, bp: 75 },
  { pow: 2, p: 36, bp: 20 },
  { pow: 3, p: 64, bp: 60 },
  { pow: 3, p: -27, bp: 90 },
  { pow: 3, p: 125, bp: 110 },
];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const eqText = (i) => {
  const { pow, p } = CASES[i];
  return `x${pow === 2 ? '²' : '³'} = ${fmtInt(p)}`;
};
const solsTruthText = (i) => {
  const { pow, p } = CASES[i];
  if (pow === 2) {
    const r = sqrtInt(p);
    return `±${r} — both square to ${fmtInt(p)}`;
  }
  const r = cbrtInt(p);
  return `${fmtInt(r)} only — an odd power keeps the sign`;
};
const solsChips = (i) => {
  const { pow, p } = CASES[i];
  const r = pow === 2 ? sqrtInt(p) : Math.abs(cbrtInt(p));
  const chips =
    pow === 2
      ? [
          solsTruthText(i),
          `${r} only — roots are positive`,
          `−${r} only`,
          'no solution',
        ]
      : [
          solsTruthText(i),
          `±${r} — every power has a twin`,
          `${fmtInt(-cbrtInt(p))} only`,
          'no solution',
        ];
  return chips;
};
const bracketTruth = (i) => {
  const n = bracketOf(CASES[i].bp);
  return `between ${n} and ${n + 1}`;
};
const bracketChips = (i) => {
  const { bp } = CASES[i];
  const n = bracketOf(bp);
  const half = Math.floor(bp / 2);
  const cands = [
    bracketTruth(i),
    `between ${n - 1} and ${n}`,
    `between ${n + 1} and ${n + 2}`,
    `between ${half - 1} and ${half + 1}`,
  ];
  const seen = new Set();
  const out = [];
  for (const t of cands) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
    if (out.length === 4) break;
  }
  return out;
};
const calibChecks = (i, sPick, bPick) => {
  if (i == null) return [false, false];
  const sOK = sPick != null && sPick === solsTruthText(i);
  const bOK = sOK && bPick != null && bPick === bracketTruth(i);
  return [sOK, bOK];
};
const closeness = (i, s, b) =>
  Math.round((100 * calibChecks(i, s, b).filter(Boolean).length) / 2);
const isCalibrated = (i, s, b) => calibChecks(i, s, b).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that roots are always positive,
   that √49 = ±7, that x³ = −27 has no answer.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Area in, side out',
    body:
      'A square of known area hides its side. Dial the area across the perfect squares ' +
      'and read the machine: 81 in, 9 out — because 9 × 9 = 81. That report is √81.',
    p: 81,
    mode: 'square',
    dial: true,
    q: 'The machine reads area 144. The side is…',
    choices: [
      '12 — because 12 × 12 = 144; the root is the side the area forces',
      '72 — half the area',
      '14 — a little more than the area’s tens',
    ],
    answer: 0,
    feedback:
      'A root is not a button — it is the answer to “which side builds this area?” ' +
      '12 × 12 = 144, so √144 = 12. Every perfect square reports an exact integer ' +
      'side, and the machine checks by squaring, never by guessing.',
  },
  {
    title: 'The forgotten twin',
    body:
      'Now the equation x² = 49. The side 7 works. But the signed bench showed minus ' +
      'times minus lands positive — so (−7)² = 49 works too.',
    p: 49,
    mode: 'square',
    twins: true,
    q: 'The full solution set of x² = 49 is…',
    choices: [
      '7 and −7 — squaring forgets the sign, so the equation keeps both',
      '7 only — lengths are positive',
      '49 and −49',
    ],
    answer: 0,
    feedback:
      'Both twins solve it, and nothing else does. A SQUARE cannot remember whether ' +
      'its side was called positive or negative — the sign is destroyed by squaring, ' +
      'so the equation must return both candidates. Geometry uses the positive twin; ' +
      'the algebra owns the pair.',
  },
  {
    title: 'Between the squares',
    body:
      'Dial the area to 40. No integer side exists: 6² = 36 is too small, 7² = 49 too ' +
      'big. The machine answers with a bracket.',
    p: 40,
    mode: 'square',
    dial: true,
    q: 'So √40 lives…',
    choices: [
      'Between 6 and 7 — because 36 < 40 < 49; the bracket is exact even when the root is not',
      'Exactly at 6.5 — halfway',
      'Nowhere — 40 has no root',
    ],
    answer: 0,
    feedback:
      'The bracket 6 < √40 < 7 is proved by two squarings — no measuring, no ' +
      'guessing. Where the digits go from there is the irrationals bench’s story; this ' +
      'machine stops at the honest integer bracket, which is already enough to place ' +
      '√40 on any number line.',
  },
  {
    title: 'The cube keeps the sign',
    body:
      'Volumes work the cube way: 64 blocks stack into a 4 × 4 × 4 cube, so ∛64 = 4. ' +
      'Now try x³ = −27.',
    p: 64,
    mode: 'cube',
    q: 'x³ = −27 has…',
    choices: [
      'Exactly one solution, −3 — an odd power keeps the sign, so no twin appears',
      'No solution — you cannot cube to a negative',
      'Two solutions, ±3',
    ],
    answer: 0,
    feedback:
      '(−3)³ = −27, and 3³ = +27 misses. Three sign changes leave a sign standing — ' +
      'odd powers REMEMBER. That is the deep asymmetry: squares forget the sign and ' +
      'owe a twin; cubes keep it and answer alone.',
  },
  {
    title: 'The symbol and the equation',
    body:
      'One last distinction, worth a point on every exam: √49 is a NAME, and x² = 49 ' +
      'is a QUESTION.',
    p: 49,
    mode: 'square',
    twins: true,
    q: 'Is √49 equal to ±7?',
    choices: [
      'No — the symbol √ names the non-negative root, 7; the EQUATION x² = 49 is what owns ±7',
      'Yes — root always means both',
      'No — √49 is −7',
    ],
    answer: 0,
    feedback:
      'The convention: √p is the single non-negative side, so formulas stay ' +
      'unambiguous. When an equation needs both twins, the ± is written EXPLICITLY — ' +
      'that is why the famous quadratic formula says ±√. Symbol names one; equation ' +
      'keeps two.',
  },
  {
    title: 'The assessor’s stamp',
    body:
      'An equation is posted, with a stray area beside it. Rule the full solution set, ' +
      'then rule the stray area’s integer bracket. Both exact, or no stamp.',
    p: 49,
    mode: 'square',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function RootsLab() {
  const [area, setArea] = useState(81);
  const [sPick, setSPick] = useState(null);
  const [bPick, setBPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const p = calib && kase != null ? Math.abs(CASES[kase].p) : current.dial ? area : current.p;

  const checks = calib ? calibChecks(kase, sPick, bPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, sPick, bPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, sPick, bPick) : false;

  sceneRef.current = {
    p,
    mode: calib && kase != null ? (CASES[kase].pow === 2 ? 'square' : 'cube') : current.mode,
    twins: !!current.twins,
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
    for (let gx = gs; gx < W; gx += gs) {
      ctx.moveTo(Math.round(gx) + 0.5, 0);
      ctx.lineTo(Math.round(gx) + 0.5, H);
    }
    for (let gy = gs; gy < H; gy += gs) {
      ctx.moveTo(0, Math.round(gy) + 0.5);
      ctx.lineTo(W, Math.round(gy) + 0.5);
    }
    ctx.stroke();

    const bandH = 52;
    const r = S.mode === 'square' ? sqrtInt(S.p) : cbrtInt(S.p);
    const n = bracketOf(S.p);

    if (S.mode === 'square') {
      /* the square(s) */
      const cx = W * 0.42;
      const cy = bandH + (H - bandH) / 2;
      const side = r != null ? r : n + 0.55; /* drawn size only */
      const scale = Math.min(180, (H - bandH - 90)) / Math.max(side, 4);
      const px = side * scale;
      ctx.fillStyle = 'rgba(185,135,24,0.16)';
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.2;
      ctx.fillRect(cx - px / 2, cy - px / 2, px, px);
      ctx.strokeRect(cx - px / 2, cy - px / 2, px, px);
      ctx.fillStyle = INK_HEX;
      ctx.font = '700 15px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`area ${S.p}`, cx, cy);
      ctx.fillStyle = CARMINE;
      ctx.font = '700 13px ui-monospace, monospace';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        S.calib ? 'side ?' : r != null ? `side ${r}` : `side between ${n} and ${n + 1}`,
        cx,
        cy - px / 2 - 8
      );
      /* the bracket witnesses, when the area is imperfect */
      if (r == null && !S.calib) {
        ctx.fillStyle = INK_SOFT;
        ctx.font = '600 12px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const tx = W * 0.68;
        ctx.fillText('the two squarings:', tx, bandH + 40);
        ctx.fillStyle = BLUE;
        ctx.fillText(`${n} × ${n} = ${n * n}  (too small)`, tx, bandH + 62);
        ctx.fillText(`${n + 1} × ${n + 1} = ${(n + 1) * (n + 1)}  (too big)`, tx, bandH + 82);
        ctx.fillStyle = CARMINE;
        ctx.fillText(`so ${n} < √${S.p} < ${n + 1}`, tx, bandH + 108);
      }
      /* the twins, when summoned */
      if (S.twins && r != null) {
        ctx.fillStyle = CARMINE;
        ctx.font = '700 13px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const tx = W * 0.68;
        ctx.fillText(`${r} × ${r} = ${S.p}`, tx, bandH + 56);
        ctx.fillText(`(−${r}) × (−${r}) = ${S.p}`, tx, bandH + 78);
        ctx.fillStyle = INK_SOFT;
        ctx.font = '600 11.5px ui-monospace, monospace';
        ctx.fillText('two sides, one square —', tx, bandH + 106);
        ctx.fillText(`x² = ${S.p} keeps both`, tx, bandH + 122);
      }
    } else {
      /* the cube, sketched isometrically */
      const cx = W * 0.42;
      const cy = bandH + (H - bandH) / 2 + 10;
      const e = 78;
      const dx = e * 0.5;
      const dy = e * 0.28;
      ctx.strokeStyle = GOLD;
      ctx.fillStyle = 'rgba(185,135,24,0.16)';
      ctx.lineWidth = 2;
      /* front face */
      ctx.fillRect(cx - e / 2, cy - e / 2, e, e);
      ctx.strokeRect(cx - e / 2, cy - e / 2, e, e);
      /* top + side */
      ctx.beginPath();
      ctx.moveTo(cx - e / 2, cy - e / 2);
      ctx.lineTo(cx - e / 2 + dx, cy - e / 2 - dy);
      ctx.lineTo(cx + e / 2 + dx, cy - e / 2 - dy);
      ctx.lineTo(cx + e / 2, cy - e / 2);
      ctx.moveTo(cx + e / 2 + dx, cy - e / 2 - dy);
      ctx.lineTo(cx + e / 2 + dx, cy + e / 2 - dy);
      ctx.lineTo(cx + e / 2, cy + e / 2);
      ctx.stroke();
      ctx.fillStyle = INK_HEX;
      ctx.font = '700 15px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`volume ${fmtInt(S.p)}`, cx, cy);
      ctx.fillStyle = CARMINE;
      ctx.font = '700 13px ui-monospace, monospace';
      ctx.textBaseline = 'bottom';
      ctx.fillText(S.calib ? 'edge ?' : `edge ${fmtInt(r)}`, cx, cy - e / 2 - dy - 10);
      if (!S.calib) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const tx = W * 0.68;
        ctx.fillText(`${fmtInt(r)} × ${fmtInt(r)} × ${fmtInt(r)} = ${fmtInt(S.p)}`, tx, bandH + 66);
        ctx.fillStyle = INK_SOFT;
        ctx.font = '600 11.5px ui-monospace, monospace';
        ctx.fillText('odd power — the sign survives', tx, bandH + 92);
      }
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib && S.kase != null
        ? `${eqText(S.kase)} · and the stray area ${CASES[S.kase].bp}`
        : S.mode === 'square'
          ? `the area-to-side machine · area ${S.p}`
          : `the volume-to-edge machine · volume ${fmtInt(S.p)}`,
      W / 2,
      bandH / 2
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
  }, [step]);

  /* every step opens on the scene its words describe */
  useEffect(() => {
    setArea(STEPS[step].p);
    setSPick(null);
    setBPick(null);
    if (STEPS[step].calib) setKase(makeCase(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setArea(current.p);
    setSPick(null);
    setBPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const rNow = sceneRef.current.mode === 'square' ? sqrtInt(p) : cbrtInt(p);
  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? eqText(kase) : ''}, stray area ${kase != null ? CASES[kase].bp : ''}. Solutions ${sPick ?? 'unruled'}; bracket ${bPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : rNow != null
      ? `Area ${p}: the machine reports ${rNow}.`
      : `Area ${p}: no integer side; bracketed between ${bracketOf(p)} and ${bracketOf(p) + 1}.`;

  return (
    <div className="rtlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Roots: The Side an Area Forces</h1>
        <p className="lede">
          √p is the side of a square of area p. The equation <span className="mono">x² = p</span>{' '}
          keeps a <em>twin</em> the symbol drops; cubes keep their sign and answer alone;
          and between the perfect squares lives an honest integer bracket.
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
                  <span className="dial-k">the area</span>
                  <span className="dial-v mono">{area}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={AREA_MAX}
                  step={1}
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                  aria-label={`Area, ${area}`}
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
                {current.choices.map((cq, i) => {
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
                      {cq}
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
                <span className="target-k">The posted equation</span>
                <span className="target-word mono">{eqText(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the full solution set, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} √{CASES[kase].bp}’s bracket, ruled
                  </li>
                </ol>
                <div className="declare" role="group" aria-label="Solution ruling">
                  {solsChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (sPick === c2 ? ' active' : '')}
                      onClick={() => setSPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Bracket ruling">
                  {bracketChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (bPick === c2 ? ' active' : '')}
                      onClick={() => setBPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — assessed'
                    : checks[0]
                      ? 'solved — now bracket the stray'
                      : 'even power or odd? count the twins'}
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
                  <span className="mono target-hint">the set · then the bracket</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setSPick(null);
                  setBPick(null);
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
                  setSPick(null);
                  setBPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">area forces the side · squares forget the sign · cubes remember</span>{' '}
        &nbsp;·&nbsp; the symbol names one root, the equation keeps the pair, and the
        bracket is exact even when the root is not.
      </footer>

      <style jsx>{`
        .rtlab {
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
        .chipbtn {
          font: 600 12px/1.2 system-ui, sans-serif;
          padding: 8px 11px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(63, 116, 166, 0.55);
          background: var(--paper);
          color: var(--blue);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.active {
          border-color: var(--blue);
          background: rgba(63, 116, 166, 0.1);
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
        .declbtn.reason {
          font-size: 11.5px;
          font-weight: 600;
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
        :global(.rtlab) :focus-visible {
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
