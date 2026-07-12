# California 3D Visualization Labs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 18 reusable 3D Visualization Lab families and finish the California course implementation first, so later China and Hong Kong work can reuse the same engines with new curriculum mappings.

**Architecture:** Add a California 3D course layer that defines 18 standards-aligned 3D lab topics, a shared deterministic 3D geometry model layer, and a Three.js canvas renderer with machine-readable math attributes for tests. Keep the current catalog invariant by adding California course topics before adding their labs, rather than creating orphan lab entries.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, Tailwind CSS, current Visualization Lab components, Three.js, Playwright, Node test runner.

---

## Current Evidence

- S06 current catalog import: `visualizationLabCatalog.length === 737`.
- S06 current California subset: 76 labs, 0 true 3D labs.
- S06 current 3D-like template count: 24 labs using `vector-conic-3d/strategy-map`, all Mainland or capstone.
- California local source structure is available in `/Users/dongpinhu/.codex/skills/california-math-common-core/references/standards-index.json`.
- California source policy allows identifiers, domain/category codes, and MAIS-authored summaries, but not copied CDE/IXL/textbook prose.
- `three`, `@react-three/fiber`, and `@react-three/drei` are absent from `package.json`; `framer-motion` is present.
- Existing runtime/test hooks rely on `[data-viz-surface]`, `[data-viz-mark]`, and `data-viz-*` math attributes.

## Definition Of Done

- All 18 named 3D lab families exist as typed family IDs with one California course lab each.
- California course has at least 18 3D lab pages visible through the Visualization Lab catalog under the US/California path.
- Each 3D lab has a California alignment record using allowed identifiers/domain codes and MAIS-authored summaries.
- Every family renders a nonblank Three.js canvas plus deterministic `data-viz-*` attributes for the exact math state.
- Desktop and mobile Playwright checks prove the 18 California labs render, respond to controls, expose finite math values, and have nonblank canvas pixels.
- `npm run type-check`, targeted Node tests, targeted Playwright tests, and `npm run test:mvp` pass.
- S18 has a source-safety/curriculum QA report, S11 has regression evidence, and S22 has release readiness evidence before production release language changes.

## Ownership

- S06 Visualization lead: renderer, lab family engines, visualization catalog integration, local visualization QA.
- S18 Curriculum QA: California alignment, source-safety review, final curriculum acceptance recommendation.
- S05 Lesson lead: California lesson/course surfaces if these labs are embedded into lessons.
- S04 Practice lead: California practice surfaces if these labs are linked from practice.
- S23 Integration lead: candidate-to-live sequence and owner handoff.
- S11 QA lead: durable Playwright/regression ownership.
- S22 Release engineering: build/deployment and production smoke readiness.
- S10 Coordination/docs: package/config coordination if dependency changes need release notation.

## File Structure

- Modify: `package.json`
  - Add `three` as a runtime dependency.
- Modify: `package-lock.json`
  - Lock the installed `three` version.
- Create: `data/california3DVisualizationCourse.ts`
  - Own the 18 California 3D course topic seeds, family IDs, California domain alignment, display titles, and family-to-topic mapping.
- Modify: `data/usCaliforniaTopics.ts`
  - Append the 18 California 3D course topics to `usCaliforniaTopics`.
- Modify: `data/visualizationLabs.ts`
  - Add one module ID for the 3D course renderer, one template ID for the 3D course, and route the 18 new California topics to their family configs.
- Create: `lib/threeDGeometry.ts`
  - Pure math builders for solids, nets, views, coordinates, vectors, conics, slicing, and optimization states.
- Create: `lib/threeDGeometry.test.ts`
  - Node tests for exact geometry invariants.
- Create: `components/visualizations/ThreeDSceneCanvas.tsx`
  - Client-side Three.js canvas wrapper with resize, cleanup, reduced-motion handling, and pixel-visible scene setup.
- Create: `components/visualizations/CaliforniaThreeDLab.tsx`
  - Lab UI that maps each family ID to controls, scene state, formulas, and `data-viz-*` attributes.
- Modify: `components/visualizations/VisualizationLabPage.tsx`
  - Register the new module ID and keep the direct deep-link contract.
- Modify: `components/visualizations/visualizationDiagnostics.ts`
  - Include the 3D course template in diagnostics and health checks.
- Modify: `components/visualizations/visualizationDiagnostics.test.ts`
  - Assert the 18 California 3D families exist and are discoverable.
- Create: `tests/e2e/california-3d-visualization-labs.spec.ts`
  - Desktop/mobile/pixel/control smoke for the 18 California labs.
- Create: `coordination/content-qa/2026-06-20-S18-california-3d-visualization-course-qa.md`
  - S18 source-safety and standards-alignment report.
- Create: `coordination/integration/2026-06-20-S23-california-3d-visualization-course-promotion.md`
  - S23 promotion sequence and gate checklist.

## California 3D Family Map

| Family | California first lab ID | Primary CA domain targets | Grade band |
| --- | --- | --- | --- |
| 3D shape explorer | `us-ca-3d-shape-explorer` | `K.G`, `1.G`, `2.G` | K-P2 |
| Front/top/side view explorer | `us-ca-3d-orthographic-views` | `K.G`, `6.G`, `7.G` | K-S1 |
| Nets and folding lab | `us-ca-3d-nets-folding` | `6.G`, `G-GMD` | P6-S4 |
| Unit cubes and cuboid volume | `us-ca-3d-unit-cube-volume` | `5.MD`, `6.G`, `G-GMD` | P5-S4 |
| Surface area of prisms/cuboids | `us-ca-3d-prism-surface-area` | `6.G`, `7.G`, `G-GMD` | P6-S4 |
| Cylinders, cones, spheres | `us-ca-3d-round-solids` | `7.G`, `8.G`, `G-GMD` | S1-S4 |
| Cross-section slicer | `us-ca-3d-cross-section-slicer` | `7.G`, `G-GMD`, `G-MG` | S1-S4 |
| 3D Pythagorean/space diagonal | `us-ca-3d-pythagorean-diagonal` | `8.G`, `G-SRT`, `G-GMD` | S2-S4 |
| 3D coordinate system | `us-ca-3d-coordinate-system` | `5.G`, `8.G`, `G-GPE` | P5-S3 |
| Spatial transformations/rotations | `us-ca-3d-spatial-transformations` | `8.G`, `G-CO`, `G-GPE` | S2-S4 |
| Lines and planes in space | `us-ca-3d-lines-planes` | `G-GMD`, `G-MG`, `N-VM` | S4-S6 |
| Angles and distances in space | `us-ca-3d-angles-distances` | `G-SRT`, `G-GMD`, `G-MG` | S4-S6 |
| Space vectors/components | `us-ca-3d-vector-components` | `N-VM`, `G-GPE`, `G-MG` | S4-S6 |
| Dot product/projection in 3D | `us-ca-3d-dot-product-projection` | `N-VM`, `G-SRT`, `G-MG` | S4-S6 |
| Plane/vector equations | `us-ca-3d-plane-vector-equations` | `N-VM`, `A-CED`, `G-GPE` | S4-S6 |
| Conic sections from cone slicing | `us-ca-3d-conic-sections` | `G-GPE`, `G-GMD`, `G-MG` | S4-S6 |
| 3D modeling/optimization | `us-ca-3d-modeling-optimization` | `Modeling`, `G-MG`, `F-IF` | S5-S6 |
| Cross-curriculum 3D strategy/capstone lab | `us-ca-3d-strategy-capstone` | `Modeling`, `G-MG`, `N-Q` | S6 |

## Task 1: Baseline Snapshot And Branch-Safe Intake

**Files:**
- Read: `data/visualizationLabs.ts`
- Read: `data/usCaliforniaTopics.ts`
- Read: `components/visualizations/VisualizationLabPage.tsx`
- Read: `package.json`
- Create: `coordination/integration/2026-06-20-S23-california-3d-visualization-course-promotion.md`

- [ ] **Step 1: Record current Git state without changing it**

Run:

```bash
git status --short -- data/visualizationLabs.ts data/usCaliforniaTopics.ts components/visualizations package.json package-lock.json tests/e2e docs/superpowers/plans
```

Expected: prints current modified/untracked state. Do not stage, commit, reset, clean, or revert unrelated files.

- [ ] **Step 2: Record current California visualization counts**

Run:

