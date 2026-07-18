'use client';

/* ============================================================================
   CircleTheoremsLab — an interactive "bench" for the INSCRIBED ANGLE
   THEOREM and its two famous corollaries: the angle in a semicircle is
   right, and a cyclic quadrilateral's opposite angles are supplementary.

        one arc · two readings
        the center reads the arc at the full rate  (10° per tick)
        the rim reads the same arc at half rate    (5° per tick)
        ⇒ inscribed = central / 2 — wherever the rim vertex stands

   Built for MAIS (math AI system, www.mais.ac), K-12.  GRADES 9–12 ·
   CCSS G-C.A.1–4.  CircleLab treats the circle as a coordinate object;
   nothing in the library states the circle's angle theorems.  This bench
   owns the most beautiful invariant available to school geometry: drag
   the vertex anywhere on its arc and the angle refuses to move.

   THE SIGNATURE CENTERPIECE — "THE WANDERING VERTEX AND THE ARC BANK."
     A circle with 36 tick marks.  Two points A and B fence off a gold
     arc; the center O reads it as a central angle, and a carmine vertex
     P on the far rim reads the SAME arc as an inscribed angle.  The
     vertex dial sends P wandering along the whole major arc while its
     readout stands still — the arc owns the angle, not the vertex.  A
     marked dial stop aligns P–B through the center, where two radii make
     the isosceles triangle whose exterior angle IS the proof of the 2:1.
     Stretch the arc to a semicircle and Thales' right angle appears at
     half of 180°; post a second reader Q on the minor arc and the two
     readings split the full circle — 180° between them, the cyclic
     quadrilateral.  The capstone posts a central angle: rule the
     inscribed reading, then the far-side reading, both exact, or no stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • CircleLab owns the coordinate circle (center, radius, the equation);
       no coordinate appears here and no equation of a circle is written.
     • PiLab owns the rolling wheel and the circumference ratio; nothing
       rolls, and circumference is never mentioned.
     • UnitCircleLab owns wrapping the number line and the radian; every
       angle here is a whole number of degrees read off integer arc ticks.
     • AngleLab and AngleTurnLab own single-angle measurement as a turn;
       this bench never measures one angle in isolation — its subject is
       the RELATION between two readings of one arc.
     • TriangleLab owns draggable vertices; the vertex here wanders by
       dial.  TrigRatioLab owns side quotients; no side length and no
       hypotenuse is ever taken.
     • The model computes every angle by integer arithmetic on ticks —
       Math.acos appears nowhere; pixel trigonometry lives only in the
       renderer.

   One-accent discipline: CARMINE is THE INSCRIBED ANGLE — the theorem's
   subject.  GOLD is the ARC and the center's wedge (the currency both
   readings spend).  BLUE is the quiet fence posts A and B.  GREEN only
   for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • The circle carries 36 integer ticks; an arc of a ticks yields a
       central angle of exactly 10a° and an inscribed angle of exactly
       5a° — integers on every scene this bench can pose.  No angle a
       student sees is ever computed by floating trigonometry.
     • The audit re-verifies the geometry itself: for every arc and every
       legal vertex position it places the points on a unit circle and
       confirms the actual vector angle at P equals the model's 5a° to
       within 1e-9 — the integer bookkeeping and the plane agree.
     • Invariance is proved by exhausting the vertex's whole range; the
       supplementary law 5a + 5(36 − a) = 180 is proved over every arc.
     • The geometer's stamp needs two exact rulings (the inscribed
       reading, then the far-side reading), audited over every posted
       case × every chip pair; the truth chip is always present and
       never duplicated.
   Verified by audit-circletheorems.mjs (numeric + geometric proof +
   source greps) and verify-circletheorems.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/CircleTheoremsLab.jsx
     2. Import and render it:
          import CircleTheoremsLab from './CircleTheoremsLab';
          export default function Page() { return <CircleTheoremsLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the arc, the
              vertex tick, the lesson step, answers, the rulings).
     MODEL  — integer ticks and integer degrees; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the inscribed angle
const BLUE = '#3f74a6'; // the fence posts A and B
const GOLD = '#b98718'; // the arc and the center's wedge
const INK_HEX = '#1c2b3a';

const TICKS = 36; // the circle's integer positions
const RATE = 10; // the center's rate: degrees per tick
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Integer ticks; angles by arithmetic, never by trig.
   A sits at tick 0, B at tick a (the minor arc has a ticks); the vertex P
   wanders the major arc, ticks a+1 … 35.
   ------------------------------------------------------------------------- */
