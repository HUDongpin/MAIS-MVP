"use client";

import { useSettings } from "@/components/providers/AppProviders";

type LessonGalaxyLoadingScreenProps = {
  className?: string;
  eyebrow?: string;
  message?: string;
  title?: string;
};

export function LessonGalaxyLoadingScreen({
  className,
  eyebrow,
  message,
  title
}: LessonGalaxyLoadingScreenProps) {
  const { t } = useSettings();
  const displayEyebrow = eyebrow ?? "MAIS Lesson";
  const displayMessage = message ?? t({
    en: "Preparing your learning galaxy...",
    zh: "正在準備你的學習星系...",
    zhHans: "正在准备你的学习星系..."
  });
  const displayTitle = title ?? "LEARNING GALAXY";
  const wrapperClassName = [
    "lesson-galaxy-loader fixed inset-0 z-[140] isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#050817] px-4 py-12 text-white sm:px-6",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section role="status" aria-busy="true" aria-live="polite" aria-label={displayMessage} className={wrapperClassName}>
      <style>{`
        @keyframes lesson-galaxy-loader-rise {
          from {
            opacity: 0;
            transform: translateY(38px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes lesson-galaxy-loader-breathe {
          0%,
          100% {
            opacity: 0.72;
            transform: scale(0.96);
          }

          50% {
            opacity: 1;
            transform: scale(1.04);
          }
        }

        @keyframes lesson-galaxy-loader-countdown {
          from {
            stroke-dasharray: 0 100;
          }

          to {
            stroke-dasharray: 100 100;
          }
        }

        @keyframes lesson-galaxy-loader-drift {
          to {
            background-position: 120px 90px, 150px 180px, 210px 240px;
          }
        }

        .lesson-galaxy-loader-stars {
          background-image:
            radial-gradient(circle, rgba(255, 255, 255, 0.9) 0 1px, transparent 1.6px),
            radial-gradient(circle, rgba(103, 232, 249, 0.74) 0 1px, transparent 1.5px),
            radial-gradient(circle, rgba(250, 204, 21, 0.58) 0 1px, transparent 1.5px);
          background-position: 0 0, 36px 48px, 78px 24px;
          background-size: 96px 96px, 138px 138px, 184px 184px;
          animation: lesson-galaxy-loader-drift 18s linear infinite;
        }

        .lesson-galaxy-loader-rise {
          opacity: 0;
          animation: lesson-galaxy-loader-rise 0.62s ease-out forwards;
        }

        .lesson-galaxy-loader-countdown-track {
          fill: none;
          stroke: rgba(129, 123, 147, 0.58);
          stroke-width: 13;
        }

        .lesson-galaxy-loader-countdown-progress {
          fill: none;
          filter: drop-shadow(0 0 10px rgba(103, 232, 249, 0.72));
          stroke: #67e8f9;
          stroke-linecap: round;
          stroke-width: 13;
          stroke-dasharray: 0 100;
          animation: lesson-galaxy-loader-countdown 1.8s linear forwards;
        }

        .lesson-galaxy-loader-core {
          background:
            radial-gradient(circle at 50% 50%, #ffffff 0 6%, #bdefff 7% 13%, transparent 14%),
            radial-gradient(circle at 32% 28%, rgba(103, 232, 249, 0.7) 0 20%, transparent 21%),
            radial-gradient(circle at 66% 72%, rgba(15, 23, 42, 0.82) 0 42%, transparent 43%),
            linear-gradient(145deg, #1d4ed8 0%, #0f2a59 48%, #071022 100%);
          box-shadow:
            inset -18px -24px 34px rgba(2, 6, 23, 0.42),
            inset 14px 14px 28px rgba(255, 255, 255, 0.14),
            0 0 42px rgba(103, 232, 249, 0.36),
            0 0 72px rgba(56, 189, 248, 0.22);
          animation: lesson-galaxy-loader-breathe 2.2s ease-in-out infinite;
        }

        .lesson-galaxy-loader-core::before {
          content: "";
          position: absolute;
          inset: 22%;
          border: 2px solid rgba(255, 255, 255, 0.48);
          border-left-color: rgba(103, 232, 249, 0.85);
          border-right-color: rgba(148, 163, 184, 0.72);
          border-radius: 9999px;
          filter: blur(0.2px);
          transform: rotate(-24deg) scaleX(1.72);
        }

        .lesson-galaxy-loader-core::after {
          content: "";
          position: absolute;
          inset: 38%;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.8);
          box-shadow:
            0 0 18px rgba(255, 255, 255, 0.78),
            22px -18px 0 -8px rgba(103, 232, 249, 0.7),
            -28px 20px 0 -9px rgba(125, 211, 252, 0.42);
        }

        @media (prefers-reduced-motion: reduce) {
          .lesson-galaxy-loader-stars,
          .lesson-galaxy-loader-rise,
          .lesson-galaxy-loader-countdown-progress,
          .lesson-galaxy-loader-core {
            animation: none !important;
          }

          .lesson-galaxy-loader-rise {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(135deg,#071022_0%,#0b0824_42%,#190d2f_72%,#050817_100%)]"
      />
      <div aria-hidden="true" className="lesson-galaxy-loader-stars absolute inset-0 opacity-60" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_46%,rgba(5,8,23,0.76)_100%)]"
      />

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center text-center">
        <p className="lesson-galaxy-loader-rise text-sm font-black uppercase text-cyan-200 sm:text-base">
          {displayEyebrow}
        </p>

        <h1
          className="lesson-galaxy-loader-rise mt-4 max-w-full [overflow-wrap:anywhere]"
          style={{ animationDelay: "110ms" }}
        >
          <span className="block text-4xl font-black leading-none text-white sm:text-6xl lg:text-7xl">
            {displayTitle}
          </span>
        </h1>

        <p
          className="lesson-galaxy-loader-rise mt-8 max-w-2xl text-lg font-bold leading-7 text-slate-300 sm:text-2xl"
          style={{ animationDelay: "220ms" }}
        >
          {displayMessage}
        </p>

        <div
          aria-hidden="true"
          className="lesson-galaxy-loader-rise relative mt-11 h-44 w-44 sm:h-52 sm:w-52"
          style={{ animationDelay: "330ms" }}
        >
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 200 200">
            <path
              className="lesson-galaxy-loader-countdown-track"
              d="M 100 16 a 84 84 0 1 1 0 168 a 84 84 0 1 1 0 -168"
              pathLength="100"
            />
            <path
              className="lesson-galaxy-loader-countdown-progress"
              d="M 100 16 a 84 84 0 1 1 0 168 a 84 84 0 1 1 0 -168"
              pathLength="100"
            />
          </svg>
          <div className="absolute inset-7 rounded-full bg-slate-950/80 shadow-[0_0_36px_rgba(2,6,23,0.55)]" />
          <div className="lesson-galaxy-loader-core absolute inset-10 rounded-full" />
        </div>
      </div>
    </section>
  );
}
