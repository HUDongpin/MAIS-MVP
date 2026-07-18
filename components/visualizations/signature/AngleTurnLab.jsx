'use client';

/* ============================================================================
   AngleTurnLab — an interactive "bench" for ANGLE MEASURE AS A FRACTION OF A
   TURN, and for the fact that ANGLES ADD:

        one degree = 1/360 of a full turn        90° = a quarter turn
        sweep 40°, then 25° more  →  the whole angle is 65°
        a right angle split into 35° and ?       →  ? = 90 − 35 = 55°

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is a GRADE 4
   lab — CCSS 4.MD.C is the anchor, all three standards:
     • 4.MD.C.5  an angle is measured by the fraction of a circle its turn
                 cuts out; a one-degree angle turns through 1/360 of the
                 circle, and an angle of n degrees turns through n of them
     • 4.MD.C.6  measure with a protractor (read the accumulated count off
                 the circle-fraction scale); sketch a given measure
     • 4.MD.C.7  angle measure is ADDITIVE: parts stack without overlapping
                 and their measures add — and the unknown part of a
                 decomposed angle is found by subtraction.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE TURNSTILE: SWEEP, THEN SWEEP AGAIN."
     A vertex, a fixed base ray, and a carmine ray that SWEEPS open by the
     first dial.  Then the lab does the thing no measuring drill does: a
     SECOND sweep continues from exactly where the first stopped — a blue
     arc stacking onto the carmine one, non-overlapping, sharing only the
     middle ray — and the readout writes the whole story: 40° + 25° = 65°.
     Additivity is not a rule here; it is the visible fact that the second
     sweep STARTS where the first ENDED.  Underneath sits the definition
     that makes "degree" honest: the sliver lens shows the full circle cut
     into 360, and a degree is ONE of those slivers — so measuring an angle
     is COUNTING slivers, the protractor is a circle-fraction scale that
     does the counting for you, and 90° reading "a quarter turn" is not a
     coincidence but a fraction.  The capstone is 4.MD.C.7 verbatim: the
     whole sweep must reach a posted total, the first part is pinned, and
     the missing part is yours to find.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • AngleLab owns the angle in STANDARD POSITION on a coordinate grid:
       the invariance of measure under rotating the whole figure and under
       ray length, and the bridge to radians and arc length (s = rθ).  This
       lab has NO coordinate grid, no radians, no arc-length formula, and it
       never rotates a whole angle or stretches a ray: its base ray is
       nailed down, and its subject is what AngleLab never does — TWO sweeps
       that stack, and the subtraction that finds a missing part.
     • LinesRaysSegmentsLab (4.G.A.1) owns NAMING crossings — right, sharp,
       wide — by the square-corner fit, with no numbers.  This lab is the
       hand-off: here the numbers arrive.  It never uses the corner-fit
       test, and that lab never shows a measure.
     • FractionLab owns the partitioned whole and its notation.  The sliver
       lens leans on "1/360" as a known idea (Grade 4 has met fractions)
       and never re-teaches it — no partition dial, no shaded parts.
     • TimeLab owns the clock face.  The sliver circle carries no hands and
       no hours; nothing here tells time.

   One-accent discipline: CARMINE is THE TURN — the first sweep's arc, the
   moving ray, the total readout.  BLUE is the SECOND sweep (the two-object
   convention).  GOLD is the instrument and the goal: the sliver circle, the
   protractor scale, the posted target arc.  GREEN is reserved for "correct"
   and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a nine-year-old):
     • Sweeps are INTEGER multiples of 5 degrees; the total is the integer
       sum a + b, audited over every reachable pair, and the second sweep is
       GATED (disabled, never clamped) so the total cannot pass 180 — the
       protractor's honest range.
     • The degree-sliver identity is audited: an angle of n degrees turns
       through exactly n slivers, and 360 slivers make the full turn.
     • The fraction-of-turn names are exact: 90 ⟺ a quarter turn, 180 ⟺ a
       half turn, and nothing else earns a name.
     • The missing part is the exact integer T − A, and the capstone's stamp
       is the identity a + b === T.  The meter reads 100 only at equality
       (99 is its ceiling everywhere else), audited over every target ×
       every reachable second sweep.
   Verified by audit-angleturn.mjs (numeric proof + source greps) and
   verify-angleturn.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/AngleTurnLab.jsx
     2. Import and render it:
          import AngleTurnLab from './AngleTurnLab';
          export default function Page() { return <AngleTurnLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the two sweeps,
              the lesson step, answers, the challenge target).
     MODEL  — pure integer arithmetic on degree counts; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Two sweeps, in steps of five degrees.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the turn: first sweep, moving ray, total
const BLUE = '#3f74a6'; // the second sweep
const GOLD = '#b98718'; // the instrument and the goal

const DIALS = [
  { key: 'first', name: 'First sweep', role: 'open the angle — in fives', min: 0, max: 180, unlock: 0, color: CARMINE },
  { key: 'second', name: 'Second sweep', role: 'sweep on from where it stopped', min: 0, max: 180, unlock: 3, color: BLUE },
];

const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Degree counts: slivers, sums, names, the missing part.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
const clamp5 = (v, lo, hi) => clampInt(Math.round(v / 5) * 5, lo, hi);

/* ANGLES ADD: the whole turn is the two parts, laid without overlap */
const totalOf = (a, b) => a + b;
/* the second sweep is gated so the whole stays on the protractor (≤ 180) */
const canSecondSweep = (a, b) => a + b <= 180;
const secondMax = (a) => 180 - a;
/* the missing part of a decomposed angle — 4.MD.C.7's subtraction */
const missingPart = (T, A) => T - A;
/* a degree is ONE sliver of the 360 that make the full turn */
const sliverCount = (deg) => deg;
const FULL_TURN = 360;
/* the exact fraction-of-turn names — nothing else earns one */
const fracName = (t) => (t === 90 ? 'a quarter turn' : t === 180 ? 'a half turn' : null);

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Reach the posted whole."  The target total is
   framed in gold; the FIRST sweep is pinned; the second is yours.  This is
   CCSS 4.MD.C.7's unknown-part problem, played forward.

   No false stamp, provably: CALIBRATED ⟺ a + b === T, an integer identity.
   The meter reads 100 only at equality (99 is its ceiling everywhere else),
   audited over every target × every reachable second sweep.
   ------------------------------------------------------------------------- */
