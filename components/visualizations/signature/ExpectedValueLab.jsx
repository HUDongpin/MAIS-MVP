'use client';

/* ============================================================================
   ExpectedValueLab — an interactive "bench" for EXPECTED VALUE: the split of
   the pot.  Lay out every ticket of a raffle with its payout printed; add
   the payouts into the POT; split the pot evenly across the tickets — that
   per-ticket share IS the expected value, an exact fraction before any luck
   happens.  Regroup the same sum and the textbook formula appears: EV =
   Σ value · (share of tickets) — weighting by VALUE, which is precisely what
   the plain long-run average never does.  (GRADES 9–12 · CCSS S-MD.A.1–4 —
   define a random variable, compute its expected value as the mean of a
   probability distribution, and interpret it.)

   THE SIGNATURE CENTERPIECE — "THE TICKET STRIP AND THE SPLIT."  Ten blue
   tickets in a strip, payouts printed: one pays 50, three pay 10, six pay
   0.  The gold pot line adds them: 50 + 30 + 0 = 80.  The carmine split
   line divides: 80 ÷ 10 = 8 per ticket.  Against the posted price of 10,
   the game LEAKS 2 per play — printed as a subtraction, not discovered by
   simulation.  A game that dangles a 50 and leaks a 2 is the whole lesson.

   THE MODEL — exact integer arithmetic throughout:
     · a game is rows of {v, k} (payout, ticket count); potOf = Σ v·k and
       nOf = Σ k are integers; evOf = [pot, n] reduced by gcd — every EV
       this bench posts is engineered to land on an integer.
     · the regroup identity Σ v·k / n = Σ v·(k/n) is proven by the audit
       as exact fraction arithmetic, term by term, for every posted game.
     · leakOf(price) = price − EV, exact; fairness is the integer equation
       EV = price, and the dial finds the exactly-fair jackpot.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No long-run chart, no settling average, no simulation — the chance
       bench owns convergence; this bench computes WHERE the settling
       would land, and cites the kinship once.
     · No spinner, no dice art — outcomes are tickets in a strip.
     · No shrinking slots, no shuffle bills — the arrangements bench owns
       counting; every ticket here is already laid on the table.
     · No spread, no risk measure — EV is deliberately blind to risk, and
       when that blindness shows (two games, same EV, wildly different
       nerves) the spread benches are cited and left alone.
   COLORS: one accent. CARMINE = the split — the expected value (the
   object). GOLD = the pot line (the tool). BLUE = quiet tickets. GREEN
   only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a ticket strip is posted.  Rule the pot first (add
   every payout), then rule the split — the expected value per ticket.
   Truths are derived from potOf/evOf at answer time; the meter is
   quantized to {0, 50, 100}; the split earns nothing until the pot
   stands.  The stamp provably cannot fire falsely.
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
const gcdOf = (x, y) => {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
};

/* a game is rows of {v: payout, k: how many tickets pay it} */
const GAMES = {
  raffle: { label: 'the headline raffle', rows: [{ v: 50, k: 1 }, { v: 10, k: 3 }, { v: 0, k: 6 }] },
  even: { label: 'the even split', rows: [{ v: 20, k: 5 }, { v: 0, k: 5 }] },
  jackpot: { label: 'the lone jackpot', rows: [{ v: 90, k: 1 }, { v: 0, k: 9 }] },
  steady: { label: 'the steady payer', rows: [{ v: 9, k: 10 }] },
  spread2: { label: 'the two-tier raffle', rows: [{ v: 30, k: 2 }, { v: 5, k: 8 }] },
  spread3: { label: 'the four-and-six raffle', rows: [{ v: 15, k: 4 }, { v: 5, k: 6 }] },
};

const potOf = (key) => GAMES[key].rows.reduce((t, r) => t + r.v * r.k, 0);
const nOf = (key) => GAMES[key].rows.reduce((t, r) => t + r.k, 0);
/* the split: pot over tickets, reduced — the expected value */
const evOf = (key) => {
  const p = potOf(key);
  const n = nOf(key);
  const g = gcdOf(p, n);
  return [p / g, n / g];
};
const evText = (key) => {
  const [n, d] = evOf(key);
  return d === 1 ? String(n) : `${n}/${d}`;
};
/* the leak against a posted price */
const leakOf = (key, price) => {
  const [n, d] = evOf(key);
  if (d !== 1) throw new Error('posted games split to whole numbers');
  return price - n;
};

