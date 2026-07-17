"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSettings } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";
import type { AITutorOpenOptions, TutorContext } from "@/components/ai/AITutorProvider";
import type { NovaLensAction, NovaLensRunRequest, NovaLensRunResponse, NovaLensSurface, StudentSession } from "@/types";

type NovaLensSelection = {
  selectedText: string;
  left: number;
  top: number;
  placement: "above" | "below";
  surface: NovaLensSurface;
  context: NonNullable<NovaLensRunRequest["context"]>;
};

type NovaLensGlobalOverlayProps = {
  onOpenTutor: (context?: TutorContext, options?: AITutorOpenOptions) => void;
};

const novaLensSelectionMaxLength = 1800;
const novaLensSurroundingMaxLength = 900;
const novaLensPopoverWidth = 336;
const novaLensDisabledStorageKey = "mais:nova-lens-disabled";
const novaLensPreferenceChangedEventName = "mais:nova-lens-preference-change";
const studentActions: NovaLensAction[] = ["explain", "simple-example", "why-step", "prerequisite-gap", "quick-check"];
const teacherActions: NovaLensAction[] = ["explain", "teaching-support", "risk-audit", "rewrite-follow-up"];
const parentActions: NovaLensAction[] = ["explain", "family-support", "simple-example"];

function readNovaLensDisabledPreference() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(novaLensDisabledStorageKey) === "true";
  } catch {
    return false;
  }
}

function compactSelectionText(value: string, maxLength = novaLensSelectionMaxLength) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function elementFromSelectionNode(node: Node | null) {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
}

function isIgnoredSelectionNode(node: Node | null) {
  const element = elementFromSelectionNode(node);
  if (!element) return false;

  const ignoredContainer = element.closest("[data-nova-lens-ignore='true'], [data-ai-tutor-panel='true']");
  if (ignoredContainer) {
    return true;
  }

  const selectable = element.closest("[data-ai-selectable]");
  const textInput = element.closest("input, textarea, select, option, [contenteditable='true']");
  if (textInput) return true;

  const interactive = element.closest("button, [role='button']");
  return Boolean(interactive && (!selectable || !selectable.contains(interactive)));
}

function closestSelectable(node: Node | null, root: HTMLElement) {
  const element = elementFromSelectionNode(node);
  const selectable = element?.closest<HTMLElement>("[data-ai-selectable]");
  return selectable && root.contains(selectable) ? selectable : null;
}

function nearestContextContainer(node: Node | null, root: HTMLElement) {
  const element = elementFromSelectionNode(node);
  return element?.closest<HTMLElement>("article, section, aside, li, main") ?? root;
}

function headingFor(container: HTMLElement) {
  const heading = container.querySelector<HTMLElement>("h1, h2, h3, [data-ai-title]");
  return compactSelectionText(heading?.textContent ?? "", 180);
}

function surfaceForPath(pathname: string): NovaLensSurface {
  if (pathname.startsWith("/lesson") || pathname.startsWith("/student/lessons")) return "lesson";
  if (pathname.startsWith("/practice") || pathname.startsWith("/mistake-book")) return "practice";
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/progress")) return "dashboard";
  if (pathname.startsWith("/learning-path") || pathname.startsWith("/primary-roadmap") || pathname.startsWith("/secondary-roadmap")) return "roadmap";
  if (pathname.startsWith("/visualization-lab")) return "visualization";
  if (pathname.startsWith("/teacher")) return "teacher-console";
  if (pathname.startsWith("/parent")) return "parent-console";
  if (pathname.startsWith("/admin")) return "admin-console";
  return "general";
}

function contextForSelection({
  node,
  root,
  selectedText
}: {
  node: Node | null;
  root: HTMLElement;
  selectedText: string;
}): NonNullable<NovaLensRunRequest["context"]> {
  const selectable = closestSelectable(node, root);
  const container = selectable ?? nearestContextContainer(node, root);
  const surroundingText = compactSelectionText(container.textContent ?? selectedText, novaLensSurroundingMaxLength);
  const title = selectable?.dataset.aiTitle || headingFor(container);
  const questionId = selectable?.dataset.aiQuestionId || container.dataset.questionId || "";

  return {
    ...(title ? { title } : {}),
    ...(surroundingText ? { surroundingText } : {}),
    ...(selectable?.dataset.aiTopicId ? { topicId: selectable.dataset.aiTopicId } : {}),
    ...(questionId ? { questionId } : {}),
    ...(selectable?.dataset.aiLessonSlug ? { lessonSlug: selectable.dataset.aiLessonSlug } : {}),
    ...(selectable?.dataset.aiBlockId ? { blockId: selectable.dataset.aiBlockId } : {}),
    ...(selectable?.dataset.aiBlockType ? { blockType: selectable.dataset.aiBlockType } : {})
  };
}

