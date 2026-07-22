// Pure single-variable statistics for the calculator's STAT mode. Given a list of
// data points, returns count, sum, mean, and both population (σₙ, ÷n) and sample
// (σₙ₋₁, ÷n-1) standard deviations, plus min/max. Kept separate from the UI so the
// formulas are unit-tested. Sample SD is NaN for n < 2 (undefined), which the UI
// renders as "—".

export type StatisticsSummary = {
  count: number;
  sum: number;
  mean: number;
  populationStdDev: number;
  sampleStdDev: number;
  min: number;
  max: number;
};

export function computeStatistics(values: number[]): StatisticsSummary | null {
  const clean = values.filter((value) => Number.isFinite(value));
  const count = clean.length;
  if (count === 0) return null;

  const sum = clean.reduce((total, value) => total + value, 0);
  const mean = sum / count;
  const sumSquaredDeviations = clean.reduce((total, value) => total + (value - mean) ** 2, 0);

  return {
    count,
    sum,
    mean,
    populationStdDev: Math.sqrt(sumSquaredDeviations / count),
    sampleStdDev: count > 1 ? Math.sqrt(sumSquaredDeviations / (count - 1)) : Number.NaN,
    min: Math.min(...clean),
    max: Math.max(...clean)
  };
}

export type DataPoint = { x: number; y: number };

// Least-squares linear regression y = intercept + slope·x over (x, y) pairs, plus
// the Pearson correlation r. Needs ≥ 2 finite points; slope/correlation are NaN
// when x has no spread (a vertical set), which the UI renders as "—".
export type RegressionSummary = {
  count: number;
  meanX: number;
  meanY: number;
  slope: number;
  intercept: number;
  correlation: number;
};

export function computeRegression(points: DataPoint[]): RegressionSummary | null {
  const clean = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  const count = clean.length;
  if (count < 2) return null;

  const meanX = clean.reduce((total, point) => total + point.x, 0) / count;
  const meanY = clean.reduce((total, point) => total + point.y, 0) / count;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const point of clean) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  const slope = sxx === 0 ? Number.NaN : sxy / sxx;
  return {
    count,
    meanX,
    meanY,
    slope,
    intercept: sxx === 0 ? Number.NaN : meanY - slope * meanX,
    correlation: sxx === 0 || syy === 0 ? Number.NaN : sxy / Math.sqrt(sxx * syy)
  };
}
