"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import type { LocalizedText } from "@/types";

type GuestPromptRouteKey = "lesson" | "practice" | "personalized-learning" | "visualization";

type GuestPromptRoute = {
  key: GuestPromptRouteKey;
  label: LocalizedText;
};

const promptDelayMs = 10_000;
// After a meaningful interaction (a control press, typing, a drag), wait for a
// quiet gap of this length before opening so the prompt never interrupts an
// in-flight action. Idle guests are unaffected and still see it at promptDelayMs.
const interactionGraceMs = 3_500;
const dismissalStoragePrefix = "mais-guest-login-prompt-dismissed";

function guestPromptRouteForPathname(pathname: string): GuestPromptRoute | null {
  if (pathname === "/lesson" || pathname.startsWith("/lesson/") || pathname === "/student/lessons" || pathname.startsWith("/student/lessons/")) {
    return {
      key: "lesson",
      label: { en: "Lesson", zh: "課節", zhHans: "课时" }
    };
  }

  if (pathname === "/practice") {
    return {
      key: "practice",
      label: { en: "Practice Arena", zh: "練習場", zhHans: "练习场" }
    };
  }

  if (pathname === "/personalized-learning") {
    return {
      key: "personalized-learning",
      label: { en: "Personalized Learning", zh: "個人化學習", zhHans: "个性化学习" }
    };
  }

  if (pathname === "/visualization-lab" || pathname === "/student/tools/visualizations" || pathname.startsWith("/student/tools/visualizations/")) {
    return {
      key: "visualization",
      label: { en: "Visualization Lab", zh: "可視化實驗室", zhHans: "可视化实验室" }
    };
  }

  return null;
}

function dismissalStorageKey(routeKey: GuestPromptRouteKey) {
  return `${dismissalStoragePrefix}:${routeKey}`;
}

function readCurrentPath(pathname: string) {
  if (typeof window === "undefined") return pathname;
  return `${window.location.pathname}${window.location.search}`;
}

