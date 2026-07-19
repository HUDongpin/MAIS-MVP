/**
 * build-ccss-practice-pack.mjs — regenerate the full
 * `data/generated-content/ccss-textbook-practice-v1/question-pack.json` from
 * the upstream hand-checked practice snapshot.
 *
 * Conversion contract:
 *  - Upstream answers, prompts, and explanations are NEVER changed.
 *  - `mc` → "multiple-choice"; the MAIS bank requires exactly 4 options, so
 *    3-option questions get ONE added distractor and 2-option questions get
 *    TWO. Numeric-choice distractors are synthesized deterministically;
 *    non-numeric ones come from the hand-curated table below (the build fails
 *    loudly on any uncurated non-numeric question, so coverage can't rot).
 *  - `numeric` → "fill-in" with acceptedAnswers covering the exact value plus
 *    curated spelled-out / fraction variants for the few decimal answers.
 *  - Each question's home topic is where its lesson is `primary` in
 *    ccssLessonAssignments (falling back to the first topic listing it), so
 *    practice always lands beside the lesson body it belongs to.
 *
 * Run: node scripts/build-ccss-practice-pack.mjs
 *   (after build-ccss-lesson-assignments.mjs, which emits assignments.json)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const maisRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(maisRoot, "data", "generated-content", "ccss-textbook-source-v1");
const snapshot = JSON.parse(readFileSync(path.join(sourceDir, "source.json"), "utf8"));
const { assignments } = JSON.parse(readFileSync(path.join(sourceDir, "assignments.json"), "utf8"));
const topicPack = JSON.parse(
  readFileSync(path.join(maisRoot, "data", "generated-content", "us-ca-math-k-g5-textbooks-v1", "lessons.json"), "utf8")
);

const usGradeLabels = {
  K: "Kindergarten", P1: "Grade 1", P2: "Grade 2", P3: "Grade 3", P4: "Grade 4", P5: "Grade 5",
  P6: "Grade 6", S1: "Grade 7", S2: "Grade 8", S3: "Grade 9", S4: "Grade 10", S5: "Grade 11", S6: "Grade 12"
};
const lowGrades = new Set(["K", "P1", "P2"]);
const highGrades = new Set(["S3", "S4", "S5", "S6"]);

// Topic metadata: the K–G5 textbook pack plus the G6–G12 chapter topics from
// the generated bank. A question's grade/label/domain follow its HOME TOPIC —
// this is what places an HS lesson's practice in its actual course (S3–S6).
const topicMetaById = new Map(
  topicPack.lessons.map((lesson) => [
    lesson.metadata.topicId,
    { grade: lesson.metadata.grade, usGradeLabel: lesson.metadata.usGradeLabel, domainTitle: lesson.metadata.domainTitle }
  ])
);
const bankPack = JSON.parse(
  readFileSync(
    path.join(maisRoot, "data", "generated-content", "us-ca-math-g6-g12-generated-bank-v2-1500", "question-pack.json"),
    "utf8"
  )
);
for (const question of bankPack.questions) {
  if (!topicMetaById.has(question.topicId)) {
    topicMetaById.set(question.topicId, {
      grade: question.grade,
      usGradeLabel: question.usGradeLabel ?? usGradeLabels[question.grade],
      domainTitle: question.domainTags?.[0] ?? "California mathematics"
    });
  }
}

// Home topic per lesson slug: primary home wins, else first topic listing it.
const homeBySlug = new Map();
for (const { topicId, primary, related } of assignments) {
  if (!homeBySlug.has(primary)) homeBySlug.set(primary, topicId);
  for (const slug of related) if (!homeBySlug.has(slug)) homeBySlug.set(slug, topicId);
}
for (const { topicId, primary } of assignments) homeBySlug.set(primary, homeBySlug.get(primary) ?? topicId);
for (const { topicId, primary } of assignments) {
  // A lesson that is primary somewhere should live with the topic it anchors.
  if (homeBySlug.get(primary) !== topicId) {
    const currentHome = homeBySlug.get(primary);
    const anchors = assignments.some((a) => a.topicId === currentHome && a.primary === primary);
    if (!anchors) homeBySlug.set(primary, topicId);
  }
}

/**
 * Hand-curated distractors for MC questions whose choices are not plain
 * numbers, keyed "slug#index" in curated-distractors.json (446 entries as of
 * Phase 5). One entry per 3-option question, two per 2-option question. Each
 * is plausible for the prompt but unambiguously wrong; upstream choices and
 * answers are untouched. A few recurring shapes are auto-padded by
 * `patternDistractors` below instead; the build fails loudly on anything
 * uncovered, so coverage cannot rot.
 */
