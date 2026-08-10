import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lesson = (slug) => readFileSync(
  path.join(ROOT, "components", "lesson", "ccss", "lessons", `${slug}.tsx`),
  "utf8",
);
const registry = readFileSync(path.join(ROOT, "data", "ccssTextbookRegistry.ts"), "utf8");
const narrations = readFileSync(path.join(ROOT, "data", "ccssTextbookNarrations.ts"), "utf8");
const sourceText = readFileSync(
  path.join(ROOT, "data", "generated-content", "ccss-textbook-source-v1", "source.json"),
  "utf8",
);
const sourceSnapshot = JSON.parse(sourceText);
const sourceSummary = (slug) => sourceSnapshot.lessons.find((entry) => entry.slug === slug)?.summary;

function mustInclude(source, fragment, disposition) {
  assert.ok(
    source.includes(fragment),
    `${disposition}: expected source contract ${JSON.stringify(fragment)}`,
  );
}

function mustExclude(source, fragment, disposition) {
  assert.ok(
    !source.includes(fragment),
    `${disposition}: stale defect contract ${JSON.stringify(fragment)} returned`,
  );
}

test("ordered arithmetic, exponent, integer, rate, and slope claims retain their corrected semantics", () => {
  const decimal = lesson("decimal-arithmetic");
  mustInclude(decimal, 'op === "sub" ? (aInt - bInt) / 100', "decimal subtraction keeps operand order");
  mustInclude(decimal, '<Stepper label="First"', "decimal first operand remains first");
  mustInclude(decimal, 'disabled={value < 11}', "decimal stepper blocks a partial −0.1 move");
  mustInclude(decimal, 'disabled={value > 989}', "decimal stepper blocks a partial +0.1 move");
  mustExclude(decimal, "Math.max(aInt, bInt)", "decimal subtraction does not silently reorder operands");

  const exponents = lesson("exponents");
  mustInclude(exponents, "number of copies of the base in the product", "exponent counts factor copies");
  mustInclude(exponents, "empty product", "zero exponent receives the empty-product explanation");
  mustExclude(exponents, "times the base is multiplied", "exponent does not count multiplication signs");

  const integerArrows = lesson("integer-arrows");
  mustInclude(integerArrows, "endpoint moves farther from zero in that direction", "same-direction arrows describe magnitude and direction");
  mustInclude(integerArrows, "leaves the other step unchanged", "zero-step state is explicit");
  mustInclude(integerArrows, "the arrows point opposite ways, so their distances partly cancel", "opposite-sign state remains a complete grammatical clause");
  mustExclude(integerArrows, "answer gets bigger", "negative same-direction motion is not called bigger");
  mustExclude(integerArrows, '"pointing opposite ways"', "opposite-sign state does not regress to a sentence fragment");

  const ratio = lesson("ratio-double-number-line");
  mustInclude(ratio, "const rateNumerator = b / rateDivisor", "unit rate is reduced exactly");
  mustInclude(ratio, "const rateDenominator = a / rateDivisor", "unit-rate denominator is retained");
  mustInclude(ratio, "nearest hundredth", "decimal unit-rate display is disclosed as rounded");

  const slope = lesson("slope-explorer");
  mustInclude(slope, "same nonvertical straight line", "slope invariance excludes vertical lines");
  mustInclude(slope, "slope is undefined everywhere", "vertical-line slope is handled for every state");
  mustInclude(slope, "Drag a point to define a new line", "slope interaction caption describes what dragging actually changes");
  mustInclude(slope, "const slopeRelation =", "slope display distinguishes exact from rounded decimals");
  mustInclude(slope, "{slopeRelation} {slopeDec}", "slope display uses its state-aware relation symbol");
  mustExclude(slope, '"> ≈ {slopeDec}', "exact slopes are not unconditionally labelled approximate");
  const exactSlope = 6 / 6;
  const exactSlopeDisplay = exactSlope.toFixed(2);
  assert.equal(Number(exactSlopeDisplay), exactSlope, "a slope of 1 is exactly represented as 1.00");
  const repeatingSlope = 2 / 3;
  const repeatingSlopeDisplay = repeatingSlope.toFixed(2);
  assert.notEqual(Number(repeatingSlopeDisplay), repeatingSlope, "a slope of 2/3 is only approximated as 0.67");

  const integerExponents = lesson("integer-exponents");
  mustInclude(integerExponents, "for <strong>a ≠ 0</strong>", "integer-exponent domain restriction is grammatical and visible");
  mustInclude(integerExponents, "function exponentOperand", "negative exponent operands use explicit parentheses");
  mustInclude(integerExponents, "`${integerText(m)} + ${exponentOperand(n)}`", "product work is sign-aware");
  mustInclude(integerExponents, "`${integerText(m)} − ${exponentOperand(n)}`", "quotient work is sign-aware");
  mustInclude(integerExponents, "`${integerText(m)} × ${exponentOperand(n)}`", "power work is sign-aware");
  mustExclude(integerExponents, "<sup>{m}+{n}</sup>", "negative product exponents do not render as plus-minus glyph soup");
  mustExclude(integerExponents, "<sup>{m}−{n}</sup>", "negative quotient exponents do not render as double-minus glyph soup");
  mustExclude(integerExponents, "From\n          for", "integer-exponent prose is not corrupted");
});

