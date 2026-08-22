import assert from "node:assert/strict";
import test from "node:test";

import {
  getDedicatedG01G02G07RunProfileUntrusted,
  getFocusedG03G06RunProfileUntrusted,
  validateChinaVisualizationNativeRunProfileDefinitionUntrusted,
  validateDedicatedG01G02G07RunInputUntrusted,
  validateFocusedG03G06RunInputUntrusted,
} from "./china-visualization-native-run-profiles.mjs";

const focusedSpecs = Object.freeze([
  "tests/e2e/china-mainland-g03-signed-real-production.spec.ts",
  "tests/e2e/china-mainland-g04-fraction-operations-production.spec.ts",
  "tests/e2e/china-mainland-g05-percent-applications-production.spec.ts",
  "tests/e2e/china-mainland-g06-ratio-proportion-scale-production.spec.ts",
]);

const dedicatedSpecs = Object.freeze([
  "tests/e2e/china-mainland-g01-production-browser.spec.ts",
  "tests/e2e/china-mainland-g02-production-browser.spec.ts",
  "tests/e2e/china-mainland-g07-production-browser.spec.ts",
]);

function dedicatedInput() {
  return {
    argv: [...getDedicatedG01G02G07RunProfileUntrusted().argv],
    inheritedEnvironment: {},
    observedConfig: {
      globalSetup: "./tests/e2e/starship-e2e-global-setup.ts",
      projects: ["desktop-chrome", "mobile-chrome"],
      retries: 0,
      workers: 1,
    },
  };
}

function focusedInput() {
  return {
    argv: [...getFocusedG03G06RunProfileUntrusted().argv],
    inheritedEnvironment: {},
    observedConfig: {
      globalSetup: "./tests/e2e/starship-e2e-global-setup.ts",
      projects: ["desktop-chrome", "mobile-chrome"],
      retries: 0,
      workers: 1,
    },
  };
}

function assertDeeplyFrozen(value, visited = new WeakSet()) {
  if (value === null || typeof value !== "object" || visited.has(value)) return;
  visited.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const nested of Object.values(value)) assertDeeplyFrozen(nested, visited);
}

function hiddenData(target, key, value) {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: false,
    value,
    writable: true,
  });
  return target;
}

function enumerableAccessor(target, key, value) {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    get() {
      return value;
    },
  });
  return target;
}

function runtimeCase(label, mutate, makeInput = dedicatedInput) {
  return {
    label,
    run() {
      const input = makeInput();
      mutate(input);
      return () => validateDedicatedG01G02G07RunInputUntrusted(input);
    },
  };
}

function definitionCase(label, mutate) {
  return {
    label,
    run() {
      const candidate = structuredClone(getDedicatedG01G02G07RunProfileUntrusted());
      mutate(candidate);
      return () => validateChinaVisualizationNativeRunProfileDefinitionUntrusted(candidate);
    },
  };
}

test("untrusted lookup exposes the two exact canonical producer profiles without authority fields", () => {
  const focused = getFocusedG03G06RunProfileUntrusted();
  const dedicated = getDedicatedG01G02G07RunProfileUntrusted();

  assert.deepEqual(focused.producerRoots, focusedSpecs);
  assert.deepEqual(dedicated.producerRoots, dedicatedSpecs);
  assert.deepEqual(focused.argv, [
    "test",
    ...focusedSpecs,
    "--workers=1",
    "--reporter=list,json",
  ]);
  assert.deepEqual(dedicated.argv, [
    "test",
    ...dedicatedSpecs,
    "--workers=1",
    "--reporter=list,json",
  ]);
  for (const profile of [focused, dedicated]) {
    assert.equal(profile.classification, "untrusted-config-plumbing-only");
    assert.equal(
      profile.canonicalCli,
      "tests/e2e/mainland-focused-canonical-cli.ts",
    );
    assert.equal(
      profile.globalSetup,
      "./tests/e2e/starship-e2e-global-setup.ts",
    );
    assert.deepEqual(profile.fixedRuntimeRoots, [
      "tests/e2e/starship-e2e-global-setup.ts",
      "tests/e2e/mainland-focused-canonical-cli.ts",
    ]);
    assert.deepEqual(profile.projects, ["desktop-chrome", "mobile-chrome"]);
    assert.equal(profile.workers, 1);
    assert.equal(profile.observedConfigRetries, 0);
    assert.deepEqual(profile.reporters, ["list", "json"]);
    assert.equal("authority" in profile, false);
    assert.equal("authorityAvailable" in profile, false);
    assert.equal("sourceHold" in profile, false);
    assert.equal("releaseReady" in profile, false);
  }
});