const centralOf = (a) => a * RATE;
const inscribedOf = (a) => (a * RATE) / 2; /* 5° per tick — integer for all a */
const oppositeOf = (a) => 180 - inscribedOf(a); /* the minor-arc reading */
const vertexMin = (a) => a + 1;
const vertexMax = () => TICKS - 1;
const diameterStop = (a) => (a + TICKS / 2) % TICKS; /* P–B through the center */
const quadTick = (a) => Math.floor(a / 2); /* Q, the far-side reader */

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The geometer's stamp."  A central angle is
   posted; rule the inscribed reading, then the far-side reading.
   ------------------------------------------------------------------------- */
const ARC_CASES = [4, 6, 8, 10, 12, 14, 16];
function makeCase(prev) {
  let a;
  do {
    a = ARC_CASES[Math.floor(Math.random() * ARC_CASES.length)];
  } while (prev != null && a === prev);
  return a;
}
const dedupe4 = (cands) => {
  const seen = new Set();
  const out = [];
  for (const v of cands) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
    if (out.length === 4) break;
  }
  return out.sort((x, y) => x - y).map(String);
};
const inscTruth = (a) => inscribedOf(a);
const inscChips = (a) => {
  const C = centralOf(a);
  return dedupe4([C / 2, C, 180 - C / 2, C / 2 + 10, 90]);
};
const oppTruth = (a) => oppositeOf(a);
const oppChips = (a) => {
  const C = centralOf(a);
  const T = 180 - C / 2;
  return dedupe4([T, C / 2, 180 - C, 90, C, T - 10, T + 10]);
};
const calibChecks = (a, inscPick, oppPick) => {
  if (a == null) return [false, false];
  const inscOK = inscPick != null && inscPick === String(inscTruth(a));
  const oppOK = inscOK && oppPick != null && oppPick === String(oppTruth(a));
  return [inscOK, oppOK];
};
const closeness = (a, i, o) =>
  Math.round((100 * calibChecks(a, i, o).filter(Boolean).length) / 2);
