/**
 * California math lesson-page content QA gate.
 *
 * Renders every US-CA lesson seed to the text a student actually reads on the
 * lesson page (title, description, block titles, block content, checklist
 * items) and asserts the content-quality rules a digital-learning publisher
 * checks before ship:
 *
 *   1. mathematical accuracy — every literal arithmetic identity is true
 *   2. no internal identifiers in learner-facing copy
 *   3. English grammar — a/an agreement, no spliced verb phrases,
 *      no imperative sentence closed with a question mark
 *   4. internal consistency — the description names only blocks that render,
 *      and nothing references a block the page does not have
 *   5. clean typography — no ".:", no doubled spaces, no stray punctuation
 *
 * Usage:
 *   npx tsx scripts/audit-us-ca-lesson-content.mts            # gate (exit 1 on defects)
 *   npx tsx scripts/audit-us-ca-lesson-content.mts --dump out.json
 */
import { writeFileSync } from "node:fs";
import { usCaliforniaLessonSeeds } from "../data/usCaliforniaLessons";
import type { LocalizedText } from "../types";

type Finding = { rule: string; topicId: string; where: string; detail: string };

function en(value: LocalizedText | string | undefined): string {
  if (value === undefined) return "";
  return typeof value === "string" ? value : value.en ?? "";
}

const rendered = usCaliforniaLessonSeeds.map((seed) => ({
  topicId: seed.topicId,
  title: en(seed.title),
  description: en(seed.description),
  blocks: seed.blocks.map((block) => ({
    idSuffix: block.idSuffix,
    type: block.type,
    title: en(block.title),
    content: en(block.content),
    items: (block.items ?? []).map(en)
  }))
}));

const dumpFlag = process.argv.indexOf("--dump");
if (dumpFlag >= 0 && process.argv[dumpFlag + 1]) {
  writeFileSync(process.argv[dumpFlag + 1], JSON.stringify(rendered, null, 2));
}

function strings(lesson: (typeof rendered)[number]): Array<[string, string]> {
  const out: Array<[string, string]> = [
    ["title", lesson.title],
    ["description", lesson.description]
  ];
  for (const block of lesson.blocks) {
    out.push([`${block.idSuffix}/title`, block.title]);
    if (block.content) out.push([`${block.idSuffix}/content`, block.content]);
    block.items.forEach((item, index) => {
      out.push([`${block.idSuffix}/item[${index}]`, item]);
    });
  }
  return out;
}

const findings: Finding[] = [];
const add = (rule: string, topicId: string, where: string, detail: string) =>
  findings.push({ rule, topicId, where, detail });

// --- 1. arithmetic ----------------------------------------------------------
// A bare "a/b" (no spaces) is a fraction literal; a spaced "a / b" is division.
const NUM = String.raw`\d+(?:\.\d+)?(?:/\d+(?:\.\d+)?)?`;
const OPS = String.raw`[+\-−x×*·/÷]`;
const EQUATION = new RegExp(String.raw`(?<![\w.])(${NUM}(?:\s*${OPS}\s*${NUM})+)\s*=\s*(${NUM})(?![\w./%])`, "g");

function numeric(token: string): number {
  const [a, b] = token.split("/");
  return b === undefined ? Number(a) : Number(a) / Number(b);
}

function evaluateChain(expression: string): number | null {
  const tokens = expression.match(new RegExp(String.raw`${NUM}|${OPS}`, "g")) ?? [];
  if (tokens.length % 2 === 0) return null;
  const terms = [numeric(tokens[0])];
  const additive: string[] = [];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const next = numeric(tokens[i + 1]);
    if (/[x×*·/÷]/.test(op)) {
      if (/[/÷]/.test(op)) {
        if (next === 0) return null;
        terms[terms.length - 1] /= next;
      } else {
        terms[terms.length - 1] *= next;
      }
    } else {
      additive.push(op);
      terms.push(next);
    }
  }
  return terms.slice(1).reduce((sum, term, i) => (/[-−]/.test(additive[i]) ? sum - term : sum + term), terms[0]);
}

