import translationJson from "./chinaLessonEnglishTranslations.json";
import type { LocalizedText, Question } from "@/types";
import type { ProductionLessonSeed } from "./lessons";

const translations = translationJson as Record<string, string>;
const generatedEnglishTranslationPublishers = new Set(["MAINLAND_BNU", "MAINLAND_HJB"]);

function isGeneratedEnglishTranslationTopic(topicId: string) {
  return topicId.startsWith("bnu-") || topicId.startsWith("hjb-");
}

export function chinaLessonEnglishTranslationKey(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

export function chinaLessonEnglishTranslation(value: string) {
  return translations[chinaLessonEnglishTranslationKey(value)]?.trim() || undefined;
}

export function withChinaLessonEnglishTranslation(value: LocalizedText): LocalizedText {
  const source = value.zhHans ?? value.zh;
  const translated = chinaLessonEnglishTranslation(source);
  return translated ? { ...value, en: translated } : value;
}

export function withChinaQuestionEnglishTranslations(question: Question): Question {
  if (!question.publisher || !generatedEnglishTranslationPublishers.has(question.publisher)) return question;
  return {
    ...question,
    topic: withChinaLessonEnglishTranslation(question.topic),
    prompt: withChinaLessonEnglishTranslation(question.prompt),
    options: question.options?.map(withChinaLessonEnglishTranslation),
    explanation: withChinaLessonEnglishTranslation(question.explanation),
    questionAssets: question.questionAssets?.map((asset) => ({
      ...asset,
      alt: withChinaLessonEnglishTranslation(asset.alt),
      caption: asset.caption ? withChinaLessonEnglishTranslation(asset.caption) : undefined
    }))
  };
}

export function withChinaLessonSeedEnglishTranslations(seed: ProductionLessonSeed): ProductionLessonSeed {
  if (!isGeneratedEnglishTranslationTopic(seed.topicId)) return seed;
  return {
    ...seed,
    title: withChinaLessonEnglishTranslation(seed.title),
    description: withChinaLessonEnglishTranslation(seed.description),
    blocks: seed.blocks.map((block) => ({
      ...block,
      title: withChinaLessonEnglishTranslation(block.title),
      content: block.content ? withChinaLessonEnglishTranslation(block.content) : undefined,
      items: block.items?.map(withChinaLessonEnglishTranslation)
    }))
  };
}
