"use client";

import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";

const missionSteps = [
  { label: "1", state: "active", className: "left-[19%] top-[54%]" },
  { label: "2", state: "locked", className: "left-[34%] top-[51%]" },
  { label: "3", state: "locked", className: "left-[49%] top-[50%]" },
  { label: "4", state: "locked", className: "left-[63%] top-[51%]" },
  { label: "5", state: "locked", className: "left-[76%] top-[50%]" }
] as const;

const orbitLocks = [
  "left-[8%] top-[42%]",
  "left-[15%] top-[78%]",
  "left-[92%] top-[42%]",
  "left-[85%] top-[78%]"
];

function TargetIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="size-6">
      <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="5.4" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M16 16 25 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
      <path d="M22 7h4v4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
    </svg>
  );
}

function LockIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path d="M8 10V8a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <rect x="6" y="10" width="12" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function StartPad() {
  const { t } = useSettings();

  return (
    <div className="absolute left-[8%] top-[61%] -translate-x-1/2 -translate-y-1/2 text-center">
      <span className="relative mb-4 inline-flex rounded-xl border border-white bg-cyan-600 px-4 py-2 text-sm font-black text-white shadow-[0_10px_20px_rgba(8,145,178,0.28)] after:absolute after:left-1/2 after:top-full after:size-3 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:border-b after:border-r after:border-white after:bg-cyan-600 after:content-['']">
        {t({ en: "Start", zh: "開始", zhHans: "开始" })}
      </span>
      <span className="relative mx-auto grid size-36 place-items-center rounded-full">
        <span aria-hidden="true" className="absolute -inset-5 rounded-full bg-cyan-200/45 blur-2xl" />
        <span aria-hidden="true" className="absolute inset-0 rounded-full bg-gradient-to-b from-white to-slate-200 shadow-[0_18px_24px_rgba(15,23,42,0.18),inset_0_4px_0_rgba(255,255,255,0.95)]" />
        <span aria-hidden="true" className="absolute inset-3 rounded-full bg-gradient-to-b from-emerald-50 via-white to-cyan-100 shadow-[inset_0_8px_16px_rgba(14,165,233,0.18)]" />
        <span aria-hidden="true" className="absolute inset-7 rounded-full border-[10px] border-cyan-100/90 bg-white/65 shadow-[inset_0_3px_6px_rgba(15,23,42,0.07)]" />
        <span className="relative z-10 grid size-16 place-items-center rounded-full bg-gradient-to-br from-cyan-100 to-emerald-100 text-teal-500 shadow-[0_10px_18px_rgba(20,184,166,0.22),inset_0_3px_8px_rgba(255,255,255,0.9)]">
          <svg aria-hidden="true" viewBox="0 0 48 48" className="size-10">
            <path d="M18 38V12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
            <path d="M20 15c8-7 14-2 20-6v17c-7 3-13-2-20 5Z" fill="currentColor" opacity="0.84" />
            <circle cx="18" cy="12" r="3" fill="currentColor" />
          </svg>
        </span>
      </span>
    </div>
  );
}

function FinishPad() {
  const { t } = useSettings();

  return (
    <div className="absolute left-[92%] top-[59%] -translate-x-1/2 -translate-y-1/2 text-center">
      <span className="relative mb-4 inline-flex max-w-40 rounded-xl border border-white bg-cyan-600 px-4 py-2 text-sm font-black leading-tight text-white shadow-[0_10px_20px_rgba(8,145,178,0.28)] after:absolute after:left-1/2 after:top-full after:size-3 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:border-b after:border-r after:border-white after:bg-cyan-600 after:content-['']">
        {t({ en: "Unlock Free Practice", zh: "解鎖自由練習", zhHans: "解锁自由练习" })}
      </span>
      <span className="relative mx-auto grid size-36 place-items-center rounded-full">
        <span aria-hidden="true" className="absolute -inset-6 rounded-full bg-emerald-200/55 blur-2xl" />
        <span aria-hidden="true" className="absolute inset-0 rounded-full bg-gradient-to-b from-white to-slate-200 shadow-[0_20px_28px_rgba(15,23,42,0.2),inset_0_4px_0_rgba(255,255,255,0.95)]" />
        <span aria-hidden="true" className="absolute inset-4 rounded-full bg-gradient-to-b from-emerald-50 via-white to-cyan-100 shadow-[inset_0_8px_16px_rgba(20,184,166,0.18)]" />
        <span className="relative z-10 size-16 rotate-45 rounded-md bg-gradient-to-br from-emerald-200 via-teal-400 to-cyan-500 shadow-[0_0_34px_rgba(20,184,166,0.55),0_16px_20px_rgba(15,118,110,0.22)]">
          <span className="absolute inset-2 border border-white/60" />
        </span>
      </span>
    </div>
  );
}

