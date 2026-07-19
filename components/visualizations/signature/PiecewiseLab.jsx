'use client';

/* ============================================================================
   PiecewiseLab — an interactive "bench" for PIECEWISE & STEP FUNCTIONS:
   one rule per territory, and the deed decides the border.  A piecewise
   function is a MAP of jurisdictions: each stretch of the x-axis is governed
   by exactly one rule, and at every border exactly one side holds the deed —
   the closed dot.  Two closed dots at one x would be two outputs (not a
   function); two open dots would be no output at all.  (GRADES 9–12 · CCSS
   HSF-IF.C.7b — graph piecewise-defined functions, including step functions
   and absolute value functions [the absolute-value bench owns its fold].)

   THE SIGNATURE CENTERPIECE — "THE JURISDICTION MAP."  Three tinted
   territories tile the axis: x < −1 under the rule x + 4, then −1 ≤ x < 2
   under the flat rule 2, then x ≥ 2 under 2x − 3.  Gold border posts stand
   at −1 and 2, and at each border ONE carmine deed dot marks the side that
   owns the boundary point, with the losing side left hollow.  The graph
   genuinely TEARS at each border — and remains a perfectly honest function.

   THE MODEL — exact integer arithmetic throughout:
     · RULES carry a predicate and an integer formula; ruleFor(x) collects
       every rule whose predicate claims x and ASSERTS exactly one does —
       the partition theorem, checked at every probe, is what "one rule per
       region" means.
     · evalF(x) applies the owning rule only; every posted probe is an
       integer with an integer output.
     · deeds: at −1 the middle rule's "≤" holds the point (f(−1) = 2, not
       3); at 2 the right rule's "≥" holds it (f(2) = 1, not 2).  The audit
       recomputes both sides of both borders and the size of both jumps.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No fold, no |x|, no V — the absolute-value bench owns reaching
       piecewise through the fold; this bench never writes a bar.
     · No approach stories, no creeping toward the border — the limits
       bench owns what happens NEAR a point; this bench only ever asks
       what happens AT points, which is all a function owes.
     · No slope triangles, no rate readings — the line bench owns the
       anatomy of the pieces; here each piece is just a rule with a
       territory.
     · No matching graphs to tales — the story bench owns that game.
   COLORS: one accent. CARMINE = the deed dots and the firing rule (the
   object). GOLD = the border posts (the tool). BLUE = quiet territories
   and rule cards. GREEN only on correct answers and CALIBRATED.

   THE CALIBRATION — a probe x is posted on the map.  Rule WHICH rule fires
   first (read the territories), then rule f(x) exactly.  Truths are derived
   from ruleFor/evalF at answer time; the meter is quantized to {0, 50,
   100}; the value earns nothing until the rule stands.  The stamp provably
   cannot fire falsely.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ============================================================================
   MODEL — exact integer arithmetic; nothing a student sees is floated.
   ========================================================================== */
const CARMINE = '#c81e4f';
const BLUE = '#3f74a6';
const GOLD = '#b98718';
const INK_HEX = '#243342';
const SLATE = '#5b6b7b';
const CALIB_STEP = 5;
const MINUS = '−'; /* U+2212 */

const fmtInt = (n) => (n < 0 ? MINUS + String(-n) : String(n));

/* the three rules — a predicate, a territory description, and a formula */
const RULES = [
  { id: 'A', label: 'x + 4', when: `x < ${MINUS}1`, test: (x) => x < -1, f: (x) => x + 4 },
  { id: 'B', label: '2', when: `${MINUS}1 ≤ x < 2`, test: (x) => x >= -1 && x < 2, f: () => 2 },
  { id: 'C', label: `2x ${MINUS} 3`, when: 'x ≥ 2', test: (x) => x >= 2, f: (x) => 2 * x - 3 },
];

/* the partition theorem: every x is claimed by EXACTLY one rule */
const ruleFor = (x) => {
  const claims = RULES.filter((r) => r.test(x));
  if (claims.length !== 1) throw new Error('the territories must tile the axis exactly once');
  return claims[0];
};
const evalF = (x) => ruleFor(x).f(x);

/* the borders and their deeds — DERIVED from the predicates, never stored */
const BORDERS = [-1, 2];
const deedOf = (b) => ruleFor(b).id;
/* what the losing side WOULD have paid at the border */
const losingValueAt = (b) => {
  const owner = ruleFor(b);
  /* the neighboring rule that touches the border but does not own it */
  const loser = RULES.find((r) => r.id !== owner.id && (r.test(b - 1) || r.test(b + 1)) && !r.test(b));
  return loser.f(b);
};
const jumpAt = (b) => evalF(b) - losingValueAt(b);

/* ---------------------------------------------------------------------------
   CALIBRATION — posted probes; truths derived from the map.
   ------------------------------------------------------------------------- */
