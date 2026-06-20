"use client";

import { MathText } from "@/components/math/MathText";
import { buildFormulaLayerState } from "./mathFormulaLayer";
import type { MathSceneSpec } from "./mathSceneTypes";

export function MathFormulaOverlay({
  activeConceptId,
  scene
}: {
  activeConceptId: string;
  scene: MathSceneSpec;
}) {
  const layer = buildFormulaLayerState(scene, { activeConceptId });
  const formula = layer.formulas[0];
  const tokenCount = layer.formulas.reduce((sum, entry) => sum + entry.tokens.length, 0);

  return (
    <div
      data-viz-three-formula
      data-viz-manim-formula-overlay
      data-viz-manim-formula-id={formula.id}
      data-viz-manim-token-count={tokenCount}
      className="pointer-events-none absolute left-3 top-3 max-w-[min(78%,34rem)] rounded-2xl border border-white/10 bg-slate-950/76 px-3.5 py-2.5 text-sm font-black leading-tight text-cyan-50 shadow-lg shadow-slate-950/20 [&_.katex]:text-[1.08em]"
    >
      <MathText text={formula.latex} ariaLabel="MAIS Manim formula" normalizeMath={false} />
      <div className="mt-1 flex flex-wrap gap-1.5">
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
            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              token.active ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-cyan-100"
            }`}
          >
            {token.text}
          </span>
        ))}
      </div>
    </div>
  );
}
