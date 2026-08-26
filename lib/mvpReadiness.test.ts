import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { normalizeQuestionDiagram, validateQuestionDiagram } from "./questionFigure";
import californiaMiddleSchoolLivePack from "../data/generated-content/us-ca-math-middle-school-textbooks-v2/live-lessons.json";
import californiaMiddleSchoolTextbookPack from "../data/generated-content/us-ca-math-textbooks-v1/textbook-pack.json";
import { buildWorkedExampleIllustrationMetadata } from "../components/lesson/workedExampleIllustrationMetadata";
import { hasCcssLessonAssignment } from "../data/ccssLessonAssignments";
import { productionLessonSeeds } from "../data/lessons";
import { grades } from "../data/grades";
import {
  getMainlandHjbPrimaryLessonIllustration,
  mainlandHjbPrimaryLessonIllustrations
} from "../data/mainlandHjbPrimaryLessonIllustrations";
import { mainlandHjbPrimaryTopics } from "../data/mainlandHjbPrimaryTopics";
import {
  getMainlandPepHighLessonIllustration,
  mainlandPepHighLessonIllustrations
} from "../data/mainlandPepHighLessonIllustrations";
import { mainlandPepHighTopics } from "../data/mainlandPepHighTopics";
import {
  getMainlandPepJuniorLessonIllustration,
  mainlandPepJuniorLessonIllustrations
} from "../data/mainlandPepJuniorLessonIllustrations";
import { mainlandPepJuniorTopics } from "../data/mainlandPepJuniorTopics";
import {
  getMainlandPepPrimaryLessonIllustration,
  mainlandPepPrimaryLessonIllustrations
} from "../data/mainlandPepPrimaryLessonIllustrations";
import { mainlandPepPrimaryTopics } from "../data/mainlandPepPrimaryTopics";
import {
  getUsArkansasMiddleSchoolLessonIllustration,
  usArkansasMiddleSchoolLessonIllustrations
} from "../data/usArkansasMiddleSchoolLessonIllustrations";
import { usArkansasMiddleSchoolLessonSeeds } from "../data/usArkansasMiddleSchoolLessons";
import { usArkansasTopics } from "../data/usArkansasTopics";
import { californiaHighSchoolTextbookChapters } from "../data/usCaliforniaHighSchoolLessonIllustrations";
import { usFloridaMiddleSchoolLessonSeeds } from "../data/usFloridaMiddleSchoolLessons";
import { usFloridaMiddleSchoolQuestions } from "../data/usFloridaMiddleSchoolQuestions";
import { usFloridaMiddleSchoolTopics } from "../data/usFloridaMiddleSchoolTopics";
import { questions } from "../data/questions";
import { topics } from "../data/topics";
import {
  capstoneVisualizationLabs,
  primaryVisualizationLabs,
  visualizationLabCatalog,
  visualizationLabelsByTopicId,
  visualizationTemplateIds
} from "../data/visualizationLabs";
import { lessonSlugForTopicId } from "./lessonLinks";
import { createSessionToken, verifySessionToken } from "./session";
import type { GradeId, Question } from "../types";

