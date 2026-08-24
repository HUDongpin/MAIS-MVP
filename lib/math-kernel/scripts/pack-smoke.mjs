import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const packageJson = JSON.parse(
  await readFile(join(packageRoot, "package.json"), "utf8"),
);
const scratchRoot = process.env.MAIS_MATH_KERNEL_PACKAGE_TMP_ROOT
  ? resolve(process.env.MAIS_MATH_KERNEL_PACKAGE_TMP_ROOT)
  : join(repositoryRoot, ".tmp");
await mkdir(scratchRoot, { recursive: true });
const temporaryRoot = await mkdtemp(join(scratchRoot, "mais-math-kernel-package-"));
const temporaryNpmCache = join(temporaryRoot, "npm-cache");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? packageRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: temporaryNpmCache,
    },
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}).\n${result.stderr || result.stdout}`,
    );
  }
  return result;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function listFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory)) {
    const absolute = join(directory, entry);
    if ((await stat(absolute)).isDirectory()) output.push(...await listFiles(absolute));
    else output.push(absolute);
  }
  return output;
}

try {
  const artifactDirectory = join(temporaryRoot, "artifact");
  const consumerDirectory = join(temporaryRoot, "consumer");
  await mkdir(artifactDirectory);
  await mkdir(consumerDirectory);

  const packResult = run("npm", [
    "pack",
    "--ignore-scripts",
    "--json",
    "--pack-destination",
    artifactDirectory,
  ]);
  const packMetadataList = JSON.parse(packResult.stdout);
  assert(
    Array.isArray(packMetadataList) && packMetadataList.length === 1,
    "npm pack did not return exactly one metadata record.",
  );
  const packMetadata = packMetadataList[0];

  const tarballs = (await readdir(artifactDirectory)).filter((name) => name.endsWith(".tgz"));
  assert(tarballs.length === 1, `Expected one tarball, found ${tarballs.length}.`);
  assert(tarballs[0] === packMetadata.filename, "npm pack metadata filename is inconsistent.");
  const tarball = join(artifactDirectory, tarballs[0]);
  const packedList = packMetadata.files.map(({ path }) => `package/${path}`);
  const forbiddenPackedPath = packedList.find((path) =>
    /(?:node_modules|\.next|\.tmp|test-fixtures|\/demo\/|\.test\.)/.test(path),
  );
  assert(!forbiddenPackedPath, `Forbidden packed path: ${forbiddenPackedPath}`);
  assert(packedList.includes("package/package.json"), "Packed package.json is missing.");
  assert(packedList.includes("package/LICENSE"), "Packed LICENSE is missing.");
  assert(packedList.includes("package/NOTICE"), "Packed NOTICE is missing.");
  assert(
    packedList.includes("package/dist/RUNTIME_INTEGRITY.json"),
    "Packed runtime integrity manifest is missing.",
  );
  assert(packedList.some((path) => path.startsWith("package/dist/esm/")), "Packed ESM runtime is missing.");
  assert(packedList.some((path) => path.startsWith("package/dist/cjs/")), "Packed CJS runtime is missing.");
  assert(packedList.some((path) => path.startsWith("package/dist/types/")), "Packed declarations are missing.");

  await writeFile(
    join(consumerDirectory, "package.json"),
    JSON.stringify({ name: "math-kernel-isolated-consumer", private: true, type: "module" }, null, 2),
  );
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      tarball,
    ],
    { cwd: consumerDirectory },
  );

  const installedPackageRoot = join(
    consumerDirectory,
    "node_modules/@mais/math-kernel",
  );
  for (const file of await listFiles(installedPackageRoot)) {
    if (!/\.(?:c?js|json|map|md|txt)$/.test(file) && !/(?:LICENSE|NOTICE)$/.test(file)) {
      continue;
    }
    const contents = await readFile(file, "utf8");
    assert(!contents.includes("/Volumes/Starship/"), `${file} contains a local volume path.`);
    assert(!contents.includes("MAIS-math-kernel-wt"), `${file} contains a worktree name.`);
  }

  const typeProbe = join(consumerDirectory, "probe.ts");
  await writeFile(
    typeProbe,
    `import { cube, type BodyTopology } from "@mais/math-kernel/bodies";\n` +
      `import { ellipseNumeric } from "@mais/math-kernel/conics/numeric";\n` +
      `import { boxVolume } from "@mais/math-kernel/geometry/exact.server";\n` +
      `const body: ReturnType<typeof cube> = cube();\n` +
      `const topology: BodyTopology | null = body.ok ? body.value : null;\n` +
      `const ellipse = ellipseNumeric({ a: 2, b: 1 });\n` +
      `const volume = boxVolume(2, 3, 4);\n` +
      `void [topology, ellipse, volume];\n`,
  );
  const tscPath = join(repositoryRoot, "node_modules/typescript/bin/tsc");
  run(process.execPath, [
    tscPath,
    "--noEmit",
    "--strict",
    "--noUncheckedSideEffectImports",
    "--target",
    "ES2022",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    typeProbe,
  ], { cwd: consumerDirectory });

  const esmProbe = join(consumerDirectory, "probe.mjs");
  await writeFile(
    esmProbe,
    `import assert from "node:assert/strict";\n` +
      `import { cube } from "@mais/math-kernel/bodies";\n` +
      `import { ellipseNumeric } from "@mais/math-kernel/conics/numeric";\n` +
      `import { boxVolume } from "@mais/math-kernel/geometry/exact.server";\n` +
      `const body = cube();\n` +
      `assert.equal(body.ok, true);\n` +
      `assert.equal(body.value.vertices.length, 8);\n` +
      `assert.equal(body.value.edges.length, 12);\n` +
      `const ellipse = ellipseNumeric({ a: 2, b: Math.sqrt(3) });\n` +
      `assert.equal(ellipse.ok, true);\n` +
      `const volume = boxVolume(2, 3, 4);\n` +
      `assert.equal(volume.ok, true);\n` +
      `assert.equal(volume.value.latex, "24");\n` +
      `process.stdout.write(JSON.stringify({ format: "esm", edges: body.value.edges.length, exact: volume.value.latex }));\n`,
  );
  const esmResult = run(process.execPath, [esmProbe], { cwd: consumerDirectory });

  const cjsProbe = join(consumerDirectory, "probe.cjs");
  await writeFile(
    cjsProbe,
    `const assert = require("node:assert/strict");\n` +
      `const { cube } = require("@mais/math-kernel/bodies");\n` +
      `const { boxVolume } = require("@mais/math-kernel/geometry/exact.server");\n` +
      `const body = cube();\n` +
      `assert.equal(body.ok, true);\n` +
      `assert.equal(body.value.edges.length, 12);\n` +
      `const volume = boxVolume(2, 3, 4);\n` +
      `assert.equal(volume.ok, true);\n` +
      `assert.equal(volume.value.approx, 24);\n` +
      `process.stdout.write(JSON.stringify({ format: "cjs", edges: body.value.edges.length, exact: volume.value.latex }));\n`,
  );
  const cjsResult = run(process.execPath, [cjsProbe], { cwd: consumerDirectory });

  const browserEntry = join(consumerDirectory, "browser-entry.mjs");
  const browserBundle = join(consumerDirectory, "browser-bundle.js");
  await writeFile(
    browserEntry,
    `import { cube } from "@mais/math-kernel/bodies";\n` +
      `import { ellipseNumeric } from "@mais/math-kernel/conics/numeric";\n` +
      `globalThis.mathKernelSmoke = { cube: cube(), ellipse: ellipseNumeric({ a: 2, b: 1 }) };\n`,
  );
  const esbuildExecutable = join(repositoryRoot, "node_modules/.bin/esbuild");
  run(esbuildExecutable, [
    browserEntry,
    "--bundle",
    "--platform=browser",
    `--outfile=${browserBundle}`,
  ], { cwd: consumerDirectory });
  const browserContents = await readFile(browserBundle, "utf8");
  for (const marker of ["@cortex-js/compute-engine", "ComputeEngine", "complex-esm", "server-only"]) {
    assert(!browserContents.includes(marker), `Browser bundle contains ${marker}.`);
  }

  const rejectedServerImports = [
    {
      exportName: "boxVolume",
      specifier: "@mais/math-kernel/geometry/exact.server",
    },
    {
      exportName: "geometry",
      specifier: "@mais/math-kernel/server",
    },
    {
      exportName: "CasSession",
      specifier: "@mais/math-kernel/server/cas",
    },
  ];
  for (const [index, candidate] of rejectedServerImports.entries()) {
    const invalidBrowserEntry = join(
      consumerDirectory,
      `invalid-browser-entry-${index}.mjs`,
    );
    await writeFile(
      invalidBrowserEntry,
      `import { ${candidate.exportName} as forbidden } from ${JSON.stringify(candidate.specifier)};\n` +
        `globalThis.invalidServerImport = forbidden;\n`,
    );
    const invalidBrowserResult = run(esbuildExecutable, [
      invalidBrowserEntry,
      "--bundle",
      "--platform=browser",
      `--outfile=${join(consumerDirectory, `invalid-browser-bundle-${index}.js`)}`,
    ], { cwd: consumerDirectory, allowFailure: true });
    assert(
      invalidBrowserResult.status !== 0,
      `A browser build unexpectedly resolved ${candidate.specifier}.`,
    );
  }

  process.stdout.write(`${JSON.stringify({
    ok: true,
    package: packageJson.name,
    version: packageJson.version,
    tarball: basename(tarball),
    packedFiles: packedList.length,
    packedSize: packMetadata.size,
    unpackedSize: packMetadata.unpackedSize,
    integrity: packMetadata.integrity,
    esm: JSON.parse(esmResult.stdout),
    cjs: JSON.parse(cjsResult.stdout),
    typescriptConsumer: true,
    browserBytes: Buffer.byteLength(browserContents),
    serverImportsRejectedByBrowser: rejectedServerImports.map(
      ({ specifier }) => specifier,
    ),
  })}\n`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
