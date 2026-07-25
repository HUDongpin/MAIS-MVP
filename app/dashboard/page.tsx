"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardGradeSelectorGrid } from "@/components/dashboard/DashboardGradeSelectorGrid";
import { StudentProfilePanel } from "@/components/dashboard/StudentProfilePanel";
import { StudentRewardsPanel } from "@/components/dashboard/StudentRewardsPanel";
import { StudentMotivationHub } from "@/components/gamification/StudentMotivationHub";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { curriculumProfileLabel } from "@/lib/curriculumProfile";
import { formatGradeLabelForCurriculum, formatLearnerName, formatUnitedStatesGradeLabel, isChineseLanguage, simplifyChineseText } from "@/lib/i18n";
import { studentLessonsPath } from "@/lib/lessonLinks";
import { studentAssignmentHref, studentAssignmentsPath } from "@/lib/studentAssignmentRoutes";
import type { DashboardData, StudentAssignmentItem } from "@/types";

function readDashboard(value: unknown) {
  const response = value as { dashboard?: unknown } | null;
  return (response?.dashboard ?? null) as DashboardData | null;
}

function readAssignments(value: unknown) {
  const response = value as { assignments?: unknown } | null;
  return Array.isArray(response?.assignments) ? (response.assignments as StudentAssignmentItem[]) : [];
}

function assignmentHref(item: StudentAssignmentItem) {
  return studentAssignmentHref(item.assignment.id);
}

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language === "en" ? "en-HK" : language === "zh-Hans" ? "zh-CN" : "zh-HK", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function DashboardLessonShortcutLink({
  ariaLabel,
  disabled = false,
  href,
  label
}: {
  ariaLabel: string;
  disabled?: boolean;
  href: string;
  label: string;
}) {
  const className = `focus-ring inline-flex h-11 min-w-[7.25rem] shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-[linear-gradient(110deg,#fde047,#86efac_42%,#67e8f9_70%,#f9a8d4)] px-5 text-base font-black leading-none text-slate-950 shadow-[0_14px_30px_rgba(20,184,166,0.2)] ring-1 ring-cyan-200/80 transition duration-300 dark:border-white/20 dark:ring-white/10 ${disabled ? "cursor-wait opacity-70" : "hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(236,72,153,0.2)]"}`;

  if (disabled) {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={className}
      >
        <span>{label}</span>
      </button>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={className}
    >
      <span>{label}</span>
    </Link>
  );
}

function DashboardHeaderShortcuts({ lessonHref, lessonShortcutReady, t }: { lessonHref: string; lessonShortcutReady: boolean; t: (localized: { en: string; zh: string; zhHans?: string }) => string }) {
  return (
    <span className="inline-flex flex-wrap items-center align-middle">
      <DashboardLessonShortcutLink
        href={lessonHref}
        disabled={!lessonShortcutReady}
        label={t({ en: "Lesson", zh: "課時", zhHans: "课时" })}
        ariaLabel={lessonShortcutReady
          ? t({ en: "Open lesson", zh: "開啟課時", zhHans: "打开课时" })
          : t({ en: "Preparing lesson", zh: "正在準備課時", zhHans: "正在准备课时" })}
      />
    </span>
  );
}

const novaLensDisabledStorageKey = "mais:nova-lens-disabled";
const novaLensPreferenceChangedEventName = "mais:nova-lens-preference-change";
const settingsLinkClassName = "focus-ring flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-left text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:border-cyan-200/25 dark:hover:bg-cyan-300/[0.08]";
const dashboardMenuButtonClassName = "focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-center text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200";

function readNovaLensDisabledPreference() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(novaLensDisabledStorageKey) === "true";
  } catch {
    return false;
  }
}