function restoreEnv(name: string, value: string | undefined) {
  if (typeof value === "undefined") {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

function setEnv(name: string, value: string) {
  (process.env as Record<string, string | undefined>)[name] = value;
}

function readPngSize(filePath: string) {
  const buffer = readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

const graphFriendlyTopicIds = new Set([
  "coordinates",
  "coordinate-geometry",
  "functions",
  "quadratic-patterns",
  "data-handling",
  "p4-angles",
  "p4-decimals",
  "p5-volume",
  "p6-speed",
  "trigonometry-s5",
  "statistics-s1",
  "statistics-s6",
  "calculus"
]);

function hasAcceptedAliases(question: Question) {
  return Boolean(question.acceptedAnswers?.length);
}

function answerNeedsAliases(answer: string) {
  const trimmed = answer.trim();
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return false;
  return /[%°$/:^=(),+]|[a-z]\^|\d+[a-z]/i.test(trimmed) || /\b(?:cm|ml|km|hk\$)\b/i.test(trimmed);
}

function answerLooksLikeProse(answer: string) {
  const trimmed = answer.trim();
  if (!/[a-z]/i.test(trimmed) || answerNeedsAliases(trimmed)) return false;
  if (/^[a-z]{1,4}$/i.test(trimmed)) return false;
  if (/[\\≤≥√∠_{}]|(?:^|\s)[a-z]\s*[<>=≤≥]/i.test(trimmed)) return false;
  if (/\b(?:log|lg|ln|sin|cos|tan|sqrt|frac)\b/i.test(trimmed)) return false;
  return !/^[a-z]$/i.test(trimmed);
}

function hasCjkAlias(question: Question) {
  return (question.acceptedAnswers ?? []).some((answer) => /[\u3400-\u9fff]/.test(answer));
}

function isMainlandHjbLessonOnlyTopic(topic: (typeof topics)[number]) {
  return topic.publisher === "MAINLAND_HJB" || topic.curriculumProfile?.publisher === "MAINLAND_HJB";
}

function isPracticeBackedTopic(topic: (typeof topics)[number]) {
  return !isMainlandHjbLessonOnlyTopic(topic);
}

function isFullPracticeSetTopic(topic: (typeof topics)[number]) {
  return !["US_CA_MATH", "US_NC_MATH"].includes(topic.curriculumTrack);
}

function isUsArkansasMiddleSchoolLessonTopic(topic: (typeof topics)[number]) {
  return topic.curriculumTrack === "US_AR_MATH" && /^us-ar-math-g0[678]-chapter-/.test(topic.id);
}

function isProductionLessonRequiredTopic(topic: (typeof topics)[number]) {
  if (isUsArkansasMiddleSchoolLessonTopic(topic)) return true;
  if (topic.curriculumTrack === "US_AR_MATH" || topic.curriculumTrack === "US_CA_MATH" || topic.curriculumTrack === "US_NC_MATH") {
    return false;
  }
  if (topic.publisher === "MAINLAND_BNU" || topic.curriculumProfile?.publisher === "MAINLAND_BNU") {
    return true;
  }
  return true;
}

function isCoreBilingualAnswerQuestion(question: Question) {
  return question.region !== "US" && question.publisher !== "MAINLAND_BNU" && question.publisher !== "MAINLAND_HJB";
}

function parseTraditionalMap(source: string) {
  const start = source.indexOf("export const traditionalToSimplifiedMap");
  assert.notEqual(start, -1);
  const bodyStart = source.indexOf("{", start);
  const bodyEnd = source.indexOf("\n};", bodyStart);
  assert.notEqual(bodyStart, -1);
  assert.notEqual(bodyEnd, -1);

  const entries = new Map<string, string>();
  for (const match of source.slice(bodyStart + 1, bodyEnd).matchAll(/^\s*([^:\s]+):\s*"([^"]*)"/gm)) {
    entries.set(match[1], match[2]);
  }
  return entries;
}

function parsePrcPhraseRules(source: string) {
  return Array.from(source.matchAll(/source:\s*"([^"]+)",\s*replacement:\s*"([^"]+)"/g)).map((match) => ({
    source: match[1],
    replacement: match[2]
  }));
}

function applyTestPrcSimplified(text: string) {
  const source = readFileSync(path.join(process.cwd(), "lib/i18n.ts"), "utf8");
  const characterMap = parseTraditionalMap(source);
  const phraseRules = parsePrcPhraseRules(source);
  const converted = Array.from(text).map((char) => characterMap.get(char) ?? char).join("");
  return phraseRules.reduce((current, rule) => current.split(rule.source).join(rule.replacement), converted);
}

test("seed content has at least one practice question for every practice-backed roadmap topic", () => {
  const questionTopicIds = new Set(questions.map((question) => question.topicId));
  const missingTopics = topics
    .filter(isPracticeBackedTopic)
    .filter((topic) => !questionTopicIds.has(topic.id))
    .map((topic) => topic.id);

  assert.deepEqual(missingTopics, []);
  assert.ok(questions.length >= topics.filter(isPracticeBackedTopic).length);
});

test("seed question IDs are unique", () => {
  const ids = questions.map((question) => question.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("each practice-backed roadmap topic has a useful minimum question set", () => {
  const minimumQuestionCount = 5;
  const undercoveredTopics = topics
    .filter(isPracticeBackedTopic)
    .filter(isFullPracticeSetTopic)
    .map((topic) => ({
      topicId: topic.id,
      count: questions.filter((question) => question.topicId === topic.id).length
    }))
    .filter((topic) => topic.count < minimumQuestionCount)
    .map((topic) => `${topic.topicId}: ${topic.count}`);

  assert.deepEqual(undercoveredTopics, []);
});

test("practice question bank does not export generated coverage filler", () => {
  const generatedIds = questions
    .filter((question) => question.id.startsWith("coverage-"))
    .map((question) => question.id);

  assert.deepEqual(generatedIds, []);
});

test("practice graph questions use suitable topics and valid coordinate ranges", () => {
  const graphIssues = questions.flatMap((question) => {
    const issues: string[] = [];
    if (question.type !== "graph") return issues;

    if (!graphFriendlyTopicIds.has(question.topicId)) {
      issues.push(`${question.id}: graph question is not suitable for ${question.topicId}`);
    }

    if (!question.diagram) {
      issues.push(`${question.id}: missing diagram`);
      return issues;
    }

    const normalizedDiagram = normalizeQuestionDiagram(question.diagram);
    if (!normalizedDiagram) {
      issues.push(`${question.id}: diagram does not conform to the question figure spec`);
      return issues;
    }
    validateQuestionDiagram(normalizedDiagram).forEach((issue) => {
      issues.push(`${question.id}: ${issue}`);
    });

    if (question.diagram.kind !== "coordinate-grid") return issues;

    const [xMin, xMax] = question.diagram.xRange;
    const [yMin, yMax] = question.diagram.yRange;
    const points = [
      ...(question.diagram.points ?? []).map((point) => ({ ...point, label: point.label })),
      ...(question.diagram.lines ?? []).flatMap((line) =>
        line.points.map((point, index) => ({ ...point, label: `${line.label ?? "line"}-${index}` }))
      )
    ];

    points.forEach((point) => {
      if (point.x < xMin || point.x > xMax || point.y < yMin || point.y > yMax) {
        issues.push(`${question.id}: ${point.label} (${point.x}, ${point.y}) outside x=${xMin}..${xMax}, y=${yMin}..${yMax}`);
      }
    });

    return issues;
  });

  assert.deepEqual(graphIssues, []);
});

test("auto-graded non-multiple-choice answers include aliases for brittle formats", () => {
  const missingAliasIds = questions
    .filter((question) => question.type !== "multiple-choice")
    .filter((question) => answerNeedsAliases(question.answer))
    .filter((question) => !hasAcceptedAliases(question))
    .map((question) => `${question.id}: ${question.answer}`);

  assert.deepEqual(missingAliasIds, []);
});

test("prose short answers include Chinese aliases for bilingual grading", () => {
  const missingCjkAliasIds = questions
    .filter(isCoreBilingualAnswerQuestion)
    .filter((question) => question.type === "short-answer" || question.type === "fill-in" || question.type === "graph")
    .filter((question) => answerLooksLikeProse(question.answer))
    .filter((question) => !hasCjkAlias(question))
    .map((question) => `${question.id}: ${question.answer}`);

  assert.deepEqual(missingCjkAliasIds, []);
});

test("Simplified Chinese fallback follows PRC character and terminology rules", () => {
  assert.equal(applyTestPrcSimplified("先追蹤學習進度，再開啟視覺化課節。"), "先追踪学习进度，再开启可视化课时。");
  assert.equal(applyTestPrcSimplified("函數圖像與常態分佈"), "函数图象与正态分布");
  assert.equal(applyTestPrcSimplified("學生帳戶電郵"), "学生账号邮箱");
});

test("Simplified Chinese uses explicit zhHans copy before fallback conversion", () => {
  const i18nSource = readFileSync(path.join(process.cwd(), "lib/i18n.ts"), "utf8");

  assert.match(i18nSource, /if \(language === "zh-Hans" && value\.zhHans\) return value\.zhHans;/);
  assert.equal(applyTestPrcSimplified("追蹤"), "追踪");
});

test("Simplified Chinese grade labels use Mainland school-stage wording", () => {
  assert.equal(grades.find((grade) => grade.id === "P1")?.name.zhHans, "小学一年级");
  assert.equal(grades.find((grade) => grade.id === "S1")?.name.zhHans, "初一");
  assert.equal(grades.find((grade) => grade.id === "S6")?.name.zhHans, "高三");
});

test("visualization lab topic IDs exist in the roadmap topics", () => {
  const topicIds = new Set(topics.map((topic) => topic.id));
  const missingLabTopicIds = visualizationLabCatalog
    .map((lab) => lab.topicId)
    .filter((topicId) => !topicIds.has(topicId));

  assert.deepEqual(missingLabTopicIds, []);
});

test("visualization catalog covers every roadmap topic plus five capstones", () => {
  const topicIds = topics.map((topic) => topic.id);
  const primaryTopicIds = primaryVisualizationLabs.map((lab) => lab.topicId);
  const duplicateLabIds = visualizationLabCatalog
    .map((lab) => lab.labId)
    .filter((labId, index, labIds) => labIds.indexOf(labId) !== index);
  const duplicatePrimaryTopicIds = primaryTopicIds.filter((topicId, index) => primaryTopicIds.indexOf(topicId) !== index);
  const invalidTemplateIds = visualizationLabCatalog
    .map((lab) => lab.templateId)
    .filter((templateId) => !visualizationTemplateIds.includes(templateId));

  assert.equal(visualizationLabCatalog.length, topicIds.length + 5);
  assert.equal(primaryVisualizationLabs.length, topicIds.length);
  assert.equal(capstoneVisualizationLabs.length, 5);
  assert.deepEqual(new Set(primaryTopicIds), new Set(topicIds));
  assert.deepEqual(duplicateLabIds, []);
  assert.deepEqual(duplicatePrimaryTopicIds, []);
  assert.deepEqual(invalidTemplateIds, []);
});

test("roadmap visualization suite has labels for every roadmap topic", () => {
  const labelIds = new Set(Object.keys(visualizationLabelsByTopicId));
  const missingRoadmapVisualizationLabels = topics
    .map((topic) => topic.id)
    .filter((topicId) => !labelIds.has(topicId));

  assert.deepEqual(missingRoadmapVisualizationLabels, []);
});

test("every roadmap topic has exactly one production-ready lesson seed", () => {
  const topicIds = topics.filter(isProductionLessonRequiredTopic).map((topic) => topic.id);
  const productionReadyTopicIds = productionLessonSeeds
    .filter((lesson) => lesson.productionReady)
    .map((lesson) => lesson.topicId);
  const productionReadyTopicIdSet = new Set(productionReadyTopicIds);
  const duplicateTopicIds = productionReadyTopicIds.filter((topicId, index) => productionReadyTopicIds.indexOf(topicId) !== index);

  const missingTopicIds = topicIds.filter((topicId) => !productionReadyTopicIdSet.has(topicId));
  // Optional-seed tracks (US_CA_MATH textbook rollout and similar) may ship
  // production-ready lessons incrementally beyond the required roadmap set, so
  // "extra" only flags seeds whose topicId does not exist in the topic catalog
  // at all (dangling references / typos).
  const allTopicIdSet = new Set(topics.map((topic) => topic.id));
  const extraTopicIds = productionReadyTopicIds.filter((topicId) => !allTopicIdSet.has(topicId));

  assert.deepEqual({ missingTopicIds, extraTopicIds, duplicateTopicIds }, {
    missingTopicIds: [],
    extraTopicIds: [],
    duplicateTopicIds: []
  });
});

test("mainland PEP junior and high-school lesson seeds cover every S1-S6 topic", () => {
  const mainlandSecondaryTopicIds = topics
    .filter((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH" && topic.grade.startsWith("S"))
    .filter((topic) => topic.id.startsWith("pep-") || topic.publisher === "MAINLAND_PEP" || topic.curriculumProfile?.publisher === "MAINLAND_PEP")
    .filter(isPracticeBackedTopic)
    .map((topic) => topic.id);
  const mainlandSecondaryLessonIds = productionLessonSeeds
    .filter((lesson) => lesson.productionReady && mainlandSecondaryTopicIds.includes(lesson.topicId))
    .map((lesson) => lesson.topicId);

  assert.ok(mainlandSecondaryTopicIds.length >= 33);
  assert.deepEqual(new Set(mainlandSecondaryLessonIds), new Set(mainlandSecondaryTopicIds));
});

test("Florida B.E.S.T. middle-school textbook beta has topics, questions, and lesson seeds", () => {
  const gradeCounts = new Map<string, number>();
  usFloridaMiddleSchoolTopics.forEach((topic) => {
    gradeCounts.set(topic.grade, (gradeCounts.get(topic.grade) ?? 0) + 1);
  });

  assert.equal(usFloridaMiddleSchoolTopics.length, 15);
  assert.deepEqual(Object.fromEntries(gradeCounts), { P6: 5, S1: 5, S2: 5 });
  assert.equal(usFloridaMiddleSchoolQuestions.length, 75);
  assert.equal(usFloridaMiddleSchoolLessonSeeds.length, 15);

  const questionCountsByTopic = new Map<string, number>();
  usFloridaMiddleSchoolQuestions.forEach((question) => {
    assert.equal(question.curriculumTrack, "US_FL_MATH");
    assert.equal(question.publisher, "US_FL_MATH");
    questionCountsByTopic.set(question.topicId, (questionCountsByTopic.get(question.topicId) ?? 0) + 1);
  });

  const lessonTopicIds = new Set(usFloridaMiddleSchoolLessonSeeds.map((lesson) => lesson.topicId));
  usFloridaMiddleSchoolTopics.forEach((topic) => {
    assert.equal(topic.curriculumTrack, "US_FL_MATH");
    assert.equal(topic.publisher, "US_FL_MATH");
    assert.equal(questionCountsByTopic.get(topic.id), 5);
    assert.equal(lessonTopicIds.has(topic.id), true);
  });
});

test("production lesson seeds meet the authored block standard", () => {
  // Topics with a CCSS lesson assignment (2026-07-19 port) replace the
  // generated concept + worked-example blocks with interactive lesson cores;
  // the checklist/extension shell blocks remain required for everyone.
  const requiredBlockTypesFor = (lesson: (typeof productionLessonSeeds)[number]) =>
    hasCcssLessonAssignment(lesson.topicId)
      ? ["interactive-lesson", "checklist", "extension"]
      : ["concept", "worked-example", "checklist", "extension"];
  const productionReadyLessons = productionLessonSeeds.filter((lesson) => lesson.productionReady);

  const missingRequiredBlocks = productionReadyLessons.flatMap((lesson) =>
    requiredBlockTypesFor(lesson)
      .filter((type) => !lesson.blocks.some((block) => block.type === type))
      .map((type) => `${lesson.topicId}: missing ${type}`)
  );

  const weakChecklistBlocks = productionReadyLessons
    .map((lesson) => {
      const checklist = lesson.blocks.find((block) => block.type === "checklist");
      const itemCount = checklist?.items?.length ?? 0;
      return itemCount < 3 || itemCount > 5 ? `${lesson.topicId}: ${itemCount} checklist items` : null;
    })
    .filter((issue): issue is string => Boolean(issue));

  const weakExtensionBlocks = productionReadyLessons
    .map((lesson) => {
      const extension = lesson.blocks.find((block) => block.type === "extension");
      const itemCount = extension?.items?.length ?? 0;
      return itemCount < 2 ? `${lesson.topicId}: ${itemCount} extension items` : null;
    })
    .filter((issue): issue is string => Boolean(issue));

  const missingAuthoredText = productionReadyLessons.flatMap((lesson) =>
    lesson.blocks.flatMap((block) => {
      const issues: string[] = [];
      if ((block.type === "concept" || block.type === "worked-example") && (!block.content?.en || !block.content.zh)) {
        issues.push(`${lesson.topicId}: ${block.type} missing bilingual content`);
      }
      if (block.type === "interactive-lesson" && !block.content?.en) {
        issues.push(`${lesson.topicId}: interactive lesson missing read-aloud narration content`);
      }
      if ((block.type === "checklist" || block.type === "extension") && !block.items?.length) {
        issues.push(`${lesson.topicId}: ${block.type} missing items`);
      }
      return issues;
    })
  );

  assert.deepEqual([...missingRequiredBlocks, ...weakChecklistBlocks, ...weakExtensionBlocks, ...missingAuthoredText], []);
});

test("Mainland PEP high lesson illustrations stay withdrawn pending owner-approved redraw", () => {
  const slots = ["concept", "worked-example"] as const;
  const topicIds = mainlandPepHighTopics.map((topic) => topic.id);
  const issues: string[] = [];

  assert.equal(topicIds.length, 22);
  assert.equal(mainlandPepHighLessonIllustrations.length, 0);

  topicIds.forEach((topicId) => {
    slots.forEach((slot) => {
      if (getMainlandPepHighLessonIllustration(topicId, slot)) {
        issues.push(`${topicId}: ${slot} illustration should be withdrawn`);
      }
    });
  });

  assert.deepEqual(issues, []);
});

test("Mainland PEP junior lesson illustrations cover approved concept and worked-example assets", () => {
  const slots = ["concept", "worked-example"] as const;
  const topicIds = mainlandPepJuniorTopics.map((topic) => topic.id);
  const topicIdSet = new Set(topicIds);
  const seenKeys = new Set<string>();
  const issues: string[] = [];

  assert.equal(topicIds.length, 11);
  assert.equal(mainlandPepJuniorLessonIllustrations.length, topicIds.length * slots.length);

  topicIds.forEach((topicId) => {
    slots.forEach((slot) => {
      if (!getMainlandPepJuniorLessonIllustration(topicId, slot)) {
        issues.push(`${topicId}: missing ${slot} illustration`);
      }
    });
  });

  mainlandPepJuniorLessonIllustrations.forEach((illustration) => {
    const key = `${illustration.topicId}:${illustration.slot}`;
    if (seenKeys.has(key)) issues.push(`${key}: duplicate illustration`);
    seenKeys.add(key);

    if (!topicIdSet.has(illustration.topicId) || !illustration.topicId.startsWith("pep-junior-")) {
      issues.push(`${illustration.id}: non-PEP-junior topic ${illustration.topicId}`);
    }
    if (!slots.includes(illustration.slot)) {
      issues.push(`${illustration.id}: invalid slot ${illustration.slot}`);
    }
    if (illustration.src !== `/lesson-illustrations/mainland-pep-junior/${illustration.topicId}/${illustration.slot}.png`) {
      issues.push(`${illustration.id}: unexpected src ${illustration.src}`);
    }
    if (!existsSync(path.join(process.cwd(), "public", illustration.src.slice(1)))) {
      issues.push(`${illustration.id}: public image file is missing`);
    }
    if (illustration.width !== 1600 || illustration.height !== 900) {
      issues.push(`${illustration.id}: unexpected dimensions ${illustration.width}x${illustration.height}`);
    }
    if (!illustration.alt.en.trim() || !illustration.alt.zh.trim() || !illustration.alt.zhHans?.trim()) {
      issues.push(`${illustration.id}: missing localized alt text`);
    }
    if (!illustration.caption.en.trim() || !illustration.caption.zh.trim() || !illustration.caption.zhHans?.trim()) {
      issues.push(`${illustration.id}: missing localized caption`);
    }
    if (!illustration.ragCardIds.length || !illustration.ragCardIds.includes(illustration.topicId)) {
      issues.push(`${illustration.id}: missing RAG traceability`);
    }
  });

  assert.deepEqual(issues, []);
});

test("Mainland PEP primary lesson illustrations stay withdrawn pending approved asset promotion", () => {
  const slots = ["concept", "worked-example"] as const;
  const topicIds = mainlandPepPrimaryTopics.map((topic) => topic.id);
  const issues: string[] = [];

  assert.equal(topicIds.length, 24);
  // Metadata was authored ahead of asset production; no approved public PNG
  // assets exist, so the live illustration surface is withdrawn (drafts are
  // preserved in data/mainlandPepPrimaryLessonIllustrations.ts).
  assert.equal(mainlandPepPrimaryLessonIllustrations.length, 0);

  topicIds.forEach((topicId) => {
    slots.forEach((slot) => {
      if (getMainlandPepPrimaryLessonIllustration(topicId, slot)) {
        issues.push(`${topicId}: ${slot} illustration should be withdrawn`);
      }
    });
  });

  assert.deepEqual(issues, []);
});

test("Mainland HJB primary lesson illustrations cover approved concept and worked-example assets", () => {
  const slots = ["concept", "worked-example"] as const;
  const topicIds = mainlandHjbPrimaryTopics.map((topic) => topic.id);
  const topicIdSet = new Set(topicIds);
  const seenKeys = new Set<string>();
  const issues: string[] = [];

  assert.equal(topicIds.length, 70);
  assert.equal(mainlandHjbPrimaryLessonIllustrations.length, topicIds.length * slots.length);

  topicIds.forEach((topicId) => {
    slots.forEach((slot) => {
      if (!getMainlandHjbPrimaryLessonIllustration(topicId, slot)) {
        issues.push(`${topicId}: missing ${slot} illustration`);
      }
    });
  });

  mainlandHjbPrimaryLessonIllustrations.forEach((illustration) => {
    const key = `${illustration.topicId}:${illustration.slot}`;
    const publicPath = path.join(process.cwd(), "public", illustration.src.slice(1));
    if (seenKeys.has(key)) issues.push(`${key}: duplicate illustration`);
    seenKeys.add(key);

    if (!topicIdSet.has(illustration.topicId) || !illustration.topicId.startsWith("hjb-primary-")) {
      issues.push(`${illustration.id}: non-HJB-primary topic ${illustration.topicId}`);
    }
    if (!slots.includes(illustration.slot)) {
      issues.push(`${illustration.id}: invalid slot ${illustration.slot}`);
    }
    if (illustration.src !== `/lesson-illustrations/mainland-hjb-primary/${illustration.topicId}/${illustration.slot}.png`) {
      issues.push(`${illustration.id}: unexpected src ${illustration.src}`);
    }
    if (!existsSync(publicPath)) {
      issues.push(`${illustration.id}: public image file is missing`);
    } else {
      const size = readPngSize(publicPath);
      if (!size) {
        issues.push(`${illustration.id}: public image is not a valid PNG`);
      } else if (size.width !== 1600 || size.height !== 900) {
        issues.push(`${illustration.id}: public PNG dimensions are ${size.width}x${size.height}`);
      }
    }
    if (illustration.width !== 1600 || illustration.height !== 900) {
      issues.push(`${illustration.id}: unexpected dimensions ${illustration.width}x${illustration.height}`);
    }
    if (!illustration.alt.en.trim() || !illustration.alt.zh.trim() || !illustration.alt.zhHans?.trim()) {
      issues.push(`${illustration.id}: missing localized alt text`);
    }
    if (!illustration.caption.en.trim() || !illustration.caption.zh.trim() || !illustration.caption.zhHans?.trim()) {
      issues.push(`${illustration.id}: missing localized caption`);
    }
    if (!illustration.ragCardIds.length) {
      issues.push(`${illustration.id}: missing RAG traceability`);
    }
  });

  assert.deepEqual(issues, []);
});

test("US Arkansas middle-school candidate lessons stay preserved but unreachable pending promotion", () => {
  const slots = ["concept", "worked-example"] as const;
  const topicIds = usArkansasMiddleSchoolLessonSeeds.map((lessonSeed) => lessonSeed.topicId);
  const candidateTopicIds = new Set(topicIds);
  const liveArkansasTopicIds = new Set(usArkansasTopics.map((topic) => topic.id));
  const liveTopicIds = new Set(topics.map((topic) => topic.id));
  const liveProductionTopicIds = new Set(productionLessonSeeds.map((lessonSeed) => lessonSeed.topicId));
  const issues: string[] = [];

  assert.equal(topicIds.length, 15);
  assert.equal(candidateTopicIds.size, topicIds.length);
  // Metadata was drafted ahead of S24 exact-layer asset production; no PNG
  // assets exist. The immutable candidate lesson source remains reviewable,
  // while its topic, lesson, practice, and illustration projections all stay
  // outside the live aggregates until an exact promotion closes.
  assert.equal(usArkansasMiddleSchoolLessonIllustrations.length, 0);

  topicIds.forEach((topicId) => {
    if (liveArkansasTopicIds.has(topicId)) issues.push(`${topicId}: candidate remains in Arkansas live topics`);
    if (liveTopicIds.has(topicId)) issues.push(`${topicId}: candidate remains in the global live topic aggregate`);
    if (liveProductionTopicIds.has(topicId)) issues.push(`${topicId}: candidate remains in production lesson seeds`);
    if (questions.some((question) => question.topicId === topicId)) {
      issues.push(`${topicId}: candidate remains reachable from live practice questions`);
    }
    slots.forEach((slot) => {
      if (getUsArkansasMiddleSchoolLessonIllustration(topicId, slot)) {
        issues.push(`${topicId}: ${slot} illustration should be withdrawn`);
      }
    });
  });

  usArkansasMiddleSchoolLessonSeeds.forEach((lessonSeed) => {
    const blockTypes = new Set(lessonSeed.blocks.map((block) => block.type));
    if (!blockTypes.has("concept")) issues.push(`${lessonSeed.topicId}: missing concept block`);
    if (!blockTypes.has("worked-example")) issues.push(`${lessonSeed.topicId}: missing worked-example block`);
    if (lessonSeed.practiceQuestionIds?.length) {
      issues.push(`${lessonSeed.topicId}: candidate source retains a live practice-question link`);
    }
  });

  assert.deepEqual(issues, []);
});

test("worked-example illustration renderer covers all curriculum lesson units", () => {
  const lessonSeedsWithWorkedExamples = productionLessonSeeds.filter((lessonSeed) =>
    lessonSeed.blocks.some((block) => block.type === "worked-example")
  );
  const bannedAgeFitTerms = /\b(?:casino|weapon|blood|romance|alcohol|violence)\b/i;
  const issues: string[] = [];
  const kinds = new Set<string>();
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));

  // The fail-closed promotion audit removed 239 unverified candidate-backed
  // lesson seeds from live aggregation. The remaining 187 authored
  // worked-example units are the exact renderer coverage baseline; candidate
  // source modules are tested separately and must not inflate this live count.
  assert.equal(lessonSeedsWithWorkedExamples.length, 187);

  lessonSeedsWithWorkedExamples.forEach((lessonSeed) => {
    const workedExample = lessonSeed.blocks.find((block) => block.type === "worked-example");
    const metadata = buildWorkedExampleIllustrationMetadata({
      content: workedExample?.content?.en ?? "",
      grade: (topicById.get(lessonSeed.topicId)?.grade ?? "P1") as GradeId,
      publisher: lessonSeed.topicId.startsWith("us-ca-") ? "US_CA_MATH" : undefined,
      title: lessonSeed.title.en,
      topicId: lessonSeed.topicId
    });

    kinds.add(metadata.kind);
    if (metadata.qa.status !== "qa-pass") issues.push(`${lessonSeed.topicId}: qa status ${metadata.qa.status}`);
    if (metadata.qa.themeAlignment !== "pass") issues.push(`${lessonSeed.topicId}: theme alignment not pass`);
    if (metadata.qa.gradeFit !== "pass") issues.push(`${lessonSeed.topicId}: grade fit not pass`);
    if (metadata.qa.sourceDistance !== "pass-original-MAIS-svg") issues.push(`${lessonSeed.topicId}: source distance not pass`);
    if (!metadata.alt.trim() || !metadata.caption.trim()) issues.push(`${lessonSeed.topicId}: missing alt or caption`);
    if (bannedAgeFitTerms.test(`${metadata.alt} ${metadata.caption}`)) {
      issues.push(`${lessonSeed.topicId}: age-fit banned term in metadata`);
    }
  });

  assert.ok(kinds.size >= 8, `expected varied visual templates, got ${Array.from(kinds).join(", ")}`);
  assert.deepEqual(issues, []);
});

test("California textbook worked examples have visual QA coverage", () => {
  const issues: string[] = [];
  const middleLiveLessons = californiaMiddleSchoolLivePack.lessons;
  const middleTextbookChapters = californiaMiddleSchoolTextbookPack.books
    .filter((book) => ["P6", "S1", "S2"].includes(book.grade))
    .flatMap((book) => book.chapters.map((chapter) => ({ book, chapter })));
  let highSchoolWorkedExampleCount = 0;

  assert.equal(middleLiveLessons.length, 15);
  assert.equal(middleTextbookChapters.length, 15);

  middleLiveLessons.forEach((lesson) => {
    const example = lesson.studentLesson.en.workedExamples[0];
    const metadata = buildWorkedExampleIllustrationMetadata({
      content: `${example.prompt} ${example.answer} ${example.explanation}`,
      grade: lesson.metadata.grade as GradeId,
      publisher: "US_CA_MATH",
      title: lesson.studentLesson.en.title,
      topicId: lesson.id
    });

    if (metadata.qa.status !== "qa-pass") issues.push(`${lesson.id}: generated illustration metadata not qa-pass`);
    if (!metadata.alt.includes("worked example illustration")) issues.push(`${lesson.id}: missing worked-example alt`);
  });

  middleTextbookChapters.forEach(({ book, chapter }) => {
    const example = chapter.studentText.en.workedExamples[0] as {
      answer?: string;
      check?: string;
      explanation?: string;
      prompt: string;
      solution?: string;
    };
    const metadata = buildWorkedExampleIllustrationMetadata({
      content: `${example.prompt} ${example.answer ?? ""} ${example.solution ?? example.explanation ?? example.check ?? ""}`,
      grade: book.grade as GradeId,
      publisher: "US_CA_MATH",
      title: chapter.chapterTitle.en,
      topicId: chapter.id
    });

    if (metadata.qa.status !== "qa-pass") issues.push(`${chapter.id}: generated illustration metadata not qa-pass`);
    if (!metadata.caption.includes("Focus:")) issues.push(`${chapter.id}: missing focus caption`);
  });

  californiaHighSchoolTextbookChapters.forEach((chapter) => {
    chapter.workedExamples.forEach((example) => {
      highSchoolWorkedExampleCount += 1;
      const metadata = buildWorkedExampleIllustrationMetadata({
        content: `${example.prompt.en} ${example.answer.en} ${example.solutionSteps.en.join(" ")}`,
        grade: chapter.grade,
        publisher: "US_CA_MATH",
        title: `${chapter.title.en} ${example.title}`,
        topicId: example.exampleId
      });

      if (metadata.qa.status !== "qa-pass") issues.push(`${example.exampleId}: generated illustration metadata not qa-pass`);
      if (!metadata.alt.includes("worked example illustration")) issues.push(`${example.exampleId}: missing worked-example alt`);
    });
  });

  assert.equal(highSchoolWorkedExampleCount, 40);
  assert.deepEqual(issues, []);
});

test("production lessons with visualization blocks reuse primary lab mappings", () => {
  const productionReadyLessonByTopicId = new Map(
    productionLessonSeeds
      .filter((lesson) => lesson.productionReady)
      .map((lesson) => [lesson.topicId, lesson])
  );

  const visualizationMappingIssues = primaryVisualizationLabs.flatMap((lab) => {
      const lesson = productionReadyLessonByTopicId.get(lab.topicId);
      const visualizationBlock = lesson?.blocks.find((block) => block.type === "visualization");

      if (!lesson || !visualizationBlock?.visualizationConfig) return [];

      const actual = visualizationBlock.visualizationConfig;
      const issues: string[] = [];
      if (actual.moduleId !== lab.moduleId) issues.push(`${lab.topicId}: module ${actual.moduleId} !== ${lab.moduleId}`);
      if (actual.source !== lab.analyticsSource) issues.push(`${lab.topicId}: source ${actual.source} !== ${lab.analyticsSource}`);
      if (actual.topicId !== lab.topicId) issues.push(`${lab.topicId}: topic ${actual.topicId} !== ${lab.topicId}`);
      return issues;
  });

  assert.deepEqual(visualizationMappingIssues, []);
});

test("production-ready lesson seeds do not use generic placeholder phrasing", () => {
  const topicIds = new Set(topics.map((topic) => topic.id));
  const genericPhrases = [
    "Start with the meaning of",
    "Start by naming",
    "Build this topic through concept explanation",
    "Concept, Model, and Practice"
  ];

  const productionReadyLessons = productionLessonSeeds.filter((lesson) => lesson.productionReady);
  const missingTopics = productionReadyLessons
    .filter((lesson) => !topicIds.has(lesson.topicId))
    .map((lesson) => lesson.topicId);
  assert.deepEqual(missingTopics, []);

  const placeholderHits = productionReadyLessons.flatMap((lesson) => {
    const text = [
      lesson.title.en,
      lesson.title.zh,
      lesson.description.en,
      lesson.description.zh,
      ...lesson.blocks.flatMap((block) => [
        block.title.en,
        block.title.zh,
        block.content?.en ?? "",
        block.content?.zh ?? "",
        ...(block.items ?? []).flatMap((item) => [item.en, item.zh])
      ])
    ].join("\n");

    return genericPhrases
      .filter((phrase) => text.toLowerCase().includes(phrase.toLowerCase()))
      .map((phrase) => `${lesson.topicId}: ${phrase}`);
  });

  assert.deepEqual(placeholderHits, []);
});

test("current recommended and showcase lessons use data-backed production content", () => {
  const productionReadyTopicIds = new Set(
    productionLessonSeeds
      .filter((lesson) => lesson.productionReady)
      .map((lesson) => lesson.topicId)
  );

  assert.equal(productionReadyTopicIds.has("quadratic-patterns"), true);
  assert.equal(productionReadyTopicIds.has("trigonometry-basics"), true);
});

test("client-referenced API routes are implemented", () => {
  const routeFiles = [
    "app/api/admin/storage/export/route.ts",
    "app/api/analytics/export/route.ts",
    "app/api/analytics/summary/route.ts",
    "app/api/lessons/[slug]/route.ts",
    "app/api/me/settings/route.ts",
    "app/api/mistakes/[questionId]/route.ts"
  ];
  const missingRoutes = routeFiles.filter((routeFile) => !existsSync(path.join(process.cwd(), routeFile)));

  assert.deepEqual(missingRoutes, []);
});

test("roadmap lesson links use slugs served by the lesson API route", () => {
  const routeFile = path.join(process.cwd(), "app/api/lessons/[slug]/route.ts");
  assert.equal(existsSync(routeFile), true);

  const slugs = topics.map((topic) => lessonSlugForTopicId(topic.id));
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(slugs.includes("quadratic-functions"));
});

test("session tokens require an explicit production secret", async () => {
  const previousSecret = process.env.AUTH_SESSION_SECRET;
  const previousNextAuthSecret = process.env.NEXTAUTH_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;

  try {
    delete process.env.AUTH_SESSION_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    setEnv("NODE_ENV", "production");

    await assert.rejects(() => createSessionToken({ userId: "student-peter", sessionRevision: 1 }));
    assert.equal(await verifySessionToken("invalid.token"), null);
  } finally {
    restoreEnv("AUTH_SESSION_SECRET", previousSecret);
    restoreEnv("NEXTAUTH_SECRET", previousNextAuthSecret);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

test("session tokens verify with a configured secret", async () => {
  const previousSecret = process.env.AUTH_SESSION_SECRET;
  const previousNextAuthSecret = process.env.NEXTAUTH_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;

  try {
    process.env.AUTH_SESSION_SECRET = "test-session-secret";
    delete process.env.NEXTAUTH_SECRET;
    setEnv("NODE_ENV", "production");

    const token = await createSessionToken({
      userId: "student-peter",
      sessionRevision: 1,
      now: Date.UTC(2026, 4, 7)
    });
    const payload = await verifySessionToken(token, Date.UTC(2026, 4, 7));

    assert.equal(payload?.sub, "student-peter");
    assert.ok(payload?.exp);
  } finally {
    restoreEnv("AUTH_SESSION_SECRET", previousSecret);
    restoreEnv("NEXTAUTH_SECRET", previousNextAuthSecret);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

test("parent console API surface and authorization hooks are present", () => {
  const routeFiles = [
    "app/api/parent/foundation/route.ts",
    "app/api/parent/children/[studentId]/summary/route.ts",
    "app/api/parent/children/link/route.ts",
    "app/api/parent/reports/route.ts",
    "app/api/parent/messages/route.ts",
    "app/api/parent/messages/[threadId]/reply/route.ts",
    "app/parent/layout.tsx",
    "app/parent/page.tsx",
    "app/parent/messages/page.tsx"
  ];
  const missingRoutes = routeFiles.filter((routeFile) => !existsSync(path.join(process.cwd(), routeFile)));
  const storeSource = readFileSync(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  // Parent-summary report handling was extracted from the legacy userStore facade
  // into lib/server/userStore/parentReportPersistence.ts; the readiness contract
  // follows the owning store-layer module.
  const parentReportPersistenceSource = readFileSync(
    path.join(process.cwd(), "lib/server/userStore/parentReportPersistence.ts"),
    "utf8"
  );
  const typeSource = readFileSync(path.join(process.cwd(), "types/index.ts"), "utf8");

  assert.deepEqual(missingRoutes, []);
  assert.match(storeSource, /guardian_links/);
  assert.match(storeSource, /parentCanAccessStudent/);
  assert.match(storeSource, /createParentMessageThread/);
  assert.match(parentReportPersistenceSource, /type === "parent-summary"/);
  assert.match(typeSource, /role: "student" \| "teacher" \| "parent" \| "admin"/);
  assert.match(typeSource, /export type ParentFoundationData/);
});
