'use client';

/* ============================================================================
   CovariationLab — an interactive "bench" for DEPENDENT AND INDEPENDENT
   VARIABLES: who drives, who rides, and one relationship wearing three
   synchronized windows — table, graph, equation.

        the DRIVER (independent) moves on its own: weeks, hours
        the PASSENGER (dependent) follows by the rule: height, length
        table row · graph point · equation line — ONE fact, three windows

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 6.EE.C.9.
   ProportionalLab owns y = kx and its origin test; TableLab owns
   categorical two-way tables.  This bench owns the ROLES of the two
   variables and the synchrony of the three representations.

   THE SIGNATURE CENTERPIECE — "THE THREE WINDOWS."
     A plant starts at 3 cm and adds 2 cm each week: h = 2w + 3.  Three
     windows show the same relationship at once — the table of weeks,
     the graph of points, the equation with its live substitution — and
     ONE probe dial lights the same fact in all three: week 4 highlights
     the row (4, 11), the point (4, 11), and the line h = 2·4 + 3 = 11.
     Then a candle burns: L = 20 − 2h, and the passenger FALLS while the
     driver rises — dependence is about who follows, never about who
     grows.  The capstone posts a fresh story: rule the driver, then
     rule the passenger's value at a posted probe — both exact, or no
     stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • ProportionalLab owns the y ÷ x fingerprint and the origin test;
       the rules here carry starting values (2w + 3, 20 − 2h) precisely
       so no proportionality machinery applies, and no quotient column
       is ever taken.
     • LineFunctionLab owns the slope triangle; the word "slope" never
       appears — the rule is read as "starts at 3, adds 2 each week."
     • FunctionLab owns the one-output promise and its vocabulary; the
       roles here are narrative (driver, passenger), not definitional.
     • GraphStoryLab owns formula-free silhouettes; this bench is its
       complement — the formula is one of the three windows.
     • TableLab owns two-way categorical tables; this table is a numeric
       input-output ledger.

   One-accent discipline: CARMINE is THE LIT FACT — the synchronized
   highlight and the verdicts.  GOLD is the probe dial (the tool).
   BLUE is the quiet windows.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Integers only: every rule is y = a·x + b with integer a, b; every
       probe is an integer; every displayed value is exact.  The audit
       recomputes every table row, every plotted point, and every
       substitution line for both stories, and proves the candle's
       passenger strictly falls while its driver rises.
     • The reporter's stamp needs two exact rulings (the driver, then
       the probed value), audited over every posted story × chip pair;
       the truth chip is always present and never duplicated.
   Verified by audit-covariation.mjs (numeric proof + source greps)
   and verify-covariation.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/CovariationLab.jsx
     2. Import and render it:
          import CovariationLab from './CovariationLab';
          export default function Page() { return <CovariationLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the story, the
              probe, the lesson step, answers, the rulings).
     MODEL  — integer rules y = a·x + b; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the lit fact
const BLUE = '#3f74a6'; // the quiet windows
const GOLD = '#b98718'; // the probe dial
const INK_HEX = '#1c2b3a';

const PROBE_MAX = 6;
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Stories as integer rules y = a·x + b.
   ------------------------------------------------------------------------- */
