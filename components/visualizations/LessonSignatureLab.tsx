"use client";

import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";
import { signatureLabImporters } from "@/components/visualizations/signatureLabImporters";
import { getSignatureLabAssignment, type SignatureLabId } from "@/data/signatureLabAssignments";
import type { FeaturedLabDefinition } from "@/data/visualizationLabs";

/**
 * In-lesson host for signature benches (the canvas labs ported from the Claude
 * Math Visual library). Lesson blocks with `moduleId: "signature-lab"` render
 * here, so a topic shows the same bench in the lesson as on the Visualization
 * Lab page. This lifts the Phase-0 scope boundary that kept lesson embeds on
 * the `ConfiguredVisualizationLab` template renderer.
 *
 * Contracts held:
 * - The bench and its adapter load in one lazy chunk per bench (`ssr: false`);
 *   this module itself stays behind LessonView's dynamic import, so lessons
 *   without a signature block download none of it.
 * - `SignatureLabAdapter` supplies the host contracts (surface/mark probes,
 *   analytics under the lab's own source, reset-by-remount) exactly as on the
 *   lab page — no bench is ever edited.
 * - Only the topic's `primary` bench renders in a lesson. The `related`
 *   fan-out stays a Visualization Lab page affordance (owner decision,
 *   2026-08-25 replacement plan §5).
 * - If a topic carries no signature assignment (possible only through data
 *   drift — `moduleId` and the assignment table share one source), the embed
 *   falls back to the template renderer rather than an empty panel.
 */

type LessonSignatureLabProps = {
  controlFooterAction?: ReactNode;
  topicId: string;
  showAxisLabels?: boolean;
  lab?: FeaturedLabDefinition | null;
};

type SignatureBenchHostProps = Pick<LessonSignatureLabProps, "lab" | "topicId">;

function LessonSignatureLabLoading() {
  return (
    <div
      data-viz-lesson-signature-loading
      className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/70 dark:border-slate-100/15 dark:bg-slate-100/5"
      aria-hidden="true"
    />
  );
}

const ConfiguredVisualizationLabFallback = dynamic<LessonSignatureLabProps>(
  () =>
    import("@/components/visualizations/ConfiguredVisualizationLab").then(
      (module) => module.ConfiguredVisualizationLab as ComponentType<LessonSignatureLabProps>
    ),
  { loading: () => <LessonSignatureLabLoading />, ssr: false }
);

/**
 * One dynamic component per bench, created on first use and cached so a lesson
 * revisit reuses the same component identity (remounts would drop bench state).
 */
const benchComponentCache = new Map<SignatureLabId, ComponentType<SignatureBenchHostProps>>();

function getLessonBenchComponent(benchId: SignatureLabId) {
  const cached = benchComponentCache.get(benchId);
  if (cached) return cached;

  const importBench = signatureLabImporters[benchId];
  const BenchComponent = dynamic<SignatureBenchHostProps>(
    () =>
      Promise.all([import("@/components/visualizations/SignatureLabAdapter"), importBench()]).then(
        ([adapter, benchModule]) => adapter.createSignatureLab(benchModule.default)
      ),
    { loading: () => <LessonSignatureLabLoading />, ssr: false }
  );

  benchComponentCache.set(benchId, BenchComponent);
  return BenchComponent;
}

export function LessonSignatureLab({ topicId, lab = null }: LessonSignatureLabProps) {
  const resolvedTopicId = lab?.topicId ?? topicId;
  const assignment = getSignatureLabAssignment(resolvedTopicId);

  if (!assignment) {
    return <ConfiguredVisualizationLabFallback topicId={topicId} lab={lab} />;
  }

  const BenchComponent = getLessonBenchComponent(assignment.primary);
  return <BenchComponent lab={lab} topicId={resolvedTopicId} />;
}
