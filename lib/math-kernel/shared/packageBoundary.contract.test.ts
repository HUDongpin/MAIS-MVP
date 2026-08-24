import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

const packageRoot = resolve(process.cwd(), "lib/math-kernel");
const manifest = JSON.parse(
  readFileSync(resolve(packageRoot, "package.json"), "utf8"),
) as {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  exports: Record<string, unknown>;
};

test("@mais/math-kernel has an explicit installable package boundary", () => {
  assert.equal(manifest.name, "@mais/math-kernel");
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.dependencies["@cortex-js/compute-engine"], "0.118.1");
  assert.equal(Object.keys(manifest.exports).some((key) => key.includes("*")), false);
  assert.ok(manifest.exports["./bodies"]);
  assert.ok(manifest.exports["./conics/numeric"]);
  assert.ok(manifest.exports["./geometry/numeric"]);
  assert.ok(manifest.exports["./analytic/numeric"]);
  assert.ok(manifest.exports["./conics/exact.server"]);
  assert.ok(manifest.exports["./geometry/solvers.server"]);
  assert.ok(manifest.exports["./analytic/analytic-kernel.server"]);
});

test("client convenience entry cannot pull server or CAS modules", () => {
  const source = readFileSync(resolve(packageRoot, "entries/client.ts"), "utf8");
  const importAndExportLines = source
    .split("\n")
    .filter((line) => /^(?:import|export)\b/.test(line.trim()))
    .join("\n");
  assert.doesNotMatch(
    importAndExportLines,
    /\.server|computeEngine|@cortex-js|server-only/,
  );
});

test("server exports fail closed outside node or react-server conditions", () => {
  for (const [subpath, descriptor] of Object.entries(manifest.exports)) {
    if (
      subpath !== "./server" &&
      subpath !== "./server/cas" &&
      !subpath.endsWith(".server")
    ) {
      continue;
    }
    assert.equal(typeof descriptor, "object");
    const conditions = descriptor as Record<string, unknown>;
    assert.ok(conditions.node, `${subpath} is missing node condition`);
    assert.ok(conditions["react-server"], `${subpath} is missing react-server condition`);
    assert.equal(conditions.browser, undefined);
    assert.equal(conditions.default, undefined);
    assert.equal(conditions.import, undefined);
    assert.equal(conditions.require, undefined);
  }
});
