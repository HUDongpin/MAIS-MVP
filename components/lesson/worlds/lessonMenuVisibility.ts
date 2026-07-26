"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent, type RefObject } from "react";
import { lessonWorldBandForGrade, type LessonWorldBand } from "@/components/lesson/worlds/worldThemes";
import type { GradeId } from "@/types";

/**
 * Lesson menu visibility — "hide the map, give me the page".
 *
 * Two ways the world map / list menu gets out of the student's way:
 *
 *   1. The **Hide** button in the menu header (both views). Explicit, instant,
 *      and remembered for the session.
 *   2. **Auto-peek**: after the student is demonstrably working in the lesson
 *      body, an untouched menu tucks itself to the rail on its own.
 *
 * Auto-peek is deliberately conservative, because self-changing UI is the part
 * young learners find hardest to follow:
 *
 *   - It never fires before the student has engaged with the lesson content —
 *     a child who just landed and is still reading the map is left alone.
 *   - It never fires while the pointer is over the menu or the menu holds
 *     keyboard focus, and any menu touch restarts the clock.
 *   - It collapses to a *visible rail*, never to nothing, so there is always a
 *     way back.
 *   - Once the student re-opens the menu by hand, auto-peek is off for the
 *     rest of the session. Their explicit choice outranks ours.
 *   - It never steals focus (only the manual button moves focus), so it cannot
 *     interrupt typing or screen-reader position.
 *   - It is desktop/laptop only. Below `lg` the menu sits *above* the content,
 *     so removing it mid-read would yank the page under the student's eyes.
 *     There, Hide stays a manual button.
 */

export const lessonMenuPanelId = "lesson-world-menu-panel";
export const lessonMenuHideButtonId = "lesson-world-menu-hide";
export const lessonMenuRailButtonId = "lesson-world-menu-rail";
export const lessonMenuPillButtonId = "lesson-world-menu-pill";

/** Manual toggle: quick, because it is pressed on purpose and pressed often. */
export const lessonMenuHideDurationMs = 240;
/** Auto-peek: slower and softer, so the tuck-away reads as a gesture, not a glitch. */
export const lessonMenuAutoPeekDurationMs = 520;
/** The column reclaiming the space, once the panel is out of the way. */
export const lessonMenuColumnDurationMs = 300;

/**
 * How long an untouched menu waits before it peeks away, by grade band.
 *
 * There is no single industry standard here, so this is our house standard:
 * ~12s is long enough that it never fires mid-thought for a fluent reader, and
 * short enough that it actually reclaims the space during focused work. K–2
 * (Sprout Meadow) gets 20s — the youngest readers are the slowest to parse the
 * map and the most disoriented by UI that moves on its own.
 */
export const lessonMenuAutoPeekDelayMsByBand: Record<LessonWorldBand, number> = {
  early: 20_000,
  upper: 12_000,
  middle: 12_000,
  high: 12_000
};

const defaultAutoPeekDelayMs = 12_000;

/** Auto-peek is a two-column-layout behaviour only — see the note above. */
const autoPeekMinWidthQuery = "(min-width: 1024px)";

/**
 * Programmatic scrolls and scroll restoration fire right after mount; ignore
 * them so arriving on the page never counts as "the student got to work".
 */
const engagementGraceMs = 1_500;

const hiddenStorageKey = "mais.lesson-menu-hidden";
const autoPeekOptOutStorageKey = "mais.lesson-menu-auto-peek-off";
const coachMarkStorageKey = "mais.lesson-menu-coach-mark-seen";
const coachMarkVisibleMs = 7_000;

function readSessionFlag(key: string) {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeSessionFlag(key: string, value: boolean) {
  try {
    if (value) window.sessionStorage.setItem(key, "1");
    else window.sessionStorage.removeItem(key);
  } catch {
    // Storage unavailable (private mode) — the in-memory state still works.
  }
}

/**
 * Focus the first of these controls that is actually on screen at this width.
 * `getClientRects()` rather than `offsetParent`, which is always null for the
 * `position: fixed` reveal pill.
 */
function focusFirstVisible(ids: string[]) {
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element instanceof HTMLElement && element.getClientRects().length > 0) {
      element.focus();
      return;
    }
  }
}

