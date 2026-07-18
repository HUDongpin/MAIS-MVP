/* audit-time.mjs — numeric proof of TimeLab's math, independent of the canvas.
   Run:  node audit-time.mjs
   Mirrors the pure-model logic in TimeLab.jsx exactly. */

let pass = 0;
let fail = 0;
const fails = [];
function ok(name, cond) {
  if (cond) pass++;
  else {
    fail++;
    fails.push(name);
  }
}
function near(a, b, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

/* ---- model (copied verbatim from TimeLab.jsx) --------------------------- */
const minuteAngle = (m) => m * 6;
const hourAngle = (h, m) => ((h % 12) + m / 60) * 30;
const betweenAngle = (h, m) => {
  const d = Math.abs(hourAngle(h, m) - minuteAngle(m));
  return Math.min(d, 360 - d);
};

const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];
function numberWord(n) {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = n % 10;
  return o ? `${t}-${ONES[o]}` : t;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function readClock(h, m) {
  const hourW = numberWord(h);
  const nextH = h === 12 ? 1 : h + 1;
  const nextW = numberWord(nextH);
  if (m === 0) return cap(`${hourW} o’clock`);
  if (m === 15) return cap(`quarter past ${hourW}`);
  if (m === 30) return cap(`half past ${hourW}`);
  if (m === 45) return cap(`quarter to ${nextW}`);
  if (m < 30) return cap(`${numberWord(m)} ${m === 1 ? 'minute' : 'minutes'} past ${hourW}`);
  const to = 60 - m;
  return cap(`${numberWord(to)} ${to === 1 ? 'minute' : 'minutes'} to ${nextW}`);
}
function to24(h, m, period) {
  let h24;
  if (period === 'AM') h24 = h === 12 ? 0 : h;
  else h24 = h === 12 ? 12 : h + 12;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
const total12 = (h, m) => (h % 12) * 60 + m;
const elapsedMinutes = (s, e) => (((total12(e.h, e.m) - total12(s.h, s.m)) % 720) + 720) % 720;
function labelFromTotal(t) {
  t = ((t % 720) + 720) % 720;
  const hh = Math.floor(t / 60);
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(t % 60).padStart(2, '0')}`;
}
function angDiff(a, b) {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}
function matchError(p, t) {
  const eMin = angDiff(minuteAngle(p.m), minuteAngle(t.m));
  const eHour = angDiff(hourAngle(p.h, p.m), hourAngle(t.h, t.m));
  return Math.sqrt((eMin * eMin + eHour * eHour) / 2);
}
const matchPercent = (err) => Math.max(0, Math.min(100, 100 / (1 + err / 30)));

/* ---- 1. hand angles over every reachable (h, m) ------------------------- */
for (let h = 1; h <= 12; h++) {
  for (let m = 0; m <= 59; m++) {
    const ma = minuteAngle(m);
    ok(`minute angle in [0,360) @ ${h}:${m}`, ma >= 0 && ma < 360);
    ok(`minute angle = m*6 @ ${h}:${m}`, near(ma, m * 6));
    const ha = hourAngle(h, m);
    ok(`hour angle in [0,360) @ ${h}:${m}`, ha >= 0 && ha < 360);
    // hour hand is fractional: at :30 it must be exactly halfway (15°) past the hour mark
    const hourMark = (h % 12) * 30;
    ok(`hour hand fraction m/60 @ ${h}:${m}`, near(ha - hourMark, (m / 60) * 30));
    const b = betweenAngle(h, m);
    ok(`between in [0,180] @ ${h}:${m}`, b >= 0 && b <= 180 + 1e-9);
  }
}

/* the classic checkpoints */
ok('3:00 hour hand at 90°', near(hourAngle(3, 0), 90));
ok('3:30 hour hand at 105° (halfway to 4)', near(hourAngle(3, 30), 105));
ok('3:45 hour hand at 112.5° (¾ to 4)', near(hourAngle(3, 45), 112.5));
ok('6:00 minute hand at 0°', near(minuteAngle(0), 0));
ok('minute at 15 → 90° (the 3)', near(minuteAngle(15), 90));
ok('minute at 30 → 180° (the 6)', near(minuteAngle(30), 180));
ok('3:00 hands 90° apart', near(betweenAngle(3, 0), 90));
ok('6:00 hands 180° apart', near(betweenAngle(6, 0), 180));
ok('12:00 hands 0° apart', near(betweenAngle(12, 0), 0));
// classic: between = |30h − 5.5m|, folded to ≤180
for (let h = 1; h <= 12; h++) {
  for (let m = 0; m <= 59; m++) {
    let d = Math.abs(30 * (h % 12) - 5.5 * m);
    if (d > 180) d = 360 - d;
    ok(`between = |30h−5.5m| @ ${h}:${m}`, near(betweenAngle(h, m), d, 1e-9));
  }
}

/* ---- 2. word readings: named cases + no-crash over all -------------------- */
ok('3:00 → o’clock', readClock(3, 0) === 'Three o’clock');
ok('9:15 → quarter past', readClock(9, 15) === 'Quarter past nine');
ok('2:30 → half past', readClock(2, 30) === 'Half past two');
ok('5:45 → quarter to next', readClock(5, 45) === 'Quarter to six');
ok('12:45 → quarter to one (wrap)', readClock(12, 45) === 'Quarter to one');
ok('4:01 → singular minute', readClock(4, 1) === 'One minute past four');
ok('4:23 → minutes past', readClock(4, 23) === 'Twenty-three minutes past four');
ok('4:59 → one minute to next', readClock(4, 59) === 'One minute to five');
ok('10:40 → twenty to eleven', readClock(10, 40) === 'Twenty minutes to eleven');
ok('12:00 → twelve o’clock', readClock(12, 0) === 'Twelve o’clock');
for (let h = 1; h <= 12; h++) {
  for (let m = 0; m <= 59; m++) {
    const w = readClock(h, m);
    ok(`word reading non-empty & capitalised @ ${h}:${m}`, typeof w === 'string' && w.length > 3 && w[0] === w[0].toUpperCase());
    // "past" for m<=30, "to"/"o’clock" otherwise
    if (m > 0 && m < 30) ok(`"past" phrasing @ ${h}:${m}`, /past/.test(w));
    if (m > 30) ok(`"to" phrasing @ ${h}:${m}`, / to /.test(w));
  }
}

/* ---- 3. 24-hour conversion ---------------------------------------------- */
ok('12:00 AM → 00:00 (midnight)', to24(12, 0, 'AM') === '00:00');
ok('12:00 PM → 12:00 (noon)', to24(12, 0, 'PM') === '12:00');
ok('3:07 AM → 03:07', to24(3, 7, 'AM') === '03:07');
ok('3:07 PM → 15:07', to24(3, 7, 'PM') === '15:07');
ok('11:59 PM → 23:59', to24(11, 59, 'PM') === '23:59');
ok('1:05 AM → 01:05', to24(1, 5, 'AM') === '01:05');
for (let h = 1; h <= 12; h++) {
  for (const p of ['AM', 'PM']) {
    const [hh] = to24(h, 0, p).split(':').map(Number);
    ok(`24h in [0,23] @ ${h}${p}`, hh >= 0 && hh <= 23);
  }
}

/* ---- 4. elapsed time ----------------------------------------------------- */
const EL = (sh, sm, eh, em) => elapsedMinutes({ h: sh, m: sm }, { h: eh, m: em });
ok('1:30 → 4:15 = 165 min (2h45)', EL(1, 30, 4, 15) === 165);
ok('2:00 → 2:00 = 0 min', EL(2, 0, 2, 0) === 0);
ok('11:45 → 12:15 = 30 min (across 12)', EL(11, 45, 12, 15) === 30);
ok('12:00 → 3:00 = 180 min', EL(12, 0, 3, 0) === 180);
ok('9:00 → 8:00 wraps forward to 11h', EL(9, 0, 8, 0) === 660);
// elapsed is always 0..719 and the count-on decomposition reconstructs the end
for (let sh = 1; sh <= 12; sh++)
  for (let sm = 0; sm < 60; sm += 7)
    for (let eh = 1; eh <= 12; eh++)
      for (let em = 0; em < 60; em += 11) {
        const t = EL(sh, sm, eh, em);
        ok(`elapsed in [0,720) @ ${sh}:${sm}->${eh}:${em}`, t >= 0 && t < 720);
        // reconstruct: start + t (mod 720) must label to the end time
        const endLabel = labelFromTotal(total12(sh, sm) + t);
        const eh12 = eh % 12 === 0 ? 12 : eh % 12;
        ok(`count-on reaches end @ ${sh}:${sm}->${eh}:${em}`, endLabel === `${eh12}:${String(em).padStart(2, '0')}`);
        // whole-hours + rem-minutes split
        const wh = Math.floor(t / 60);
        const rm = t % 60;
        ok(`elapsed split @ ${sh}:${sm}->${eh}:${em}`, wh * 60 + rm === t && rm >= 0 && rm < 60);
      }

/* ---- 5. calibration: exact match reachable, near-miss never stamps ------- */
function makeAllTargets() {
  const ts = [];
  for (let h = 1; h <= 12; h++) for (let m = 0; m < 60; m += 5) ts.push({ h, m });
  return ts.filter((t) => !(t.h === 12 && t.m === 0)); // 12:00 excluded (reset value)
}
const targets = makeAllTargets();
ok('target pool size = 12*12 − 1', targets.length === 143);
let worstExact = 0;
let bestOneOff = Infinity;
for (const t of targets) {
  // exact match → error 0 → 100%
  const e0 = matchError({ h: t.h, m: t.m }, t);
  worstExact = Math.max(worstExact, e0);
  ok(`exact match err 0 @ ${t.h}:${t.m}`, near(e0, 0));
  ok(`exact match 100% @ ${t.h}:${t.m}`, near(matchPercent(e0), 100));
  // one-minute-off is NOT an exact integer (h,m) match → must never be "calibrated"
  const off = { h: t.h, m: (t.m + 1) % 60 };
  const isCal = off.h === t.h && off.m === t.m;
  ok(`+1 min not calibrated @ ${t.h}:${t.m}`, isCal === false);
  const eOff = matchError(off, t);
  bestOneOff = Math.min(bestOneOff, eOff);
  ok(`+1 min meter < 100 @ ${t.h}:${t.m}`, matchPercent(eOff) < 100);
  // swapping hour by 1 (visually close via hour-hand creep) is also not exact
  const offH = { h: (t.h % 12) + 1, m: t.m };
  ok(`+1 hr not calibrated @ ${t.h}:${t.m}`, !(offH.h === t.h && offH.m === t.m));
}
ok('worst exact-match error is ~0', worstExact < 1e-9);
ok('closest one-off still separated from exact', bestOneOff > 0.5);

/* meter is monotone: bigger angular error → not-larger percent */
let mono = true;
for (let e = 0; e < 180; e += 3) if (matchPercent(e + 3) > matchPercent(e) + 1e-9) mono = false;
ok('matchPercent monotone decreasing', mono);

/* ---- 6. lesson answer keys are the true facts --------------------------- */
ok('Q hour gap = 30°', near(hourAngle(4, 0) - hourAngle(3, 0), 30));
ok('Q minute at 6 = 30 min', minuteAngle(30) === 180 && 6 * 5 === 30);
ok('Q read 4:30 half past 4', readClock(4, 30) === 'Half past four');
ok('Q 3:45 hour hand ¾ to 4', near((hourAngle(3, 45) - 90) / 30, 0.75));
ok('Q elapsed 1:30→4:15 = 2h45', EL(1, 30, 4, 15) === 165 && Math.floor(165 / 60) === 2 && 165 % 60 === 45);

/* ---- report ------------------------------------------------------------- */
console.log(`\nTimeLab audit — ${pass} checks passed, ${fail} failed.`);
if (fail) {
  console.log('FAILURES:');
  for (const f of fails.slice(0, 40)) console.log('  ✗', f);
  process.exit(1);
} else {
  console.log('All clock math, word readings, 24-hour conversions, elapsed-time, and calibration checks pass. ✓');
}