function actionsForRole(role: StudentSession["role"] | undefined) {
  if (role === "teacher" || role === "admin") return teacherActions;
  if (role === "parent") return parentActions;
  return studentActions;
}

function actionLabel(action: NovaLensAction) {
  const labels: Record<NovaLensAction, { en: string; zh: string; zhHans: string }> = {
    explain: { en: "Explain", zh: "解釋這段", zhHans: "解释这段" },
    "simple-example": { en: "Simple example", zh: "簡單例子", zhHans: "简单例子" },
    "why-step": { en: "Why step?", zh: "為何成立", zhHans: "为何成立" },
    "prerequisite-gap": { en: "Find gap", zh: "找前置缺口", zhHans: "找前置缺口" },
    "quick-check": { en: "Quick check", zh: "小檢查", zhHans: "小检查" },
    "teaching-support": { en: "Teaching move", zh: "教學支援", zhHans: "教学支援" },
    "risk-audit": { en: "Risk audit", zh: "風險審計", zhHans: "风险审计" },
    "rewrite-follow-up": { en: "Rewrite follow-up", zh: "改寫跟進", zhHans: "改写跟进" },
    "family-support": { en: "Family support", zh: "家庭支援", zhHans: "家庭支持" },
    custom: { en: "Custom", zh: "自訂", zhHans: "自定义" }
  };
  return labels[action];
}

function visiblePrompt(selection: NovaLensSelection, action: NovaLensAction, customQuestion?: string, redactSelection = false) {
  const custom = customQuestion?.trim();
  const selectedText = redactSelection ? "[redacted by AI Tutor policy]" : selection.selectedText;
  if (custom) return `${custom}\n\nAI Tutor selected text: ${selectedText}`;
  return `AI Tutor selected text: ${selectedText}\nAction: ${action}`;
}

function readNovaLensResponse(value: unknown): NovaLensRunResponse | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Partial<NovaLensRunResponse>;
  if (typeof record.reply !== "string" || !record.reply.trim()) return null;
  return {
    mode: record.mode === "registration-required" ? "registration-required" : "nova-lens",
    status: record.status ?? "error",
    reply: record.reply,
    ...(typeof record.runId === "string" ? { runId: record.runId } : {}),
    ...(Array.isArray(record.policyFlags) ? { policyFlags: record.policyFlags } : {}),
    ...(record.context ? { context: record.context } : {})
  };
}

function shouldRedactSelectionEcho(response: NovaLensRunResponse) {
  return response.status === "blocked" || response.policyFlags?.some((flag) => (
    flag === "sensitive-selection" ||
    flag.startsWith("blocked-pattern:")
  ));
}

function toTutorContext(
  context: NovaLensRunResponse["context"] | undefined,
  fallbackTitle: string,
  options: { redactSelection?: boolean } = {}
): TutorContext | undefined {
  if (!context) {
    return {
      mode: "general",
      title: fallbackTitle
    };
  }

  return {
    mode: context.mode,
    title: context.title,
    details: options.redactSelection ? "AI Tutor stopped this run under the active governance policy." : context.details,
    topicId: context.topicId,
    questionId: context.questionId,
    lessonSlug: context.lessonSlug,
    dataScopes: context.dataScopes,
    selection: options.redactSelection ? undefined : context.selection
  };
}

