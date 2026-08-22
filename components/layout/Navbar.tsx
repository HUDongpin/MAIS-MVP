"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { MapLikeLogoMark } from "@/components/layout/MapLikeLogoMark";
import { requestStudentGuidedTour } from "@/components/onboarding/StudentGuidedTour";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { isImmersiveStudentPracticeGamePath } from "@/lib/gameBasedLearning";
import { formatLearnerName } from "@/lib/i18n";
import { studentLessonsPath } from "@/lib/lessonLinks";
import { cn } from "@/lib/utils";
import { studentVisualizationToolsPath } from "@/lib/visualizationRoutes";
import type { LocalizedText } from "@/types";

function practiceHrefForPathname(pathname: string) {
  const lessonMatch = pathname.match(/^\/student\/lessons\/([^/]+)/) ?? pathname.match(/^\/lesson\/([^/]+)/);
  if (!lessonMatch?.[1]) return "/practice";

  try {
    return `/practice?lesson=${encodeURIComponent(decodeURIComponent(lessonMatch[1]))}`;
  } catch {
    return `/practice?lesson=${encodeURIComponent(lessonMatch[1])}`;
  }
}

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
    >
      <path d="M10 6H6.75A2.75 2.75 0 0 0 4 8.75v6.5A2.75 2.75 0 0 0 6.75 18H10" />
      <path d="M15 8l4 4-4 4" />
      <path d="M8.5 12H19" />
    </svg>
  );
}

