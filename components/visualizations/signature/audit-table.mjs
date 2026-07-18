/* audit-table.mjs — independent verification of TableLab's arithmetic.
   Mirrors the model helpers, then cross-checks them against brute-force
   references over tens of thousands of random 2×2 integer tables, plus fixed
   checks on the lesson's quiz numbers and the calibration invariant.
   Run: node audit-table.mjs */

const MAX_CELL = 9;

/* ---- copies of the model helpers from TableLab.jsx ---- */
function totalsOf(grid) {
  const rowTotals = grid.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals = [0, 0];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) colTotals[c] += grid[r][c];
  const N = rowTotals[0] + rowTotals[1];
  const cellSum = grid[0][0] + grid[0][1] + grid[1][0] + grid[1][1];
  return { rowTotals, colTotals, N, cellSum };
}
function pct(count, den) {
  if (den === 0) return { text: '—', approx: false };
  if ((count * 100) % den === 0) return { text: String((count * 100) / den), approx: false };
  const tenths = Math.round((count * 1000) / den);
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  const approx = (count * 1000) % den !== 0;
  return { text: whole + '.' + frac, approx };
}
function targetFeasible(R1, R2, C1, C2, N) {
  const aLo = Math.max(0, R1 + C1 - N);
  const aHi = Math.min(R1, C1);
  for (let a = aLo; a <= aHi; a++) {
    const cells = [a, R1 - a, C1 - a, N - R1 - C1 + a];
    if (cells.every((x) => x >= 0 && x <= MAX_CELL)) return true;
  }
  return false;
}
function makeTarget(prev) {
  for (let tries = 0; tries < 500; tries++) {
    const N = 10 + Math.floor(Math.random() * 7);
    const R1 = 3 + Math.floor(Math.random() * (N - 5));
    const R2 = N - R1;
    const C1 = 3 + Math.floor(Math.random() * (N - 5));
    const C2 = N - C1;
    if (!targetFeasible(R1, R2, C1, C2, N)) continue;
    if (prev && prev.N === N && prev.rows[0] === R1 && prev.cols[0] === C1) continue;
    return { rows: [R1, R2], cols: [C1, C2], N };
  }
  return { rows: [6, 6], cols: [6, 6], N: 12 };
}
function marginError(rowTotals, colTotals, target) {
  return (
    Math.abs(rowTotals[0] - target.rows[0]) +
    Math.abs(rowTotals[1] - target.rows[1]) +
    Math.abs(colTotals[0] - target.cols[0]) +
    Math.abs(colTotals[1] - target.cols[1])
  );
}
function isCalibrated(err, N) {
  return N > 0 && err === 0;
}

/* ---- test harness ---- */
let pass = 0,
  fail = 0;
const fails = [];
function ok(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    fails.push(msg);
  }
}

function randGrid(max = MAX_CELL) {
  const cell = () => Math.floor(Math.random() * (max + 1));
  return [
    [cell(), cell()],
    [cell(), cell()],
  ];
}

/* ============================================================================
   1) THE GRAND-TOTAL INVARIANT — the lab's whole thesis.
      Σ(row totals) === Σ(column totals) === Σ(all cells) === N, always.
   ========================================================================== */
