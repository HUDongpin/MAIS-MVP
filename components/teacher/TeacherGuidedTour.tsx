"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";
import type { LocalizedText } from "@/types";

export function teacherTourStorageKey(userId?: string) {
  return `mais-teacher-tour:v1:${userId ?? "guest"}`;
}

export type TeacherTourRecord = {
  status: "completed" | "skipped";
  at: string;
};

type TourStepDefinition = {
  id: string;
  anchor: string;
  title: LocalizedText;
  body: LocalizedText;
};

// Steps resolve against [data-tour="..."] anchors at open time; anchors that are
// not on the current page (e.g. dashboard sections while on a sub-page) are
// skipped so the tour works from anywhere the replay button is visible.
const tourStepDefinitions: TourStepDefinition[] = [
  {
    id: "nav",
    anchor: "nav",
    title: { en: "Everything is grouped by when you need it", zh: "依使用時機分組的導覽" },
    body: {
      en: "Today holds your daily work — grading, messages, live class. Below it: weekly planning, student data, and end-of-term records.",
      zh: "「今日」集中每天的批改、訊息與課堂；往下依序是備課教學、學生數據與校務記錄。"
    }
  },
  {
    id: "workspace-header",
    anchor: "workspace-header",
    title: { en: "Focus and search", zh: "聚焦與搜尋" },
    body: {
      en: "Pick one class to focus every page, or search students, assignments, and resources from anywhere.",
      zh: "選擇班級聚焦所有頁面，或隨時搜尋學生、作業與資源。"
    }
  },
  {
    id: "kpis",
    anchor: "kpis",
    title: { en: "Today's numbers", zh: "今日數據" },
    body: {
      en: "Green means all caught up; amber and red show where work is waiting. Click any number to jump straight to that queue.",
      zh: "綠色代表已處理完；琥珀與紅色代表仍有待辦。點擊數字直達對應佇列。"
    }
  },
  {
    id: "action-queue",
    anchor: "action-queue",
    title: { en: "What needs attention", zh: "需要跟進事項" },
    body: {
      en: "Learning risks and follow-ups gather here so nothing slips through between assignment cycles.",
      zh: "學習風險與待跟進事項集中於此，作業週期之間不再遺漏。"
    }
  },
  {
    id: "workflow",
    anchor: "workflow",
    title: { en: "Color shows where things live", zh: "顏色對應功能分區" },
    body: {
      en: "Each card's color matches its navigation group on the left, so the same hue always leads to the same place.",
      zh: "卡片顏色對應左側導覽分組，相同色調永遠代表相同區域。"
    }
  },
  {
    id: "replay",
    anchor: "tour-button",
    title: { en: "Replay anytime", zh: "隨時重看" },
    body: {
      en: "That's the console! Reopen this walkthrough from the Tour button whenever you need a refresher.",
      zh: "導覽完成！之後可隨時按「導覽」按鈕重看。"
    }
  }
];

function markTourRecord(userId: string, status: TeacherTourRecord["status"]) {
  try {
    window.localStorage.setItem(
      teacherTourStorageKey(userId),
      JSON.stringify({ status, at: new Date().toISOString() } satisfies TeacherTourRecord)
    );
  } catch {
    // Storage may be unavailable (private mode); the tour simply re-offers later.
  }
}

export function readTeacherTourRecord(raw: string | null): TeacherTourRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TeacherTourRecord;
    return parsed && (parsed.status === "completed" || parsed.status === "skipped") ? parsed : null;
  } catch {
    return null;
  }
}

const anchorPadding = 8;
const cardWidth = 344;

export function TeacherGuidedTour({
  userId,
  open,
  onClose
}: {
  userId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { text, t } = useSettings();
  const [steps, setSteps] = useState<TourStepDefinition[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const currentStep = steps[stepIndex] ?? null;

  const finish = useCallback(
    (status: TeacherTourRecord["status"]) => {
      markTourRecord(userId, status);
      onClose();
    },
    [onClose, userId]
  );

  useEffect(() => {
    if (!open) return;
    const available = tourStepDefinitions.filter((step) =>
      document.querySelector(`[data-tour="${step.anchor}"]`)
    );
    setSteps(available);
    setStepIndex(0);
    if (!available.length) onClose();
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !currentStep) return;
    const element = document.querySelector(`[data-tour="${currentStep.anchor}"]`);
    if (!element) {
      setAnchorRect(null);
      return;
    }

    element.scrollIntoView({ block: "center", behavior: "auto" });

    const measure = () => {
      const rect = element.getBoundingClientRect();
      setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    measure();

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
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
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  const placeBelow = highlight.top + highlight.height + 220 < viewportHeight;
  const cardTop = placeBelow
    ? Math.min(highlight.top + highlight.height + 14, viewportHeight - 240)
    : Math.max(14, highlight.top - 234);
  const cardLeft = Math.max(14, Math.min(highlight.left, viewportWidth - cardWidth - 14));

  return (
    <div className="fixed inset-0 z-[80]" role="presentation">
      <div
        aria-hidden="true"
        className="absolute rounded-2xl transition-all duration-300"
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
        aria-labelledby="teacher-tour-title"
        aria-describedby="teacher-tour-body"
        tabIndex={-1}
        className="glass-panel absolute p-5 shadow-xl outline-none"
        style={{ top: cardTop, left: cardLeft, width: cardWidth, maxWidth: "calc(100vw - 28px)" }}
      >
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
          {t({ en: `Step ${stepIndex + 1} of ${steps.length}`, zh: `第 ${stepIndex + 1} 步，共 ${steps.length} 步` })}
        </p>
        <h2 id="teacher-tour-title" className="mt-2 text-lg font-black text-slate-950 dark:text-white">
          {text(currentStep.title)}
        </h2>
        <p id="teacher-tour-body" aria-live="polite" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {text(currentStep.body)}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => finish("skipped")}
            className="focus-ring rounded-full px-3 py-2 text-sm font-bold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {t({ en: "Skip tour", zh: "略過導覽" })}
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}
                className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-bold text-slate-700 transition dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
              >
                {t({ en: "Back", zh: "上一步" })}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => (isLastStep ? finish("completed") : setStepIndex((index) => index + 1))}
              className="focus-ring rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
            >
              {isLastStep ? t({ en: "Done", zh: "完成" }) : t({ en: "Next", zh: "下一步" })}
            </button>
          </div>
        </div>
        <div aria-hidden="true" className="mt-4 flex items-center gap-1.5">
          {steps.map((step, index) => (
            <span
              key={step.id}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === stepIndex ? "w-6 bg-cyan-500 dark:bg-cyan-300" : "w-1.5 bg-slate-300 dark:bg-white/20"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
