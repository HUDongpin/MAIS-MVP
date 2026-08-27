import { createElement, type ComponentType, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsContext } from "@/components/providers/AppProviders";
import type { LocalizedText, ThemeMode } from "@/types";

/**
 * Renders a lesson visualization to static markup.
 *
 * Why this exists: every visualization test in this repo asserts against source
 * text rather than rendered output, because mounting one needs `useSettings`,
 * which needs `AppProviders`, which needs Next's app router. The consequence was
 * that a component rendering blank — throwing under real props, or silently
 * emitting nothing — was undetectable by any check.
 *
 * The lab components use exactly three things from settings (`recordLearningEvent`,
 * `t`, and `theme` via `useVisualizationTheme`), so a small double is enough. It is
 * deliberately not a mock framework: no module interception, no experimental
 * flags, nothing that behaves differently in CI.
 */

export type RenderLessonVisualizationOptions = {
  /** Language the localized-text resolver returns. Defaults to English. */
  language?: "en" | "zh";
  theme?: ThemeMode;
};

export type LessonVisualizationRenderResult = {
  html: string;
  /** Learning events the component emitted during render, if any. */
  events: Array<Record<string, unknown>>;
};

function localizedTextResolver(language: "en" | "zh") {
  return (value: LocalizedText | string | undefined | null): string => {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    const localized = value as Record<string, unknown>;
    const preferred = localized[language];
    if (typeof preferred === "string") return preferred;
    const fallback = localized.en ?? localized.zh;
    return typeof fallback === "string" ? fallback : "";
  };
}

/**
 * Renders `component` with the settings context supplied directly.
 *
 * Throws whatever the component throws — a render failure must surface as a test
 * failure, not be swallowed into an empty string.
 */
export function renderLessonVisualization(
  component: ComponentType<{ topicId?: string }>,
  topicId: string,
  options: RenderLessonVisualizationOptions = {}
): LessonVisualizationRenderResult {
  const language = options.language ?? "en";
  const events: Array<Record<string, unknown>> = [];

  const settings = {
    language,
    theme: options.theme ?? "light",
    t: localizedTextResolver(language),
    recordLearningEvent: (event: Record<string, unknown>) => {
      events.push(event);
    }
  } as unknown as Parameters<typeof SettingsContext.Provider>[0]["value"];

  const tree: ReactElement = createElement(
    SettingsContext.Provider,
    { value: settings },
    createElement(component, { topicId })
  );

  return { html: renderToStaticMarkup(tree), events };
}

/** Visible text content, with tags and SVG attribute noise stripped. */
export function visibleText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