```bash
node - <<'NODE'
const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");
const root = process.cwd();
const oldResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const next = path.join(root, request.slice(2));
    for (const target of [next, `${next}.ts`, `${next}.tsx`, `${next}.js`, `${next}.json`]) {
      try { return oldResolve.call(this, target, parent, isMain, options); } catch {}
    }
  }
  return oldResolve.call(this, request, parent, isMain, options);
};
require.extensions[".ts"] = function(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  module._compile(output, filename);
};
const { visualizationLabCatalog } = require("./data/visualizationLabs.ts");
const californiaLabs = visualizationLabCatalog.filter((lab) =>
  lab.publisher === "US_CA_MATH" || lab.californiaAlignment || lab.labId.startsWith("us-ca-")
);
console.log(JSON.stringify({
  catalog: visualizationLabCatalog.length,
  california: californiaLabs.length,
  californiaThreeD: californiaLabs.filter((lab) => lab.moduleId === "california-3d-visualization-lab").length,
  californiaLegacy3DTemplate: californiaLabs.filter((lab) => lab.templateId === "vector-conic-3d/strategy-map").length
}, null, 2));
NODE
```

Expected before implementation:

```json
{
  "catalog": 737,
  "california": 76,
  "californiaThreeD": 0,
  "californiaLegacy3DTemplate": 0
}
```

- [ ] **Step 3: Create S23 promotion skeleton**

Create `coordination/integration/2026-06-20-S23-california-3d-visualization-course-promotion.md` with this content:

```markdown
# S23 California 3D Visualization Course Promotion Plan

- Date: 2026-06-20
- Scope: California-first implementation of 18 reusable 3D Visualization Lab families.
- Owning implementation session: S06 Visualization lead.
- Curriculum QA gate: S18.
- Regression gate: S11.
- Release engineering gate: S22.

## Candidate Inputs

- `data/california3DVisualizationCourse.ts`
- `data/usCaliforniaTopics.ts`
- `data/visualizationLabs.ts`
- `components/visualizations/CaliforniaThreeDLab.tsx`
- `components/visualizations/ThreeDSceneCanvas.tsx`
- `lib/threeDGeometry.ts`
- `tests/e2e/california-3d-visualization-labs.spec.ts`

## Promotion Gates

- S06 completes implementation and local visualization checks.
- S18 accepts the California alignment and source-safety report.
- S11 accepts durable desktop/mobile regression evidence.
- S22 accepts build and deployment readiness evidence.
- Public copy remains "California standards-aligned 3D visualization practice" until S18/S11/S22 gates pass.
```

## Task 2: Add Three.js Dependency Under S10/S22 Awareness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install dependency**

Run:

```bash
npm install three
```

Expected:

```text
added 1 package
```

or npm reports the package is already installed. `package.json` must include `three` in `dependencies`.

- [ ] **Step 2: Verify dependency is importable**

Run:

```bash
node - <<'NODE'
const three = require("three");
console.log(typeof three.Scene, typeof three.PerspectiveCamera, typeof three.WebGLRenderer);
NODE
```

Expected:

```text
function function function
```

- [ ] **Step 3: Record release note in the S23 promotion artifact**

Append to `coordination/integration/2026-06-20-S23-california-3d-visualization-course-promotion.md`:

```markdown
## Dependency Note

- `three` added as a runtime dependency for S06 3D Visualization Lab rendering.
- S22 must include the 3D labs in build-size and production-render smoke checks.
```

## Task 3: Add California 3D Course Data And Tests

**Files:**
- Create: `data/california3DVisualizationCourse.ts`
- Create: `lib/california3DVisualizationCourse.test.ts`
- Modify: `data/usCaliforniaTopics.ts`

- [ ] **Step 1: Write the failing course-data test**

Create `lib/california3DVisualizationCourse.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  californiaThreeDTopicSeeds,
  californiaThreeDVisualizationFamilyIds,
  californiaThreeDVisualizationLabIds
} from "../data/california3DVisualizationCourse";

test("California 3D course defines the exact 18 requested lab families", () => {
  assert.deepEqual(californiaThreeDVisualizationFamilyIds, [
    "shape-explorer",
    "orthographic-views",
    "nets-folding",
    "unit-cube-volume",
    "prism-surface-area",
    "round-solids",
    "cross-section-slicer",
    "pythagorean-diagonal",
    "coordinate-system-3d",
    "spatial-transformations",
    "lines-planes",
    "angles-distances",
    "vector-components",
    "dot-product-projection",
    "plane-vector-equations",
    "conic-sections",
    "modeling-optimization",
    "strategy-capstone"
  ]);
  assert.equal(californiaThreeDTopicSeeds.length, 18);
  assert.equal(new Set(californiaThreeDVisualizationLabIds).size, 18);
});

test("California 3D course entries use source-safe alignment metadata", () => {
  const issues = californiaThreeDTopicSeeds.flatMap((seed) => {
    const rowIssues: string[] = [];
    if (seed.curriculumTrack !== "US_CA_MATH") rowIssues.push(`${seed.id}: curriculumTrack must be US_CA_MATH`);
    if (seed.publisher !== "US_CA_MATH") rowIssues.push(`${seed.id}: publisher must be US_CA_MATH`);
    if (!seed.californiaAlignment.domainId) rowIssues.push(`${seed.id}: missing California domain ID`);
    if (seed.californiaAlignment.standardIds.length === 0) rowIssues.push(`${seed.id}: missing California standard IDs`);
    if (!seed.californiaAlignment.capabilitySummary.en.includes("MAIS-authored")) {
      rowIssues.push(`${seed.id}: capability summary must state MAIS-authored source-safe wording`);
    }
    return rowIssues;
  });

  assert.deepEqual(issues, []);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
rm -rf .tmp/california-3d-course-test && \
tsc -p tsconfig.json --outDir .tmp/california-3d-course-test --noEmit false --incremental false --module commonjs --moduleResolution node && \
node --test .tmp/california-3d-course-test/lib/california3DVisualizationCourse.test.js
```

Expected: FAIL because `data/california3DVisualizationCourse.ts` does not exist.

- [ ] **Step 3: Create California 3D course data**

Create `data/california3DVisualizationCourse.ts` with these exported shapes and all 18 entries:

