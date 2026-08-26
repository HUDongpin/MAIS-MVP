import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, realpath, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import V5_R5_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r5/runner-registration.json" with { type: "json" };

import {
  atomicWriteProtectedJsonV5R4,
  establishProtectedRootV5R4,
} from "./protected-storage-v5-r4.mjs";
import {
  createAtomicExecutionLedgerV5R5,
} from "./atomic-execution-ledger-v5-r5.mjs";
import {
  createRawResponseCustodyStoreV5R6,
} from "./raw-response-custody-v5-r6.mjs";
import {
  createResolvedExactProviderTransportV5R6,
  runGuardedProviderAttemptV5R6,
} from "./guarded-provider-attempt-v5-r6.mjs";
import {
  buildResolvedGuardedAttemptFixtureV5R6,
} from "./runner-v5-r6-test-fixtures.mjs";
import {
  createRunnerRuntimeV5R6,
} from "./runner-v5-r6-runtime.mjs";
import {
  deepSeekResponseEnvelopeV5R4,
  openAIResponseEnvelopeV5R4,
} from "./runner-v5-r4-test-fixtures.mjs";

const SECRET_SENTINEL = "fixture-secret-sentinel-that-must-never-persist";

function responseBody(provider) {
  return JSON.stringify(provider === "OPENAI_DIRECT"
    ? openAIResponseEnvelopeV5R4()
    : deepSeekResponseEnvelopeV5R4());
}

function fixtureClock() {
  let milliseconds = Date.parse("2026-08-26T08:31:00.000Z");
  return () => new Date(milliseconds += 10);
}

async function allRegularFiles(root) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath, entry.name));
}

for (const provider of ["OPENAI_DIRECT", "DEEPSEEK_DIRECT"]) {
  test(`${provider} resolved-route guarded attempt completes entirely against an injected offline fixture`, async () => {
    const protectedRoot = await mkdtemp(path.join(await realpath(os.tmpdir()),
      `mais-v5-r6-${provider.toLowerCase()}-`));
    try {
      const fixture = buildResolvedGuardedAttemptFixtureV5R6(provider);
      const trustedRoot = await establishProtectedRootV5R4(protectedRoot);
      const ledger = await createAtomicExecutionLedgerV5R5({
        trustedRoot,
        ledgerRelativePath: path.join("fixture-ledgers", provider.toLowerCase()),
        activeRegistration: V5_R5_REGISTRATION,
        authorization: fixture.authorization.compatibilityAuthorization,
        inventory: fixture.inventory,
        priceSnapshot: fixture.priceSnapshot,
        clock: fixtureClock(),
        ownerPid: process.pid,
      });
      const rawResponseStore = await createRawResponseCustodyStoreV5R6({ protectedRoot });
      const transport = createResolvedExactProviderTransportV5R6({
        clock: fixtureClock(),
        credentialReader: async () => ({
          apiKey: SECRET_SENTINEL,
          subjectIdentity: fixture.subjectIdentity,
          ...(provider === "OPENAI_DIRECT" ? { openAIProjectId: fixture.subjectIdentity } : {}),
        }),
        fetchImplementation: async () => new Response(responseBody(provider), {
          status: 200,
          headers: { "content-type": "application/json", "x-request-id": "fixture-request-id" },
        }),
      });
      const dispatchAuditPath = path.join("fixture-dispatch-audits", `${fixture.dispatchAudit.selfHash}.json`);
      const run = await runGuardedProviderAttemptV5R6({
        ...fixture,
        ledger,
        rawResponseStore,
        transport,
        dispatchAuditStore: {
          append: async (value) => {
            await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath: dispatchAuditPath, value });
            return { contentHash: value.selfHash };
          },
        },
        attemptReceiptStore: {
          append: async (value) => {
            await atomicWriteProtectedJsonV5R4({
              trustedRoot,
              relativePath: path.join("fixture-resolved-attempts", `${value.selfHash}.json`),
              value,
            });
            return { contentHash: value.selfHash };
          },
        },
        failureClock: fixtureClock(),
      });
      assert.equal(run.status, "SUCCEEDED");
      assert.equal(run.dispatchAllowed, true);
      assert.equal(run.providerEventCount, 1);
      assert.equal(run.httpRequestCount, 1);
      assert.equal(run.credentialReadCount, 1);
      assert.equal(run.permit.projectResidency, fixture.authorization.projectResidency);
      assert.equal(run.permit.dataRegion, fixture.authorization.dataRegion);
      assert.equal(run.resolvedAttemptReceipt.compatibilitySentinelWasDispatchAuthority, false);
      assert.equal(run.resolvedAttemptReceipt.rawResponseRetainedInProtectedStorage, true);
      assert.equal(run.rawResponseBindingReceipt.independentReparseVerified, true);
      assert.equal(run.completion.attemptStatus, "SUCCEEDED");
      const verified = await ledger.verify();
      assert.deepEqual(verified.errors, []);
      assert.equal(verified.entries.length, 2);
      const files = await allRegularFiles(protectedRoot);
      assert.equal(files.length, 6);
      const relativeFiles = files.map((file) => path.relative(protectedRoot, file));
      assert.equal(relativeFiles.filter((file) => file.startsWith(`fixture-ledgers${path.sep}`)).length, 2);
      assert.equal(relativeFiles.filter((file) => file.startsWith(`fixture-dispatch-audits${path.sep}`)).length, 1);
      assert.equal(relativeFiles.filter((file) => file.startsWith(`fixture-resolved-attempts${path.sep}`)).length, 1);
      assert.equal(relativeFiles.filter((file) => file.startsWith(`raw-provider-custody-v5-r6${path.sep}`)).length, 2);
      let joined = "";
      for (const file of files) {
        assert.equal((await stat(file)).mode & 0o777, 0o600);
        joined += await readFile(file, "utf8");
      }
      assert.doesNotMatch(joined, new RegExp(SECRET_SENTINEL, "u"));
      assert.match(joined, provider === "OPENAI_DIRECT" ? /resp_fixture_v5_r4/u : /ds_response_fixture_v5_r4/u);
    } finally {
      await rm(protectedRoot, { recursive: true, force: true });
    }
  });
}

test("default V5-R6 runtime blocks before any credential reader, HTTP event, egress, token, attempt, or USD activity", async () => {
  const runtime = createRunnerRuntimeV5R6();
  const result = await runtime.executeOpenAIResumeStep({});
  assert.equal(result.status, "LIVE_BINDINGS_NOT_INSTALLED");
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.credentialReadCount, 0);
  assert.equal(result.naturalQuestionEgressCount, 0);
});
