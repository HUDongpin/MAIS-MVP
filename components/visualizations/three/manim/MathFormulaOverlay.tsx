"use client";

import { MathText } from "@/components/math/MathText";
import {
  buildFormulaOverlayCollisionDiagnostics,
  formulaOverlayCollisionDataAttributes
} from "./mathFormulaCollision";
import {
  buildActiveProjectedLabelTextByObjectId,
  buildFormulaLayerState,
  formulaLayerActiveTokenDataAttributes,
  formulaLayerProjectedLabelTextDataAttributes,
  summarizeActiveProjectedLabelText,
  summarizeFormulaLayerActiveTokens
} from "./mathFormulaLayer";
import { buildFormulaSvgMorphRuntime, formulaSvgMorphRuntimeDataAttributes } from "./mathFormulaSvgMorphRuntime";
import {
  PROJECTED_LABEL_SOURCE_CONTRACT,
  buildProjectedLabelAnchorsFromRuntimeState,
  buildSceneProjectedLabelAnchorsFromRuntimeState,
  projectedLabelAnchorDataAttributes,
  summarizeProjectedLabelAnchors,
  type ProjectionViewport
} from "./mathProjectedLabels";
import { buildProjectedLabelPlacement } from "./mathProjectedLabelPlacement";
import { buildTexColorizedFormula, serializeTexColorizedFormula, texColorizedFormulaDataAttributes } from "./mathTexColorizedFormula";
import { activeMathSceneCaption } from "./mathSceneCaptions";
import type { MathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec } from "./mathSceneTypes";