test("interactive geometry and plotting contracts remain truthful across reachable states", () => {
  const perimeterArea = lesson("coordinate-perimeter-area");
  mustInclude(perimeterArea, "const isValidTriangle", "coordinate triangle validates every candidate state");
  mustInclude(perimeterArea, "twiceSignedArea !== 0", "coordinate triangle rejects collinear vertices");
  mustInclude(perimeterArea, "disabled={!canMove", "invalid or bounded coordinate moves are disabled");

  const proofs = lesson("coordinate-proofs");
  mustInclude(proofs, "const rightAnglePoints", "right-angle marker follows the selected line directions");
  mustInclude(proofs, "rightAnglePoints.map", "the computed marker drives the rendered polyline");
  mustInclude(proofs, "vertical cases use the vertical/horizontal criteria", "coordinate-proof vertical cases are qualified");

  const circles = lesson("circle-constructions");
  mustInclude(circles, 'height={220}', "circumcircle viewport contains the full construction");
  mustInclude(circles, 'm.kind !== "tangent" && <polygon', "tangent mode hides the unrelated triangle");
  mustInclude(circles, "external point", "tangent construction marks its external point");

  const matrix = lesson("matrix-transformations");
  mustInclude(matrix, "const R = 6", "matrix presets fit inside the coordinate range");

  const circleEquation = lesson("equation-of-circle");
  mustInclude(circleEquation, "const extent = Math.max(BASE_EXTENT, Math.abs(h) + rad, Math.abs(k) + rad)", "circle grid expands to contain every selected circle");
  mustInclude(circleEquation, "const size = 2 * extent * CELL + 2 * PAD", "circle viewport follows its dynamic domain");

  const remainder = lesson("remainder-theorem");
  mustInclude(remainder, 'clipPath="url(#remainder-plot-window)"', "polynomial curve is continuously clipped at the viewport");
  mustInclude(remainder, "p({a}) = {pa} off chart", "off-range evaluation remains explicitly represented");
  mustInclude(remainder, 'textAnchor={a <= -3 ? "start" : a >= 3 ? "end" : "middle"}', "off-chart label remains visible at horizontal bounds");
  mustExclude(remainder, ".filter(({ y })", "polynomial plotting does not join filtered in-range samples");

  const residuals = lesson("fit-function-residuals");
  mustInclude(residuals, "vertical gaps from the", "line fitting is described as an aggregate residual problem");
  mustExclude(residuals, "comes closest to every", "line fitting does not promise pointwise optimality");
  mustInclude(residuals, "const yMax = Math.max", "residual plot domain covers all reachable predictions");
  mustInclude(residuals, "graph y-range: 0–{yMax}", "dynamic residual domain is disclosed");
  mustExclude(residuals, "clampY", "residual segments are not flattened at a hidden cap");

  const model = lesson("geometric-modeling");
  mustInclude(model, "const drawRadius", "model schematic responds to radius");
  mustInclude(model, "const drawHeight", "model schematic responds to height");
  mustInclude(model, "not drawn to one common scale", "independent schematic normalization is disclosed");

  const functionsIntro = lesson("functions-intro");
  mustInclude(functionsIntro, 'aria-label="Function B input-output table"', "function table has an accessible name");
  mustInclude(functionsIntro, '<th scope="row" className="pr-2 text-right font-semibold">input x</th>', "function table visibly labels its input row");
  mustInclude(functionsIntro, '<th scope="row" className="pr-2 text-right font-semibold">output y</th>', "function table visibly labels its output row");

  const equations = lesson("create-equations");
  mustInclude(equations, "cost (dollars)", "context graph visibly labels its vertical quantity and unit");
  mustInclude(equations, "transform={`rotate(-90 10 ${H / 2})`}", "vertical graph label is oriented along the y-axis");
});

