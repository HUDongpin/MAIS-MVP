"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { useReducedMotion } from "@/components/ui/Motion";
import { practiceReadAloudLanguageCode, speakPracticeText, stopPracticeReadAloud } from "@/lib/practiceReadAloud";
import { cn } from "@/lib/utils";
import type { LocalizedText } from "@/types";

export type GuidedTourStep = {
  id: string;
  anchor: string;
  title: LocalizedText;
  body: LocalizedText;
};

export type GuidedTourRecord = {
  status: "completed" | "skipped";
  at: string;
};

export type GuidedTourCopy = {
  progress: (step: number, total: number) => LocalizedText;
  skip: LocalizedText;
  back: LocalizedText;
  next: LocalizedText;
  done: LocalizedText;
  readAloudOn: LocalizedText;
  readAloudOff: LocalizedText;
};

// "kid" is the K-2 preset: fewer words fit per line, and every control clears
// the 48px touch target Chromebook/iPad learners need.
export type GuidedTourSize = "standard" | "kid";

const defaultCopy: GuidedTourCopy = {
  progress: (step, total) => ({
    en: `Step ${step} of ${total}`,
    zh: `第 ${step} 步，共 ${total} 步`,
    zhHans: `第 ${step} 步，共 ${total} 步`
  }),
  skip: { en: "Skip tour", zh: "略過導覽", zhHans: "跳过导览" },
  back: { en: "Back", zh: "上一步", zhHans: "上一步" },
  next: { en: "Next", zh: "下一步", zhHans: "下一步" },
  done: { en: "Done", zh: "完成", zhHans: "完成" },
  readAloudOn: { en: "Reading aloud — tap to turn off", zh: "正在朗讀 —— 點一下關閉", zhHans: "正在朗读 —— 点一下关闭" },
  readAloudOff: { en: "Read this aloud to me", zh: "讀給我聽", zhHans: "读给我听" }
};

const sizePresets = {
  standard: {
    cardWidth: 344,
    cardHeight: 226,
    cardPadding: "p-5",
    titleClassName: "text-lg",
    bodyClassName: "text-sm leading-6",
    quietButtonClassName: "px-3 py-2 text-sm",
    backButtonClassName: "px-4 py-2 text-sm",
    nextButtonClassName: "px-5 py-2 text-sm",
    speakerButtonClassName: "h-9 w-9 text-base"
  },
  kid: {
    cardWidth: 380,
    cardHeight: 300,
    cardPadding: "p-6",
    titleClassName: "text-2xl",
    bodyClassName: "text-base leading-7",
    quietButtonClassName: "min-h-[3rem] px-4 py-3 text-base",
    backButtonClassName: "min-h-[3rem] px-5 py-3 text-base",
    nextButtonClassName: "min-h-[3rem] px-6 py-3 text-base",
    speakerButtonClassName: "h-12 w-12 text-2xl"
  }
} satisfies Record<GuidedTourSize, Record<string, string | number>>;

export function readGuidedTourRecord(raw: string | null): GuidedTourRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GuidedTourRecord;
    return parsed && (parsed.status === "completed" || parsed.status === "skipped") ? parsed : null;
  } catch {
    return null;
  }
}

export function markGuidedTourRecord(storageKey: string, status: GuidedTourRecord["status"]) {
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ status, at: new Date().toISOString() } satisfies GuidedTourRecord)
    );
  } catch {
    // Storage may be unavailable (private mode); the tour simply re-offers later.
  }
}

// Responsive layouts repeat the same data-tour value (a desktop nav row and the
// mobile menu both carry it), so a step resolves to the first copy that is
// actually laid out: a display:none element measures 0x0 and would otherwise
// spotlight the top-left corner of the screen.
export function resolveVisibleAnchor(anchor: string): Element | null {
  const candidates = Array.from(document.querySelectorAll(`[data-tour="${anchor}"]`));
  return candidates.find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }) ?? null;
}

const anchorPadding = 8;

