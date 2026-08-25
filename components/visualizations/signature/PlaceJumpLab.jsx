'use client';

/* ============================================================================
   PlaceJumpLab — an interactive "bench" for TEN MORE / TEN LESS and ONE
   HUNDRED MORE / LESS: a jump of 10 or 100 moves exactly ONE place —

        247  +10 → 257   (only the TENS digit ticks: 4 → 5)
        247 +100 → 347   (only the HUNDREDS digit ticks: 2 → 3)

   …except at the nines, where the jump CASCADES:

        290  +10 → 300   (9 tens fill a hundred: the tens roll to 0 AND the
                          hundreds tick up — two digits change at once)

   That single idea — a ten-jump lands in the tens column, a hundred-jump in
   the hundreds, and only a full column forces a carry into the next — is why a
   child can add 10 or 100 in their head, and why the 9s are the one place to
   slow down.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Grades 1–2 —
   CCSS 1.NBT.C.5 ("given a two-digit number, mentally find 10 more or 10 less,
   without having to count") and 2.NBT.B.8 ("mentally add 10 or 100 to, and
   subtract 10 or 100 from, a given number 100–900").

   ---------------------------------------------------------------------------
   HOW THIS LAB STAYS DISTINCT  (the library's hard rule)
   ---------------------------------------------------------------------------
   The place-value corner is crowded; the seam is the JUMP as an OPERATION —
   which column moves, and when it cascades:
     • NumberLab — owns what place value IS (a static number as columns). It
       does not move.
     • TwoDigitNumberLab — owns BUNDLING ones into a ten (where 10 comes from).
     • PlaceValueStrategiesLab — owns adding TWO numbers with full regrouping.
     • HundredChartLab — owns +10 as a COUNTING leap down a chart's rows (a
       Kindergarten sequence, capped at 120). Its +10 is a MOVE ON A CHART;
       this lab's +10 is a CHANGE IN A DIGIT.

   So this lab owns exactly one thing no sibling owns: the ±10 / ±100 jump seen
   at the DIGIT level — usually one column ticks, occasionally a nine cascades.
   The carmine math object is the digit(s) that CHANGE. audit-placejump.mjs
   greps this source to keep the counting-chart and bundling pictures out.

   EXACT INTEGER MATH, 0–999. Every jump is an integer add with a clamp, so a
   child never meets a float. The CALIBRATED stamp is an integer identity.

   The block between MODEL:START and MODEL:END is pure, React-free JavaScript;
   audit-placejump.mjs slices it out and evaluates it, so the audit tests the
   code that ships.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==== MODEL:START — pure math. No React, no pixels, no DOM. =============== */

const LO = 0, HI = 999;

/* the three place columns, ones→hundreds, and the jumps the lab offers */
const PLACES = ['ones', 'tens', 'hundreds'];
const PLACE_MULT = [1, 10, 100];
const JUMPS = [
  { delta: 100, label: '+100' },
  { delta: 10, label: '+10' },
  { delta: -10, label: '−10' },
  { delta: -100, label: '−100' },
];

/* the digits of n, ones-first: 247 → [7, 4, 2] */
const digitsOf = (n) => [n % 10, Math.floor(n / 10) % 10, Math.floor(n / 100) % 10];

/* a jump clamps to 0–999 so the columns never show a negative or 4-digit number.
   A clamped jump is one that hit the wall — the lab flags it rather than lying. */
function jump(n, delta) {
  const raw = n + delta;
  const clamped = Math.max(LO, Math.min(HI, raw));
  return { from: n, to: clamped, delta, blocked: raw !== clamped };
}

/* WHICH COLUMNS CHANGED between two numbers — the heart of the lesson. Usually
   one; at a cascade (…9 rolling over) it is two. Returns the indices into
   PLACES that differ. */
function changedColumns(before, after) {
  const a = digitsOf(before), b = digitsOf(after);
  const out = [];
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) out.push(i);
  return out;
}

/* Is this jump a CASCADE — a ten- or hundred-jump that forced a carry/borrow
   into a HIGHER place because the target column was at its 9 (or 0)? A cascade
   changes MORE than one column. This is the exact idea the lab teaches: the 9s
   are where a jump stops being a single tick. */