test("rounding, association, comparison, and descriptive-statistics language stays evidence-bounded", () => {
  const systems = lesson("systems-of-equations");
  mustInclude(systems, "cx={sx(ixExact)}", "system marker uses the exact x-coordinate");
  mustInclude(systems, "cy={sy(iyExact)}", "system marker uses the exact y-coordinate");
  mustInclude(systems, "shown to the nearest hundredth", "system coordinate rounding is disclosed");
  mustInclude(systems, "The equations graph as the same line", "system caption handles infinitely many solutions");
  mustInclude(systems, "distinct parallel lines, so no point solves", "system caption handles no solution");
  mustInclude(systems, "The lines have one intersection", "system caption handles a unique solution");
  mustExclude(systems, "Where they intersect is the one point", "system caption is not static across all solution counts");

  const graphs = lesson("graphs-and-solutions");
  mustInclude(graphs, "cx={sx(xExact)}", "graph intersection marker uses exact x");
  mustInclude(graphs, "cy={sy(yExact)}", "graph intersection marker uses exact y");
  mustInclude(graphs, "coordinates to the nearest hundredth", "graph intersection rounding is disclosed");
  mustInclude(graphs, "two coincident functions; every point on the shared line is an intersection", "coincident-line aria label matches the visible result");
  mustInclude(graphs, "The two equations name the same line", "coincident-line caption describes infinitely many shared points");
  mustInclude(graphs, "The two distinct lines are parallel", "parallel-line caption describes no shared points");

  const bestFit = lesson("line-of-best-fit");
  mustInclude(bestFit, "This observational pattern", "best-fit interpretation is observational");
  mustInclude(bestFit, "does not show that extra study time", "best-fit interpretation rejects a causal leap");
  mustExclude(bestFit, "is worth", "slope is not framed as a causal treatment effect");

  const compareFunctions = lesson("compare-functions");
  mustInclude(compareFunctions, "The two <strong>linear functions</strong>", "function-comparison feature list is limited to the displayed linear family");
  mustInclude(compareFunctions, "<strong> y-intercept</strong>", "linear comparison names the y-intercept and starting-value connection");
  mustInclude(compareFunctions, "Other function families", "function comparison does not generalize slope/intercept to every function family");
  mustInclude(compareFunctions, "const longRunDescription", "function comparison handles slope/intercept state combinations");
  mustInclude(compareFunctions, "it only\n        <em> overtakes</em>", "overtaking is restricted to a function that begins behind");
  mustExclude(compareFunctions, "always overtakes", "larger slope does not imply a past crossing in every state");

  const displays = lesson("statistical-displays");
  mustInclude(displays, "const upperFence = q3 + 1.5 * iqr", "box-plot outlier statement uses the Tukey fence");
  mustInclude(displays, "const upperWhisker", "modified box-plot whisker stops at the largest non-outlier");
  mustInclude(displays, "is a Tukey outlier", "the high point is classified from the calculated fence");
  mustExclude(displays, "is not a Tukey outlier", "the stale, mathematically false outlier classification is absent");
  const displayData = [4, 5, 5, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 9, 9, 12];
  const displayQ1 = (displayData[3] + displayData[4]) / 2;
  const displayQ3 = (displayData[11] + displayData[12]) / 2;
  const displayUpperFence = displayQ3 + 1.5 * (displayQ3 - displayQ1);
  assert.equal(displayUpperFence, 11, "the displayed data have Tukey upper fence 11");
  assert.ok(displayData.at(-1) > displayUpperFence, "12 is above the Tukey upper fence");

  const exponential = lesson("exponential-vs-linear");
  mustInclude(exponential, "Their early order depends on the parameters", "linear/exponential caption is state-conditional");
  mustInclude(exponential, "relationForDisplayedValue(value, displayedValue)", "exponential cells compare the raw value with the one-decimal display");
  mustInclude(exponential, 'relation === "=" ? displayedValue : `${relation} ${displayedValue}`', "exponential cells distinguish exact decimals from rounded values");
  mustInclude(exponential, "is above the line — and stays ahead from there", "crossover copy describes order rather than an unproven crossing event");
  mustExclude(exponential, "clampY", "exponential plotting does not retain a misleading unused clamp");
  mustInclude(exponential, "with <strong>a &gt; 0</strong>", "eventual-growth theorem requires a positive leading value");
  mustInclude(exponential, "<strong>b &gt; 1</strong>", "eventual-growth theorem requires a growth base");
  mustExclude(exponential, "an increasing exponential function eventually exceeds", "bounded increasing exponentials are not swept into F-LE.3");

  const unitCircle = lesson("unit-circle");
  mustInclude(unitCircle, "signed horizontal projection", "cosine is identified as a signed projection");
  mustInclude(unitCircle, "|cos θ| and |sin θ|", "reference-triangle leg lengths remain nonnegative");
  mustInclude(unitCircle, "nearest thousandth", "unit-circle coordinate rounding is disclosed");

  const meanMedian = lesson("mean-median");
  mustInclude(meanMedian, "const madDisplay = mad.toFixed(2)", "MAD uses enough precision for the reachable data");
  mustInclude(meanMedian, '<Fact label="MAD" value={madDisplay}', "the corrected MAD precision reaches the displayed fact");
  const observations = [3, 5, 5, 6, 8];
  const mean = observations.reduce((sum, value) => sum + value, 0) / observations.length;
  const mad = observations.reduce((sum, value) => sum + Math.abs(value - mean), 0) / observations.length;
  assert.equal(mad.toFixed(2), "1.28", "two-decimal MAD distinguishes a reachable non-tenth value");

  const populations = lesson("compare-populations");
  mustInclude(populations, "const spread = (mad(GROUP_A) + mad(groupB)) / 2", "population comparison computes MAD from the plotted samples");
  mustInclude(populations, "const separationRelation = relationForDisplayedValue(separation, separationDisplay)", "Gap/MAD distinguishes exact zero from rounded nonzero values");
  mustInclude(populations, 'value={`${separationRelation} ${separationDisplay}×`}', "Gap/MAD renders its state-aware relation");
  mustInclude(populations, "spreadSpokenRelation", "population MAD precision is disclosed in spoken and visible prose");
  mustExclude(populations, "const spread = 2", "population comparison does not restore the false hard-coded spread");
  const groupA = [6, 7, 7, 8, 8, 9, 10];
  const defaultGroupB = [5, 6, 6, 7, 7, 8, 9].map((value) => value + 4);
  const arrayMean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const arrayMad = (values) => {
    const center = arrayMean(values);
    return values.reduce((sum, value) => sum + Math.abs(value - center), 0) / values.length;
  };
  const defaultSpread = (arrayMad(groupA) + arrayMad(defaultGroupB)) / 2;
  const defaultSeparation = Math.abs(arrayMean(defaultGroupB) - arrayMean(groupA)) / defaultSpread;
  assert.equal(defaultSpread, 50 / 49, "the displayed samples have exact MAD 50/49, not 2");
  assert.equal(defaultSeparation.toFixed(2), "2.94", "the default centers are mathematically 147/50 = 2.94 MADs apart");

  const correlationLesson = lesson("correlation");
  mustInclude(correlationLesson, "const r = correlation(s.pts)", "correlation is computed from the plotted points");
  mustInclude(correlationLesson, "const rRelation = relationForDisplayedValue(r, rDisplay)", "correlation distinguishes exact zero from rounded coefficients");
  mustInclude(correlationLesson, ">r {rRelation} {rDisplay}</div>", "correlation renders its state-aware relation");
  mustExclude(correlationLesson, "const RS =", "correlation does not restore hard-coded coefficients");
  const plottedSets = [
    [[1, 2], [2, 3], [3, 3], [4, 5], [5, 6], [6, 6], [7, 8]],
    [[1, 3], [2, 2], [3, 5], [4, 3], [5, 6], [6, 4], [7, 7]],
    [[1, 5], [2, 2], [3, 6], [4, 3], [5, 6], [6, 2], [7, 5]],
    [[1, 8], [2, 6], [3, 6], [4, 4], [5, 3], [6, 3], [7, 1]],
  ];
  const pearson = (points) => {
    const meanX = points.reduce((sum, [x]) => sum + x, 0) / points.length;
    const meanY = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
    const numerator = points.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0);
    const sumSqX = points.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0);
    const sumSqY = points.reduce((sum, [, y]) => sum + (y - meanY) ** 2, 0);
    return numerator / Math.sqrt(sumSqX * sumSqY);
  };
  assert.deepEqual(
    plottedSets.map((points) => pearson(points).toFixed(4)),
    ["0.9743", "0.7289", "0.0000", "-0.9764"],
    "each displayed correlation coefficient is recomputed from its plotted coordinates",
  );

  const similarityProofs = lesson("similarity-proofs");
  mustInclude(similarityProofs, "altitude from the right-angle vertex perpendicular to the", "Pythagorean similarity construction names the required altitude");
  mustInclude(similarityProofs, "altitude from the right-angle vertex to the hypotenuse", "MathCheck retains the precise right-triangle altitude condition");

  const perimeterArea = lesson("coordinate-perimeter-area");
  mustInclude(perimeterArea, "const rawPerim", "coordinate perimeter preserves its unrounded value");
  mustInclude(perimeterArea, "const perimRelation = relationForDisplayedValue(rawPerim, perim)", "coordinate perimeter distinguishes exact and rounded states");

  const trigRatios = lesson("trig-ratios");
  mustInclude(trigRatios, '<Cell label="sin θ" exactValue={rawSin} displayedValue={sin} />', "sine relation is computed from the raw special-angle value");
  mustInclude(trigRatios, "relationForDisplayedValue(exactValue, displayedValue)", "each trig ratio selects its own relation");

  const inverseTrig = lesson("inverse-trig");
  mustInclude(inverseTrig, "const sineRelation = relationForDisplayedValue(rawS, s)", "inverse-trig special angles distinguish exact from rounded sine values");

  const rounding = lesson("round-decimals");
  mustInclude(rounding, "const roundingRelation = relationForDisplayedValue(v / 1000, roundedDisplay)", "rounding distinguishes unchanged values from approximations");
  mustInclude(rounding, "{exactDisplay} {roundingRelation} {roundedDisplay}", "rounding MathCheck renders the selected relation");

  const linearEquations = lesson("linear-equations");
  mustInclude(linearEquations, "const solRelation = relationForDisplayedValue(sol, solDisplay)", "linear solutions distinguish terminating decimals from rounded values");
  mustInclude(linearEquations, "`x ${solRelation} ${solDisplay}`", "linear solution output uses the selected relation");

  const divisionEstimate = lesson("divide-two-digit");
  mustInclude(divisionEstimate, "const rawEstimate = dividend / dRound", "friendly-number division retains its unrounded quotient");
  mustInclude(divisionEstimate, "{displayedEstimateRelation} {est}", "friendly-number division uses equality when its integer estimate is exact");

  const largeNumberEstimate = lesson("add-subtract-bignum");
  mustInclude(largeNumberEstimate, ">= {estimate.toLocaleString()}</div>", "rounded-input arithmetic uses equality for its displayed calculation");
  mustExclude(largeNumberEstimate, ">≈ {estimate.toLocaleString()}</div>", "rounded-input arithmetic is not unconditionally labelled approximate");

  const complexPlane = lesson("complex-plane");
  mustInclude(complexPlane, "const displayedPolarError", "complex polar form checks the reconstructed displayed point");
  mustInclude(complexPlane, "const polarRelation", "complex polar form distinguishes exact axis states from rounded forms");

  const identitiesForPrecision = lesson("trig-identities");
  mustInclude(identitiesForPrecision, "const displayedSumRelation = relationForDisplayedValue(displayedSumSquares, roundedSumSquares)", "trig substitution relates the literal displayed sum to its result");
  mustInclude(identitiesForPrecision, "const identityRelation = relationForDisplayedValue(displayedSumSquares, 1)", "trig prose distinguishes an exact displayed identity from rounding drift");

  const twoWay = lesson("two-way-tables");
  mustInclude(twoWay, "(g[0][0] / rowTot[0]) * 100", "two-way-table comparison retains the unrounded first rate");
  mustInclude(twoWay, "Math.abs(pctPetYes - pctPetNo) >= 15", "association rule compares unrounded rates");
  mustInclude(twoWay, "computed from the unrounded rates", "association verdict discloses its decision basis");
  mustInclude(twoWay, "≈ marks a rate rounded to the nearest whole percent", "rounded row percentages are qualified");
  mustInclude(twoWay, "const MAX_CELL_COUNT = 99", "two-way-table cells declare a visible two-digit upper bound");
  mustInclude(twoWay, "Math.min(MAX_CELL_COUNT, v + d)", "two-way-table state clamps every edited cell to its upper bound");
  mustInclude(twoWay, "disabled={g[i][j] >= MAX_CELL_COUNT}", "two-way-table increase controls expose the upper bound");
  mustExclude(twoWay, "Math.round((g[0][0] / rowTot[0]) * 100)", "rounded percentages never drive the association rule");
  const firstRawRate = (1 / 2) * 100;
  const secondRawRate = (6 / 17) * 100;
  assert.ok(Math.abs(firstRawRate - secondRawRate) < 15, "reachable raw-rate gap remains below the rule threshold");
  assert.equal(Math.abs(Math.round(firstRawRate) - Math.round(secondRawRate)), 15, "rounding would incorrectly cross the rule threshold");

  const sampling = lesson("sampling");
  mustInclude(sampling, "const exactEst =", "sample proportion is retained before rounding");
  mustInclude(sampling, 'const estRelation = Math.abs(exactEst - est) < 1e-9 ? "=" : "≈"', "sample percentage distinguishes exact from rounded");
  mustInclude(sampling, "rounded to the nearest whole percent", "sample percentage precision is disclosed");

  const inference = lesson("sampling-inference");
  mustInclude(inference, "const exactMean =", "average sample proportion is retained before rounding");
  mustInclude(inference, "averaging ${meanIsWhole ? \"\" : \"approximately \"}${mean}%", "sample chart narration qualifies a rounded mean");
  mustInclude(inference, "nearest whole percent", "sample-average precision is disclosed");

  const expectedValue = lesson("expected-value");
  mustInclude(expectedValue, "const MIN_PAYOFF = -20", "expected-value payoffs declare a finite lower bound");
  mustInclude(expectedValue, "const MAX_PAYOFF = 20", "expected-value payoffs declare a finite upper bound");
  mustInclude(expectedValue, "Math.max(MIN_PAYOFF, Math.min(MAX_PAYOFF, v + d))", "expected-value payoff updates clamp to both bounds");
  mustInclude(expectedValue, "disabled={v <= MIN_PAYOFF}", "expected-value decrease controls expose the lower bound");
  mustInclude(expectedValue, "disabled={v >= MAX_PAYOFF}", "expected-value increase controls expose the upper bound");

  const distributions = lesson("compare-distributions");
  mustInclude(distributions, "const mean = a.reduce", "distribution mean remains exact during calculation");
  mustInclude(distributions, "(x - mean) ** 2", "population variance uses the exact mean");
  mustInclude(distributions, "function roundedStat", "distribution statistics round only for presentation");
  mustInclude(distributions, "rounded to the nearest hundredth", "distribution-statistic precision is disclosed");
  mustInclude(distributions, "it does not display distribution shape", "summary cards do not pretend to reveal distribution shape");
  mustExclude(distributions, "const mean = r2(", "rounded mean is not fed back into variance");

  const triangleArea = lesson("triangle-area-sine");
  mustInclude(triangleArea, 'relation(exactHeight) === "=" ? "equals" : "is approximately"', "triangle SVG narration qualifies rounded height");
  const trigIdentities = lesson("trig-identities");
  mustInclude(trigIdentities, "both shown to the nearest hundredth", "unit-circle SVG narration qualifies rounded coordinates");
  const vectors = lesson("vectors");
  mustInclude(vectors, 'magSymbol === "=" ? "equals" : "is approximately"', "vector SVG narration qualifies rounded magnitude");
  const arc = lesson("arc-length-sector");
  mustInclude(arc, "arc length approximately ${arcLen} to the nearest hundredth", "sector SVG narration qualifies rounded arc length");
});