export type LessonMenuVisibility = {
  /**
   * Attach to the menu wrapper. "Is this event inside the menu?" is answered
   * through this node rather than `getElementById(lessonMenuPanelId)`: React's
   * streaming SSR leaves a second, `hidden` copy of the panel in the document,
   * so that id resolves by document order. If the template ever sorted first,
   * every real menu interaction would read as "outside the menu" and the
   * auto-peek clock would keep running while the student was using the map —
   * the one thing this behaviour must never do. A ref is unambiguous.
   */
  menuPanelRef: RefObject<HTMLDivElement | null>;
  /** The menu is out; the rail (or the pill, on narrow) stands in for it. */
  isHidden: boolean;
  /** The menu is still mounted, mid tuck-away. */
  isCollapsing: boolean;
  /** Duration of the tuck-away currently running — manual is faster than auto. */
  collapseDurationMs: number;
  showCoachMark: boolean;
  dismissCoachMark: () => void;
  hideMenu: () => void;
  showMenu: () => void;
  /** Spread on the menu wrapper: pauses and restarts the auto-peek clock. */
  menuHoldHandlers: {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onFocusCapture: () => void;
    onBlurCapture: (event: FocusEvent<HTMLElement>) => void;
    onPointerDownCapture: () => void;
    onWheelCapture: () => void;
  };
};

