/* audit-money.mjs — numeric proof of MoneyLab's model.
   Run: node audit-money.mjs
   Re-implements the pure functions from MoneyLab.jsx and checks them
   exhaustively. Exits non-zero on any failure. */

let checks = 0, fails = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.error('FAIL:', msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

/* ---- model under test (mirrors MoneyLab.jsx) --------------------------- */
const COINS = [
  { key: 'penny', name: 'Penny', face: '1¢', cents: 1, unlock: 1, max: 9 },
  { key: 'nickel', name: 'Nickel', face: '5¢', cents: 5, unlock: 2, max: 9 },
  { key: 'dime', name: 'Dime', face: '10¢', cents: 10, unlock: 3, max: 9 },
  { key: 'quarter', name: 'Quarter', face: '25¢', cents: 25, unlock: 4, max: 4 },
  { key: 'dollar', name: 'Dollar', face: '$1', cents: 100, unlock: 5, max: 4 },
];
const N_DEN = COINS.length;

function totalCentsOf(counts, revealed) {
  let c = 0;
  for (let i = 0; i < N_DEN; i++) if (i < revealed) c += counts[i] * COINS[i].cents;
  return c;
}
function fmtDollars(cents) {
  const neg = cents < 0, a = Math.abs(cents);
  return (neg ? '-' : '') + '$' + Math.floor(a / 100) + '.' + String(a % 100).padStart(2, '0');
}
const fmtCents = (c) => `${c}¢`;

const ONES_W = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS_W = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function under100(n){ if(n<20) return ONES_W[n]; return TENS_W[Math.floor(n/10)] + (n%10?'-'+ONES_W[n%10]:''); }
function wordSmall(n){ if(n<100) return under100(n); const h=Math.floor(n/100), r=n%100; return ONES_W[h]+' hundred'+(r?' '+under100(r):''); }
function readMoney(cents){
  const d=Math.floor(cents/100), c=cents%100;
  const dp=d>0?`${wordSmall(d)} dollar${d===1?'':'s'}`:'';
  const cp=c>0?`${wordSmall(c)} cent${c===1?'':'s'}`:'';
  if(d>0&&c>0) return `${dp} and ${cp}`;
  if(d>0) return dp;
  if(c>0) return cp;
  return 'zero dollars';
}
function fewestPieces(cents){
  const out=[]; let r=cents;
  for(let i=N_DEN-1;i>=0;i--){ const q=Math.floor(r/COINS[i].cents); if(q>0){ out.push({count:q,i}); r-=q*COINS[i].cents; } }
  return out;
}
const pieceCount = (c) => fewestPieces(c).reduce((a,p)=>a+p.count,0);
const MATCH_SCALE = 50;
const matchPercent = (t, T) => 100 * Math.max(0, 1 - Math.abs(t - T) / MATCH_SCALE);
const isCalibrated = (t, T) => t === T;

/* ---- 1. exact integer-cent composition, no float ----------------------- */
for (let p = 0; p <= 9; p++)
  for (let n = 0; n <= 9; n++)
    for (let d = 0; d <= 9; d++)
      for (let q = 0; q <= 4; q++)
        for (let $ = 0; $ <= 4; $++) {
          const cnt = [p, n, d, q, $];
          const t = totalCentsOf(cnt, 5);
          const want = p * 1 + n * 5 + d * 10 + q * 25 + $ * 100;
          if (t !== want) { fails++; console.error('FAIL composition', cnt); }
          checks++;
          // integer only, never a float
          if (!Number.isInteger(t)) { fails++; console.error('FAIL non-integer', cnt); }
          checks++;
        }
console.log('composition exhaustive (all', (10*10*10*5*5), 'dial states) checked');

/* revealed clamps contribution */
eq(totalCentsOf([3,3,2,2,1], 0), 0, 'revealed=0 → $0');
eq(totalCentsOf([3,3,2,2,1], 1), 3, 'revealed=1 → 3¢ (pennies only)');
eq(totalCentsOf([3,3,2,2,1], 2), 18, 'revealed=2 → 18¢');
eq(totalCentsOf([3,3,2,2,1], 3), 38, 'revealed=3 → 38¢');
eq(totalCentsOf([3,3,2,2,1], 4), 88, 'revealed=4 → 88¢');
eq(totalCentsOf([3,3,2,2,1], 5), 188, 'revealed=5 → $1.88');

/* ---- 2. formatting exact over 0..1000, two-digit cents always ---------- */
for (let c = 0; c <= 1000; c++) {
  const s = fmtDollars(c);
  const m = s.match(/^\$(\d+)\.(\d\d)$/);
  ok(!!m, `fmtDollars(${c}) shape "${s}"`);
  if (m) {
    const back = parseInt(m[1], 10) * 100 + parseInt(m[2], 10);
    eq(back, c, `fmtDollars round-trip ${c}`);
    eq(m[2].length, 2, `two-digit cents for ${c}`);
  }
}
eq(fmtDollars(5), '$0.05', 'nickel formats as $0.05 not $0.5');
eq(fmtDollars(50), '$0.50', '$0.50');
eq(fmtDollars(105), '$1.05', '$1.05');
eq(fmtDollars(100), '$1.00', '$1.00');
eq(fmtDollars(188), '$1.88', '$1.88');
eq(fmtDollars(0), '$0.00', '$0.00');

/* ---- 3. word reading (the $ / ¢ speech) -------------------------------- */
eq(readMoney(0), 'zero dollars', 'zero');
eq(readMoney(1), 'one cent', 'one cent (singular)');
eq(readMoney(5), 'five cents', 'five cents');
eq(readMoney(85), 'eighty-five cents', 'eighty-five cents');
eq(readMoney(100), 'one dollar', 'one dollar (no cents, singular)');
eq(readMoney(200), 'two dollars', 'two dollars');
eq(readMoney(101), 'one dollar and one cent', 'one dollar and one cent');
eq(readMoney(123), 'one dollar and twenty-three cents', '$1.23');
eq(readMoney(188), 'one dollar and eighty-eight cents', '$1.88');
eq(readMoney(305), 'three dollars and five cents', '$3.05');

/* ---- 4. fewest coins is OPTIMAL (greedy == DP min) --------------------- */
const den = COINS.map((c) => c.cents);
function dpMin(amount) {
  const INF = 1e9;
  const dp = new Array(amount + 1).fill(INF);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++)
    for (const d of den) if (d <= a) dp[a] = Math.min(dp[a], dp[a - d] + 1);
  return dp[amount];
}
for (let c = 0; c <= 500; c++) {
  const g = pieceCount(c);
  const opt = c === 0 ? 0 : dpMin(c);
  eq(g, opt, `fewestPieces optimal at ${c}`);
  // fewest pieces sum back to the amount
  const s = fewestPieces(c).reduce((a, p) => a + p.count * COINS[p.i].cents, 0);
  eq(s, c, `fewestPieces sums to ${c}`);
}
console.log('fewest-coins greedy == optimal for 0..500 (US currency is canonical)');

