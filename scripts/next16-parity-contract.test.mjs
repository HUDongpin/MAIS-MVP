import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

async function source(relativePath) {
  return await fs.readFile(path.join(repoRoot, relativePath), "utf8");
}

async function exists(relativePath) {
  return await fs.stat(path.join(repoRoot, relativePath)).then(() => true).catch(() => false);
}

test("Next 16.3 parity versions stay exact on Node 24 without TypeScript 7", async () => {
  const packageJson = JSON.parse(await source("package.json"));

  assert.equal(packageJson.engines?.node, "24.x");
  assert.equal(packageJson.dependencies.next, "16.3.0");
  assert.equal(packageJson.dependencies.react, "19.2.8");
  assert.equal(packageJson.dependencies["react-dom"], "19.2.8");
  assert.equal(packageJson.devDependencies["@types/react"], "19.2.18");
  assert.equal(packageJson.devDependencies["@types/react-dom"], "19.2.4");
  assert.equal(packageJson.devDependencies.typescript, "5.8.3");
  assert.equal(packageJson.overrides["@types/react"], "19.2.18");
  assert.equal(packageJson.overrides["@types/react-dom"], "19.2.4");
});

test("middleware has migrated to the Node-runtime proxy convention", async () => {
  const proxy = await source("proxy.ts");
  const nextConfig = await source("next.config.ts");

  assert.equal(await exists("middleware.ts"), false);
  assert.match(proxy, /export async function proxy\s*\(/);
  assert.doesNotMatch(proxy, /export const runtime\s*=\s*["']edge["']/);
  assert.match(nextConfig, /skipProxyUrlNormalize:\s*true/);
  assert.doesNotMatch(nextConfig, /skipMiddlewareUrlNormalize/);
});

test("Async Request APIs are guarded by explicit route generation and strict type-check", async () => {
  const packageJson = JSON.parse(await source("package.json"));
  const workflow = await source(".github/workflows/ci.yml");
  const typeCheckCommand = packageJson.scripts?.["type-check"] ?? "";
  const generationStep = typeCheckCommand.indexOf("next typegen");
  const compilerStep = typeCheckCommand.indexOf("tsc --noEmit");
  assert.ok(generationStep >= 0, "type-check must generate Next route types explicitly");
  assert.ok(compilerStep > generationStep, "strict TypeScript checking must run after route type generation");
  assert.match(workflow, /run: npm run type-check/, "CI must use the same generated type-check contract");

  const scanRoots = ["app", "components", "lib"];
  const markerScan = spawnSync(
    "rg",
    ["-n", "@next-codemod-error|UnsafeUnwrapped", ...scanRoots, "proxy.ts"],
    { cwd: repoRoot, encoding: "utf8" }
  );
  assert.equal(markerScan.status, 1, markerScan.stdout || markerScan.stderr);
});

test("removed next lint command stays absent and build is not reported as lint", async () => {
  const executableSurfaces = [
    await source("package.json"),
    await source("next.config.ts"),
    await source(".github/workflows/ci.yml")
  ].join("\n");

  assert.doesNotMatch(executableSurfaces, /next lint|next build --no-lint/);
  assert.doesNotMatch(executableSurfaces, /\blint\s*:/);
});

test("next-env is generated and ignored while route type includes stay explicit", async () => {
  const gitignore = await source(".gitignore");
  const tsconfig = await source("tsconfig.json");
  const nextTsconfig = await source("tsconfig.next.json");
  const nextConfig = await source("next.config.ts");
  const tracked = spawnSync("git", ["ls-files", "--error-unmatch", "next-env.d.ts"], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.match(gitignore, /^next-env\.d\.ts$/m);
  assert.match(tsconfig, /"next-env\.d\.ts"/);
  assert.match(tsconfig, /"\.next\/types\/\*\*\/\*\.ts"/);
  assert.match(tsconfig, /"\.next\/dev\/types\/\*\*\/\*\.ts"/);
  assert.match(nextTsconfig, /"\.next\/dev\/types\/\*\*\/\*\.ts"/);
  assert.match(nextConfig, /`\$\{dist\}\/dev\/types\/\*\*\/\*\.ts`/);

  if (tracked.status === 0) {
    assert.equal(
      await exists("next-env.d.ts"),
      false,
      "before commit, a tracked next-env.d.ts is acceptable only as a scheduled deletion"
    );
  }
});

test("the first parity slice does not enable excluded Next or compiler features", async () => {
  const nextConfig = await source("next.config.ts");
  const packageJson = await source("package.json");

  for (const excluded of [
    "cacheComponents",
    "partialPrefetching",
    "turbopackRustReactCompiler",
    "useOffline",
    "reactCompiler"
  ]) {
    assert.doesNotMatch(nextConfig, new RegExp(`\\b${excluded}\\b`), excluded);
  }
  assert.doesNotMatch(packageJson, /babel-plugin-react-compiler|typescript\s*["']?\s*:\s*["'](?:7|next|beta|rc)/i);
});

test("CI verifies default Turbopack and explicit Webpack release builds separately", async () => {
  const workflow = await source(".github/workflows/ci.yml");

  assert.match(
    workflow,
    /npm run release:build-gate -- --json --run-id ci-next16-default/,
    "default build must pass no bundler flag"
  );
  assert.match(
    workflow,
    /npm run release:build-gate -- --webpack --json --run-id ci-next16-webpack/,
    "Webpack compatibility must be an independent build"
  );
});