for (let trial = 0; trial < 40000; trial++) {
  const g = randGrid();
  const { rowTotals, colTotals, N, cellSum } = totalsOf(g);

  const sumRows = rowTotals[0] + rowTotals[1];
  const sumCols = colTotals[0] + colTotals[1];
  const bruteCells = g[0][0] + g[0][1] + g[1][0] + g[1][1];

  ok(sumRows === N, `Σrows ${JSON.stringify(g)} -> ${sumRows} vs N ${N}`);
  ok(sumCols === N, `Σcols ${JSON.stringify(g)} -> ${sumCols} vs N ${N}`);
  ok(cellSum === bruteCells && cellSum === N, `Σcells ${JSON.stringify(g)} -> ${cellSum} vs ${bruteCells}/${N}`);
  ok(sumRows === sumCols, `Σrows===Σcols ${JSON.stringify(g)}`);

  // each row total is the sum of exactly its two cells; each column total likewise
  ok(rowTotals[0] === g[0][0] + g[0][1] && rowTotals[1] === g[1][0] + g[1][1], `row totals ${JSON.stringify(g)}`);
  ok(colTotals[0] === g[0][0] + g[1][0] && colTotals[1] === g[0][1] + g[1][1], `col totals ${JSON.stringify(g)}`);

  if (N === 0) continue;

  /* ------------------------------------------------------------------------
     2) RELATIVE FREQUENCY closes to 100% under the RIGHT denominator, and the
        percents are exact whenever the ratio terminates (no float artefacts).
     ---------------------------------------------------------------------- */
  // joint (÷ N): the four cell percents sum to 100 (as exact tenths of a percent)
  const cells = [g[0][0], g[0][1], g[1][0], g[1][1]];
  const jointTenths = cells.reduce((acc, cc) => acc + Math.round((cc * 1000) / N), 0);
  // rounding can wobble by a few tenths; the exact rational sum is exactly 100
  ok(Math.abs(jointTenths - 1000) <= 4, `joint % sum ${JSON.stringify(g)} -> ${jointTenths} tenths`);
  // exactness: whenever 100*count % N === 0 the label carries no ≈
  for (const cc of cells) {
    const p = pct(cc, N);
    if ((cc * 100) % N === 0) ok(!p.approx && p.text === String((cc * 100) / N), `exact joint % ${cc}/${N} -> ${p.text}`);
    // parsed value is within half a tenth of the truth (one-decimal rounding
    // has a worst-case error of exactly 0.05 percentage points, e.g. 18.75→18.8)
    const parsed = parseFloat(p.text);
    ok(Math.abs(parsed - (100 * cc) / N) <= 0.05 + 1e-9, `joint % near ${cc}/${N} -> ${p.text}`);
  }

  // row-conditional (÷ row total): each row's two cell percents sum to ~100
  for (let r = 0; r < 2; r++) {
    if (rowTotals[r] === 0) continue;
    const t = Math.round((g[r][0] * 1000) / rowTotals[r]) + Math.round((g[r][1] * 1000) / rowTotals[r]);
    ok(Math.abs(t - 1000) <= 2, `row ${r} conditional sum ${JSON.stringify(g)} -> ${t}`);
  }
  // column-conditional (÷ column total): each column's two cell percents sum to ~100
  for (let c = 0; c < 2; c++) {
    if (colTotals[c] === 0) continue;
    const t = Math.round((g[0][c] * 1000) / colTotals[c]) + Math.round((g[1][c] * 1000) / colTotals[c]);
    ok(Math.abs(t - 1000) <= 2, `col ${c} conditional sum ${JSON.stringify(g)} -> ${t}`);
  }

  // the DENOMINATOR TRAP is real: joint % and row-conditional % genuinely differ
  // whenever the row total is not the grand total (i.e. the other row is nonempty)
  if (rowTotals[0] > 0 && rowTotals[0] < N && g[0][0] > 0) {
    const joint = (100 * g[0][0]) / N;
    const cond = (100 * g[0][0]) / rowTotals[0];
    ok(cond > joint - 1e-9, `conditional ≥ joint for a sub-group ${JSON.stringify(g)}`);
  }
}

/* ============================================================================
   3) EXACT-PERCENT spot checks (no float artefacts, ≈ flagged honestly)
   ========================================================================== */
ok(pct(1, 4).text === '25' && !pct(1, 4).approx, '1/4 = 25% exact');
ok(pct(1, 2).text === '50' && !pct(1, 2).approx, '1/2 = 50% exact');
ok(pct(3, 4).text === '75' && !pct(3, 4).approx, '3/4 = 75% exact');
ok(pct(1, 8).text === '12.5' && !pct(1, 8).approx, '1/8 = 12.5% exact one decimal');
ok(pct(2, 5).text === '40' && !pct(2, 5).approx, '2/5 = 40% exact');
ok(pct(1, 3).approx && pct(1, 3).text === '33.3', `1/3 ≈ 33.3% flagged approx got ${pct(1, 3).text}`);
ok(pct(2, 3).approx && pct(2, 3).text === '66.7', `2/3 ≈ 66.7% flagged approx got ${pct(2, 3).text}`);
ok(pct(4, 6).approx && pct(4, 6).text === '66.7', `4/6 ≈ 66.7% got ${pct(4, 6).text}`);
ok(pct(5, 20).text === '25' && !pct(5, 20).approx, '5/20 = 25% exact');
ok(pct(0, 7).text === '0' && !pct(0, 7).approx, '0/7 = 0% exact');
ok(pct(7, 7).text === '100' && !pct(7, 7).approx, '7/7 = 100% exact');
ok(pct(3, 0).text === '—', 'divide by zero -> em dash');

/* ============================================================================
   4) FIXED CHECKS on the lesson's quiz numbers
   ========================================================================== */
