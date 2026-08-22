import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { types as utilTypes } from "node:util";

import * as authorityModule from "./required-browser-provision-attempt-authority.mjs";
import {
  assertRequiredBrowserProvisionAttemptAuthorityBinding,
  assertRequiredBrowserProvisionBootstrapAuthorityBinding,
  completeRequiredBrowserProvisionBootstrapAuthority,
  issueInitialRequiredBrowserProvisionBootstrapAuthority,
  issueRequalificationRequiredBrowserProvisionBootstrapAuthority,
  issueRequiredBrowserProvisionRequalificationCandidateAuthority,
  promoteInitialRequiredBrowserProvisionBootstrapAuthority,
  promoteRequalificationRequiredBrowserProvisionBootstrapAuthority,
  readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher,
  readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher
} from "./required-browser-provision-attempt-authority.mjs";
import { createLiveHomeProof } from "./live-home-protection.mjs";
import { hashCanonicalProof } from "./required-browser-proof-primitives.mjs";
import {
  createTestFixtureCapability,
  readTestFixtureCapabilityView,
  removeTestFixtureCapability
} from "./test-fixture-capability.mjs";

const AUTHORITY_EXPORTS = Object.freeze([
  "assertRequiredBrowserProvisionAttemptAuthorityBinding",
  "assertRequiredBrowserProvisionBootstrapAuthorityBinding",
  "completeRequiredBrowserProvisionBootstrapAuthority",
  "issueInitialRequiredBrowserProvisionBootstrapAuthority",
  "issueRequalificationRequiredBrowserProvisionBootstrapAuthority",
  "issueRequiredBrowserProvisionRequalificationCandidateAuthority",
  "promoteInitialRequiredBrowserProvisionBootstrapAuthority",
  "promoteRequalificationRequiredBrowserProvisionBootstrapAuthority",
  "readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher",
  "readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher"
]);

const INITIAL_REQUEST_DOMAIN =
  "required-browser-provision-initial-bootstrap-request-v1";
const REQUALIFICATION_REQUEST_DOMAIN =
  "required-browser-provision-requalification-bootstrap-request-v1";
const ATTEMPT_ID_DOMAIN = "required-browser-provision-attempt-id-v1";
const CANDIDATE_BINDING_DOMAIN =
  "required-browser-provision-requalification-candidate-binding-v1";
const BOOTSTRAP_BINDING_DOMAIN =
  "required-browser-provision-bootstrap-authority-binding-v1";
const BOOTSTRAP_COMPLETION_DOMAIN =
  "required-browser-provision-bootstrap-completion-v1";
const ATTEMPT_BINDING_DOMAIN =
  "required-browser-provision-attempt-authority-binding-v1";
const TEST_VALUE_DOMAIN =
  "required-browser-provision-attempt-authority-test-value-v1";

const INITIAL_REQUEST_KEYS = Object.freeze([
  "schemaVersion",
  "mode",
  "attemptNonce",
  "sourceSeedFingerprint",
  "bootstrapScopeFingerprint",
  "bootstrapCommandCatalogFingerprint",
  "ownedProcessCatalogFingerprint"
]);
const REQUALIFICATION_REQUEST_KEYS = INITIAL_REQUEST_KEYS;
const CANDIDATE_BINDING_KEYS = Object.freeze([
  "schemaVersion",
  "repositoryBindingFingerprint",
  "priorProvisionFailureAttestationFingerprint",
  "ownerMarkerFingerprint",
  "cacheMarkerFingerprint",
  "seedManifestFingerprint",
  "seedProvenanceFingerprint",
  "launcherSourceFingerprint",
  "provisionerSourceFingerprint",
  "sourcePackageJsonFingerprint",
  "sourcePackageLockFingerprint",
  "copiedPackageJsonFingerprint",
  "copiedPackageLockFingerprint",
  "retainedAttemptNonceFingerprint",
  "retainedAttemptRootBindingFingerprint",
  "quarantinedCandidateDirectoryIdentityFingerprint",
  "liveNodeModulesSymlinkIdentityFingerprint",
  "liveNodeModulesTargetFingerprint",
  "retainedLayoutFingerprint",
  "retainedLogsFingerprint",
  "failedPhase"
]);
const INITIAL_BOOTSTRAP_BINDING_KEYS = Object.freeze([
  "schemaVersion",
  "requestFingerprint",
  "attemptId",
  "mode",
  "attemptNonce",
  "sourceSeedFingerprint",
  "bootstrapScopeFingerprint",
  "bootstrapCommandCatalogFingerprint",
  "ownedProcessCatalogFingerprint"
]);
const REQUALIFICATION_BOOTSTRAP_BINDING_KEYS = Object.freeze([
  ...INITIAL_BOOTSTRAP_BINDING_KEYS,
  "requalificationCandidateBindingFingerprint",
  "priorProvisionFailureAttestationFingerprint",
  "retainedAttemptRootBindingFingerprint"
]);
const INITIAL_COMPLETION_KEYS = Object.freeze([
  "schemaVersion",
  "attemptId",
  "mode",
  "bootstrapAuthorityBindingFingerprint",
  "fivePassAggregateFingerprint",
  "sourceSeedFingerprint",
  "repositoryBindingFingerprint",
  "provisionRootBindingFingerprint",
  "bootstrapScopeFingerprint",
  "bootstrapCommandCatalogFingerprint",
  "ownedProcessCatalogFingerprint",
  "bootstrapEnvironmentInventorySetFingerprint",
  "finalCommandScopeFingerprint",
  "finalDescriptorSetFingerprint",
  "finalEnvironmentInventorySetFingerprint",
  "dependencyPathPolicyFingerprint",
  "evidencePolicyFingerprint"
]);
const REQUALIFICATION_COMPLETION_KEYS = Object.freeze([
  ...INITIAL_COMPLETION_KEYS,
  "requalificationCandidateBindingFingerprint",
  "priorProvisionFailureAttestationFingerprint"
]);
const INITIAL_ATTEMPT_BINDING_KEYS = Object.freeze([
  "schemaVersion",
  "attemptId",
  "mode",
  "sourceSeedFingerprint",
  "bootstrapAuthorityBindingFingerprint",
  "bootstrapCompletionFingerprint",
  "repositoryBindingFingerprint",
  "provisionRootBindingFingerprint",
  "ownedProcessCatalogFingerprint",
  "finalCommandScopeFingerprint",
  "finalDescriptorSetFingerprint",
  "finalEnvironmentInventorySetFingerprint",
  "dependencyPathPolicyFingerprint",
  "evidencePolicyFingerprint"
]);
const REQUALIFICATION_ATTEMPT_BINDING_KEYS = Object.freeze([
  ...INITIAL_ATTEMPT_BINDING_KEYS,
  "requalificationCandidateBindingFingerprint",
  "priorProvisionFailureAttestationFingerprint"
]);

