'use client';

/* ============================================================================
   TreeDiagramLab — an interactive "bench" for COMPOUND EVENTS & TREE DIAGRAMS:
   the tree of every way — each stage sprouts branches from every leaf, so the
   path counts MULTIPLY, and an event is nothing but a bag of leaves you can
   count.  (CCSS 7.SP.C.8 — sample spaces for compound events via organized
   lists and tree diagrams; probability of a compound event as the fraction of
   outcomes in the event.)

   THE SIGNATURE CENTERPIECE — "the tree of every way."  A left-to-right
   branching tree: one root, a column per stage, and a final leaf column where
   every complete path is spelled as a word (HHT, RJC…).  Favorable leaves
   burn carmine; the gold counter card reads the event as a count — 3 of 8
   paths — never as a promise about any single flip.

   THE MODEL — exact integer arithmetic throughout:
     · an experiment is a list of STAGES, each a list of equally likely
       outcomes; leavesOf() is the cartesian product, every leaf a path word.
     · totalOf() multiplies the stage sizes — THE LAW — and the audit proves
       it equals the enumerated leaf count for every experiment.
     · events are PREDICATES on the leaf word (exactly one H, the red shirt);
       favOf() counts the leaves that pass.  Nothing is stored, all counted.
     · probabilities appear only as "fav of total paths" plus the reduced
       fraction via integer gcd — no decimal a student ever sees.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No spinner, no long-run tally, no repeated experiment — ProbabilityLab
       owns chance as an unfolding frequency.  This bench never flips a coin;
       it inventories every way the flips could land.
     · The coin is FLIPPED here, never spent — the "common coin" currency
       device belongs to the fraction-division bench and stays there.
     · No operator nodes, no translating words to symbols — TranslateLab owns
       the expression tree.  This tree grows left-to-right, stages not
       operators, and its leaves are path words.
     · No factorials, no arranging — the counting benches above own those.
     · No pond, nobody is measured — SamplingLab owns who-got-asked.
   COLORS: one accent. CARMINE = the event's leaves (the object). GOLD = the
   counter card (the tool). BLUE = quiet branches and stage labels. GREEN
   only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — an experiment and an event are posted. Rule the total
   path count (multiply the stages), then rule the favorable count (collect
   the leaves). The stamp is a conjunction of exact equalities against truths
   derived from the model; the meter is quantized to {0, 50, 100}, and the
   favorable ruling earns nothing until the total stands.  The stamp provably
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

const COIN = ['H', 'T'];
const EXPS = {
  coin1: { label: 'one coin', stages: [COIN] },
  coin2: { label: 'two coins', stages: [COIN, COIN] },
  coin3: { label: 'three coins', stages: [COIN, COIN, COIN] },
  coin4: { label: 'four coins', stages: [COIN, COIN, COIN, COIN] },
  closet: { label: 'the closet: 3 shirts, 2 pants', stages: [['R', 'B', 'G'], ['J', 'K']] },
  closet3: { label: 'the closet with 2 hats added', stages: [['R', 'B', 'G'], ['J', 'K'], ['C', 'S']] },
};

/* every leaf is a full path word; the tree is the cartesian product */
const leavesOf = (exp) => EXPS[exp].stages.reduce((acc, st) => acc.flatMap((p) => st.map((o) => p + o)), ['']);
/* THE LAW: stage sizes multiply */
const totalOf = (exp) => EXPS[exp].stages.reduce((t, st) => t * st.length, 1);

const headsIn = (leaf) => [...leaf].filter((ch) => ch === 'H').length;
const EVENTS = {
  exactlyOneH: { label: 'exactly one H', pred: (leaf) => headsIn(leaf) === 1 },
  allH: { label: 'H every time', pred: (leaf) => headsIn(leaf) === leaf.length },
  exactlyTwoH: { label: 'exactly two H', pred: (leaf) => headsIn(leaf) === 2 },
  atLeastOneT: { label: 'at least one T', pred: (leaf) => leaf.includes('T') },
  allMatch: { label: 'all three match', pred: (leaf) => [...leaf].every((ch) => ch === leaf[0]) },
  redShirt: { label: 'the red shirt', pred: (leaf) => leaf[0] === 'R' },
  redJeans: { label: 'red shirt with jeans', pred: (leaf) => leaf === 'RJ' },
};
const favOf = (exp, ev) => leavesOf(exp).filter(EVENTS[ev].pred).length;

