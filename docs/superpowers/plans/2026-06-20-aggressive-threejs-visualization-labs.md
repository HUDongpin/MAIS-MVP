# Aggressive Three.js Visualization Labs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the MAIS Visualization Lab system to a Three.js-first architecture covering every current template, 24-28 reusable 3D families, and an 80-100 page premium/deep topic subset.

**Architecture:** Add a shared React Three Fiber canvas shell, typed 3D family registry, deterministic math-state builders, and family scene modules under `components/visualizations/three/`. Wire `ConfiguredVisualizationLab.tsx` to render Three.js when a family is ready while preserving existing SVG/React surfaces as fallback. Mark premium/deep regional pages through catalog metadata without shrinking the existing broad catalog.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, Three.js, @react-three/fiber, @react-three/drei, Tailwind CSS, existing Visualization Lab diagnostics, Playwright, Node test runner.

---

## Coordination Rules

- Session owner: S06 Visualization lead.
- Downstream gates: S18 curriculum QA, S11 regression QA, S22 release engineering.
- Do not stage, commit, branch, merge, rebase, push, reset, clean, delete, or revert files unless the owner explicitly assigns that exact Git operation.
- The older California-only plan at `docs/superpowers/plans/2026-06-20-california-3d-visualization-labs.md` is narrower and contains stale dependency evidence. This master plan supersedes it for the aggressive all-template migration.
- Keep existing SVG/React renderers until a Three.js family passes tests and browser evidence.

## File Structure

- Create: `components/visualizations/three/threeDSceneTypes.ts`
  - Owns `ThreeDFamilyId`, family metadata, coverage tier, scene props, and shared math-state types.
- Create: `components/visualizations/three/threeDSceneMath.ts`
  - Owns deterministic family mapping, premium launch selection helpers, and finite state summary builders.
- Create: `components/visualizations/three/threeDSceneMath.test.ts`
  - Node tests for family count, template coverage, regional premium counts, and finite state summaries.
- Create: `components/visualizations/three/ThreeDLabCanvas.tsx`
  - Shared R3F canvas shell, WebGL check, camera/lights, fallback, canvas readiness attributes, and keyboard reset.
- Create: `components/visualizations/three/ThreeDLabSceneRegistry.tsx`
  - Maps family IDs to scene components and exports readiness helpers.
- Create: `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx`
  - First-pass Three.js scene family renderer with distinct geometry strategies per family group.
- Modify: `components/visualizations/ConfiguredVisualizationLab.tsx`
  - Bridges existing lab state to `ThreeDLabCanvas` when a family is ready.
- Modify: `data/visualizationLabs.ts`
  - Adds optional Three.js metadata to lab definitions and marks premium/deep launch pages.
- Modify with S11 coordination: `tests/e2e/visualization-values.spec.ts`
  - Adds targeted Three.js renderer contract assertions for one family per phase.
- Modify with S11 coordination: `tests/e2e/visualization-overlap.spec.ts`
  - Ensures Three.js surfaces do not overlap controls on desktop/mobile.
- Append: `coordination/session-logs/2026-06-20-S06.md`
  - Records plan completion, checks, skipped checks, and next execution choice.

## Family Set

The implementation must expose exactly these 26 family IDs:

```ts
export const threeDFamilyIds = [
  "three-number-line",
  "three-base-ten-blocks",
  "three-array-area-blocks",
  "three-fraction-slices",
  "three-clock-money-data",
  "three-measurement-scale",
  "three-angle-geometry",
  "three-right-triangle-pythagorean",
  "three-coordinate-transform",
  "three-equation-balance",
  "three-function-graph",
  "three-function-family",
  "three-complex-plane",
  "three-trig-unit-wave",
  "three-probability-machine",
  "three-statistics-distribution",
  "three-calculus-rate-area",
  "three-vector-conic-strategy",
  "three-solid-nets-folding",
  "three-cross-section-slicer",
  "three-space-vectors-lines-planes",
  "three-conic-sections-deep",
  "three-optimization-modeling",
  "three-statistical-inference-lab",
  "three-curriculum-crosswalk-map",
  "three-exam-strategy-capstone"
] as const;
```

## Task 1: Baseline And Failing Family-Math Tests

**Files:**
- Create: `components/visualizations/three/threeDSceneMath.test.ts`
- Read: `data/visualizationLabs.ts`
- Read: `docs/superpowers/specs/2026-06-20-aggressive-threejs-visualization-labs-design.md`

- [ ] **Step 1: Record current scoped Git state**

Run:

```bash
git status --short -- components/visualizations/three components/visualizations/ConfiguredVisualizationLab.tsx data/visualizationLabs.ts tests/e2e/visualization-values.spec.ts tests/e2e/visualization-overlap.spec.ts docs/superpowers/plans docs/superpowers/specs coordination/session-logs/2026-06-20-S06.md
```

Expected: prints current dirty state. Do not stage, commit, reset, clean, or revert unrelated work.

- [ ] **Step 2: Write failing tests for the family registry**