// Step CELL: table Younger 4/2, Older 2/4 -> Older AND Cats = 2
{
  const g = [
    [4, 2],
    [2, 4],
  ];
  ok(g[1][0] === 2, 'quiz cell: Older∩Cats = 2');
  const { colTotals, N } = totalsOf(g);
  ok(colTotals[0] === 6, 'quiz: all cat-lovers = 6 (a column total, not a cell)');
  ok(N === 12, 'quiz: grand total = 12');
}
// Step MARGIN: Older total = Older-Cats + Older-Dogs = 2 + 4 = 6
{
  const g = [
    [4, 2],
    [2, 4],
  ];
  ok(totalsOf(g).rowTotals[1] === 6, 'quiz: Older row total = 6');
}
// Step REL: 5 of N=20 -> 25%
ok(pct(5, 20).text === '25' && !pct(5, 20).approx, 'quiz: 5/20 = 25%');
// Step COND: Younger 4/2 (row total 6) -> cats 4/6 ≈ 66.7%, and ≠ 4/12
ok(pct(4, 6).text === '66.7', 'quiz: 4/6 ≈ 66.7% (younger who like cats)');
ok(pct(4, 12).text === '33.3', 'quiz distractor: 4/12 ≈ 33.3% (a different question)');

/* ============================================================================
   5) CALIBRATION — targets are always FEASIBLE, and isCalibrated ⇔ exact
      match of all four margins (which forces the grand total to match too).
   ========================================================================== */
for (let t = 0; t < 20000; t++) {
  const target = makeTarget(null);
  // the generated target admits at least one small-integer interior
  ok(targetFeasible(target.rows[0], target.rows[1], target.cols[0], target.cols[1], target.N), `feasible target ${JSON.stringify(target)}`);
  // the target margins are internally consistent
  ok(target.rows[0] + target.rows[1] === target.N, `target row sum ${JSON.stringify(target)}`);
  ok(target.cols[0] + target.cols[1] === target.N, `target col sum ${JSON.stringify(target)}`);

  // build the canonical winning interior and confirm it calibrates
  const R1 = target.rows[0],
    C1 = target.cols[0],
    N = target.N;
  const aLo = Math.max(0, R1 + C1 - N);
  const aHi = Math.min(R1, C1);
  let built = null;
  for (let a = aLo; a <= aHi; a++) {
    const cells = [a, R1 - a, C1 - a, N - R1 - C1 + a];
    if (cells.every((x) => x >= 0 && x <= MAX_CELL)) {
      built = [
        [cells[0], cells[1]],
        [cells[2], cells[3]],
      ];
      break;
    }
  }
  ok(built !== null, `built winning interior ${JSON.stringify(target)}`);
  if (built) {
    const { rowTotals, colTotals, N: bn } = totalsOf(built);
    const e = marginError(rowTotals, colTotals, target);
    ok(e === 0 && isCalibrated(e, bn), `winning interior calibrates ${JSON.stringify(target)} -> err ${e}`);
    ok(bn === target.N, `winning interior grand total ${bn} === ${target.N}`);
  }
}

/* an empty table never calibrates; a wrong table gives err > 0 => not calibrated */
{
  const target = { rows: [6, 4], cols: [5, 5], N: 10 };
  const empty = [
    [0, 0],
    [0, 0],
  ];
  const te = totalsOf(empty);
  ok(!isCalibrated(marginError(te.rowTotals, te.colTotals, target), te.N), 'empty table not calibrated');
  const wrong = [
    [3, 3],
    [3, 3],
  ];
  const twe = totalsOf(wrong);
  ok(marginError(twe.rowTotals, twe.colTotals, target) > 0 && !isCalibrated(marginError(twe.rowTotals, twe.colTotals, target), twe.N), 'wrong margins not calibrated');
}

/* the "margins do not fix the inside" reveal: a feasible target with a>0 slack
   admits TWO distinct interiors sharing the same margins. */
{
  const target = { rows: [6, 6], cols: [6, 6], N: 12 };
  const solutions = [];
  const R1 = target.rows[0],
    C1 = target.cols[0],
    N = target.N;
  const aLo = Math.max(0, R1 + C1 - N);
  const aHi = Math.min(R1, C1);
  for (let a = aLo; a <= aHi; a++) {
    const cells = [a, R1 - a, C1 - a, N - R1 - C1 + a];
    if (cells.every((x) => x >= 0 && x <= MAX_CELL)) solutions.push(cells.join(','));
  }
  ok(solutions.length >= 2, `same margins admit multiple interiors (${solutions.length} found)`);
}

/* ---- report ---- */
console.log(`\nTableLab audit — ${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFirst failures:');
  for (const f of fails.slice(0, 20)) console.log('  ✗ ' + f);
  process.exit(1);
} else
  console.log(
    'The grand-total invariant (Σrows=Σcols=Σcells=N), relative-frequency closure under each denominator,\n' +
      'the denominator trap, exact percents, all quiz numbers, and the calibration invariant check out. ✓'
  );
