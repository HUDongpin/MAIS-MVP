"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "@/components/ui/Motion";
import { useSettings } from "@/components/providers/AppProviders";
import type {
  LearnerProfileChallengeStart,
  LearnerProfileGoal,
  LearnerProfileHelpStyle,
  LearnerStartSetupAnswers,
  LocalizedText
} from "@/types";

type LearnerStartSetupDraftAnswers = Omit<LearnerStartSetupAnswers, "help"> & {
  help: LearnerProfileHelpStyle | null;
};

type LearnerProfileResponse = {
  shouldShowOnboarding?: boolean;
};

const learnerSetupPathnames = new Set(["/dashboard"]);

const learnerSetupCopy = {
  badge: { en: "15-second setup", zh: "15 秒設定", zhHans: "15 秒设置" },
  close: { en: "Close 15-second setup", zh: "關閉 15 秒設定", zhHans: "关闭 15 秒设置" },
  title: {
    en: "Choose a comfortable way to start",
    zh: "先幫你選一個舒服的開始方式",
    zhHans: "先帮你选一个舒服的开始方式"
  },
  description: {
    en: "No placement test or long questionnaire. A few taps and you can start learning.",
    zh: "不用測評，不用長問卷。點幾下，就開始學習。",
    zhHans: "不用测评，不用长问卷。点几下，就开始学习。"
  },
  autoAdjust: {
    en: "MAIS will keep adjusting from your answer patterns.",
    zh: "之後會根據答題表現自動調整。",
    zhHans: "之后会根据答题表现自动调整。"
  },
  skip: { en: "Skip and start now", zh: "跳過，直接開始", zhHans: "跳过，直接开始" },
  start: { en: "Start the first set", zh: "開始第一組題", zhHans: "开始第一组题" }
} satisfies Record<string, LocalizedText>;

const celebrationPieces = [
  { x: "11%", y: "18%", color: "#ec4899", rotate: -18, width: 12, height: 4, delay: 0 },
  { x: "16%", y: "6%", color: "#8b5cf6", rotate: -22, width: 26, height: 7, delay: 0.02 },
  { x: "28%", y: "2%", color: "#06b6d4", rotate: -12, width: 22, height: 8, delay: 0.04 },
  { x: "41%", y: "8%", color: "#f59e0b", rotate: 21, width: 10, height: 10, delay: 0.06 },
  { x: "56%", y: "5%", color: "#38bdf8", rotate: 23, width: 16, height: 6, delay: 0.08 },
  { x: "72%", y: "7%", color: "#22c55e", rotate: -28, width: 8, height: 20, delay: 0.1 },
  { x: "84%", y: "15%", color: "#f97316", rotate: 26, width: 14, height: 5, delay: 0.12 },
  { x: "91%", y: "4%", color: "#db2777", rotate: -33, width: 28, height: 10, delay: 0.14 },
  { x: "7%", y: "43%", color: "#22c55e", rotate: 23, width: 14, height: 5, delay: 0.16 },
  { x: "94%", y: "48%", color: "#06b6d4", rotate: -18, width: 11, height: 4, delay: 0.18 }
] as const;