Create `components/visualizations/three/threeDSceneMath.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import type { ThreeDRegionalPriority } from "./threeDSceneTypes";
import {
  buildThreeDStateSummary,
  familyForVisualizationTemplate,
  isPremiumThreeDLaunchLab,
  premiumThreeDLaunchLabIds,
  regionalPriorityForThreeDLaunchLab,
  threeDFamilyIds,
  threeDTemplateFamilyMap
} from "./threeDSceneMath";

test("maps all existing visualization templates to Three.js families", () => {
  assert.equal(Object.keys(threeDTemplateFamilyMap).length, 18);
  assert.equal(threeDTemplateFamilyMap["number-line"], "three-number-line");
  assert.equal(threeDTemplateFamilyMap["base-ten"], "three-base-ten-blocks");
  assert.equal(threeDTemplateFamilyMap["array-area"], "three-array-area-blocks");
  assert.equal(threeDTemplateFamilyMap["fraction-bar"], "three-fraction-slices");
  assert.equal(threeDTemplateFamilyMap["clock-money-data"], "three-clock-money-data");
  assert.equal(threeDTemplateFamilyMap["measurement-scale"], "three-measurement-scale");
  assert.equal(threeDTemplateFamilyMap["angle-geometry"], "three-angle-geometry");
  assert.equal(threeDTemplateFamilyMap["right-triangle-pythagorean"], "three-right-triangle-pythagorean");
  assert.equal(threeDTemplateFamilyMap["coordinate-transform"], "three-coordinate-transform");
  assert.equal(threeDTemplateFamilyMap["equation-balance"], "three-equation-balance");
  assert.equal(threeDTemplateFamilyMap["function-graph"], "three-function-graph");
  assert.equal(threeDTemplateFamilyMap["function-family"], "three-function-family");
  assert.equal(threeDTemplateFamilyMap["complex-plane"], "three-complex-plane");
  assert.equal(threeDTemplateFamilyMap["trig-unit-wave"], "three-trig-unit-wave");
  assert.equal(threeDTemplateFamilyMap["probability-simulation"], "three-probability-machine");
  assert.equal(threeDTemplateFamilyMap["statistics-distribution"], "three-statistics-distribution");
  assert.equal(threeDTemplateFamilyMap["calculus-rate-area"], "three-calculus-rate-area");
  assert.equal(threeDTemplateFamilyMap["vector-conic-3d/strategy-map"], "three-vector-conic-strategy");
});

test("exposes 26 total Three.js families", () => {
  assert.equal(threeDFamilyIds.length, 26);
  assert.equal(new Set(threeDFamilyIds).size, 26);
});

test("returns finite math summaries for every family", () => {
  for (const familyId of threeDFamilyIds) {
    const summary = buildThreeDStateSummary({
      comparison: 7,
      familyId,
      mode: 1,
      templateId: "function-family",
      value: 6
    });

    assert.equal(summary.familyId, familyId);
    assert.ok(Number.isFinite(summary.primaryValue));
    assert.ok(Number.isFinite(summary.secondaryValue));
    assert.ok(Number.isFinite(summary.depthValue));
    assert.match(summary.stateSummary, /^family=/);
  }
});

test("selects the approved regional premium launch bands", () => {
  const counts: Record<ThreeDRegionalPriority, number> = {
    mainland: 0,
    california: 0,
    "hong-kong": 0,
    "cross-region": 0
  };

  assert.equal(premiumThreeDLaunchLabIds.size, 80);

  for (const labId of premiumThreeDLaunchLabIds) {
    const region = regionalPriorityForThreeDLaunchLab(labId);
    assert.ok(region, `${labId} should have a premium launch region`);
    counts[region] += 1;
    assert.equal(isPremiumThreeDLaunchLab(labId), true);
  }

  assert.deepEqual(counts, {
    mainland: 40,
    california: 12,
    "hong-kong": 9,
    "cross-region": 19
  });

  assert.equal(isPremiumThreeDLaunchLab("pep-high-s5-conics"), true);
  assert.equal(isPremiumThreeDLaunchLab("us-ca-math-s6-chapter-05"), true);
  assert.equal(isPremiumThreeDLaunchLab("calculus"), true);
  assert.equal(isPremiumThreeDLaunchLab("capstone-hk-mainland-crosswalk-explorer"), true);
  assert.equal(isPremiumThreeDLaunchLab("p1-counting-number-bonds"), false);
});

test("looks up fallback family for a template", () => {
  assert.equal(familyForVisualizationTemplate("calculus-rate-area"), "three-calculus-rate-area");
  assert.equal(familyForVisualizationTemplate("vector-conic-3d/strategy-map"), "three-vector-conic-strategy");
});
```

- [ ] **Step 3: Run the failing test**

Run:

```bash
rm -rf .tmp/three-scene-tests
tsc -p tsconfig.json --outDir .tmp/three-scene-tests --noEmit false --incremental false --module commonjs --moduleResolution node
node --test .tmp/three-scene-tests/components/visualizations/three/threeDSceneMath.test.js
```

Expected: compile or test fails because `./threeDSceneMath` does not exist.

## Task 2: Add Three.js Family Types And Deterministic Math

**Files:**
- Create: `components/visualizations/three/threeDSceneTypes.ts`
- Create: `components/visualizations/three/threeDSceneMath.ts`
- Test: `components/visualizations/three/threeDSceneMath.test.ts`

- [ ] **Step 1: Create shared Three.js scene types**

Create `components/visualizations/three/threeDSceneTypes.ts`:

