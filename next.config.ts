import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

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

// Next.js auto-injects `${distDir}/types/**/*.ts` into whatever tsconfig it is
// handed. For a custom distDir with no explicit tsconfig that used to be the
// shared tsconfig.json, so every dev server / ad-hoc build silently rewrote it
// with a per-dist include line. Point Next at a disposable, gitignored tsconfig
// instead so that write lands on a throwaway file and tsconfig.json stays
// pristine. Playwright and other harnesses that pass NEXT_TSCONFIG_PATH keep
// their explicit config; default builds (no custom distDir) keep tsconfig.next.json.
function disposableTsconfigForDist(dist: string) {
  try {
    const label = dist.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "dist";
    const fileName = `tsconfig.dist-${label}.tmp.json`;
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
    fs.writeFileSync(path.resolve(fileName), content);
    sweepOrphanedDisposableTsconfigs(fileName);
    return fileName;
  } catch {
    // If we can't write the throwaway config, fall back to the prior behavior
    // rather than breaking the build.
    return "tsconfig.json";
  }
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
  // `ws` (AI Tutor voice + speech realtime routes) probes for the optional
  // native `bufferutil` addon inside a try/catch. Bundling resolves that
  // require to an empty module instead of throwing, so ws installs a masking
  // path that calls `bufferUtil.mask` for frames >= 48 bytes and dies with
  // "bufferUtil.mask is not a function" — thrown from inside ws's own 'open'
  // handler, so the caller just hangs until its timeout. Loading ws from
  // node_modules at runtime restores the pure-JS fallback.
  serverExternalPackages: ["ws"],
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
