import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export type DiagramCoverageInventory = {
  lessonRoutes: {
    topicId: string;
    route: string;
    publisher: string;
    interactiveLessonIds: string[];
    visualizationIds: string[];
  }[];
  ccssLessons: { lessonId: string; parentTopicIds: string[] }[];
  practiceFigures: { questionId: string; topicId: string; kind: string }[];
  visualizationLabs: {
    labId: string;
    topicId: string;
    moduleId: string;
    templateId: string | null;
    signatureBenchIds: string[];
    declaresThreeD: boolean;
    effectiveRenderer: string;
    rendersThreeD: boolean;
    route: string;
  }[];
  liveAssetReferences: { manifest: string; exportName: string; assetPath: string; mediaType: string }[];
};

// These files are immutable observations, not new acceptance certificates.
// Their original failing results remain unchanged. Hash pins prevent a modified
// report from silently redefining the current source-coverage contract.
const currentReference = {
  path: "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json",
  sha256: "8f0c302833589c4faa6f5a0551745e7f9d35632b57ed0c6fab7c1cda0436c805"
};
const historicalReference = {
  path: "coordination/reports/2026-08-09-math-diagram-inventory.json",
  sha256: "5f5abd9ca3e3fcac0afa9aba2ce6157365648ebfe306c9c954fbbf353e9d97fc"
};

type CoverageReport = DiagramCoverageInventory & { failures: string[] };

function readReference(reference: { path: string; sha256: string }): CoverageReport {
  const bytes = readFileSync(path.resolve(process.cwd(), reference.path));
  if (createHash("sha256").update(bytes).digest("hex") !== reference.sha256) {
    throw new Error(`math diagram coverage reference hash mismatch: ${reference.path}`);
  }
  return JSON.parse(bytes.toString("utf8")) as CoverageReport;
}

export function mathDiagramCoverageBaseline() {
  return {
    scope: "source-inventory-only",
    reference: { ...currentReference },
    historicalReference: { ...historicalReference },
    // Preserve the eight inherited failures plus two retired-bitmap count
    // failures as historical diagnostics, separate from this run's failures.
    historicalFailures: readReference(currentReference).failures
  };
}

export function validateMathDiagramCoverage(inventory: DiagramCoverageInventory): string[] {
  const current = readReference(currentReference);
  const historical = readReference(historicalReference);
  const failures: string[] = [];

  function compareRows<T>(
    collection: string,
    expected: T[],
    previous: T[],
    actual: T[],
    idFor: (row: T) => string,
    bindingFor: (row: T) => unknown,
    retirementIdFor: (row: T) => string = idFor
  ) {
    const actualById = new Map<string, T>();
    for (const row of actual) {
      const id = idFor(row);
      if (actualById.has(id)) failures.push(`inventory ${collection} duplicate identity: ${id}`);
      actualById.set(id, row);
    }
    for (const row of expected) {
      const id = idFor(row);
      const found = actualById.get(id);
      if (!found) failures.push(`inventory ${collection} missing retained identity: ${id}`);
      else if (JSON.stringify(bindingFor(found)) !== JSON.stringify(bindingFor(row))) {
        failures.push(`inventory ${collection} retained binding changed: ${id}`);
      }
    }
    const retainedIds = new Set(expected.map(retirementIdFor));
    const retiredIds = new Set(previous.map(retirementIdFor).filter((id) => !retainedIds.has(id)));
    for (const row of actual) {
      const id = retirementIdFor(row);
      if (retiredIds.has(id)) failures.push(`inventory ${collection} retired identity reintroduced: ${id}`);
    }
  }

  compareRows("lessonRoutes", current.lessonRoutes, historical.lessonRoutes, inventory.lessonRoutes,
    (row) => row.topicId,
    (row) => [row.route, row.publisher, [...row.interactiveLessonIds].sort(), [...row.visualizationIds].sort()]);
  compareRows("ccssLessons", current.ccssLessons, historical.ccssLessons, inventory.ccssLessons,
    (row) => row.lessonId, (row) => [...row.parentTopicIds].sort());
  compareRows("practiceFigures", current.practiceFigures, historical.practiceFigures, inventory.practiceFigures,
    (row) => row.questionId, (row) => [row.topicId, row.kind]);
  compareRows("visualizationLabs", current.visualizationLabs, historical.visualizationLabs, inventory.visualizationLabs,
    (row) => row.labId,
    // Index zero is the default renderer; the remaining order drives the bench switcher.
    (row) => [row.topicId, row.moduleId, row.templateId, row.signatureBenchIds,
      row.declaresThreeD, row.effectiveRenderer, row.rendersThreeD, row.route]);
  compareRows("liveAssetReferences", current.liveAssetReferences, historical.liveAssetReferences, inventory.liveAssetReferences,
    (row) => JSON.stringify([row.manifest, row.exportName, row.assetPath]), (row) => row.mediaType,
    // A retired bitmap must not return under a different manifest/export name.
    (row) => row.assetPath);
  // Zero misleading declarations is an invariant, not a minimum-coverage
  // floor. It also applies to new identities beyond the retained snapshot.
  for (const row of inventory.visualizationLabs) {
    if (row.moduleId === "signature-lab" && row.declaresThreeD) {
      failures.push(`inventory visualizationLabs signature-canvas must not declare 3D: ${row.labId}`);
    }
  }
  return failures;
}
