import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { getPremiumThreeDDirectLab } from "./premiumThreeDDirectLabs";

test("Visualization Lab first screen defers the full catalog and active lab runtime", () => {
  const source = fs.readFileSync("components/visualizations/VisualizationLabPage.tsx", "utf8");

  assert.doesNotMatch(source, /from "@\/data\/visualizationLabs"/);
  assert.match(source, /import\("@\/data\/visualizationLabs"\)/);
  assert.doesNotMatch(source, /import \{ ConfiguredVisualizationLab \} from "@\/components\/visualizations\/ConfiguredVisualizationLab"/);
  assert.match(source, /dynamic<LabComponentProps>\(/);
  assert.match(source, /data-viz-lab-runtime-loading/);
  assert.doesNotMatch(source, /data-viz-lab-runtime-loading[\s\S]{0,160}data-viz-surface/);
  assert.match(source, /onRuntimeReady\?: \(labId: string\) => void/);
  assert.match(source, /createRuntimeReadyLabComponent/);
  assert.match(source, /querySelector\("\[data-viz-surface\]"\)/);
  assert.match(source, /querySelector\("\[data-viz-mark\]"\)/);
  assert.match(source, /activeLabRuntimeReadyId/);
  assert.match(source, /data-viz-panel-mode=\{visiblePanelMode\}/);
  assert.doesNotMatch(source, /data-viz-panel-mode=\{panelMode\}/);
});

test("ConfiguredVisualizationLab keeps the Three.js canvas in a lazy runtime chunk", () => {
  const source = fs.readFileSync("components/visualizations/ConfiguredVisualizationLab.tsx", "utf8");
  const visualizationCatalogImportLines = source
    .split("\n")
    .filter((line) => line.includes("@/data/visualizationLabs"));

  assert.deepEqual(visualizationCatalogImportLines, [
    'import type { FeaturedLabDefinition, VisualizationTemplateId } from "@/data/visualizationLabs";',
    '    import("@/data/visualizationLabs")'
  ]);
  assert.match(source, /import type \{ FeaturedLabDefinition, VisualizationTemplateId \} from "@\/data\/visualizationLabs"/);
  assert.match(source, /import\("@\/data\/visualizationLabs"\)/);
  assert.match(source, /export function ConfiguredVisualizationLabDirect\(props: ConfiguredVisualizationLabProps\)/);
  assert.match(source, /function ConfiguredVisualizationLabSurface\(\{ controlFooterAction, lab = null, labId, topicId \}: ConfiguredVisualizationLabProps\)/);
  assert.doesNotMatch(source, /import \{ ThreeDLabCanvas \} from "@\/components\/visualizations\/three\/ThreeDLabCanvas"/);
  assert.match(source, /import\("@\/components\/visualizations\/three\/ThreeDLabCanvas"\)/);
  assert.match(source, /dynamic<ThreeDLabCanvasProps>\(/);
  assert.match(source, /data-viz-three-runtime-loading/);
  assert.doesNotMatch(source, /data-viz-surface[\s\S]{0,160}data-viz-three-runtime-loading/);
});

test("premium 3D direct topic route stays off the full catalog path", () => {
  const routeSource = fs.readFileSync("app/student/tools/visualizations/[labId]/page.tsx", "utf8");
  const directMetadataSource = fs.readFileSync("components/visualizations/premiumThreeDDirectLabs.ts", "utf8");
  const directMetadataImportLines = directMetadataSource
    .split("\n")
    .filter((line) => line.includes("@/data/visualizationLabs"));

  assert.match(routeSource, /PremiumThreeDDirectRouteShell/);
  assert.match(routeSource, /getPremiumThreeDDirectLab\(normalizedLabId\)/);
  assert.match(routeSource, /if \(directLab\?\.threeD\?\.premiumLaunch\)/);
  assert.doesNotMatch(routeSource, /VisualizationLabRouteShell/);
  assert.doesNotMatch(routeSource, /@\/data\/visualizationLabs/);
  const directShellSource = fs.readFileSync("components/visualizations/PremiumThreeDDirectRouteShell.tsx", "utf8");
  assert.match(directShellSource, /ConfiguredVisualizationLabDirect/);
  assert.match(directShellSource, /useEffect/);
  assert.match(directShellSource, /useState/);
  assert.match(directShellSource, /useRef/);
  assert.match(directShellSource, /const \[workspaceIdentityHydrated, setWorkspaceIdentityHydrated\] = useState\(false\)/);
  assert.match(directShellSource, /setWorkspaceIdentityHydrated\(true\)/);
  assert.match(directShellSource, /const \[directRuntimeReady, setDirectRuntimeReady\] = useState\(false\)/);
  assert.match(directShellSource, /querySelector\("\[data-viz-surface\]"\)/);
  assert.match(directShellSource, /querySelector\("\[data-viz-mark\]"\)/);
  assert.match(directShellSource, /id=\{workspaceIdentityHydrated \? `lab-example-\$\{lab\.labId\}` : undefined\}/);
  assert.match(directShellSource, /data-viz-direct-workspace-id-ready=\{String\(workspaceIdentityHydrated\)\}/);
  assert.match(directShellSource, /data-viz-panel-mode=\{directRuntimeReady \? "lab" : "loading"\}/);
  assert.match(directShellSource, /data-viz-active-lab-id=\{directRuntimeReady \? lab\.labId : ""\}/);
  assert.match(directShellSource, /window\.location\.assign\(directoryHref\)/);
  assert.doesNotMatch(directShellSource, /href=\{directoryHref\}/);
  assert.doesNotMatch(directShellSource, /visualizationDiagnostics/);
  assert.doesNotMatch(directMetadataSource, /from "@\/data\/topics"/);
  assert.deepEqual(directMetadataImportLines, [
    'import type { FeaturedLabDefinition } from "@/data/visualizationLabs";'
  ]);
  assert.match(directMetadataSource, /import type \{ FeaturedLabDefinition \} from "@\/data\/visualizationLabs"/);
  assert.match(directMetadataSource, /us-ca-math-s4-chapter-05/);
  assert.match(directMetadataSource, /buildGenericPremiumThreeDDirectLab/);
  assert.match(directMetadataSource, /isPremiumThreeDLaunchLab\(labId\)/);
});

test("reported PEP S4 plane vectors direct lab preserves the vector-conic 3D mode", () => {
  const lab = getPremiumThreeDDirectLab("pep-high-s4-plane-vectors");

  assert.ok(lab);
  assert.equal(lab.templateId, "vector-conic-3d/strategy-map");
  assert.equal(lab.threeD?.fallbackTemplateId, "vector-conic-3d/strategy-map");
  assert.equal(lab.threeD?.familyId, "three-vector-conic-strategy");
  assert.equal(lab.threeD?.premiumLaunch, true);
  assert.equal(lab.threeD?.enabled, true);
});

test("HK functions direct lab stays on the canonical function graph Manim scene", () => {
  const lab = getPremiumThreeDDirectLab("functions");

  assert.ok(lab);
  assert.equal(lab.analyticsSource, "function-graph");
  assert.equal(lab.templateId, "function-graph");
  assert.equal(lab.threeD?.fallbackTemplateId, "function-graph");
  assert.equal(lab.threeD?.familyId, "three-function-graph");
  assert.equal(lab.threeD?.premiumLaunch, true);
  assert.equal(lab.threeD?.enabled, true);
});

test("roadmap visualization artwork does not import the full Visualization Lab catalog", () => {
  const source = fs.readFileSync("components/visualizations/RoadmapVisualizationSuite.tsx", "utf8");

  assert.doesNotMatch(source, /@\/data\/visualizationLabs/);
  assert.match(source, /roadmapVisualizationLabelsByTopicId/);
});

test("roadmap route shell keeps roadmap pages on server-rendered imports", () => {
  const shellPath = "components/learning/RoadmapRouteShell.tsx";
  assert.equal(fs.existsSync(shellPath), true, "RoadmapRouteShell should exist");

  const shellSource = fs.readFileSync(shellPath, "utf8");
  assert.doesNotMatch(shellSource, /"use client"/);
  assert.doesNotMatch(shellSource, /next\/dynamic/);
  assert.doesNotMatch(shellSource, /ssr:\s*false/);
  assert.match(shellSource, /import \{ StudentRoadmapPage \} from "@\/components\/learning\/StudentRoadmapPage"/);
  assert.match(shellSource, /import \{ PrimaryRoadmapPage \} from "@\/components\/learning\/PrimaryRoadmapPage"/);
  assert.match(shellSource, /import \{ SecondaryRoadmapPage \} from "@\/components\/learning\/SecondaryRoadmapPage"/);

  for (const routePath of [
    "app/student/roadmap/page.tsx",
    "app/student/roadmap/primary/page.tsx",
    "app/student/roadmap/secondary/page.tsx"
  ]) {
    const routeSource = fs.readFileSync(routePath, "utf8");
    assert.match(routeSource, /RoadmapRouteShell/);
    assert.doesNotMatch(routeSource, /@\/components\/learning\/(?:StudentRoadmapPage|PrimaryRoadmapPage|SecondaryRoadmapPage)/);
  }
});

test("visualization route shell defers the full lab page until after shell load", () => {
  const shellPath = "components/visualizations/VisualizationLabRouteShell.tsx";
  assert.equal(fs.existsSync(shellPath), true, "VisualizationLabRouteShell should exist");

  const shellSource = fs.readFileSync(shellPath, "utf8");
  assert.match(shellSource, /"use client"/);
  assert.match(shellSource, /ssr:\s*false/);
  assert.match(shellSource, /import\("@\/components\/visualizations\/VisualizationLabPage"\)/);
  assert.doesNotMatch(shellSource, /@\/data\/visualizationLabs/);
  assert.doesNotMatch(shellSource, /visualizationCatalogPreload/);
  assert.doesNotMatch(shellSource, /useEffect/);
  assert.match(shellSource, /function getRouteShellRequestedLabId\(/);
  assert.match(shellSource, /studentVisualizationToolsPath/);
  assert.match(shellSource, /function VisualizationLabRouteLoadingShell\(/);
  assert.doesNotMatch(shellSource, /deferLoadingWorkspaceSelectorUntilHydrated/);
  assert.doesNotMatch(shellSource, /deferWorkspaceSelectorUntilHydrated/);
  assert.doesNotMatch(shellSource, /workspaceSelectorHydrated/);
  assert.doesNotMatch(shellSource, /workspaceLabId/);
  assert.doesNotMatch(shellSource, /id=\{workspaceLabId \? `lab-example-\$\{workspaceLabId\}` : undefined\}/);
  assert.doesNotMatch(shellSource, /lab-example-\$\{workspaceLabId\}/);
  assert.match(shellSource, /data-viz-panel-mode="loading"/);
  assert.doesNotMatch(shellSource, /data-viz-panel-mode=\{requestedLabId \? "lab" : "loading"\}/);
  assert.match(shellSource, /data-viz-active-lab-id=\{requestedLabId \?\? ""\}/);
  assert.doesNotMatch(shellSource, /deferWorkspaceSelectorUntilHydrated=/);
  assert.match(shellSource, /onRouteShellReady=\{handleRouteShellReady\}/);
  assert.match(shellSource, /suppressLoadingWorkspaceSelector/);

  for (const routePath of [
    "app/visualization-lab/page.tsx",
    "app/student/tools/visualizations/page.tsx"
  ]) {
    const routeSource = fs.readFileSync(routePath, "utf8");
    assert.match(routeSource, /VisualizationLabRouteShell/);
    assert.doesNotMatch(routeSource, /@\/components\/visualizations\/VisualizationLabPage/);
  }

  for (const routePath of [
    "app/visualization-lab/page.tsx",
    "app/student/tools/visualizations/page.tsx"
  ]) {
    const routeSource = fs.readFileSync(routePath, "utf8");
    assert.match(routeSource, /searchParams/);
    assert.match(routeSource, /initialLabId=\{initialLabId\}/);
    assert.match(routeSource, /initialGrade=\{initialGrade\}/);
  }

  const premiumTopicRouteSource = fs.readFileSync("app/student/tools/visualizations/[labId]/page.tsx", "utf8");
  assert.doesNotMatch(premiumTopicRouteSource, /VisualizationLabRouteShell/);
  assert.doesNotMatch(premiumTopicRouteSource, /deferLoadingWorkspaceSelectorUntilHydrated/);
  assert.doesNotMatch(premiumTopicRouteSource, /@\/data\/visualizationLabs/);
  assert.doesNotMatch(premiumTopicRouteSource, /export const dynamicParams = false/);
});
