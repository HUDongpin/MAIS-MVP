'use client';

/* ============================================================================
   EqualSignLab — an interactive "bench" for THE EQUAL SIGN: a CLAIM that two
   names name the same number — sometimes true, sometimes false.

        8 = 8        8 = 5 + 3        5 + 3 = 4 + 4        5 + 3 = 9  (false!)

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 1 lab — CCSS
   1.OA.D.7 ("understand the meaning of the equal sign, and determine if
   equations involving addition and subtraction are true or false").  This is
   the most consequential misconception in early arithmetic: children read
   "=" as "the answer comes next", an instruction to compute — and that
   operator-reading poisons algebra years later, where 8 = 5 + 3 and
   x + 2 = 7 make no sense as commands.  This lab teaches the sign as a
   RELATION, and it does the one thing no sibling does: it shows FALSE
   equations, welcomes them, and lets a child judge and repair them.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE SIGN IS A PICTURE OF TWO LEVEL LINES."
     Each side of the claim is a TOWER of stacked cubes (a sum stacks its two
     addends, blue then teal).  Between the towers, the equal sign itself is
     drawn as TWO CARMINE PLANKS bridging from the left top to the right top.
     When both sides name the same number the tops agree, the planks lie
     LEVEL and parallel — they literally form the glyph "=".  When the sides
     disagree the planks SLOPE, the glyph visibly breaks, and the verdict
     reads FALSE with the gap counted in steps.  The sign's own shape — two
     level lines — turns out to be a picture of what it claims.  Nothing is
     computed "into" the sign and nothing comes after it; the towers just
     stand there, and either their tops meet or they don't.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • EquationLab owns the BALANCE SCALE, the unknown x, and SOLVING (do the
       same to both sides).  This lab has no pans, no beam, no unknown, and
       solves nothing: both sides are fully known, and the only question is
       true or false — the question EquationLab never asks, because its beam
       always holds a solvable equation.  The audit greps out the entire
       balance vocabulary.
     • AssociativeAdditionLab owns rod TRAINS whose equal totals end on one
       gold plumb line.  No rods, no trains, no plumb line here: the towers
       are vertical, the device is the glyph's own two planks, and the claim
       under test is allowed to be FALSE — a state that lab never shows.
     • ComparingLab owns comparing two NUMBERS by size and choosing among
       >, =, <.  This lab never offers those symbols and never asks which is
       greater: its subject is one symbol, =, read as a sentence that can be
       judged — and its sides are EXPRESSIONS, which ComparingLab never has.
     • MeanLab (grades 4–6) owns cube towers POURED level to find the mean.
       Nothing pours here; the towers never share cubes.  Two towers, one
       claim, no redistribution.
     • NumberBondLab owns decomposing one number; AddLab owns computing a sum.
       Here sums are never computed into a result — they are stood up whole,
       as names.

   One-accent discipline: CARMINE is THE SIGN — the two planks and the "=" in
   the written claim.  The left side's cubes are blue, the right side's teal
   (two-object precedent: ComparingLab, RatioLab).  The verdict is GREEN only
   when the claim is TRUE (a healthy claim; green stays the "correct" colour);
   a false claim's verdict and gap are slate.  GOLD marks the two tower-top
   guide lines in the lesson's teaching moments.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a six-year-old):
     • Everything is exact integer arithmetic: a side's value is a sum of one
       or two integers; the claim is true iff the two values are equal; the
       planks are level iff the claim is true (audited as an equivalence).
     • The capstone's diagnosis is the exact sign of (left − right) of the
       ARRIVING claim, and the healing value is unique: r₂ = l₁ + l₂ − r₁,
       which the generator guarantees lives inside the dial's range.  The
       stamp needs the diagnosis right AND the claim currently true — two
       integer identities, audited over every reachable state.
   Verified by audit-equalsign.mjs (numeric proof + source greps) and
   verify-equalsign.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/EqualSignLab.jsx
     2. Import and render it:
          import EqualSignLab from './EqualSignLab';
          export default function Page() { return <EqualSignLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the claim's four
              numbers, the lesson step, answers, the capstone's diagnosis).
     MODEL  — pure integer arithmetic; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  One dial: the claim's LAST number.  Everything else
   a step pins.  A claim is {l1, l2, r1, r2}; l2 and r2 may be null (a side
   can be a single number).
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the sign: the two planks, the written =
const BLUE = '#3f74a6'; // the left side's cubes
const TEAL = '#2b8a8a'; // the right side's cubes
const GOLD = '#b98718'; // tower-top guide lines
const SLATE = '#5b6b7b';

const DIALS = [
  { key: 'r2', name: 'Last number', role: 'the claim’s final number · 0–10', min: 0, max: 10, unlock: 4, color: TEAL },
];

const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integers, nothing else.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

const sideVal = (a, b) => a + (b == null ? 0 : b);
const leftVal = (c) => sideVal(c.l1, c.l2);
const rightVal = (c) => sideVal(c.r1, c.r2);
const isTrue = (c) => leftVal(c) === rightVal(c);
const gapOf = (c) => Math.abs(leftVal(c) - rightVal(c));

/* which tower overtops the other — the capstone's diagnosis */
function diagOf(c) {
  const d = leftVal(c) - rightVal(c);
  return d > 0 ? 'left' : d < 0 ? 'right' : 'level';
}