// A surface that has still painted nothing to point at after this long is not
// going to, so the tour closes rather than sit invisible over the page. Long
// enough for a cold 3D lab bundle on a school Chromebook: nothing is on screen
// while we wait, so a generous deadline costs the learner nothing, and a short
// one silently loses the tour on exactly the heaviest pages.
const lateAnchorDeadlineMs = 12000;

// Layout can settle without mutating the DOM at all — a canvas takes its size, a
// web font swaps in, a transition ends — so the observer below carries a poll
// beside it rather than trusting mutations on their own.
const anchorPollMs = 250;

// Read-aloud defaults to on wherever it is offered: it exists for learners who
// cannot yet read the card, and they are the least likely to go find a toggle.
function readReadAloudPreference(storageKey: string | undefined) {
  if (!storageKey) return true;
  try {
    return window.localStorage.getItem(storageKey) !== "off";
  } catch {
    return true;
  }
}

function writeReadAloudPreference(storageKey: string | undefined, enabled: boolean) {
  if (!storageKey) return;
  try {
    window.localStorage.setItem(storageKey, enabled ? "on" : "off");
  } catch {
    // Storage may be unavailable (private mode); the choice just lasts this session.
  }
}

export function GuidedTour({
  steps: stepDefinitions,
  open,
  onClose,
  storageKey,
  idPrefix,
  size = "standard",
  copy: copyOverrides,
  readAloud = false,
  readAloudStorageKey
}: {
  steps: GuidedTourStep[];
  open: boolean;
  onClose: () => void;
  storageKey?: string;
  idPrefix: string;
  size?: GuidedTourSize;
  copy?: Partial<GuidedTourCopy>;
  readAloud?: boolean;
  readAloudStorageKey?: string;
}) {
  const { language, text, t } = useSettings();
  const reduceMotion = useReducedMotion();
  const [steps, setSteps] = useState<GuidedTourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [readAloudOn, setReadAloudOn] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const currentStepIdRef = useRef<string | null>(null);
  const spokenStepRef = useRef<{ title: string; body: string } | null>(null);

  const copy = { ...defaultCopy, ...copyOverrides };
  const preset = sizePresets[size];
  const currentStep = steps[stepIndex] ?? null;
  const currentStepId = currentStep?.id ?? null;

  useEffect(() => {
    currentStepIdRef.current = currentStep?.id ?? null;
    // Resolved here so the speaking effect can key on the step id alone; `text`
    // is a fresh closure every render and would otherwise re-speak constantly.
    spokenStepRef.current = currentStep
      ? { title: text(currentStep.title), body: text(currentStep.body) }
      : null;
  }, [currentStep, text]);

  useEffect(() => {
    if (!readAloud) return;
    setReadAloudOn(readReadAloudPreference(readAloudStorageKey));
  }, [readAloud, readAloudStorageKey]);

  useEffect(() => {
    if (!open || !readAloud || !readAloudOn || !currentStepId) return;
    const spoken = spokenStepRef.current;
    if (!spoken) return;
    const separator = language === "en" ? ". " : "。";
    speakPracticeText(`${spoken.title}${separator}${spoken.body}`, practiceReadAloudLanguageCode(language));
    return () => stopPracticeReadAloud();
  }, [open, readAloud, readAloudOn, currentStepId, language]);

  const toggleReadAloud = useCallback(() => {
    setReadAloudOn((enabled) => {
      const next = !enabled;
      writeReadAloudPreference(readAloudStorageKey, next);
      if (!next) stopPracticeReadAloud();
      return next;
    });
  }, [readAloudStorageKey]);

  const finish = useCallback(
    (status: GuidedTourRecord["status"]) => {
      stopPracticeReadAloud();
      if (storageKey) markGuidedTourRecord(storageKey, status);
      onClose();
    },
    [onClose, storageKey]
  );

  useEffect(() => {
    if (!open) return;

    // Anchors can mount later than the tour opens — the tutor launcher waits on
    // its policy, a 3D lab paints only once its bundle has loaded — so the step
    // list is resolved again whenever the page changes, not on a ladder of fixed
    // retries: those either fire before the anchor exists or a second or two
    // after it does, which on a heavy surface is the whole delay the learner
    // feels. Definition order is fixed, so a late anchor only ever adds a step;
    // the learner keeps their place by step id.
    let resolvedIds: string | null = null;

    const resolve = () => {
      const available = stepDefinitions.filter((step) => resolveVisibleAnchor(step.anchor));
      const ids = available.map((step) => step.id).join("|");
      // Heavy surfaces mutate constantly while they settle, and re-rendering the
      // tour for a step list that has not actually changed is pure waste.
      if (ids === resolvedIds) return;
      const isFirstPass = resolvedIds === null;
      resolvedIds = ids;
      setSteps(available);
      setStepIndex((index) => {
        if (isFirstPass) return 0;
        const keptIndex = available.findIndex((step) => step.id === currentStepIdRef.current);
        return keptIndex >= 0 ? keptIndex : Math.min(index, Math.max(available.length - 1, 0));
      });
    };

    resolve();

    // Nothing closes the tour on an empty pass: heavy surfaces (a lesson, the
    // network map, a 3D lab) can mount their anchors seconds after the learner
    // taps "Show me around", and giving up early makes the tour look broken.
    // Nothing renders until an anchor resolves, so waiting is silent.
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, {
      attributeFilter: ["class", "hidden", "style"],
      attributes: true,
      childList: true,
      subtree: true
    });
    const poll = window.setInterval(resolve, anchorPollMs);
    const deadline = window.setTimeout(() => {
      observer.disconnect();
      window.clearInterval(poll);
      if (!resolvedIds) onClose();
    }, lateAnchorDeadlineMs);

    return () => {
      observer.disconnect();
      window.clearInterval(poll);
      window.clearTimeout(deadline);
    };
  }, [open, onClose, stepDefinitions]);

  useEffect(() => {
    if (!open || !currentStep) return;
    if (!resolveVisibleAnchor(currentStep.anchor)) {
      setAnchorRect(null);
      return;
    }

    // Instant, not smooth: the card is positioned from a rect measured right
    // after this call, and an animated scroll would leave it behind.
    resolveVisibleAnchor(currentStep.anchor)?.scrollIntoView({ block: "center", behavior: "auto" });

    const measure = () => {
      // Re-resolve on every measure: rotating an iPad can swap which copy of the
      // anchor is the laid-out one.
      const element = resolveVisibleAnchor(currentStep.anchor);
      if (!element) {
        setAnchorRect(null);
        return;
      }
      const rect = element.getBoundingClientRect();
      setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    measure();

    // The anchor can still be growing under the spotlight now that a step is
    // shown as soon as it resolves — a lab swaps its loading panel for a canvas,
    // a list streams in rows — and a highlight measured against the placeholder
    // would sit over the wrong part of the page.
    const anchorResize = new ResizeObserver(measure);
    const anchor = resolveVisibleAnchor(currentStep.anchor);
    if (anchor) anchorResize.observe(anchor);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      anchorResize.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, currentStep]);

  useEffect(() => {
    if (!open || !currentStep) return;
    cardRef.current?.focus();
  }, [open, currentStep]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish("skipped");
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setStepIndex((index) => Math.min(index + 1, steps.length - 1));
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setStepIndex((index) => Math.max(index - 1, 0));
        return;
      }
      if (event.key === "Tab") {
        // Keep focus inside the tour card while the overlay is up.
        const card = cardRef.current;
        if (!card) return;
        const focusable = card.querySelectorAll<HTMLElement>("button");
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (!card.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, steps.length, finish]);

  if (!open || !currentStep || !anchorRect) return null;

  const isLastStep = stepIndex === steps.length - 1;
  const highlight = {
    top: anchorRect.top - anchorPadding,
    left: anchorRect.left - anchorPadding,
    width: anchorRect.width + anchorPadding * 2,
    height: anchorRect.height + anchorPadding * 2
  };
  // Reached only after an anchor has been measured, so the DOM exists. A hidden
  // or not-yet-laid-out tab reports a 0x0 viewport; falling back keeps the card
  // on screen instead of clamping it to a negative offset.
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 800;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
  const placeBelow = highlight.top + highlight.height + preset.cardHeight + 20 < viewportHeight;
  const cardTop = placeBelow
    ? Math.min(highlight.top + highlight.height + 14, viewportHeight - preset.cardHeight - 14)
    : Math.max(14, highlight.top - preset.cardHeight - 14);
  // Width is clamped here rather than with a vw-based max-width so a viewport
  // that reports zero cannot collapse the card to nothing.
  const cardWidth = Math.max(240, Math.min(preset.cardWidth, viewportWidth - 28));
  const cardLeft = Math.max(14, Math.min(highlight.left, viewportWidth - cardWidth - 14));

  return (
    <div className="fixed inset-0 z-[80]" role="presentation">
      <div
        aria-hidden="true"
        className={cn("absolute rounded-2xl", reduceMotion ? "" : "transition-all duration-300")}
        style={{
          top: highlight.top,
          left: highlight.left,
          width: highlight.width,
          height: highlight.height,
          boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.55)"
        }}
      />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idPrefix}-title`}
        aria-describedby={`${idPrefix}-body`}
        tabIndex={-1}
        className={cn("glass-panel absolute shadow-xl outline-none", preset.cardPadding)}
        style={{ top: cardTop, left: cardLeft, width: cardWidth }}
      >
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
          {t(copy.progress(stepIndex + 1, steps.length))}
        </p>
        <h2 id={`${idPrefix}-title`} className={cn("mt-2 font-black text-slate-950 dark:text-white", preset.titleClassName)}>
          {text(currentStep.title)}
        </h2>
        <p
          id={`${idPrefix}-body`}
          aria-live="polite"
          className={cn("mt-2 text-slate-600 dark:text-slate-300", preset.bodyClassName)}
        >
          {text(currentStep.body)}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {readAloud ? (
              <button
                type="button"
                onClick={toggleReadAloud}
                aria-pressed={readAloudOn}
                aria-label={t(readAloudOn ? copy.readAloudOn : copy.readAloudOff)}
                title={t(readAloudOn ? copy.readAloudOn : copy.readAloudOff)}
                className={cn(
                  "focus-ring grid shrink-0 place-items-center rounded-full border transition",
                  readAloudOn
                    ? "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-300/30 dark:bg-cyan-300/[0.14] dark:text-cyan-100"
                    : "border-slate-200/80 bg-white/75 text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300",
                  preset.speakerButtonClassName
                )}
              >
                <span aria-hidden="true">{readAloudOn ? "🔊" : "🔇"}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => finish("skipped")}
              className={cn(
                "focus-ring rounded-full font-bold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                preset.quietButtonClassName
              )}
            >
              {t(copy.skip)}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}
                className={cn(
                  "focus-ring rounded-full border border-slate-200/80 bg-white/75 font-bold text-slate-700 transition dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200",
                  preset.backButtonClassName
                )}
              >
                {t(copy.back)}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => (isLastStep ? finish("completed") : setStepIndex((index) => index + 1))}
              className={cn(
                "focus-ring rounded-full bg-slate-950 font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950",
                preset.nextButtonClassName
              )}
            >
              {isLastStep ? t(copy.done) : t(copy.next)}
            </button>
          </div>
        </div>
        <div aria-hidden="true" className="mt-4 flex items-center gap-1.5">
          {steps.map((step, index) => (
            <span
              key={step.id}
              className={cn(
                "h-1.5 rounded-full",
                reduceMotion ? "" : "transition-all",
                index === stepIndex ? "w-6 bg-cyan-500 dark:bg-cyan-300" : "w-1.5 bg-slate-300 dark:bg-white/20"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
