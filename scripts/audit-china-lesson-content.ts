import { existsSync } from "node:fs";
import path from "node:path";
import * as katex from "katex";
import { productionLessonSeeds, type ProductionLessonBlock, type ProductionLessonSeed } from "@/data/lessons";
import { questions } from "@/data/questions";
import { topics } from "@/data/topics";
import { chinaLessonTraditionalTranslation } from "@/data/chinaLessonTraditionalTranslations";
import { toTraditionalHjbText } from "@/data/hjbQuestionLocalization";
import { textForLanguage, toPrcSimplifiedText, traditionalToSimplified } from "@/lib/i18n";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import { localizedCorrectAnswerForFeedback } from "@/lib/server/answerFeedback";
import { questionAnswerMatches } from "@/lib/server/answerMatching";
import type { LocalizedText, Question, TextbookPublisher, Topic } from "@/types";

type AuditSeverity = "critical" | "error" | "warning";

export type ChinaLessonAuditIssue = {
  severity: AuditSeverity;
  code: string;
  topicId: string;
  location: string;
  message: string;
  evidence?: string;
};

type ChinaScopeKey =
  | "hong-kong"
  | "pep-primary"
  | "pep-junior"
  | "pep-high"
  | "bnu-primary"
  | "bnu-junior"
  | "bnu-high"
  | "hjb-primary"
  | "hjb-junior"
  | "hjb-high";

export type ChinaLessonAuditRow = {
  topicId: string;
  scope: ChinaScopeKey;
  grade: string;
  publisher: TextbookPublisher | "HK";
  blockCount: number;
  displayedPracticeCount: number;
  issueCount: number;
  highestSeverity: AuditSeverity | "none";
};

export type ChinaLessonAuditResult = {
  generatedAt: string;
  verdict: "passed" | "failed";
  scope: {
    lessonCount: number;
    topicCount: number;
    blockCount: number;
    displayedPracticeQuestionCount: number;
    countsByScope: Record<ChinaScopeKey, number>;
  };
  issueCounts: Record<AuditSeverity, number>;
  issues: ChinaLessonAuditIssue[];
  rows: ChinaLessonAuditRow[];
};

const chinaPublishers = new Set<TextbookPublisher>([
  "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
  "HK_UNITED_PRIME_MIA",
  "HK_EPH_MIF",
  "MAINLAND_PEP",
  "MAINLAND_BNU",
  "MAINLAND_HJB"
]);

const expectedScopeKeys: ChinaScopeKey[] = [
  "hong-kong",
  "pep-primary",
  "pep-junior",
  "pep-high",
  "bnu-primary",
  "bnu-junior",
  "bnu-high",
  "hjb-primary",
  "hjb-junior",
  "hjb-high"
];