// --- 2..5 text rules --------------------------------------------------------
const INTERNAL_ID = /\bus-ca-math-[a-z0-9-]+/g;
// "a unit/user/one/European" open with a consonant sound despite the vowel letter.
const A_BEFORE_VOWEL = /\ba (?=[aeiou])(?!(?:on[ce]|us\w*|uni\w*|eu\w*)\b)[a-z]+/g;
const AN_BEFORE_CONSONANT = /\ban (?=[bcdfgjklmnpqrstvwz])(?!x\b)[a-z]+/g;
const VERB_SPLICE = /\b(?:reason|think|talk|write) about (?:connect|use|represent|treat|describe|name|read|write|solve|compare|classify|build|find|explain|show|add|subtract|multiply|divide|apply|extend|understand|analyze|interpret|generate|measure|partition|round|convert|graph|order|count)\b/g;
const IMPERATIVE_QUESTION = /\b(?:Explain|Describe|Show|Write|Draw|Model|List|Name|Find|Solve|Compare|Tell)\b[^.?!]*\?/g;
const PERIOD_COLON = /\.\s*:/g;
const DOUBLE_SPACE = /\S {2,}\S/;
const ELLIPSIS_BEFORE_PAREN = /\.\.\.\)/g;

for (const lesson of rendered) {
  const blockIds = new Set(lesson.blocks.map((block) => block.idSuffix));

  for (const [where, text] of strings(lesson)) {
    if (!text) continue;

    for (const match of text.matchAll(EQUATION)) {
      const got = evaluateChain(match[1]);
      if (got !== null && Math.abs(got - numeric(match[2])) > 1e-9) {
        add("arithmetic", lesson.topicId, where, `${match[0]} — actual ${got}`);
      }
    }
    for (const match of text.matchAll(INTERNAL_ID)) {
      add("internal-id-in-copy", lesson.topicId, where, match[0]);
    }
    for (const match of text.matchAll(A_BEFORE_VOWEL)) {
      add("article-agreement", lesson.topicId, where, match[0]);
    }
    for (const match of text.matchAll(AN_BEFORE_CONSONANT)) {
      add("article-agreement", lesson.topicId, where, match[0]);
    }
    for (const match of text.matchAll(VERB_SPLICE)) {
      add("verb-splice", lesson.topicId, where, match[0]);
    }
    for (const match of text.matchAll(IMPERATIVE_QUESTION)) {
      add("imperative-with-question-mark", lesson.topicId, where, match[0].slice(0, 80));
    }
    for (const match of text.matchAll(PERIOD_COLON)) {
      add("stray-punctuation", lesson.topicId, where, JSON.stringify(match[0]));
    }
    for (const match of text.matchAll(ELLIPSIS_BEFORE_PAREN)) {
      add("stray-punctuation", lesson.topicId, where, JSON.stringify(match[0]));
    }
    if (DOUBLE_SPACE.test(text)) {
      add("stray-punctuation", lesson.topicId, where, "doubled space");
    }

    // A block must not point at a sibling block the page does not render.
    if (where !== "description" && /\bworked example\b/i.test(text) && !blockIds.has("worked-example") && !/ported from the CCSS/.test(text)) {
      add("dangling-block-reference", lesson.topicId, where, "references a worked example that is not on the page");
    }
  }

  const description = lesson.description.toLowerCase();
  if (/worked example/.test(description) && !blockIds.has("worked-example")) {
    add("description-promises-missing-block", lesson.topicId, "description", "worked example");
  }
  if (/concept (?:explanation|launch)/.test(description) && !blockIds.has("concept")) {
    add("description-promises-missing-block", lesson.topicId, "description", "concept");
  }
}

const byRule = new Map<string, Finding[]>();
findings.forEach((finding) => {
  byRule.set(finding.rule, [...(byRule.get(finding.rule) ?? []), finding]);
});

console.log(`audit-us-ca-lesson-content: ${rendered.length} lessons, ${rendered.reduce((n, l) => n + l.blocks.length, 0)} blocks`);
if (!findings.length) {
  console.log("✓ no content defects");
  process.exit(0);
}

for (const [rule, list] of [...byRule].sort()) {
  console.log(`\n${rule}: ${list.length}`);
  list.slice(0, 20).forEach((finding) => {
    console.log(`  ${finding.topicId} ${finding.where} — ${finding.detail}`);
  });
  if (list.length > 20) console.log(`  ... ${list.length - 20} more`);
}
console.log(`\n✗ ${findings.length} content defect(s)`);
process.exit(1);
