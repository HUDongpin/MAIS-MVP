import { createElement, type ComponentType, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsContext } from "@/components/providers/AppProviders";
import type { LocalizedText, ThemeMode } from "@/types";

/**
 * Renders real lesson components to static markup with a small settings double.
 * AppProviders needs Next's app router; supplying its context directly lets this
 * focused SSR check exercise the components without mounting the application.
 *
 * This checks initial markup and render errors. It complements browser tests;
 * it does not exercise hydration, effects, interactions or CSS visibility.
 * The double supplies language, translation, theme and learning-event recording
 * used by these components. There is no module interception.
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

/** Text extracted from static markup; does not establish CSS visibility. */
export function visibleText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
