import { types as utilTypes } from "node:util";

import { assertLiveHomeProof } from "./live-home-protection.mjs";
import { hashCanonicalProof } from "./required-browser-proof-primitives.mjs";

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

const INITIAL_REQUEST_KEYS = Object.freeze([
  "schemaVersion",
  "mode",
  "attemptNonce",
  "sourceSeedFingerprint",
  "bootstrapScopeFingerprint",
  "bootstrapCommandCatalogFingerprint",
  "ownedProcessCatalogFingerprint"
]);
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

const ARRAY_IS_ARRAY = Array.isArray;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const IS_PROXY = utilTypes.isProxy;
const LOWER_HEX_64 = /^[a-f0-9]{64}$/u;

const candidateAuthorityState = new WeakMap();
const bootstrapAuthorityState = new WeakMap();
const attemptAuthorityState = new WeakMap();
const liveHomeRegistries = new WeakMap();

function fail() {
  throw new Error();
}

function nullRecord(entries) {
  const record = OBJECT_CREATE(null);
  for (const [key, value] of entries) {
    OBJECT_DEFINE_PROPERTY(record, key, {
      configurable: false,
      enumerable: true,
      value,
      writable: false
    });
  }
  return OBJECT_FREEZE(record);
}

function freshRecordCopy(record, keys) {
  return nullRecord(keys.map((key) => [key, record[key]]));
}

function isLowerHex64(value) {
  return typeof value === "string" && LOWER_HEX_64.test(value);
}

function assertLowerHex64(value) {
  if (!isLowerHex64(value)) fail();
}

function assertSchemaOneOwnDataDescriptor(value) {
  if (
    value === null
    || typeof value !== "object"
    || IS_PROXY(value)
  ) {
    fail();
  }
  let descriptor;
  try {
    descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, "schemaVersion");
  } catch {
    fail();
  }
  if (
    !descriptor
    || !("value" in descriptor)
    || !descriptor.enumerable
    || descriptor.value !== 1
  ) {
    fail();
  }
}

function closedRecord(value, expectedKeys) {
  assertSchemaOneOwnDataDescriptor(value);
  let prototype;
  let ownKeys;
  try {
    prototype = OBJECT_GET_PROTOTYPE_OF(value);
    ownKeys = REFLECT_OWN_KEYS(value);
  } catch {
    fail();
  }
  if (
    ARRAY_IS_ARRAY(value)
    || (prototype !== OBJECT_PROTOTYPE && prototype !== null)
    || ownKeys.length !== expectedKeys.length
  ) {
    fail();
  }
  const entries = [];
  for (let index = 0; index < expectedKeys.length; index += 1) {
    const expectedKey = expectedKeys[index];
    if (ownKeys[index] !== expectedKey) fail();
    let descriptor;
    try {
      descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, expectedKey);
    } catch {
      fail();
    }
    if (
      !descriptor
      || !("value" in descriptor)
      || !descriptor.enumerable
    ) {
      fail();
    }
    entries.push([expectedKey, descriptor.value]);
  }
  return nullRecord(entries);
}

function validateRequest(value, expectedMode) {
  const request = closedRecord(value, INITIAL_REQUEST_KEYS);
  if (request.mode !== expectedMode) fail();
  assertLowerHex64(request.attemptNonce);
  assertLowerHex64(request.sourceSeedFingerprint);
  assertLowerHex64(request.bootstrapScopeFingerprint);
  assertLowerHex64(request.bootstrapCommandCatalogFingerprint);
  assertLowerHex64(request.ownedProcessCatalogFingerprint);
  return request;
}

function validateCandidateBinding(value) {
  const binding = closedRecord(value, CANDIDATE_BINDING_KEYS);
  for (const key of CANDIDATE_BINDING_KEYS.slice(1, -1)) {
    assertLowerHex64(binding[key]);
  }
  if (binding.failedPhase !== "staged-tree-attestation") fail();
  return binding;
}

function completionKeysFor(value) {
  assertSchemaOneOwnDataDescriptor(value);
  let modeDescriptor;
  try {
    modeDescriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, "mode");
  } catch {
    fail();
  }
  if (
    !modeDescriptor
    || !("value" in modeDescriptor)
    || !modeDescriptor.enumerable
  ) {
    fail();
  }
  if (modeDescriptor.value === "initial") return INITIAL_COMPLETION_KEYS;
  if (modeDescriptor.value === "requalification") {
    return REQUALIFICATION_COMPLETION_KEYS;
  }
  fail();
}

