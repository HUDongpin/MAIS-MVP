import type { NextConfig } from "next";
import {
  validatePlaywrightOwnerEnvironment
} from "./scripts/playwright-owner-paths.mjs";
import {
  validateRequiredBrowserNextInvocation
} from "./scripts/required-browser-execution-scope.mjs";
import {
  createLiveHomeProof
} from "./scripts/live-home-protection.mjs";
import {
  assertNextConfigReadOnlyAuthorityUnchanged,
  assertOwnerNextConfigAuthorityUnchanged,
  captureNextConfigReadOnlyAuthority,
  captureOwnerNextConfigAuthority,
  classifyNextConfigInvocationContext,
  NEXT_CONFIG_READ_ONLY_IMPORT_PHASE
} from "./scripts/next-config-read-only-authority.mjs";

type DetachedNextConfigContext = Readonly<{
  argv: readonly string[];
  cwd: string;
  environment: Record<string, string | undefined>;
}>;

function detachedProcessEnvironment(): Record<string, string | undefined> {
  const environment: Record<string, string | undefined> = {};
  for (const key of Object.keys(process.env)) {
    const descriptor = Object.getOwnPropertyDescriptor(process.env, key);
    if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "string") {
      throw new Error("NEXT_CONFIG_ENVIRONMENT_SNAPSHOT_INVALID");
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

function captureDetachedNextConfigContext(): DetachedNextConfigContext {
  return Object.freeze({
    argv: Object.freeze([...process.argv]),
    cwd: process.cwd(),
    environment: detachedProcessEnvironment()
  });
}

// This pure classifier runs before HOME lstat/realpath or any manifest/config path read.
// Every ambiguous, wrapped, dev/export, loader-injected, or direct import context fails here.
const initialClassification = classifyNextConfigInvocationContext({
  argv: process.argv,
  cwd: process.cwd(),
  environment: process.env
});
const nextConfigLiveHomeProof = createLiveHomeProof();
const initialContext = captureDetachedNextConfigContext();

let initialOwnerValidation: ReturnType<typeof validatePlaywrightOwnerEnvironment> = null;
let initialOwnerReceipt: ReturnType<typeof validateRequiredBrowserNextInvocation> | null = null;
let initialOwnerAuthority: ReturnType<typeof captureOwnerNextConfigAuthority> | null = null;
let initialReadOnlyAuthority: ReturnType<typeof captureNextConfigReadOnlyAuthority> | null = null;

if (initialClassification.mode === "read-only-import") {
  if (initialContext.environment.PLAYWRIGHT_RUN_PLAN_MANIFEST !== undefined) {
    throw new Error("NEXT_CONFIG_READ_ONLY_MANIFEST_FORBIDDEN");
  }
  initialReadOnlyAuthority = captureNextConfigReadOnlyAuthority({
    argv: initialContext.argv,
    cwd: initialContext.cwd,
    environment: initialContext.environment,
    liveHomeProof: nextConfigLiveHomeProof
  });
} else {
  if (!initialContext.environment.PLAYWRIGHT_RUN_PLAN_MANIFEST) {
    throw new Error("NEXT_CONFIG_OWNER_MANIFEST_REQUIRED");
  }
  initialOwnerValidation = validatePlaywrightOwnerEnvironment(
    initialContext.environment,
    nextConfigLiveHomeProof,
    { cwd: initialContext.cwd }
  );
  if (!initialOwnerValidation) throw new Error("NEXT_CONFIG_OWNER_PLAN_REQUIRED");
  initialOwnerReceipt = validateRequiredBrowserNextInvocation({
    argv: initialContext.argv,
    cwd: initialContext.cwd,
    dependencyAttestation: initialOwnerValidation.plan.dependencyAttestation,
    executionScope: initialOwnerValidation.plan.executionScope,
    plan: initialOwnerValidation.plan,
    repoRoot: initialOwnerValidation.plan.repoRoot
  });
  initialOwnerAuthority = captureOwnerNextConfigAuthority({
    argv: initialContext.argv,
    cwd: initialContext.cwd,
    environment: initialContext.environment,
    invocationReceipt: initialOwnerReceipt,
    liveHomeProof: nextConfigLiveHomeProof,
    ownerValidation: initialOwnerValidation
  });
}

function revalidateOwnerAuthority() {
  if (!initialOwnerValidation || !initialOwnerReceipt || !initialOwnerAuthority) {
    throw new Error("NEXT_CONFIG_OWNER_AUTHORITY_UNAVAILABLE");
  }
  const context = captureDetachedNextConfigContext();
  const classification = classifyNextConfigInvocationContext(context);
  if (classification.mode !== initialOwnerAuthority.mode) {
    throw new Error("NEXT_CONFIG_OWNER_MODE_DRIFT");
  }
  const validation = validatePlaywrightOwnerEnvironment(
    context.environment,
    nextConfigLiveHomeProof,
    { cwd: context.cwd }
  );
  if (!validation) throw new Error("NEXT_CONFIG_OWNER_PLAN_DRIFT");
  const receipt = validateRequiredBrowserNextInvocation({
    argv: context.argv,
    cwd: context.cwd,
    dependencyAttestation: validation.plan.dependencyAttestation,
    executionScope: validation.plan.executionScope,
    plan: validation.plan,
    repoRoot: validation.plan.repoRoot
  });
  const authority = assertOwnerNextConfigAuthorityUnchanged(initialOwnerAuthority, {
    argv: context.argv,
    cwd: context.cwd,
    environment: context.environment,
    invocationReceipt: receipt,
    liveHomeProof: nextConfigLiveHomeProof,
    ownerValidation: validation
  });
  return { authority, validation };
}

function revalidateReadOnlyAuthority() {
  if (!initialReadOnlyAuthority) {
    throw new Error("NEXT_CONFIG_READ_ONLY_AUTHORITY_UNAVAILABLE");
  }
  const context = captureDetachedNextConfigContext();
  const classification = classifyNextConfigInvocationContext(context);
  if (classification.mode !== "read-only-import") {
    throw new Error("NEXT_CONFIG_READ_ONLY_MODE_DRIFT");
  }
  return assertNextConfigReadOnlyAuthorityUnchanged(initialReadOnlyAuthority, {
    argv: context.argv,
    cwd: context.cwd,
    environment: context.environment,
    liveHomeProof: nextConfigLiveHomeProof
  });
}

const studentLessonsPath = "/student/lessons";
const studentRoadmapPath = "/student/roadmap";
const studentPrimaryRoadmapPath = "/student/roadmap/primary";
const studentSecondaryRoadmapPath = "/student/roadmap/secondary";
const studentVisualizationToolsPath = "/student/tools/visualizations";
const studentAdventureIslandPath = "/student/practice/games/adventure-island";
const studentFishingMasterPath = "/student/practice/games/fishing-master";

function deterministicNextConfig({
  distDir,
  repoRoot,
  tsconfigPath
}: {
  distDir?: string;
  repoRoot: string;
  tsconfigPath: string;
}): NextConfig {
  return {
    devIndicators: false,
    outputFileTracingRoot: repoRoot,
    reactStrictMode: true,
    skipMiddlewareUrlNormalize: true,
    transpilePackages: ["three", "@react-three/fiber", "@react-three/drei", "three-stdlib"],
    async redirects() {
      return [
        { source: "/visualization-lab", destination: studentVisualizationToolsPath, permanent: true },
        { source: "/learning-path", destination: studentRoadmapPath, permanent: true },
        { source: "/primary-roadmap", destination: studentPrimaryRoadmapPath, permanent: true },
        { source: "/secondary-roadmap", destination: studentSecondaryRoadmapPath, permanent: true },
        { source: "/lesson", destination: studentLessonsPath, permanent: true },
        {
          source: "/lesson/:lessonSlug",
          destination: `${studentLessonsPath}/:lessonSlug`,
          permanent: true
        },
        {
          source: "/practice/adventure-island",
          destination: studentAdventureIslandPath,
          permanent: true
        },
        {
          source: "/practice/super-platformer-like",
          destination: studentAdventureIslandPath,
          permanent: true
        },
        {
          source: "/practice/fishing-game",
          destination: studentFishingMasterPath,
          permanent: true
        }
      ];
    },
    ...(distDir ? { distDir } : {}),
    typescript: { tsconfigPath }
  };
}

export const readOnlyConfigMode = initialClassification.mode === "read-only-import";

// A first complete recapture occurs before the export becomes available.
if (readOnlyConfigMode) revalidateReadOnlyAuthority();
else revalidateOwnerAuthority();

export default function validatedNextConfig(phase: string): NextConfig {
  if (readOnlyConfigMode) {
    if (phase !== NEXT_CONFIG_READ_ONLY_IMPORT_PHASE) {
      throw new Error("NEXT_CONFIG_READ_ONLY_PHASE_INVALID");
    }
    const before = revalidateReadOnlyAuthority();
    const config = deterministicNextConfig({
      repoRoot: before.repo.canonicalPath,
      tsconfigPath: "tsconfig.next.json"
    });
    revalidateReadOnlyAuthority();
    return config;
  }

  const before = revalidateOwnerAuthority();
  if (phase !== before.authority.expectedPhase) {
    throw new Error("NEXT_CONFIG_OWNER_PHASE_INVALID");
  }
  const config = deterministicNextConfig({
    distDir: before.authority.interfaces.nextDist,
    repoRoot: before.authority.repoRoot,
    tsconfigPath: before.authority.interfaces.nextTsconfig
  });
  revalidateOwnerAuthority();
  return config;
}