```ts
import type { CurriculumProfile, Difficulty, GradeId, LocalizedText, Topic } from "@/types";

export type CaliforniaThreeDVisualizationFamilyId =
  | "shape-explorer"
  | "orthographic-views"
  | "nets-folding"
  | "unit-cube-volume"
  | "prism-surface-area"
  | "round-solids"
  | "cross-section-slicer"
  | "pythagorean-diagonal"
  | "coordinate-system-3d"
  | "spatial-transformations"
  | "lines-planes"
  | "angles-distances"
  | "vector-components"
  | "dot-product-projection"
  | "plane-vector-equations"
  | "conic-sections"
  | "modeling-optimization"
  | "strategy-capstone";

export type CaliforniaThreeDTopicSeed = {
  id: string;
  familyId: CaliforniaThreeDVisualizationFamilyId;
  grade: GradeId;
  title: LocalizedText;
  description: LocalizedText;
  difficulty: Difficulty;
  minutes: number;
  curriculumTrack: "US_CA_MATH";
  publisher: "US_CA_MATH";
  californiaAlignment: {
    domainId: string;
    standardIds: string[];
    domainTitle: LocalizedText;
    capabilitySummary: LocalizedText;
  };
};

const californiaProfile = { region: "US", publisher: "US_CA_MATH" } satisfies CurriculumProfile;

function text(en: string, zh = en, zhHans = zh): LocalizedText {
  return { en, zh, zhHans };
}

export const californiaThreeDVisualizationFamilyIds: CaliforniaThreeDVisualizationFamilyId[] = [
  "shape-explorer",
  "orthographic-views",
  "nets-folding",
  "unit-cube-volume",
  "prism-surface-area",
  "round-solids",
  "cross-section-slicer",
  "pythagorean-diagonal",
  "coordinate-system-3d",
  "spatial-transformations",
  "lines-planes",
  "angles-distances",
  "vector-components",
  "dot-product-projection",
  "plane-vector-equations",
  "conic-sections",
  "modeling-optimization",
  "strategy-capstone"
];

export const californiaThreeDTopicSeeds: CaliforniaThreeDTopicSeed[] = [
  {
    id: "us-ca-3d-shape-explorer",
    familyId: "shape-explorer",
    grade: "P1",
    title: text("California 3D Shape Explorer"),
    description: text("Classify and compose three-dimensional shapes with original MAIS manipulatives."),
    difficulty: "Low",
    minutes: 18,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.1.G",
      standardIds: ["1.G.1", "1.G.2"],
      domainTitle: text("Grade 1 Geometry"),
      capabilitySummary: text("MAIS-authored shape composition and attribute reasoning for early California geometry.")
    }
  },
  {
    id: "us-ca-3d-orthographic-views",
    familyId: "orthographic-views",
    grade: "P5",
    title: text("California Front Top Side View Explorer"),
    description: text("Rotate a simple solid and match front, top, and side views."),
    difficulty: "Medium",
    minutes: 22,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.5.G",
      standardIds: ["5.G.1", "5.G.2"],
      domainTitle: text("Grade 5 Geometry"),
      capabilitySummary: text("MAIS-authored coordinate and spatial view reasoning for California geometry readiness.")
    }
  },
  {
    id: "us-ca-3d-nets-folding",
    familyId: "nets-folding",
    grade: "P6",
    title: text("California Nets and Folding Lab"),
    description: text("Fold nets into prisms and compare face layouts with surface area."),
    difficulty: "Medium",
    minutes: 24,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.6.G",
      standardIds: ["6.G.4"],
      domainTitle: text("Grade 6 Geometry"),
      capabilitySummary: text("MAIS-authored net reasoning and surface-area visualization for California geometry.")
    }
  },
  {
    id: "us-ca-3d-unit-cube-volume",
    familyId: "unit-cube-volume",
    grade: "P5",
    title: text("California Unit Cube Volume Lab"),
    description: text("Build prisms from unit cubes and connect layers to volume formulas."),
    difficulty: "Medium",
    minutes: 24,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.5.MD",
      standardIds: ["5.MD.3", "5.MD.4", "5.MD.5"],
      domainTitle: text("Grade 5 Measurement and Data"),
      capabilitySummary: text("MAIS-authored cubic-unit and volume model for California measurement.")
    }
  },
  {
    id: "us-ca-3d-prism-surface-area",
    familyId: "prism-surface-area",
    grade: "P6",
    title: text("California Prism Surface Area Lab"),
    description: text("Change length, width, and height while the prism faces and total surface area update."),
    difficulty: "Medium",
    minutes: 26,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.6.G",
      standardIds: ["6.G.2", "6.G.4"],
      domainTitle: text("Grade 6 Geometry"),
      capabilitySummary: text("MAIS-authored prism surface-area reasoning for California geometry.")
    }
  },
  {
    id: "us-ca-3d-round-solids",
    familyId: "round-solids",
    grade: "S1",
    title: text("California Cylinders Cones Spheres Lab"),
    description: text("Compare radius, height, volume, and surface features across round solids."),
    difficulty: "Medium",
    minutes: 28,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.7.G",
      standardIds: ["7.G.3", "7.G.6"],
      domainTitle: text("Grade 7 Geometry"),
      capabilitySummary: text("MAIS-authored round-solid measurement visualization for California geometry.")
    }
  },
  {
    id: "us-ca-3d-cross-section-slicer",
    familyId: "cross-section-slicer",
    grade: "S1",
    title: text("California Cross-Section Slicer"),
    description: text("Move a slicing plane through prisms, cylinders, cones, and spheres."),
    difficulty: "High",
    minutes: 30,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.7.G",
      standardIds: ["7.G.3"],
      domainTitle: text("Grade 7 Geometry"),
      capabilitySummary: text("MAIS-authored cross-section exploration for California spatial reasoning.")
    }
  },
  {
    id: "us-ca-3d-pythagorean-diagonal",
    familyId: "pythagorean-diagonal",
    grade: "S2",
    title: text("California 3D Pythagorean Diagonal Lab"),
    description: text("Trace face diagonals and space diagonals in rectangular prisms."),
    difficulty: "High",
    minutes: 30,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.8.G",
      standardIds: ["8.G.6", "8.G.7", "8.G.8"],
      domainTitle: text("Grade 8 Geometry"),
      capabilitySummary: text("MAIS-authored Pythagorean distance model for California geometry.")
    }
  },
  {
    id: "us-ca-3d-coordinate-system",
    familyId: "coordinate-system-3d",
    grade: "S3",
    title: text("California 3D Coordinate System Lab"),
    description: text("Plot points in three dimensions and read coordinate projections."),
    difficulty: "Medium",
    minutes: 28,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.G-GPE",
      standardIds: ["G-GPE.4", "G-GPE.7"],
      domainTitle: text("High School Coordinate Geometry"),
      capabilitySummary: text("MAIS-authored coordinate geometry visualization for California high school geometry.")
    }
  },
  {
    id: "us-ca-3d-spatial-transformations",
    familyId: "spatial-transformations",
    grade: "S2",
    title: text("California Spatial Transformations Lab"),
    description: text("Rotate, reflect, translate, and dilate a simple solid while coordinates update."),
    difficulty: "High",
    minutes: 30,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.8.G",
      standardIds: ["8.G.1", "8.G.2", "8.G.3"],
      domainTitle: text("Grade 8 Geometry"),
      capabilitySummary: text("MAIS-authored transformation visualization for California congruence and similarity readiness.")
    }
  },
  {
    id: "us-ca-3d-lines-planes",
    familyId: "lines-planes",
    grade: "S4",
    title: text("California Lines and Planes in Space Lab"),
    description: text("Compare intersecting, parallel, and skew line-plane configurations."),
    difficulty: "High",
    minutes: 32,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.G-GMD",
      standardIds: ["G-GMD.4"],
      domainTitle: text("High School Geometric Measurement and Dimension"),
      capabilitySummary: text("MAIS-authored spatial line and plane reasoning for California high school geometry.")
    }
  },
  {
    id: "us-ca-3d-angles-distances",
    familyId: "angles-distances",
    grade: "S4",
    title: text("California Angles and Distances in Space Lab"),
    description: text("Measure point-line, point-plane, and line-plane distances with right-triangle supports."),
    difficulty: "High",
    minutes: 34,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.G-SRT",
      standardIds: ["G-SRT.6", "G-SRT.8"],
      domainTitle: text("High School Similarity and Right Triangles"),
      capabilitySummary: text("MAIS-authored right-triangle measurement model for California spatial geometry.")
    }
  },
  {
    id: "us-ca-3d-vector-components",
    familyId: "vector-components",
    grade: "S5",
    title: text("California Space Vector Components Lab"),
    description: text("Decompose a 3D vector into x, y, and z components."),
    difficulty: "High",
    minutes: 32,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.N-VM",
      standardIds: ["N-VM.1", "N-VM.2", "N-VM.3"],
      domainTitle: text("High School Vector and Matrix Quantities"),
      capabilitySummary: text("MAIS-authored vector component visualization for California advanced mathematics.")
    }
  },
  {
    id: "us-ca-3d-dot-product-projection",
    familyId: "dot-product-projection",
    grade: "S5",
    title: text("California Dot Product and Projection Lab"),
    description: text("Change two 3D vectors and see angle, dot product, and projection length update."),
    difficulty: "High",
    minutes: 34,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.N-VM",
      standardIds: ["N-VM.4", "N-VM.5"],
      domainTitle: text("High School Vector and Matrix Quantities"),
      capabilitySummary: text("MAIS-authored dot-product and projection visualization for California advanced mathematics.")
    }
  },
  {
    id: "us-ca-3d-plane-vector-equations",
    familyId: "plane-vector-equations",
    grade: "S5",
    title: text("California Plane and Vector Equations Lab"),
    description: text("Build a plane from a point and normal vector, then test points against the equation."),
    difficulty: "High",
    minutes: 36,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.A-CED",
      standardIds: ["A-CED.2", "A-CED.3"],
      domainTitle: text("High School Creating Equations"),
      capabilitySummary: text("MAIS-authored equation-building visualization for California modeling and geometry.")
    }
  },
  {
    id: "us-ca-3d-conic-sections",
    familyId: "conic-sections",
    grade: "S4",
    title: text("California Conic Sections from Cone Slicing Lab"),
    description: text("Tilt a slicing plane through a cone and connect the section to coordinate equations."),
    difficulty: "High",
    minutes: 36,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.G-GPE",
      standardIds: ["G-GPE.1", "G-GPE.2", "G-GPE.3"],
      domainTitle: text("High School Expressing Geometric Properties with Equations"),
      capabilitySummary: text("MAIS-authored conic-section visualization for California coordinate geometry.")
    }
  },
  {
    id: "us-ca-3d-modeling-optimization",
    familyId: "modeling-optimization",
    grade: "S6",
    title: text("California 3D Modeling and Optimization Lab"),
    description: text("Choose dimensions under constraints and compare volume, surface area, and rate tradeoffs."),
    difficulty: "High",
    minutes: 40,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.Modeling",
      standardIds: ["Modeling"],
      domainTitle: text("High School Modeling"),
      capabilitySummary: text("MAIS-authored modeling and optimization visualization for California high school mathematics.")
    }
  },
  {
    id: "us-ca-3d-strategy-capstone",
    familyId: "strategy-capstone",
    grade: "S6",
    title: text("California 3D Strategy Capstone Lab"),
    description: text("Select the right 3D model, representation, and formula for mixed California high school tasks."),
    difficulty: "High",
    minutes: 42,
    curriculumTrack: "US_CA_MATH",
    publisher: "US_CA_MATH",
    californiaAlignment: {
      domainId: "CA.CCSS.Math.G-MG",
      standardIds: ["G-MG.1", "G-MG.2", "G-MG.3"],
      domainTitle: text("High School Modeling with Geometry"),
      capabilitySummary: text("MAIS-authored 3D strategy synthesis for California modeling with geometry.")
    }
  }
];

export const californiaThreeDVisualizationLabIds = californiaThreeDTopicSeeds.map((seed) => seed.id);

export const californiaThreeDTopics: Topic[] = californiaThreeDTopicSeeds.map((seed, index) => ({
  id: seed.id,
  curriculumTrack: "US_CA_MATH",
  curriculumProfile: californiaProfile,
  region: "US",
  publisher: "US_CA_MATH",
  canonicalTopicId: seed.id,
  grade: seed.grade,
  title: seed.title,
  description: seed.description,
  status: index === 0 ? "in-progress" : "not-started",
  difficulty: seed.difficulty,
  minutes: seed.minutes,
  mastery: index === 0 ? 20 : 0
}));
```

