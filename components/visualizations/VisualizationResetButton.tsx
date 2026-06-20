"use client";

import { useSettings } from "@/components/providers/AppProviders";

type ResetLabel = {
  en: string;
  zh: string;
  zhHans?: string;
};

type VisualizationResetButtonProps = {
  label?: ResetLabel;
  moduleId: string;
  onReset: () => void;
  topicId: string;
};

export function VisualizationResetButton({
  label = { en: "Reset model", zh: "重設模型", zhHans: "重设模型" },
  moduleId,
  onReset,
  topicId
}: VisualizationResetButtonProps) {
  const { t } = useSettings();

  return (
    <button
      type="button"
      data-viz-reset-model
      data-viz-reset-module-id={moduleId}
      data-viz-reset-topic-id={topicId}
      onClick={onReset}
      className="focus-ring w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:-translate-y-1 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.13]"
    >
      {t(label)}
    </button>
  );
}
