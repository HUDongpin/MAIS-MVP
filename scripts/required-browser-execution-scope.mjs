import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync
} from "node:fs";
import { createRequire } from "node:module";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep
} from "node:path";

import ts from "typescript";

import { validateActiveBrowserDependencyProof } from "./active-browser-dependency-proof.mjs";
import {
  assertLiveHomeEnvironmentValue,
  assertLiveHomeProof,
  liveHomeValueSha256,
  requiredBrowserEnvironmentValueSha256
} from "./live-home-protection.mjs";

export { requiredBrowserEnvironmentValueSha256 };

const SCHEMA_VERSION = 1;
const SCOPE_MODES = Object.freeze(["discovery", "required-matrix", "static-no-browser"]);
const SOURCE_EXTENSIONS = Object.freeze([
  ".cjs",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".py",
  ".sh",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml"
]);
const REPOSITORY_SCAN_EXCLUSIONS = Object.freeze(new Set([
  ".git",
  ".local",
  ".next",
  ".tmp",
  "node_modules",
  "public",
  "session-logs"
]));

const ECMA_SOURCE_EXTENSIONS = Object.freeze(new Set([
  ".cjs", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"
]));
const CHILD_PROCESS_MODULES = Object.freeze(new Set(["child_process", "node:child_process"]));
const FILESYSTEM_MODULES = Object.freeze(new Set([
  "fs", "fs/promises", "node:fs", "node:fs/promises"
]));
const CHILD_PROCESS_MEMBERS = Object.freeze(new Set([
  "exec", "execFile", "execFileSync", "execSync", "fork", "spawn", "spawnSync"
]));
const FILESYSTEM_DELETE_MEMBERS = Object.freeze(new Set([
  "rm", "rmSync", "rmdir", "rmdirSync", "unlink", "unlinkSync"
]));
const BROWSER_MODULES = Object.freeze(new Set([
  "@playwright/test", "playwright", "playwright-core", "puppeteer", "puppeteer-core"
]));
const NETWORK_MODULES = Object.freeze(new Set([
  "dgram", "dns", "http", "http2", "https", "net",
  "node:dgram", "node:dns", "node:http", "node:http2", "node:https", "node:net", "node:tls",
  "tls", "undici"
]));
const DYNAMIC_CODE_MODULES = Object.freeze(new Set(["node:vm", "vm"]));
const FILESYSTEM_READ_MEMBERS = Object.freeze(new Set([
  "access", "accessSync", "createReadStream", "existsSync", "lstat", "lstatSync",
  "opendir", "opendirSync", "read", "readFile", "readFileSync", "readdir", "readdirSync",
  "readlink", "readlinkSync", "realpath", "realpathSync", "stat", "statSync"
]));
const FILESYSTEM_WRITE_MEMBERS = Object.freeze(new Set([
  "appendFile", "appendFileSync", "chmod", "chmodSync", "chown", "chownSync",
  "copyFile", "copyFileSync", "createWriteStream", "link", "linkSync", "mkdir", "mkdirSync",
  "mkdtemp", "mkdtempSync", "open", "openSync", "rename", "renameSync", "symlink",
  "symlinkSync", "truncate", "truncateSync", "utimes", "utimesSync", "write", "writeFile",
  "writeFileSync"
]));
const SHELL_EXECUTABLE_BASENAMES = Object.freeze(new Set([
  "bash", "cmd", "cmd.exe", "dash", "fish", "ksh", "powershell", "powershell.exe", "pwsh",
  "sh", "zsh"
]));
const BROWSER_CALL_MEMBERS = Object.freeze(new Set([
  "connect", "connectOverCDP", "launch", "launchPersistentContext"
]));
const CAPABILITY_CLASSES = Object.freeze([
  "browser", "dynamic-code", "filesystem-delete", "filesystem-read", "filesystem-write",
  "network", "shell", "subprocess", "unknown"
]);
const DEFAULT_FORBIDDEN_CAPABILITIES = Object.freeze(["dynamic-code", "unknown"]);
const PROD_CERTIFICATION_FORBIDDEN_CAPABILITIES = Object.freeze([
  "browser", "dynamic-code", "filesystem-delete", "filesystem-write", "network", "shell",
  "subprocess", "unknown"
]);
const TEST_HARNESS_FILES = Object.freeze([
  "scripts/bug3-owner-run-plan.test.mjs",
  "scripts/playwright-owner-paths.test.mjs",
  "scripts/provision-exact-browser-dependencies.test.mjs",
  "scripts/required-browser-config-authority.test.mjs",
  "scripts/required-browser-execution-scope.test.mjs",
  "scripts/required-browser-runner.test.mjs",
  "scripts/test-fixture-capability.test.mjs"
]);
const CAPABILITY_INERT_DATA_FILES = Object.freeze([
  ...TEST_HARNESS_FILES,
  "scripts/required-browser-source-canary.test.mjs",
  "tests/e2e/reported-bug-source-regressions.test.ts"
].sort());
const DENIED_ARGUMENT_PATTERNS = Object.freeze([
  "NODE_PATH",
  "command-substitution",
  "git-other-than-diff-check",
  "node-eval-without-exact-test-source-hash",
  "node_modules/.bin",
  "playwright-codegen",
  "playwright-debug",
  "playwright-headed",
  "playwright-install",
  "playwright-show-report",
  "playwright-ui",
  "shell-control-or-redirection"
].sort());
const DENIED_EXECUTABLE_BASENAMES = Object.freeze([
  "bash", "bun", "curl", "find", "fish", "npm", "npx", "osascript", "pnpm",
  "python", "python3", "rmdir", "rm", "sh", "sudo", "wget", "xargs", "yarn", "zsh"
].sort());
const COMPUTED_LOCAL_IMPORT_BINDINGS = Object.freeze([
  Object.freeze({
    expression: "runnerUrl.href",
    file: "tests/e2e/reported-bug-source-regressions.test.ts",
    target: "scripts/run-required-frontend-browser-contracts.mjs"
  }),
  Object.freeze({
    expression: "configUrl.href",
    file: "tests/e2e/reported-bug-source-regressions.test.ts",
    target: "playwright.config.ts"
  })
]);
const PROD_CERTIFICATION_UNIT_COMMAND_ID = "static.prod-certification-unit";
const PROD_CERTIFICATION_UNIT_SCRIPT = "scripts/prod-certification.test.mjs";
const PROD_CERTIFICATION_TRANSITIVE_TRUSTED_SOURCES = Object.freeze([
  "scripts/prod-certification-core.mjs",
  "scripts/required-browser-execution-scope.mjs"
]);
const NEXT_CONFIG_TRANSITIVE_TRUSTED_SOURCES = Object.freeze([
  "next.config.ts",
  "scripts/next-config-read-only-authority.d.mts",
  "scripts/next-config-read-only-authority.mjs",
  "scripts/next-config-read-only-importer.mjs"
]);
const REQUIRED_BROWSER_STATIC_ENVIRONMENT_KEYS = Object.freeze([
  "CI",
  "HOME",
  "LANG",
  "LC_ALL",
  "MAIS_BROWSER_OWNER_TOKEN",
  "MAIS_REQUIRED_BROWSER_COMMAND_CATALOG_SHA256",
  "MAIS_REQUIRED_BROWSER_COMMAND_ID",
  "MAIS_REQUIRED_BROWSER_DESCRIPTOR_SHA256",
  "MAIS_REQUIRED_BROWSER_EXECUTION_SCOPE_FINGERPRINT",
  "MAIS_REQUIRED_BROWSER_PLAN_FINGERPRINT",
  "MAIS_REQUIRED_BROWSER_RUN_ID",
  "NODE_COMPILE_CACHE",
  "TEMP",
  "TMP",
  "TMPDIR",
  "TZ",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME"
]);
const REQUIRED_BROWSER_STATIC_PATH_ENVIRONMENT_KEYS = Object.freeze([
  "NODE_COMPILE_CACHE",
  "TEMP",
  "TMP",
  "TMPDIR",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME"
]);
const REQUIRED_BROWSER_STATIC_DIGEST_ENVIRONMENT_KEYS = Object.freeze([
  "MAIS_REQUIRED_BROWSER_COMMAND_CATALOG_SHA256",
  "MAIS_REQUIRED_BROWSER_DESCRIPTOR_SHA256",
  "MAIS_REQUIRED_BROWSER_EXECUTION_SCOPE_FINGERPRINT",
  "MAIS_REQUIRED_BROWSER_PLAN_FINGERPRINT"
]);
const REQUIRED_BROWSER_STATIC_EXACT_ENVIRONMENT = Object.freeze({
  CI: "1",
  LANG: "C.UTF-8",
  LC_ALL: "C.UTF-8",
  MAIS_REQUIRED_BROWSER_COMMAND_ID: PROD_CERTIFICATION_UNIT_COMMAND_ID,
  TZ: "UTC"
});
const REQUIRED_BROWSER_STATIC_OVERRIDE_PATTERN = /^(?:BROWSER|CHROME|CHROMIUM|NEXT_|NODE_|NPM_CONFIG_|npm_config_|PLAYWRIGHT_|PUPPETEER_|TEMP$|TMP$|TMPDIR$|TURBO_|XDG_)/;

export const REQUIRED_BROWSER_PROOF_INPUT_FILES = Object.freeze([
  ".github/workflows/ci.yml",
  "app/api/assessments/[assessmentId]/submit/route.ts",
  "app/api/attempts/route.ts",
  "app/student/assessments/[assessmentId]/page.tsx",
  "components/lesson/LessonView.tsx",
  "components/practice/HandwritingAnswerBoard.tsx",
  "components/practice/MathSoftKeyboard.tsx",
  "components/practice/PracticeQuestionCard.tsx",
  "components/visualizations/three/manim/mathSceneV2OwnerGateRerunCommandPacket.test.ts",
  "components/visualizations/three/manim/mathSceneV2OwnerGateRerunCommandPacket.ts",
  "components/visualizations/visualizationBrowserRegressionEvidence.ts",
  "components/visualizations/visualizationDiagnostics.ts",
  "coordination/content-qa/mainland-pep-junior-gpt-image2-generation/render-question-overlays.mjs",
  "coordination/content-qa/us-ca-math-rag-v2-candidate/run-s11-candidate-preview-smoke.mjs",
  "data/visualizationLabs.ts",
  "lib/answerLimits.ts",
  "lib/answerUnits.ts",
  "lib/exactScalarArithmetic.ts",
  "lib/mathSoftKeyboardCalculation.ts",
  "lib/questionBankSolvability.ts",
  "lib/server/answerMatching.ts",
  "lib/server/questionStore.ts",
  "lib/server/userStore/teacherOpsSubmissionPersistence.ts",
  "next-env.d.ts",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "playwright.config.ts",
  "postcss.config.mjs",
  "scripts/active-browser-dependency-proof.mjs",
  "scripts/active-browser-dependency-proof.test-helper.mjs",
  "scripts/browser-host-geometry.mjs",
  "scripts/bug3-owner-run-plan.test.mjs",
  "scripts/dashboard-ui-loading-smoke.mjs",
  "scripts/live-home-protection.d.mts",
  "scripts/live-home-protection.mjs",
  "scripts/next-config-read-only-authority.d.mts",
  "scripts/next-config-read-only-authority.mjs",
  "scripts/next-config-read-only-importer.mjs",
  "scripts/owned-dependency-command-launcher.mjs",
  "scripts/playwright-owner-paths.d.mts",
  "scripts/playwright-owner-paths.mjs",
  "scripts/playwright-owner-paths.test.mjs",
  "scripts/prod-certification-core.mjs",
  "scripts/prod-certification-runtime.mjs",
  "scripts/prod-certification.mjs",
  "scripts/prod-certification.test.mjs",
  "scripts/provision-exact-browser-dependencies.mjs",
  "scripts/provision-exact-browser-dependencies.test.mjs",
  "scripts/reject-direct-browser-entry.mjs",
  "scripts/required-browser-config-authority.test.mjs",
  "scripts/required-browser-execution-scope.d.mts",
  "scripts/required-browser-execution-scope.mjs",
  "scripts/required-browser-execution-scope.test.mjs",
  "scripts/required-browser-runner.test.mjs",
  "scripts/required-browser-source-canary.test.mjs",
  "scripts/run-required-frontend-browser-contracts.mjs",
  "scripts/test-fixture-capability.mjs",
  "scripts/test-fixture-capability.test.mjs",
  "scripts/verify-google-oauth-slice.mjs",
  "tailwind.config.ts",
  "tests/e2e/helpers.ts",
  "tests/e2e/lesson-world-menu.spec.ts",
  "tests/e2e/practice-math-keyboard.spec.ts",
  "tests/e2e/reported-bug-source-regressions.test.ts",
  "tests/e2e/visualization-contract.spec.ts",
  "tsconfig.json"
].sort());

const visualizationContract = Object.freeze({
  contractId: "visualization.runtime",
  expectedSelected: 3,
  file: "tests/e2e/visualization-contract.spec.ts",
  grep: "Visualization Lab runtime-ready DOM contract",
  label: "Visualization Lab",
  minimumSelected: 3
});
const keyboardRequiredContract = Object.freeze({
  contractId: "keyboard.required",
  expectedSelected: 2,
  file: "tests/e2e/practice-math-keyboard.spec.ts",
  grep: "Practice math keyboard required gate",
  label: "Practice math keyboard required behavior",
  minimumSelected: 2
});
const keyboardResponsiveContract = Object.freeze({
  allowedMobileSkipTitle:
    "Practice math keyboard responsive layout gate › opening and closing in a lesson leaves the desktop directory fixed",
  contractId: "keyboard.responsive",
  expectedSelected: 2,
  file: "tests/e2e/practice-math-keyboard.spec.ts",
  grep: "Practice math keyboard responsive layout gate",
  label: "Practice math keyboard responsive layout",
  minimumSelected: 2
});
const bug3DesktopLessonPaneContract = Object.freeze({
  contractId: "bug3.lesson.desktop",
  expectedSelected: 6,
  file: "tests/e2e/lesson-world-menu.spec.ts",
  grep: "Bug 3 desktop lesson pane contract",
  label: "Bug 3 desktop lesson pane ownership",
  minimumPassed: 6,
  minimumSelected: 6
});
const bug3MobileLessonFlowContract = Object.freeze({
  contractId: "bug3.lesson.mobile",
  expectedSelected: 1,
  file: "tests/e2e/lesson-world-menu.spec.ts",
  grep: "Bug 3 mobile lesson flow contract",
  label: "Bug 3 mobile lesson document flow",
  minimumPassed: 1,
  minimumSelected: 1
});

function canonicalTypedSlots() {
  return stableValue({
    declaredMjs: {
      enum: REQUIRED_BROWSER_PROOF_INPUT_FILES.filter((file) => file.endsWith(".mjs")),
      grammar: "declared proof-input .mjs path"
    },
    grep: { grammar: "exact execution-matrix grep" },
    project: { enum: ["desktop-chrome", "mobile-chrome"], grammar: "exact project" },
    provenOwnedPid: { grammar: "safe integer >1 in validated owned identity registry" },
    requiredConfig: { grammar: "exact plan-owned required config path" },
    servicePort: { grammar: "safe integer 32000..41999 equal to plan port" },
    spec: { grammar: "exact execution-matrix spec" }
  });
}

export const REQUIRED_BROWSER_EXECUTION_MATRIX = Object.freeze([
  Object.freeze({
    contracts: Object.freeze([
      visualizationContract,
      keyboardRequiredContract,
      keyboardResponsiveContract,
      bug3DesktopLessonPaneContract
    ]),
    project: "desktop-chrome"
  }),
  Object.freeze({
    contracts: Object.freeze([keyboardResponsiveContract, bug3MobileLessonFlowContract]),
    project: "mobile-chrome"
  })
]);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
  );
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalCapabilityRuleset() {
  const ruleset = {
    browserCallMembers: [...BROWSER_CALL_MEMBERS].sort(),
    browserModules: [...BROWSER_MODULES].sort(),
    capabilityClasses: [...CAPABILITY_CLASSES],
    childProcessMembers: [...CHILD_PROCESS_MEMBERS].sort(),
    childProcessModules: [...CHILD_PROCESS_MODULES].sort(),
    defaultForbiddenCapabilities: [...DEFAULT_FORBIDDEN_CAPABILITIES],
    dynamicCodeModules: [...DYNAMIC_CODE_MODULES].sort(),
    filesystemDeleteMembers: [...FILESYSTEM_DELETE_MEMBERS].sort(),
    filesystemModules: [...FILESYSTEM_MODULES].sort(),
    filesystemReadMembers: [...FILESYSTEM_READ_MEMBERS].sort(),
    filesystemWriteMembers: [...FILESYSTEM_WRITE_MEMBERS].sort(),
    inertDataFiles: [...CAPABILITY_INERT_DATA_FILES],
    networkModules: [...NETWORK_MODULES].sort(),
    prodCertificationForbiddenCapabilities: [...PROD_CERTIFICATION_FORBIDDEN_CAPABILITIES],
    schemaVersion: 1,
    shellExecutableBasenames: [...SHELL_EXECUTABLE_BASENAMES].sort()
  };
  return Object.freeze(stableValue({
    ...ruleset,
    sha256: sha256(`capability-ruleset\0${stableJson(ruleset)}`)
  }));
}

function sha256File(filePath) {
  return sha256(readFileSync(filePath));
}

function hashObject(value, omittedKey = "sha256") {
  const source = { ...value };
  delete source[omittedKey];
  return sha256(stableJson(source));
}

function domainHashObject(domain, value, omittedKey = "sha256") {
  const source = { ...value };
  delete source[omittedKey];
  return sha256(`${domain}\0${stableJson(source)}`);
}

function sameJson(left, right) {
  return stableJson(left) === stableJson(right);
}

function assertExactKeys(label, value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (!sameJson(actual, expected)) {
    throw new Error(`${label} keys differ from the canonical schema.`);
  }
}

function canonicalRepoRoot(repoRoot) {
  if (typeof repoRoot !== "string" || !isAbsolute(repoRoot)) {
    throw new Error("Execution-scope repoRoot must be absolute.");
  }
  const absolute = resolve(repoRoot);
  const entry = lstatSync(absolute, { throwIfNoEntry: false });
  if (!entry?.isDirectory() || entry.isSymbolicLink() || realpathSync(absolute) !== absolute) {
    throw new Error("Execution-scope repoRoot must be a canonical physical directory.");
  }
  return absolute;
}

function canonicalRepoFile(repoRoot, relativePath) {
  if (
    typeof relativePath !== "string"
    || relativePath === ""
    || isAbsolute(relativePath)
    || relativePath.split(/[\\/]/).includes("..")
  ) {
    throw new Error(`Execution-scope file path is invalid: ${String(relativePath)}`);
  }
  const absolute = resolve(repoRoot, relativePath);
  if (!absolute.startsWith(`${repoRoot}${sep}`)) {
    throw new Error(`Execution-scope file escaped the repository: ${relativePath}`);
  }
  const entry = lstatSync(absolute, { throwIfNoEntry: false });
  if (!entry?.isFile() || entry.isSymbolicLink() || realpathSync(absolute) !== absolute) {
    throw new Error(`Execution-scope input must be a canonical regular file: ${relativePath}`);
  }
  return absolute;
}

function staticEnvironmentSemanticClass(key) {
  if (key === "HOME") return "home-hash";
  if (REQUIRED_BROWSER_STATIC_PATH_ENVIRONMENT_KEYS.includes(key)) return "owner-path";
  if (REQUIRED_BROWSER_STATIC_DIGEST_ENVIRONMENT_KEYS.includes(key)) return "sha256-digest";
  if (key === "MAIS_BROWSER_OWNER_TOKEN" || key === "MAIS_REQUIRED_BROWSER_RUN_ID") {
    return "owner-identity";
  }
  if (key === "MAIS_REQUIRED_BROWSER_COMMAND_ID") return "command-id";
  return "exact-literal";
}

function requiredBrowserStaticEnvironmentPolicy() {
  const policy = {
    allowedKeys: [...REQUIRED_BROWSER_STATIC_ENVIRONMENT_KEYS],
    digestKeys: [...REQUIRED_BROWSER_STATIC_DIGEST_ENVIRONMENT_KEYS],
    exactLiterals: { ...REQUIRED_BROWSER_STATIC_EXACT_ENVIRONMENT },
    homeKey: "HOME",
    identityKeys: ["MAIS_BROWSER_OWNER_TOKEN", "MAIS_REQUIRED_BROWSER_RUN_ID"],
    inheritAmbient: false,
    pathOwningKeys: [...REQUIRED_BROWSER_STATIC_PATH_ENVIRONMENT_KEYS],
    schemaVersion: 1
  };
  return Object.freeze(stableValue({
    ...policy,
    sha256: sha256(`env-policy\0${stableJson(policy)}`)
  }));
}

function requiredBrowserEnvironmentInventorySha256(entries) {
  return sha256(`env-inventory\0${stableJson({ entries, schemaVersion: 1 })}`);
}

export function validateRequiredBrowserStaticEnvironmentBindingSnapshot(binding) {
  assertExactKeys("required-browser static environment binding", binding, [
    "entries", "inventorySha256", "schemaVersion"
  ]);
  if (binding.schemaVersion !== 1 || !Array.isArray(binding.entries)) {
    throw new Error("Required-browser static environment binding schema is invalid.");
  }
  if (binding.entries.length !== REQUIRED_BROWSER_STATIC_ENVIRONMENT_KEYS.length) {
    throw new Error("Required-browser static environment binding is incomplete.");
  }
  for (let index = 0; index < REQUIRED_BROWSER_STATIC_ENVIRONMENT_KEYS.length; index += 1) {
    const expectedKey = REQUIRED_BROWSER_STATIC_ENVIRONMENT_KEYS[index];
    const entry = binding.entries[index];
    assertExactKeys(`required-browser static environment entry ${expectedKey}`, entry, [
      "key", "semanticClass", "valueSha256"
    ]);
    if (
      entry.key !== expectedKey
      || entry.semanticClass !== staticEnvironmentSemanticClass(expectedKey)
      || typeof entry.valueSha256 !== "string"
      || !/^[a-f0-9]{64}$/.test(entry.valueSha256)
    ) {
      throw new Error(`Required-browser static environment entry ${expectedKey} is invalid.`);
    }
  }
  if (binding.inventorySha256 !== requiredBrowserEnvironmentInventorySha256(binding.entries)) {
    throw new Error("Required-browser static environment inventory fingerprint is invalid.");
  }
  return Object.freeze(stableValue(binding));
}