```ts
import type { ReactNode } from "react";
import type { VisualizationTemplateId } from "@/data/visualizationLabs";

export const threeDFamilyIds = [
  "three-number-line",
  "three-base-ten-blocks",
  "three-array-area-blocks",
  "three-fraction-slices",
  "three-clock-money-data",
  "three-measurement-scale",
  "three-angle-geometry",
  "three-right-triangle-pythagorean",
  "three-coordinate-transform",
  "three-equation-balance",
  "three-function-graph",
  "three-function-family",
  "three-complex-plane",
  "three-trig-unit-wave",
  "three-probability-machine",
  "three-statistics-distribution",
  "three-calculus-rate-area",
  "three-vector-conic-strategy",
  "three-solid-nets-folding",
  "three-cross-section-slicer",
  "three-space-vectors-lines-planes",
  "three-conic-sections-deep",
  "three-optimization-modeling",
  "three-statistical-inference-lab",
  "three-curriculum-crosswalk-map",
  "three-exam-strategy-capstone"
] as const;

export type ThreeDFamilyId = (typeof threeDFamilyIds)[number];
export type ThreeDCoverageTier = "standard-3d" | "premium-3d" | "capstone-3d";
export type ThreeDRegionalPriority = "mainland" | "california" | "hong-kong" | "cross-region";

export type ThreeDVisualizationMetadata = {
  enabled: boolean;
  fallbackTemplateId: VisualizationTemplateId;
  familyId: ThreeDFamilyId;
  coverageTier: ThreeDCoverageTier;
  premiumLaunch?: boolean;
  regionalPriority?: ThreeDRegionalPriority;
};

export type ThreeDControlState = {
  comparison: number;
  mode: number;
  templateId: VisualizationTemplateId;
  value: number;
};

export type ThreeDStateSummary = ThreeDControlState & {
  depthValue: number;
  familyId: ThreeDFamilyId;
  primaryValue: number;
  secondaryValue: number;
  stateSummary: string;
};

export type ThreeDSceneProps = {
  accent: string;
  state: ThreeDStateSummary;
};

export type ThreeDLabCanvasProps = {
  accent: string;
  fallback: ReactNode;
  label: string;
  state: ThreeDStateSummary;
};
```

- [ ] **Step 2: Create family mapping and state summaries**

Create `components/visualizations/three/threeDSceneMath.ts`:

