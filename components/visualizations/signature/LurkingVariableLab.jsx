'use client';

/* ============================================================================
   LurkingVariableLab — an interactive "bench" for CORRELATION ≠ CAUSATION:
   a true association, the arrow it tempts you to draw, and the third actor
   who owned the pattern all along.

        the pattern is REAL · the arrow is not in the data
        color by the third column and the cloud falls into camps
        hold the third actor still — if the association collapses, it
        was theirs; if it survives the control, a direct link remains
        only a randomized experiment awards arrows

   Built for MAIS (math AI system, www.mais.ac), K-12.  GRADES 9–12 ·
   CCSS S-ID.C.9.  ScatterPlotLab taught reading association;
   BestFitLab taught modeling it.  This bench owns the INTERPRETIVE layer
   — the most transferable idea in the statistics strand: association is
   symmetric, and causation must be earned.

   THE SIGNATURE CENTERPIECE — "THE THIRD ACTOR."
     Twelve months of one town's records: ice-cream cones sold and pool
     rescues.  The rising-together is genuine — and then the bench colors
     each month by SEASON, and the cloud falls into three camps: warm
     months high on both axes, cold months low on both.  The decisive
     test follows: hold the season still and look within one band — the
     association collapses to nothing, exactly (the within-band pair
     tally is zero by construction, and the audit counts it).  The last
     step names the one instrument that awards arrows: the randomized
     experiment, the sampling bench's fair dip aimed at causation.  The
     capstone posts banded studies of FOUR kinds: association that
     vanishes under the control, association that survives it, a
     negative version, and no association at all — rule the pattern,
     then rule what the control reveals.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • ScatterPlotLab owns the blind rugs and the exact trend/outlier
       theorems of reading a cloud; this bench inherits the finished
       skill and never re-teaches it — no rug, and the words "trend" and
       "outlier" never appear.
     • BestFitLab owns the fitted line and residuals; no line is ever
       drawn through these clouds — an arrow is exactly what must not be
       drawn.
     • ProbabilityLab owns the spinner; SamplingLab owns the fair dip and
       is cited by name for random assignment.
     • The unbuilt correlation-coefficient lab (H24) owns r; no
       coefficient is computed here — association is judged by the
       cloud, and audited by exact integer pair tallies.

   One-accent discipline: CARMINE marks THE THIRD ACTOR'S FINGERPRINT —
   the warm band and the verdicts.  GOLD is the mild band and the tools;
   BLUE is the cold band and quiet ink.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Every dataset is twelve integer points in three fixed bands.  The
       bench never computes a float statistic: association is verified by
       the exact net pair tally (concordant minus discordant), and the
       posted datasets are ENGINEERED so the ice-cream story tallies +48
       overall and exactly 0 within every band — the audit recounts every
       pair from scratch.
     • The capstone's two rulings are DERIVED: the overall verdict from
       the sign of the net tally; the control verdict from whether the
       within-band tally is exactly zero (or there was nothing to
       explain).  The audit re-derives both for every posted study and
       proves the four kinds are all represented.
     • The skeptic's stamp needs both rulings, audited over every case ×
       chip pair; the truth chip is always present.
   Verified by audit-lurkingvariable.mjs (numeric proof + source greps)
   and verify-lurkingvariable.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/LurkingVariableLab.jsx
     2. Import and render it:
          import LurkingVariableLab from './LurkingVariableLab';
          export default function Page() { return <LurkingVariableLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the coloring,
              the focused band, the lesson step, the rulings).
     MODEL  — integer datasets and exact pair tallies; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the warm band — the third actor's fingerprint
const BLUE = '#3f74a6'; // the cold band, quiet ink
const GOLD = '#b98718'; // the mild band, the tools
const INK_HEX = '#1c2b3a';

const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Integer datasets; exact pair tallies.
   A point is [x, y, band] with band 0 (cold/low) · 1 (mild) · 2 (warm/high).
   ------------------------------------------------------------------------- */
const sgn = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
/* the net pair tally: concordant minus discordant, exactly */
const tallyOf = (pts) => {
  let net = 0;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++)
      net += sgn(pts[j][0] - pts[i][0]) * sgn(pts[j][1] - pts[i][1]);
  return net;
};
/* the same tally, counted only inside each band, summed */
const tallyWithin = (pts) => {
  let net = 0;
  for (let b = 0; b <= 2; b++) net += tallyOf(pts.filter((p) => p[2] === b));
  return net;
};