- [ ] **Step 4: Append the 18 topics to California topics**

Modify `data/usCaliforniaTopics.ts`:

```ts
import { californiaThreeDTopics } from "./california3DVisualizationCourse";
```

Then append the course topics at the end of `usCaliforniaTopics`:

```ts
export const usCaliforniaTopics: Topic[] = [
  ...californiaK5TextbookTopics,
  ...californiaElementaryMicroLessonTopics,
  ...californiaQuestionTopics,
  ...californiaThreeDTopics
];
```

- [ ] **Step 5: Run the course-data test**

Run:

```bash
rm -rf .tmp/california-3d-course-test && \
tsc -p tsconfig.json --outDir .tmp/california-3d-course-test --noEmit false --incremental false --module commonjs --moduleResolution node && \
node --test .tmp/california-3d-course-test/lib/california3DVisualizationCourse.test.js
```

Expected: PASS.

## Task 4: Add Pure 3D Geometry Model Layer

**Files:**
- Create: `lib/threeDGeometry.ts`
- Create: `lib/threeDGeometry.test.ts`

- [ ] **Step 1: Write the failing geometry tests**

Create `lib/threeDGeometry.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildThreeDGeometryState,
  type ThreeDGeometryFamilyState
} from "./threeDGeometry";
import { californiaThreeDVisualizationFamilyIds } from "../data/california3DVisualizationCourse";

test("each California 3D family returns finite scene attributes", () => {
  for (const familyId of californiaThreeDVisualizationFamilyIds) {
    const state = buildThreeDGeometryState({ familyId, value: 5, comparison: 6, mode: 0 });
    const numericValues = Object.values(state.metrics).filter((value): value is number => typeof value === "number");
    assert.ok(numericValues.length >= 3, `${familyId} should expose at least three numeric metrics`);
    assert.ok(numericValues.every(Number.isFinite), `${familyId} should expose finite metrics`);
    assert.ok(state.marks.length >= 3, `${familyId} should expose visible marks`);
    assert.ok(state.formula.en.length > 0, `${familyId} should expose formula text`);
  }
});

test("unit cube volume and prism surface area formulas are exact", () => {
  const volume = buildThreeDGeometryState({ familyId: "unit-cube-volume", value: 4, comparison: 3, mode: 2 });
  assert.equal(volume.metrics.width, 4);
  assert.equal(volume.metrics.height, 3);
  assert.equal(volume.metrics.depth, 2);
  assert.equal(volume.metrics.volume, 24);

  const surface = buildThreeDGeometryState({ familyId: "prism-surface-area", value: 4, comparison: 3, mode: 2 });
  assert.equal(surface.metrics.surfaceArea, 52);
});

test("vector projection metrics satisfy dot product relation", () => {
  const state = buildThreeDGeometryState({ familyId: "dot-product-projection", value: 6, comparison: 4, mode: 1 });
  assert.equal(
    Number(state.metrics.dotProduct.toFixed(6)),
    Number((state.metrics.vectorAx * state.metrics.vectorBx + state.metrics.vectorAy * state.metrics.vectorBy + state.metrics.vectorAz * state.metrics.vectorBz).toFixed(6))
  );
});

test("all returned states have stable discriminators", () => {
  const states: ThreeDGeometryFamilyState[] = californiaThreeDVisualizationFamilyIds.map((familyId) =>
    buildThreeDGeometryState({ familyId, value: 5, comparison: 6, mode: 0 })
  );
  assert.deepEqual(states.map((state) => state.familyId), californiaThreeDVisualizationFamilyIds);
});
```

- [ ] **Step 2: Run the failing geometry tests**

Run:

```bash
rm -rf .tmp/three-d-geometry-test && \
tsc -p tsconfig.json --outDir .tmp/three-d-geometry-test --noEmit false --incremental false --module commonjs --moduleResolution node && \
node --test .tmp/three-d-geometry-test/lib/threeDGeometry.test.js
```

Expected: FAIL because `lib/threeDGeometry.ts` does not exist.

- [ ] **Step 3: Implement `lib/threeDGeometry.ts`**

Create `lib/threeDGeometry.ts` with these exports and formulas:

```ts
import type { LocalizedText } from "@/types";
import type { CaliforniaThreeDVisualizationFamilyId } from "@/data/california3DVisualizationCourse";

export type ThreeDGeometryBuildOptions = {
  familyId: CaliforniaThreeDVisualizationFamilyId;
  value: number;
  comparison: number;
  mode: number;
};

export type ThreeDGeometryMark =
  | { kind: "box"; id: string; width: number; height: number; depth: number; color: string }
  | { kind: "sphere"; id: string; radius: number; color: string }
  | { kind: "cylinder"; id: string; radius: number; height: number; color: string }
  | { kind: "cone"; id: string; radius: number; height: number; color: string }
  | { kind: "point"; id: string; x: number; y: number; z: number; color: string }
  | { kind: "line"; id: string; from: [number, number, number]; to: [number, number, number]; color: string }
  | { kind: "plane"; id: string; normal: [number, number, number]; offset: number; color: string };

export type ThreeDGeometryFamilyState = {
  familyId: CaliforniaThreeDVisualizationFamilyId;
  title: LocalizedText;
  formula: LocalizedText;
  metrics: Record<string, number>;
  marks: ThreeDGeometryMark[];
};

function clampInteger(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function text(en: string, zh = en, zhHans = zh): LocalizedText {
  return { en, zh, zhHans };
}

function boxState(familyId: CaliforniaThreeDVisualizationFamilyId, value: number, comparison: number, mode: number): ThreeDGeometryFamilyState {
  const width = clampInteger(value, 1, 10);
  const height = clampInteger(comparison, 1, 10);
  const depth = clampInteger(mode + 1, 1, 4);
  const volume = width * height * depth;
  const surfaceArea = 2 * (width * height + width * depth + height * depth);
  const diagonal = Math.sqrt(width * width + height * height + depth * depth);
  return {
    familyId,
    title: text("Rectangular prism state"),
    formula: text("V = width x height x depth"),
    metrics: { width, height, depth, volume, surfaceArea, diagonal },
    marks: [
      { kind: "box", id: "prism", width, height, depth, color: "#38bdf8" },
      { kind: "line", id: "space-diagonal", from: [0, 0, 0], to: [width, height, depth], color: "#facc15" },
      { kind: "point", id: "origin", x: 0, y: 0, z: 0, color: "#f97316" }
    ]
  };
}

function vectorState(familyId: CaliforniaThreeDVisualizationFamilyId, value: number, comparison: number, mode: number): ThreeDGeometryFamilyState {
  const vectorAx = clampInteger(value, 1, 10);
  const vectorAy = clampInteger(comparison, 1, 10);
  const vectorAz = clampInteger(mode + 2, 1, 6);
  const vectorBx = clampInteger(11 - comparison, 1, 10);
  const vectorBy = clampInteger(value - 1, 1, 9);
  const vectorBz = clampInteger(mode + 1, 1, 5);
  const dotProduct = vectorAx * vectorBx + vectorAy * vectorBy + vectorAz * vectorBz;
  const magnitudeA = Math.sqrt(vectorAx ** 2 + vectorAy ** 2 + vectorAz ** 2);
  const magnitudeB = Math.sqrt(vectorBx ** 2 + vectorBy ** 2 + vectorBz ** 2);
  const projectionLength = dotProduct / magnitudeB;
  return {
    familyId,
    title: text("Vector state"),
    formula: text("a . b = ax bx + ay by + az bz"),
    metrics: { vectorAx, vectorAy, vectorAz, vectorBx, vectorBy, vectorBz, dotProduct, magnitudeA, magnitudeB, projectionLength },
    marks: [
      { kind: "line", id: "vector-a", from: [0, 0, 0], to: [vectorAx, vectorAy, vectorAz], color: "#22d3ee" },
      { kind: "line", id: "vector-b", from: [0, 0, 0], to: [vectorBx, vectorBy, vectorBz], color: "#a3e635" },
      { kind: "point", id: "projection", x: projectionLength, y: 0, z: 0, color: "#facc15" }
    ]
  };
}

export function buildThreeDGeometryState(options: ThreeDGeometryBuildOptions): ThreeDGeometryFamilyState {
  if (
    options.familyId === "vector-components" ||
    options.familyId === "dot-product-projection" ||
    options.familyId === "plane-vector-equations"
  ) {
    return vectorState(options.familyId, options.value, options.comparison, options.mode);
  }

  return boxState(options.familyId, options.value, options.comparison, options.mode);
}
```