function inputRecord(entries) {
  const value = {};
  for (const [key, fieldValue] of entries) {
    Object.defineProperty(value, key, {
      configurable: true,
      enumerable: true,
      value: fieldValue,
      writable: true
    });
  }
  return value;
}

function nullRecord(entries) {
  const value = Object.create(null);
  for (const [key, fieldValue] of entries) {
    Object.defineProperty(value, key, {
      configurable: false,
      enumerable: true,
      value: fieldValue,
      writable: false
    });
  }
  return Object.freeze(value);
}

function replaceField(record, key, value) {
  return inputRecord(Reflect.ownKeys(record).map((recordKey) => [
    recordKey,
    recordKey === key ? value : record[recordKey]
  ]));
}

function appendField(record, key, value) {
  return inputRecord([
    ...Reflect.ownKeys(record).map((recordKey) => [recordKey, record[recordKey]]),
    [key, value]
  ]);
}

function reorderFirstTwoFields(record) {
  const entries = Reflect.ownKeys(record).map((key) => [key, record[key]]);
  [entries[0], entries[1]] = [entries[1], entries[0]];
  return inputRecord(entries);
}

function ownHomeEnvironment(value) {
  const environment = Object.create(null);
  Object.defineProperty(environment, "HOME", {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  });
  return environment;
}

function withProcessEnvironment(environment, operation) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(process, "env");
  assert.ok(originalDescriptor && Object.hasOwn(originalDescriptor, "value"));
  assert.equal(originalDescriptor.configurable, true);
  Object.defineProperty(process, "env", {
    ...originalDescriptor,
    value: environment
  });
  try {
    return operation();
  } finally {
    Object.defineProperty(process, "env", originalDescriptor);
  }
}

function withAuthorityFixture(operation) {
  const fixtureCapability = createTestFixtureCapability(process.cwd());
  const fixtureView = readTestFixtureCapabilityView(fixtureCapability);
  const home = path.join(fixtureView.definition.leaf, "live-home");
  mkdirSync(home, { mode: 0o700 });
  try {
    return withProcessEnvironment(ownHomeEnvironment(home), () => {
      const liveHomeProof = createLiveHomeProof();
      const otherLiveHomeProof = createLiveHomeProof();
      const fingerprint = (label) => hashCanonicalProof(TEST_VALUE_DOMAIN, {
        schemaVersion: 1,
        fixtureViewFingerprint: fixtureView.viewFingerprint,
        label
      });
      return operation({
        fingerprint,
        fixtureView,
        home,
        liveHomeProof,
        otherLiveHomeProof
      });
    });
  } finally {
    const result = removeTestFixtureCapability(fixtureCapability);
    assert.equal(result.status, "quarantined-retained");
  }
}

function requestFor(mode, fingerprint, prefix) {
  return inputRecord([
    ["schemaVersion", 1],
    ["mode", mode],
    ["attemptNonce", fingerprint(`${prefix}:attempt-nonce`)],
    ["sourceSeedFingerprint", fingerprint(`${prefix}:source-seed`)],
    ["bootstrapScopeFingerprint", fingerprint(`${prefix}:bootstrap-scope`)],
    [
      "bootstrapCommandCatalogFingerprint",
      fingerprint(`${prefix}:bootstrap-command-catalog`)
    ],
    [
      "ownedProcessCatalogFingerprint",
      fingerprint(`${prefix}:owned-process-catalog`)
    ]
  ]);
}

