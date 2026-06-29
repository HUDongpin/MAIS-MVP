import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();
const vercelConfigPath = path.join(projectRoot, "vercel.json");
const expectedClassroomRegion = "pdx1";
const coreClassroomRoutes = [
  "app/api/auth/login/route.ts",
  "app/api/auth/register/route.ts",
  "app/api/dashboard/route.ts",
  "app/api/teacher/dashboard/route.ts",
  "app/api/me/route.ts",
  "app/api/me/profile/route.ts",
  "app/api/progress/route.ts",
  "app/api/learning-events/route.ts",
  "app/api/attempts/route.ts",
  "app/api/questions/route.ts",
  "app/api/lesson-entry/route.ts",
  "app/api/lesson-progress/route.ts",
  "app/api/classroom/live/route.ts",
  "app/api/classroom/live/actions/route.ts",
  "app/api/parent/foundation/route.ts",
  "app/api/teacher/foundation/route.ts"
];

function readProjectText(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function routeFilesUnder(relativeDirectory) {
  const absoluteDirectory = path.join(projectRoot, relativeDirectory);
  if (!existsSync(absoluteDirectory)) return [];

  return readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return routeFilesUnder(relativePath);
    return entry.isFile() && entry.name === "route.ts" ? [relativePath] : [];
  });
}

test("Vercel Node functions default to the US West Postgres-adjacent region", () => {
  assert.equal(existsSync(vercelConfigPath), true, "vercel.json must define the deployment region");
  const config = JSON.parse(readFileSync(vercelConfigPath, "utf8"));

  assert.deepEqual(
    config.regions,
    [expectedClassroomRegion],
    "Vercel Node functions should run in pdx1 to colocate with Neon/Postgres US West Oregon"
  );
});

test("core classroom APIs stay Node runtime and do not pin US traffic to Hong Kong", () => {
  for (const route of coreClassroomRoutes) {
    const source = readProjectText(route);
    assert.match(source, /export const runtime = ["']nodejs["'];/, `${route} must stay on the Node runtime`);
    assert.doesNotMatch(
      source,
      /export const preferredRegion\s*=\s*["']hkg1["'];/,
      `${route} must not override US classroom traffic to hkg1`
    );
  }
});

test("AI Tutor routes do not pin US classroom traffic to Hong Kong", () => {
  const aiTutorRoutes = routeFilesUnder("app/api/ai-tutor");
  assert.ok(aiTutorRoutes.length > 0, "AI Tutor route files should be present for region guard coverage");

  for (const route of aiTutorRoutes) {
    const source = readProjectText(route);
    assert.doesNotMatch(
      source,
      /export const preferredRegion\s*=\s*["']hkg1["'];/,
      `${route} must not hard-pin US classroom AI Tutor traffic to hkg1`
    );
  }
});