const gcdOf = (x, y) => (y === 0 ? x : gcdOf(y, x % y));
const fracOf = (fav, total) => {
  const g = gcdOf(fav, total) || 1;
  return `${fav / g}/${total / g}`;
};

/* ---------------------------------------------------------------------------
   CALIBRATION — posted experiment + event; truths derived, never stored.
   ------------------------------------------------------------------------- */
const CASES = [
  { exp: 'coin2', ev: 'exactlyOneH' },
  { exp: 'coin2', ev: 'allH' },
  { exp: 'coin3', ev: 'exactlyTwoH' },
  { exp: 'coin3', ev: 'atLeastOneT' },
  { exp: 'closet', ev: 'redShirt' },
  { exp: 'closet', ev: 'redJeans' },
  { exp: 'coin3', ev: 'allMatch' },
];
const TOTAL_CHIPS = ['4', '6', '8'];
const FAV_CHIPS = ['1', '2', '3', '7'];

const labelOf = (i) => `${EXPS[CASES[i].exp].label} · ${EVENTS[CASES[i].ev].label}`;
const totalTruth = (i) => String(totalOf(CASES[i].exp));
const favTruth = (i) => String(favOf(CASES[i].exp, CASES[i].ev));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, tPick, fPick) => {
  if (i == null) return [false, false];
  const c1 = tPick === totalTruth(i);
  const c2 = c1 && fPick === favTruth(i);
  return [c1, c2];
};
const closeness = (i, tPick, fPick) => {
  const [c1, c2] = calibChecks(i, tPick, fPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, tPick, fPick) => calibChecks(i, tPick, fPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Two ways it can fall',
    body:
      'One coin. The tree has one fork and two leaves: H and T. Read it for what ' +
      'it is — an inventory, not a fortune.',
    exp: 'coin1',
    dial: true,
    dialDefault: 1,
    q: 'What is this tree, really?',
    choices: [
      'A list of every way things can happen — two leaves, nothing hidden, nothing promised',
      'A prediction of what the coin WILL do',
      'A drawing of one flip that already happened',
    ],
    answer: 0,
    feedback:
      'The tree promises nothing about any single flip. It inventories possibility: ' +
      'two ways to land, so two leaves. Everything this bench builds — counts, ' +
      'events, fractions — stands on having the complete list.',
    note:
      'The dial adds coins. Sweep it once and watch the leaf column: 2, 4, 8, 16. ' +
      'Hold that doubling in your head — the next step explains it.',
  },
  {
    title: 'Every leaf sprouts',
    body:
      'Two coins. The first fork has two leaves, and each of them sprouts a full ' +
      'copy of the second fork.',
    exp: 'coin2',
    dial: true,
    dialDefault: 2,
    q: 'Two coins give four paths, not three. Why?',
    choices: [
      'HT and TH are different walks — H then T is not the same path as T then H',
      'It is really 3 — HT and TH are the same result',
      'It is really 2 — the second coin copies the first',
    ],
    answer: 0,
    feedback:
      'Order lives in the path. HT and TH end with one H apiece, but they are ' +
      'different leaves on different branches: 2 × 2 = 4. Merging them is the ' +
      'single most common counting mistake in this chapter.',
    note:
      'This is why the counts multiply instead of add: every existing leaf sprouts ' +
      'every new outcome. Stage sizes 2 and 2 give 4; the dial’s doubling cascade ' +
      'is the same law wearing a coin costume.',
  },
  {
    title: 'Stages that are not coins',
    body:
      'The closet: 3 shirts (R, B, G) and 2 pants (J, K). Six outfits hang on the ' +
      'tree — count them.',
    exp: 'closet',
    q: 'Now add a stage of 2 hats. How many outfits?',
    choices: [
      '12 — multiply 3 × 2 × 2; no need to draw the bigger tree',
      '8 — add the hats to the six outfits',
      'You cannot know without drawing it',
    ],
    answer: 0,
    feedback:
      'Twelve, by pure multiplication: 3 × 2 × 2. The multiplication IS the tree, ' +
      'compressed — every one of the 6 outfits sprouts 2 hat choices. Once you ' +
      'trust the law, the drawing becomes optional.',
    note:
      'Notice the stages need nothing in common: shirts, pants, hats. Any sequence ' +
      'of independent choices grows this same tree — that is what makes one small ' +
      'law worth carrying everywhere.',
  },
  {
    title: 'Collecting an event',
    body:
      'Three coins, eight paths. The event "exactly two H" is a bag of leaves — ' +
      'the carmine ones. Collect it.',
    exp: 'coin3',
    ev: 'exactlyTwoH',
    q: 'How many of the 8 paths land exactly two H?',
    choices: [
      '3 — HHT, HTH, THH; the probability is 3 of 8',
      '2 — HHT and HTH only',
      '4 — half of the tree',
    ],
    answer: 0,
    feedback:
      'Three leaves: HHT, HTH, THH — the two H can hide in three different ' +
      'positions. An event is not a feeling about the outcome; it is a bag of ' +
      'leaves, and bags are counted, exactly: 3 of 8, the fraction 3/8.',
    note:
      'Check the near miss: THH counts even though it starts with T. Membership is ' +
      'decided by the whole path word, never by how the path begins.',
  },
  {
    title: 'The rule',
    body:
      'Every path equally likely, so probability = favorable leaves over all ' +
      'leaves. That is the entire rule.',
    exp: 'coin3',
    ev: 'exactlyTwoH',
    q: '“Exactly two H either happens or it does not — so it’s a 1-in-2 shot.” True?',
    choices: [
      'No — the equally likely things are the 8 paths, not the two answers; the tree counts 3 of 8',
      'Yes — two possibilities, so 50-50',
      'Yes, but only for fair coins',
    ],
    answer: 0,
    feedback:
      'The PATHS are equally likely; the yes-and-no answers are not. Three paths ' +
      'say yes and five say no, so the honest number is 3/8. Whenever a claim ' +
      'skips the tree, rebuild the tree before you believe it.',
    note:
      'Fairness matters exactly here: favorable-over-total is only licensed when ' +
      'every leaf carries equal weight. A bent coin bends the tree, and the simple ' +
      'count no longer speaks for the chances.',
  },
  {
    title: 'The counter’s stamp',
    body:
      'An experiment and an event are posted. Rule the total path count — multiply ' +
      'the stages — then rule the favorable count by collecting leaves. Both ' +
      'exact, or no stamp.',
    exp: 'coin3',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TreeDiagramLab() {
  const [nCoins, setNCoins] = useState(1);
  const [tPick, setTPick] = useState(null);
  const [fPick, setFPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const exp = calib && kase != null ? CASES[kase].exp : current.dial ? `coin${nCoins}` : current.exp;
  const ev = calib && kase != null ? CASES[kase].ev : current.ev ?? null;
  const leaves = leavesOf(exp);
  const total = totalOf(exp);
  const fav = ev ? favOf(exp, ev) : 0;

  const checks = calib ? calibChecks(kase, tPick, fPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, tPick, fPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, tPick, fPick) : false;

  const bandLabel = calib ? `posted: ${EXPS[exp].label}` : EXPS[exp].label;
  sceneRef.current = { exp, ev, total, fav, calib, bandLabel };

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
    const lvs = leavesOf(S.exp);
    const T = lvs.length;
    const nStages = EXPS[S.exp].stages.length;
    const pred = S.ev ? EVENTS[S.ev].pred : null;

    const topY = bandH + 86;
    const botY = H2 - 18;
    const rowH = (botY - topY) / T;
    const leafY = (i) => topY + (i + 0.5) * rowH;
    const padLx = 40;
    const leafX = W - 74;
    const xOfStage = (s) => padLx + (s / nStages) * (leafX - padLx);

    /* the y of the node reached by a given prefix = center of its leaf block */
    const blockOf = (prefix) => {
      let i0 = -1;
      let i1 = -1;
      lvs.forEach((lf, i) => {
        if (lf.startsWith(prefix)) {
          if (i0 < 0) i0 = i;
          i1 = i;
        }
      });
      return (leafY(i0) + leafY(i1)) / 2;
    };

    /* edges, stage by stage */
    ctx.font = '600 10.5px ui-monospace, monospace';
    for (let s = 0; s < nStages; s++) {
      const prefixes = s === 0 ? [''] : [...new Set(lvs.map((lf) => lf.slice(0, s)))];
      for (const p of prefixes) {
        const y0 = blockOf(p === '' ? '' : p);
        for (const o of EXPS[S.exp].stages[s]) {
          const y1 = blockOf(p + o);
          ctx.strokeStyle = BLUE;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(xOfStage(s), y0);
          ctx.lineTo(xOfStage(s + 1), y1);
          ctx.stroke();
          ctx.fillStyle = BLUE;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(o, (xOfStage(s) + xOfStage(s + 1)) / 2, (y0 + y1) / 2 - 2);
        }
        ctx.fillStyle = SLATE;
        ctx.beginPath();
        ctx.arc(xOfStage(s), y0, 2.6, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    /* the leaf column: full path words; the event burns carmine */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    lvs.forEach((lf, i) => {
      const hot = pred ? pred(lf) : false;
      ctx.fillStyle = hot ? CARMINE : INK_HEX;
      ctx.font = (hot ? '700' : '600') + ' 12px ui-monospace, monospace';
      ctx.fillText(lf, leafX + 14, leafY(i));
      ctx.beginPath();
      ctx.arc(leafX + 5, leafY(i), hot ? 3.4 : 2.4, 0, 2 * Math.PI);
      ctx.fill();
    });

    /* the readout card */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the tree', 22, bandH + 8);
    ctx.font = '600 11.5px ui-monospace, monospace';
    ctx.fillStyle = CARMINE;
    ctx.fillText(S.calib ? 'paths: ?' : `paths: ${S.total}`, 22, bandH + 26);
    ctx.fillStyle = INK_HEX;
    ctx.fillText(
      S.calib
        ? `stages: ${EXPS[S.exp].stages.map((st) => st.length).join(' × ')} = ?`
        : `stages: ${EXPS[S.exp].stages.map((st) => st.length).join(' × ')} = ${S.total}`,
      22,
      bandH + 44
    );
    if (S.ev) {
      ctx.fillStyle = GOLD;
      ctx.fillText(
        S.calib
          ? `event · ${EVENTS[S.ev].label} · ? of ? paths`
          : `event · ${EVENTS[S.ev].label} · ${S.fav} of ${S.total} paths · ${fracOf(S.fav, S.total)}`,
        22,
        bandH + 62
      );
    }

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
    setNCoins(STEPS[step].dialDefault ?? 1);
    setTPick(null);
    setFPick(null);
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
    setNCoins(current.dialDefault ?? 1);
    setTPick(null);
    setFPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Total ${tPick ?? 'unruled'}; favorable ${fPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `${EXPS[exp].label}: ${total} paths${ev ? `; ${EVENTS[ev].label}: ${fav} of ${total} paths` : ''}.`;

  return (
    <div className="trlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>The Tree of Every Way: Paths Multiply</h1>
        <p className="lede">
          Each stage sprouts branches from <em>every</em> leaf, so path counts multiply
          — 2 × 2 × 2, never guesswork. An event is a bag of leaves, and probability
          is the honest count: favorable paths over all paths, as an exact fraction.
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
                  <span className="dial-k">the number of coins</span>
                  <span className="dial-v mono">{nCoins}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={nCoins}
                  onChange={(e) => setNCoins(Number(e.target.value))}
                  aria-label={`Coins, ${nCoins}`}
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
                <span className="target-k">The posted case</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} all paths, counted</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the event, collected</li>
                </ol>
                <div className="declare" role="group" aria-label="Total ruling">
                  {TOTAL_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (tPick === c2 ? ' active' : '')}
                      onClick={() => setTPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Favorable ruling">
                  {FAV_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (fPick === c2 ? ' active' : '')}
                      onClick={() => setFPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both counted, exactly — the tree agrees'
                    : checks[0]
                      ? 'total ruled — now collect the carmine leaves'
                      : 'multiply the stage sizes first'}
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
                  <span className="mono target-hint">the total · then the event</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setTPick(null);
                  setFPick(null);
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
                  setTPick(null);
                  setFPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">paths multiply · an event is a bag of leaves</span>{' '}
        &nbsp;·&nbsp; the tree promises nothing about one flip — it lists every way,
        and the honest fraction is favorable paths over all paths.
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