test("dedicated profile binds exact group lab counts and six project result attachments", () => {
  const profile = getDedicatedG01G02G07RunProfileUntrusted();
  assert.deepEqual(profile.groupLabCounts, { G01: 9, G02: 4, G07: 7 });
  assert.deepEqual(
    profile.expectedResultAttachments.map((entry) => ({
      attachmentName: entry.attachmentName,
      groupId: entry.groupId,
      project: entry.project,
      spec: entry.spec,
      testTitle: entry.testTitle,
    })),
    [
      {
        attachmentName: "china-mainland-g01-production-desktop-chrome.json",
        groupId: "G01",
        project: "desktop-chrome",
        spec: dedicatedSpecs[0],
        testTitle: "fails closed without trusted runner authority before producing any G01 receipt",
      },
      {
        attachmentName: "china-mainland-g01-production-mobile-chrome.json",
        groupId: "G01",
        project: "mobile-chrome",
        spec: dedicatedSpecs[0],
        testTitle: "fails closed without trusted runner authority before producing any G01 receipt",
      },
      {
        attachmentName: "china-mainland-g02-production-desktop-chrome.json",
        groupId: "G02",
        project: "desktop-chrome",
        spec: dedicatedSpecs[1],
        testTitle: "requires trusted native runner authority before producing G02 learner evidence",
      },
      {
        attachmentName: "china-mainland-g02-production-mobile-chrome.json",
        groupId: "G02",
        project: "mobile-chrome",
        spec: dedicatedSpecs[1],
        testTitle: "requires trusted native runner authority before producing G02 learner evidence",
      },
      {
        attachmentName: "china-mainland-g07-production-desktop-chrome.json",
        groupId: "G07",
        project: "desktop-chrome",
        spec: dedicatedSpecs[2],
        testTitle: "requires native authority before producing all G07 browser evidence",
      },
      {
        attachmentName: "china-mainland-g07-production-mobile-chrome.json",
        groupId: "G07",
        project: "mobile-chrome",
        spec: dedicatedSpecs[2],
        testTitle: "requires native authority before producing all G07 browser evidence",
      },
    ],
  );
  assert.equal(profile.expectedResultAttachments.length, 6);
  assert.equal(
    profile.expectedResultAttachments.every(
      (entry) => entry.attachmentContentType === "application/json",
    ),
    true,
  );
});

test("dedicated untrusted input validation rejects missing, reordered, duplicate, extra, and line-selected specs", () => {
  assert.equal(
    validateDedicatedG01G02G07RunInputUntrusted(dedicatedInput()),
    getDedicatedG01G02G07RunProfileUntrusted(),
  );
  const mutatedArgv = [
    ["test", dedicatedSpecs[0], dedicatedSpecs[1], "--workers=1", "--reporter=list,json"],
    ["test", dedicatedSpecs[1], dedicatedSpecs[0], dedicatedSpecs[2], "--workers=1", "--reporter=list,json"],
    ["test", dedicatedSpecs[0], dedicatedSpecs[1], dedicatedSpecs[1], "--workers=1", "--reporter=list,json"],
    ["test", ...dedicatedSpecs, "tests/e2e/foreign.spec.ts", "--workers=1", "--reporter=list,json"],
    ["test", `${dedicatedSpecs[0]}:1341`, dedicatedSpecs[1], dedicatedSpecs[2], "--workers=1", "--reporter=list,json"],
    ["test", `${dedicatedSpecs[0]}:1341:7`, dedicatedSpecs[1], dedicatedSpecs[2], "--workers=1", "--reporter=list,json"],
  ];
  for (const argv of mutatedArgv) {
    const input = dedicatedInput();
    input.argv = argv;
    assert.throws(
      () => validateDedicatedG01G02G07RunInputUntrusted(input),
      /argv|spec|line|canonical|profile/iu,
    );
  }
});

