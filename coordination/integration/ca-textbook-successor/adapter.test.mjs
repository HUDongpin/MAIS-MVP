// Synthetic static-observer tests. Application code is parsed, never executed.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
  cpSync,
  rmSync,
  realpathSync,
  existsSync,
  chmodSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOT, ANCHOR, BUNDLE_PATHS } from "./constants.mjs";
import { parse, hash } from "./common.mjs";
const project = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
  ),
  sourcePath = "lib/server/mediaOwnerErasure.ts",
  sourceBytes = execFileSync(
    "/usr/bin/git",
    ["show", ANCHOR + ":" + sourcePath],
    { cwd: project, maxBuffer: 32 * 1024 * 1024 },
  ),
  source = sourceBytes.toString();
let codeRoot, adapter, policy;
before(async () => {
  codeRoot = realpathSync(mkdtempSync("/tmp/ca-adapter-code-"));
  const copy = (file) => {
    const target = path.join(codeRoot, file);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(path.join(project, file), target);
  };
  for (const file of BUNDLE_PATHS) copy(file);
  const target = path.join(codeRoot, ROOT, "canonical-observer-ca-v1.mjs");
  if (existsSync(path.join(project, ROOT, "canonical-observer-ca-v1.mjs")))
    copy(ROOT + "/canonical-observer-ca-v1.mjs");
  else
    copyFileSync(
      path.join(project, "coordination/integration/promotion-gate-lib.mjs"),
      target,
    );
  const dependencyRoot =
    process.env.CA_TEST_TYPESCRIPT_ROOT ??
    path.join(project, "node_modules/typescript");
  assert.equal(
    parse(readFileSync(path.join(dependencyRoot, "package.json"))).version,
    "5.8.3",
    "Tests require the lockfile TypeScript, never a substitute parser",
  );
  mkdirSync(path.join(codeRoot, "node_modules"), { recursive: true });
  cpSync(dependencyRoot, path.join(codeRoot, "node_modules/typescript"), {
    recursive: true,
    dereference: false,
  });
  adapter = await import(pathToFileURL(target));
  if (existsSync(path.join(project, ROOT, "storage-loader-policy-v1.mjs")))
    policy = await import(
      pathToFileURL(path.join(codeRoot, ROOT, "storage-loader-policy-v1.mjs"))
    );
});
after(() => {
  if (codeRoot) rmSync(codeRoot, { recursive: true, force: true });
});
async function runtimeFixture(run) {
  const root = realpathSync(mkdtempSync("/tmp/ca-adapter-source-"));
  try {
    const write = (file, bytes) => {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), bytes);
    };
    const manifest = parse(
      readFileSync(
        path.join(
          project,
          "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/promotion-manifest.v1.json",
        ),
      ),
    );
    for (const entry of [
      ...manifest.liveReachability.entrypoints,
      ...manifest.liveReachability.specialFiles,
    ])
      write(entry, 'import "@/lib/server/mediaOwnerErasure"; export {};\n');
    for (const file of [
      "tsconfig.json",
      "tsconfig.next.json",
      "next.config.ts",
    ])
      write(file, readFileSync(path.join(project, file)));
    write(sourcePath, sourceBytes);
    for (const folder of [
      "public",
      "coordination/content-qa",
      "data/generated-content",
    ])
      mkdirSync(path.join(root, folder), { recursive: true });
    return await run({ root, write, manifest });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const observations = async (f) =>
  adapter.observeCanonicalRuntimePolicy(f.root, f.manifest);

test("adapter retains raw4 and reports reviewedStorage4/unclassified0", () =>
  runtimeFixture(async (f) => {
    const observation = await observations(f);
    assert.equal(observation.graph.loaderInventory.zeroBaselineCalls.length, 4);
    assert.equal(observation.loaderPolicy.zeroBaselineCallCount, 4);
    assert.deepEqual(
      [
        observation.storageLoaderProof.rawDetectedCount,
        observation.storageLoaderProof.reviewedStorageCount,
        observation.storageLoaderProof.unclassifiedCount,
      ],
      [4, 4, 0],
    );
    assert.equal(observation.storageLoaderProof.rawOperations.length, 4);
  }));
test("adapter audit consumes the same issued observation", () =>
  runtimeFixture(async (f) => {
    const observation = await observations(f);
    const audit = await adapter.auditCanonicalLegacyConflictUnion(
      f.root,
      f.manifest,
      observation,
    );
    assert.equal(
      audit.schemaVersion,
      "promotion-legacy-conflict-union-audit.v1",
    );
    assert.match(observation.issuedObservationDigest, /^[a-f0-9]{64}$/u);
  }));
test("adapter refuses a cloned or missing graph instead of rescanning", () =>
  runtimeFixture(async (f) => {
    const observation = await observations(f);
    await assert.rejects(
      () =>
        adapter.auditCanonicalLegacyConflictUnion(
          f.root,
          f.manifest,
          structuredClone(observation),
        ),
      (e) => e.code === "CA_OBSERVATION_IDENTITY",
    );
    await assert.rejects(
      () => adapter.auditCanonicalLegacyConflictUnion(f.root, f.manifest),
      (e) => e.code === "CA_OBSERVATION_IDENTITY",
    );
  }));
test("adapter graph mutation invalidates its issued seal", () =>
  runtimeFixture(async (f) => {
    const observation = await observations(f);
    assert.throws(() => observation.graph.edges.push({}), TypeError);
    Set.prototype.add.call(
      observation.graph.reachablePaths,
      "synthetic-forged-path",
    );
    await assert.rejects(
      () =>
        adapter.auditCanonicalLegacyConflictUnion(
          f.root,
          f.manifest,
          observation,
        ),
      (e) => e.code === "CA_OBSERVATION_IDENTITY",
    );
  }));
