"use client";

import Image from "next/image";
import Link from "next/link";
import maisHomeBackground4k from "@/components/home/brand-assets/pedanova-home-background-20260809-owner-selected-white-stylus.png";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import type { LocalizedText } from "@/types";

// The headline keeps the original two-line, blue-accent design: each line renders an
// accented segment (#1262d7) followed by a plain segment, so every language can define
// its own split without breaking the coloured styling.
const heroTagline: LocalizedText = {
  en: "Math AI System",
  zh: "數學人工智能系統",
  zhHans: "数学人工智能系统"
};
const headlineLine1Accent: LocalizedText = { en: "Math learning", zh: "數學學習", zhHans: "数学学习" };
const headlineLine1Plain: LocalizedText = { en: " should be", zh: "應該", zhHans: "应该" };
const headlineLine2Accent: LocalizedText = { en: "fun and personalized", zh: "既有趣又個人化", zhHans: "既有趣又个性化" };
const headlineLine2Plain: LocalizedText = { en: "!", zh: "！", zhHans: "！" };

export function PedaNovaHomeHero() {
  const { t, text } = useSettings();
  const startLearningLabel = t(dictionary.common.startLearning);

  return (
    <section
      id="pedanova-home-hero"
      data-pedanova-home
      className="relative isolate min-h-[calc(100svh-7.5rem)] overflow-hidden bg-[#edf5fb] sm:min-h-[calc(100dvh-4rem)]"
    >
      <style>{`
        body:has(#pedanova-home-hero) button[aria-label="AI Tutor"] {
          display: none !important;
        }

        body:has(#pedanova-home-hero) main.flex-1 {
          padding-bottom: 0 !important;
        }

        .pedanova-copy-rail {
          left: max(1.25rem, calc((100vw - 80rem) / 2 + 2rem));
        }

        .pedanova-photo-humanized {
          filter: saturate(0.98) contrast(0.99) brightness(1);
        }

        .pedanova-right-edge-fill {
          background-repeat: no-repeat;
          background-size: auto 100%;
          background-position: right center;
          filter: saturate(0.98) contrast(0.99) brightness(1);
        }

        .pedanova-mobile-photo {
          background-repeat: no-repeat;
          background-size: auto 88%;
          background-position: 92% 0;
          filter: saturate(1.04) contrast(1.04) brightness(1.01);
        }

        .pedanova-human-photo-grain {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='table' tableValues='0 0.52'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.58'/%3E%3C/svg%3E");
          background-size: 180px 180px;
          mask-image: linear-gradient(90deg, transparent 0%, transparent 34%, rgba(0, 0, 0, 0.4) 45%, black 56%, black 100%);
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 34%, rgba(0, 0, 0, 0.4) 45%, black 56%, black 100%);
          mix-blend-mode: soft-light;
          opacity: 0.11;
        }

        .pedanova-human-photo-wash {
          background:
            radial-gradient(circle at 72% 39%, rgba(255, 231, 210, 0.18), transparent 20%),
            radial-gradient(circle at 63% 58%, rgba(255, 214, 188, 0.13), transparent 19%),
            linear-gradient(90deg, transparent 0%, transparent 38%, rgba(15, 23, 42, 0.035) 58%, rgba(15, 23, 42, 0.06) 100%);
          mask-image: linear-gradient(90deg, transparent 0%, transparent 35%, rgba(0, 0, 0, 0.5) 48%, black 61%, black 100%);
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 35%, rgba(0, 0, 0, 0.5) 48%, black 61%, black 100%);
          mix-blend-mode: soft-light;
          opacity: 0.72;
        }

        .pedanova-human-photo-soften {
          -webkit-backdrop-filter: blur(0.28px);
          backdrop-filter: blur(0.28px);
          background: rgba(255, 255, 255, 0.01);
          mask-image: linear-gradient(90deg, transparent 0%, transparent 39%, rgba(0, 0, 0, 0.45) 52%, black 64%, black 100%);
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 39%, rgba(0, 0, 0, 0.45) 52%, black 64%, black 100%);
        }

        @media (max-width: 639px) {
          .pedanova-copy-rail {
            left: 50%;
            transform: translateX(-50%);
          }

          a.pedanova-copy-rail:hover {
            transform: translate(-50%, -0.125rem);
          }

          .pedanova-human-photo-soften {
            display: none;
          }

          .pedanova-mobile-photo {
            background-size: auto max(40.48rem, calc(88svh - 3.52rem));
          }

          .pedanova-human-photo-wash {
            opacity: 0.24;
          }

          .pedanova-human-photo-grain {
            opacity: 0.035;
          }

          .pedanova-mobile-readable-copy {
            text-shadow:
              0 1px 0 rgba(255, 255, 255, 0.82),
              0 6px 18px rgba(255, 255, 255, 0.74);
          }
        }
      `}</style>
      <div className="relative mx-auto h-[calc(100svh-7.5rem)] min-h-[36rem] w-full max-w-[3840px] overflow-hidden max-sm:min-h-[43.25rem] sm:h-[calc(100dvh-4rem)]">
        <span
          aria-hidden="true"
          className="pedanova-right-edge-fill pointer-events-none absolute inset-y-0 right-0 z-0 w-[18vw] min-w-28 max-sm:hidden"
          style={{ backgroundImage: `url(${maisHomeBackground4k.src})` }}
        />
        <span
          aria-hidden="true"
          className="pedanova-mobile-photo pointer-events-none absolute inset-0 z-[1] hidden max-sm:block"
          style={{ backgroundImage: `url(${maisHomeBackground4k.src})` }}
        />
        <Image
          src={maisHomeBackground4k}
          alt=""
          aria-hidden="true"
          priority
          sizes="100vw"
          fill
          className="pedanova-photo-humanized z-[1] select-none object-cover object-[58%_center] transform-gpu max-sm:hidden sm:-translate-x-[2.1%] sm:scale-[1.075]"
          draggable={false}
        />
        <span aria-hidden="true" className="pedanova-human-photo-soften pointer-events-none absolute inset-0 z-[2]" />
        <span aria-hidden="true" className="pedanova-human-photo-wash pointer-events-none absolute inset-0 z-[3]" />
        <span aria-hidden="true" className="pedanova-human-photo-grain pointer-events-none absolute inset-0 z-[4]" />
        <div className="pedanova-copy-rail absolute top-[11.6%] z-20 w-auto text-left max-sm:top-[1.4%] max-sm:w-[74%] max-sm:text-center">
          <div className="pt-2 max-sm:px-4 max-sm:py-3 sm:pt-3 xl:pt-4">
            <p className="text-5xl font-black leading-[0.95] tracking-normal text-[#080d21] max-sm:text-[2.75rem] sm:text-6xl lg:text-7xl 2xl:text-[5.6rem]">
              {t(dictionary.home.brand)}
            </p>
            <p className="mt-4 text-base font-medium leading-none tracking-normal text-[#5e6574] max-sm:mt-3 max-sm:max-w-none max-sm:text-[1rem] max-sm:leading-tight sm:text-xl lg:text-2xl 2xl:text-[1.82rem]">
              {text(heroTagline)}
            </p>
          </div>
        </div>

        <h1 className="pedanova-copy-rail pedanova-mobile-readable-copy absolute top-[39%] z-20 w-[74%] max-w-[66rem] text-[1.9rem] font-bold leading-[1.08] tracking-normal text-[#070b1d] max-sm:top-[54.2%] max-sm:w-[82%] max-sm:rounded-[1.1rem] max-sm:bg-white/80 max-sm:px-3.5 max-sm:py-2.5 max-sm:text-center max-sm:text-[1.42rem] max-sm:leading-[1.05] max-sm:shadow-[0_16px_36px_rgba(15,23,42,0.13),inset_0_1px_0_rgba(255,255,255,0.88)] max-sm:ring-1 max-sm:ring-white/80 max-sm:backdrop-blur-sm sm:text-[2.45rem] lg:text-[3.15rem] 2xl:text-[3.55rem]">
          <span className="block">
            <span className="text-[#1262d7]">{text(headlineLine1Accent)}</span>
            <span>{text(headlineLine1Plain)}</span>
          </span>
          <span className="block">
            <span className="text-[#1262d7]">{text(headlineLine2Accent)}</span>
            <span>{text(headlineLine2Plain)}</span>
          </span>
        </h1>

        <Link
          href="/login"
          aria-label={startLearningLabel}
          className="pedanova-copy-rail absolute top-[59.8%] z-20 flex h-[clamp(3.2rem,4vw,5.1rem)] w-[clamp(17rem,18vw,23rem)] items-center rounded-full bg-[linear-gradient(105deg,rgba(191,250,242,0.96)_0%,rgba(108,228,166,0.96)_57%,rgba(170,237,89,0.98)_100%)] pl-[clamp(1.05rem,1.55vw,2rem)] pr-[clamp(1rem,1.4vw,1.75rem)] text-[#05091d] shadow-[0_14px_30px_rgba(58,205,157,0.16)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(58,205,157,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#19d7ed]/45 max-sm:top-[calc(100%-4rem)] max-sm:h-12 max-sm:w-[70%] max-sm:pl-5 max-sm:pr-4 max-sm:shadow-[0_14px_30px_rgba(58,205,157,0.16)]"
        >
          <span className="relative mr-[clamp(0.7rem,0.9vw,1.15rem)] flex aspect-square h-[64%] shrink-0 items-center justify-center rounded-full bg-white/72 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.78)] max-sm:mr-6 max-sm:h-9">
            <svg className="h-[64%] w-[64%] translate-y-[3%] text-[#05091d]" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path
                d="M12.5 25.6 21.2 34.2 36.2 15.8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="7.2"
              />
            </svg>
          </span>
          <span className="min-w-0 whitespace-nowrap text-[clamp(1.1rem,1.6vw,1.72rem)] font-black leading-none tracking-normal max-sm:text-[1.06rem]">
            {startLearningLabel}
          </span>
          <span className="absolute right-[3.5%] top-[-10%] rounded-full bg-[#060b1f] px-[clamp(0.48rem,0.65vw,0.82rem)] py-[clamp(0.2rem,0.3vw,0.36rem)] text-[clamp(0.65rem,0.78vw,0.82rem)] font-black leading-none tracking-normal text-white shadow-[0_8px_16px_rgba(5,9,29,0.14)] max-sm:-right-1 max-sm:-top-2 max-sm:px-1.5 max-sm:py-0.5 max-sm:text-[0.62rem]">
            XP
          </span>
        </Link>
      </div>
    </section>
  );
}