function candidateBinding(fingerprint, prefix) {
  return inputRecord([
    ["schemaVersion", 1],
    [
      "repositoryBindingFingerprint",
      fingerprint(`${prefix}:repository-binding`)
    ],
    [
      "priorProvisionFailureAttestationFingerprint",
      fingerprint(`${prefix}:prior-provision-failure-attestation`)
    ],
    ["ownerMarkerFingerprint", fingerprint(`${prefix}:owner-marker`)],
    ["cacheMarkerFingerprint", fingerprint(`${prefix}:cache-marker`)],
    ["seedManifestFingerprint", fingerprint(`${prefix}:seed-manifest`)],
    ["seedProvenanceFingerprint", fingerprint(`${prefix}:seed-provenance`)],
    ["launcherSourceFingerprint", fingerprint(`${prefix}:launcher-source`)],
    [
      "provisionerSourceFingerprint",
      fingerprint(`${prefix}:provisioner-source`)
    ],
    [
      "sourcePackageJsonFingerprint",
      fingerprint(`${prefix}:source-package-json`)
    ],
    [
      "sourcePackageLockFingerprint",
      fingerprint(`${prefix}:source-package-lock`)
    ],
    [
      "copiedPackageJsonFingerprint",
      fingerprint(`${prefix}:copied-package-json`)
    ],
    [
      "copiedPackageLockFingerprint",
      fingerprint(`${prefix}:copied-package-lock`)
    ],
    [
      "retainedAttemptNonceFingerprint",
      fingerprint(`${prefix}:retained-attempt-nonce`)
    ],
    [
      "retainedAttemptRootBindingFingerprint",
      fingerprint(`${prefix}:retained-attempt-root-binding`)
    ],
    [
      "quarantinedCandidateDirectoryIdentityFingerprint",
      fingerprint(`${prefix}:quarantined-candidate-directory-identity`)
    ],
    [
      "liveNodeModulesSymlinkIdentityFingerprint",
      fingerprint(`${prefix}:live-node-modules-symlink-identity`)
    ],
    [
      "liveNodeModulesTargetFingerprint",
      fingerprint(`${prefix}:live-node-modules-target`)
    ],
    ["retainedLayoutFingerprint", fingerprint(`${prefix}:retained-layout`)],
    ["retainedLogsFingerprint", fingerprint(`${prefix}:retained-logs`)],
    ["failedPhase", "staged-tree-attestation"]
  ]);
}

function attemptIdFor(request) {
  return hashCanonicalProof(ATTEMPT_ID_DOMAIN, inputRecord([
    ["schemaVersion", 1],
    ["mode", request.mode],
    ["attemptNonce", request.attemptNonce],
    ["sourceSeedFingerprint", request.sourceSeedFingerprint],
    ["bootstrapScopeFingerprint", request.bootstrapScopeFingerprint],
    [
      "bootstrapCommandCatalogFingerprint",
      request.bootstrapCommandCatalogFingerprint
    ]
  ]));
}

function expectedInitialBootstrapBinding(request) {
  return nullRecord([
    ["schemaVersion", 1],
    ["requestFingerprint", hashCanonicalProof(INITIAL_REQUEST_DOMAIN, request)],
    ["attemptId", attemptIdFor(request)],
    ["mode", "initial"],
    ["attemptNonce", request.attemptNonce],
    ["sourceSeedFingerprint", request.sourceSeedFingerprint],
    ["bootstrapScopeFingerprint", request.bootstrapScopeFingerprint],
    [
      "bootstrapCommandCatalogFingerprint",
      request.bootstrapCommandCatalogFingerprint
    ],
    ["ownedProcessCatalogFingerprint", request.ownedProcessCatalogFingerprint]
  ]);
}

function expectedRequalificationBootstrapBinding(request, candidate) {
  return nullRecord([
    ["schemaVersion", 1],
    [
      "requestFingerprint",
      hashCanonicalProof(REQUALIFICATION_REQUEST_DOMAIN, request)
    ],
    ["attemptId", attemptIdFor(request)],
    ["mode", "requalification"],
    ["attemptNonce", request.attemptNonce],
    ["sourceSeedFingerprint", request.sourceSeedFingerprint],
    ["bootstrapScopeFingerprint", request.bootstrapScopeFingerprint],
    [
      "bootstrapCommandCatalogFingerprint",
      request.bootstrapCommandCatalogFingerprint
    ],
    ["ownedProcessCatalogFingerprint", request.ownedProcessCatalogFingerprint],
    [
      "requalificationCandidateBindingFingerprint",
      hashCanonicalProof(CANDIDATE_BINDING_DOMAIN, candidate)
    ],
    [
      "priorProvisionFailureAttestationFingerprint",
      candidate.priorProvisionFailureAttestationFingerprint
    ],
    [
      "retainedAttemptRootBindingFingerprint",
      candidate.retainedAttemptRootBindingFingerprint
    ]
  ]);
}

