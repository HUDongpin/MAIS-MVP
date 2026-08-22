"use client";

import { useSettings } from "@/components/providers/AppProviders";
import type { ThemeMode } from "@/types";

export type VisualizationMode = "day" | "night";

export type VisualizationTheme = {
  mode: VisualizationMode;
  surfaceClassName: string;
  paddedSurfaceClassName: string;
  compactSurfaceClassName: string;
  svgBackground: string;
  panelFill: string;
  panelStroke: string;
  grid: string;
  gridStrong: string;
  axis: string;
  axisStrong: string;
  tickText: string;
  text: string;
  textMuted: string;
  textSoft: string;
  labelFill: string;
  labelStroke: string;
  labelText: string;
  badgeFill: string;
  badgeText: string;
  softFill: string;
  emptyFill: string;
  neutralStroke: string;
  pointStroke: string;
};

const dayVisualizationTheme: VisualizationTheme = {
  mode: "day",
  surfaceClassName: "border-slate-200/80 bg-white shadow-sm shadow-slate-900/5",
  paddedSurfaceClassName: "rounded-3xl border border-slate-200/80 bg-white p-3 shadow-sm shadow-slate-900/5 sm:p-5",
  compactSurfaceClassName: "rounded-3xl border border-slate-200/80 bg-white p-2 shadow-sm shadow-slate-900/5 sm:p-3",
  svgBackground: "#ffffff",
  panelFill: "rgba(248, 250, 252, 0.88)",
  panelStroke: "rgba(15, 23, 42, 0.16)",
  grid: "rgba(15, 23, 42, 0.10)",
  gridStrong: "rgba(15, 23, 42, 0.18)",
  axis: "rgba(71, 85, 105, 0.72)",
  axisStrong: "#334155",
  tickText: "#64748b",
  text: "#0f172a",
  textMuted: "#475569",
  textSoft: "#64748b",
  labelFill: "rgba(255, 255, 255, 0.94)",
  labelStroke: "rgba(14, 165, 183, 0.42)",
  labelText: "#0f766e",
  badgeFill: "rgba(236, 254, 255, 0.92)",
  badgeText: "#155e75",
  softFill: "rgba(14, 165, 233, 0.10)",
  emptyFill: "rgba(15, 23, 42, 0.07)",
  neutralStroke: "#475569",
  pointStroke: "#0f172a"
};

const nightVisualizationTheme: VisualizationTheme = {
  mode: "night",
  surfaceClassName: "border-white/10 bg-slate-950",
  paddedSurfaceClassName: "rounded-3xl border border-white/10 bg-slate-950 p-3 sm:p-5",
  compactSurfaceClassName: "rounded-3xl border border-white/10 bg-slate-950 p-2 sm:p-3",
  svgBackground: "#020617",
  panelFill: "rgba(255, 255, 255, 0.025)",
  panelStroke: "rgba(255, 255, 255, 0.10)",
  grid: "rgba(255, 255, 255, 0.10)",
  gridStrong: "rgba(255, 255, 255, 0.16)",
  axis: "rgba(255, 255, 255, 0.38)",
  axisStrong: "rgba(255, 255, 255, 0.72)",
  tickText: "rgba(255, 255, 255, 0.60)",
  text: "#f8fafc",
  textMuted: "rgba(255, 255, 255, 0.72)",
  textSoft: "rgba(255, 255, 255, 0.45)",
  labelFill: "rgba(15, 23, 42, 0.92)",
  labelStroke: "rgba(103, 232, 249, 0.45)",
  labelText: "#cffafe",
  badgeFill: "rgba(15, 23, 42, 0.88)",
  badgeText: "#cffafe",
  softFill: "rgba(255, 255, 255, 0.14)",
  emptyFill: "rgba(255, 255, 255, 0.08)",
  neutralStroke: "#ffffff",
  pointStroke: "#ffffff"
};

export function visualizationThemeForTheme(theme: ThemeMode) {
  return theme === "dark" ? nightVisualizationTheme : dayVisualizationTheme;
}

export function useVisualizationTheme() {
  const { theme } = useSettings();
  return visualizationThemeForTheme(theme);
}
