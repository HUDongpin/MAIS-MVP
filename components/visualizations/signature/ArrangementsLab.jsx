'use client';

/* ============================================================================
   ArrangementsLab — an interactive "bench" for PERMUTATIONS & COMBINATIONS:
   the shrinking slots and the shuffle bill.  An ordered lineup fills slots
   from ONE shrinking pool — 4 choices, then 3, then 2 — so ordered counts
   multiply downward: P(4,2) = 4·3 = 12.  Stop caring about order and every
   unordered handful stands in that count once per shuffle — k! times — so
   you pay the bill: C(n,k) = P(n,k)/k!, an exact division that the bench
   ASSERTS.  (GRADES 9–12 · CCSS S-CP.B.9 — use permutations and
   combinations to compute probabilities of compound events and solve
   problems.)

   THE SIGNATURE CENTERPIECE — "THE SLOT ROW AND THE SHUFFLE BILL."  A row
   of gold slot boxes, each stamped with its shrinking choice count — 4,
   then 3 — multiplying into the ordered total.  Below it, the carmine
   shuffle bill: ÷ 2! with the reason printed (AB and BA are the same
   handful), and the exact unordered count after payment.  No tree grows
   anywhere: the tree bench multiplies stages of DIFFERENT choices; these
   slots drain one shared pool.

   THE MODEL — exact integer arithmetic throughout:
     · permOf(n, k) multiplies the shrinking counts n·(n−1)·…; factOf(k)
       is the shuffle count; combOf(n, k) divides and THROWS if the
       division is not exact — which the mathematics guarantees it is,
       and the audit verifies by brute-force ENUMERATION: it generates
       every actual arrangement and every actual handful for all posted
       (n, k) and counts them one by one.
     · the symmetry combOf(n, k) = combOf(n, n−k) is proven by the audit
       across the range — choosing k to take is choosing n−k to leave.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No tree, no branching, no path words — the tree bench owns compound
       events built from independent stages; this bench fills slots from
       one shrinking pool, drawn as boxes in a row, never as branches.
     · No probability is computed — the chance benches own dividing
       favorable by total; this bench builds the COUNTS those benches
       divide.  One citation, then silence.
     · No crop, no frame — the conditional bench owns re-framing.
     · No factorial mysticism: k! is never "just notation" here — it is
       the literal number of shuffles of a handful, and the audit counts
       the shuffles.
   COLORS: one accent. CARMINE = the shuffle bill and the unordered count
   (the object). GOLD = the slot row (the tool). BLUE = the quiet pool.
   GREEN only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a pool size n and a handful size k are posted.  Rule
   the ordered count P(n,k) first (multiply the shrinking slots), then rule
   the unordered count C(n,k) (pay the k! bill).  Truths are derived from
   permOf/combOf at answer time; the meter is quantized to {0, 50, 100};
   the unordered count earns nothing until the ordered count stands.  The
   stamp provably cannot fire falsely.
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

/* ordered: fill k slots from a pool of n, no reuse — counts shrink */
const permOf = (n, k) => {
  if (k > n || k < 0) throw new Error('the pool cannot fill that many slots');
  let acc = 1;
  for (let i = 0; i < k; i++) acc *= n - i;
  return acc;
};
/* the shuffle count of a handful of k */
const factOf = (k) => {
  let acc = 1;
  for (let i = 2; i <= k; i++) acc *= i;
  return acc;
};
/* unordered: pay the bill — and the division MUST be exact */
const combOf = (n, k) => {
  const p = permOf(n, k);
  const f = factOf(k);
  if (p % f !== 0) throw new Error('the shuffle bill always divides exactly — anything else is a bug');
  return p / f;
};
/* the shrinking counts themselves, for the slot row */
const slotsOf = (n, k) => Array.from({ length: k }, (_, i) => n - i);

/* the pool: letters name the members */
const POOL = ['A', 'B', 'C', 'D', 'E', 'F'];

/* ---------------------------------------------------------------------------
   CALIBRATION — posted (n, k); truths derived, never stored.
   ------------------------------------------------------------------------- */
