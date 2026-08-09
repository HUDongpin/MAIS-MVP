"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import type { LearningAnalyticsEventSource } from "@/types";

type SaveState = "idle" | "saving" | "saved" | "error";

// How long the ready lab must stay on screen before auto-exploration can
// complete. Combined with the interaction requirement below, "Explored" means
// "worked with the lab", not "opened the page".
const engagedDwellMs = 4000;

export function VisualizationCard({
  title,
  children,
  analyticsSource,
  autoExplore = false,
  explorationScopeKey,
  formula,
  initialExplored = false,
  moduleId: explicitModuleId,
  onExplored,
  topicId
}: {
  title: string;
  children: ReactNode;
  analyticsSource: LearningAnalyticsEventSource;
  // When true, the system records exploration automatically — there is no
  // manual "Mark explored" button. The host flips this on once the student has
  // actually reached the working lab (its interactive runtime is ready).
  autoExplore?: boolean;
  explorationScopeKey?: string;
  formula?: string;
  initialExplored?: boolean;
  moduleId?: string;
  onExplored?: (moduleId: string) => void;
  topicId: string;
}) {
  const { currentUser, recordLearningEvent } = useSettings();
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

  const recordExplored = useCallback(async () => {
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
  }, [analyticsSource, currentUser, localExploredStorageKey, moduleId, onExplored, recordLearningEvent, topicId]);

  // Keep the latest recorder in a ref so unrelated re-renders (e.g. a new inline
  // onExplored closure from the parent) never retrigger the auto-explore effect.
  const recordExploredRef = useRef(recordExplored);
  useEffect(() => {
    recordExploredRef.current = recordExplored;
  }, [recordExplored]);

  // Earned exploration: reaching the working lab is not enough on its own.
  // The student must also (a) keep the ready lab on screen for a short dwell
  // and (b) interact with the lab body at least once. Both may happen in any
  // order; exploration records once the last condition is met. Replaces the
  // old manual "Mark explored" button without rewarding a drive-by page load.
  const [dwellSatisfied, setDwellSatisfied] = useState(false);
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    setDwellSatisfied(false);
    setInteracted(false);
  }, [moduleId]);

  useEffect(() => {
    if (!autoExplore || typeof window === "undefined") return;
    const timer = window.setTimeout(() => setDwellSatisfied(true), engagedDwellMs);
    return () => window.clearTimeout(timer);
  }, [autoExplore, moduleId]);

  const handleBodyEngagement = useCallback(() => {
    setInteracted(true);
  }, []);

  const autoExploredModuleRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoExplore || !dwellSatisfied || !interacted) return;
    if (initialExplored) return;
    if (saveState !== "idle") return;
    if (autoExploredModuleRef.current === moduleId) return;
    autoExploredModuleRef.current = moduleId;
    setSaveState("saving");
    void recordExploredRef.current();
  }, [autoExplore, dwellSatisfied, initialExplored, interacted, moduleId, saveState]);

  return (
    <section
      data-viz-card
      data-viz-module-id={moduleId}
      data-viz-topic-id={topicId}
      data-viz-save-state={saveState}
      data-viz-explore-gate={autoExplore ? (interacted ? (dwellSatisfied ? "engaged" : "dwell") : "awaiting-interaction") : "inactive"}
      className="glass-panel overflow-hidden p-4 sm:p-6"
    >
      <div className="mb-5 min-w-0">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{title}</h2>
        {formula ? (
          <div
            data-viz-card-formula
            aria-label="Scrollable visualization formula"
            role="region"
            tabIndex={0}
            className="mt-3 inline-flex max-w-full items-center overflow-x-auto overscroll-x-contain rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-black text-cyan-800 shadow-sm dark:border-cyan-300/30 dark:bg-cyan-300/10 dark:text-cyan-100"
          >
            <MathText as="span" text={formula} normalizeMath={false} className="min-w-0 break-words" />
          </div>
        ) : null}
      </div>
      <div data-viz-card-body onPointerDownCapture={handleBodyEngagement} onKeyDownCapture={handleBodyEngagement}>
        {children}
      </div>
    </section>
  );
}