function completionFor(binding, fingerprint, prefix, candidate) {
  const entries = [
    ["schemaVersion", 1],
    ["attemptId", binding.attemptId],
    ["mode", binding.mode],
    [
      "bootstrapAuthorityBindingFingerprint",
      hashCanonicalProof(BOOTSTRAP_BINDING_DOMAIN, binding)
    ],
    [
      "fivePassAggregateFingerprint",
      fingerprint(`${prefix}:five-pass-aggregate`)
    ],
    ["sourceSeedFingerprint", binding.sourceSeedFingerprint],
    [
      "repositoryBindingFingerprint",
      candidate
        ? candidate.repositoryBindingFingerprint
        : fingerprint(`${prefix}:repository-binding`)
    ],
    [
      "provisionRootBindingFingerprint",
      candidate
        ? candidate.retainedAttemptRootBindingFingerprint
        : fingerprint(`${prefix}:provision-root-binding`)
    ],
    ["bootstrapScopeFingerprint", binding.bootstrapScopeFingerprint],
    [
      "bootstrapCommandCatalogFingerprint",
      binding.bootstrapCommandCatalogFingerprint
    ],
    ["ownedProcessCatalogFingerprint", binding.ownedProcessCatalogFingerprint],
    [
      "bootstrapEnvironmentInventorySetFingerprint",
      fingerprint(`${prefix}:bootstrap-environment-inventory-set`)
    ],
    [
      "finalCommandScopeFingerprint",
      fingerprint(`${prefix}:final-command-scope`)
    ],
    [
      "finalDescriptorSetFingerprint",
      fingerprint(`${prefix}:final-descriptor-set`)
    ],
    [
      "finalEnvironmentInventorySetFingerprint",
      fingerprint(`${prefix}:final-environment-inventory-set`)
    ],
    [
      "dependencyPathPolicyFingerprint",
      fingerprint(`${prefix}:dependency-path-policy`)
    ],
    ["evidencePolicyFingerprint", fingerprint(`${prefix}:evidence-policy`)]
  ];
  if (binding.mode === "requalification") {
    entries.push(
      [
        "requalificationCandidateBindingFingerprint",
        hashCanonicalProof(CANDIDATE_BINDING_DOMAIN, candidate)
      ],
      [
        "priorProvisionFailureAttestationFingerprint",
        candidate.priorProvisionFailureAttestationFingerprint
      ]
    );
  }
  return inputRecord(entries);
}

function expectedAttemptBinding(bootstrapBinding, completion, candidate) {
  const entries = [
    ["schemaVersion", 1],
    ["attemptId", bootstrapBinding.attemptId],
    ["mode", bootstrapBinding.mode],
    ["sourceSeedFingerprint", bootstrapBinding.sourceSeedFingerprint],
    [
      "bootstrapAuthorityBindingFingerprint",
      hashCanonicalProof(BOOTSTRAP_BINDING_DOMAIN, bootstrapBinding)
    ],
    [
      "bootstrapCompletionFingerprint",
      hashCanonicalProof(BOOTSTRAP_COMPLETION_DOMAIN, completion)
    ],
    ["repositoryBindingFingerprint", completion.repositoryBindingFingerprint],
    [
      "provisionRootBindingFingerprint",
      completion.provisionRootBindingFingerprint
    ],
    [
      "ownedProcessCatalogFingerprint",
      completion.ownedProcessCatalogFingerprint
    ],
    ["finalCommandScopeFingerprint", completion.finalCommandScopeFingerprint],
    ["finalDescriptorSetFingerprint", completion.finalDescriptorSetFingerprint],
    [
      "finalEnvironmentInventorySetFingerprint",
      completion.finalEnvironmentInventorySetFingerprint
    ],
    [
      "dependencyPathPolicyFingerprint",
      completion.dependencyPathPolicyFingerprint
    ],
    ["evidencePolicyFingerprint", completion.evidencePolicyFingerprint]
  ];
  if (bootstrapBinding.mode === "requalification") {
    entries.push(
      [
        "requalificationCandidateBindingFingerprint",
        hashCanonicalProof(CANDIDATE_BINDING_DOMAIN, candidate)
      ],
      [
        "priorProvisionFailureAttestationFingerprint",
        candidate.priorProvisionFailureAttestationFingerprint
      ]
    );
  }
  return nullRecord(entries);
}

function assertNominalToken(token) {
  assert.equal(utilTypes.isProxy(token), false);
  assert.equal(Object.getPrototypeOf(token), null);
  assert.equal(Object.isFrozen(token), true);
  assert.deepEqual(Reflect.ownKeys(token), []);
}

function assertExactBindingCopy(actual, expected, expectedKeys) {
  assert.equal(utilTypes.isProxy(actual), false);
  assert.equal(Object.getPrototypeOf(actual), null);
  assert.equal(Object.isFrozen(actual), true);
  assert.deepEqual(Reflect.ownKeys(actual), expectedKeys);
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(actual, key);
    assert.ok(descriptor && Object.hasOwn(descriptor, "value"));
    assert.equal(descriptor.enumerable, true);
    assert.equal(descriptor.configurable, false);
    assert.equal(descriptor.writable, false);
    assert.equal(descriptor.value, expected[key]);
  }
}

function assertLowerHex64(value) {
  assert.match(value, /^[a-f0-9]{64}$/u);
}

function issueInitialFlow(liveHomeProof, fingerprint, prefix) {
  const request = requestFor("initial", fingerprint, `${prefix}:request`);
  const bootstrapAuthority =
    issueInitialRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      request
    );
  const expectedBinding = expectedInitialBootstrapBinding(request);
  return { bootstrapAuthority, expectedBinding, request };
}

function issueRequalificationFlow(liveHomeProof, fingerprint, prefix) {
  const candidate = candidateBinding(fingerprint, `${prefix}:candidate`);
  const candidateAuthority =
    issueRequiredBrowserProvisionRequalificationCandidateAuthority(
      liveHomeProof,
      candidate
    );
  const request = requestFor(
    "requalification",
    fingerprint,
    `${prefix}:request`
  );
  const bootstrapAuthority =
    issueRequalificationRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      candidateAuthority,
      request
    );
  const expectedBinding = expectedRequalificationBootstrapBinding(
    request,
    candidate
  );
  return { bootstrapAuthority, candidate, expectedBinding, request };
}

test("provision attempt authority exposes exactly the ten neutral v5 operations", () => {
  assert.deepEqual(
    Object.keys(authorityModule).sort(),
    [...AUTHORITY_EXPORTS].sort()
  );
});

