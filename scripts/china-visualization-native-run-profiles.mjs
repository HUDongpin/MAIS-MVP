import { types as utilTypes } from "node:util";

const focusedProducerRoots = [
  "tests/e2e/china-mainland-g03-signed-real-production.spec.ts",
  "tests/e2e/china-mainland-g04-fraction-operations-production.spec.ts",
  "tests/e2e/china-mainland-g05-percent-applications-production.spec.ts",
  "tests/e2e/china-mainland-g06-ratio-proportion-scale-production.spec.ts",
];

const dedicatedProducerRoots = [
  "tests/e2e/china-mainland-g01-production-browser.spec.ts",
  "tests/e2e/china-mainland-g02-production-browser.spec.ts",
  "tests/e2e/china-mainland-g07-production-browser.spec.ts",
];

const fixedRuntimeRoots = [
  "tests/e2e/starship-e2e-global-setup.ts",
  "tests/e2e/mainland-focused-canonical-cli.ts",
];

const forbiddenCliSelectors = [
  "--project",
  "--grep",
  "-g",
  "--grep-invert",
  "--shard",
  "--retries",
  "--repeat-each",
  "--last-failed",
  "--list",
  "--config",
  "-c",
  "--output",
  "--profile",
];

const forbiddenInheritedSelectionEnvironmentPrefixes = [
  "CHINA_VIZ_",
  "MAIS_FOCUSED_PLAYWRIGHT_",
  "MAIS_G01_RUNNER_",
  "MAIS_G02_RUNNER_",
  "MAIS_G07_RUNNER_",
  "PLAYWRIGHT_CONFIG",
  "PLAYWRIGHT_GREP",
  "PLAYWRIGHT_PROJECT",
  "PLAYWRIGHT_SHARD",
  "PLAYWRIGHT_RETRIES",
  "PLAYWRIGHT_REPEAT_EACH",
  "PLAYWRIGHT_LAST_FAILED",
  "PLAYWRIGHT_LIST",
  "PLAYWRIGHT_OUTPUT",
  "PWTEST_",
  "PW_TEST_FILTER",
];

function deepFreeze(value, visited = new WeakSet()) {
  if (value === null || typeof value !== "object" || visited.has(value)) return value;
  visited.add(value);
  for (const nested of Object.values(value)) deepFreeze(nested, visited);
  return Object.freeze(value);
}