/* the classic: cones and rescues, by month — +48 overall, 0 within */
const CONES = [
  [2, 1, 0], [3, 2, 0], [4, 2, 0], [5, 1, 0],
  [6, 4, 1], [7, 5, 1], [8, 5, 1], [9, 4, 1],
  [10, 8, 2], [11, 9, 2], [12, 9, 2], [13, 8, 2],
];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The skeptic's stamp."  A banded study is
   posted; rule the overall pattern, then what the control reveals.
   ------------------------------------------------------------------------- */
const CASES = [
  {
    story: 'cones & rescues · banded by season',
    xLab: 'cones',
    yLab: 'rescues',
    pts: CONES,
  },
  {
    story: 'hot chocolate & rescues · banded by season',
    xLab: 'cups',
    yLab: 'rescues',
    pts: [
      [10, 1, 0], [11, 2, 0], [12, 2, 0], [13, 1, 0],
      [6, 4, 1], [7, 5, 1], [8, 5, 1], [9, 4, 1],
      [2, 8, 2], [3, 9, 2], [4, 9, 2], [5, 8, 2],
    ],
  },
  {
    story: 'practice hours & free throws · banded by team level',
    xLab: 'hours',
    yLab: 'shots made',
    pts: [
      [2, 1, 0], [3, 2, 0], [4, 3, 0], [5, 4, 0],
      [6, 5, 1], [7, 6, 1], [8, 7, 1], [9, 8, 1],
      [10, 9, 2], [11, 10, 2], [12, 11, 2], [13, 12, 2],
    ],
  },
  {
    story: 'lottery tickets & rainy days · banded by season',
    xLab: 'tickets',
    yLab: 'rainy days',
    pts: [
      [1, 1, 0], [2, 2, 0], [3, 2, 0], [4, 1, 0],
      [5, 1, 1], [6, 2, 1], [7, 2, 1], [8, 1, 1],
      [9, 1, 2], [10, 2, 2], [11, 2, 2], [12, 1, 2],
    ],
  },
];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const ASSOC_CHIPS = [
  'positive — they rise together',
  'negative — one rises as the other falls',
  'no association',
];
const CONTROL_CHIPS = [
  'it vanishes — a third actor owned the pattern',
  'it survives — a direct link stays on the table',
  'nothing to explain — there was no association',
];
const assocTruth = (i) => {
  const t = tallyOf(CASES[i].pts);
  return t > 0 ? ASSOC_CHIPS[0] : t < 0 ? ASSOC_CHIPS[1] : ASSOC_CHIPS[2];
};
const controlTruth = (i) => {
  if (tallyOf(CASES[i].pts) === 0) return CONTROL_CHIPS[2];
  return tallyWithin(CASES[i].pts) === 0 ? CONTROL_CHIPS[0] : CONTROL_CHIPS[1];
};
const calibChecks = (i, aPick, cPick) => {
  if (i == null) return [false, false];
  const aOK = aPick != null && aPick === assocTruth(i);
  const cOK = aOK && cPick != null && cPick === controlTruth(i);
  return [aOK, cOK];
};
const closeness = (i, a, c) =>
  Math.round((100 * calibChecks(i, a, c).filter(Boolean).length) / 2);
const isCalibrated = (i, a, c) => calibChecks(i, a, c).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that patterns imply arrows, that
   axes assign blame, that consistency of story is evidence.
   ------------------------------------------------------------------------- */
