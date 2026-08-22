import {
  chinaLessonEnglishTranslation,
  withChinaLessonEnglishTranslation
} from "@/data/chinaLessonEnglishTranslations";
import {
  chinaLessonTraditionalTranslation,
  withChinaLessonTraditionalTranslation
} from "@/data/chinaLessonTraditionalTranslations";
import { toTraditionalHjbText } from "@/data/hjbQuestionLocalization";
import { toPrcSimplifiedText } from "@/lib/i18n";
import { answerMatches } from "@/lib/server/answerMatching";
import type { LocalizedText, QuestionType } from "@/types";

type CorrectAnswerFeedbackSource = {
  type: QuestionType;
  answer: string;
  acceptedAnswers?: string[] | null;
  options?: LocalizedText[] | null;
};

const cjkPattern = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;

function numericalTokens(value: string) {
  const normalizedUnits = value
    .replace(/零下\s*(?=\d)/gu, "-")
    .replace(/\b(cm|m|km)\^(?:2|3)\b/giu, "$1");
  return Array.from(
    normalizedUnits.matchAll(/[-+]?\d+(?:\.\d+)?(?:\s*\/\s*[-+]?\d+(?:\.\d+)?)?/gu),
    (match) => match[0].replace(/\s+/gu, "").toLowerCase()
  );
}

function cjkAliasMatchesCanonical(canonical: string, alias: string) {
  if (!cjkPattern.test(alias)) return false;
  if (answerMatches(canonical, alias)) return true;
  const translatedEnglish = chinaLessonEnglishTranslation(alias);
  if (translatedEnglish && answerMatches(canonical, translatedEnglish)) return true;
  const canonicalTokens = numericalTokens(canonical);
  const aliasTokens = numericalTokens(alias);
  return canonicalTokens.length === aliasTokens.length
    && canonicalTokens.every((token, index) => token === aliasTokens[index]);
}

function matchingLocalizedOption(source: CorrectAnswerFeedbackSource) {
  const options = source.options ?? [];
  const canonicalLetterKey = source.answer.trim().toUpperCase();
  if (/^[A-F]$/.test(canonicalLetterKey)) {
    const literalOption = options.find((option) =>
      [option.en, option.zh, option.zhHans ?? ""].some(
        (optionText) => optionText.normalize("NFKC").trim().toUpperCase() === canonicalLetterKey
      )
    );
    if (literalOption) return literalOption;

    const keyedOption = options[canonicalLetterKey.charCodeAt(0) - "A".charCodeAt(0)];
    if (keyedOption) return keyedOption;
  }

  const acceptedAnswers = [source.answer, ...(source.acceptedAnswers ?? [])];
  return options.find((option) => {
    const localizedOptionTexts = [option.en, option.zh, option.zhHans ?? ""].filter(Boolean);
    return acceptedAnswers.some((answer) =>
      localizedOptionTexts.some((optionText) => answerMatches(answer, optionText))
    );
  });
}

function safeLocalizedOption(option: LocalizedText): LocalizedText | undefined {
  const withEnglish = cjkPattern.test(option.en)
    ? withChinaLessonEnglishTranslation(option)
    : option;
  const translated = withEnglish.zhHans?.trim() && withEnglish.zh.trim() === withEnglish.zhHans.trim()
    ? withChinaLessonTraditionalTranslation(withEnglish)
    : withEnglish;
  const en = translated.en.trim();
  const zh = translated.zh.trim();
  const zhHans = translated.zhHans?.trim();
  if (!en || !zh || cjkPattern.test(en)) return undefined;
  return {
    en,
    zh,
    ...(zhHans ? { zhHans } : {})
  };
}

/**
 * Builds the post-submission answer shown to a learner without returning the
 * canonical grading key. Multiple-choice questions use the matching localized
 * option. CJK free responses require both validated static-map translations;
 * while an incremental translation pass is pending, the answer is omitted and
 * the already-localized worked explanation remains available to the client.
 */
export function localizedCorrectAnswerForFeedback(
  source: CorrectAnswerFeedbackSource
): LocalizedText | undefined {
  if (source.type === "multiple-choice") {
    const option = matchingLocalizedOption(source);
    if (option) return safeLocalizedOption(option);
  }

  const answer = source.answer.trim();
  if (!answer) return undefined;
  if (!cjkPattern.test(answer)) {
    const localizedAlias = (source.acceptedAnswers ?? [])
      .map((alias) => alias.trim())
      .find((alias) => cjkAliasMatchesCanonical(answer, alias));
    if (localizedAlias) {
      return {
        en: answer,
        zh: chinaLessonTraditionalTranslation(localizedAlias) ?? toTraditionalHjbText(localizedAlias),
        zhHans: toPrcSimplifiedText(localizedAlias)
      };
    }
    return { en: answer, zh: answer };
  }

  const en = chinaLessonEnglishTranslation(answer);
  const zh = chinaLessonTraditionalTranslation(answer);
  if (!en || !zh || cjkPattern.test(en)) return undefined;

  return {
    en,
    zh,
    zhHans: answer
  };
}
