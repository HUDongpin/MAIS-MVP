import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { GET as getAITutorRoute } from "../app/api/ai-tutor/route";
import { GET as getAITutorStatusRoute } from "../app/api/ai-tutor/status/route";
import { AI_TUTOR_PUBLIC_CDN_CACHE_CONTROL, AI_TUTOR_UNKNOWN_PATH_CDN_CACHE_CONTROL } from "./aiTutorReadCache";

async function readSource(relativePath: string) {
  return readFile(join(process.cwd(), relativePath), "utf8");
}

test("AI Tutor status and prewarm are Edge reads with CDN cache, separate from chat quota", async () => {
  const statusSource = await readSource("app/api/ai-tutor/status/route.ts");
  const edgeSource = await readSource("app/api/ai-tutor/route.ts");
  const catchAllSource = await readSource("app/api/ai-tutor/[...path]/route.ts");
  const governanceSource = await readSource("lib/server/aiGovernance.ts");

  assert.match(statusSource, /export const runtime = "edge"/);
  assert.match(statusSource, /readAITutorProviderStatus/);
  assert.doesNotMatch(statusSource, /from "@\/lib\/server\/llmProvider"/);
  assert.match(edgeSource, /aiTutorPublicReadCacheHeaders/);
  assert.match(catchAllSource, /export const runtime = "edge"/);
  assert.match(governanceSource, /Status, prewarm, and classroom-policy reads are not chat admissions/);
});

test("CDN cache headers are present on public tutor reads and guessed subpaths", async () => {
  const status = await getAITutorStatusRoute();
  const prewarm = await getAITutorRoute();
  const unknownModule = await import(
    pathToFileURL(join(process.cwd(), "app/api/ai-tutor/[...path]/route.ts")).href
  ) as { GET: () => Response };
  const unknown = unknownModule.GET();

  assert.equal(status.headers.get("cdn-cache-control"), AI_TUTOR_PUBLIC_CDN_CACHE_CONTROL);
  assert.equal(prewarm.headers.get("cdn-cache-control"), AI_TUTOR_PUBLIC_CDN_CACHE_CONTROL);
  assert.equal(unknown.status, 404);
  assert.equal(unknown.headers.get("cdn-cache-control"), AI_TUTOR_UNKNOWN_PATH_CDN_CACHE_CONTROL);
  assert.deepEqual(await unknown.json(), { error: "Not found." });
});

test("Nova client retries HTTP 429 chat and does not treat status 429 as local-helper", async () => {
  const source = await readSource("components/ai/AITutorProvider.tsx");
  assert.match(source, /isAiTutorHttpRateLimited\(response\.status\)/);
  assert.match(source, /AI_TUTOR_CHAT_HTTP_429_RETRY_ATTEMPTS/);
  assert.match(source, /AI_TUTOR_STATUS_RETRY_ATTEMPTS/);
  assert.match(source, /shouldReuseClassroomPolicy/);
  assert.match(source, /if \(attempt >= AI_TUTOR_STATUS_RETRY_ATTEMPTS\) return;/);
  assert.match(source, /setSetupStatus\(\(current\) => current\.state === "checking" \? \{ state: "local-helper" \} : current\)/);
});