test("initial bootstrap issuance returns a nominal token and exact launcher binding", () => {
  withAuthorityFixture(({
    fingerprint,
    home,
    liveHomeProof,
    otherLiveHomeProof
  }) => {
    const { bootstrapAuthority, expectedBinding, request } = issueInitialFlow(
      liveHomeProof,
      fingerprint,
      "initial-binding"
    );
    assertNominalToken(bootstrapAuthority);
    assert.equal(expectedBinding.attemptNonce, request.attemptNonce);
    assertLowerHex64(expectedBinding.attemptNonce);
    assertLowerHex64(expectedBinding.attemptId);
    assert.equal(
      expectedBinding.attemptId,
      hashCanonicalProof(ATTEMPT_ID_DOMAIN, inputRecord([
        ["schemaVersion", 1],
        ["mode", "initial"],
        ["attemptNonce", request.attemptNonce],
        ["sourceSeedFingerprint", request.sourceSeedFingerprint],
        ["bootstrapScopeFingerprint", request.bootstrapScopeFingerprint],
        [
          "bootstrapCommandCatalogFingerprint",
          request.bootstrapCommandCatalogFingerprint
        ]
      ]))
    );

    const firstCopy =
      readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
        liveHomeProof,
        bootstrapAuthority
      );
    const secondCopy =
      readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
        liveHomeProof,
        bootstrapAuthority
      );
    assert.notEqual(firstCopy, secondCopy);
    assertExactBindingCopy(
      firstCopy,
      expectedBinding,
      INITIAL_BOOTSTRAP_BINDING_KEYS
    );
    assertExactBindingCopy(
      secondCopy,
      expectedBinding,
      INITIAL_BOOTSTRAP_BINDING_KEYS
    );
    assert.equal(Object.values(firstCopy).includes(home), false);

    const expectedFingerprint = hashCanonicalProof(
      BOOTSTRAP_BINDING_DOMAIN,
      expectedBinding
    );
    assert.equal(
      assertRequiredBrowserProvisionBootstrapAuthorityBinding(
        liveHomeProof,
        bootstrapAuthority,
        expectedFingerprint
      ),
      undefined
    );
    assert.throws(() => assertRequiredBrowserProvisionBootstrapAuthorityBinding(
      liveHomeProof,
      bootstrapAuthority,
      fingerprint("initial-binding:wrong-binding")
    ));
    assert.throws(() => readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
      otherLiveHomeProof,
      bootstrapAuthority
    ));

    for (const clone of [
      { ...bootstrapAuthority },
      Object.assign(Object.create(null), bootstrapAuthority),
      structuredClone(bootstrapAuthority),
      firstCopy
    ]) {
      assert.throws(() => assertRequiredBrowserProvisionBootstrapAuthorityBinding(
        liveHomeProof,
        clone,
        expectedFingerprint
      ));
    }

    let proxyTrapCalls = 0;
    const proxy = new Proxy(bootstrapAuthority, {
      get() {
        proxyTrapCalls += 1;
        throw new Error("bootstrap proxy get trap must not run");
      },
      getOwnPropertyDescriptor() {
        proxyTrapCalls += 1;
        throw new Error("bootstrap proxy descriptor trap must not run");
      },
      getPrototypeOf() {
        proxyTrapCalls += 1;
        throw new Error("bootstrap proxy prototype trap must not run");
      },
      ownKeys() {
        proxyTrapCalls += 1;
        throw new Error("bootstrap proxy ownKeys trap must not run");
      }
    });
    assert.throws(() => readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
      liveHomeProof,
      proxy
    ));
    assert.equal(proxyTrapCalls, 0);
  });
});

