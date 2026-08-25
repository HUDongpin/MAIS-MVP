"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import {
  beginVisualizationCompletionTelemetryOnce,
  completeVisualizationCompletionTelemetryOnce,
} from "@/lib/learningAnalytics";
import {
  isVisualizationSessionOutboxRecord,
  queueVisualizationSessionOutbox,
  visualizationSessionOutboxAcknowledgedEventName,
  visualizationSessionOutboxFailedEventName,
  visualizationSessionOutboxUpdatedEventName,
  type VisualizationSessionOutboxRecord,
} from "@/lib/visualizationSessionOutbox";
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
  topicId,
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
  const stateScopeKey = useMemo(
    () =>
      JSON.stringify([
        currentUser?.id ?? "guest",
        explorationScopeKey ?? "",
        moduleId,
        topicId,
        analyticsSource,
      ]),
    [analyticsSource, currentUser?.id, explorationScopeKey, moduleId, topicId],
  );
  const previousStateScopeKey = useRef(stateScopeKey);
  const [saveState, setSaveState] = useState<SaveState>(() =>
    initialExplored ? "saved" : "idle",
  );
  const localExploredStorageKey = useMemo(
    () => `mais:viz-explored:${stateScopeKey}`,
    [stateScopeKey],
  );
  const activeStateScopeKeyRef = useRef(stateScopeKey);
  const autoExploredScopeRef = useRef<string | null>(null);
  const completionRecordedScopeRef = useRef<string | null>(null);
  activeStateScopeKeyRef.current = stateScopeKey;

  const notifyExplored = useCallback(() => {
    try {
      onExplored?.(moduleId);
    } catch {
      // A host callback is observational. It must never reinterpret a durable
      // local/server acknowledgement as a failed visualization persistence.
    }
  }, [moduleId, onExplored]);

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
    try {
      if (window.localStorage.getItem(localExploredStorageKey) === "1") {
        notifyExplored();
        setSaveState("saved");
      }
    } catch {
      setSaveState("error");
    }
  }, [currentUser, initialExplored, localExploredStorageKey, notifyExplored]);

  const recordExplored = useCallback(() => {
    const requestScopeKey = stateScopeKey;
    const recordCompletionOnce = () => {
      if (completionRecordedScopeRef.current === requestScopeKey) return;
      if (!currentUser) {
        completionRecordedScopeRef.current = requestScopeKey;
        recordLearningEvent({
          type: "visualization-complete",
          source: analyticsSource,
          topicId,
        });
        return;
      }

      const completion = beginVisualizationCompletionTelemetryOnce(
        window.localStorage,
        currentUser.id,
        moduleId,
        topicId,
        window.crypto.randomUUID(),
      );
      if (completion.status === "complete") {
        completionRecordedScopeRef.current = requestScopeKey;
        return;
      }
      const persistence = recordLearningEvent(
        {
          type: "visualization-complete",
          source: analyticsSource,
          topicId,
        },
        {
          eventId: completion.marker.eventId,
          eventTimestamp: completion.marker.eventTimestamp,
        },
      );
      if (persistence === "ignored") return;

      // confirmed and unconfirmed are both exact-user localStorage states.
      // A refresh-only sessionStorage fallback or volatile in-memory row must
      // retain the pending marker, so a later mount can replay the same
      // deterministic event identity rather than falsely claiming completion.
      if (persistence === "confirmed" || persistence === "unconfirmed") {
        completeVisualizationCompletionTelemetryOnce(
          window.localStorage,
          completion.marker,
        );
      }
      completionRecordedScopeRef.current = requestScopeKey;
    };
    if (!currentUser && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(localExploredStorageKey, "1");
      } catch {
        if (activeStateScopeKeyRef.current === requestScopeKey) {
          autoExploredScopeRef.current = null;
          setSaveState("error");
        }
        return;
      }
      try {
        recordCompletionOnce();
      } catch {
        // The guest explored marker is already durable. Analytics degradation
        // must not strand the learner in a permanent saving state.
      }
      notifyExplored();
      if (activeStateScopeKeyRef.current === requestScopeKey)
        setSaveState("saved");
      return;
    }
    if (!currentUser || typeof window === "undefined") return;
    if (currentUser.role !== "student") {
      notifyExplored();
      if (activeStateScopeKeyRef.current === requestScopeKey)
        setSaveState("saved");
      return;
    }

    const sessionRecord: VisualizationSessionOutboxRecord = {
      userId: currentUser.id,
      moduleId,
      topicId,
      source: analyticsSource,
      queuedAt: Date.now(),
    };
    try {
      queueVisualizationSessionOutbox(window.localStorage, sessionRecord);
    } catch {
      if (activeStateScopeKeyRef.current !== requestScopeKey) return;
      if (autoExploredScopeRef.current === requestScopeKey) {
        autoExploredScopeRef.current = null;
      }
      setSaveState("error");
      return;
    }
    try {
      recordCompletionOnce();
    } catch {
      // Session persistence is already durable. Keep the completion protocol
      // fail-closed and pending without suppressing its exact session write.
    }
    // AppProviders is the single network owner for visualization sessions.
    // Keeping the card as a durable producer prevents a late direct-request
    // failure from overwriting a successful central acknowledgement.
    window.dispatchEvent(new Event(visualizationSessionOutboxUpdatedEventName));
  }, [
    analyticsSource,
    currentUser,
    localExploredStorageKey,
    moduleId,
    notifyExplored,
    recordLearningEvent,
    stateScopeKey,
    topicId,
  ]);

  useEffect(() => {
    if (!currentUser) return;
    const matchesCurrentScope = (event: Event) => {
      const record = (event as CustomEvent<unknown>).detail;
      return (
        isVisualizationSessionOutboxRecord(record) &&
        record.userId === currentUser.id &&
        record.moduleId === moduleId &&
        record.topicId === topicId &&
        record.source === analyticsSource
      );
    };
    const handleAcknowledged = (event: Event) => {
      if (!matchesCurrentScope(event)) return;
      notifyExplored();
      if (activeStateScopeKeyRef.current === stateScopeKey)
        setSaveState("saved");
    };
    const handleFailed = (event: Event) => {
      if (
        !matchesCurrentScope(event) ||
        activeStateScopeKeyRef.current !== stateScopeKey
      )
        return;
      autoExploredScopeRef.current = null;
      setSaveState("error");
    };
    window.addEventListener(
      visualizationSessionOutboxAcknowledgedEventName,
      handleAcknowledged,
    );
    window.addEventListener(
      visualizationSessionOutboxFailedEventName,
      handleFailed,
    );
    return () => {
      window.removeEventListener(
        visualizationSessionOutboxAcknowledgedEventName,
        handleAcknowledged,
      );
      window.removeEventListener(
        visualizationSessionOutboxFailedEventName,
        handleFailed,
      );
    };
  }, [analyticsSource, currentUser, moduleId, notifyExplored, stateScopeKey, topicId]);

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
  const [dwellSatisfiedScopeKey, setDwellSatisfiedScopeKey] = useState<
    string | null
  >(null);
  const [interactionScopeKey, setInteractionScopeKey] = useState<string | null>(
    null,
  );
  const dwellSatisfied = dwellSatisfiedScopeKey === stateScopeKey;
  const interacted = interactionScopeKey === stateScopeKey;

  useEffect(() => {
    setDwellSatisfiedScopeKey(null);
    setInteractionScopeKey(null);
    autoExploredScopeRef.current = null;
    completionRecordedScopeRef.current = null;
  }, [stateScopeKey]);

  useEffect(() => {
    if (!autoExplore || typeof window === "undefined") return;
    const timer = window.setTimeout(
      () => setDwellSatisfiedScopeKey(stateScopeKey),
      engagedDwellMs,
    );
    return () => window.clearTimeout(timer);
  }, [autoExplore, stateScopeKey]);

  const handleBodyEngagement = useCallback(() => {
    setInteractionScopeKey(stateScopeKey);
    setSaveState((current) => (current === "error" ? "idle" : current));
  }, [stateScopeKey]);

  useEffect(() => {
    if (!autoExplore || !dwellSatisfied || !interacted) return;
    if (initialExplored) return;
    if (saveState !== "idle") return;
    if (autoExploredScopeRef.current === stateScopeKey) return;
    autoExploredScopeRef.current = stateScopeKey;
    setSaveState("saving");
    void recordExploredRef.current();
  }, [
    autoExplore,
    dwellSatisfied,
    initialExplored,
    interacted,
    saveState,
    stateScopeKey,
  ]);

  return (
    <section
      data-viz-card
      data-viz-module-id={moduleId}
      data-viz-topic-id={topicId}
      data-viz-save-state={saveState}
      data-viz-explore-gate={
        autoExplore
          ? interacted
            ? dwellSatisfied
              ? "engaged"
              : "dwell"
            : "awaiting-interaction"
          : "inactive"
      }
      className="soft-panel overflow-hidden bg-white p-4 dark:bg-slate-950 sm:p-6"
    >
      <div className="mb-5 min-w-0">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">
          {title}
        </h2>
        {formula ? (
          <div
            data-viz-card-formula
            className="mt-3 inline-flex max-w-full items-center rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-black text-cyan-800 shadow-sm dark:border-cyan-300/30 dark:bg-cyan-300/10 dark:text-cyan-100"
          >
            <MathText
              as="span"
              text={formula}
              normalizeMath={false}
              className="min-w-0 break-words"
            />
          </div>
        ) : null}
      </div>
      <div
        data-viz-card-body
        onPointerDownCapture={handleBodyEngagement}
        onKeyDownCapture={handleBodyEngagement}
      >
        {children}
      </div>
    </section>
  );
}
