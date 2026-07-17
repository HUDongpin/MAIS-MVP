export type MathSceneWindowEventType = "close" | "focus" | "hide" | "resize" | "show";

export const SCENE_WINDOW_EVENT_SOURCE_CONTRACT =
  "Scene.on_resize/on_show/on_hide/on_close pass hooks; Scene.focus returns without window or calls window.focus()" as const;

export type MathSceneWindowEventPlan = {
  callsWindowFocus: boolean;
  eventType: MathSceneWindowEventType;
  hasWindow: boolean;
  height: number;
  noOp: boolean;
  returnedEarly: boolean;
  sourceContract: typeof SCENE_WINDOW_EVENT_SOURCE_CONTRACT;
  summary: string;
  width: number;
  windowEventVersion: "mais-manim-window-events/v1";
};

export type MathSceneWindowEventInput = {
  eventType: MathSceneWindowEventType;
  hasWindow?: boolean;
  height?: number;
  width?: number;
};

function finiteDimension(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
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

function buildSummary(plan: Omit<MathSceneWindowEventPlan, "summary" | "windowEventVersion">) {
  return [
    `windowEvent:${plan.eventType}`,
    `noop=${String(plan.noOp)}`,
    `focus=${String(plan.callsWindowFocus)}`,
    `window=${String(plan.hasWindow)}`
  ].join(":");
}

// Manim source contract:
// - on_resize(width, height), on_show(), on_hide(), and on_close() are pass
//   hooks in Scene.
// - focus() returns when no window exists; otherwise it calls window.focus().
export function buildSceneWindowEventPlan(input: MathSceneWindowEventInput): MathSceneWindowEventPlan {
  const eventType = input.eventType;
  const hasWindow = input.hasWindow ?? true;
  const noOp = eventType !== "focus";
  const callsWindowFocus = eventType === "focus" && hasWindow;
  const returnedEarly = eventType === "focus" && !hasWindow;
  const basePlan = {
    callsWindowFocus,
    eventType,
    hasWindow,
    height: finiteDimension(input.height),
    noOp,
    returnedEarly,
    sourceContract: SCENE_WINDOW_EVENT_SOURCE_CONTRACT,
    width: finiteDimension(input.width)
  };

  return {
    ...basePlan,
    summary: buildSummary(basePlan),
    windowEventVersion: "mais-manim-window-events/v1"
  };
}

export function sceneWindowEventDataAttributes(plan: MathSceneWindowEventPlan): Record<string, string> {
  return {
    "data-viz-manim-window-calls-focus": String(plan.callsWindowFocus),
    "data-viz-manim-window-event-type": plan.eventType,
    "data-viz-manim-window-has-window": String(plan.hasWindow),
    "data-viz-manim-window-height": String(plan.height),
    "data-viz-manim-window-no-op": String(plan.noOp),
    "data-viz-manim-window-returned-early": String(plan.returnedEarly),
    "data-viz-manim-window-source-contract": plan.sourceContract,
    "data-viz-manim-window-summary": plan.summary,
    "data-viz-manim-window-width": String(plan.width)
  };
}

export function serializeSceneWindowEventPlan(plan: MathSceneWindowEventPlan) {
  return stableSerialize(plan);
}