This first pass intentionally uses one shared exact box state and one shared vector state so every family has deterministic finite invariants. Later tasks specialize visual marks per family while keeping these invariant tests green.

- [ ] **Step 4: Run geometry tests**

Run:

```bash
rm -rf .tmp/three-d-geometry-test && \
tsc -p tsconfig.json --outDir .tmp/three-d-geometry-test --noEmit false --incremental false --module commonjs --moduleResolution node && \
node --test .tmp/three-d-geometry-test/lib/threeDGeometry.test.js
```

Expected: PASS.

## Task 5: Add Three.js Canvas Wrapper

**Files:**
- Create: `components/visualizations/ThreeDSceneCanvas.tsx`

- [ ] **Step 1: Create the client wrapper**

Create `components/visualizations/ThreeDSceneCanvas.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ThreeDGeometryFamilyState, ThreeDGeometryMark } from "@/lib/threeDGeometry";

export type ThreeDSceneCanvasProps = {
  state: ThreeDGeometryFamilyState;
  accent: string;
  className?: string;
};

function material(color: string, opacity = 0.78) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.08,
    opacity,
    roughness: 0.62,
    transparent: opacity < 1
  });
}

function addBox(scene: THREE.Scene, mark: Extract<ThreeDGeometryMark, { kind: "box" }>) {
  const geometry = new THREE.BoxGeometry(mark.width, mark.height, mark.depth);
  const mesh = new THREE.Mesh(geometry, material(mark.color));
  mesh.position.set(mark.width / 2, mark.height / 2, mark.depth / 2);
  scene.add(mesh);
}

function addLine(scene: THREE.Scene, mark: Extract<ThreeDGeometryMark, { kind: "line" }>) {
  const points = [
    new THREE.Vector3(mark.from[0], mark.from[1], mark.from[2]),
    new THREE.Vector3(mark.to[0], mark.to[1], mark.to[2])
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: mark.color, linewidth: 2 }));
  scene.add(line);
}

function addPoint(scene: THREE.Scene, mark: Extract<ThreeDGeometryMark, { kind: "point" }>) {
  const geometry = new THREE.SphereGeometry(0.16, 16, 16);
  const mesh = new THREE.Mesh(geometry, material(mark.color, 1));
  mesh.position.set(mark.x, mark.y, mark.z);
  scene.add(mesh);
}

function addMark(scene: THREE.Scene, mark: ThreeDGeometryMark) {
  if (mark.kind === "box") addBox(scene, mark);
  if (mark.kind === "line") addLine(scene, mark);
  if (mark.kind === "point") addPoint(scene, mark);
  if (mark.kind === "sphere") {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(mark.radius, 32, 24), material(mark.color));
    scene.add(mesh);
  }
  if (mark.kind === "cylinder") {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(mark.radius, mark.radius, mark.height, 32), material(mark.color));
    scene.add(mesh);
  }
  if (mark.kind === "cone") {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(mark.radius, mark.height, 32), material(mark.color));
    scene.add(mesh);
  }
  if (mark.kind === "plane") {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), material(mark.color, 0.32));
    mesh.position.set(mark.normal[0] * mark.offset, mark.normal[1] * mark.offset, mark.normal[2] * mark.offset);
    scene.add(mesh);
  }
}

export function ThreeDSceneCanvas({ state, accent, className }: ThreeDSceneCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#09111f");
    const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 100);
    camera.position.set(9, 7, 10);
    camera.lookAt(2.5, 2.5, 1.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth || 640, mount.clientHeight || 360);
    renderer.domElement.setAttribute("data-viz-canvas", "three-d-scene");
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight("#ffffff", 0.62));
    const key = new THREE.DirectionalLight("#ffffff", 1.1);
    key.position.set(6, 8, 10);
    scene.add(key);

    const grid = new THREE.GridHelper(12, 12, accent, "#334155");
    scene.add(grid);
    state.marks.forEach((mark) => addMark(scene, mark));

    const resizeObserver = new ResizeObserver(() => {
      const width = mount.clientWidth || 640;
      const height = mount.clientHeight || 360;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.render(scene, camera);
    });
    resizeObserver.observe(mount);
    renderer.render(scene, camera);

    return () => {
      resizeObserver.disconnect();
      renderer.dispose();
      mount.replaceChildren();
    };
  }, [accent, state]);

  return (
    <div
      ref={mountRef}
      data-viz-surface
      data-viz-name="california-3d-threejs-surface"
      className={className ?? "h-[320px] min-h-[320px] w-full overflow-hidden rounded-lg border border-white/10 bg-slate-950 sm:h-[380px]"}
      role="img"
      aria-label={state.title.en}
    />
  );
}
```

- [ ] **Step 2: Run type check**

Run:

```bash
npm run type-check
```

Expected: PASS, or fail only on pre-existing unrelated dirty-tree issues. If it fails because of this task, fix the TypeScript errors before continuing.

## Task 6: Add California 3D Lab Component

**Files:**
- Create: `components/visualizations/CaliforniaThreeDLab.tsx`

- [ ] **Step 1: Create the component**

Create `components/visualizations/CaliforniaThreeDLab.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { ThreeDSceneCanvas } from "@/components/visualizations/ThreeDSceneCanvas";
import { getVisualizationLabByLabId } from "@/data/visualizationLabs";
import { buildThreeDGeometryState } from "@/lib/threeDGeometry";
import type { CaliforniaThreeDVisualizationFamilyId } from "@/data/california3DVisualizationCourse";

export type CaliforniaThreeDLabProps = {
  topicId?: string;
};

const label = {
  value: { en: "Size", zh: "大小", zhHans: "大小" },
  comparison: { en: "Height", zh: "高度", zhHans: "高度" },
  mode: { en: "Mode", zh: "模式", zhHans: "模式" }
};

function localizedText(value: { en: string; zh: string; zhHans?: string }, language: "en" | "zh" | "zhHans") {
  return language === "zhHans" ? value.zhHans ?? value.zh : value[language];
}

export function CaliforniaThreeDLab({ topicId }: CaliforniaThreeDLabProps) {
  const { language } = useSettings();
  const lab = getVisualizationLabByLabId(topicId);
  const familyId = lab?.templateConfig.variant as CaliforniaThreeDVisualizationFamilyId | undefined;
  const [value, setValue] = useState(5);
  const [comparison, setComparison] = useState(6);
  const [mode, setMode] = useState(0);
  const state = useMemo(
    () => buildThreeDGeometryState({ familyId: familyId ?? "shape-explorer", value, comparison, mode }),
    [comparison, familyId, mode, value]
  );
  const title = lab?.title ? localizedText(lab.title, language) : state.title.en;
  const metricEntries = Object.entries(state.metrics).slice(0, 6);

  return (
    <section
      data-viz-mark
      data-viz-family-id={state.familyId}
      data-viz-state-summary={`${state.familyId}:${value}:${comparison}:${mode}`}
      data-viz-value={value}
      data-viz-comparison={comparison}
      data-viz-mode={mode}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <ThreeDSceneCanvas state={state} accent={lab?.templateConfig.accent ?? "#38bdf8"} />
        </div>
        <div className="grid min-w-0 gap-3 rounded-lg border border-white/10 bg-white/80 p-4 text-slate-900 shadow-sm dark:bg-slate-900/80 dark:text-slate-100 lg:w-72">
          <h3 className="text-base font-semibold">{title}</h3>
          <label className="grid gap-1 text-sm font-medium">
            {localizedText(label.value, language)}
            <input className="w-full" type="range" min="1" max="10" step="1" value={value} onChange={(event) => setValue(Number(event.target.value))} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            {localizedText(label.comparison, language)}
            <input className="w-full" type="range" min="1" max="10" step="1" value={comparison} onChange={(event) => setComparison(Number(event.target.value))} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            {localizedText(label.mode, language)}
            <input className="w-full" type="range" min="0" max="2" step="1" value={mode} onChange={(event) => setMode(Number(event.target.value))} />
          </label>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            {metricEntries.map(([key, metric]) => (
              <div key={key} data-viz-metric={key} data-viz-metric-value={metric} className="rounded-md bg-slate-100 p-2 dark:bg-slate-800">
                <dt className="font-semibold">{key}</dt>
                <dd>{Number(metric).toFixed(2)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run type check**

Run:

```bash
npm run type-check
```

Expected: PASS, or fail only on pre-existing unrelated dirty-tree issues. Fix all errors introduced by this task.

## Task 7: Wire The New Module Into The Catalog

**Files:**
- Modify: `data/visualizationLabs.ts`
- Modify: `components/visualizations/VisualizationLabPage.tsx`
- Modify: `components/visualizations/visualizationDiagnostics.ts`
- Modify: `components/visualizations/visualizationDiagnostics.test.ts`

- [ ] **Step 1: Update visualization type unions**

Modify `data/visualizationLabs.ts`:

```ts
import { californiaThreeDTopicSeeds, type CaliforniaThreeDVisualizationFamilyId } from "./california3DVisualizationCourse";
```

Add to `VisualizationModuleId`:

```ts
| "california-3d-visualization-lab"
```

Add to `VisualizationTemplateId`:

```ts
| "california-3d-course"
```

- [ ] **Step 2: Add template metadata**

Add to `templateMetadata`:

```ts
"california-3d-course": {
  category: { en: "California 3D geometry", zh: "California 3D 幾何", zhHans: "California 3D 几何" },
  analyticsSource: "geometry",
  qaProfile: "geometry-heavy"
}
```

- [ ] **Step 3: Route California 3D topics to the new module**

Add helpers near `createTopicLab`:

```ts
const californiaThreeDSeedById = new Map(californiaThreeDTopicSeeds.map((seed) => [seed.id, seed]));

