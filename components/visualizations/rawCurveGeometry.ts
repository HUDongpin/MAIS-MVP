export type FunctionModelKey = "polynomial" | "exponential" | "logarithmic";

function mapLinear(value: number, min: number, max: number, screenMin: number, screenMax: number) {
  return screenMin + ((value - min) / (max - min)) * (screenMax - screenMin);
}

function buildSampledPath({
  count,
  xMin,
  xMax,
  evaluate,
  mapX,
  mapY
}: {
  count: number;
  xMin: number;
  xMax: number;
  evaluate: (x: number) => number;
  mapX: (x: number) => number;
  mapY: (y: number) => number;
}) {
  return Array.from({ length: count }, (_, index) => xMin + (index / (count - 1)) * (xMax - xMin))
    .map((x, index) => {
      const y = evaluate(x);
      return `${index === 0 ? "M" : "L"} ${mapX(x).toFixed(2)} ${mapY(y).toFixed(2)}`;
    })
    .join(" ");
}

export function evaluateCalculusCubic(x: number) {
  return 0.12 * x ** 3 - 0.6 * x ** 2 + x + 1;
}

export function buildCalculusTangentCurvePath() {
  const width = 640;
  const height = 420;
  const padding = 42;
  const xMin = -4;
  const xMax = 6;
  const yMin = -9;
  const yMax = 9;

  return buildSampledPath({
    count: 180,
    xMin,
    xMax,
    evaluate: evaluateCalculusCubic,
    mapX: (x) => mapLinear(x, xMin, xMax, padding, width - padding),
    mapY: (y) => mapLinear(y, yMin, yMax, height - padding, padding)
  });
}

export function buildQuadraticCurvePath(a: number, b: number, c: number) {
  const width = 640;
  const height = 420;
  const padding = 36;
  const xMin = -8;
  const xMax = 8;
  const yMin = -10;
  const yMax = 10;

  return buildSampledPath({
    count: 180,
    xMin,
    xMax,
    evaluate: (x) => a * x * x + b * x + c,
    mapX: (x) => mapLinear(x, xMin, xMax, padding, width - padding),
    mapY: (y) => mapLinear(y, yMin, yMax, height - padding, padding)
  });
}

export function evaluateFunctionModel(model: FunctionModelKey, x: number, strength: number, shift: number) {
  if (model === "polynomial") return 0.14 * strength * (x - 4) ** 2 + shift;
  if (model === "exponential") return Math.exp(0.22 * strength * x) - 1 + shift;
  return 3.2 * Math.log(strength * x + 1) + shift;
}

export function buildFunctionModelPath(model: FunctionModelKey, strength: number, shift: number) {
  const width = 640;
  const height = 420;
  const padding = 40;
  const xMin = 0;
  const xMax = 10;
  const yMin = -4;
  const yMax = 14;

  return buildSampledPath({
    count: 180,
    xMin,
    xMax,
    evaluate: (x) => evaluateFunctionModel(model, x, strength, shift),
    mapX: (x) => mapLinear(x, xMin, xMax, padding, width - padding),
    mapY: (y) => mapLinear(y, yMin, yMax, height - padding, padding)
  });
}
