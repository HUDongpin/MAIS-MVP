"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import type { FeaturedLabDefinition } from "@/data/visualizationLabs";
import {
  isHKPrimaryDedicatedLabId,
  isHKSecondaryDedicatedLabId
} from "./hkVisualizationLabRegistry";

export type HKVisualizationLabProps = {
  lab: FeaturedLabDefinition;
  controlFooterAction?: ReactNode;
};

type HKVisualizationChunk = "primary" | "secondary";

function HKVisualizationLoadingState({ chunk }: { chunk: HKVisualizationChunk }) {
  const { t } = useSettings();
  const title = chunk === "primary"
    ? t({
        en: "Preparing the Hong Kong primary mathematics visualization…",
        zh: "正在準備香港小學數學視覺化模型……",
        zhHans: "正在准备香港小学数学可视化模型……"
      })
    : t({
        en: "Preparing the Hong Kong secondary mathematics visualization…",
        zh: "正在準備香港中學數學視覺化模型……",
        zhHans: "正在准备香港中学数学可视化模型……"
      });
  const detail = t({
    en: "Loading the interactive controls and mathematical canvas.",
    zh: "正在載入互動控制與數學畫布。",
    zhHans: "正在加载互动控件与数学画布。"
  });

  return (
    <div
      data-hk-viz-dispatcher-state="loading"
      data-hk-viz-dispatcher-target={chunk}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-w-0 rounded-3xl border border-cyan-200/70 bg-white/85 p-5 shadow-sm dark:border-cyan-300/15 dark:bg-slate-950/75 sm:p-6"
    >
      <div className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className="size-11 shrink-0 rounded-2xl border border-cyan-300/70 bg-cyan-100 shadow-inner shadow-cyan-200/30 motion-safe:animate-pulse dark:border-cyan-300/25 dark:bg-cyan-300/10"
        />
        <div className="min-w-0">
          <p className="break-words text-sm font-black leading-6 text-slate-900 dark:text-white">{title}</p>
          <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-600 dark:text-white/60">{detail}</p>
        </div>
      </div>
    </div>
  );
}

const DynamicHKPrimaryVisualizationLab = dynamic<HKVisualizationLabProps>(
  () => import("./HKPrimaryVisualizationLab").then((module) => module.HKPrimaryVisualizationLab),
  {
    loading: () => <HKVisualizationLoadingState chunk="primary" />,
    ssr: false
  }
);

const DynamicHKSecondaryVisualizationLab = dynamic<HKVisualizationLabProps>(
  () => import("./HKSecondaryVisualizationLab").then((module) => module.HKSecondaryVisualizationLab),
  {
    loading: () => <HKVisualizationLoadingState chunk="secondary" />,
    ssr: false
  }
);

/**
 * Thin HK-only dispatcher. Returning null preserves the caller's established
 * specialist/configured fallback for every pass-through or non-HK lab.
 */
export function HKVisualizationLab({ lab, controlFooterAction }: HKVisualizationLabProps) {
  if (lab.curriculumTrack !== "HK") return null;

  if (isHKPrimaryDedicatedLabId(lab.labId)) {
    return (
      <div
        data-hk-viz-dispatcher="v1"
        data-hk-viz-dispatcher-target="primary"
        data-hk-viz-dispatcher-lab-id={lab.labId}
        className="min-w-0"
      >
        <DynamicHKPrimaryVisualizationLab lab={lab} controlFooterAction={controlFooterAction} />
      </div>
    );
  }

  if (isHKSecondaryDedicatedLabId(lab.labId)) {
    return (
      <div
        data-hk-viz-dispatcher="v1"
        data-hk-viz-dispatcher-target="secondary"
        data-hk-viz-dispatcher-lab-id={lab.labId}
        className="min-w-0"
      >
        <DynamicHKSecondaryVisualizationLab lab={lab} controlFooterAction={controlFooterAction} />
      </div>
    );
  }

  return null;
}