export function validateAndHashRequiredBrowserStaticEnvironment({
  environment,
  homeValueSha256,
  liveHomeProof,
  ownerRoot
}) {
  if (
    !environment
    || typeof environment !== "object"
    || Array.isArray(environment)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(environment))
  ) {
    throw new Error("Required-browser static child environment must be a plain exact object.");
  }
  if (Object.prototype.hasOwnProperty.call(environment, "NODE_PATH")) {
    throw new Error("NODE_PATH is prohibited in the required-browser static child environment.");
  }
  for (const key of Object.keys(environment)) {
    if (
      REQUIRED_BROWSER_STATIC_OVERRIDE_PATTERN.test(key)
      && !REQUIRED_BROWSER_STATIC_ENVIRONMENT_KEYS.includes(key)
    ) {
      throw new Error(`Unlisted writable or resolution override is prohibited: ${key}`);
    }
  }
  if (!sameJson(Object.keys(environment), REQUIRED_BROWSER_STATIC_ENVIRONMENT_KEYS)) {
    throw new Error("Required-browser static raw child environment key order is not canonical.");
  }
  assertExactKeys(
    "required-browser static raw child environment",
    environment,
    REQUIRED_BROWSER_STATIC_ENVIRONMENT_KEYS
  );
  if (typeof homeValueSha256 !== "string" || !/^[a-f0-9]{64}$/.test(homeValueSha256)) {
    throw new Error("Required-browser static HOME hash binding is missing or invalid.");
  }
  assertLiveHomeProof(liveHomeProof, { expectedHomeValueSha256: homeValueSha256 });
  assertLiveHomeEnvironmentValue(liveHomeProof, environment.HOME);
  if (typeof ownerRoot !== "string" || !isAbsolute(ownerRoot) || resolve(ownerRoot) !== ownerRoot) {
    throw new Error("Required-browser static owner root must be an absolute canonical path.");
  }
  const ownerEntry = lstatSync(ownerRoot, { throwIfNoEntry: false });
  if (!ownerEntry?.isDirectory() || ownerEntry.isSymbolicLink() || realpathSync(ownerRoot) !== ownerRoot) {
    throw new Error("Required-browser static owner root must be a physical canonical directory.");
  }

  const entries = REQUIRED_BROWSER_STATIC_ENVIRONMENT_KEYS.map((key) => {
    const value = environment[key];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`Required-browser static environment key ${key} must be a non-empty string.`);
    }
    const semanticClass = staticEnvironmentSemanticClass(key);
    if (semanticClass === "owner-path") {
      if (!isAbsolute(value) || resolve(value) !== value) {
        throw new Error(`Required-browser static owner-path key ${key} is not canonical.`);
      }
      const entry = lstatSync(value, { throwIfNoEntry: false });
      const relativePath = relative(ownerRoot, value);
      if (
        !entry?.isDirectory()
        || entry.isSymbolicLink()
        || realpathSync(value) !== value
        || relativePath === ""
        || relativePath.startsWith("..")
        || isAbsolute(relativePath)
      ) {
        throw new Error(`Required-browser static owner-path key ${key} escaped its owner root.`);
      }
    } else if (semanticClass === "home-hash") {
      assertLiveHomeEnvironmentValue(liveHomeProof, value);
      if (requiredBrowserEnvironmentValueSha256(key, value) !== homeValueSha256) {
        throw new Error("Required-browser static HOME hash differs from its immutable preflight binding.");
      }
    } else if (semanticClass === "sha256-digest") {
      if (!/^[a-f0-9]{64}$/.test(value)) {
        throw new Error(`Required-browser static digest key ${key} is malformed.`);
      }
    } else if (key === "MAIS_BROWSER_OWNER_TOKEN") {
      if (!/^[a-f0-9]{64}$/.test(value)) {
        throw new Error("Required-browser static owner token is malformed.");
      }
    } else if (key === "MAIS_REQUIRED_BROWSER_RUN_ID") {
      if (!/^bug3-owner-[a-f0-9]{64}$/.test(value)) {
        throw new Error("Required-browser static run ID is malformed.");
      }
    } else if (value !== REQUIRED_BROWSER_STATIC_EXACT_ENVIRONMENT[key]) {
      throw new Error(`Required-browser static exact-literal key ${key} differs from policy.`);
    }
    return {
      key,
      semanticClass,
      valueSha256: requiredBrowserEnvironmentValueSha256(key, value)
    };
  });
  return validateRequiredBrowserStaticEnvironmentBindingSnapshot({
    entries,
    inventorySha256: requiredBrowserEnvironmentInventorySha256(entries),
    schemaVersion: 1
  });
}

function attestRepoSource(repoRoot, relativePath) {
  const canonicalPath = canonicalRepoFile(repoRoot, relativePath);
  return Object.freeze({
    canonicalPath,
    path: relativePath,
    sha256: sha256File(canonicalPath)
  });
}

export function requiredBrowserSourceFingerprints(repoRoot = process.cwd()) {
  const canonicalRoot = canonicalRepoRoot(repoRoot);
  return Object.freeze(Object.fromEntries(
    REQUIRED_BROWSER_PROOF_INPUT_FILES.map((file) => [
      file,
      sha256File(canonicalRepoFile(canonicalRoot, file))
    ])
  ));
}

export function assertRequiredBrowserSourceFingerprintsUnchanged(
  repoRoot,
  expectedFingerprints
) {
  assertExactKeys(
    "required-browser source fingerprints",
    expectedFingerprints,
    REQUIRED_BROWSER_PROOF_INPUT_FILES
  );
  const actual = requiredBrowserSourceFingerprints(repoRoot);
  if (!sameJson(actual, expectedFingerprints)) {
    throw new Error("Required-browser proof inputs changed after scope validation.");
  }
  return actual;
}

function attestExecutable(candidate, role, expectedSha256 = null) {
  if (typeof candidate !== "string" || !isAbsolute(candidate)) {
    throw new Error(`${role} executable path must be absolute.`);
  }
  const canonicalPath = realpathSync(resolve(candidate));
  const entry = lstatSync(canonicalPath, { throwIfNoEntry: false });
  if (!entry?.isFile() || entry.isSymbolicLink()) {
    throw new Error(`${role} executable must be a canonical regular file.`);
  }
  const actualSha256 = sha256File(canonicalPath);
  if (expectedSha256 && actualSha256 !== expectedSha256) {
    throw new Error(`${role} executable hash differs from dependency attestation.`);
  }
  return Object.freeze({
    canonicalPath,
    dev: String(entry.dev),
    ino: String(entry.ino),
    role,
    sha256: actualSha256
  });
}

function validatedDependencyCommands(repoRoot, dependencyAttestation) {
  const validated = validateActiveBrowserDependencyProof(dependencyAttestation, { repoRoot });
  if (
    validated?.schemaVersion !== 2
    || validated.status !== "passed"
    || !/^[a-f0-9]{64}$/.test(validated.attestationFingerprint ?? "")
  ) {
    throw new Error("Execution scope requires a passed schema-v2 dependency attestation.");
  }
  const nodeModulesRoot = validated.nodeModules?.canonicalRoot;
  const nodeModulesEntry = lstatSync(nodeModulesRoot, { throwIfNoEntry: false });
  if (
    nodeModulesRoot !== join(repoRoot, "node_modules")
    || !nodeModulesEntry?.isDirectory()
    || nodeModulesEntry.isSymbolicLink()
    || realpathSync(nodeModulesRoot) !== nodeModulesRoot
    || String(nodeModulesEntry.dev) !== validated.nodeModules?.identity?.dev
    || String(nodeModulesEntry.ino) !== validated.nodeModules?.identity?.ino
  ) {
    throw new Error("Execution-scope node_modules identity differs from dependency attestation.");
  }
  const cli = (label) => {
    const proof = validated.critical?.clis?.[label];
    const canonicalPath = proof?.canonicalPath;
    if (
      typeof canonicalPath !== "string"
      || !canonicalPath.startsWith(`${nodeModulesRoot}${sep}`)
      || realpathSync(canonicalPath) !== canonicalPath
    ) {
      throw new Error(`Execution-scope ${label} CLI escaped the active dependency tree.`);
    }
    return attestExecutable(canonicalPath, label, proof.sha256);
  };
  return Object.freeze({
    attestation: validated,
    next: cli("next"),
    playwrightCore: cli("playwrightCore"),
    playwrightTest: cli("playwrightTest")
  });
}

function literal(value) {
  return Object.freeze({ kind: "literal", value });
}

function slot(name, prefix = "") {
  return Object.freeze({ kind: "validated-slot", name, prefix });
}

function matrixBindings() {
  return REQUIRED_BROWSER_EXECUTION_MATRIX.flatMap(({ contracts, project }) =>
    contracts.map(({ contractId, file, grep }) => ({ contractId, grep, project, spec: file }))
  ).sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
}

function finalizeCommandDescriptor(definition) {
  const descriptor = stableValue({ ...definition, descriptorFingerprint: "" });
  descriptor.descriptorFingerprint = sha256(
    `command-descriptor\0${stableJson({ ...descriptor, descriptorFingerprint: undefined })}`
  );
  return Object.freeze(stableValue(descriptor));
}

function commandCatalog(repoRoot, dependencyAttestation) {
  const dependency = validatedDependencyCommands(repoRoot, dependencyAttestation);
  const requireFromRepo = createRequire(join(repoRoot, "package.json"));
  const node = attestExecutable(process.execPath, "node");
  const ps = attestExecutable("/bin/ps", "process-audit");
  const git = attestExecutable("/usr/bin/git", "diff-check");
  const tsx = attestExecutable(realpathSync(requireFromRepo.resolve("tsx/cli")), "tsx-cli");
  const tsc = attestExecutable(realpathSync(requireFromRepo.resolve("typescript/bin/tsc")), "tsc-cli");
  const staticEnvironmentPolicy = requiredBrowserStaticEnvironmentPolicy();
  const prodCertificationUnit = finalizeCommandDescriptor({
    argv: [literal(PROD_CERTIFICATION_UNIT_SCRIPT)],
    capabilities: {
      browserCapable: false,
      networkCapable: false,
      subprocessCapable: false
    },
    cwd: "repo-root",
    entrypointPaths: [PROD_CERTIFICATION_UNIT_SCRIPT],
    environmentBinding: "plan.staticEnvironmentBinding.inventorySha256",
    environmentPolicySha256: staticEnvironmentPolicy.sha256,
    executable: node,
    id: PROD_CERTIFICATION_UNIT_COMMAND_ID,
    ioPolicy: {
      stderr: {
        maxBytes: 262144,
        pathBinding: "plan.evidencePaths.prodCertificationStderrLog",
        sanitizeBeforeWrite: true
      },
      stdin: "ignore",
      stdout: {
        maxBytes: 262144,
        pathBinding: "plan.evidencePaths.prodCertificationStdoutLog",
        sanitizeBeforeWrite: true
      }
    },
    maySpawnCommandIds: [],
    modes: ["static-no-browser"],
    script: attestRepoSource(repoRoot, PROD_CERTIFICATION_UNIT_SCRIPT),
    trustedSources: PROD_CERTIFICATION_TRANSITIVE_TRUSTED_SOURCES.map((file) =>
      attestRepoSource(repoRoot, file)
    ),
    typedSlotNames: []
  });
  const descriptorBoundConfigCommandIds = new Set([
    "owner.next.build",
    "owner.next.service",
    "owner.playwright.discovery",
    "owner.playwright.final"
  ]);
  const definitions = [
    {
      argv: [literal(dependency.next.canonicalPath), literal("build")],
      cwd: "repo-root",
      entrypointPaths: ["scripts/run-required-frontend-browser-contracts.mjs", "next.config.ts"],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executable: node,
      id: "owner.next.build",
      maySpawnCommandIds: [],
      modes: ["required-matrix"],
      trustedSources: NEXT_CONFIG_TRANSITIVE_TRUSTED_SOURCES.map((file) =>
        attestRepoSource(repoRoot, file)
      )
    },
    {
      argv: [
        literal(dependency.next.canonicalPath),
        literal("start"),
        literal("--hostname"),
        literal("127.0.0.1"),
        literal("--port"),
        slot("servicePort")
      ],
      cwd: "repo-root",
      entrypointPaths: ["scripts/run-required-frontend-browser-contracts.mjs", "next.config.ts"],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executable: node,
      id: "owner.next.service",
      maySpawnCommandIds: [],
      modes: ["required-matrix"],
      trustedSources: NEXT_CONFIG_TRANSITIVE_TRUSTED_SOURCES.map((file) =>
        attestRepoSource(repoRoot, file)
      )
    },
    {
      allowedBindings: matrixBindings(),
      argv: [
        literal(dependency.playwrightTest.canonicalPath),
        literal("test"),
        slot("spec"),
        slot("project", "--project="),
        literal("--grep"),
        slot("grep"),
        literal("--list"),
        literal("--reporter=line")
      ],
      cwd: "repo-root",
      entrypointPaths: [
        "playwright.config.ts",
        "scripts/run-required-frontend-browser-contracts.mjs",
        "tests/e2e/lesson-world-menu.spec.ts",
        "tests/e2e/practice-math-keyboard.spec.ts",
        "tests/e2e/visualization-contract.spec.ts"
      ],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executable: node,
      id: "owner.playwright.discovery",
      maySpawnCommandIds: [],
      modes: ["discovery", "required-matrix"]
    },
    {
      argv: [
        literal(dependency.playwrightTest.canonicalPath),
        literal("test"),
        literal("--config"),
        slot("requiredConfig")
      ],
      cwd: "repo-root",
      entrypointPaths: ["playwright.config.ts", "scripts/run-required-frontend-browser-contracts.mjs"],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executable: node,
      id: "owner.playwright.final",
      maySpawnCommandIds: [],
      modes: ["required-matrix"]
    },
    {
      argv: [literal("-axo"), literal("pid=,ppid=,pgid=,lstart=,command=")],
      cwd: "repo-root",
      entrypointPaths: ["scripts/run-required-frontend-browser-contracts.mjs"],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executable: ps,
      id: "owner.audit.process-table",
      maySpawnCommandIds: [],
      modes: ["discovery", "required-matrix"]
    },
    {
      argv: [literal("eww"), literal("-p"), slot("provenOwnedPid"), literal("-o"), literal("command=")],
      cwd: "repo-root",
      entrypointPaths: ["scripts/run-required-frontend-browser-contracts.mjs"],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executable: ps,
      id: "owner.audit.pid-environment",
      maySpawnCommandIds: [],
      modes: ["discovery", "required-matrix"]
    },
    {
      argv: [literal("eww"), literal("-axo"), literal("pid=,command=")],
      cwd: "repo-root",
      entrypointPaths: ["scripts/run-required-frontend-browser-contracts.mjs"],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executable: ps,
      id: "owner.audit.owner-token-table",
      maySpawnCommandIds: [],
      modes: ["discovery", "required-matrix"]
    },
    {
      argv: [literal("--test"), literal("--test-concurrency=1"), ...TEST_HARNESS_FILES.map(literal)],
      cwd: "repo-root",
      entrypointPaths: [...TEST_HARNESS_FILES],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executable: node,
      id: "static.owner-harness",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    },
    {
      argv: [literal("--test"), literal("scripts/required-browser-source-canary.test.mjs")],
      cwd: "repo-root",
      entrypointPaths: ["scripts/required-browser-source-canary.test.mjs"],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executable: node,
      id: "static.source-canary",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    },
    {
      argv: [
        literal(tsx.canonicalPath),
        literal("--tsconfig"),
        literal("tsconfig.json"),
        literal("--test"),
        literal("tests/e2e/reported-bug-source-regressions.test.ts")
      ],
      cwd: "repo-root",
      entrypointPaths: ["tests/e2e/reported-bug-source-regressions.test.ts"],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executable: node,
      id: "static.source-regressions",
      maySpawnCommandIds: ["static.source-canary"],
      modes: ["static-no-browser"]
    },
    {
      argv: [
        literal(tsx.canonicalPath),
        literal("--test"),
        literal("components/visualizations/three/manim/mathSceneV2OwnerGateRerunCommandPacket.test.ts")
      ],
      cwd: "repo-root",
      entrypointPaths: [
        "components/visualizations/three/manim/mathSceneV2OwnerGateRerunCommandPacket.test.ts"
      ],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executable: node,
      id: "static.command-packet-unit",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    },
    prodCertificationUnit,
    {
      argv: [literal("scripts/dashboard-ui-loading-smoke.mjs"), literal("--self-test")],
      cwd: "repo-root",
      entrypointPaths: ["scripts/dashboard-ui-loading-smoke.mjs"],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executable: node,
      id: "static.dashboard-self-test",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    },
    {
      argv: [literal(tsc.canonicalPath), literal("--noEmit"), literal("--incremental"), literal("false")],
      cwd: "repo-root",
      entrypointPaths: ["tsconfig.json"],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executable: node,
      id: "static.type-check",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    },
    {
      argv: [literal("--check"), slot("declaredMjs")],
      cwd: "repo-root",
      entrypointPaths: [],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executable: node,
      id: "static.node-check",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    },
    {
      argv: [literal("diff"), literal("--check")],
      cwd: "repo-root",
      entrypointPaths: [],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executable: git,
      id: "static.diff-check",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    }
  ].map((definition) =>
    descriptorBoundConfigCommandIds.has(definition.id)
      ? finalizeCommandDescriptor(definition)
      : definition
  ).sort((left, right) => left.id.localeCompare(right.id));
  const catalog = {
    allowedCommandIds: definitions
      .filter(({ modes }) => modes.includes("required-matrix") || modes.includes("discovery") || modes.includes("static-no-browser"))
      .map(({ id }) => id)
      .sort(),
    definitions,
    deniedArgumentPatterns: [...DENIED_ARGUMENT_PATTERNS],
    deniedExecutableBasenames: [...DENIED_EXECUTABLE_BASENAMES],
    sha256: "",
    typedSlots: canonicalTypedSlots()
  };
  catalog.sha256 = hashObject(catalog);
  return Object.freeze({
    catalog: stableValue(catalog),
    dependency,
    staticEnvironmentPolicy
  });
}

function executableRepositoryFiles(repoRoot) {
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === ".DS_Store" || REPOSITORY_SCAN_EXCLUSIONS.has(entry.name)) continue;
      const absolute = join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const relativePath = relative(repoRoot, absolute).replaceAll("\\", "/");
      if (
        SOURCE_EXTENSIONS.includes(extname(entry.name))
        || relativePath === "package.json"
      ) files.push(relativePath);
    }
  };
  walk(repoRoot);
  return files.sort();
}

function resolveLocalModule(repoRoot, fromFile, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = resolve(repoRoot, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(repoRoot, dirname(fromFile), specifier);
  else return null;
  if (!base.startsWith(`${repoRoot}${sep}`)) return { error: "escaped-repository", specifier };
  const candidates = [
    base,
    ...[".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx", ".cjs", ".json"].map((suffix) => `${base}${suffix}`),
    ...["index.ts", "index.tsx", "index.mts", "index.mjs", "index.js"].map((name) => join(base, name))
  ];
  for (const candidate of candidates) {
    const entry = lstatSync(candidate, { throwIfNoEntry: false });
    if (entry?.isFile() && !entry.isSymbolicLink() && realpathSync(candidate) === candidate) {
      return { path: relative(repoRoot, candidate).replaceAll("\\", "/") };
    }
  }
  return { error: "unresolved-local-import", specifier };
}

function scriptKindForFile(file) {
  const extension = extname(file).toLowerCase();
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if ([".ts", ".mts"].includes(extension)) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isAwaitExpression(current)
  ) current = current.expression;
  return current;
}

function staticStringValue(expression) {
  const current = unwrapExpression(expression);
  return ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)
    ? current.text
    : null;
}

function propertyNameValue(expression) {
  const current = unwrapExpression(expression);
  if (ts.isPropertyAccessExpression(current)) return current.name.text;
  if (ts.isElementAccessExpression(current) && current.argumentExpression) {
    return staticStringValue(current.argumentExpression);
  }
  return null;
}

function moduleLoaderSpecifier(expression) {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current) || current.arguments.length !== 1) return null;
  const isRequire = ts.isIdentifier(current.expression) && current.expression.text === "require";
  const isDynamicImport = current.expression.kind === ts.SyntaxKind.ImportKeyword;
  if (!isRequire && !isDynamicImport) return null;
  return staticStringValue(current.arguments[0]);
}