const curatedDistractors = JSON.parse(
  readFileSync(path.join(sourceDir, "curated-distractors.json"), "utf8")
);

const PROPERTY_NAMES = ["distributive", "commutative", "associative", "identity"];

/** Deterministic padding for recurring non-numeric MC shapes. */
function patternDistractors(question, needed) {
  const lower = question.choices.map((choice) => String(choice).trim().toLowerCase());
  const set = new Set(lower);
  if (needed === 1) {
    if (lower.some((choice) => choice === "equal" || choice.startsWith("equal ") || choice.startsWith("they are equal") || choice === "they are the same")) {
      return ["cannot tell"];
    }
    if (set.size === 3 && set.has("<") && set.has(">") && set.has("=")) return ["+"];
    const usesPropertySuffix = lower.every((choice) => PROPERTY_NAMES.some((name) => choice === name || choice === `${name} property`));
    if (usesPropertySuffix) {
      const missing = PROPERTY_NAMES.find((name) => !lower.some((choice) => choice.startsWith(name)));
      if (missing) return [lower[0].endsWith("property") ? `${missing} property` : missing];
    }
  }
  if (needed === 2) {
    if (set.size === 2 && set.has("true") && set.has("false")) return ["cannot tell", "only sometimes"];
    if (set.size === 2 && set.has("odd") && set.has("even")) return ["both", "neither"];
    if (set.size === 2 && set.has("yes") && set.has("no")) return ["Cannot tell", "Only sometimes"];
  }
  return null;
}

/** Extra accepted spellings for decimal / fraction-valued fill-ins. */
const curatedAcceptedAnswers = {
  "powers-of-ten#1": ["0.45", ".45"],
  "round-decimals#0": ["3.5", "3.50"],
  "round-decimals#2": ["3.47"],
  "decimal-operations#0": ["1.65"],
  "decimal-operations#1": ["0.85", ".85"],
  "decimal-operations#2": ["0.12", ".12"],
  "multiply-mixed-numbers#1": ["4.5", "4 1/2", "9/2"],
  "metric-conversion#1": ["2.5", "2 1/2"],
  "line-plot-operations#2": ["1.5", "1 1/2", "3/2"]
};

function isNumericChoice(choice) {
  const trimmed = String(choice).trim().replace(/,/g, "");
  return trimmed !== "" && !Number.isNaN(Number(trimmed));
}

function formatLikeChoices(value, choices) {
  const usesCommas = choices.some((choice) => String(choice).includes(","));
  if (!usesCommas) return String(value);
  return value.toLocaleString("en-US");
}

/** Deterministic distractors for all-numeric choice sets. */
function synthesizeNumericDistractors(question, needed) {
  const numbers = question.choices.map((choice) => Number(String(choice).trim().replace(/,/g, "")));
  const answer = numbers[question.answer];
  const existing = new Set(numbers);
  const candidates = [
    answer + 1,
    answer - 1,
    answer + 2,
    answer * 2,
    Math.max(...numbers) + (Math.max(...numbers) - Math.min(...numbers) || 1),
    answer + 10
  ];
  const picked = [];
  for (const candidate of candidates) {
    if (picked.length >= needed) break;
    if (!Number.isFinite(candidate) || candidate < 0) continue;
    const rounded = Number.isInteger(answer) ? Math.round(candidate) : Number(candidate.toFixed(2));
    if (existing.has(rounded) || picked.some((value) => value === rounded)) continue;
    picked.push(rounded);
  }
  if (picked.length < needed) throw new Error(`could not synthesize ${needed} numeric distractor(s)`);
  return picked.map((value) => formatLikeChoices(value, question.choices));
}

function L(en) {
  return { en, zh: en, zhHans: en };
}

const questions = [];
const problems = [];

