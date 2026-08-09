import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const resolverRoutePath = new URL("../../app/api/ai-tutor/resolve/route.ts", import.meta.url);
const edgeRoutePath = new URL("../../app/api/ai-tutor/route.ts", import.meta.url);

test("Nova resolver runs auth, classroom policy, and rate admission through bounded fail-closed stages", async () => {
  const source = await readFile(resolverRoutePath, "utf8");

  assert.match(source, /import \{[\s\S]*runAiTutorAdmission[\s\S]*\} from "@\/lib\/server\/aiTutorAdmission";/);
  assert.match(source, /const admission = await runAiTutorAdmission\(/);
  assert.match(source, /signal:\s*requestSignal/);
  assert.match(source, /resolveStudentAiTutorPolicy\(authenticated\.user\.id,\s*\{\s*signal/);
  assert.match(source, /consumeAiCapabilityRateLimit\(\{[\s\S]*signal/);
  assert.match(source, /shouldContinueAfterClassroomPolicy:[\s\S]*fallback-only/);
  assert.match(source, /admission\.status === "unavailable"/);
});

test("Nova resolver attests the returned model and does not penalize Qwen for client cancellation", async () => {
  const source = await readFile(resolverRoutePath, "utf8");
  const providerLoopStart = source.indexOf("async function fetchBestAvailableProviderCompletion");
  const providerLoopEnd = source.indexOf("\n  try {", providerLoopStart);
  const providerLoop = source.slice(providerLoopStart, providerLoopEnd);

  assert.match(source, /typeof data\.model === "string"/);
  assert.match(source, /completion\.responseModel !== completionProviderConfig\.model/);
  assert.match(source, /"X-MAIS-AI-Model": completion\.responseModel/);
  assert.ok(
    providerLoop.indexOf('completion.diagnostic === "provider-request-cancelled"')
      < providerLoop.indexOf("markProviderFailure(providerConfig)"),
    "client cancellation must exit before recording a provider failure"
  );
});

test("public Nova stream emits provider evidence only from a successful resolver response", async () => {
  const source = await readFile(edgeRoutePath, "utf8");
  const streamStart = source.indexOf("function streamAITutorPost");
  const postStart = source.indexOf("\nexport async function POST", streamStart);

  assert.ok(streamStart >= 0 && postStart > streamStart);
  const streamSource = source.slice(streamStart, postStart);
  const fetchIndex = streamSource.indexOf("await fetchResolver");
  const providerStartIndex = streamSource.indexOf('phase: "provider-start"');

  assert.ok(fetchIndex >= 0, "expected resolver fetch in the stream wrapper");
  assert.ok(providerStartIndex > fetchIndex, "provider evidence must not be emitted before the resolver responds");
  assert.match(streamSource, /X-MAIS-AI-Provider/i);
  assert.match(streamSource, /X-MAIS-AI-Model/i);
  assert.match(source, /function buildDeadlineTutorFallbackBody\([\s\S]*mode:\s*"deadline-fallback"/);
  assert.match(streamSource, /send\("final", \{[\s\S]*status:\s*503,[\s\S]*ok:\s*false/);
});
