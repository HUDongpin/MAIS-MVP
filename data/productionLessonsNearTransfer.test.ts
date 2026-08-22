import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import { mainlandHjbPrimaryLessonSeeds } from "./mainlandHjbPrimaryLessons";
import { mainlandHjbPrimaryQuestions } from "./mainlandHjbPrimaryQuestions";
import { productionLessonSeeds } from "./lessons";
import type { LocalizedText } from "@/types";

function sha256(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function localizedText(value?: LocalizedText | string) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return [value.en, value.zh, value.zhHans].filter(Boolean).join("\n");
}

function normalizeText(text: string) {
  return text
    .replace(/\\\(|\\\)/g, "")
    .replace(/[\u3002\uff0c]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanExpression(expression: string) {
  return expression
    .replace(/[\u3002\uff0c]/g, " ")
    .replace(/\s+/g, "")
    .replace(/\u00d7/g, "*")
    .replace(/\u00f7/g, "/")
    .replace(/\u2260/g, "!=")
    .trim();
}

function exampleSignatures(text: string) {
  const normalized = normalizeText(text);
  const signatures = new Set<string>();
  const patterns = [
    /x\^2[+-]\d+x[+-]\d+/g,
    /\b\d+\s*[+\-*/\u00d7\u00f7]\s*\d+\s*=\s*\d+\b/g,
    /\b\d+\s*\/\s*\(?x\s*[+-]\s*\d+\)?\s*=\s*\d+\b/g,
    /\bx\s*\/\s*\(?x\s*[+-]\s*\d+\)?\s*=\s*\d+\s*\/\s*\d+\b/g,
    /\b\d+\s*\/\s*\(?\d+\s*[+-]\s*\d+\)?\s*=\s*\d+\s*\/\s*\d+\b/g,
    /\b\d+\s*\/\s*\d+\b/g
  ];

  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      signatures.add(`expr:${cleanExpression(match[0])}`);
    }
  }

  for (const match of normalized.matchAll(/If\s+(\d+)\s+and\s+(\d+)\s+make\s+(\d+)/gi)) {
    signatures.add(`parts:${match[1]}+${match[2]}=${match[3]}`);
  }

  const placeValuePattern =
    /In\s+(\d{2,4})\b[^.\u3002]*?\b(\d)\b[^.\u3002]*?(hundred|ten|one|ones|tens|hundreds)/gi;
  for (const match of normalized.matchAll(placeValuePattern)) {
    signatures.add(`place:${match[1]}`);
  }

  return signatures;
}

function pairedConceptWorkedBlocks(lesson: (typeof productionLessonSeeds)[number]) {
  const pairs: Array<{
    conceptTitle: string;
    conceptText: string;
    workedText: string;
  }> = [];
  let concept: (typeof lesson.blocks)[number] | undefined;

  for (const block of lesson.blocks) {
    if (block.type === "concept") concept = block;
    if (block.type === "worked-example" && concept) {
      pairs.push({
        conceptTitle: localizedText(concept.title),
        conceptText: localizedText(concept.content),
        workedText: localizedText(block.content)
      });
      concept = undefined;
    }
  }

  return pairs;
}

describe("production lesson near-transfer examples", () => {
  it("does not repeat exact numeric examples from concept blocks in worked examples", () => {
    const findings: Array<{ topicId: string; conceptTitle: string; overlaps: string[] }> = [];

    for (const lesson of productionLessonSeeds) {
      for (const pair of pairedConceptWorkedBlocks(lesson)) {
        const conceptSignatures = exampleSignatures(pair.conceptText);
        const workedSignatures = exampleSignatures(pair.workedText);
        const overlaps = [...conceptSignatures].filter((signature) => workedSignatures.has(signature));

        if (overlaps.length > 0) {
          findings.push({
            topicId: lesson.topicId,
            conceptTitle: pair.conceptTitle,
            overlaps
          });
        }
      }
    }

    assert.deepEqual(findings, []);
  });

  it("uses one disjoint non-checkpoint HJB primary method without changing reviewed checkpoints", () => {
    const checkpointMatrix = mainlandHjbPrimaryLessonSeeds.map((lesson) => [
      lesson.topicId,
      lesson.practiceQuestionIds ?? []
    ] as const);
    const workedExampleSurface = mainlandHjbPrimaryLessonSeeds.map((lesson) => [
      lesson.topicId,
      lesson.blocks.find((block) => block.type === "worked-example")?.content
    ]);
    const conceptMethodSurface = mainlandHjbPrimaryLessonSeeds.map((lesson) => [
      lesson.topicId,
      lesson.blocks.find((block) => block.type === "concept")?.content
    ]);
    const conceptMethodSources: Array<[string, string[]]> = [];

    for (const lesson of mainlandHjbPrimaryLessonSeeds) {
      const concept = lesson.blocks.find((block) => block.type === "concept");
      const workedExample = lesson.blocks.find((block) => block.type === "worked-example");
      assert.ok(concept?.content, `${lesson.topicId} must expose a concept method`);
      assert.ok(workedExample?.content, `${lesson.topicId} must expose a worked example`);

      const conceptZhHans = typeof concept.content === "string"
        ? concept.content
        : concept.content.zhHans ?? concept.content.zh;
      const topicQuestions = mainlandHjbPrimaryQuestions.filter((question) => question.topicId === lesson.topicId);
      const workedExampleQuestion = topicQuestions[0];
      assert.ok(workedExampleQuestion, `${lesson.topicId} must retain its reviewed worked-example question`);
      const disallowedIds = new Set([workedExampleQuestion.id, ...(lesson.practiceQuestionIds ?? [])]);
      const methodSources = topicQuestions.filter((question) => {
        if (disallowedIds.has(question.id)) return false;
        const explanationZhHans = question.explanation.zhHans ?? question.explanation.zh;
        return conceptZhHans.includes(explanationZhHans);
      });

      assert.equal(methodSources.length, 1, `${lesson.topicId} must use exactly one distinct non-checkpoint method`);
      assert.deepEqual(
        [...exampleSignatures(localizedText(concept.content))]
          .filter((signature) => exampleSignatures(localizedText(workedExample.content)).has(signature)),
        [],
        `${lesson.topicId} concept method must remain a near-transfer example`
      );
      conceptMethodSources.push([lesson.topicId, methodSources.map((question) => question.id)]);
    }

    assert.deepEqual({
      lessonCount: mainlandHjbPrimaryLessonSeeds.length,
      checkpointCount: checkpointMatrix.reduce((count, [, ids]) => count + ids.length, 0),
      checkpointIdsSha256: sha256(checkpointMatrix),
      workedExampleSurfaceSha256: sha256(workedExampleSurface),
      conceptMethodSurfaceSha256: sha256(conceptMethodSurface),
      conceptMethodSourcesSha256: sha256(conceptMethodSources)
    }, {
      lessonCount: 70,
      checkpointCount: 560,
      checkpointIdsSha256: "54819b52a50e38cd2f84a1234d5981289ff723d07096f069b83308abfa8cd046",
      workedExampleSurfaceSha256: "a67149bcb923a0f8ceae4374717a8eefcde35f6bfbc843fb3e80293eeee1288d",
      conceptMethodSurfaceSha256: "55410a7943ad5bb35e18661aa10f42b7d99569e0730072e5091de2d0446080d8",
      conceptMethodSourcesSha256: "d200f9207e5ba1360d411cf03148d1ba1df667b560714bb6464c6b8be414653c"
    });
  });
});
