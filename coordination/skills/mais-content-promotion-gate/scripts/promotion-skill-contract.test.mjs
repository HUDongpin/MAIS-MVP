import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const SKILL_ROOT = new URL("../", import.meta.url);

test("readiness template preserves the complete active and historical evidence contract", async () => {
  const template = await readFile(new URL("assets/promotion-readiness-report.template.md", SKILL_ROOT), "utf8");
  const required = [
    "- Status: `{{STATUS}}`",
    "- Base attempt reference: `{{BASE_ATTEMPT_REDACTED_REF}}`",
    "- Active revision reference: `{{ACTIVE_REVISION_REDACTED_REF_OR_NONE}}`",
    "## Active artifacts",
    "## Historical direct-base artifacts",
    "- Active Manifest: `{{ACTIVE_MANIFEST_REDACTED_REF}}` / `{{ACTIVE_MANIFEST_SHA256}}`",
    "- Active Receipt: `{{ACTIVE_RECEIPT_REDACTED_REF}}` / `{{ACTIVE_RECEIPT_SHA256}}`",
    "- Active Closure: `{{ACTIVE_CLOSURE_REDACTED_REF_OR_NONE}}` / `{{ACTIVE_CLOSURE_SHA256_OR_NONE}}`",
    "- Active Registry: `{{ACTIVE_REGISTRY_REDACTED_REF_OR_NONE}}` / `{{ACTIVE_REGISTRY_SHA256_OR_NONE}}`",
    "- Historical direct-base Manifest: `{{HISTORICAL_BASE_MANIFEST_REDACTED_REF_OR_NONE}}` / `{{HISTORICAL_BASE_MANIFEST_SHA256_OR_NONE}}`",
    "- Historical direct-base Receipt: `{{HISTORICAL_BASE_RECEIPT_REDACTED_REF_OR_NONE}}` / `{{HISTORICAL_BASE_RECEIPT_SHA256_OR_NONE}}`",
    "- Historical direct-base Closure: `{{HISTORICAL_BASE_CLOSURE_REDACTED_REF_OR_NONE}}` / `{{HISTORICAL_BASE_CLOSURE_SHA256_OR_NONE}}`",
    "- Historical direct-base Registry: `{{HISTORICAL_BASE_REGISTRY_REDACTED_REF_OR_NONE}}` / `{{HISTORICAL_BASE_REGISTRY_SHA256_OR_NONE}}`",
    "- Canonical Receipt file SHA-256: `{{CANONICAL_FILE_SHA256_OR_NOT_RUN}}`",
    "- Canonical Receipt raw digest: `{{CANONICAL_RAW_SHA256_OR_NOT_RUN}}`",
    "- Canonical Receipt semantic digest: `{{CANONICAL_SEMANTIC_SHA256_OR_NOT_RUN}}`",
    "- Canonical Receipt binding digest: `{{CANONICAL_BINDING_SHA256_OR_NOT_RUN}}`",
    "- Fresh Receipt file SHA-256: `{{FRESH_FILE_SHA256_OR_NOT_RUN}}`",
    "- Fresh Receipt raw digest: `{{FRESH_RAW_SHA256_OR_NOT_RUN}}`",
    "- Fresh Receipt semantic digest: `{{FRESH_SEMANTIC_SHA256_OR_NOT_RUN}}`",
    "- Fresh Receipt binding digest: `{{FRESH_BINDING_SHA256_OR_NOT_RUN}}`",
    "- Replay Receipt file SHA-256: `{{REPLAY_FILE_SHA256_OR_NOT_RUN}}`",
    "- Replay Receipt raw digest: `{{REPLAY_RAW_SHA256_OR_NOT_RUN}}`",
    "- Replay Receipt semantic digest: `{{REPLAY_SEMANTIC_SHA256_OR_NOT_RUN}}`",
    "- Replay Receipt binding digest: `{{REPLAY_BINDING_SHA256_OR_NOT_RUN}}`",
    "- Comparison digest: `{{COMPARISON_SHA256_OR_NOT_RUN}}`",
    "- Comparison issue codes: `{{FIXED_REDACTED_CODES_OR_NONE}}`",
  ];
  for (const field of required) assert.ok(template.includes(field), `missing readiness contract field: ${field}`);
});

test("normative guidance uses dynamic N for role evidence counts", async () => {
  const files = [
    "SKILL.md",
    "references/discovery-and-routing.md",
    "references/evidence-boundaries.md",
    "references/lifecycle-and-invalidation.md",
    "references/release-handoff.md",
  ];
  for (const relative of files) {
    const source = await readFile(new URL(relative, SKILL_ROOT), "utf8");
    assert.doesNotMatch(source, /\bnine\s+role\s+evidence\s+files\b/iu, `${relative} contains a normative fixed count`);
  }
  const caseStudy = await readFile(new URL("references/mais-v2-attempts-case-study.md", SKILL_ROOT), "utf8");
  assert.match(caseStudy, /\bnine\s+role\s+evidence\s+files\b/iu);
});
