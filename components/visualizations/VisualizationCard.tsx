"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import type { LearningAnalyticsEventSource } from "@/types";

type SaveState = "idle" | "saving" | "saved" | "error";

export function VisualizationCard({
  title,
  description,
  children,
  analyticsSource,
  explorationScopeKey,
  formula,
  initialExplored = false,
  moduleId: explicitModuleId,
  onExplored,
  topicId
}: {
  title: string;
  description: string;
  children: ReactNode;
  analyticsSource: LearningAnalyticsEventSource;
  explorationScopeKey?: string;
  formula?: string;
  initialExplored?: boolean;
  moduleId?: string;
  onExplored?: (moduleId: string) => void;
  topicId: string;
}) {
  const { currentUser, recordLearningEvent, t } = useSettings();
  const moduleId = explicitModuleId ?? `${analyticsSource}:${topicId}`;
  const stateScopeKey = useMemo(() => `${explorationScopeKey ?? "anonymous"}:${moduleId}`, [explorationScopeKey, moduleId]);
  const previousStateScopeKey = useRef(stateScopeKey);
  const [saveState, setSaveState] = useState<SaveState>(() => initialExplored ? "saved" : "idle");
  const localExploredStorageKey = useMemo(() => `mais:viz-explored:${stateScopeKey}`, [stateScopeKey]);

  useEffect(() => {
    setSaveState((current) => {
      const scopeChanged = previousStateScopeKey.current !== stateScopeKey;
      previousStateScopeKey.current = stateScopeKey;

      if (initialExplored) return "saved";
      if (scopeChanged) return "idle";
      return current;
    });
  }, [initialExplored, stateScopeKey]);

  useEffect(() => {
    if (currentUser || initialExplored || typeof window === "undefined") return;
    if (window.localStorage.getItem(localExploredStorageKey) === "1") {
      onExplored?.(moduleId);
      setSaveState("saved");
    }
  }, [currentUser, initialExplored, localExploredStorageKey, moduleId, onExplored]);

  const buttonLabel =
    saveState === "saving"
      ? t({ en: "Saving...", zh: "儲存中...", zhHans: "保存中..." })
      : saveState === "saved"
        ? t({ en: "Saved", zh: "已儲存", zhHans: "已保存" })
        : t(dictionary.visualization.markExplored);
  const feedback =
    saveState === "saved"
      ? t({ en: "Exploration saved.", zh: "探索紀錄已儲存。", zhHans: "探索记录已保存。" })
      : saveState === "error"
        ? t({ en: "Could not save. Try again.", zh: "未能儲存，請再試一次。", zhHans: "未能保存，请再试一次。" })
        : saveState === "saving"
          ? t({ en: "Saving exploration...", zh: "正在儲存探索紀錄...", zhHans: "正在保存探索记录..." })
          : "";

  async function markExplored() {
    if (saveState === "saving") return;
    setSaveState("saving");
    recordLearningEvent({
      type: "visualization-complete",
      source: analyticsSource,
      topicId
    });
    if (!currentUser && typeof window !== "undefined") {
      window.localStorage.setItem(localExploredStorageKey, "1");
      onExplored?.(moduleId);
      setSaveState("saved");
      return;
    }
    try {
      const response = await fetch("/api/visualization-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          topicId,
          source: analyticsSource
        })
      });

      if (!response.ok) throw new Error("Unable to save visualization session.");
      onExplored?.(moduleId);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <section
      data-viz-card
      data-viz-module-id={moduleId}
      data-viz-topic-id={topicId}
      data-viz-save-state={saveState}
      className="glass-panel overflow-hidden p-4 sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">{t(dictionary.visualization.interactiveModule)}</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{title}</h2>
          <MathText as="p" text={description} className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300" />
          {formula ? (
            <div
              data-viz-card-formula
              className="mt-3 inline-flex max-w-full items-center rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-black text-cyan-800 shadow-sm dark:border-cyan-300/30 dark:bg-cyan-300/10 dark:text-cyan-100"
            >
              <MathText as="span" text={formula} normalizeMath={false} className="min-w-0 break-words" />
            </div>
          ) : null}
        </div>
        <div className="flex w-full justify-center md:w-72 md:shrink-0">
          <div className="grid justify-items-center gap-2">
            <button
              type="button"
              onClick={markExplored}
              disabled={saveState === "saving"}
              data-viz-mark-explored-button
              data-viz-mark-explored-module-id={moduleId}
              data-viz-mark-explored-state={saveState}
              data-viz-mark-explored-topic-id={topicId}
              className="focus-ring w-fit rounded-full border border-emerald-300/45 bg-emerald-400/15 px-4 py-2 text-sm font-black text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-400/25 disabled:cursor-wait disabled:opacity-70 dark:text-emerald-100"
            >
              {buttonLabel}
            </button>
            {feedback ? (
              <p
                role="status"
                aria-live="polite"
                className={`text-center text-xs font-bold ${saveState === "error" ? "text-rose-600 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-200"}`}
              >
                {feedback}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}