/* ---- 5. denomination facts / traps ------------------------------------ */
ok(COINS[2].cents > COINS[1].cents, 'dime (10¢) worth more than nickel (5¢)');
// physical sizes: dime is the SMALLEST but not the least valuable
const bySize = [17.91, 19.05, 21.21, 24.26]; // dime, penny, nickel, quarter
ok(bySize[0] === Math.min(...bySize), 'dime is the physically smallest coin');
eq(4 * 25, 100, '4 quarters = 100¢ = $1');
eq(10 * 10, 100, '10 dimes = $1');
eq(20 * 5, 100, '20 nickels = $1');
eq(100 * 1, 100, '100 pennies = $1');
eq(3 * 25 + 10, 85, '3 quarters + 1 dime = 85¢ (NOT $1 — step-5 trap)');
// skip-count sequences
eq(JSON.stringify([1,2,3].map((k)=>k*5)), JSON.stringify([5,10,15]), 'nickel skip-count');
eq(JSON.stringify([1,2,3,4].map((k)=>k*10)), JSON.stringify([10,20,30,40]), 'dime skip-count');
eq(JSON.stringify([1,2,3,4].map((k)=>k*25)), JSON.stringify([25,50,75,100]), 'quarter skip-count');

/* ---- 6. decimal place-value breakdown of the cents part ---------------- */
for (let c = 0; c <= 289; c++) {
  const centsPart = c % 100;
  const tenths = Math.floor(centsPart / 10); // dimes-worth
  const hund = centsPart % 10;               // pennies-worth
  eq(tenths * 10 + hund, centsPart, `place value of cents at ${c}`);
}
// the $1.5 vs $1.05 trap
eq(fmtDollars(105), '$1.05', 'one dollar five cents = $1.05');
ok(fmtDollars(105) !== '$1.5', '$1.05 is not written $1.5');

/* ---- 7. calibration: reachable within caps, exact stamp, monotone ------ */
const CAPS = COINS.map((c) => c.max);
function greedyWithinCaps(target) {
  let r = target;
  for (let i = N_DEN - 1; i >= 0; i--) {
    const q = Math.min(CAPS[i], Math.floor(r / COINS[i].cents));
    r -= q * COINS[i].cents;
  }
  return r === 0;
}
let reach = 0;
for (let t = 8; t <= 289; t++) {
  ok(greedyWithinCaps(t), `target ${t}¢ buildable within dial caps`);
  if (greedyWithinCaps(t)) reach++;
  // exact stamp only on exact
  ok(isCalibrated(t, t), `exact match stamps at ${t}`);
  ok(!isCalibrated(t - 1, t), `one-cent-short does NOT stamp at ${t}`);
  ok(!isCalibrated(t + 1, t), `one-cent-over does NOT stamp at ${t}`);
  // meter monotone toward target and < 100 when off
  ok(matchPercent(t, t) === 100, `meter 100% at exact ${t}`);
  ok(matchPercent(t - 1, t) < 100 && matchPercent(t - 1, t) >= 0, `meter <100 one short ${t}`);
  ok(matchPercent(t - 5, t) < matchPercent(t - 1, t), `meter rises as you approach ${t}`);
}
console.log('every calibration target 8..289¢ reachable within caps:', reach, '/ 282');
eq(Math.round(matchPercent(84, 85)), 98, 'off-by-one-cent reads 98%');
eq(Math.round(matchPercent(80, 85)), 90, 'off-by-five reads 90%');

/* ---- 8. max amount within caps ---------------------------------------- */
eq(totalCentsOf(CAPS, 5), 9 + 45 + 90 + 100 + 400, 'max total = 644¢');
eq(fmtDollars(totalCentsOf(CAPS, 5)), '$6.44', 'max = $6.44');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
