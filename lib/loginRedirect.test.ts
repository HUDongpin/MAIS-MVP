import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function loginPageSource() {
  return readFileSync(path.join(process.cwd(), "app/login/page.tsx"), "utf8");
}

function functionBody(source: string, functionName: string) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} should exist`);

  const braceStart = source.indexOf("{", start);
  assert.notEqual(braceStart, -1, `${functionName} should have a body`);

  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(braceStart + 1, index);
    }
  }

  throw new Error(`${functionName} body was not closed`);
}

test("student login defaults to the dashboard workspace, not the lesson entry route", () => {
  const body = functionBody(loginPageSource(), "workspaceForRole");

  assert.match(body, /return\s+"\/dashboard"/);
  assert.doesNotMatch(body, /return\s+studentLessonsPath/);
});

test("successful login uses client-side dashboard routing instead of a full document reload", () => {
  const source = loginPageSource();

  assert.match(source, /useRouter\(/);
  assert.match(source, /router\.replace\(/);
  assert.doesNotMatch(source, /window\.location\.assign\(/);
});

test("login page does not prefetch the protected dashboard before authentication", () => {
  const source = loginPageSource();

  assert.doesNotMatch(source, /router\.prefetch\(currentWorkspaceTarget\)/);
  assert.doesNotMatch(source, /router\.prefetch\("\/dashboard"\)/);
});

test("login next targets are filtered by authenticated role", () => {
  const body = functionBody(loginPageSource(), "safeWorkspaceTarget");
  const normalizationIndex = body.indexOf("const safeValue = safeRelativeAppPath(value, fallback)");
  const teacherFilterIndex = body.indexOf('nextPathStartsWith(safeValue, "/teacher")');

  assert.notEqual(normalizationIndex, -1);
  assert.ok(normalizationIndex < teacherFilterIndex, "Redirect input must be normalized before role filtering.");
  assert.match(body, /role\s*===\s*"teacher"/);
  assert.match(body, /role\s*===\s*"admin"/);
  assert.match(body, /nextPathStartsWith\(safeValue,\s*"\/teacher"\)/);
  assert.match(body, /role\s*===\s*"parent"/);
  assert.match(body, /nextPathStartsWith\(safeValue,\s*"\/parent"\)/);
  assert.match(body, /role\s*===\s*"student"/);
  assert.match(body, /return\s+safeValue/);
  assert.doesNotMatch(body, /if\s*\(value\?\.startsWith\("\/"\)\s*&&\s*!value\.startsWith\("\/\/"\)\)\s*return\s+value/);
});