export function useLessonMenuVisibility({
  enabled,
  grade,
  prefersReducedMotion
}: {
  enabled: boolean;
  grade: GradeId | null;
  prefersReducedMotion: boolean;
}): LessonMenuVisibility {
  const autoPeekDelayMs = grade
    ? lessonMenuAutoPeekDelayMsByBand[lessonWorldBandForGrade(grade)]
    : defaultAutoPeekDelayMs;

  const [isHidden, setIsHidden] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [collapseDurationMs, setCollapseDurationMs] = useState(lessonMenuHideDurationMs);
  const [showCoachMark, setShowCoachMark] = useState(false);

  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const collapseTimerRef = useRef<number | null>(null);
  const peekTimerRef = useRef<number | null>(null);
  const coachMarkTimerRef = useRef<number | null>(null);
  const mountedAtRef = useRef(0);
  const isHiddenRef = useRef(false);
  const isEngagedRef = useRef(false);
  const isHeldRef = useRef(false);
  const isAutoPeekOptedOutRef = useRef(false);
  const focusTargetRef = useRef<"reveal" | "menu" | null>(null);

  const clearPeekTimer = useCallback(() => {
    if (peekTimerRef.current === null) return;
    window.clearTimeout(peekTimerRef.current);
    peekTimerRef.current = null;
  }, []);

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current === null) return;
    window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = null;
  }, []);

  const revealCoachMarkOnce = useCallback(() => {
    try {
      if (window.localStorage.getItem(coachMarkStorageKey) === "1") return;
      window.localStorage.setItem(coachMarkStorageKey, "1");
    } catch {
      // Storage unavailable — showing the hint once per session is fine too.
    }
    setShowCoachMark(true);
    coachMarkTimerRef.current = window.setTimeout(() => {
      coachMarkTimerRef.current = null;
      setShowCoachMark(false);
    }, coachMarkVisibleMs);
  }, []);

  const collapse = useCallback(
    (source: "manual" | "auto") => {
      clearPeekTimer();
      if (isHiddenRef.current) return;

      if (source === "manual") {
        // Explicit intent: remember it, and hand the keyboard the way back.
        focusTargetRef.current = "reveal";
        writeSessionFlag(hiddenStorageKey, true);
      }

      const finish = () => {
        isHiddenRef.current = true;
        setIsHidden(true);
        setIsCollapsing(false);
        // Auto-peek never steals focus — the student is mid-sentence.
        if (source === "auto") revealCoachMarkOnce();
      };

      if (prefersReducedMotion) {
        finish();
        return;
      }

      const duration = source === "manual" ? lessonMenuHideDurationMs : lessonMenuAutoPeekDurationMs;
      setCollapseDurationMs(duration);
      setIsCollapsing(true);
      clearCollapseTimer();
      collapseTimerRef.current = window.setTimeout(() => {
        collapseTimerRef.current = null;
        finish();
      }, duration);
    },
    [clearCollapseTimer, clearPeekTimer, prefersReducedMotion, revealCoachMarkOnce]
  );

  const armPeekTimer = useCallback(() => {
    clearPeekTimer();
    if (!enabled) return;
    if (isAutoPeekOptedOutRef.current) return;
    if (!isEngagedRef.current) return;
    if (isHeldRef.current) return;
    if (isHiddenRef.current) return;
    if (typeof window.matchMedia === "function" && !window.matchMedia(autoPeekMinWidthQuery).matches) return;

    peekTimerRef.current = window.setTimeout(() => {
      peekTimerRef.current = null;
      if (isHeldRef.current || isHiddenRef.current || isAutoPeekOptedOutRef.current) return;
      collapse("auto");
    }, autoPeekDelayMs);
  }, [autoPeekDelayMs, clearPeekTimer, collapse, enabled]);

  const hold = useCallback(() => {
    isHeldRef.current = true;
    clearPeekTimer();
  }, [clearPeekTimer]);

  const release = useCallback(() => {
    isHeldRef.current = false;
    armPeekTimer();
  }, [armPeekTimer]);

  const hideMenu = useCallback(() => collapse("manual"), [collapse]);

  const showMenu = useCallback(() => {
    clearPeekTimer();
    clearCollapseTimer();
    // Re-opening by hand is a decision: stop tucking the menu away this session.
    isAutoPeekOptedOutRef.current = true;
    writeSessionFlag(autoPeekOptOutStorageKey, true);
    writeSessionFlag(hiddenStorageKey, false);
    isHiddenRef.current = false;
    focusTargetRef.current = "menu";
    setIsHidden(false);
    setIsCollapsing(false);
    setShowCoachMark(false);
  }, [clearCollapseTimer, clearPeekTimer]);

  const dismissCoachMark = useCallback(() => {
    if (coachMarkTimerRef.current !== null) {
      window.clearTimeout(coachMarkTimerRef.current);
      coachMarkTimerRef.current = null;
    }
    setShowCoachMark(false);
  }, []);

  // Restore the session's choices.
  useEffect(() => {
    mountedAtRef.current = Date.now();
    isAutoPeekOptedOutRef.current = readSessionFlag(autoPeekOptOutStorageKey);
    // Only a *manual* hide persists across lessons — an auto-peek is about the
    // page the student was reading, not a preference they expressed.
    if (readSessionFlag(hiddenStorageKey)) {
      isHiddenRef.current = true;
      setIsHidden(true);
    }
  }, []);

  // "The student got to work" — the only thing that starts the auto-peek clock.
  useEffect(() => {
    if (!enabled) return;

    const isInsideMenu = (target: EventTarget | null) =>
      target instanceof Node && Boolean(menuPanelRef.current?.contains(target));

    const noteEngagement = (event: Event) => {
      if (isEngagedRef.current) return;
      if (Date.now() - mountedAtRef.current < engagementGraceMs) return;
      if (isInsideMenu(event.target)) return;
      isEngagedRef.current = true;
      armPeekTimer();
    };

    // Touch has no `pointerleave`, so a tap on the menu would otherwise hold the
    // clock forever. Working anywhere else releases it.
    const notePointerDown = (event: PointerEvent) => {
      if (!isInsideMenu(event.target)) release();
      noteEngagement(event);
    };

    window.addEventListener("scroll", noteEngagement, { passive: true });
    window.addEventListener("pointerdown", notePointerDown, true);
    window.addEventListener("keydown", noteEngagement, true);
    return () => {
      window.removeEventListener("scroll", noteEngagement);
      window.removeEventListener("pointerdown", notePointerDown, true);
      window.removeEventListener("keydown", noteEngagement, true);
    };
  }, [armPeekTimer, enabled, release]);

  // Focus follows the manual toggle so keyboard users are never stranded.
  useEffect(() => {
    const target = focusTargetRef.current;
    if (!target) return;
    focusTargetRef.current = null;
    focusFirstVisible(
      target === "reveal" ? [lessonMenuRailButtonId, lessonMenuPillButtonId] : [lessonMenuHideButtonId]
    );
  }, [isHidden]);

  useEffect(
    () => () => {
      clearPeekTimer();
      clearCollapseTimer();
      if (coachMarkTimerRef.current !== null) window.clearTimeout(coachMarkTimerRef.current);
    },
    [clearCollapseTimer, clearPeekTimer]
  );

  return {
    menuPanelRef,
    isHidden,
    isCollapsing,
    collapseDurationMs,
    showCoachMark,
    dismissCoachMark,
    hideMenu,
    showMenu,
    menuHoldHandlers: {
      onPointerEnter: hold,
      onPointerLeave: release,
      onFocusCapture: hold,
      onBlurCapture: (event: FocusEvent<HTMLElement>) => {
        // Moving between controls inside the menu is still "in the menu".
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        release();
      },
      onPointerDownCapture: armPeekTimer,
      onWheelCapture: armPeekTimer
    }
  };
}