test("profiles bind every forbidden selector and inherited selection prefix, and dedicated input rejects each", () => {
  const profile = getDedicatedG01G02G07RunProfileUntrusted();
  assert.deepEqual(profile.forbiddenCliSelectors, [
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
  ]);
  assert.deepEqual(profile.forbiddenInheritedSelectionEnvironmentPrefixes, [
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
  ]);

  const selectorMutations = [
    ["--project=desktop-chrome"],
    ["--project", "mobile-chrome"],
    ["--grep=G01"],
    ["-g", "G01"],
    ["--grep-invert=foreign"],
    ["--shard=1/2"],
    ["--retries=0"],
    ["--repeat-each=1"],
    ["--last-failed"],
    ["--list"],
    ["--config=playwright.config.ts"],
    ["-c", "playwright.config.ts"],
    ["--output=.tmp/caller-output"],
    ["--profile=dedicated-g01-g02-g07"],
  ];
  for (const selectorArgs of selectorMutations) {
    const input = dedicatedInput();
    input.argv.splice(-2, 0, ...selectorArgs);
    assert.throws(
      () => validateDedicatedG01G02G07RunInputUntrusted(input),
      /argv|selector|canonical|profile/iu,
    );
  }

  for (const prefix of profile.forbiddenInheritedSelectionEnvironmentPrefixes) {
    const input = dedicatedInput();
    input.inheritedEnvironment[`${prefix}CALLER`] = "1";
    assert.throws(
      () => validateDedicatedG01G02G07RunInputUntrusted(input),
      /environment|inherited|selection|prefix/iu,
      prefix,
    );
  }
});

test("both untrusted validators require the exact observed global setup, projects, worker, and zero config retries", () => {
  assert.equal(
    validateFocusedG03G06RunInputUntrusted(focusedInput()),
    getFocusedG03G06RunProfileUntrusted(),
  );
  assert.equal(
    validateDedicatedG01G02G07RunInputUntrusted(dedicatedInput()),
    getDedicatedG01G02G07RunProfileUntrusted(),
  );

  const configMutations = [
    (config) => { config.globalSetup = "tests/e2e/foreign-global-setup.ts"; },
    (config) => { config.projects = ["mobile-chrome", "desktop-chrome"]; },
    (config) => { config.projects = ["desktop-chrome"]; },
    (config) => { config.projects.push("foreign-project"); },
    (config) => { config.retries = 1; },
    (config) => { config.workers = 2; },
  ];
  for (const mutate of configMutations) {
    for (const [input, validate] of [
      [focusedInput(), validateFocusedG03G06RunInputUntrusted],
      [dedicatedInput(), validateDedicatedG01G02G07RunInputUntrusted],
    ]) {
      mutate(input.observedConfig);
      assert.throws(
        () => validate(input),
        /config|global setup|project|retr|worker|canonical/iu,
      );
    }
  }
});

