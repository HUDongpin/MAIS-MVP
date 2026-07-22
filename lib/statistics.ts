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
