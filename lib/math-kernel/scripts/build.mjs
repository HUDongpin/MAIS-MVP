import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = join(packageRoot, "dist");
const declarationRoot = join(distRoot, "types");

if (basename(packageRoot) !== "math-kernel") {
  throw new Error(`Refusing to build from unexpected package root: ${packageRoot}`);
}

const packageJson = JSON.parse(
  await readFile(join(packageRoot, "package.json"), "utf8"),
);

const clientEntryPoints = {
  index: join(packageRoot, "entries/client.ts"),
  "shared/types": join(packageRoot, "shared/types.ts"),
  "shared/errors": join(packageRoot, "shared/errors.ts"),
  "shared/mathjson": join(packageRoot, "shared/mathjson.ts"),
  "bodies/index": join(packageRoot, "bodies/index.ts"),
  "bodies/source-traceability": join(packageRoot, "bodies/sourceTraceability.ts"),
  "conics/model": join(packageRoot, "conics/model.ts"),
  "conics/numeric": join(packageRoot, "conics/numeric.ts"),
  "conics/source-traceability": join(packageRoot, "conics/sourceTraceability.ts"),
  "geometry/core": join(packageRoot, "geometry/core.ts"),
  "geometry/numeric": join(packageRoot, "geometry/numeric.ts"),
  "geometry/solids": join(packageRoot, "geometry/solids.ts"),
  "geometry/coordinates": join(packageRoot, "geometry/coordinates.ts"),
  "geometry/solution-types": join(packageRoot, "geometry/solutionTypes.ts"),
  "geometry/source-traceability": join(packageRoot, "geometry/sourceTraceability.ts"),
  "analytic/types": join(packageRoot, "analytic/types.ts"),
  "analytic/numeric": join(packageRoot, "analytic/numeric.ts"),
  "analytic/expressions": join(packageRoot, "analytic/expressions.ts"),
  "analytic/source-traceability": join(packageRoot, "analytic/sourceTraceability.ts"),
};

const serverEntryPoints = {
  "server/index": join(packageRoot, "entries/server.ts"),
  "server/cas": join(packageRoot, "cas/computeEngine.server.ts"),
  "conics/exact.server": join(packageRoot, "conics/exact.server.ts"),
  "geometry/exact.server": join(packageRoot, "geometry/exact.server.ts"),
  "geometry/solvers.server": join(packageRoot, "geometry/solvers.server.ts"),
  "analytic/analytic-kernel.server": join(
    packageRoot,
    "analytic/analyticKernel.server.ts",
  ),
};

const sharedBuildOptions = {
  absWorkingDir: packageRoot,
  bundle: true,
  entryNames: "[dir]/[name]",
  legalComments: "inline",
  logLevel: "warning",
  minify: false,
  sourcemap: true,
  sourcesContent: true,
  target: "es2022",
  treeShaking: true,
};

async function listDeclarationFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await listDeclarationFiles(absolute));
    else if (entry.name.endsWith(".d.ts")) output.push(absolute);
  }
  return output;
}

async function listFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await listFiles(absolute));
    else output.push(absolute);
  }
  return output;
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function withJavaScriptExtension(specifier) {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    return specifier;
  }
  return /\.(?:c|m)?js$|\.json$/u.test(specifier)
    ? specifier
    : `${specifier}.js`;
}

async function makeDeclarationsNodeNextCompatible() {
  for (const declarationFile of await listDeclarationFiles(declarationRoot)) {
    const original = await readFile(declarationFile, "utf8");
    const rewritten = original
      // `server-only` is a source/bundler guard. Package export conditions enforce
      // the published boundary, so consumers must not need that marker's types.
      .replace(/^import ["']server-only["'];\r?\n/gmu, "")
      .replace(
        /(\bfrom\s+["'])(\.\.?\/[^"']+)(["'])/gu,
        (_match, prefix, specifier, suffix) =>
          `${prefix}${withJavaScriptExtension(specifier)}${suffix}`,
      )
      .replace(
        /(\bimport\s*\(\s*["'])(\.\.?\/[^"']+)(["']\s*\))/gu,
        (_match, prefix, specifier, suffix) =>
          `${prefix}${withJavaScriptExtension(specifier)}${suffix}`,
      );
    if (rewritten !== original) await writeFile(declarationFile, rewritten);
  }
}

async function writeRuntimeIntegrityManifest() {
  const manifestPath = join(distRoot, "RUNTIME_INTEGRITY.json");
  const files = [
    join(packageRoot, "package.json"),
    join(packageRoot, "LICENSE"),
    join(packageRoot, "NOTICE"),
    join(packageRoot, "README.md"),
    join(packageRoot, "THIRD_PARTY_NOTICES.md"),
    ...(await listFiles(distRoot)).filter((file) => file !== manifestPath),
  ].sort((left, right) => left.localeCompare(right));
  const hashes = {};
  for (const file of files) {
    const packageRelative = relative(packageRoot, file).split("\\").join("/");
    hashes[packageRelative] = await sha256(file);
  }
  await writeFile(
    manifestPath,
    `${JSON.stringify({
      schemaVersion: 1,
      package: packageJson.name,
      version: packageJson.version,
      algorithm: "sha256",
      files: hashes,
    }, null, 2)}\n`,
  );
}

await rm(distRoot, { recursive: true, force: true });

const tscPath = require.resolve("typescript/bin/tsc");
await execFileAsync(process.execPath, [tscPath, "-p", join(packageRoot, "tsconfig.build.json")], {
  cwd: packageRoot,
});
await makeDeclarationsNodeNextCompatible();

await Promise.all([
  build({
    ...sharedBuildOptions,
    entryPoints: clientEntryPoints,
    format: "esm",
    outdir: join(distRoot, "esm"),
    platform: "browser",
  }),
  build({
    ...sharedBuildOptions,
    entryPoints: clientEntryPoints,
    format: "cjs",
    outdir: join(distRoot, "cjs"),
    outExtension: { ".js": ".cjs" },
    platform: "browser",
  }),
  build({
    ...sharedBuildOptions,
    conditions: ["react-server"],
    entryPoints: serverEntryPoints,
    external: ["@cortex-js/compute-engine"],
    format: "esm",
    outdir: join(distRoot, "esm"),
    platform: "node",
  }),
  build({
    ...sharedBuildOptions,
    conditions: ["react-server"],
    entryPoints: serverEntryPoints,
    external: ["@cortex-js/compute-engine"],
    format: "cjs",
    outdir: join(distRoot, "cjs"),
    outExtension: { ".js": ".cjs" },
    platform: "node",
  }),
]);
await writeRuntimeIntegrityManifest();

process.stdout.write(
  `${JSON.stringify({ ok: true, package: packageJson.name, version: packageJson.version })}\n`,
);