const questions = [
  {
    id: "goal",
    number: "1",
    title: { en: "What do you want to do first today?", zh: "你今天最想做甚麼？", zhHans: "你今天最想做什么？" },
    progress: "1 / 3",
    columns: "sm:grid-cols-4",
    options: [
      { value: "repair", icon: "🎯", label: { en: "Repair weak spots", zh: "補弱點", zhHans: "补弱点" } },
      { value: "homework", icon: "📋", label: { en: "Finish homework", zh: "完成作業", zhHans: "完成作业" } },
      { value: "preview", icon: "📖", label: { en: "Preview new ideas", zh: "預習新內容", zhHans: "预习新内容" } },
      { value: "exam", icon: "⏱", label: { en: "Prepare for a quiz", zh: "準備測驗/考試", zhHans: "准备测验/考试" } }
    ] satisfies Array<{ value: LearnerProfileGoal; icon: string; label: LocalizedText }>
  },
  {
    id: "challenge",
    number: "2",
    title: { en: "How should the first set begin?", zh: "第一組題怎樣開始？", zhHans: "第一组题怎么开始？" },
    columns: "sm:grid-cols-3",
    options: [
      { value: "easy", icon: "🌱", label: { en: "Start gently", zh: "從簡單開始", zhHans: "从简单开始" } },
      { value: "balanced", icon: "📊", label: { en: "Balanced challenge", zh: "剛好有挑戰", zhHans: "刚好有挑战" } },
      { value: "hard", icon: "⛰", label: { en: "Make it harder", zh: "直接難一點", zhHans: "直接难一点" } }
    ] satisfies Array<{ value: LearnerProfileChallengeStart; icon: string; label: LocalizedText }>
  },
  {
    id: "help",
    number: "3",
    title: { en: "When you get stuck, how should MAIS help?", zh: "做錯時，你想我怎樣幫你？", zhHans: "做错时，你想我怎么帮你？" },
    columns: "sm:grid-cols-4",
    options: [
      { value: "hint", icon: "💡", label: { en: "Give a hint first", zh: "先給一點提示", zhHans: "先给一点提示" } },
      { value: "steps", icon: "▰", label: { en: "Explain step by step", zh: "一步一步講", zhHans: "一步一步讲" } },
      { value: "example", icon: "▣", label: { en: "Show a similar example", zh: "給類似例題", zhHans: "给类似例题" } },
      { value: "method", icon: "◎", label: { en: "Tell me the method", zh: "直接告訴我方法", zhHans: "直接告诉我方法" } }
    ] satisfies Array<{ value: LearnerProfileHelpStyle; icon: string; label: LocalizedText }>
  }
] as const;

function selectedValueFor(questionId: (typeof questions)[number]["id"], answers: LearnerStartSetupDraftAnswers) {
  if (questionId === "goal") return answers.goal;
  if (questionId === "challenge") return answers.challenge;
  return answers.help;
}

function optionClassName(selected: boolean, tone: "blue" | "green") {
  const selectedClassName = tone === "green"
    ? "border-emerald-400 bg-emerald-50/75 text-emerald-700 shadow-[0_14px_32px_rgba(16,185,129,0.16)]"
    : "border-blue-500 bg-blue-50/75 text-blue-700 shadow-[0_14px_32px_rgba(37,99,235,0.16)]";

  return [
    "focus-ring group relative grid min-h-[5.55rem] place-items-center gap-2 rounded-[1.05rem] border px-3 py-3 text-center font-black transition",
    "active:translate-y-[1px] sm:min-h-[5.75rem]",
    selected
      ? selectedClassName
      : "border-slate-200 bg-white/75 text-slate-700 shadow-[0_14px_36px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white"
  ].join(" ");
}

