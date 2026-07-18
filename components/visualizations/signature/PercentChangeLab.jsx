'use client';

/* ============================================================================
   PercentChangeLab — an interactive "bench" for PERCENT CHANGE: markup,
   discount, and interest as MULTIPLIER TAGS, and the famous asymmetry —
   up 20% then down 20% does not come home.

        a change of p% is the tag ×(100+p)/100
        +20% = ×6/5 · −20% = ×4/5 · chains MULTIPLY:
        ×6/5 then ×4/5 = ×24/25 — four percent short of home
        the true undo of +25% (×5/4) is −20% (×4/5), never −25%

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 7.RP.A.3.
   PercentageLab owns percent-OF — the 100-grid and the percent bar.
   This bench owns percent CHANGE: the moving base, the multiplier
   algebra of successive changes, and the vocabulary (markup, discount,
   interest) as one machine.

   THE SIGNATURE CENTERPIECE — "THE MULTIPLIER CHAIN."
     A price wears a chain of tags.  Each tag is an exact fraction:
     +20% is ×6/5, −20% is ×4/5, and the value walks the chain stop by
     stop — 100 → 120 → 96, with home marked and missed.  The chain
     collapses to ONE tag by multiplication (×24/25), the order of tags
     never matters, and the true undo of a markup is the tag's exact
     reciprocal.  Interest compounds by squaring its tag: 10% twice on
     400 is ×121/100 — 484, not 480.  The capstone posts a chain: rule
     the final value, then the single equivalent tag — both exact, or
     no stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • PercentageLab owns the 100-grid and the percent bar (the double
       number line of percent-of); neither is drawn here, and no region
       is ever shaded.  It is cited as the percent-OF chapter.
     • FractionDivisionLab owns the coin exchange; no coin appears.
     • CommutativeLab (3-5) owns why multiplication commutes; the fact
       is spent here, with credit, on tag order.
     • ProportionalLab owns y = kx; the chain here is a finite walk of
       stops, not a graphed relationship.

   One-accent discipline: CARMINE is THE NET EFFECT — the collapsed tag
   and the verdicts.  GOLD is the tags (the tool).  BLUE is the quiet
   value stops.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Every tag is the exact fraction (100+p)/100, reduced; every stop
       is computed by exact fraction multiplication, and every posted
       chain is engineered to land on INTEGER stops — the audit walks
       each chain and checks integrality, collapses each chain and
       proves the net tag equals the product of its tags, and proves
       the asymmetry (+p then −p = ×(10000−p²)/10000 < 1) for every
       tag on the dial.
     • The shopkeeper's stamp needs two exact rulings (the final value,
       then the net tag), audited over every posted case × chip pair;
       the truth chip is always present and never duplicated.
   Verified by audit-percentchange.mjs (numeric proof + source greps)
   and verify-percentchange.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/PercentChangeLab.jsx
     2. Import and render it:
          import PercentChangeLab from './PercentChangeLab';
          export default function Page() { return <PercentChangeLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the chain, the
              lesson step, answers, the rulings).
     MODEL  — exact fraction tags; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the net effect
const BLUE = '#3f74a6'; // the quiet value stops
const GOLD = '#b98718'; // the tags
const INK_HEX = '#1c2b3a';

const TAGS = [-50, -25, -20, -10, 10, 20, 25, 50, 100]; // the tag dial
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Tags as exact fractions; chains multiply.
   ------------------------------------------------------------------------- */
