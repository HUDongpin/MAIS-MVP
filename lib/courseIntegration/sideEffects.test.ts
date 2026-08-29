import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const productionFiles = [
  "lib/courseIntegration/model.ts",
  "lib/courseIntegration/diff.ts",
  "lib/courseIntegration/errors.ts",
  "lib/courseIntegration/zip.ts",
  "lib/courseIntegration/xml.ts",
  "lib/courseIntegration/readiness.ts",
  "lib/courseIntegration/importer.ts",
  "app/api/teacher/course-imports/multipart.ts",
  "app/api/teacher/course-imports/handler.ts",
  "app/api/teacher/course-imports/route.ts"
];

test("course integration production modules expose no network, filesystem-write, or code-execution surface", async () => {
  const sources = await Promise.all(productionFiles.map(async (relativePath) => ({
    relativePath,
    source: await readFile(path.join(process.cwd(), relativePath), "utf8")
  })));
  const forbidden = [
    /from\s+["']node:(?:fs|fs\/promises|http|https|net|tls|dns|dgram|child_process)["']/,
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\b/,
    /\.formData\s*\(/,
    /\b(?:eval|Function)\s*\(/,
    /\bimport\s*\(/,
    /\b(?:writeFile|appendFile|createWriteStream|mkdir|rename|unlink|rm)\s*\(/
  ];

  for (const { relativePath, source } of sources) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${relativePath} contains forbidden production I/O or execution`);
    }
  }
  assert.equal(
    sources.filter(({ source }) => /from\s+["']jszip["']/.test(source)).length,
    1,
    "only the bounded in-memory importer may load JSZip"
  );
});
