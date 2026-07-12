import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function functionBodyFromSignature(fileSource: string, signature: string, description: string) {
  const start = fileSource.indexOf(signature);
  assert.notEqual(start, -1, `${description} should exist`);

  const braceStart = fileSource.indexOf("{", start);
  assert.notEqual(braceStart, -1, `${description} should have a body`);

  let depth = 0;
  for (let index = braceStart; index < fileSource.length; index += 1) {
    const character = fileSource[index];
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return fileSource.slice(braceStart + 1, index);
      }
    }
  }

  throw new Error(`${description} body was not closed`);
}

function studentActivityMethodBody(fileSource: string, functionName: string) {
  return functionBodyFromSignature(fileSource, `async ${functionName}(`, `${functionName} student activity method`);
}

test("lesson entry target uses the Postgres fast path before reading the full database", () => {
  const compatibilitySource = source("lib/server/userStore.ts");
  const body = studentActivityMethodBody(source("lib/server/userStore/studentActivityPersistence.ts"), "getLessonEntryTarget");
  const fastPathIndex = body.indexOf("getFastLessonEntryTarget");
  const readDatabaseIndex = body.indexOf("readDatabase()");

  assert.match(compatibilitySource, /export const getLessonEntryTarget = studentActivityUserStore\.getLessonEntryTarget/);
  assert.notEqual(fastPathIndex, -1);
  assert.notEqual(readDatabaseIndex, -1);
  assert.ok(fastPathIndex < readDatabaseIndex);
});

test("lesson entry target falls back to public content when the Postgres fast path has no target", () => {
  const compatibilitySource = source("lib/server/userStore.ts");
  const studentActivitySource = source("lib/server/userStore/studentActivityPersistence.ts");

  assert.match(compatibilitySource, /export const getLessonEntryTarget = studentActivityUserStore\.getLessonEntryTarget/);
  assert.match(compatibilitySource, /export const getLessonEntryTargetForLogin = studentActivityUserStore\.getLessonEntryTargetForLogin/);

  for (const functionName of ["getLessonEntryTarget", "getLessonEntryTargetForLogin"]) {
    const body = studentActivityMethodBody(studentActivitySource, functionName);
    const fastNullIndex = body.indexOf("fastTarget === null");
    const publicFallbackIndex = body.indexOf("readPublicDatabase()", fastNullIndex);
    const readDatabaseIndex = body.indexOf("readDatabase()");

    assert.notEqual(fastNullIndex, -1, `${functionName} should detect a null fast target`);
    assert.notEqual(publicFallbackIndex, -1, `${functionName} should fall back to public content`);
    assert.notEqual(readDatabaseIndex, -1, `${functionName} should retain the full database fallback`);
    assert.ok(publicFallbackIndex < readDatabaseIndex, `${functionName} should try public content before full database reads`);
  }
});

test("public lesson roadmap rendering uses the public content database", () => {
  const compatibilitySource = source("lib/server/userStore.ts");
  const body = studentActivityMethodBody(source("lib/server/userStore/studentActivityPersistence.ts"), "getRoadmapData");

  assert.match(compatibilitySource, /export const getRoadmapData = studentActivityUserStore\.getRoadmapData/);
  assert.match(body, /userId\s*\?\s*await readDatabase\(\)\s*:\s*await readPublicDatabase\(\)/);
});

test("student lesson page renders initial lesson content without authenticated full-database reads", () => {
  const pageSource = source("components/lesson/StudentLessonPage.tsx");

  assert.match(pageSource, /getLessonBySlug\(\s*null,\s*slug,/);
  assert.match(pageSource, /getRoadmapData\(\s*null,/);
  assert.doesNotMatch(pageSource, /getRoadmapData\(\s*studentUser\.id,/);
});
