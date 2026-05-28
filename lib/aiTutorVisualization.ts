export type AITutorFunctionGraphVisualization = {
  tool: "show_function_graph";
  parameters: {
    a: number;
    b: number;
    c: number;
  };
};

export type AITutorVisualization = AITutorFunctionGraphVisualization;

const allowedVisualizationKeys = new Set(["tool", "parameters"]);
const allowedParameterKeys = new Set(["a", "b", "c"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: Set<string>) {
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeAITutorVisualization(value: unknown): AITutorVisualization | undefined {
  if (!isRecord(value) || !hasOnlyKeys(value, allowedVisualizationKeys)) return undefined;
  if (value.tool !== "show_function_graph" || !isRecord(value.parameters)) return undefined;
  if (!hasOnlyKeys(value.parameters, allowedParameterKeys)) return undefined;

  const { a, b, c } = value.parameters;
  if (!isFiniteNumber(a) || !isFiniteNumber(b) || !isFiniteNumber(c)) return undefined;
  if (Math.abs(a) < 0.0001) return undefined;
  if (a < -3 || a > 3 || b < -6 || b > 6 || c < -8 || c > 8) return undefined;

  return {
    tool: "show_function_graph",
    parameters: { a, b, c }
  };
}