function isCascade(before, delta) {
  const after = jump(before, delta).to;
  return changedColumns(before, after).length > 1;
}

/* Which place a jump AIMS at: a ±10 aims at the tens column, ±100 at hundreds.
   (This is the column that ticks when there is no cascade.) */
const aimedPlace = (delta) => (Math.abs(delta) === 100 ? 2 : 1);

/* ---- parameters ---------------------------------------------------------
   ONE dial: the starting number, built directly so any 0–999 value is
   reachable. The JUMPS are buttons, not dials — the operation is the lesson. */
const NUM_DIAL = { key: 'n', label: 'the number', min: LO, max: HI, step: 1 };
const START = 247; // 2 hundreds, 4 tens, 7 ones — every digit distinct, room to jump

/* ---- calibration --------------------------------------------------------
   "Land on the target." From a start, reach a target using ONLY ±10 and ±100
   jumps (never ±1) — so the target is always a whole number of tens away, and
   the only road is place jumps. CALIBRATED is the integer identity n===target.
   Targets are generated to be reachable by jumps (same ones digit as start). */
function makeTarget(prev, rnd) {
  const rand = rnd || Math.random;
  const pick = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  let t;
  do {
    const start = pick(100, 400) + pick(0, 9); // a start with some ones
    // move a whole number of tens and hundreds, staying in range
    const dTens = pick(-9, 9) * 10, dHund = pick(-3, 5) * 100;
    const target = Math.max(0, Math.min(HI, start + dTens + dHund));
    // keep the ones digit shared (jumps of 10/100 never touch the ones), and
    // require a real distance so the challenge is not already solved
    if ((target % 10) === (start % 10) && target !== start) t = { start, target };
  } while (!t || (prev && t.target === prev.target && t.start === prev.start));
  return t;
}
const isCalibrated = (n, target) => n === target.target;
/* the tens+hundreds distance to the goal, as a jump count — the meter reads it */
function jumpsAway(n, target) {
  const d = Math.abs(target.target - n);
  return Math.floor(d / 100) + Math.floor((d % 100) / 10);
}
function matchPercent(n, target) {
  const total = Math.max(1, jumpsAway(target.start, target));
  return Math.max(0, Math.min(100, 100 * (1 - jumpsAway(n, target) / total)));
}

/* ---- the lesson ---------------------------------------------------------- */
const STEPS = [
  {
    title: 'A number in its places',
    focus: 'meet',
    body:
      'Here is 247, sitting in its columns: 2 hundreds, 4 tens, 7 ones. Each digit lives in one ' +
      'place. Watch what a jump of ten or a hundred does to just one of them.',
    q: 'In 247, which digit is in the TENS place?',
    choices: ['4', '7', '2'],
    answer: 0,
    feedback:
      'The 4 is in the tens place — it means 4 tens, or 40. The 7 is ones, the 2 is hundreds. ' +
      'Knowing which digit lives where is the whole game when you jump.',
  },
  {
    title: 'Ten more ticks the tens',
    focus: 'plus-ten',
    body:
      'Press +10. The number becomes 257 — and only ONE digit moved: the tens, from 4 to 5. The ones ' +
      'stayed 7, the hundreds stayed 2. A jump of ten lands in the tens column.',
    q: 'What is 247 + 10, and which digit changed?',
    choices: ['257 — the tens (4→5)', '248 — the ones (7→8)', '347 — the hundreds (2→3)'],
    answer: 0,
    feedback:
      '247 + 10 = 257. Only the tens digit ticked up, because ten is one ten. That is why you can add ' +
      'ten in your head: you do not touch the ones or the hundreds.',
  },
  {
    title: 'A hundred jumps the hundreds',
    focus: 'plus-hundred',
    body:
      'Now press +100. The number jumps to 347 — and this time only the HUNDREDS digit moved, 2 to 3. ' +
      'A jump of a hundred lands one column further left. Ten-jumps and hundred-jumps each have their ' +
      'own column.',
    q: 'What is 247 + 100?',
    choices: ['347 — the hundreds tick', '257 — the tens tick', '248 — the ones tick'],
    answer: 0,
    feedback:
      '247 + 100 = 347. Each size of jump owns a column: +10 the tens, +100 the hundreds. The ones ' +
      'digit never moves for either — only a jump of one would touch it.',
  },
  {
    title: 'The nines cascade',
    focus: 'cascade',
    body:
      'Set the number to 290 and press +10. It does not go to 2-(10)-0 — there is no digit for ten ' +
      'tens. The 9 tens fill a whole hundred, so the tens roll to 0 AND the hundreds tick up: 300. ' +
      'Two digits change at once. This is the one place a jump is not a single tick.',
    q: 'What is 290 + 10?',
    choices: ['300 — tens roll over, hundreds tick', '2100 — write ten in the tens', '291 — the ones tick'],
    answer: 0,
    feedback:
      '290 + 10 = 300. Nine tens plus one ten is ten tens, which is one hundred — so the tens go back ' +
      'to 0 and a hundred is carried. The nines are exactly where adding ten needs care; everywhere ' +
      'else it is a single tick.',
  },
  {
    title: 'Land on the target',
    focus: 'calib',
    body:
      'Last challenge. Start where you are dropped, and reach the target using only +10, −10, +100, ' +
      'and −100 jumps. The ones digit never changes — so the target always shares your ones digit. ' +
      'Fewest jumps is the neat way. Press New target for another.',
    calib: true,
  },
];

