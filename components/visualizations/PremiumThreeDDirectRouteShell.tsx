"use client";

import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { VisualizationCard } from "@/components/visualizations/VisualizationCard";
import VisualizationLabLoading from "@/components/visualizations/VisualizationLabLoading";
import { useSettings } from "@/components/providers/AppProviders";
import { resolveVisualizationLabDisplayCopy } from "@/components/visualizations/visualizationLabDisplayMetadata";
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
  const { currentUser, language, text, t } = useSettings();
  const workspaceRef = useRef<HTMLElement>(null);
  const [workspaceIdentityHydrated, setWorkspaceIdentityHydrated] = useState(false);
  const [directRuntimeReady, setDirectRuntimeReady] = useState(false);
  const moduleId = buildDirectVisualizationSessionModuleId(lab);
  const directoryHref = `${studentVisualizationToolsPath}?grade=${encodeURIComponent(lab.grade)}&track=all&lab=${encodeURIComponent(lab.labId)}`;
  const practiceHref = buildDirectVisualizationPracticeHref(lab);
  const formula = lab.templateConfig.formula ? text(lab.templateConfig.formula) : undefined;
  const displayCopy = resolveVisualizationLabDisplayCopy(lab, language);

  useEffect(() => {
    setWorkspaceIdentityHydrated(true);
  }, []);

  useEffect(() => {
    setDirectRuntimeReady(false);

    // Probe must keep running in hidden tabs (requestAnimationFrame is frozen
    // there); MutationObserver is not visibility-throttled and the interval
    // is a low-cost safety net.
    let done = false;

    const probeRuntimeReady = () => {
      if (done) return;

      const surface = workspaceRef.current?.querySelector("[data-viz-surface]");
      const mark = surface?.querySelector("[data-viz-mark]");

      if (surface && mark) {
        done = true;
        observer.disconnect();
        window.clearInterval(interval);
        setDirectRuntimeReady(true);
      }
    };

    const observer = new MutationObserver(probeRuntimeReady);
    if (workspaceRef.current) {
      observer.observe(workspaceRef.current, {
        attributeFilter: ["data-viz-surface", "data-viz-mark"],
        attributes: true,
        childList: true,
        subtree: true
      });
    }
    const interval = window.setInterval(probeRuntimeReady, 500);
    probeRuntimeReady();

    return () => {
      done = true;
      observer.disconnect();
      window.clearInterval(interval);
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
        aria-label={t({
          en: "Visualization Lab workspace",
          zh: "可視化實驗室工作區",
          zhHans: "可视化实验室工作区"
        })}
        data-tour="student-tool-workspace"
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
            className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
          >
            {t({
              en: "Open signature labs",
              zh: "開啟主題實驗",
              zhHans: "打开主题实验"
            })}
          </button>
          <a
            href={practiceHref}
            data-viz-open-practice-link
            className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-100 dark:border-cyan-200/20 dark:bg-cyan-300/10 dark:text-cyan-100"
          >
            {t({ en: "Practice", zh: "練習", zhHans: "练习" })}
          </a>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 dark:border-blue-200/20 dark:bg-blue-300/10 dark:text-blue-100">
            {text(lab.gradeLabel)}
          </span>
          {displayCopy.disambiguator ? (
            <span
              data-viz-display-disambiguator
              className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 dark:border-amber-200/20 dark:bg-amber-300/10 dark:text-amber-100"
            >
              {displayCopy.disambiguator}
            </span>
          ) : null}
          <span
            data-viz-premium-three-d-label
            className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 dark:border-violet-200/20 dark:bg-violet-300/10 dark:text-violet-100"
          >
            {t({ en: "Premium Visualization Lab", zh: "Premium 可視化實驗", zhHans: "Premium 可视化实验" })}
          </span>
        </div>

        <div
          data-viz-lab-workspace
          className="min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] [&_a[role=button]]:inline-flex [&_a[role=button]]:min-h-11 [&_a[role=button]]:min-w-11 [&_button]:min-h-11 [&_button]:min-w-11 [&_input:not([type=range])]:min-h-11 [&_input:not([type=range])]:min-w-11 [&_input[type=range]]:min-h-11 [&_input[type=range]]:min-w-0 [&_[role=slider]]:min-h-11 [&_[role=slider]]:min-w-11 [&_select]:min-h-11 [&_select]:min-w-11"
        >
          <VisualizationCard
            accessibleTitle={displayCopy.accessibleTitle}
            title={displayCopy.title}
            analyticsSource={lab.analyticsSource}
            autoExplore
            explorationScopeKey={currentUser?.id ?? "guest"}
            formula={formula}
            moduleId={moduleId}
            topicId={lab.topicId}
          >
            <ConfiguredVisualizationLab lab={lab} labId={lab.labId} topicId={lab.topicId} />
          </VisualizationCard>
        </div>
      </section>
    </main>
  );
}
