import { languageValues, localeForLanguage } from "@/lib/i18n";

/** localStorage key AppProviders writes the signed-out visitor's language to. */
export const LANGUAGE_STORAGE_KEY = "hk-math-language";

/**
 * Language tag map, derived from `localeForLanguage` at module load so the inline
 * bootstrap below cannot drift away from the runtime mapping.
 */
export const languageTagMap: Record<string, string> = Object.fromEntries(
  languageValues.map((language) => [language, localeForLanguage(language)])
);

export const DEFAULT_LANGUAGE_TAG = localeForLanguage("en");

/**
 * Blocking snippet injected into <head> so `<html lang>` carries the visitor's actual
 * language on the first paint.
 *
 * Why this exists: the root layout is a server component and cannot know the visitor's
 * language, so it renders a fixed default. AppProviders corrects `document.documentElement.lang`
 * — but only in an effect, after the settings request resolves. That leaves the served
 * document announcing the wrong language to assistive technology for the whole
 * pre-hydration window, which is WCAG 2.1 SC 3.1.1 (Language of Page).
 *
 * Signed-out visitors have their language in localStorage, so it can be applied before
 * first paint. Signed-in visitors' language lives in their server-side settings and is
 * still applied by AppProviders once those load.
 */
export const languageBootstrapScript = `(function(){try{var m=${JSON.stringify(
  languageTagMap
)};var v=window.localStorage.getItem(${JSON.stringify(
  LANGUAGE_STORAGE_KEY
)});document.documentElement.lang=(v&&m[v])||${JSON.stringify(DEFAULT_LANGUAGE_TAG)};}catch(e){}})();`;