const CASES = [-3, -2, -1, 2, 3, 4];
const RULE_CHIPS = RULES.map((r) => r.label);
const VAL_CHIPS = ['1', '2', '3', '5'];

const labelOf = (i) => `the probe x = ${fmtInt(CASES[i])}`;
const ruleTruth = (i) => ruleFor(CASES[i]).label;
const valTruth = (i) => fmtInt(evalF(CASES[i]));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, rPick, vPick) => {
  if (i == null) return [false, false];
  const c1 = rPick === ruleTruth(i);
  const c2 = c1 && vPick === valTruth(i);
  return [c1, c2];
};
const closeness = (i, rPick, vPick) => {
  const [c1, c2] = calibChecks(i, rPick, vPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, rPick, vPick) => calibChecks(i, rPick, vPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One rule per territory',
    body:
      'Three territories tile the axis: left of −1 the rule x + 4 governs; ' +
      'from −1 up to (but not including) 2, the flat rule 2; from 2 onward, ' +
      '2x − 3. One function, three jurisdictions.',
    probe: 0,
    q: 'What is f(0)?',
    choices: [
      '2 — the probe 0 lies in the middle territory, and only the governing rule votes',
      '4 — apply x + 4, the first rule listed',
      'All three: 4, 2, and −3 at once',
    ],
    answer: 0,
    feedback:
      'A probe consults the map first, the formula second: 0 sits in the middle ' +
      'territory, so the flat rule answers, f(0) = 2, and the other rules have ' +
      'no vote there. Every piecewise error in the wild is one of two mistakes: ' +
      'wrong territory, or right territory read with the wrong rule — and the ' +
      'map catches both before any algebra starts.',
    note:
      'Read the braces as law, not decoration: each line is "formula, THEN the ' +
      'territory where it applies." The formula half is ordinary; all the new ' +
      'content of piecewise lives in the territory half. Learn to read that half ' +
      'first and the rest is arithmetic you already own.',
  },
  {
    title: 'The deed at the border',
    body:
      'x = −1 sits on a border. The left rule would pay −1 + 4 = 3; the middle ' +
      'rule pays 2. Both covet the point — but the signs have already ruled.',
    probe: -1,
    q: 'What is f(−1), and why?',
    choices: [
      '2 — the middle territory reads "−1 ≤ x", so it holds the deed; the left reads "x < −1" and stops short',
      '3 — the left rule is closer',
      'Both 2 and 3 — borders are shared',
    ],
    answer: 0,
    feedback:
      'The inequality signs are the deed: "≤" closes its endpoint, "<" leaves ' +
      'it open. At −1 the middle rule owns the point (closed carmine dot) and ' +
      'the left rule waives it (hollow dot at height 3). f(−1) = 2, exactly, ' +
      'with no negotiation left to do.',
    note:
      'Borders are never shared and never orphaned in a well-posed map. Watch ' +
      'the pairing at every border: one ≤ against one <, one deed against one ' +
      'waiver — that is the grammar of the braces.',
  },
  {
    title: 'The tear',
    body:
      'Just left of −1 the function pays values near 3; AT −1 it pays 2. The ' +
      'graph tears — a jump of size 1 at the border.',
    probe: -1,
    q: 'Does the tear disqualify f as a function?',
    choices: [
      'No — every input still gets exactly one output; being unbroken is a separate virtue',
      'Yes — real functions must be drawable without lifting the pen',
      'Yes, unless the jump is smaller than 1',
    ],
    answer: 0,
    feedback:
      'The function contract says one output per input — nothing about ' +
      'smoothness. f passes: every probe, including −1 exactly, gets a single ' +
      'answer. What the tear breaks is continuity, a different property with ' +
      'its own bench. Step functions earn their living from exactly these ' +
      'honest jumps: postage, parking, tax brackets — pricing the world one ' +
      'territory at a time.',
    note:
      'Keep the two questions separate forever: "is it a function?" is about ' +
      'AT each point; "is it unbroken?" is about NEAR each point. This bench ' +
      'only ever asks the first.',
  },
  {
    title: 'Dot grammar',
    body:
      'At the border x = 2: the middle rule stops short (open dot at height 2) ' +
      'and the right rule takes over (closed dot at 2·2 − 3 = 1).',
    probe: 2,
    q: 'Suppose BOTH dots at x = 2 were closed. What breaks?',
    choices: [
      'f(2) would have two values — 2 and 1 — and f would stop being a function',
      'Nothing; extra closed dots are just emphasis',
      'The graph would become continuous',
    ],
    answer: 0,
    feedback:
      'Two closed dots at one x is two outputs for one input — the one crime ' +
      'the function contract cannot forgive. Two OPEN dots is the other ' +
      'failure: x = 2 would get no output at all, and the map would have a ' +
      'hole in its law. Exactly one deed per border: not style, arithmetic.',
    note:
      'This is why the audit of any piecewise definition is a border patrol: ' +
      'visit each border, check one ≤ and one <, one closed and one open. Two ' +
      'checks per border and the whole map is certified — a full correctness ' +
      'proof that fits on two fingers.',
  },
  {
    title: 'Walking the map',
    body:
      'The dial slides a probe across the whole map, −4 to 4. Watch which rule ' +
      'card lights and what it pays.',
    probe: 0,
    dial: true,
    q: 'Sliding from x = 1 to x = 2 — which rule fires AT exactly 2?',
    choices: [
      'The right rule: f(2) = 2·2 − 3 = 1, because "x ≥ 2" holds the deed at 2',
      'The middle rule: f(2) = 2, because you came from its side',
      'Neither; 2 is between jurisdictions',
    ],
    answer: 0,
    feedback:
      'Where you came from never matters — only where you ARE. At 2 the right ' +
      'territory’s "≥" owns the point, the card 2x − 3 lights, and the payout ' +
      'drops from 2 to 1 in a single honest step. The dial makes the ' +
      'jurisdiction change visible: one probe, one owner, always.',
    note:
      'Try the full sweep once: rule cards trade exactly at −1 and at 2, and ' +
      'nowhere else. Territories are intervals, not moods — the changeovers ' +
      'are exact. A probe one step from a border is governed as firmly as one ' +
      'a mile away.',
  },
  {
    title: 'The surveyor’s stamp',
    body:
      'A probe is posted on the map. Rule WHICH rule fires first — read the ' +
      'territories, mind the deeds at the borders — then rule f(x) exactly. ' +
      'Both exact, or no stamp.',
    probe: 0,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PiecewiseLab() {
  const [xDial, setXDial] = useState(0);
  const [rPick, setRPick] = useState(null);
  const [vPick, setVPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const probe = calib && kase != null ? CASES[kase] : current.dial ? xDial : current.probe;
  const firing = ruleFor(probe);
  const fx = evalF(probe);

  const checks = calib ? calibChecks(kase, rPick, vPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, rPick, vPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, rPick, vPick) : false;

  const bandLabel = calib ? `posted: ${kase != null ? labelOf(kase) : ''}` : `the map, probed at x = ${fmtInt(probe)}`;
  sceneRef.current = { probe, firing, fx, calib, bandLabel };

  /* ---- full redraw from state ------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H2 = stage.clientHeight;
    if (W === 0 || H2 === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H2 * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const S = sceneRef.current;
    ctx.clearRect(0, 0, W, H2);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let gx = gs; gx < W; gx += gs) {
      ctx.moveTo(Math.round(gx) + 0.5, 0);
      ctx.lineTo(Math.round(gx) + 0.5, H2);
    }
    for (let gy = gs; gy < H2; gy += gs) {
      ctx.moveTo(0, Math.round(gy) + 0.5);
      ctx.lineTo(W, Math.round(gy) + 0.5);
    }
    ctx.stroke();

    const bandH = 52;
    const padL = 40;
    const padR = 24;
    const xOf = (x) => padL + ((x + 4.6) / 9.2) * (W - padL - padR);
    const yOf = (y) => bandH + 44 + ((7 - y) / 10) * (H2 - bandH - 44 - 96);

    /* territory tints + border posts */
    ctx.fillStyle = 'rgba(63,116,166,0.06)';
    ctx.fillRect(xOf(-4.6), bandH + 40, xOf(-1) - xOf(-4.6), H2 - bandH - 40 - 92);
    ctx.fillStyle = 'rgba(63,116,166,0.12)';
    ctx.fillRect(xOf(-1), bandH + 40, xOf(2) - xOf(-1), H2 - bandH - 40 - 92);
    ctx.fillStyle = 'rgba(63,116,166,0.06)';
    ctx.fillRect(xOf(2), bandH + 40, xOf(4.6) - xOf(2), H2 - bandH - 40 - 92);
    for (const b of BORDERS) {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(xOf(b), bandH + 40);
      ctx.lineTo(xOf(b), H2 - 92);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* axis */
    ctx.strokeStyle = SLATE;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xOf(-4.6), yOf(0));
    ctx.lineTo(xOf(4.6), yOf(0));
    ctx.stroke();
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = -4; x <= 4; x++) {
      ctx.fillStyle = SLATE;
      ctx.fillText(fmtInt(x), xOf(x), yOf(0) + 6);
    }

    /* the three pieces (each drawn only over its own territory) */
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = BLUE;
    /* A: x + 4 on [−4.6, −1) */
    ctx.beginPath();
    ctx.moveTo(xOf(-4.6), yOf(-0.6));
    ctx.lineTo(xOf(-1), yOf(3));
    ctx.stroke();
    /* B: 2 on [−1, 2) */
    ctx.beginPath();
    ctx.moveTo(xOf(-1), yOf(2));
    ctx.lineTo(xOf(2), yOf(2));
    ctx.stroke();
    /* C: 2x − 3 on [2, 4.6] */
    ctx.beginPath();
    ctx.moveTo(xOf(2), yOf(1));
    ctx.lineTo(xOf(4.6), yOf(2 * 4.6 - 3));
    ctx.stroke();

    /* the deed dots — closed carmine for the owner, hollow for the waiver */
    const dot = (x, y, closed) => {
      ctx.beginPath();
      ctx.arc(xOf(x), yOf(y), 5.5, 0, 2 * Math.PI);
      if (closed) {
        ctx.fillStyle = CARMINE;
        ctx.fill();
      } else {
        ctx.fillStyle = '#fbfbf8';
        ctx.fill();
        ctx.strokeStyle = SLATE;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };
    dot(-1, 3, false); /* A waives −1 at height 3 */
    dot(-1, 2, true); /* B holds the deed: f(−1) = 2 */
    dot(2, 2, false); /* B waives 2 at height 2 */
    dot(2, 1, true); /* C holds the deed: f(2) = 1 */

    /* the probe */
    ctx.strokeStyle = INK_HEX;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(xOf(S.probe), yOf(0) - 4);
    ctx.lineTo(xOf(S.probe), yOf(S.fx));
    ctx.stroke();
    ctx.fillStyle = CARMINE;
    ctx.beginPath();
    ctx.arc(xOf(S.probe), yOf(S.fx), 4.2, 0, 2 * Math.PI);
    ctx.fill();

    /* the rule cards */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the jurisdictions', 22, bandH + 8);
    let cx = 150;
    for (const r of RULES) {
      const hot = !S.calib && r.id === S.firing.id;
      ctx.fillStyle = hot ? CARMINE : BLUE;
      ctx.font = (hot ? '700' : '600') + ' 11.5px ui-monospace, monospace';
      const cardTxt = `${r.label}  (${r.when})${hot ? ' ← fires' : ''}`;
      ctx.fillText(cardTxt, cx, bandH + 10);
      cx += ctx.measureText(cardTxt).width + 30;
    }

    /* the payout card */
    ctx.fillStyle = S.calib ? SLATE : CARMINE;
    ctx.font = '600 12px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(S.calib ? `f(${fmtInt(S.probe)}) = ?  ·  which rule?` : `f(${fmtInt(S.probe)}) = ${fmtInt(S.fx)}  via  ${S.firing.label}`, 22, H2 - 74);

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(S.bandLabel, W / 2, bandH / 2);
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
    setXDial(0);
    setRPick(null);
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
    setXDial(0);
    setRPick(null);
    setVPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Rule ${rPick ?? 'unruled'}; value ${vPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Probe x = ${fmtInt(probe)}: the rule ${firing.label} fires (${firing.when}), and f(${fmtInt(probe)}) = ${fmtInt(fx)}.`;

  return (
    <div className="pwlab">
      <header className="head">
        <h1>Piecewise Functions: One Rule Per Territory</h1>
        <p className="lede">
          A piecewise function is a map of jurisdictions: each stretch of the axis
          answers to exactly one rule, and at every border <em>the inequality signs
          hold the deed</em> — one closed dot, one open, never two of either. The
          graph may tear; the function stays honest.
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

          {current.dial && !calib && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the probe x</span>
                  <span className="dial-v mono">{fmtInt(xDial)}</span>
                </div>
                <input
                  type="range"
                  min={-4}
                  max={4}
                  step={1}
                  value={xDial}
                  onChange={(e) => setXDial(Number(e.target.value))}
                  aria-label={`Probe, ${xDial}`}
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
              {answered && current.note && <p className="note">{current.note}</p>}
            </div>
          )}

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted probe</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the rule, identified</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the payout, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Rule ruling">
                  {RULE_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (rPick === c2 ? ' active' : '')}
                      onClick={() => setRPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Value ruling">
                  {VAL_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (vPick === c2 ? ' active' : '')}
                      onClick={() => setVPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the survey stands'
                    : checks[0]
                      ? 'rule identified — now apply it, exactly'
                      : 'territory first: mind the deeds at −1 and 2'}
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
                  <span className="mono target-hint">the rule · then the payout</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setRPick(null);
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
                  setRPick(null);
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
        <span className="mono">territory first, formula second · one deed per border</span>{' '}
        &nbsp;·&nbsp; the graph may tear at the border posts — one closed dot, one
        open, and the function keeps every promise it made.
      </footer>

      <style jsx>{`
        .pwlab {
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
        :global(.pwlab) :focus-visible {
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
