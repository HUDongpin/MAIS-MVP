"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
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
 *   2. Reset analytics, via `recordLearningEvent` under the lab's own
 *      `analyticsSource`. Opening and switching labs are recorded by the page
 *      shell; the adapter must not create a second event merely by mounting.
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

/**
 * A few original benches use the same restrained blue/green accents for both
 * large objects and normal-size labels. The accents remain easy to distinguish
 * as fills, but their original values do not give 4.5:1 for label glyphs on the
 * light paper surface. Keep the hue roles and darken only those exact palette
 * entries before a bench paints them onto its own Canvas.
 */
const accessibleSignatureCanvasPalette: Readonly<Record<string, string>> = {
  "#2e8b6f": "#166534",
  "#3f74a6": "#245b8f"
};

function accessibleSignatureCanvasPaint(
  paint: string | CanvasGradient | CanvasPattern
): string | CanvasGradient | CanvasPattern {
  if (typeof paint !== "string") return paint;
  return accessibleSignatureCanvasPalette[paint.trim().toLowerCase()] ?? paint;
}

function findCanvasPaintDescriptor(
  context: CanvasRenderingContext2D,
  property: "fillStyle" | "strokeStyle"
): PropertyDescriptor | undefined {
  let owner: object | null = context;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, property);
    if (descriptor) return descriptor;
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  return undefined;
}

/**
 * Install an instance-local palette bridge. Signature benches request their
 * context and draw from passive effects; the adapter's layout effect runs
 * first, so every initial and subsequent redraw uses the accessible paint.
 * Calling the inherited setter preserves Canvas QA instrumentation and native
 * save/restore behavior; no global Canvas prototype is changed.
 */
function installAccessibleSignatureCanvasPalette(canvas: HTMLCanvasElement): () => void {
  const context = canvas.getContext("2d");
  if (!context) return () => undefined;

  const restores: Array<() => void> = [];
  for (const property of ["fillStyle", "strokeStyle"] as const) {
    const ownDescriptor = Object.getOwnPropertyDescriptor(context, property);
    const inheritedDescriptor = findCanvasPaintDescriptor(context, property);
    if (!inheritedDescriptor?.get || !inheritedDescriptor.set) continue;

    Object.defineProperty(context, property, {
      configurable: true,
      enumerable: inheritedDescriptor.enumerable ?? true,
      get() {
        return Reflect.apply(inheritedDescriptor.get!, context, []);
      },
      set(paint: string | CanvasGradient | CanvasPattern) {
        Reflect.apply(inheritedDescriptor.set!, context, [accessibleSignatureCanvasPaint(paint)]);
      }
    });

    restores.push(() => {
      if (ownDescriptor) Object.defineProperty(context, property, ownDescriptor);
      else delete (context as unknown as Record<string, unknown>)[property];
    });
  }

  return () => {
    for (const restore of restores.reverse()) restore();
  };
}

/**
 * The ported benches used group opacity, CSS filters, gradients behind text,
 * and inset shadows to communicate locked/dim states. Those effects make the
 * final glyph backdrop mathematically ambiguous, so a source-color contrast
 * check can report a pass while Chrome paints something different. Keep the
 * same learner states, but express them with opaque paper, borders, and muted
 * solid colors that remain directly auditable.
 */