function californiaThreeDFamilyForTopic(topicId: string): CaliforniaThreeDVisualizationFamilyId | null {
  return californiaThreeDSeedById.get(topicId)?.familyId ?? null;
}
```

Then update `createTopicLab` after `templateId` is computed:

```ts
const californiaThreeDFamilyId = californiaThreeDFamilyForTopic(topic.id);
const resolvedTemplateId = californiaThreeDFamilyId ? "california-3d-course" : templateId;
const template = templateMetadata[resolvedTemplateId];
const moduleId = californiaThreeDFamilyId ? "california-3d-visualization-lab" : legacyModuleByTopicId[topic.id] ?? configuredModuleId;
```

Use `resolvedTemplateId` in the returned `templateId`, and set `templateConfig.variant` to the family ID for California 3D labs:

```ts
templateId: resolvedTemplateId,
templateConfig: californiaThreeDFamilyId
  ? {
      variant: californiaThreeDFamilyId,
      focus: labFocusForTopic(topic, resolvedTemplateId, curriculumTrack),
      formula: topicFormulaOverrides[topic.id] ?? formulaForTemplate(resolvedTemplateId),
      xLabel: "x",
      yLabel: "y",
      accent: accentForTopic(topic)
    }
  : templateConfigForTopic(topic, resolvedTemplateId, curriculumTrack),
```

- [ ] **Step 4: Add formula fallback**

Modify `formulaForTemplate`:

```ts
if (templateId === "california-3d-course") return { en: "3D model -> measure -> explain", zh: "3D 模型 -> 度量 -> 解釋", zhHans: "3D 模型 -> 测量 -> 解释" };
```

- [ ] **Step 5: Register component**

Modify `components/visualizations/VisualizationLabPage.tsx`:

```ts
import { CaliforniaThreeDLab } from "@/components/visualizations/CaliforniaThreeDLab";
```

Add to the module component map:

```ts
"california-3d-visualization-lab": CaliforniaThreeDLab
```

- [ ] **Step 6: Add diagnostics assertions**

Modify `components/visualizations/visualizationDiagnostics.test.ts` with:

```ts
import { californiaThreeDVisualizationLabIds } from "@/data/california3DVisualizationCourse";
import { visualizationLabByLabId } from "@/data/visualizationLabs";

test("California 3D visualization course exposes all 18 family labs", () => {
  const issues = californiaThreeDVisualizationLabIds.flatMap((labId) => {
    const lab = visualizationLabByLabId.get(labId);
    if (!lab) return [`${labId}: missing lab`];
    if (lab.moduleId !== "california-3d-visualization-lab") return [`${labId}: wrong module ${lab.moduleId}`];
    if (lab.templateId !== "california-3d-course") return [`${labId}: wrong template ${lab.templateId}`];
    if (lab.publisher !== "US_CA_MATH") return [`${labId}: wrong publisher ${String(lab.publisher)}`];
    return [];
  });

  assert.deepEqual(issues, []);
});
```

- [ ] **Step 7: Run catalog tests**

Run:

```bash
rm -rf .tmp/california-3d-catalog-test && \
tsc -p tsconfig.json --outDir .tmp/california-3d-catalog-test --noEmit false --incremental false --module commonjs --moduleResolution node && \
node --test .tmp/california-3d-catalog-test/components/visualizations/visualizationDiagnostics.test.js .tmp/california-3d-catalog-test/lib/california3DVisualizationCourse.test.js
```

Expected: PASS.

## Task 8: Specialize Elementary California Families

**Files:**
- Modify: `lib/threeDGeometry.ts`
- Modify: `lib/threeDGeometry.test.ts`
- Modify: `components/visualizations/CaliforniaThreeDLab.tsx`

- [ ] **Step 1: Add tests for families 1-6**

Extend `lib/threeDGeometry.test.ts`:

```ts
test("elementary California 3D families expose expected metrics", () => {
  const expectations = [
    ["shape-explorer", "faceCount"],
    ["orthographic-views", "visibleFaceCount"],
    ["nets-folding", "netFaceCount"],
    ["unit-cube-volume", "volume"],
    ["prism-surface-area", "surfaceArea"],
    ["round-solids", "curvedSurfaceMeasure"]
  ] as const;

  for (const [familyId, metric] of expectations) {
    const state = buildThreeDGeometryState({ familyId, value: 5, comparison: 4, mode: 1 });
    assert.ok(Number.isFinite(state.metrics[metric]), `${familyId} missing ${metric}`);
  }
});
```

- [ ] **Step 2: Implement family-specific metrics**

Update `buildThreeDGeometryState` so these families no longer all return the generic box state:

```ts
if (options.familyId === "shape-explorer") return shapeExplorerState(options);
if (options.familyId === "orthographic-views") return orthographicViewsState(options);
if (options.familyId === "nets-folding") return netsFoldingState(options);
if (options.familyId === "unit-cube-volume") return unitCubeVolumeState(options);
if (options.familyId === "prism-surface-area") return prismSurfaceAreaState(options);
if (options.familyId === "round-solids") return roundSolidsState(options);
```

Each state must expose the named metric from Step 1 plus at least three visible marks.

- [ ] **Step 3: Run tests**

Run:

```bash
rm -rf .tmp/three-d-geometry-test && \
tsc -p tsconfig.json --outDir .tmp/three-d-geometry-test --noEmit false --incremental false --module commonjs --moduleResolution node && \
node --test .tmp/three-d-geometry-test/lib/threeDGeometry.test.js
```

Expected: PASS.

## Task 9: Specialize Middle School California Families

**Files:**
- Modify: `lib/threeDGeometry.ts`
- Modify: `lib/threeDGeometry.test.ts`

- [ ] **Step 1: Add tests for families 7-10**

Extend `lib/threeDGeometry.test.ts`:

```ts
test("middle school California 3D families expose expected metrics", () => {
  const expectations = [
    ["cross-section-slicer", "sectionArea"],
    ["pythagorean-diagonal", "spaceDiagonal"],
    ["coordinate-system-3d", "pointDistanceFromOrigin"],
    ["spatial-transformations", "transformedPointCount"]
  ] as const;

  for (const [familyId, metric] of expectations) {
    const state = buildThreeDGeometryState({ familyId, value: 5, comparison: 4, mode: 1 });
    assert.ok(Number.isFinite(state.metrics[metric]), `${familyId} missing ${metric}`);
  }
});
```

- [ ] **Step 2: Implement family-specific states**

Update `buildThreeDGeometryState`:

```ts
if (options.familyId === "cross-section-slicer") return crossSectionSlicerState(options);
if (options.familyId === "pythagorean-diagonal") return pythagoreanDiagonalState(options);
if (options.familyId === "coordinate-system-3d") return coordinateSystem3DState(options);
if (options.familyId === "spatial-transformations") return spatialTransformationsState(options);
```

The `pythagoreanDiagonalState` formula must compute:

```ts
const faceDiagonal = Math.sqrt(width ** 2 + height ** 2);
const spaceDiagonal = Math.sqrt(faceDiagonal ** 2 + depth ** 2);
```

- [ ] **Step 3: Run tests**

Run:

```bash
rm -rf .tmp/three-d-geometry-test && \
tsc -p tsconfig.json --outDir .tmp/three-d-geometry-test --noEmit false --incremental false --module commonjs --moduleResolution node && \
node --test .tmp/three-d-geometry-test/lib/threeDGeometry.test.js
```

Expected: PASS.

## Task 10: Specialize High School Vector, Plane, And Conic Families

**Files:**
- Modify: `lib/threeDGeometry.ts`
- Modify: `lib/threeDGeometry.test.ts`

- [ ] **Step 1: Add tests for families 11-16**

Extend `lib/threeDGeometry.test.ts`:

```ts
test("high school California 3D families expose expected metrics", () => {
  const expectations = [
    ["lines-planes", "intersectionCount"],
    ["angles-distances", "distance"],
    ["vector-components", "magnitudeA"],
    ["dot-product-projection", "projectionLength"],
    ["plane-vector-equations", "signedPlaneValue"],
    ["conic-sections", "eccentricity"]
  ] as const;

  for (const [familyId, metric] of expectations) {
    const state = buildThreeDGeometryState({ familyId, value: 6, comparison: 4, mode: 1 });
    assert.ok(Number.isFinite(state.metrics[metric]), `${familyId} missing ${metric}`);
  }
});
```

- [ ] **Step 2: Implement high school family states**

Update `buildThreeDGeometryState`:

```ts
if (options.familyId === "lines-planes") return linesPlanesState(options);
if (options.familyId === "angles-distances") return anglesDistancesState(options);
if (options.familyId === "vector-components") return vectorComponentsState(options);
if (options.familyId === "dot-product-projection") return dotProductProjectionState(options);
if (options.familyId === "plane-vector-equations") return planeVectorEquationsState(options);
if (options.familyId === "conic-sections") return conicSectionsState(options);
```

The conic state must expose:

```ts
const semiMajor = Math.max(a, b);
const semiMinor = Math.min(a, b);
const focalDistance = Math.sqrt(Math.max(0, semiMajor ** 2 - semiMinor ** 2));
const eccentricity = focalDistance / semiMajor;
```

- [ ] **Step 3: Run tests**

Run:

```bash
rm -rf .tmp/three-d-geometry-test && \
tsc -p tsconfig.json --outDir .tmp/three-d-geometry-test --noEmit false --incremental false --module commonjs --moduleResolution node && \
node --test .tmp/three-d-geometry-test/lib/threeDGeometry.test.js
```

Expected: PASS.

## Task 11: Specialize Modeling And Capstone Families

**Files:**
- Modify: `lib/threeDGeometry.ts`
- Modify: `lib/threeDGeometry.test.ts`
- Modify: `components/visualizations/CaliforniaThreeDLab.tsx`

- [ ] **Step 1: Add tests for families 17-18**

Extend `lib/threeDGeometry.test.ts`:

```ts
test("modeling and capstone families expose decision metrics", () => {
  const modeling = buildThreeDGeometryState({ familyId: "modeling-optimization", value: 6, comparison: 4, mode: 2 });
  assert.ok(Number.isFinite(modeling.metrics.constraintValue));
  assert.ok(Number.isFinite(modeling.metrics.objectiveValue));

  const capstone = buildThreeDGeometryState({ familyId: "strategy-capstone", value: 6, comparison: 4, mode: 2 });
  assert.ok(Number.isFinite(capstone.metrics.representationScore));
  assert.ok(Number.isFinite(capstone.metrics.strategyScore));
});
```

- [ ] **Step 2: Implement modeling and capstone state**

Update `buildThreeDGeometryState`:

```ts
if (options.familyId === "modeling-optimization") return modelingOptimizationState(options);
if (options.familyId === "strategy-capstone") return strategyCapstoneState(options);
```

The modeling state must expose both `constraintValue` and `objectiveValue`; the capstone state must expose both `representationScore` and `strategyScore`.

- [ ] **Step 3: Run tests**

Run:

```bash
rm -rf .tmp/three-d-geometry-test && \
tsc -p tsconfig.json --outDir .tmp/three-d-geometry-test --noEmit false --incremental false --module commonjs --moduleResolution node && \
node --test .tmp/three-d-geometry-test/lib/threeDGeometry.test.js
```

Expected: PASS.

## Task 12: Add California 3D Playwright Regression

**Files:**
- Create: `tests/e2e/california-3d-visualization-labs.spec.ts`

- [ ] **Step 1: Create regression spec**

Create `tests/e2e/california-3d-visualization-labs.spec.ts`:

```ts
import { expect, test, type Locator, type Page } from "@playwright/test";
import { californiaThreeDVisualizationLabIds } from "../../data/california3DVisualizationCourse";
import { buildVisualizationLabHref, visualizationLabSectionSelector } from "../../components/visualizations/visualizationDiagnostics";
import { visualizationLabByLabId } from "../../data/visualizationLabs";
import { collectPageErrors, expectNoPageErrors, loginAsDemoStudentApi } from "./helpers";