/* the written claim, side by side with the picture */
const sideText = (a, b) => (b == null ? `${a}` : `${a} + ${b}`);
const claimText = (c) => `${sideText(c.l1, c.l2)} = ${sideText(c.r1, c.r2)}`;

/* the unique healing value for the capstone's dial slot */
const healingR2 = (c) => leftVal(c) - c.r1;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The claim clinic."  A claim walks in — maybe true,
   maybe false.  The child commits twice: DIAGNOSE the arriving claim (left
   taller / level / right taller), then turn the Last-number dial until the
   planks lie level.  A claim that arrived healthy just needs the diagnosis.

   No false stamp, provably: the stamp needs
       pick === diagOf(the claim AS IT ARRIVED)   AND   the claim NOW true.
   The healing value r₂ = l₁ + l₂ − r₁ is unique and the generator keeps it
   inside 1…10, so every sick claim is curable.  Audited over the generator's
   whole domain × every pick × every dial position.
   ------------------------------------------------------------------------- */
function makeClaim(prev) {
  let c;
  do {
    const l1 = 1 + Math.floor(Math.random() * 7); // 1…7
    const l2 = 1 + Math.floor(Math.random() * 7);
    let r1 = 1 + Math.floor(Math.random() * 7);
    if (l1 + l2 - r1 < 1 || l1 + l2 - r1 > 10) r1 = Math.max(1, l1 + l2 - 5); // keep the cure in range
    const r2 = Math.max(0, Math.min(10, l1 + l2 - r1 + [ -2, -1, 0, 1, 2 ][Math.floor(Math.random() * 5)]));
    c = { l1, l2, r1, r2 };
  } while (prev != null && claimText(c) === claimText(prev));
  return c;
}
const calibChecks = (pick, arrived, current) => [pick != null && pick === diagOf(arrived), isTrue(current)];
const closeness = (pick, arrived, current) => Math.round((100 * calibChecks(pick, arrived, current).filter(Boolean).length) / 2);
const isCalibrated = (pick, arrived, current) => calibChecks(pick, arrived, current).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; every claim a step's words name is
   pinned by STEPS[].demo; the reveal lives in the feedback.  The distractors
   are the real first-grade beliefs — above all "the answer comes next".
   Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'What the sign says',
    body: 'Two towers, both eight cubes tall. The two red planks between them lie level — that IS the equal sign.',
    demo: { l1: 8, l2: null, r1: 8, r2: null },
    q: 'What does “=” say?',
    choices: ['Both sides name the same number', 'The answer comes next', 'Add everything up'],
    answer: 0,
    feedback:
      '“=” makes a claim: whatever stands on my left and whatever stands on my right name the ' +
      'SAME number. It is not a command to do anything — nothing needs computing in 8 = 8. The ' +
      'two level planks are the whole meaning.',
  },
  {
    title: 'The answer can live on the left',
    body: 'Read this one out loud: “eight IS five plus three.” The sum stands on the right, whole.',
    demo: { l1: 8, l2: null, r1: 5, r2: 3 },
    q: 'Is “8 = 5 + 3” allowed?',
    choices: ['Yes — both sides name 8, so the claim is true', 'No — the sum has to come first', 'No — you must write 5 + 3 = 8'],
    answer: 0,
    feedback:
      'Perfectly allowed, and true. If “=” meant “here comes the answer”, this sentence would be ' +
      'illegal — but “=” never meant that. 8 = 5 + 3 and 5 + 3 = 8 make exactly the same claim, ' +
      'the way “eight is five plus three” and “five plus three is eight” say the same thing.',
  },
  {
    title: 'A claim can be false',
    body: 'Look at the planks now. The left tower stops at 8; the right stands 9 tall. The glyph breaks.',
    demo: { l1: 5, l2: 3, r1: 9, r2: null },
    q: '“5 + 3 = 9” — true or false?',
    choices: ['False — the towers miss by one step', 'True', 'You are not allowed to write it'],
    answer: 0,
    feedback:
      'False — and writing it is fine! An equals sign makes a claim, and claims can be wrong. ' +
      'Writing a false equation breaks nothing; only believing it does. The sloped planks show ' +
      'the miss: one step. Judging a claim true or false is a skill, and now you have it.',
  },
  {
    title: 'Two sums, one number',
    body: 'Neither side is “the answer” here. Two different names, and the claim says they name the same number.',
    demo: { l1: 5, l2: 3, r1: 4, r2: 4 },
    q: 'Is “6 + 2 = 3 + 5” true or false?',
    choices: ['True — both towers reach 8', 'False — the numbers are all different', 'It cannot be judged'],
    answer: 0,
    feedback:
      'True: 6 + 2 names 8 and 3 + 5 names 8. The numbers being different does not matter — ' +
      'names are allowed to look different. That is the whole point of a name: 5 + 3, 4 + 4, ' +
      'and 8 are three costumes on one number.',
  },
  {
    title: 'Make it and break it',
    body: 'The Last-number dial is yours. Slide it and watch the planks catch level — exactly once.',
    demo: { l1: 5, l2: 3, r1: 4, r2: 2 },
    q: 'In “5 + 3 = 4 + ◻”, how many choices of ◻ make the claim true?',
    choices: ['Exactly one — 4', 'Two or three', 'Every number works'],
    answer: 0,
    feedback:
      'Exactly one. The tops must meet precisely: one cube short and the claim is false, one ' +
      'cube over and it is false again. An equal sign is a knife-edge — and that is why it is ' +
      'worth so much: when it holds, it holds exactly.',
  },
  {
    title: 'The claim clinic',
    body:
      'A claim walks in — maybe healthy, maybe not. First diagnose it: which tower stands ' +
      'taller? Then, if it is sick, turn the dial until the planks lie level.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function EqualSignLab() {
  const [claim, setClaim] = useState(STEPS[0].demo);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [arrived, setArrived] = useState(null); // the capstone claim as it walked in
  const [pick, setPick] = useState(null); // 'left' | 'level' | 'right'

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;

  const truth = isTrue(claim);
  const pct = calib && arrived != null ? closeness(pick, arrived, claim) : 0;
  const calibrated = calib && arrived != null ? isCalibrated(pick, arrived, claim) : false;
  const checks = calib && arrived != null ? calibChecks(pick, arrived, claim) : [false, false];

  sceneRef.current = { claim, truth, calib, diagnosed: checks[0] };

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
    const c = S.claim;

    const rr = (x, y, w, h, rad) => {
      const rC = Math.max(0, Math.min(rad, w / 2, h / 2));
      ctx.beginPath();
      ctx.moveTo(x + rC, y);
      ctx.arcTo(x + w, y, x + w, y + h, rC);
      ctx.arcTo(x + w, y + h, x, y + h, rC);
      ctx.arcTo(x, y + h, x, y, rC);
      ctx.arcTo(x, y, x + w, y, rC);
      ctx.closePath();
    };

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

    const L = leftVal(c);
    const R = rightVal(c);

    /* bands: claim text on top, verdict beneath it, towers below */
    const bandH = 92;
    const baseY = H - 34;
    const maxVal = Math.max(L, R, 10);
    const u = Math.min(30, (H - bandH - 70) / maxVal);
    const towerW = Math.min(64, W * 0.12);
    const lx = W * 0.32 - towerW / 2;
    const rx = W * 0.68 - towerW / 2;

    /* the written claim — the = in carmine, the sides in their colours */
    ctx.textBaseline = 'middle';
    ctx.font = '700 26px ui-monospace, Menlo, monospace';
    const lt = sideText(c.l1, c.l2);
    const rt = sideText(c.r1, c.r2);
    const wl = ctx.measureText(lt).width;
    const weq = ctx.measureText(' = ').width;
    const wr = ctx.measureText(rt).width;
    let tx = W / 2 - (wl + weq + wr) / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = BLUE;
    ctx.fillText(lt, tx, bandH / 2 - 10);
    ctx.fillStyle = CARMINE;
    ctx.fillText(' = ', tx + wl, bandH / 2 - 10);
    ctx.fillStyle = TEAL;
    ctx.fillText(rt, tx + wl + weq, bandH / 2 - 10);

    /* the verdict — green only for a healthy claim */
    ctx.textAlign = 'center';
    if (S.calib && !S.diagnosed) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 14px system-ui, sans-serif';
      ctx.fillText('diagnose it first — which tower stands taller?', W / 2, bandH - 16);
    } else {
      ctx.font = '700 15px system-ui, sans-serif';
      if (S.truth) {
        ctx.fillStyle = OK;
        ctx.fillText('TRUE — the planks lie level', W / 2, bandH - 16);
      } else {
        ctx.fillStyle = SLATE;
        const g = gapOf(c);
        ctx.fillText(`FALSE — the towers miss by ${g === 1 ? 'one step' : g + ' steps'}`, W / 2, bandH - 16);
      }
    }

    /* ground line */
    ctx.strokeStyle = 'rgba(28,43,58,0.25)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(30, baseY + 0.5);
    ctx.lineTo(W - 30, baseY + 0.5);
    ctx.stroke();

    /* towers: first addend then second stacked above it, colour per part */
    const drawTower = (x, a, b, colA, colB) => {
      const v = sideVal(a, b);
      for (let i = 0; i < v; i++) {
        const isSecond = b != null && i >= a;
        ctx.fillStyle = isSecond ? colB : colA;
        rr(x, baseY - (i + 1) * u + 1.5, towerW, u - 3, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        rr(x, baseY - (i + 1) * u + 1.5, towerW, u - 3, 4);
        ctx.stroke();
      }
      return baseY - v * u;
    };
    /* left tower: blue then a darker blue for its second addend; right tower:
       teal then a darker teal — the towers wear their side's colour */
    const shade = (hex, amt) => {
      const val = parseInt(hex.slice(1), 16);
      let rC = (val >> 16) & 255;
      let g = (val >> 8) & 255;
      let b = val & 255;
      const to = amt < 0 ? 0 : 255;
      const f = Math.abs(amt);
      rC = Math.round(rC + (to - rC) * f);
      g = Math.round(g + (to - g) * f);
      b = Math.round(b + (to - b) * f);
      return `rgb(${rC},${g},${b})`;
    };
    const topL = drawTower(lx, c.l1, c.l2, BLUE, shade(BLUE, -0.25));
    const topR = drawTower(rx, c.r1, c.r2, TEAL, shade(TEAL, -0.25));

    /* gold tower-top guides (the teaching lens, lesson steps only) */
    if (!S.calib) {
      ctx.strokeStyle = 'rgba(185,135,24,0.55)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 4]);
      for (const [x0, x1, ty] of [
        [30, lx, topL],
        [rx + towerW, W - 30, topR],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x0, ty + 0.5);
        ctx.lineTo(x1, ty + 0.5);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    /* THE SIGN ITSELF: two carmine planks from top to top.  Level ⟺ true. */
    const px0 = lx + towerW + 8;
    const px1 = rx - 8;
    const sep = 11; // the glyph's two bars
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const off of [-sep / 2, sep / 2]) {
      ctx.beginPath();
      ctx.moveTo(px0, topL + off);
      ctx.lineTo(px1, topR + off);
      ctx.stroke();
    }

    /* the side values under the ground, in their colours — what each names */
    ctx.font = '700 15px ui-monospace, Menlo, monospace';
    ctx.fillStyle = BLUE;
    ctx.fillText(`names ${L}`, lx + towerW / 2, baseY + 18);
    ctx.fillStyle = TEAL;
    ctx.fillText(`names ${R}`, rx + towerW / 2, baseY + 18);
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

  /* every step opens on the claim its words quote */
  useEffect(() => {
    const d = STEPS[step].demo;
    if (d) setClaim(d);
  }, [step]);

  /* hand the clinic its first patient */
  useEffect(() => {
    if (current.calib && arrived == null) {
      const c = makeClaim(null);
      setArrived(c);
      setClaim(c);
      setPick(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const setDial = (v) => setClaim((prev) => ({ ...prev, r2: clampInt(v, 0, 10) }));
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    if (calib && arrived) {
      setClaim(arrived);
      setPick(null);
    } else {
      const d = STEPS[step].demo;
      if (d) setClaim(d);
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = `${claimText(claim)} — ${isTrue(claim) ? 'true, the planks lie level' : 'false'}. ${
    calibrated ? 'Calibrated.' : ''
  }`;

  return (
    <div className="eslab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Equal Sign: True or False</h1>
        <p className="lede">
          “=” is not a command to compute — it is a <em>claim</em>: both sides name the same
          number. Claims can be judged. Some are <em>true</em>, some are <em>false</em>, and the
          sign’s own shape — <span className="mono">two level lines</span> — shows which.
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
            {DIALS.map((d) => {
              /* in the clinic the dial stays locked until the diagnosis is
                 committed — you examine the patient before you treat it, and
                 the diagnosis gate is only fair if the claim cannot change
                 under the child's feet first */
              const unlocked = calib ? pick != null : step >= d.unlock;
              const usable = unlocked && claim.r2 != null;
              return (
                <label className={'dial' + (usable ? '' : ' locked')} key={d.key}>
                  <span className="dk" style={{ color: d.color }}>
                    {d.name}
                  </span>
                  <span className="drole">{usable ? d.role : unlocked ? 'this claim has no last box' : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={1}
                    value={claim.r2 == null ? 0 : claim.r2}
                    disabled={!usable}
                    aria-label={`${d.name} — ${d.role}`}
                    onChange={(e) => setDial(e.target.value)}
                    style={{ accentColor: d.color }}
                  />
                  <output className="dv" style={usable ? { color: d.color } : undefined}>
                    {usable ? claim.r2 : '🔒'}
                  </output>
                </label>
              );
            })}
          </div>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((cc, i) => {
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
                      {cc}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {calib && arrived != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">Diagnose the claim</span>
                <div className="verdict-btns">
                  {['left', 'level', 'right'].map((w) => (
                    <button
                      type="button"
                      key={w}
                      className={'chip' + (pick === w ? ' picked' : '') + (checks[0] && pick === w ? ' right' : '')}
                      onClick={() => {
                        if (pick == null) setPick(w);
                      }}
                      disabled={pick != null}
                    >
                      {w === 'left' ? 'LEFT taller' : w === 'level' ? 'LEVEL' : 'RIGHT taller'}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {pick == null
                    ? 'call it as it stands — before touching the dial'
                    : checks[0]
                      ? checks[1]
                        ? 'healthy — the planks lie level'
                        : 'diagnosed — now heal it with the dial'
                      : 'that was not the ailment — Reset to re-examine'}
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
                  <span className="mono target-hint">diagnose · then level the planks</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const c = makeClaim(arrived);
                  setArrived(c);
                  setClaim(c);
                  setPick(null);
                }}
              >
                Next patient
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
                  setArrived(null);
                  setPick(null);
                  setClaim(STEPS[0].demo);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">= means “both sides name the same number”</span> &nbsp;·&nbsp; the
        meaning of the equal sign; equations judged true or false (CCSS 1.OA.D.7). A false equation
        is not a broken rule — it is a wrong claim, and telling the difference is the skill.
      </footer>

      <style jsx>{`
        .eslab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
          --blue: #3f74a6;
          --teal: #2b8a8a;
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
          gap: 7px;
        }
        .chip {
          flex: 1;
          font: 700 11.5px/1.2 var(--mono);
          letter-spacing: 0.04em;
          padding: 9px 2px;
          border-radius: 8px;
          border: 1.5px solid rgba(28, 43, 58, 0.3);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
        }
        .chip:disabled {
          cursor: default;
          opacity: 0.75;
        }
        .chip.picked {
          border-color: var(--ink);
          background: rgba(28, 43, 58, 0.07);
          opacity: 1;
        }
        .chip.right {
          border-color: var(--ok);
          color: var(--ok);
          background: rgba(31, 138, 91, 0.08);
          opacity: 1;
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
        :global(.eslab) :focus-visible {
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
