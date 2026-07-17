import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

const canonicalPath = path.join(repoRoot, "data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json");
const mirrorPath = path.join(repoRoot, "coordination/content-qa/us-ca-math-k-g5-textbooks-v1/lessons.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const canonicalPack = readJson(canonicalPath);
const mirrorPack = readJson(mirrorPath);
const canonicalById = new Map(canonicalPack.lessons.map((lesson) => [lesson.id, lesson]));
let updated = 0;

mirrorPack.lessons = mirrorPack.lessons.map((lesson) => {
  const canonical = canonicalById.get(lesson.id);
  if (!canonical) {
    throw new Error(`No canonical K-G5 lesson found for ${lesson.id}`);
  }

  updated += 1;
  return {
    ...lesson,
    studentLesson: {
      ...lesson.studentLesson,
      en: {
        ...lesson.studentLesson.en,
        launch: canonical.studentLesson.en.launch,
        conceptExplanation: canonical.studentLesson.en.conceptExplanation
      }
    }
  };
});

const missingMirrorLessons = canonicalPack.lessons
  .filter((lesson) => !mirrorPack.lessons.some((candidate) => candidate.id === lesson.id))
  .map((lesson) => lesson.id);

if (missingMirrorLessons.length) {
  throw new Error(`Mirror is missing K-G5 lessons: ${missingMirrorLessons.join(", ")}`);
}

writeJson(mirrorPath, mirrorPack);
console.log(`Synced ${updated} K-G5 concept explanations from canonical package to QA mirror.`);