const signatureLearnerContrastCss = `
  [data-viz-signature-switcher][data-viz-active-signature-bench]
    [role='tab'][aria-selected='true'] {
    background: #0e7490 !important;
    border-color: #0e7490 !important;
    color: #ffffff !important;
  }

  [data-viz-signature-lab] :is(
    [style*='color: rgb(63, 116, 166)'],
    [style*='color: #3f74a6']
  ) {
    color: #245b8f !important;
  }

  [data-viz-signature-lab] :is(
    [style*='color: rgb(46, 139, 111)'],
    [style*='color: #2e8b6f']
  ) {
    color: #166534 !important;
  }

  [data-viz-signature-lab] .btn.ghost.on:not(:disabled) {
    background: #166534 !important;
    border-color: #166534 !important;
    color: #ffffff !important;
  }

  [data-viz-signature-lab] :is(
    .block.locked,
    .btn.ghost.on:disabled,
    .btn:disabled,
    .chip .chip-n,
    .chip-note,
    .chip:disabled,
    .chipbtn:disabled,
    .choice.dim,
    .control.locked,
    .ctl-group.locked,
    .ctl.locked,
    .dial input[type='range']:disabled,
    .dial.idle,
    .dial.locked,
    .dial.off,
    .dials.locked,
    .digit.locked,
    .dirctl.locked,
    .editor-action:disabled,
    .editor-step:disabled,
    .equation .rem,
    .fact-v .muted,
    .fact-v.held,
    .gallery.locked,
    .krow,
    .lens.locked,
    .logcard.correct,
    .logcard.dim,
    .logcard.wrong,
    .logcard:disabled,
    .obtn:disabled,
    .opbtn.locked,
    .opctl.locked,
    .prod.veiled,
    .route,
    .rules li.off,
    .seg-btn:disabled,
    .seg-locked,
    .seg-row.locked,
    .seg.locked,
    .seg:disabled,
    .segb:disabled,
    .segbtn:disabled,
    .soon,
    .sortbtn.miss,
    .spancard.correct,
    .spancard.dim,
    .spancard.wrong,
    .spancard:disabled,
    .stepper button:disabled,
    .sumcard.correct,
    .sumcard.dim,
    .sumcard.wrong,
    .sumcard:disabled,
    .tickrow input[type='range']:disabled,
    [style*='opacity: 0.5']
  ) {
    opacity: 1 !important;
  }

  [data-viz-signature-lab] :is(
    .btn:disabled,
    .chip:disabled,
    .chipbtn:disabled,
    .editor-action:disabled,
    .editor-step:disabled,
    .obtn:disabled,
    .seg-btn:disabled,
    .seg:disabled,
    .segb:disabled,
    .segbtn:disabled,
    .stepper button:disabled
  ) {
    background: #e2e8f0 !important;
    border-color: #94a3b8 !important;
    color: #334155 !important;
    filter: none !important;
  }

  [data-viz-signature-lab] :is(.choice.dim, .logcard.dim, .spancard.dim, .sumcard.dim) {
    background: #f1f5f9 !important;
    border-color: #cbd5e1 !important;
    color: #334155 !important;
  }

  [data-viz-signature-lab] .choice.correct {
    background: #eaf5ef !important;
    border-color: #166534 !important;
  }

  [data-viz-signature-lab] .choice.correct .mark {
    color: #166534 !important;
  }

  [data-viz-signature-lab] .choice.wrong {
    background: #eef2f6 !important;
    border-color: #475569 !important;
  }

  [data-viz-signature-lab] .choice.wrong .mark {
    color: #475569 !important;
  }

  [data-viz-signature-lab] :is(
    .block.locked,
    .control.locked,
    .ctl-group.locked,
    .ctl.locked,
    .dial.idle,
    .dial.locked,
    .dial.off,
    .dials.locked,
    .digit.locked,
    .dirctl.locked,
    .gallery.locked,
    .lens.locked,
    .opbtn.locked,
    .opctl.locked,
    .route:not(.on),
    .rules li.off,
    .seg-locked,
    .seg-row.locked,
    .seg.locked
  ) {
    background-color: #f1f5f9 !important;
    border-color: #cbd5e1 !important;
    color: #475569 !important;
  }

  [data-viz-signature-lab] .route.on {
    background: #fff1f2 !important;
  }

  [data-viz-signature-lab] :is(.prod.veiled, .fact-v.held, .equation .rem) {
    color: #64748b !important;
  }

  [data-viz-signature-lab] .krow:not(.on):not(.pulse) {
    background: #f1f5f9 !important;
    color: #475569 !important;
  }

  [data-viz-signature-lab] .soon:not(.live) {
    color: #475569 !important;
  }

  [data-viz-signature-lab] .easy {
    background: #fef3c7 !important;
    color: #713f12 !important;
  }

  [data-viz-signature-lab] :is(.btn, .chipbtn, .obtn, .seg-btn, .segb, .segbtn):hover {
    filter: none !important;
  }

  [data-viz-signature-lab] .jbtn:hover {
    filter: none !important;
    outline: 2px solid currentColor !important;
    outline-offset: 2px !important;
  }

  [data-viz-signature-lab] .el:hover {
    transform: none !important;
    outline: 2px solid currentColor !important;
    outline-offset: 1px !important;
  }

  [data-viz-signature-lab] :is(.stage, .sorter-card, .net, .chbox) {
    background-image: none !important;
    background-color: #f4f7f9 !important;
  }

  [data-viz-signature-lab] .swatch.none {
    background-color: #fbfbf8 !important;
    background-image: linear-gradient(
      45deg,
      transparent 45%,
      #c33 45%,
      #c33 55%,
      transparent 55%
    ) !important;
  }

  [data-viz-signature-lab] .hint {
    background: #fbfbf8 !important;
  }

  [data-viz-signature-lab] .freq tr.rf .c-cat {
    box-shadow: none !important;
    border-left: 3px solid var(--curve) !important;
  }

  [data-viz-signature-lab] .prod .res.kept {
    box-shadow: none !important;
    text-decoration: underline 4px rgba(200, 137, 30, 0.5) !important;
    text-decoration-skip-ink: none !important;
  }

  [data-viz-signature-lab] .opbtn.on {
    box-shadow: none !important;
    outline: 1px solid var(--curve) !important;
    outline-offset: -1px !important;
  }

  [data-viz-signature-lab] .lens.on {
    box-shadow: none !important;
    outline: 1px solid currentColor !important;
    outline-offset: -2px !important;
  }

  [data-viz-signature-lab] .stamp {
    opacity: 1 !important;
    background: #fbfbf8 !important;
    border-color: #166534 !important;
    color: #166534 !important;
  }

  [data-viz-signature-lab] .nameplate .name.flash {
    opacity: 1 !important;
  }
`;

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

  useLayoutEffect(() => {
    const canvases = Array.from(rootRef.current?.querySelectorAll("canvas") ?? []);
    const restores = canvases.map(installAccessibleSignatureCanvasPalette);
    return () => {
      for (const restore of restores.reverse()) restore();
    };
  }, [LabComponent, resetNonce]);

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
        data-viz-color-scheme="light"
        aria-label={surfaceLabel}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-[#fbfbf8] shadow-sm dark:border-slate-100/15"
        style={{ colorScheme: "light" }}
      >
        <LabComponent key={resetNonce} />
        <style>{signatureLearnerContrastCss}</style>
      </div>
      <div className="mt-3 flex justify-start">
        <button
          type="button"
          onClick={handleReset}
          data-viz-reset-model
          className="min-h-11 min-w-11 rounded-full border border-slate-300 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-100/20 dark:text-slate-100 dark:hover:bg-slate-100/10"
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
