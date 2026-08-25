import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { signatureLabAssignments, signatureLabIds } from "@/data/signatureLabAssignments";
import { signatureLabImporters } from "./signatureLabImporters";

/**
 * Phase 1 of the Codex-lab replacement plan (2026-08-25): lesson blocks with
 * `moduleId: "signature-lab"` render the topic's Claude signature bench, not the
 * `ConfiguredVisualizationLab` template. These tests pin the wiring and the
 * bundle boundaries that make the flip safe.
 */

test("lesson registry renders signature topics through LessonSignatureLab, not the template", () => {
  const source = fs.readFileSync("components/lesson/LessonView.tsx", "utf8");

  assert.match(source, /"signature-lab": LessonSignatureLab/);
  assert.doesNotMatch(source, /"signature-lab": ConfiguredVisualizationLab/);
  // The template renderer stays registered for configured topics (other tracks).
  assert.match(source, /"configured-visualization-lab": ConfiguredVisualizationLab/);
  // LessonSignatureLab loads lazily and never server-renders (canvas benches).
  assert.match(
    source,
    /const LessonSignatureLab = dynamic<LessonVisualizationProps>\(\s*\(\) => import\("@\/components\/visualizations\/LessonSignatureLab"\)[\s\S]{0,200}ssr: false/
  );
});

test("every signature bench has exactly one lesson importer", () => {
  const importerIds = Object.keys(signatureLabImporters).sort();
  const benchIds = [...signatureLabIds].sort();

  assert.deepEqual(importerIds, benchIds);
});

test("every lesson-embedded topic resolves benches the importer map can load", () => {
  for (const [topicId, assignment] of Object.entries(signatureLabAssignments)) {
    assert.ok(
      assignment.primary in signatureLabImporters,
      `${topicId} primary ${assignment.primary} has no lesson importer`
    );
    for (const related of assignment.related ?? []) {
      assert.ok(
        related in signatureLabImporters,
        `${topicId} related ${related} has no lesson importer`
      );
    }
  }
});

test("LessonSignatureLab keeps benches and the heavy catalog out of the static lesson graph", () => {
  const source = fs.readFileSync("components/visualizations/LessonSignatureLab.tsx", "utf8");

  // No static bench or adapter import — both arrive in the per-bench lazy chunk.
  assert.doesNotMatch(source, /^import .* from "@\/components\/visualizations\/signature\//m);
  assert.doesNotMatch(source, /^import \{ SignatureLabAdapter/m);
  assert.match(source, /import\("@\/components\/visualizations\/SignatureLabAdapter"\)/);
  assert.match(source, /adapter\.createSignatureLab\(benchModule\.default\)/);
  // The multi-region catalog may be referenced as a type only.
  assert.match(source, /import type \{ FeaturedLabDefinition \} from "@\/data\/visualizationLabs"/);
  assert.doesNotMatch(source, /^import \{[^}]*\} from "@\/data\/visualizationLabs"/m);
  // Canvas benches never server-render, and the template fallback stays lazy.
  assert.match(source, /ssr: false/);
  assert.match(source, /import\("@\/components\/visualizations\/ConfiguredVisualizationLab"\)/);
  assert.doesNotMatch(source, /^import \{ ConfiguredVisualizationLab \}/m);
});

test("importer map is thunks only — no bench ships in the shared bundle", () => {
  const source = fs.readFileSync("components/visualizations/signatureLabImporters.ts", "utf8");

  assert.doesNotMatch(source, /^import .* from "@\/components\/visualizations\/signature\//m);
  assert.match(source, /satisfies Record<SignatureLabId, SignatureLabImporter>/);
  const thunkCount = source.match(/\(\) => import\("@\/components\/visualizations\/signature\//g)?.length ?? 0;
  assert.equal(thunkCount, signatureLabIds.length);
});