test("untrusted definition validation rejects reporter, worker, project, count, mapping, and caller profile-id mutations", () => {
  const canonical = getDedicatedG01G02G07RunProfileUntrusted();
  const focused = getFocusedG03G06RunProfileUntrusted();
  assert.equal(
    validateChinaVisualizationNativeRunProfileDefinitionUntrusted(
      structuredClone(canonical),
    ),
    canonical,
  );
  assert.equal(
    validateChinaVisualizationNativeRunProfileDefinitionUntrusted(
      structuredClone(focused),
    ),
    focused,
  );

  const mutations = [
    (candidate) => { candidate.reporters = ["json", "list"]; },
    (candidate) => { candidate.reporters = ["list"]; },
    (candidate) => { candidate.reporters.push("html"); },
    (candidate) => { candidate.workers = 2; },
    (candidate) => { candidate.projects = ["mobile-chrome", "desktop-chrome"]; },
    (candidate) => { candidate.projects = ["desktop-chrome"]; },
    (candidate) => { candidate.projects.push("foreign-project"); },
    (candidate) => { candidate.groupLabCounts.G01 = 8; },
    (candidate) => { delete candidate.groupLabCounts.G02; },
    (candidate) => { candidate.groupLabCounts.G08 = 1; },
    (candidate) => { candidate.expectedResultAttachments[0].attachmentName = "foreign.json"; },
    (candidate) => { candidate.expectedResultAttachments.pop(); },
    (candidate) => { candidate.profileId = "focused-g03-g06"; },
    (candidate) => { candidate.profileId = "caller-profile"; },
  ];
  for (const mutate of mutations) {
    const candidate = structuredClone(canonical);
    mutate(candidate);
    assert.throws(
      () => validateChinaVisualizationNativeRunProfileDefinitionUntrusted(candidate),
      /definition|profile|canonical|unknown/iu,
    );
  }

  for (const callerKey of ["profileId", "callerProfileId"]) {
    const input = dedicatedInput();
    input[callerKey] = "dedicated-g01-g02-g07";
    assert.throws(
      () => validateDedicatedG01G02G07RunInputUntrusted(input),
      /input|key|profile|caller/iu,
    );
  }
});

test("focused profile rejects missing, reordered, duplicate, extra, and line-selected producer roots", () => {
  const mutatedArgv = [
    ["test", ...focusedSpecs.slice(0, -1), "--workers=1", "--reporter=list,json"],
    ["test", focusedSpecs[1], focusedSpecs[0], ...focusedSpecs.slice(2), "--workers=1", "--reporter=list,json"],
    ["test", focusedSpecs[0], focusedSpecs[1], focusedSpecs[1], focusedSpecs[2], focusedSpecs[3], "--workers=1", "--reporter=list,json"],
    ["test", ...focusedSpecs, dedicatedSpecs[0], "--workers=1", "--reporter=list,json"],
    ["test", `${focusedSpecs[0]}:2032`, ...focusedSpecs.slice(1), "--workers=1", "--reporter=list,json"],
    ["test", `${focusedSpecs[0]}:2032:9`, ...focusedSpecs.slice(1), "--workers=1", "--reporter=list,json"],
  ];
  for (const argv of mutatedArgv) {
    const input = focusedInput();
    input.argv = argv;
    assert.throws(
      () => validateFocusedG03G06RunInputUntrusted(input),
      /argv|spec|line|canonical|profile/iu,
    );
  }
});

test("runtime argv rejects every worker and reporter shape outside one worker plus exact list,json", () => {
  const mutations = [
    ["--workers=2", "--reporter=list,json"],
    ["--reporter=list,json"],
    ["--workers=1", "--workers=1", "--reporter=list,json"],
    ["--workers=1", "--reporter=json,list"],
    ["--workers=1", "--reporter=list"],
    ["--workers=1", "--reporter=list,json,html"],
    ["--workers=1"],
  ];
  for (const tail of mutations) {
    for (const [input, specs, validate] of [
      [focusedInput(), focusedSpecs, validateFocusedG03G06RunInputUntrusted],
      [dedicatedInput(), dedicatedSpecs, validateDedicatedG01G02G07RunInputUntrusted],
    ]) {
      input.argv = ["test", ...specs, ...tail];
      assert.throws(
        () => validate(input),
        /argv|selector|canonical|profile/iu,
      );
    }
  }
});

