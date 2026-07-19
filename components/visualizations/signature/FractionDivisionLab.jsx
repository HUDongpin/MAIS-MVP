'use client';

/* ============================================================================
   FractionDivisionLab — an interactive "bench" for DIVIDING A FRACTION BY A
   FRACTION: division is a counting question, and it becomes whole-number
   counting the moment both amounts are exchanged into the same coin.

        a/b ÷ c/d asks: how many c/d fit in a/b?
        exchange both into (common denominator)ths — the COMMON COIN —
        then it is a count divided by a count:  ad ÷ cb  =  ad/cb
        …which is exactly  a/b × d/c.  Invert-and-multiply, unmasked.

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 6.NS.A.1.
   UnitFractionDivisionLab (K-5) settled wholes ÷ unit fractions with its
   stick count; this bench finishes the strand: fraction ÷ fraction, with
   partial fits, and the reason the famous rule is bookkeeping rather
   than magic.

   THE SIGNATURE CENTERPIECE — "THE COMMON COIN."
     Both amounts are exchanged into the same denomination — twelfths,
     sixths, fortieths — and drawn as rows of labeled coins.  Then the
     question "how many of this fit in that?" is a count divided by a
     count: 2/3 ÷ 3/4 becomes 8 coins measured by 9 coins, so the fit is
     8/9 of one time.  The exchange is the whole proof: a/b is ad coins
     of the (bd)th kind, c/d is cb coins, and ad/cb IS a/b × d/c.  The
     capstone posts a division: rule the two counts in the common coin,
     then the quotient — both exact, or no stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • UnitFractionDivisionLab owns the ribbon measured by a stick and the
       tick-tick-tick count; no stick, ribbon, or tick appears here.  It
       is cited as the strand's opening chapter (wholes ÷ unit fractions),
       and its myth-kill — dividing can grow the answer — is echoed once,
       with credit.
     • DivisionLab (3-5) owns equal-groups sharing on an array; nothing
       here is shared into groups and no array is drawn.
     • FractionAsDivisionLab owns a/b as a ÷ b; EquivalentFractionsLab
       owns renaming as its own subject — here renaming is a TOOL, used
       once per problem and credited.
     • The word "flip" belongs to SignedNumbersLab; the rule here is
       INVERT-and-multiply, and it is derived, not chanted.

   One-accent discipline: CARMINE is THE QUOTIENT — the fit count and the
   verdicts.  GOLD is the coins (the tool).  BLUE is the quiet fraction
   labels.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Everything is exact fraction arithmetic on integers.  The common
       coin is the least common denominator, computed by gcd; the counts
       are integers; the quotient is the exact reduced fraction of the
       two counts.  The audit re-derives every count and every quotient
       from first principles and proves the exchange law
       a/b ÷ c/d = ad/(cb) = a/b × d/c over the whole case space.
     • The money-changer's stamp needs two exact rulings (the counts,
       then the quotient), audited over every posted case × chip pair;
       the truth chip is always present and never duplicated.
   Verified by audit-fractiondivision.mjs (numeric proof + source greps)
   and verify-fractiondivision.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/FractionDivisionLab.jsx
     2. Import and render it:
          import FractionDivisionLab from './FractionDivisionLab';
          export default function Page() { return <FractionDivisionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the posed
              division, the lesson step, answers, the rulings).
     MODEL  — exact integer/fraction arithmetic; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the quotient — the fit
const BLUE = '#3f74a6'; // quiet fraction labels
const GOLD = '#b98718'; // the coins
const INK_HEX = '#1c2b3a';

const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact fractions; the common coin; the exchange law.
   A division is [a, b, c, d] meaning a/b ÷ c/d.
   ------------------------------------------------------------------------- */