export function MathFormulaOverlay({
  activeConceptId,
  activeConceptIds = [],
  projectedLabelViewport = { width: 800, height: 450 },
  projectedLabelViewportSource = "fallback",
  runtimeState,
  scene
}: {
  activeConceptId: string;
  activeConceptIds?: string[];
  projectedLabelViewport?: ProjectionViewport;
  projectedLabelViewportSource?: "fallback" | "measured";
  runtimeState?: MathSceneRuntimeState;
  scene: MathSceneSpec;
}) {
  const layer = buildFormulaLayerState(scene, { activeConceptId, activeConceptIds });
  const formula = layer.formulas[0];
  const responsiveFormula = projectedLabelViewport.width < 640 && formula.mobileLatex
    ? { ...formula, latex: formula.mobileLatex }
    : formula;
  const svgMorphRuntime = buildFormulaSvgMorphRuntime(scene, {
    formulaId: formula.id,
    progress: runtimeState?.timeline.easedLocalProgress ?? 0
  });
  const svgMorphRuntimeAttributes = formulaSvgMorphRuntimeDataAttributes(svgMorphRuntime);
  const visibleSvgMorphFrames = svgMorphRuntime.frames.filter((frame) => frame.compatible);
  const canonicalColorizedFormula = buildTexColorizedFormula(formula);
  const colorizedFormula = responsiveFormula === formula
    ? canonicalColorizedFormula
    : buildTexColorizedFormula(responsiveFormula);
  const colorizedFormulaAttributes = texColorizedFormulaDataAttributes(colorizedFormula);
  const colorizedFormulaJson = serializeTexColorizedFormula(colorizedFormula);
  const tokenCount = layer.formulas.reduce((sum, entry) => sum + entry.tokens.length, 0);
  const svgMorphIds = Object.keys(layer.svgPathMorphCacheKeys).sort();
  const svgMorphMarkerIds = svgMorphRuntime.frames.length === 0
    ? svgMorphIds.length > 0 ? svgMorphIds : ["formula-svg-ready"]
    : [];
  const activeProjectedLabelTextByObjectId = buildActiveProjectedLabelTextByObjectId(layer);
  const activeTokenAttributes = formulaLayerActiveTokenDataAttributes(
    summarizeFormulaLayerActiveTokens(layer)
  );
  const projectedLabelTextAttributes = formulaLayerProjectedLabelTextDataAttributes(
    summarizeActiveProjectedLabelText(layer)
  );
  const sceneProjectedLabelAnchors = runtimeState
    ? buildSceneProjectedLabelAnchorsFromRuntimeState(
      runtimeState,
      projectedLabelViewport,
      scene.projectedLabels ?? []
    )
    : [];
  const sceneProjectedLabelObjectIds = new Set(sceneProjectedLabelAnchors.map((label) => label.objectId));
  const activeProjectedLabelAnchors = runtimeState && !scene.suppressActiveProjectedLabels
    ? buildProjectedLabelAnchorsFromRuntimeState(runtimeState, projectedLabelViewport, {
      anchorForObject: (node) => layer.activeObjectAnchorNames[node.id] ?? "center",
      objectIds: layer.activeObjectIds,
      textForObject: (node) => activeProjectedLabelTextByObjectId[node.id] ?? node.conceptId
    }).filter((label) => !sceneProjectedLabelObjectIds.has(label.objectId))
    : [];
  const projectedLabelAnchors = [...sceneProjectedLabelAnchors, ...activeProjectedLabelAnchors];
  const projectedLabels = projectedLabelAnchors.filter((label) => label.visible);
  const projectedLabelAttributes = projectedLabelAnchorDataAttributes(
    summarizeProjectedLabelAnchors(projectedLabelAnchors)
  );
  const formulaCollisionDiagnostics = buildFormulaOverlayCollisionDiagnostics({
    formulaId: formula.id,
    projectedLabels,
    tokenCount,
    viewport: projectedLabelViewport
  });
  const formulaCollisionAttributes = formulaOverlayCollisionDataAttributes(formulaCollisionDiagnostics);
  const viewportWidth = Math.max(1, projectedLabelViewport.width);
  const viewportHeight = Math.max(1, projectedLabelViewport.height);
  const activeCaption = activeMathSceneCaption(scene, {
    elapsedSeconds: runtimeState?.timeline.elapsedSeconds ?? -1,
    viewportWidth
  });

  return (
    <div
      data-viz-manim-overlay-layer
      data-viz-manim-projected-label-count={projectedLabelAttributes["data-viz-manim-projected-label-count"]}
      data-viz-manim-projected-label-visible-count={projectedLabelAttributes["data-viz-manim-projected-label-visible-count"]}
      data-viz-manim-projected-label-hidden-count={projectedLabelAttributes["data-viz-manim-projected-label-hidden-count"]}
      data-viz-manim-projected-label-object-count={projectedLabelAttributes["data-viz-manim-projected-label-object-count"]}
      data-viz-manim-projected-label-object-ids={projectedLabelAttributes["data-viz-manim-projected-label-object-ids"]}
      data-viz-manim-projected-label-concept-ids={projectedLabelAttributes["data-viz-manim-projected-label-concept-ids"]}
      data-viz-manim-projected-label-hidden-object-ids={projectedLabelAttributes["data-viz-manim-projected-label-hidden-object-ids"]}
      data-viz-manim-projected-label-summary={projectedLabelAttributes["data-viz-manim-projected-label-summary"]}
      data-viz-manim-projected-label-text-object-count={projectedLabelTextAttributes["data-viz-manim-projected-label-text-object-count"]}
      data-viz-manim-projected-label-text-object-ids={projectedLabelTextAttributes["data-viz-manim-projected-label-text-object-ids"]}
      data-viz-manim-projected-label-text-policy={projectedLabelTextAttributes["data-viz-manim-projected-label-text-policy"]}
      data-viz-manim-projected-label-text-source={projectedLabelTextAttributes["data-viz-manim-projected-label-text-source"]}
      data-viz-manim-projected-label-text-source-contract={projectedLabelTextAttributes["data-viz-manim-projected-label-text-source-contract"]}
      data-viz-manim-projected-label-text-summary={projectedLabelTextAttributes["data-viz-manim-projected-label-text-summary"]}
      data-viz-manim-projected-label-text-token-summary={projectedLabelTextAttributes["data-viz-manim-projected-label-text-token-summary"]}
      data-viz-manim-formula-viewport-width={viewportWidth.toFixed(0)}
      data-viz-manim-formula-viewport-height={viewportHeight.toFixed(0)}
      data-viz-manim-formula-viewport-source={projectedLabelViewportSource}
      data-viz-manim-formula-layer-source-contract={layer.sourceContract}
      data-viz-manim-formula-collision-count={formulaCollisionAttributes["data-viz-manim-formula-collision-count"]}
      data-viz-manim-formula-collision-label-ids={formulaCollisionAttributes["data-viz-manim-formula-collision-label-ids"]}
      data-viz-manim-formula-mobile-viewport={formulaCollisionAttributes["data-viz-manim-formula-mobile-viewport"]}
      data-viz-manim-formula-placement={formulaCollisionAttributes["data-viz-manim-formula-placement"]}
      data-viz-manim-formula-safe-area-status={formulaCollisionAttributes["data-viz-manim-formula-safe-area-status"]}
      data-viz-manim-formula-safe-area-summary={formulaCollisionAttributes["data-viz-manim-formula-safe-area-summary"]}
      data-viz-manim-projected-label-source-contract={projectedLabelAttributes["data-viz-manim-projected-label-source-contract"]}
      className="pointer-events-none absolute inset-0"
    >
      <div
        data-viz-three-formula
        data-viz-manim-formula={formula.id}
        data-viz-manim-formula-overlay
        aria-label="Scrollable MAIS Manim formula"
        role="region"
        tabIndex={0}
        data-viz-manim-formula-id={formula.id}
        data-viz-manim-formula-display-text={responsiveFormula.latex}
        data-viz-manim-svg-morph-runtime-compatible-frame-count={svgMorphRuntimeAttributes["data-viz-manim-svg-morph-runtime-compatible-frame-count"]}
        data-viz-manim-svg-morph-runtime-formula-id={svgMorphRuntimeAttributes["data-viz-manim-svg-morph-runtime-formula-id"]}
        data-viz-manim-svg-morph-runtime-frame-count={svgMorphRuntimeAttributes["data-viz-manim-svg-morph-runtime-frame-count"]}
        data-viz-manim-svg-morph-runtime-frame-ids={svgMorphRuntimeAttributes["data-viz-manim-svg-morph-runtime-frame-ids"]}
        data-viz-manim-svg-morph-runtime-frame-path-preview={svgMorphRuntimeAttributes["data-viz-manim-svg-morph-runtime-frame-path-preview"]}
        data-viz-manim-svg-morph-runtime-issue-count={svgMorphRuntimeAttributes["data-viz-manim-svg-morph-runtime-issue-count"]}
        data-viz-manim-svg-morph-runtime-progress={svgMorphRuntimeAttributes["data-viz-manim-svg-morph-runtime-progress"]}
        data-viz-manim-svg-morph-runtime-scene-id={svgMorphRuntimeAttributes["data-viz-manim-svg-morph-runtime-scene-id"]}
        data-viz-manim-svg-morph-runtime-source-contract={svgMorphRuntimeAttributes["data-viz-manim-svg-morph-runtime-source-contract"]}
        data-viz-manim-svg-morph-runtime-summary={svgMorphRuntimeAttributes["data-viz-manim-svg-morph-runtime-summary"]}
        data-viz-manim-tex-colorized-colored-character-count={colorizedFormulaAttributes["data-viz-manim-tex-colorized-colored-character-count"]}
        data-viz-manim-tex-colorized-colored-token-count={colorizedFormulaAttributes["data-viz-manim-tex-colorized-colored-token-count"]}
        data-viz-manim-tex-colorized-colored-token-ids={colorizedFormulaAttributes["data-viz-manim-tex-colorized-colored-token-ids"]}
        data-viz-manim-tex-colorized-coverage-ratio={colorizedFormulaAttributes["data-viz-manim-tex-colorized-coverage-ratio"]}
        data-viz-manim-tex-colorized-coverage-summary={colorizedFormulaAttributes["data-viz-manim-tex-colorized-coverage-summary"]}
        data-viz-manim-tex-colorized-formula-id={colorizedFormulaAttributes["data-viz-manim-tex-colorized-formula-id"]}
        data-viz-manim-tex-colorized-interval-order-summary={colorizedFormulaAttributes["data-viz-manim-tex-colorized-interval-order-summary"]}
        data-viz-manim-tex-colorized-interval-summary={colorizedFormulaAttributes["data-viz-manim-tex-colorized-interval-summary"]}
        data-viz-manim-tex-colorized-role-summary={colorizedFormulaAttributes["data-viz-manim-tex-colorized-role-summary"]}
        data-viz-manim-tex-colorized-source-contract={colorizedFormulaAttributes["data-viz-manim-tex-colorized-source-contract"]}
        data-viz-manim-tex-colorized-source-character-count={colorizedFormulaAttributes["data-viz-manim-tex-colorized-source-character-count"]}
        data-viz-manim-tex-colorized-summary={colorizedFormulaAttributes["data-viz-manim-tex-colorized-summary"]}
        data-viz-manim-tex-colorized-token-count={colorizedFormulaAttributes["data-viz-manim-tex-colorized-token-count"]}
        data-viz-manim-tex-colorized-uncolored-token-count={colorizedFormulaAttributes["data-viz-manim-tex-colorized-uncolored-token-count"]}
        data-viz-manim-tex-colorized-uncolored-token-ids={colorizedFormulaAttributes["data-viz-manim-tex-colorized-uncolored-token-ids"]}
        data-viz-manim-tex-isolation-cache-key={layer.texIsolationCacheKeys[formula.id]}
        data-viz-manim-active-token-count={activeTokenAttributes["data-viz-manim-active-token-count"]}
        data-viz-manim-active-token-ids={activeTokenAttributes["data-viz-manim-active-token-ids"]}
        data-viz-manim-active-token-object-ids={activeTokenAttributes["data-viz-manim-active-token-object-ids"]}
        data-viz-manim-active-token-source-contract={activeTokenAttributes["data-viz-manim-active-token-source-contract"]}
        data-viz-manim-active-token-summary={activeTokenAttributes["data-viz-manim-active-token-summary"]}
        data-viz-manim-token-count={tokenCount}
        className="pointer-events-auto absolute max-h-[52%] max-w-[84%] overflow-auto overscroll-contain rounded-xl border border-white/10 bg-slate-950/80 px-2.5 py-1.5 text-[11px] font-black leading-tight text-cyan-50 shadow-lg shadow-slate-950/20 sm:max-h-[calc(100%-1.5rem)] sm:max-w-[min(78%,34rem)] sm:rounded-2xl sm:px-3.5 sm:py-2.5 sm:text-sm [&_.katex]:text-[1em] sm:[&_.katex]:text-[1.08em]"
        style={{
          bottom: formulaCollisionDiagnostics.placement.startsWith("bottom")
            ? `${(viewportHeight - formulaCollisionDiagnostics.formulaBox.y - formulaCollisionDiagnostics.formulaBox.height).toFixed(2)}px`
            : undefined,
          left: formulaCollisionDiagnostics.placement.endsWith("left")
            ? `${formulaCollisionDiagnostics.formulaBox.x.toFixed(2)}px`
            : undefined,
          maxHeight: `${formulaCollisionDiagnostics.formulaBox.height.toFixed(2)}px`,
          maxWidth: `${formulaCollisionDiagnostics.formulaBox.width.toFixed(2)}px`,
          right: formulaCollisionDiagnostics.placement.endsWith("right")
            ? `${(viewportWidth - formulaCollisionDiagnostics.formulaBox.x - formulaCollisionDiagnostics.formulaBox.width).toFixed(2)}px`
            : undefined,
          top: formulaCollisionDiagnostics.placement.startsWith("top")
            ? `${formulaCollisionDiagnostics.formulaBox.y.toFixed(2)}px`
            : undefined
        }}
      >
        <MathText text={colorizedFormula.latex} ariaLabel="MAIS Manim formula" normalizeMath={false} />
        <span aria-hidden="true" data-viz-manim-formula-svg={formula.id} className="sr-only" />
        <script
          type="application/json"
          data-viz-manim-tex-colorized-json
          dangerouslySetInnerHTML={{ __html: colorizedFormulaJson }}
        />
        {visibleSvgMorphFrames.length > 0 ? (
          <div data-viz-manim-svg-morph-runtime-layer className="mt-2 flex flex-wrap gap-2">
            {visibleSvgMorphFrames.map((frame) => (
              <svg
                key={frame.id}
                aria-hidden="true"
                data-viz-manim-svg-morph={frame.id}
                data-viz-manim-svg-morph-runtime-frame
                data-viz-manim-svg-morph-runtime-command-count={frame.commandCount}
                data-viz-manim-svg-morph-runtime-frame-progress={frame.progress.toFixed(3)}
                data-viz-manim-svg-morph-runtime-frame-source-contract={frame.sourceContract}
                data-viz-manim-svg-morph-runtime-source-token-id={frame.sourceTokenId}
                data-viz-manim-svg-morph-runtime-target-token-id={frame.targetTokenId}
                className="h-9 w-9 overflow-visible rounded-md border border-cyan-100/15 bg-slate-900/70 p-1"
                viewBox="0 0 16 16"
              >
                <path d={frame.path} fill="rgba(34,211,238,0.18)" stroke="rgb(103,232,249)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.9" />
              </svg>
            ))}
          </div>
        ) : null}
        <div className="mt-1 hidden flex-wrap gap-1.5 sm:flex">
          {formula.tokens.map((token) => (
            <span
              key={token.id}
              aria-label={token.ariaLabel}
              data-viz-manim-formula-token={token.id}
              data-viz-manim-concept-id={token.conceptId}
              data-viz-manim-token-active={String(token.active)}
              data-viz-manim-bound-object-ids={token.boundObjectIds.join(",")}
              data-viz-manim-token-color-role={token.colorRole}
              data-viz-manim-token-index={token.index}
              data-viz-manim-tex-isolated={String(token.texIsolated)}
              data-viz-manim-tex-isolation-selector={token.texIsolationSelector ?? ""}
              data-viz-manim-tex-isolation-occurrence={token.texIsolationOccurrence}
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                token.active ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-cyan-100"
              }`}
            >
              {token.text}
            </span>
          ))}
        </div>
        <span aria-hidden="true" className="sr-only">
          {svgMorphMarkerIds.map((morphId) => (
            <span key={morphId} data-viz-manim-svg-morph={morphId} />
          ))}
        </span>
      </div>
      <div data-viz-manim-projected-label-layer className="absolute inset-0">
        {projectedLabels.map((label) => {
          const placement = buildProjectedLabelPlacement(label.screen, projectedLabelViewport, { text: label.text });
          const isSceneTeachingLabel = label.id.startsWith("scene-label:");
          const isTickLabel = label.variant === "tick";
          return (
            <span
            key={label.id}
            aria-label={label.ariaLabel}
            data-viz-manim-projected-label={label.id}
            data-viz-manim-projected-object-id={label.objectId}
            data-viz-manim-projected-anchor-name={label.anchorName ?? "center"}
            data-viz-manim-projected-concept-id={label.conceptId}
            data-viz-manim-projected-color-role={label.colorRole ?? "reference"}
            data-viz-manim-projected-depth={label.depth.toFixed(3)}
            data-viz-manim-projected-label-text={label.text}
            data-viz-manim-projected-screen-x={label.screen[0].toFixed(2)}
            data-viz-manim-projected-screen-y={label.screen[1].toFixed(2)}
            data-viz-manim-projected-visible={String(label.visible)}
            data-viz-manim-projected-horizontal-anchor={placement.horizontalAnchor}
            data-viz-manim-projected-vertical-anchor={placement.verticalAnchor}
            tabIndex={isSceneTeachingLabel ? undefined : 0}
            className={isTickLabel
              ? "pointer-events-none absolute whitespace-nowrap text-center text-[10px] font-black text-cyan-100/85 drop-shadow-[0_1px_2px_rgba(2,6,23,0.9)]"
              : isSceneTeachingLabel
                ? "pointer-events-none absolute whitespace-nowrap rounded-full border border-cyan-100/25 bg-slate-950/82 px-2 py-1 text-center text-[10px] font-black text-cyan-50 shadow-lg shadow-slate-950/25"
                : "pointer-events-auto absolute max-h-20 max-w-[min(12rem,calc(100%-1rem))] overflow-y-auto overscroll-contain break-words rounded-full border border-cyan-100/25 bg-slate-950/70 px-2 py-1 text-center text-[10px] font-black text-cyan-50 shadow-lg shadow-slate-950/20"}
            style={{
              left: placement.left,
              maxHeight: isSceneTeachingLabel ? undefined : placement.maxHeight,
              maxWidth: isSceneTeachingLabel ? undefined : placement.maxWidth,
              top: placement.top,
              transform: placement.transform
            }}
          >
            {label.text}
          </span>
          );
        })}
      </div>
      {activeCaption ? (
        <div
          aria-label={activeCaption.ariaLabel}
          aria-live="polite"
          data-viz-manim-caption={activeCaption.id}
          data-viz-manim-caption-end={activeCaption.endSeconds.toFixed(3)}
          data-viz-manim-caption-progress={activeCaption.progress.toFixed(3)}
          data-viz-manim-caption-placement={
            formulaCollisionDiagnostics.placement.startsWith("bottom") ? "top-center" : "bottom-center"
          }
          data-viz-manim-caption-source-contract={activeCaption.sourceContract}
          data-viz-manim-caption-start={activeCaption.startSeconds.toFixed(3)}
          data-viz-manim-caption-text={activeCaption.text}
          role="status"
          className={`absolute left-1/2 max-w-[88%] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-slate-950/88 px-2.5 py-1 text-center text-[9px] font-black leading-tight text-white shadow-lg shadow-slate-950/35 sm:px-4 sm:py-1.5 sm:text-xs ${
            formulaCollisionDiagnostics.placement.startsWith("bottom")
              ? "top-1.5 sm:top-3"
              : "bottom-1.5 sm:bottom-3"
          }`}
        >
          {activeCaption.text}
        </div>
      ) : null}
    </div>
  );
}