test("reachable singular states and formal qualifiers keep mathematically grammatical language", () => {
  const fractionalVolume = lesson("volume-fractional");
  mustInclude(fractionalVolume, 'vol === 1 ? "cubic unit" : "cubic units"', "unit-cube volume uses singular at one");

  const series = lesson("geometric-series");
  mustInclude(series, 'n === 1 ? "term" : "terms"', "one-term series uses singular language");

  const randomVariables = lesson("random-variables");
  mustInclude(randomVariables, 'favorable ${WAYS[s - 2] === 1 ? "way" : "ways"} out of 36 total ways', "dice-outcome accessible name distinguishes favorable ways from total ways");

  const equations = lesson("create-equations");
  mustInclude(equations, 'miles === 1 ? "mile" : "miles"', "one-mile solution uses singular language");

  const expressions = lesson("interpret-expressions");
  mustInclude(expressions, 't === 1 ? "year" : "years"', "one-year growth state uses singular language");

  const multistep = lesson("multistep-rational");
  mustInclude(multistep, 'people === 1 ? "way" : "ways"', "one-person split uses singular language");

  const scientific = lesson("scientific-notation");
  mustInclude(scientific, 'Math.abs(e1) === 1 ? "place" : "places"', "one-place decimal shift uses singular language");
  mustInclude(scientific, 'e1 === 0', "zero exponent leaves the decimal point in place");
  mustInclude(scientific, "shift the decimal point in", "scientific-notation prose gives a grammatical decimal-shift instruction");
  mustExclude(scientific, "followed by {e1", "scientific-notation prose does not use the malformed followed-by-places construction");

  const multiplication = lesson("multiplication-rule");
  mustInclude(multiplication, 'aces - 1 === 1 ? "ace" : "aces"', "one remaining ace uses singular language");

  const division = lesson("divide-multidigit");
  mustInclude(division, 'quotient === 1 ? "batch was" : "batches were"', "one partial-quotient batch uses singular agreement");

  const arrows = lesson("integer-arrows");
  mustInclude(arrows, 'Math.abs(q) === 1 ? "unit" : "units"', "one-unit translation uses singular language");

  const trigSymmetry = lesson("trig-symmetry");
  mustInclude(trigSymmetry, "Every nonquadrantal angle has an acute first-quadrant reference", "reference-angle claim excludes quadrantal angles");
  mustInclude(trigSymmetry, "quadrantal values are read directly", "quadrantal values receive their own rule");

  const conics = lesson("conic-sections");
  mustInclude(conics, "constant absolute difference, |d₁ − d₂|", "hyperbola definition uses an absolute focal-distance difference");
  mustExclude(conics, "uses a constant difference.", "hyperbola definition is not left signed-order ambiguous");
});