test("initial and requalification requests reject structural ambiguity schema-first", () => {
  withAuthorityFixture(({ fingerprint, liveHomeProof }) => {
    const validInitial = requestFor(
      "initial",
      fingerprint,
      "request-validation:initial"
    );

    let laterGetterReads = 0;
    function requestWithSchemaDescriptor(schemaDescriptor, includeSchema = true) {
      const request = {};
      if (includeSchema) {
        Object.defineProperty(request, "schemaVersion", {
          configurable: true,
          enumerable: true,
          ...schemaDescriptor
        });
      }
      Object.defineProperty(request, "mode", {
        configurable: true,
        enumerable: true,
        get() {
          laterGetterReads += 1;
          return "initial";
        }
      });
      for (const key of INITIAL_REQUEST_KEYS.slice(2)) {
        Object.defineProperty(request, key, {
          configurable: true,
          enumerable: true,
          value: validInitial[key],
          writable: true
        });
      }
      return request;
    }

    const inheritedPrototype = Object.create(null);
    Object.defineProperty(inheritedPrototype, "schemaVersion", {
      get() {
        laterGetterReads += 1;
        return 1;
      }
    });
    const inheritedSchema = Object.create(inheritedPrototype);
    for (const key of INITIAL_REQUEST_KEYS.slice(1)) {
      Object.defineProperty(inheritedSchema, key, {
        configurable: true,
        enumerable: true,
        value: validInitial[key],
        writable: true
      });
    }

    const schemaFailures = [
      requestWithSchemaDescriptor({ value: 0, writable: true }),
      requestWithSchemaDescriptor({ value: 2, writable: true }),
      requestWithSchemaDescriptor({ value: undefined, writable: true }),
      requestWithSchemaDescriptor({
        get() {
          laterGetterReads += 1;
          return 1;
        }
      }),
      requestWithSchemaDescriptor({}, false),
      inheritedSchema
    ];
    for (const invalidRequest of schemaFailures) {
      assert.throws(() => issueInitialRequiredBrowserProvisionBootstrapAuthority(
        liveHomeProof,
        invalidRequest
      ));
    }
    assert.equal(laterGetterReads, 0);

    let proxyTrapCalls = 0;
    const requestProxy = new Proxy(validInitial, {
      get() {
        proxyTrapCalls += 1;
        throw new Error("request proxy get trap must not run");
      },
      getOwnPropertyDescriptor() {
        proxyTrapCalls += 1;
        throw new Error("request proxy descriptor trap must not run");
      },
      getPrototypeOf() {
        proxyTrapCalls += 1;
        throw new Error("request proxy prototype trap must not run");
      },
      ownKeys() {
        proxyTrapCalls += 1;
        throw new Error("request proxy ownKeys trap must not run");
      }
    });
    assert.throws(() => issueInitialRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      requestProxy
    ));
    assert.equal(proxyTrapCalls, 0);

    for (const invalidRequest of [
      reorderFirstTwoFields(validInitial),
      appendField(validInitial, "candidateFingerprint", fingerprint(
        "request-validation:forbidden-candidate"
      )),
      replaceField(validInitial, "attemptNonce", "A".repeat(64)),
      replaceField(validInitial, "attemptNonce", "a".repeat(63)),
      replaceField(validInitial, "sourceSeedFingerprint", undefined),
      replaceField(validInitial, "bootstrapScopeFingerprint", "f".repeat(65)),
      replaceField(validInitial, "mode", "requalification")
    ]) {
      assert.throws(() => issueInitialRequiredBrowserProvisionBootstrapAuthority(
        liveHomeProof,
        invalidRequest
      ));
    }

    const validRequalification = requestFor(
      "requalification",
      fingerprint,
      "request-validation:requalification"
    );
    assert.deepEqual(
      Reflect.ownKeys(validRequalification),
      REQUALIFICATION_REQUEST_KEYS
    );
    assert.throws(() => issueInitialRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      validRequalification
    ));
  });
});

test("requalification candidate authority is nominal, source-seed-free, and duplicate-safe", () => {
  withAuthorityFixture(({ fingerprint, liveHomeProof }) => {
    const binding = candidateBinding(
      fingerprint,
      "candidate-contract:original"
    );
    assert.deepEqual(Reflect.ownKeys(binding), CANDIDATE_BINDING_KEYS);
    assert.equal(Object.hasOwn(binding, "sourceSeedFingerprint"), false);
    for (const key of CANDIDATE_BINDING_KEYS.slice(1, -1)) {
      assertLowerHex64(binding[key]);
    }
    assert.equal(binding.failedPhase, "staged-tree-attestation");

    const candidateAuthority =
      issueRequiredBrowserProvisionRequalificationCandidateAuthority(
        liveHomeProof,
        binding
      );
    assertNominalToken(candidateAuthority);

    const duplicateDiscoveryTuple = replaceField(
      binding,
      "retainedLogsFingerprint",
      fingerprint("candidate-contract:altered-retained-logs")
    );
    assert.throws(() => issueRequiredBrowserProvisionRequalificationCandidateAuthority(
      liveHomeProof,
      duplicateDiscoveryTuple
    ));

    const request = requestFor(
      "requalification",
      fingerprint,
      "candidate-contract:consume-request"
    );
    issueRequalificationRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      candidateAuthority,
      request
    );
    assert.throws(() => issueRequiredBrowserProvisionRequalificationCandidateAuthority(
      liveHomeProof,
      duplicateDiscoveryTuple
    ));

    const withRemovedFieldRestored = appendField(
      candidateBinding(fingerprint, "candidate-contract:source-seed-extra"),
      "sourceSeedFingerprint",
      fingerprint("candidate-contract:source-seed-extra:value")
    );
    assert.throws(() => issueRequiredBrowserProvisionRequalificationCandidateAuthority(
      liveHomeProof,
      withRemovedFieldRestored
    ));

    for (const [label, schemaVersion] of [["old", 0], ["future", 2]]) {
      let getterReads = 0;
      const adversarial = {};
      Object.defineProperty(adversarial, "schemaVersion", {
        enumerable: true,
        value: schemaVersion
      });
      Object.defineProperty(adversarial, "repositoryBindingFingerprint", {
        enumerable: true,
        get() {
          getterReads += 1;
          return fingerprint(`candidate-contract:${label}:repository`);
        }
      });
      assert.throws(() => issueRequiredBrowserProvisionRequalificationCandidateAuthority(
        liveHomeProof,
        adversarial
      ));
      assert.equal(getterReads, 0);
    }
  });
});

