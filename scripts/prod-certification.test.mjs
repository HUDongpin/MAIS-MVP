import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  aggregateVerdict,
  classifyWarmProbeStatus,
  daysUntil,
  evaluateBudget,
  extractNextAssets,
  formatReportMarkdown,
  inspectCacheCookieContract,
  parseArgs,
  validateLocalReleaseBindingEvidence
} from "./prod-certification.mjs";

const bindingArgs = [
  "--candidate-sha",
  "a".repeat(40),
  "--deployment-id",
  "dpl_Abcdefghijklmnop",
  "--deployment-url",
  "https://mais-parent-cert-abc.vercel.app",
  "--build-id",
  "build_Abcdefghijklmnop"
];

test("extractNextAssets pulls src and href, dedupes, strips queries, sorts", () => {
  const html = [
    '<script src="/_next/static/chunks/main-app-abc123.js?v=1"></script>',
    '<link href="/_next/static/css/app-def456.css" rel="stylesheet">',
    '<script src="/_next/static/chunks/main-app-abc123.js"></script>',
    '<img src="/images/logo.png">'
  ].join("\n");
  assert.deepEqual(extractNextAssets(html), [
    "/_next/static/chunks/main-app-abc123.js",
    "/_next/static/css/app-def456.css"
  ]);
});

test("evaluateBudget boundaries", () => {
  assert.equal(evaluateBudget(100, 200, 300), "pass");
  assert.equal(evaluateBudget(200, 200, 300), "pass");
  assert.equal(evaluateBudget(201, 200, 300), "warn");
  assert.equal(evaluateBudget(301, 200, 300), "fail");
});

test("aggregateVerdict: P0 fail always fails certification", () => {
  assert.equal(
    aggregateVerdict([
      { severity: "P1", status: "pass" },
      { severity: "P0", status: "fail" }
    ]),
    "FAILED"
  );
});

test("aggregateVerdict: warnings and P1 failures downgrade to findings", () => {
  assert.equal(aggregateVerdict([{ severity: "P0", status: "pass" }]), "CERTIFIED");
  assert.equal(
    aggregateVerdict([
      { severity: "P0", status: "pass" },
      { severity: "P1", status: "warn" }
    ]),
    "CERTIFIED_WITH_FINDINGS"
  );
  assert.equal(
    aggregateVerdict([
      { severity: "P0", status: "pass" },
      { severity: "P1", status: "fail" }
    ]),
    "CERTIFIED_WITH_FINDINGS"
  );
});

test("aggregateVerdict: a skipped P0 check cannot certify cleanly", () => {
  assert.equal(
    aggregateVerdict([
      { severity: "P0", status: "pass" },
      { severity: "P0", status: "skip" }
    ]),
    "CERTIFIED_WITH_FINDINGS"
  );
});

test("aggregateVerdict: any skipped check prevents a clean certification", () => {
  assert.equal(
    aggregateVerdict([
      { severity: "P0", status: "pass" },
      { severity: "P1", status: "skip" }
    ]),
    "CERTIFIED_WITH_FINDINGS"
  );
});

test("warm probe accepts only an unauthenticated 401 in configured production", () => {
  assert.equal(classifyWarmProbeStatus(401), "pass");
  assert.equal(classifyWarmProbeStatus(200), "fail");
  assert.equal(classifyWarmProbeStatus(503), "fail");
});

test("cache/cookie contract requires no-store, optional private, and no Set-Cookie", () => {
  assert.deepEqual(
    inspectCacheCookieContract(
      new Headers({ "cache-control": "private, no-store, max-age=0" }),
      { requirePrivate: true }
    ),
    { ok: true, missing: [] }
  );
  assert.deepEqual(
    inspectCacheCookieContract(
      new Headers({ "cache-control": "no-store", "set-cookie": "session=unexpected" }),
      { requirePrivate: true }
    ),
    { ok: false, missing: ["private", "no-set-cookie"] }
  );
});

test("daysUntil is positive for future dates and negative for past ones", () => {
  assert.ok(daysUntil(new Date(Date.now() + 30 * 86_400_000).toISOString()) > 29);
  assert.ok(daysUntil(new Date(Date.now() - 86_400_000).toISOString()) < 0);
});

test("formatReportMarkdown includes verdict, counts, and escapes pipes", () => {
  const markdown = formatReportMarkdown({
    verdict: "CERTIFIED_WITH_FINDINGS",
    generatedAt: "2026-07-26T00:00:00.000Z",
    domains: ["https://www.mais.ac"],
    releaseBinding: {
      candidateSha: "a".repeat(40),
      deploymentId: "dpl_Abcdefghijklmnop",
      deploymentUrl: "https://mais-parent-cert-abc.vercel.app",
      buildId: "build_Abcdefghijklmnop"
    },
    writeFootprint: "none (read-only run)",
    results: [
      { id: "home-availability", severity: "P0", status: "pass", domain: "https://www.mais.ac", detail: "HTTP 200 | fast" }
    ]
  });
  assert.match(markdown, /Production certification — CERTIFIED_WITH_FINDINGS/);
  assert.match(markdown, new RegExp(`Candidate SHA: ${"a".repeat(40)}`));
  assert.match(markdown, /Next BUILD_ID: build_Abcdefghijklmnop/);
  assert.match(markdown, /pass 1, warn 0, fail 0, skip 0/);
  assert.match(markdown, /HTTP 200 \\\| fast/);
});