const STORIES = {
  plant: {
    title: 'the plant',
    indep: 'weeks',
    dep: 'height (cm)',
    a: 2,
    b: 3,
    ruleText: 'h = 2w + 3',
    read: 'starts at 3 cm, adds 2 each week',
  },
  candle: {
    title: 'the candle',
    indep: 'hours burning',
    dep: 'length (cm)',
    a: -2,
    b: 20,
    ruleText: 'L = 20 − 2h',
    read: 'starts at 20 cm, loses 2 each hour',
  },
  jar: {
    title: 'the savings jar',
    indep: 'months',
    dep: 'money (dollars)',
    a: 5,
    b: 10,
    ruleText: 'm = 5t + 10',
    read: 'starts with 10, adds 5 each month',
  },
  tank: {
    title: 'the water tank',
    indep: 'minutes draining',
    dep: 'water (liters)',
    a: -10,
    b: 100,
    ruleText: 'V = 100 − 10m',
    read: 'starts at 100, loses 10 each minute',
  },
};
const valueAt = (story, x) => story.a * x + story.b;
const rowsOf = (story) => {
  const rows = [];
  for (let x = 0; x <= PROBE_MAX; x++) rows.push([x, valueAt(story, x)]);
  return rows;
};
const subLine = (story, x) => {
  const { a, b } = story;
  const ax = a < 0 ? `${b} − ${-a}·${x}` : `${a}·${x} + ${b}`;
  return `${ax} = ${valueAt(story, x)}`;
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The reporter's stamp."  A story is posted;
   rule the driver, then the passenger's value at a posted probe.
   ------------------------------------------------------------------------- */
const CASES = [
  { id: 'plant', probe: 6 },
  { id: 'candle', probe: 4 },
  { id: 'jar', probe: 3 },
  { id: 'tank', probe: 7 },
  { id: 'candle', probe: 9 },
  { id: 'jar', probe: 6 },
];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const driverTruth = (i) => STORIES[CASES[i].id].indep;
const driverChips = (i) => {
  const s = STORIES[CASES[i].id];
  return [s.indep, s.dep, 'both drive', 'neither — they are unrelated'];
};
const valueTruth = (i) => {
  const { id, probe } = CASES[i];
  return String(valueAt(STORIES[id], probe));
};
const valueChips = (i) => {
  const { id, probe } = CASES[i];
  const s = STORIES[id];
  const truth = valueAt(s, probe);
  const cands = [truth, Math.abs(s.a) * probe, s.b, truth + s.a, probe];
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
const calibChecks = (i, dPick, vPick) => {
  if (i == null) return [false, false];
  const dOK = dPick != null && dPick === driverTruth(i);
  const vOK = dOK && vPick != null && vPick === valueTruth(i);
  return [dOK, vOK];
};
const closeness = (i, d, v) =>
  Math.round((100 * calibChecks(i, d, v).filter(Boolean).length) / 2);
const isCalibrated = (i, d, v) => calibChecks(i, d, v).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that the bigger quantity drives,
   that the windows are three different facts, that falling means broken.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Who drives?',
    body:
      'A plant starts at 3 cm and adds 2 cm every week. Two quantities move together — ' +
      'but not as equals. The weeks pass on their own; the height must follow.',
    story: 'plant',
    windows: false,
    q: 'Which variable is the independent one?',
    choices: [
      'The weeks — time drives itself; the height rides along by the rule',
      'The height — it is the one we care about',
      'Whichever is larger this week',
    ],
    answer: 0,
    feedback:
      'Independent means self-propelled: nothing makes the weeks advance — they just ' +
      'do. The height is DEPENDENT: ask it a question and it must first ask the weeks. ' +
      'Driver and passenger, and the rule is the road between them.',
  },
  {
    title: 'The table window',
    body:
      'Window one: the ledger. Each row is a week and the height the rule assigns it. ' +
      'Probe with the dial and watch the row light up.',
    story: 'plant',
    windows: true,
    dial: true,
    q: 'At week 4, the plant stands…',
    choices: [
      '11 cm — the row (4, 11), because 2·4 + 3 = 11',
      '8 cm — two centimeters for each of four weeks',
      '14 cm — week times height',
    ],
    answer: 0,
    feedback:
      'Row (4, 11): four weeks of adding 2, on top of the starting 3. The tempting 8 ' +
      'forgets the plant did not start from bare soil — the starting value rides in ' +
      'every row. Keep the dial moving; the rows never disagree with the rule.',
  },
  {
    title: 'The graph window',
    body:
      'Window two: the picture. Every table row becomes a point — the same probe now ' +
      'lights a dot.',
    story: 'plant',
    windows: true,
    dial: true,
    q: 'What does the point (2, 7) say?',
    choices: [
      'At week 2 the plant is 7 cm — the very fact the table’s row (2, 7) states',
      'The plant grew 2 cm in week 7',
      'A different fact from the table’s',
    ],
    answer: 0,
    feedback:
      'One fact, two costumes: the row (2, 7) and the point (2, 7) are the same ' +
      'sentence — “at week 2, height 7.” The graph is the whole table seen at once, ' +
      'which is why patterns leap out of it: the dots climb by 2, every step.',
  },
  {
    title: 'The equation window',
    body:
      'Window three: the rule itself, h = 2w + 3, with its live substitution. This is ' +
      'the machine that GENERATES the other two windows.',
    story: 'plant',
    windows: true,
    dial: true,
    q: 'In h = 2w + 3, what does the 3 say?',
    choices: [
      'The height at week 0 — where the story starts before any weeks pass',
      'The plant grows 3 cm each week',
      'The table has 3 columns',
    ],
    answer: 0,
    feedback:
      'Probe w = 0 and all three windows agree: row (0, 3), point (0, 3), and ' +
      'h = 2·0 + 3 = 3. The 3 is the launch height; the 2 is the weekly gain. Every ' +
      'number in a rule is a fact about the story — the windows just wear it ' +
      'differently.',
  },
  {
    title: 'A falling passenger',
    body:
      'New story: a 20 cm candle loses 2 cm each hour — L = 20 − 2h. Probe it and ' +
      'watch the passenger move DOWN as the driver moves up.',
    story: 'candle',
    windows: true,
    dial: true,
    q: 'Which variable is dependent here?',
    choices: [
      'The length — it falls as the hours rise; dependence is about who follows, not who grows',
      'The hours — they shrink the candle, so they depend on it',
      'Neither — one rises and one falls, so they are unrelated',
    ],
    answer: 0,
    feedback:
      'The hours drive; the length follows — downhill. A passenger can fall while the ' +
      'driver climbs, and the three windows report it in unison: rows dropping by 2, ' +
      'dots stepping down, the rule subtracting. Related and falling is still related.',
  },
  {
    title: 'The reporter’s stamp',
    body:
      'A story is posted with a probe. Rule the driver first, then rule the ' +
      'passenger’s value at the probe. Both exact, or no stamp.',
    story: 'plant',
    windows: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CovariationLab() {
  const [probe, setProbe] = useState(2);
  const [dPick, setDPick] = useState(null);
  const [vPick, setVPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const story = STORIES[calib && kase != null ? CASES[kase].id : current.story];
  const probeNow = calib && kase != null ? CASES[kase].probe : probe;

  const checks = calib ? calibChecks(kase, dPick, vPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, dPick, vPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, dPick, vPick) : false;

  sceneRef.current = { story, probe: probeNow, windows: !!current.windows, calib };

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
    const rows = rowsOf(S.story);
    const maxY = Math.max(...rows.map((r) => r[1]), 1);

    if (!S.windows) {
      /* the two-actors card, pre-windows */
      ctx.fillStyle = GOLD;
      ctx.font = '700 15px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`driver: ${S.story.indep}`, W / 2, bandH + 90);
      ctx.fillStyle = CARMINE;
      ctx.fillText(`passenger: ${S.story.dep}`, W / 2, bandH + 130);
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 12px system-ui, sans-serif';
      ctx.fillText(S.story.read, W / 2, bandH + 170);
    } else {
      /* WINDOW 1 — the table */
      const t1x = 24;
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 11.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('window 1 · the table', t1x, bandH + 8);
      ctx.font = '600 11.5px ui-monospace, monospace';
      ctx.fillStyle = BLUE;
      ctx.fillText(`${S.story.indep} → ${S.story.dep}`, t1x, bandH + 28);
      let rowY = bandH + 50;
      for (const [x, y] of rows) {
        const lit = x === S.probe;
        ctx.fillStyle = lit ? CARMINE : INK_HEX;
        ctx.font = lit ? '700 12.5px ui-monospace, monospace' : '600 11.5px ui-monospace, monospace';
        ctx.fillText(`${x}   →   ${S.calib && lit ? '?' : y}`, t1x + 8, rowY);
        rowY += 19;
      }

      /* WINDOW 2 — the graph */
      const g0x = W * 0.36;
      const g1x = W * 0.66;
      const g0y = bandH + 44;
      const g1y = H - 60;
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 11.5px system-ui, sans-serif';
      ctx.fillText('window 2 · the graph', g0x, bandH + 8);
      ctx.strokeStyle = 'rgba(91,107,123,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(g0x, g1y);
      ctx.lineTo(g1x, g1y);
      ctx.moveTo(g0x, g0y);
      ctx.lineTo(g0x, g1y);
      ctx.stroke();
      const px = (x, y) => [
        g0x + ((x + 0.4) / (PROBE_MAX + 1)) * (g1x - g0x),
        g1y - (y / (maxY + 4)) * (g1y - g0y),
      ];
      for (const [x, y] of rows) {
        const lit = x === S.probe;
        ctx.fillStyle = lit ? CARMINE : BLUE;
        ctx.beginPath();
        ctx.arc(...px(x, y), lit ? 6.5 : 4.5, 0, 2 * Math.PI);
        ctx.fill();
        if (lit && !S.calib) {
          ctx.fillStyle = CARMINE;
          ctx.font = '700 11.5px ui-monospace, monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`(${x}, ${y})`, px(x, y)[0] + 8, px(x, y)[1] - 4);
          ctx.textBaseline = 'top';
        }
      }

      /* WINDOW 3 — the equation */
      const e0x = W * 0.72;
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 11.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('window 3 · the rule', e0x, bandH + 8);
      ctx.fillStyle = BLUE;
      ctx.font = '700 15px ui-monospace, monospace';
      ctx.fillText(S.story.ruleText, e0x, bandH + 34);
      ctx.fillStyle = CARMINE;
      ctx.font = '700 12.5px ui-monospace, monospace';
      ctx.fillText(
        S.calib ? `probe ${S.probe}: rule it` : subLine(S.story, S.probe),
        e0x,
        bandH + 64
      );
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.fillText(S.story.read, e0x, bandH + 92);
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib
        ? `${S.story.title} · ${S.story.read} · probe ${S.probe}`
        : `${S.story.title} · one relationship, three windows`,
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
    setProbe(2);
    setDPick(null);
    setVPick(null);
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
    setProbe(2);
    setDPick(null);
    setVPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${story.title}, ${story.read}, probe ${probeNow}. Driver ${dPick ?? 'unruled'}; value ${vPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `${story.title}: at ${probeNow} ${story.indep}, the ${story.dep} is ${valueAt(story, probeNow)}; all three windows agree.`;

  return (
    <div className="cvlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Variables: The Driver and the Passenger</h1>
        <p className="lede">
          The independent variable drives itself; the dependent one follows by the rule.
          One relationship wears <em>three windows</em> — table, graph, equation — and a
          single probe lights the same fact in all of them at once.
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
                  <span className="dial-k">the probe · {story.indep}</span>
                  <span className="dial-v mono">{probe}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={PROBE_MAX}
                  step={1}
                  value={probe}
                  onChange={(e) => setProbe(Number(e.target.value))}
                  aria-label={`Probe, ${probe} ${story.indep}`}
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
                <span className="target-k">The posted story</span>
                <span className="target-word">
                  {story.title} · probe {probeNow}
                </span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the driver, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the value at the probe, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Driver ruling">
                  {driverChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (dPick === c2 ? ' active' : '')}
                      onClick={() => setDPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Value ruling">
                  {valueChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (vPick === c2 ? ' active' : '')}
                      onClick={() => setVPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — filed to print'
                    : checks[0]
                      ? 'driver named — now run the rule'
                      : 'who moves on its own?'}
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
                  <span className="mono target-hint">the driver · then the value</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setDPick(null);
                  setVPick(null);
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
                  setDPick(null);
                  setVPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">the driver moves itself · the passenger follows the rule</span>{' '}
        &nbsp;·&nbsp; table row, graph point, and equation line are one fact in three
        windows — probe one and all three light.
      </footer>

      <style jsx>{`
        .cvlab {
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
        :global(.cvlab) :focus-visible {
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