const isCalibrated = (a, i, o) => calibChecks(a, i, o).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that the vertex matters, that
   halving is a coincidence, that the center and rim read alike.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Two angles, one arc',
    body:
      'A circle with 36 tick marks. Points A and B fence off a gold arc of 8 ticks. The ' +
      'center O reads that arc as one angle; a vertex P out on the rim reads the very ' +
      'same arc as its own. Both readouts are posted — compare them.',
    arc: 8,
    q: 'Central 80°, inscribed 40°. The relationship?',
    choices: [
      'The inscribed angle is exactly half the central angle standing on the same arc',
      'It is 40° less — subtraction, not halving',
      'A coincidence of this particular arc',
    ],
    answer: 0,
    feedback:
      'Half, exactly — and not just here. The two angles are two READINGS of one thing: ' +
      'the arc. The center charges the full rate, ten degrees per tick; the rim charges ' +
      'half rate, five. Change the arc and both move together, locked 2 : 1. The next ' +
      'step attacks the part that seems too good: does the rim’s reading depend on WHERE ' +
      'its vertex stands?',
  },
  {
    title: 'The vertex wanders',
    body:
      'Send P wandering along its arc with the dial — close to A, close to B, anywhere ' +
      'between. Watch the inscribed readout while it travels.',
    arc: 8,
    vertexDial: true,
    q: 'P wanders the whole far arc. Its angle…',
    choices: [
      'Never moves — every vertex on that arc reads the same 40°; the arc owns the angle, not the vertex',
      'Grows near the middle, shrinks near the ends',
      'Depends on which direction P came from',
    ],
    answer: 0,
    feedback:
      'Fixed at 40°, from every seat in the house. That is the inscribed-angle theorem’s ' +
      'real content: the angle is a property of the ARC, and the rim vertex is only a ' +
      'reader. All the vertices of the far arc form one family sharing one angle — which ' +
      'is what makes the theorem a tool: any of them can stand in for any other. ' +
      'Surveyors use exactly this freedom — to sight a fixed arc, any observation post ' +
      'on the rim serves equally well.',
  },
  {
    title: 'Why half — the two radii',
    body:
      'Slide P until the dashed line appears: P, O and B in a row. Now look at triangle ' +
      'OPA. Two of its sides are radii of the same circle — it is isosceles — and the ' +
      'central angle at O stands OUTSIDE it.',
    arc: 8,
    vertexDial: true,
    q: 'OP and OA are radii. Why does that force the half?',
    choices: [
      'Isosceles: the base angles at P and A are equal, and the exterior angle at O collects both — twice the rim’s angle',
      'Radii are half of diameters, so angles halve too',
      'It doesn’t force anything; halving is an experimental fact',
    ],
    answer: 0,
    feedback:
      'The exterior-angle bookkeeping is the entire proof: the angle at O, outside the ' +
      'isosceles triangle, equals the sum of the two equal base angles — twice the angle ' +
      'at P. A general vertex just splits its angle into two such triangles, and the ' +
      'halves add up. No measuring was consulted: the 2 : 1 is forced by two radii ' +
      'being equal lengths.',
  },
  {
    title: 'Thales: the borrowed right angle',
    body:
      'Stretch the arc with its dial to 18 ticks — a full half-circle. A and B are now ' +
      'the two ends of a diameter, and the central angle is a straight 180°.',
    arc: 8,
    arcDial: true,
    vertexDial: true,
    q: 'The inscribed angle on a semicircle is…',
    choices: [
      '90° — half of the straight angle; every triangle standing on a diameter is right-angled at the rim',
      '180° — the same as the center reads',
      '60° — semicircles favor nice numbers',
    ],
    answer: 0,
    feedback:
      'Half of 180° is 90°, wherever the rim vertex stands — an entire family of right ' +
      'angles, free of charge, from one diameter. Builders have squared corners this way ' +
      'for millennia. Thales’ theorem is the inscribed-angle theorem wearing work ' +
      'clothes, and it is the oldest theorem with a name attached.',
  },
  {
    title: 'The far side of the fence',
    body:
      'One more reader: Q, standing on the MINOR arc, between the fence posts. From ' +
      'there Q cannot see its own side — it reads the arc P stands on: the other 28 ticks.',
    arc: 8,
    quad: true,
    q: 'P reads 40°. Q reads…',
    choices: [
      '140° — Q’s arc is the other 28 ticks at 5° each; the two readings always total 180°',
      '40° — same circle, same angle',
      '320° — the whole way around',
    ],
    answer: 0,
    feedback:
      'Together P and Q read every tick of the circle exactly once, at the half rate: ' +
      '36 × 5° = 180°. That is why a quadrilateral inscribed in a circle has opposite ' +
      'angles summing to 180° — each pair of opposite corners splits the whole circle ' +
      'between them. One theorem, three costumes: the half, the right angle, the ' +
      'supplementary pair. And Q obeys the wandering law on its own arc too — both ' +
      'readings are properties of arcs, never of the vertices that happen to read them.',
  },
  {
    title: 'The geometer’s stamp',
    body:
      'An arc is posted by its central angle. Rule the inscribed reading from the far ' +
      'arc, then the reading from the near side. Both exact, or no stamp.',
    arc: 8,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CircleTheoremsLab() {
  const [arcA, setArcA] = useState(8);
  const [vertexP, setVertexP] = useState(22);
  const [inscPick, setInscPick] = useState(null);
  const [oppPick, setOppPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const aNow = calib && kase != null ? kase : arcA;
  const pNow = calib && kase != null ? diameterStop(kase) : Math.min(Math.max(vertexP, vertexMin(aNow)), vertexMax());

  const checks = calib ? calibChecks(kase, inscPick, oppPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, inscPick, oppPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, inscPick, oppPick) : false;

  sceneRef.current = {
    a: aNow,
    p: pNow,
    calib,
    quad: !!current.quad || calib,
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

    const bandH = 50;
    const boxW = Math.min(224, W * 0.32);
    const cx = (W - boxW) / 2;
    const cy = bandH + (H - bandH) / 2;
    const R = Math.min((W - boxW) / 2 - 40, (H - bandH) / 2 - 34);

    /* tick t → plane point (tick 0 at the top, clockwise) */
    const pt = (t, r = R) => {
      const rad = ((t * RATE - 90) * Math.PI) / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    };

    /* the circle and its ticks */
    ctx.strokeStyle = 'rgba(91,107,123,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.lineWidth = 1;
    for (let t = 0; t < TICKS; t++) {
      const [x1, y1] = pt(t, R - 4);
      const [x2, y2] = pt(t, R + 4);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    /* the gold arc A→B (the minor arc) */
    const radOf = (t) => ((t * RATE - 90) * Math.PI) / 180;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, radOf(0), radOf(S.a));
    ctx.stroke();

    /* the center's wedge */
    const O = [cx, cy];
    const A = pt(0);
    const B = pt(S.a);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(...O);
    ctx.lineTo(...A);
    ctx.moveTo(...O);
    ctx.lineTo(...B);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 22, radOf(0), radOf(S.a));
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '700 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('O', cx - 10, cy + 6);

    /* fence posts A, B */
    for (const [pos, name, t] of [
      [A, 'A', 0],
      [B, 'B', S.a],
    ]) {
      ctx.fillStyle = BLUE;
      ctx.beginPath();
      ctx.arc(pos[0], pos[1], 5.5, 0, 2 * Math.PI);
      ctx.fill();
      const [lx, ly] = pt(t, R + 18);
      ctx.fillText(name, lx, ly);
    }

    /* the wandering vertex P and its rays */
    const P = pt(S.p);
    const drawReader = (V, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(...V);
      ctx.lineTo(...A);
      ctx.moveTo(...V);
      ctx.lineTo(...B);
      ctx.stroke();
      /* the angle marker at V */
      const a1 = Math.atan2(A[1] - V[1], A[0] - V[0]);
      const a2 = Math.atan2(B[1] - V[1], B[0] - V[0]);
      let d = a2 - a1;
      while (d <= -Math.PI) d += 2 * Math.PI;
      while (d > Math.PI) d -= 2 * Math.PI;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(V[0], V[1], 20, a1, a1 + d, d < 0);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(V[0], V[1], 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(V[0], V[1], 6, 0, 2 * Math.PI);
      ctx.stroke();
    };
    drawReader(P, CARMINE);
    ctx.fillStyle = CARMINE;
    const [plx, ply] = pt(S.p, R + 18);
    ctx.fillText('P', plx, ply);

    /* the diameter stop: P–O–B in a row */
    if (S.p === diameterStop(S.a)) {
      ctx.strokeStyle = 'rgba(28,43,58,0.5)';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(...P);
      ctx.lineTo(...B);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* Q, the far-side reader */
    if (S.quad) {
      const Q = pt(quadTick(S.a));
      drawReader(Q, 'rgba(200,30,79,0.55)');
      ctx.fillStyle = 'rgba(200,30,79,0.8)';
      const [qlx, qly] = pt(quadTick(S.a), R + 18);
      ctx.fillText('Q', qlx, qly);
    }

    /* the readings box */
    const bx = W - boxW + 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the readings', bx, bandH + 8);
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillStyle = GOLD;
    ctx.fillText(`arc AB: ${S.a} ticks`, bx, bandH + 30);
    ctx.fillText(`central at O: ${centralOf(S.a)}°`, bx, bandH + 48);
    ctx.fillStyle = CARMINE;
    ctx.fillText(
      S.calib ? 'inscribed at P: ?' : `inscribed at P: ${inscribedOf(S.a)}°`,
      bx,
      bandH + 70
    );
    if (S.quad) {
      ctx.fillText(S.calib ? 'at Q: ?' : `at Q: ${oppositeOf(S.a)}°`, bx, bandH + 88);
      if (!S.calib)
        ctx.fillText(`sum: ${inscribedOf(S.a) + oppositeOf(S.a)}°`, bx, bandH + 106);
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib
        ? `central angle ${centralOf(S.a)}° · rule both rim readings`
        : `one arc · two readings · the rim pays half`,
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
    const st = STEPS[step];
    setArcA(st.arc);
    setVertexP(diameterStop(st.arc) + 4 <= vertexMax() ? diameterStop(st.arc) + 4 : vertexMax());
    setInscPick(null);
    setOppPick(null);
    if (st.calib) setKase(makeCase(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* keep the vertex legal when the arc grows */
  useEffect(() => {
    setVertexP((p) => Math.min(Math.max(p, vertexMin(arcA)), vertexMax()));
  }, [arcA]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setArcA(current.arc);
    setVertexP(diameterStop(current.arc) + 4);
    setInscPick(null);
    setOppPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: central angle ${kase != null ? centralOf(kase) : '?'} degrees. Inscribed ruled ${inscPick ?? 'nothing'}; far side ${oppPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Arc ${aNow} ticks: central ${centralOf(aNow)} degrees, inscribed ${inscribedOf(aNow)} degrees at every vertex position${current.quad ? `, far-side reading ${oppositeOf(aNow)} degrees, sum 180` : ''}.`;

  return (
    <div className="ctlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Circle Theorems: The Angle the Arc Owns</h1>
        <p className="lede">
          The center reads an arc at full rate; any vertex on the rim reads the{' '}
          <em>same arc</em> at half rate — and the reading refuses to change while the
          vertex wanders. Half, the borrowed right angle, and the 180° pair are one
          theorem in three costumes — and every angle on this bench is a whole number of
          degrees, read from integer arc ticks.
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

          {(current.arcDial || current.vertexDial) && (
            <div className="dials">
              {current.arcDial && (
                <div className="dial">
                  <div className="dial-head">
                    <span className="dial-k">the arc</span>
                    <span className="dial-v mono">{arcA} ticks</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={18}
                    step={1}
                    value={arcA}
                    onChange={(e) => setArcA(Number(e.target.value))}
                    aria-label={`Arc, ${arcA} ticks`}
                  />
                </div>
              )}
              {current.vertexDial && (
                <div className="dial">
                  <div className="dial-head">
                    <span className="dial-k">the wandering vertex</span>
                    <span className="dial-v mono">
                      tick {vertexP}
                      {vertexP === diameterStop(arcA) ? ' · the diameter stop' : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={vertexMin(arcA)}
                    max={vertexMax()}
                    step={1}
                    value={vertexP}
                    onChange={(e) => setVertexP(Number(e.target.value))}
                    aria-label={`Vertex at tick ${vertexP}`}
                  />
                </div>
              )}
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
                <span className="target-k">The posted arc</span>
                <span className="target-word">central angle {centralOf(kase)}°</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} the inscribed reading at P, ruled
                  </li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} the far-side reading at Q, ruled
                  </li>
                </ol>
                <div className="declare" role="group" aria-label="Inscribed ruling">
                  {inscChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (inscPick === c2 ? ' active' : '')}
                      onClick={() => setInscPick(c2)}
                    >
                      P: {c2}°
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Far-side ruling">
                  {oppChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (oppPick === c2 ? ' active' : '')}
                      onClick={() => setOppPick(c2)}
                    >
                      Q: {c2}°
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the circle closes'
                    : checks[0]
                      ? 'P ruled — Q reads the rest of the circle'
                      : 'the rim pays half — rule P first'}
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
                  <span className="mono target-hint">P · then Q</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setInscPick(null);
                  setOppPick(null);
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
                  setInscPick(null);
                  setOppPick(null);
                  setArcA(8);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">the arc owns the angle · the vertex only reads it</span>{' '}
        &nbsp;·&nbsp; inscribed = central ÷ 2 on the same arc; a diameter lends every rim
        vertex a right angle; opposite corners of a cyclic quadrilateral split the circle —
        180° between them.
      </footer>

      <style jsx>{`
        .ctlab {
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
        :global(.ctlab) :focus-visible {
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
