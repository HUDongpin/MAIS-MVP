"use client";

import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { VisualizationCard } from "@/components/visualizations/VisualizationCard";
import VisualizationLabLoading from "@/components/visualizations/VisualizationLabLoading";
import { useSettings } from "@/components/providers/AppProviders";
import { studentVisualizationToolsPath } from "@/lib/visualizationRoutes";
import type { FeaturedLabDefinition } from "@/data/visualizationLabs";

type DirectConfiguredVisualizationLabProps = {
  controlFooterAction?: ReactNode;
  lab?: FeaturedLabDefinition | null;
  labId?: string;
  topicId?: string;
};

const ConfiguredVisualizationLab = dynamic<DirectConfiguredVisualizationLabProps>(
  () => import("@/components/visualizations/ConfiguredVisualizationLab").then((module) => module.ConfiguredVisualizationLabDirect as ComponentType<DirectConfiguredVisualizationLabProps>),
  { loading: () => <VisualizationLabLoading />, ssr: false }
);

function buildDirectVisualizationPracticeHref(lab: FeaturedLabDefinition) {
  const params = new URLSearchParams();
  params.set("topicId", lab.topicId);
  return `/practice?${params.toString()}`;
}

function buildDirectVisualizationSessionModuleId(lab: FeaturedLabDefinition) {
  return `${lab.analyticsSource}:${lab.labId}:${lab.topicId}`;
}

export function PremiumThreeDDirectRouteShell({ lab }: { lab: FeaturedLabDefinition }) {
  const { currentUser, text, t } = useSettings();
  const workspaceRef = useRef<HTMLElement>(null);
  const [workspaceIdentityHydrated, setWorkspaceIdentityHydrated] = useState(false);
  const [directRuntimeReady, setDirectRuntimeReady] = useState(false);
  const moduleId = buildDirectVisualizationSessionModuleId(lab);
  const directoryHref = `${studentVisualizationToolsPath}?grade=${encodeURIComponent(lab.grade)}&track=all&lab=${encodeURIComponent(lab.labId)}`;
  const practiceHref = buildDirectVisualizationPracticeHref(lab);
  const formula = lab.templateConfig.formula ? text(lab.templateConfig.formula) : undefined;

  useEffect(() => {
    setWorkspaceIdentityHydrated(true);
  }, []);

  useEffect(() => {
    setDirectRuntimeReady(false);

    let animationFrame = 0;
    let cancelled = false;

    const probeRuntimeReady = () => {
      if (cancelled) return;

      const surface = workspaceRef.current?.querySelector("[data-viz-surface]");
      const mark = surface?.querySelector("[data-viz-mark]");

      if (surface && mark) {
        setDirectRuntimeReady(true);
        return;
      }

      animationFrame = window.requestAnimationFrame(probeRuntimeReady);
    };

    animationFrame = window.requestAnimationFrame(probeRuntimeReady);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
    };
  }, [lab.labId]);

  function openFullDirectory() {
    window.location.assign(directoryHref);
  }

  return (
    <main className="page-container py-8">
      <section
        ref={workspaceRef}
        id={workspaceIdentityHydrated ? `lab-example-${lab.labId}` : undefined}
        aria-label="Visualization Lab workspace"
        data-viz-direct-optimized-route
        data-viz-direct-workspace-id-ready={String(workspaceIdentityHydrated)}
        data-viz-panel-mode={directRuntimeReady ? "lab" : "loading"}
        data-viz-active-lab-id={directRuntimeReady ? lab.labId : ""}
        data-viz-requested-lab-id={lab.labId}
        data-viz-current-grade={lab.grade}
        data-viz-current-track={lab.curriculumTrack}
        className="mx-auto max-w-6xl"
      >
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openFullDirectory}
            data-viz-open-full-lab-directory-link
            className="focus-ring inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
          >
            {t({ en: "Full directory", zh: "完整目錄", zhHans: "完整目录" })}
          </button>
          <a
            href={practiceHref}
            data-viz-open-practice-link
            className="focus-ring inline-flex items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-100 dark:border-cyan-200/20 dark:bg-cyan-300/10 dark:text-cyan-100"
          >
            {t({ en: "Practice", zh: "練習", zhHans: "练习" })}
          </a>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 dark:border-blue-200/20 dark:bg-blue-300/10 dark:text-blue-100">
            {text(lab.gradeLabel)}
          </span>
        </div>

        <VisualizationCard
          title={text(lab.title)}
          analyticsSource={lab.analyticsSource}
          autoExplore
          explorationScopeKey={currentUser?.id ?? "guest"}
          formula={formula}
          moduleId={moduleId}
          topicId={lab.topicId}
        >
          <ConfiguredVisualizationLab lab={lab} labId={lab.labId} topicId={lab.topicId} />
        </VisualizationCard>
      </section>
    </main>
  );
}
