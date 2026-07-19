'use client';

/* ============================================================================
   RationalExponentLab — an interactive "bench" for RATIONAL EXPONENTS:
   b^(1/2) = √b is FORCED, not defined.  Name the unknown y, apply the one law
   b^m · b^n = b^(m+n), and the algebra convicts a single candidate — the
   meaning of every fractional exponent is decided by consistency, never by
   decree.  (GRADES 9–12 · CCSS HSN-RN.A.1 — explain how the definition of
   rational exponents follows from extending the properties of integer
   exponents; HSN-RN.A.2 — rewrite expressions involving radicals and
   rational exponents.)

   THE SIGNATURE CENTERPIECE — "THE FORCING COURT."  A column of blue
   candidates stands trial for y = b^(1/q).  The judge is the law itself:
   y appears q times, so y^q must equal b.  Every candidate's q-fold product
   is computed in the open; exactly one lands on b and burns carmine.  When
   the exponent carries a numerator, the gold CLIMB card lifts the verdict:
   b^(p/q) = (b^(1/q))^p — and the two routes (root first, power first)
   provably agree.

   THE MODEL — exact integer arithmetic throughout:
     · bases are chosen so every posted exponent lands on an integer:
       64^(1/6)=2, 64^(2/3)=16, 16^(3/4)=8, 27^(2/3)=9, 32^(3/5)=8, 16^(3/2)=64.
     · rootInt(b, q) finds the integer r with r^q = b by bounded search and
       THROWS if none exists — no radical is ever evaluated by float.
     · powInt is repeated multiplication; ratPow(b,p,q) = powInt(rootInt(b,q),p).
     · the audit proves route-independence: (b^(1/q))^p = (b^p)^(1/q), exactly.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No factor-counting device, no tile, no coupled counting rows — the
       integer-exponent bench (8.EE.A.1) owns "an exponent is a count," and
       this lab OPENS at the exact spot that device breaks: half a copy of a
       factor does not exist.  The break is quoted; the device stays home.
     · No extraction machinery, no squares-to-sides pictures — the roots
       bench owns HOW a root is dug out of a number.  This bench proves only
       WHICH number the exponent must be, then cites the roots bench.
     · No graphs, no smooth growth, no continuous x — the exponential bench
       owns the function; here exponents are exact fractions on a ladder of
       discrete rungs.
     · No logarithms in any costume — that bench inverts; this one forces.
   COLORS: one accent. CARMINE = the convicted value (the object). GOLD =
   the law card and the climb (the tool). BLUE = quiet candidates. GREEN
   only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — a power b^(p/q) is posted.  Rule the root b^(1/q) first
   (the court's verdict), then rule the climb b^(p/q) = (root)^p.  Truths are
   derived from rootInt/powInt at answer time; the meter is quantized to
   {0, 50, 100}; the climb earns nothing until the root stands.  The stamp
   provably cannot fire falsely.
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

/* the integer q-th root, by bounded search — throws rather than floats */
const rootInt = (b, q) => {
  for (let r = 1; r <= b; r++) {
    let acc = 1;
    for (let i = 0; i < q; i++) acc *= r;
    if (acc === b) return r;
    if (acc > b) break;
  }
  throw new Error('no integer root — this bench only posts exact cases');
};
const powInt = (r, p) => {
  let acc = 1;
  for (let i = 0; i < p; i++) acc *= r;
  return acc;
};
/* b^(p/q), root first then climb */
const ratPow = (b, p, q) => powInt(rootInt(b, q), p);
/* the court's docket: the true root and its neighbors */
const candidatesOf = (b, q) => {
  const r = rootInt(b, q);
  return [r - 2, r - 1, r, r + 1].filter((v) => v >= 1);
};

/* the lesson's posted scenes */
const SCENES = {
  half: { mode: 'court', label: '64^(1/2) on trial', b: 64, p: 1, q: 2 },
  third: { mode: 'court', label: '64^(1/3) on trial', b: 64, p: 1, q: 3 },
  twothirds: { mode: 'court', label: '64^(2/3) on trial', b: 64, p: 2, q: 3 },
  ladder: { mode: 'ladder', label: 'the ladder of sixths: 64^(k/6)', b: 64, p: 1, q: 6, dial: true },
};

/* ---------------------------------------------------------------------------
   CALIBRATION — posted powers; truths derived, never stored.
   ------------------------------------------------------------------------- */
const CASES = [
  { b: 64, p: 2, q: 3 },
  { b: 64, p: 5, q: 6 },
  { b: 16, p: 3, q: 4 },
  { b: 27, p: 2, q: 3 },
  { b: 32, p: 3, q: 5 },
  { b: 16, p: 3, q: 2 },
  { b: 64, p: 1, q: 2 },
];
const ROOT_CHIPS = ['2', '3', '4', '8'];
const VAL_CHIPS = ['8', '9', '16', '32', '64'];