const CASES = [
  { n: 4, k: 2 },
  { n: 5, k: 3 },
  { n: 5, k: 2 },
  { n: 4, k: 3 },
  { n: 6, k: 2 },
  { n: 5, k: 4 },
];
const PERM_CHIPS = ['12', '20', '24', '30', '60', '120'];
const COMB_CHIPS = ['4', '5', '6', '10', '15'];

const labelOf = (i) => `a pool of ${CASES[i].n}, a handful of ${CASES[i].k}`;
const permTruth = (i) => String(permOf(CASES[i].n, CASES[i].k));
const combTruth = (i) => String(combOf(CASES[i].n, CASES[i].k));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, pPick, cPick) => {
  if (i == null) return [false, false];
  const c1 = pPick === permTruth(i);
  const c2 = c1 && cPick === combTruth(i);
  return [c1, c2];
};
const closeness = (i, pPick, cPick) => {
  const [c1, c2] = calibChecks(i, pPick, cPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, pPick, cPick) => calibChecks(i, pPick, cPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Slots drain the pool',
    body:
      'Four runners — A, B, C, D — and a full finishing order to fill. First ' +
      'slot: 4 choices. Second: only 3 remain. Then 2, then 1.',
    n: 4,
    k: 4,
    showBill: false,
    q: 'How many complete finishing orders exist?',
    choices: [
      '4·3·2·1 = 24 — each slot multiplies what the shrinking pool still offers',
      '4 + 3 + 2 + 1 = 10',
      '4⁴ = 256 — four choices, four times',
    ],
    answer: 0,
    feedback:
      'The counts multiply because every partial lineup extends by every ' +
      'remaining runner — and they SHRINK because a runner used is a runner ' +
      'gone. 4⁴ would be the count if runners could finish twice — a different ' +
      'game with a different answer. The honest total is 4·3·2·1 = 24, ' +
      'written 4! and pronounced with respect.',
    note:
      'The tree bench multiplies too — but its stages draw from DIFFERENT ' +
      'pools (a flip stage, then an outfit stage). These slots drain ONE pool, ' +
      'which is exactly ' +
      'why the factors shrink instead of repeating. Two multiplication stories, ' +
      'two benches, one library.',
  },
  {
    title: 'Stop early',
    body:
      'Same four runners, but only the podium matters: first and second. Fill ' +
      'two slots and stop.',
    n: 4,
    k: 2,
    showBill: false,
    q: 'How many first-second results?',
    choices: [
      '4·3 = 12 — two slots, shrinking once, and the rest of the order is never asked',
      '24 — you must always finish the lineup',
      '8 — four choices plus four choices',
    ],
    answer: 0,
    feedback:
      'Stop multiplying when the question stops caring: 4 choices for gold, 3 ' +
      'for silver, 12 ordered outcomes. This is the permutation count P(4, 2) ' +
      '— a lineup cut short, not a different idea. Every ordered-count problem ' +
      'reduces to two questions: how many slots, and from what pool.',
    note:
      'Check the twelve by hand once in your life: AB, AC, AD, BA, BC, BD, CA, ' +
      'CB, CD, DA, DB, DC. Twelve, no duplicates, none missing — the formula ' +
      'is a census you could have taken yourself — and that is all a counting ' +
      'formula ever is.',
  },
  {
    title: 'The price of not caring',
    body:
      'New question: not WHO beat WHOM — just WHICH TWO advance. AB and BA are ' +
      'now the same handful. The bill appears.',
    n: 4,
    k: 2,
    showBill: true,
    q: 'How many two-runner handfuls?',
    choices: [
      '12 ÷ 2! = 6 — every handful stood in the ordered count twice, once per shuffle',
      'Still 12 — counts never shrink',
      '6! = 720',
    ],
    answer: 0,
    feedback:
      'The ordered census counted every pair twice — AB and BA — because a ' +
      'handful of 2 shuffles 2! = 2 ways. Not caring about order is not free: ' +
      'you pay by dividing out the shuffles. 12/2 = 6 handfuls, and the ' +
      'division is exact BECAUSE each handful was overcounted the same number ' +
      'of times.',
    note:
      'That exactness is the deep fact: the ordered pile sorts into equal ' +
      'stacks of k!, one stack per handful. Division works because the stacks ' +
      'are equal — combinatorics never truncates, and a remainder would mean ' +
      'the count itself was wrong.',
  },
  {
    title: 'A bigger bill',
    body:
      'Five books, choose 3 for a shelf where order is ignored. Ordered: ' +
      '5·4·3 = 60. Every 3-handful shuffles 3! = 6 ways.',
    n: 5,
    k: 3,
    showBill: true,
    q: 'C(5, 3) = ?',
    choices: [
      '60 ÷ 6 = 10 — sixty ordered stacks collapse into ten handfuls of equal families',
      '60 − 6 = 54',
      '60 ÷ 3 = 20 — divide by the handful size',
    ],
    answer: 0,
    feedback:
      'The bill scales as a factorial, not as k: a handful of 3 shuffles 3! = ' +
      '6 ways (ABC, ACB, BAC, BCA, CAB, CBA — count them once), so 60 ordered ' +
      'lineups collapse to exactly 10 handfuls. Dividing by 3 instead of 3! is ' +
      'the classic slip; the shuffle count is the whole point of the symbol, ' +
      'and it pays for itself the first time k passes two.',
    note:
      'The bench never treats k! as notation: it is the number of ways YOUR ' +
      'CHOSEN handful could line up, and you can list those ways on one hand ' +
      'for k = 3. Small cases keep the law honest, and honest laws survive the ' +
      'big cases you cannot list.',
  },
  {
    title: 'Choosing is leaving',
    body:
      'The dial runs k across the pool of 5. Watch both counts: ordered ' +
      'P(5,k) climbs; unordered C(5,k) rises then FALLS: 5, 10, 10, 5, 1.',
    n: 5,
    k: 2,
    showBill: true,
    dial: true,
    q: 'Why does C(5,2) = C(5,3), exactly?',
    choices: [
      'Choosing 2 to take IS choosing 3 to leave — every take-handful pairs with exactly one leave-handful',
      'Coincidence of the number 5',
      'Because 2 + 3 = 5 makes the formulas equal by luck',
    ],
    answer: 0,
    feedback:
      'Every way of taking 2 books determines exactly which 3 stay, and vice ' +
      'versa — a perfect pairing between take-handfuls and leave-handfuls, so ' +
      'the counts must match: both are 10. The symmetry C(n,k) = C(n,n−k) is ' +
      'not in the algebra first; it is in the CHOOSING, and the algebra merely ' +
      'agrees.',
    note:
      'The ordered counts have no such symmetry — P(5,2) = 20 while P(5,3) = ' +
      '60 — because order remembers WHICH slots were filled. Only the handful ' +
      'world enjoys the take-leave mirror. Forgetting order is what buys the ' +
      'symmetry.',
  },
  {
    title: 'The counter’s stamp',
    body:
      'A pool and a handful size are posted, the slot row standing empty. Rule ' +
      'the ordered count first — multiply the shrinking slots — then rule the ' +
      'unordered count: pay the k! bill, exactly. Both exact, or no stamp; ' +
      'the meter reports only how much of the ruling stands.',
    n: 4,
    k: 2,
    showBill: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ArrangementsLab() {
  const [kDial, setKDial] = useState(2);
  const [pPick, setPPick] = useState(null);
  const [cPick, setCPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const n = calib && kase != null ? CASES[kase].n : current.n;
  const k = calib && kase != null ? CASES[kase].k : current.dial ? kDial : current.k;
  const perm = permOf(n, k);
  const fact = factOf(k);
  const comb = combOf(n, k);
  const showBill = calib || !!current.showBill;

  const checks = calib ? calibChecks(kase, pPick, cPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, pPick, cPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, pPick, cPick) : false;

  const bandLabel = calib ? `posted: ${kase != null ? labelOf(kase) : ''}` : `a pool of ${n} · ${k} slot${k === 1 ? '' : 's'}`;
  sceneRef.current = { n, k, perm, fact, comb, showBill, calib, bandLabel };

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

    /* the pool */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SLATE;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the pool', 22, bandH + 8);
    for (let i = 0; i < S.n; i++) {
      ctx.fillStyle = BLUE;
      ctx.beginPath();
      ctx.arc(96 + i * 34, bandH + 16, 12, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#fbfbf8';
      ctx.font = '700 12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(POOL[i], 96 + i * 34, bandH + 17);
    }

    /* THE SLOT ROW */
    const slots = slotsOf(S.n, S.k);
    const slotW = Math.min(96, (W - 120) / Math.max(S.k, 1));
    const x0 = (W - S.k * slotW) / 2;
    const ySlot = bandH + 80;
    for (let i = 0; i < S.k; i++) {
      const x = x0 + i * slotW;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.2;
      ctx.strokeRect(x + 6, ySlot, slotW - 12, 56);
      ctx.fillStyle = INK_HEX;
      ctx.font = '700 18px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(slots[i]), x + slotW / 2, ySlot + 24);
      ctx.fillStyle = SLATE;
      ctx.font = '600 10px ui-monospace, monospace';
      ctx.fillText(`slot ${i + 1}`, x + slotW / 2, ySlot + 44);
      if (i < S.k - 1) {
        ctx.fillStyle = SLATE;
        ctx.font = '700 14px ui-monospace, monospace';
        ctx.fillText('×', x + slotW - 2, ySlot + 28);
      }
    }
    ctx.fillStyle = GOLD;
    ctx.font = '700 13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      S.calib ? `ordered: ${slots.join(' · ')} = ?` : `ordered: ${slots.join(' · ')} = ${S.perm}`,
      W / 2,
      ySlot + 70
    );

    /* THE SHUFFLE BILL */
    if (S.showBill) {
      const yBill = ySlot + 108;
      ctx.fillStyle = CARMINE;
      ctx.font = '700 13px ui-monospace, monospace';
      ctx.fillText(
        S.calib
          ? `the bill: ÷ ${S.k}! = ${S.fact} → unordered ?`
          : `the bill: ÷ ${S.k}! = ${S.fact} → unordered ${S.comb}`,
        W / 2,
        yBill
      );
      ctx.fillStyle = SLATE;
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.fillText('every handful stood in the ordered count once per shuffle', W / 2, yBill + 22);
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
    setKDial(2);
    setPPick(null);
    setCPick(null);
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
    setKDial(2);
    setPPick(null);
    setCPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Ordered ${pPick ?? 'unruled'}; unordered ${cPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `A pool of ${n}, ${k} slots: ordered ${perm}${showBill ? `; the ${k}-factorial bill is ${fact}, unordered ${comb}` : ''}.`;

  return (
    <div className="arlab">
      <header className="head">
        <h1>Arrangements: The Price of Not Caring</h1>
        <p className="lede">
          Ordered counts multiply down a shrinking pool — 4, then 3, then 2. Stop
          caring about order and every handful stands in that count once per
          shuffle, so you pay the bill: <em>divide by k!, exactly</em>. The
          division always comes out even, and this bench shows why.
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
                  <span className="dial-k">the handful size k</span>
                  <span className="dial-v mono">{kDial}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={kDial}
                  onChange={(e) => setKDial(Number(e.target.value))}
                  aria-label={`Handful, ${kDial}`}
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
                <span className="target-k">The posted pool</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the ordered count</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the bill, paid</li>
                </ol>
                <div className="declare" role="group" aria-label="Ordered ruling">
                  {PERM_CHIPS.map((c2) => (
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
                <div className="declare" role="group" aria-label="Unordered ruling">
                  {COMB_CHIPS.map((c2) => (
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
                    ? 'both ruled, exactly — the census closes'
                    : checks[0]
                      ? 'ordered ruled — now divide by k!, exactly'
                      : 'multiply the shrinking slots first'}
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
                  <span className="mono target-hint">the ordered count · then the bill</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setPPick(null);
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
                  setPPick(null);
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
        <span className="mono">ordered: slots shrink and multiply · unordered: ÷ k!, exactly</span>{' '}
        &nbsp;·&nbsp; not caring has a price, the price is a factorial, and the
        division always comes out even.
      </footer>

      <style jsx>{`
        .arlab {
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
        :global(.arlab) :focus-visible {
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
