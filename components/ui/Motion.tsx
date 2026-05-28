"use client";

import * as motion from "framer-motion/client";
import { useEffect, useState, type ReactNode } from "react";

type AnimatePresenceProps = {
  children?: ReactNode;
  initial?: boolean;
  custom?: unknown;
  mode?: string;
  onExitComplete?: () => void;
  presenceAffectsLayout?: boolean;
  propagate?: boolean;
};

function AnimatePresence({ children }: AnimatePresenceProps) {
  return <>{children}</>;
}

function useReducedMotion() {
  const [shouldReduceMotion, setShouldReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setShouldReduceMotion(false);
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setShouldReduceMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return shouldReduceMotion;
}

export { AnimatePresence, motion, useReducedMotion };