const labelOf = (i) => `${CASES[i].b}^(${CASES[i].p}/${CASES[i].q})`;
const rootTruth = (i) => String(rootInt(CASES[i].b, CASES[i].q));
const valTruth = (i) => String(ratPow(CASES[i].b, CASES[i].p, CASES[i].q));

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, rPick, vPick) => {
  if (i == null) return [false, false];
  const c1 = rPick === rootTruth(i);
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
    title: 'Where counting fails',
    body:
      'On the integer bench, an exponent is a COUNT of copies of the base. ' +
      '64^(1/2) asks for half a copy — and half a copy of a factor does not ' +
      'exist. The old picture breaks here, cleanly and honestly, and no amount ' +
      'of squinting repairs it. Something better than counting has to take over.',
    scene: 'half',
    q: 'So what should 64^(1/2) even mean?',
    choices: [
      'Whatever keeps the laws true — name it y, and let b^m · b^n = b^(m+n) decide',
      'Half of 64, so 32',
      'Nothing — fractions simply are not allowed up there',
    ],
    answer: 0,
    feedback:
      'Counting breaks at one-half, but the LAWS never mentioned counting. ' +
      'b^m · b^n = b^(m+n) is a statement about exponents, whole or not — and it ' +
      'turns out to be strong enough to decide the answer entirely on its own. ' +
      'The next step lets the law do exactly that, in public.',
    note:
      'This move — keep the old laws, extend the old objects — is how every number ' +
      'system you own was built. Zero and negative exponents were forced the same ' +
      'way on the integer bench; today the same pressure builds the fractions. ' +
      'Mathematics grows by refusing to break its own promises.',
  },
  {
    title: 'The court convenes',
    body:
      'Let y stand for 64^(1/2). The law says y · y = 64^(1/2) · 64^(1/2) = ' +
      '64^(1/2 + 1/2) = 64^1. Nothing was assumed about y except that the old ' +
      'law still applies to it. Four candidates stand below; the law judges.',
    scene: 'half',
    q: 'Which candidate survives y · y = 64?',
    choices: [
      '8 — only 8 · 8 lands on 64; the court seats positives, so the verdict is single',
      'Both 8 and −8 — either squares to 64',
      '32 — half of 64',
    ],
    answer: 0,
    feedback:
      'y² = 64 alone would admit ±8, but the bench keeps b^x positive for b > 0: ' +
      'otherwise chained laws like (64^(1/4))² = 64^(1/2) would contradict ' +
      'themselves mid-chain. The verdict is exactly 8 — and notice it was never a ' +
      'choice anyone made; it was the only value the law would tolerate.',
    note:
      '√64 was not DEFINED to equal 64^(1/2); it was CONVICTED. One line of ' +
      'algebra, no new rules invented. That is what "the definition follows from ' +
      'the properties" actually means.',
  },
  {
    title: 'Three witnesses',
    body:
      'Now 64^(1/3). The same law, called three times on the same unknown: ' +
      'y · y · y = 64^(1/3 + 1/3 + 1/3) = 64^1. The docket reads 2, 3, 4, 5, ' +
      'and each candidate must survive a threefold product.',
    scene: 'third',
    q: 'The verdict on 64^(1/3)?',
    choices: [
      '4 — because 4 · 4 · 4 = 64, and no other candidate reaches it',
      'About 21 — a third of 64',
      '8 again — roots do not care about q',
    ],
    answer: 0,
    feedback:
      'A q-th part of an exponent summons q witnesses: y appears q times, so ' +
      'y^q = 64, and only 4 survives the cube. HOW roots are dug out of stubborn ' +
      'numbers is the roots bench’s craft — this bench only proves WHICH number ' +
      'the exponent must be.',
    note:
      'Watch the failed candidates work: 3 · 3 · 3 = 27 falls short, 5 · 5 · 5 = ' +
      '125 overshoots. The court is not ceremony — near misses are how you know ' +
      'the verdict is tight on both sides, squeezed between a shortfall below and ' +
      'an overshoot above with no room to wander.',
  },
  {
    title: 'Two routes, one verdict',
    body:
      'A numerator joins: 64^(2/3). Two readings compete. Root first, then ' +
      'climb: (64^(1/3))². Or square first, then root: (64²)^(1/3) = 4096^(1/3). ' +
      'If they disagreed, the notation itself would be broken.',
    scene: 'twothirds',
    q: 'Do the two routes agree?',
    choices: [
      'Yes — (64^(1/3))² = 4² = 16 and 4096^(1/3) = 16; the law (b^m)^n = b^(mn) forces routes to agree',
      'No — root-first gives 16, square-first gives 32',
      'Only for even numerators',
    ],
    answer: 0,
    feedback:
      'Route-independence is not luck: 2/3 = (1/3) · 2 = 2 · (1/3), and the law ' +
      '(b^m)^n = b^(mn) does not care which factor goes first. Both roads reach ' +
      '16 — so b^(p/q) is well defined before anyone draws a radical sign.',
    note:
      'This is the working form of N-RN.A.2: pick whichever route keeps the ' +
      'numbers small. Root first tames 64 down to 4 before squaring; square ' +
      'first would send you through 4096. Same verdict, cheaper trial — fluency ' +
      'here is just knowing which door of the courthouse to walk in.',
  },
  {
    title: 'The ladder of sixths',
    body:
      'Every sixth of the way from 64^0 to 64^1, the exponent law posts a rung: ' +
      '64^(k/6) = 2^k. Slide k and read the stations — all seven are exact ' +
      'integers, convicted one by one exactly as before.',
    scene: 'ladder',
    q: 'Slide k across the sixths. What stays constant between neighboring rungs?',
    choices: [
      'The RATIO — ×2 every sixth; equal steps of exponent multiply by equal factors',
      'The DIFFERENCE — each rung adds the same amount',
      'Nothing — fractional powers land wherever they please',
    ],
    answer: 0,
    feedback:
      '64^(1/6) = 2 anchors the ladder, and each further sixth multiplies by 2 ' +
      'again: 1, 2, 4, 8, 16, 32, 64. Rational exponents fill the gaps between ' +
      'integer powers so the multiplicative rhythm never stutters — that is their ' +
      'entire job.',
    note:
      'The smooth graph drawn through these stations belongs to the exponential ' +
      'bench. This ladder posts only the exact rational rungs — every value here ' +
      'is an integer you can check by hand, which is precisely why base 64 sits ' +
      'in the frame: its sixth root is whole.',
  },
  {
    title: 'The judge’s stamp',
    body:
      'A power b^(p/q) is posted, with its docket of candidates. Rule the root ' +
      'b^(1/q) first — the court’s verdict, the y whose q-fold product lands on ' +
      'b — then rule the climb b^(p/q) = (root)^p. Both exact, or no stamp; the ' +
      'meter reports only how much of the ruling stands.',
    scene: 'half',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function RationalExponentLab() {
  const [kDial, setKDial] = useState(3);
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
  const sc = calib && kase != null ? { mode: 'court', ...CASES[kase] } : SCENES[current.scene];
  const b = sc.b;
  const p = sc.p;
  const q = sc.q;
  const root = rootInt(b, q);
  const val = ratPow(b, p, q);

  const checks = calib ? calibChecks(kase, rPick, vPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, rPick, vPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, rPick, vPick) : false;

  const bandLabel = calib ? `posted: ${kase != null ? labelOf(kase) : ''}` : sc.label;
  sceneRef.current = { mode: sc.mode, b, p, q, root, val, kDial, calib, bandLabel };

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

    if (S.mode === 'court') {
      /* the law card */
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = SLATE;
      ctx.font = 'italic 600 11.5px system-ui, sans-serif';
      ctx.fillText('the law, presiding', 22, bandH + 8);
      ctx.fillStyle = GOLD;
      ctx.font = '600 12px ui-monospace, monospace';
      ctx.fillText(`y = ${S.b}^(1/${S.q})  →  y^${S.q} = ${S.b}`, 22, bandH + 26);

      /* the docket: candidates and their q-fold products */
      const cands = candidatesOf(S.b, S.q);
      const rowY0 = bandH + 66;
      const rowH = Math.min(46, (H2 - rowY0 - (S.p > 1 ? 96 : 40)) / cands.length);
      cands.forEach((v, i) => {
        const y = rowY0 + i * rowH;
        const hit = v === S.root;
        const prod = powInt(v, S.q);
        ctx.fillStyle = hit ? CARMINE : BLUE;
        ctx.font = (hit ? '700' : '600') + ' 12.5px ui-monospace, monospace';
        const terms = Array(S.q).fill(String(v)).join(' · ');
        ctx.fillText(
          S.calib ? `y = ${v} :  ${terms} = ?` : `y = ${v} :  ${terms} = ${prod}  ${hit ? '✓ the verdict' : '✗'}`,
          40,
          y
        );
        ctx.beginPath();
        ctx.arc(28, y + 6, hit ? 4 : 2.6, 0, 2 * Math.PI);
        ctx.fill();
      });

      /* the climb card, when the exponent carries a numerator */
      if (S.p > 1) {
        const y = rowY0 + cands.length * rowH + 18;
        ctx.fillStyle = SLATE;
        ctx.font = 'italic 600 11.5px system-ui, sans-serif';
        ctx.fillText('the climb', 22, y);
        ctx.fillStyle = GOLD;
        ctx.font = '600 12px ui-monospace, monospace';
        ctx.fillText(
          S.calib
            ? `${S.b}^(${S.p}/${S.q}) = (${S.b}^(1/${S.q}))^${S.p} = ?`
            : `${S.b}^(${S.p}/${S.q}) = (${S.root})^${S.p} = ${S.val}`,
          22,
          y + 18
        );
      }
    } else {
      /* the ladder of sixths: stations at k/6, values 2^k */
      const padL = 56;
      const padR = 30;
      const baseY = H2 - 64;
      const xOf = (k) => padL + (k / 6) * (W - padL - padR);
      ctx.strokeStyle = SLATE;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(xOf(0), baseY + 0.5);
      ctx.lineTo(xOf(6), baseY + 0.5);
      ctx.stroke();
      const anchor = rootInt(S.b, 6);
      for (let k = 0; k <= 6; k++) {
        const hot = k === S.kDial;
        const v = powInt(anchor, k);
        ctx.fillStyle = hot ? CARMINE : BLUE;
        ctx.beginPath();
        ctx.arc(xOf(k), baseY, hot ? 6 : 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.font = (hot ? '700' : '600') + ' 12px ui-monospace, monospace';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(v), xOf(k), baseY - 14);
        ctx.textBaseline = 'top';
        ctx.fillStyle = SLATE;
        ctx.font = '600 10.5px ui-monospace, monospace';
        ctx.fillText(k === 0 ? '64^0' : k === 6 ? '64^1' : `64^(${k}/6)`, xOf(k), baseY + 12);
        if (k < 6) {
          ctx.fillStyle = GOLD;
          ctx.font = '600 11px ui-monospace, monospace';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`×${anchor}`, (xOf(k) + xOf(k + 1)) / 2, baseY - 34);
        }
      }
      /* the reading card */
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = SLATE;
      ctx.font = 'italic 600 11.5px system-ui, sans-serif';
      ctx.fillText('the rung in hand', 22, bandH + 8);
      ctx.fillStyle = CARMINE;
      ctx.font = '600 12px ui-monospace, monospace';
      ctx.fillText(`64^(${S.kDial}/6) = 2^${S.kDial} = ${powInt(2, S.kDial)}`, 22, bandH + 26);
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
  }, [step]);

  /* every step opens on the scene its words describe */
  useEffect(() => {
    setKDial(3);
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
    setKDial(3);
    setRPick(null);
    setVPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}. Root ${rPick ?? 'unruled'}; value ${vPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : sc.mode === 'ladder'
      ? `The ladder of sixths: 64 to the ${kDial}/6 is ${powInt(2, kDial)}.`
      : `${sc.label}: the law forces y to the ${q} equals ${b}; the verdict is ${root}${p > 1 ? `, and the climb reaches ${val}` : ''}.`;

  return (
    <div className="relab">
      <header className="head">
        <h1>Rational Exponents: The Forcing Court</h1>
        <p className="lede">
          Nobody gets to <em>define</em> 64^(1/2). Name it y, apply the one law the
          integer bench already proved — b^m · b^n = b^(m+n) — and the algebra
          convicts a single candidate. Fractional exponents mean what consistency
          forces them to mean, and nothing else.
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

          {sc.dial && !calib && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the rung k (sixths)</span>
                  <span className="dial-v mono">{kDial}/6</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={kDial}
                  onChange={(e) => setKDial(Number(e.target.value))}
                  aria-label={`Rung, ${kDial} sixths`}
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
                <span className="target-k">The posted power</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the root, convicted</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the climb, ruled</li>
                </ol>
                <div className="declare" role="group" aria-label="Root ruling">
                  {ROOT_CHIPS.map((c2) => (
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
                    ? 'both ruled, exactly — the court adjourns'
                    : checks[0]
                      ? 'root convicted — now climb it p times'
                      : 'try the docket: which y has y^q = b?'}
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
                  <span className="mono target-hint">the root · then the climb</span>
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
        <span className="mono">y^q = b convicts the root · (b^(1/q))^p climbs it</span>{' '}
        &nbsp;·&nbsp; fractional exponents are not decreed — they are forced, one
        candidate at a time, by laws the integer bench already proved.
      </footer>

      <style jsx>{`
        .relab {
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
        :global(.relab) :focus-visible {
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
