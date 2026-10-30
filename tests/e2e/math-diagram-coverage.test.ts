import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { validateMathDiagramCoverage, type DiagramCoverageInventory } from "../../scripts/math-diagram-coverage";

const referencePath = "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json";
const historicalPath = "coordination/reports/2026-08-09-math-diagram-inventory.json";
const reference = JSON.parse(readFileSync(referencePath, "utf8")) as DiagramCoverageInventory;
const historical = JSON.parse(readFileSync(historicalPath, "utf8")) as DiagramCoverageInventory;
const fixture = () => structuredClone(reference);

function rejected(inventory: DiagramCoverageInventory, message: RegExp) {
  assert.ok(validateMathDiagramCoverage(inventory).some((failure) => message.test(failure)),
    `expected a row-level coverage failure matching ${message}`);
}

test("the current admitted graph satisfies coverage without resurrecting historical candidates", () => {
  assert.deepEqual(validateMathDiagramCoverage(fixture()), []);
});

test("a same-count lesson replacement cannot hide a missing route", () => {
  const inventory = fixture();
  inventory.lessonRoutes[0].topicId = "unreviewed-replacement";
  rejected(inventory, /lessonRoutes.*missing/);
});

test("a retained lesson cannot silently change its canonical route", () => {
  const inventory = fixture();
  inventory.lessonRoutes[0].route = "/student/lessons/wrong-topic";
  rejected(inventory, /lessonRoutes.*binding changed/);
});

test("an interactive lesson cannot lose its live parent binding", () => {
  const inventory = fixture();
  inventory.ccssLessons[0].parentTopicIds = [];
  rejected(inventory, /ccssLessons.*binding changed/);
});

test("the 35 admitted California openers cannot disappear from the graph", () => {
  const inventory = fixture();
  const oldIds = new Set(historical.ccssLessons.map((row) => row.lessonId));
  inventory.ccssLessons = inventory.ccssLessons.filter((row) => oldIds.has(row.lessonId));
  rejected(inventory, /ccssLessons.*missing/);
});

test("a same-count practice figure replacement cannot hide a missing question", () => {
  const inventory = fixture();
  inventory.practiceFigures[0].questionId = "unreviewed-replacement";
  rejected(inventory, /practiceFigures.*missing/);
});

test("a retained practice question cannot silently change diagram kind", () => {
  const inventory = fixture();
  inventory.practiceFigures[0].kind = "ten-frame";
  rejected(inventory, /practiceFigures.*binding changed/);
});

test("a same-count lab replacement cannot hide a missing live lab", () => {
  const inventory = fixture();
  inventory.visualizationLabs[0].labId = "unreviewed-replacement";
  rejected(inventory, /visualizationLabs.*missing/);
});

test("a signature lab cannot swap its primary renderer with a related bench", () => {
  const inventory = fixture();
  const lab = inventory.visualizationLabs.find((row) => row.labId === "us-ca-math-k-k-cc-cardinality-compare")!;
  assert.deepEqual(lab.signatureBenchIds, ["CountingLab", "ComparingLab"]);
  lab.signatureBenchIds.reverse();
  rejected(inventory, /visualizationLabs.*binding changed/);
});

test("a purpose-built HK lab cannot silently revert to the generic renderer", () => {
  const inventory = fixture();
  const lab = inventory.visualizationLabs.find((row) => row.labId === "p2-length-data")!;
  lab.moduleId = "configured-visualization-lab";
  rejected(inventory, /visualizationLabs.*binding changed/);
});

test("a live 3D lab cannot disappear behind unchanged overall lab counts", () => {
  const inventory = fixture();
  const lab = inventory.visualizationLabs.find((row) => row.rendersThreeD)!;
  lab.declaresThreeD = false;
  lab.rendersThreeD = false;
  lab.effectiveRenderer = "configured-svg";
  rejected(inventory, /visualizationLabs.*binding changed/);
});

test("retired California signature-canvas 3D declarations must stay retired", () => {
  const inventory = fixture();
  inventory.visualizationLabs.find((row) => row.labId === "us-ca-math-s2-chapter-02")!.declaresThreeD = true;
  rejected(inventory, /visualizationLabs.*binding changed/);
});

test("a same-count asset replacement cannot hide a missing live reference", () => {
  const inventory = fixture();
  inventory.liveAssetReferences[0].assetPath = "/lesson-illustrations/unreviewed.png";
  rejected(inventory, /liveAssetReferences.*missing/);
});

