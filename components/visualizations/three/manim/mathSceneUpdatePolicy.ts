import type { MathUpdaterRegistry } from "./mathUpdaterRegistry";

export const SCENE_UPDATE_POLICY_SOURCE_CONTRACT =
  "Scene.should_update_mobjects: always_update_mobjects or any(mob.has_updaters())" as const;

export type MathSceneUpdatePolicyReason = "always-update-mobjects" | "has-updaters" | "idle";

export type MathSceneUpdatePolicy = {
  alwaysUpdateMobjects: boolean;
  forceDraw: boolean;
  hasUpdaters: boolean;
  reason: MathSceneUpdatePolicyReason;
  shouldCaptureFrame: boolean;
  shouldUpdateMobjects: boolean;
  skipAnimations: boolean;
  sourceContract: typeof SCENE_UPDATE_POLICY_SOURCE_CONTRACT;
  summary: string;
  updaterCount: number;
};

export type MathSceneUpdatePolicyInput = {
  alwaysUpdateMobjects?: boolean;
  forceDraw?: boolean;
  skipAnimations?: boolean;
  updaterRegistry: MathUpdaterRegistry;
};

function reasonForPolicy(alwaysUpdateMobjects: boolean, hasUpdaters: boolean): MathSceneUpdatePolicyReason {
  if (alwaysUpdateMobjects) return "always-update-mobjects";
  if (hasUpdaters) return "has-updaters";
  return "idle";
}

function policySummary(policy: Omit<MathSceneUpdatePolicy, "summary">) {
  return [
    `updatePolicy:update=${String(policy.shouldUpdateMobjects)}`,
    `capture=${String(policy.shouldCaptureFrame)}`,
    `reason=${policy.reason}`,
    `updaters=${policy.updaterCount}`
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

// Manim source contract: Scene.should_update_mobjects returns
// always_update_mobjects or any(mob.has_updaters() for mob in self.mobjects).
export function buildSceneUpdatePolicy(input: MathSceneUpdatePolicyInput): MathSceneUpdatePolicy {
  const updaterCount = input.updaterRegistry.entries.length;
  const alwaysUpdateMobjects = input.alwaysUpdateMobjects === true;
  const forceDraw = input.forceDraw === true;
  const hasUpdaters = updaterCount > 0;
  const skipAnimations = input.skipAnimations === true;
  const shouldUpdateMobjects = alwaysUpdateMobjects || hasUpdaters;
  const shouldCaptureFrame = !skipAnimations || forceDraw;
  const basePolicy = {
    alwaysUpdateMobjects,
    forceDraw,
    hasUpdaters,
    reason: reasonForPolicy(alwaysUpdateMobjects, hasUpdaters),
    shouldCaptureFrame,
    shouldUpdateMobjects,
    skipAnimations,
    sourceContract: SCENE_UPDATE_POLICY_SOURCE_CONTRACT,
    updaterCount
  };

  return {
    ...basePolicy,
    summary: policySummary(basePolicy)
  };
}

export function sceneUpdatePolicyDataAttributes(policy: MathSceneUpdatePolicy): Record<string, string> {
  return {
    "data-viz-manim-always-update-mobjects": String(policy.alwaysUpdateMobjects),
    "data-viz-manim-force-draw": String(policy.forceDraw),
    "data-viz-manim-has-updaters": String(policy.hasUpdaters),
    "data-viz-manim-should-capture-frame": String(policy.shouldCaptureFrame),
    "data-viz-manim-should-update-mobjects": String(policy.shouldUpdateMobjects),
    "data-viz-manim-skip-animations": String(policy.skipAnimations),
    "data-viz-manim-update-policy-reason": policy.reason,
    "data-viz-manim-update-policy-source-contract": policy.sourceContract,
    "data-viz-manim-update-policy-summary": policy.summary,
    "data-viz-manim-updater-count": String(policy.updaterCount)
  };
}

export function serializeSceneUpdatePolicy(policy: MathSceneUpdatePolicy) {
  return stableSerialize(policy);
}
