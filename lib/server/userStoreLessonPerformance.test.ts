import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function exportedFunctionBody(fileSource: string, functionName: string) {
  const start = fileSource.indexOf(`export async function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} should be exported`);

  const braceStart = fileSource.indexOf("{", start);
  assert.notEqual(braceStart, -1, `${functionName} should have a body`);

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

  throw new Error(`${functionName} body was not closed`);
}

test("lesson entry target uses the Postgres fast path before reading the full database", () => {
  const body = exportedFunctionBody(source("lib/server/userStore.ts"), "getLessonEntryTarget");
  const fastPathIndex = body.indexOf("getFastPostgresLessonEntryTarget");
  const readDatabaseIndex = body.indexOf("readDatabase()");

  assert.notEqual(fastPathIndex, -1);
  assert.notEqual(readDatabaseIndex, -1);
  assert.ok(fastPathIndex < readDatabaseIndex);
});

test("lesson entry target falls back to public content when the Postgres fast path has no target", () => {
  const storeSource = source("lib/server/userStore.ts");

  for (const functionName of ["getLessonEntryTarget", "getLessonEntryTargetForLogin"]) {
    const body = exportedFunctionBody(storeSource, functionName);
    const fastNullIndex = body.indexOf("fastTarget === null");
    const publicFallbackIndex = body.indexOf("readPublicContentDatabase()", fastNullIndex);
    const readDatabaseIndex = body.indexOf("readDatabase()");

    assert.notEqual(fastNullIndex, -1, `${functionName} should detect a null fast target`);
    assert.notEqual(publicFallbackIndex, -1, `${functionName} should fall back to public content`);
    assert.notEqual(readDatabaseIndex, -1, `${functionName} should retain the full database fallback`);
    assert.ok(publicFallbackIndex < readDatabaseIndex, `${functionName} should try public content before full database reads`);
  }
});

test("public lesson roadmap rendering uses the public content database", () => {
  const body = exportedFunctionBody(source("lib/server/userStore.ts"), "getRoadmapData");

  assert.match(body, /userId\s*\?\s*await readDatabase\(\)\s*:\s*readPublicContentDatabase\(\)/);
});

test("student lesson page renders initial lesson content without authenticated full-database reads", () => {
  const pageSource = source("components/lesson/StudentLessonPage.tsx");

  assert.match(pageSource, /getLessonBySlug\(\s*null,\s*slug,/);
  assert.match(pageSource, /getRoadmapData\(\s*null,/);
  assert.doesNotMatch(pageSource, /getRoadmapData\(\s*studentUser\.id,/);
});