const requiredStudentBlockTypes = ["concept", "worked-example", "checklist", "extension"] as const;
const lessonPracticeQuestionLimit = 5;
const handwritingCapableQuestionTypes = new Set(["fill-in", "short-answer", "graph"]);
const cjkPattern = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;
// `undefined` can be mathematically correct prose (for example, the slope of a
// vertical line). Runtime null-like values are defects only when they occupy
// the whole field; authoring placeholders remain invalid anywhere.
const invalidPlaceholderPattern = /(?:^\s*(?:undefined|NaN|null)\s*$|\b(?:TODO|TBD|lorem ipsum|term-[a-f0-9]+)\b|见课堂检查点|見課堂檢查點)/iu;
const internalContentPatterns: Array<[string, RegExp]> = [
  // Keep workflow abbreviations case-sensitive so mathematical products such
  // as `qaₙ` are not mistaken for the uppercase QA label.
  ["internal-qa-label", /\b(?:S(?:0[1-9]|1\d|2[0-5])|QA|RAG)\b/u],
  ["internal-qa-label", /\b(?:manual review|source[- ]distance|source scan|integration package|production[- ]integrated|candidate package|generator|provider|MAIS-authored)\b/iu],
  ["internal-approval-label", /\b(?:approved|approval|audited)\b/iu],
  ["internal-data-label", /\bpublisher\b/iu],
  ["internal-chinese-label", /(?:MAIS 自主設計|MAIS 自主设计|MAIS 版本|已審核|已审核|已批准|來源距離|来源距离|集成包|整合包|題庫隔離|题库隔离|來源掃描|来源扫描)/u],
  ["internal-id", /\b(?:p|s)\d+(?:-[a-z0-9]+){2,}\b/iu],
  ["internal-version-id", /\b(?:bnu|hjb|pep|ccss)-[a-z0-9]+(?:-[a-z0-9]+)+\b/iu]
];
// Three ASCII periods are still common mathematical ellipsis notation in
// repeating decimals and finite-set displays. Treat repeated sentence marks as
// malformed without misclassifying `0.333...` or `{1,2,3,...,100}`.
const malformedPunctuationPattern = /(?:。\s*\.(?!\.)|(?<!\.)\.(?!\.)\s*。|[。！？!?]{3,}|[：:]\s*[：:])/u;
// A Latin x between two explicit numeric operands is unambiguously being used
// as a multiplication sign on the learner surface. It is easy to confuse with
// the algebraic variable x, especially on pages that teach equations, so the
// production content contract requires × for this exact context. Deliberately
// do not flag algebra such as 2x + 3 or x = 4.
const ambiguousNumericMultiplicationXPattern = /(?<![A-Za-z_])\d+(?:\.\d+)?%?\s*[xX]\s*\d+(?:\.\d+)?%?/u;
const multiplicationFactorWord = String.raw`(?:length|width|height|base|side|radius|diameter|長|长|寬|宽|高|底|邊長|边长|半徑|半径|直徑|直径)`;
const ambiguousFactorWordMultiplicationXPattern = new RegExp(
  String.raw`(?:\b(?:length|width|height|base|side|radius|diameter)\b|[長长寬宽高底]|邊長|边长|半徑|半径|直徑|直径)\s*[xX]\s*(?:${multiplicationFactorWord}|\d)`,
  "iu"
);
// Spacing around a standalone x makes its operator role explicit: `l x w`
// or `2 x n`. This does not match algebra such as `2x + 3`, `x = 4`, or
// prose labels such as `Point X is ...`.
const ambiguousStandaloneMultiplicationXPattern = /(?:(?<![A-Za-z_])\d+(?:\.\d+)?%?|(?<![A-Za-z_])[A-Za-zα-ωΑ-Ω](?![A-Za-z_])|[)\]])\s+[xX]\s+(?:\d+(?:\.\d+)?%?|[A-Za-zα-ωΑ-Ω](?![A-Za-z_])|[(\[])/u;
const genericInstructionalTemplatePattern = /(?:本[課课]圍繞《[^》]+》學習：先(?:找出已知信息，再選擇合適的表示或運算|確認定義或規則，再連接合適的表示方法)|本课围绕《[^》]+》学习：先(?:找出已知信息，再选择合适的表示或运算|确认定义或规则，再连接合适的表示方法)|\b(?:build|study) .+ by (?:identifying the given information|connecting its definitions or rules with suitable representations)\b)/iu;
const mathSegmentPattern = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/gu;
const validSimplifiedVariantCharacters = new Set(["覆"]);

function isChinaTopic(topic: Topic) {
  if (topic.curriculumTrack === "HK") return true;
  return topic.curriculumTrack === "MAINLAND_PEP_HIGH" && Boolean(topic.publisher && chinaPublishers.has(topic.publisher));
}

function gradeBand(grade: string): "primary" | "junior" | "high" {
  if (grade.startsWith("P")) return "primary";
  const number = Number.parseInt(grade.slice(1), 10);
  return number <= 3 ? "junior" : "high";
}

function scopeKeyForTopic(topic: Topic): ChinaScopeKey {
  if (topic.curriculumTrack === "HK") return "hong-kong";
  const publisher = topic.publisher?.replace("MAINLAND_", "").toLowerCase();
  return `${publisher}-${gradeBand(topic.grade)}` as ChinaScopeKey;
}

function compactEvidence(value: string, limit = 240) {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > limit ? `${compacted.slice(0, limit - 3)}...` : compacted;
}

function mathSegments(value: string) {
  return Array.from(value.matchAll(mathSegmentPattern), (match) => (match[1] ?? match[2] ?? "").trim());
}

export function hasInvalidChinaLessonPlaceholder(value: string) {
  return invalidPlaceholderPattern.test(value);
}

export function hasMalformedChinaLessonPunctuation(value: string) {
  return malformedPunctuationPattern.test(value);
}

export function hasAmbiguousMultiplicationX(value: string) {
  return ambiguousNumericMultiplicationXPattern.test(value)
    || ambiguousFactorWordMultiplicationXPattern.test(value)
    || ambiguousStandaloneMultiplicationXPattern.test(value);
}

const learnerVisibleEnglishPatterns: ReadonlyArray<readonly [string, RegExp]> = [
  ["learner-visible-english-malformed-equality", /\b(?:is|are)\s*=\s*/iu],
  [
    "learner-visible-english-elapsed-grammar",
    /(?:\bFrom\s+-?\d{1,2}(?::\d{2})?\s+to\s+-?\d{1,2}(?::\d{2})?\s+is\s+\d+(?:\.\d+)?\s+(?:minutes?|degrees?(?:\s+Celsius)?)|\b\d{1,2}:\d{2}\s+passes\s+\d+(?:\.\d+)?\s+minutes?)\b/iu
  ],
  ["learner-visible-english-mixed-exponent", /(?:[⁰¹²³⁴⁵⁶⁷⁸⁹]\s*\^\s*\d|\^\d+\^\d+)/u],
  ["learner-visible-english-more-jumps", /\b(?:jumped|jumps)\s+(?:_+|\d+)\s+more\s+jumps?\b/iu],
  [
    "learner-visible-english-decimal-digit-wording",
    /(?:\b(?:is|are)\s+\d+\s+of\s+0\.0|\bgreater\s+than\s+(?:the\s+)?\d+\s+of\s+0\.)/iu
  ],
  [
    "learner-visible-english-redundant-geometry",
    /(?:⊥[^.\n]{0,48}\bperpendicular\s+to\b|∽\s*similar\s+to\b)/iu
  ],
  [
    "learner-visible-english-singular-monomial",
    /\bIf\s+the\s+monomial\b[\s\S]*\band\b[\s\S]*\bare\s+like\s+terms\b/iu
  ],
  ["learner-visible-english-joined-numeric-sequence", /\b\d{20,}\b/u],
  [
    "learner-visible-english-ambiguous-column-reference",
    /blocks\s+in\s+the\s+2\s+and\s+3\s+columns\s+align/iu
  ],
  [
    "learner-visible-english-decimal-unit-contract",
    /6020450\s*=\s*6,020,450/iu
  ],
  [
    "learner-visible-english-unit-prompt-grammar",
    /to\s+the\s+nearest\s+ten\s+thousand,\s+the\s+approximate\s+number/iu
  ]
];

export function learnerVisibleEnglishIssueCodes(value: string) {
  return learnerVisibleEnglishPatterns
    .filter(([, pattern]) => pattern.test(value))
    .map(([code]) => code);
}

function countToken(value: string, token: string) {
  return value.split(token).length - 1;
}

function hasBalancedMathDelimiters(value: string) {
  return (
    countToken(value, "\\(") === countToken(value, "\\)") &&
    countToken(value, "\\[") === countToken(value, "\\]") &&
    countToken(value, "$$") % 2 === 0
  );
}

function numericTokens(value: string) {
  const withoutLocalizedUnitPowers = value
    .replace(/[−–—]/gu, "-")
    .replace(/零下\s*(?=\d)/gu, "-")
    // Translation parity tracks the quantities in an expression. Division,
    // fraction, and multiplication notation may legitimately differ across
    // languages (`17 / 5`, `17 ÷ 5`, `16 x 32`, `16×32`). Separate numeric
    // operands before tokenization while leaving signed literals intact.
    .replace(/(?<=\d)\s*(?:[x×÷/])\s*(?=\d)/giu, " ")
    // A written square/cubic unit and an exponent-form unit are equivalent
    // localization choices. Unit powers belong to math-format parity, not to
    // the set of quantities that must be preserved by a translation.
    .replace(/\b(km|cm|mm|m)\s*(?:\^|\*\*)\s*[23]\b/giu, "$1")
    .replace(/\b(km|cm|mm|m)[²³]/giu, "$1")
    .replace(/\b(km|cm|mm|m)\s*\\\(\s*\^\s*[23]\s*\\\)/giu, "$1");
  const tokens = new Set(Array.from(
    withoutLocalizedUnitPowers.matchAll(/(?<![A-Za-z])[-+]?\d+(?:\.\d+)?/g),
    (match) => match[0].replace(/\s+/g, "")
  ));
  // In `58-7=51`, the regex conservatively reads `-7` as a signed token.
  // Preserve the sign-sensitive form and also record its magnitude so a
  // translated prose mention of "seven" / `7` does not create a false gap.
  Array.from(tokens).forEach((token) => {
    if (/^[+-]/u.test(token)) tokens.add(token.slice(1));
  });
  return Array.from(tokens).sort();
}

function normalizedPayload(value: string) {
  return value
    .toLowerCase()
    .replace(/\\[()[\]]/g, "")
    .replace(/[\s，。,.!?！？：:；;、'"“”‘’()（）\[\]{}]/g, "");
}

function normalizedMathPayload(value: string) {
  return normalizedPayload(
    value
      .replace(/\\(?:text|mathrm|operatorname)\s*\{[^{}]*\}/gu, "\\text{}")
      .replace(/\\(?:cdot|times)(?![A-Za-z])/gu, "*")
  );
}

function uniqueNormalizedMathSegments(value: string, counterpart: string) {
  const counterpartSegments = new Set(mathSegments(counterpart).map(normalizedMathPayload));
  return Array.from(new Set(mathSegments(value).flatMap((expression) => {
    const numericList = expression.trim().match(
      /^[-+]?\d+(?:\.\d+)?(?:\s*[,，、]\s*[-+]?\d+(?:\.\d+)?)+$/u
    );
    if (numericList) {
      const components = expression.split(/[,，、]/u).map((component) => normalizedMathPayload(component));
      // Split only when the counterpart really presents the same components
      // as separate math segments. Two coordinate tuples remain atomic, so a
      // changed coordinate order is still detected.
      if (components.every((component) => counterpartSegments.has(component))) return components;
    }
    return [normalizedMathPayload(expression)];
  }))).sort();
}

function mathExpressionAppearsAsPlainText(expression: string, counterpart: string) {
  const degreeValue = expression.match(/^([-+]?\d+(?:\.\d+)?)\^\\circ$/u)?.[1];
  if (degreeValue && new RegExp(`\\b${degreeValue}\\s+degrees?\\b`, "iu").test(counterpart)) return true;
  if (/^[A-Za-z]$/u.test(expression) && new RegExp(`\\b${expression}\\b`, "u").test(counterpart)) return true;

  const plainExpression = expression.replace(/\\/gu, "");
  if (plainExpression.length < 3) return false;
  const plainCounterpart = counterpart
    .toLowerCase()
    .replace(/\\/gu, "")
    .replace(/[{}]/gu, "")
    .replace(/\s*([=<>+\-*/^])\s*/gu, "$1");
  const escapedExpression = plainExpression.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9])${escapedExpression}(?![A-Za-z0-9])`, "u").test(plainCounterpart);
}

const englishNumberWords: ReadonlyArray<[string, RegExp]> = [
  ["0", /\b(?:zero|zeroth)\b/iu],
  ["1", /\b(?:one|first)\b/iu],
  ["2", /\b(?:two|second|pairs?)\b/iu],
  ["3", /\b(?:three|third)\b/iu],
  ["4", /\b(?:four|fourth)\b/iu],
  ["5", /\b(?:five|fifth)\b/iu],
  ["6", /\b(?:six|sixth)\b/iu],
  ["7", /\b(?:seven|seventh)\b/iu],
  ["8", /\b(?:eight|eighth)\b/iu],
  ["9", /\b(?:nine|ninth)\b/iu],
  ["10", /\b(?:ten|tenth)\b/iu]
];
const chineseNumberCharacters: ReadonlyArray<[string, string]> = [
  ["0", "零"],
  ["1", "一"],
  ["2", "二两兩"],
  ["3", "三"],
  ["4", "四"],
  ["5", "五"],
  ["6", "六"],
  ["7", "七"],
  ["8", "八"],
  ["9", "九"],
  ["10", "十"]
];
const chineseNumberContext = "个個次种種条條组組边邊点點项項份本张張人只辆輛天月年周页頁米元角分度句";
const englishMonthNumbers: ReadonlyArray<[string, RegExp]> = [
  ["1", /\bJanuary\b/iu],
  ["2", /\bFebruary\b/iu],
  ["3", /\bMarch\b/iu],
  ["4", /\bApril\b/iu],
  ["5", /\bMay\b/iu],
  ["6", /\bJune\b/iu],
  ["7", /\bJuly\b/iu],
  ["8", /\bAugust\b/iu],
  ["9", /\bSeptember\b/iu],
  ["10", /\bOctober\b/iu],
  ["11", /\bNovember\b/iu],
  ["12", /\bDecember\b/iu]
];

function translationNumericTokenSets(english: string, chinese: string) {
  const englishNumbers = new Set(numericTokens(english));
  const chineseNumbers = new Set(numericTokens(chinese));
  englishNumberWords.forEach(([number, pattern]) => {
    if (chineseNumbers.has(number) && pattern.test(english)) englishNumbers.add(number);
  });
  englishMonthNumbers.forEach(([number, pattern]) => {
    if (chineseNumbers.has(number) && pattern.test(english)) englishNumbers.add(number);
  });

  chineseNumberCharacters.forEach(([number, characters]) => {
    if (!englishNumbers.has(number)) return;
    const pattern = new RegExp(`(?:第[${characters}]|[${characters}](?=[${chineseNumberContext}]|年[级級]|小[时時]|分[钟鐘]))`, "u");
    if (pattern.test(chinese)) chineseNumbers.add(number);
  });

  // PRC discount notation states the fraction of the list price to pay:
  // 八折 = pay 80% = a 20% discount. Add only the exact percentage that the
  // English counterpart explicitly labels as a discount.
  const chineseDiscountPayPercent: Record<string, number> = {
    一: 10,
    二: 20,
    三: 30,
    四: 40,
    五: 50,
    六: 60,
    七: 70,
    八: 80,
    九: 90
  };
  Array.from(chinese.matchAll(/([一二三四五六七八九])折/gu)).forEach((match) => {
    const payPercent = chineseDiscountPayPercent[match[1]];
    const discountPercent = 100 - payPercent;
    if (new RegExp(`\\b${discountPercent}%?\\s+discount\\b`, "iu").test(english)) {
      chineseNumbers.add(String(discountPercent));
    }
  });

  return { englishNumbers, chineseNumbers };
}

export function hasNumericTranslationParityDifference(english: string, chinese: string) {
  const { englishNumbers, chineseNumbers } = translationNumericTokenSets(english, chinese);

  const englishNumberList = Array.from(englishNumbers).sort();
  const chineseNumberList = Array.from(chineseNumbers).sort();
  return Boolean(
    englishNumberList.length &&
    chineseNumberList.length &&
    englishNumberList.join("|") !== chineseNumberList.join("|")
  );
}

export function hasMathTranslationParityDifference(english: string, chinese: string) {
  const { englishNumbers, chineseNumbers } = translationNumericTokenSets(english, chinese);
  const englishMath = uniqueNormalizedMathSegments(english, chinese).filter((expression) =>
    !(expression === "^2" && /平方/u.test(chinese)) &&
    !(expression === "^3" && /立方/u.test(chinese)) &&
    !(/^[+-]?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?$/u.test(expression) && chineseNumbers.has(expression)) &&
    !mathExpressionAppearsAsPlainText(expression, chinese)
  );
  const chineseMath = uniqueNormalizedMathSegments(chinese, english).filter((expression) =>
    !(expression === "^2" && /\bsquare\b/iu.test(english)) &&
    !(expression === "^3" && /\bcubic\b/iu.test(english)) &&
    !(/^[+-]?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?$/u.test(expression) && englishNumbers.has(expression)) &&
    !mathExpressionAppearsAsPlainText(expression, english)
  );
  return englishMath.length !== chineseMath.length || englishMath.some((expression, index) => expression !== chineseMath[index]);
}

type MultipleChoiceAuditQuestion = Pick<Question, "id" | "answer" | "acceptedAnswers" | "options">;
type AuditLanguage = "en" | "zh" | "zhHans";

const practiceCardSimplifiedTextReplacements = [
  ["憑", "凭"],
  ["細", "细"],
  ["綜", "综"],
  ["職", "职"],
  ["觀", "观"],
  ["軌", "轨"],
  ["鄰", "邻"],
  ["魚", "鱼"],
  ["遊", "游"],
  ["靈", "灵"]
] as const;

function submittedPracticeOptionValue(option: LocalizedText, language: AuditLanguage) {
  const runtimeLanguage = language === "zhHans" ? "zh-Hans" : language;
  const localized = textForLanguage(option, runtimeLanguage);
  if (language !== "zhHans") return localized;
  // PracticeQuestionCard applies this final normalization before storing and
  // submitting an option. Keep the audit on the exact submitted value rather
  // than a raw localized-field fingerprint.
  return practiceCardSimplifiedTextReplacements.reduce(
    (current, [source, replacement]) => current.split(source).join(replacement),
    localized
  );
}

export function acceptedRuntimeOptionIndexes(question: MultipleChoiceAuditQuestion, language: AuditLanguage) {
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers,
    options: question.options
  };
  return (question.options ?? []).flatMap((option, optionIndex) =>
    questionAnswerMatches(gradingQuestion, submittedPracticeOptionValue(option, language))
      ? [optionIndex]
      : []
  );
}

function optionFingerprint(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。!?！？：:；;、'"“”‘’]/g, "");
}

function practiceTemplateFingerprint(value: string) {
  return normalizedPayload(value)
    .replace(/[-+]?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?/g, "#")
    .replace(/[a-z](?=[=<>+\-*/^]|$)/g, "v");
}

function severityRank(value: AuditSeverity | "none") {
  if (value === "critical") return 3;
  if (value === "error") return 2;
  if (value === "warning") return 1;
  return 0;
}

function highestSeverity(issues: ChinaLessonAuditIssue[]) {
  return issues.reduce<AuditSeverity | "none">(
    (highest, issue) => (severityRank(issue.severity) > severityRank(highest) ? issue.severity : highest),
    "none"
  );
}

function illustrationAssetPathsForTopic(topicId: string) {
  const roots = [
    "mainland-pep-primary",
    "mainland-pep-junior",
    "mainland-pep-high",
    "mainland-hjb-primary",
    "mainland-hjb-junior",
    "mainland-hjb-high"
  ];
  return roots.flatMap((root) => ["concept.png", "worked-example.png"].map((file) =>
    path.join(process.cwd(), "public", "lesson-illustrations", root, topicId, file)
  )).filter(existsSync);
}

function practiceQuestionCandidatesForLesson(seed: ProductionLessonSeed, allQuestions: Question[]) {
  const byTopic = allQuestions.filter((question) => question.topicId === seed.topicId);
  if (!seed.practiceQuestionIds?.length) return byTopic;
  const byId = new Map(allQuestions.map((question) => [question.id, question]));
  return seed.practiceQuestionIds.map((id) => byId.get(id)).filter((question): question is Question => Boolean(question));
}

function displayedPracticeQuestionsForLesson(seed: ProductionLessonSeed, allQuestions: Question[]) {
  const candidates = practiceQuestionCandidatesForLesson(seed, allQuestions);
  const dedupedQuestions = dedupePracticeQuestions(candidates) as Question[];
  if (dedupedQuestions.length <= lessonPracticeQuestionLimit) return dedupedQuestions;
  const selectedQuestions = dedupedQuestions.slice(0, lessonPracticeQuestionLimit);
  if (selectedQuestions.some((question) => handwritingCapableQuestionTypes.has(question.type))) {
    return selectedQuestions;
  }

  const handwritingQuestion = dedupedQuestions.find((question) => handwritingCapableQuestionTypes.has(question.type));
  if (!handwritingQuestion) return selectedQuestions;

  return [
    ...selectedQuestions.slice(0, lessonPracticeQuestionLimit - 1),
    handwritingQuestion
  ];
}

export function auditChinaLessonContent(): ChinaLessonAuditResult {
  const issues: ChinaLessonAuditIssue[] = [];
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const chinaTopics = topics.filter(isChinaTopic);
  const chinaTopicIds = new Set(chinaTopics.map((topic) => topic.id));
  const chinaLessons = productionLessonSeeds.filter((seed) => chinaTopicIds.has(seed.topicId));
  const seedsByTopic = Map.groupBy(chinaLessons, (seed) => seed.topicId);

  function add(
    severity: AuditSeverity,
    code: string,
    topicId: string,
    location: string,
    message: string,
    evidence?: string
  ) {
    issues.push({ severity, code, topicId, location, message, evidence: evidence ? compactEvidence(evidence) : undefined });
  }

  function inspectText(value: string, topic: Topic, location: string, language: "en" | "zh" | "zhHans") {
    if (!value.trim()) {
      add("critical", "missing-text", topic.id, location, `${language} text is empty.`);
      return;
    }
    if (hasInvalidChinaLessonPlaceholder(value)) {
      add("error", "placeholder-text", topic.id, location, "Displayed content contains a placeholder or invalid runtime value.", value);
    }
    if (language === "en" && cjkPattern.test(value)) {
      add("error", "english-contains-cjk", topic.id, location, "English lesson content contains Chinese characters.", value);
    }
    if (language === "en") {
      learnerVisibleEnglishIssueCodes(value).forEach((code) => {
        add(
          "error",
          code,
          topic.id,
          location,
          "English learner-visible content contains a deterministic grammar, notation, or semantic-format defect.",
          value
        );
      });
    }
    if (language !== "en" && /\b(?:Answer|Checkpoint|Reference|Glossary|Strategy|Avoid)\b/u.test(value)) {
      add("error", "chinese-contains-ui-english", topic.id, location, "Chinese lesson content exposes untranslated instructional labels.", value);
    }
    internalContentPatterns.forEach(([code, pattern]) => {
      if (pattern.test(value)) {
        add("error", code, topic.id, location, "Displayed lesson content exposes internal production or QA metadata.", value);
      }
    });
    if (hasMalformedChinaLessonPunctuation(value)) {
      add("error", "malformed-punctuation", topic.id, location, "Displayed prose contains malformed or duplicated punctuation.", value);
    }
    if (hasAmbiguousMultiplicationX(value)) {
      add(
        "error",
        "ambiguous-multiplication-x",
        topic.id,
        location,
        "Displayed multiplication between numeric operands uses a Latin x instead of the multiplication sign ×.",
        value
      );
    }
    if (genericInstructionalTemplatePattern.test(value)) {
      add("error", "generic-instructional-template", topic.id, location, "Displayed lesson prose is a reusable workflow template rather than topic-specific mathematical instruction.", value);
    }
    if (!hasBalancedMathDelimiters(value)) {
      add("critical", "unbalanced-math-delimiters", topic.id, location, "Math delimiters are not balanced.", value);
      return;
    }
    mathSegments(value).forEach((expression, index) => {
      try {
        katex.renderToString(expression, { throwOnError: true, strict: "ignore", output: "html" });
      } catch (error) {
        add(
          "critical",
          "invalid-math-syntax",
          topic.id,
          `${location}.math[${index}]`,
          error instanceof Error ? error.message : "KaTeX rejected the expression.",
          expression
        );
      }
    });
  }

  function inspectLocalized(value: LocalizedText, topic: Topic, location: string) {
    inspectText(value.en, topic, `${location}.en`, "en");
    inspectText(value.zh, topic, `${location}.zh`, "zh");
    if (topic.curriculumTrack === "MAINLAND_PEP_HIGH") {
      if (value.zhHans?.trim()) {
        inspectText(value.zhHans, topic, `${location}.zhHans`, "zhHans");
        const containsTraditionalOnlyCharacter = Array.from(value.zhHans).some(
          (character) => traditionalToSimplified(character) !== character && !validSimplifiedVariantCharacters.has(character)
        );
        if (containsTraditionalOnlyCharacter) {
          add("error", "zhHans-contains-traditional", topic.id, `${location}.zhHans`, "Simplified Chinese content contains Traditional Chinese characters.", value.zhHans);
        }
        const validatedTraditional = chinaLessonTraditionalTranslation(value.zhHans);
        const expectedTraditional = toTraditionalHjbText(value.zhHans);
        if (!validatedTraditional && value.zh === value.zhHans && expectedTraditional !== value.zhHans) {
          add("warning", "zh-variant-parity", topic.id, `${location}.zh`, "Traditional Chinese duplicates zhHans even though variant-sensitive characters are present.", value.zh);
        }
      }
    } else if (value.zhHans) {
      inspectText(value.zhHans, topic, `${location}.zhHans`, "zhHans");
    }

    const chinese = value.zhHans ?? toPrcSimplifiedText(value.zh);
    if (hasNumericTranslationParityDifference(value.en, chinese)) {
      add("warning", "numeric-translation-parity", topic.id, location, "English and Chinese numeric tokens differ; manual semantic review is required.", `${value.en} || ${chinese}`);
    }
    if (hasMathTranslationParityDifference(value.en, chinese)) {
      add("warning", "math-translation-parity", topic.id, location, "English and Chinese math expressions differ; manual semantic review is required.", `${value.en} || ${chinese}`);
    }
  }

  function inspectBlock(block: ProductionLessonBlock, topic: Topic, index: number) {
    const location = `blocks[${index}](${block.idSuffix})`;
    inspectLocalized(block.title, topic, `${location}.title`);
    if (block.content) inspectLocalized(block.content, topic, `${location}.content`);
    block.items?.forEach((item, itemIndex) => inspectLocalized(item, topic, `${location}.items[${itemIndex}]`));

    const needsContent = block.type === "concept" || block.type === "worked-example" || block.type === "visualization" || block.type === "interactive-lesson";
    if (needsContent && !block.content?.en.trim() && !block.interactiveLessonConfig) {
      add("critical", "missing-block-content", topic.id, location, `${block.type} block has no student-facing content.`);
    }
    if ((block.type === "checklist" || block.type === "extension") && !block.items?.length) {
      add("critical", "missing-block-items", topic.id, location, `${block.type} block has no items.`);
    }
    if (block.visualizationConfig) {
      if (!topicById.has(block.visualizationConfig.topicId)) {
        add("critical", "unknown-visualization-topic", topic.id, location, "Visualization points to an unknown topic.", block.visualizationConfig.topicId);
      }
      if (!block.visualizationConfig.moduleId.trim()) {
        add("critical", "missing-visualization-module", topic.id, location, "Visualization has no module ID.");
      }
    }
    if (block.interactiveLessonConfig) {
      if (!block.interactiveLessonConfig.ccssLessonSlug.trim() || !block.interactiveLessonConfig.standardIds.length) {
        add("critical", "invalid-interactive-config", topic.id, location, "Interactive lesson configuration is incomplete.");
      }
    }
  }

  chinaTopics.forEach((topic) => {
    const matches = seedsByTopic.get(topic.id) ?? [];
    if (!matches.length) add("critical", "missing-live-lesson", topic.id, "lesson", "China curriculum topic has no live production lesson.");
    if (matches.length > 1) add("critical", "duplicate-live-lesson", topic.id, "lesson", "China curriculum topic maps to multiple live lesson seeds.");
  });

  productionLessonSeeds.forEach((seed) => {
    const topic = topicById.get(seed.topicId);
    if (!topic) add("critical", "orphan-lesson", seed.topicId, "lesson", "Production lesson has no topic metadata.");
  });

  const rows: ChinaLessonAuditRow[] = chinaLessons.map((seed) => {
    const topic = topicById.get(seed.topicId);
    if (!topic) {
      return {
        topicId: seed.topicId,
        scope: "hong-kong",
        grade: "unknown",
        publisher: "HK",
        blockCount: seed.blocks.length,
        displayedPracticeCount: 0,
        issueCount: 1,
        highestSeverity: "critical"
      };
    }
    const initialIssueCount = issues.length;
    if (!seed.productionReady) add("critical", "not-production-ready", topic.id, "lesson", "Live China lesson is not marked production-ready.");
    if (!Number.isFinite(seed.estimatedMinutes) || (seed.estimatedMinutes ?? 0) < 5 || (seed.estimatedMinutes ?? 0) > 90) {
      add("error", "invalid-duration", topic.id, "estimatedMinutes", "A single lesson page must have a realistic 5-90 minute estimate.", String(seed.estimatedMinutes));
    }
    inspectLocalized(seed.title, topic, "title");
    inspectLocalized(seed.description, topic, "description");

    const idSuffixes = new Set<string>();
    seed.blocks.forEach((block, index) => {
      if (idSuffixes.has(block.idSuffix)) add("critical", "duplicate-block-id", topic.id, `blocks[${index}]`, "Lesson block ID suffix is duplicated.", block.idSuffix);
      idSuffixes.add(block.idSuffix);
      inspectBlock(block, topic, index);
    });
    requiredStudentBlockTypes.forEach((type) => {
      if (!seed.blocks.some((block) => block.type === type)) add("critical", "missing-required-block", topic.id, "blocks", `Lesson has no ${type} block.`);
    });

    for (const type of ["concept", "worked-example"] as const) {
      const seen = new Map<string, string>();
      seed.blocks.filter((block) => block.type === type && block.content).forEach((block) => {
        const fingerprint = normalizedPayload(block.content?.en ?? "");
        const first = seen.get(fingerprint);
        if (fingerprint.length > 80 && first) {
          add("error", "duplicate-instructional-content", topic.id, `blocks(${block.idSuffix})`, `${type} content duplicates another block on the same page.`, `${first} == ${block.idSuffix}`);
        }
        seen.set(fingerprint, block.idSuffix);
      });
    }

    const practiceCandidates = practiceQuestionCandidatesForLesson(seed, questions);
    const selectedPractice = displayedPracticeQuestionsForLesson(seed, questions);
    const requestedIds = seed.practiceQuestionIds ?? [];
    if (requestedIds.length && practiceCandidates.length !== requestedIds.length) {
      const available = new Set(practiceCandidates.map((question) => question.id));
      add("critical", "missing-practice-question", topic.id, "practiceQuestionIds", "Lesson references missing practice questions.", requestedIds.filter((id) => !available.has(id)).join(", "));
    }
    if (selectedPractice.length < 5) {
      add("critical", "insufficient-practice", topic.id, "practice", "Lesson cannot display the required five-question practice round.", String(selectedPractice.length));
    }
    if (selectedPractice.length >= 5) {
      const practiceTemplates = selectedPractice.map((question) => practiceTemplateFingerprint(question.prompt.zhHans ?? question.prompt.zh));
      if (new Set(practiceTemplates).size <= 2) {
        add("error", "low-practice-variety", topic.id, "practice", "The five displayed questions collapse to at most two prompt templates and do not provide sufficient instructional variety.", selectedPractice.map((question) => question.id).join(", "));
      }
    }
    selectedPractice.forEach((question, questionIndex) => {
      const questionLocation = `practice[${questionIndex}](${question.id})`;
      if (question.topicId !== topic.id || question.grade !== topic.grade) {
        add("critical", "practice-scope-mismatch", topic.id, questionLocation, "Practice question does not match the lesson topic and grade.");
      }
      if (topic.curriculumTrack === "HK" && question.curriculumTrack !== "HK") {
        add("critical", "practice-curriculum-mismatch", topic.id, questionLocation, "Hong Kong lesson contains a non-Hong-Kong practice question.");
      }
      if (topic.curriculumTrack === "MAINLAND_PEP_HIGH") {
        const expectedPublisher = topic.publisher ?? "MAINLAND_PEP";
        if (question.curriculumTrack !== "MAINLAND_PEP_HIGH" || (question.publisher && question.publisher !== expectedPublisher)) {
          add("critical", "practice-publisher-mismatch", topic.id, questionLocation, "Mainland lesson practice crosses curriculum publishers.");
        }
      }
      inspectLocalized(question.topic, topic, `${questionLocation}.topic`);
      inspectLocalized(question.prompt, topic, `${questionLocation}.prompt`);
      question.options?.forEach((option, optionIndex) => inspectLocalized(option, topic, `${questionLocation}.options[${optionIndex}]`));
      inspectLocalized(question.explanation, topic, `${questionLocation}.explanation`);
      question.questionAssets?.forEach((asset, assetIndex) => {
        inspectLocalized(asset.alt, topic, `${questionLocation}.assets[${assetIndex}].alt`);
        if (asset.caption) inspectLocalized(asset.caption, topic, `${questionLocation}.assets[${assetIndex}].caption`);
        if (asset.src.startsWith("/")) {
          const assetPath = path.join(process.cwd(), "public", asset.src.replace(/^\/+/, ""));
          if (!existsSync(assetPath)) add("critical", "missing-question-asset", topic.id, `${questionLocation}.assets[${assetIndex}]`, "Displayed practice asset is missing from public storage.", asset.src);
        }
      });
      const feedbackAnswer = localizedCorrectAnswerForFeedback({
        type: question.type,
        answer: question.answer,
        acceptedAnswers: question.acceptedAnswers,
        options: question.options
      });
      if (cjkPattern.test(question.answer) && !feedbackAnswer) {
        add("error", "unlocalized-correct-answer", topic.id, `${questionLocation}.answer`, "A wrong attempt has no safe localized display answer; the English page would have to omit it until the validated maps are complete.", question.answer);
      } else if (feedbackAnswer) {
        inspectLocalized(feedbackAnswer, topic, `${questionLocation}.answerDisplay`);
      }
      if (question.type === "multiple-choice") {
        if (!question.options || question.options.length < 3) add("critical", "invalid-choice-count", topic.id, questionLocation, "Multiple-choice item has fewer than three options.");
        const optionFingerprints = question.options?.map((option) => optionFingerprint(option.zhHans ?? option.zh)) ?? [];
        if (new Set(optionFingerprints).size !== optionFingerprints.length) add("critical", "duplicate-options", topic.id, questionLocation, "Multiple-choice item has duplicate options.");
        (["en", "zh", "zhHans"] as const).forEach((language) => {
          const acceptedOptionIndexes = acceptedRuntimeOptionIndexes(question, language);
          if (!acceptedOptionIndexes.length) {
            add(
              "critical",
              "answer-not-in-options",
              topic.id,
              `${questionLocation}.${language}`,
              "No displayed option is accepted when PracticeQuestionCard submits its exact runtime value to the production grader.",
              question.answer
            );
          } else if (acceptedOptionIndexes.length > 1) {
            add(
              "critical",
              "multiple-accepted-options",
              topic.id,
              `${questionLocation}.${language}`,
              "More than one displayed option is accepted by the production grader.",
              acceptedOptionIndexes.join(", ")
            );
          }
        });
      }
    });

    illustrationAssetPathsForTopic(topic.id).forEach((assetPath) => {
      if (!existsSync(assetPath)) add("critical", "missing-lesson-illustration", topic.id, "illustration", "Live lesson illustration asset is missing.", assetPath);
    });

    const lessonIssues = issues.slice(initialIssueCount).filter((issue) => issue.topicId === topic.id);
    return {
      topicId: topic.id,
      scope: scopeKeyForTopic(topic),
      grade: topic.grade,
      publisher: topic.curriculumTrack === "HK" ? "HK" : (topic.publisher ?? "MAINLAND_PEP"),
      blockCount: seed.blocks.length,
      displayedPracticeCount: Math.min(5, selectedPractice.length),
      issueCount: lessonIssues.length,
      highestSeverity: highestSeverity(lessonIssues)
    };
  });

  const countsByScope = Object.fromEntries(expectedScopeKeys.map((key) => [key, rows.filter((row) => row.scope === key).length])) as Record<ChinaScopeKey, number>;
  expectedScopeKeys.forEach((key) => {
    if (!countsByScope[key]) add("critical", "missing-curriculum-scope", key, "inventory", `No live lessons were found for required scope ${key}.`);
  });

  issues.sort((left, right) =>
    severityRank(right.severity) - severityRank(left.severity) ||
    left.topicId.localeCompare(right.topicId, "en") ||
    left.location.localeCompare(right.location, "en") ||
    left.code.localeCompare(right.code, "en")
  );
  rows.sort((left, right) => left.scope.localeCompare(right.scope, "en") || left.grade.localeCompare(right.grade, "en") || left.topicId.localeCompare(right.topicId, "en"));
  const issueCounts: Record<AuditSeverity, number> = {
    critical: issues.filter((issue) => issue.severity === "critical").length,
    error: issues.filter((issue) => issue.severity === "error").length,
    warning: issues.filter((issue) => issue.severity === "warning").length
  };

  return {
    generatedAt: new Date().toISOString(),
    verdict: issueCounts.critical || issueCounts.error ? "failed" : "passed",
    scope: {
      lessonCount: chinaLessons.length,
      topicCount: chinaTopics.length,
      blockCount: chinaLessons.reduce((sum, seed) => sum + seed.blocks.length, 0),
      displayedPracticeQuestionCount: rows.reduce((sum, row) => sum + row.displayedPracticeCount, 0),
      countsByScope
    },
    issueCounts,
    issues,
    rows
  };
}

function markdownReport(result: ChinaLessonAuditResult) {
  return [
    "# China Lesson Content QA Audit",
    "",
    `- Generated: ${result.generatedAt}`,
    `- Verdict: ${result.verdict}`,
    `- Lessons: ${result.scope.lessonCount}`,
    `- Topics: ${result.scope.topicCount}`,
    `- Blocks: ${result.scope.blockCount}`,
    `- Displayed practice questions: ${result.scope.displayedPracticeQuestionCount}`,
    `- Issues: ${JSON.stringify(result.issueCounts)}`,
    "",
    "## Scope counts",
    "",
    ...Object.entries(result.scope.countsByScope).map(([scope, count]) => `- ${scope}: ${count}`),
    "",
    "## Issues",
    "",
    ...(result.issues.length
      ? result.issues.map((issue) => `- [${issue.severity.toUpperCase()}] ${issue.topicId} ${issue.location} ${issue.code}: ${issue.message}${issue.evidence ? ` Evidence: ${issue.evidence}` : ""}`)
      : ["- None."]),
    ""
  ].join("\n");
}

if (
  process.argv.includes("--summary") ||
  process.argv.includes("--samples") ||
  process.argv.includes("--scope-summary") ||
  process.argv.includes("--markdown") ||
  process.argv.some((argument) => argument.startsWith("--code=")) ||
  process.env.CHINA_LESSON_AUDIT_CLI === "1"
) {
  const result = auditChinaLessonContent();
  const codeFilter = process.argv.find((argument) => argument.startsWith("--code="))?.slice("--code=".length);
  if (process.argv.includes("--scope-summary")) {
    const scopeByTopic = new Map(result.rows.map((row) => [row.topicId, row.scope]));
    const summaryByScope = Object.fromEntries(expectedScopeKeys.map((scope) => {
      const scopeIssues = result.issues.filter((issue) => scopeByTopic.get(issue.topicId) === scope);
      const issuesByCode = Object.fromEntries(
        Object.entries(Object.groupBy(scopeIssues, (issue) => issue.code))
          .map(([code, codeIssues]) => [code, codeIssues?.length ?? 0])
          .sort((left, right) => Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]), "en"))
      );
      return [scope, {
        lessonCount: result.rows.filter((row) => row.scope === scope).length,
        affectedLessonCount: result.rows.filter((row) => row.scope === scope && row.issueCount > 0).length,
        issueCounts: {
          critical: scopeIssues.filter((issue) => issue.severity === "critical").length,
          error: scopeIssues.filter((issue) => issue.severity === "error").length,
          warning: scopeIssues.filter((issue) => issue.severity === "warning").length
        },
        issuesByCode
      }];
    }));
    process.stdout.write(`${JSON.stringify(summaryByScope, null, 2)}\n`);
  } else if (process.argv.includes("--samples")) {
    const requestedLimit = Number.parseInt(
      process.argv.find((argument) => argument.startsWith("--limit="))?.slice("--limit=".length) ?? "3",
      10
    );
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 3;
    const samplesByCode = Object.fromEntries(
      Object.entries(Object.groupBy(result.issues, (issue) => issue.code))
        .sort((left, right) => (right[1]?.length ?? 0) - (left[1]?.length ?? 0) || left[0].localeCompare(right[0], "en"))
        .map(([code, codeIssues]) => [code, { count: codeIssues?.length ?? 0, samples: codeIssues?.slice(0, limit) ?? [] }])
    );
    process.stdout.write(`${JSON.stringify(samplesByCode, null, 2)}\n`);
  } else if (codeFilter) {
    const scopeFilter = process.argv.find((argument) => argument.startsWith("--scope="))?.slice("--scope=".length);
    const requestedLimit = Number.parseInt(
      process.argv.find((argument) => argument.startsWith("--limit="))?.slice("--limit=".length) ?? "40",
      10
    );
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 40;
    const scopeByTopic = new Map(result.rows.map((row) => [row.topicId, row.scope]));
    const matchingIssues = result.issues.filter(
      (issue) => issue.code === codeFilter && (!scopeFilter || scopeByTopic.get(issue.topicId) === scopeFilter)
    );
    process.stdout.write(`${JSON.stringify({
      code: codeFilter,
      scope: scopeFilter ?? "all",
      matchingIssueCount: matchingIssues.length,
      issues: matchingIssues.slice(0, limit)
    }, null, 2)}\n`);
  } else if (process.argv.includes("--summary")) {
    const issuesByCode = Object.fromEntries(
      Object.entries(Object.groupBy(result.issues, (issue) => issue.code))
        .map(([code, codeIssues]) => [code, codeIssues?.length ?? 0])
        .sort((left, right) => Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]), "en"))
    );
    process.stdout.write(`${JSON.stringify({
      verdict: result.verdict,
      scope: result.scope,
      issueCounts: result.issueCounts,
      affectedLessons: result.rows.filter((row) => row.issueCount > 0).length,
      issuesByCode
    }, null, 2)}\n`);
  } else if (process.argv.includes("--markdown")) process.stdout.write(markdownReport(result));
  else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.verdict !== "passed") process.exitCode = 1;
}