function validateCompletion(value) {
  const completion = closedRecord(value, completionKeysFor(value));
  assertLowerHex64(completion.attemptId);
  for (const key of Reflect.ownKeys(completion)) {
    if (
      key !== "schemaVersion"
      && key !== "mode"
      && key !== "attemptId"
    ) {
      assertLowerHex64(completion[key]);
    }
  }
  return completion;
}

function requestDomainForMode(mode) {
  if (mode === "initial") return INITIAL_REQUEST_DOMAIN;
  if (mode === "requalification") return REQUALIFICATION_REQUEST_DOMAIN;
  fail();
}

function attemptIdFor(request) {
  return hashCanonicalProof(ATTEMPT_ID_DOMAIN, nullRecord([
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

function registryFor(liveHomeProof) {
  let registry = liveHomeRegistries.get(liveHomeProof);
  if (!registry) {
    registry = {
      candidateDiscoveryTuples: new Set(),
      attemptIds: {
        initial: new Set(),
        requalification: new Set()
      },
      attemptNonces: {
        initial: new Set(),
        requalification: new Set()
      },
      requestFingerprints: {
        initial: new Set(),
        requalification: new Set()
      }
    };
    liveHomeRegistries.set(liveHomeProof, registry);
  }
  return registry;
}

function reserveAttempt(
  registry,
  mode,
  attemptNonce,
  attemptId,
  requestFingerprint
) {
  const nonces = registry.attemptNonces[mode];
  const attemptIds = registry.attemptIds[mode];
  const requestFingerprints = registry.requestFingerprints[mode];
  if (
    nonces.has(attemptNonce)
    || attemptIds.has(attemptId)
    || requestFingerprints.has(requestFingerprint)
  ) {
    fail();
  }
  nonces.add(attemptNonce);
  attemptIds.add(attemptId);
  requestFingerprints.add(requestFingerprint);
}

function candidateDiscoveryTuple(binding) {
  return [
    binding.repositoryBindingFingerprint,
    binding.priorProvisionFailureAttestationFingerprint,
    binding.retainedAttemptRootBindingFingerprint
  ].join("");
}

function stateForToken(token, stateMap) {
  if (
    token === null
    || (typeof token !== "object" && typeof token !== "function")
    || IS_PROXY(token)
  ) {
    fail();
  }
  const state = stateMap.get(token);
  if (!state) fail();
  return state;
}

function assertSameLiveHome(liveHomeProof, state) {
  assertLiveHomeProof(liveHomeProof);
  if (state.liveHomeProof !== liveHomeProof) fail();
}

function issueBootstrapAuthority(
  liveHomeProof,
  request,
  candidateState
) {
  assertLiveHomeProof(liveHomeProof);
  if (candidateState && candidateState.liveHomeProof !== liveHomeProof) fail();

  const attemptId = attemptIdFor(request);
  assertLowerHex64(attemptId);
  const requestFingerprint = hashCanonicalProof(
    requestDomainForMode(request.mode),
    request
  );
  assertLowerHex64(requestFingerprint);
  const registry = registryFor(liveHomeProof);
  reserveAttempt(
    registry,
    request.mode,
    request.attemptNonce,
    attemptId,
    requestFingerprint
  );

  const entries = [
    ["schemaVersion", 1],
    ["requestFingerprint", requestFingerprint],
    ["attemptId", attemptId],
    ["mode", request.mode],
    ["attemptNonce", request.attemptNonce],
    ["sourceSeedFingerprint", request.sourceSeedFingerprint],
    ["bootstrapScopeFingerprint", request.bootstrapScopeFingerprint],
    [
      "bootstrapCommandCatalogFingerprint",
      request.bootstrapCommandCatalogFingerprint
    ],
    ["ownedProcessCatalogFingerprint", request.ownedProcessCatalogFingerprint]
  ];
  if (candidateState) {
    entries.push(
      [
        "requalificationCandidateBindingFingerprint",
        candidateState.bindingFingerprint
      ],
      [
        "priorProvisionFailureAttestationFingerprint",
        candidateState.binding.priorProvisionFailureAttestationFingerprint
      ],
      [
        "retainedAttemptRootBindingFingerprint",
        candidateState.binding.retainedAttemptRootBindingFingerprint
      ]
    );
  }
  const binding = nullRecord(entries);
  const bindingFingerprint = hashCanonicalProof(
    BOOTSTRAP_BINDING_DOMAIN,
    binding
  );
  const authority = OBJECT_FREEZE(OBJECT_CREATE(null));
  bootstrapAuthorityState.set(authority, {
    binding,
    bindingFingerprint,
    candidateRepositoryBindingFingerprint: candidateState
      ? candidateState.binding.repositoryBindingFingerprint
      : undefined,
    completion: undefined,
    completionFingerprint: undefined,
    liveHomeProof,
    phase: "issued"
  });
  return authority;
}

export function issueRequiredBrowserProvisionRequalificationCandidateAuthority(
  liveHomeProof,
  bindingValue
) {
  const binding = validateCandidateBinding(bindingValue);
  assertLiveHomeProof(liveHomeProof);
  const registry = registryFor(liveHomeProof);
  const discoveryTuple = candidateDiscoveryTuple(binding);
  if (registry.candidateDiscoveryTuples.has(discoveryTuple)) fail();
  registry.candidateDiscoveryTuples.add(discoveryTuple);

  const bindingFingerprint = hashCanonicalProof(
    CANDIDATE_BINDING_DOMAIN,
    binding
  );
  const authority = OBJECT_FREEZE(OBJECT_CREATE(null));
  candidateAuthorityState.set(authority, {
    binding,
    bindingFingerprint,
    liveHomeProof,
    phase: "issued"
  });
  return authority;
}

export function issueInitialRequiredBrowserProvisionBootstrapAuthority(
  liveHomeProof,
  requestValue
) {
  const request = validateRequest(requestValue, "initial");
  return issueBootstrapAuthority(liveHomeProof, request);
}

export function issueRequalificationRequiredBrowserProvisionBootstrapAuthority(
  liveHomeProof,
  requalificationCandidateAuthority,
  requestValue
) {
  const candidateState = stateForToken(
    requalificationCandidateAuthority,
    candidateAuthorityState
  );
  if (candidateState.phase !== "issued") fail();
  candidateState.phase = "consumed";

  const request = validateRequest(requestValue, "requalification");
  return issueBootstrapAuthority(liveHomeProof, request, candidateState);
}

export function completeRequiredBrowserProvisionBootstrapAuthority(
  liveHomeProof,
  bootstrapAuthority,
  completionValue
) {
  const completion = validateCompletion(completionValue);
  assertLiveHomeProof(liveHomeProof);
  const state = stateForToken(bootstrapAuthority, bootstrapAuthorityState);
  if (
    state.liveHomeProof !== liveHomeProof
    || state.phase !== "issued"
    || completion.mode !== state.binding.mode
    || completion.attemptId !== state.binding.attemptId
    || completion.bootstrapAuthorityBindingFingerprint
      !== state.bindingFingerprint
    || completion.sourceSeedFingerprint
      !== state.binding.sourceSeedFingerprint
    || completion.bootstrapScopeFingerprint
      !== state.binding.bootstrapScopeFingerprint
    || completion.bootstrapCommandCatalogFingerprint
      !== state.binding.bootstrapCommandCatalogFingerprint
    || completion.ownedProcessCatalogFingerprint
      !== state.binding.ownedProcessCatalogFingerprint
  ) {
    fail();
  }
  if (state.binding.mode === "requalification") {
    if (
      completion.requalificationCandidateBindingFingerprint
        !== state.binding.requalificationCandidateBindingFingerprint
      || completion.priorProvisionFailureAttestationFingerprint
        !== state.binding.priorProvisionFailureAttestationFingerprint
      || completion.repositoryBindingFingerprint
        !== state.candidateRepositoryBindingFingerprint
      || completion.provisionRootBindingFingerprint
        !== state.binding.retainedAttemptRootBindingFingerprint
    ) {
      fail();
    }
  }
  const completionFingerprint = hashCanonicalProof(
    BOOTSTRAP_COMPLETION_DOMAIN,
    completion
  );
  state.completion = completion;
  state.completionFingerprint = completionFingerprint;
  state.phase = "completed";
}

function promoteBootstrapAuthority(liveHomeProof, bootstrapAuthority, mode) {
  const state = stateForToken(bootstrapAuthority, bootstrapAuthorityState);
  assertSameLiveHome(liveHomeProof, state);
  if (state.phase !== "completed" || state.binding.mode !== mode) fail();

  const completion = state.completion;
  const entries = [
    ["schemaVersion", 1],
    ["attemptId", state.binding.attemptId],
    ["mode", state.binding.mode],
    ["sourceSeedFingerprint", state.binding.sourceSeedFingerprint],
    ["bootstrapAuthorityBindingFingerprint", state.bindingFingerprint],
    ["bootstrapCompletionFingerprint", state.completionFingerprint],
    ["repositoryBindingFingerprint", completion.repositoryBindingFingerprint],
    [
      "provisionRootBindingFingerprint",
      completion.provisionRootBindingFingerprint
    ],
    [
      "ownedProcessCatalogFingerprint",
      completion.ownedProcessCatalogFingerprint
    ],
    [
      "finalCommandScopeFingerprint",
      completion.finalCommandScopeFingerprint
    ],
    [
      "finalDescriptorSetFingerprint",
      completion.finalDescriptorSetFingerprint
    ],
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
  if (mode === "requalification") {
    entries.push(
      [
        "requalificationCandidateBindingFingerprint",
        state.binding.requalificationCandidateBindingFingerprint
      ],
      [
        "priorProvisionFailureAttestationFingerprint",
        state.binding.priorProvisionFailureAttestationFingerprint
      ]
    );
  }
  const binding = nullRecord(entries);
  const bindingFingerprint = hashCanonicalProof(ATTEMPT_BINDING_DOMAIN, binding);
  const authority = OBJECT_FREEZE(OBJECT_CREATE(null));
  attemptAuthorityState.set(authority, {
    binding,
    bindingFingerprint,
    liveHomeProof
  });
  state.phase = "promoted";
  return authority;
}

export function promoteInitialRequiredBrowserProvisionBootstrapAuthority(
  liveHomeProof,
  bootstrapAuthority
) {
  return promoteBootstrapAuthority(
    liveHomeProof,
    bootstrapAuthority,
    "initial"
  );
}

export function promoteRequalificationRequiredBrowserProvisionBootstrapAuthority(
  liveHomeProof,
  bootstrapAuthority
) {
  return promoteBootstrapAuthority(
    liveHomeProof,
    bootstrapAuthority,
    "requalification"
  );
}

export function assertRequiredBrowserProvisionBootstrapAuthorityBinding(
  liveHomeProof,
  bootstrapAuthority,
  expectedBindingFingerprint
) {
  assertLowerHex64(expectedBindingFingerprint);
  const state = stateForToken(bootstrapAuthority, bootstrapAuthorityState);
  assertSameLiveHome(liveHomeProof, state);
  if (state.bindingFingerprint !== expectedBindingFingerprint) fail();
}

export function readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
  liveHomeProof,
  bootstrapAuthority
) {
  const state = stateForToken(bootstrapAuthority, bootstrapAuthorityState);
  assertSameLiveHome(liveHomeProof, state);
  const keys = state.binding.mode === "initial"
    ? INITIAL_BOOTSTRAP_BINDING_KEYS
    : REQUALIFICATION_BOOTSTRAP_BINDING_KEYS;
  return freshRecordCopy(state.binding, keys);
}

export function assertRequiredBrowserProvisionAttemptAuthorityBinding(
  liveHomeProof,
  attemptAuthority,
  expectedBindingFingerprint
) {
  assertLowerHex64(expectedBindingFingerprint);
  const state = stateForToken(attemptAuthority, attemptAuthorityState);
  assertSameLiveHome(liveHomeProof, state);
  if (state.bindingFingerprint !== expectedBindingFingerprint) fail();
}

export function readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
  liveHomeProof,
  attemptAuthority
) {
  const state = stateForToken(attemptAuthority, attemptAuthorityState);
  assertSameLiveHome(liveHomeProof, state);
  const keys = state.binding.mode === "initial"
    ? INITIAL_ATTEMPT_BINDING_KEYS
    : Object.freeze([
        ...INITIAL_ATTEMPT_BINDING_KEYS,
        "requalificationCandidateBindingFingerprint",
        "priorProvisionFailureAttestationFingerprint"
      ]);
  return freshRecordCopy(state.binding, keys);
}