for (const lesson of snapshot.lessons) {
  const upstream = snapshot.practiceBySlug[lesson.slug] ?? [];
  const topicId = homeBySlug.get(lesson.slug);
  if (!topicId) {
    problems.push(`${lesson.slug}: no home topic in assignments.json`);
    continue;
  }
  const topicMeta = topicMetaById.get(topicId);
  if (!topicMeta) {
    problems.push(`${lesson.slug}: home topic ${topicId} has no metadata`);
    continue;
  }
  const grade = topicMeta.grade;

  upstream.forEach((question, index) => {
    const key = `${lesson.slug}#${index}`;
    const base = {
      id: `ccss-textbook-practice-v1-${lesson.slug}-q${String(index + 1).padStart(2, "0")}`,
      batch: "ccss-textbook-practice-v1",
      packageId: "ccss-textbook-practice-v1",
      sourcePackageId: "ccss-math-textbook",
      sourceLessonSlug: lesson.slug,
      sourceLessonTitle: lesson.title,
      curriculumTrack: "US_CA_MATH",
      state: "CA",
      grade,
      usGradeLabel: topicMeta.usGradeLabel ?? usGradeLabels[grade],
      topicId,
      standardIds: lesson.standardIds,
      domainTags: [topicMeta.domainTitle],
      conceptIds: [lesson.slug, ...lesson.standardIds.map((id) => id.toLowerCase())],
      difficulty: lowGrades.has(grade) ? "Low" : highGrades.has(grade) ? "High" : "Medium",
      evidenceCardIds: [],
      sourceIds: ["ccss-math-textbook-app"],
      sourceDistanceStatus: "passed-original-authored",
      mathQaStatus: "passed-ccss-textbook-hand-check",
      manualQaStatus: "accepted-ccss-textbook-hand-check"
    };

    if (question.kind === "mc") {
      const answerText = String(question.choices[question.answer]);
      const needed = 4 - question.choices.length;
      let distractors = [];
      if (needed > 0) {
        if (question.choices.every(isNumericChoice)) {
          distractors = synthesizeNumericDistractors(question, needed);
        } else {
          distractors = curatedDistractors[key] ?? patternDistractors(question, needed) ?? [];
          if (distractors.length !== needed) {
            problems.push(`${key}: needs ${needed} curated distractor(s), has ${distractors.length} — prompt: ${question.prompt}`);
            return;
          }
        }
      }
      const options = [...question.choices.map(String), ...distractors];
      if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) {
        problems.push(`${key}: duplicate options after padding`);
        return;
      }
      questions.push({
        ...base,
        type: "multiple-choice",
        prompt: L(question.prompt),
        options: options.map(L),
        answer: answerText,
        acceptedAnswers: [answerText],
        explanation: L(question.explanation),
        independentAnswer: answerText,
        independentSolution: question.explanation
      });
      return;
    }

    // numeric → fill-in
    const answerText = Number.isInteger(question.answer) ? String(question.answer) : String(question.answer);
    const accepted = [...new Set([answerText, ...(curatedAcceptedAnswers[key] ?? [])])];
    questions.push({
      ...base,
      type: "fill-in",
      prompt: L(question.prompt),
      answer: answerText,
      acceptedAnswers: accepted,
      explanation: L(question.explanation),
      independentAnswer: answerText,
      independentSolution: question.explanation
    });
  });
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\nbuild-ccss-practice-pack: ${problems.length} problem(s).`);
  process.exit(1);
}

const outDir = path.join(maisRoot, "data", "generated-content", "ccss-textbook-practice-v1");
mkdirSync(outDir, { recursive: true });
const pack = {
  packageId: "ccss-textbook-practice-v1",
  schemaVersion: "1.1.0",
  generatedAt: snapshot.generatedAt,
  generator:
    "scripts/build-ccss-practice-pack.mjs — converted from CCSS-Math-Textbook src/lessons/practice.ts (hand-checked upstream); multiple-choice questions padded to the MAIS 4-option bank standard with curated/synthesized distractors (answers unchanged)",
  curriculumTrack: "US_CA_MATH",
  state: "CA",
  scope: {
    contentType: "lesson-practice",
    gradeSpan: ["K", "P1", "P2", "P3", "P4", "P5"],
    phase: "phase-1-full-port",
    sourceLessonCount: snapshot.lessons.length
  },
  languageVariant:
    "en-first (owner decision 2026-07-19: US California track ships English lesson bodies; zh/zhHans mirror en until the localization workstream)",
  packageStatus: "live",
  reviewStatus: "upstream-hand-checked",
  integrationStatus: "phase-1",
  counts: { questions: questions.length },
  questions
};
writeFileSync(path.join(outDir, "question-pack.json"), `${JSON.stringify(pack, null, 2)}\n`);
console.log(`build-ccss-practice-pack: wrote ${questions.length} questions across ${new Set(questions.map((q) => q.topicId)).size} topics`);