export function GuestLoginPromptGate() {
  const pathname = usePathname();
  const { currentUser, settingsReady, t } = useSettings();
  const route = useMemo(() => guestPromptRouteForPathname(pathname), [pathname]);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedRouteKey, setDismissedRouteKey] = useState<GuestPromptRouteKey | null>(null);
  const [nextPath, setNextPath] = useState(pathname);
  const lastInteractionAtRef = useRef(0);
  const dialogRef = useRef<HTMLElement | null>(null);
  const routeKey = route?.key ?? null;
  const canPrompt = Boolean(settingsReady && !currentUser && route && dismissedRouteKey !== route.key);
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(nextPath)}`;

  useEffect(() => {
    setNextPath(readCurrentPath(pathname));
  }, [pathname]);

  useEffect(() => {
    if (!routeKey) {
      setDismissedRouteKey(null);
      setIsOpen(false);
      return;
    }

    try {
      const wasDismissed = window.sessionStorage.getItem(dismissalStorageKey(routeKey)) === "true";
      setDismissedRouteKey(wasDismissed ? routeKey : null);
      if (wasDismissed) setIsOpen(false);
    } catch {
      setDismissedRouteKey(null);
    }
  }, [routeKey]);

  useEffect(() => {
    if (!canPrompt) {
      setIsOpen(false);
      return;
    }

    lastInteractionAtRef.current = 0;
    const markInteraction = () => {
      lastInteractionAtRef.current = Date.now();
    };
    // Only defer for interactions that imply the guest is mid-task; passive
    // pointer movement should not hold the prompt back indefinitely.
    window.addEventListener("pointerdown", markInteraction, true);
    window.addEventListener("keydown", markInteraction, true);
    window.addEventListener("input", markInteraction, true);

    let handle = 0;
    const scheduleOpen = (delay: number) => {
      handle = window.setTimeout(() => {
        const quietFor = Date.now() - lastInteractionAtRef.current;
        if (lastInteractionAtRef.current !== 0 && quietFor < interactionGraceMs) {
          scheduleOpen(interactionGraceMs - quietFor);
          return;
        }
        setIsOpen(true);
      }, delay);
    };
    scheduleOpen(promptDelayMs);

    return () => {
      window.clearTimeout(handle);
      window.removeEventListener("pointerdown", markInteraction, true);
      window.removeEventListener("keydown", markInteraction, true);
      window.removeEventListener("input", markInteraction, true);
    };
  }, [canPrompt, pathname]);

  const dismissPrompt = useCallback(() => {
    if (routeKey) {
      try {
        window.sessionStorage.setItem(dismissalStorageKey(routeKey), "true");
      } catch {
        // Session storage is only used to avoid repeating the same prompt.
      }
      setDismissedRouteKey(routeKey);
    }
    setIsOpen(false);
  }, [routeKey]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusableElements = () =>
      Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter(
        (element) => element.offsetParent !== null || element === document.activeElement
      );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissPrompt();
        return;
      }
      if (event.key !== "Tab") return;

      // Trap focus inside the modal so keyboard users cannot tab into the
      // inert page behind it.
      const elements = focusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!dialogRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown, true);
    (focusableElements()[0] ?? dialogRef.current)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [dismissPrompt, isOpen]);

  if (!isOpen || !route || currentUser || !settingsReady) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-login-prompt-title"
        aria-describedby="guest-login-prompt-description"
        tabIndex={-1}
        className="focus-ring relative w-full max-w-[34rem] overflow-hidden rounded-[1.35rem] border border-white/80 bg-white p-5 text-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.38)] dark:border-white/10 dark:bg-slate-950 dark:text-white sm:p-6"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_24%_12%,rgba(34,211,238,0.28),transparent_34%),radial-gradient(circle_at_78%_10%,rgba(167,139,250,0.22),transparent_30%)]" aria-hidden="true" />
        <button
          type="button"
          onClick={dismissPrompt}
          aria-label={t({ en: "Close login prompt", zh: "關閉登入提示", zhHans: "关闭登录提示" })}
          className="focus-ring absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-slate-200/80 bg-white/85 text-xl font-black leading-none text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-300 dark:hover:text-white"
        >
          ×
        </button>

        <div className="relative pr-10">
          <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:border-cyan-200/25 dark:bg-cyan-300/10 dark:text-cyan-100">
            {t(route.label)}
          </span>
          <h2 id="guest-login-prompt-title" className="mt-4 text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">
            {t({ en: "Save your progress with a MAIS account", zh: "登入 MAIS 帳戶以保存學習進度", zhHans: "登录 MAIS 账号以保存学习进度" })}
          </h2>
          <p id="guest-login-prompt-description" className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300 sm:text-base sm:leading-7">
            {t({
              en: "You can keep exploring as a guest. Sign in or register to keep lesson progress, practice evidence, and personalized recommendations across devices.",
              zh: "你可以繼續以訪客身份探索。登入或註冊後，可跨裝置保存課節進度、練習紀錄與個人化建議。",
              zhHans: "你可以继续以游客身份探索。登录或注册后，可跨设备保存课时进度、练习记录与个性化建议。"
            })}
          </p>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-[1fr_1fr]">
          <Link
            href={loginHref}
            className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl shadow-slate-950/15 transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
          >
            {t(dictionary.nav.login)}
          </Link>
          <Link
            href={registerHref}
            className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full border border-cyan-300/70 bg-cyan-400/15 px-5 py-3 text-sm font-black text-cyan-800 shadow-lg shadow-cyan-500/10 transition hover:-translate-y-0.5 hover:bg-cyan-400/25 dark:border-cyan-200/30 dark:text-cyan-100"
          >
            {t({ en: "Register", zh: "註冊", zhHans: "注册" })}
          </Link>
        </div>

        <button
          type="button"
          onClick={dismissPrompt}
          className="focus-ring relative mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-900/5 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          {t({ en: "Continue as guest", zh: "繼續以訪客身份使用", zhHans: "继续以游客身份使用" })}
        </button>
      </section>
    </div>
  );
}
