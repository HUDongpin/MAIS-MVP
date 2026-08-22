import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateVerdict,
  classifySmokeFailure,
  daysUntil,
  evaluateBudget,
  extractNextAssets,
  formatReportMarkdown,
  parseArgs
} from "./prod-certification-core.mjs";

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

test("classifySmokeFailure separates network-layer failures from real ones", () => {
  assert.equal(classifySmokeFailure("Error: request-timeout after 30000ms"), "environmental");
  assert.equal(classifySmokeFailure("TypeError: fetch failed\n  cause: ECONNRESET"), "environmental");
  assert.equal(classifySmokeFailure("FAIL dashboard: p95=9000ms threshold=6000ms status=200"), "real");
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
    writeFootprint: "none (read-only run)",
    results: [
      { id: "home-availability", severity: "P0", status: "pass", domain: "https://www.mais.ac", detail: "HTTP 200 | fast" }
    ]
  });
  assert.match(markdown, /Production certification — CERTIFIED_WITH_FINDINGS/);
  assert.match(markdown, /pass 1, warn 0, fail 0, skip 0/);
  assert.match(markdown, /HTTP 200 \\\| fast/);
});

test("parseArgs handles flags and rejects unknown arguments", () => {
  assert.deepEqual(parseArgs(["--json", "--skip-smokes", "--out", "/tmp/x"]), {
    json: true,
    strict: false,
    skipSmokes: true,
    skipBrowser: false,
    out: "/tmp/x"
  });
  assert.throws(() => parseArgs(["--nope"]), /Unknown argument/);
});