test("proof, transformation, logarithm, volume, and narration claims retain required conditions", () => {
  const triangleProofs = lesson("prove-triangle-theorems");
  mustInclude(triangleProofs, "dilations or similarity", "triangle-proof overview includes its similarity method");
  mustInclude(triangleProofs, "dilation and similarity", "triangle-proof figure caption matches the available method");

  const dilations = lesson("dilations");
  mustInclude(dilations, "positive scale factor k", "dilation lesson states the positive-factor convention");
  mustInclude(dilations, "0 &lt; k &lt; 1", "dilation reduction case stays inside the stated domain");
  mustExclude(dilations, "|k|", "negative-factor behavior is not smuggled into the positive-factor lesson");

  const logarithms = lesson("logarithms");
  mustInclude(logarithms, "b > 0, b ≠ 1, and value > 0", "logarithm definition states real-domain conditions");
  mustInclude(logarithms, "For one fixed valid base b", "log product rule uses one common valid base");
  mustInclude(logarithms, "for x &gt; 0 and y &gt; 0", "log product rule states positive arguments");
  mustInclude(logarithms, "with A ≠ 0", "exponential-equation workflow requires a defined quotient");
  mustInclude(logarithms, "verify C/A &gt; 0", "exponential-equation workflow checks the logarithm input");

  const volume = lesson("volume-formulas");
  mustInclude(volume, "same base area and perpendicular height", "one-third volume comparison states both required equalities");

  mustInclude(registry, "For a nonvertical line, slope = rise ÷ run", "slope narration is nonvertical-qualified");
  mustInclude(registry, "vertical lines use vertical/horizontal criteria", "coordinate-proof narration covers vertical cases");
  mustInclude(registry, "same base and perpendicular height", "volume narration states comparison conditions");
  mustInclude(registry, "early order depends on the parameters; when a > 0 and b > 1", "growth narration states both the conditional early order and eventual-growth domain");

  const division = lesson("divide-multidigit");
  mustInclude(division, "disabled={value - 100 < min}", "minus-100 control disables instead of taking a partial step");
  mustInclude(division, "disabled={value + 100 > max}", "plus-100 control disables instead of taking a partial step");
  mustExclude(division, "Math.max(min, value - 100)", "minus-100 control does not clamp to a mislabeled partial step");

  const negatives = lesson("negative-numbers");
  mustInclude(negatives, "Zero is its own opposite. It has no positive or negative direction", "zero state does not claim two opposite directions");
  mustInclude(negatives, "when it is nonzero; zero is", "other-side definition is limited to nonzero opposites");

  const constructions = lesson("circle-constructions");
  mustInclude(constructions, "by locating special concurrence points", "concurrence claim is limited to triangle centers");
  mustInclude(constructions, "right angle between", "tangent construction uses the radius-tangent relationship instead of a concurrence point");

  const crossSections = lesson("cross-sections");
  mustInclude(crossSections, 'cut: "40,50 160,30 160,110 40,130"', "diagonal section vertices lie on opposite cube edges");
  mustInclude(crossSections, 'cut: "80,50 40,90 60,40"', "corner section vertices lie on the three incident cube edges");
  mustExclude(crossSections, 'cut: "30,40 170,40 150,120 50,120"', "diagonal cut does not protrude beyond the cube");
  mustExclude(crossSections, 'cut: "40,40 150,60 70,120"', "corner cut is not an oversized plane polygon");

  const numberSystem = lesson("rational-irrational");
  mustInclude(numberSystem, "Every real number is either", "rational/irrational dichotomy is restricted to the real number system");
  mustInclude(numberSystem, "eventually repeating a fixed block", "rational decimal definition states eventual periodicity precisely");
  mustExclude(numberSystem, "Every number is either", "complex numbers are not swept into the real-number dichotomy");

  const trig = lesson("trig-identities");
  mustInclude(trig, "For every real θ, sin²θ + cos²θ = 1", "Pythagorean identity retains its global real-angle domain");
  mustInclude(trig, "Where cos θ ≠ 0, dividing by cos²θ", "division-derived tangent identity states its nonzero-denominator condition");
  mustExclude(trig, "Dividing by cos²θ gives", "tangent identity is not derived at angles where cosine is zero");

  const identities = lesson("polynomial-identities");
  mustInclude(identities, "const pascalRowIndex = idx === 3 ? 3 : idx <= 1 ? 2 : null", "Pascal highlight follows the selected binomial degree");
  mustInclude(identities, "i === pascalRowIndex", "Pascal rendering consumes the state-dependent row");
  mustInclude(identities, "coefficient magnitudes 1, 2, 1; substituting −b creates the negative middle term", "negative binomial square explains the alternating sign");
  mustInclude(identities, "not a single binomial power, so no Pascal row is highlighted", "difference-of-squares state explains why it has no highlighted row");
  mustExclude(identities, "i === 3 ? ACCENT", "Pascal cubic row is not permanently highlighted");

  const matrixTransform = lesson("matrix-transformations");
  mustInclude(matrixTransform, "reflect across x-axis", "reflection preset names the fixed axis unambiguously");
  mustExclude(matrixTransform, 'name: "reflect x"', "reflection preset does not ambiguously describe a coordinate operation");

  const matrices = lesson("matrices");
  mustInclude(matrices, 'op === "scale"', "matrix control instructions follow the selected operation");
  mustInclude(matrices, "Use A's − and + controls to change its entries, and the scalar controls to change k.", "scale mode describes only visible controls");

  const inequalities = lesson("graph-inequalities");
  mustInclude(inequalities, "const shadeBoundary", "half-plane fill retains its clipped window boundary");
  mustInclude(inequalities, 'clipPath="url(#graph-inequalities-plot-window)"', "true inequality boundary is clipped to the plot window");
  mustInclude(inequalities, "y1={sy(yAt(-XR))}", "boundary line uses the actual left endpoint rather than a clamped value");
  mustExclude(inequalities, '<polyline points={boundary.join(" ")}', "clamped shade edge is never stroked as the mathematical boundary");

  const volumeFormulas = lesson("volume-formulas");
  mustInclude(volumeFormulas, 'solid === "sphere"', "volume-control explanation follows the selected solid");
  mustInclude(volumeFormulas, '? "the radius"', "sphere mode mentions only its visible radius control");
  mustInclude(volumeFormulas, '"the half-base and perpendicular height"', "pyramid mode names its actual controls");
  mustInclude(volumeFormulas, "const rawVol", "volume formula preserves the unrounded mathematical value");
  mustInclude(volumeFormulas, "const volRelation = relationForDisplayedValue(rawVol, vol)", "volume display distinguishes exact pyramid states from rounded pi-based values");

  const rightTriangles = lesson("solve-right-triangles");
  mustInclude(rightTriangles, "From a ground-level", "building-height model places its observation point at ground level");
  mustInclude(rightTriangles, "add the observation height to obtain the full", "eye-height measurements receive the required correction");
  mustInclude(rightTriangles, "const heightRelation = relationForDisplayedValue(rawHeight, height)", "building height distinguishes exact special angles from rounded values");
  mustInclude(rightTriangles, "const lineOfSightRelation = relationForDisplayedValue(rawLineOfSight, lineOfSight)", "line of sight selects its relation independently");

  const parallelograms = lesson("prove-parallelogram-theorems");
  mustInclude(parallelograms, '<line x1={40} y1={130} x2={200} y2={30}', "a proof diagonal is visible in every theorem state");
  mustInclude(parallelograms, "one proof diagonal drawn and two opposite sides highlighted", "side-state accessible name includes the proof construction");
  mustInclude(parallelograms, "draw both diagonals and call their", "diagonal-bisection proof uses the intersection of both diagonals");
  mustInclude(parallelograms, "so AE = CE and BE = DE", "diagonal-bisection proof reaches both midpoint equalities");
  mustExclude(parallelograms, "the key to every proof", "one diagonal is not overclaimed as sufficient for bisection");

  const exponents = lesson("exponents");
  mustInclude(exponents, "1 (any nonzero base to the 0 power)", "zero-exponent expansion excludes the undefined zero-to-zero case");
  mustExclude(exponents, "1 (any base to the 0 power)", "zero-exponent expansion does not overgeneralize to zero base");

  const series = lesson("geometric-series");
  mustInclude(series, "For r = 1, S = a·n", "equal-term case displays an unambiguous product");
  mustInclude(series, "the sum is a·n. For r ≠ 1", "series Math Check separates the exceptional case from the subtraction derivation");
  mustInclude(series, "computing rS − S", "series derivation matches the displayed algebra above it");

  const expressions = lesson("interpret-expressions");
  mustInclude(expressions, "const exactGrowth", "compound-growth result is calculated from the unrounded factor");
  mustInclude(expressions, "const growthRelation = relationForDisplayedValue(exactGrowth, growthDisplay)", "growth factor distinguishes exact one-year values from rounded powers");
  mustInclude(expressions, "const valueRelation = relationForDisplayedValue(exactValue, valueDisplay)", "compound balance distinguishes exact cents from rounded currency");
  mustInclude(expressions, "{valueRelation} <span", "compound balance renders its state-aware relation");
  mustInclude(expressions, 'value={`${growthRelation} ${growthDisplay}`}', "growth factor renders its state-aware relation");

  const equationSteps = lesson("solve-equations-steps");
  mustInclude(equationSteps, "const xDisplayRelation = solvable ? relationForDisplayedValue(x, xDisplay)", "exact fractions compare with their two-decimal form");
  mustInclude(equationSteps, 'xDisplayRelation === "=" ? "exact decimal" : "nearest hundredth"', "equation steps label terminating and rounded decimals separately");

  const symmetry = lesson("figure-symmetry");
  mustInclude(symmetry, "Number.isInteger(turnAngle)", "rotation angle distinguishes exact from rounded values");
  mustInclude(symmetry, "`≈ ${turnAngle.toFixed(2)}°`", "repeating rotation angle is marked approximate to two decimals");

  mustInclude(registry, "half the area of a parallelogram with the same base and perpendicular height", "triangle-area narration states the area relationship and geometric conditions");
  mustInclude(registry, "For the same base, add exponents when multiplying", "exponent narration states the common-base condition");
  mustInclude(registry, "for the same nonzero base, subtract when dividing", "quotient narration states the nonzero-base condition");
  mustInclude(registry, "For b > 0, see why b^(1/n) is the nth root", "rational-exponent narration follows the lesson's real-domain convention");
  mustInclude(registry, "two pairs of corresponding congruent angles prove two triangles similar by AA", "AA narration identifies corresponding angles in two triangles");
  mustInclude(registry, "same height with equal cross-sectional areas at every corresponding height", "Cavalieri narration retains both required hypotheses");

  assert.equal(
    sourceSummary("area-triangles"),
    "A triangle has half the area of a parallelogram with the same base and perpendicular height: A = ½ × base × height.",
    "triangle-area narration fix must survive registry regeneration",
  );
  assert.match(sourceSummary("integer-exponents") ?? "", /same nonzero base/, "exponent-domain fix must live in generator source");
  assert.match(sourceSummary("rational-exponents") ?? "", /^For b > 0,/, "rational-exponent domain must live in generator source");
  assert.match(sourceSummary("similarity-transformations") ?? "", /two pairs of corresponding congruent angles/, "AA conditions must live in generator source");
  assert.match(sourceSummary("volume-arguments") ?? "", /at every corresponding height/, "Cavalieri conditions must live in generator source");
  assert.match(sourceSummary("exponential-vs-linear") ?? "", /a > 0 and b > 1/, "eventual-growth domain must live in generator source");
  assert.match(sourceSummary("rational-irrational") ?? "", /eventually repeating a fixed block/, "rational-decimal precision must live in generator source");
  assert.match(sourceSummary("solve-right-triangles") ?? "", /otherwise add the observer's eye or instrument height/, "angle-of-elevation observation height must live in generator source");
  assert.match(sourceSummary("compare-functions") ?? "", /two linear functions.*y-intercept \(starting value\)/, "function-comparison feature scope must live in generator source");
  assert.match(sourceSummary("prove-parallelogram-theorems") ?? "", /Diagonals create congruent triangles/, "parallelogram proof narration must live in generator source");
  mustInclude(registry, "terminating or eventually repeating a fixed block means rational", "generated registry contains the corrected rational-decimal summary");
  mustInclude(registry, "otherwise add the observer's eye or instrument height", "generated registry contains the corrected observation-height summary");
  mustInclude(registry, "Diagonals create congruent triangles", "generated registry contains the corrected parallelogram-proof summary");
  mustInclude(narrations, "an excluded zero appears as a hole only if the reduced denominator is nonzero there", "rational-expression narration distinguishes holes from poles");
  mustInclude(narrations, "the point remains a vertical asymptote or pole", "rational-expression narration retains nonremovable exclusions");
  mustInclude(sourceText, '"prompt": "A hyperbola uses a constant ___ of the distances to two foci."', "hyperbola checkpoint source remains regeneration-safe");
  mustInclude(sourceText, '"absolute difference"', "hyperbola checkpoint source uses the absolute difference");
  mustInclude(sourceText, '"prompt": "A non-unit dilation changes a figure\'s size but keeps its…"', "dilation checkpoint condition remains regeneration-safe");
  mustInclude(sourceText, '"prompt": "Holding the confidence level and population variability fixed, as sample size increases, the margin of error…"', "margin-of-error conditions remain regeneration-safe");
  mustInclude(sourceText, '"prompt": "The graph of f⁻¹ is the graph of f reflected across…"', "inverse-function checkpoint grammar remains regeneration-safe");
  mustInclude(sourceText, '"prompt": "For the linear functions in this lesson, compare the formula and table using their…"', "function-comparison checkpoint remains limited to linear features");
  mustInclude(sourceText, '"rate of change and y-intercept (starting value)"', "function-comparison checkpoint names the matched linear features");
  mustInclude(sourceText, '"prompt": "Drawing the altitude from a right triangle\'s right-angle vertex to its hypotenuse creates two triangles that are…"', "right-triangle similarity checkpoint names the required altitude");
});
