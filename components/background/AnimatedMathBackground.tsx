"use client";

import { motion, useReducedMotion } from "@/components/ui/Motion";

const symbols = [
  { text: "∫", x: "8%", y: "18%", delay: 0 },
  { text: "√", x: "72%", y: "68%", delay: 0.4 },
  { text: "f(x)", x: "40%", y: "13%", delay: 2.2 },
  { text: "θ", x: "39%", y: "82%", delay: 1.3 }
];

export function AnimatedMathBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-radial-glow">
      <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12]">
        <div
          className="absolute inset-0 animate-gridPan"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,.20) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.20) 1px, transparent 1px)",
            backgroundSize: "88px 88px"
          }}
        />
      </div>
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-cyan-400/[0.055] to-transparent dark:from-cyan-300/[0.045]" />
      {symbols.map((symbol) => (
        <motion.div
          key={symbol.text}
          className="absolute select-none text-4xl font-black text-slate-400/[0.08] dark:text-white/[0.045] md:text-7xl"
          style={{ left: symbol.x, top: symbol.y }}
          animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 12 + symbol.delay, repeat: Infinity, ease: "easeInOut", delay: symbol.delay }}
        >
          {symbol.text}
        </motion.div>
      ))}
    </div>
  );
}