test("requalification consumes its exact candidate before proof or request inspection", () => {
  withAuthorityFixture(({
    fingerprint,
    liveHomeProof,
    otherLiveHomeProof
  }) => {
    const wrongProofBinding = candidateBinding(
      fingerprint,
      "candidate-burn:wrong-proof"
    );
    const wrongProofCandidate =
      issueRequiredBrowserProvisionRequalificationCandidateAuthority(
        liveHomeProof,
        wrongProofBinding
      );
    let requestGetterReads = 0;
    const unreadableRequest = {};
    Object.defineProperty(unreadableRequest, "schemaVersion", {
      enumerable: true,
      get() {
        requestGetterReads += 1;
        return 1;
      }
    });
    assert.throws(() => issueRequalificationRequiredBrowserProvisionBootstrapAuthority(
      otherLiveHomeProof,
      wrongProofCandidate,
      unreadableRequest
    ));
    assert.equal(requestGetterReads, 0);
    assert.throws(() => issueRequalificationRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      wrongProofCandidate,
      requestFor("requalification", fingerprint, "candidate-burn:retry")
    ));

    const malformedBinding = candidateBinding(
      fingerprint,
      "candidate-burn:malformed-request"
    );
    const malformedCandidate =
      issueRequiredBrowserProvisionRequalificationCandidateAuthority(
        liveHomeProof,
        malformedBinding
      );
    let laterGetterReads = 0;
    const oldRequest = {};
    Object.defineProperty(oldRequest, "schemaVersion", {
      enumerable: true,
      value: 0
    });
    Object.defineProperty(oldRequest, "mode", {
      enumerable: true,
      get() {
        laterGetterReads += 1;
        return "requalification";
      }
    });
    assert.throws(() => issueRequalificationRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      malformedCandidate,
      oldRequest
    ));
    assert.equal(laterGetterReads, 0);
    assert.throws(() => issueRequalificationRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      malformedCandidate,
      requestFor(
        "requalification",
        fingerprint,
        "candidate-burn:malformed-retry"
      )
    ));

    const exactBinding = candidateBinding(
      fingerprint,
      "candidate-burn:fake-does-not-burn"
    );
    const exactCandidate =
      issueRequiredBrowserProvisionRequalificationCandidateAuthority(
        liveHomeProof,
        exactBinding
      );
    const fakeCandidate = Object.freeze(Object.create(null));
    const validRequest = requestFor(
      "requalification",
      fingerprint,
      "candidate-burn:fake-does-not-burn-request"
    );
    assert.throws(() => issueRequalificationRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      fakeCandidate,
      validRequest
    ));
    const bootstrapAuthority =
      issueRequalificationRequiredBrowserProvisionBootstrapAuthority(
        liveHomeProof,
        exactCandidate,
        validRequest
      );
    assertNominalToken(bootstrapAuthority);
  });
});

test("requalification bootstrap exposes only its exact appended binding fields", () => {
  withAuthorityFixture(({ fingerprint, home, liveHomeProof }) => {
    const {
      bootstrapAuthority,
      candidate,
      expectedBinding,
      request
    } = issueRequalificationFlow(
      liveHomeProof,
      fingerprint,
      "requalification-binding"
    );
    assertNominalToken(bootstrapAuthority);
    assert.deepEqual(Reflect.ownKeys(request), REQUALIFICATION_REQUEST_KEYS);
    assert.equal(Object.hasOwn(request, "candidateFingerprint"), false);
    assert.equal(Object.hasOwn(request, "predecessorFingerprint"), false);
    assertExactBindingCopy(
      readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
        liveHomeProof,
        bootstrapAuthority
      ),
      expectedBinding,
      REQUALIFICATION_BOOTSTRAP_BINDING_KEYS
    );
    assert.equal(Object.values(expectedBinding).includes(home), false);
    assert.equal(
      expectedBinding.requalificationCandidateBindingFingerprint,
      hashCanonicalProof(CANDIDATE_BINDING_DOMAIN, candidate)
    );
    assert.equal(
      assertRequiredBrowserProvisionBootstrapAuthorityBinding(
        liveHomeProof,
        bootstrapAuthority,
        hashCanonicalProof(BOOTSTRAP_BINDING_DOMAIN, expectedBinding)
      ),
      undefined
    );
    assert.throws(() => issueRequalificationRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      bootstrapAuthority,
      request
    ));
  });
});

test("initial completion promotes exactly once to the final nominal attempt binding", () => {
  withAuthorityFixture(({
    fingerprint,
    home,
    liveHomeProof,
    otherLiveHomeProof
  }) => {
    const { bootstrapAuthority, expectedBinding } = issueInitialFlow(
      liveHomeProof,
      fingerprint,
      "initial-promotion"
    );
    const completion = completionFor(
      expectedBinding,
      fingerprint,
      "initial-promotion:completion"
    );
    assert.deepEqual(Reflect.ownKeys(completion), INITIAL_COMPLETION_KEYS);
    assert.equal(
      completeRequiredBrowserProvisionBootstrapAuthority(
        liveHomeProof,
        bootstrapAuthority,
        completion
      ),
      undefined
    );
    assert.throws(() => completeRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      bootstrapAuthority,
      completion
    ));

    const attemptAuthority =
      promoteInitialRequiredBrowserProvisionBootstrapAuthority(
        liveHomeProof,
        bootstrapAuthority
      );
    assertNominalToken(attemptAuthority);
    assert.throws(() => promoteInitialRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      bootstrapAuthority
    ));
    assert.throws(() => promoteRequalificationRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      bootstrapAuthority
    ));

    const expectedAttempt = expectedAttemptBinding(
      expectedBinding,
      completion
    );
    const firstCopy =
      readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
        liveHomeProof,
        attemptAuthority
      );
    const secondCopy =
      readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
        liveHomeProof,
        attemptAuthority
      );
    assert.notEqual(firstCopy, secondCopy);
    assertExactBindingCopy(
      firstCopy,
      expectedAttempt,
      INITIAL_ATTEMPT_BINDING_KEYS
    );
    assertExactBindingCopy(
      secondCopy,
      expectedAttempt,
      INITIAL_ATTEMPT_BINDING_KEYS
    );
    assert.equal(Object.values(firstCopy).includes(home), false);

    const attemptBindingFingerprint = hashCanonicalProof(
      ATTEMPT_BINDING_DOMAIN,
      expectedAttempt
    );
    assert.equal(
      assertRequiredBrowserProvisionAttemptAuthorityBinding(
        liveHomeProof,
        attemptAuthority,
        attemptBindingFingerprint
      ),
      undefined
    );
    assert.throws(() => assertRequiredBrowserProvisionAttemptAuthorityBinding(
      otherLiveHomeProof,
      attemptAuthority,
      attemptBindingFingerprint
    ));
    assert.throws(() => assertRequiredBrowserProvisionAttemptAuthorityBinding(
      liveHomeProof,
      firstCopy,
      attemptBindingFingerprint
    ));
    assert.throws(() => readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
      liveHomeProof,
      structuredClone(attemptAuthority)
    ));
  });
});