```ts
import type { VisualizationTemplateId } from "@/data/visualizationLabs";
import {
  threeDFamilyIds,
  type ThreeDControlState,
  type ThreeDFamilyId,
  type ThreeDRegionalPriority,
  type ThreeDStateSummary
} from "./threeDSceneTypes";

export { threeDFamilyIds };

export const threeDTemplateFamilyMap: Record<VisualizationTemplateId, ThreeDFamilyId> = {
  "number-line": "three-number-line",
  "base-ten": "three-base-ten-blocks",
  "array-area": "three-array-area-blocks",
  "fraction-bar": "three-fraction-slices",
  "clock-money-data": "three-clock-money-data",
  "measurement-scale": "three-measurement-scale",
  "angle-geometry": "three-angle-geometry",
  "right-triangle-pythagorean": "three-right-triangle-pythagorean",
  "coordinate-transform": "three-coordinate-transform",
  "equation-balance": "three-equation-balance",
  "function-graph": "three-function-graph",
  "function-family": "three-function-family",
  "complex-plane": "three-complex-plane",
  "trig-unit-wave": "three-trig-unit-wave",
  "probability-simulation": "three-probability-machine",
  "statistics-distribution": "three-statistics-distribution",
  "calculus-rate-area": "three-calculus-rate-area",
  "vector-conic-3d/strategy-map": "three-vector-conic-strategy"
};

export const threeDLaunchRegionByLabId: Partial<Record<string, ThreeDRegionalPriority>> = {
  "hjb-high-s6-三角-向量与解析几何综合": "mainland",
  "hjb-high-s6-圆锥曲线综合复习": "mainland",
  "hjb-high-s6-空间向量综合复习": "mainland",
  "hjb-high-s6-立体几何与空间向量综合": "mainland",
  "pep-high-s6-analytic-geometry-synthesis": "mainland",
  "bnu-high-s5-圆锥曲线": "mainland",
  "bnu-high-s5-数学建模活动-三": "mainland",
  "bnu-high-s5-空间向量与立体几何": "mainland",
  "hjb-high-s5-圆锥曲线": "mainland",
  "hjb-high-s5-空间向量及其应用": "mainland",
  "hjb-high-s5-空间直线与平面": "mainland",
  "hjb-high-s5-简单几何体": "mainland",
  "pep-high-s5-conics": "mainland",
  "pep-high-s5-space-vectors": "mainland",
  "bnu-high-s4-平面向量及其应用": "mainland",
  "bnu-high-s4-立体几何初步": "mainland",
  "hjb-high-s4-平面向量": "mainland",
  "pep-high-s4-plane-vectors": "mainland",
  "pep-high-s4-solid-geometry-intro": "mainland",
  "bnu-junior-s3-upper-projection-views": "mainland",
  "bnu-high-s4-复数": "mainland",
  "hjb-high-s4-复数": "mainland",
  "pep-high-s4-complex-numbers": "mainland",
  "bnu-high-s6-导数及其应用": "mainland",
  "bnu-high-s6-高三数列与导数综合复习": "mainland",
  "hjb-high-s6-函数-导数与不等式综合": "mainland",
  "hjb-high-s6-导数及其运用": "mainland",
  "pep-high-s6-derivative-synthesis": "mainland",
  "bnu-junior-s1-upper-spatial-figures": "mainland",
  "pep-high-s5-derivatives": "mainland",
  "bnu-primary-p6-lower-cylinders-cones": "mainland",
  "hjb-primary-p6-lower-cylinder-cone": "mainland",
  "bnu-high-s4-三角函数": "mainland",
  "bnu-high-s4-三角恒等变换": "mainland",
  "bnu-high-s4-数学建模活动-二": "mainland",
  "hjb-high-s4-三角": "mainland",
  "hjb-high-s4-三角函数": "mainland",
  "pep-high-s4-trigonometry": "mainland",
  "bnu-junior-s3-lower-right-triangle-trigonometry": "mainland",
  "hjb-junior-s3-upper-acute-trigonometry": "mainland",
  "us-ca-math-s6-chapter-05": "california",
  "us-ca-math-s5-chapter-03": "california",
  "us-ca-math-s2-chapter-02": "california",
  "us-ca-math-s4-chapter-04": "california",
  "us-ca-math-s6-chapter-02": "california",
  "us-ca-math-s6-chapter-04": "california",
  "us-ca-math-s5-chapter-01": "california",
  "us-ca-math-s5-chapter-02": "california",
  "us-ca-math-s3-chapter-03": "california",
  "us-ca-math-s3-chapter-02": "california",
  "us-ca-math-s4-chapter-05": "california",
  "us-ca-math-s6-chapter-03": "california",
  "calculus": "hong-kong",
  "differentiation-intro": "hong-kong",
  "trigonometry-s5": "hong-kong",
  "trigonometry-basics": "hong-kong",
  "mixed-problem-solving": "hong-kong",
  "advanced-functions": "hong-kong",
  "quadratic-patterns": "hong-kong",
  "functions": "hong-kong",
  "probability-s5": "hong-kong",
  "capstone-senior-function-calculus-stats-bridge": "cross-region",
  "capstone-hk-mainland-crosswalk-explorer": "cross-region",
  "capstone-junior-algebra-geometry-bridge": "cross-region",
  "capstone-primary-number-sense-bridge": "cross-region",
  "capstone-primary-measurement-proportion-bridge": "cross-region",
  "us-ar-math-g12-chapter-05-capstone-modeling": "cross-region",
  "us-ar-math-g10-chapter-04-quadratic-structure-in-geometry-contexts": "cross-region",
  "us-ar-math-g12-chapter-02-polynomial-structure-and-behavior": "cross-region",
  "us-ar-math-g12-chapter-04-function-analysis-and-rates": "cross-region",
  "pep-junior-s3-lower-inverse-similarity-trigonometry": "cross-region",
  "us-ar-math-g11-chapter-03-trigonometric-functions-and-graphs": "cross-region",
  "pep-high-s4-quadratic-inequalities": "cross-region",
  "bnu-high-s6-数列": "cross-region",
  "hjb-high-s6-数列与计数综合": "cross-region",
  "hjb-high-s6-数列综合复习": "cross-region",
  "pep-high-s6-exam-practice": "cross-region",
  "us-ar-math-g08-chapter-02-functions-and-rate-of-change": "cross-region",
  "us-fl-math-s2-chapter-02-functions-and-rate-of-change": "cross-region",
  "hjb-high-s5-数列": "cross-region"
};

export const premiumThreeDLaunchLabIds = new Set(Object.keys(threeDLaunchRegionByLabId));

export function familyForVisualizationTemplate(templateId: VisualizationTemplateId) {
  return threeDTemplateFamilyMap[templateId];
}

export function isPremiumThreeDLaunchLab(labId: string) {
  return premiumThreeDLaunchLabIds.has(labId);
}

export function regionalPriorityForThreeDLaunchLab(labId: string) {
  return threeDLaunchRegionByLabId[labId];
}

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function familyIndex(familyId: ThreeDFamilyId) {
  return threeDFamilyIds.indexOf(familyId);
}

export function buildThreeDStateSummary({
  comparison,
  familyId,
  mode,
  templateId,
  value
}: ThreeDControlState & { familyId: ThreeDFamilyId }): ThreeDStateSummary {
  const index = familyIndex(familyId);
  const safeValue = finite(value, 1);
  const safeComparison = finite(comparison, 1);
  const safeMode = finite(mode, 0);
  const primaryValue = safeValue + index * 0.1;
  const secondaryValue = safeComparison + safeMode * 0.25;
  const depthValue = Math.max(0.4, (safeValue + safeComparison + index + 2) / 12);

  return {
    comparison: safeComparison,
    depthValue,
    familyId,
    mode: safeMode,
    primaryValue,
    secondaryValue,
    stateSummary: [
      `family=${familyId}`,
      `template=${templateId}`,
      `value=${primaryValue.toFixed(3)}`,
      `comparison=${secondaryValue.toFixed(3)}`,
      `depth=${depthValue.toFixed(3)}`
    ].join(";"),
    templateId,
    value: safeValue
  };
}
```

- [ ] **Step 3: Run the family math tests**

Run:

```bash
rm -rf .tmp/three-scene-tests
tsc -p tsconfig.json --outDir .tmp/three-scene-tests --noEmit false --incremental false --module commonjs --moduleResolution node
node --test .tmp/three-scene-tests/components/visualizations/three/threeDSceneMath.test.js
```

Expected: all tests in `threeDSceneMath.test.js` pass.

## Task 3: Add Shared Three.js Canvas Shell

**Files:**
- Create: `components/visualizations/three/ThreeDLabCanvas.tsx`
- Test indirectly through TypeScript and Playwright in later tasks.

- [ ] **Step 1: Create the canvas shell**

Create `components/visualizations/three/ThreeDLabCanvas.tsx`:

```tsx
"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { ThreeDLabSceneRegistry } from "./ThreeDLabSceneRegistry";
import type { ThreeDLabCanvasProps } from "./threeDSceneTypes";

const cameraTarget = new THREE.Vector3(0, 0.4, 0);
const defaultCameraPosition = new THREE.Vector3(4.4, 3.4, 5.2);

function canUseWebGL() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function formatCameraState(camera: THREE.Camera) {
  const position = camera.position.clone().sub(cameraTarget);
  const spherical = new THREE.Spherical().setFromVector3(position);
  const azimuthDegrees = THREE.MathUtils.radToDeg(spherical.theta);
  const elevationDegrees = 90 - THREE.MathUtils.radToDeg(spherical.phi);
  return `azimuth=${azimuthDegrees.toFixed(2)};elevation=${elevationDegrees.toFixed(2)};distance=${spherical.radius.toFixed(2)}`;
}

function CameraContract({
  onCameraState,
  resetSignal
}: {
  onCameraState: (value: string) => void;
  resetSignal: number;
}) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.copy(defaultCameraPosition);
    camera.lookAt(cameraTarget);
    onCameraState(formatCameraState(camera));
  }, [camera, onCameraState, resetSignal]);

  return (
    <OrbitControls
      enableDamping={false}
      enablePan={false}
      makeDefault
      maxDistance={9}
      maxPolarAngle={THREE.MathUtils.degToRad(78)}
      minDistance={2.8}
      minPolarAngle={THREE.MathUtils.degToRad(18)}
      target={cameraTarget}
      onChange={() => onCameraState(formatCameraState(camera))}
    />
  );
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(onReady);
    return () => window.cancelAnimationFrame(frame);
  }, [onReady]);

  return null;
}

export function ThreeDLabCanvas({ accent, fallback, label, state }: ThreeDLabCanvasProps) {
  const [canvasReady, setCanvasReady] = useState(false);
  const [cameraState, setCameraState] = useState("azimuth=40.24;elevation=30.50;distance=7.57");
  const [resetSignal, setResetSignal] = useState(0);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const background = useMemo(() => new THREE.Color("#0b1420"), []);

  useEffect(() => {
    setWebglSupported(canUseWebGL());
  }, []);

  useEffect(() => {
    setCanvasReady(false);
  }, [state.stateSummary]);

  if (webglSupported !== true) return <>{fallback}</>;

  return (
    <div
      data-viz-surface
      data-viz-canvas-ready={canvasReady ? "true" : "false"}
      data-viz-camera-state={cameraState}
      data-viz-depth-value={state.depthValue.toFixed(3)}
      data-viz-family-id={state.familyId}
      data-viz-mark-count="1"
      data-viz-primary-value={state.primaryValue.toFixed(3)}
      data-viz-renderer="three-r3f"
      data-viz-secondary-value={state.secondaryValue.toFixed(3)}
      data-viz-state-summary={state.stateSummary}
      data-viz-template-id={state.templateId}
      role="application"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Home") {
          event.preventDefault();
          setResetSignal((current) => current + 1);
        }
      }}
      className="relative aspect-[16/9] w-full overflow-hidden rounded-[28px] border border-slate-900/10 bg-slate-950 shadow-inner shadow-cyan-500/10 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-white/10"
    >
      <span data-viz-mark data-viz-name={state.familyId} className="sr-only">
        {state.stateSummary}
      </span>
      <Canvas
        camera={{ fov: 42, near: 0.1, far: 100, position: defaultCameraPosition.toArray() }}
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ camera, gl, scene }) => {
          scene.background = background;
          gl.setClearColor(background);
          setCameraState(formatCameraState(camera));
        }}
      >
        <ambientLight intensity={0.72} />
        <directionalLight color="#fff7cc" intensity={2.1} position={[4, 6, 4]} />
        <directionalLight color="#67e8f9" intensity={0.65} position={[-4, 3, -3]} />
        <ThreeDLabSceneRegistry accent={accent} state={state} />
        <CameraContract onCameraState={setCameraState} resetSignal={resetSignal} />
        <ReadySignal onReady={() => setCanvasReady(true)} />
      </Canvas>
      <button
        type="button"
        data-viz-three-reset-camera
        onClick={() => setResetSignal((current) => current + 1)}
        className="focus-ring absolute bottom-3 right-3 rounded-2xl border border-white/15 bg-white/92 px-3 py-2 text-xs font-black text-slate-900 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-100 dark:bg-slate-900/88 dark:text-cyan-50 dark:hover:bg-slate-800"
      >
        Reset camera
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run type-check and verify expected missing registry error**

Run:

```bash
npm run type-check
```

Expected: fails because `./ThreeDLabSceneRegistry` does not exist.

## Task 4: Add Scene Registry And First-Pass 3D Scene Renderer

**Files:**
- Create: `components/visualizations/three/ThreeDLabSceneRegistry.tsx`
- Create: `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx`
- Test: `npm run type-check`

- [ ] **Step 1: Create the primitive scene renderer**

Create `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx`:

```tsx
"use client";

import { Grid, Html, Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeDSceneProps } from "../threeDSceneTypes";

function familyHue(familyId: string) {
  let total = 0;
  for (const character of familyId) total += character.charCodeAt(0);
  return total % 360;
}

function BoxStack({ color, count, depth }: { color: string; count: number; depth: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <mesh key={`box-${index}`} position={[index * 0.42 - count * 0.2, 0.16 + index * 0.04, 0]}>
          <boxGeometry args={[0.34, 0.28 + depth * 0.05, 0.34]} />
          <meshStandardMaterial color={color} metalness={0.05} roughness={0.55} />
        </mesh>
      ))}
    </>
  );
}

function CurveRibbon({ color, amplitude }: { color: string; amplitude: number }) {
  const points = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => {
        const t = index / 41;
        const x = -2.2 + t * 4.4;
        const y = 0.25 + Math.sin(t * Math.PI * 2) * amplitude;
        const z = -0.5 + t;
        return [x, y, z] as [number, number, number];
      }),
    [amplitude]
  );

  return <Line color={color} lineWidth={5} points={points} />;
}

