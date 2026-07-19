'use client';

/* ============================================================================
   TrigRatioLab — an interactive "bench" for RIGHT-TRIANGLE TRIGONOMETRY:
   the quotient of two sides depends only on the angle, never on the size —
   and that is why sine is a function of θ alone.

        sin θ = opp / hyp      cos θ = adj / hyp      tan θ = opp / adj
        grow the triangle ×k:  (opp·k)/(hyp·k) — the k cancels
        one corner, one number · SOH-CAH-TOA

   Built for MAIS (math AI system, www.mais.ac), K-12.  GRADES 9–12 ·
   CCSS G-SRT.C.6–8.  Six shipped labs graph the circular functions and
   UnitCircleLab builds them from the turning point; none of them does the
   thing trigonometry starts with — a right triangle whose side quotients
   are pinned by one acute corner.  This bench is that missing first page.

   THE SIGNATURE CENTERPIECE — "THE CORNER FAN AND THE RATIO LEDGER."
     One acute corner θ, and a fan of nested right triangles that share it:
     the size dial multiplies every side by k (3-4-5 → 6-8-10 → 9-12-15…),
     the hypotenuses run parallel, and the ratio ledger reduces opp/hyp on
     every row to the SAME exact fraction.  Five exact corners — built on
     the primitive triples 7-24-25, 5-12-13, 8-15-17, 3-4-5, 24-7-25 — form
     a steepness ladder whose sines rank them: 7/25 < 5/13 < 8/17 < 3/5 <
     24/25.  A number pinned by the angle alone deserves a name: sine, then
     cosine and tangent, then the payoff — solve a triangle from one corner
     and one side.  The capstone posts a corner and its hypotenuse: rule
     sin θ exactly, then the opposite side, or no stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • UnitCircleLab owns the wrapping of the axis around the circle, the
       radian, and coordinates-as-cosine-and-sine; no circle is drawn here
       and no angle is ever measured in radians.  It is cited as the bench
       that serves corners beyond these exact five.
     • The six circular-function labs own the graphs; nothing here plots a
       function of an angle on an axis.
     • DilationsLab owns scaling polygons from a center with before/after
       length ledgers; this bench nests right triangles at one shared
       corner and ledgers the WITHIN-triangle quotient — the number that
       bench never takes.  Its theorem (lengths ×k, angles untouched) is
       cited as the reason the quotient survives.
     • PythagorasLab owns proving a² + b² = c²; this bench SPENDS the
       identity through its five triples and draws no frame, no packing.
     • TriangleLab owns draggable vertices and the angle tour; LineFunctionLab
       owns rise-over-run on graphs.  Nothing here is draggable and the
       word "slope" never appears.
     • Math.sin, Math.cos, Math.tan appear NOWHERE in this file — every
       quotient is an exact integer fraction.

   One-accent discipline: CARMINE is THE QUOTIENT — the ledger's verdict,
   the named ratios.  GOLD is the triangle fan and the size dial (the
   tool).  BLUE is quiet side lengths.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Every corner is a primitive Pythagorean triple (audited: opp² +
       adj² = hyp²), every size is an integer multiple, every displayed
       quotient is an exact reduced fraction — integer arithmetic only.
     • Invariance is proved, not asserted: the audit reduces opp·k/hyp·k
       for every corner × every k on the dial and equals it to the k = 1
       fraction; the steepness ladder's strict ordering is verified by
       cross-multiplication.
     • The solving step is exact proportion: 35 × 3/5 = 21 — recomputed.
     • The surveyor's stamp needs two exact rulings (sin θ, then the
       opposite side), audited over every posted corner × size × chip
       pair; the truth chip is always present and never duplicated.
   Verified by audit-trigratio.mjs (numeric proof + source greps) and
   verify-trigratio.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/TrigRatioLab.jsx
     2. Import and render it:
          import TrigRatioLab from './TrigRatioLab';
          export default function Page() { return <TrigRatioLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the corner, the
              size, the lesson step, answers, the rulings).
     MODEL  — integer triples and exact reduced fractions; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the quotient — sine, cosine, tangent
const BLUE = '#3f74a6'; // quiet side lengths
const GOLD = '#b98718'; // the triangle fan and the size dial
const INK_HEX = '#1c2b3a';

const K_MAX = 6; // the size dial
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Five exact corners; reduced-fraction quotients.
   ------------------------------------------------------------------------- */