function MaisLogo() {
  return (
    <MapLikeLogoMark
      className="h-10 w-10 shrink-0 drop-shadow-[0_9px_20px_rgba(79,70,229,0.18)] transition group-hover:scale-105"
      strokeWidth={3.5}
    />
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, language, logout, studentLessonHref, t } = useSettings();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const lessonHref = currentUser?.role === "student"
    ? studentLessonHref ?? studentLessonsPath
    : currentUser
      ? studentLessonsPath
      : `/login?next=${encodeURIComponent(studentLessonsPath)}`;
  const practiceHref = practiceHrefForPathname(pathname);
  // tourAnchor marks the links the student guided tour points at. The desktop row
  // and the mobile menu both carry it; the tour spotlights whichever copy is laid out.
  const primaryNavItems: Array<{
    key: string;
    href: string;
    label: LocalizedText;
    activePaths: string[];
    tourAnchor?: string;
  }> = [
    { key: "lesson", href: lessonHref, label: dictionary.lesson.label, activePaths: [studentLessonsPath], tourAnchor: "student-lesson" },
    {
      key: "personalized-learning",
      href: "/personalized-learning",
      label: { en: "Personalized Learning", zh: "個人化學習", zhHans: "个性化学习" },
      activePaths: ["/personalized-learning", "/adaptive-learning"]
    },
    { key: "visualization-lab", href: studentVisualizationToolsPath, label: dictionary.nav.visualizationLab, activePaths: [studentVisualizationToolsPath, "/visualization-lab"] },
    { key: "practice", href: practiceHref, label: dictionary.nav.practice, activePaths: ["/practice", "/mistake-book"], tourAnchor: "student-practice" },
    { key: "about", href: "/about", label: { en: "About", zh: "關於", zhHans: "关于" }, activePaths: ["/about"] }
  ];
  const guestAuthLinks = [
    {
      key: "login",
      href: "/login",
      label: dictionary.nav.login,
      active: pathname.startsWith("/login") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password")
    },
    {
      key: "register",
      href: "/register",
      label: { en: "Register", zh: "註冊" },
      active: pathname.startsWith("/register")
    }
  ] as const;
  const isStudent = currentUser?.role === "student";
  const showMeAroundLabel: LocalizedText = { en: "Show me around", zh: "帶我看看", zhHans: "带我看看" };
  const hasTeacherWorkspace = currentUser?.role === "teacher" || currentUser?.role === "admin";
  const hasParentWorkspace = currentUser?.role === "parent";
  const accountHref = hasTeacherWorkspace ? "/teacher/dashboard" : hasParentWorkspace ? "/parent" : "/dashboard";
  const accountActive = hasTeacherWorkspace
    ? pathname.startsWith("/teacher")
    : hasParentWorkspace
      ? pathname.startsWith("/parent")
      : pathname.startsWith("/dashboard");
  const accountLabel = currentUser ? formatLearnerName(currentUser.name, language) : "";
  const isImmersiveGameRoute = isImmersiveStudentPracticeGamePath(pathname);
  const isActive = (item: (typeof primaryNavItems)[number]) =>
    item.activePaths.some((activePath) => pathname.startsWith(activePath));

  useEffect(() => {
    // Only warm the workspace routes for signed-in users. Guests (e.g. sitting on the
    // login page) would otherwise eagerly prefetch heavy authenticated routes they
    // cannot open yet, competing for bandwidth with the login flow itself. Marketing
    // routes like /about are intentionally left out — they are not a likely next click.
    if (!currentUser) return;
    const hrefs = [lessonHref, "/personalized-learning", studentVisualizationToolsPath, practiceHref]
      .filter((href): href is string => Boolean(href && href !== studentLessonsPath));
    Array.from(new Set(hrefs)).forEach((href) => router.prefetch(href));
  }, [currentUser, lessonHref, practiceHref, router]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    await logout();
    setOpen(false);
    router.push("/login");
    setIsLoggingOut(false);
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 border-b border-slate-200/70 bg-white/65 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55",
      isImmersiveGameRoute ? "hidden sm:block" : ""
    )}>
      <nav className="page-container flex h-16 items-center justify-between gap-2 xl:gap-4" aria-label={t({ en: "Main navigation", zh: "主導覽" })}>
        <Link
          href="/"
          aria-label={t(dictionary.common.siteName)}
          className="focus-ring group flex min-h-11 min-w-11 shrink-0 items-center gap-3 rounded-full"
          onClick={() => setOpen(false)}
        >
          <MaisLogo />
          <span className="hidden min-w-0 sm:block">
            <span className="block whitespace-nowrap text-sm font-black tracking-tight">{t(dictionary.common.siteName)}</span>
            <span
              className={cn(
                "text-[11px] font-medium text-slate-500 dark:text-slate-400",
                language === "en"
                  ? "hidden max-w-[15rem] truncate whitespace-nowrap 2xl:block 2xl:max-w-none"
                  : "hidden whitespace-nowrap sm:block"
              )}
            >
              {t(dictionary.common.siteSubtitle)}
            </span>
          </span>
        </Link>

        <div className="hidden shrink-0 items-center gap-0.5 xl:flex xl:gap-1">
          {primaryNavItems.map((item) => {
            const active = isActive(item);
            const className = cn(
              "focus-ring shrink-0 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold transition xl:px-3 xl:text-sm",
              active
                ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            );
            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                data-tour={item.tourAnchor}
                className={className}
              >
                {t(item.label)}
              </Link>
            );
          })}
          {currentUser ? (
            <Link
              href={accountHref}
              aria-current={accountActive ? "page" : undefined}
              className={cn(
                "focus-ring max-w-[10rem] truncate rounded-full px-2.5 py-2 text-[13px] font-semibold transition 2xl:max-w-[14rem] 2xl:px-3 2xl:text-sm",
                accountActive
                  ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                  : "border border-cyan-400/35 bg-cyan-400/10 text-cyan-700 hover:bg-cyan-400/20 dark:text-cyan-200"
              )}
            >
              {accountLabel}
            </Link>
          ) : (
            <div className="ml-1 flex shrink-0 items-center gap-1 rounded-full border border-slate-200/75 bg-white/80 p-1 shadow-lg shadow-cyan-500/10 ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:ring-white/10 xl:ml-1.5">
              {guestAuthLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  aria-current={link.active ? "page" : undefined}
                  className={cn(
                    "focus-ring rounded-full px-3 py-2 text-[13px] font-black leading-none transition duration-200 xl:px-3.5 xl:text-sm",
                    link.active
                      ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25"
                      : "bg-white text-slate-950 shadow-sm shadow-slate-900/5 hover:-translate-y-0.5 hover:bg-cyan-50 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.13]"
                  )}
                >
                  {t(link.label)}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 xl:gap-2">
          {isStudent ? (
            <button
              type="button"
              data-tour="student-tour-button"
              aria-label={t(showMeAroundLabel)}
              title={t(showMeAroundLabel)}
              onClick={() => requestStudentGuidedTour()}
              className="focus-ring hidden h-11 w-11 items-center justify-center rounded-full border border-cyan-300/45 bg-white text-lg font-black text-cyan-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-50 sm:inline-flex dark:border-cyan-300/25 dark:bg-white/[0.08] dark:text-cyan-100"
            >
              <span aria-hidden="true">🧭</span>
            </button>
          ) : null}
          <LanguageToggle />
          <ThemeToggle />
          {currentUser ? (
            <button
              type="button"
              aria-label={t(dictionary.login.logout)}
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="focus-ring hidden h-11 items-center rounded-full border border-cyan-300/45 bg-white px-2.5 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/15 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-55 dark:border-cyan-300/25 dark:bg-white/[0.08] dark:text-white dark:shadow-cyan-950/30 dark:hover:bg-white/[0.13] sm:inline-flex 2xl:gap-2 2xl:px-3.5 2xl:pr-4"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-400 text-slate-950 shadow-inner shadow-white/30">
                <LogoutIcon />
              </span>
              <span className="sr-only whitespace-nowrap 2xl:not-sr-only">{t(dictionary.login.logout)}</span>
            </button>
          ) : null}
          <button
            type="button"
            aria-label={t({ en: "Open mobile menu", zh: "開啟手機選單" })}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/70 bg-white/75 shadow-sm xl:hidden dark:border-white/10 dark:bg-white/[0.07]"
          >
            <span aria-hidden="true" className="text-xl">{open ? "×" : "≡"}</span>
          </button>
        </div>
      </nav>

      {open ? (
        <div className="page-container pb-4 xl:hidden">
          <div className="glass-panel grid gap-1 p-2">
            {primaryNavItems.map((item) => {
              const active = isActive(item);
              const className = cn(
                "focus-ring rounded-2xl px-4 py-3 text-sm font-semibold transition",
                active
                  ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                  : "text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10"
              );
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  data-tour={item.tourAnchor}
                  className={className}
                >
                  {t(item.label)}
                </Link>
              );
            })}
            {isStudent ? (
              <button
                type="button"
                data-tour="student-tour-button"
                onClick={() => {
                  setOpen(false);
                  requestStudentGuidedTour();
                }}
                className="focus-ring inline-flex items-center gap-3 rounded-2xl border border-cyan-300/35 bg-cyan-400/10 px-4 py-3 text-left text-sm font-black text-cyan-700 transition hover:bg-cyan-400/15 sm:hidden dark:text-cyan-100 dark:hover:bg-white/[0.12]"
              >
                <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-lg shadow-sm dark:bg-white/[0.08]">🧭</span>
                <span>{t(showMeAroundLabel)}</span>
              </button>
            ) : null}
            {currentUser ? (
              <Link
                href={accountHref}
                onClick={() => setOpen(false)}
                aria-current={accountActive ? "page" : undefined}
                className={cn(
                  "focus-ring rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  accountActive
                    ? "bg-cyan-400 text-slate-950"
                    : "text-cyan-700 hover:bg-cyan-400/10 dark:text-cyan-200 dark:hover:bg-white/10"
                )}
              >
                {accountLabel}
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-1">
                {guestAuthLinks.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={link.active ? "page" : undefined}
                    className={cn(
                      "focus-ring rounded-2xl px-4 py-3 text-center text-sm font-black transition",
                      link.active
                        ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                        : "border border-slate-200/80 bg-white text-slate-950 shadow-sm shadow-slate-900/5 hover:bg-cyan-50 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.13]"
                    )}
                  >
                    {t(link.label)}
                  </Link>
                ))}
              </div>
            )}
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="focus-ring inline-flex items-center gap-3 rounded-2xl border border-cyan-300/35 bg-cyan-400/10 px-4 py-3 text-left text-sm font-black text-cyan-700 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-55 dark:text-cyan-100 dark:hover:bg-white/[0.12]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-cyan-400 text-slate-950">
                  <LogoutIcon />
                </span>
                <span>{t(dictionary.login.logout)}</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
