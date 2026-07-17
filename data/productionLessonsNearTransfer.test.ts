import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { productionLessonSeeds } from "./lessons";
import type { LocalizedText } from "@/types";

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
});
