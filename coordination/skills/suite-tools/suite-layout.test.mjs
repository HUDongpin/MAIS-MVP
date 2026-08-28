import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SUITE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const COMPONENTS = {
  "mais-rsi-machine-qa-workflow": { evals: 5, triggers: [10, 10] },
  "mais-natural-sample-evaluation": { evals: 5, triggers: [10, 10] },
  "mais-content-promotion-gate": { evals: 5, triggers: [10, 10] },
  "mais-content-qa-approval-workflow": { evals: 2, triggers: [10, 10] },
  "mais-release-hygiene-deploy-workflow": { evals: 2, triggers: [10, 10] },
};

function read(relative) {
  return fs.readFileSync(path.join(SUITE_DIR, relative), "utf8");
}

function json(relative) {
  return JSON.parse(read(relative));
}

function markdownSection(markdown, heading) {
  const marker = `${heading}\n`;
  const start = markdown.indexOf(marker);
  assert.notEqual(start, -1, `missing Markdown section ${heading}`);
  const bodyStart = start + marker.length;
  const next = markdown.indexOf("\n## ", bodyStart);
  return markdown.slice(bodyStart, next === -1 ? markdown.length : next);
}

function markdownH2Headings(markdown) {
  return [...markdown.matchAll(/^## (.+)$/gmu)].map((match) => `## ${match[1]}`);
}

function assertContainsAll(text, tokens, label) {
  for (const token of tokens) assert(text.includes(token), `${label}: missing ${token}`);
}

function assertExactRequiredFields(definition, fields, label) {
  assert(Array.isArray(definition?.required), `${label}: no required-field contract`);
  assert.deepEqual([...definition.required].sort(), [...fields].sort(), `${label}: required-field drift`);
}

function filesRecursively(root) {
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...filesRecursively(full));
    else if (entry.isFile()) output.push(full);
  }
  return output;
}

test("five canonical Skills have exact names and balanced eval inventories", () => {
  let behaviorTotal = 0;
  let triggerTotal = 0;
  for (const [name, expected] of Object.entries(COMPONENTS)) {
    const skill = read(`${name}/SKILL.md`);
    assert(skill.startsWith(`---\nname: ${name}\n`), name);
    assert.match(skill, /\ndescription: /u, `${name} description`);

    const behavior = json(`${name}/evals/evals.json`);
    assert.equal(behavior.skill_name, name, `${name} eval skill_name`);
    assert.equal(behavior.evals.length, expected.evals, `${name} behavior eval count`);
    behaviorTotal += behavior.evals.length;

    const triggers = json(`${name}/evals/trigger-evals.json`);
    assert.equal(triggers.length, 20, `${name} trigger count`);
    const positives = triggers.filter((entry) => entry.should_trigger === true).length;
    const negatives = triggers.filter((entry) => entry.should_trigger === false).length;
    assert.deepEqual([positives, negatives], expected.triggers, `${name} trigger balance`);
    assert(triggers.every((entry) => typeof entry.query === "string" && entry.query.length > 10));
    triggerTotal += triggers.length;
  }
  assert.equal(behaviorTotal, 19);
  assert.equal(triggerTotal, 100);
});

test("approved specialist assets and references are present", () => {
  const expected = [
    "mais-rsi-machine-qa-workflow/assets/machine-qa-evidence.schema.json",
    "mais-rsi-machine-qa-workflow/assets/machine-qa-handoff.template.md",
    "mais-natural-sample-evaluation/assets/natural-evaluation-state.schema.json",
    "mais-natural-sample-evaluation/assets/project-adapter-map.template.md",
    "mais-natural-sample-evaluation/assets/provider-grant-request.template.md",
    "mais-natural-sample-evaluation/assets/claim-boundary-handoff.template.md",
    "mais-content-promotion-gate/assets/promotion-gate-handoff.schema.json",
    "mais-content-promotion-gate/assets/promotion-readiness-report.template.md",
    "mais-content-promotion-gate/assets/attempt-disposition.template.md",
    "mais-content-promotion-gate/assets/live-release-handoff.template.md",
  ];
  for (const relative of expected) assert(fs.statSync(path.join(SUITE_DIR, relative)).isFile(), relative);

  for (const template of [
    "project-adapter-map.template.md",
    "provider-grant-request.template.md",
    "claim-boundary-handoff.template.md",
  ]) {
    assert(read(`mais-natural-sample-evaluation/assets/${template}`).startsWith("# TEMPLATE_ONLY_NOT_AUTHORIZATION\n"), template);
  }
});

