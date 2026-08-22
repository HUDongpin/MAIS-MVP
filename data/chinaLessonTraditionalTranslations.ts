import translationJson from "./chinaLessonTraditionalTranslations.json";
import type { LocalizedText, Question, Topic } from "@/types";
import type { ProductionLessonSeed } from "./lessons";

const translations = translationJson as Record<string, string>;

const traditionalSemanticPhraseCorrections: ReadonlyArray<[string, string]> = [
  // Foundation's character-level conversion chooses 簽 for 签, but the
  // learner-facing noun 书签 means a bookmark and must be 書籤.
  ["書簽", "書籤"],
  // Hong Kong Education Bureau mathematics materials use 厘米. Foundation's
  // character conversion changes 厘 to 釐, so restore the official unit term.
  ["釐米", "厘米"]
] as const;

export function normalizeChinaLessonTraditionalSemantics(value: string) {
  return traditionalSemanticPhraseCorrections.reduce(
    (current, [source, replacement]) => current.replaceAll(source, replacement),
    value
  );
}

export function chinaLessonTraditionalTranslationKey(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

export function chinaLessonTraditionalTranslation(value: string) {
  const translated = translations[chinaLessonTraditionalTranslationKey(value)]?.trim();
  return translated ? normalizeChinaLessonTraditionalSemantics(translated) : undefined;
}

export function withChinaLessonTraditionalTranslation(value: LocalizedText): LocalizedText {
  // Some reviewed PEP sources predate the explicit zhHans field and store
  // Simplified Chinese in `zh`. They still need a Traditional learner-facing
  // value, so use zhHans when present and otherwise translate the zh source.
  const source = value.zhHans?.trim() || value.zh.trim();
  if (!source) return value;
  const translated = chinaLessonTraditionalTranslation(source);
  // Preserve the original source explicitly for the Simplified runtime. This
  // also keeps the generator's completeness scan stable after the runtime zh
  // field has been replaced with Traditional Chinese.
  return translated ? { ...value, zh: translated, zhHans: value.zhHans ?? source } : value;
}

export function withChinaQuestionTraditionalTranslations(question: Question): Question {
  if (question.curriculumTrack !== "MAINLAND_PEP_HIGH") return question;
  return {
    ...question,
    topic: withChinaLessonTraditionalTranslation(question.topic),
    prompt: withChinaLessonTraditionalTranslation(question.prompt),
    options: question.options?.map(withChinaLessonTraditionalTranslation),
    explanation: withChinaLessonTraditionalTranslation(question.explanation),
    questionAssets: question.questionAssets?.map((asset) => ({
      ...asset,
      alt: withChinaLessonTraditionalTranslation(asset.alt),
      caption: asset.caption ? withChinaLessonTraditionalTranslation(asset.caption) : undefined
    }))
  };
}

export function withChinaTopicTraditionalTranslations(topic: Topic): Topic {
  if (topic.curriculumTrack !== "MAINLAND_PEP_HIGH") return topic;
  return {
    ...topic,
    title: withChinaLessonTraditionalTranslation(topic.title),
    description: withChinaLessonTraditionalTranslation(topic.description)
  };
}

export function withChinaLessonSeedTraditionalTranslations(seed: ProductionLessonSeed): ProductionLessonSeed {
  return {
    ...seed,
    title: withChinaLessonTraditionalTranslation(seed.title),
    description: withChinaLessonTraditionalTranslation(seed.description),
    blocks: seed.blocks.map((block) => ({
      ...block,
      title: withChinaLessonTraditionalTranslation(block.title),
      content: block.content ? withChinaLessonTraditionalTranslation(block.content) : undefined,
      items: block.items?.map(withChinaLessonTraditionalTranslation)
    }))
  };
}