export function NovaLensGlobalOverlay({ onOpenTutor }: NovaLensGlobalOverlayProps) {
  const pathname = usePathname();
  const { currentUser, language, selectedGrade, t } = useSettings();
  const [selection, setSelection] = useState<NovaLensSelection | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [novaLensDisabled, setNovaLensDisabled] = useState(false);
  const selectionTimerRef = useRef<number | null>(null);
  const actions = useMemo(() => actionsForRole(currentUser?.role), [currentUser?.role]);

  useEffect(() => {
    setNovaLensDisabled(readNovaLensDisabledPreference());

    function handleStorage(event: StorageEvent) {
      if (event.key === novaLensDisabledStorageKey) {
        setNovaLensDisabled(readNovaLensDisabledPreference());
      }
    }

    function handlePreferenceChange(event: Event) {
      const disabled = (event as CustomEvent<{ disabled?: unknown }>).detail?.disabled;
      setNovaLensDisabled(typeof disabled === "boolean" ? disabled : readNovaLensDisabledPreference());
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(novaLensPreferenceChangedEventName, handlePreferenceChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(novaLensPreferenceChangedEventName, handlePreferenceChange);
    };
  }, []);

  useEffect(() => {
    if (novaLensDisabled) {
      window.getSelection()?.removeAllRanges();
      setSelection(null);
      setCustomInput("");
      return;
    }

    function activeElementIsNovaLens() {
      return Boolean(document.activeElement?.closest("[data-nova-lens-ignore='true']"));
    }

    function closeSelection() {
      if (activeElementIsNovaLens()) return;
      setSelection(null);
      setCustomInput("");
    }

    function updateSelection() {
      const root = document.querySelector<HTMLElement>("main");
      const browserSelection = window.getSelection();
      if (!root || !browserSelection || browserSelection.rangeCount === 0) {
        closeSelection();
        return;
      }
      if (activeElementIsNovaLens()) return;

      const selectedText = compactSelectionText(browserSelection.toString());
      if (!selectedText) {
        setSelection(null);
        return;
      }

      const range = browserSelection.getRangeAt(0);
      if (
        !root.contains(range.commonAncestorContainer) ||
        isIgnoredSelectionNode(browserSelection.anchorNode) ||
        isIgnoredSelectionNode(browserSelection.focusNode)
      ) {
        setSelection(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      if ((!rect.width && !rect.height) || rect.bottom < 0 || rect.top > window.innerHeight) {
        setSelection(null);
        return;
      }

      const availableWidth = Math.max(12, window.innerWidth - novaLensPopoverWidth - 12);
      const left = clamp(rect.left + rect.width / 2 - novaLensPopoverWidth / 2, 12, availableWidth);
      const placement: NovaLensSelection["placement"] = rect.top > 300 ? "above" : "below";
      const top = placement === "above"
        ? Math.max(12, rect.top - 12)
        : Math.min(window.innerHeight - 24, rect.bottom + 12);

      setSelection({
        selectedText,
        left,
        top,
        placement,
        surface: surfaceForPath(pathname),
        context: contextForSelection({ node: browserSelection.anchorNode, root, selectedText })
      });
    }

    function scheduleSelectionUpdate() {
      if (selectionTimerRef.current !== null) window.clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = window.setTimeout(updateSelection, 0);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        window.getSelection()?.removeAllRanges();
        setSelection(null);
        setCustomInput("");
        return;
      }

      if (["PageDown", "PageUp", "Home", "End", "ArrowDown", "ArrowUp"].includes(event.key)) {
        closeSelection();
      }
    }

    document.addEventListener("selectionchange", scheduleSelectionUpdate);
    window.addEventListener("pointerup", scheduleSelectionUpdate);
    window.addEventListener("keyup", scheduleSelectionUpdate);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeSelection);
    window.addEventListener("wheel", closeSelection, { passive: true });
    window.addEventListener("touchmove", closeSelection, { passive: true });
    scheduleSelectionUpdate();
    window.requestAnimationFrame(scheduleSelectionUpdate);

    return () => {
      if (selectionTimerRef.current !== null) window.clearTimeout(selectionTimerRef.current);
      document.removeEventListener("selectionchange", scheduleSelectionUpdate);
      window.removeEventListener("pointerup", scheduleSelectionUpdate);
      window.removeEventListener("keyup", scheduleSelectionUpdate);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeSelection);
      window.removeEventListener("wheel", closeSelection);
      window.removeEventListener("touchmove", closeSelection);
    };
  }, [novaLensDisabled, pathname]);

  async function runNovaLens(action: NovaLensAction, customQuestion?: string) {
    if (!selection || isRunning) return;
    setIsRunning(true);
    const prompt = visiblePrompt(selection, action, customQuestion);

    try {
      const response = await fetch("/api/nova-lens/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          selectedText: selection.selectedText,
          action,
          surface: selection.surface,
          page: pathname,
          customQuestion,
          context: selection.context,
          grade: selectedGrade,
          language
        }),
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = readNovaLensResponse(await response.json().catch(() => null));
      if (!response.ok || !payload) throw new Error("AI Tutor request failed.");
      const redactSelection = shouldRedactSelectionEcho(payload);
      const tutorContext = toTutorContext(
        payload.context,
        t({ en: "AI Tutor", zh: "AI Tutor", zhHans: "AI Tutor" }),
        { redactSelection }
      );
      const options: AITutorOpenOptions = {
        initialInput: visiblePrompt(selection, action, customQuestion, redactSelection),
        initialReply: payload.reply,
        novaLensRunId: payload.runId,
        novaLensStatus: payload.status
      };
      onOpenTutor(tutorContext, options);
    } catch {
      onOpenTutor(
        {
          mode: "general",
          title: t({ en: "AI Tutor", zh: "AI Tutor", zhHans: "AI Tutor" })
        },
        {
          initialInput: prompt,
          initialReply: t({
            en: "AI Tutor could not complete this agent run. Please try again with a shorter math excerpt.",
            zh: "AI Tutor 暫時未能完成這次 agent run。請改選較短的數學文字再試。",
            zhHans: "AI Tutor 暂时未能完成这次 agent run。请改选较短的数学文字再试。"
          }),
          novaLensStatus: "error"
        }
      );
    } finally {
      window.getSelection()?.removeAllRanges();
      setSelection(null);
      setCustomInput("");
      setIsRunning(false);
    }
  }

  function submitCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = customInput.trim();
    if (trimmed) void runNovaLens("custom", trimmed);
  }

  if (!selection) return null;

  return (
    <div
      data-testid="lesson-ai-selection-popover"
      data-nova-lens-ignore="true"
      role="dialog"
      aria-label={t({ en: "AI Tutor selected text agent", zh: "AI Tutor 選取文字代理", zhHans: "AI Tutor 选取文字代理" })}
      className="fixed z-[95] w-[min(21rem,calc(100vw-1.5rem))] rounded-[1.35rem] border border-cyan-200/80 bg-white p-3 shadow-2xl shadow-slate-950/20 dark:border-cyan-300/20 dark:bg-slate-950"
      onPointerDown={(event) => {
        if (event.target instanceof HTMLTextAreaElement) return;
        event.preventDefault();
      }}
      style={{
        left: selection.left,
        top: selection.top,
        transform: selection.placement === "above" ? "translateY(-100%)" : undefined
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-200">
            {t({ en: "AI Tutor", zh: "AI Tutor", zhHans: "AI Tutor" })}
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            "{selection.selectedText}"
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            window.getSelection()?.removeAllRanges();
            setSelection(null);
            setCustomInput("");
          }}
          aria-label={t({ en: "Close AI Tutor", zh: "關閉 AI Tutor", zhHans: "关闭 AI Tutor" })}
          className="focus-ring shrink-0 rounded-full px-2 py-1 text-sm font-black text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          x
        </button>
      </div>

      <div className={cn("mt-3 grid gap-2", actions.length > 3 ? "grid-cols-2" : "grid-cols-1")}>
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            data-testid={`lesson-ai-help-${action}`}
            onClick={() => void runNovaLens(action)}
            disabled={isRunning}
            className="focus-ring min-h-10 rounded-2xl border border-cyan-200/75 bg-cyan-50 px-3 py-2 text-left text-xs font-black text-cyan-800 transition hover:-translate-y-0.5 hover:border-fuchsia-200 hover:bg-fuchsia-50 disabled:cursor-wait disabled:opacity-60 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-50 dark:hover:border-fuchsia-200/35 dark:hover:bg-fuchsia-400/10"
          >
            {t(actionLabel(action))}
          </button>
        ))}
      </div>

      <form className="mt-3" onSubmit={submitCustom}>
        <label htmlFor="nova-lens-custom-input" className="sr-only">
          {t({ en: "Ask a custom AI Tutor question", zh: "自訂 AI Tutor 問題", zhHans: "自定义 AI Tutor 问题" })}
        </label>
        <textarea
          id="nova-lens-custom-input"
          value={customInput}
          rows={2}
          onChange={(event) => setCustomInput(event.target.value)}
          placeholder={t({ en: "Ask AI Tutor a custom question...", zh: "向 AI Tutor 自訂提問...", zhHans: "向 AI Tutor 自定义提问..." })}
          className="focus-ring w-full resize-none rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
        />
        <button
          type="submit"
          disabled={!customInput.trim() || isRunning}
          className="focus-ring mt-2 w-full rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
        >
          {isRunning
            ? t({ en: "Running AI Tutor", zh: "AI Tutor 執行中", zhHans: "AI Tutor 执行中" })
            : t({ en: "Run custom agent", zh: "執行自訂 agent", zhHans: "执行自定义 agent" })}
        </button>
      </form>
    </div>
  );
}
