"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { MapLikeLogoMark } from "@/components/layout/MapLikeLogoMark";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { guestRecommendedLessonHrefForGrade } from "@/lib/guestLessonLinks";
import { formatLearnerName } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const immersiveGameRoutes = ["/practice/fishing-game", "/practice/adventure-island"];

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
      className="h-10 w-10 shrink-0 text-indigo-600 drop-shadow-[0_9px_20px_rgba(79,70,229,0.18)] transition group-hover:scale-105 dark:text-indigo-500"
      strokeWidth={3.5}
    />
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, language, logout, selectedGrade, settingsReady, studentLessonHref, t } = useSettings();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const lessonPending = !settingsReady || (currentUser?.role === "student" && !studentLessonHref);
  const lessonHref = !settingsReady
    ? ""
    : currentUser?.role === "student"
      ? studentLessonHref ?? ""
      : guestRecommendedLessonHrefForGrade(selectedGrade);
  const primaryNavItems = [
    { key: "lesson", href: lessonHref, label: dictionary.lesson.label, activePaths: ["/lesson"], pending: lessonPending },
    { key: "adaptive-learning", href: "/adaptive-learning", label: { en: "Adaptive Learning", zh: "適性學習" }, activePaths: ["/adaptive-learning"], pending: false },
    { key: "visualization-lab", href: "/visualization-lab", label: dictionary.nav.visualizationLab, activePaths: ["/visualization-lab"], pending: false },
    { key: "practice", href: "/practice", label: dictionary.nav.practice, activePaths: ["/practice", "/mistake-book"], pending: false }
  ];
  const guestAuthLinks = [
    {
      key: "login",
      href: "/login",
      label: dictionary.nav.login,
      active: pathname.startsWith("/login") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password"),
      emphasis: "primary"
    },
    {
      key: "register",
      href: "/register",
      label: { en: "Register", zh: "註冊" },
      active: pathname.startsWith("/register"),
      emphasis: "secondary"
    }
  ] as const;
  const hasTeacherWorkspace = currentUser?.role === "teacher" || currentUser?.role === "admin";
  const hasParentWorkspace = currentUser?.role === "parent";
  const accountHref = hasTeacherWorkspace ? "/teacher" : hasParentWorkspace ? "/parent" : "/dashboard";
  const accountActive = hasTeacherWorkspace
    ? pathname.startsWith("/teacher")
    : hasParentWorkspace
      ? pathname.startsWith("/parent")
      : pathname.startsWith("/dashboard");
  const accountLabel = currentUser ? formatLearnerName(currentUser.name, language) : "";
  const isImmersiveGameRoute = immersiveGameRoutes.some((route) => pathname.startsWith(route));
  const isActive = (item: (typeof primaryNavItems)[number]) =>
    item.activePaths.some((activePath) => pathname.startsWith(activePath));

  useEffect(() => {
    if (!settingsReady) return;
    const hrefs = [lessonHref, "/adaptive-learning", "/visualization-lab", "/practice"]
      .filter((href): href is string => Boolean(href && href !== "/lesson"));
    Array.from(new Set(hrefs)).forEach((href) => router.prefetch(href));
  }, [lessonHref, router, settingsReady]);

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
      <nav className="page-container flex h-16 items-center justify-between gap-3 xl:gap-4" aria-label={t({ en: "Main navigation", zh: "主導覽" })}>
        <Link href="/" className="focus-ring group flex min-w-0 shrink-0 items-center gap-3 rounded-full" onClick={() => setOpen(false)}>
          <MaisLogo />
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-sm font-black tracking-tight">{t(dictionary.common.siteName)}</span>
            <span
              className={cn(
                "text-[11px] font-medium text-slate-500 dark:text-slate-400",
                language === "en"
                  ? "hidden max-w-[15rem] truncate whitespace-nowrap xl:block 2xl:max-w-none"
                  : "hidden whitespace-nowrap sm:block"
              )}
            >
              {t(dictionary.common.siteSubtitle)}
            </span>
          </span>
        </Link>

        <div className="hidden shrink-0 items-center gap-0.5 lg:flex xl:gap-1">
          {primaryNavItems.map((item) => {
            const active = isActive(item);
            const className = cn(
              "focus-ring shrink-0 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold transition xl:px-3 xl:text-sm",
              item.pending
                ? "cursor-wait text-slate-400 opacity-70 dark:text-slate-500"
                : active
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            );
            if (item.pending) {
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled
                  aria-disabled="true"
                  className={className}
                >
                  {t(item.label)}
                </button>
              );
            }
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
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
                "focus-ring max-w-[12rem] truncate rounded-full px-2.5 py-2 text-[13px] font-semibold transition xl:max-w-[14rem] xl:px-3 xl:text-sm",
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
                    link.emphasis === "primary"
                      ? link.active
                        ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25"
                        : "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 hover:-translate-y-0.5 hover:bg-cyan-300"
                      : link.active
                        ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-white dark:text-slate-950"
                        : "text-slate-700 hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                  )}
                >
                  {t(link.label)}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 xl:gap-2">
          <LanguageToggle />
          <ThemeToggle />
          {currentUser ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="focus-ring hidden h-11 items-center gap-2 whitespace-nowrap rounded-full border border-cyan-300/45 bg-white px-2.5 pr-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/15 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-55 dark:border-cyan-300/25 dark:bg-white/[0.08] dark:text-white dark:shadow-cyan-950/30 dark:hover:bg-white/[0.13] sm:inline-flex xl:px-3.5 xl:pr-4"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-400 text-slate-950 shadow-inner shadow-white/30">
                <LogoutIcon />
              </span>
              <span className="whitespace-nowrap">{t(dictionary.login.logout)}</span>
            </button>
          ) : null}
          <button
            type="button"
            aria-label={t({ en: "Open mobile menu", zh: "開啟手機選單" })}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white/75 shadow-sm lg:hidden dark:border-white/10 dark:bg-white/[0.07]"
          >
            <span aria-hidden="true" className="text-xl">{open ? "×" : "≡"}</span>
          </button>
        </div>
      </nav>

      {open ? (
        <div className="page-container pb-4 lg:hidden">
          <div className="glass-panel grid gap-1 p-2">
            {primaryNavItems.map((item) => {
              const active = isActive(item);
              const className = cn(
                "focus-ring rounded-2xl px-4 py-3 text-sm font-semibold transition",
                item.pending
                  ? "cursor-wait text-slate-400 opacity-70 dark:text-slate-500"
                  : active
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10"
              );
              if (item.pending) {
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled
                    aria-disabled="true"
                    className={className}
                  >
                    {t(item.label)}
                  </button>
                );
              }
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={className}
                >
                  {t(item.label)}
                </Link>
              );
            })}
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
                      link.emphasis === "primary"
                        ? link.active
                          ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                          : "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/15 hover:bg-cyan-300"
                        : link.active
                          ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                          : "border border-slate-200/80 bg-white/70 text-slate-700 hover:bg-slate-950/5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10"
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
