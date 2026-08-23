import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { checkMathKernelClientBundle } from "./check-math-kernel-client-bundle.mjs";

async function createFixture() {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-math-client-bundle-"));
  const chunks = path.join(repoRoot, ".next", "static", "chunks");
  await mkdir(chunks, { recursive: true });
  await writeFile(path.join(chunks, "app.js"), "globalThis.__MAIS_CLIENT__ = true;\n");
  await writeFile(
    path.join(repoRoot, ".next", "build-manifest.json"),
    JSON.stringify({ pages: { "/": ["static/chunks/app.js"] } }),
  );
  return { repoRoot, chunks };
}

test("client bundle check accepts clean chunks and manifests", async () => {
  const fixture = await createFixture();
  try {
    const result = await checkMathKernelClientBundle({
      repoRoot: fixture.repoRoot,
      distDir: ".next",
    });
    assert.equal(result.chunkFileCount, 1);
    assert.equal(result.clientManifestCount, 1);
    assert.equal(result.uniqueFileCount, 2);
  } finally {
    await rm(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("client bundle check rejects Compute Engine evidence in a learner chunk", async () => {
  const fixture = await createFixture();
  try {
    await writeFile(
      path.join(fixture.chunks, "leak.js"),
      'import "@cortex-js/compute-engine";\n',
    );
    await assert.rejects(
      checkMathKernelClientBundle({ repoRoot: fixture.repoRoot, distDir: ".next" }),
      /server-only math CAS marker.*compute-engine.*static\/chunks\/leak\.js/i,
    );
  } finally {
    await rm(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("client bundle check rejects CAS evidence in a client-reference manifest", async () => {
  const fixture = await createFixture();
  try {
    const manifest = path.join(
      fixture.repoRoot,
      ".next",
      "server",
      "app",
      "page_client-reference-manifest.js",
    );
    await mkdir(path.dirname(manifest), { recursive: true });
    await writeFile(manifest, "self.__RSC_MANIFEST={module:'complex-esm'};\n");
    await assert.rejects(
      checkMathKernelClientBundle({ repoRoot: fixture.repoRoot, distDir: ".next" }),
      /server-only math CAS marker.*complex-esm.*client-reference-manifest/i,
    );
  } finally {
    await rm(fixture.repoRoot, { recursive: true, force: true });
  }
});