const PRICE = 10; /* every game on this bench sells tickets at 10 */
/* the dial's jackpot family: 1 ticket pays J, 9 pay 0 → EV = J/10 */
const jackpotEv = (J) => {
  if (J % 10 !== 0) throw new Error('the dial posts multiples of 10');
  return J / 10;
};

/* ---------------------------------------------------------------------------
   CALIBRATION — posted strips; truths derived, never stored.
   ------------------------------------------------------------------------- */
const CASES = ['raffle', 'even', 'jackpot', 'steady', 'spread2', 'spread3'];
const POT_CHIPS = ['80', '90', '100'];
const EV_CHIPS = ['8', '9', '10'];

const labelOf = (i) => GAMES[CASES[i]].label;
const potTruth = (i) => String(potOf(CASES[i]));
const evTruth = (i) => evText(CASES[i]);

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, pPick, ePick) => {
  if (i == null) return [false, false];
  const c1 = pPick === potTruth(i);
  const c2 = c1 && ePick === evTruth(i);
  return [c1, c2];
};
const closeness = (i, pPick, ePick) => {
  const [c1, c2] = calibChecks(i, pPick, ePick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, pPick, ePick) => calibChecks(i, pPick, ePick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The pot',
    body:
      'Ten tickets on the table: one pays 50, three pay 10, six pay nothing. ' +
      'Add every printed payout into the pot: 50 + 30 + 0 = 80.',
    game: 'raffle',
    showPrice: false,
    q: 'Before any drawing happens — what is one ticket WORTH?',
    choices: [
      '80 ÷ 10 = 8 — split the whole pot evenly; the per-ticket share is the worth before luck',
      '50 — a ticket might win the top prize',
      '0 — most tickets pay nothing',
    ],
    answer: 0,
    feedback:
      'Both wrong answers stare at single tickets; worth belongs to the whole ' +
      'strip. The pot holds 80 no matter who wins, so ten equal claims on it ' +
      'are 8 each. That split — total payout over total tickets — is the ' +
      'expected value, computed before luck gets a vote.',
    note:
      'Notice EV needs no repetition to mean something: it is the honest ' +
      'sticker price of one claim on this pot. What repetition adds is a ' +
      'different bench’s story, cited later — for now, one strip and one split ' +
      'carry the whole meaning.',
  },
  {
    title: 'The regroup',
    body:
      'Same sum, regrouped by payout: 50·(1/10) + 10·(3/10) + 0·(6/10) = ' +
      '5 + 3 + 0 = 8. Each payout, weighted by its share of tickets.',
    game: 'raffle',
    showPrice: false,
    q: 'What did the regroup change?',
    choices: [
      'Nothing but the reading — the same pot arithmetic, now organized as value × share, the textbook’s EV formula',
      'The answer — weighting gives a different number',
      'It converted EV into a probability',
    ],
    answer: 0,
    feedback:
      'Σ v·k over n and Σ v·(k/n) are the same fractions in different ' +
      'jackets — the audit checks the identity term by term. But the second ' +
      'jacket says something the first mumbles: rare-but-big and ' +
      'common-but-small trade off through their WEIGHTS. A 50 seen once ' +
      'contributes exactly what a 5 seen ten times would. Weight is the honest ' +
      'exchange rate between rarity and size.',
    note:
      'This weighting is what the plain average of “numbers I might win” gets ' +
      'wrong: averaging 50, 10, 0 as three equals gives 20 — nonsense, because ' +
      'the 0 holds six tickets and the 50 holds one. Averages of menus mislead; ' +
      'averages of tickets do not.',
  },
  {
    title: 'The leak',
    body:
      'The booth sells each ticket for 10. The split says a ticket is worth 8. ' +
      'Subtract.',
    game: 'raffle',
    showPrice: true,
    q: 'What does the 2 mean?',
    choices: [
      'The average leak per play — pay 10, hold 8 of claim; the booth keeps 2 per ticket, before any luck',
      'Nothing — sometimes you win 50, so the game is fine',
      'You lose exactly 2 every single game',
    ],
    answer: 0,
    feedback:
      'Per PLAY, not per outcome: single games swing from −10 to +40, and the ' +
      'leak is the tilt underneath the swings. The dangled 50 is what makes ' +
      'the game FEEL generous; the split is what makes it arithmetic. ' +
      'Fair-looking and fair are different claims, and only one of them ' +
      'divides — and division is not persuaded by headlines.',
    note:
      'The chance bench shows sample averages settling as plays pile up; this ' +
      'bench computes the exact floor they settle onto. Two benches, one ' +
      'number, opposite directions of travel.',
  },
  {
    title: 'Fair, exactly',
    body:
      'New strip: five tickets pay 20, five pay 0. Pot = 100, split = 10 — ' +
      'and the price is 10.',
    game: 'even',
    showPrice: true,
    q: 'Is this game fair?',
    choices: [
      'Yes — EV equals price, 10 = 10, leak zero: fairness is an equation, not a feeling',
      'No — half the tickets still pay nothing',
      'Cannot tell without playing many rounds',
    ],
    answer: 0,
    feedback:
      'Fair means the price buys exactly its worth: EV − price = 0, an integer ' +
      'equation this strip satisfies on the nose. Half the tickets paying ' +
      'nothing is about SPREAD, not fairness — you can lose all night at a ' +
      'perfectly fair table. The equation only promises the tilt is zero.',
    note:
      'And EV is blind to nerves: the steady payer (every ticket pays 9) and ' +
      'the lone jackpot (one 90) split to the same 9 — identical worth, ' +
      'wildly different rides. Measuring the ride is the spread benches’ ' +
      'craft, not this one’s. One number per question; one bench per number.',
  },
  {
    title: 'Tuning a game to fair',
    body:
      'The dial holds a jackpot family: one ticket pays J, nine pay nothing, ' +
      'price still 10. EV = J/10.',
    game: 'jackpot',
    showPrice: true,
    dial: true,
    q: 'At what jackpot J does this game turn exactly fair?',
    choices: [
      'J = 100 — then EV = 100/10 = 10 = price; below 100 it leaks, above it gushes',
      'J = 50 — half the tickets’ worth',
      'No jackpot can make a 9-blanks game fair',
    ],
    answer: 0,
    feedback:
      'Solve the fairness equation: J/10 = 10 forces J = 100, exactly. At the ' +
      'posted J = 90 the game leaks 1 per play — a whole point of tilt hiding ' +
      'under a 90-sized headline. Blanks do not make a game unfair; a pot ' +
      'smaller than the ticket revenue does.',
    note:
      'Run the dial once and watch the leak line cross zero: 50 leaks 5, 70 ' +
      'leaks 3, 90 leaks 1, 110 gushes 1 the other way. Fairness is a point, ' +
      'not a region — and the arithmetic can name it.',
  },
  {
    title: 'The teller’s stamp',
    body:
      'A ticket strip is posted with its payouts printed and nothing summed. ' +
      'Rule the pot first — add every printed payout, count times value — ' +
      'then rule the split: the expected value per ticket, exactly. Both ' +
      'exact, or no stamp; the meter reports only how much of the ruling ' +
      'stands.',
    game: 'raffle',
    showPrice: false,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ExpectedValueLab() {
  const [jDial, setJDial] = useState(90);
  const [pPick, setPPick] = useState(null);
  const [ePick, setEPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  /* the dial swaps in a jackpot variant built live */
  const gameKey = calib && kase != null ? CASES[kase] : current.game;
  const rows = current.dial && !calib ? [{ v: jDial, k: 1 }, { v: 0, k: 9 }] : GAMES[gameKey].rows;
  const pot = rows.reduce((t, r) => t + r.v * r.k, 0);
  const nTickets = rows.reduce((t, r) => t + r.k, 0);
  const g = gcdOf(pot, nTickets);
  const ev = [pot / g, nTickets / g];
  const evStr = ev[1] === 1 ? String(ev[0]) : `${ev[0]}/${ev[1]}`;
  const showPrice = !!current.showPrice && !calib;

  const checks = calib ? calibChecks(kase, pPick, ePick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, pPick, ePick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, pPick, ePick) : false;

  const bandLabel = calib
    ? `posted: ${kase != null ? labelOf(kase) : ''}`
    : current.dial
      ? `the jackpot family · J = ${jDial}`
      : GAMES[gameKey].label;
  sceneRef.current = { rows, pot, nTickets, evStr, showPrice, calib, bandLabel };

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

    /* THE TICKET STRIP */
    const tickets = [];
    for (const r of S.rows) for (let i = 0; i < r.k; i++) tickets.push(r.v);
    const tw = Math.min(74, (W - 80) / tickets.length);
    const x0 = (W - tickets.length * tw) / 2;
    const yT = bandH + 60;
    tickets.forEach((v, i) => {
      const x = x0 + i * tw;
      ctx.fillStyle = v > 0 ? 'rgba(63,116,166,0.16)' : 'rgba(63,116,166,0.05)';
      ctx.fillRect(x + 4, yT, tw - 8, 64);
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x + 4, yT, tw - 8, 64);
      ctx.setLineDash([]);
      ctx.fillStyle = v > 0 ? INK_HEX : SLATE;
      ctx.font = '700 13px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(v), x + tw / 2, yT + 32);
    });
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`the tickets (${S.nTickets})`, 22, bandH + 8);

    /* THE POT AND THE SPLIT */
    const yP = yT + 92;
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = '700 13px ui-monospace, monospace';
    const potTerms = S.rows.map((r) => `${r.v}·${r.k}`).join(' + ');
    ctx.fillText(S.calib ? `the pot: ${potTerms} = ?` : `the pot: ${potTerms} = ${S.pot}`, W / 2, yP);
    ctx.fillStyle = CARMINE;
    ctx.fillText(
      S.calib ? `the split: ? ÷ ${S.nTickets} = ?  per ticket` : `the split: ${S.pot} ÷ ${S.nTickets} = ${S.evStr}  per ticket`,
      W / 2,
      yP + 26
    );
    if (S.showPrice) {
      const leak = 10 - Number(S.evStr);
      ctx.fillStyle = INK_HEX;
      ctx.fillText(
        `price 10 ${MINUS} worth ${S.evStr} = ${leak === 0 ? 'leak 0 — fair, exactly' : leak > 0 ? `leak ${leak} per play` : `gush ${-leak} per play`}`,
        W / 2,
        yP + 52
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
    setJDial(90);
    setPPick(null);
    setEPick(null);
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
    setJDial(90);
    setPPick(null);
    setEPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Pot ${pPick ?? 'unruled'}; split ${ePick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `${bandLabel}: pot ${pot} over ${nTickets} tickets; the split is ${evStr} per ticket${showPrice ? `; against price 10 the leak is ${10 - Number(evStr)}` : ''}.`;

  return (
    <div className="evlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Expected Value: The Split of the Pot</h1>
        <p className="lede">
          Lay out every ticket, add every printed payout into the pot, split it
          evenly — that per-ticket share is the expected value, exact before any
          luck happens. Regroup it and the formula Σ value·share appears;
          <em> subtract it from the price and a fair-looking game leaks</em>.
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
                  <span className="dial-k">the jackpot J</span>
                  <span className="dial-v mono">{jDial}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={110}
                  step={20}
                  value={jDial}
                  onChange={(e) => setJDial(Number(e.target.value))}
                  aria-label={`Jackpot, ${jDial}`}
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
                <span className="target-k">The posted strip</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the pot, added</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the split, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Pot ruling">
                  {POT_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (pPick === c2 ? ' active' : '')}
                      onClick={() => setPPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Split ruling">
                  {EV_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (ePick === c2 ? ' active' : '')}
                      onClick={() => setEPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the booth is audited'
                    : checks[0]
                      ? 'pot added — now split across every ticket'
                      : 'payout times count, summed'}
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
                  <span className="mono target-hint">the pot · then the split</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setPPick(null);
                  setEPick(null);
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
                  setPPick(null);
                  setEPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">pot = Σ payout · count · split = pot ÷ tickets · leak = price − split</span>{' '}
        &nbsp;·&nbsp; fair-looking and fair are different claims — only one of
        them divides.
      </footer>

      <style jsx>{`
        .evlab {
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
        :global(.evlab) :focus-visible {
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
