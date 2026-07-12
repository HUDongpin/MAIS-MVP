# 2026-07-01 A25 Effective Work Order - A06 visualization lead

- Owner: A06 visualization lead
- Priority: P2
- Reason: Largest runtime/test package and linked dirty visualization worktree.
- Entries: 443
- From P0 proposals: 0
- Dominant slice: runtime app/API/data/public: 234
- Pathspec: `coordination/release-intake/latest-A25-effective-owner-a06-visualization-lead.pathspec`

## Required Final State

Reviewed commit, owner-approved discard, evidence archive, or blocker.

## Suggested Commands

```bash
node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a06-visualization-lead.pathspec --status
node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a06-visualization-lead.pathspec --diffstat
```

## Status Buckets

- `??`: 379
- `M`: 64

## P0 Proposal Confidence

- No P0 proposal entries in this package.

## Path Sample

- `M` `app/student/tools/visualizations/[labId]/page.tsx`
- `M` `app/student/tools/visualizations/page.tsx`
- `M` `app/visualization-lab/loading.tsx`
- `M` `app/visualization-lab/page.tsx`
- `M` `components/visualizations/CalculusStatsLab.tsx`
- `M` `components/visualizations/ConfiguredVisualizationLab.tsx`
- `M` `components/visualizations/CoordinatePlaneDemo.tsx`
- `M` `components/visualizations/FunctionGraphExplorer.tsx`
- `M` `components/visualizations/FunctionModelComparer.tsx`
- `M` `components/visualizations/GeometryExplorer.tsx`
- `M` `components/visualizations/ProbabilitySimulator.tsx`
- `M` `components/visualizations/RoadmapVisualizationSuite.tsx`
- `M` `components/visualizations/TrigWaveExplorer.tsx`
- `M` `components/visualizations/VisualizationCard.tsx`
- `M` `components/visualizations/VisualizationLabBackToTopButton.tsx`
- `M` `components/visualizations/VisualizationLabPage.tsx`
- `M` `components/visualizations/assets/lab-quest-island-map-4k.webp`
- `M` `components/visualizations/assets/lab-quest-island-map-en-4k.webp`
- `M` `components/visualizations/configuredVisualizationLabRegressions.test.ts`
- `M` `components/visualizations/three/ThreeDLabCanvas.tsx`
- `M` `components/visualizations/three/ThreeDLabSceneRegistry.tsx`
- `M` `components/visualizations/three/configuredThreeDRenderPlan.test.ts`
- `M` `components/visualizations/three/configuredThreeDRenderPlan.ts`
- `M` `components/visualizations/three/manim/MathFormulaOverlay.tsx`
- `M` `components/visualizations/three/manim/MathSceneRuntime.tsx`
- `M` `components/visualizations/three/manim/mathCameraDirector.ts`
- `M` `components/visualizations/three/manim/mathCoordinateSpace.test.ts`
- `M` `components/visualizations/three/manim/mathCoordinateSpace.ts`
- `M` `components/visualizations/three/manim/mathCoordinateSystem3D.test.ts`
- `M` `components/visualizations/three/manim/mathCoordinateSystem3D.ts`
- `M` `components/visualizations/three/manim/mathCurveObject.test.ts`
- `M` `components/visualizations/three/manim/mathCurveObject.ts`
- `M` `components/visualizations/three/manim/mathFormulaBindings.test.ts`
- `M` `components/visualizations/three/manim/mathFormulaBindings.ts`
- `M` `components/visualizations/three/manim/mathFormulaLayer.test.ts`
- `M` `components/visualizations/three/manim/mathFormulaLayer.ts`
- `M` `components/visualizations/three/manim/mathObjectTransform.test.ts`
- `M` `components/visualizations/three/manim/mathObjectTransform.ts`
- `M` `components/visualizations/three/manim/mathSceneCheckpoint.test.ts`
- `M` `components/visualizations/three/manim/mathSceneCheckpoint.ts`
- `M` `components/visualizations/three/manim/mathScenePlayback.test.ts`
- `M` `components/visualizations/three/manim/mathScenePlayback.ts`
- `M` `components/visualizations/three/manim/mathSceneRegistry.test.ts`
- `M` `components/visualizations/three/manim/mathSceneRegistry.ts`
- `M` `components/visualizations/three/manim/mathSceneRuntimeState.test.ts`
- `M` `components/visualizations/three/manim/mathSceneRuntimeState.ts`
- `M` `components/visualizations/three/manim/mathSceneTypes.ts`
- `M` `components/visualizations/three/manim/mathTimeline.test.ts`
- `M` `components/visualizations/three/manim/mathTimeline.ts`
- `M` `components/visualizations/three/manim/mathUpdaterRegistry.ts`
- `M` `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx`
- `M` `components/visualizations/three/threeDCanvasContract.test.ts`
- `M` `components/visualizations/three/threeDCanvasContract.ts`
- `M` `components/visualizations/three/threeDCanvasSurfaceContract.ts`
- `M` `components/visualizations/three/threeDLaunchCoverageContract.test.ts`
- `M` `components/visualizations/three/threeDSceneMath.catalog.test.ts`
- `M` `components/visualizations/three/threeDSceneMath.test.ts`
- `M` `components/visualizations/three/threeDSceneMath.ts`
- `M` `components/visualizations/three/threeDSceneTypes.ts`
- `M` `components/visualizations/three/threeDSceneVariantMetadata.ts`
- `M` `components/visualizations/three/threeDTopicCatalogBuilderContract.test.ts`
- `M` `components/visualizations/visualizationDiagnostics.premiumSmoke.test.ts`
- `M` `components/visualizations/visualizationDiagnostics.test.ts`
- `M` `data/visualizationLabs.ts`
- `??` `app/visualization-lab/stembench-euler-demo/page.tsx`
- `??` `components/visualizations/PremiumThreeDDirectRouteShell.tsx`
- `??` `components/visualizations/StembenchEulerLineDemo.tsx`
- `??` `components/visualizations/VisualizationLabRouteShell.tsx`
- `??` `components/visualizations/premiumThreeDDirectLabs.ts`
- `??` `components/visualizations/three/manim/mathAlwaysMethodUpdater.test.ts`
- `??` `components/visualizations/three/manim/mathAlwaysMethodUpdater.ts`
- `??` `components/visualizations/three/manim/mathAlwaysRedraw.test.ts`
- `??` `components/visualizations/three/manim/mathAlwaysRedraw.ts`
- `??` `components/visualizations/three/manim/mathAnimationBuilder.test.ts`
- `??` `components/visualizations/three/manim/mathAnimationBuilder.ts`
- `??` `components/visualizations/three/manim/mathAnimationComposition.test.ts`
- `??` `components/visualizations/three/manim/mathAnimationComposition.ts`
- `??` `components/visualizations/three/manim/mathAnimationLifecycle.test.ts`
- `??` `components/visualizations/three/manim/mathAnimationLifecycle.ts`
- `??` `components/visualizations/three/manim/mathAnimationRuntime.test.ts`
