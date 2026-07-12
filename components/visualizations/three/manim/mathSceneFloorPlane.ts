export type MathSceneFloorPlaneEulerAxes = "zxz" | "zxy";

export const SCENE_FLOOR_PLANE_SOURCE_CONTRACT =
  "Scene.set_floor_plane: xy->frame.set_euler_axes(zxz), xz->frame.set_euler_axes(zxy), invalid planes raise" as const;

export type MathSceneFloorPlanePlan = {
  errorMessage: string | null;
  eulerAxes: MathSceneFloorPlaneEulerAxes | null;
  floorPlaneVersion: "mais-manim-floor-plane/v1";
  plane: string;
  raisesError: boolean;
  sourceContract: typeof SCENE_FLOOR_PLANE_SOURCE_CONTRACT;
  summary: string;
  valid: boolean;
};

export type MathSceneFloorPlaneInput = {
  plane?: string;
};

const invalidFloorPlaneMessage = "Only `xz` and `xy` are valid floor planes";

function requestedPlane(value: string | undefined) {
  return value ?? "xy";
}

function eulerAxesForPlane(plane: string): MathSceneFloorPlaneEulerAxes | null {
  if (plane === "xy") return "zxz";
  if (plane === "xz") return "zxy";
  return null;
}

function buildSummary(plan: Omit<MathSceneFloorPlanePlan, "floorPlaneVersion" | "summary">) {
  return [
    `floorPlane:${plan.plane}`,
    `euler=${plan.eulerAxes ?? "none"}`,
    `valid=${String(plan.valid)}`
  ].join(":");
}

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// Manim source contract:
// - Scene.set_floor_plane("xy") calls frame.set_euler_axes("zxz").
// - Scene.set_floor_plane("xz") calls frame.set_euler_axes("zxy").
// - Any other plane raises "Only `xz` and `xy` are valid floor planes".
export function buildSceneFloorPlanePlan(input: MathSceneFloorPlaneInput = {}): MathSceneFloorPlanePlan {
  const plane = requestedPlane(input.plane);
  const eulerAxes = eulerAxesForPlane(plane);
  const valid = eulerAxes !== null;
  const basePlan = {
    errorMessage: valid ? null : invalidFloorPlaneMessage,
    eulerAxes,
    plane,
    raisesError: !valid,
    sourceContract: SCENE_FLOOR_PLANE_SOURCE_CONTRACT,
    valid
  };

  return {
    ...basePlan,
    floorPlaneVersion: "mais-manim-floor-plane/v1",
    summary: buildSummary(basePlan)
  };
}

export function sceneFloorPlaneDataAttributes(plan: MathSceneFloorPlanePlan): Record<string, string> {
  return {
    "data-viz-manim-floor-plane": plan.plane,
    "data-viz-manim-floor-plane-error": plan.errorMessage ?? "none",
    "data-viz-manim-floor-plane-euler-axes": plan.eulerAxes ?? "none",
    "data-viz-manim-floor-plane-raises-error": String(plan.raisesError),
    "data-viz-manim-floor-plane-source-contract": plan.sourceContract,
    "data-viz-manim-floor-plane-summary": plan.summary,
    "data-viz-manim-floor-plane-valid": String(plan.valid)
  };
}

export function serializeSceneFloorPlanePlan(plan: MathSceneFloorPlanePlan) {
  return stableSerialize(plan);
}