test("the internal registry is recursively frozen through every public profile reference", () => {
  for (const profile of [
    getFocusedG03G06RunProfileUntrusted(),
    getDedicatedG01G02G07RunProfileUntrusted(),
  ]) {
    assertDeeplyFrozen(profile);
    assert.throws(() => profile.argv.push("--list"), TypeError);
    assert.throws(() => { profile.projects[0] = "foreign-project"; }, TypeError);
    assert.throws(() => { profile.workers = 2; }, TypeError);
    assert.equal(profile.workers, 1);
  }
});

const reviewerRuntimeExactnessCategories = [
  {
    name: "input root rejects custom prototypes and inherited caller selectors",
    cases: [
      runtimeCase("prototype profileId", (input) => {
        Object.setPrototypeOf(input, { profileId: "dedicated-g01-g02-g07" });
      }),
      runtimeCase("prototype callerProfileId", (input) => {
        Object.setPrototypeOf(input, { callerProfileId: "dedicated-g01-g02-g07" });
      }),
      runtimeCase("prototype project selector", (input) => {
        Object.setPrototypeOf(input, { project: "desktop-chrome" });
      }),
    ],
  },
  {
    name: "input root rejects non-enumerable and symbol caller fields",
    cases: [
      runtimeCase("hidden profileId", (input) => hiddenData(input, "profileId", "dedicated-g01-g02-g07")),
      runtimeCase("hidden callerProfileId", (input) => hiddenData(input, "callerProfileId", "dedicated-g01-g02-g07")),
      runtimeCase("symbol profileId", (input) => {
        input[Symbol("profileId")] = "dedicated-g01-g02-g07";
      }),
      runtimeCase("symbol project", (input) => {
        input[Symbol("project")] = "desktop-chrome";
      }),
    ],
  },
  {
    name: "input root rejects accessor substitution without invoking getters",
    cases: [
      runtimeCase("argv accessor", (input) => enumerableAccessor(input, "argv", [...input.argv])),
      runtimeCase("environment accessor", (input) =>
        enumerableAccessor(input, "inheritedEnvironment", {})),
      runtimeCase("config accessor", (input) =>
        enumerableAccessor(input, "observedConfig", structuredClone(input.observedConfig))),
    ],
  },
  {
    name: "argv rejects toJSON, extra keys, symbols, accessors, and custom prototypes",
    cases: [
      runtimeCase("deceptive argv toJSON", (input) => {
        const canonical = [...input.argv];
        input.argv = ["test", "tests/e2e/foreign.spec.ts"];
        hiddenData(input.argv, "toJSON", () => canonical);
      }),
      runtimeCase("argv enumerable extra", (input) => { input.argv.selector = "G01"; }),
      runtimeCase("argv hidden extra", (input) => hiddenData(input.argv, "selector", "G01")),
      runtimeCase("argv symbol extra", (input) => { input.argv[Symbol("selector")] = "G01"; }),
      runtimeCase("argv accessor extra", (input) => enumerableAccessor(input.argv, "selector", "G01")),
      runtimeCase("argv custom prototype", (input) => {
        Object.setPrototypeOf(input.argv, Object.create(Array.prototype, {
          selector: { enumerable: true, value: "G01" },
        }));
      }),
    ],
  },
  {
    name: "observed config rejects hidden, symbol, prototype, and toJSON extras",
    cases: [
      runtimeCase("config prototype project", (input) => {
        Object.setPrototypeOf(input.observedConfig, { project: "desktop-chrome" });
      }),
      runtimeCase("config hidden profile", (input) =>
        hiddenData(input.observedConfig, "profileId", "dedicated-g01-g02-g07")),
      runtimeCase("config symbol profile", (input) => {
        input.observedConfig[Symbol("profileId")] = "dedicated-g01-g02-g07";
      }),
      runtimeCase("config hidden toJSON", (input) =>
        hiddenData(input.observedConfig, "toJSON", () => ({
          globalSetup: input.observedConfig.globalSetup,
          projects: input.observedConfig.projects,
          retries: 0,
          workers: 1,
        }))),
    ],
  },
  {
    name: "observed config rejects accessors for every canonical value",
    cases: [
      runtimeCase("globalSetup accessor", (input) =>
        enumerableAccessor(input.observedConfig, "globalSetup", input.observedConfig.globalSetup)),
      runtimeCase("projects accessor", (input) =>
        enumerableAccessor(input.observedConfig, "projects", [...input.observedConfig.projects])),
      runtimeCase("retries accessor", (input) => enumerableAccessor(input.observedConfig, "retries", 0)),
      runtimeCase("workers accessor", (input) => enumerableAccessor(input.observedConfig, "workers", 1)),
    ],
  },
  {
    name: "projects rejects toJSON, extra keys, symbols, accessors, and custom prototypes",
    cases: [
      runtimeCase("deceptive projects toJSON", (input) => {
        input.observedConfig.projects = ["desktop-chrome"];
        hiddenData(input.observedConfig.projects, "toJSON", () => [
          "desktop-chrome",
          "mobile-chrome",
        ]);
      }),
      runtimeCase("projects enumerable extra", (input) => {
        input.observedConfig.projects.selector = "desktop-chrome";
      }),
      runtimeCase("projects hidden extra", (input) =>
        hiddenData(input.observedConfig.projects, "selector", "desktop-chrome")),
      runtimeCase("projects symbol extra", (input) => {
        input.observedConfig.projects[Symbol("selector")] = "desktop-chrome";
      }),
      runtimeCase("projects index accessor", (input) =>
        enumerableAccessor(input.observedConfig.projects, "0", "desktop-chrome")),
      runtimeCase("projects custom prototype", (input) => {
        Object.setPrototypeOf(input.observedConfig.projects, Object.create(Array.prototype));
      }),
    ],
  },
  {
    name: "environment selector prefixes are rejected case-insensitively",
    cases: [
      runtimeCase("lower china selector", (input) => { input.inheritedEnvironment.china_viz_profile = "x"; }),
      runtimeCase("mixed Playwright project", (input) => { input.inheritedEnvironment.PlayWright_Project = "x"; }),
      runtimeCase("lower pwtest", (input) => { input.inheritedEnvironment.pwtest_filter = "x"; }),
      runtimeCase("mixed group runner", (input) => { input.inheritedEnvironment.Mais_G07_Runner_Profile = "x"; }),
    ],
  },
  {
    name: "environment rejects hidden and symbol selectors",
    cases: [
      runtimeCase("hidden selector", (input) =>
        hiddenData(input.inheritedEnvironment, "PLAYWRIGHT_PROJECT", "desktop-chrome")),
      runtimeCase("hidden lower selector", (input) =>
        hiddenData(input.inheritedEnvironment, "china_viz_profile", "dedicated")),
      runtimeCase("hidden selector accessor", (input) => {
        Object.defineProperty(input.inheritedEnvironment, "PLAYWRIGHT_GREP", {
          configurable: true,
          enumerable: false,
          get() { return "G01"; },
        });
      }),
      runtimeCase("symbol selector", (input) => {
        input.inheritedEnvironment[Symbol("PLAYWRIGHT_PROJECT")] = "desktop-chrome";
      }),
    ],
  },
  {
    name: "environment rejects custom prototypes and inherited selectors",
    cases: [
      runtimeCase("prototype upper selector", (input) => {
        Object.setPrototypeOf(input.inheritedEnvironment, { PLAYWRIGHT_PROJECT: "desktop-chrome" });
      }),
      runtimeCase("prototype lower selector", (input) => {
        Object.setPrototypeOf(input.inheritedEnvironment, { china_viz_profile: "dedicated" });
      }),
      runtimeCase("prototype caller profile", (input) => {
        Object.setPrototypeOf(input.inheritedEnvironment, { callerProfileId: "dedicated" });
      }),
    ],
  },
];

