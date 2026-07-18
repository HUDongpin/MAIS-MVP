'use client';

/* ============================================================================
   TriangleBuildLab — an interactive "bench" for TRIANGLE CONSTRUCTION FROM
   CONDITIONS: hand a builder a kit of parts, and count how many different
   triangles the kit allows.

        SSS: one triangle — IF the sides can close (p+q > r, all ways)
        SAS · ASA: one triangle — the kit is rigid
        SSA: zero, one, or TWO — the famous swinging side
        AAA: infinitely many — angles fix the shape, never the size

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 7.G.A.2.
   TriangleLab owns dragging vertices and touring the interior angles;
   this bench runs the OPPOSITE direction — from constraints to census.

   THE SIGNATURE CENTERPIECE — "THE CONSTRAINT-KIT CENSUS."
     Kits are posted and counted.  Sides 2, 3, 6 gape — the two short
     struts cannot reach across the long one — so the census reads 0.
     Sides 3, 4, 5 close, and close ONE way.  Then the star exhibit:
     the SSA swing, built on the exact 3-4-5 corner — the fixed side of
     length 10 rises to the point (8, 6), and the swinging side of
     length a reaches down for the base line.  Too short (a < 6): no
     landing.  Exactly 6: one right-triangle landing.  Between 6 and 10:
     TWO landings — two genuinely different triangles from one kit.
     From 10 up: one.  Finally AAA: the census reads "infinitely many,"
     a whole similar family — the dilation bench's territory, cited.
     The capstone posts TWO kits: rule each census — both exact, or no
     stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • TriangleLab owns drag-the-vertices and the interior-angle tour;
       nothing here is draggable and no angle is summed on stage.
     • TrigRatioLab owns the side quotients of its exact corners; this
       bench BORROWS the 3-4-5 corner's geometry (with credit) so the
       swing's thresholds are exact integers, and never takes a quotient.
     • CongruenceLab owns the carrying test; "the same triangle" is
       cited to it in one line, not re-proved.
     • DilationsLab owns similar families; AAA's infinite census is
       ceded to it by name.

   One-accent discipline: CARMINE is THE CENSUS — the count and the
   verdicts.  GOLD is the kit parts and the swing (the tool).  BLUE is
   quiet construction lines.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • The census is integer arithmetic: SSS by the three inequality
       checks; SSA by exact comparison against the thresholds 6 and 10
       (the height 6 is exact because the fixed corner is the 3-4-5
       corner: 10 × 3/5).  The audit re-derives every census, and
       re-verifies the whole SSA rule against floating-point geometry —
       intersecting the swing circle with the base line for every a
       from 1 to 20 and counting honest landings.
     • Floats touch pixels (and that audit cross-check) only; every
       displayed number is an integer.
     • The kit inspector's stamp needs two exact censuses, audited over
       every posted case × chip pair; the truth chip is always present.
   Verified by audit-trianglebuild.mjs (numeric + geometric proof +
   source greps) and verify-trianglebuild.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/TriangleBuildLab.jsx
     2. Import and render it:
          import TriangleBuildLab from './TriangleBuildLab';
          export default function Page() { return <TriangleBuildLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the kit, the
              swing length, the lesson step, the rulings).
     MODEL  — integer census rules; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the census
const BLUE = '#3f74a6'; // quiet construction lines
const GOLD = '#b98718'; // the kit and the swing
const INK_HEX = '#1c2b3a';

const CALIB_STEP = 5;
/* the SSA scene is built on the exact 3-4-5 corner: the fixed side of
   length 10 runs to (8, 6), so the swing's thresholds are exactly 6 and 10 */
const SSA_B = 10;
const SSA_APEX = { x: 8, y: 6 };
const SSA_H = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  The census, in integers.
   ------------------------------------------------------------------------- */
