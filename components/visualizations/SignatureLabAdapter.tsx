"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import type { FeaturedLabDefinition } from "@/data/visualizationLabs";

/**
 * Adapter for "signature labs" — the canvas benches ported byte-for-byte from
 * the Claude Math Visual library into `components/visualizations/signature/`.
 *
 * Those labs take no props and render their own `<canvas>`, so they satisfy
 * none of the host contracts on their own. Rather than editing 71 labs, this
 * adapter supplies all of it from the outside, once:
 *
 *   1. `data-viz-surface` on the wrapper, and `data-viz-mark` on the lab's
 *      real canvas — VisualizationLabPage's runtime probe requires the mark to
 *      be a *descendant* of the surface, and only reports ready once both
 *      exist. Without this a canvas lab spins in requestAnimationFrame forever.
 *   2. Analytics, via `recordLearningEvent` under the lab's own
 *      `analyticsSource`, so signature labs feed the same funnel as template
 *      labs.
 *   3. `data-viz-reset-model`, from the control-surface contract in
 *      `visualizationDiagnostics.ts`.
 *
 * The labs are never edited. Everything here is applied from outside.
 */

/**
 * A ported bench. They take no props by contract — every host concern is
 * supplied by the adapter around them, never by the lab itself.
 */
export type SignatureLabComponent = ComponentType<Record<never, never>>;

type SignatureLabAdapterProps = {
  LabComponent: SignatureLabComponent;
  lab?: FeaturedLabDefinition | null;
  labId?: string;
  topicId?: string;
};

export function SignatureLabAdapter({ LabComponent, lab = null, labId, topicId }: SignatureLabAdapterProps) {
  const { recordLearningEvent, text, t } = useSettings();
  const rootRef = useRef<HTMLDivElement>(null);
  // Signature labs own their internal state and expose no reset handle. Bumping
  // this key remounts the lab, which restores its documented initial state —
  // the only reset that works without editing the lab.
  const [resetNonce, setResetNonce] = useState(0);

  const analyticsSource = lab?.analyticsSource ?? "visualization-lab";
  const resolvedTopicId = lab?.topicId ?? topicId ?? "signature-visualization";
  const surfaceLabel = lab ? text(lab.title) : t({ en: "Interactive math bench", zh: "互動數學實驗", zhHans: "互动数学实验" });

  /**
   * Tag the lab's canvas as the visualization mark.
   *
   * This runs after every remount because the lab rebuilds its own DOM. We tag
   * the *real* canvas rather than injecting a sentinel node: the page's
   * snapshot feature collects `[data-viz-mark]` elements but filters to those
   * with non-zero bounds, so a hidden sentinel would satisfy the ready-probe
   * while reporting zero marks to snapshot. The canvas has real bounds and is
   * genuinely the lab's entire visual surface, so tagging it keeps both
   * consumers truthful.
   *
   * Known fidelity limit: template labs tag every semantic SVG element
   * (`data-viz-name="tick"`, `data-viz-value=...`), so their snapshots describe
   * model state. A canvas has no queryable interior, so a signature lab reports
   * exactly one coarse mark. Snapshot fidelity is lower here by construction —
   * the lab's `audit-*.mjs` proof is what covers its mathematics instead.
   */
  useEffect(() => {
    const canvas = rootRef.current?.querySelector("canvas");
    if (!canvas) return;

    canvas.setAttribute("data-viz-mark", "");
    canvas.setAttribute("data-viz-name", "signature lab canvas");
    canvas.setAttribute("data-viz-lab-id", lab?.labId ?? labId ?? "signature-lab");
    if (!canvas.getAttribute("role")) canvas.setAttribute("role", "img");
    if (!canvas.getAttribute("aria-label")) canvas.setAttribute("aria-label", surfaceLabel);
  }, [lab?.labId, labId, resetNonce, surfaceLabel]);

  useEffect(() => {
    recordLearningEvent({ type: "visualization-probe", source: analyticsSource, topicId: resolvedTopicId });
  }, [analyticsSource, recordLearningEvent, resolvedTopicId]);

  const handleReset = useCallback(() => {
    setResetNonce((nonce) => nonce + 1);
    recordLearningEvent({ type: "visualization-reset", source: analyticsSource, topicId: resolvedTopicId });
  }, [analyticsSource, recordLearningEvent, resolvedTopicId]);

  return (
    <div ref={rootRef} data-viz-signature-lab data-viz-lab-id={lab?.labId ?? labId}>
      {/*
        Signature labs are light-only by decision D2: they paint an opaque
        light "paper" surface and do not read the host theme. The frame below
        is deliberate — it presents the bench as an intentional paper surface
        inside dark chrome rather than an unstyled patch.
      */}
      <div
        data-viz-surface
        data-viz-surface-kind="signature-canvas"
        aria-label={surfaceLabel}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-[#fbfbf8] shadow-inner dark:border-slate-100/15"
      >
        <LabComponent key={resetNonce} />
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          data-viz-reset-model
          className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-100/20 dark:text-slate-100 dark:hover:bg-slate-100/10"
        >
          {t({ en: "Reset model", zh: "重設模型", zhHans: "重设模型" })}
        </button>
      </div>
    </div>
  );
}

/**
 * Wraps a signature lab module into the shape `labComponentRegistry` expects.
 * Use with `next/dynamic` so each ~50KB lab stays in its own chunk and never
 * lands in the shared bundle.
 */
export function createSignatureLab(LabComponent: SignatureLabComponent) {
  return function SignatureLab({ lab, labId, topicId }: Omit<SignatureLabAdapterProps, "LabComponent">) {
    return <SignatureLabAdapter LabComponent={LabComponent} lab={lab} labId={labId} topicId={topicId} />;
  };
}