/* ==== MODEL:END ========================================================== */

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PlaceJumpLab() {
  const [n, setN] = useState(START);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);
  const [last, setLast] = useState(null); // { from, to, delta } of the last jump, for the highlight

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const focus = current.focus;

  // the columns changed by the last jump — carmine highlight
  const changed = last ? changedColumns(last.from, last.to) : [];
  sceneRef.current = { n, changed, focus, last };

  const calibrated = current.calib && target ? isCalibrated(n, target) : false;
  const pct = current.calib && target ? matchPercent(n, target) : 0;

  /* ---- the renderer: three place columns of digit cards ------------------ */
  const draw = useCallback(() => {
    const stage = stageRef.current, canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const INK = '#1c2b3a', SOFT = '#5b6b7b', CARM = '#c81e4f', BLUE = '#3a6ea5';
    const digs = digitsOf(S.n); // [ones, tens, hundreds]

    // three columns, hundreds→ones left to right (reading order)
    const cardW = Math.min(120, W * 0.22), cardH = cardW * 1.25, gap = cardW * 0.34;
    const totalW = cardW * 3 + gap * 2;
    const x0 = W / 2 - totalW / 2;
    const cy = H * 0.42;
    const colNames = ['hundreds', 'tens', 'ones']; // left to right
    const colDigit = [digs[2], digs[1], digs[0]];
    const colIndex = [2, 1, 0]; // maps display column → PLACES index

    const roundRect = (rx, ry, rw, rh, r) => {
      ctx.beginPath();
      ctx.moveTo(rx + r, ry);
      ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
      ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
      ctx.arcTo(rx, ry + rh, rx, ry, r);
      ctx.arcTo(rx, ry, rx + rw, ry, r);
      ctx.closePath();
    };

    for (let c = 0; c < 3; c++) {
      const cx = x0 + c * (cardW + gap);
      const isChanged = S.changed.includes(colIndex[c]);
      // the card
      roundRect(cx, cy - cardH / 2, cardW, cardH, 14);
      ctx.fillStyle = isChanged ? 'rgba(200,30,79,0.10)' : '#fff';
      ctx.fill();
      ctx.lineWidth = isChanged ? 3.5 : 2;
      ctx.strokeStyle = isChanged ? CARM : 'rgba(28,43,58,0.25)';
      ctx.stroke();
      // the digit
      ctx.fillStyle = isChanged ? CARM : INK;
      ctx.font = `700 ${Math.round(cardW * 0.62)}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(colDigit[c]), cx + cardW / 2, cy - 2);
      // the place name + its value
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillStyle = isChanged ? CARM : SOFT;
      ctx.fillText(colNames[c], cx + cardW / 2, cy + cardH / 2 + 18);
      ctx.font = '11px ui-monospace, Menlo, monospace';
      ctx.fillStyle = SOFT;
      ctx.fillText(`${colDigit[c]}×${PLACE_MULT[colIndex[c]]}`, cx + cardW / 2, cy + cardH / 2 + 36);
    }

    // the whole number, big, above the cards
    ctx.fillStyle = INK;
    ctx.font = '700 30px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(S.n.toLocaleString('en-US'), W / 2, cy - cardH / 2 - 34);

    // the last jump, described under the cards
    if (S.last) {
      const casc = changedColumns(S.last.from, S.last.to).length > 1;
      ctx.font = '600 15px ui-monospace, Menlo, monospace';
      ctx.fillStyle = CARM;
      const sign = S.last.delta > 0 ? '+' : '−';
      const msg = `${S.last.from} ${sign} ${Math.abs(S.last.delta)} = ${S.last.to}` +
        (casc ? '   (cascade!)' : '');
      ctx.fillText(msg, W / 2, cy + cardH / 2 + 68);
      if (S.last.blocked) {
        ctx.fillStyle = SOFT; ctx.font = '12px system-ui, sans-serif';
        ctx.fillText('(a jump can’t leave 0–999)', W / 2, cy + cardH / 2 + 90);
      }
    }
    void BLUE;
  }, []);

  useEffect(() => { draw(); }, [n, step, target, last, focus, draw]);
  useEffect(() => {
    const st = stageRef.current;
    if (!st || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(st);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (current.calib && !target) { const t = makeTarget(null); setTarget(t); setN(t.start); setLast(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* per-step preset numbers so the copy matches the picture */
  useEffect(() => {
    if (focus === 'meet' || focus === 'plus-ten' || focus === 'plus-hundred') { setN(247); setLast(null); }
    if (focus === 'cascade') { setN(290); setLast(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const doJump = (delta) => {
    const j = jump(n, delta);
    setN(j.to);
    setLast(j);
  };
  const onDial = (v) => { setN(parseInt(v, 10)); setLast(null); };
  const choose = (i) => { if (answers[step] == null) setAnswers((p) => ({ ...p, [step]: i })); };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const answered = answers[step] != null;
  const canNext = step < STEPS.length - 1 && (!current.q || answered);

  const spoken = (() => {
    const d = digitsOf(n);
    if (focus === 'calib' && target)
      return `Start ${target.start}, target ${target.target}. You are on ${n}.`;
    if (last) {
      const casc = changedColumns(last.from, last.to).length > 1;
      return `${last.from} ${last.delta > 0 ? 'plus' : 'minus'} ${Math.abs(last.delta)} is ${last.to}. ` +
        (casc ? 'The nines cascaded: two digits changed.' : 'One digit changed.');
    }
    return `${n}: ${d[2]} hundreds, ${d[1]} tens, ${d[0]} ones.`;
  })();

  return (
    <div className="pjlab">
      <header className="head">
        <h1>Ten More, a Hundred More</h1>
        <p className="lede">
          Add ten and only the <strong>tens</strong> digit ticks. Add a hundred and only the{' '}
          <strong>hundreds</strong> digit ticks. Each jump owns one column — <em>except</em> at the
          nines, where it cascades. That’s the whole trick to doing it in your head.
        </p>
      </header>

      <div className="bench">
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label={`Place-value columns. ${spoken}`} role="img" />
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>
          <div className="jumps" role="group" aria-label="Jumps">
            {JUMPS.map((j) => (
              <button key={j.delta} type="button" className={'jbtn' + (Math.abs(j.delta) === 100 ? ' hund' : '')}
                onClick={() => doJump(j.delta)}>{j.label}</button>
            ))}
          </div>
        </section>

        <aside className="panel tutor">
          <div className="progress" role="list" aria-label="Lesson progress">
            {STEPS.map((_, i) => (
              <span key={i} role="listitem"
                className={'pip' + (i === step ? ' cur' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined} />
            ))}
          </div>
          <p className="eyebrow small">Step {step + 1} of {STEPS.length}</p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          {!current.calib && (
            <label className="dial">
              <span className="drole">{NUM_DIAL.label}</span>
              <input type="range" min={NUM_DIAL.min} max={NUM_DIAL.max} step={NUM_DIAL.step}
                value={n} aria-label="the number" onChange={(e) => onDial(e.target.value)} />
              <output className="dv">{n}</output>
            </label>
          )}

          {current.q && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((ch, i) => {
                  const chosen = answers[step];
                  let cls = 'choice';
                  if (chosen != null) {
                    if (i === current.answer) cls += ' correct';
                    else if (i === chosen) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
                      <span className="mark" aria-hidden="true">
                        {chosen != null && i === current.answer ? '✓' : chosen != null && i === chosen ? '✕' : ''}
                      </span>{ch}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {current.calib && target && (
            <div className="calib">
              <p className="calib-goal">
                Start <span className="mono">{target.start}</span> → land on{' '}
                <span className="mono goal">{target.target}</span>. Use the jump buttons.
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">on {n} · {jumpsAway(n, target)} jump{jumpsAway(n, target) === 1 ? '' : 's'} away</span>
                {calibrated
                  ? <span className="stamp">CALIBRATED</span>
                  : <span className="mono hint">jump to {target.target}</span>}
              </div>
              <button type="button" className="btn ghost"
                onClick={() => { const t = makeTarget(target); setTarget(t); setN(t.start); setLast(null); }}>
                New target
              </button>
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={goBack} disabled={step === 0}>← Back</button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} disabled={!canNext}>
                {current.q && !answered ? 'Answer to continue' : 'Next →'}
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => {
                setStep(0); setAnswers({}); setTarget(null); setN(START); setLast(null);
              }}>Restart lab</button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">+10 → the tens · +100 → the hundreds · the 9s cascade</span> &nbsp;·&nbsp;
        a jump moves one place, drawn live on a dependency-free canvas.
      </footer>

      <style jsx>{`
        .pjlab{
          --page:#eff1ee;--paper:#fbfbf8;--ink:#1c2b3a;--ink-soft:#5b6b7b;
          --curve:#c81e4f;--quad:#c7d8e4;--ok:#1f8a5b;--blue:#3a6ea5;
          --mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
          --serif:'Iowan Old Style',Palatino,Georgia,serif;
          background:var(--page);color:var(--ink);
          font:16px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;
          padding:28px 18px 44px;border-radius:16px;max-width:1120px;margin:0 auto;
        }
        .mono{font-family:var(--mono);}
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
        .eyebrow{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--ink-soft);margin:0 0 6px;}
        .eyebrow.small{margin:0 0 4px;}
        h1{font-family:var(--serif);font-weight:600;font-size:clamp(26px,4vw,34px);margin:0 0 6px;}
        .lede{color:var(--ink-soft);margin:0 0 22px;max-width:64ch;}
        .bench{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:22px;align-items:start;}
        @media (max-width:920px){.bench{grid-template-columns:1fr;}}
        .panel{background:#fff;border:1px solid rgba(28,43,58,.15);border-radius:12px;box-shadow:0 1px 2px rgba(28,43,58,.05);}
        .stage-panel{padding:14px;}
        .stage{position:relative;width:100%;aspect-ratio:16/12;border:1px solid var(--quad);border-radius:8px;overflow:hidden;
          background:radial-gradient(120% 120% at 30% 18%,#fdfefe 0%,#eef3f7 60%,#e3ebf1 100%);}
        .stage canvas{display:block;width:100%;height:100%;}
        .jumps{margin:12px 4px 2px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
        @media (max-width:560px){.jumps{grid-template-columns:repeat(2,minmax(44px,1fr));}}
        .jbtn{font:700 16px/1 ui-monospace,Menlo,monospace;padding:13px 6px;border-radius:8px;cursor:pointer;
          border:2px solid var(--curve);background:rgba(200,30,79,.06);color:var(--curve);transition:filter .15s;}
        .jbtn.hund{border-color:var(--blue);background:rgba(58,110,165,.08);color:var(--blue);}
        .jbtn:hover{filter:brightness(1.05);}
        .btn{font:600 14px/1 system-ui,sans-serif;padding:10px 16px;border-radius:8px;cursor:pointer;
          border:1px solid var(--ink);background:var(--ink);color:#fff;transition:filter .15s,opacity .15s;}
        .btn.ghost{background:transparent;color:var(--ink);}
        .btn:disabled{opacity:.4;cursor:not-allowed;}
        .btn:not(:disabled):hover{filter:brightness(1.08);}
        .tutor{padding:18px 20px 20px;}
        .progress{display:flex;gap:6px;margin-bottom:14px;}
        .pip{height:6px;flex:1;border-radius:3px;background:rgba(28,43,58,.14);}
        .pip.done{background:rgba(200,30,79,.45);}
        .pip.cur{background:var(--curve);}
        h2{font-family:var(--serif);font-weight:600;font-size:21px;margin:0 0 10px;padding-bottom:9px;border-bottom:3px double rgba(200,30,79,.45);}
        .body{margin:0 0 16px;font-size:14.5px;}
        .dial{display:grid;grid-template-columns:1fr 52px;grid-template-rows:auto auto;align-items:center;gap:2px 10px;margin-bottom:14px;}
        .drole{grid-column:1/3;font-size:12px;color:var(--ink-soft);}
        .dial input[type=range]{grid-column:1;width:100%;accent-color:var(--ink);cursor:pointer;}
        .dv{grid-column:2;font-family:var(--mono);text-align:right;font-size:17px;font-weight:700;}
        .quiz{margin-top:4px;}
        .q{font-size:14px;font-weight:600;margin:0 0 10px;}
        .choices{display:grid;gap:8px;}
        .choice{text-align:left;font:14px/1.4 system-ui,sans-serif;padding:11px 11px 11px 32px;
          border:1px solid rgba(28,43,58,.2);border-radius:8px;background:var(--paper);color:var(--ink);
          cursor:pointer;position:relative;transition:border-color .15s,background .15s;}
        .choice:not(:disabled):hover{border-color:var(--ink);}
        .choice .mark{position:absolute;left:11px;font-weight:700;}
        .choice.correct{border-color:var(--ok);background:rgba(31,138,91,.08);}
        .choice.correct .mark{color:var(--ok);}
        .choice.wrong{border-color:var(--ink-soft);background:rgba(91,107,123,.08);}
        .choice.wrong .mark{color:var(--ink-soft);}
        .choice.dim{opacity:.55;}
        .choice:disabled{cursor:default;}
        .feedback{margin:12px 0 0;font-size:13px;line-height:1.55;background:rgba(200,30,79,.05);
          border-left:3px solid var(--curve);padding:10px 12px;border-radius:0 6px 6px 0;}
        .calib{margin-top:6px;display:grid;gap:11px;}
        .calib-goal{margin:0;font-size:15px;background:rgba(58,110,165,.08);border-radius:8px;padding:11px 13px;}
        .calib-goal .mono{font-weight:700;}
        .calib-goal .goal{color:var(--curve);}
        .meter{height:12px;border-radius:6px;background:rgba(28,43,58,.1);overflow:hidden;}
        .meter-fill{height:100%;background:linear-gradient(90deg,rgba(200,30,79,.55),var(--curve));transition:width .12s ease-out;}
        .meter-row{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;}
        .hint{color:var(--ink-soft);font-size:12.5px;}
        .stamp{font:700 12px/1 var(--mono);letter-spacing:.16em;color:var(--ok);border:2px solid var(--ok);border-radius:6px;padding:5px 9px;transform:rotate(-3deg);}
        .nav{margin-top:20px;display:flex;justify-content:space-between;gap:10px;}
        .foot{margin-top:24px;font-size:12.5px;color:var(--ink-soft);}
        :global(.pjlab) :focus-visible{outline:2px solid var(--ink);outline-offset:2px;border-radius:4px;}
        @media (prefers-reduced-motion:reduce){.btn,.choice,.jbtn,.meter-fill{transition:none;}}
      `}</style>
    </div>
  );
}
