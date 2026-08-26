function requirePairs(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0 || pairs.some((pair) => !pair
    || typeof pair.a !== "string" || pair.a.length === 0
    || typeof pair.b !== "string" || pair.b.length === 0)) {
    throw new TypeError("reference agreement requires nonempty categorical A/B pairs");
  }
}

function round(value) { return value === null ? null : Number(value.toFixed(12)); }

export function computeReferenceAgreementV5R5(pairs) {
  requirePairs(pairs);
  const categories = [...new Set(pairs.flatMap(({ a, b }) => [a, b]))].sort();
  const rawAgreement = pairs.filter(({ a, b }) => a === b).length / pairs.length;
  const leftRate = new Map(categories.map((category) => [category, pairs.filter(({ a }) => a === category).length / pairs.length]));
  const rightRate = new Map(categories.map((category) => [category, pairs.filter(({ b }) => b === category).length / pairs.length]));
  const expectedKappa = categories.reduce((sum, category) => sum + leftRate.get(category) * rightRate.get(category), 0);
  const averageRate = categories.map((category) => (leftRate.get(category) + rightRate.get(category)) / 2);
  const expectedAc1 = categories.length <= 1
    ? 0
    : averageRate.reduce((sum, rate) => sum + rate * (1 - rate), 0) / (categories.length - 1);
  const cohenKappa = categories.length < 2
    ? null
    : expectedKappa === 1 ? null : (rawAgreement - expectedKappa) / (1 - expectedKappa);
  const gwetAc1 = expectedAc1 === 1 ? null : (rawAgreement - expectedAc1) / (1 - expectedAc1);
  return Object.freeze({
    pairCount: pairs.length,
    categoryCount: categories.length,
    categories: Object.freeze(categories),
    rawAgreement: round(rawAgreement),
    cohenKappa: round(cohenKappa),
    gwetAc1: round(gwetAc1),
    degenerateKappaDisposition: categories.length < 2 ? "NULL_SINGLE_CATEGORY" : "DEFINED",
  });
}