function VectorScene({ color, magnitude }: { color: string; magnitude: number }) {
  return (
    <>
      <Line color={color} lineWidth={5} points={[[0, 0.05, 0], [magnitude, 0.8, -magnitude * 0.4]]} />
      <mesh position={[magnitude, 0.8, -magnitude * 0.4]}>
        <coneGeometry args={[0.12, 0.32, 24]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
}

export function TemplatePrimitiveScene({ accent, state }: ThreeDSceneProps) {
  const hue = familyHue(state.familyId);
  const color = accent || `hsl(${hue}, 82%, 58%)`;
  const count = Math.max(3, Math.min(9, Math.round(state.primaryValue) % 10));
  const depth = Math.max(0.6, Math.min(2.4, state.depthValue));
  const graphLike =
    state.familyId.includes("function") ||
    state.familyId.includes("trig") ||
    state.familyId.includes("calculus") ||
    state.familyId.includes("statistics") ||
    state.familyId.includes("probability");
  const vectorLike =
    state.familyId.includes("vector") ||
    state.familyId.includes("conic") ||
    state.familyId.includes("plane") ||
    state.familyId.includes("cross-section");

  return (
    <>
      <Grid
        args={[5, 5]}
        cellColor="#28435d"
        cellSize={0.5}
        cellThickness={0.65}
        fadeDistance={6}
        fadeStrength={0.2}
        sectionColor="#facc15"
        sectionSize={1}
      />
      <Line color="#38bdf8" lineWidth={3} points={[[-2.5, 0.03, 0], [2.5, 0.03, 0]]} />
      <Line color="#f472b6" lineWidth={3} points={[[0, 0.04, -2.5], [0, 0.04, 2.5]]} />
      <Line color="#facc15" lineWidth={3} points={[[0, 0.02, 0], [0, 2.2, 0]]} />
      {graphLike ? <CurveRibbon color={color} amplitude={Math.min(1.1, depth / 2)} /> : null}
      {vectorLike ? <VectorScene color={color} magnitude={Math.min(2.2, depth)} /> : null}
      {!graphLike && !vectorLike ? <BoxStack color={color} count={count} depth={depth} /> : null}
      <Html center position={[0, 2.45, 0]}>
        <span className="rounded-full border border-white/15 bg-slate-950/80 px-3 py-1 text-[10px] font-black text-cyan-50 shadow-lg">
          {state.familyId}
        </span>
      </Html>
    </>
  );
}
```

- [ ] **Step 2: Create the scene registry**

Create `components/visualizations/three/ThreeDLabSceneRegistry.tsx`:

```tsx
"use client";

import { TemplatePrimitiveScene } from "./scenes/TemplatePrimitiveScene";
import { threeDFamilyIds, type ThreeDFamilyId, type ThreeDSceneProps } from "./threeDSceneTypes";

const readyFamilies = new Set<ThreeDFamilyId>(threeDFamilyIds);

export function isThreeDFamilyReady(familyId: ThreeDFamilyId) {
  return readyFamilies.has(familyId);
}

export function ThreeDLabSceneRegistry(props: ThreeDSceneProps) {
  return <TemplatePrimitiveScene accent={props.accent} state={props.state} />;
}
```

- [ ] **Step 3: Run type-check**

Run:

```bash
npm run type-check
```

Expected: type-check passes or reports only pre-existing unrelated errors. If it reports a new import/type error from files in this task, fix the new error before continuing.

## Task 5: Bridge ConfiguredVisualizationLab To ThreeDLabCanvas

**Files:**
- Modify: `components/visualizations/ConfiguredVisualizationLab.tsx`
- Test: `npm run type-check`

- [ ] **Step 1: Replace the old vector-only lazy Three.js imports**

In `components/visualizations/ConfiguredVisualizationLab.tsx`, replace the React import:

```ts
import { useMemo, useState } from "react";
```

Remove this old lazy canvas declaration:

```ts
const LazyThreeDGraphCanvas = lazy(() =>
  import("@/components/visualizations/three/ThreeDGraphCanvas").then((module) => ({
    default: module.ThreeDGraphCanvas
  }))
);
```

Add these imports near the other visualization imports:

```ts
import { ThreeDLabCanvas } from "@/components/visualizations/three/ThreeDLabCanvas";
import { buildThreeDStateSummary, familyForVisualizationTemplate } from "@/components/visualizations/three/threeDSceneMath";
import { isThreeDFamilyReady } from "@/components/visualizations/three/ThreeDLabSceneRegistry";
```

- [ ] **Step 2: Build Three.js state before the return**

Near the existing `showThreeDCanvas` constant, replace the single-template check with this code:

```ts
  const threeDFamilyId = familyForVisualizationTemplate(templateId);
  const threeDState = buildThreeDStateSummary({
    comparison,
    familyId: threeDFamilyId,
    mode,
    templateId,
    value
  });
  const showThreeDCanvas = isThreeDFamilyReady(threeDFamilyId);
```

- [ ] **Step 3: Render the new canvas for ready families**

In the surface render branch, use:

```tsx
        {showThreeDCanvas ? (
          <ThreeDLabCanvas
            accent={accent}
            fallback={svgSurface}
            label={surfaceLabel}
            state={threeDState}
          />
        ) : (
          svgSurface
        )}
```

The old `LazyThreeDGraphCanvas` branch and `activeThreeDGraphScales` declaration are removed in this task. Keep `threeDGraphScalesFromControls` imported because existing helper functions in this file still call it outside the render bridge.

- [ ] **Step 4: Run type-check**

Run:

```bash
npm run type-check
```

Expected: type-check passes or reports only pre-existing unrelated errors. New errors in `ConfiguredVisualizationLab.tsx` must be fixed in this task.

## Task 6: Add Catalog Metadata For Premium 3D Coverage

**Files:**
- Modify: `data/visualizationLabs.ts`
- Test: `npm run type-check`
- Test: `components/visualizations/three/threeDSceneMath.test.ts`

- [ ] **Step 1: Add optional Three.js metadata type**

In `data/visualizationLabs.ts`, import the metadata type:

```ts
import type { ThreeDVisualizationMetadata } from "@/components/visualizations/three/threeDSceneTypes";
```

Add this property to `FeaturedLabDefinition`:

```ts
  threeD?: ThreeDVisualizationMetadata;
```

- [ ] **Step 2: Add helper imports**

In `data/visualizationLabs.ts`, import:

```ts
import {
  familyForVisualizationTemplate,
  isPremiumThreeDLaunchLab,
  regionalPriorityForThreeDLaunchLab
} from "@/components/visualizations/three/threeDSceneMath";
```

- [ ] **Step 3: Add metadata during topic lab creation**

Inside `createTopicLab`, immediately after this existing line:

```ts
  const safeguard = californiaSafeguardForTopic(topic, templateId, template.qaProfile);
```

add:

```ts
  const threeDFamilyId = familyForVisualizationTemplate(templateId);
  const premiumLaunch = isPremiumThreeDLaunchLab(topic.id);
  const launchRegionalPriority = regionalPriorityForThreeDLaunchLab(topic.id);
  const threeD: ThreeDVisualizationMetadata = {
    enabled: true,
    fallbackTemplateId: templateId,
    familyId: threeDFamilyId,
    coverageTier: premiumLaunch ? "premium-3d" : "standard-3d",
    premiumLaunch,
    regionalPriority: launchRegionalPriority ??
      (curriculumTrack === "MAINLAND_PEP_PRIMARY" ||
      curriculumTrack === "MAINLAND_PEP_JUNIOR" ||
      curriculumTrack === "MAINLAND_PEP_HIGH" ||
      curriculumTrack === "MAINLAND_BNU" ||
      curriculumTrack === "MAINLAND_HJB"
        ? "mainland"
        : curriculumTrack === "US" && topic.publisher === "US_CA_MATH"
          ? "california"
          : curriculumTrack === "HK"
            ? "hong-kong"
            : undefined)
  };
```

Add `threeD,` to the returned lab object.

- [ ] **Step 4: Add capstone metadata**

For each object in `capstoneLabDefinitions`, add:

```ts
    threeD: {
      enabled: true,
      fallbackTemplateId: "<same templateId value as this capstone>",
      familyId: familyForVisualizationTemplate("<same templateId value as this capstone>"),
      coverageTier: "capstone-3d",
      premiumLaunch: true,
      regionalPriority: "cross-region"
    },
```

Use the exact capstone `templateId` value in each object:

```ts
"fraction-bar"
"measurement-scale"
"coordinate-transform"
"calculus-rate-area"
"vector-conic-3d/strategy-map"
```

- [ ] **Step 5: Run metadata tests**

Run:

```bash
rm -rf .tmp/three-scene-tests
tsc -p tsconfig.json --outDir .tmp/three-scene-tests --noEmit false --incremental false --module commonjs --moduleResolution node
node --test .tmp/three-scene-tests/components/visualizations/three/threeDSceneMath.test.js
npm run type-check
```

Expected: family math tests pass and type-check passes or reports only pre-existing unrelated errors.

## Task 7: Add Targeted Browser Contract Tests With S11 Coordination

**Files:**
- Modify: `tests/e2e/visualization-values.spec.ts`

- [ ] **Step 1: Add one test for broad Three.js family rendering**

In `tests/e2e/visualization-values.spec.ts`, add:

```ts
test("renders configured labs through the shared Three.js family canvas", async ({ page }, testInfo) => {
  test.slow();
  test.setTimeout(120_000);
  const pageErrors = collectPageErrors(page);
  const representativeLabs = visualizationLabCatalog
    .filter((lab) =>
      [
        "number-line",
        "base-ten",
        "array-area",
        "fraction-bar",
        "function-family",
        "statistics-distribution",
        "vector-conic-3d/strategy-map"
      ].includes(lab.templateId)
    )
    .slice(0, 7);

  expect(representativeLabs.length).toBe(7);
  await registerMainlandPepVisualizationStudent(page, testInfo, "S5");
  await disableMotion(page);

  for (const lab of representativeLabs) {
    await page.goto(buildVisualizationLabHref(lab));
    const section = page.locator(visualizationLabSectionSelector(lab));
    await expect(section).toBeVisible();
    const surface = section.locator('[data-viz-surface][data-viz-renderer="three-r3f"]');
    await expect(surface).toBeVisible({ timeout: 20_000 });
    await expect(surface).toHaveAttribute("data-viz-canvas-ready", "true");
    await expect(surface.locator("[data-viz-mark]")).toHaveCount(1);
    await expect(surface).toHaveAttribute("data-viz-family-id", /three-/);
    const canvas = surface.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    const dataUrlLength = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL("image/png").length);
    expect(dataUrlLength).toBeGreaterThan(2_000);
  }

  expectNoPageErrors(pageErrors);
});
```

- [ ] **Step 2: Run the targeted browser test**

Run:

```bash
npx playwright test tests/e2e/visualization-values.spec.ts --project=desktop-chrome -g "shared Three.js family canvas"
```

Expected: test passes. If the dev server has stale `.next` manifest errors, rerun with an isolated dist directory:

```bash
NEXT_DIST_DIR=.tmp/three-family-dev npx playwright test tests/e2e/visualization-values.spec.ts --project=desktop-chrome -g "shared Three.js family canvas"
```

## Task 8: Mobile And Overlap Smoke With S11/S22 Gates

**Files:**
- Modify: `tests/e2e/visualization-overlap.spec.ts`
- Append: `coordination/session-logs/2026-06-20-S06.md`

- [ ] **Step 1: Add mobile canvas pixel sanity to overlap test**

In `tests/e2e/visualization-overlap.spec.ts`, add this import beside the existing imports:

```ts
import { buildVisualizationLabHref, visualizationLabSectionSelector } from "../../components/visualizations/visualizationDiagnostics";
```

Replace the helpers import with:

```ts
import { collectPageErrors, expectNoPageErrors, loginAsDemoStudent, loginAsDemoStudentApi } from "./helpers";
```

Add this focused test inside the existing `test.describe("Visualization Lab overlap detection", () => {` block:

```ts
test("premium Three.js regional labs stay visible on mobile", async ({ page }) => {
  const targetLabIds = ["pep-high-s5-conics", "us-ca-math-s6-chapter-05", "calculus"];
  const pageErrors = collectPageErrors(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsDemoStudentApi(page);

  for (const labId of targetLabIds) {
    const lab = visualizationLabCatalog.find((candidate) => candidate.labId === labId);
    expect(lab, `${labId} should exist`).toBeTruthy();
    await page.goto(buildVisualizationLabHref(lab!));
    await disableMotion(page);
    const section = page.locator(visualizationLabSectionSelector(lab!));
    await expect(section).toBeVisible();
    const surface = section.locator('[data-viz-surface][data-viz-renderer="three-r3f"]');
    await expect(surface).toBeVisible({ timeout: 20_000 });
    await expect(surface).toHaveAttribute("data-viz-canvas-ready", "true");
    const box = await surface.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(250);
    expect(box?.height ?? 0).toBeGreaterThan(130);
  }

  expectNoPageErrors(pageErrors);
});
```

- [ ] **Step 2: Run mobile overlap test**

Run:

```bash
npx playwright test tests/e2e/visualization-overlap.spec.ts --project=mobile-chrome -g "premium Three.js regional labs"
```

Expected: test passes, or failure is logged with exact overlapping selector and viewport data for S11 routing.

- [ ] **Step 3: Append S06 handoff**

Append to `coordination/session-logs/2026-06-20-S06.md`:

```markdown
## Aggressive Three.js Migration Implementation Handoff

- Session: S06 Visualization lead.
- Changed: added shared Three.js family types, deterministic state summaries, shared R3F canvas shell, scene registry, first-pass primitive 3D family scene, catalog metadata, and targeted browser checks.
- Files changed: `components/visualizations/three/threeDSceneTypes.ts`, `components/visualizations/three/threeDSceneMath.ts`, `components/visualizations/three/threeDSceneMath.test.ts`, `components/visualizations/three/ThreeDLabCanvas.tsx`, `components/visualizations/three/ThreeDLabSceneRegistry.tsx`, `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx`, `components/visualizations/ConfiguredVisualizationLab.tsx`, `data/visualizationLabs.ts`, targeted visualization E2E files.
- Checks run: family math tests, `npm run type-check`, targeted desktop Three.js family Playwright test, targeted mobile regional Three.js Playwright test.
- Checks not run: full `npm run check` unless explicitly completed, because the repository is large and already dirty across many session scopes.
- Follow-up: S18 must review family-to-topic fit before public curriculum claims; S11 must decide durable sweep coverage; S22 must validate build/release readiness and bundle impact.
```

## Task 9: Full Completion Audit

**Files:**
- Read: `docs/superpowers/specs/2026-06-20-aggressive-threejs-visualization-labs-design.md`
- Read: `data/visualizationLabs.ts`
- Read: `components/visualizations/three/threeDSceneMath.ts`
- Read: `coordination/session-logs/2026-06-20-S06.md`

- [ ] **Step 1: Run catalog audit command**

Run:

```bash
node - <<'NODE'
const path = require('path');
const Module = require('module');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith('@/')) request = path.join(process.cwd(), request.slice(2));
  return originalResolve.call(this, request, parent, isMain, options);
};
const createJiti = require('jiti');
const jiti = createJiti(path.join(process.cwd(), 'catalog-probe.cjs'), { interopDefault: true });
const { visualizationLabCatalog } = jiti('./data/visualizationLabs.ts');
const { threeDFamilyIds } = jiti('./components/visualizations/three/threeDSceneMath.ts');
const premium = visualizationLabCatalog.filter((lab) => lab.threeD?.premiumLaunch);
const byRegion = { mainland: 0, california: 0, "hong-kong": 0, "cross-region": 0 };
for (const lab of premium) {
  const region = lab.threeD?.regionalPriority;
  if (region && region in byRegion) byRegion[region] += 1;
}
console.log(JSON.stringify({
  familyCount: threeDFamilyIds.length,
  templateCount: new Set(visualizationLabCatalog.map((lab) => lab.templateId)).size,
  threeDEnabled: visualizationLabCatalog.filter((lab) => lab.threeD?.enabled).length,
  premiumCount: premium.length,
  byRegion
}, null, 2));
NODE
```

Expected after the full aggressive metadata pass:

```json
{
  "familyCount": 26,
  "templateCount": 18,
  "threeDEnabled": 695,
  "premiumCount": 80,
  "byRegion": {
    "mainland": 40,
    "california": 12,
    "hong-kong": 9,
    "cross-region": 19
  }
}
```

- [ ] **Step 2: Decide whether goal completion can be claimed**

Completion can be claimed only if:

- The audit command matches the expected counts.
- Every ready family has a nonblank Three.js canvas proof.
- Desktop and mobile targeted Playwright tests pass.
- S18, S11, and S22 gates are documented.

If any item is missing, leave the goal active and record the missing evidence in the S06 handoff.