function writeNovaLensDisabledPreference(disabled: boolean) {
  try {
    window.localStorage.setItem(novaLensDisabledStorageKey, disabled ? "true" : "false");
  } catch {
    // The visible toggle still updates in-memory when local storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent(novaLensPreferenceChangedEventName, { detail: { disabled } }));
}

function DashboardSettingsMenu({
  novaLensDisabled,
  onClose,
  onNovaLensDisabledChange,
  t
}: {
  novaLensDisabled: boolean;
  onClose: () => void;
  onNovaLensDisabledChange: (disabled: boolean) => void;
  t: ReturnType<typeof useSettings>["t"];
}) {
  return (
    <div
      id="student-dashboard-settings-panel"
      role="dialog"
      aria-label={t({ en: "Student settings", zh: "學生設定", zhHans: "学生设置" })}
      className="absolute left-0 right-0 top-full z-[80] mt-3 grid gap-2 rounded-[1.25rem] border border-cyan-200/70 bg-white/90 p-3 shadow-xl shadow-slate-950/10 backdrop-blur dark:border-cyan-200/20 dark:bg-slate-950/95 dark:shadow-black/30"
    >
      <label className="relative flex min-h-[4.25rem] cursor-pointer items-start justify-between gap-3 rounded-2xl border border-cyan-200/70 bg-cyan-50/70 px-3 py-3 transition focus-within:ring-2 focus-within:ring-cyan-300/70 dark:border-cyan-200/20 dark:bg-cyan-300/[0.08]">
        <span className="pointer-events-none grid gap-1">
          <span className="text-sm font-black leading-5 text-slate-900 dark:text-white">
            {t({ en: "Turn off immersive text selection", zh: "關閉沉浸式文字選取", zhHans: "关闭沉浸式文字选取" })}
          </span>
          <span className="text-xs font-bold leading-5 text-cyan-700 dark:text-cyan-100">
            {t({ en: "NOVA LENS", zh: "NOVA LENS", zhHans: "NOVA LENS" })}
          </span>
        </span>
        <input
          type="checkbox"
          checked={novaLensDisabled}
          onChange={(event) => onNovaLensDisabledChange(event.target.checked)}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${novaLensDisabled ? "bg-slate-950 dark:bg-white" : "bg-cyan-300 dark:bg-cyan-500"}`}
        >
          <span className={`h-5 w-5 rounded-full bg-white shadow transition dark:bg-slate-950 ${novaLensDisabled ? "translate-x-5" : "translate-x-0"}`} />
        </span>
      </label>

      <Link href="/change-password?next=%2Fdashboard" onClick={onClose} className={settingsLinkClassName}>
        <span>{t({ en: "Change password", zh: "更改密碼", zhHans: "更改密码" })}</span>
        <span aria-hidden="true">›</span>
      </Link>
    </div>
  );
}

function DashboardShortcutsMenu({
  lessonHref,
  onClose,
  t
}: {
  lessonHref: string;
  onClose: () => void;
  t: ReturnType<typeof useSettings>["t"];
}) {
  const shortcuts = [
    { href: "/personalized-learning", label: t({ en: "Personalized Learning", zh: "個人化學習", zhHans: "个性化学习" }) },
    { href: "/progress", label: t({ en: "Progress Report", zh: "學習報告", zhHans: "学习报告" }) },
    { href: lessonHref, label: t({ en: "Lessons", zh: "課時", zhHans: "课时" }) },
    { href: "/practice", label: t({ en: "Practice Arena", zh: "練習場", zhHans: "练习场" }) },
    { href: "/student/roadmap", label: t({ en: "Learning Roadmap", zh: "學習路線圖", zhHans: "学习路线图" }) },
    { href: "/student/tools/visualizations", label: t({ en: "Visualization Lab", zh: "可視化實驗室", zhHans: "可视化实验室" }) },
    { href: "/mistake-book", label: t({ en: "Mistake Book", zh: "錯題簿", zhHans: "错题簿" }) },
    { href: studentAssignmentsPath, label: t({ en: "Assignments", zh: "作業", zhHans: "作业" }) }
  ];

  return (
    <div
      id="student-dashboard-shortcuts-panel"
      role="dialog"
      aria-label={t({ en: "Student shortcuts", zh: "學生捷徑", zhHans: "学生快捷入口" })}
      className="absolute left-0 right-0 top-full z-[80] mt-3 grid gap-2 rounded-[1.25rem] border border-cyan-200/70 bg-white/90 p-3 shadow-xl shadow-slate-950/10 backdrop-blur dark:border-cyan-200/20 dark:bg-slate-950/95 dark:shadow-black/30"
    >
      {shortcuts.map((shortcut) => (
        <Link key={shortcut.href} href={shortcut.href} onClick={onClose} className={settingsLinkClassName}>
          <span>{shortcut.label}</span>
          <span aria-hidden="true">›</span>
        </Link>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser, language, selectedGrade, settingsReady, studentLessonHref, t, text } = useSettings();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>([]);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const [assignmentSavingId, setAssignmentSavingId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [novaLensDisabled, setNovaLensDisabled] = useState(false);
  const [loadSecondaryPanels, setLoadSecondaryPanels] = useState(false);
  const currentUserRequestKey = currentUser
    ? `${currentUser.id}:${currentUser.role}:${currentUser.curriculumTrack}:${currentUser.curriculumProfile.region}:${currentUser.curriculumProfile.publisher ?? ""}`
    : "";
  const isChinese = isChineseLanguage(language);
  const visibleAssignments = assignments.filter((item) => item.classGrade === selectedGrade);
  const isUnitedStatesCourse = currentUser?.curriculumProfile.region === "US";
  const selectedGradeLabel = isUnitedStatesCourse
    ? formatUnitedStatesGradeLabel(selectedGrade, language, true)
    : formatGradeLabelForCurriculum(selectedGrade, language, currentUser?.curriculumTrack ?? "HK", true);
  const courseName = currentUser ? t(curriculumProfileLabel(currentUser.curriculumProfile)) : "";
  const lessonShortcutHref = currentUser?.role === "student" && studentLessonHref ? studentLessonHref : studentLessonsPath;
  const lessonShortcutReady = currentUser?.role !== "student" || Boolean(studentLessonHref);
  const learnerName = currentUser ? formatLearnerName(currentUser.name, language) : "";
  const learnerNameParts = learnerName.trim().split(/\s+/).filter(Boolean);
  const learnerNameLead = !isChinese && learnerNameParts.length > 1 ? learnerNameParts[0] : "";
  const learnerNameTail = !isChinese && learnerNameParts.length > 1 ? learnerNameParts.slice(1).join(" ") : learnerName;
  const welcomePrefix = currentUser
    ? isChinese
      ? simplifyChineseText("歡迎回來，", language)
      : "Welcome back,"
    : "";
  const welcomeLead = currentUser
    ? isChinese
      ? welcomePrefix
      : [welcomePrefix, learnerNameLead].filter(Boolean).join(" ")
    : "";
  const welcome = currentUser
    ? isChinese
      ? `${welcomePrefix}${learnerName}`
      : `${welcomePrefix} ${learnerName}`
    : t(dictionary.dashboard.welcome);
  const loadErrorCopy = t({ en: "Could not load dashboard data.", zh: "暫時無法載入學生儀表板資料。" });
  const welcomeHeadingTextClassName = "min-w-0 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl";

  useEffect(() => {
    if (!settingsReady) {
      setDashboard(null);
      setLoadError("");
      setIsLoading(true);
      return;
    }

    const controller = new AbortController();

    async function loadDashboard() {
      setIsLoading(true);
      setLoadError("");

      if (!currentUser || currentUser.role !== "student") {
        setDashboard(null);
        setLoadError("");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/dashboard?grade=${selectedGrade}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const nextDashboard = readDashboard(await response.json());
        if (!response.ok || !nextDashboard) throw new Error(loadErrorCopy);
        setDashboard(nextDashboard);
      } catch (error) {
        if (!controller.signal.aborted) {
          setDashboard(null);
          setLoadError(error instanceof Error ? error.message : loadErrorCopy);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [currentUserRequestKey, loadErrorCopy, selectedGrade, settingsReady]);

  useEffect(() => {
    if (!settingsReady) {
      setAssignments([]);
      return;
    }

    const controller = new AbortController();

    async function loadAssignments() {
      if (!currentUser || currentUser.role !== "student") {
        setAssignments([]);
        return;
      }

      try {
        const response = await fetch("/api/assignments", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Assignments unavailable");
        setAssignments(readAssignments(await response.json()));
      } catch {
        if (!controller.signal.aborted) setAssignments([]);
      }
    }

    loadAssignments();

    return () => controller.abort();
  }, [currentUserRequestKey, settingsReady]);

  useEffect(() => {
    if (!settingsReady || !currentUser || currentUser.role !== "student" || isLoading || loadError) {
      setLoadSecondaryPanels(false);
      return;
    }

    setLoadSecondaryPanels(false);
    const timer = window.setTimeout(() => setLoadSecondaryPanels(true), 300);
    return () => window.clearTimeout(timer);
  }, [currentUserRequestKey, isLoading, loadError, selectedGrade, settingsReady]);

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

  const updateNovaLensDisabled = (disabled: boolean) => {
    writeNovaLensDisabledPreference(disabled);
    setNovaLensDisabled(disabled);
  };

  if (!settingsReady) {
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="glass-panel overflow-hidden p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">
            {t({ en: "Secure workspace", zh: "安全學習空間", zhHans: "安全学习空间" })}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            {t({ en: "Loading secure workspace", zh: "正在載入安全學習空間", zhHans: "正在载入安全学习空间" })}
          </h1>
        </section>
      </div>
    );
  }

  if (currentUser && currentUser.role !== "student") {
    const consoleHref = currentUser.role === "parent" ? "/parent" : currentUser.role === "teacher" || currentUser.role === "admin" ? "/teacher" : "/";
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="glass-panel overflow-hidden p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">
              {t({ en: "Guarded student dashboard", zh: "受保護學生儀表板", zhHans: "受保护学生仪表盘" })}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl md:text-5xl">
              {t({ en: "Student learner state is not open for this role", zh: "此角色未開放學生學習狀態", zhHans: "此角色未开放学生学习状态" })}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              {t({
                en: "The P1 platform loop keeps student dashboard data student-owned. Teacher review and parent-safe updates are available in the role console.",
                zh: "P1 平台閉環將學生儀表板資料保留給學生本人；教師審核與家長安全更新會在角色控制台中顯示。",
                zhHans: "P1 平台闭环将学生仪表盘数据保留给学生本人；教师审核与家长安全更新会在角色控制台中显示。"
              })}
            </p>
            <Link href={consoleHref} className="focus-ring mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
              {t({ en: "Open your console", zh: "開啟你的控制台", zhHans: "打开你的控制台" })}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const submitAssignmentDraft = async (item: StudentAssignmentItem) => {
    const answerText = assignmentDrafts[item.assignment.id]?.trim() ?? "";
    if (!answerText) return;
    setAssignmentSavingId(item.assignment.id);
    const endpoint = item.submission.status === "correction-required"
      ? `/api/assignments/${encodeURIComponent(item.assignment.id)}/corrections`
      : `/api/assignments/${encodeURIComponent(item.assignment.id)}/submissions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerText, inputType: "text" })
    });
    const payload = await response.json().catch(() => null) as { submission?: StudentAssignmentItem["submission"] } | null;
    setAssignmentSavingId("");
    if (!response.ok || !payload?.submission) return;
    setAssignments((current) => current.map((candidate) =>
      candidate.assignment.id === item.assignment.id
        ? { ...candidate, submission: payload.submission! }
        : candidate
    ));
    setAssignmentDrafts((current) => ({ ...current, [item.assignment.id]: "" }));
  };

  return (
    <div className="page-container py-10 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="glass-panel flex h-full flex-col justify-between gap-8 overflow-hidden p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              {currentUser ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
                  <h1 className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={welcomeHeadingTextClassName}>{welcomeLead}</span>
                    {learnerNameTail ? <span className={welcomeHeadingTextClassName}>{learnerNameTail}</span> : null}
                  </h1>
                  <DashboardHeaderShortcuts lessonHref={lessonShortcutHref} lessonShortcutReady={lessonShortcutReady} t={t} />
                </div>
              ) : (
                <h1 className={`mt-3 ${welcomeHeadingTextClassName}`}>{welcome}</h1>
              )}
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                {t({
                  en: "Click the Lesson button to begin your learning journey.",
                  zh: "點擊課時按鈕，開始學習之旅",
                  zhHans: "点击课时按钮，开始学习之旅"
                })}
              </p>
              {currentUser ? (
                <div className="mt-8 max-w-2xl rounded-3xl border border-cyan-200/70 bg-cyan-50/70 px-5 py-4 shadow-sm dark:border-cyan-300/15 dark:bg-cyan-300/[0.08]">
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                    {t({ en: "Learning course", zh: "學習課程", zhHans: "学习课程" })}
                  </p>
                  <p className="mt-2 break-words text-2xl font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">
                    {courseName} · {selectedGradeLabel}
                  </p>
                </div>
              ) : null}
              {isLoading ? <p className="mt-3 text-sm font-bold text-cyan-600 dark:text-cyan-300">{t(dictionary.dashboard.loading)}</p> : null}
              {loadError ? <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">{loadError}</p> : null}
              {dashboard?.contentUnavailable ? (
                <p className="mt-4 rounded-2xl border border-amber-300/55 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-100">
                  {t(dashboard.contentUnavailable)}
                </p>
              ) : null}
            </div>
            <div className="grid h-36 w-36 place-items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 shadow-glow">
              <div className="text-center">
                <p className="text-4xl font-black gradient-text">{dashboard?.overallMastery ?? 0}%</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t(dictionary.common.overall)}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200/70 pt-6 dark:border-white/10">
            <DashboardGradeSelectorGrid />
          </div>
        </section>

        <aside className={`glass-panel p-5 ${settingsOpen || shortcutsOpen ? "relative z-[90]" : "relative"}`}>
          <StudentProfilePanel />
          <div className={`relative mt-5 grid gap-2 ${settingsOpen || shortcutsOpen ? "z-[70]" : ""}`} data-nova-lens-ignore="true">
            <Link href="/messages" className={dashboardMenuButtonClassName}>
              {t({ en: "Messages", zh: "私信" })}
            </Link>
            <button
              type="button"
              aria-expanded={settingsOpen}
              aria-haspopup="dialog"
              // The panel is unmounted while closed; `aria-expanded` carries the state.
              aria-controls={settingsOpen ? "student-dashboard-settings-panel" : undefined}
              onClick={() => {
                setShortcutsOpen(false);
                setSettingsOpen((current) => !current);
              }}
              className={dashboardMenuButtonClassName}
            >
              {t({ en: "Settings", zh: "設定", zhHans: "设置" })}
            </button>
            <button
              type="button"
              aria-expanded={shortcutsOpen}
              aria-haspopup="dialog"
              // The panel is unmounted while closed; `aria-expanded` carries the state.
              aria-controls={shortcutsOpen ? "student-dashboard-shortcuts-panel" : undefined}
              onClick={() => {
                setSettingsOpen(false);
                setShortcutsOpen((current) => !current);
              }}
              className={dashboardMenuButtonClassName}
            >
              {t({ en: "Shortcuts", zh: "捷徑", zhHans: "快捷入口" })}
            </button>
            {settingsOpen ? (
              <DashboardSettingsMenu
                novaLensDisabled={novaLensDisabled}
                onClose={() => setSettingsOpen(false)}
                onNovaLensDisabledChange={updateNovaLensDisabled}
                t={t}
              />
            ) : null}
            {shortcutsOpen ? (
              <DashboardShortcutsMenu
                lessonHref={lessonShortcutHref}
                onClose={() => setShortcutsOpen(false)}
                t={t}
              />
            ) : null}
          </div>
        </aside>
      </div>

      {visibleAssignments.length ? (
        <section className="glass-panel mt-6 p-5 sm:p-6" aria-labelledby="dashboard-assignments-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                {t({ en: "Task bay", zh: "任務艙", zhHans: "任务舱" })}
              </p>
              <h2 id="dashboard-assignments-heading" className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {t({ en: "Teacher-assigned work", zh: "老師分派內容", zhHans: "老师分派内容" })}
              </h2>
            </div>
            <Link href={studentAssignmentsPath} className="focus-ring rounded-full border border-cyan-200/80 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-800 transition hover:-translate-y-0.5 dark:border-cyan-200/25 dark:bg-cyan-300/[0.12] dark:text-cyan-100">
              {t({ en: "Open assignments", zh: "開啟作業", zhHans: "打开作业" })}
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {visibleAssignments.slice(0, 4).map((item) => (
              <article key={item.assignment.id} className="soft-panel grid min-h-64 gap-3 p-4">
                <div>
                  <p className="text-xs font-black uppercase leading-5 text-cyan-700 dark:text-cyan-100">{item.className} · {item.assignment.contentType}</p>
                  <Link href={assignmentHref(item)} className="focus-ring mt-2 inline-flex break-words text-base font-black leading-tight text-slate-950 underline-offset-4 hover:underline dark:text-white">
                    {text(item.assignment.title)}
                  </Link>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black text-slate-600 dark:text-slate-200">
                  <span className="rounded-full border border-cyan-200/80 bg-cyan-100/75 px-3 py-1 text-cyan-800 dark:border-cyan-200/30 dark:bg-cyan-300/[0.12] dark:text-cyan-100">{item.submission.status}</span>
                  <span>{item.assignment.dueAt ? formatDate(item.assignment.dueAt, language) : t({ en: "No due date", zh: "無截止日期", zhHans: "无截止日期" })}</span>
                </div>
                {item.submission.feedback ? (
                  <p className="max-h-20 overflow-auto break-words text-xs font-bold leading-5 text-slate-600 dark:text-slate-200">{text(item.submission.feedback)}</p>
                ) : null}
                {item.submission.correctionRequest ? (
                  <p className="max-h-24 overflow-auto rounded-2xl border border-amber-200/80 bg-amber-50/80 p-3 text-xs font-bold leading-5 text-amber-800 dark:border-amber-200/25 dark:bg-amber-300/[0.12] dark:text-amber-100">
                    {text(item.submission.correctionRequest)}
                  </p>
                ) : null}
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                    {item.submission.status === "correction-required" ? t({ en: "Correction", zh: "訂正內容", zhHans: "订正内容" }) : t({ en: "Submission", zh: "提交內容", zhHans: "提交内容" })}
                  </span>
                  <textarea
                    rows={3}
                    value={assignmentDrafts[item.assignment.id] ?? ""}
                    onChange={(event) => setAssignmentDrafts((current) => ({ ...current, [item.assignment.id]: event.target.value }))}
                    className="focus-ring rounded-2xl border border-cyan-100/80 bg-white/80 px-3 py-2 text-sm text-slate-950 dark:border-white/10 dark:bg-white/[0.08] dark:text-white"
                  />
                </label>
                <button
                  disabled={assignmentSavingId === item.assignment.id || !(assignmentDrafts[item.assignment.id]?.trim())}
                  onClick={() => submitAssignmentDraft(item)}
                  type="button"
                  className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
                >
                  {assignmentSavingId === item.assignment.id
                    ? t({ en: "Submitting", zh: "提交中", zhHans: "提交中" })
                    : item.submission.status === "correction-required"
                      ? t({ en: "Submit correction", zh: "提交訂正", zhHans: "提交订正" })
                      : t({ en: "Submit work", zh: "提交作業", zhHans: "提交作业" })}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {loadSecondaryPanels ? (
        <>
          <StudentMotivationHub />
          <StudentRewardsPanel />
        </>
      ) : null}
    </div>
  );
}