test("parseArgs is strict and read-only by default and requires release binding inputs", () => {
  const parsed = parseArgs(["--json", "--out", "/tmp/x", ...bindingArgs]);
  assert.equal(parsed.json, true);
  assert.equal(parsed.strict, true);
  assert.equal(parsed.skipBrowser, false);
  assert.equal(parsed.out, "/tmp/x");
  assert.equal(parsed.readOnly, true);
  assert.equal(parsed.writeAuthorization.authorized, false);
  assert.deepEqual(parsed.releaseBinding, {
    candidateSha: "a".repeat(40),
    deploymentId: "dpl_Abcdefghijklmnop",
    deploymentUrl: "https://mais-parent-cert-abc.vercel.app",
    buildId: "build_Abcdefghijklmnop"
  });

  assert.throws(() => parseArgs([]), /candidate-sha/i);
  assert.throws(() => parseArgs(["--candidate-sha", "not-a-sha", ...bindingArgs.slice(2)]), /candidate-sha/i);
  assert.throws(
    () => parseArgs([...bindingArgs.slice(0, 5), "https://www.mais.hk/path", ...bindingArgs.slice(6)]),
    /deployment-url/i
  );
  assert.throws(() => parseArgs(["--nope"]), /Unknown argument/);
});

test("local release binding rejects an old, dirty, unstable, or differently scoped build attestation", () => {
  const releaseBinding = {
    candidateSha: "a".repeat(40),
    deploymentId: "dpl_Abcdefghijklmnop",
    deploymentUrl: "https://mais-parent-cert-abc.vercel.app",
    buildId: "build_Abcdefghijklmnop"
  };
  const attestation = {
    schemaVersion: 1,
    candidateSha: releaseBinding.candidateSha,
    buildId: releaseBinding.buildId,
    distDir: ".next",
    sourceTreeClean: true,
    sourceTreeStable: true,
    buildStartedAt: "2026-08-24T08:00:00.000Z",
    completedAt: "2026-08-24T08:10:00.000Z"
  };

  assert.deepEqual(
    validateLocalReleaseBindingEvidence(releaseBinding, {
      localSha: releaseBinding.candidateSha,
      localBuildId: releaseBinding.buildId,
      attestation
    }),
    {
      ...releaseBinding,
      localHeadMatched: true,
      localBuildIdMatched: true,
      localBuildAttestationMatched: true,
      buildStartedAt: attestation.buildStartedAt,
      completedAt: attestation.completedAt
    }
  );

  for (const [label, override] of [
    ["old SHA", { candidateSha: "b".repeat(40) }],
    ["old build", { buildId: "build_OldCandidate000000" }],
    ["dirty source", { sourceTreeClean: false }],
    ["changing source", { sourceTreeStable: false }],
    ["isolated dist", { distDir: ".tmp/other-next" }]
  ]) {
    assert.throws(
      () => validateLocalReleaseBindingEvidence(releaseBinding, {
        localSha: releaseBinding.candidateSha,
        localBuildId: releaseBinding.buildId,
        attestation: { ...attestation, ...override }
      }),
      /Build binding failed/u,
      label
    );
  }
});

test("production write authorization requires an exact synthetic family confirmation and target", () => {
  assert.throws(
    () => parseArgs([...bindingArgs, "--allow-production-writes"]),
    /synthetic-test-family/i
  );
  assert.throws(
    () => parseArgs([
      ...bindingArgs,
      "--allow-production-writes",
      "--synthetic-test-family-id",
      "mais-synthetic-family-parent-01",
      "--write-target",
      "https://www.mais.hk",
      "--synthetic-test-family-confirmation",
      "wrong"
    ]),
    /exact synthetic/i
  );

  const parsed = parseArgs([
    ...bindingArgs,
    "--allow-production-writes",
    "--synthetic-test-family-id",
    "mais-synthetic-family-parent-01",
    "--write-target",
    "https://www.mais.hk",
    "--synthetic-test-family-confirmation",
    "ALLOW_SYNTHETIC_TEST_FAMILY_WRITES:mais-synthetic-family-parent-01@https://www.mais.hk"
  ]);
  assert.deepEqual(parsed.writeAuthorization, {
    authorized: true,
    target: "https://www.mais.hk",
    syntheticFamilyConfirmed: true
  });
  assert.equal(parsed.readOnly, true, "this phase must execute no write probes even when authorization is supplied");
  assert.doesNotMatch(JSON.stringify(parsed), /ALLOW_SYNTHETIC_TEST_FAMILY_WRITES|mais-synthetic-family-parent-01/);
});

test("production certification source contains no legacy demo-login or mutating smoke execution", async () => {
  const source = await readFile(new URL("./prod-certification.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /DASHBOARD_SMOKE_USE_DEMO_LOGIN|AI_TUTOR_LIVE_USE_DEMO_LOGIN/);
  assert.doesNotMatch(source, /dashboard-(?:latency|ui-loading)-smoke|ai-tutor-live-latency-smoke/);
  assert.doesNotMatch(source, /method:\s*["']POST["']/);
  assert.match(source, /--allow-production-writes/);
  assert.match(source, /--synthetic-test-family-confirmation/);
});
