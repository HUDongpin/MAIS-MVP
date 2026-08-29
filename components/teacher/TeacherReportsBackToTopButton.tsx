"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";

type ScrollState = {
  progress: number;
  visible: boolean;
};

export function TeacherReportsBackToTopButton() {
  const { t } = useSettings();
  const [scrollState, setScrollState] = useState<ScrollState>({ progress: 0, visible: false });
  const label = t({ en: "Back to top", zh: "返回頂部", zhHans: "返回顶部" });

  useEffect(() => {
    let animationFrame = 0;

    const updateScrollState = () => {
      if (animationFrame) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

        setScrollState({
          progress: Math.min(1, Math.max(0, scrollTop / maxScroll)),
          visible: scrollTop > 420
        });
      });
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  function scrollToTop() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={scrollToTop}
      className={cn(
        "focus-ring group fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-[65] h-14 w-14 rounded-full transition duration-300 print:hidden sm:bottom-[calc(5.65rem+env(safe-area-inset-bottom))] sm:right-5",
        scrollState.visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full opacity-95 shadow-[0_18px_50px_rgba(14,165,233,0.28)] transition group-hover:shadow-[0_24px_68px_rgba(217,70,239,0.25)]"
        style={{
          background: `conic-gradient(from -90deg, rgba(34,211,238,0.96) ${scrollState.progress * 360}deg, rgba(148,163,184,0.24) 0deg)`,
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)"
        }}
      />
      <span aria-hidden="true" className="absolute inset-[3px] rounded-full border border-white/[0.65] bg-white/[0.92] backdrop-blur-xl dark:border-white/[0.15] dark:bg-slate-950/90" />
      <span aria-hidden="true" className="absolute inset-[7px] rounded-full bg-gradient-to-br from-cyan-400/16 via-white/0 to-fuchsia-400/18 dark:from-cyan-300/20 dark:to-fuchsia-300/16" />
      <span className="relative flex h-full w-full items-center justify-center text-slate-950 transition group-hover:-translate-y-0.5 dark:text-white">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
          <path d="M12 19V5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M6.5 10.5 12 5l5.5 5.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="pointer-events-none absolute bottom-full right-0 mb-3 hidden whitespace-nowrap rounded-full border border-slate-200/80 bg-white/95 px-3 py-1.5 text-xs font-black text-slate-700 opacity-0 shadow-lg shadow-slate-950/10 transition group-hover:-translate-y-1 group-hover:opacity-100 dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-100 sm:block">
        {label}
      </span>
    </button>
  );
}