test("adapter rejects source drift between its observation and audit", () =>
  runtimeFixture(async (f) => {
    const observation = await observations(f);
    f.write("data/questions.ts", "export const changed=true;\n");
    await assert.rejects(
      () =>
        adapter.auditCanonicalLegacyConflictUnion(
          f.root,
          f.manifest,
          observation,
        ),
      (e) => e.code === "CA_OBSERVATION_SOURCE_DRIFT",
    );
  }));
for (const [label, mutate] of [
  [
    "changed r flag",
    (s) => s.replace('open(directory, "r")', 'open(directory, "r+")'),
  ],
  ["changed wx flag", (s) => s.replace('open(file, "wx")', 'open(file, "w")')],
  [
    "new handle read",
    (s) =>
      s.replace(
        "try { await handle.sync(); }",
        "try { await handle.readFile(); await handle.sync(); }",
      ),
  ],
  [
    "weakened safeRoot",
    (s) =>
      s.replace(
        "function safeRoot(root: string) {",
        "function safeRoot(root: string) { return root;",
      ),
  ],
  [
    "extra opendir",
    (s) => s + '\nasync function extra(){ return opendir("."); }\n',
  ],
  ["byte-only drift", (s) => s + "\n// unreviewed\n"],
])
  test("adapter rejects whole-module " + label, () =>
    runtimeFixture(async (f) => {
      const changed = mutate(source);
      assert.notEqual(changed, source, "Mutation must reach the real source");
      f.write(sourcePath, changed);
      await assert.rejects(
        () => observations(f),
        /CA_STORAGE_SOURCE_BINDING|MODULE_PARSE_INDETERMINATE/,
      );
    }),
  );
test("adapter rejects changed tracked executable mode", () =>
  runtimeFixture(async (f) => {
    chmodSync(path.join(f.root, sourcePath), 0o755);
    await assert.rejects(() => observations(f), /CA_STORAGE_SOURCE_BINDING/);
  }));
test("adapter preserves unclassified foreign operations in the raw partition", () =>
  runtimeFixture(async (f) => {
    f.write(
      "lib/foreign-storage.ts",
      'import {opendir} from "node:fs/promises"; export const foreign=()=>opendir(".");\n',
    );
    f.write(
      "data/questions.ts",
      'import "@/lib/foreign-storage"; export {};\n',
    );
    await assert.rejects(
      () => observations(f),
      (e) =>
        e.code === "UNREGISTERED_RUNTIME_LOADER" &&
        e.details.rawDetectedCount === 5 &&
        e.details.reviewedStorageCount === 4 &&
        e.details.unclassifiedCount === 1,
    );
  }));
test("adapter retains malformed syntax rejection", () =>
  runtimeFixture(async (f) => {
    f.write("data/questions.ts", "export const = ;");
    await assert.rejects(
      () => observations(f),
      (e) => e.code === "MODULE_PARSE_INDETERMINATE",
    );
  }));
test("adapter preserves nonliteral import findings for the native zero-unresolved gate", () =>
  runtimeFixture(async (f) => {
    f.write("data/questions.ts", 'const selected="unknown"; import(selected);');
    const observation = await observations(f);
    assert.equal(observation.graph.unresolvedCalls.length, 1);
  }));
for (const [label, change] of [
  ["missing", (rows) => rows.slice(1)],
  ["duplicate", (rows) => [...rows, rows[0]]],
  [
    "moved",
    (rows) =>
      rows.map((r, i) => (i === 0 ? { ...r, position: r.position + 1 } : r)),
  ],
  [
    "aliased",
    (rows) =>
      rows.map((r, i) => (i === 0 ? { ...r, callee: "node:fs.open" } : r)),
  ],
])
  test("closed storage profile rejects " + label + " detected records", () =>
    runtimeFixture(async (f) => {
      assert.ok(
        policy?.classifyReviewedStorageOperations,
        "Successor policy must exist",
      );
      const analysis = adapter.analyzeRuntimeLoaderCalls(sourcePath, source),
        rows = analysis.zeroBaselineCalls.map((r) => ({
          sourcePath,
          sourceRawSha256: hash(sourceBytes),
          ...r,
        }));
      assert.throws(
        () =>
          policy.classifyReviewedStorageOperations(
            f.root,
            change(rows),
            "5.8.3",
          ),
        /CA_STORAGE_CALL_SET|CA_DUPLICATE/,
      );
    }),
  );

test("checked-in adapter provenance and full-index diff match exact bytes", () => {
  const provenance = parse(
    readFileSync(path.join(project, ROOT, "adapter-provenance.v1.json")),
  );
  for (const binding of [
    provenance.original,
    provenance.derived,
    provenance.diff,
    provenance.storageProfile,
  ])
    assert.equal(
      hash(readFileSync(path.join(project, binding.path))),
      binding.sha256,
    );
  let actual;
  try {
    actual = execFileSync(
      "/usr/bin/git",
      [
        "diff",
        "--no-index",
        "--no-color",
        "--no-ext-diff",
        "--no-textconv",
        "--full-index",
        "--unified=3",
        "--diff-algorithm=myers",
        "--no-indent-heuristic",
        "--src-prefix=a/",
        "--dst-prefix=b/",
        "--",
        provenance.original.path,
        provenance.derived.path,
      ],
      { cwd: project, maxBuffer: 4 * 1024 * 1024 },
    );
  } catch (e) {
    assert.equal(e.status, 1);
    actual = e.stdout;
  }
  assert.deepEqual(
    actual,
    readFileSync(path.join(project, provenance.diff.path)),
  );
});
