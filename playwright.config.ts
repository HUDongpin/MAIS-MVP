import { createRequire } from "node:module";
import path from "node:path";
import type { PlaywrightTestConfig } from "@playwright/test";
import {
  assertCanonicalStarshipBrowserHost,
  classifyPlaywrightCliInvocation,
  validatePlaywrightOwnerEnvironment
} from "./scripts/playwright-owner-paths.mjs";
import {
  assertRequiredBrowserPortableListInvocationUnchanged,
  captureRequiredBrowserPortableListInvocation,
  validateRequiredBrowserPlaywrightInvocation
} from "./scripts/required-browser-execution-scope.mjs";
import {
  assertLiveHomeProof,
  createLiveHomeProof
} from "./scripts/live-home-protection.mjs";

const configLiveHomeProof = createLiveHomeProof();
const requireFromConfig = createRequire(import.meta.url);

type DetachedPlaywrightConfigContext = Readonly<{
  argv: readonly string[];
  cwd: string;
  environment: Record<string, string | undefined>;
}>;

function detachedProcessEnvironment(): Record<string, string | undefined> {
  const environment: Record<string, string | undefined> = {};
  for (const key of Object.keys(process.env).sort()) {
    const descriptor = Object.getOwnPropertyDescriptor(process.env, key);
    if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "string") {
      throw new Error("Playwright config environment snapshot is invalid.");
    }
    Object.defineProperty(environment, key, {
      configurable: false,
      enumerable: true,
      value: descriptor.value,
      writable: false
    });
  }
  return Object.freeze(environment) as Record<string, string | undefined>;
}

function captureDetachedPlaywrightConfigContext(): DetachedPlaywrightConfigContext {
  assertLiveHomeProof(configLiveHomeProof);
  const context = Object.freeze({
    argv: Object.freeze([...process.argv]),
    cwd: path.resolve(process.cwd()),
    environment: detachedProcessEnvironment()
  });
  assertLiveHomeProof(configLiveHomeProof);
  return context;
}