const gcdInt = (a, b) => (b === 0 ? Math.abs(a) : gcdInt(b, a % b));
const rat = (n, d) => {
  const g = gcdInt(n, d) || 1;
  return { n: n / g, d: d / g };
};
const ratText = (f) => `${f.n}/${f.d}`;
const ratEq = (x, y) => x.n === y.n && x.d === y.d;

const CORNERS = {
  meadow: { label: 'the meadow', opp: 7, adj: 24, hyp: 25 },
  path: { label: 'the path', opp: 5, adj: 12, hyp: 13 },
  stairs: { label: 'the stairs', opp: 8, adj: 15, hyp: 17 },
  hill: { label: 'the hill', opp: 3, adj: 4, hyp: 5 },
  cliff: { label: 'the cliff', opp: 24, adj: 7, hyp: 25 },
};
const cornerIds = Object.keys(CORNERS); /* in steepness order */

const sinOf = (C) => rat(C.opp, C.hyp);
const cosOf = (C) => rat(C.adj, C.hyp);
const tanOf = (C) => rat(C.opp, C.adj);
const sidesAt = (C, k) => ({ opp: C.opp * k, adj: C.adj * k, hyp: C.hyp * k });

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The surveyor's stamp."  A corner and its
   hypotenuse are posted; rule sin θ exactly, then the opposite side.
   ------------------------------------------------------------------------- */