const gcdInt = (x, y) => (y === 0 ? Math.abs(x) : gcdInt(y, x % y));
const lcmInt = (x, y) => (x * y) / gcdInt(x, y);
const frac = (n, d = 1) => {
  const s = d < 0 ? -1 : 1;
  const g = gcdInt(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
};
const fracText = (f) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
/* the common coin and the two counts */
const coinOf = ([a, b, c, d]) => lcmInt(b, d);
const countsOf = ([a, b, c, d]) => {
  const L = lcmInt(b, d);
  return { coin: L, dividend: a * (L / b), divisor: c * (L / d) };
};
/* the quotient, by the exchange: count ÷ count */
const quotientOf = (q) => {
  const k = countsOf(q);
  return frac(k.dividend, k.divisor);
};
/* the famous rule, stated independently — the audit proves they agree */
const invertMultiply = ([a, b, c, d]) => frac(a * d, b * c);
const coinName = (L) => {
  const NAMES = { 2: 'halves', 3: 'thirds', 4: 'fourths', 5: 'fifths', 6: 'sixths', 8: 'eighths', 10: 'tenths', 12: 'twelfths', 15: 'fifteenths', 20: 'twentieths', 24: 'twenty-fourths', 40: 'fortieths' };
  return NAMES[L] || `${L}ths`;
};
const divText = ([a, b, c, d]) => `${a}/${b} ÷ ${c}/${d}`;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The money-changer's stamp."  A division is
   posted; rule the two counts in the common coin, then the quotient.
   ------------------------------------------------------------------------- */
const CASES = [
  [2, 3, 3, 4],
  [3, 4, 1, 8],
  [3, 5, 1, 10],
  [5, 6, 2, 3],
  [1, 2, 3, 8],
  [4, 5, 2, 15],
];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const countsText = (i) => {
  const k = countsOf(CASES[i]);
  return `${k.dividend} and ${k.divisor} ${coinName(k.coin)}`;
};
const countsChips = (i) => {
  const [a, b, c, d] = CASES[i];
  const k = countsOf(CASES[i]);
  const name = coinName(k.coin);
  const cands = [
    countsText(i),
    `${a} and ${c} ${name}` /* the raw numerators, unexchanged */,
    `${k.divisor} and ${k.dividend} ${name}` /* swapped */,
    `${a * b} and ${c * d} ${name}` /* multiplied wrongly */,
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
const quotientTruth = (i) => fracText(quotientOf(CASES[i]));
const quotientChips = (i) => {
  const [a, b, c, d] = CASES[i];
  const cands = [
    fracText(frac(a * d, b * c)) /* the truth */,
    fracText(frac(b * c, a * d)) /* inverted the wrong one */,
    fracText(frac(a * c, b * d)) /* multiplied straight across */,
    fracText(frac(a + d, b + c)) /* added pieces */,
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
  const val = (t) => t.split('/').map(Number);
  return out.sort((x, y2) => {
    const [p, q] = val(x).length === 1 ? [Number(x), 1] : val(x);
    const [r, s] = val(y2).length === 1 ? [Number(y2), 1] : val(y2);
    return p * s - r * q;
  });
};
const calibChecks = (i, cPick, qPick) => {
  if (i == null) return [false, false];
  const cOK = cPick != null && cPick === countsText(i);
  const qOK = cOK && qPick != null && qPick === quotientTruth(i);
  return [cOK, qOK];
};
const closeness = (i, c, q) =>
  Math.round((100 * calibChecks(i, c, q).filter(Boolean).length) / 2);
const isCalibrated = (i, c, q) => calibChecks(i, c, q).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that division shrinks, that you
   multiply straight across, that the rule is magic.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The question division asks',
    body:
      'Division counts fits: 6 ÷ 2 asks how many 2s fit in 6. The strand’s opening ' +
      'bench counted how many 1/4s fit in 3. Now both numbers are fractions: how many ' +
      '3/4s fit in 2/3?',
    pose: [2, 3, 3, 4],
    coins: false,
    q: 'What kind of answer should 2/3 ÷ 3/4 have?',
    choices: [
      'A count of fits — possibly a partial fit, since 3/4 is bigger than 2/3',
      'A length in fourths',
      'No answer — fractions cannot divide fractions',
    ],
    answer: 0,
    feedback:
      'Still a count: how many times does 3/4 fit into 2/3? Since the divisor is the ' +
      'bigger amount, it fits LESS than once — the answer will be a fraction of one ' +
      'fit. To count it cleanly, both amounts first need to speak the same denomination.',
  },
  {
    title: 'The common coin',
    body:
      'Exchange both into the same coin. 2/3 is 8 twelfths; 3/4 is 9 twelfths. The ' +
      'coins are identical — only the counts differ.',
    pose: [2, 3, 3, 4],
    coins: true,
    q: 'In twelfths, 2/3 ÷ 3/4 becomes…',
    choices: [
      '8 ÷ 9 — a count divided by a count; the coin itself cancels out',
      '8 ÷ 12 — count over coin',
      '24 ÷ 36 — multiply everything',
    ],
    answer: 0,
    feedback:
      'Once both amounts are counted in twelfths, the twelfth itself is irrelevant — ' +
      'asking how many 9-coin piles fit in 8 coins is pure whole-number thinking. ' +
      '8 ÷ 9 = 8/9: the divisor fits 8/9 of one time. Exchange, count, divide.',
  },
  {
    title: 'A whole number of fits',
    body:
      'Some exchanges land evenly. 3/4 ÷ 1/8: in eighths, that is 6 coins measured by ' +
      '1 coin.',
    pose: [3, 4, 1, 8],
    coins: true,
    q: '3/4 ÷ 1/8 = …',
    choices: [
      '6 — six eighths, measured one eighth at a time',
      '3/32 — multiply straight across',
      '1/6 — smaller number first',
    ],
    answer: 0,
    feedback:
      'Six exactly: 3/4 exchanges to 6 eighths, and a 1-coin measure fits 6 times. ' +
      'Multiplying straight across (3/32) answers a DIFFERENT question — “what is 3/4 ' +
      'of 1/8?” — which is why division needs the exchange, not a shortcut mood.',
  },
  {
    title: 'The rule, unmasked',
    body:
      'Do the exchange with letters. a/b becomes ad coins of the (b·d)th kind; c/d ' +
      'becomes cb coins. So a/b ÷ c/d = ad/cb — read it again slowly.',
    pose: [2, 3, 3, 4],
    coins: true,
    q: 'ad/(cb) is exactly…',
    choices: [
      'a/b × d/c — invert-and-multiply is the exchange wearing a shortcut’s clothes',
      'a/b × c/d — multiply straight across',
      'A coincidence that fails for big numbers',
    ],
    answer: 0,
    feedback:
      'ad over cb is literally a/b times d/c. The famous rule is not magic and never ' +
      'was: inverting the divisor is what counting-in-a-common-coin does to the ' +
      'arithmetic. You may now use the shortcut with a clear conscience — you have ' +
      'seen its receipts.',
  },
  {
    title: 'Division that grows',
    body:
      'The opening bench killed the myth once for wholes; watch it die again for ' +
      'fractions. 1/2 ÷ 1/8: exchange into eighths — 4 coins measured by 1.',
    pose: [1, 2, 1, 8],
    coins: true,
    q: 'So 3/5 ÷ 1/10 = …',
    choices: [
      '6 — a tiny divisor fits many times; dividing by a small coin grows the count',
      '3/50 — division always shrinks',
      '1/6 — division always turns fractions over… somehow',
    ],
    answer: 0,
    feedback:
      '3/5 is 6 tenths; a 1-tenth measure fits 6 times. Dividing by something small ' +
      'yields something big — the unit-fraction bench proved it with wholes, and the ' +
      'exchange shows it survives when both numbers are fractions.',
  },
  {
    title: 'The money-changer’s stamp',
    body:
      'A division is posted. Rule the two counts in the common coin first, then rule ' +
      'the quotient. Both exact, or no stamp.',
    pose: [2, 3, 3, 4],
    coins: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function FractionDivisionLab() {
  const [cPick, setCPick] = useState(null);
  const [qPick, setQPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const pose = calib && kase != null ? CASES[kase] : current.pose;

  const checks = calib ? calibChecks(kase, cPick, qPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, cPick, qPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, cPick, qPick) : false;

  sceneRef.current = { pose, coins: !!current.coins, calib };

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
    const [a, b, c, d] = S.pose;
    const k = countsOf(S.pose);

    /* the two amounts, as rows of coins (or plain fraction cards pre-exchange) */
    const rowY1 = bandH + 84;
    const rowY2 = bandH + 190;
    const coinR = 13;
    const maxCount = Math.max(k.dividend, k.divisor);
    const gap = Math.min(34, (W - 220) / Math.max(maxCount, 1));

    const drawRow = (label, count, y, showCoins) => {
      ctx.fillStyle = BLUE;
      ctx.font = '700 14px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 26, y);
      if (!showCoins) return;
      for (let j = 0; j < count; j++) {
        const cx = 150 + j * gap;
        ctx.fillStyle = 'rgba(185,135,24,0.25)';
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(cx, y, coinR, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = INK_HEX;
        ctx.font = '600 8.5px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`1/${k.coin}`, cx, y);
      }
      ctx.fillStyle = GOLD;
      ctx.font = '700 13px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${count} coin${count === 1 ? '' : 's'}`, 150 + count * gap + 8, y);
    };

    drawRow(`${a}/${b}`, k.dividend, rowY1, S.coins);
    drawRow(`${c}/${d}`, k.divisor, rowY2, S.coins);
    if (S.coins) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 11.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`the common coin: ${coinName(k.coin)}`, 26, bandH + 30);
    }

    /* the fit verdict */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 15px ui-monospace, monospace';
    if (!S.calib && S.coins) {
      ctx.fillText(
        `${k.dividend} ÷ ${k.divisor} = ${fracText(quotientOf(S.pose))} — the divisor fits ${fracText(quotientOf(S.pose))} time${fracText(quotientOf(S.pose)) === '1' ? '' : 's'}`,
        W / 2,
        H - 56
      );
    } else if (S.calib) {
      ctx.fillText('exchange it yourself — then count', W / 2, H - 56);
    }

    /* ---- the readout band ---- */
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib ? `posted: ${divText(S.pose)}` : `${divText(S.pose)} — how many ${c}/${d}s fit in ${a}/${b}?`,
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
    setCPick(null);
    setQPick(null);
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
    setCPick(null);
    setQPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? divText(CASES[kase]) : ''}. Counts ${cPick ?? 'unruled'}; quotient ${qPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : current.coins
      ? `${divText(pose)}: in ${coinName(countsOf(pose).coin)}, ${countsOf(pose).dividend} measured by ${countsOf(pose).divisor}; the fit is ${fracText(quotientOf(pose))}.`
      : `${divText(pose)}: how many ${pose[2]}/${pose[3]}s fit in ${pose[0]}/${pose[1]}?`;

  return (
    <div className="fdlab">
      <header className="head">
        <h1>Fraction ÷ Fraction: The Common Coin</h1>
        <p className="lede">
          Division counts fits. Exchange both fractions into the <em>same coin</em> and
          the count is whole-number work — and the famous invert-and-multiply rule turns
          out to be the exchange itself, <span className="mono">ad/cb</span>, wearing a
          shortcut’s clothes.
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
                <span className="target-k">The posted division</span>
                <span className="target-word mono">{divText(CASES[kase])}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the two counts, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the quotient, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Counts ruling">
                  {countsChips(kase).map((c2) => (
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
                <div className="declare" role="group" aria-label="Quotient ruling">
                  {quotientChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (qPick === c2 ? ' active' : '')}
                      onClick={() => setQPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the exchange balances'
                    : checks[0]
                      ? 'counted — now divide the counts'
                      : 'find the common coin first'}
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
                  <span className="mono target-hint">the counts · then the quotient</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setCPick(null);
                  setQPick(null);
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
                  setCPick(null);
                  setQPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">exchange · count · divide — ad/cb, receipts included</span>{' '}
        &nbsp;·&nbsp; division counts fits, the common coin makes the count whole-number
        work, and invert-and-multiply is the exchange in disguise.
      </footer>

      <style jsx>{`
        .fdlab {
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
        :global(.fdlab) :focus-visible {
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