const gcdInt = (x, y) => (y === 0 ? Math.abs(x) : gcdInt(y, x % y));
const frac = (n, d = 1) => {
  const s = d < 0 ? -1 : 1;
  const g = gcdInt(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
};
const fMul = (a, b) => frac(a.n * b.n, a.d * b.d);
const fracText = (f) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
const multOf = (p) => frac(100 + p, 100); /* the tag of a p% change */
const tagText = (p) => (p > 0 ? `+${p}%` : `−${-p}%`);
/* walk a chain of tags from a start value; stops as exact fractions */
const stopsOf = (start, tags) => {
  const stops = [frac(start)];
  for (const p of tags) stops.push(fMul(stops[stops.length - 1], multOf(p)));
  return stops;
};
/* the chain collapsed to one tag */
const netOf = (tags) => tags.reduce((acc, p) => fMul(acc, multOf(p)), frac(1));

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The shopkeeper's stamp."  A chain is posted;
   rule the final value, then the single equivalent tag.
   ------------------------------------------------------------------------- */
const CASES = [
  { start: 100, tags: [20, -20] },
  { start: 400, tags: [25, -20] },
  { start: 200, tags: [50, -50] },
  { start: 100, tags: [10, 10] },
  { start: 400, tags: [100, -50] },
  { start: 200, tags: [-25, 50] },
];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const chainText = (i) => {
  const { start, tags } = CASES[i];
  return `${start}, then ${tags.map(tagText).join(', then ')}`;
};
const finalOf = (i) => {
  const s = stopsOf(CASES[i].start, CASES[i].tags);
  return s[s.length - 1];
};
const finalTruth = (i) => fracText(finalOf(i));
const finalChips = (i) => {
  const { start, tags } = CASES[i];
  const stops = stopsOf(start, tags);
  const fin = stops[stops.length - 1].n; /* integer by construction */
  const mid = stops[1].n;
  const additive = (start * (100 + tags[0] + tags[1])) / 100;
  const cands = [fin, additive, mid, fin + start - mid, start];
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
const netTruth = (i) => `× ${fracText(netOf(CASES[i].tags))}`;
const netChips = (i) => {
  const { tags } = CASES[i];
  const additive = frac(100 + tags[0] + tags[1], 100);
  const cands = [
    netTruth(i),
    `× ${fracText(additive)}`,
    `× ${fracText(multOf(tags[0]))}`,
    `× ${fracText(multOf(tags[1]))}`,
    '× 1',
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
  return out.sort();
};
const calibChecks = (i, fPick, nPick) => {
  if (i == null) return [false, false];
  const fOK = fPick != null && fPick === finalTruth(i);
  const nOK = fOK && nPick != null && nPick === netTruth(i);
  return [fOK, nOK];
};
const closeness = (i, f, n) =>
  Math.round((100 * calibChecks(i, f, n).filter(Boolean).length) / 2);
const isCalibrated = (i, f, n) => calibChecks(i, f, n).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that percents add, that +20 then
   −20 comes home, that the undo of +25 is −25.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A change wears a tag',
    body:
      'A price of 100 takes a change. Dial the tag: +20% multiplies by 6/5 and lands ' +
      'on 120; −25% multiplies by 3/4 and lands on 75. Every percent change is one ' +
      'exact multiplier.',
    start: 100,
    tags: [20],
    dial: true,
    q: 'Why write +20% as the tag ×6/5?',
    choices: [
      'Because a 20% rise means 120 per 100 — the multiplier carries the whole change in one exact fraction',
      'Because percents are secretly fractions of 20',
      'It is a convention with no content',
    ],
    answer: 0,
    feedback:
      'New value = old value × (100 + p)/100 — that single tag is the entire ' +
      'transaction. The percent-of bench counted hundredths; this bench moves PRICES, ' +
      'and the tag is how a change travels: ready to chain, compare, and undo.',
  },
  {
    title: 'Up 20, down 20',
    body:
      'The famous chain: 100 rises 20% to 120, then falls 20%. Walk it: the second ' +
      'tag bites the NEW base.',
    start: 100,
    tags: [20, -20],
    q: 'Where does the chain land?',
    choices: [
      '96 — the fall takes 20% of 120, which is 24; the chain is ×6/5 × 4/5 = ×24/25',
      '100 — up 20 and down 20 cancel',
      '104 — the rise was bigger in spirit',
    ],
    answer: 0,
    feedback:
      'Not home: 96. The +20 and −20 are percents of DIFFERENT bases — 20 up from ' +
      '100, but 24 down from 120. In tags the mystery dissolves: ×6/5 × 4/5 = 24/25, ' +
      'a net 4% loss, visible before you walk a single stop.',
  },
  {
    title: 'Order never matters',
    body:
      'Run the same two tags the other way: fall 20% first, then rise 20%. 100 → 80 ' +
      '→ 96.',
    start: 100,
    tags: [-20, 20],
    q: 'Same landing, 96. Why must that happen?',
    choices: [
      'Tags multiply, and multiplication is order-free — ×4/5 × 6/5 is the same 24/25 either way',
      'A lucky coincidence of 20',
      'It doesn’t — the display is rounding',
    ],
    answer: 0,
    feedback:
      'The commutative bench earned this fact years ago; the chain spends it: any ' +
      'pile of percent changes lands the same wherever you shuffle them. What matters ' +
      'is the PRODUCT of the tags — never their order, never their sum.',
  },
  {
    title: 'The true undo',
    body:
      'A jacket at 400 is marked UP 25% to 500. The shop wants it back at 400. ' +
      'Careful: −25% of 500 is 125.',
    start: 400,
    tags: [25, -20],
    q: 'Which tag undoes +25%?',
    choices: [
      '−20% — the reciprocal tag: ×5/4 needs ×4/5, and 4/5 is a 20% fall',
      '−25% — same number, other direction',
      'No tag can undo a markup',
    ],
    answer: 0,
    feedback:
      'Undo means multiply back to ×1, so the undo of ×5/4 is exactly ×4/5 — a 20% ' +
      'fall. The −25% guess lands at 375, ten dollars short. Every markup has an ' +
      'exact undo, and it is always a SMALLER percent than the markup.',
  },
  {
    title: 'One machine, three names',
    body:
      'Markup is a + tag, discount a − tag, and interest a + tag applied per period: ' +
      '10% interest twice on 400 is ×11/10 × 11/10.',
    start: 400,
    tags: [10, 10],
    q: 'Two years of 10% interest on 400 gives…',
    choices: [
      '484 — the tag squares to ×121/100; the second year earns interest on interest',
      '480 — ten percent twice is twenty percent',
      '440 — interest only counts once',
    ],
    answer: 0,
    feedback:
      'Compound interest is a chain of identical tags: ×121/100 beats the additive ' +
      'guess of ×120/100 by exactly the interest-on-interest. Markup, discount, ' +
      'interest — one multiplier machine wearing three shop aprons.',
  },
  {
    title: 'The shopkeeper’s stamp',
    body:
      'A chain is posted. Rule the final value first, then rule the single tag the ' +
      'whole chain collapses to. Both exact, or no stamp.',
    start: 100,
    tags: [20, -20],
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PercentChangeLab() {
  const [tagIdx, setTagIdx] = useState(5);
  const [fPick, setFPick] = useState(null);
  const [nPick, setNPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const start = calib && kase != null ? CASES[kase].start : current.start;
  const tags = calib && kase != null ? CASES[kase].tags : current.dial ? [TAGS[tagIdx]] : current.tags;

  const checks = calib ? calibChecks(kase, fPick, nPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, fPick, nPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, fPick, nPick) : false;

  sceneRef.current = { start, tags, calib };

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
    const stops = stopsOf(S.start, S.tags);
    const n = stops.length;
    const y = bandH + (H - bandH) * 0.42;
    const x0 = 60;
    const x1 = W - 60;
    const xAt = (k) => x0 + (k * (x1 - x0)) / Math.max(n - 1, 1);

    /* home line */
    ctx.strokeStyle = 'rgba(200,30,79,0.35)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x0 - 20, y + 64);
    ctx.lineTo(x1 + 20, y + 64);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(200,30,79,0.7)';
    ctx.font = '600 10.5px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`home: ${S.start}`, x0 - 20, y + 70);

    /* the stops and the tags */
    for (let k = 0; k < n; k++) {
      const vx = xAt(k);
      const hideLast = S.calib && k === n - 1;
      ctx.fillStyle = BLUE;
      ctx.beginPath();
      ctx.arc(vx, y, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = INK_HEX;
      ctx.font = '700 15px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(hideLast ? '?' : fracText(stops[k]), vx, y - 14);
      if (k < n - 1) {
        const mx = (vx + xAt(k + 1)) / 2;
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(vx + 10, y);
        ctx.lineTo(xAt(k + 1) - 12, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(xAt(k + 1) - 12, y);
        ctx.lineTo(xAt(k + 1) - 20, y - 5);
        ctx.moveTo(xAt(k + 1) - 12, y);
        ctx.lineTo(xAt(k + 1) - 20, y + 5);
        ctx.stroke();
        ctx.fillStyle = GOLD;
        ctx.font = '700 12.5px ui-monospace, monospace';
        ctx.textBaseline = 'bottom';
        ctx.fillText(tagText(S.tags[k]), mx, y - 8);
        ctx.font = '600 11px ui-monospace, monospace';
        ctx.textBaseline = 'top';
        ctx.fillText(`× ${fracText(multOf(S.tags[k]))}`, mx, y + 10);
      }
    }

    /* the collapsed tag */
    if (S.tags.length > 1) {
      ctx.fillStyle = CARMINE;
      ctx.font = '700 13.5px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        S.calib ? 'the chain collapses to one tag — rule it' : `the whole chain: × ${fracText(netOf(S.tags))}`,
        W / 2,
        y + 96
      );
    }

    /* ---- the readout band ---- */
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      S.calib && kase != null ? `posted: ${chainText(kase)}` : `start ${S.start} · ${S.tags.map(tagText).join(' then ')}`,
      W / 2,
      bandH / 2
    );
  }, [kase]);

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
    setTagIdx(5);
    setFPick(null);
    setNPick(null);
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
    setTagIdx(5);
    setFPick(null);
    setNPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? chainText(kase) : ''}. Final ${fPick ?? 'unruled'}; net tag ${nPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Start ${start}; ${tags.map(tagText).join(' then ')}; stops ${stopsOf(start, tags).map(fracText).join(', ')}${tags.length > 1 ? `; the whole chain is times ${fracText(netOf(tags))}` : ''}.`;

  return (
    <div className="pclab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Percent Change: The Multiplier Chain</h1>
        <p className="lede">
          Every change of p% is one exact tag, <span className="mono">×(100+p)/100</span>.
          Chains of changes <em>multiply</em> — which is why up 20% then down 20% lands at
          ×24/25, four percent from home, and why the true undo of a markup is its
          reciprocal.
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
                  <span className="dial-k">the tag</span>
                  <span className="dial-v mono">
                    {tagText(TAGS[tagIdx])} · × {fracText(multOf(TAGS[tagIdx]))}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={TAGS.length - 1}
                  step={1}
                  value={tagIdx}
                  onChange={(e) => setTagIdx(Number(e.target.value))}
                  aria-label={`Tag, ${tagText(TAGS[tagIdx])}`}
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
                <span className="target-k">The posted chain</span>
                <span className="target-word mono">{chainText(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the final value, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the one collapsed tag, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Final value ruling">
                  {finalChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (fPick === c2 ? ' active' : '')}
                      onClick={() => setFPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Net tag ruling">
                  {netChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (nPick === c2 ? ' active' : '')}
                      onClick={() => setNPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the till balances'
                    : checks[0]
                      ? 'landed — now collapse the chain'
                      : 'walk the stops; each tag bites the new base'}
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
                  <span className="mono target-hint">the landing · then the tag</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setFPick(null);
                  setNPick(null);
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
                  setFPick(null);
                  setNPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">tags multiply · bases move · the undo is the reciprocal</span>{' '}
        &nbsp;·&nbsp; markup, discount, and interest are one machine, and a chain of
        changes is a product of exact fractions — never a sum of percents.
      </footer>

      <style jsx>{`
        .pclab {
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
        :global(.pclab) :focus-visible {
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