function ProgressDial() {
  const { t } = useSettings();

  return (
    <aside
      role="progressbar"
      aria-label={t({ en: "Personalized set progress", zh: "適性練習進度", zhHans: "适性练习进度" })}
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={0}
      className="relative mx-auto w-full max-w-[14.5rem] self-center sm:max-w-[18rem] lg:mx-0 lg:translate-y-5 lg:justify-self-end"
    >
      <div className="relative mx-auto aspect-square w-full max-w-[13.5rem] sm:max-w-[17rem]">
        <div aria-hidden="true" className="absolute inset-[1%] rounded-full border-2 border-dashed border-emerald-300/80 dark:border-emerald-300/35" />
        <div aria-hidden="true" className="absolute inset-[13%] rounded-full bg-[conic-gradient(from_-28deg,#0ea5e9_65deg,rgba(203,213,225,0.78)_0deg)] p-[10px] shadow-[0_0_30px_rgba(14,165,233,0.18)]">
          <div className="grid size-full place-items-center rounded-full border border-white/90 bg-white/[0.96] text-center text-slate-950 shadow-inner shadow-sky-900/10 dark:border-white/10 dark:bg-slate-950/[0.94] dark:text-white">
            <div>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">{t({ en: "Round progress", zh: "本輪進度", zhHans: "本轮进度" })}</p>
              <p className="mt-2 text-6xl font-black leading-none">
                <span className="text-cyan-500">0</span>/5
              </p>
              <p className="mt-2 text-sm font-black text-slate-700 dark:text-slate-200">{t({ en: "required", zh: "必做題", zhHans: "必做题" })}</p>
            </div>
          </div>
        </div>
        <span className="absolute left-1/2 top-[3%] z-10 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cyan-200 bg-white text-sm font-black text-cyan-600 shadow-lg dark:border-cyan-200/25 dark:bg-slate-900">1</span>
        {orbitLocks.map((position) => (
          <span key={position} className={cn("absolute z-10 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cyan-100 bg-white text-cyan-300 shadow-lg dark:border-cyan-200/25 dark:bg-slate-900", position)}>
            <LockIcon />
          </span>
        ))}
      </div>
    </aside>
  );
}

function MissionMap() {
  const { t } = useSettings();

  return (
    <div className="relative mt-7 overflow-hidden rounded-[1.45rem] border border-cyan-200/95 bg-cyan-50 shadow-[0_18px_44px_rgba(8,145,178,0.15)] dark:border-cyan-200/15 dark:bg-cyan-950/30">
      <div className="overflow-x-auto">
        <div className="relative h-[25.75rem] min-w-[60rem] overflow-hidden lg:min-w-0">
          <img
            src="/practice/adaptive-mission/map-base@2x.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover"
            draggable={false}
          />
          <StartPad />
          {missionSteps.map((step) => (
            <div key={step.label} className={cn("absolute z-10 w-32 -translate-x-1/2 -translate-y-1/2 text-center", step.className)}>
              {step.state === "active" ? (
                <>
                  <span aria-hidden="true" className="absolute left-1/2 top-[5.9rem] z-0 h-8 w-24 -translate-x-1/2 rounded-full bg-slate-900/20 blur-[1px]" />
                  <span className="relative z-20 mx-auto grid h-[7.25rem] w-[5.5rem] place-items-center rounded-[2rem] border border-white bg-gradient-to-br from-cyan-200 via-cyan-400 to-sky-600 text-4xl font-black text-white shadow-[inset_5px_5px_9px_rgba(255,255,255,0.9),inset_-10px_-14px_18px_rgba(15,23,42,0.14),0_18px_24px_rgba(15,23,42,0.24)] ring-4 ring-cyan-100 after:absolute after:-bottom-3 after:left-1/2 after:size-8 after:-translate-x-1/2 after:rotate-45 after:rounded-[0.45rem] after:border-b after:border-r after:border-white after:bg-cyan-400 after:shadow-[7px_7px_14px_rgba(15,23,42,0.14)] after:content-['']">
                    <span className="relative z-10">{step.label}</span>
                  </span>
                  <span className="relative z-30 mt-5 inline-flex rounded-lg border border-cyan-200 bg-cyan-600 px-3 py-1.5 text-xs font-black text-white shadow-[0_8px_14px_rgba(15,23,42,0.14)]">
                    {t({ en: "In progress", zh: "進行中", zhHans: "进行中" })}
                  </span>
                </>
              ) : (
                <>
                  <span className="relative z-20 mx-auto block h-[8.75rem] w-[5.25rem]">
                    <img
                      src="/practice/adaptive-mission/checkpoint-locked-gpt-image2.png"
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 size-full object-contain drop-shadow-[0_16px_16px_rgba(15,23,42,0.18)]"
                      draggable={false}
                    />
                    <span className="absolute left-1/2 top-[34%] z-10 -translate-x-1/2 -translate-y-1/2 text-[2.65rem] font-black leading-none text-slate-700 drop-shadow-[0_2px_0_rgba(255,255,255,0.75)]">{step.label}</span>
                  </span>
                  <span className="relative z-30 mt-1 inline-flex items-center gap-1 rounded-xl border border-cyan-100 bg-white/90 px-3 py-1.5 text-sm font-black text-slate-600 shadow-[0_8px_14px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                    <LockIcon /> {t({ en: "Locked", zh: "未解鎖", zhHans: "未解锁" })}
                  </span>
                </>
              )}
            </div>
          ))}
          <FinishPad />
        </div>
      </div>
    </div>
  );
}