test("human-readable templates are bilingual or explicitly follow user language", () => {
  assert.match(
    read("mais-rsi-machine-qa-workflow/assets/machine-qa-handoff.template.md"),
    /Machine-QA Handoff \/ MAIS 机器质检交接/u,
  );
  for (const relative of [
    "mais-natural-sample-evaluation/assets/project-adapter-map.template.md",
    "mais-natural-sample-evaluation/assets/provider-grant-request.template.md",
    "mais-natural-sample-evaluation/assets/claim-boundary-handoff.template.md",
    "mais-content-promotion-gate/assets/promotion-readiness-report.template.md",
    "mais-content-promotion-gate/assets/attempt-disposition.template.md",
    "mais-content-promotion-gate/assets/live-release-handoff.template.md",
  ]) {
    assert.match(read(relative), /Output language \/ 输出语言: follow the user's language/u, relative);
  }
});

test("three specialist response-card contracts cover the fifteen core scenario families", () => {
  const cards = {
    rsi: read("mais-rsi-machine-qa-workflow/references/response-cards.md"),
    natural: read("mais-natural-sample-evaluation/references/response-cards.md"),
    promotion: read("mais-content-promotion-gate/references/response-cards.md"),
  };
  const skills = {
    rsi: read("mais-rsi-machine-qa-workflow/SKILL.md"),
    natural: read("mais-natural-sample-evaluation/SKILL.md"),
    promotion: read("mais-content-promotion-gate/SKILL.md"),
  };
  const headings = {
    rsi: [
      "## RSI-1 Incomplete C0 packet",
      "## RSI-2 Named synthetic calibration",
      "## RSI-3 Live-provider request",
      "## RSI-4 Candidate mutation and D-prime",
      "## RSI-5 Unsafe or approval-bearing receipt",
    ],
    natural: [
      "## NAT-1 Named dated status audit",
      "## NAT-2 Provider execution requested without authority",
      "## NAT-3 Registered-material drift",
      "## NAT-4 Interrupted execution recovery",
      "## NAT-5 Synthetic fixture or scientific ceiling",
    ],
    promotion: [
      "## PRO-1 Named dated attempt or re-affirmation audit",
      "## PRO-2 Candidate or evidence mutation",
      "## PRO-3 Historical Receipt after runtime drift",
      "## PRO-4 Canonical/fresh/replay comparison",
      "## PRO-5 Shadow-to-live request",
    ],
  };
  for (const specialist of Object.keys(cards)) {
    assert.deepEqual(markdownH2Headings(cards[specialist]), headings[specialist], `${specialist}: exact ordered cards`);
    assert(skills[specialist].includes("references/response-cards.md"), `${specialist}: missing Skill routing link`);
  }

  assertContainsAll(markdownSection(cards.rsi, headings.rsi[0]), [
    "All five canonical C0 roles are mandatory whenever `c0Required:true`",
    "every registered trigger",
    "P0/P1 answer, math, coverage, or schema risk",
    "SHA-256 of empty bytes",
    "exact missing role from the fixed five-role set",
    "fresh-context missing-role receipt",
  ], "RSI-1 card");
  assertContainsAll(markdownSection(cards.rsi, headings.rsi[1]), [
    "synthetic-calibration",
    "mais-natural-sample-evaluation",
    "A18",
  ], "RSI-2 card");
  assertContainsAll(markdownSection(cards.rsi, headings.rsi[2]), [
    "no provider call and no credential-source access",
    "`package.json`",
    "`package-lock.json`",
    "sorted unique",
    "`100755`",
    "exact HEAD and working-tree bytes/modes",
    "never subtracted from Git status",
    "LIVE_AUTHORIZATION_RECEIPT",
  ], "RSI-3 card");
  assertContainsAll(markdownSection(cards.rsi, headings.rsi[3]), [
    "critiqueThenRevision: true",
    "Every fresh current deterministic, B-prime, required-C0, independent-review, and check hash reference is disjoint from prior and invalidated receipts",
    "complete new active receipt set to be pairwise distinct",
    "machineDisposition: candidate-only | needs-repair | blocked",
  ], "RSI-4 card");
  assertContainsAll(markdownSection(cards.rsi, headings.rsi[4]), [
    "omit claimCeiling",
    "suppress semantic output",
    "never provider authority",
    "rejected exact-package receipt",
    "A18 only as the blocked downstream owner",
    "do not transmit the rejected receipt",
    "sanitized, independently validated exact-package `candidate-only` packet",
    "without claiming A18 acceptance",
    "synthetic evidence never routes to A18",
  ], "RSI-5 card");

  const naturalPreamble = cards.natural.slice(0, cards.natural.indexOf("\n## "));
  assertContainsAll(naturalPreamble, ["no credential access", "no provider call"], "Natural card default");
  assertContainsAll(markdownSection(cards.natural, headings.natural[0]), [
    "RUNNER_INDEPENDENTLY_VERIFIED",
    "known-zero",
    "nextAllowedAction: CREATE_CONTROLLED_CUSTODY_HANDOFF",
    "nextAllowedAction: REQUEST_REFERENCE_PREFLIGHT_AUTHORIZATION",
    "INCONCLUSIVE_MACHINE_REFERENCE",
  ], "NAT-1 card");
  assertContainsAll(markdownSection(cards.natural, headings.natural[1]), [
    "no credential access and no provider call",
    "ProviderGrantBindingV1",
    "three-way binding",
  ], "NAT-2 card");
  assertContainsAll(markdownSection(cards.natural, headings.natural[2]), [
    "NEW_REGISTRATION_REQUIRED",
    "append-only old lineage",
    "replacement self-hash",
  ], "NAT-3 card");
  assertContainsAll(markdownSection(cards.natural, headings.natural[3]), [
    "attempts: {known:false,count:null}",
    "activity.unknown.present:true",
    "RECONCILE_ACTIVITY_OFFLINE",
  ], "NAT-4 card");
  assertContainsAll(markdownSection(cards.natural, headings.natural[4]), [
    "synthetic-fixture",
    "positive-plus-negative support arithmetic",
    "INCONCLUSIVE_MACHINE_REFERENCE",
  ], "NAT-5 card");

  assertContainsAll(markdownSection(cards.promotion, headings.promotion[0]), [
    "do not replace recorded facts with unknown",
    "unresolved-reaffirmation",
    "bound evidence records",
  ], "PRO-1 card");
  assertContainsAll(markdownSection(cards.promotion, headings.promotion[1]), [
    "new immutable candidate/version/attempt",
    "evidence-only correction",
    "baseline-only re-affirmation",
  ], "PRO-2 card");
  assertContainsAll(markdownSection(cards.promotion, headings.promotion[2]), [
    "currentness: historical-only",
    "cannot authorize",
    "replacement immutable attempt",
    "evidence first",
    "one binding/execution commit",
    "independent Receipt/finalization evidence",
    "self-referential",
    "monolithic rewrite",
  ], "PRO-3 card");
  assertContainsAll(markdownSection(cards.promotion, headings.promotion[3]), [
    "consistently rehashed production/deploy/approval claims",
    "comparisonDigest` is required for `pass`",
    "for `fail`, preserve it when the authoritative comparator returns it",
    "issues[].code",
    "RUN_ID_NOT_DISTINCT",
    "RECEIPT_BINDING_MISMATCH",
    "SEMANTIC_RECEIPT_UNVERIFIED",
    "SEMANTIC_RECEIPT_MISMATCH",
  ], "PRO-4 card");
  assertContainsAll(markdownSection(cards.promotion, headings.promotion[4]), [
    "no provider-configuration access or network call",
    "structured blocked handoff",
    "mais-release-hygiene-deploy-workflow",
  ], "PRO-5 card");
});

test("locked specialist package structures retain every named deliverable", () => {
  const required = [
    "mais-rsi-machine-qa-workflow/SKILL.md",
    "mais-rsi-machine-qa-workflow/agents/openai.yaml",
    "mais-rsi-machine-qa-workflow/references/operating-model.md",
    "mais-rsi-machine-qa-workflow/references/evidence-and-receipt-contract.md",
    "mais-rsi-machine-qa-workflow/references/finding-taxonomy-v2.md",
    "mais-rsi-machine-qa-workflow/references/remediation-and-independence.md",
    "mais-rsi-machine-qa-workflow/references/mais-routing-and-currentness.md",
    "mais-rsi-machine-qa-workflow/references/rsi-lite-v2-case-study.md",
    "mais-rsi-machine-qa-workflow/scripts/validate-machine-qa-packet.mjs",
    "mais-rsi-machine-qa-workflow/scripts/safe-receipt-summary.mjs",
    "mais-rsi-machine-qa-workflow/assets/machine-qa-handoff.template.md",
    "mais-rsi-machine-qa-workflow/assets/machine-qa-evidence.schema.json",
    "mais-rsi-machine-qa-workflow/evals/evals.json",
    "mais-natural-sample-evaluation/SKILL.md",
    "mais-natural-sample-evaluation/agents/openai.yaml",
    "mais-natural-sample-evaluation/references/registered-evaluation-state-machine.md",
    "mais-natural-sample-evaluation/references/evidence-and-claim-boundaries.md",
    "mais-natural-sample-evaluation/references/protected-custody-and-recovery.md",
    "mais-natural-sample-evaluation/references/provider-authority-contract.md",
    "mais-natural-sample-evaluation/references/mais-ca60-case-study.md",
    "mais-natural-sample-evaluation/scripts/resolve-evaluation-state.mjs",
    "mais-natural-sample-evaluation/scripts/verify-evidence-envelope.mjs",
    "mais-natural-sample-evaluation/scripts/audit-protected-custody.mjs",
    "mais-natural-sample-evaluation/scripts/validate-redacted-export.mjs",
    "mais-natural-sample-evaluation/assets/project-adapter-map.template.md",
    "mais-natural-sample-evaluation/assets/provider-grant-request.template.md",
    "mais-natural-sample-evaluation/assets/claim-boundary-handoff.template.md",
    "mais-natural-sample-evaluation/assets/natural-evaluation-state.schema.json",
    "mais-natural-sample-evaluation/evals/evals.json",
    "mais-content-promotion-gate/SKILL.md",
    "mais-content-promotion-gate/agents/openai.yaml",
    "mais-content-promotion-gate/references/core-contract.md",
    "mais-content-promotion-gate/references/discovery-and-routing.md",
    "mais-content-promotion-gate/references/lifecycle-and-invalidation.md",
    "mais-content-promotion-gate/references/evidence-boundaries.md",
    "mais-content-promotion-gate/references/mais-v2-attempts-case-study.md",
    "mais-content-promotion-gate/references/release-handoff.md",
    "mais-content-promotion-gate/scripts/discover-promotion-gate.mjs",
    "mais-content-promotion-gate/scripts/run-native-gate.mjs",
    "mais-content-promotion-gate/scripts/compare-receipts.mjs",
    "mais-content-promotion-gate/assets/promotion-readiness-report.template.md",
    "mais-content-promotion-gate/assets/attempt-disposition.template.md",
    "mais-content-promotion-gate/assets/live-release-handoff.template.md",
    "mais-content-promotion-gate/assets/promotion-gate-handoff.schema.json",
    "mais-content-promotion-gate/evals/evals.json",
  ];

  for (const relative of required) {
    assert(fs.statSync(path.join(SUITE_DIR, relative)).isFile(), relative);
  }
});

test("specialist package scripts have no sibling-package dependency", () => {
  const specialistPackages = [
    "mais-rsi-machine-qa-workflow",
    "mais-natural-sample-evaluation",
    "mais-content-promotion-gate",
  ];
  for (const name of specialistPackages) {
    const scripts = filesRecursively(path.join(SUITE_DIR, name, "scripts")).filter((file) => file.endsWith(".mjs"));
    for (const script of scripts) {
      const source = fs.readFileSync(script, "utf8");
      assert.doesNotMatch(source, /(?:from\s+|import\()["'][^"']*mais-(?:rsi|natural|content-promotion)/u, script);
      for (const sibling of specialistPackages.filter((candidate) => candidate !== name)) {
        assert.equal(
          source.includes(`coordination/skills/${sibling}`),
          false,
          `${script} contains a literal sibling package path`,
        );
      }
    }
  }
});

test("generic Promotion flow does not embed dated CA-ratios candidate semantics", () => {
  const promotionRoot = path.join(SUITE_DIR, "mais-content-promotion-gate");
  const normativeFiles = filesRecursively(promotionRoot).filter((file) => {
    const relative = path.relative(promotionRoot, file).split(path.sep).join("/");
    return !relative.startsWith("evals/") &&
      !relative.endsWith(".test.mjs") &&
      !relative.includes(".test-") &&
      relative !== "references/mais-v2-attempts-case-study.md" &&
      relative !== "references/mais-v2-case-study.md";
  });
  const forbidden = /\b(?:numericOracle|ratioOrderPreserved|clusterStandards|misconceptionCoverage)\b|California Grade 6 ratios|\bv2\.6\b|\battempt-007\b/gu;
  const findings = normativeFiles.flatMap((file) => {
    const source = fs.readFileSync(file, "utf8");
    return [...source.matchAll(forbidden)].map((match) => ({
      file: path.relative(promotionRoot, file).split(path.sep).join("/"),
      token: match[0],
    }));
  });
  assert.deepEqual(findings, []);
  const normativeText = normativeFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(normativeText, /cached current-main|during this implementation round/iu);
});

test("dated Natural and RSI case constants stay outside normative runtime contracts", () => {
  const cases = [
    {
      root: "mais-natural-sample-evaluation",
      caseStudy: "references/mais-ca60-case-study.md",
      forbidden: /\b(?:CA60|MAIS_CA60|V5-R11)\b|60-item/gu,
    },
    {
      root: "mais-rsi-machine-qa-workflow",
      caseStudy: "references/rsi-lite-v2-case-study.md",
      forbidden: /\b7,200\b|108 injected|\b(?:106\/108|108\/108)\b|\bb6c7c347\b|stream:\s*true/gu,
    },
  ];
  const findings = [];
  for (const entry of cases) {
    const packageRoot = path.join(SUITE_DIR, entry.root);
    const normativeFiles = filesRecursively(packageRoot).filter((file) => {
      const relative = path.relative(packageRoot, file).split(path.sep).join("/");
      return !relative.startsWith("evals/") &&
        !relative.endsWith(".test.mjs") &&
        relative !== "scripts/test-fixtures.mjs" &&
        relative !== entry.caseStudy;
    });
    for (const file of normativeFiles) {
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(entry.forbidden)) {
        findings.push({
          file: `${entry.root}/${path.relative(packageRoot, file).split(path.sep).join("/")}`,
          token: match[0],
        });
      }
    }
  }
  assert.deepEqual(findings, []);
});

test("compatibility Skills use Axx routing and retain their new authority ceilings", () => {
  const contentSkill = read("mais-content-qa-approval-workflow/SKILL.md");
  const contentSafeOutput = markdownSection(contentSkill, "## Safe Output");
  const content = filesRecursively(path.join(SUITE_DIR, "mais-content-qa-approval-workflow"))
    .filter((file) => !file.endsWith("trigger-evals.json") && !file.endsWith("evals.json"))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  const release = filesRecursively(path.join(SUITE_DIR, "mais-release-hygiene-deploy-workflow"))
    .filter((file) => !file.endsWith("trigger-evals.json") && !file.endsWith("evals.json"))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  assert.doesNotMatch(content, /\bS\d{2}\b/u);
  assert.doesNotMatch(release, /\bS\d{2}\b/u);
  assert.match(content, /highest self-created state is `approved-for-integration-review`/u);
  assert.match(content, /Do not create `approved-for-production`/u);
  assert.match(content, /After A18 content acceptance, route Shadow requests to `mais-content-promotion-gate` and production requests to `mais-release-hygiene-deploy-workflow`/u);
  assert.match(contentSafeOutput, /After A18 content acceptance, route Shadow requests to `mais-content-promotion-gate` and production requests to `mais-release-hygiene-deploy-workflow`/u);
  assert.match(contentSafeOutput, /keep production blocked until the current Promotion handoff exists/u);
  assert.match(content, /A25 release-intake\/clean-slice evidence/u);
  assert.match(content, /Follow the user's language for human-readable prose/u);
  assert.match(release, /route it to `mais-content-promotion-gate`/u);
  assert.match(release, /consume and cross-bind (?:the )?already-current A18 decision and Promotion handoff/u);
  assert.doesNotMatch(release, /(?:validate|verif(?:y|ies)).{0,80}(?:A18\/A23 )?Promotion chain/iu);
  assert.match(release, /Manifest, Receipt, Closure, Registry, (?:and )?Promotion-currentness validation stay with `mais-content-promotion-gate`/u);
  assert.match(release, /green build, required check, configured provider, or READY deployment is never live proof/u);
  assert.match(release, /Shadow evidence is not deployment proof/u);
  assert.match(release, /`release-readiness-evaluation`/u);
  assert.match(release, /`deploy-or-live-verification`/u);
  assert.match(release, /never mutates provider\/environment configuration/u);
  assert.match(release, /`sameShaRouteReadback`/u);
  assert.match(release, /`liveRequiredBehavior`/u);
  assert.match(release, /Follow the user's language for human-readable prose/u);
});

test("formal response contracts are section-scoped and schema-backed", () => {
  const rsi = read("mais-rsi-machine-qa-workflow/SKILL.md");
  const remediation = read("mais-rsi-machine-qa-workflow/references/remediation-and-independence.md");
  const rsiSchema = json("mais-rsi-machine-qa-workflow/assets/machine-qa-evidence.schema.json");
  const natural = read("mais-natural-sample-evaluation/SKILL.md");
  const naturalState = read("mais-natural-sample-evaluation/references/registered-evaluation-state-machine.md");
  const naturalRecovery = read("mais-natural-sample-evaluation/references/protected-custody-and-recovery.md");
  const naturalSchema = json("mais-natural-sample-evaluation/assets/natural-evaluation-state.schema.json");
  const naturalCase = read("mais-natural-sample-evaluation/references/mais-ca60-case-study.md");
  const promotion = read("mais-content-promotion-gate/SKILL.md");
  const promotionSchema = json("mais-content-promotion-gate/assets/promotion-gate-handoff.schema.json");
  const release = read("mais-release-hygiene-deploy-workflow/SKILL.md");

  const rsiAudit = markdownSection(rsi, "## Complete Audit Response");
  const naturalAudit = markdownSection(natural, "## Complete Audit Response");
  const recoveryContract = markdownSection(naturalRecovery, "## Reservation-Only Interruption");
  const promotionAudit = markdownSection(promotion, "## Required response projection");
  const releaseOutcomes = markdownSection(release, "## Release Outcomes");

  assert.match(rsi, /natural-population estimation goes to `mais-natural-sample-evaluation`/u);
  assert.match(rsi, /exact-item\/package content acceptance goes to A18/u);
  assert.match(rsiAudit, /even if the caller leaves `candidateMutated: false`/u);
  assert.match(rsiAudit, /rehashing an outer wrapper cannot preserve an old result digest/u);
  assert.match(rsiAudit, /different untrusted evidence source until it is compared again/u);
  assert.match(rsiAudit, /field-specific positive grammar/u);
  assert.match(rsiAudit, /context-specific closed registries/u);
  assert.match(rsiAudit, /safe summary exits `2`/u);
  assert.match(rsiAudit, /synthetic evidence never routes to A18/u);
  assert.match(rsiAudit, /sanitized exact-package `candidate-only` packet must route its redacted machine evidence to A18/u);
  assertContainsAll(rsiAudit, [
    "every missing canonical C0 role key",
    "whole-packet revalidation",
    "closed five-role registry",
  ], "RSI C0 resume contract");
  assertContainsAll(rsiAudit, [
    "authorization.authorizationSha256",
    "authorization.authorizationTrustAnchor.receiptIdentitySha256",
    "evidenceHashes",
  ], "RSI live authorization response contract");
  assertContainsAll(rsiAudit, [
    "priorReceiptBindings.priorEnvelopeSha256",
    "priorReceiptBindings.activeReceiptManifestSha256",
    "priorReceiptBindings.c0Required",
    "priorReceiptBindings.c0Status",
    "newReceiptBindings.dPrimeValidationReceiptSha256",
    "identity",
    "manifest",
    "authorization",
    "trust",
    "passed-proof",
    "check",
    "prior",
    "invalidated",
    "current-active",
    "deterministic.findingCount",
    "bPrime.findingCount",
    "bound active deterministic result's `findingCount`",
    "bound active B-prime revision result's `findingCount`",
    "independentReviewState.status",
    "independentReviewState.freshContext",
    "independentReviewState.boundCandidateSha256",
  ], "RSI D-prime response contract");
  assertContainsAll(rsiAudit, [
    "trustAnchors.liveAuthorization",
    "trustAnchors.priorEvidence",
    "allowedFields: [status, receiptIdentitySha256]",
    "forbiddenFields: [issuer, account, source]",
    "providerAuthority: false",
  ], "RSI safe-summary response contract");
  assert.match(remediation, /Rehashing only an outer receipt or wrapper therefore cannot preserve an old result digest/u);
  assert(rsiSchema.required.includes("evidenceHashes"), "RSI top-level evidenceHashes must remain required");
  assertExactRequiredFields(rsiSchema.$defs.authorization.oneOf[1], [
    "liveProviderUsed",
    "authorizationId",
    "authorizationSha256",
    "authorizationProjection",
    "authorizationTrustAnchor",
    "issuedAt",
    "expiresAt",
    "current",
    "policyVersion",
    "protocolId",
    "protocolVersion",
    "candidateSha256",
    "codeManifestSha256",
    "runnerLogicalId",
    "runnerPath",
    "runnerSha256",
    "provider",
    "model",
    "allowedRoles",
    "credentialAccessScope",
    "egressScope",
    "privacyRightsScope",
    "attemptCap",
    "tokenCap",
    "currencyCapUsd",
  ], "RSI authorization schema");
  assertExactRequiredFields(rsiSchema.$defs.trustAnchor, [
    "trustVersion",
    "receiptKind",
    "status",
    "sourceIdentitySha256",
    "externalReceiptSha256",
    "boundReceiptSha256",
    "verifiedAt",
    "receiptIdentitySha256",
  ], "RSI trust anchor schema");
  assertExactRequiredFields(rsiSchema.$defs.boundRoleReceiptMap, [
    "answer-blind-solver",
    "tool-verifier",
    "adversarial-grader",
    "bilingual-curriculum-critic",
    "evidence-verifier",
  ], "RSI canonical C0 role schema");
  assertExactRequiredFields(rsiSchema.$defs.priorEnvelopeBody, [
    "envelopeVersion",
    "priorCandidate",
    "activeReceiptManifestSha256",
    "c0Required",
    "c0Status",
    "activeReceiptHashes",
  ], "RSI prior envelope schema");
  assertExactRequiredFields(rsiSchema.$defs.priorReceiptBindings, [
    "priorEnvelopeSha256",
    "priorEnvelopeBody",
    "priorTrustAnchor",
    "activeReceiptManifestSha256",
    "activeReceiptManifest",
    "c0Required",
    "c0Status",
    "deterministicReceiptSha256",
    "bPrimeCritiqueReceiptSha256",
    "bPrimeRevisionReceiptSha256",
    "c0RoleReceipts",
    "independentReviewReceiptSha256",
  ], "RSI prior receipt schema");
  assertExactRequiredFields(rsiSchema.$defs.dPrimeBPrimeState, [
    "critiqueReceiptSha256",
    "revisionReceiptSha256",
    "revisionPredecessorReceiptSha256",
    "critiqueThenRevision",
    "freshContext",
  ], "RSI D-prime B-prime schema");
  for (const [index, arm] of rsiSchema.$defs.dPrimeC0State.oneOf.entries()) {
    assertExactRequiredFields(arm, ["required", "status", "roleReceipts"], `RSI D-prime C0 schema arm ${index}`);
  }
  assertExactRequiredFields(rsiSchema.$defs.dPrimeValidationReceiptBody, [
    "receiptVersion",
    "receiptDomain",
    "priorCandidate",
    "newCandidate",
    "priorActiveReceiptManifestSha256",
    "currentActiveReceiptManifestSha256",
    "invalidatedReceiptSetSha256",
    "currentActiveReceiptSetSha256",
    "deterministicReceiptSha256",
    "bPrime",
    "c0Prime",
    "independentReviewReceiptSha256",
    "freshContext",
    "redaction",
  ], "RSI D-prime validation body schema");
  assertExactRequiredFields(rsiSchema.$defs.newReceiptBindings, [
    "candidateId",
    "candidateVersion",
    "candidateSha256",
    "manifestSha256",
    "policyVersion",
    "protocolId",
    "protocolVersion",
    "codeManifestSha256",
    "taxonomyVersion",
    "evidenceSchemaVersion",
    "promptManifestSha256",
    "projectionManifestSha256",
    "activeReceiptManifestSha256",
    "deterministicReceiptSha256",
    "bPrimeCritiqueReceiptSha256",
    "bPrimeRevisionReceiptSha256",
    "c0RoleReceipts",
    "independentReviewReceiptSha256",
    "dPrimeValidationReceiptSha256",
  ], "RSI new receipt schema");
  assertExactRequiredFields(rsiSchema.$defs.remediation.oneOf[1], [
    "candidateMutated",
    "priorCandidate",
    "priorReceiptBindings",
    "newCandidate",
    "invalidatedReceiptHashes",
    "newReceiptBindings",
    "freshContext",
    "validationReceiptBody",
    "validationReceiptSha256",
  ], "RSI mutated remediation schema");
  assertExactRequiredFields(rsiSchema.$defs.independentReviewState, [
    "status",
    "freshContext",
    "boundCandidateSha256",
    "reviewReceiptSha256",
    "reviewerRole",
  ], "RSI independent review schema");

  assert.match(naturalAudit, /exact runner registration\/closure\/commit hashes/u);
  assert.match(naturalAudit, /direct-parent lineage and binding digests/u);
  assert.match(naturalState, /`RUNNER_INDEPENDENTLY_VERIFIED` is never inferred/u);
  assertContainsAll(naturalAudit, [
    "when—and only when—current per-phase zero reconciliations",
    "If that current reconciliation-and-summary chain is missing",
    "never infer zero from absence of visible calls",
    "supplies no contradictory current evidence",
    "do not downgrade it to unknown",
    "current repository evidence",
    "currentness boundary",
    "attempts: {known:false,count:null}",
    "completedCalls: {known:false,count:null}",
    "egress: {known:false,count:null}",
    "activity.unknown.present:true",
    "packet-derived categories",
  ], "Natural audit response contract");
  assertContainsAll(recoveryContract, [
    "ATTEMPT_RESERVATION_ONLY",
    "PROVIDER_DELIVERY_UNKNOWN",
    "COMPLETION_UNKNOWN",
    "EGRESS_UNKNOWN",
    "TOKEN_USAGE_UNKNOWN",
    "COST_UNKNOWN",
    "CONCURRENCY_UNKNOWN",
  ], "Natural recovery category contract");
  assertContainsAll(naturalCase, [
    "dated, non-normative example",
    "Re-verify current repository evidence",
    "receipt-proven known-zero activity remains known zero in a dated audit",
  ], "Natural case-study boundary");
  assert.match(naturalCase, /^Status: \*\*dated, non-normative example\*\*/mu);
  assert.match(naturalCase, /This file does not define policy, grant authority, or permit execution/u);
  assertExactRequiredFields(naturalSchema.$defs.activity, [
    "attempts",
    "completedCalls",
    "egress",
    "reference",
    "evaluatedCanary",
    "evaluatedRun",
    "summaryReceiptSha256",
    "unknown",
  ], "Natural activity schema");
  assertExactRequiredFields(naturalSchema.$defs.activityCounter, ["known", "count", "receiptSha256"], "Natural activity-counter schema");
  assertExactRequiredFields(naturalSchema.$defs.unknownActivity, ["present", "categories", "reconciliationReceiptSha256"], "Natural unknown-activity schema");

  assertContainsAll(promotionAudit, [
    "bindings.candidateDigest",
    "bindings.sourceCommit",
    "bindings.targetBaselineCommit",
    "bindings.checkerVersionSha256",
    "bindings.checkerBundleDigest",
    "bindings.checkerReleaseCommit",
    "lifecycleState",
    "currentness",
    "liveBoundary",
    "attemptRelation.relation",
    "attemptRelation.baseAttemptRef",
    "attemptRelation.revisionRef",
    "attemptRelation.baseCount",
    "attemptRelation.candidateChanged",
    "attemptRelation.sourceChanged",
    "attemptRelation.checkerChanged",
    "attemptRelation.baselineChanged",
    "attemptRelation.reviewedBaselineOnly",
    "attemptRelation.directParentManifestSha256",
    "attemptRelation.directParentReceiptSha256",
    "attemptRelation.evidenceCommit",
    "attemptRelation.bindingCommit",
    "attemptRelation.executionCommit",
    "attemptRelation.storageCommit",
    "attemptRelation.finalizationCommit",
    "attemptRelation.historicalClosureOverwritten",
    "receiptComparison.canonical",
    "receiptComparison.fresh",
    "receiptComparison.replay",
    "receiptComparison.bindingsEqual",
    "receiptComparison.semanticDigestsEqual",
    "receiptComparison.rawDigestsEqual",
    "receiptComparison.runIdsDistinct",
    "receiptComparison.semanticDigestsVerified",
    "receiptComparison.comparisonStatus",
    "receiptComparison.comparisonDigest",
  ], "Promotion Shadow-to-live response contract");
  for (const field of ["bindings", "lifecycleState", "currentness", "liveBoundary", "attemptRelation", "receiptComparison"]) {
    assert(promotionSchema.required.includes(field), `Promotion handoff schema: missing ${field}`);
  }
  assertExactRequiredFields(promotionSchema.$defs.bindings, [
    "candidateDigest",
    "sourceCommit",
    "targetBaselineCommit",
    "checkerVersionSha256",
    "checkerBundleDigest",
    "checkerReleaseCommit",
  ], "Promotion binding schema");
  assertExactRequiredFields(promotionSchema.$defs.attemptRelation, [
    "relation",
    "baseAttemptRef",
    "revisionRef",
    "baseCount",
    "candidateChanged",
    "sourceChanged",
    "checkerChanged",
    "baselineChanged",
    "reviewedBaselineOnly",
    "directParentManifestSha256",
    "directParentReceiptSha256",
    "evidenceCommit",
    "bindingCommit",
    "executionCommit",
    "storageCommit",
    "finalizationCommit",
    "historicalClosureOverwritten",
  ], "Promotion attempt-relation schema");
  assertExactRequiredFields(promotionSchema.$defs.receiptComparison, [
    "canonical",
    "fresh",
    "replay",
    "bindingsEqual",
    "semanticDigestsEqual",
    "rawDigestsEqual",
    "runIdsDistinct",
    "semanticDigestsVerified",
    "comparisonStatus",
  ], "Promotion comparison schema");
  assertExactRequiredFields(promotionSchema.$defs.receiptDigest, [
    "receiptSha256",
    "semanticDigest",
    "rawDigest",
    "bindingDigest",
    "semanticDigestVerified",
    "liveAllowed",
  ], "Promotion receipt-digest schema");
  const passingComparisonRule = promotionSchema.allOf.find(
    (rule) => rule.if?.properties?.receiptComparison?.properties?.comparisonStatus?.const === "pass",
  );
  assert.deepEqual(
    passingComparisonRule?.then?.properties?.receiptComparison?.required,
    ["comparisonDigest"],
    "Promotion passing comparison must require comparisonDigest",
  );

  assert.match(releaseOutcomes, /Do not print, preview, quote, or name any later live-success outcome enum/u);
  assert.match(releaseOutcomes, /fresh same-SHA route\/alias readback, then separate required-behavior verification/u);
});

test("suite manifest declares version 1.0.0 and does not commit package archives", () => {
  const manifest = json("suite-manifest.json");
  assert.equal(manifest.schemaVersion, "1.0");
  assert.equal(manifest.suiteVersion, "1.0.0");
  assert.equal(manifest.components.length, 5);
  assert.deepEqual(manifest.components.map((entry) => entry.name), Object.keys(COMPONENTS));
  assert.equal(manifest.packageBuild.binaryArchivesCommitted, false);
  assert(!filesRecursively(SUITE_DIR).some((file) => file.endsWith(".skill")));
});