test.describe("California 3D Visualization Lab course", () => {
  test("all 18 California 3D labs render, expose metrics, and have nonblank canvas pixels", async ({ page }) => {
    test.slow();
    test.setTimeout(300_000);
    const pageErrors = collectPageErrors(page);
    await loginAsDemoStudentApi(page);

    for (const labId of californiaThreeDVisualizationLabIds) {
      const lab = visualizationLabByLabId.get(labId);
      expect(lab, `${labId} should exist`).toBeTruthy();
      await page.goto(buildVisualizationLabHref(lab!));
      await disableMotion(page);
      const section = page.locator(visualizationLabSectionSelector(lab!));
      await expect(section).toBeVisible();
      await expect(section.locator("[data-viz-family-id]")).toHaveAttribute("data-viz-family-id", /.+/);
      await expect(section.locator("[data-viz-surface]").first()).toBeVisible();
      await expect(section.locator("[data-viz-metric]").first()).toBeVisible();
      await sweepRangeControls(section);
      await expectFiniteMetrics(section);
      await expectNonBlankCanvas(page, section);
    }

    expectNoPageErrors(pageErrors);
  });
});

async function disableMotion(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `
  });
}

async function sweepRangeControls(section: Locator) {
  const ranges = section.locator('input[type="range"]');
  const count = await ranges.count();
  for (let index = 0; index < count; index += 1) {
    const range = ranges.nth(index);
    const values = await range.evaluate((input) => {
      const element = input as HTMLInputElement;
      return [element.min, element.max, element.value].filter(Boolean);
    });
    for (const value of values) {
      await range.evaluate((input, nextValue) => {
        const element = input as HTMLInputElement;
        const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value");
        descriptor?.set?.call(element, nextValue);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      }, value);
    }
  }
}

async function expectFiniteMetrics(section: Locator) {
  const issues = await section.evaluate((root) =>
    Array.from(root.querySelectorAll("[data-viz-metric-value]")).flatMap((element) => {
      const value = Number(element.getAttribute("data-viz-metric-value"));
      return Number.isFinite(value) ? [] : [`${element.getAttribute("data-viz-metric")} is not finite`];
    })
  );
  expect(issues).toEqual([]);
}

async function expectNonBlankCanvas(page: Page, section: Locator) {
  const canvas = section.locator("canvas[data-viz-canvas]").first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(100);
  expect(box?.height ?? 0).toBeGreaterThan(100);
  const screenshot = await canvas.screenshot();
  expect(screenshot.length).toBeGreaterThan(1000);
  const nonBackgroundPixels = await page.evaluate(() => {
    const canvas = document.querySelector("canvas[data-viz-canvas]") as HTMLCanvasElement | null;
    if (!canvas) return 0;
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    if (!context) return 0;
    const gl = context as WebGLRenderingContext;
    const width = Math.max(1, Math.min(64, canvas.width));
    const height = Math.max(1, Math.min(64, canvas.height));
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let varied = 0;
    for (let index = 0; index < pixels.length; index += 16) {
      if (pixels[index] > 25 || pixels[index + 1] > 25 || pixels[index + 2] > 25) varied += 1;
    }
    return varied;
  });
  expect(nonBackgroundPixels).toBeGreaterThan(0);
}
```

- [ ] **Step 2: Run targeted Playwright checks**

Run:

```bash
VISUALIZATION_SWEEP_TRACKS=US npx playwright test tests/e2e/california-3d-visualization-labs.spec.ts --project=desktop-chrome
```

Expected: PASS.

Run:

```bash
VISUALIZATION_SWEEP_TRACKS=US npx playwright test tests/e2e/california-3d-visualization-labs.spec.ts --project=mobile-chrome
```

Expected: PASS.

## Task 13: Run Existing Visualization And MVP Gates

**Files:**
- No new files.

- [ ] **Step 1: Run type check**

Run:

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 2: Run targeted Node tests**

Run:

```bash
rm -rf .tmp/california-3d-node-tests && \
tsc -p tsconfig.json --outDir .tmp/california-3d-node-tests --noEmit false --incremental false --module commonjs --moduleResolution node && \
node --test \
  .tmp/california-3d-node-tests/lib/california3DVisualizationCourse.test.js \
  .tmp/california-3d-node-tests/lib/threeDGeometry.test.js \
  .tmp/california-3d-node-tests/components/visualizations/visualizationDiagnostics.test.js
```

Expected: PASS.

- [ ] **Step 3: Run MVP readiness**

Run:

```bash
npm run test:mvp
```

Expected: PASS. This proves the visualization catalog count still matches roadmap topic count plus five capstones.

- [ ] **Step 4: Run California 3D Playwright spec**

Run:

```bash
npx playwright test tests/e2e/california-3d-visualization-labs.spec.ts --project=desktop-chrome --project=mobile-chrome
```

Expected: PASS.

## Task 14: S18 Curriculum QA Report

**Files:**
- Create: `coordination/content-qa/2026-06-20-S18-california-3d-visualization-course-qa.md`

- [ ] **Step 1: Create S18 report**

Create `coordination/content-qa/2026-06-20-S18-california-3d-visualization-course-qa.md`:

```markdown
# S18 California 3D Visualization Course QA

- Date: 2026-06-20
- Scope: California-first 3D Visualization Lab course with 18 reusable families.
- Source policy: identifiers, domain codes, and MAIS-authored summaries only.
- External source roles: CDE/CCSS official structure, Common Core public-license metadata, IXL navigation as secondary signal only.

## Coverage Matrix

| Family | Lab ID | Domain IDs | QA verdict |
| --- | --- | --- | --- |
| 3D shape explorer | `us-ca-3d-shape-explorer` | `CA.CCSS.Math.1.G` | pending S18 review |
| Front/top/side view explorer | `us-ca-3d-orthographic-views` | `CA.CCSS.Math.5.G` | pending S18 review |
| Nets and folding lab | `us-ca-3d-nets-folding` | `CA.CCSS.Math.6.G` | pending S18 review |
| Unit cubes and cuboid volume | `us-ca-3d-unit-cube-volume` | `CA.CCSS.Math.5.MD` | pending S18 review |
| Surface area of prisms/cuboids | `us-ca-3d-prism-surface-area` | `CA.CCSS.Math.6.G` | pending S18 review |
| Cylinders, cones, spheres | `us-ca-3d-round-solids` | `CA.CCSS.Math.7.G` | pending S18 review |
| Cross-section slicer | `us-ca-3d-cross-section-slicer` | `CA.CCSS.Math.7.G` | pending S18 review |
| 3D Pythagorean/space diagonal | `us-ca-3d-pythagorean-diagonal` | `CA.CCSS.Math.8.G` | pending S18 review |
| 3D coordinate system | `us-ca-3d-coordinate-system` | `CA.CCSS.Math.G-GPE` | pending S18 review |
| Spatial transformations/rotations | `us-ca-3d-spatial-transformations` | `CA.CCSS.Math.8.G` | pending S18 review |
| Lines and planes in space | `us-ca-3d-lines-planes` | `CA.CCSS.Math.G-GMD` | pending S18 review |
| Angles and distances in space | `us-ca-3d-angles-distances` | `CA.CCSS.Math.G-SRT` | pending S18 review |
| Space vectors/components | `us-ca-3d-vector-components` | `CA.CCSS.Math.N-VM` | pending S18 review |
| Dot product/projection in 3D | `us-ca-3d-dot-product-projection` | `CA.CCSS.Math.N-VM` | pending S18 review |
| Plane/vector equations | `us-ca-3d-plane-vector-equations` | `CA.CCSS.Math.A-CED` | pending S18 review |
| Conic sections from cone slicing | `us-ca-3d-conic-sections` | `CA.CCSS.Math.G-GPE` | pending S18 review |
| 3D modeling/optimization | `us-ca-3d-modeling-optimization` | `CA.CCSS.Math.Modeling` | pending S18 review |
| Cross-curriculum 3D strategy/capstone lab | `us-ca-3d-strategy-capstone` | `CA.CCSS.Math.G-MG` | pending S18 review |

## Required S18 Checks

- Confirm each domain assignment is reasonable for California standards-aligned practice.
- Confirm public copy does not claim a complete official California course.
- Confirm student-facing text is MAIS-authored and does not copy CDE, CCSS, IXL, or textbook wording.
- Confirm high-school vector/conic/modeling labs are labeled as advanced California-aligned practice, not mandatory grade-level coverage for every learner.

## Release Verdict

- Verdict before S18 review: candidate-only.
```

- [ ] **Step 2: Replace pending verdicts after review**

After S18 review, update only the `QA verdict` cells and `Release Verdict` section with one of:

```text
approved-for-review
approved-for-integration
approved-for-production
blocked
```

Do not edit source code as part of S18 QA unless the owner explicitly assigns that implementation work.

## Task 15: S11/S22 Release Evidence

**Files:**
- Create: `coordination/reports/2026-06-20-S11-california-3d-visualization-regression.md`
- Create: `coordination/reports/2026-06-20-S22-california-3d-visualization-release-readiness.md`

- [ ] **Step 1: Create S11 regression report**

Create `coordination/reports/2026-06-20-S11-california-3d-visualization-regression.md`:

```markdown
# S11 California 3D Visualization Regression Evidence

- Date: 2026-06-20
- Scope: 18 California 3D Visualization Lab families.

## Required Evidence

- `npm run type-check`
- targeted Node tests for course data, geometry state, and diagnostics
- `npm run test:mvp`
- `npx playwright test tests/e2e/california-3d-visualization-labs.spec.ts --project=desktop-chrome --project=mobile-chrome`

## Result

- Status before S11 run: pending.
```

- [ ] **Step 2: Create S22 release readiness report**

Create `coordination/reports/2026-06-20-S22-california-3d-visualization-release-readiness.md`:

```markdown
# S22 California 3D Visualization Release Readiness

- Date: 2026-06-20
- Scope: Three.js dependency, 18 California 3D Visualization Lab routes, local/production parity.

## Required Evidence

- dependency diff reviewed: `three`
- `npm run build`
- local desktop/mobile 3D render smoke
- production preview smoke before production promotion
- no release from dirty repository root unless owner explicitly accepts the risk for this named scope

## Result

- Status before S22 run: pending.
```

## Task 16: Later China And Hong Kong Mapping Plan

**Files:**
- Modify after California production gates: `data/visualizationLabs.ts`
- Modify after California production gates: relevant Mainland/HK topic data only with owner assignment.

- [ ] **Step 1: Do not start China/Hong Kong code until California is green**

Required evidence before starting China/Hong Kong mappings:

```text
S06 implementation complete
S18 California QA accepted
S11 California 3D regression accepted
S22 California release readiness accepted
```

- [ ] **Step 2: Map China/Mainland topics to existing 18 families**

Use existing current 3D-heavy Mainland topics first:

```text
pep-high-s4-plane-vectors
pep-high-s4-solid-geometry-intro
pep-high-s5-space-vectors
pep-high-s5-conics
pep-high-s6-analytic-geometry-synthesis
bnu-primary-p6-lower-cylinders-cones
bnu-junior-s1-upper-spatial-figures
bnu-junior-s3-upper-projection-views
bnu-high-s4-立体几何初步
bnu-high-s5-空间向量与立体几何
hjb-primary-p6-lower-cylinder-cone
hjb-high-s5-简单几何体
hjb-high-s5-空间向量及其应用
hjb-high-s5-圆锥曲线
```

- [ ] **Step 3: Map Hong Kong topics after China/Mainland pass**

Use HK geometry/measurement topics first:

```text
p1-shapes-patterns
p3-geometry-patterns
p5-volume
coordinates
transformations
trigonometry-basics
coordinate-geometry
mixed-problem-solving
```

Do not claim HK or Mainland course completion until S18 curriculum QA and S11 regression evidence exist for those mappings.

## Final Verification Checklist

- [ ] `data/california3DVisualizationCourse.ts` exports 18 family IDs.
- [ ] `data/usCaliforniaTopics.ts` includes the 18 California 3D topics.
- [ ] `data/visualizationLabs.ts` produces 18 California labs using `moduleId: "california-3d-visualization-lab"`.
- [ ] `components/visualizations/VisualizationLabPage.tsx` registers `CaliforniaThreeDLab`.
- [ ] `lib/threeDGeometry.test.ts` passes.
- [ ] `lib/california3DVisualizationCourse.test.ts` passes.
- [ ] `components/visualizations/visualizationDiagnostics.test.ts` passes.
- [ ] `tests/e2e/california-3d-visualization-labs.spec.ts` passes on desktop and mobile.
- [ ] `npm run type-check` passes.
- [ ] `npm run test:mvp` passes.
- [ ] S18 QA artifact exists and has a non-pending release verdict.
- [ ] S23 promotion artifact names S04/S05/S06/S11/S18/S22 responsibilities.
- [ ] S11 report records the actual regression command results.
- [ ] S22 report records build/release readiness.