export function PersonalizedPracticeMissionShowcase() {
  const { t } = useSettings();

  return (
    <section
      aria-labelledby="personalized-practice-mission-showcase-title"
      className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/95 shadow-[0_22px_60px_rgba(15,23,42,0.14)] dark:border-cyan-200/15 dark:bg-slate-950/[0.9]"
    >
      <div className="relative overflow-hidden px-5 py-6 dark:bg-slate-950/[0.88] sm:px-7 sm:py-7 lg:px-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.07)_1px,transparent_1px)] opacity-70 [background-size:22px_22px] dark:opacity-25" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_15%,rgba(34,211,238,0.14),transparent_22%),radial-gradient(circle_at_14%_65%,rgba(45,212,191,0.11),transparent_25%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(249,253,255,0.95)_54%,rgba(249,254,252,0.98))] dark:bg-[radial-gradient(circle_at_86%_15%,rgba(34,211,238,0.13),transparent_22%),radial-gradient(circle_at_14%_65%,rgba(45,212,191,0.10),transparent_25%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.88)_56%,rgba(8,47,73,0.55))]" />

        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="min-w-0 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full border border-cyan-200 bg-white text-cyan-600 shadow-[0_8px_22px_rgba(14,165,233,0.20)] dark:border-cyan-200/20 dark:bg-white/[0.08] dark:text-cyan-200">
                <TargetIcon />
              </span>
              <p className="text-2xl font-black leading-none text-cyan-700 dark:text-cyan-200 sm:text-[1.7rem]">
                {t({ en: "Personalized Practice Mission", zh: "自適應練習任務", zhHans: "自适应练习任务" })}
              </p>
            </div>

            <h2 id="personalized-practice-mission-showcase-title" className="mt-7 max-w-5xl text-4xl font-black leading-[1.05] text-slate-950 dark:text-white sm:text-5xl lg:text-[4rem]">
              {t({ en: "Complete", zh: "先完成", zhHans: "先完成" })}{" "}
              <span className="align-baseline text-6xl leading-none text-cyan-500 drop-shadow-[0_8px_18px_rgba(14,165,233,0.22)] sm:text-7xl lg:text-[5.5rem]">
                5
              </span>{" "}
              {t({ en: "required practice questions", zh: "題必做練習", zhHans: "题必做练习" })}
            </h2>

            <p className="mt-5 text-xl font-black leading-snug text-slate-600 dark:text-slate-200 sm:text-[1.65rem]">
              {t({ en: "Round target", zh: "本輪目標", zhHans: "本轮目标" })}:{" "}
              <span className="text-cyan-600 dark:text-cyan-200">Sets and Logic</span>
            </p>
            <div className="mt-7 h-[3px] max-w-[40rem] rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-transparent">
              <span className="ml-auto block size-3 -translate-y-[4.5px] rounded-full bg-sky-500 shadow-[0_0_16px_rgba(14,165,233,0.55)]" />
            </div>
          </div>

          <ProgressDial />
        </div>

        <MissionMap />

        <div className="relative mt-6 overflow-hidden rounded-[1.35rem] border border-sky-100 bg-white/90 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-white/[0.07] sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_0.9fr_1.55fr] lg:items-center">
            <div className="flex items-center gap-4 border-slate-200/80 lg:border-r lg:pr-6 dark:border-white/10">
              <span className="grid size-16 shrink-0 place-items-center rounded-full border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-200/20 dark:bg-violet-300/10 dark:text-violet-200">
                <svg aria-hidden="true" viewBox="0 0 32 32" className="size-9">
                  <path d="M6 25h20" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
                  <path d="M9 22v-7m7 7V9m7 13V5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
                  <path d="M7 16l5-5 4 3 8-8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-black text-slate-600 dark:text-slate-300">{t(dictionary.common.difficulty)}</p>
                <p className="mt-1 text-2xl font-black text-violet-600 dark:text-violet-200">{t({ en: "Foundation", zh: "基礎", zhHans: "基础" })}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{t({ en: "Diagnostic mode · limited evidence", zh: "診斷模式 · 證據較少", zhHans: "诊断模式 · 证据较少" })}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 border-slate-200/80 lg:border-r lg:px-6 dark:border-white/10">
              <span className="grid size-16 shrink-0 place-items-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-200/20 dark:bg-emerald-300/10 dark:text-emerald-200">
                <svg aria-hidden="true" viewBox="0 0 32 32" className="size-9">
                  <path d="M13 5h6v6h6v6h-6v10h-6V17H7v-6h6Z" fill="currentColor" opacity="0.9" />
                  <circle cx="10" cy="24" r="3" fill="currentColor" opacity="0.9" />
                  <circle cx="24" cy="8" r="3" fill="currentColor" opacity="0.72" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-black text-slate-600 dark:text-slate-300">{t({ en: "Question type", zh: "題型", zhHans: "题型" })}</p>
                <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-200">{t({ en: "Fill-in x5", zh: "填充題 x5", zhHans: "填空题 x5" })}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{t({ en: "Single type · 5 required", zh: "單一題型 · 5 題必做", zhHans: "单一题型 · 5 题必做" })}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 lg:pl-2">
              <span className="grid size-16 shrink-0 place-items-center rounded-full border border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-200/20 dark:bg-sky-300/10 dark:text-sky-200">
                <svg aria-hidden="true" viewBox="0 0 32 32" className="size-9">
                  <path d="M16 4l2.8 8.2L27 15l-8.2 2.8L16 26l-2.8-8.2L5 15l8.2-2.8Z" fill="currentColor" opacity="0.92" />
                  <path d="M25 4l1.1 3.1L29 8.2l-2.9 1-1.1 3.1-1-3.1-3-1 3-1.1Z" fill="currentColor" opacity="0.66" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "AI selection reason", zh: "AI 選題原因", zhHans: "AI 选题原因" })}</p>
                <p className="mt-1 text-base font-black leading-7 text-slate-950 dark:text-white">
                  {t({
                    en: "Sets and Logic foundation is the best next practice target.",
                    zh: "集合與邏輯基礎是最合適的下一個練習目標。",
                    zhHans: "集合与逻辑基础是最合适的下一个练习目标。"
                  })}
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-emerald-700 dark:text-emerald-200">
                  {t({
                    en: "Evidence is still thin, so the engine is choosing a safe diagnostic step.",
                    zh: "目前證據仍較少，所以引擎會選擇安全的診斷步驟。",
                    zhHans: "目前证据仍较少，所以引擎会选择安全的诊断步骤。"
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-4 rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.045]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t({ en: "Recommendation transparency", zh: "推薦透明度", zhHans: "推荐透明度" })}
            </p>
            <span className="rounded-full bg-slate-950/[0.04] px-3 py-1 text-xs font-black text-slate-500 dark:bg-white/[0.08] dark:text-slate-300">
              {t({ en: "Supporting detail", zh: "輔助資料", zhHans: "辅助资料" })}
            </span>
          </div>
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full border border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-200/20 dark:bg-amber-300/10 dark:text-amber-200">
              <svg viewBox="0 0 32 32" className="size-8">
                <path d="M7 10.5h7.5m3 0H25M7 21.5h7.5m3 0H25" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
                <circle cx="16" cy="10.5" r="3.2" fill="currentColor" opacity="0.88" />
                <circle cx="16" cy="21.5" r="3.2" fill="currentColor" opacity="0.88" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t({ en: "Engine", zh: "引擎", zhHans: "引擎" })}</p>
              <p className="mt-2 max-w-4xl text-lg font-black leading-snug text-amber-700 dark:text-amber-200">
                {t({ en: "Deterministic personalized recommendation", zh: "確定性適性推薦", zhHans: "确定性适性推荐" })}
              </p>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                {t({
                  en: "The LLM rerank failed safely; deterministic BKT handled the next step.",
                  zh: "LLM 重排安全失敗；下一步由確定性 BKT 接手。",
                  zhHans: "LLM 重排安全失败；下一步由确定性 BKT 接手。"
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