function exactPlainRecordValues(value, label, expectedKeys = null) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || utilTypes.isProxy(value)
  ) {
    throw new TypeError(`${label} must be one ordinary plain record.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) {
    throw new TypeError(`${label} has a non-canonical prototype.`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new TypeError(`${label} must not contain symbol keys.`);
  }
  const values = new Map();
  for (const key of ownKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !descriptor
      || descriptor.enumerable !== true
      || !("value" in descriptor)
    ) {
      throw new TypeError(`${label}.${key} must be an own enumerable data property.`);
    }
    values.set(key, descriptor.value);
  }
  if (expectedKeys) {
    if (
      values.size !== expectedKeys.length
      || expectedKeys.some((key) => !values.has(key))
    ) {
      throw new TypeError(`${label} has non-canonical own keys.`);
    }
  }
  return values;
}

function exactOrdinaryArrayValues(value, label, expectedLength = null) {
  if (
    !Array.isArray(value)
    || utilTypes.isProxy(value)
    || Object.getPrototypeOf(value) !== Array.prototype
  ) {
    throw new TypeError(`${label} must be one ordinary array.`);
  }
  const expectedArrayLength = expectedLength ?? value.length;
  const expectedKeys = [
    ...Array.from({ length: expectedArrayLength }, (_, index) => String(index)),
    "length",
  ];
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== expectedKeys.length
    || ownKeys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new TypeError(`${label} has holes, symbols, or extra array keys.`);
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    !lengthDescriptor
    || !("value" in lengthDescriptor)
    || lengthDescriptor.value !== expectedArrayLength
    || lengthDescriptor.enumerable !== false
  ) {
    throw new TypeError(`${label}.length is non-canonical.`);
  }
  const values = [];
  for (let index = 0; index < expectedArrayLength; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      !descriptor
      || descriptor.enumerable !== true
      || !("value" in descriptor)
    ) {
      throw new TypeError(`${label}[${index}] must be an own enumerable data property.`);
    }
    values.push(descriptor.value);
  }
  return values;
}

function assertExactPrimitiveArray(candidate, canonical, label) {
  const values = exactOrdinaryArrayValues(candidate, label, canonical.length);
  if (values.some((value, index) => !Object.is(value, canonical[index]))) {
    throw new TypeError(`${label} differs from the canonical ordered values.`);
  }
}

function assertExactUntrustedStructure(candidate, canonical, label, visited = new WeakMap()) {
  if (canonical === null || typeof canonical !== "object") {
    if (!Object.is(candidate, canonical)) {
      throw new TypeError(`${label} differs from the canonical value.`);
    }
    return;
  }
  if (candidate === null || typeof candidate !== "object") {
    throw new TypeError(`${label} differs from the canonical structure.`);
  }
  const priorCanonical = visited.get(candidate);
  if (priorCanonical) {
    if (priorCanonical !== canonical) {
      throw new TypeError(`${label} contains a non-canonical shared or cyclic reference.`);
    }
    return;
  }
  visited.set(candidate, canonical);
  if (Array.isArray(canonical)) {
    const values = exactOrdinaryArrayValues(candidate, label, canonical.length);
    for (let index = 0; index < canonical.length; index += 1) {
      assertExactUntrustedStructure(
        values[index],
        canonical[index],
        `${label}[${index}]`,
        visited,
      );
    }
    return;
  }
  const canonicalKeys = Object.keys(canonical);
  const values = exactPlainRecordValues(candidate, label, canonicalKeys);
  for (const key of canonicalKeys) {
    assertExactUntrustedStructure(values.get(key), canonical[key], `${label}.${key}`, visited);
  }
}

function profile(profileId, producerRoots, details = {}) {
  return {
    argv: ["test", ...producerRoots, "--workers=1", "--reporter=list,json"],
    canonicalCli: "tests/e2e/mainland-focused-canonical-cli.ts",
    classification: "untrusted-config-plumbing-only",
    forbiddenCliSelectors: [...forbiddenCliSelectors],
    forbiddenInheritedSelectionEnvironmentPrefixes: [
      ...forbiddenInheritedSelectionEnvironmentPrefixes,
    ],
    fixedRuntimeRoots: [...fixedRuntimeRoots],
    globalSetup: "./tests/e2e/starship-e2e-global-setup.ts",
    observedConfigRetries: 0,
    producerRoots: [...producerRoots],
    profileId,
    projects: ["desktop-chrome", "mobile-chrome"],
    reporters: ["list", "json"],
    schemaVersion: "china-visualization-native-run-profile.v1",
    workers: 1,
    ...details,
  };
}

function dedicatedResultAttachments() {
  const groups = [
    {
      groupId: "G01",
      spec: dedicatedProducerRoots[0],
      testTitle: "fails closed without trusted runner authority before producing any G01 receipt",
    },
    {
      groupId: "G02",
      spec: dedicatedProducerRoots[1],
      testTitle: "requires trusted native runner authority before producing G02 learner evidence",
    },
    {
      groupId: "G07",
      spec: dedicatedProducerRoots[2],
      testTitle: "requires native authority before producing all G07 browser evidence",
    },
  ];
  return groups.flatMap(({ groupId, spec, testTitle }) =>
    ["desktop-chrome", "mobile-chrome"].map((project) => ({
      attachmentContentType: "application/json",
      attachmentName: `china-mainland-${groupId.toLowerCase()}-production-${project}.json`,
      groupId,
      project,
      spec,
      testTitle,
    })),
  );
}

const nativeRunProfiles = deepFreeze({
  dedicatedG01G02G07: profile("dedicated-g01-g02-g07", dedicatedProducerRoots, {
    expectedResultAttachments: dedicatedResultAttachments(),
    groupLabCounts: { G01: 9, G02: 4, G07: 7 },
  }),
  focusedG03G06: profile("focused-g03-g06", focusedProducerRoots),
});

// These fixed lookups and structural validators are configuration plumbing only.
// A production runner must choose its fixed getter in runner-owned source; none of
// these functions proves execution, process provenance, or receipt authenticity.
export function getFocusedG03G06RunProfileUntrusted() {
  return nativeRunProfiles.focusedG03G06;
}

export function getDedicatedG01G02G07RunProfileUntrusted() {
  return nativeRunProfiles.dedicatedG01G02G07;
}

function validateRunInputArgvUntrusted(profile, input) {
  const inputValues = exactPlainRecordValues(
    input,
    `${profile.profileId} run input`,
    ["argv", "inheritedEnvironment", "observedConfig"],
  );
  assertExactPrimitiveArray(
    inputValues.get("argv"),
    profile.argv,
    `${profile.profileId} argv`,
  );
  const environmentValues = exactPlainRecordValues(
    inputValues.get("inheritedEnvironment"),
    `${profile.profileId} inherited environment`,
  );
  const callerProfileNames = new Set([
    "CALLERPROFILEID",
    "CALLER_PROFILE_ID",
    "PROFILEID",
    "PROFILE_ID",
  ]);
  const forbiddenName = [...environmentValues.keys()].find((name) => {
    const canonicalName = name.toUpperCase();
    return callerProfileNames.has(canonicalName)
      || profile.forbiddenInheritedSelectionEnvironmentPrefixes.some((prefix) =>
        canonicalName.startsWith(prefix.toUpperCase())
      );
  });
  if (forbiddenName) {
    throw new TypeError(
      `${profile.profileId} rejected inherited selection environment ${forbiddenName}.`,
    );
  }
  const configValues = exactPlainRecordValues(
    inputValues.get("observedConfig"),
    `${profile.profileId} observed Playwright config`,
    ["globalSetup", "projects", "retries", "workers"],
  );
  assertExactPrimitiveArray(
    configValues.get("projects"),
    profile.projects,
    `${profile.profileId} observed Playwright projects`,
  );
  if (
    configValues.get("globalSetup") !== profile.globalSetup
    || configValues.get("retries") !== profile.observedConfigRetries
    || configValues.get("workers") !== profile.workers
  ) {
    throw new TypeError(
      `${profile.profileId} rejected non-canonical observed Playwright config.`,
    );
  }
  return profile;
}

export function validateDedicatedG01G02G07RunInputUntrusted(input) {
  return validateRunInputArgvUntrusted(nativeRunProfiles.dedicatedG01G02G07, input);
}

export function validateFocusedG03G06RunInputUntrusted(input) {
  return validateRunInputArgvUntrusted(nativeRunProfiles.focusedG03G06, input);
}

export function validateChinaVisualizationNativeRunProfileDefinitionUntrusted(candidate) {
  const candidateValues = exactPlainRecordValues(
    candidate,
    "China Visualization native run profile definition",
  );
  const candidateProfileId = candidateValues.get("profileId");
  const canonical = candidateProfileId === nativeRunProfiles.focusedG03G06.profileId
    ? nativeRunProfiles.focusedG03G06
    : candidateProfileId === nativeRunProfiles.dedicatedG01G02G07.profileId
      ? nativeRunProfiles.dedicatedG01G02G07
      : null;
  if (!canonical) {
    throw new TypeError(`Unknown untrusted China Visualization profile ${String(candidateProfileId)}.`);
  }
  assertExactUntrustedStructure(candidate, canonical, `${canonical.profileId} definition`);
  return canonical;
}