function analyzeEcmaSource(source, file) {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForFile(file)
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    throw new Error(`Execution-scope parser rejected ${file}: ${sourceFile.parseDiagnostics[0].messageText}`);
  }

  const namespaces = new Map();
  const callables = new Map([
    ["eval", { family: "dynamic-code", member: "eval" }],
    ["fetch", { family: "network", member: "fetch" }],
    ["Function", { family: "dynamic-code", member: "Function" }],
    ["WebSocket", { family: "network", member: "WebSocket" }]
  ]);
  const ambiguousEffectAliases = new Map();
  const capabilityFindings = [];
  const sensitiveImportSites = new Set();
  const sensitiveImportCounts = {
    browser: 0,
    dynamicCode: 0,
    filesystem: 0,
    network: 0,
    subprocess: 0
  };
  const activeLiteralRanges = new Set();
  const sourceLocation = (node) => {
    const start = node.getStart(sourceFile);
    const point = sourceFile.getLineAndCharacterOfPosition(start);
    return { column: point.character + 1, line: point.line + 1, start };
  };
  const recordCapabilityFinding = (node, {
    capability,
    kind,
    member = null,
    sourceKind
  }) => {
    const { column, line, start } = sourceLocation(node);
    capabilityFindings.push({
      capability,
      column,
      file,
      kind,
      line,
      member,
      sourceKind,
      syntaxSha256: sha256(source.slice(start, node.end))
    });
  };
  const recordSensitiveImport = (node, moduleName, family, sourceKind) => {
    const { start } = sourceLocation(node);
    const key = `${start}:${node.end}:${moduleName}:${family}:${sourceKind}`;
    if (sensitiveImportSites.has(key)) return;
    sensitiveImportSites.add(key);
    activeLiteralRanges.add(`${start}:${node.end}`);
    const countKey = {
      browser: "browser",
      "child-process": "subprocess",
      "dynamic-code": "dynamicCode",
      filesystem: "filesystem",
      network: "network"
    }[family];
    const capability = {
      browser: "browser",
      "child-process": "subprocess",
      "dynamic-code": "dynamic-code",
      filesystem: "filesystem-read",
      network: "network"
    }[family] ?? "unknown";
    if (countKey) sensitiveImportCounts[countKey] += 1;
    recordCapabilityFinding(node, {
      capability,
      kind: "sensitive-module-import",
      member: moduleName,
      sourceKind
    });
  };
  const recordAmbiguousEffectAlias = (node, reason) => {
    const { column, line, start } = sourceLocation(node);
    const key = `${start}:${node.end}:${reason}`;
    ambiguousEffectAliases.set(key, { column, line, reason });
  };
  const setNamespace = (name, family, node) => {
    const priorNamespace = namespaces.get(name);
    const priorCallable = callables.get(name);
    if ((priorNamespace && priorNamespace !== family) || priorCallable) {
      recordAmbiguousEffectAlias(node, `conflicting namespace alias ${name}`);
      return false;
    }
    if (priorNamespace === family) return false;
    namespaces.set(name, family);
    return true;
  };
  const setCallable = (name, value, node) => {
    const priorNamespace = namespaces.get(name);
    const priorCallable = callables.get(name);
    if (
      priorNamespace
      || (priorCallable && !sameJson(priorCallable, value))
      || (value.family === "child-process" && !CHILD_PROCESS_MEMBERS.has(value.member))
    ) {
      recordAmbiguousEffectAlias(node, `conflicting or unknown callable alias ${name}`);
      return false;
    }
    if (sameJson(priorCallable, value)) return false;
    callables.set(name, value);
    return true;
  };
  const moduleFamily = (moduleName) => {
    if (CHILD_PROCESS_MODULES.has(moduleName)) return "child-process";
    if (FILESYSTEM_MODULES.has(moduleName)) return "filesystem";
    if (BROWSER_MODULES.has(moduleName)) return "browser";
    if (NETWORK_MODULES.has(moduleName)) return "network";
    if (DYNAMIC_CODE_MODULES.has(moduleName)) return "dynamic-code";
    return null;
  };
  const isTransparentFamilyMember = (family, member) =>
    member === "default"
    || ((family === "filesystem" || family === "network") && member === "promises")
    || (family === "browser" && ["chromium", "firefox", "webkit"].includes(member));
  const bindingMemberName = (node) => {
    if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
      return node.text;
    }
    if (ts.isComputedPropertyName(node)) return staticStringValue(node.expression);
    return null;
  };
  const bindFamilyMember = (name, family, member, node) => {
    if (!member) {
      recordAmbiguousEffectAlias(node, `computed ${family} member alias ${name}`);
      return false;
    }
    return isTransparentFamilyMember(family, member)
      ? setNamespace(name, family, node)
      : setCallable(name, { family, member }, node);
  };

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const moduleName = staticStringValue(statement.moduleSpecifier);
      const family = moduleFamily(moduleName);
      if (!family || statement.importClause?.isTypeOnly) continue;
      recordSensitiveImport(statement.moduleSpecifier, moduleName, family, "esm-import");
      if (!statement.importClause) continue;
      if (statement.importClause.name) {
        setNamespace(statement.importClause.name.text, family, statement.importClause.name);
      }
      const bindings = statement.importClause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        setNamespace(bindings.name.text, family, bindings.name);
      } else if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if (element.isTypeOnly) continue;
          const member = (element.propertyName ?? element.name).text;
          bindFamilyMember(element.name.text, family, member, element);
        }
      }
      continue;
    }
    if (
      ts.isImportEqualsDeclaration(statement)
      && !statement.isTypeOnly
      && ts.isExternalModuleReference(statement.moduleReference)
      && statement.moduleReference.expression
    ) {
      const moduleName = staticStringValue(statement.moduleReference.expression);
      const family = moduleFamily(moduleName);
      if (!family) continue;
      recordSensitiveImport(
        statement.moduleReference.expression,
        moduleName,
        family,
        "import-equals"
      );
      setNamespace(statement.name.text, family, statement.name);
    }
  }

  const familyFromExpression = (expression) => {
    const current = unwrapExpression(expression);
    const moduleName = moduleLoaderSpecifier(current);
    if (moduleName) return moduleFamily(moduleName);
    if (ts.isIdentifier(current)) return namespaces.get(current.text) ?? null;
    if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
      const receiverFamily = familyFromExpression(current.expression);
      if (!receiverFamily) return null;
      const member = propertyNameValue(current);
      if (!member) {
        recordAmbiguousEffectAlias(current, `computed ${receiverFamily} namespace member`);
        return null;
      }
      return isTransparentFamilyMember(receiverFamily, member) ? receiverFamily : null;
    }
    return null;
  };
  const callableFromExpression = (expression) => {
    const current = unwrapExpression(expression);
    if (ts.isIdentifier(current)) return callables.get(current.text) ?? null;
    if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
      const member = propertyNameValue(current);
      if (!member) {
        const receiverFamily = familyFromExpression(current.expression);
        if (receiverFamily) {
          recordAmbiguousEffectAlias(current, `computed ${receiverFamily} callable member`);
        }
        return null;
      }
      if (member === "call" || member === "apply") {
        return callableFromExpression(current.expression);
      }
      const family = familyFromExpression(current.expression);
      if (!family || isTransparentFamilyMember(family, member)) return null;
      if (family === "child-process" && !CHILD_PROCESS_MEMBERS.has(member)) {
        recordAmbiguousEffectAlias(current, `unknown child-process member ${member}`);
        return null;
      }
      return { family, member };
    }
    return null;
  };
  const callableAliasFromInitializer = (expression) => {
    const current = unwrapExpression(expression);
    if (
      ts.isCallExpression(current)
      && (ts.isPropertyAccessExpression(current.expression)
        || ts.isElementAccessExpression(current.expression))
      && propertyNameValue(current.expression) === "bind"
    ) {
      return callableFromExpression(current.expression.expression);
    }
    return callableFromExpression(current);
  };

  const declarations = [];
  const assignments = [];
  const assignmentOperatorKinds = new Set([
    ts.SyntaxKind.AmpersandAmpersandEqualsToken,
    ts.SyntaxKind.AmpersandEqualsToken,
    ts.SyntaxKind.AsteriskAsteriskEqualsToken,
    ts.SyntaxKind.AsteriskEqualsToken,
    ts.SyntaxKind.BarBarEqualsToken,
    ts.SyntaxKind.BarEqualsToken,
    ts.SyntaxKind.CaretEqualsToken,
    ts.SyntaxKind.EqualsToken,
    ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
    ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
    ts.SyntaxKind.LessThanLessThanEqualsToken,
    ts.SyntaxKind.MinusEqualsToken,
    ts.SyntaxKind.PercentEqualsToken,
    ts.SyntaxKind.PlusEqualsToken,
    ts.SyntaxKind.QuestionQuestionEqualsToken,
    ts.SyntaxKind.SlashEqualsToken
  ]);
  const collectBindings = (node) => {
    if (ts.isVariableDeclaration(node) && node.initializer) declarations.push(node);
    if (ts.isBinaryExpression(node) && assignmentOperatorKinds.has(node.operatorToken.kind)) {
      assignments.push(node);
    }
    ts.forEachChild(node, collectBindings);
  };
  collectBindings(sourceFile);
  const bindObjectElements = (elements, family) => {
    let bindingChanged = false;
    for (const element of elements) {
      if (element.dotDotDotToken || !ts.isIdentifier(element.name)) {
        recordAmbiguousEffectAlias(element, `non-static ${family} destructuring alias`);
        continue;
      }
      const member = bindingMemberName(element.propertyName ?? element.name);
      bindingChanged = bindFamilyMember(
        element.name.text,
        family,
        member,
        element
      ) || bindingChanged;
    }
    return bindingChanged;
  };
  const bindObjectAssignment = (objectLiteral, family) => {
    let bindingChanged = false;
    for (const property of objectLiteral.properties) {
      let member;
      let target;
      if (ts.isShorthandPropertyAssignment(property)) {
        member = property.name.text;
        target = property.name;
      } else if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.initializer)) {
        member = bindingMemberName(property.name);
        target = property.initializer;
      }
      if (!member || !target) {
        recordAmbiguousEffectAlias(property, `non-static ${family} assignment alias`);
        continue;
      }
      bindingChanged = bindFamilyMember(target.text, family, member, property) || bindingChanged;
    }
    return bindingChanged;
  };
  let changed = true;
  const maximumPasses = declarations.length + assignments.length + 1;
  for (let pass = 0; changed && pass <= maximumPasses; pass += 1) {
    changed = false;
    for (const declaration of declarations) {
      const family = familyFromExpression(declaration.initializer);
      if (ts.isIdentifier(declaration.name)) {
        const callable = callableAliasFromInitializer(declaration.initializer);
        if (family) changed = setNamespace(declaration.name.text, family, declaration) || changed;
        if (callable) changed = setCallable(declaration.name.text, callable, declaration) || changed;
        if (
          !family
          && !callable
          && (namespaces.has(declaration.name.text) || callables.has(declaration.name.text))
        ) recordAmbiguousEffectAlias(declaration, `effect alias ${declaration.name.text} was shadowed`);
        continue;
      }
      if (ts.isObjectBindingPattern(declaration.name) && family) {
        changed = bindObjectElements(declaration.name.elements, family) || changed;
      }
    }
    for (const assignment of assignments) {
      const left = unwrapExpression(assignment.left);
      if (assignment.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
        if (
          (ts.isIdentifier(left) && (namespaces.has(left.text) || callables.has(left.text)))
          || ((ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left))
            && familyFromExpression(left.expression))
        ) recordAmbiguousEffectAlias(assignment, "compound mutation of an effect alias");
        continue;
      }
      const family = familyFromExpression(assignment.right);
      const callable = callableAliasFromInitializer(assignment.right);
      if (ts.isIdentifier(left)) {
        if (family) changed = setNamespace(left.text, family, assignment) || changed;
        if (callable) changed = setCallable(left.text, callable, assignment) || changed;
        if (!family && !callable && (namespaces.has(left.text) || callables.has(left.text))) {
          recordAmbiguousEffectAlias(assignment, `effect alias ${left.text} was reassigned`);
        }
      } else if (ts.isObjectLiteralExpression(left) && family) {
        changed = bindObjectAssignment(left, family) || changed;
      } else if (
        (ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left))
        && familyFromExpression(left.expression)
      ) {
        recordAmbiguousEffectAlias(assignment, "mutation of an effect-family member");
      }
    }
  }
  const assertNoAmbiguousEffectAliases = () => {
    if (ambiguousEffectAliases.size === 0) return;
    const first = [...ambiguousEffectAliases.values()].sort((left, right) =>
      left.line - right.line || left.column - right.column || left.reason.localeCompare(right.reason)
    )[0];
    throw new Error(
      `Execution-scope parser rejected ambiguous effect alias in ${file}:${first.line}:${first.column}: ${first.reason}`
    );
  };
  assertNoAmbiguousEffectAliases();

  const imports = [];
  const childProcessCalls = [];
  const destructiveCalls = [];
  const inertRanges = new Map();
  const addInertRange = (start, end) => {
    if (start >= end) return;
    inertRanges.set(`${start}:${end}`, { end, start });
  };
  const location = (position) => {
    const point = sourceFile.getLineAndCharacterOfPosition(position);
    return { column: point.character + 1, line: point.line + 1 };
  };
  const activeCommandPatterns = Object.freeze([
    Object.freeze({
      kind: "child-process-rm-command",
      pattern: /\brm\b(?=[^;\n|&]{0,400}(?:--recursive|-[A-Za-z]*r[A-Za-z]*))(?=[^;\n|&]{0,400}(?:--force|-[A-Za-z]*f[A-Za-z]*))[^;\n|&]{0,400}/gi
    }),
    Object.freeze({
      kind: "child-process-filesystem-delete-source",
      pattern: /\b(?:rm|rmSync|rmdir|rmdirSync|unlink|unlinkSync|shutil\.rmtree|os\.(?:remove|unlink|rmdir))\s*\(/gi
    }),
    Object.freeze({
      kind: "child-process-find-delete",
      pattern: /\bfind\b[^\n]{0,400}\s-delete\b/gi
    }),
    Object.freeze({
      kind: "child-process-git-delete",
      pattern: /\bgit\s+(?:clean|reset\s+--hard)\b/gi
    })
  ]);
  const collectStaticCommandParts = (expression, parts, ranges) => {
    const current = unwrapExpression(expression);
    const value = staticStringValue(current);
    if (value !== null) {
      parts.push(value);
      ranges.push({ end: current.end, start: current.getStart(sourceFile) });
      return;
    }
    if (ts.isArrayLiteralExpression(current)) {
      for (const element of current.elements) {
        if (ts.isSpreadElement(element)) collectStaticCommandParts(element.expression, parts, ranges);
        else collectStaticCommandParts(element, parts, ranges);
      }
    }
  };
  const classifyActiveChildProcessCommand = (node, callable) => {
    const parts = [];
    const ranges = [];
    for (const argument of node.arguments) collectStaticCommandParts(argument, parts, ranges);
    const commandText = parts.join(" ");
    const matches = [];
    for (const { kind, pattern } of activeCommandPatterns) {
      for (const match of commandText.matchAll(pattern)) {
        matches.push({ index: match.index, kind, text: match[0] });
      }
    }
    if (matches.length === 0) return [];
    for (const range of ranges) activeLiteralRanges.add(`${range.start}:${range.end}`);
    const start = node.getStart(sourceFile);
    const point = location(start);
    return matches.map(({ index, kind, text }) => ({
      column: point.column,
      file,
      kind,
      line: point.line,
      semanticClass: "active-child-process-delete",
      statementSha256: sha256(
        `${callable.member}\0${index}\0${text}\0${source.slice(start, node.end)}`
      )
    }));
  };

  const filesystemCapability = (member) => {
    if (FILESYSTEM_DELETE_MEMBERS.has(member)) return "filesystem-delete";
    if (FILESYSTEM_WRITE_MEMBERS.has(member)) return "filesystem-write";
    if (FILESYSTEM_READ_MEMBERS.has(member)) return "filesystem-read";
    return "unknown";
  };
  const childProcessFacts = (node, callable) => {
    const commandValue = node.arguments.length > 0
      ? staticStringValue(node.arguments[0])
      : null;
    const commandBasename = commandValue === null
      ? null
      : commandValue.split(/[\\/]/).at(-1)?.toLowerCase() ?? null;
    let shellCapable = callable.member === "exec" || callable.member === "execSync";
    if (commandBasename && SHELL_EXECUTABLE_BASENAMES.has(commandBasename)) shellCapable = true;
    for (const argument of node.arguments) {
      const current = unwrapExpression(argument);
      if (!ts.isObjectLiteralExpression(current)) continue;
      for (const property of current.properties) {
        if (
          ts.isShorthandPropertyAssignment(property)
          && property.name.text === "shell"
        ) shellCapable = true;
        if (
          ts.isPropertyAssignment(property)
          && bindingMemberName(property.name) === "shell"
          && unwrapExpression(property.initializer).kind !== ts.SyntaxKind.FalseKeyword
        ) shellCapable = true;
      }
    }
    return {
      shellCapable,
      variableCommand: commandValue === null
    };
  };

  const visit = (node) => {
    if (
      ts.isStringLiteral(node)
      || ts.isNoSubstitutionTemplateLiteral(node)
      || ts.isRegularExpressionLiteral(node)
      || [
        ts.SyntaxKind.TemplateHead,
        ts.SyntaxKind.TemplateMiddle,
        ts.SyntaxKind.TemplateTail
      ].includes(node.kind)
    ) addInertRange(node.getStart(sourceFile), node.end);

    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
      const specifier = staticStringValue(node.moduleSpecifier);
      if (specifier) imports.push({ kind: "static-import", specifier });
    } else if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier) {
      const specifier = staticStringValue(node.moduleSpecifier);
      if (specifier) imports.push({ kind: "static-export", specifier });
    } else if (
      ts.isImportEqualsDeclaration(node)
      && !node.isTypeOnly
      && ts.isExternalModuleReference(node.moduleReference)
      && node.moduleReference.expression
    ) {
      const specifier = staticStringValue(node.moduleReference.expression);
      if (specifier) imports.push({ kind: "import-equals", specifier });
    }

    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const specifier = node.arguments.length === 1 ? staticStringValue(node.arguments[0]) : null;
        if (specifier) {
          imports.push({ kind: "dynamic-import", specifier });
          const family = moduleFamily(specifier);
          if (family) recordSensitiveImport(node.arguments[0], specifier, family, "dynamic-import");
        } else {
          const expression = node.arguments[0]?.getText(sourceFile) ?? "<missing>";
          const binding = COMPUTED_LOCAL_IMPORT_BINDINGS.find((candidate) =>
            candidate.file === file && candidate.expression === expression
          );
          imports.push(binding
            ? { kind: "bound-computed-import", resolvedPath: binding.target, specifier: expression }
            : { kind: "unresolved-computed-import", specifier: expression });
          if (!binding) {
            recordCapabilityFinding(node, {
              capability: "unknown",
              kind: "unresolved-dynamic-import",
              member: "import",
              sourceKind: "call-expression"
            });
          }
        }
      } else if (
        ts.isIdentifier(node.expression)
        && node.expression.text === "require"
        && node.arguments.length === 1
      ) {
        const specifier = staticStringValue(node.arguments[0]);
        if (specifier) {
          imports.push({ kind: "require", specifier });
          const family = moduleFamily(specifier);
          if (family) recordSensitiveImport(node.arguments[0], specifier, family, "require");
        } else {
          imports.push({
            kind: "unresolved-computed-require",
            specifier: node.arguments[0].getText(sourceFile)
          });
          recordCapabilityFinding(node, {
            capability: "unknown",
            kind: "unresolved-computed-require",
            member: "require",
            sourceKind: "call-expression"
          });
        }
      }

      const callable = callableFromExpression(node.expression);
      if (callable) {
        const start = node.getStart(sourceFile);
        const site = {
          ...location(start),
          member: callable.member,
          node,
          start,
          syntaxSha256: sha256(source.slice(start, node.end))
        };
        if (callable.family === "child-process" && CHILD_PROCESS_MEMBERS.has(callable.member)) {
          childProcessCalls.push(site);
          destructiveCalls.push(...classifyActiveChildProcessCommand(node, callable));
          recordCapabilityFinding(node, {
            capability: "subprocess",
            kind: "child-process-call",
            member: callable.member,
            sourceKind: "call-expression"
          });
          const facts = childProcessFacts(node, callable);
          if (facts.shellCapable) {
            recordCapabilityFinding(node, {
              capability: "shell",
              kind: "shell-capable-child-process-call",
              member: callable.member,
              sourceKind: "call-expression"
            });
          }
          if (facts.variableCommand) {
            recordCapabilityFinding(node, {
              capability: "unknown",
              kind: "variable-child-process-command",
              member: callable.member,
              sourceKind: "call-expression"
            });
          }
        } else if (callable.family === "filesystem") {
          const capability = filesystemCapability(callable.member);
          recordCapabilityFinding(node, {
            capability,
            kind: "filesystem-call",
            member: callable.member,
            sourceKind: "call-expression"
          });
          if (capability === "filesystem-delete") {
            destructiveCalls.push({
              column: site.column,
              file,
              kind: "filesystem-delete-call",
              line: site.line,
              semanticClass: "active-filesystem-delete",
              statementSha256: site.syntaxSha256
            });
          }
        } else if (callable.family === "browser") {
          recordCapabilityFinding(node, {
            capability: "browser",
            kind: BROWSER_CALL_MEMBERS.has(callable.member)
              ? "browser-launch-or-connect-call"
              : "browser-module-call",
            member: callable.member,
            sourceKind: "call-expression"
          });
        } else if (callable.family === "network") {
          recordCapabilityFinding(node, {
            capability: "network",
            kind: "network-call",
            member: callable.member,
            sourceKind: "call-expression"
          });
        } else if (callable.family === "dynamic-code") {
          recordCapabilityFinding(node, {
            capability: "dynamic-code",
            kind: "dynamic-code-call",
            member: callable.member,
            sourceKind: "call-expression"
          });
        }
      } else if (
        (ts.isPropertyAccessExpression(node.expression)
          || ts.isElementAccessExpression(node.expression))
        && BROWSER_CALL_MEMBERS.has(propertyNameValue(node.expression))
      ) {
        recordCapabilityFinding(node, {
          capability: "browser",
          kind: "conservative-browser-launch-or-connect-call",
          member: propertyNameValue(node.expression),
          sourceKind: "call-expression"
        });
      }
    } else if (ts.isNewExpression(node)) {
      const callable = callableFromExpression(node.expression);
      if (callable?.family === "network") {
        recordCapabilityFinding(node, {
          capability: "network",
          kind: "network-constructor",
          member: callable.member,
          sourceKind: "new-expression"
        });
      } else if (callable?.family === "dynamic-code") {
        recordCapabilityFinding(node, {
          capability: "dynamic-code",
          kind: "dynamic-code-constructor",
          member: callable.member,
          sourceKind: "new-expression"
        });
      } else if (callable?.family === "browser") {
        recordCapabilityFinding(node, {
          capability: "browser",
          kind: "browser-constructor",
          member: callable.member,
          sourceKind: "new-expression"
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  assertNoAmbiguousEffectAliases();

  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    file.endsWith("x") ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard,
    source
  );
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia
      || token === ts.SyntaxKind.MultiLineCommentTrivia
    ) addInertRange(scanner.getTokenPos(), scanner.getTextPos());
  }
  const inertDestructiveSites = [];
  const inertPattern = /\brm\s+-[a-z]*r[a-z]*f\b|\bgit\s+(?:clean|reset\s+--hard)\b|\b(?:rm|rmSync|rmdir|rmdirSync|unlink|unlinkSync)\s*\(/gi;
  for (const { end, start } of inertRanges.values()) {
    if (activeLiteralRanges.has(`${start}:${end}`)) continue;
    const text = source.slice(start, end);
    for (const match of text.matchAll(inertPattern)) {
      const absoluteStart = start + match.index;
      inertDestructiveSites.push({
        ...location(absoluteStart),
        file,
        kind: "inert-destructive-token",
        line: location(absoluteStart).line,
        semanticClass: "inert-literal-or-comment",
        statementSha256: sha256(match[0])
      });
    }
  }

  const inertCapabilitySites = [];
  const inertCapabilityPattern = /\b(connectOverCDP|launchPersistentContext|launch|connect|execFileSync|execFile|execSync|exec|fork|spawnSync|spawn|rmSync|rm|rmdirSync|rmdir|unlinkSync|unlink|writeFileSync|writeFile|appendFileSync|appendFile|createWriteStream|mkdirSync|mkdir|mkdtempSync|mkdtemp|renameSync|rename|symlinkSync|symlink|fetch|WebSocket|eval|Function)\s*\(/g;
  for (const { end, start } of inertRanges.values()) {
    if (activeLiteralRanges.has(`${start}:${end}`)) continue;
    const text = source.slice(start, end);
    for (const match of text.matchAll(inertCapabilityPattern)) {
      const member = match[1];
      const absoluteStart = start + match.index;
      const capability = BROWSER_CALL_MEMBERS.has(member)
        ? "browser"
        : CHILD_PROCESS_MEMBERS.has(member)
          ? (member === "exec" || member === "execSync" ? "shell" : "subprocess")
          : FILESYSTEM_DELETE_MEMBERS.has(member)
            ? "filesystem-delete"
            : FILESYSTEM_WRITE_MEMBERS.has(member)
              ? "filesystem-write"
              : member === "fetch" || member === "WebSocket"
                ? "network"
                : member === "eval" || member === "Function"
                  ? "dynamic-code"
                  : "unknown";
      inertCapabilitySites.push({
        capability,
        ...location(absoluteStart),
        file,
        kind: "inert-capability-token",
        member,
        sourceKind: "inert-literal-or-comment",
        syntaxSha256: sha256(match[0])
      });
    }
  }

  return {
    capabilityFindings,
    childProcessCalls,
    destructiveCalls,
    imports,
    inertCapabilitySites,
    inertDestructiveSites,
    sensitiveImportCounts,
    sourceFile
  };
}

export function analyzeRequiredBrowserSourceSemanticsForTest(
  source,
  { file = "synthetic-required-browser-source.mjs" } = {}
) {
  if (
    typeof source !== "string"
    || typeof file !== "string"
    || file === ""
    || !ECMA_SOURCE_EXTENSIONS.has(extname(file).toLowerCase())
  ) {
    throw new Error("Pure required-browser source analysis requires ECMAScript source and a file name.");
  }
  const analysis = analyzeEcmaSource(source, file);
  return Object.freeze(stableValue({
    capabilityFindings: analysis.capabilityFindings,
    childProcessCalls: analysis.childProcessCalls.map(({
      column,
      line,
      member,
      syntaxSha256
    }) => ({ column, line, member, syntaxSha256 })),
    destructiveCalls: analysis.destructiveCalls,
    imports: analysis.imports,
    inertCapabilitySites: analysis.inertCapabilitySites,
    inertDestructiveSites: analysis.inertDestructiveSites,
    sensitiveImportCounts: analysis.sensitiveImportCounts
  }));
}

function isRuntimeModulePath(file) {
  return ECMA_SOURCE_EXTENSIONS.has(extname(file).toLowerCase())
    && !/(?:^|\/)(?:__tests__|fixtures?|test-fixtures)(?:\/|$)/.test(file)
    && !/\.(?:test|spec|stories)\.[^.]+$/.test(file)
    && !/\.d\.(?:ts|mts)$/.test(file);
}

function conservativeNextFiles(repoRoot) {
  const files = new Set();
  for (const rootName of ["app", "pages", "src/app", "src/pages"]) {
    const root = join(repoRoot, rootName);
    if (!existsSync(root)) continue;
    for (const relativeFile of executableRepositoryFiles(root)) {
      const file = `${rootName}/${relativeFile}`.replaceAll("//", "/");
      if (isRuntimeModulePath(file)) files.add(file);
    }
  }
  for (const file of REQUIRED_BROWSER_PROOF_INPUT_FILES) {
    if (/^(?:app|components|data|lib)\//.test(file) && isRuntimeModulePath(file)) files.add(file);
  }
  for (const file of [
    "instrumentation.ts", "middleware.ts", "next-env.d.ts", "next.config.ts",
    "package-lock.json", "package.json", "postcss.config.mjs", "tailwind.config.ts", "tsconfig.json"
  ]) {
    if (existsSync(resolve(repoRoot, file))) files.add(file);
  }
  return [...files].sort();
}

const EXACT_SPAWN_DESCRIPTOR_BINDINGS = Object.freeze([
  Object.freeze({
    commandId: "static.source-canary",
    file: "tests/e2e/reported-bug-source-regressions.test.ts"
  })
]);

function exactDescriptorBoundSpawnSites({ catalog, analysis, file, reachableCommandIds }) {
  const sites = new Map();
  const definitionsById = new Map(catalog.definitions.map((definition) => [definition.id, definition]));
  for (const binding of EXACT_SPAWN_DESCRIPTOR_BINDINGS) {
    if (binding.file !== file) continue;
    const definition = definitionsById.get(binding.commandId);
    if (
      !definition
      || !catalog.allowedCommandIds.includes(binding.commandId)
      || definition.executable.canonicalPath !== realpathSync(process.execPath)
      || definition.argv.some((entry) => entry.kind !== "literal")
    ) throw new Error(`Exact spawn descriptor is not an allowed literal Node command: ${binding.commandId}`);
    const parentAuthorizesChild = [...reachableCommandIds].some((parentId) =>
      definitionsById.get(parentId)?.maySpawnCommandIds.includes(binding.commandId)
    );
    if (!parentAuthorizesChild) {
      throw new Error(`Exact spawn descriptor is not reachable from an authorized parent: ${binding.commandId}`);
    }
    const expectedArgv = definition.argv.map(({ value }) => value);
    const matches = analysis.childProcessCalls.filter(({ member, node }) => {
      if (member !== "spawnSync" || node.arguments.length !== 3) return false;
      const [commandNode, argvNode, optionsNode] = node.arguments;
      if (commandNode.getText(analysis.sourceFile) !== "process.execPath") return false;
      const argvExpression = unwrapExpression(argvNode);
      if (!ts.isArrayLiteralExpression(argvExpression)) return false;
      const actualArgv = argvExpression.elements.map(staticStringValue);
      if (actualArgv.some((value) => value === null) || !sameJson(actualArgv, expectedArgv)) return false;
      const optionsExpression = unwrapExpression(optionsNode);
      if (!ts.isObjectLiteralExpression(optionsExpression)) return false;
      const properties = new Map();
      for (const property of optionsExpression.properties) {
        if (!ts.isPropertyAssignment(property)) return false;
        const name = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
          ? property.name.text
          : null;
        if (!name) return false;
        properties.set(name, property.initializer.getText(analysis.sourceFile));
      }
      return sameJson([...properties.keys()].sort(), ["cwd", "encoding", "env"])
        && properties.get("cwd") === "process.cwd()"
        && properties.get("encoding") === '"utf8"'
        && properties.get("env") === "childEnvironment";
    });
    if (matches.length !== 1) {
      throw new Error(`Expected exactly one AST-described spawn site for ${binding.commandId}.`);
    }
    sites.set(matches[0].start, {
      commandId: binding.commandId,
      syntaxSha256: matches[0].syntaxSha256
    });
  }
  return sites;
}

function buildClosure(repoRoot, catalog, mode) {
  const activeDefinitions = catalog.definitions.filter(({ modes }) => modes.includes(mode));
  const commandEntrypoints = activeDefinitions.map(({ entrypointPaths, id }) => ({
    commandId: id,
    paths: [...entrypointPaths].sort()
  })).sort((left, right) => left.commandId.localeCompare(right.commandId));
  const reachableByFile = new Map();
  const pending = [];
  const processedPairs = new Set();
  const analysisByFile = new Map();
  const importResolutionByFile = new Map();
  const addReachable = (file, commandId) => {
    const absolute = resolve(repoRoot, file);
    if (!absolute.startsWith(`${repoRoot}${sep}`) || !existsSync(absolute)) {
      throw new Error(`Execution-scope entrypoint is missing or escaped: ${file}`);
    }
    const ids = reachableByFile.get(file) ?? new Set();
    if (!ids.has(commandId)) {
      ids.add(commandId);
      reachableByFile.set(file, ids);
      pending.push({ commandId, file });
    }
  };
  const analysisFor = (file) => {
    if (!analysisByFile.has(file)) {
      const source = readFileSync(canonicalRepoFile(repoRoot, file), "utf8");
      analysisByFile.set(file, ECMA_SOURCE_EXTENSIONS.has(extname(file).toLowerCase())
        ? analyzeEcmaSource(source, file)
        : {
            capabilityFindings: [],
            childProcessCalls: [],
            destructiveCalls: [],
            imports: [],
            inertCapabilitySites: [],
            inertDestructiveSites: [],
            sensitiveImportCounts: {
              browser: 0,
              dynamicCode: 0,
              filesystem: 0,
              network: 0,
              subprocess: 0
            },
            sourceFile: null
          });
    }
    return analysisByFile.get(file);
  };
  const resolvedImportsFor = (file) => {
    if (importResolutionByFile.has(file)) return importResolutionByFile.get(file);
    const edges = [];
    const unresolved = [];
    for (const imported of analysisFor(file).imports) {
      if (imported.kind.startsWith("unresolved-computed-")) {
        unresolved.push({
          file,
          kind: imported.kind,
          reason: "computed local imports require an exact declared binding",
          specifier: imported.specifier
        });
        continue;
      }
      if (imported.resolvedPath) {
        const absolute = resolve(repoRoot, imported.resolvedPath);
        if (!absolute.startsWith(`${repoRoot}${sep}`) || !existsSync(absolute)) {
          unresolved.push({
            file,
            kind: imported.kind,
            reason: "bound computed import is missing or escaped",
            specifier: imported.specifier
          });
        } else {
          edges.push({ from: file, kind: imported.kind, to: imported.resolvedPath });
        }
        continue;
      }
      const resolution = resolveLocalModule(
        repoRoot,
        canonicalRepoFile(repoRoot, file),
        imported.specifier
      );
      if (!resolution) continue;
      if (resolution.error) {
        unresolved.push({
          file,
          kind: imported.kind,
          reason: resolution.error,
          specifier: imported.specifier
        });
      } else {
        edges.push({ from: file, kind: imported.kind, to: resolution.path });
      }
    }
    const result = {
      edges: [...new Map(edges.map((edge) => [stableJson(edge), edge])).values()]
        .sort((left, right) => stableJson(left).localeCompare(stableJson(right))),
      unresolved: [...new Map(unresolved.map((edge) => [stableJson(edge), edge])).values()]
        .sort((left, right) => stableJson(left).localeCompare(stableJson(right)))
    };
    importResolutionByFile.set(file, result);
    return result;
  };
  for (const { commandId, paths } of commandEntrypoints) {
    for (const file of paths) addReachable(file, commandId);
  }
  if (mode === "required-matrix") {
    for (const file of conservativeNextFiles(repoRoot)) {
      addReachable(file, "owner.next.build");
      addReachable(file, "owner.next.service");
    }
  }
  while (pending.length > 0) {
    const { commandId, file } = pending.shift();
    const pair = `${commandId}\0${file}`;
    if (processedPairs.has(pair)) continue;
    processedPairs.add(pair);
    for (const edge of resolvedImportsFor(file).edges) addReachable(edge.to, commandId);
  }
  const importEdges = [...new Map(
    [...importResolutionByFile.values()].flatMap(({ edges }) => edges)
      .map((edge) => [stableJson(edge), edge])
  ).values()].sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
  const unresolvedLocalImports = [...new Map(
    [...importResolutionByFile.values()].flatMap(({ unresolved }) => unresolved)
      .map((entry) => [stableJson(entry), entry])
  ).values()].sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
  const knownSpawnFiles = new Map([
    [
      "scripts/run-required-frontend-browser-contracts.mjs",
      activeDefinitions.some(({ id }) => id.startsWith("owner."))
        ? activeDefinitions.filter(({ id }) => id.startsWith("owner.")).map(({ id }) => id)
        : ["static.owner-harness"]
    ],
    ["scripts/bug3-owner-run-plan.test.mjs", ["static.owner-harness"]],
    ["scripts/playwright-owner-paths.test.mjs", ["static.owner-harness"]],
    ["scripts/provision-exact-browser-dependencies.test.mjs", ["static.owner-harness"]],
    ["scripts/provision-exact-browser-dependencies.mjs", ["static.owner-harness"]],
    ["scripts/required-browser-runner.test.mjs", ["static.owner-harness"]]
  ]);
  const spawnEdges = [];
  const unresolvedSpawnSites = [];
  for (const file of [...reachableByFile.keys()].sort()) {
    const analysis = analysisFor(file);
    const exactDescriptorSites = exactDescriptorBoundSpawnSites({
      analysis,
      catalog,
      file,
      reachableCommandIds: reachableByFile.get(file) ?? new Set()
    });
    for (const site of analysis.childProcessCalls) {
      const exactDescriptor = exactDescriptorSites.get(site.start);
      if (exactDescriptor) {
        spawnEdges.push({
          commandId: exactDescriptor.commandId,
          file,
          line: site.line,
          syntaxSha256: exactDescriptor.syntaxSha256
        });
        continue;
      }
      const commandIds = (knownSpawnFiles.get(file) ?? []).filter((id) =>
        catalog.allowedCommandIds.includes(id)
      );
      if (commandIds.length === 0) {
        unresolvedSpawnSites.push({
          file,
          line: site.line,
          syntaxSha256: site.syntaxSha256
        });
      } else {
        for (const commandId of commandIds) {
          spawnEdges.push({
            commandId,
            file,
            line: site.line,
            syntaxSha256: site.syntaxSha256
          });
        }
      }
    }
  }
  if (unresolvedLocalImports.length > 0 || unresolvedSpawnSites.length > 0) {
    throw new Error("Execution-scope closure contains unresolved local import or spawn edges.");
  }
  const files = [...reachableByFile.entries()].map(([file, commandIds]) => ({
    path: file,
    reachableFromCommandIds: [...commandIds].sort(),
    sha256: sha256File(canonicalRepoFile(repoRoot, file))
  })).sort((left, right) => left.path.localeCompare(right.path));
  const closure = {
    commandEntrypoints,
    files,
    importEdges,
    sha256: "",
    spawnEdges: spawnEdges.sort((left, right) => stableJson(left).localeCompare(stableJson(right))),
    unresolvedLocalImports: [],
    unresolvedSpawnSites: []
  };
  closure.sha256 = hashObject(closure);
  return { analysisFor, closure: stableValue(closure), reachableByFile };
}

function capabilityParserAttestation(repoRoot) {
  const requireFromRepo = createRequire(join(repoRoot, "package.json"));
  const nodeModulesRoot = join(repoRoot, "node_modules");
  const canonicalPath = realpathSync(requireFromRepo.resolve("typescript"));
  const packageManifestCanonicalPath = realpathSync(
    join(dirname(canonicalPath), "..", "package.json")
  );
  const assertParserFile = (label, filePath) => {
    const entry = lstatSync(filePath, { throwIfNoEntry: false });
    if (
      !entry?.isFile()
      || entry.isSymbolicLink()
      || realpathSync(filePath) !== filePath
      || !filePath.startsWith(`${nodeModulesRoot}${sep}`)
    ) throw new Error(`Capability ${label} escaped the physical active dependency tree.`);
  };
  assertParserFile("parser", canonicalPath);
  assertParserFile("parser package manifest", packageManifestCanonicalPath);
  const packageManifest = JSON.parse(readFileSync(packageManifestCanonicalPath, "utf8"));
  if (packageManifest.version !== ts.version) {
    throw new Error("Capability parser package version differs from the loaded parser API.");
  }
  const parser = {
    canonicalPath,
    loadedApiSha256: sha256(`typescript-create-source-file\0${String(ts.createSourceFile)}`),
    packageManifestCanonicalPath,
    packageManifestSha256: sha256File(packageManifestCanonicalPath),
    schemaVersion: 1,
    sha256: "",
    sourceSha256: sha256File(canonicalPath),
    version: packageManifest.version
  };
  parser.sha256 = domainHashObject("capability-parser", parser);
  return Object.freeze(stableValue(parser));
}

function capabilityAnalyzerAttestation(repoRoot, sourceFingerprints) {
  const source = attestRepoSource(repoRoot, "scripts/required-browser-execution-scope.mjs");
  if (sourceFingerprints[source.path] !== source.sha256) {
    throw new Error("Capability analyzer source differs from the proof-input fingerprint set.");
  }
  const analyzer = {
    parser: capabilityParserAttestation(repoRoot),
    ruleset: canonicalCapabilityRuleset(),
    schemaVersion: 1,
    sha256: "",
    source
  };
  analyzer.sha256 = domainHashObject("capability-analyzer", analyzer);
  return Object.freeze(stableValue(analyzer));
}

function buildCapabilityProofs({
  analysisFor,
  catalog,
  closure,
  mode,
  reachableByFile,
  repoRoot,
  sourceFingerprints
}) {
  const analyzer = capabilityAnalyzerAttestation(repoRoot, sourceFingerprints);
  const analyzerPath = analyzer.source.path;
  const closureByPath = new Map(closure.files.map((entry) => [entry.path, entry]));
  const definitionsById = new Map(catalog.definitions.map((definition) => [definition.id, definition]));
  const commandProofs = catalog.allowedCommandIds.map((commandId) => {
    const definition = definitionsById.get(commandId);
    if (!definition || !definition.modes.includes(mode)) {
      throw new Error(`Capability proof command is absent from the selected-mode catalog: ${commandId}`);
    }
    const rolesByPath = new Map();
    const addRole = (file, role) => {
      canonicalRepoFile(repoRoot, file);
      const roles = rolesByPath.get(file) ?? new Set();
      roles.add(role);
      rolesByPath.set(file, roles);
    };
    for (const entry of closure.files) {
      if (entry.reachableFromCommandIds.includes(commandId)) addRole(entry.path, "runtime");
    }
    for (const trustedSource of definition.trustedSources ?? []) {
      const canonicalPath = canonicalRepoFile(repoRoot, trustedSource.path);
      if (
        trustedSource.canonicalPath !== canonicalPath
        || trustedSource.sha256 !== sha256File(canonicalPath)
      ) throw new Error(`Capability trusted source attestation differs for ${commandId}.`);
      addRole(trustedSource.path, "trusted-source");
    }
    addRole(analyzerPath, "capability-analyzer");
    addRole(analyzerPath, "command-catalog");

    const files = [...rolesByPath.entries()].map(([file, roles]) => {
      const canonicalPath = canonicalRepoFile(repoRoot, file);
      const sourceSha256 = sha256File(canonicalPath);
      const closureEntry = closureByPath.get(file);
      if (closureEntry && closureEntry.sha256 !== sourceSha256) {
        throw new Error(`Capability runtime source differs from closure: ${file}`);
      }
      if (sourceFingerprints[file] && sourceFingerprints[file] !== sourceSha256) {
        throw new Error(`Capability source differs from proof-input fingerprints: ${file}`);
      }
      const analysis = analysisFor(file);
      const exactDescriptorSites = exactDescriptorBoundSpawnSites({
        analysis,
        catalog,
        file,
        reachableCommandIds: reachableByFile.get(file) ?? new Set()
      });
      const exactDescriptorSyntaxHashes = new Set(
        [...exactDescriptorSites.values()].map(({ syntaxSha256 }) => syntaxSha256)
      );
      const capabilityFindings = analysis.capabilityFindings
        .filter(({ kind, syntaxSha256 }) =>
          kind !== "variable-child-process-command"
          || !exactDescriptorSyntaxHashes.has(syntaxSha256)
        )
        .map(stableValue)
        .sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
      for (const finding of capabilityFindings) {
        if (!CAPABILITY_CLASSES.includes(finding.capability)) {
          throw new Error(`Capability analyzer emitted an unknown class for ${file}.`);
        }
      }
      const inertCapabilitySites = analysis.inertCapabilitySites
        .map(stableValue)
        .sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
      if (inertCapabilitySites.length > 0 && !CAPABILITY_INERT_DATA_FILES.includes(file)) {
        throw new Error(`Capability-looking inert data is outside the exact allowlist: ${file}`);
      }
      const fileProof = {
        capabilityFindings,
        inertCapabilitySites,
        path: file,
        proofSha256: "",
        roles: [...roles].sort(),
        schemaVersion: 1,
        sensitiveImportCounts: stableValue(analysis.sensitiveImportCounts),
        sourceSha256
      };
      fileProof.proofSha256 = domainHashObject(
        "capability-file-proof",
        fileProof,
        "proofSha256"
      );
      return stableValue(fileProof);
    }).sort((left, right) => left.path.localeCompare(right.path));

    const findingCounts = Object.fromEntries(CAPABILITY_CLASSES.map((capability) => [capability, 0]));
    for (const file of files) {
      for (const finding of file.capabilityFindings) findingCounts[finding.capability] += 1;
    }
    const forbiddenCapabilities = commandId === PROD_CERTIFICATION_UNIT_COMMAND_ID
      ? [...PROD_CERTIFICATION_FORBIDDEN_CAPABILITIES]
      : [...DEFAULT_FORBIDDEN_CAPABILITIES];
    const forbiddenFindings = forbiddenCapabilities.filter((capability) =>
      findingCounts[capability] > 0
    );
    if (forbiddenFindings.length > 0) {
      throw new Error(`Capability proof rejected forbidden findings for ${commandId}.`);
    }
    const catalogCapabilities = {
      browserCapable: definition.capabilities?.browserCapable ?? null,
      networkCapable: definition.capabilities?.networkCapable ?? null,
      subprocessCapable: definition.capabilities?.subprocessCapable ?? null
    };
    for (const [key, capabilities] of [
      ["browserCapable", ["browser"]],
      ["networkCapable", ["network"]],
      ["subprocessCapable", ["shell", "subprocess"]]
    ]) {
      const declaration = catalogCapabilities[key];
      if (declaration !== null && typeof declaration !== "boolean") {
        throw new Error(`Capability catalog declaration is invalid for ${commandId}.`);
      }
      if (declaration === false && capabilities.some((capability) => findingCounts[capability] > 0)) {
        throw new Error(`Capability scanner contradicts the catalog declaration for ${commandId}.`);
      }
    }
    const commandProof = {
      analyzerSha256: analyzer.sha256,
      catalogCapabilities,
      catalogSha256: catalog.sha256,
      closureSha256: closure.sha256,
      commandDefinitionSha256: sha256(
        `capability-command-definition\0${stableJson(definition)}`
      ),
      commandId,
      descriptorFingerprint: definition.descriptorFingerprint ?? null,
      files,
      findingCounts: stableValue(findingCounts),
      forbiddenCapabilities,
      mode,
      parserSha256: analyzer.parser.sha256,
      proofSha256: "",
      rulesetSha256: analyzer.ruleset.sha256,
      schemaVersion: 1
    };
    commandProof.proofSha256 = domainHashObject(
      "capability-command-proof",
      commandProof,
      "proofSha256"
    );
    return stableValue(commandProof);
  }).sort((left, right) => left.commandId.localeCompare(right.commandId));

  const capabilityProofs = {
    analyzer,
    catalogSha256: catalog.sha256,
    closureSha256: closure.sha256,
    commands: commandProofs,
    mode,
    schemaVersion: 1,
    sha256: ""
  };
  capabilityProofs.sha256 = domainHashObject("capability-proofs", capabilityProofs);
  return Object.freeze(stableValue(capabilityProofs));
}

function nonEcmaDestructiveSites(source, file) {
  const patterns = [
    { kind: "shell-delete", pattern: /\brm\s+-[a-z]*r[a-z]*f\b/gi },
    { kind: "python-delete", pattern: /\b(?:shutil\.rmtree|os\.(?:remove|unlink|rmdir))\s*\(/g },
    { kind: "find-delete", pattern: /\bfind\b[^\n]{0,300}\s-delete\b/g },
    { kind: "git-delete", pattern: /\bgit\s+(?:clean|reset\s+--hard)\b/g }
  ];
  const sites = [];
  for (const { kind, pattern } of patterns) {
    for (const match of source.matchAll(pattern)) {
      const prefix = source.slice(0, match.index);
      sites.push({
        column: match.index - prefix.lastIndexOf("\n"),
        file,
        kind,
        line: prefix.split("\n").length,
        semanticClass: "active-non-ecma-delete",
        statementSha256: sha256(match[0])
      });
    }
  }
  return sites;
}

function packageScriptDestructiveSites(source, file) {
  const parsed = JSON.parse(source);
  const sites = [];
  for (const [scriptName, command] of Object.entries(parsed.scripts ?? {}).sort()) {
    if (typeof command !== "string") continue;
    const pattern = /\brm\s+-[a-z]*r[a-z]*f\b|\bgit\s+(?:clean|reset\s+--hard)\b/gi;
    for (const match of command.matchAll(pattern)) {
      const nameIndex = Math.max(0, source.indexOf(JSON.stringify(scriptName)));
      const commandIndex = source.indexOf(command, nameIndex);
      const absoluteStart = commandIndex >= 0
        ? commandIndex + match.index
        : nameIndex + match.index;
      const prefix = source.slice(0, absoluteStart);
      sites.push({
        column: absoluteStart - prefix.lastIndexOf("\n"),
        file,
        kind: "package-script-delete",
        line: prefix.split("\n").length,
        semanticClass: "dormant-package-script",
        statementSha256: sha256(`${scriptName}\0${match.index}\0${match[0]}`)
      });
    }
  }
  return sites;
}

function deletionSites(source, file) {
  if (file === "package.json") return packageScriptDestructiveSites(source, file);
  if (ECMA_SOURCE_EXTENSIONS.has(extname(file).toLowerCase())) {
    const analysis = analyzeEcmaSource(source, file);
    return [...analysis.destructiveCalls, ...analysis.inertDestructiveSites]
      .sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
  }
  return nonEcmaDestructiveSites(source, file);
}

function buildDestructiveLedger(repoRoot, reachableByFile) {
  const entries = [];
  for (const file of executableRepositoryFiles(repoRoot)) {
    const absolute = canonicalRepoFile(repoRoot, file);
    const source = readFileSync(absolute, "utf8");
    const sourceSha256 = sha256(source);
    for (const site of deletionSites(source, file)) {
      const executableSemantics = site.semanticClass.startsWith("active-");
      const reachableFromCommandIds = executableSemantics
        ? [...(reachableByFile.get(file) ?? [])].sort()
        : [];
      const capabilityDominated =
        file === "scripts/test-fixture-capability.mjs"
        && site.semanticClass === "active-filesystem-delete";
      const disposition = site.semanticClass === "inert-literal-or-comment"
        ? "INERT_LITERAL_OR_COMMENT"
        : site.semanticClass === "dormant-package-script"
          ? "DORMANT_PACKAGE_SCRIPT"
          : capabilityDominated
            ? "CAPABILITY_DOMINATED_EXACT_LEAF"
            : reachableFromCommandIds.length === 0
              ? "NO_IMPORT_OR_SPAWN_PATH_FROM_SCOPE"
              : "REACHABLE_UNAUTHORIZED_DESTRUCTIVE_SITE";
      entries.push({
        ...site,
        disposition,
        reachableFromCommandIds,
        sourceSha256
      });
    }
  }
  entries.sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
  if (entries.some(({ disposition }) =>
    disposition === "REACHABLE_UNAUTHORIZED_DESTRUCTIVE_SITE"
  )) {
    throw new Error("Execution-scope closure reaches an unauthorized destructive source site.");
  }
  const ledger = {
    entries,
    outOfScopeEntries: entries.filter(({ reachableFromCommandIds }) =>
      reachableFromCommandIds.length === 0
    ),
    reachableEntries: entries.filter(({ reachableFromCommandIds }) =>
      reachableFromCommandIds.length > 0
    ),
    sha256: ""
  };
  ledger.sha256 = hashObject(ledger);
  return stableValue(ledger);
}

export function buildRequiredBrowserExecutionScope({
  dependencyAttestation,
  mode,
  repoRoot,
  sourceFingerprints
}) {
  if (!SCOPE_MODES.includes(mode)) throw new Error("Required-browser execution-scope mode is invalid.");
  const canonicalRoot = canonicalRepoRoot(repoRoot);
  const fingerprints = assertRequiredBrowserSourceFingerprintsUnchanged(
    canonicalRoot,
    sourceFingerprints
  );
  const {
    catalog,
    dependency,
    staticEnvironmentPolicy
  } = commandCatalog(canonicalRoot, dependencyAttestation);
  const modeAllowedCommandIds = catalog.definitions
    .filter(({ modes }) => modes.includes(mode))
    .map(({ id }) => id)
    .sort();
  const scopedCatalog = stableValue({
    ...catalog,
    allowedCommandIds: modeAllowedCommandIds,
    sha256: ""
  });
  scopedCatalog.sha256 = hashObject(scopedCatalog);
  const {
    analysisFor,
    closure,
    reachableByFile
  } = buildClosure(canonicalRoot, scopedCatalog, mode);
  const destructiveLedger = buildDestructiveLedger(canonicalRoot, reachableByFile);
  const capabilityProofs = buildCapabilityProofs({
    analysisFor,
    catalog: scopedCatalog,
    closure,
    mode,
    reachableByFile,
    repoRoot: canonicalRoot,
    sourceFingerprints: fingerprints
  });
  const proofInputs = {
    files: [...REQUIRED_BROWSER_PROOF_INPUT_FILES],
    sha256: ""
  };
  proofInputs.sha256 = hashObject(proofInputs);
  const scope = {
    capabilityProofs,
    closure,
    commandCatalog: scopedCatalog,
    dependencyAttestationFingerprint: dependency.attestation.attestationFingerprint,
    destructiveLedger,
    mode,
    proofInputs,
    repoRoot: canonicalRoot,
    schemaVersion: SCHEMA_VERSION,
    scopeFingerprint: "",
    sourceFingerprints: fingerprints,
    staticEnvironmentPolicy,
    status: "validated"
  };
  scope.scopeFingerprint = hashObject(scope, "scopeFingerprint");
  return Object.freeze(stableValue(scope));
}

function assertHexDigest(label, value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest.`);
  }
}

function assertCanonicalArray(label, value, compare = (left, right) =>
  stableJson(left).localeCompare(stableJson(right))) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  const sorted = [...value].sort(compare);
  if (!sameJson(value, sorted) || new Set(value.map(stableJson)).size !== value.length) {
    throw new Error(`${label} must be sorted and duplicate-free.`);
  }
}

function assertRepoRelativePath(label, value) {
  if (
    typeof value !== "string"
    || value === ""
    || isAbsolute(value)
    || value.includes("\\")
    || value.split("/").some((part) => part === "" || part === "." || part === "..")
  ) throw new Error(`${label} must be a normalized repository-relative path.`);
}

function canonicalCommandPolicies(scope) {
  const nextCli = join(scope.repoRoot, "node_modules", "next", "dist", "bin", "next");
  const playwrightCli = join(scope.repoRoot, "node_modules", "@playwright", "test", "cli.js");
  const tsxCli = join(scope.repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
  const tscCli = join(scope.repoRoot, "node_modules", "typescript", "bin", "tsc");
  return [
    {
      argv: [literal("eww"), literal("-axo"), literal("pid=,command=")],
      cwd: "repo-root",
      entrypointPaths: ["scripts/run-required-frontend-browser-contracts.mjs"],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executableRole: "process-audit",
      id: "owner.audit.owner-token-table",
      maySpawnCommandIds: [],
      modes: ["discovery", "required-matrix"]
    },
    {
      argv: [literal("eww"), literal("-p"), slot("provenOwnedPid"), literal("-o"), literal("command=")],
      cwd: "repo-root",
      entrypointPaths: ["scripts/run-required-frontend-browser-contracts.mjs"],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executableRole: "process-audit",
      id: "owner.audit.pid-environment",
      maySpawnCommandIds: [],
      modes: ["discovery", "required-matrix"]
    },
    {
      argv: [literal("-axo"), literal("pid=,ppid=,pgid=,lstart=,command=")],
      cwd: "repo-root",
      entrypointPaths: ["scripts/run-required-frontend-browser-contracts.mjs"],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executableRole: "process-audit",
      id: "owner.audit.process-table",
      maySpawnCommandIds: [],
      modes: ["discovery", "required-matrix"]
    },
    {
      argv: [literal(nextCli), literal("build")],
      cwd: "repo-root",
      descriptorFingerprintRequired: true,
      entrypointPaths: ["scripts/run-required-frontend-browser-contracts.mjs", "next.config.ts"],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executableRole: "node",
      id: "owner.next.build",
      maySpawnCommandIds: [],
      modes: ["required-matrix"],
      trustedSources: NEXT_CONFIG_TRANSITIVE_TRUSTED_SOURCES.map((file) => ({
        canonicalPath: join(scope.repoRoot, file),
        path: file,
        sha256: scope.sourceFingerprints[file]
      }))
    },
    {
      argv: [literal(nextCli), literal("start"), literal("--hostname"), literal("127.0.0.1"), literal("--port"), slot("servicePort")],
      cwd: "repo-root",
      descriptorFingerprintRequired: true,
      entrypointPaths: ["scripts/run-required-frontend-browser-contracts.mjs", "next.config.ts"],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executableRole: "node",
      id: "owner.next.service",
      maySpawnCommandIds: [],
      modes: ["required-matrix"],
      trustedSources: NEXT_CONFIG_TRANSITIVE_TRUSTED_SOURCES.map((file) => ({
        canonicalPath: join(scope.repoRoot, file),
        path: file,
        sha256: scope.sourceFingerprints[file]
      }))
    },
    {
      allowedBindings: matrixBindings(),
      argv: [literal(playwrightCli), literal("test"), slot("spec"), slot("project", "--project="), literal("--grep"), slot("grep"), literal("--list"), literal("--reporter=line")],
      cwd: "repo-root",
      descriptorFingerprintRequired: true,
      entrypointPaths: [
        "playwright.config.ts",
        "scripts/run-required-frontend-browser-contracts.mjs",
        "tests/e2e/lesson-world-menu.spec.ts",
        "tests/e2e/practice-math-keyboard.spec.ts",
        "tests/e2e/visualization-contract.spec.ts"
      ],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executableRole: "node",
      id: "owner.playwright.discovery",
      maySpawnCommandIds: [],
      modes: ["discovery", "required-matrix"]
    },
    {
      argv: [literal(playwrightCli), literal("test"), literal("--config"), slot("requiredConfig")],
      cwd: "repo-root",
      descriptorFingerprintRequired: true,
      entrypointPaths: ["playwright.config.ts", "scripts/run-required-frontend-browser-contracts.mjs"],
      environmentBinding: "plan.environmentBinding.inventorySha256",
      executableRole: "node",
      id: "owner.playwright.final",
      maySpawnCommandIds: [],
      modes: ["required-matrix"]
    },
    {
      argv: [literal(tsxCli), literal("--test"), literal("components/visualizations/three/manim/mathSceneV2OwnerGateRerunCommandPacket.test.ts")],
      cwd: "repo-root",
      entrypointPaths: ["components/visualizations/three/manim/mathSceneV2OwnerGateRerunCommandPacket.test.ts"],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executableRole: "node",
      id: "static.command-packet-unit",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    },
    {
      argv: [literal("scripts/dashboard-ui-loading-smoke.mjs"), literal("--self-test")],
      cwd: "repo-root",
      entrypointPaths: ["scripts/dashboard-ui-loading-smoke.mjs"],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executableRole: "node",
      id: "static.dashboard-self-test",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    },
    {
      argv: [literal("diff"), literal("--check")],
      cwd: "repo-root",
      entrypointPaths: [],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executableRole: "diff-check",
      id: "static.diff-check",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    },
    {
      argv: [literal("--check"), slot("declaredMjs")],
      cwd: "repo-root",
      entrypointPaths: [],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executableRole: "node",
      id: "static.node-check",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    },
    {
      argv: [literal("--test"), literal("--test-concurrency=1"), ...TEST_HARNESS_FILES.map(literal)],
      cwd: "repo-root",
      entrypointPaths: [...TEST_HARNESS_FILES],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executableRole: "node",
      id: "static.owner-harness",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    },
    {
      argv: [literal(PROD_CERTIFICATION_UNIT_SCRIPT)],
      capabilities: {
        browserCapable: false,
        networkCapable: false,
        subprocessCapable: false
      },
      cwd: "repo-root",
      descriptorFingerprintRequired: true,
      entrypointPaths: [PROD_CERTIFICATION_UNIT_SCRIPT],
      environmentBinding: "plan.staticEnvironmentBinding.inventorySha256",
      environmentPolicySha256: scope.staticEnvironmentPolicy.sha256,
      executableRole: "node",
      id: PROD_CERTIFICATION_UNIT_COMMAND_ID,
      ioPolicy: {
        stderr: {
          maxBytes: 262144,
          pathBinding: "plan.evidencePaths.prodCertificationStderrLog",
          sanitizeBeforeWrite: true
        },
        stdin: "ignore",
        stdout: {
          maxBytes: 262144,
          pathBinding: "plan.evidencePaths.prodCertificationStdoutLog",
          sanitizeBeforeWrite: true
        }
      },
      maySpawnCommandIds: [],
      modes: ["static-no-browser"],
      script: {
        canonicalPath: join(scope.repoRoot, PROD_CERTIFICATION_UNIT_SCRIPT),
        path: PROD_CERTIFICATION_UNIT_SCRIPT,
        sha256: scope.sourceFingerprints[PROD_CERTIFICATION_UNIT_SCRIPT]
      },
      trustedSources: PROD_CERTIFICATION_TRANSITIVE_TRUSTED_SOURCES.map((file) => ({
        canonicalPath: join(scope.repoRoot, file),
        path: file,
        sha256: scope.sourceFingerprints[file]
      })),
      typedSlotNames: []
    },
    {
      argv: [literal("--test"), literal("scripts/required-browser-source-canary.test.mjs")],
      cwd: "repo-root",
      entrypointPaths: ["scripts/required-browser-source-canary.test.mjs"],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executableRole: "node",
      id: "static.source-canary",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    },
    {
      argv: [literal(tsxCli), literal("--tsconfig"), literal("tsconfig.json"), literal("--test"), literal("tests/e2e/reported-bug-source-regressions.test.ts")],
      cwd: "repo-root",
      entrypointPaths: ["tests/e2e/reported-bug-source-regressions.test.ts"],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executableRole: "node",
      id: "static.source-regressions",
      maySpawnCommandIds: ["static.source-canary"],
      modes: ["static-no-browser"]
    },
    {
      argv: [literal(tscCli), literal("--noEmit"), literal("--incremental"), literal("false")],
      cwd: "repo-root",
      entrypointPaths: ["tsconfig.json"],
      environmentBinding: "scope.staticEnvironmentInventorySha256",
      executableRole: "node",
      id: "static.type-check",
      maySpawnCommandIds: [],
      modes: ["static-no-browser"]
    }
  ].sort((left, right) => left.id.localeCompare(right.id));
}

function validateClosedCommandCatalog(scope) {
  const catalog = scope.commandCatalog;
  assertExactKeys("required-browser command catalog", catalog, [
    "allowedCommandIds", "definitions", "deniedArgumentPatterns",
    "deniedExecutableBasenames", "sha256", "typedSlots"
  ]);
  assertCanonicalArray("required-browser command definitions", catalog.definitions,
    (left, right) => String(left?.id).localeCompare(String(right?.id)));
  assertCanonicalArray("required-browser allowed command IDs", catalog.allowedCommandIds,
    (left, right) => String(left).localeCompare(String(right)));
  const policies = canonicalCommandPolicies(scope);
  if (!sameJson(catalog.allowedCommandIds, policies
    .filter(({ modes }) => modes.includes(scope.mode)).map(({ id }) => id).sort())) {
    throw new Error("Required-browser allowed command IDs differ from canonical mode policy.");
  }
  if (!sameJson(catalog.deniedArgumentPatterns, DENIED_ARGUMENT_PATTERNS)
    || !sameJson(catalog.deniedExecutableBasenames, DENIED_EXECUTABLE_BASENAMES)
    || !sameJson(catalog.typedSlots, canonicalTypedSlots())) {
    throw new Error("Required-browser command deny/slot policy differs from canonical policy.");
  }
  if (catalog.definitions.length !== policies.length) {
    throw new Error("Required-browser command definition set is incomplete.");
  }
  const executableByRole = new Map();
  for (let index = 0; index < policies.length; index += 1) {
    const policy = policies[index];
    const definition = catalog.definitions[index];
    const keys = [
      "argv", "cwd", "entrypointPaths", "environmentBinding", "executable", "id",
      "maySpawnCommandIds", "modes"
    ];
    if (Object.hasOwn(policy, "allowedBindings")) keys.push("allowedBindings");
    for (const optionalKey of [
      "capabilities", "environmentPolicySha256", "ioPolicy", "script",
      "trustedSources", "typedSlotNames"
    ]) {
      if (Object.hasOwn(policy, optionalKey)) keys.push(optionalKey);
    }
    if (policy.descriptorFingerprintRequired) keys.push("descriptorFingerprint");
    assertExactKeys(`required-browser command ${policy.id}`, definition, keys);
    const {
      descriptorFingerprintRequired,
      executableRole,
      ...expectedShape
    } = policy;
    const {
      descriptorFingerprint,
      executable,
      ...actualShape
    } = definition;
    if (!sameJson(actualShape, expectedShape)) {
      throw new Error(`Required-browser command ${policy.id} differs from canonical policy.`);
    }
    if (descriptorFingerprintRequired) {
      const expectedDescriptorFingerprint = sha256(
        `command-descriptor\0${stableJson({ ...definition, descriptorFingerprint: undefined })}`
      );
      if (descriptorFingerprint !== expectedDescriptorFingerprint) {
        throw new Error(`Required-browser command ${policy.id} descriptor fingerprint is invalid.`);
      }
    } else if (descriptorFingerprint !== undefined) {
      throw new Error(`Required-browser command ${policy.id} has an unauthorized descriptor fingerprint.`);
    }
    assertExactKeys(`required-browser executable ${policy.id}`, executable, [
      "canonicalPath", "dev", "ino", "role", "sha256"
    ]);
    if (
      !isAbsolute(executable.canonicalPath)
      || typeof executable.dev !== "string" || !/^\d+$/.test(executable.dev)
      || typeof executable.ino !== "string" || !/^\d+$/.test(executable.ino)
      || executable.role !== executableRole
    ) throw new Error(`Required-browser executable identity for ${policy.id} is malformed.`);
    assertHexDigest(`required-browser executable hash for ${policy.id}`, executable.sha256);
    const prior = executableByRole.get(executableRole);
    if (prior && !sameJson(prior, executable)) {
      throw new Error(`Required-browser executable role ${executableRole} has conflicting identities.`);
    }
    executableByRole.set(executableRole, executable);
  }
  if (catalog.sha256 !== hashObject(catalog)) {
    throw new Error("Required-browser command catalog fingerprint is invalid.");
  }
  return policies;
}

function validateCapabilityProofs(scope) {
  const proofs = scope.capabilityProofs;
  assertExactKeys("required-browser capability proofs", proofs, [
    "analyzer", "catalogSha256", "closureSha256", "commands", "mode",
    "schemaVersion", "sha256"
  ]);
  if (
    proofs.schemaVersion !== 1
    || proofs.mode !== scope.mode
    || proofs.catalogSha256 !== scope.commandCatalog.sha256
    || proofs.closureSha256 !== scope.closure.sha256
  ) throw new Error("Required-browser capability proof root cross-links are invalid.");
  assertHexDigest("required-browser capability proof hash", proofs.sha256);

  const analyzer = proofs.analyzer;
  assertExactKeys("required-browser capability analyzer", analyzer, [
    "parser", "ruleset", "schemaVersion", "sha256", "source"
  ]);
  if (analyzer.schemaVersion !== 1) {
    throw new Error("Required-browser capability analyzer schema is invalid.");
  }
  const source = analyzer.source;
  assertExactKeys("required-browser capability analyzer source", source, [
    "canonicalPath", "path", "sha256"
  ]);
  if (
    source.path !== "scripts/required-browser-execution-scope.mjs"
    || source.canonicalPath !== join(scope.repoRoot, source.path)
    || source.sha256 !== scope.sourceFingerprints[source.path]
  ) throw new Error("Required-browser capability analyzer source binding is invalid.");
  assertHexDigest("required-browser capability analyzer source hash", source.sha256);

  const parser = analyzer.parser;
  assertExactKeys("required-browser capability parser", parser, [
    "canonicalPath", "loadedApiSha256", "packageManifestCanonicalPath",
    "packageManifestSha256", "schemaVersion", "sha256", "sourceSha256", "version"
  ]);
  const typescriptRoot = join(scope.repoRoot, "node_modules", "typescript");
  if (
    parser.schemaVersion !== 1
    || typeof parser.version !== "string"
    || parser.version === ""
    || typeof parser.canonicalPath !== "string"
    || !isAbsolute(parser.canonicalPath)
    || resolve(parser.canonicalPath) !== parser.canonicalPath
    || !parser.canonicalPath.startsWith(`${typescriptRoot}${sep}`)
    || parser.packageManifestCanonicalPath !== join(typescriptRoot, "package.json")
  ) throw new Error("Required-browser capability parser identity is invalid.");
  for (const [label, digest] of [
    ["loaded API", parser.loadedApiSha256],
    ["package manifest", parser.packageManifestSha256],
    ["source", parser.sourceSha256],
    ["proof", parser.sha256]
  ]) assertHexDigest(`required-browser capability parser ${label} hash`, digest);
  if (parser.sha256 !== domainHashObject("capability-parser", parser)) {
    throw new Error("Required-browser capability parser fingerprint is invalid.");
  }

  const ruleset = analyzer.ruleset;
  assertExactKeys("required-browser capability ruleset", ruleset, [
    "browserCallMembers", "browserModules", "capabilityClasses", "childProcessMembers",
    "childProcessModules", "defaultForbiddenCapabilities", "dynamicCodeModules",
    "filesystemDeleteMembers", "filesystemModules", "filesystemReadMembers",
    "filesystemWriteMembers", "inertDataFiles", "networkModules",
    "prodCertificationForbiddenCapabilities", "schemaVersion", "sha256",
    "shellExecutableBasenames"
  ]);
  if (
    ruleset.schemaVersion !== 1
    || ruleset.sha256 !== domainHashObject("capability-ruleset", ruleset)
    || !sameJson(ruleset, canonicalCapabilityRuleset())
  ) throw new Error("Required-browser capability ruleset is not canonical.");
  if (
    analyzer.sha256 !== domainHashObject("capability-analyzer", analyzer)
    || !/^[a-f0-9]{64}$/.test(analyzer.sha256)
  ) throw new Error("Required-browser capability analyzer fingerprint is invalid.");

  assertCanonicalArray(
    "required-browser capability command proofs",
    proofs.commands,
    (left, right) => String(left?.commandId).localeCompare(String(right?.commandId))
  );
  if (!sameJson(
    proofs.commands.map(({ commandId }) => commandId),
    scope.commandCatalog.allowedCommandIds
  )) throw new Error("Required-browser capability command set differs from the mode catalog.");

  const definitionsById = new Map(
    scope.commandCatalog.definitions.map((definition) => [definition.id, definition])
  );
  const closureByPath = new Map(scope.closure.files.map((entry) => [entry.path, entry]));
  const analysisPayloadByPath = new Map();
  for (const command of proofs.commands) {
    assertExactKeys(`required-browser capability command ${String(command?.commandId)}`, command, [
      "analyzerSha256", "catalogCapabilities", "catalogSha256", "closureSha256",
      "commandDefinitionSha256", "commandId", "descriptorFingerprint", "files",
      "findingCounts", "forbiddenCapabilities", "mode", "parserSha256", "proofSha256",
      "rulesetSha256", "schemaVersion"
    ]);
    const definition = definitionsById.get(command.commandId);
    if (
      !definition
      || command.schemaVersion !== 1
      || command.mode !== scope.mode
      || command.analyzerSha256 !== analyzer.sha256
      || command.parserSha256 !== parser.sha256
      || command.rulesetSha256 !== ruleset.sha256
      || command.catalogSha256 !== scope.commandCatalog.sha256
      || command.closureSha256 !== scope.closure.sha256
      || command.commandDefinitionSha256 !== sha256(
        `capability-command-definition\0${stableJson(definition)}`
      )
      || command.descriptorFingerprint !== (definition.descriptorFingerprint ?? null)
    ) throw new Error(`Required-browser capability command cross-links are invalid: ${command.commandId}`);

    assertExactKeys(`required-browser capability catalog flags ${command.commandId}`, command.catalogCapabilities, [
      "browserCapable", "networkCapable", "subprocessCapable"
    ]);
    const expectedCatalogCapabilities = {
      browserCapable: definition.capabilities?.browserCapable ?? null,
      networkCapable: definition.capabilities?.networkCapable ?? null,
      subprocessCapable: definition.capabilities?.subprocessCapable ?? null
    };
    if (!sameJson(command.catalogCapabilities, expectedCatalogCapabilities)) {
      throw new Error(`Required-browser capability catalog flags differ for ${command.commandId}.`);
    }
    const expectedForbidden = command.commandId === PROD_CERTIFICATION_UNIT_COMMAND_ID
      ? [...PROD_CERTIFICATION_FORBIDDEN_CAPABILITIES]
      : [...DEFAULT_FORBIDDEN_CAPABILITIES];
    assertCanonicalArray(
      `required-browser forbidden capabilities ${command.commandId}`,
      command.forbiddenCapabilities,
      (left, right) => String(left).localeCompare(String(right))
    );
    if (!sameJson(command.forbiddenCapabilities, expectedForbidden)) {
      throw new Error(`Required-browser forbidden capability policy differs for ${command.commandId}.`);
    }

    const expectedRolesByPath = new Map();
    const addExpectedRole = (file, role) => {
      const roles = expectedRolesByPath.get(file) ?? new Set();
      roles.add(role);
      expectedRolesByPath.set(file, roles);
    };
    for (const entry of scope.closure.files) {
      if (entry.reachableFromCommandIds.includes(command.commandId)) {
        addExpectedRole(entry.path, "runtime");
      }
    }
    for (const trustedSource of definition.trustedSources ?? []) {
      addExpectedRole(trustedSource.path, "trusted-source");
    }
    addExpectedRole(source.path, "capability-analyzer");
    addExpectedRole(source.path, "command-catalog");

    assertCanonicalArray(
      `required-browser capability files ${command.commandId}`,
      command.files,
      (left, right) => String(left?.path).localeCompare(String(right?.path))
    );
    if (!sameJson(
      command.files.map(({ path }) => path),
      [...expectedRolesByPath.keys()].sort()
    )) throw new Error(`Required-browser capability file set differs for ${command.commandId}.`);

    const recomputedFindingCounts = Object.fromEntries(
      CAPABILITY_CLASSES.map((capability) => [capability, 0])
    );
    for (const file of command.files) {
      assertExactKeys(`required-browser capability file ${file.path}`, file, [
        "capabilityFindings", "inertCapabilitySites", "path", "proofSha256", "roles",
        "schemaVersion", "sensitiveImportCounts", "sourceSha256"
      ]);
      assertRepoRelativePath("required-browser capability file path", file.path);
      if (file.schemaVersion !== 1 || !expectedRolesByPath.has(file.path)) {
        throw new Error(`Required-browser capability file schema or ownership is invalid: ${file.path}`);
      }
      assertCanonicalArray(
        `required-browser capability roles ${file.path}`,
        file.roles,
        (left, right) => String(left).localeCompare(String(right))
      );
      if (!sameJson(file.roles, [...expectedRolesByPath.get(file.path)].sort())) {
        throw new Error(`Required-browser capability roles differ for ${file.path}.`);
      }
      assertHexDigest(`required-browser capability source hash ${file.path}`, file.sourceSha256);
      const closureEntry = closureByPath.get(file.path);
      if (file.roles.includes("runtime") && closureEntry?.sha256 !== file.sourceSha256) {
        throw new Error(`Required-browser capability runtime hash differs for ${file.path}.`);
      }
      if (
        Object.hasOwn(scope.sourceFingerprints, file.path)
        && scope.sourceFingerprints[file.path] !== file.sourceSha256
      ) throw new Error(`Required-browser capability/proof-input hash differs for ${file.path}.`);
      const trustedSource = (definition.trustedSources ?? []).find(({ path }) => path === file.path);
      if (file.roles.includes("trusted-source") && trustedSource?.sha256 !== file.sourceSha256) {
        throw new Error(`Required-browser capability trusted-source hash differs for ${file.path}.`);
      }
      if (
        (file.roles.includes("capability-analyzer") || file.roles.includes("command-catalog"))
        && (file.path !== source.path || file.sourceSha256 !== source.sha256)
      ) throw new Error("Required-browser capability analyzer/catalog file binding differs.");

      assertCanonicalArray(`required-browser capability findings ${file.path}`, file.capabilityFindings);
      assertCanonicalArray(`required-browser inert capability sites ${file.path}`, file.inertCapabilitySites);
      const validateFinding = (finding, inert) => {
        assertExactKeys(`required-browser capability finding ${file.path}`, finding, [
          "capability", "column", "file", "kind", "line", "member", "sourceKind",
          "syntaxSha256"
        ]);
        if (
          !CAPABILITY_CLASSES.includes(finding.capability)
          || finding.file !== file.path
          || !Number.isSafeInteger(finding.line) || finding.line < 1
          || !Number.isSafeInteger(finding.column) || finding.column < 1
          || typeof finding.kind !== "string" || finding.kind === ""
          || typeof finding.sourceKind !== "string" || finding.sourceKind === ""
          || !(finding.member === null || (typeof finding.member === "string" && finding.member !== ""))
        ) throw new Error(`Required-browser capability finding is malformed for ${file.path}.`);
        assertHexDigest(`required-browser capability syntax hash ${file.path}`, finding.syntaxSha256);
        if (inert && (
          finding.kind !== "inert-capability-token"
          || finding.sourceKind !== "inert-literal-or-comment"
        )) throw new Error(`Required-browser inert capability finding is executable: ${file.path}.`);
      };
      for (const finding of file.capabilityFindings) {
        validateFinding(finding, false);
        recomputedFindingCounts[finding.capability] += 1;
      }
      for (const finding of file.inertCapabilitySites) validateFinding(finding, true);
      if (file.inertCapabilitySites.length > 0 && !ruleset.inertDataFiles.includes(file.path)) {
        throw new Error(`Required-browser inert capability data escaped its allowlist: ${file.path}.`);
      }

      assertExactKeys(`required-browser sensitive import counts ${file.path}`, file.sensitiveImportCounts, [
        "browser", "dynamicCode", "filesystem", "network", "subprocess"
      ]);
      const expectedSensitiveImportCounts = {
        browser: 0,
        dynamicCode: 0,
        filesystem: 0,
        network: 0,
        subprocess: 0
      };
      for (const finding of file.capabilityFindings.filter(({ kind }) =>
        kind === "sensitive-module-import"
      )) {
        const key = {
          browser: "browser",
          "dynamic-code": "dynamicCode",
          "filesystem-read": "filesystem",
          network: "network",
          subprocess: "subprocess"
        }[finding.capability];
        if (!key) throw new Error(`Required-browser sensitive import class is invalid: ${file.path}.`);
        expectedSensitiveImportCounts[key] += 1;
      }
      if (!sameJson(file.sensitiveImportCounts, expectedSensitiveImportCounts)) {
        throw new Error(`Required-browser sensitive import counts differ for ${file.path}.`);
      }
      for (const value of Object.values(file.sensitiveImportCounts)) {
        if (!Number.isSafeInteger(value) || value < 0) {
          throw new Error(`Required-browser sensitive import count is invalid: ${file.path}.`);
        }
      }
      const analysisPayload = {
        capabilityFindings: file.capabilityFindings,
        inertCapabilitySites: file.inertCapabilitySites,
        sensitiveImportCounts: file.sensitiveImportCounts,
        sourceSha256: file.sourceSha256
      };
      const priorAnalysisPayload = analysisPayloadByPath.get(file.path);
      if (priorAnalysisPayload && !sameJson(priorAnalysisPayload, analysisPayload)) {
        throw new Error(`Required-browser capability analysis conflicts across commands: ${file.path}.`);
      }
      analysisPayloadByPath.set(file.path, analysisPayload);
      if (file.proofSha256 !== domainHashObject(
        "capability-file-proof",
        file,
        "proofSha256"
      )) throw new Error(`Required-browser capability file fingerprint is invalid: ${file.path}.`);
    }

    assertExactKeys(`required-browser capability finding counts ${command.commandId}`, command.findingCounts, CAPABILITY_CLASSES);
    for (const value of Object.values(command.findingCounts)) {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`Required-browser capability finding count is invalid: ${command.commandId}.`);
      }
    }
    if (!sameJson(command.findingCounts, recomputedFindingCounts)) {
      throw new Error(`Required-browser capability finding counts differ for ${command.commandId}.`);
    }
    if (command.forbiddenCapabilities.some((capability) => command.findingCounts[capability] !== 0)) {
      throw new Error(`Required-browser forbidden capability is nonzero for ${command.commandId}.`);
    }
    for (const [key, capabilities] of [
      ["browserCapable", ["browser"]],
      ["networkCapable", ["network"]],
      ["subprocessCapable", ["shell", "subprocess"]]
    ]) {
      if (
        command.catalogCapabilities[key] === false
        && capabilities.some((capability) => command.findingCounts[capability] !== 0)
      ) throw new Error(`Required-browser catalog capability is contradicted for ${command.commandId}.`);
    }
    if (command.proofSha256 !== domainHashObject(
      "capability-command-proof",
      command,
      "proofSha256"
    )) throw new Error(`Required-browser capability command fingerprint is invalid: ${command.commandId}.`);
  }

  if (proofs.sha256 !== domainHashObject("capability-proofs", proofs)) {
    throw new Error("Required-browser capability proof fingerprint is invalid.");
  }
}

export function validateRequiredBrowserExecutionScopeSnapshot(scope) {
  assertExactKeys("required-browser execution scope", scope, [
    "capabilityProofs", "closure", "commandCatalog", "dependencyAttestationFingerprint",
    "destructiveLedger", "mode", "proofInputs", "repoRoot", "schemaVersion",
    "scopeFingerprint", "sourceFingerprints", "staticEnvironmentPolicy", "status"
  ]);
  if (scope.schemaVersion !== SCHEMA_VERSION || scope.status !== "validated") {
    throw new Error("Required-browser execution scope status or schema is invalid.");
  }
  const canonicalStaticEnvironmentPolicy = requiredBrowserStaticEnvironmentPolicy();
  if (!sameJson(scope.staticEnvironmentPolicy, canonicalStaticEnvironmentPolicy)) {
    throw new Error("Required-browser static environment policy differs from canonical policy.");
  }
  if (
    !SCOPE_MODES.includes(scope.mode)
    || typeof scope.repoRoot !== "string"
    || !isAbsolute(scope.repoRoot)
    || resolve(scope.repoRoot) !== scope.repoRoot
  ) throw new Error("Required-browser execution scope mode or repository binding is invalid.");
  assertHexDigest("required-browser dependency attestation fingerprint", scope.dependencyAttestationFingerprint);

  assertExactKeys("required-browser proof inputs", scope.proofInputs, ["files", "sha256"]);
  if (!sameJson(scope.proofInputs.files, REQUIRED_BROWSER_PROOF_INPUT_FILES)) {
    throw new Error("Required-browser proof-input file set differs from the canonical manifest.");
  }
  if (scope.proofInputs.sha256 !== hashObject(scope.proofInputs)) {
    throw new Error("Required-browser proof-input fingerprint is invalid.");
  }
  assertExactKeys(
    "required-browser source fingerprints",
    scope.sourceFingerprints,
    REQUIRED_BROWSER_PROOF_INPUT_FILES
  );
  for (const [file, digest] of Object.entries(scope.sourceFingerprints)) {
    assertRepoRelativePath(`required-browser source fingerprint path ${file}`, file);
    assertHexDigest(`required-browser source fingerprint ${file}`, digest);
  }

  const policies = validateClosedCommandCatalog(scope);
  const policyById = new Map(policies.map((policy) => [policy.id, policy]));
  const allowedCommandIds = new Set(scope.commandCatalog.allowedCommandIds);

  assertExactKeys("required-browser closure", scope.closure, [
    "commandEntrypoints", "files", "importEdges", "sha256", "spawnEdges",
    "unresolvedLocalImports", "unresolvedSpawnSites"
  ]);
  assertCanonicalArray("required-browser command entrypoints", scope.closure.commandEntrypoints,
    (left, right) => String(left?.commandId).localeCompare(String(right?.commandId)));
  const expectedEntrypoints = policies
    .filter(({ modes }) => modes.includes(scope.mode))
    .map(({ entrypointPaths, id }) => ({ commandId: id, paths: [...entrypointPaths].sort() }))
    .sort((left, right) => left.commandId.localeCompare(right.commandId));
  if (!sameJson(scope.closure.commandEntrypoints, expectedEntrypoints)) {
    throw new Error("Required-browser closure entrypoints differ from canonical command policy.");
  }

  assertCanonicalArray("required-browser closure files", scope.closure.files,
    (left, right) => String(left?.path).localeCompare(String(right?.path)));
  const fileByPath = new Map();
  for (const file of scope.closure.files) {
    assertExactKeys("required-browser closure file", file, [
      "path", "reachableFromCommandIds", "sha256"
    ]);
    assertRepoRelativePath("required-browser closure file path", file.path);
    assertCanonicalArray(
      `required-browser closure reachability ${file.path}`,
      file.reachableFromCommandIds,
      (left, right) => String(left).localeCompare(String(right))
    );
    if (
      file.reachableFromCommandIds.length === 0
      || file.reachableFromCommandIds.some((id) => !allowedCommandIds.has(id))
    ) throw new Error(`Required-browser closure file ${file.path} has invalid reachability.`);
    assertHexDigest(`required-browser closure file hash ${file.path}`, file.sha256);
    if (
      Object.hasOwn(scope.sourceFingerprints, file.path)
      && scope.sourceFingerprints[file.path] !== file.sha256
    ) throw new Error(`Required-browser closure/proof hash differs for ${file.path}.`);
    fileByPath.set(file.path, file);
  }
  for (const entrypoint of scope.closure.commandEntrypoints) {
    assertExactKeys(`required-browser entrypoint ${entrypoint.commandId}`, entrypoint, [
      "commandId", "paths"
    ]);
    for (const path of entrypoint.paths) {
      const file = fileByPath.get(path);
      if (!file || !file.reachableFromCommandIds.includes(entrypoint.commandId)) {
        throw new Error(
          `Required-browser command ${entrypoint.commandId} is not bound to entrypoint ${path}.`
        );
      }
    }
  }

  assertCanonicalArray("required-browser import edges", scope.closure.importEdges);
  const importKinds = new Set([
    "bound-computed-import", "dynamic-import", "import-equals", "require",
    "static-export", "static-import"
  ]);
  for (const edge of scope.closure.importEdges) {
    assertExactKeys("required-browser import edge", edge, ["from", "kind", "to"]);
    if (!importKinds.has(edge.kind) || !fileByPath.has(edge.from) || !fileByPath.has(edge.to)) {
      throw new Error("Required-browser import edge is not closed over the file manifest.");
    }
    const fromIds = fileByPath.get(edge.from).reachableFromCommandIds;
    const toIds = new Set(fileByPath.get(edge.to).reachableFromCommandIds);
    if (fromIds.some((id) => !toIds.has(id))) {
      throw new Error("Required-browser import edge does not propagate command reachability.");
    }
  }

  assertCanonicalArray("required-browser spawn edges", scope.closure.spawnEdges);
  for (const edge of scope.closure.spawnEdges) {
    assertExactKeys("required-browser spawn edge", edge, [
      "commandId", "file", "line", "syntaxSha256"
    ]);
    const file = fileByPath.get(edge.file);
    if (
      !file
      || !allowedCommandIds.has(edge.commandId)
      || !Number.isSafeInteger(edge.line)
      || edge.line < 1
    ) throw new Error("Required-browser spawn edge is malformed or unbound.");
    assertHexDigest("required-browser spawn syntax hash", edge.syntaxSha256);
    const authorized = file.reachableFromCommandIds.includes(edge.commandId)
      || file.reachableFromCommandIds.some((parentId) =>
        policyById.get(parentId)?.maySpawnCommandIds.includes(edge.commandId)
      );
    if (!authorized) {
      throw new Error("Required-browser spawn edge lacks an authorized parent command.");
    }
  }
  if (
    !Array.isArray(scope.closure.unresolvedLocalImports)
    || !Array.isArray(scope.closure.unresolvedSpawnSites)
    || scope.closure.unresolvedLocalImports.length !== 0
    || scope.closure.unresolvedSpawnSites.length !== 0
  ) throw new Error("Required-browser execution closure contains unresolved edges.");
  if (scope.closure.sha256 !== hashObject(scope.closure)) {
    throw new Error("Required-browser execution closure fingerprint is invalid.");
  }

  validateCapabilityProofs(scope);

  assertExactKeys("required-browser destructive ledger", scope.destructiveLedger, [
    "entries", "outOfScopeEntries", "reachableEntries", "sha256"
  ]);
  assertCanonicalArray("required-browser destructive ledger entries", scope.destructiveLedger.entries);
  const allowedSemanticClasses = new Set([
    "active-child-process-delete", "active-filesystem-delete", "active-non-ecma-delete",
    "dormant-package-script", "inert-literal-or-comment"
  ]);
  const allowedDispositions = new Set([
    "CAPABILITY_DOMINATED_EXACT_LEAF", "DORMANT_PACKAGE_SCRIPT",
    "INERT_LITERAL_OR_COMMENT", "NO_IMPORT_OR_SPAWN_PATH_FROM_SCOPE"
  ]);
  for (const entry of scope.destructiveLedger.entries) {
    assertExactKeys("required-browser destructive ledger entry", entry, [
      "column", "disposition", "file", "kind", "line", "reachableFromCommandIds",
      "semanticClass", "sourceSha256", "statementSha256"
    ]);
    assertRepoRelativePath("required-browser destructive ledger path", entry.file);
    if (
      !Number.isSafeInteger(entry.line) || entry.line < 1
      || !Number.isSafeInteger(entry.column) || entry.column < 1
      || typeof entry.kind !== "string" || entry.kind === ""
      || !allowedSemanticClasses.has(entry.semanticClass)
      || !allowedDispositions.has(entry.disposition)
    ) throw new Error("Required-browser destructive ledger entry is malformed.");
    assertCanonicalArray(
      `required-browser destructive reachability ${entry.file}:${entry.line}`,
      entry.reachableFromCommandIds,
      (left, right) => String(left).localeCompare(String(right))
    );
    if (entry.reachableFromCommandIds.some((id) => !allowedCommandIds.has(id))) {
      throw new Error("Required-browser destructive ledger references an unauthorized command.");
    }
    assertHexDigest("required-browser destructive source hash", entry.sourceSha256);
    assertHexDigest("required-browser destructive statement hash", entry.statementSha256);
    const closureFile = fileByPath.get(entry.file);
    if (closureFile && closureFile.sha256 !== entry.sourceSha256) {
      throw new Error("Required-browser destructive ledger source hash differs from closure.");
    }
    const active = entry.semanticClass.startsWith("active-");
    const expectedReachability = active && closureFile
      ? closureFile.reachableFromCommandIds
      : [];
    if (!sameJson(entry.reachableFromCommandIds, expectedReachability)) {
      throw new Error(
        "Required-browser destructive effect reachability differs from closure semantics."
      );
    }
    if (entry.semanticClass === "inert-literal-or-comment") {
      if (entry.disposition !== "INERT_LITERAL_OR_COMMENT") {
        throw new Error("Inert destructive token has an executable disposition.");
      }
    } else if (entry.semanticClass === "dormant-package-script") {
      if (entry.file !== "package.json" || entry.disposition !== "DORMANT_PACKAGE_SCRIPT") {
        throw new Error("Dormant package script has an invalid disposition.");
      }
    } else if (entry.disposition === "CAPABILITY_DOMINATED_EXACT_LEAF") {
      if (
        entry.file !== "scripts/test-fixture-capability.mjs"
        || entry.semanticClass !== "active-filesystem-delete"
      ) throw new Error("Capability-dominated delete escaped the central capability primitive.");
    } else if (entry.reachableFromCommandIds.length === 0) {
      if (entry.disposition !== "NO_IMPORT_OR_SPAWN_PATH_FROM_SCOPE") {
        throw new Error("Out-of-scope destructive effect has an invalid disposition.");
      }
    } else {
      throw new Error("Reachable destructive effect is not capability dominated.");
    }
  }
  const expectedReachable = scope.destructiveLedger.entries.filter(
    ({ reachableFromCommandIds }) => reachableFromCommandIds.length > 0
  );
  const expectedOutOfScope = scope.destructiveLedger.entries.filter(
    ({ reachableFromCommandIds }) => reachableFromCommandIds.length === 0
  );
  if (
    !sameJson(scope.destructiveLedger.reachableEntries, expectedReachable)
    || !sameJson(scope.destructiveLedger.outOfScopeEntries, expectedOutOfScope)
  ) throw new Error("Required-browser destructive ledger partitions are inconsistent.");
  if (scope.destructiveLedger.sha256 !== hashObject(scope.destructiveLedger)) {
    throw new Error("Required-browser destructive ledger fingerprint is invalid.");
  }

  if (scope.scopeFingerprint !== hashObject(scope, "scopeFingerprint")) {
    throw new Error("Required-browser execution scope fingerprint is invalid.");
  }
  return Object.freeze(stableValue(scope));
}

export function assertLiveRequiredBrowserExecutionScope(
  scope,
  { dependencyAttestation, repoRoot, sourceFingerprints }
) {
  const shaped = validateRequiredBrowserExecutionScopeSnapshot(scope);
  const rebuilt = buildRequiredBrowserExecutionScope({
    dependencyAttestation,
    mode: shaped.mode,
    repoRoot,
    sourceFingerprints
  });
  if (!sameJson(rebuilt, shaped)) {
    throw new Error("Required-browser execution scope differs from independent rebuild.");
  }
  return rebuilt;
}

function valueForSlot(name, bindings, plan, definition) {
  if (name === "servicePort") {
    const value = bindings.servicePort ?? plan?.servicePort;
    if (
      !Number.isSafeInteger(value)
      || value < 32000
      || value > 41999
      || value !== plan?.servicePort
    ) {
      throw new Error("servicePort slot must equal the validated plan port.");
    }
    return String(value);
  }
  if (name === "requiredConfig") {
    const value = bindings.requiredConfig;
    if (
      typeof value !== "string"
      || !isAbsolute(value)
      || !value.startsWith(`${plan?.ownerRoot}${sep}`)
    ) throw new Error("requiredConfig slot must be an exact plan-owned path.");
    return value;
  }
  if (name === "provenOwnedPid") {
    const value = Number(bindings.provenOwnedPid);
    const identities = plan?.ownedProcessIdentities;
    if (
      !Number.isSafeInteger(value)
      || value <= 1
      || !Array.isArray(identities)
      || !identities.some(({ pid }) => pid === value)
    ) throw new Error("provenOwnedPid slot is not in the validated identity registry.");
    return String(value);
  }
  if (name === "declaredMjs") {
    const value = bindings.declaredMjs;
    if (!REQUIRED_BROWSER_PROOF_INPUT_FILES.includes(value) || !value.endsWith(".mjs")) {
      throw new Error("declaredMjs slot is not a declared proof input.");
    }
    return value;
  }
  if (["spec", "project", "grep"].includes(name)) {
    const binding = {
      contractId: bindings.contractId,
      grep: bindings.grep,
      project: bindings.project,
      spec: bindings.spec
    };
    if (!definition.allowedBindings?.some((allowed) => sameJson(allowed, binding))) {
      throw new Error("Playwright discovery slots are not one exact execution-matrix binding.");
    }
    return String(bindings[name]);
  }
  throw new Error(`Unknown required-browser command slot: ${name}`);
}

export function resolveRequiredBrowserCommandSet({
  dependencyAttestation,
  executionScope,
  plan,
  repoRoot
}) {
  const validatedScope = assertLiveRequiredBrowserExecutionScope(executionScope, {
    dependencyAttestation,
    repoRoot,
    sourceFingerprints: executionScope.sourceFingerprints
  });
  if (
    !plan
    || plan.repoRoot !== validatedScope.repoRoot
    || !sameJson(plan.executionScope, validatedScope)
  ) {
    throw new Error("Required-browser command resolution requires the exact scope-bound plan.");
  }
  const byId = new Map(validatedScope.commandCatalog.definitions.map((definition) => [
    definition.id,
    definition
  ]));
  return Object.freeze({
    allowedCommandIds: Object.freeze([...validatedScope.commandCatalog.allowedCommandIds]),
    resolve(commandId, bindings = {}) {
      if (!validatedScope.commandCatalog.allowedCommandIds.includes(commandId)) {
        throw new Error(`Required-browser command ID is not authorized: ${String(commandId)}`);
      }
      const definition = byId.get(commandId);
      if (!definition) throw new Error("Authorized command ID has no canonical definition.");
      const args = definition.argv.map((entry) => {
        if (entry.kind === "literal") return entry.value;
        if (entry.kind !== "validated-slot") throw new Error("Command argv template kind is invalid.");
        return `${entry.prefix}${valueForSlot(entry.name, bindings, plan, definition)}`;
      });
      const environmentInventorySha256 = plan.environmentBinding?.inventorySha256;
      if (!/^[a-f0-9]{64}$/.test(environmentInventorySha256 ?? "")) {
        throw new Error("Command resolution requires a plan environment inventory hash.");
      }
      const cwd = definition.cwd === "repo-root" ? plan.repoRoot : plan.ownerRoot;
      return Object.freeze({
        args: Object.freeze(args),
        argvSha256: sha256(stableJson(args)),
        command: definition.executable.canonicalPath,
        commandId,
        cwd,
        environmentInventorySha256,
        executable: definition.executable,
        scopeFingerprint: validatedScope.scopeFingerprint
      });
    },
    scopeFingerprint: validatedScope.scopeFingerprint
  });
}

function assertInvocationArgv(argv, label) {
  if (!Array.isArray(argv) || argv.some((value) => typeof value !== "string")) {
    throw new Error(`${label} invocation argv must be an array of strings.`);
  }
  return argv;
}

function exactDescriptorArgv(descriptor) {
  return [descriptor.command, ...descriptor.args];
}

function invocationReceipt({ argv, commandId, cwd, descriptor, validatedScope }) {
  if (canonicalRepoRoot(cwd) !== descriptor.cwd) {
    throw new Error(`${commandId} invocation cwd differs from its canonical descriptor.`);
  }
  const expectedArgv = exactDescriptorArgv(descriptor);
  if (!sameJson(argv, expectedArgv)) {
    throw new Error(`${commandId} invocation does not exactly match its canonical descriptor.`);
  }
  const definition = validatedScope.commandCatalog.definitions.find(({ id }) => id === commandId);
  const capabilityProof = validatedScope.capabilityProofs.commands.find(
    (proof) => proof.commandId === commandId
  );
  const expectedCommandDefinitionSha256 = definition
    ? sha256(`capability-command-definition\0${stableJson(definition)}`)
    : null;
  if (
    !definition
    || !capabilityProof
    || typeof definition.descriptorFingerprint !== "string"
    || !/^[a-f0-9]{64}$/.test(definition.descriptorFingerprint)
    || capabilityProof.descriptorFingerprint !== definition.descriptorFingerprint
    || capabilityProof.commandDefinitionSha256 !== expectedCommandDefinitionSha256
    || !/^[a-f0-9]{64}$/.test(capabilityProof.proofSha256 ?? "")
    || descriptor.scopeFingerprint !== validatedScope.scopeFingerprint
    || definition.environmentBinding !== "plan.environmentBinding.inventorySha256"
    || !/^[a-f0-9]{64}$/.test(descriptor.environmentInventorySha256 ?? "")
  ) {
    throw new Error(`${commandId} invocation descriptor/capability binding is invalid.`);
  }
  return Object.freeze(stableValue({
    argvSha256: sha256(stableJson(expectedArgv)),
    capabilityProofSha256: capabilityProof.proofSha256,
    commandDefinitionSha256: capabilityProof.commandDefinitionSha256,
    commandId,
    descriptorFingerprint: definition.descriptorFingerprint,
    environmentInventorySha256: descriptor.environmentInventorySha256,
    executableSha256: descriptor.executable.sha256,
    resolvedArgsSha256: descriptor.argvSha256,
    scopeFingerprint: descriptor.scopeFingerprint
  }));
}

function matchingInvocationReceipt({ argv, commandId, cwd, descriptor, validatedScope }) {
  if (!sameJson(argv, exactDescriptorArgv(descriptor))) return null;
  return invocationReceipt({ argv, commandId, cwd, descriptor, validatedScope });
}

function liveInvocationContext({ dependencyAttestation, executionScope, plan, repoRoot }) {
  const validatedScope = assertLiveRequiredBrowserExecutionScope(executionScope, {
    dependencyAttestation,
    repoRoot,
    sourceFingerprints: executionScope.sourceFingerprints
  });
  const commandSet = resolveRequiredBrowserCommandSet({
    dependencyAttestation,
    executionScope: validatedScope,
    plan,
    repoRoot
  });
  return { commandSet, validatedScope };
}

export function validateRequiredBrowserPlaywrightInvocation({
  argv,
  cwd = process.cwd(),
  dependencyAttestation,
  executionScope,
  plan,
  repoRoot
}) {
  assertInvocationArgv(argv, "Playwright");
  const { commandSet, validatedScope } = liveInvocationContext({
    dependencyAttestation,
    executionScope,
    plan,
    repoRoot
  });
  if (commandSet.allowedCommandIds.includes("owner.playwright.discovery")) {
    for (const { contractId, grep, project, spec } of matrixBindings()) {
      const descriptor = commandSet.resolve("owner.playwright.discovery", {
        contractId,
        grep,
        project,
        spec
      });
      const receipt = matchingInvocationReceipt({
        argv,
        commandId: "owner.playwright.discovery",
        cwd,
        descriptor,
        validatedScope
      });
      if (receipt) return receipt;
    }
  }
  if (commandSet.allowedCommandIds.includes("owner.playwright.final")) {
    const descriptor = commandSet.resolve("owner.playwright.final", {
      requiredConfig: plan?.paths?.requiredConfig
    });
    const receipt = matchingInvocationReceipt({
      argv,
      commandId: "owner.playwright.final",
      cwd,
      descriptor,
      validatedScope
    });
    if (receipt) return receipt;
  }
  throw new Error("Playwright invocation does not exactly match an authorized command descriptor.");
}

export function validateRequiredBrowserNextInvocation({
  argv,
  cwd = process.cwd(),
  dependencyAttestation,
  executionScope,
  plan,
  repoRoot
}) {
  assertInvocationArgv(argv, "Next");
  const { commandSet, validatedScope } = liveInvocationContext({
    dependencyAttestation,
    executionScope,
    plan,
    repoRoot
  });
  for (const commandId of ["owner.next.build", "owner.next.service"]) {
    if (!commandSet.allowedCommandIds.includes(commandId)) continue;
    const descriptor = commandSet.resolve(
      commandId,
      commandId === "owner.next.service" ? { servicePort: plan?.servicePort } : {}
    );
    const receipt = matchingInvocationReceipt({
      argv,
      commandId,
      cwd,
      descriptor,
      validatedScope
    });
    if (receipt) return receipt;
  }
  throw new Error("Next invocation does not exactly match an authorized build/service descriptor.");
}

const PORTABLE_LIST_ENVIRONMENT_KEYS = Object.freeze([
  "HOME",
  "PLAYWRIGHT_PORTABLE_LIST_ONLY"
]);
const PORTABLE_LIST_FLAG = "PLAYWRIGHT_PORTABLE_LIST_ONLY";
const PORTABLE_LIST_MODE = "portable-list-only";
const PORTABLE_PLAYWRIGHT_CONFIG = "playwright.config.ts";
const PORTABLE_PLAYWRIGHT_PACKAGE = "@playwright/test";
const PORTABLE_PLAYWRIGHT_VERSION = "1.59.1";
const PORTABLE_TYPESCRIPT_VERSION = "5.8.3";
const PORTABLE_AUTHORITY_SOURCE = "scripts/required-browser-execution-scope.mjs";
const PORTABLE_FORBIDDEN_CAPABILITIES = Object.freeze([
  "browser",
  "dynamic-code",
  "filesystem-delete",
  "filesystem-write",
  "network",
  "shell",
  "subprocess",
  "unknown"
]);

function portablePhysicalIdentity(label, candidate, expectedKind) {
  if (typeof candidate !== "string" || !isAbsolute(candidate) || resolve(candidate) !== candidate) {
    throw new Error(`${label} must be an absolute canonical path.`);
  }
  const entry = lstatSync(candidate, { throwIfNoEntry: false });
  if (
    !entry
    || entry.isSymbolicLink()
    || (expectedKind === "directory" ? !entry.isDirectory() : !entry.isFile())
    || realpathSync(candidate) !== candidate
  ) {
    throw new Error(`${label} must be a physical canonical ${expectedKind}.`);
  }
  return Object.freeze(stableValue({
    canonicalPath: candidate,
    dev: String(entry.dev),
    ino: String(entry.ino),
    physical: true,
    ...(expectedKind === "file" ? { sha256: sha256File(candidate) } : {})
  }));
}

function compactPortableSyntax(node, sourceFile) {
  return node.getText(sourceFile).replace(/\s+/g, "");
}

function canonicalPortablePlaywrightConfigProfile() {
  const expectedFacts = {
    forbiddenCapabilityCounts: Object.fromEntries(
      PORTABLE_FORBIDDEN_CAPABILITIES.map((capability) => [capability, 0])
    ),
    imports: [
      {
        defaultImport: null,
        module: "node:module",
        namedImports: [{ imported: "createRequire", local: "createRequire", typeOnly: false }],
        namespaceImport: null,
        sideEffectOnly: false,
        typeOnly: false
      },
      {
        defaultImport: "path",
        module: "node:path",
        namedImports: [],
        namespaceImport: null,
        sideEffectOnly: false,
        typeOnly: false
      },
      {
        defaultImport: null,
        module: "@playwright/test",
        namedImports: [{ imported: "PlaywrightTestConfig", local: "PlaywrightTestConfig", typeOnly: true }],
        namespaceImport: null,
        sideEffectOnly: false,
        typeOnly: true
      },
      {
        defaultImport: null,
        module: "./scripts/playwright-owner-paths.mjs",
        namedImports: [
          { imported: "assertCanonicalStarshipBrowserHost", local: "assertCanonicalStarshipBrowserHost", typeOnly: false },
          { imported: "classifyPlaywrightCliInvocation", local: "classifyPlaywrightCliInvocation", typeOnly: false },
          { imported: "validatePlaywrightOwnerEnvironment", local: "validatePlaywrightOwnerEnvironment", typeOnly: false }
        ],
        namespaceImport: null,
        sideEffectOnly: false,
        typeOnly: false
      },
      {
        defaultImport: null,
        module: "./scripts/required-browser-execution-scope.mjs",
        namedImports: [
          { imported: "assertRequiredBrowserPortableListInvocationUnchanged", local: "assertRequiredBrowserPortableListInvocationUnchanged", typeOnly: false },
          { imported: "captureRequiredBrowserPortableListInvocation", local: "captureRequiredBrowserPortableListInvocation", typeOnly: false },
          { imported: "validateRequiredBrowserPlaywrightInvocation", local: "validateRequiredBrowserPlaywrightInvocation", typeOnly: false }
        ],
        namespaceImport: null,
        sideEffectOnly: false,
        typeOnly: false
      },
      {
        defaultImport: null,
        module: "./scripts/live-home-protection.mjs",
        namedImports: [
          { imported: "assertLiveHomeProof", local: "assertLiveHomeProof", typeOnly: false },
          { imported: "createLiveHomeProof", local: "createLiveHomeProof", typeOnly: false }
        ],
        namespaceImport: null,
        sideEffectOnly: false,
        typeOnly: false
      }
    ],
    loaderCalls: [
      { argument: "@playwright/test", container: "owner-config-branch" },
      { argument: "typescript", container: "e2eTempTsconfigExcludeGlobs" }
    ],
    sensitiveImportCounts: {
      browser: 0,
      dynamicCode: 0,
      filesystem: 0,
      network: 0,
      subprocess: 0
    },
    syntaxSha256: {
      captureDetachedPlaywrightConfigContext: sha256(
        "{assertLiveHomeProof(configLiveHomeProof);constcontext=Object.freeze({argv:Object.freeze([...process.argv]),cwd:path.resolve(process.cwd()),environment:detachedProcessEnvironment()});assertLiveHomeProof(configLiveHomeProof);returncontext;}"
      ),
      detachedProcessEnvironment: sha256(
        "{constenvironment:Record<string,string|undefined>={};for(constkeyofObject.keys(process.env).sort()){constdescriptor=Object.getOwnPropertyDescriptor(process.env,key);if(!descriptor||!(\"value\"indescriptor)||typeofdescriptor.value!==\"string\"){thrownewError(\"Playwrightconfigenvironmentsnapshotisinvalid.\");}Object.defineProperty(environment,key,{configurable:false,enumerable:true,value:descriptor.value,writable:false});}returnObject.freeze(environment)asRecord<string,string|undefined>;}"
      ),
      directImportBranch: sha256(
        "{assertDirectImportRemainsInert();exportedConfig=inertNoSpecConfig;}"
      ),
      initialPortableBranch: sha256(
        "{if(!initialInvocation.portableListCandidate){thrownewError(\"ActualPlaywrightexecutionrequiresanindependentlyvalidatedcanonicalStarshipownermanifest.\");}portableListCapture=captureRequiredBrowserPortableListInvocation({argv:initialContext.argv,cwd:initialContext.cwd,environment:initialContext.environment,liveHomeProof:configLiveHomeProof});}"
      ),
      portableExportBranch: sha256(
        "{constportableBeforeConfig=revalidatePortableListAuthority();constportableConfig=inertNoSpecConfig;constportableBeforeExport=revalidatePortableListAuthority();if(!sameHashOnlyAuthority(portableBeforeConfig,portableBeforeExport)){thrownewError(\"PortablePlaywrightlistauthoritychangedwhileconstructingitsinertconfig.\");}exportedConfig=portableConfig;}"
      ),
      revalidatePortableListAuthority: sha256(
        "{if(!portableListCapture){thrownewError(\"PortablePlaywrightlistauthorityisunavailable.\");}constcurrentContext=captureDetachedPlaywrightConfigContext();constcurrentInvocation=classifyPlaywrightCliInvocation(currentContext.argv);if(!currentInvocation.portableListCandidate||currentContext.environment.PLAYWRIGHT_RUN_PLAN_MANIFEST?.trim()||currentContext.environment.PLAYWRIGHT_PORTABLE_LIST_ONLY!==\"1\"){thrownewError(\"PortablePlaywrightlistcontextchangedafterpreflight.\");}constcurrentCapture=assertRequiredBrowserPortableListInvocationUnchanged(portableListCapture,{argv:currentContext.argv,cwd:currentContext.cwd,environment:currentContext.environment,liveHomeProof:configLiveHomeProof});assertLiveHomeProof(configLiveHomeProof);returncurrentCapture;}"
      )
    },
    topLevelDeclarations: [
      "const:configLiveHomeProof",
      "const:requireFromConfig",
      "type:DetachedPlaywrightConfigContext",
      "function:private:detachedProcessEnvironment",
      "function:private:captureDetachedPlaywrightConfigContext",
      "function:private:sameHashOnlyAuthority",
      "const:initialContext",
      "const:initialInvocation",
      "const:initialManifestPath",
      "const:initialPortableFlag",
      "let:ownerPathValidation",
      "let:ownerInvocationReceipt",
      "let:portableListCapture",
      "if:initialManifestPath",
      "const:ownerAuthority",
      "function:private:revalidateOwnerConfigAuthority",
      "function:private:revalidatePortableListAuthority",
      "function:private:assertDirectImportRemainsInert",
      "const:e2eTempTsconfigHardeningExcludes",
      "function:private:e2eTempTsconfigExcludeGlobs",
      "function:export:e2eTempTsconfigContent",
      "const:inertNoSpecConfig",
      "let:exportedConfig",
      "if:ownerPathValidation&&ownerAuthority",
      "export-default:exportedConfig"
    ]
  };
  const profile = {
    expectedFacts: stableValue(expectedFacts),
    schemaVersion: 1,
    sha256: ""
  };
  profile.sha256 = domainHashObject("portable-playwright-config-profile", profile);
  return Object.freeze(stableValue(profile));
}

function portableConfigImportShape(statement) {
  const moduleName = staticStringValue(statement.moduleSpecifier);
  if (moduleName === null) {
    throw new Error("Portable Playwright config contains a nonliteral import.");
  }
  const clause = statement.importClause;
  const namedImports = [];
  let namespaceImport = null;
  if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
    namespaceImport = clause.namedBindings.name.text;
  } else if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    for (const element of clause.namedBindings.elements) {
      namedImports.push({
        imported: (element.propertyName ?? element.name).text,
        local: element.name.text,
        typeOnly: clause.isTypeOnly || element.isTypeOnly
      });
    }
  }
  return {
    defaultImport: clause?.name?.text ?? null,
    module: moduleName,
    namedImports,
    namespaceImport,
    sideEffectOnly: !clause,
    typeOnly: clause?.isTypeOnly === true
  };
}

function portableTopLevelDeclarationShape(sourceFile) {
  const output = [];
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) continue;
    if (ts.isTypeAliasDeclaration(statement)) {
      output.push(`type:${statement.name.text}`);
      continue;
    }
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      const exported = statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      );
      output.push(`function:${exported ? "export" : "private"}:${statement.name.text}`);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      const declarationKind = statement.declarationList.flags & ts.NodeFlags.Const
        ? "const"
        : statement.declarationList.flags & ts.NodeFlags.Let
          ? "let"
          : "var";
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          throw new Error("Portable Playwright config contains nonidentifier top-level state.");
        }
        output.push(`${declarationKind}:${declaration.name.text}`);
      }
      continue;
    }
    if (ts.isIfStatement(statement)) {
      output.push(`if:${compactPortableSyntax(statement.expression, sourceFile)}`);
      continue;
    }
    if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) {
      output.push(`export-default:${statement.expression.text}`);
      continue;
    }
    throw new Error("Portable Playwright config contains unknown top-level syntax.");
  }
  return output;
}

function portablePlaywrightConfigSemanticProof(repoRoot, configIdentity) {
  const configSource = readFileSync(configIdentity.canonicalPath, "utf8");
  const analysis = analyzeEcmaSource(configSource, PORTABLE_PLAYWRIGHT_CONFIG);
  const sourceFile = analysis.sourceFile;
  const profile = canonicalPortablePlaywrightConfigProfile();
  const imports = sourceFile.statements
    .filter((statement) => ts.isImportDeclaration(statement))
    .map(portableConfigImportShape);
  const functions = new Map(
    sourceFile.statements
      .filter((statement) => ts.isFunctionDeclaration(statement) && statement.name && statement.body)
      .map((statement) => [statement.name.text, statement])
  );
  const functionBodyHash = (name) => {
    const declaration = functions.get(name);
    if (!declaration?.body) throw new Error("Portable Playwright config function inventory differs.");
    return sha256(compactPortableSyntax(declaration.body, sourceFile));
  };
  const initialIf = sourceFile.statements.find(
    (statement) => ts.isIfStatement(statement)
      && compactPortableSyntax(statement.expression, sourceFile) === "initialManifestPath"
  );
  const finalIf = sourceFile.statements.find(
    (statement) => ts.isIfStatement(statement)
      && compactPortableSyntax(statement.expression, sourceFile) === "ownerPathValidation&&ownerAuthority"
  );
  const initialPortableIf = initialIf?.elseStatement;
  const finalPortableIf = finalIf?.elseStatement;
  if (
    !initialIf
    || !ts.isIfStatement(initialPortableIf)
    || compactPortableSyntax(initialPortableIf.expression, sourceFile) !== "initialInvocation.isCli"
    || !finalIf
    || !ts.isIfStatement(finalPortableIf)
    || compactPortableSyntax(finalPortableIf.expression, sourceFile) !== "portableListCapture"
    || !finalPortableIf.elseStatement
  ) {
    throw new Error("Portable Playwright config authority branches differ from the closed profile.");
  }

  const loaderCalls = [];
  const visitLoaderCalls = (node) => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "requireFromConfig"
    ) {
      const argument = node.arguments.length === 1 ? staticStringValue(node.arguments[0]) : null;
      if (argument === null) throw new Error("Portable Playwright config runtime loader is dynamic.");
      let container = null;
      for (let parent = node.parent; parent && parent !== sourceFile; parent = parent.parent) {
        if (ts.isFunctionDeclaration(parent) && parent.name) {
          container = parent.name.text;
          break;
        }
      }
      if (!container) {
        const start = node.getStart(sourceFile);
        const ownerStart = finalIf.thenStatement.getStart(sourceFile);
        container = start >= ownerStart && start < finalIf.thenStatement.end
          ? "owner-config-branch"
          : "top-level";
      }
      loaderCalls.push({ argument, container });
    }
    ts.forEachChild(node, visitLoaderCalls);
  };
  visitLoaderCalls(sourceFile);
  loaderCalls.sort((left, right) => stableJson(left).localeCompare(stableJson(right)));

  const forbiddenCapabilityCounts = Object.fromEntries(
    PORTABLE_FORBIDDEN_CAPABILITIES.map((capability) => [capability, 0])
  );
  for (const finding of analysis.capabilityFindings) {
    if (Object.prototype.hasOwnProperty.call(forbiddenCapabilityCounts, finding.capability)) {
      forbiddenCapabilityCounts[finding.capability] += 1;
    }
  }
  const facts = stableValue({
    forbiddenCapabilityCounts,
    imports,
    loaderCalls,
    sensitiveImportCounts: analysis.sensitiveImportCounts,
    syntaxSha256: {
      captureDetachedPlaywrightConfigContext: functionBodyHash(
        "captureDetachedPlaywrightConfigContext"
      ),
      detachedProcessEnvironment: functionBodyHash("detachedProcessEnvironment"),
      directImportBranch: sha256(
        compactPortableSyntax(finalPortableIf.elseStatement, sourceFile)
      ),
      initialPortableBranch: sha256(
        compactPortableSyntax(initialPortableIf.thenStatement, sourceFile)
      ),
      portableExportBranch: sha256(
        compactPortableSyntax(finalPortableIf.thenStatement, sourceFile)
      ),
      revalidatePortableListAuthority: functionBodyHash("revalidatePortableListAuthority")
    },
    topLevelDeclarations: portableTopLevelDeclarationShape(sourceFile)
  });
  if (!sameJson(facts, profile.expectedFacts)) {
    throw new Error("Portable Playwright config semantics differ from the closed inert profile.");
  }
  const parser = capabilityParserAttestation(repoRoot);
  if (parser.version !== PORTABLE_TYPESCRIPT_VERSION) {
    throw new Error("Portable Playwright config parser version differs from the pinned version.");
  }
  const authoritySource = {
    path: PORTABLE_AUTHORITY_SOURCE,
    ...portablePhysicalIdentity(
      "portable Playwright authority source",
      join(repoRoot, PORTABLE_AUTHORITY_SOURCE),
      "file"
    )
  };
  const analyzer = {
    authoritySource,
    parser,
    profile,
    ruleset: canonicalCapabilityRuleset(),
    schemaVersion: 1,
    sha256: ""
  };
  analyzer.sha256 = domainHashObject("portable-playwright-config-analyzer", analyzer);
  const proof = {
    analyzer: stableValue(analyzer),
    configSourceSha256: configIdentity.sha256,
    facts,
    schemaVersion: 1,
    sha256: ""
  };
  proof.sha256 = domainHashObject("portable-playwright-config-semantics", proof);
  return Object.freeze(stableValue(proof));
}

function validatePortablePhysicalIdentitySnapshot(label, identity, kind) {
  const keys = kind === "file"
    ? ["canonicalPath", "dev", "ino", "physical", "sha256"]
    : ["canonicalPath", "dev", "ino", "physical"];
  assertExactKeys(`portable Playwright ${label} identity`, identity, keys);
  if (
    identity.physical !== true
    || typeof identity.canonicalPath !== "string"
    || !isAbsolute(identity.canonicalPath)
    || resolve(identity.canonicalPath) !== identity.canonicalPath
    || !/^\d+$/.test(identity.dev ?? "")
    || !/^\d+$/.test(identity.ino ?? "")
    || (kind === "file" && !/^[a-f0-9]{64}$/.test(identity.sha256 ?? ""))
  ) throw new Error(`Portable Playwright ${label} identity is invalid.`);
  return identity;
}

function validatePortableConfigSemanticProofSnapshot(proof, capture) {
  assertExactKeys("portable Playwright config semantic proof", proof, [
    "analyzer",
    "configSourceSha256",
    "facts",
    "schemaVersion",
    "sha256"
  ]);
  if (
    proof.schemaVersion !== 1
    || proof.configSourceSha256 !== capture.config.sha256
    || !/^[a-f0-9]{64}$/.test(proof.sha256 ?? "")
  ) throw new Error("Portable Playwright config semantic proof header is invalid.");
  assertExactKeys("portable Playwright config analyzer", proof.analyzer, [
    "authoritySource",
    "parser",
    "profile",
    "ruleset",
    "schemaVersion",
    "sha256"
  ]);
  if (proof.analyzer.schemaVersion !== 1) {
    throw new Error("Portable Playwright config analyzer schema is invalid.");
  }
  assertExactKeys("portable Playwright config analyzer source", proof.analyzer.authoritySource, [
    "canonicalPath",
    "dev",
    "ino",
    "path",
    "physical",
    "sha256"
  ]);
  const {
    path: authoritySourcePath,
    ...authoritySourceIdentity
  } = proof.analyzer.authoritySource;
  validatePortablePhysicalIdentitySnapshot(
    "config analyzer source",
    authoritySourceIdentity,
    "file"
  );
  if (
    authoritySourcePath !== PORTABLE_AUTHORITY_SOURCE
    || proof.analyzer.authoritySource.canonicalPath
      !== join(capture.cwd, PORTABLE_AUTHORITY_SOURCE)
  ) throw new Error("Portable Playwright config analyzer source binding is invalid.");

  const parser = proof.analyzer.parser;
  assertExactKeys("portable Playwright config parser", parser, [
    "canonicalPath",
    "loadedApiSha256",
    "packageManifestCanonicalPath",
    "packageManifestSha256",
    "schemaVersion",
    "sha256",
    "sourceSha256",
    "version"
  ]);
  if (
    parser.schemaVersion !== 1
    || parser.version !== PORTABLE_TYPESCRIPT_VERSION
    || parser.canonicalPath !== join(capture.nodeModules.canonicalPath, "typescript", "lib", "typescript.js")
    || parser.packageManifestCanonicalPath
      !== join(capture.nodeModules.canonicalPath, "typescript", "package.json")
    || ![parser.loadedApiSha256, parser.packageManifestSha256, parser.sourceSha256, parser.sha256]
      .every((value) => /^[a-f0-9]{64}$/.test(value ?? ""))
    || parser.loadedApiSha256
      !== sha256(`typescript-create-source-file\0${String(ts.createSourceFile)}`)
    || parser.sha256 !== domainHashObject("capability-parser", parser)
  ) throw new Error("Portable Playwright config parser binding is invalid.");

  const canonicalProfile = canonicalPortablePlaywrightConfigProfile();
  const canonicalRuleset = canonicalCapabilityRuleset();
  if (
    !sameJson(proof.analyzer.profile, canonicalProfile)
    || !sameJson(proof.analyzer.ruleset, canonicalRuleset)
    || !sameJson(proof.facts, canonicalProfile.expectedFacts)
    || proof.analyzer.sha256
      !== domainHashObject("portable-playwright-config-analyzer", proof.analyzer)
    || proof.sha256
      !== domainHashObject("portable-playwright-config-semantics", proof)
  ) throw new Error("Portable Playwright config semantic proof fingerprint is invalid.");
  return proof;
}

export function validateRequiredBrowserPortableListInvocationCaptureSnapshot(capture) {
  assertExactKeys("portable Playwright list capture", capture, [
    "argvSha256",
    "captureFingerprint",
    "cli",
    "config",
    "cwd",
    "environment",
    "executable",
    "homeValueSha256",
    "mode",
    "nodeModules",
    "playwrightPackage",
    "requiresLiveHomeProtection",
    "schemaVersion",
    "semanticProof"
  ]);
  if (
    capture.schemaVersion !== 1
    || capture.mode !== PORTABLE_LIST_MODE
    || capture.requiresLiveHomeProtection !== true
    || typeof capture.cwd !== "string"
    || !isAbsolute(capture.cwd)
    || resolve(capture.cwd) !== capture.cwd
    || !/^[a-f0-9]{64}$/.test(capture.homeValueSha256 ?? "")
    || !/^[a-f0-9]{64}$/.test(capture.captureFingerprint ?? "")
  ) throw new Error("Portable Playwright list capture header is invalid.");
  validatePortablePhysicalIdentitySnapshot("CLI", capture.cli, "file");
  validatePortablePhysicalIdentitySnapshot("config", capture.config, "file");
  validatePortablePhysicalIdentitySnapshot("Node executable", capture.executable, "file");
  validatePortablePhysicalIdentitySnapshot("node_modules", capture.nodeModules, "directory");

  assertExactKeys("portable Playwright package", capture.playwrightPackage, [
    "manifest",
    "name",
    "packageRoot",
    "schemaVersion",
    "sha256",
    "version"
  ]);
  validatePortablePhysicalIdentitySnapshot(
    "package manifest",
    capture.playwrightPackage.manifest,
    "file"
  );
  if (
    capture.playwrightPackage.schemaVersion !== 1
    || capture.playwrightPackage.name !== PORTABLE_PLAYWRIGHT_PACKAGE
    || capture.playwrightPackage.version !== PORTABLE_PLAYWRIGHT_VERSION
    || capture.playwrightPackage.packageRoot
      !== join(capture.nodeModules.canonicalPath, "@playwright", "test")
    || capture.playwrightPackage.manifest.canonicalPath
      !== join(capture.playwrightPackage.packageRoot, "package.json")
    || capture.playwrightPackage.sha256
      !== domainHashObject("portable-playwright-package", capture.playwrightPackage)
  ) throw new Error("Portable Playwright package binding is invalid.");

  assertExactKeys("portable Playwright environment binding", capture.environment, [
    "entries",
    "inventorySha256",
    "schemaVersion"
  ]);
  const expectedEnvironmentEntries = [
    {
      key: "HOME",
      semanticClass: "home-hash",
      valueSha256: capture.homeValueSha256
    },
    {
      key: PORTABLE_LIST_FLAG,
      semanticClass: "exact-literal",
      valueSha256: requiredBrowserEnvironmentValueSha256(PORTABLE_LIST_FLAG, "1")
    }
  ];
  if (
    capture.environment.schemaVersion !== 1
    || !sameJson(capture.environment.entries, expectedEnvironmentEntries)
    || capture.environment.inventorySha256
      !== domainHashObject("portable-playwright-list-environment", capture.environment, "inventorySha256")
  ) throw new Error("Portable Playwright environment binding is invalid.");

  if (
    capture.nodeModules.canonicalPath !== join(capture.cwd, "node_modules")
    || capture.cli.canonicalPath !== join(
      capture.playwrightPackage.packageRoot,
      "cli.js"
    )
    || capture.config.canonicalPath !== join(capture.cwd, PORTABLE_PLAYWRIGHT_CONFIG)
    || capture.argvSha256 !== sha256(stableJson([
      capture.executable.canonicalPath,
      capture.cli.canonicalPath,
      "test",
      "--list"
    ]))
  ) throw new Error("Portable Playwright list capture cross-links are invalid.");
  validatePortableConfigSemanticProofSnapshot(capture.semanticProof, capture);
  if (
    capture.captureFingerprint
      !== domainHashObject("portable-playwright-list-capture", capture, "captureFingerprint")
  ) throw new Error("Portable Playwright list capture fingerprint is invalid.");
  return Object.freeze(stableValue(capture));
}

export function captureRequiredBrowserPortableListInvocation({
  argv,
  cwd = process.cwd(),
  environment = process.env,
  liveHomeProof
}) {
  assertInvocationArgv(argv, "Portable Playwright list");
  assertLiveHomeProof(liveHomeProof);
  if (
    !environment
    || typeof environment !== "object"
    || Array.isArray(environment)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(environment))
  ) {
    throw new Error("Portable Playwright list environment is invalid.");
  }
  const environmentKeys = Object.keys(environment);
  if (!sameJson(environmentKeys, PORTABLE_LIST_ENVIRONMENT_KEYS)) {
    throw new Error("Portable Playwright list environment keys/order differ from the closed profile.");
  }
  for (const key of environmentKeys) {
    const property = Object.getOwnPropertyDescriptor(environment, key);
    if (
      !property
      || !("value" in property)
      || typeof property.value !== "string"
    ) {
      throw new Error("Portable Playwright list environment contains a non-exact value.");
    }
  }
  if (environment[PORTABLE_LIST_FLAG] !== "1") {
    throw new Error("Portable Playwright list mode flag is invalid.");
  }
  assertLiveHomeEnvironmentValue(liveHomeProof, environment.HOME);
  const repoRoot = canonicalRepoRoot(cwd);
  const nodeModules = portablePhysicalIdentity(
    "portable Playwright node_modules",
    join(repoRoot, "node_modules"),
    "directory"
  );
  const cli = portablePhysicalIdentity(
    "portable Playwright @playwright/test CLI",
    join(nodeModules.canonicalPath, "@playwright", "test", "cli.js"),
    "file"
  );
  const packageRoot = join(nodeModules.canonicalPath, "@playwright", "test");
  const packageManifest = portablePhysicalIdentity(
    "portable Playwright @playwright/test package manifest",
    join(packageRoot, "package.json"),
    "file"
  );
  let packageDefinition;
  try {
    packageDefinition = JSON.parse(readFileSync(packageManifest.canonicalPath, "utf8"));
  } catch {
    throw new Error("Portable Playwright package manifest is invalid.");
  }
  if (
    packageDefinition?.name !== PORTABLE_PLAYWRIGHT_PACKAGE
    || packageDefinition?.version !== PORTABLE_PLAYWRIGHT_VERSION
  ) throw new Error("Portable Playwright package name/version differs from the pinned profile.");
  const playwrightPackage = {
    manifest: packageManifest,
    name: packageDefinition.name,
    packageRoot,
    schemaVersion: 1,
    sha256: "",
    version: packageDefinition.version
  };
  playwrightPackage.sha256 = domainHashObject(
    "portable-playwright-package",
    playwrightPackage
  );
  const executable = portablePhysicalIdentity(
    "portable Playwright Node executable",
    realpathSync(process.execPath),
    "file"
  );
  const config = portablePhysicalIdentity(
    "portable Playwright config",
    join(repoRoot, PORTABLE_PLAYWRIGHT_CONFIG),
    "file"
  );
  const expectedArgv = [executable.canonicalPath, cli.canonicalPath, "test", "--list"];
  if (!sameJson(argv, expectedArgv)) {
    throw new Error("Portable Playwright list argv must be exactly the physical local test --list command.");
  }
  const homeValueSha256 = liveHomeValueSha256(liveHomeProof);
  const environmentBinding = {
    entries: [
      {
        key: "HOME",
        semanticClass: "home-hash",
        valueSha256: homeValueSha256
      },
      {
        key: PORTABLE_LIST_FLAG,
        semanticClass: "exact-literal",
        valueSha256: requiredBrowserEnvironmentValueSha256(PORTABLE_LIST_FLAG, "1")
      }
    ],
    inventorySha256: "",
    schemaVersion: 1
  };
  environmentBinding.inventorySha256 = domainHashObject(
    "portable-playwright-list-environment",
    environmentBinding,
    "inventorySha256"
  );
  const capture = {
    argvSha256: sha256(stableJson(expectedArgv)),
    captureFingerprint: "",
    cli,
    config,
    cwd: repoRoot,
    environment: stableValue(environmentBinding),
    executable,
    homeValueSha256,
    mode: PORTABLE_LIST_MODE,
    nodeModules,
    playwrightPackage: stableValue(playwrightPackage),
    requiresLiveHomeProtection: true,
    schemaVersion: 1,
    semanticProof: portablePlaywrightConfigSemanticProof(repoRoot, config)
  };
  capture.captureFingerprint = domainHashObject(
    "portable-playwright-list-capture",
    capture,
    "captureFingerprint"
  );
  assertLiveHomeProof(liveHomeProof, { expectedHomeValueSha256: homeValueSha256 });
  return validateRequiredBrowserPortableListInvocationCaptureSnapshot(capture);
}

export function assertRequiredBrowserPortableListInvocationUnchanged(
  capture,
  { argv, cwd = process.cwd(), environment = process.env, liveHomeProof }
) {
  const validated = validateRequiredBrowserPortableListInvocationCaptureSnapshot(capture);
  assertLiveHomeProof(liveHomeProof, {
    expectedHomeValueSha256: validated.homeValueSha256
  });
  const current = captureRequiredBrowserPortableListInvocation({
    argv,
    cwd,
    environment,
    liveHomeProof
  });
  if (!sameJson(current, validated)) {
    throw new Error("Portable Playwright list invocation identity changed after preflight.");
  }
  assertLiveHomeProof(liveHomeProof, {
    expectedHomeValueSha256: validated.homeValueSha256
  });
  return current;
}