test("requalification completion and promotion append only candidate lineage", () => {
  withAuthorityFixture(({ fingerprint, liveHomeProof }) => {
    const {
      bootstrapAuthority,
      candidate,
      expectedBinding
    } = issueRequalificationFlow(
      liveHomeProof,
      fingerprint,
      "requalification-promotion"
    );
    const completion = completionFor(
      expectedBinding,
      fingerprint,
      "requalification-promotion:completion",
      candidate
    );
    assert.deepEqual(
      Reflect.ownKeys(completion),
      REQUALIFICATION_COMPLETION_KEYS
    );
    completeRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      bootstrapAuthority,
      completion
    );
    assert.throws(() => promoteInitialRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      bootstrapAuthority
    ));
    const attemptAuthority =
      promoteRequalificationRequiredBrowserProvisionBootstrapAuthority(
        liveHomeProof,
        bootstrapAuthority
      );
    assertNominalToken(attemptAuthority);

    const expectedAttempt = expectedAttemptBinding(
      expectedBinding,
      completion,
      candidate
    );
    assertExactBindingCopy(
      readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
        liveHomeProof,
        attemptAuthority
      ),
      expectedAttempt,
      REQUALIFICATION_ATTEMPT_BINDING_KEYS
    );
    assert.equal(
      assertRequiredBrowserProvisionAttemptAuthorityBinding(
        liveHomeProof,
        attemptAuthority,
        hashCanonicalProof(ATTEMPT_BINDING_DOMAIN, expectedAttempt)
      ),
      undefined
    );
  });
});

test("bootstrap lifecycle rejects premature promotion and malformed completion schema-first", () => {
  withAuthorityFixture(({ fingerprint, liveHomeProof, otherLiveHomeProof }) => {
    const premature = issueInitialFlow(
      liveHomeProof,
      fingerprint,
      "lifecycle:premature"
    );
    assert.throws(() => promoteInitialRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      premature.bootstrapAuthority
    ));

    const crossHome = issueInitialFlow(
      liveHomeProof,
      fingerprint,
      "lifecycle:cross-home"
    );
    const crossHomeCompletion = completionFor(
      crossHome.expectedBinding,
      fingerprint,
      "lifecycle:cross-home-completion"
    );
    assert.throws(() => completeRequiredBrowserProvisionBootstrapAuthority(
      otherLiveHomeProof,
      crossHome.bootstrapAuthority,
      crossHomeCompletion
    ));

    for (const schemaVersion of [0, 2, undefined]) {
      const flow = issueInitialFlow(
        liveHomeProof,
        fingerprint,
        `lifecycle:schema-${String(schemaVersion)}`
      );
      const validCompletion = completionFor(
        flow.expectedBinding,
        fingerprint,
        `lifecycle:schema-${String(schemaVersion)}:completion`
      );
      let laterGetterReads = 0;
      const adversarial = {};
      Object.defineProperty(adversarial, "schemaVersion", {
        enumerable: true,
        value: schemaVersion
      });
      Object.defineProperty(adversarial, "attemptId", {
        enumerable: true,
        get() {
          laterGetterReads += 1;
          return validCompletion.attemptId;
        }
      });
      assert.throws(() => completeRequiredBrowserProvisionBootstrapAuthority(
        liveHomeProof,
        flow.bootstrapAuthority,
        adversarial
      ));
      assert.equal(laterGetterReads, 0);
    }

    const malformedCases = [
      (completion) => reorderFirstTwoFields(completion),
      (completion) => appendField(completion, "outcome", "FAIL"),
      (completion) => replaceField(
        completion,
        "bootstrapAuthorityBindingFingerprint",
        fingerprint("lifecycle:wrong-bootstrap-binding")
      ),
      (completion) => replaceField(
        completion,
        "finalDescriptorSetFingerprint",
        undefined
      )
    ];
    for (const [index, mutate] of malformedCases.entries()) {
      const flow = issueInitialFlow(
        liveHomeProof,
        fingerprint,
        `lifecycle:malformed-${index}`
      );
      const completion = completionFor(
        flow.expectedBinding,
        fingerprint,
        `lifecycle:malformed-${index}:completion`
      );
      assert.throws(() => completeRequiredBrowserProvisionBootstrapAuthority(
        liveHomeProof,
        flow.bootstrapAuthority,
        mutate(completion)
      ));
      assert.throws(() => promoteInitialRequiredBrowserProvisionBootstrapAuthority(
        liveHomeProof,
        flow.bootstrapAuthority
      ));
    }
  });
});