function sameHashOnlyAuthority(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const initialContext = captureDetachedPlaywrightConfigContext();
const initialInvocation = classifyPlaywrightCliInvocation(initialContext.argv);
const initialManifestPath = initialContext.environment.PLAYWRIGHT_RUN_PLAN_MANIFEST?.trim() || null;
const initialPortableFlag = initialContext.environment.PLAYWRIGHT_PORTABLE_LIST_ONLY;
let ownerPathValidation: ReturnType<typeof validatePlaywrightOwnerEnvironment> = null;
let ownerInvocationReceipt: ReturnType<typeof validateRequiredBrowserPlaywrightInvocation> | null = null;
let portableListCapture: ReturnType<typeof captureRequiredBrowserPortableListInvocation> | null = null;

if (initialManifestPath) {
  if (!initialInvocation.isCli || initialInvocation.portableListCandidate || initialPortableFlag !== undefined) {
    throw new Error("Owner Playwright config requires one exact manifest-bound actual invocation.");
  }
  assertCanonicalStarshipBrowserHost({ repoRoot: initialContext.cwd });
  ownerPathValidation = validatePlaywrightOwnerEnvironment(
    initialContext.environment,
    configLiveHomeProof,
    { cwd: initialContext.cwd }
  );
  if (!ownerPathValidation) {
    throw new Error("Owner Playwright config failed to load its exact manifest-bound plan.");
  }
  ownerInvocationReceipt = validateRequiredBrowserPlaywrightInvocation({
    argv: initialContext.argv,
    cwd: initialContext.cwd,
    dependencyAttestation: ownerPathValidation.plan.dependencyAttestation,
    executionScope: ownerPathValidation.plan.executionScope,
    plan: ownerPathValidation.plan,
    repoRoot: ownerPathValidation.plan.repoRoot
  });
} else if (initialInvocation.isCli) {
  if (!initialInvocation.portableListCandidate) {
    throw new Error(
      "Actual Playwright execution requires an independently validated canonical Starship owner manifest."
    );
  }
  portableListCapture = captureRequiredBrowserPortableListInvocation({
    argv: initialContext.argv,
    cwd: initialContext.cwd,
    environment: initialContext.environment,
    liveHomeProof: configLiveHomeProof
  });
} else if (initialPortableFlag !== undefined) {
  throw new Error("Portable Playwright list authority is invalid outside its exact CLI invocation.");
}

const ownerAuthority = ownerPathValidation && ownerInvocationReceipt
  ? Object.freeze({
      command: ownerInvocationReceipt,
      manifestPath: initialManifestPath,
      planFingerprint: ownerPathValidation.plan.planFingerprint
    })
  : null;

function revalidateOwnerConfigAuthority() {
  if (!ownerPathValidation || !ownerAuthority) {
    throw new Error("Owner Playwright config authority is unavailable.");
  }
  assertLiveHomeProof(configLiveHomeProof, {
    expectedHomeValueSha256: ownerPathValidation.plan.homeValueSha256
  });
  const currentContext = captureDetachedPlaywrightConfigContext();
  const currentInvocation = classifyPlaywrightCliInvocation(currentContext.argv);
  if (
    !currentInvocation.isCli
    || currentInvocation.portableListCandidate
    || currentContext.environment.PLAYWRIGHT_PORTABLE_LIST_ONLY !== undefined
    || (currentContext.environment.PLAYWRIGHT_RUN_PLAN_MANIFEST?.trim() || null)
      !== ownerAuthority.manifestPath
  ) {
    throw new Error("Owner Playwright config context changed after preflight.");
  }
  const currentValidation = validatePlaywrightOwnerEnvironment(
    currentContext.environment,
    configLiveHomeProof,
    { cwd: currentContext.cwd }
  );
  if (!currentValidation) {
    throw new Error("Owner Playwright config lost its manifest-bound plan.");
  }
  const currentReceipt = validateRequiredBrowserPlaywrightInvocation({
    argv: currentContext.argv,
    cwd: currentContext.cwd,
    dependencyAttestation: currentValidation.plan.dependencyAttestation,
    executionScope: currentValidation.plan.executionScope,
    plan: currentValidation.plan,
    repoRoot: currentValidation.plan.repoRoot
  });
  if (
    currentValidation.plan.planFingerprint !== ownerAuthority.planFingerprint
    || !sameHashOnlyAuthority(currentReceipt, ownerAuthority.command)
  ) {
    throw new Error("Owner Playwright config authority changed after preflight.");
  }
  assertLiveHomeProof(configLiveHomeProof, {
    expectedHomeValueSha256: currentValidation.plan.homeValueSha256
  });
  return currentValidation;
}

function revalidatePortableListAuthority() {
  if (!portableListCapture) {
    throw new Error("Portable Playwright list authority is unavailable.");
  }
  const currentContext = captureDetachedPlaywrightConfigContext();
  const currentInvocation = classifyPlaywrightCliInvocation(currentContext.argv);
  if (
    !currentInvocation.portableListCandidate
    || currentContext.environment.PLAYWRIGHT_RUN_PLAN_MANIFEST?.trim()
    || currentContext.environment.PLAYWRIGHT_PORTABLE_LIST_ONLY !== "1"
  ) {
    throw new Error("Portable Playwright list context changed after preflight.");
  }
  const currentCapture = assertRequiredBrowserPortableListInvocationUnchanged(
    portableListCapture,
    {
      argv: currentContext.argv,
      cwd: currentContext.cwd,
      environment: currentContext.environment,
      liveHomeProof: configLiveHomeProof
    }
  );
  assertLiveHomeProof(configLiveHomeProof);
  return currentCapture;
}

function assertDirectImportRemainsInert() {
  const currentContext = captureDetachedPlaywrightConfigContext();
  const currentInvocation = classifyPlaywrightCliInvocation(currentContext.argv);
  if (
    currentInvocation.isCli
    || currentContext.environment.PLAYWRIGHT_RUN_PLAN_MANIFEST?.trim()
    || currentContext.environment.PLAYWRIGHT_PORTABLE_LIST_ONLY !== undefined
    || currentContext.cwd !== initialContext.cwd
    || !sameHashOnlyAuthority(currentContext.argv, initialContext.argv)
  ) {
    throw new Error("Read-only Playwright config import context changed before export.");
  }
  assertLiveHomeProof(configLiveHomeProof);
}

// Extra build-output globs the e2e temp tsconfig excludes on top of the
// canonical set. These are non-dot dirs `**/*.ts` would otherwise sweep;
// `.tmp` is intentionally NOT here because the temp config's own dist-types
// include lives under it.
const e2eTempTsconfigHardeningExcludes = [
  ".next-*",
  ".s??-*",
  "tmp",
  "temp",
  "output",
  "outputs",
  "coverage",
  "playwright-report",
  "test-results",
  "var",
  "var/**/*",
  "MAIS-MVP-*",
  "MAIS-MVP-*/**/*"
];

// Reuse tsconfig.json's own `exclude` as the single source of truth so the
// generated e2e temp tsconfig can't drift out of sync with it. That drift once
// dropped `private/**/*` here and let a stale private/tmp/*-next validator.ts
// (referencing a since-deleted route) fail the e2e build before any test ran.
// tsconfig.json is the right base — it's the config the custom-distDir build
// actually uses, and unlike tsconfig.next.json it does not exclude `.tmp`,
// where the temp config's dist-types include lives.
function e2eTempTsconfigExcludeGlobs() {
  const ts = requireFromConfig("typescript") as typeof import("typescript");
  const baseTsconfigPath = path.resolve("tsconfig.json");
  const { config, error } = ts.readConfigFile(baseTsconfigPath, (file) => ts.sys.readFile(file));
  const canonical = Array.isArray(config?.exclude) ? (config.exclude as string[]) : null;
  if (error || !canonical) {
    throw new Error(
      `Could not read \`exclude\` from ${baseTsconfigPath} for the e2e temp tsconfig` +
      `${error ? `: ${ts.flattenDiagnosticMessageText(error.messageText, "\n")}` : "."}`
    );
  }
  return Array.from(new Set([...canonical, ...e2eTempTsconfigHardeningExcludes]));
}

export function e2eTempTsconfigContent(
  tsconfigPath: string,
  nextDistDir: string,
  repoRoot = process.cwd()
) {
  const configDir = path.dirname(path.resolve(tsconfigPath));
  const fromConfig = (target: string) => {
    const value = path.relative(configDir, path.resolve(repoRoot, target)).replaceAll("\\", "/");
    return value.startsWith(".") ? value : `./${value}`;
  };

  return {
    extends: fromConfig("tsconfig.json"),
    compilerOptions: {
      baseUrl: path.resolve(repoRoot),
      paths: { "@/*": ["./*"] },
      plugins: [{ name: "next" }]
    },
    include: [
      fromConfig("next-env.d.ts"),
      fromConfig("**/*.ts"),
      fromConfig("**/*.tsx"),
      fromConfig(".next/types/**/*.ts"),
      fromConfig(`${nextDistDir}/types/**/*.ts`)
    ],
    exclude: e2eTempTsconfigExcludeGlobs().map(fromConfig)
  };
}

const inertNoSpecConfig: PlaywrightTestConfig = {
  // An explicit empty projects array is truthy in Playwright's config loader,
  // so it suppresses the implicit default project. The impossible matcher is
  // a second mechanical barrier: no repository spec can be collected/imported.
  projects: [],
  testDir: initialContext.cwd,
  testMatch: /$a/,
  webServer: undefined
};

let exportedConfig: PlaywrightTestConfig;
if (ownerPathValidation && ownerAuthority) {
  const playwrightRuntime = requireFromConfig("@playwright/test") as typeof import("@playwright/test");
  if (
    typeof playwrightRuntime.defineConfig !== "function"
    || !playwrightRuntime.devices?.["Desktop Chrome"]
    || !playwrightRuntime.devices?.["Pixel 5"]
  ) {
    throw new Error("Validated Playwright runtime exports are unavailable.");
  }
  const plan = ownerPathValidation.plan;
  const ownerConfig: PlaywrightTestConfig = {
    testDir: path.join(plan.repoRoot, "tests", "e2e"),
    outputDir: plan.paths.outputDir,
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 120_000,
    expect: { timeout: 15_000 },
    reporter: [
      ["list"],
      ["html", { open: "never", outputFolder: plan.paths.reportDir }]
    ],
    use: {
      baseURL: plan.serviceBaseUrl,
      channel: ownerPathValidation.environment.PLAYWRIGHT_BROWSER_CHANNEL,
      trace: "retain-on-failure",
      screenshot: "only-on-failure",
      video: "retain-on-failure"
    },
    webServer: undefined,
    projects: [
      {
        name: "desktop-chrome",
        use: {
          ...playwrightRuntime.devices["Desktop Chrome"],
          viewport: { width: 1440, height: 1100 }
        }
      },
      {
        name: "mobile-chrome",
        use: { ...playwrightRuntime.devices["Pixel 5"], isMobile: true }
      }
    ]
  };
  const finalValidation = revalidateOwnerConfigAuthority();
  if (finalValidation.plan.planFingerprint !== plan.planFingerprint) {
    throw new Error("Owner Playwright plan changed immediately before config definition.");
  }
  exportedConfig = playwrightRuntime.defineConfig(ownerConfig);
} else if (portableListCapture) {
  const portableBeforeConfig = revalidatePortableListAuthority();
  const portableConfig = inertNoSpecConfig;
  const portableBeforeExport = revalidatePortableListAuthority();
  if (!sameHashOnlyAuthority(portableBeforeConfig, portableBeforeExport)) {
    throw new Error(
      "Portable Playwright list authority changed while constructing its inert config."
    );
  }
  exportedConfig = portableConfig;
} else {
  assertDirectImportRemainsInert();
  exportedConfig = inertNoSpecConfig;
}

export default exportedConfig;