const sssCount = (p, q, r) => (p + q > r && q + r > p && p + r > q ? 1 : 0);
const sasCount = () => 1; /* a legal hinge is rigid */
const asaCount = (a1, a2) => (a1 > 0 && a2 > 0 && a1 + a2 < 180 ? 1 : 0);
const ssaCount = (a) => (a < SSA_H ? 0 : a === SSA_H ? 1 : a < SSA_B ? 2 : 1);
const aaaCount = (a1, a2, a3) => (a1 + a2 + a3 === 180 && a1 > 0 && a2 > 0 && a3 > 0 ? Infinity : 0);
const censusOf = (kit) => {
  if (kit.kind === 'SSS') return sssCount(...kit.sides);
  if (kit.kind === 'SAS') return sasCount();
  if (kit.kind === 'ASA') return asaCount(...kit.angles);
  if (kit.kind === 'SSA') return ssaCount(kit.a);
  return aaaCount(...kit.angles);
};
const censusText = (c) => (c === Infinity ? 'infinitely many' : String(c));
const kitText = (kit) => {
  if (kit.kind === 'SSS') return `SSS · sides ${kit.sides.join(', ')}`;
  if (kit.kind === 'SAS') return `SAS · sides ${kit.sides.join(' & ')} hinged at ${kit.angle}°`;
  if (kit.kind === 'ASA') return `ASA · angles ${kit.angles.join('° & ')}° on a side of ${kit.side}`;
  if (kit.kind === 'SSA') return `SSA · the 3-4-5 corner, fixed side 10, swing ${kit.a}`;
  return `AAA · angles ${kit.angles.join('°, ')}°`;
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The kit inspector's stamp."  Two kits are
   posted; rule each census.
   ------------------------------------------------------------------------- */
const CENSUS_CHIPS = ['0', '1', '2', 'infinitely many'];
const CASES = [
  { k1: { kind: 'SSS', sides: [2, 3, 6] }, k2: { kind: 'SSA', a: 8 } },
  { k1: { kind: 'SSS', sides: [3, 4, 5] }, k2: { kind: 'AAA', angles: [50, 60, 70] } },
  { k1: { kind: 'SSA', a: 5 }, k2: { kind: 'ASA', angles: [40, 60], side: 7 } },
  { k1: { kind: 'AAA', angles: [30, 60, 90] }, k2: { kind: 'SSS', sides: [1, 2, 5] } },
  { k1: { kind: 'SSA', a: 6 }, k2: { kind: 'SSS', sides: [5, 6, 7] } },
  { k1: { kind: 'SAS', sides: [4, 7], angle: 50 }, k2: { kind: 'SSA', a: 12 } },
];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const truth1 = (i) => censusText(censusOf(CASES[i].k1));
const truth2 = (i) => censusText(censusOf(CASES[i].k2));
const calibChecks = (i, p1, p2) => {
  if (i == null) return [false, false];
  const ok1 = p1 != null && p1 === truth1(i);
  const ok2 = ok1 && p2 != null && p2 === truth2(i);
  return [ok1, ok2];
};
const closeness = (i, p1, p2) =>
  Math.round((100 * calibChecks(i, p1, p2).filter(Boolean).length) / 2);
const isCalibrated = (i, p1, p2) => calibChecks(i, p1, p2).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that any three sides make a
   triangle, that more conditions always pin one answer, that SSA is safe.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Can the sides even close?',
    body:
      'A kit of three struts: 2, 3, and 6. Lay the 6 down and hinge the others at its ' +
      'ends — swing them toward each other and watch the gap.',
    kit: { kind: 'SSS', sides: [2, 3, 6] },
    q: 'How many triangles does the kit 2, 3, 6 build?',
    choices: [
      'None — 2 + 3 < 6, so the short struts cannot meet across the long one',
      'One — every kit builds something',
      'Two — one on each side',
    ],
    answer: 0,
    feedback:
      'The census reads zero: the two short struts together span 5, and the gap is 6. ' +
      'Three lengths must pass the closing test — each pair outreaching the third — ' +
      'before any triangle exists. Constraints can simply be unsatisfiable.',
  },
  {
    title: 'When SSS closes, it pins',
    body:
      'Swap in 3, 4, 5. The struts close — and having closed, they cannot flex: every ' +
      'attempt builds the same triangle.',
    kit: { kind: 'SSS', sides: [3, 4, 5] },
    q: 'How many DIFFERENT triangles have sides 3, 4, 5?',
    choices: [
      'Exactly one — a mirror copy counts as the same, since rigid motions carry one onto the other',
      'Two — left-handed and right-handed',
      'Many — it depends where you draw it',
    ],
    answer: 0,
    feedback:
      'One. Triangles are the only rigid polygon: three closed struts leave no hinge ' +
      'free. The mirror image is the same triangle by the congruence bench’s carrying ' +
      'test — a flip-free tour of rigid motions lands one on the other.',
  },
  {
    title: 'SAS and ASA pin it too',
    body:
      'Two struts hinged at a set angle (SAS), or two set angles on a shared strut ' +
      '(ASA): both kits are rigid.',
    kit: { kind: 'SAS', sides: [4, 7], angle: 50 },
    q: 'Why does SAS determine exactly one triangle?',
    choices: [
      'The hinge is set — the two free endpoints sit at fixed spots, so the third side has no choice',
      'Because three letters always pin a triangle',
      'It doesn’t; SAS wobbles like SSA',
    ],
    answer: 0,
    feedback:
      'Fix the hinge angle and both struts’ far ends are nailed down; the third side ' +
      'is forced to one exact length. ASA pins the same way from the other direction. ' +
      'But “three letters always pin” is false — the next step meets the exception.',
  },
  {
    title: 'The swinging side',
    body:
      'SSA: the 3-4-5 corner at the origin, a fixed side of 10 rising to (8, 6), and a ' +
      'swing of length a reaching down for the base line. Dial a.',
    kit: { kind: 'SSA', a: 8 },
    dial: true,
    q: 'With a = 8, how many triangles?',
    choices: [
      'Two — the swing lands on the base line twice, once leaning each way',
      'One — kits with three parts are rigid',
      'None — 8 is not on the kit list',
    ],
    answer: 0,
    feedback:
      'Two honest landings: the circle of radius 8 around (8, 6) cuts the base line ' +
      'at two spots, both legal. The thresholds are exact: below 6 the swing cannot ' +
      'reach; at 6 it lands once (the right triangle); from 6 to 10 twice; from 10 up, ' +
      'once. SSA is the famous ambiguous kit.',
  },
  {
    title: 'AAA never pins',
    body:
      'Last kit: three angles, 50°, 60°, 70°. They agree to 180 — and yet the census ' +
      'explodes.',
    kit: { kind: 'AAA', angles: [50, 60, 70] },
    q: 'How many triangles carry angles 50°, 60°, 70°?',
    choices: [
      'Infinitely many — angles fix the SHAPE, and every size of that shape qualifies',
      'One — three conditions, one triangle',
      'None — angles alone are not constraints',
    ],
    answer: 0,
    feedback:
      'A whole similar family: the dilation bench can grow or shrink any one of them ' +
      'onto any other without touching an angle. Angles are shape money, not size ' +
      'money — which is exactly why maps and models can exist at all.',
  },
  {
    title: 'The kit inspector’s stamp',
    body:
      'Two kits are posted. Rule the first census, then the second. Both exact, or no ' +
      'stamp.',
    kit: { kind: 'SSS', sides: [3, 4, 5] },
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TriangleBuildLab() {
  const [swing, setSwing] = useState(8);
  const [p1, setP1] = useState(null);
  const [p2, setP2] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const kit = calib && kase != null ? CASES[kase].k1 : current.dial ? { kind: 'SSA', a: swing } : current.kit;

  const checks = calib ? calibChecks(kase, p1, p2) : [false, false];
  const pct = calib && kase != null ? closeness(kase, p1, p2) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, p1, p2) : false;

  sceneRef.current = { kit, kit2: calib && kase != null ? CASES[kase].k2 : null, calib };

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

    const drawKitCard = (kit2, x0, y0, w, h, hideCensus) => {
      ctx.strokeStyle = 'rgba(28,43,58,0.2)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x0, y0, w, h);
      ctx.fillStyle = INK_HEX;
      ctx.font = '700 12.5px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(kitText(kit2), x0 + 10, y0 + 10);
      ctx.fillStyle = CARMINE;
      ctx.fillText(
        hideCensus ? 'census: ?' : `census: ${censusText(censusOf(kit2))}`,
        x0 + 10,
        y0 + h - 24
      );
    };

    if (S.kit.kind === 'SSA') {
      /* the swing scene — floats for pixels only */
      const scale = Math.min((W - 120) / 22, (H - bandH - 120) / 9);
      const ox = 70;
      const oy = H - 70;
      const px = (x, y) => [ox + x * scale, oy - y * scale];
      /* base line */
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(...px(-1, 0));
      ctx.lineTo(...px(21, 0));
      ctx.stroke();
      /* the fixed side to the apex */
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(...px(0, 0));
      ctx.lineTo(...px(SSA_APEX.x, SSA_APEX.y));
      ctx.stroke();
      ctx.fillStyle = INK_HEX;
      ctx.font = '600 11.5px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('10', px(3.4, 3.2)[0], px(3.4, 3.2)[1]);
      ctx.fillText('(8, 6)', px(SSA_APEX.x, SSA_APEX.y)[0] + 8, px(SSA_APEX.x, SSA_APEX.y)[1]);
      /* the swing circle and its landings */
      const a = S.kit.a;
      ctx.strokeStyle = 'rgba(185,135,24,0.5)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(...px(SSA_APEX.x, SSA_APEX.y), a * scale, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      const disc = a * a - SSA_H * SSA_H;
      if (disc >= 0) {
        const s = Math.sqrt(disc); /* pixels only */
        for (const xr of [SSA_APEX.x - s, SSA_APEX.x + s]) {
          if (xr <= 1e-9) continue;
          ctx.strokeStyle = CARMINE;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(...px(SSA_APEX.x, SSA_APEX.y));
          ctx.lineTo(...px(xr, 0));
          ctx.stroke();
          ctx.fillStyle = CARMINE;
          ctx.beginPath();
          ctx.arc(...px(xr, 0), 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
      ctx.fillStyle = CARMINE;
      ctx.font = '700 13px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`swing a = ${a} · census: ${censusText(ssaCount(a))}`, 22, bandH + 10);
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.fillText('thresholds: 6 (touch) and 10 (the fixed side)', 22, bandH + 30);
    } else if (!S.calib) {
      drawKitCard(S.kit, W * 0.2, bandH + 40, W * 0.6, 120, false);
      /* the closing test, spelled out for SSS */
      if (S.kit.kind === 'SSS') {
        const [p, q, r] = S.kit.sides;
        ctx.fillStyle = INK_SOFT;
        ctx.font = '600 11.5px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const tx = W * 0.2 + 10;
        let ty = bandH + 180;
        for (const [u, v, w2] of [[p, q, r], [q, r, p], [p, r, q]]) {
          const ok = u + v > w2;
          ctx.fillStyle = ok ? INK_SOFT : CARMINE;
          ctx.fillText(`${u} + ${v} ${ok ? '>' : '≤'} ${w2}  ${ok ? '✓' : '✗ cannot close'}`, tx, ty);
          ty += 18;
        }
      }
    } else if (S.kit2) {
      drawKitCard(S.kit, W * 0.08, bandH + 40, W * 0.4, 110, true);
      drawKitCard(S.kit2, W * 0.53, bandH + 40, W * 0.4, 110, true);
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib ? 'two kits posted · run the census on each' : kitText(S.kit),
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
  }, [draw]);

  /* every step opens on the scene its words describe */
  useEffect(() => {
    setSwing(8);
    setP1(null);
    setP2(null);
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
    setSwing(8);
    setP1(null);
    setP2(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: kit one ${kase != null ? kitText(CASES[kase].k1) : ''}; kit two ${kase != null ? kitText(CASES[kase].k2) : ''}. Censuses ${p1 ?? 'unruled'} and ${p2 ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `${kitText(kit)}: the census reads ${censusText(censusOf(kit))}.`;

  return (
    <div className="tblab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Triangle Kits: The Constraint Census</h1>
        <p className="lede">
          Hand a builder a kit of parts and count the triangles it allows: SSS closes or
          gapes, SAS and ASA are <em>rigid</em>, AAA buys shape but never size — and the
          SSA swing lands zero, one, or <em>two</em> times.
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
                  <span className="dial-k">the swing, a</span>
                  <span className="dial-v mono">{swing}</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={14}
                  step={1}
                  value={swing}
                  onChange={(e) => setSwing(Number(e.target.value))}
                  aria-label={`Swing length, ${swing}`}
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
                <span className="target-k">The posted kits</span>
                <span className="target-word">two kits, two censuses</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} kit one, counted</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} kit two, counted</li>
                </ol>
                <div className="declare" role="group" aria-label="First census">
                  {CENSUS_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (p1 === c2 ? ' active' : '')}
                      onClick={() => setP1(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Second census">
                  {CENSUS_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (p2 === c2 ? ' active' : '')}
                      onClick={() => setP2(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both counted, exactly — kits approved'
                    : checks[0]
                      ? 'one counted — now the other'
                      : 'closing test, rigidity, swing, or family?'}
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
                  <span className="mono target-hint">kit one · then kit two</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setP1(null);
                  setP2(null);
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
                  setP1(null);
                  setP2(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">close · pin · swing · family</span> &nbsp;·&nbsp; a kit of
        conditions builds zero, one, two, or infinitely many triangles — and the census is
        arithmetic, not luck.
      </footer>

      <style jsx>{`
        .tblab {
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
        :global(.tblab) :focus-visible {
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
