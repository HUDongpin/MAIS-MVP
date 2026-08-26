import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  buildVercelSourceContentRequests,
  findVercelStagingManifestUid,
  flattenVercelDeploymentSourceFiles,
  validateVercelCliSourcePackageEvidence,
  validateVercelSourceFileContent
} from "./vercel-source-provenance.mjs";

const candidateSha = "a".repeat(40);
const sourceTreeObject = "b".repeat(40);

function digest(algorithm, value) {
  return createHash(algorithm).update(value).digest("hex");
}

function record(path, contents, mode = "100644") {
  const bytes = Buffer.from(contents);
  return {
    path,
    mode,
    size: bytes.length,
    rawSha1: digest("sha1", bytes),
    sha256: digest("sha256", bytes),
    gitBlobOid: createHash("sha1")
      .update(Buffer.from(`blob ${bytes.length}\0`))
      .update(bytes)
      .digest("hex")
  };
}

function fixture() {
  const sourceFixtures = [
    { file: record("app/page.tsx", "export default function Page() {}\n", "100755"), contents: "export default function Page() {}\n" },
    { file: record("package.json", '{"name":"fixture"}\n'), contents: '{"name":"fixture"}\n' }
  ];
  const files = sourceFixtures.map(({ file }) => file);
  const canonical = `${files.map((file) => JSON.stringify([
    file.path,
    file.mode,
    file.size,
    file.rawSha1,
    file.sha256,
    file.gitBlobOid
  ])).join("\n")}\n`;
  const sourceManifestRoot = digest("sha256", Buffer.from(canonical));
  const manifest = {
    schemaVersion: 2,
    candidateSha,
    sourceTreeObject,
    objectFormat: "sha1",
    sourceManifestAlgorithm: "sha256-canonical-json-lines-v2",
    sourceManifestRoot,
    trackedEntryCount: 3,
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
    files
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const manifestRawSha1 = digest("sha1", manifestBytes);
  const manifestSha256 = digest("sha256", manifestBytes);
  const filesPayload = [
    {
      name: "src",
      type: "directory",
      children: [
        {
          name: "app",
          type: "directory",
          children: [{ name: "page.tsx", type: "file", mode: 33261, uid: files[0].rawSha1 }]
        },
        { name: "package.json", type: "file", mode: 33188, uid: files[1].rawSha1 },
        { name: "vercel-staging-manifest.json", type: "file", mode: 33188, uid: manifestRawSha1 }
      ]
    },
    { name: "out", type: "directory", children: [] }
  ];
  const value = {
    releaseBinding: { candidateSha },
    filesPayload,
    manifestContentPayload: { data: manifestBytes.toString("base64") },
    expectedStaging: {
      candidateSha,
      sourceTreeObject,
      objectFormat: "sha1",
      sourceManifestRoot,
      trackedEntryCount: manifest.trackedEntryCount,
      fileCount: manifest.fileCount,
      totalBytes: manifest.totalBytes,
      manifestRawSha1,
      manifestSha256
    },
    manifest,
    manifestBytes,
    sourceFixtures
  };
  const requests = buildVercelSourceContentRequests(value);
  value.verifiedSourceContents = new Map(requests.map((request) => {
    const source = sourceFixtures.find(({ file }) => file.rawSha1 === request.uid);
    return [request.uid, validateVercelSourceFileContent(request, {
      data: Buffer.from(source.contents).toString("base64")
    })];
  }));
  return value;
}

test("provider file tree is flattened under exactly one src root", () => {
  const value = fixture();
  const files = flattenVercelDeploymentSourceFiles(value.filesPayload);
  assert.deepEqual([...files.entries()], [
    ["app/page.tsx", { mode: 33261, uid: value.manifest.files[0].rawSha1 }],
    ["package.json", { mode: 33188, uid: value.manifest.files[1].rawSha1 }],
    ["vercel-staging-manifest.json", {
      mode: 33188,
      uid: value.expectedStaging.manifestRawSha1
    }]
  ]);
  assert.equal(findVercelStagingManifestUid(value.filesPayload), value.expectedStaging.manifestRawSha1);
});

test("CLI source provenance binds provider bytes to the exact current Git package", () => {
  const value = fixture();
  assert.deepEqual(validateVercelCliSourcePackageEvidence(value), {
    verified: true,
    candidateSha,
    sourceTreeObject,
    sourceManifestRoot: value.expectedStaging.sourceManifestRoot,
    manifestRawSha1: value.expectedStaging.manifestRawSha1,
    manifestSha256: value.expectedStaging.manifestSha256,
    fileCount: 2,
    totalBytes: value.expectedStaging.totalBytes,
    contentSha256Verified: true,
    fileModesVerified: true
  });
});

test("provider source byte mutation fails closed", () => {
  const value = fixture();
  value.filesPayload[0].children[0].children[0].uid = "f".repeat(40);
  assert.throws(() => validateVercelCliSourcePackageEvidence(value), /provider source bytes/i);
});

test("every provider source file is fetched and re-hashed with SHA-256", () => {
  const value = fixture();
  const requests = buildVercelSourceContentRequests(value);
  assert.equal(requests.length, 2);
  assert.throws(
    () => validateVercelSourceFileContent(requests[0], {
      data: Buffer.from("mutated provider bytes\n").toString("base64")
    }),
    /content|encoding/i
  );

  const missing = fixture();
  missing.verifiedSourceContents.delete(requests[0].uid);
  assert.throws(
    () => validateVercelCliSourcePackageEvidence(missing),
    /content proof/i
  );
});

test("provider file mode must equal the Git-bound manifest mode", () => {
  const value = fixture();
  value.filesPayload[0].children[0].children[0].mode = 33188;
  assert.throws(
    () => validateVercelCliSourcePackageEvidence(value),
    /file mode/i
  );
});

test("provider source extras and omissions fail closed", () => {
  const extra = fixture();
  extra.filesPayload[0].children.push({
    name: "unexpected.txt",
    type: "file",
    mode: 33188,
    uid: "e".repeat(40)
  });
  assert.throws(() => validateVercelCliSourcePackageEvidence(extra), /file set/i);

  const missing = fixture();
  missing.filesPayload[0].children.splice(1, 1);
  assert.throws(() => validateVercelCliSourcePackageEvidence(missing), /file set|source bytes/i);
});

test("manifest content must be canonical base64 and match its provider UID plus SHA-256", () => {
  const badEncoding = fixture();
  badEncoding.manifestContentPayload.data = "not base64";
  assert.throws(() => validateVercelCliSourcePackageEvidence(badEncoding), /encoding/i);

  const wrongBytes = fixture();
  wrongBytes.manifestContentPayload.data = Buffer.from("{}\n").toString("base64");
  assert.throws(() => validateVercelCliSourcePackageEvidence(wrongBytes), /manifest bytes/i);
});

test("candidate, tree, manifest root, and aggregate metadata are all exact", () => {
  for (const mutate of [
    (value) => { value.expectedStaging.candidateSha = "c".repeat(40); },
    (value) => { value.expectedStaging.sourceTreeObject = "d".repeat(40); },
    (value) => { value.expectedStaging.sourceManifestRoot = "e".repeat(64); },
    (value) => { value.expectedStaging.totalBytes += 1; }
  ]) {
    const value = fixture();
    mutate(value);
    assert.throws(() => validateVercelCliSourcePackageEvidence(value), /Git-bound schema/i);
  }
});

test("manifest paths must be sorted, unique, relative, and traversal-free", () => {
  const value = fixture();
  const manifest = JSON.parse(value.manifestBytes.toString("utf8"));
  manifest.files[0].path = "../private.txt";
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  value.manifestContentPayload.data = bytes.toString("base64");
  value.expectedStaging.manifestRawSha1 = digest("sha1", bytes);
  value.expectedStaging.manifestSha256 = digest("sha256", bytes);
  value.filesPayload[0].children.at(-1).uid = value.expectedStaging.manifestRawSha1;
  assert.throws(
    () => validateVercelCliSourcePackageEvidence(value),
    /invalid path|source path was invalid|canonical/i
  );
});

test("duplicate provider paths and non-regular leaves fail closed", () => {
  const duplicate = fixture();
  duplicate.filesPayload[0].children.push({
    ...duplicate.filesPayload[0].children[1]
  });
  assert.throws(() => flattenVercelDeploymentSourceFiles(duplicate.filesPayload), /duplicate/i);

  const symlink = fixture();
  symlink.filesPayload[0].children[1].mode = 41471;
  assert.throws(() => flattenVercelDeploymentSourceFiles(symlink.filesPayload), /regular SHA-1 file/i);
});