const BAND_LABELS = ['cold months', 'mild months', 'warm months'];
const STEPS = [
  {
    title: 'A real pattern',
    body:
      'Twelve months from one town: ice-cream cones sold, and pool rescues. Each dot is ' +
      'a month. Read the cloud — months with more cones have more rescues.',
    q: 'Is the pattern itself real?',
    choices: [
      'Yes — the association is genuinely in the data; whatever we decide about WHY, the rising-together is no illusion',
      'No — twelve dots cannot show anything',
      'Only if the dots fall on a straight line',
    ],
    answer: 0,
    feedback:
      'Real, and strong — in this data and in real municipal records. The fallacy this ' +
      'bench hunts is not seeing patterns where there are none; it is the next, almost ' +
      'irresistible step — drawing an ARROW through a true pattern. Keep the pattern. ' +
      'Question the arrow. This bench uses tidy numbers; the census versions are messier ' +
      'and say exactly the same thing.',
  },
  {
    title: 'The tempting arrow',
    body:
      'Three stories fit one rising cloud: cones cause rescues; rescues cause cones; or ' +
      'something offstage drives both. The dots are identical under all three.',
    q: 'What can the cloud, alone, tell you about cause?',
    choices: [
      'Nothing — association is symmetric; any arrow you draw came from your head, not from the data',
      'The x-axis causes the y-axis; that is what axes are for',
      'Whichever quantity is larger causes the smaller one',
    ],
    answer: 0,
    feedback:
      'A cloud has no arrows in it. Putting cones on x and rescues on y was OUR choice — ' +
      'swap the axes and the cloud transposes while saying exactly the same thing. Cause ' +
      'is a claim about what would happen if someone INTERVENED, and passive staring ' +
      'cannot settle it. The discipline is worth naming: “associated with” is a data ' +
      'sentence, “causes” is an intervention sentence, and the two live in different ' +
      'courts. Something else can move between them — next step.',
  },
  {
    title: 'The third actor',
    body: 'Color each month by season, and watch the cloud fall into three camps.',
    colorOn: true,
    q: 'What does the coloring reveal?',
    choices: [
      'Summer drives both — heat sells cones AND fills pools; the third actor explains the pattern with no arrow between the two',
      'The winter months are measurement errors',
      'Nothing; the colors are decoration',
    ],
    answer: 0,
    feedback:
      'Warm months sit high on BOTH axes, cold months low on both. The heat is the ' +
      'engine: it sells cones and it fills pools, and the cone–rescue pattern is the ' +
      'shadow those two effects cast together. Statisticians call the season a LURKING ' +
      'VARIABLE — the actor offstage, moving both puppets at once. Once you have met ' +
      'one, headlines never read the same again: hunt the third actor before you ' +
      'believe any arrow.',
  },
  {
    title: 'Hold the summer still',
    body:
      'The decisive test: look WITHIN one season at a time. Pick a band and read what ' +
      'is left of the pattern.',
    colorOn: true,
    bandChips: true,
    q: 'Within a single season, more cones bring…',
    choices: [
      'Nothing — hold the season fixed and the association collapses; that collapse is the lurking variable’s confession',
      'Still more rescues, only fewer of them',
      'Fewer rescues — the pattern reverses',
    ],
    answer: 0,
    feedback:
      'Inside any one season, the rescue numbers shrug at the cone numbers — the ' +
      'rising-together is gone, exactly. When controlling for a third variable KILLS an ' +
      'association, the third variable owned it. And when the association survives the ' +
      'control, a direct link is back on the table — the capstone will hand you one. ' +
      'Epidemiologists call this move stratification; it is their everyday instrument ' +
      'for interrogating patterns no experiment could ethically produce.',
  },
  {
    title: 'What earns an arrow',
    body: 'If passive data cannot award arrows, what can?',
    colorOn: true,
    q: 'The gold standard for a causal claim is…',
    choices: [
      'A randomized experiment — assign the treatment by fair lottery, then compare; randomization evicts every lurking variable at once',
      'A much bigger observational dataset',
      'A steeper cloud',
    ],
    answer: 0,
    feedback:
      'Random assignment is the sampling bench’s fair-dip idea aimed at causation: when ' +
      'a lottery decides who gets the treatment, no third actor can crowd into one ' +
      'group. Where experiments are impossible — smoking, planets — scientists stratify, ' +
      'replicate, and hunt mechanisms for years before whispering “causes”. Headlines ' +
      'whisper it by lunchtime. You now know to ask who else was on stage — and that is ' +
      'also why drug trials randomize: the lottery, not the sample size, is what buys ' +
      'the arrow.',
  },
  {
    title: 'The skeptic’s stamp',
    body:
      'A study is posted, banded by its third column. Rule the overall pattern first, ' +
      'then rule what holding the band still reveals. Both, or no stamp.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function LurkingVariableLab() {
  const [focusBand, setFocusBand] = useState(-1);
  const [aPick, setAPick] = useState(null);
  const [cPick, setCPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const dataset = calib && kase != null ? CASES[kase] : CASES[0];

  const checks = calib ? calibChecks(kase, aPick, cPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, aPick, cPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, aPick, cPick) : false;

  sceneRef.current = {
    dataset,
    colorOn: !!current.colorOn || calib,
    focusBand: current.bandChips ? focusBand : -1,
    calib,
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

    const bandH = 52;
    const plotX0 = 56;
    const plotX1 = W - 30;
    const plotY0 = bandH + 24;
    const plotY1 = H - 52;
    const xMax = 14;
    const yMax = Math.max(...S.dataset.pts.map((p) => p[1])) + 2;
    const px = (X, Y) => [
      plotX0 + (X / xMax) * (plotX1 - plotX0),
      plotY1 - (Y / yMax) * (plotY1 - plotY0),
    ];

    /* axes */
    ctx.strokeStyle = 'rgba(91,107,123,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(...px(0, 0));
    ctx.lineTo(...px(xMax, 0));
    ctx.moveTo(...px(0, 0));
    ctx.lineTo(...px(0, yMax));
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 600 11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(S.dataset.xLab + ' →', plotX1, plotY1 + 18);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('↑ ' + S.dataset.yLab, plotX0 - 40, plotY0 - 18);

    /* the cloud */
    const BAND_COLORS = [BLUE, GOLD, CARMINE];
    for (const [x, y, b] of S.dataset.pts) {
      const ghost = S.focusBand >= 0 && b !== S.focusBand;
      ctx.fillStyle = S.colorOn
        ? ghost
          ? 'rgba(91,107,123,0.18)'
          : BAND_COLORS[b]
        : INK_HEX;
      ctx.beginPath();
      ctx.arc(...px(x, y), ghost ? 4 : 6, 0, 2 * Math.PI);
      ctx.fill();
      if (!ghost && S.colorOn) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    /* the legend, when colored */
    if (S.colorOn) {
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let lx = plotX0 + 6;
      for (let b = 0; b <= 2; b++) {
        ctx.fillStyle = BAND_COLORS[b];
        ctx.beginPath();
        ctx.arc(lx, plotY0 - 2, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = INK_HEX;
        const lab = S.calib ? `band ${b + 1}` : BAND_LABELS[b];
        ctx.fillText(lab, lx + 9, plotY0 - 2);
        lx += 20 + lab.length * 6.6;
      }
    }

    /* the within-band reading */
    if (S.focusBand >= 0) {
      ctx.fillStyle = CARMINE;
      ctx.font = '700 12.5px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        `within ${BAND_LABELS[S.focusBand]}: the pattern is gone`,
        (plotX0 + plotX1) / 2,
        plotY1 + 24
      );
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib ? S.dataset.story : 'cones & rescues · twelve months, one town',
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
    setFocusBand(st.bandChips ? 2 : -1);
    setAPick(null);
    setCPick(null);
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
    setFocusBand(current.bandChips ? 2 : -1);
    setAPick(null);
    setCPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? CASES[kase].story : ''}. Pattern ${aPick ?? 'unruled'}; under the control ${cPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Cones and rescues, twelve months${current.colorOn ? ', colored by season' : ''}${focusBand >= 0 && current.bandChips ? `, holding ${BAND_LABELS[focusBand]} still: the pattern is gone` : ''}.`;

  return (
    <div className="lvlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Correlation ≠ Causation: The Third Actor</h1>
        <p className="lede">
          The pattern is real; the arrow is not in the data. Color the cloud by the{' '}
          <em>lurking variable</em> and it falls into camps; hold that variable still and
          the association confesses — it either collapses, or it survives and earns a
          harder look.
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

          <div className="toolbar" role="group" aria-label="The bands">
            {current.bandChips &&
              BAND_LABELS.map((lab, b) => (
                <button
                  type="button"
                  key={lab}
                  className={'chipbtn' + (focusBand === b ? ' active' : '')}
                  onClick={() => setFocusBand(b)}
                >
                  {lab}
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

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted study</span>
                <span className="target-word">{CASES[kase].story.split(' · ')[0]}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the overall pattern, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} under the control, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Pattern ruling">
                  {ASSOC_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (aPick === c2 ? ' active' : '')}
                      onClick={() => setAPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Control ruling">
                  {CONTROL_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (cPick === c2 ? ' active' : '')}
                      onClick={() => setCPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled — the skeptic rests'
                    : checks[0]
                      ? 'pattern ruled — now hold the band still'
                      : 'read the whole cloud first'}
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
                  <span className="mono target-hint">the pattern · then the control</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setAPick(null);
                  setCPick(null);
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
                  setAPick(null);
                  setCPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">the pattern is real · the arrow is yours · ask who else is on stage</span>{' '}
        &nbsp;·&nbsp; association is symmetric; only intervention — the fair lottery of a
        randomized experiment — awards arrows.
      </footer>

      <style jsx>{`
        .lvlab {
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
        :global(.lvlab) :focus-visible {
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