function makeTarget(prev) {
  let T, A;
  do {
    T = 60 + 5 * Math.floor(Math.random() * 25); // 60 … 180, in fives
    A = 15 + 5 * Math.floor(Math.random() * ((T - 30) / 5 + 1)); // 15 … T−15
  } while (prev && T === prev.T && A === prev.A);
  return { T, A };
}
const closeness = (total, T) =>
  total === T ? 100 : Math.max(0, Math.min(99, Math.round(100 - (Math.abs(T - total) * 100) / 180)));
const isCalibrated = (total, T) => total === T;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; every scene a step's words depend on
   is pinned by STEPS[].demo; the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'An angle is a sweep',
    body:
      'A base ray is nailed down, and a carmine ray sweeps open. The arc traces the TURN — ' +
      'that turn, and nothing else, is what the angle measures. Open it to different sizes.',
    demo: { a: 45, b: 0 },
    q: 'What exactly does 45° measure?',
    choices: [
      'The amount of turn from one ray to the other',
      'The area of the region between the rays',
      'The distance between the two ray tips',
    ],
    answer: 0,
    feedback:
      'The TURN. Not the area between the rays (that grows if you imagine them longer) and ' +
      'not the tip-to-tip distance (same problem) — draw the rays a mile long and the angle ' +
      'is still 45°, because the turn between them never changed. Angle measure counts ' +
      'turning, full stop.',
  },
  {
    title: 'The degree is a sliver',
    body:
      'Behind the angle, the full circle appears — cut into 360 equal slivers. ONE sliver of ' +
      'turn is one degree. Your 45° sweep passes through exactly 45 of them.',
    demo: { a: 45, b: 0 },
    lens: { slivers: true },
    q: 'A right-angle corner turns through 90 slivers. That is…',
    choices: [
      '90 of the 360 — a quarter of the full turn',
      '90 of the 360 — about half of the full turn',
      'One ninetieth of the full turn',
    ],
    answer: 0,
    feedback:
      '90/360 is a quarter — the right-angle corner IS a quarter turn, which is why four of ' +
      'them spin you all the way round. A degree is nothing deeper than 1/360 of a turn ' +
      '(an old Babylonian choice), and measuring in degrees is just counting slivers.',
  },
  {
    title: 'Quarter, half',
    body:
      'Sweep to exactly 90 and the readout says so: a quarter turn. Push on to 180 — a half ' +
      'turn, the two rays now pointing opposite ways along one straight path.',
    demo: { a: 90, b: 0 },
    lens: { slivers: true },
    q: 'Half of a full turn measures…',
    choices: ['180° — half of 360 slivers', '90° — no wait, that is the quarter', '360° — the whole way round'],
    answer: 0,
    feedback:
      '180°, half of the 360. At 180 the swept ray points exactly opposite the base ray — a ' +
      'straight angle, the lie-flat position. (And 360 would be the full turn: back where ' +
      'you started, every sliver counted once.)',
  },
  {
    title: 'Sweep, then sweep again',
    body:
      'The second sweep is unlocked. It starts EXACTLY where the first stopped — the blue arc ' +
      'stacks onto the carmine one, no overlap, no gap. Read the total where it lands.',
    demo: { a: 40, b: 25 },
    q: 'First sweep 40°, then 25° more. The whole angle is…',
    choices: ['65° — the parts add, because the second starts where the first stopped', '40° — the first sweep sets the angle', '15° — the difference between them'],
    answer: 0,
    feedback:
      '65°. This is the additivity of angle measure (CCSS calls it exactly that): parts laid ' +
      'without overlapping make a whole whose measure is the SUM. The picture is the proof — ' +
      'the blue sweep begins at the carmine sweep’s final ray, so every sliver is counted ' +
      'once and none twice.',
  },
  {
    title: 'The protractor reads the total',
    body:
      'The gold scale swings in — 0 to 180, a tick every ten. The final ray points at the ' +
      'total, already added up. That is all a protractor has ever done.',
    demo: { a: 60, b: 55 },
    lens: { protractor: true },
    q: 'A protractor is really…',
    choices: [
      'A circle-fraction scale — it counts degree slivers from 0 for you',
      'A device that measures the area of the angle',
      'A tool for drawing perfect circles',
    ],
    answer: 0,
    feedback:
      'A counting scale: it is the sliver circle’s rim with numbers on it. Line the base ray ' +
      'on 0, and the mark under the other ray IS the count of slivers crossed — here 60 + 55 ' +
      '= 115. Reading a protractor and adding sweeps are the same act.',
  },
  {
    title: 'The missing part',
    body:
      'A right angle — the gold frame at 90 — is split in two. The first part is 35°. The ' +
      'bench shows the second part filling the rest. How big must it be?',
    demo: { a: 35, b: 55 },
    lens: { protractor: true, frame: 90 },
    q: 'A 90° corner splits into 35° and one unknown part. The unknown is…',
    choices: ['55° — because 35 + 55 = 90', '65° — because it looks about that big', '45° — the parts must be equal'],
    answer: 0,
    feedback:
      '55°: the parts must add to the whole, so the unknown is 90 − 35. Additivity run ' +
      'backwards is subtraction — every "find the missing angle" problem in Grade 4 is this ' +
      'one picture. (And no, parts of a split need not be equal — 35 and 55 just proved it.)',
  },
  {
    title: 'Reach the posted whole',
    body:
      'A gold frame posts the whole angle. The first sweep is pinned. Choose the second sweep ' +
      'so the two parts fill the frame EXACTLY.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function AngleTurnLab() {
  const [a, setA] = useState(45);
  const [b, setB] = useState(0);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const lens = current.lens || {};

  const total = totalOf(a, b);
  const pct = calib && target != null ? closeness(total, target.T) : 0;
  const calibrated = calib && target != null ? isCalibrated(total, target.T) : false;

  sceneRef.current = {
    a,
    b,
    slivers: !calib && !!lens.slivers,
    protractor: calib || !!lens.protractor,
    frame: calib && target != null ? target.T : lens.frame || null,
    calib,
    calibrated,
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
    const S = sceneRef.current;
    const RAD = Math.PI / 180;

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

    const tot = totalOf(S.a, S.b);
    const V = [W * 0.5, H * 0.64];
    const rayLen = Math.min(W, H) * 0.34;
    const pt = (deg, r) => [V[0] + Math.cos(deg * RAD) * r, V[1] - Math.sin(deg * RAD) * r];

    /* ---- the SAY band ------------------------------------------------------ */
    const sayY = 34;
    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.min(22, W / 26)}px ui-monospace, Menlo, monospace`;
    ctx.fillText(S.b > 0 ? `${S.a}° + ${S.b}° = ${tot}°` : `${S.a}°`, W / 2, sayY);
    const fn = fracName(tot);
    ctx.font = 'italic 600 13px system-ui, sans-serif';
    ctx.fillStyle = fn ? GOLD : INK_SOFT;
    ctx.fillText(
      fn
        ? `${tot} of the 360 slivers — ${fn}`
        : `${sliverCount(tot)} slivers of the ${FULL_TURN} that make a full turn`,
      W / 2,
      sayY + 26
    );

    /* ---- the sliver circle (lens) ------------------------------------------ */
    if (S.slivers) {
      const R = rayLen + 26;
      ctx.strokeStyle = 'rgba(185,135,24,0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(V[0], V[1], R, 0, Math.PI * 2);
      ctx.stroke();
      for (let d = 0; d < 360; d += 10) {
        const [x1, y1] = pt(d, R - 5);
        const [x2, y2] = pt(d, R + (d % 90 === 0 ? 9 : 4));
        ctx.strokeStyle = d % 90 === 0 ? GOLD : 'rgba(185,135,24,0.55)';
        ctx.lineWidth = d % 90 === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.fillStyle = GOLD;
      ctx.font = '600 11.5px system-ui, sans-serif';
      ctx.fillText('the full circle — 360 slivers of turn', V[0], V[1] + R + 20);
    }

    /* ---- the protractor (lens): 0–180 rim with numbers --------------------- */
    if (S.protractor) {
      const R = rayLen + 26;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(V[0], V[1], R, Math.PI, 2 * Math.PI);
      ctx.stroke();
      for (let d = 0; d <= 180; d += 10) {
        const [x1, y1] = pt(d, R - (d % 30 === 0 ? 10 : 6));
        const [x2, y2] = pt(d, R);
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = d % 30 === 0 ? 1.8 : 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (d % 30 === 0) {
          const [tx, ty] = pt(d, R + 15);
          ctx.fillStyle = GOLD;
          ctx.font = '600 11.5px ui-monospace, Menlo, monospace';
          ctx.fillText(String(d), tx, ty);
        }
      }
    }

    /* ---- the posted frame (capstone / missing-part step) ------------------- */
    if (S.frame != null) {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(V[0], V[1], rayLen * 0.86, -S.frame * RAD, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      const [fx, fy] = pt(S.frame, rayLen * 0.86);
      ctx.fillStyle = GOLD;
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText(`the whole: ${S.frame}°`, fx, fy - 16);
    }

    /* ---- the two sweeps ----------------------------------------------------- */
    /* first sweep arc */
    if (S.a > 0) {
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(V[0], V[1], rayLen * 0.52, -S.a * RAD, 0);
      ctx.stroke();
      const [mx, my] = pt(S.a / 2, rayLen * 0.66);
      ctx.fillStyle = CARMINE;
      ctx.font = '700 13px ui-monospace, Menlo, monospace';
      ctx.fillText(`${S.a}°`, mx, my);
    }
    /* second sweep arc, stacking on */
    if (S.b > 0) {
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(V[0], V[1], rayLen * 0.4, -tot * RAD, -S.a * RAD);
      ctx.stroke();
      const [mx, my] = pt(S.a + S.b / 2, rayLen * 0.3);
      ctx.fillStyle = BLUE;
      ctx.font = '700 13px ui-monospace, Menlo, monospace';
      ctx.fillText(`${S.b}°`, mx, my);
    }

    /* base ray */
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(V[0], V[1]);
    ctx.lineTo(V[0] + rayLen, V[1]);
    ctx.stroke();
    /* the handoff ray (where sweep 1 ended), dashed when a second sweep runs */
    if (S.b > 0 && S.a > 0) {
      const [hx, hy] = pt(S.a, rayLen * 0.92);
      ctx.strokeStyle = 'rgba(200,30,79,0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(V[0], V[1]);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    /* the final ray */
    {
      const [fx, fy] = pt(tot, rayLen);
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(V[0], V[1]);
      ctx.lineTo(fx, fy);
      ctx.stroke();
    }
    /* the vertex */
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(V[0], V[1], 4, 0, Math.PI * 2);
    ctx.fill();
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
      setA(dm.a);
      setB(dm.b);
    }
    if (STEPS[step].calib) {
      const t = makeTarget(null);
      setTarget(t);
      setA(t.A);
      setB(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    const dm = current.demo;
    if (dm) {
      setA(dm.a);
      setB(dm.b);
    } else if (calib && target) {
      setB(0);
    }
  };

  const setDial = (key, raw) => {
    if (key === 'first') {
      const na = clamp5(raw, 0, 180);
      setA(na);
      setB((v) => Math.min(v, secondMax(na)));
    } else {
      setB(clamp5(raw, 0, secondMax(a)));
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken =
    (b > 0 ? `${a} degrees, then ${b} more: the whole angle is ${total} degrees.` : `The angle is ${a} degrees.`) +
    (fracName(total) ? ` That is ${fracName(total)}.` : '') +
    (calib && target ? ` The posted whole is ${target.T} degrees, first part pinned at ${target.A}.` : '');

  return (
    <div className="atlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Angles: Turns That Add</h1>
        <p className="lede">
          A degree is <em>1/360 of a full turn</em>, and angle measure is a count of those
          slivers. Sweep once, then sweep on — the parts stack, the measures add, and the missing
          part is a subtraction.
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
            {calibrated ? ' Calibrated — the two parts fill the posted whole exactly.' : ''}
          </p>

          <div className="toolbar">
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
            {DIALS.filter((dl) => !(calib && dl.key === 'first')).map((dl) => {
              const unlocked = step >= dl.unlock;
              const value = dl.key === 'first' ? a : b;
              const max = dl.key === 'second' ? secondMax(a) : dl.max;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={dl.key}>
                  <span className="dk" style={{ color: dl.color }}>
                    {dl.name}
                  </span>
                  <span className="drole">{unlocked ? dl.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={dl.min}
                    max={max}
                    step={5}
                    value={value}
                    disabled={!unlocked}
                    aria-label={`${dl.name} — ${dl.role}`}
                    onChange={(e) => setDial(dl.key, e.target.value)}
                    style={{ accentColor: dl.color }}
                  />
                  <output className="dv" style={unlocked ? { color: dl.color } : undefined}>
                    {unlocked ? `${value}°` : '🔒'}
                  </output>
                </label>
              );
            })}
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
                <span className="target-k">The whole must reach</span>
                <span className="target-word">{target.T}°</span>
                <span className="target-hint mono">
                  {calibrated
                    ? `${target.A}° + ${b}° = ${target.T}° — exactly`
                    : `the first part is pinned at ${target.A}° — find the rest`}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {calibrated ? 'the frame is filled' : total > target.T ? 'swept past the frame' : 'sweeping…'}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {target.A}° + {b}° = {total}°
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target);
                  setTarget(t);
                  setA(t.A);
                  setB(0);
                }}
              >
                New whole
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
                  setA(45);
                  setB(0);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">1° = 1/360 turn · 90° = quarter turn · 40° + 25° = 65°</span>{' '}
        &nbsp;·&nbsp; angle measure as a fraction of the circle (CCSS 4.MD.C.5), read off the
        protractor&apos;s circle-fraction scale (4.MD.C.6), and ADDITIVE: parts stack, measures
        add, and the missing part is the whole minus the known (4.MD.C.7).
      </footer>

      <style jsx>{`
        .atlab {
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
          grid-template-columns: 96px 1fr 46px;
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
          font-size: 16px;
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
          font-size: 30px;
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
        :global(.atlab) :focus-visible {
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
