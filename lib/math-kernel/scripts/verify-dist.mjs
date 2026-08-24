import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  await readFile(join(packageRoot, "package.json"), "utf8"),
);

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

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function exportTargets(value) {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(exportTargets);
}

assert(packageJson.name === "@mais/math-kernel", "Unexpected package name.");
assert(packageJson.version === "0.1.0", "Unexpected package version.");
assert(
  packageJson.dependencies?.["@cortex-js/compute-engine"] === "0.118.1",
  "Compute Engine must remain exactly pinned.",
);
assert(!Object.keys(packageJson.exports).some((key) => key.includes("*")), "Wildcard exports are forbidden.");

for (const [subpath, descriptor] of Object.entries(packageJson.exports)) {
  if (subpath === "./package.json") continue;
  for (const target of new Set(exportTargets(descriptor))) {
    assert(target.startsWith("./dist/"), `${subpath} escapes dist: ${target}`);
    await stat(join(packageRoot, target));
  }
}

const serverSubpaths = Object.entries(packageJson.exports).filter(([subpath]) =>
  subpath === "./server" ||
  subpath === "./server/cas" ||
  subpath.endsWith(".server"),
);
for (const [subpath, descriptor] of serverSubpaths) {
  assert(descriptor.node && descriptor["react-server"], `${subpath} needs node and react-server conditions.`);
  assert(!descriptor.browser && !descriptor.default && !descriptor.import && !descriptor.require, `${subpath} leaked a browser/default export.`);
}

const allDistFiles = await listFiles(join(packageRoot, "dist"));
assert(allDistFiles.length > 0, "dist is empty.");
assert(
  !allDistFiles.some((file) => /(?:\.test\.|\/demo\/|\/test-fixtures\/)/.test(file)),
  "Tests, demos, or fixtures leaked into dist.",
);

const integrityPath = join(packageRoot, "dist/RUNTIME_INTEGRITY.json");
const integrity = JSON.parse(await readFile(integrityPath, "utf8"));
assert(integrity.schemaVersion === 1, "Runtime integrity schema is invalid.");
assert(integrity.package === packageJson.name, "Runtime integrity package is invalid.");
assert(integrity.version === packageJson.version, "Runtime integrity version is invalid.");
assert(integrity.algorithm === "sha256", "Runtime integrity algorithm is invalid.");
const integrityCandidates = [
  join(packageRoot, "package.json"),
  join(packageRoot, "LICENSE"),
  join(packageRoot, "NOTICE"),
  join(packageRoot, "README.md"),
  join(packageRoot, "THIRD_PARTY_NOTICES.md"),
  ...allDistFiles.filter((file) => file !== integrityPath),
];
const expectedIntegrityFiles = integrityCandidates
  .map((file) => relative(packageRoot, file).split("\\").join("/"))
  .sort();
assert(
  JSON.stringify(Object.keys(integrity.files).sort()) ===
    JSON.stringify(expectedIntegrityFiles),
  "Runtime integrity file list is incomplete or contains an unexpected path.",
);
for (const file of integrityCandidates) {
  const packageRelative = relative(packageRoot, file).split("\\").join("/");
  assert(
    integrity.files[packageRelative] === await sha256(file),
    `Runtime integrity mismatch for ${packageRelative}.`,
  );
}

for (const declaration of allDistFiles.filter((file) => file.endsWith(".d.ts"))) {
  const contents = await readFile(declaration, "utf8");
  assert(!/^import ["']server-only["'];/mu.test(contents), `${declaration} retains server-only.`);
  const specifiers = [
    ...contents.matchAll(/\bfrom\s+["'](\.\.?\/[^"']+)["']/gu),
    ...contents.matchAll(/\bimport\s*\(\s*["'](\.\.?\/[^"']+)["']\s*\)/gu),
  ].map((match) => match[1]);
  for (const specifier of specifiers) {
    assert(
      /\.(?:c|m)?js$|\.json$/u.test(specifier),
      `${declaration} has a NodeNext-incompatible specifier ${specifier}.`,
    );
  }
}

const clientTargets = Object.entries(packageJson.exports)
  .filter(([subpath]) => !serverSubpaths.some(([serverSubpath]) => serverSubpath === subpath))
  .flatMap(([, descriptor]) => exportTargets(descriptor))
  .filter((target) => /dist\/(?:esm|cjs)\//.test(target));
const forbiddenClientMarkers = [
  "@cortex-js/compute-engine",
  "ComputeEngine",
  "server-only",
];
for (const target of new Set(clientTargets)) {
  const contents = await readFile(join(packageRoot, target), "utf8");
  for (const marker of forbiddenClientMarkers) {
    assert(!contents.includes(marker), `Client target ${target} contains ${marker}.`);
  }
}

for (const legalFile of ["LICENSE", "NOTICE", "README.md", "THIRD_PARTY_NOTICES.md"]) {
  assert((await stat(join(packageRoot, legalFile))).isFile(), `${legalFile} is missing.`);
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  package: packageJson.name,
  version: packageJson.version,
  exports: Object.keys(packageJson.exports).length,
  distFiles: allDistFiles.length,
  integrityFiles: expectedIntegrityFiles.length,
  clientTargets: new Set(clientTargets).size,
})}\n`);