const K_CASES = [2, 3, 4, 5, 6, 7, 8, 9];
function makeCase(prev) {
  let k;
  do {
    k = {
      cornerId: cornerIds[Math.floor(Math.random() * cornerIds.length)],
      k: K_CASES[Math.floor(Math.random() * K_CASES.length)],
    };
  } while (prev && k.cornerId === prev.cornerId && k.k === prev.k);
  return k;
}
const sinTruth = (kase) => sinOf(CORNERS[kase.cornerId]);
const sinChips = (kase) => {
  /* the five corners' sines, deduped, truth guaranteed first, four kept,
     sorted ascending by exact cross-multiplication */
  const cands = [sinTruth(kase), ...cornerIds.map((id) => sinOf(CORNERS[id]))];
  const seen = new Set();
  const out = [];
  for (const f of cands) {
    const t = ratText(f);
    if (!seen.has(t)) {
      seen.add(t);
      out.push(f);
    }
    if (out.length === 4) break;
  }
  return out.sort((x, y) => x.n * y.d - y.n * x.d).map(ratText);
};
const oppTruth = (kase) => CORNERS[kase.cornerId].opp * kase.k;
const oppChips = (kase) => {
  const C = CORNERS[kase.cornerId];
  const o = C.opp * kase.k;
  const a = C.adj * kase.k;
  const cands = [o, a, o + a, Math.abs(a - o)];
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
const calibChecks = (kase, sinPick, oppPick) => {
  if (!kase) return [false, false];
  const sinOK = sinPick != null && sinPick === ratText(sinTruth(kase));
  const oppOK = sinOK && oppPick != null && oppPick === String(oppTruth(kase));
  return [sinOK, oppOK];
};
const closeness = (kase, s, o) =>
  Math.round((100 * calibChecks(kase, s, o).filter(Boolean).length) / 2);
const isCalibrated = (kase, s, o) => calibChecks(kase, s, o).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that bigger triangles have bigger
   ratios, that nothing is knowable without degrees and protractors.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One corner, many sizes',
    body:
      'A right triangle with a marked corner θ, built on 3-4-5. The dial multiplies every ' +
      'side by k: 6-8-10, 9-12-15… The ledger takes the quotient opp/hyp at every size. ' +
      'Grow the fan and watch that fraction.',
    corner: 'hill',
    q: 'At k = 5 the sides are 15, 20, 25. The quotient opp/hyp is…',
    choices: [
      '15/25 = 3/5 — the same as every other size',
      'Bigger — 15/25 beats 3/5',
      'Unknowable without the angle in degrees',
    ],
    answer: 0,
    feedback:
      'Every row of the ledger reduces to 3/5. Growing the triangle multiplies opp and hyp ' +
      'by the same k, and 15/25 is 3/5 wearing a ×5 costume. A quotient of two lengths ' +
      'from the SAME triangle shrugs off size completely.',
  },
  {
    title: 'Why size cannot matter',
    body:
      'All the sizes at once: one shared corner, nested copies, hypotenuses parallel. The ' +
      'dilation bench proved what scaling does — every length ×k, every angle untouched.',
    corner: 'hill',
    q: 'Why exactly does opp/hyp survive scaling?',
    choices: [
      'Both lengths get ×k, and (opp·k)/(hyp·k) cancels the k — similar triangles share every internal quotient',
      'Because the triangle stays small enough to measure',
      'It doesn’t — protractors just aren’t precise enough to see it move',
    ],
    answer: 0,
    feedback:
      'The k cancels. That is the entire secret, and it is inherited: any two right ' +
      'triangles sharing the corner θ are scaled copies of each other, so every internal ' +
      'quotient — opp/hyp, adj/hyp, opp/adj — is fixed by θ alone. A number that depends ' +
      'only on the angle deserves a name.',
  },
  {
    title: 'Different corner, different number',
    body:
      'Five corners, from meadow to cliff. Switch between them and read the ledger: each ' +
      'corner carries its own quotient — the steeper the corner, the bigger opp/hyp.',
    corner: 'cliff',
    chips: true,
    q: 'The cliff is 24-7-25 (opposite 24). Its opp/hyp is…',
    choices: [
      '24/25 — nearly 1; climbing a cliff is nearly all rise',
      '7/25 — cliffs are shallow',
      '24/7 — bigger than 1',
    ],
    answer: 0,
    feedback:
      'A steep corner spends its hypotenuse on rise: 24 parts in 25. The five corners line ' +
      'up: 7/25 < 5/13 < 8/17 < 3/5 < 24/25 — the quotient RANKS the angles. One angle, ' +
      'one number, in both directions: a function of θ. Its name is SINE.',
  },
  {
    title: 'Three quotients, three names',
    body:
      'A right triangle offers three useful quotients, each pinned by θ alone: sin θ = ' +
      'opp/hyp, cos θ = adj/hyp, tan θ = opp/adj. Surveyors memorize SOH-CAH-TOA. The ' +
      'ledger now shows all three.',
    corner: 'hill',
    chips: true,
    ratios: true,
    q: 'For the hill (3-4-5, opposite 3): cos θ is…',
    choices: [
      '4/5 — the adjacent leg over the hypotenuse',
      '3/5 — same as the sine',
      '5/4 — hypotenuse over adjacent',
    ],
    answer: 0,
    feedback:
      'cos θ = 4/5, exactly, at every size. Three views of one corner: sine spends the ' +
      'hypotenuse on rise, cosine spends it on run, tangent compares rise to run directly. ' +
      'And tan = sin/cos — 3/5 over 4/5 is 3/4 — one corner, one consistent bookkeeping.',
  },
  {
    title: 'Solving a triangle',
    body:
      'The payoff. A ladder leans at the hill corner with hypotenuse 35; the height it ' +
      'reaches is unknown. No new measurement — the corner already fixed the quotient.',
    corner: 'hill',
    chips: true,
    ratios: true,
    q: 'opp/35 must equal 3/5. So opp = …',
    choices: [
      '21 — three fifths of 35; one corner plus one side settles the rest',
      '28 — four fifths of 35',
      'It cannot be found without a protractor',
    ],
    answer: 0,
    feedback:
      'opp = 21, by pure proportion. This is how trigonometry solves the world’s ' +
      'triangles: know one corner and one side, and the fixed quotients hand you the ' +
      'rest. For corners beyond these five exact families, the circle bench turns the ' +
      'same crank — the quotient simply gains an infinite menu.',
  },
  {
    title: 'The surveyor’s stamp',
    body:
      'A corner is posted with its hypotenuse. Rule sin θ as an exact fraction, then rule ' +
      'the opposite side. Both exact, or no stamp.',
    corner: 'hill',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TrigRatioLab() {
  const [cornerId, setCornerId] = useState('hill');
  const [kSize, setKSize] = useState(1);
  const [sinPick, setSinPick] = useState(null);
  const [oppPick, setOppPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const activeId = calib && kase ? kase.cornerId : cornerId;
  const C = CORNERS[activeId];
  const kNow = calib && kase ? kase.k : kSize;

  const checks = calib ? calibChecks(kase, sinPick, oppPick) : [false, false];
  const pct = calib && kase ? closeness(kase, sinPick, oppPick) : 0;
  const calibrated = calib && kase ? isCalibrated(kase, sinPick, oppPick) : false;

  sceneRef.current = { C, k: kNow, calib, ratios: !!current.ratios };

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
    const ledgerW = S.calib ? 0 : Math.min(250, W * 0.36);
    const plotX0 = 26;
    const plotX1 = W - ledgerW - 22;
    const plotY0 = bandH + 18;
    const plotY1 = H - 30;
    /* the fan must fit at the dial's largest size (or the posted size) */
    const kFit = S.calib ? S.k : K_MAX;
    const scale = Math.min(
      (plotX1 - plotX0) / (S.C.adj * kFit),
      (plotY1 - plotY0) / (S.C.opp * kFit)
    );
    const px = (X, Y) => [plotX0 + X * scale, plotY1 - Y * scale];

    const tri = (kk, fill, stroke, lw) => {
      const s = sidesAt(S.C, kk);
      ctx.beginPath();
      ctx.moveTo(...px(0, 0));
      ctx.lineTo(...px(s.adj, 0));
      ctx.lineTo(...px(s.adj, s.opp));
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
    };

    /* the fan: every smaller size, ghosted; the current size, bold */
    if (!S.calib) for (let kk = 1; kk < S.k; kk++) tri(kk, null, 'rgba(185,135,24,0.35)', 1.2);
    tri(S.k, 'rgba(185,135,24,0.16)', GOLD, 2.4);

    const s = sidesAt(S.C, S.k);
    /* the right-angle marker */
    const m = 10;
    const [rx, ry] = px(s.adj, 0);
    ctx.strokeStyle = INK_SOFT;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(rx - m, ry - m, m, m);
    /* the corner arc */
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const [ox, oy] = px(0, 0);
    const ang = -Math.atan2(s.opp * scale, s.adj * scale);
    ctx.arc(ox, oy, 30, 0, ang, true);
    ctx.stroke();
    ctx.fillStyle = CARMINE;
    ctx.font = '700 13px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('θ', ox + 38, oy - 14);

    /* side labels */
    ctx.fillStyle = BLUE;
    ctx.font = '600 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`adj ${s.adj}`, px(s.adj / 2, 0)[0], oy + 8);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      S.calib ? 'opp ?' : `opp ${s.opp}`,
      px(s.adj, s.opp / 2)[0] + 8,
      px(s.adj, s.opp / 2)[1]
    );
    ctx.textAlign = 'right';
    ctx.fillText(
      `hyp ${s.hyp}`,
      px(s.adj / 2, s.opp / 2)[0] - 10,
      px(s.adj / 2, s.opp / 2)[1] - 8
    );

    /* the ratio ledger */
    if (!S.calib) {
      const tx = W - ledgerW + 4;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 11.5px system-ui, sans-serif';
      ctx.fillText('the ratio ledger', tx, bandH + 8);
      ctx.font = '600 11px ui-monospace, monospace';
      let rowY = bandH + 28;
      const sin1 = sinOf(S.C);
      for (let kk = 1; kk <= S.k; kk++) {
        const ss = sidesAt(S.C, kk);
        ctx.fillStyle = GOLD;
        ctx.fillText(`k=${kk}`, tx, rowY);
        ctx.fillStyle = INK_HEX;
        ctx.fillText(
          kk === 1 ? `${ss.opp}/${ss.hyp}` : `${ss.opp}/${ss.hyp} = ${ratText(sin1)}`,
          tx + 40,
          rowY
        );
        rowY += 18;
      }
      ctx.fillStyle = CARMINE;
      ctx.fillText(`one corner, one sine: ${ratText(sin1)}`, tx, rowY + 6);
      if (S.ratios) {
        ctx.fillText(`sin θ = ${ratText(sinOf(S.C))}`, tx, rowY + 30);
        ctx.fillText(`cos θ = ${ratText(cosOf(S.C))}`, tx, rowY + 48);
        ctx.fillText(`tan θ = ${ratText(tanOf(S.C))}`, tx, rowY + 66);
      }
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib
        ? `${S.C.label} corner · hyp = ${s.hyp} · rule the rest`
        : `${S.C.label} · ${S.C.opp}-${S.C.adj}-${S.C.hyp} corner · size ×${S.k}`,
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
    setCornerId(st.corner);
    setKSize(1);
    setSinPick(null);
    setOppPick(null);
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
    setKSize(1);
    setSinPick(null);
    setOppPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${C.label} corner, hypotenuse ${C.hyp * kNow}. Sine ruled ${sinPick ?? 'nothing'}; opposite ${oppPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `${C.label}, ${C.opp}-${C.adj}-${C.hyp}, at size ${kNow}: sides ${C.opp * kNow}, ${C.adj * kNow}, ${C.hyp * kNow}; sine ${ratText(sinOf(C))} at every size.`;

  return (
    <div className="trlab">
      <header className="head">
        <h1>Right-Triangle Trig: One Corner, One Number</h1>
        <p className="lede">
          Grow a right triangle and the quotient <span className="mono">opp/hyp</span>{' '}
          refuses to move — the k cancels. A number pinned by the angle alone is a{' '}
          <em>function of θ</em>: sine, with cosine and tangent beside it. That is what
          SOH-CAH-TOA actually says.
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

          {!calib && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the size</span>
                  <span className="dial-v mono">×{kSize}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={K_MAX}
                  step={1}
                  value={kSize}
                  onChange={(e) => setKSize(Number(e.target.value))}
                  aria-label={`Size, times ${kSize}`}
                />
              </div>
            </div>
          )}

          <div className="toolbar" role="group" aria-label="Corners">
            {current.chips &&
              cornerIds.map((id) => (
                <button
                  type="button"
                  key={id}
                  className={'chipbtn' + (cornerId === id ? ' active' : '')}
                  onClick={() => setCornerId(id)}
                >
                  {CORNERS[id].label}
                </button>
              ))}
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

          {calib && kase && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted corner</span>
                <span className="target-word">
                  {CORNERS[kase.cornerId].label} · hyp = {CORNERS[kase.cornerId].hyp * kase.k}
                </span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} sin θ, ruled exactly</li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} the opposite side, ruled
                  </li>
                </ol>
                <div className="declare" role="group" aria-label="Sine ruling">
                  {sinChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (sinPick === c2 ? ' active' : '')}
                      onClick={() => setSinPick(c2)}
                    >
                      sin θ = {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Opposite side ruling">
                  {oppChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (oppPick === c2 ? ' active' : '')}
                      onClick={() => setOppPick(c2)}
                    >
                      opp = {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the survey closes'
                    : checks[0]
                      ? 'sine ruled — now spend it on the side'
                      : 'the corner fixes the quotient first'}
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
                  <span className="mono target-hint">the sine · then the side</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setSinPick(null);
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
                  setSinPick(null);
                  setOppPick(null);
                  setCornerId('hill');
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">grow it ×k · the k cancels · the angle keeps the number</span>{' '}
        &nbsp;·&nbsp; sine, cosine, and tangent are the right triangle’s three internal
        quotients, pinned by the corner alone — the circle bench serves every other angle
        the same dish.
      </footer>

      <style jsx>{`
        .trlab {
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
        :global(.trlab) :focus-visible {
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
