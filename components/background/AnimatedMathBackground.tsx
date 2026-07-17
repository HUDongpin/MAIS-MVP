"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "@/components/ui/Motion";

const symbols = [
  { text: "√", x: "72%", y: "68%", delay: 0.4 },
  { text: "θ", x: "39%", y: "82%", delay: 1.3 }
];

export function AnimatedMathBackground() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const hideSymbols =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/lesson") ||
    pathname.startsWith("/student/lessons");
  const showSymbols = !hideSymbols;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-y-0 left-0 z-0 w-[100dvw] max-w-full overflow-hidden bg-radial-glow">
      <div className="absolute inset-y-0 left-0 w-full opacity-[0.08] dark:opacity-[0.12]">
        <div
          className="absolute inset-y-0 left-0 w-full animate-gridPan"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,.20) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.20) 1px, transparent 1px)",
            backgroundSize: "88px 88px"
          }}
        />
      </div>
      <div className="absolute left-0 top-0 h-56 w-full bg-gradient-to-b from-cyan-400/[0.055] to-transparent dark:from-cyan-300/[0.045]" />
      {showSymbols
        ? symbols.map((symbol) => (
            <motion.div
              key={symbol.text}
              className="absolute select-none text-4xl font-black text-slate-400/[0.08] dark:text-white/[0.045] md:text-7xl"
              style={{ left: symbol.x, top: symbol.y }}
              animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 12 + symbol.delay, repeat: Infinity, ease: "easeInOut", delay: symbol.delay }}
            >
              {symbol.text}
            </motion.div>
          ))
        : null}
    </div>
  );
}
