import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const guardPath = path.join(repoRoot, "scripts", "promotion-workflow-json-guard.mjs");

async function loadGuard() {
  try {
    return await import(pathToFileURL(guardPath).href);
  } catch {
    return null;
  }
}

async function requireGuard() {
  const guard = await loadGuard();
  assert.equal(
    typeof guard?.parsePromotionWorkflowJsonBytes,
    "function",
    "the tracked Promotion workflow strict JSON byte parser must exist"
  );
  return guard;
}

test("Promotion workflow JSON guard accepts the complete JSON value grammar", async () => {
  const { parsePromotionWorkflowJsonBytes } = await requireGuard();
  const source = Buffer.from(
    '{"object":{"escaped":"line\\nslash\\/quote\\\"unicode\\u0020ok","negativeZero":-0,"fraction":-12.5e+2},"array":[true,false,null,"text",0,1E-2]}',
    "utf8"
  );

  const parsed = parsePromotionWorkflowJsonBytes(source);

  assert.deepEqual(parsed, {
    object: {
      escaped: 'line\nslash/quote"unicode ok',
      negativeZero: -0,
      fraction: -1250
    },
    array: [true, false, null, "text", 0, 0.01]
  });
  assert.ok(Object.is(parsed.object.negativeZero, -0));
});

test("Promotion workflow JSON guard rejects invalid UTF-8 before parsing", async () => {
  const { parsePromotionWorkflowJsonBytes, PromotionWorkflowJsonError } = await requireGuard();
  const invalidUtf8 = Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d]);

  assert.throws(
    () => parsePromotionWorkflowJsonBytes(invalidUtf8),
    (error) => error instanceof PromotionWorkflowJsonError && error.code === "PROMOTION_WORKFLOW_JSON_INVALID"
  );
});

test("Promotion workflow JSON guard rejects duplicate object keys at every depth without disclosure", async () => {
  const { parsePromotionWorkflowJsonBytes, PromotionWorkflowJsonError } = await requireGuard();
  const cases = [
    '{"outerSecret":991,"outerSecret":992}',
    '{"wrapper":{"innerSecret":"forbiddenValue","innerSecret":"otherForbiddenValue"}}',
    '{"wrapper":[{"safeName":1,"\\u0073afeName":2}]}'
  ];

  for (const source of cases) {
    assert.throws(
      () => parsePromotionWorkflowJsonBytes(Buffer.from(source, "utf8")),
      (error) => {
        assert.ok(error instanceof PromotionWorkflowJsonError);
        assert.equal(error.code, "PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY");
        assert.doesNotMatch(error.message, /outerSecret|innerSecret|safeName|991|992|forbiddenValue|otherForbiddenValue/u);
        return true;
      }
    );
  }
});

test("Promotion workflow JSON guard enforces JSON grammar and rejects non-finite numbers", async () => {
  const { parsePromotionWorkflowJsonBytes, PromotionWorkflowJsonError } = await requireGuard();
  const invalidSources = [
    "01",
    "1.",
    "[1,]",
    '{"x":true} trailing',
    '{"x" 1}',
    '"raw\ncontrol"',
    '"\\u12xz"',
    "1e999",
    "-1e999"
  ];

  for (const source of invalidSources) {
    assert.throws(
      () => parsePromotionWorkflowJsonBytes(Buffer.from(source, "utf8")),
      (error) => error instanceof PromotionWorkflowJsonError && error.code === "PROMOTION_WORKFLOW_JSON_INVALID",
      source
    );
  }
});

test("Promotion workflow JSON guard exposes and enforces frozen resource limits", async () => {
  const {
    parsePromotionWorkflowJsonBytes,
    PromotionWorkflowJsonError,
    PROMOTION_WORKFLOW_JSON_LIMITS
  } = await requireGuard();

  assert.deepEqual(PROMOTION_WORKFLOW_JSON_LIMITS, {
    maxBytes: 32 * 1024 * 1024,
    maxDepth: 128,
    maxWork: 64 * 1024 * 1024,
    maxNodes: 250_000
  });

  const withinDepth = Buffer.from(`${'{"n":'.repeat(128)}null${"}".repeat(128)}`, "utf8");
  assert.doesNotThrow(() => parsePromotionWorkflowJsonBytes(withinDepth));

  const beyondDepth = Buffer.from(`${'{"n":'.repeat(129)}null${"}".repeat(129)}`, "utf8");
  assert.throws(
    () => parsePromotionWorkflowJsonBytes(beyondDepth),
    (error) => error instanceof PromotionWorkflowJsonError && error.code === "PROMOTION_WORKFLOW_JSON_LIMIT_EXCEEDED"
  );

  const beyondNodes = Buffer.from(`[${"null,".repeat(PROMOTION_WORKFLOW_JSON_LIMITS.maxNodes)}null]`, "utf8");
  assert.throws(
    () => parsePromotionWorkflowJsonBytes(beyondNodes),
    (error) => error instanceof PromotionWorkflowJsonError && error.code === "PROMOTION_WORKFLOW_JSON_LIMIT_EXCEEDED"
  );

  const beyondBytes = Buffer.alloc(PROMOTION_WORKFLOW_JSON_LIMITS.maxBytes + 1, 0x20);
  assert.throws(
    () => parsePromotionWorkflowJsonBytes(beyondBytes),
    (error) => error instanceof PromotionWorkflowJsonError && error.code === "PROMOTION_WORKFLOW_JSON_LIMIT_EXCEEDED"
  );
});
