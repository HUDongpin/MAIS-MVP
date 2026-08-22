import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import type { BigIntStats } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import {
  CA_VIZ_COMPOSED_QA_BUILD_ENV,
  assertNoQaOnlyInstrumentationSync
} from "./scripts/assert-no-qa-only-instrumentation.mjs";

const composedQaBuildValue = process.env[CA_VIZ_COMPOSED_QA_BUILD_ENV];
assertNoQaOnlyInstrumentationSync({
  env: process.env,
  mode: composedQaBuildValue === undefined ? "release" : "composed-qa-build",
  root: process.cwd()
});

const distDir = process.env.NEXT_DIST_DIR?.trim();
const explicitTsconfigPath = process.env.NEXT_TSCONFIG_PATH?.trim();

const DISPOSABLE_TSCONFIG_PATTERN = /^tsconfig\.dist-.+\.tmp\.json$/;

// Delete disposable tsconfigs left behind by dead sessions so they don't pile up
// at the repo root (they can't live under .tmp/ — tsc resolves `include` globs
// relative to the tsconfig's own dir, so `**/*.ts` has to stay repo-rooted).
// A file is stale only when its backing distDir is gone AND it wasn't just
// written, which keeps a running server's config (whose distDir exists) and a
// concurrently-starting one (whose distDir isn't created yet) safe.
function sweepOrphanedDisposableTsconfigs(currentFileName: string) {
  try {
    const staleAfterMs = 5 * 60 * 1000;
    for (const name of fs.readdirSync(process.cwd())) {
      if (name === currentFileName || !DISPOSABLE_TSCONFIG_PATTERN.test(name)) continue;
      const filePath = path.resolve(name);
      try {
        const recentlyWritten = Date.now() - fs.statSync(filePath).mtimeMs < staleAfterMs;
        if (recentlyWritten) continue;
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as { include?: string[] };
        const backingDist = parsed.include
          ?.find((glob) => glob !== ".next/types/**/*.ts" && glob.endsWith("/types/**/*.ts"))
          ?.replace(/\/types\/\*\*\/\*\.ts$/, "");
        if (backingDist && !fs.existsSync(path.resolve(backingDist))) fs.unlinkSync(filePath);
      } catch {
        // Skip anything we can't stat/parse/remove; best-effort GC only.
      }
    }
  } catch {
    // Never let housekeeping break config resolution.
  }
}

function isSingleRegularFile(identity: BigIntStats) {
  return identity.isFile() && !identity.isSymbolicLink() && identity.nlink === BigInt(1);
}

function sameFsObject(left: BigIntStats, right: BigIntStats) {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.nlink === right.nlink &&
    left.isFile() === right.isFile();
}

function writeExclusiveDisposableTsconfig(filePath: string, content: string) {
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(
      filePath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        (fs.constants.O_NOFOLLOW ?? 0),
      0o600
    );
    const opened = fs.fstatSync(descriptor, { bigint: true });
    if (!isSingleRegularFile(opened)) {
      throw new Error("created path is not one regular non-hardlinked file");
    }
    fs.writeFileSync(descriptor, content, "utf8");
    fs.fsyncSync(descriptor);
    const afterWrite = fs.fstatSync(descriptor, { bigint: true });
    const pathIdentity = fs.lstatSync(filePath, { bigint: true });
    if (
      !isSingleRegularFile(afterWrite) ||
      !isSingleRegularFile(pathIdentity) ||
      !sameFsObject(opened, afterWrite) ||
      !sameFsObject(afterWrite, pathIdentity) ||
      afterWrite.size !== BigInt(Buffer.byteLength(content, "utf8"))
    ) {
      throw new Error("pathname identity changed while the disposable config was written");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not create a safe disposable Next tsconfig at ${filePath}: ${message}`);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

// Next.js auto-injects `${distDir}/types/**/*.ts` into whatever tsconfig it is
// handed. For a custom distDir with no explicit tsconfig that used to be the
// shared tsconfig.json, so every dev server / ad-hoc build silently rewrote it
// with a per-dist include line. Point Next at a disposable, gitignored tsconfig
// instead so that write lands on a throwaway file and tsconfig.json stays
// pristine. Playwright and other harnesses that pass NEXT_TSCONFIG_PATH keep
// their explicit config; default builds (no custom distDir) keep tsconfig.next.json.
function disposableTsconfigForDist(dist: string) {
  const fullLabel = dist.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "dist";
  const label = fullLabel.slice(0, 64);
  const distDigest = createHash("sha256").update(dist).digest("hex").slice(0, 16);
  // A random suffix plus exclusive creation prevents distinct/concurrent config
  // loads from sharing a pathname even when their human-readable labels collide.
  const fileName = `tsconfig.dist-${label}-${distDigest}-${randomUUID()}.tmp.json`;
  const content = `${JSON.stringify(
    {
      extends: "./tsconfig.json",
      // Inherited from tsconfig.json via `extends`, but Next only inspects the
      // top-level file and warns it can't auto-add its plugin otherwise, so
      // restate it to keep dev startup quiet.
      compilerOptions: { plugins: [{ name: "next" }] },
      // A custom distDir writes its route types under `${dist}/types`, not
      // `.next/types`, so only that dir is added here.
      include: [
        "**/*.ts",
        "**/*.tsx",
        "components/visualizations/signature/**/*.jsx",
        "next-env.d.ts",
        `${dist}/types/**/*.ts`
      ],
      // Mirror tsconfig.json's exclude so `**/*.ts` never sweeps stray build
      // dirs (e.g. private/tmp/*-next) into this dev/build type-check.
      exclude: ["node_modules", "private", "private/**/*", "Users", "Users/**/*"]
    },
    null,
    2
  )}\n`;
  writeExclusiveDisposableTsconfig(path.resolve(fileName), content);
  sweepOrphanedDisposableTsconfigs(fileName);
  return fileName;
}

const tsconfigPath =
  explicitTsconfigPath ||
  (distDir ? disposableTsconfigForDist(distDir) : "tsconfig.next.json");
const studentLessonsPath = "/student/lessons";
const studentRoadmapPath = "/student/roadmap";
const studentPrimaryRoadmapPath = "/student/roadmap/primary";
const studentSecondaryRoadmapPath = "/student/roadmap/secondary";
const studentVisualizationToolsPath = "/student/tools/visualizations";
const studentAdventureIslandPath = "/student/practice/games/adventure-island";
const studentFishingMasterPath = "/student/practice/games/fishing-master";

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true,
  skipMiddlewareUrlNormalize: true,
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei", "three-stdlib"],
  async redirects() {
    return [
      {
        source: "/visualization-lab",
        destination: studentVisualizationToolsPath,
        permanent: true
      },
      {
        source: "/learning-path",
        destination: studentRoadmapPath,
        permanent: true
      },
      {
        source: "/primary-roadmap",
        destination: studentPrimaryRoadmapPath,
        permanent: true
      },
      {
        source: "/secondary-roadmap",
        destination: studentSecondaryRoadmapPath,
        permanent: true
      },
      {
        source: "/lesson",
        destination: studentLessonsPath,
        permanent: true
      },
      {
        source: "/lesson/:lessonSlug",
        destination: `${studentLessonsPath}/:lessonSlug`,
        permanent: true
      },
      // Config-level redirects so legacy game paths answer with a real
      // 307/308: app/practice has a loading boundary, so a page-level
      // redirect() would stream inside a 200 response instead.
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
  ...(tsconfigPath ? { typescript: { tsconfigPath } } : {})
};

export default nextConfig;