const reviewerDefinitionExactnessCategories = [
  {
    name: "definition root rejects authority hidden by descriptors or prototype",
    cases: [
      definitionCase("prototype authority", (candidate) => {
        Object.setPrototypeOf(candidate, { authority: true });
      }),
      definitionCase("hidden authority", (candidate) => hiddenData(candidate, "authority", true)),
      definitionCase("hidden toJSON", (candidate) => hiddenData(candidate, "toJSON", () => candidate)),
      definitionCase("symbol authority", (candidate) => {
        Object.defineProperty(candidate, Symbol("authority"), {
          enumerable: false,
          value: true,
        });
      }),
      definitionCase("profileId accessor", (candidate) =>
        enumerableAccessor(candidate, "profileId", "dedicated-g01-g02-g07")),
      definitionCase("authority accessor", (candidate) =>
        enumerableAccessor(candidate, "authority", false)),
    ],
  },
  {
    name: "definition nested records and arrays reject descriptor and prototype extras",
    cases: [
      definitionCase("hidden count authority", (candidate) =>
        hiddenData(candidate.groupLabCounts, "authority", true)),
      definitionCase("count prototype authority", (candidate) => {
        Object.setPrototypeOf(candidate.groupLabCounts, { authority: true });
      }),
      definitionCase("projects hidden selector", (candidate) =>
        hiddenData(candidate.projects, "selector", "desktop-chrome")),
      definitionCase("projects symbol selector", (candidate) => {
        Object.defineProperty(candidate.projects, Symbol("selector"), {
          enumerable: false,
          value: "desktop-chrome",
        });
      }),
      definitionCase("projects index accessor", (candidate) =>
        enumerableAccessor(candidate.projects, "0", "desktop-chrome")),
      definitionCase("attachment accessor", (candidate) =>
        enumerableAccessor(candidate.expectedResultAttachments[0], "project", "desktop-chrome")),
      definitionCase("attachment hidden authority", (candidate) =>
        hiddenData(candidate.expectedResultAttachments[0], "authority", true)),
      definitionCase("attachment array custom prototype", (candidate) => {
        Object.setPrototypeOf(
          candidate.expectedResultAttachments,
          Object.create(Array.prototype),
        );
      }),
    ],
  },
];