test("duplicate references cannot inflate coverage", () => {
  const inventory = fixture();
  inventory.liveAssetReferences.push(structuredClone(inventory.liveAssetReferences[0]));
  rejected(inventory, /liveAssetReferences.*duplicate/);
});

for (const [collection, key] of [
  ["lessonRoutes", "topicId"],
  ["practiceFigures", "questionId"],
  ["visualizationLabs", "labId"],
  ["liveAssetReferences", "assetPath"]
] as const) {
  test(`historical-only ${collection} cannot re-enter live coverage`, () => {
    const inventory = fixture();
    const currentIds = new Set(reference[collection].map((row) => Reflect.get(row, key)));
    const retired = historical[collection].find((row) => !currentIds.has(Reflect.get(row, key)));
    assert.ok(retired, `fixture must contain a retired ${collection} row`);
    // The tuple keeps collection and row paired; push through a shared object view.
    (inventory[collection] as object[]).push(structuredClone(retired));
    rejected(inventory, new RegExp(`${collection}.*retired`));
  });
}

test("new identities may extend coverage while every retained binding stays intact", () => {
  const inventory = fixture();
  inventory.lessonRoutes.push({ topicId: "new-topic", route: "/student/lessons/new-topic", publisher: "US_CA_MATH", interactiveLessonIds: [], visualizationIds: [] });
  assert.deepEqual(validateMathDiagramCoverage(inventory), []);
});

test("report row ordering does not change identity coverage", () => {
  const inventory = fixture();
  inventory.lessonRoutes.reverse();
  inventory.liveAssetReferences.reverse();
  for (const row of inventory.ccssLessons) row.parentTopicIds.reverse();
  inventory.visualizationLabs.reverse();
  assert.deepEqual(validateMathDiagramCoverage(inventory), []);
});


test("retired bitmaps cannot return through a renamed exporter", () => {
  const inventory = fixture();
  const paths = new Set(inventory.liveAssetReferences.map((row) => row.assetPath));
  const retired = historical.liveAssetReferences.find((row) => !paths.has(row.assetPath))!;
  inventory.liveAssetReferences.push({ ...retired, manifest: "new-manifest.ts", exportName: "newExport" });
  rejected(inventory, /liveAssetReferences.*retired/);
});

for (const evidencePath of [referencePath, historicalPath]) {
  for (const damage of ["modified", "missing"] as const) {
    test(`${damage} immutable evidence fails closed: ${evidencePath}`, () => {
      const root = mkdtempSync(path.join(tmpdir(), "mais-diagram-coverage-"));
      try {
        for (const report of [referencePath, historicalPath]) {
          const destination = path.join(root, report);
          mkdirSync(path.dirname(destination), { recursive: true });
          if (report !== evidencePath) copyFileSync(report, destination);
          else if (damage === "modified") {
            // Still valid JSON with identical values: even raw evidence changes
            // must not silently redefine the coverage reference.
            writeFileSync(destination, `${readFileSync(report, "utf8")}\n`);
          }
        }
        const result = spawnSync(process.execPath, [
          "--import", require.resolve("tsx"), "-e",
          "require(process.argv[1]).validateMathDiagramCoverage(JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8')))",
          path.resolve("scripts/math-diagram-coverage.ts"), path.resolve(referencePath)
        ], { cwd: root, encoding: "utf8", timeout: 15_000 });
        assert.equal(result.error, undefined);
        assert.equal(result.status, 1);
        assert.match(result.stderr, damage === "modified" ? /coverage reference hash mismatch/ : /ENOENT/);
        assert.ok(result.stderr.includes(evidencePath));
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  }
}


test("a retained lesson cannot lose an embedded visualization", () => {
  const inventory = fixture();
  const route = inventory.lessonRoutes.find((row) => row.topicId === "advanced-functions")!;
  route.visualizationIds = [];
  rejected(inventory, /lessonRoutes.*binding changed/);
});

test("a retained lesson cannot lose its interactive lesson binding", () => {
  const inventory = fixture();
  const route = inventory.lessonRoutes.find((row) => row.interactiveLessonIds.length > 0)!;
  route.interactiveLessonIds = [];
  rejected(inventory, /lessonRoutes.*binding changed/);
});

test("new signature-canvas identities cannot reintroduce misleading 3D declarations", () => {
  const inventory = fixture();
  const signature = inventory.visualizationLabs.find((row) => row.moduleId === "signature-lab")!;
  inventory.visualizationLabs.push({ ...signature, labId: "new-signature-lab", declaresThreeD: true });
  rejected(inventory, /visualizationLabs.*signature-canvas.*3D/);
});