export function LearnerStartSetupGate() {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { currentUser, settingsReady, t } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dismissedForSession, setDismissedForSession] = useState(false);
  const [answers, setAnswers] = useState<LearnerStartSetupDraftAnswers>({
    goal: "repair",
    challenge: "balanced",
    help: null
  });

  const shouldAllowLearnerSetupPath = learnerSetupPathnames.has(pathname);
  const shouldShowForUser = Boolean(
    settingsReady &&
    currentUser?.role === "student" &&
    !currentUser.passwordMustChange &&
    shouldAllowLearnerSetupPath
  );

  const currentUserId = currentUser?.id;

  useEffect(() => {
    setDismissedForSession(false);
  }, [currentUserId]);

  useEffect(() => {
    if (!shouldShowForUser || !currentUserId || dismissedForSession) {
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    let openTimer: number | undefined;

    setIsOpen(false);

    fetch("/api/me/learner-profile", {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Learner profile request failed: ${response.status}`);
        return await response.json() as LearnerProfileResponse;
      })
      .then((body) => {
        if (body.shouldShowOnboarding === true) {
          openTimer = window.setTimeout(() => setIsOpen(true), 260);
        } else {
          setIsOpen(false);
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.warn("Learner profile onboarding gate is unavailable.", error);
        setIsOpen(false);
      });

    return () => {
      controller.abort();
      if (openTimer) window.clearTimeout(openTimer);
    };
  }, [currentUserId, dismissedForSession, shouldShowForUser]);

  const persistAndClose = useCallback(async (status: "completed" | "skipped") => {
    if (!currentUserId) return;

    const normalizedAnswers: LearnerStartSetupAnswers = {
      goal: answers.goal,
      challenge: answers.challenge,
      help: answers.help ?? "hint"
    };

    setDismissedForSession(true);
    setIsOpen(false);
    setIsSaving(true);

    try {
      const response = await fetch("/api/me/learner-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status,
          answers: normalizedAnswers
        })
      });

      if (!response.ok) throw new Error(`Learner profile save failed: ${response.status}`);
    } catch (error) {
      console.warn("Learner profile onboarding answer save failed.", error);
    } finally {
      setIsSaving(false);
    }
  }, [answers, currentUserId]);

  const handleSkip = useCallback(() => {
    void persistAndClose("skipped");
  }, [persistAndClose]);

  const handleStart = useCallback(() => {
    void persistAndClose("completed");
    if (!pathname.startsWith("/practice")) router.push("/practice");
  }, [pathname, persistAndClose, router]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleSkip();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSkip, isOpen]);

  const questionPanels = useMemo(() => questions, []);

  if (!isOpen || !shouldShowForUser || !currentUserId) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-[150] w-[100dvw] max-w-full overflow-x-hidden overflow-y-auto bg-slate-950/[0.76] px-3 py-9 text-slate-950 backdrop-blur-md sm:px-6">
      <div className="pointer-events-none fixed inset-y-0 left-0 w-[100dvw] max-w-full overflow-hidden" aria-hidden="true">
        <div className="absolute left-[10%] top-[78%] h-28 w-[80%] rounded-[50%] border border-cyan-300/35 shadow-[0_0_42px_rgba(34,211,238,0.32)]" />
        <div className="absolute left-[16%] top-[79%] h-20 w-[68%] rounded-[50%] border border-violet-400/30 shadow-[0_0_44px_rgba(139,92,246,0.26)]" />
        <div className="absolute left-1/2 top-8 h-36 w-36 -translate-x-1/2 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="absolute right-[10%] top-12 h-44 w-44 rounded-full bg-fuchsia-500/12 blur-3xl" />
        <div className="absolute left-[6%] top-20 text-7xl font-black text-white/5">Σ</div>
        <div className="absolute right-[8%] top-[34%] text-8xl font-black text-cyan-200/10">√</div>
        <div className="absolute left-[12%] bottom-[28%] rotate-[-18deg] rounded-3xl border border-cyan-300/15 px-8 py-5 text-5xl font-black text-cyan-200/10">π</div>
        {[0, 1, 2].map((ring) => (
          <motion.span
            key={ring}
            className="absolute left-1/2 top-[8.5rem] h-20 w-20 -translate-x-1/2 rounded-full border-4 border-cyan-300/50 shadow-[0_0_42px_rgba(34,211,238,0.32)]"
            initial={reduceMotion ? false : { opacity: 0.72, scale: 0.12 }}
            animate={reduceMotion ? undefined : { opacity: [0.72, 0.28, 0], scale: [0.12, 1.6 + ring * 0.35, 2.3 + ring * 0.42] }}
            transition={{ duration: 1.45, delay: ring * 0.16, ease: "easeOut", repeat: Infinity, repeatDelay: 2.8 }}
          />
        ))}
        {celebrationPieces.map((piece, index) => (
          <motion.span
            key={`${piece.x}-${piece.y}`}
            className="absolute rounded-[3px] shadow-lg shadow-slate-950/15"
            style={{
              left: piece.x,
              top: piece.y,
              width: piece.width,
              height: piece.height,
              backgroundColor: piece.color
            }}
            initial={reduceMotion ? false : { opacity: 0, y: -10, rotate: piece.rotate }}
            animate={reduceMotion ? undefined : { opacity: [0.15, 0.9, 0.45], y: [0, 18 + index * 1.5, 30 + index], rotate: piece.rotate + 36 }}
            transition={{ duration: 2.6, delay: piece.delay, repeat: Infinity, repeatType: "mirror" }}
          />
        ))}
      </div>

      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="learner-start-title"
        aria-describedby="learner-start-description"
        className="relative mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-[calc(100dvw-1.5rem)] items-center sm:max-w-[63rem]"
        initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.975 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <div className="relative w-full overflow-hidden rounded-[1.85rem] border border-white/80 bg-white/[0.96] px-4 pb-5 pt-7 shadow-[0_28px_90px_rgba(15,23,42,0.42)] backdrop-blur-2xl sm:px-10 sm:pb-5 sm:pt-8">
          <div className="pointer-events-none absolute inset-x-12 top-0 h-28 rounded-full bg-gradient-to-b from-blue-200/[0.45] via-white/[0.3] to-transparent blur-2xl" aria-hidden="true" />
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSaving}
            aria-label={t(learnerSetupCopy.close)}
            className="focus-ring absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-slate-50 text-2xl font-light leading-none text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            ×
          </button>

          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-black text-orange-600 shadow-[0_8px_22px_rgba(245,158,11,0.16)]">
              <span aria-hidden="true" className="text-2xl leading-none">⭐</span>
              <span>{t(learnerSetupCopy.badge)}</span>
              <span aria-hidden="true" className="text-xl leading-none">✦</span>
            </div>
            <h2 id="learner-start-title" className="mx-auto mt-4 max-w-3xl break-words bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 bg-clip-text text-3xl font-black leading-tight text-transparent [overflow-wrap:anywhere] sm:text-5xl">
              {t(learnerSetupCopy.title)}
            </h2>
            <p id="learner-start-description" className="mt-3 break-words text-base font-semibold text-slate-500 [overflow-wrap:anywhere] sm:text-lg">
              {t(learnerSetupCopy.description)}
            </p>
          </div>

          <div className="relative mt-5 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white/[0.82] shadow-[0_16px_44px_rgba(15,23,42,0.10)]">
            {questionPanels.map((question, questionIndex) => {
              const selectedValue = selectedValueFor(question.id, answers);
              const tone = question.id === "challenge" ? "green" : "blue";

              return (
                <section
                  key={question.id}
                  className={[
                    "relative px-5 py-3.5 sm:px-6",
                    questionIndex > 0 ? "border-t border-slate-200/85" : ""
                  ].join(" ")}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xl font-black text-blue-700 shadow-inner shadow-blue-100">
                        {question.number}
                      </span>
                      <h3 className="text-lg font-black text-slate-950">{t(question.title)}</h3>
                    </div>
                    {"progress" in question ? (
                      <span className="rounded-full bg-blue-100 px-4 py-2 text-lg font-black text-blue-600">
                        {question.progress}
                      </span>
                    ) : null}
                  </div>
                  <div className={`grid gap-3 ${question.columns}`}>
                    {question.options.map((option) => {
                      const selected = selectedValue === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            if (question.id === "goal") {
                              setAnswers((current) => ({ ...current, goal: option.value as LearnerProfileGoal }));
                            } else if (question.id === "challenge") {
                              setAnswers((current) => ({ ...current, challenge: option.value as LearnerProfileChallengeStart }));
                            } else {
                              setAnswers((current) => ({ ...current, help: option.value as LearnerProfileHelpStyle }));
                            }
                          }}
                          disabled={isSaving}
                          className={optionClassName(selected, tone)}
                          aria-pressed={selected}
                        >
                          <span className="text-4xl leading-none drop-shadow-sm" aria-hidden="true">{option.icon}</span>
                          <span className="text-base leading-tight">{t(option.label)}</span>
                          {selected ? (
                            <span className={[
                              "absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full text-base text-white shadow-lg",
                              tone === "green" ? "bg-emerald-500 shadow-emerald-600/20" : "bg-blue-500 shadow-blue-600/20"
                            ].join(" ")} aria-hidden="true">
                              ✓
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="relative mt-3 flex items-center justify-center gap-2 border-b border-slate-200 pb-4 text-sm font-semibold text-slate-500">
            <span className="text-lg text-slate-400" aria-hidden="true">✦</span>
            <span>{t(learnerSetupCopy.autoAdjust)}</span>
          </div>

          <div className="relative mt-5 grid items-center gap-4 sm:grid-cols-[minmax(10rem,0.75fr)_auto_minmax(18rem,1.1fr)]">
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSaving}
              className="focus-ring h-14 rounded-[0.85rem] border border-slate-200 bg-white px-6 text-base font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-65"
            >
              {t(learnerSetupCopy.skip)}
            </button>

            <div className="flex justify-center gap-4" aria-hidden="true">
              <span className="h-4 w-4 rounded-full bg-blue-600 shadow-[0_0_14px_rgba(37,99,235,0.35)]" />
              <span className="h-3.5 w-3.5 rounded-full bg-slate-300" />
              <span className="h-3.5 w-3.5 rounded-full bg-slate-300" />
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={isSaving}
              className="focus-ring inline-flex h-16 items-center justify-center gap-3 rounded-[1rem] bg-gradient-to-r from-blue-500 via-blue-600 to-violet-600 px-8 text-xl font-black text-white shadow-[0_18px_38px_rgba(37,99,235,0.34)] transition hover:-translate-y-0.5 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-75"
            >
              <span>{t(learnerSetupCopy.start)}</span>
              <span aria-hidden="true" className="text-3xl leading-none">›</span>
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