const reviewerAdversarialCategories = [
  ...reviewerRuntimeExactnessCategories,
  ...reviewerDefinitionExactnessCategories,
];
const reviewerAdversarialCaseCount = reviewerAdversarialCategories.reduce(
  (count, category) => count + category.cases.length,
  0,
);
assert.equal(reviewerAdversarialCategories.length, 12);
assert.equal(reviewerAdversarialCaseCount >= 32, true);

for (const category of reviewerAdversarialCategories) {
  test(`reviewer exact-structure category: ${category.name}`, () => {
    for (const adversarialCase of category.cases) {
      assert.throws(adversarialCase.run(), TypeError, adversarialCase.label);
    }
  });
}

test("ordinary Object.prototype and null-prototype records remain accepted plumbing", () => {
  const input = dedicatedInput();
  input.inheritedEnvironment = Object.assign(Object.create(null), {
    SAFE_UNRELATED_ENVIRONMENT: "1",
  });
  input.observedConfig = Object.assign(Object.create(null), input.observedConfig);
  Object.setPrototypeOf(input, null);
  assert.equal(
    validateDedicatedG01G02G07RunInputUntrusted(input),
    getDedicatedG01G02G07RunProfileUntrusted(),
  );

  const candidate = structuredClone(getDedicatedG01G02G07RunProfileUntrusted());
  Object.setPrototypeOf(candidate, null);
  Object.setPrototypeOf(candidate.groupLabCounts, null);
  assert.equal(
    validateChinaVisualizationNativeRunProfileDefinitionUntrusted(candidate),
    getDedicatedG01G02G07RunProfileUntrusted(),
  );
});
