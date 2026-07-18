"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { VisualizationCard } from "@/components/visualizations/VisualizationCard";
import VisualizationLabLoading from "@/components/visualizations/VisualizationLabLoading";
import labQuestIslandMapEn from "@/components/visualizations/assets/lab-quest-island-map-en.png";
import labQuestIslandMap from "@/components/visualizations/assets/lab-quest-island-map.png";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { fallbackLogoGlyphs, kindergartenCaliforniaLogoGlyphs, labLogoArtByGlyph, templateLogoGlyphs } from "@/components/visualizations/labLogoArt";
import { buildVisualizationLabHref, buildVisualizationPracticeHref, buildVisualizationSessionModuleId, buildVisualizationSnapshotMarkSample } from "@/components/visualizations/visualizationDiagnostics";
import { gradeIds } from "@/data/grades";
import { getSignatureLabAssignment, type SignatureLabId } from "@/data/signatureLabAssignments";
import { publisherLabels } from "@/lib/curriculumProfile";
import { formatGradeLabel, formatGradeLabelForCurriculum, formatUnitedStatesGradeLabel, simplifyChineseText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { studentVisualizationToolsPath } from "@/lib/visualizationRoutes";
import type { CurriculumTrack, GradeId, StudentSession, TextbookPublisher } from "@/types";

type VisualizationCatalogModule = typeof import("@/data/visualizationLabs");
type FeaturedLabDefinition = VisualizationCatalogModule["visualizationLabCatalog"][number];
type GradeLabGroupDefinition = VisualizationCatalogModule["gradeLabGroups"][number];
type VisualizationLabModuleId = FeaturedLabDefinition["moduleId"];
type VisualizationCurriculumTrack = FeaturedLabDefinition["curriculumTrack"];
type VisualizationTrackFilter = "all" | VisualizationCurriculumTrack;
type VisualizationTrackLabels = VisualizationCatalogModule["visualizationTrackLabels"];
type VisualizationCatalogState = {
  getVisualizationLabByLabId: VisualizationCatalogModule["getVisualizationLabByLabId"];
  gradeLabGroups: VisualizationCatalogModule["gradeLabGroups"];
  visualizationLabCount: VisualizationCatalogModule["visualizationLabCount"];
  visualizationTrackLabels: VisualizationTrackLabels;
};
type LabComponentRuntimeProps = { lab?: FeaturedLabDefinition | null; topicId: string; labId?: string };
type LabComponentProps = LabComponentRuntimeProps & { onRuntimeReady?: (labId: string) => void };
type PanelMode = "control" | "lab";
type DirectLinkStatus = "idle" | "ok" | "missing" | "unavailable";
type ShareState = "idle" | "copied" | "error" | "blocked";
type SnapshotState = "idle" | "copied" | "error" | "blocked";
type VisualizationLabRouteLocation = {
  pathname: string;
  search: string;
};
type VisualizationLabInitialRouteState = {
  activeDirectoryGrade: GradeId | null;
  activeLabId: string | null;
  directLinkStatus: DirectLinkStatus;
  panelMode: PanelMode;
  requestedLabId: string | null;
  trackFilter: VisualizationTrackFilter;
};
type VisualizationLabPageProps = {
  initialGrade?: GradeId | null;
  initialLabId?: string | null;
  onRouteShellReady?: () => void;
  suppressLoadingWorkspaceSelector?: boolean;
};
type VisualizationSessionsResponse = {
  sessions?: Array<{
    moduleId?: unknown;
    explored?: unknown;
  }>;
};

function createRuntimeReadyLabComponent(LoadedLabComponent: ComponentType<LabComponentRuntimeProps>): ComponentType<LabComponentProps> {
  return function RuntimeReadyLabComponent({ onRuntimeReady, ...props }: LabComponentProps) {
    const runtimeRootRef = useRef<HTMLDivElement>(null);
    const readyLabId = props.lab?.labId ?? props.labId ?? props.topicId;

    useEffect(() => {
      if (!onRuntimeReady || !readyLabId || typeof window === "undefined") return;

      let animationFrame = 0;
      let cancelled = false;

      const probeRuntimeReady = () => {
        if (cancelled) return;

        const runtimeRoot = runtimeRootRef.current;
        const surface = runtimeRoot?.querySelector("[data-viz-surface]");
        const mark = surface?.querySelector("[data-viz-mark]");

        if (surface && mark) {
          onRuntimeReady(readyLabId);
          return;
        }

        animationFrame = window.requestAnimationFrame(probeRuntimeReady);
      };

      animationFrame = window.requestAnimationFrame(probeRuntimeReady);

      return () => {
        cancelled = true;
        window.cancelAnimationFrame(animationFrame);
      };
    }, [onRuntimeReady, readyLabId]);

    return (
      <div ref={runtimeRootRef} data-viz-lab-runtime-root data-viz-lab-runtime-ready-probe={readyLabId}>
        <LoadedLabComponent {...props} />
      </div>
    );
  };
}

const ConfiguredVisualizationLab = dynamic<LabComponentProps>(
  () => import("@/components/visualizations/ConfiguredVisualizationLab").then((module) => createRuntimeReadyLabComponent(module.ConfiguredVisualizationLab as ComponentType<LabComponentRuntimeProps>)),
  { loading: () => <LabRuntimeLoading /> }
);

/**
 * Signature labs (canvas benches ported from the Claude Math Visual library).
 * Each bench is ~50KB and is loaded on its own chunk, so a student downloads
 * only the lab they open. `createSignatureLab` supplies the host contracts the
 * benches don't implement themselves — see SignatureLabAdapter.
 */
const SignatureLabRoutes = {
  AbsoluteValueLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/AbsoluteValueLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  AddLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/AddLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  AngleLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/AngleLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  AngleTurnLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/AngleTurnLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ArcsinLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ArcsinLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  AreaLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/AreaLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ArrangementsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ArrangementsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  AssociativeAdditionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/AssociativeAdditionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  AssociativeMultiplicationLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/AssociativeMultiplicationLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  BestFitLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/BestFitLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  BoxPlotLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/BoxPlotLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CircleLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CircleLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CircleTheoremsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CircleTheoremsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CommutativeLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CommutativeLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CompareFunctionsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CompareFunctionsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ComparingLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ComparingLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CompassLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CompassLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ComplexPlaneLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ComplexPlaneLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ComposingShapesLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ComposingShapesLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ConditionalLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ConditionalLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ConeLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ConeLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CongruenceLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CongruenceLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CorrelationLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CorrelationLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CosecantFunctionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CosecantFunctionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CosineFunctionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CosineFunctionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CotangentFunctionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CotangentFunctionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CountingLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CountingLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CovariationLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CovariationLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CrossSectionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CrossSectionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CubeLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CubeLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  CylinderLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CylinderLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  DataLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/DataLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  DecimalArithmeticLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/DecimalArithmeticLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  DecimalLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/DecimalLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  DerivativeLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/DerivativeLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  DilationsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/DilationsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  DistanceLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/DistanceLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  DistributiveLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/DistributiveLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  DivisionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/DivisionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  EllipseLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/EllipseLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  EqualAreasLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/EqualAreasLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  EqualSharesLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/EqualSharesLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  EqualSignLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/EqualSignLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  EquationLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/EquationLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  EquivalentFractionsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/EquivalentFractionsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ExpectedValueLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ExpectedValueLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ExponentRulesLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ExponentRulesLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ExponentialFunctionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ExponentialFunctionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ExpressionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ExpressionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ExtraneousLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ExtraneousLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  FactorLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/FactorLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  FactoringQuadraticsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/FactoringQuadraticsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  FormulaLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/FormulaLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  FractionAdditionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/FractionAdditionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  FractionAsDivisionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/FractionAsDivisionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  FractionDivisionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/FractionDivisionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  FractionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/FractionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  FractionLinePlotLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/FractionLinePlotLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  FractionMultiplicationLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/FractionMultiplicationLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  FractionTimesWholeLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/FractionTimesWholeLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  FunctionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/FunctionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  GramsAndLitersLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/GramsAndLitersLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  GraphStoryLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/GraphStoryLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  GraphsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/GraphsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  GreatestCommonFactorLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/GreatestCommonFactorLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  HistogramLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/HistogramLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  HundredChartLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/HundredChartLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  HyperbolaLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/HyperbolaLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  InequalityLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/InequalityLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  IntegerLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/IntegerLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  IntegralLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/IntegralLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  IrrationalLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/IrrationalLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  LCMLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/LCMLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  LengthComparisonLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/LengthComparisonLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  LikeTermsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/LikeTermsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  LimitLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/LimitLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  LineFunctionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/LineFunctionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  LineParabolaLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/LineParabolaLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  LinePlotLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/LinePlotLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  LinesRaysSegmentsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/LinesRaysSegmentsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  LogarithmLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/LogarithmLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  LongDivisionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/LongDivisionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  LurkingVariableLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/LurkingVariableLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  MatrixLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/MatrixLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  MeanLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/MeanLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  MeasurementLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/MeasurementLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  MedianLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/MedianLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ModeLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ModeLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  MoneyLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/MoneyLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  MultiDigitMultiplicationLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/MultiDigitMultiplicationLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  MultiplesLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/MultiplesLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  MultiplicationLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/MultiplicationLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  MultiplicativeComparisonLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/MultiplicativeComparisonLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  NormalDistributionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/NormalDistributionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  NumberBondLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/NumberBondLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  NumberLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/NumberLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  OddEvenLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/OddEvenLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  OperationsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/OperationsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  OptimizationLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/OptimizationLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ParabolaLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ParabolaLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ParallelogramLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ParallelogramLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PatternsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PatternsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PercentChangeLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PercentChangeLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PercentageLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PercentageLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PerpSlopeLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PerpSlopeLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PiLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PiLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PiecewiseLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PiecewiseLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PlaceValueStrategiesLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PlaceValueStrategiesLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PointLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PointLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PolynomialArithmeticLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PolynomialArithmeticLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PolynomialFunctionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PolynomialFunctionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PositionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PositionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PowersOfTenLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PowersOfTenLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PrimeFactorizationLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PrimeFactorizationLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PrimeNumbersLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PrimeNumbersLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ProbabilityLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ProbabilityLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ProofChainLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ProofChainLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ProportionalLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ProportionalLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PyramidLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PyramidLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PythagorasLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PythagorasLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  PythagoreanIdentityLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PythagoreanIdentityLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  QuadraticEquationLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/QuadraticEquationLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  QuadraticFunctionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/QuadraticFunctionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  QuadraticPolynomialLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/QuadraticPolynomialLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  QuadrilateralLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/QuadrilateralLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  RatioLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/RatioLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  RationalExponentLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/RationalExponentLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  RationalFunctionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/RationalFunctionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  RationalNumbersLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/RationalNumbersLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  RectangleLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/RectangleLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  RectangularPrismLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/RectangularPrismLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  RegroupingSubtractionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/RegroupingSubtractionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  RemainderTheoremLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/RemainderTheoremLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  RevolutionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/RevolutionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  RootsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/RootsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  RoundingLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/RoundingLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SamplingDistributionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SamplingDistributionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SamplingLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SamplingLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ScaleDrawingLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ScaleDrawingLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ScalingLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ScalingLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ScatterPlotLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ScatterPlotLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ScientificNotationLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ScientificNotationLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SecantFunctionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SecantFunctionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SequencesLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SequencesLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SeriesLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SeriesLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SetTheoryLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SetTheoryLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  ShapesLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ShapesLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SignedAdditionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SignedAdditionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SignedNumbersLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SignedNumbersLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SineFunctionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SineFunctionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SortLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SortLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SphereLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SphereLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  StandardDeviationLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/StandardDeviationLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  StatisticalQuestionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/StatisticalQuestionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SubstitutionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SubstitutionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SubtractionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SubtractionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SymmetryLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SymmetryLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  SystemsOfEquationsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/SystemsOfEquationsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TableLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TableLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TangentFunctionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TangentFunctionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TeenNumbersLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TeenNumbersLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TimeLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TimeLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TransformationsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TransformationsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TranslateLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TranslateLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TransversalLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TransversalLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TrapezoidLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TrapezoidLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TreeDiagramLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TreeDiagramLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TriangleBuildLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TriangleBuildLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TriangleLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TriangleLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TriangleSolveLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TriangleSolveLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TrigRatioLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TrigRatioLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TwoDigitNumberLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TwoDigitNumberLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TwoDistributionsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TwoDistributionsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TwoStepLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TwoStepLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  TwoVariableInequalityLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/TwoVariableInequalityLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  UndoLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/UndoLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  UnitCircleLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/UnitCircleLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  UnitConversionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/UnitConversionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  UnitFractionDivisionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/UnitFractionDivisionLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  UnlikeDenominatorsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/UnlikeDenominatorsLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  VariableLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/VariableLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  VarianceLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/VarianceLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  VectorLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/VectorLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
  VolumeLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/VolumeLab")
      ]).then(([adapter, lab]) => createRuntimeReadyLabComponent(adapter.createSignatureLab(lab.default))),
    { loading: () => <LabRuntimeLoading /> }
  ),
} satisfies Record<SignatureLabId, ComponentType<LabComponentProps>>;

const labComponentRegistry: Record<VisualizationLabModuleId, ComponentType<LabComponentProps>> = {
  "configured-visualization-lab": ConfiguredVisualizationLab,
  // Resolved per-lab in componentForDirectoryLab; this entry is the safe
  // fallback if a lab is marked signature-lab without a curated assignment.
  "signature-lab": ConfiguredVisualizationLab
};

function componentForDirectoryLab(lab: FeaturedLabDefinition | null) {
  if (!lab) return null;
  if (lab.moduleId === "signature-lab") {
    const assignment = getSignatureLabAssignment(lab.topicId);
    // Unknown/unported bench falls back to the template renderer rather than
    // rendering nothing.
    if (assignment) return SignatureLabRoutes[assignment.primary] ?? ConfiguredVisualizationLab;
  }
  return labComponentRegistry[lab.moduleId] ?? ConfiguredVisualizationLab;
}

/** "ExponentialFunctionLab" -> "Exponential Function" for a switcher chip. */
function signatureBenchLabel(id: SignatureLabId): string {
  return id
    .replace(/Lab$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

/**
 * Renders a signature lab and, when its topic's assignment fans out to several
 * benches, a chip row that switches between them. The `primary` renders by
 * default; every `related` bench is reachable here — this is what makes the
 * fan-out mapping user-facing rather than data-only (see
 * `data/signatureLabAssignments.ts`). Switching is keyed, so the bench remounts
 * and the runtime-ready probe + analytics re-fire, exactly as on first open.
 */
function SignatureBenchSwitcher({
  assignment,
  lab,
  topicId,
  labId,
  onRuntimeReady
}: {
  assignment: NonNullable<ReturnType<typeof getSignatureLabAssignment>>;
  lab: FeaturedLabDefinition;
  topicId: string;
  labId?: string;
  onRuntimeReady?: (labId: string) => void;
}) {
  const benchIds = useMemo<SignatureLabId[]>(
    () => [assignment.primary, ...(assignment.related ?? [])],
    [assignment]
  );
  const [activeBenchId, setActiveBenchId] = useState<SignatureLabId>(assignment.primary);

  // Reset to the primary whenever the topic (and thus the assignment) changes.
  useEffect(() => {
    setActiveBenchId(assignment.primary);
  }, [assignment.primary, topicId]);

  const BenchComponent = SignatureLabRoutes[activeBenchId] ?? SignatureLabRoutes[assignment.primary];

  return (
    <div data-viz-signature-switcher>
      {benchIds.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Related labs for this topic">
          {benchIds.map((benchId) => {
            const isActive = benchId === activeBenchId;
            return (
              <button
                key={benchId}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveBenchId(benchId)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-black transition ${
                  isActive
                    ? "border-cyan-500 bg-cyan-500 text-white shadow"
                    : "border-slate-300 bg-white text-slate-600 hover:border-cyan-300 hover:text-slate-900 dark:border-slate-100/20 dark:bg-transparent dark:text-slate-200"
                }`}
              >
                {signatureBenchLabel(benchId)}
                {benchId === assignment.primary ? <span className="ml-1.5 opacity-70">· primary</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      <BenchComponent key={activeBenchId} lab={lab} topicId={topicId} labId={labId} onRuntimeReady={onRuntimeReady} />
    </div>
  );
}

const trackFilterOptions: VisualizationTrackFilter[] = ["all", "HK", "US", "MAINLAND_PEP_PRIMARY", "MAINLAND_PEP_JUNIOR", "MAINLAND_PEP_HIGH", "MAINLAND_HJB", "MAINLAND_BNU", "CAPSTONE"];
const mainlandPepVisualizationTracks: readonly VisualizationCurriculumTrack[] = ["MAINLAND_PEP_PRIMARY", "MAINLAND_PEP_JUNIOR", "MAINLAND_PEP_HIGH"];
const hongKongPublishers = new Set<TextbookPublisher>(["HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY", "HK_UNITED_PRIME_MIA", "HK_EPH_MIF"]);
const unitedStatesPublishers = new Set<TextbookPublisher>(["US_CA_MATH", "US_NC_MATH", "US_AR_MATH", "US_FL_MATH"]);
const unitedStatesCurriculumTracks = new Set<CurriculumTrack>(["US_CA_MATH", "US_NC_MATH", "US_AR_MATH", "US_FL_MATH"]);

const labTileThemes = [
  {
    accent: "from-emerald-500 to-teal-400",
    bar: "bg-emerald-500",
    glass: "from-emerald-200/95 via-teal-100/80 to-white/50 dark:from-emerald-300/30 dark:via-teal-200/20 dark:to-white/10",
    glyph: "text-emerald-950 dark:text-emerald-50",
    ribbon: "from-emerald-500 to-teal-400",
    hover: "hover:border-emerald-300 hover:shadow-emerald-500/15",
    active: "ring-emerald-500/25"
  },
  {
    accent: "from-orange-500 to-rose-400",
    bar: "bg-orange-500",
    glass: "from-orange-200/95 via-rose-100/80 to-white/50 dark:from-orange-300/30 dark:via-rose-200/20 dark:to-white/10",
    glyph: "text-orange-950 dark:text-orange-50",
    ribbon: "from-orange-500 to-rose-400",
    hover: "hover:border-orange-300 hover:shadow-orange-500/15",
    active: "ring-orange-500/25"
  },
  {
    accent: "from-sky-500 to-cyan-400",
    bar: "bg-sky-500",
    glass: "from-sky-200/95 via-cyan-100/80 to-white/50 dark:from-sky-300/30 dark:via-cyan-200/20 dark:to-white/10",
    glyph: "text-sky-950 dark:text-sky-50",
    ribbon: "from-sky-500 to-cyan-400",
    hover: "hover:border-sky-300 hover:shadow-sky-500/15",
    active: "ring-sky-500/25"
  },
  {
    accent: "from-violet-500 to-fuchsia-400",
    bar: "bg-violet-500",
    glass: "from-violet-200/95 via-fuchsia-100/80 to-white/50 dark:from-violet-300/30 dark:via-fuchsia-200/20 dark:to-white/10",
    glyph: "text-violet-950 dark:text-violet-50",
    ribbon: "from-violet-500 to-fuchsia-400",
    hover: "hover:border-violet-300 hover:shadow-violet-500/15",
    active: "ring-violet-500/25"
  },
  {
    accent: "from-amber-500 to-yellow-400",
    bar: "bg-amber-500",
    glass: "from-amber-200/95 via-yellow-100/80 to-white/50 dark:from-amber-300/30 dark:via-yellow-200/20 dark:to-white/10",
    glyph: "text-amber-950 dark:text-amber-50",
    ribbon: "from-amber-500 to-yellow-400",
    hover: "hover:border-amber-300 hover:shadow-amber-500/15",
    active: "ring-amber-500/25"
  },
  {
    accent: "from-teal-500 to-cyan-400",
    bar: "bg-teal-500",
    glass: "from-teal-200/95 via-cyan-100/80 to-white/50 dark:from-teal-300/30 dark:via-cyan-200/20 dark:to-white/10",
    glyph: "text-teal-950 dark:text-teal-50",
    ribbon: "from-teal-500 to-cyan-400",
    hover: "hover:border-teal-300 hover:shadow-teal-500/15",
    active: "ring-teal-500/25"
  },
  {
    accent: "from-rose-500 to-red-400",
    bar: "bg-rose-500",
    glass: "from-rose-200/95 via-red-100/80 to-white/50 dark:from-rose-300/30 dark:via-red-200/20 dark:to-white/10",
    glyph: "text-rose-950 dark:text-rose-50",
    ribbon: "from-rose-500 to-red-400",
    hover: "hover:border-rose-300 hover:shadow-rose-500/15",
    active: "ring-rose-500/25"
  },
  {
    accent: "from-blue-500 to-indigo-400",
    bar: "bg-blue-500",
    glass: "from-blue-200/95 via-indigo-100/80 to-white/50 dark:from-blue-300/30 dark:via-indigo-200/20 dark:to-white/10",
    glyph: "text-blue-950 dark:text-blue-50",
    ribbon: "from-blue-500 to-indigo-400",
    hover: "hover:border-blue-300 hover:shadow-blue-500/15",
    active: "ring-blue-500/25"
  }
] as const;

const snapshotControlSampleLimit = 24;

function isVisualizationTrackFilter(value: string | null): value is VisualizationTrackFilter {
  return trackFilterOptions.includes(value as VisualizationTrackFilter);
}

function isGradeId(value: string | null, groups: GradeLabGroupDefinition[]): value is GradeId {
  return groups.some((group) => group.grade === value);
}

function filterVisualizationLabsByTrackForPage(labs: FeaturedLabDefinition[], track: VisualizationTrackFilter) {
  if (track === "all") return labs;
  return labs.filter((lab) => lab.curriculumTrack === track);
}

function filterGradeLabGroups(groups: GradeLabGroupDefinition[], track: VisualizationTrackFilter) {
  return groups
    .map((group) => ({
      ...group,
      labs: filterVisualizationLabsByTrackForPage(group.labs, track)
    }))
    .filter((group) => group.labs.length > 0);
}

function findGroupForLab(groups: GradeLabGroupDefinition[], labId: string | null | undefined) {
  if (!labId) return null;
  return groups.find((group) => group.labs.some((lab) => lab.labId === labId)) ?? null;
}

function isMainlandPepVisualizationTrack(track: VisualizationCurriculumTrack) {
  return mainlandPepVisualizationTracks.includes(track);
}

function isUnitedStatesMathUser(currentUser: StudentSession) {
  return currentUser.curriculumProfile.region === "US" ||
    unitedStatesPublishers.has(currentUser.curriculumProfile.publisher) ||
    unitedStatesCurriculumTracks.has(currentUser.curriculumTrack);
}

function labMatchesLearnerCurriculum(lab: FeaturedLabDefinition, currentUser: StudentSession | null) {
  if (!currentUser) return true;

  const publisher = currentUser.curriculumProfile.publisher;
  if (isUnitedStatesMathUser(currentUser)) return lab.curriculumTrack === "US" && lab.publisher === publisher;
  if (lab.curriculumTrack === "CAPSTONE" && lab.threeD?.premiumLaunch) return true;

  if (publisher === "MAINLAND_PEP") return isMainlandPepVisualizationTrack(lab.curriculumTrack);
  if (publisher === "MAINLAND_HJB") return lab.curriculumTrack === "MAINLAND_HJB";
  if (publisher === "MAINLAND_BNU") return lab.curriculumTrack === "MAINLAND_BNU";
  if (hongKongPublishers.has(publisher)) return lab.curriculumTrack === "HK";

  return false;
}

function scopeGradeLabGroupsForLearner(groups: GradeLabGroupDefinition[], currentUser: StudentSession | null) {
  return groups
    .map((group) => ({
      ...group,
      labs: group.labs.filter((lab) => labMatchesLearnerCurriculum(lab, currentUser))
    }))
    .filter((group) => group.labs.length > 0);
}

function labAllowsExternalDistribution(lab: FeaturedLabDefinition | null) {
  if (!lab?.safeguard) return true;
  return lab.safeguard.status === "approved";
}

function getVisualizationLabRouteLocation(): VisualizationLabRouteLocation {
  if (typeof window === "undefined") return { pathname: "", search: "" };
  return {
    pathname: window.location.pathname,
    search: window.location.search
  };
}

function getInitialVisualizationLabRequestedLabId(initialLabId: string | null | undefined, location: VisualizationLabRouteLocation) {
  const params = new URLSearchParams(location.search);
  return params.get("lab") ?? initialLabId ?? null;
}

function buildInitialVisualizationLabRouteState({
  activeGroupGrade,
  currentUser,
  getVisualizationLabByLabId,
  gradeLabGroups,
  initialGrade,
  initialLabId,
  location
}: {
  activeGroupGrade: GradeId;
  currentUser: StudentSession | null;
  getVisualizationLabByLabId: VisualizationCatalogState["getVisualizationLabByLabId"];
  gradeLabGroups: GradeLabGroupDefinition[];
  initialGrade: GradeId | null;
  initialLabId: string | null;
  location: VisualizationLabRouteLocation;
}): VisualizationLabInitialRouteState {
  const params = new URLSearchParams(location.search);
  const queryLabId = params.get("lab") ?? initialLabId;
  const requestedTrackParam = params.get("track");
  const requestedTrack = !currentUser && isVisualizationTrackFilter(requestedTrackParam)
    ? requestedTrackParam
    : "all";
  const requestedGradeParam = params.get("grade");
  const requestedGrade = isGradeId(requestedGradeParam, gradeLabGroups) ? requestedGradeParam : initialGrade;
  const curriculumScopedGroups = scopeGradeLabGroupsForLearner(gradeLabGroups, currentUser);
  const groupsForRequestedTrack = filterGradeLabGroups(curriculumScopedGroups, requestedTrack);
  const labGroup = findGroupForLab(groupsForRequestedTrack, queryLabId);
  const linkedCatalogLab = getVisualizationLabByLabId(queryLabId);
  const fallbackGradeGroup =
    (requestedGrade ? groupsForRequestedTrack.find((group) => group.grade === requestedGrade) : null) ??
    (linkedCatalogLab ? groupsForRequestedTrack.find((group) => group.grade === linkedCatalogLab.grade) : null) ??
    groupsForRequestedTrack.find((group) => group.grade === activeGroupGrade) ??
    groupsForRequestedTrack[0] ??
    null;
  const nextGrade = labGroup?.grade ?? fallbackGradeGroup?.grade ?? activeGroupGrade;
  const nextGroup = groupsForRequestedTrack.find((group) => group.grade === nextGrade) ?? fallbackGradeGroup;
  const queryLabIsAvailable = Boolean(queryLabId && labGroup);
  const directLinkStatus: DirectLinkStatus = !queryLabId
    ? "idle"
    : queryLabIsAvailable
      ? "ok"
      : linkedCatalogLab
        ? "unavailable"
        : "missing";

  return {
    activeDirectoryGrade: nextGrade,
    activeLabId: queryLabIsAvailable ? queryLabId : nextGroup?.labs[0]?.labId ?? null,
    directLinkStatus,
    panelMode: queryLabIsAvailable ? "lab" : "control",
    requestedLabId: queryLabId,
    trackFilter: requestedTrack
  };
}

function compactTitle(title: string) {
  return title
    .replace(/实验|實驗|探索|可视化|視覺化/g, "")
    .replace(/\b(?:Visualization|Visual)\s+Lab\b/gi, "")
    .replace(/\bLab\b$/gi, "")
    .replace(/\s+/g, " ")
    .trim() || title;
}

function compactSnapshotText(value: string | null | undefined, limit = 120) {
  const compacted = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!compacted) return null;
  return compacted.length > limit ? `${compacted.slice(0, limit)}...` : compacted;
}

function getSnapshotControlLabel(element: Element) {
  return compactSnapshotText(
    element.getAttribute("aria-label") ??
      element.getAttribute("title") ??
      element.getAttribute("name") ??
      element.textContent,
    96
  );
}

function buildSnapshotRangeIssue(range: { index: number; max: string | null; min: string | null; value: string | null }) {
  const value = Number(range.value);
  const min = Number(range.min);
  const max = Number(range.max);
  const issues: string[] = [];

  if (!Number.isFinite(value)) issues.push(`range-${range.index}-value-not-finite`);
  if (!Number.isFinite(min)) issues.push(`range-${range.index}-min-not-finite`);
  if (!Number.isFinite(max)) issues.push(`range-${range.index}-max-not-finite`);
  if (Number.isFinite(min) && Number.isFinite(max) && min > max) issues.push(`range-${range.index}-min-greater-than-max`);
  if (Number.isFinite(value) && Number.isFinite(min) && value < min - 1e-9) issues.push(`range-${range.index}-value-below-min`);
  if (Number.isFinite(value) && Number.isFinite(max) && value > max + 1e-9) issues.push(`range-${range.index}-value-above-max`);

  return issues;
}

async function writeTextToClipboard(text: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    if (window.navigator.clipboard?.writeText) {
      await window.navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back below when browser policy denies the async Clipboard API.
  }

  if (!document.body || typeof document.execCommand !== "function") return false;

  const textArea = document.createElement("textarea");
  const selection = document.getSelection();
  const selectedRanges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
    : [];

  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);

  try {
    textArea.focus({ preventScroll: true });
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textArea.remove();
    if (selection) {
      selection.removeAllRanges();
      selectedRanges.forEach((range) => selection.addRange(range));
    }
  }
}

function labTitleSizeClass(title: string) {
  const length = Array.from(title).length;
  const hasChinese = /[\u3400-\u9fff]/.test(title);

  if (hasChinese && length > 11) return "text-[1rem] leading-[1.18]";
  if (!hasChinese && length > 32) return "text-[0.95rem] leading-[1.15]";
  if (!hasChinese && length > 22) return "text-base leading-[1.18]";
  return "text-lg leading-tight";
}

function labTileGlyphForLab(lab: FeaturedLabDefinition, index: number) {
  return kindergartenCaliforniaLogoGlyphs[lab.labId] ?? templateLogoGlyphs[lab.templateId] ?? fallbackLogoGlyphs[index % fallbackLogoGlyphs.length];
}

function LabRuntimeLoading() {
  return (
    <div
      className="grid min-h-[28rem] place-items-center rounded-2xl border border-cyan-200 bg-cyan-50/70 p-6 text-center text-sm font-black text-cyan-800 shadow-inner"
      data-viz-lab-runtime-loading
    >
      Loading lab runtime...
    </div>
  );
}

function LiquidGlassLabLogo({
  className,
  glyph,
  theme
}: {
  className?: string;
  glyph: string;
  theme: (typeof labTileThemes)[number];
}) {
  return (
    <span
      aria-hidden="true"
      data-viz-lab-logo-glyph={glyph}
      className={cn(
        "relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.45rem] border border-white/70 bg-white/45 shadow-[0_18px_35px_-18px_rgba(15,23,42,0.65)] ring-1 ring-white/75 transition duration-200 group-hover:scale-[1.03] dark:border-white/15 dark:bg-white/10 dark:ring-white/10",
        className
      )}
    >
      <span className={cn("absolute inset-0 bg-gradient-to-br", theme.glass)} />
      <span className="absolute inset-[7px] rounded-[1.08rem] border border-white/60 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-18px_30px_rgba(255,255,255,0.18)] dark:border-white/20 dark:bg-white/10" />
      <span className="absolute left-3 right-5 top-2.5 h-4 rounded-full bg-white/70 blur-sm dark:bg-white/30" />
      {labLogoArtByGlyph[glyph] ? (
        <span className="relative z-10 grid place-items-center drop-shadow-[0_8px_10px_rgba(15,23,42,0.18)] transition duration-200 group-hover:-rotate-3">
          {labLogoArtByGlyph[glyph]}
        </span>
      ) : (
        <span className={cn("relative z-10 font-black leading-none tracking-normal drop-shadow-[0_1px_1px_rgba(255,255,255,0.65)]", glyph.length > 4 ? "text-[0.95rem]" : glyph.length > 2 ? "text-[1.15rem]" : "text-[1.55rem]", theme.glyph)}>
        {glyph}
      </span>
      )}
    </span>
  );
}

function LabQuestMap({
  href,
  language,
  onNodeClick,
  recommendedLabId
}: {
  href: string;
  language: string;
  onNodeClick: () => void;
  recommendedLabId: string;
}) {
  const isEnglish = language === "en";
  const mapImage = isEnglish ? labQuestIslandMapEn : labQuestIslandMap;

  return (
    <a
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        onNodeClick();
      }}
      data-viz-lab-quest-map-link
      data-viz-recommended-lab-id={recommendedLabId}
      className="focus-ring group/map absolute inset-0 block overflow-hidden"
      aria-label={isEnglish ? "Open recommended lab" : "打开推荐实验"}
    >
      <img
        src={mapImage.src}
        alt={isEnglish ? "Math lab quest island map" : "数学实验岛地图"}
        className="h-full w-full object-cover object-[70%_38%] transition duration-500 group-hover/map:scale-[1.03]"
        decoding="async"
        fetchPriority="high"
      />
    </a>
  );
}

function GradeChip({
  active,
  grade,
  hasLabs,
  href,
  label,
  onClick
}: {
  active: boolean;
  grade: GradeId;
  hasLabs: boolean;
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <a
      href={hasLabs ? href : "#"}
      aria-pressed={active}
      aria-disabled={!hasLabs}
      onClick={(event) => {
        if (!hasLabs) {
          event.preventDefault();
          return;
        }
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        onClick();
      }}
      data-viz-grade-chip
      data-viz-grade-chip-active={String(active)}
      data-viz-grade-chip-grade={grade}
      data-viz-grade-chip-has-labs={String(hasLabs)}
      className={cn(
        "focus-ring inline-flex h-12 min-w-[3.4rem] items-center justify-center rounded-xl border-2 px-4 text-center text-base font-black leading-none transition",
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/30"
          : "border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-slate-200",
        hasLabs
          ? active
            ? "hover:-translate-y-0.5"
            : "hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
          : "cursor-not-allowed opacity-35"
      )}
    >
      {label}
    </a>
  );
}

function LabTile({
  active,
  exploredLabel,
  href,
  index,
  isExplored,
  lab,
  onOpen,
  readyLabel,
  recommended = false,
  recommendedLabel,
  title
}: {
  active: boolean;
  exploredLabel: string;
  href: string;
  index: number;
  isExplored: boolean;
  lab: FeaturedLabDefinition;
  onOpen: () => void;
  readyLabel: string;
  recommended?: boolean;
  recommendedLabel?: string;
  title: string;
}) {
  const theme = labTileThemes[index % labTileThemes.length];

  return (
    <a
      id={`lab-tile-${lab.labId}`}
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        onOpen();
      }}
      aria-current={active ? "page" : undefined}
      data-lab-id={lab.labId}
      data-viz-lab-tile
      {...(recommended ? { "data-viz-recommended-lab-link": true, "data-viz-recommended-lab-id": lab.labId } : {})}
      className={cn(
        "focus-ring group relative flex min-h-[13.5rem] flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-4 pt-6 text-center shadow-sm shadow-slate-900/5 transition duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-slate-950/80 dark:shadow-black/20",
        theme.hover,
        active ? cn("ring-4", theme.active) : "",
        recommended ? "border-amber-300 dark:border-amber-400/50" : ""
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", theme.accent)} />
      {recommended && recommendedLabel ? (
        <span className="absolute right-2.5 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[0.68rem] font-black leading-none text-amber-950 shadow-md shadow-amber-500/30">
          <span aria-hidden="true">★</span>
          {recommendedLabel}
        </span>
      ) : null}
      <LiquidGlassLabLogo glyph={labTileGlyphForLab(lab, index)} theme={theme} className="mx-auto" />
      <span className="mt-4 grid min-h-[5.2rem] min-w-0 flex-1 items-center">
        <span
          lang={/^[\x00-\x7F\s'-]+$/.test(title) ? "en" : undefined}
          title={title}
          className={cn(
            "line-clamp-4 block min-w-0 overflow-hidden break-words font-black text-slate-950 [hyphens:auto] [overflow-wrap:anywhere] dark:text-white",
            labTitleSizeClass(title)
          )}
        >
          {title}
        </span>
      </span>
      <span
        className={cn(
          "mx-auto mt-3 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black leading-none",
          isExplored
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
            : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
        )}
      >
        <span aria-hidden="true">{isExplored ? "✓" : "▶"}</span>
        {isExplored ? exploredLabel : readyLabel}
      </span>
      <span className="sr-only">{lab.labId}</span>
    </a>
  );
}

export function VisualizationLabPage(props: VisualizationLabPageProps = {}) {
  const { onRouteShellReady } = props;
  const [catalog, setCatalog] = useState<VisualizationCatalogState | null>(null);
  const [catalogLoadFailed, setCatalogLoadFailed] = useState(false);
  const loadingWorkspaceLabId = getInitialVisualizationLabRequestedLabId(props.initialLabId, getVisualizationLabRouteLocation());
  const loadingWorkspaceSectionId = props.suppressLoadingWorkspaceSelector ? null : loadingWorkspaceLabId;

  useLayoutEffect(() => {
    if (!catalog) return;
    onRouteShellReady?.();
  }, [catalog, onRouteShellReady]);

  useEffect(() => {
    let mounted = true;

    import("@/data/visualizationLabs")
      .then((module) => {
        if (!mounted) return;
        setCatalog({
          getVisualizationLabByLabId: module.getVisualizationLabByLabId,
          gradeLabGroups: module.gradeLabGroups,
          visualizationLabCount: module.visualizationLabCount,
          visualizationTrackLabels: module.visualizationTrackLabels
        });
      })
      .catch(() => {
        if (mounted) setCatalogLoadFailed(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!catalog) {
    return (
      <section
        id={loadingWorkspaceSectionId ? `lab-example-${loadingWorkspaceSectionId}` : undefined}
        aria-label="Visualization Lab workspace"
        data-viz-catalog-deferred
        data-viz-catalog-load-status={catalogLoadFailed ? "error" : "loading"}
        data-viz-panel-mode="loading"
        data-viz-requested-lab-id={loadingWorkspaceLabId ?? ""}
      >
        <VisualizationLabLoading />
      </section>
    );
  }

  return <VisualizationLabPageContent {...props} catalog={catalog} />;
}

function VisualizationLabPageContent({
  catalog,
  initialGrade = null,
  initialLabId = null
}: VisualizationLabPageProps & { catalog: VisualizationCatalogState }) {
  const { currentUser, language, recordLearningEvent, selectedGrade, t, text } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);
  const { getVisualizationLabByLabId, gradeLabGroups, visualizationTrackLabels } = catalog;
  const currentUserGrade = selectedGrade;
  const baseActiveGroup = gradeLabGroups.find((group) => group.grade === currentUserGrade) ?? gradeLabGroups[0];
  const initialRouteState = buildInitialVisualizationLabRouteState({
    activeGroupGrade: baseActiveGroup.grade,
    currentUser,
    getVisualizationLabByLabId,
    gradeLabGroups,
    initialGrade,
    initialLabId,
    location: getVisualizationLabRouteLocation()
  });
  const [panelMode, setPanelMode] = useState<PanelMode>(initialRouteState.panelMode);
  const [trackFilter, setTrackFilter] = useState<VisualizationTrackFilter>(initialRouteState.trackFilter);
  const [activeDirectoryGrade, setActiveDirectoryGrade] = useState<GradeId | null>(initialRouteState.activeDirectoryGrade);
  const [activeLabId, setActiveLabId] = useState<string | null>(initialRouteState.activeLabId);
  const [directLinkStatus, setDirectLinkStatus] = useState<DirectLinkStatus>(initialRouteState.directLinkStatus);
  const [exploredSessionIds, setExploredSessionIds] = useState<Set<string>>(() => new Set());
  const [requestedLabId, setRequestedLabId] = useState<string | null>(initialRouteState.requestedLabId);
  const [shareState, setShareState] = useState<ShareState>("idle");
  const [snapshotState, setSnapshotState] = useState<SnapshotState>("idle");
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeLabRuntimeReadyId, setActiveLabRuntimeReadyId] = useState<string | null>(null);

  const effectiveTrackFilter: VisualizationTrackFilter = currentUser ? "all" : trackFilter;
  const curriculumScopedGroups = useMemo(() => {
    return scopeGradeLabGroupsForLearner(gradeLabGroups, currentUser);
  }, [currentUser, gradeLabGroups]);
  const activeGroup = curriculumScopedGroups.find((group) => group.grade === currentUserGrade) ?? { ...baseActiveGroup, labs: [] };
  const directoryGroups = useMemo(() => filterGradeLabGroups(curriculumScopedGroups, effectiveTrackFilter), [curriculumScopedGroups, effectiveTrackFilter]);
  const activeDirectoryGroup = useMemo(() => {
    return (
      directoryGroups.find((group) => group.grade === activeDirectoryGrade) ??
      directoryGroups.find((group) => group.grade === activeGroup.grade) ??
      directoryGroups[0] ??
      null
    );
  }, [activeDirectoryGrade, activeGroup.grade, directoryGroups]);
  const visibleLabs = activeDirectoryGroup?.labs ?? [];
  const activeDirectoryLab = useMemo(() => {
    return activeDirectoryGroup?.labs.find((lab) => lab.labId === activeLabId) ?? activeDirectoryGroup?.labs[0] ?? null;
  }, [activeDirectoryGroup, activeLabId]);
  const recommendedLab = visibleLabs[1] ?? activeDirectoryLab ?? visibleLabs[0] ?? null;
  const currentCurriculumLabel = currentUser ? text(publisherLabels[currentUser.curriculumProfile.publisher]) : null;
  const useUnitedStatesGradeLabels = currentUser
    ? currentUser.curriculumProfile.region === "US" ||
      unitedStatesPublishers.has(currentUser.curriculumProfile.publisher) ||
      unitedStatesCurriculumTracks.has(currentUser.curriculumTrack)
    : effectiveTrackFilter === "US";
  const activeGradeLabel = activeDirectoryGroup
    ? displayGradeLabel(activeDirectoryGroup.grade)
    : displayGradeLabel(activeGroup.grade);
  const ActiveDirectoryLabComponent = componentForDirectoryLab(activeDirectoryLab);
  // When the active lab is a signature bench whose topic fans out to related
  // benches, render the switcher so every related bench is reachable, not just
  // the primary. Falls back to the plain component otherwise.
  const activeSignatureAssignment =
    activeDirectoryLab?.moduleId === "signature-lab"
      ? getSignatureLabAssignment(activeDirectoryLab.topicId)
      : null;
  const activeHasRelatedBenches = (activeSignatureAssignment?.related?.length ?? 0) > 0;
  const activeDirectorySessionModuleId = activeDirectoryLab ? buildVisualizationSessionModuleId(activeDirectoryLab) : null;
  const activeDirectoryLabHref = activeDirectoryLab ? buildVisualizationLabHref(activeDirectoryLab, effectiveTrackFilter) : null;
  const activeLabCanDistribute = labAllowsExternalDistribution(activeDirectoryLab);
  const activeLabSafeguardStatus = activeDirectoryLab?.safeguard?.status ?? "none";
  const recommendedLabHref = recommendedLab
    ? buildVisualizationLabHref(recommendedLab, effectiveTrackFilter)
    : buildControlPanelHref({
        grade: activeDirectoryGroup?.grade ?? activeGroup.grade,
        track: effectiveTrackFilter
      });
  const activeDirectoryControlPanelHref = buildControlPanelHref({
    grade: activeDirectoryLab?.grade ?? activeDirectoryGroup?.grade ?? activeGroup.grade,
    track: effectiveTrackFilter
  });
  const activePracticeHref = activeDirectoryLab
    ? buildVisualizationPracticeHref(activeDirectoryLab)
    : "/practice";
  const workspaceSectionLabId = panelMode === "lab"
    ? requestedLabId ?? activeDirectoryLab?.labId ?? activeLabId
    : activeDirectoryLab?.labId ?? activeLabId;
  const visiblePanelMode = panelMode === "lab" && activeDirectoryLab?.labId !== activeLabRuntimeReadyId
    ? "loading"
    : panelMode;

  const handleActiveLabRuntimeReady = useCallback((labId: string) => {
    setActiveLabRuntimeReadyId(labId);
  }, []);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    function openLabFromLocation() {
      const params = new URLSearchParams(window.location.search);
      const queryLabId = params.get("lab") ?? initialLabId;
      const requestedTrack = !currentUser && isVisualizationTrackFilter(params.get("track")) ? params.get("track") as VisualizationTrackFilter : "all";
      const groupsForRequestedTrack = filterGradeLabGroups(curriculumScopedGroups, requestedTrack);
      const labGroup = findGroupForLab(groupsForRequestedTrack, queryLabId);
      const requestedGrade = isGradeId(params.get("grade"), gradeLabGroups) ? params.get("grade") : initialGrade;
      const linkedCatalogLab = getVisualizationLabByLabId(queryLabId);
      const fallbackGradeGroup =
        (requestedGrade ? groupsForRequestedTrack.find((group) => group.grade === requestedGrade) : null) ??
        (linkedCatalogLab ? groupsForRequestedTrack.find((group) => group.grade === linkedCatalogLab.grade) : null) ??
        groupsForRequestedTrack.find((group) => group.grade === activeGroup.grade) ??
        groupsForRequestedTrack[0] ??
        null;
      const nextGrade = labGroup?.grade ?? fallbackGradeGroup?.grade ?? activeGroup.grade;
      const nextGroup = groupsForRequestedTrack.find((group) => group.grade === nextGrade) ?? fallbackGradeGroup;
      const queryLabIsAvailable = Boolean(queryLabId && labGroup);
      const nextLinkStatus: DirectLinkStatus = !queryLabId
        ? "idle"
        : queryLabIsAvailable
          ? "ok"
          : linkedCatalogLab
            ? "unavailable"
            : "missing";
      const nextLab = queryLabIsAvailable ? queryLabId : nextGroup?.labs[0]?.labId ?? null;

      const isTopicPageEntry = Boolean(initialLabId && window.location.pathname.startsWith(`${studentVisualizationToolsPath}/`));

      if (queryLabIsAvailable && labGroup && queryLabId && !isTopicPageEntry) {
        const canonicalParams = new URLSearchParams();
        canonicalParams.set("grade", labGroup.grade);
        if (!currentUser) canonicalParams.set("track", requestedTrack);
        canonicalParams.set("lab", queryLabId);
        const canonicalPath = `${studentVisualizationToolsPath}?${canonicalParams.toString()}`;
        if (`${window.location.pathname}${window.location.search}` !== canonicalPath) {
          window.history.replaceState(null, "", canonicalPath);
        }
      }

      setTrackFilter(requestedTrack);
      setActiveDirectoryGrade(nextGrade);
      setActiveLabId(nextLab);
      setDirectLinkStatus(nextLinkStatus);
      setRequestedLabId(queryLabId);
      setPanelMode(queryLabIsAvailable ? "lab" : "control");
    }

    openLabFromLocation();
    window.addEventListener("popstate", openLabFromLocation);
    return () => {
      window.removeEventListener("popstate", openLabFromLocation);
    };
  }, [activeGroup.grade, currentUser, curriculumScopedGroups, initialGrade, initialLabId]);

  useEffect(() => {
    if (!activeDirectoryGroup) return;
    if (activeLabId && activeDirectoryGroup.labs.some((lab) => lab.labId === activeLabId)) return;
    const hasDirectLabRequest = typeof window !== "undefined" && (
      new URLSearchParams(window.location.search).has("lab") ||
      Boolean(initialLabId && window.location.pathname.startsWith(`${studentVisualizationToolsPath}/`))
    );
    if (hasDirectLabRequest) return;
    setActiveLabId(activeDirectoryGroup.labs[0]?.labId ?? null);
  }, [activeDirectoryGroup, activeLabId, initialLabId]);

  useEffect(() => {
    setShareState("idle");
    setSnapshotState("idle");
  }, [activeDirectoryLab?.labId]);

  useEffect(() => {
    let active = true;

    if (!currentUser) {
      setExploredSessionIds(new Set());
      return () => {
        active = false;
      };
    }

    async function loadExploredSessions() {
      try {
        const response = await fetch("/api/visualization-sessions", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load visualization sessions.");
        const payload = await response.json() as VisualizationSessionsResponse;
        const nextExploredIds = new Set(
          (payload.sessions ?? [])
            .filter((session) => (session.explored === true || session.explored === 1) && typeof session.moduleId === "string")
            .map((session) => session.moduleId as string)
        );
        if (active) setExploredSessionIds(nextExploredIds);
      } catch {
        if (active) setExploredSessionIds(new Set());
      }
    }

    void loadExploredSessions();
    return () => {
      active = false;
    };
  }, [currentUser]);

  function displayGradeLabel(grade: GradeId) {
    if (currentUser) return formatGradeLabelForCurriculum(grade, language, currentUser.curriculumTrack, true);
    if (useUnitedStatesGradeLabels) return formatUnitedStatesGradeLabel(grade, language, true);
    return formatGradeLabel(grade, language, true);
  }

  function displayGradeChipLabel(grade: GradeId) {
    return displayGradeLabel(grade);
  }

  function displayCatalogText(value: string) {
    return simplifyChineseText(value, language);
  }

  function displayLabGradeLabel(lab: FeaturedLabDefinition) {
    return currentCurriculumLabel
      ? `${displayGradeLabel(lab.grade)} ${currentCurriculumLabel}`
      : displayCatalogText(text(lab.gradeLabel));
  }

  function buildVisualizationHistoryHref(lab: FeaturedLabDefinition, track: VisualizationTrackFilter) {
    const directHref = buildVisualizationLabHref(lab, track);
    if (directHref.startsWith(`${studentVisualizationToolsPath}/`)) return directHref;

    const params = new URLSearchParams();
    params.set("grade", lab.grade);
    if (!currentUser) params.set("track", track);
    params.set("lab", lab.labId);
    return `${studentVisualizationToolsPath}?${params.toString()}`;
  }

  function replaceVisualizationUrl({
    grade,
    history = "replace",
    lab,
    mode,
    track
  }: {
    grade?: GradeId | null;
    history?: "push" | "replace";
    lab?: string | null;
    mode: PanelMode;
    track?: VisualizationTrackFilter;
  }) {
    if (typeof window === "undefined") return;

    if (mode === "lab" && lab) {
      const targetLab = getVisualizationLabByLabId(lab);
      if (targetLab) {
        const nextPath = buildVisualizationHistoryHref(targetLab, track ?? effectiveTrackFilter);
        if (`${window.location.pathname}${window.location.search}` === nextPath) return;
        window.history[history === "push" ? "pushState" : "replaceState"](null, "", nextPath);
        return;
      }
    }

    const params = new URLSearchParams();
    if (grade) params.set("grade", grade);
    if (!currentUser) params.set("track", track ?? effectiveTrackFilter);
    if (mode === "lab" && lab) params.set("lab", lab);

    const query = params.toString();
    const nextPath = `${studentVisualizationToolsPath}${query ? `?${query}` : ""}`;
    if (`${window.location.pathname}${window.location.search}` === nextPath) return;
    window.history[history === "push" ? "pushState" : "replaceState"](null, "", nextPath);
  }

  function buildControlPanelHref({
    grade,
    track
  }: {
    grade?: GradeId | null;
    track?: VisualizationTrackFilter;
  }) {
    const params = new URLSearchParams();
    if (grade) params.set("grade", grade);
    if (!currentUser) params.set("track", track ?? effectiveTrackFilter);
    const query = params.toString();
    return `${studentVisualizationToolsPath}${query ? `?${query}` : ""}`;
  }

  function focusPanel() {
    window.setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }, 40);
  }

  function recordVisualizationWorkflowEvent(lab: FeaturedLabDefinition | null, topicFallback = "visualization-lab") {
    recordLearningEvent({
      type: "visualization-probe",
      source: lab?.analyticsSource ?? "visualization-lab",
      topicId: lab?.topicId ?? topicFallback
    });
  }

  function selectDirectoryGrade(group: GradeLabGroupDefinition) {
    const nextLab = group.labs.find((lab) => lab.labId === activeLabId) ?? group.labs[0] ?? null;
    setPanelMode("control");
    setActiveDirectoryGrade(group.grade);
    setActiveLabId(nextLab?.labId ?? null);
    setDirectLinkStatus("idle");
    setRequestedLabId(null);
    replaceVisualizationUrl({
      grade: group.grade,
      lab: null,
      mode: "control",
      track: effectiveTrackFilter
    });
  }

  function selectDirectoryLab(lab: FeaturedLabDefinition) {
    recordVisualizationWorkflowEvent(lab);
    setPanelMode("lab");
    setActiveDirectoryGrade(lab.grade);
    setActiveLabId(lab.labId);
    setDirectLinkStatus("ok");
    setRequestedLabId(lab.labId);
    replaceVisualizationUrl({
      grade: lab.grade,
      history: "push",
      lab: lab.labId,
      mode: "lab",
      track: effectiveTrackFilter
    });
    focusPanel();
  }

  function returnToControlPanel() {
    recordVisualizationWorkflowEvent(activeDirectoryLab);
    setPanelMode("control");
    setDirectLinkStatus("idle");
    setRequestedLabId(null);
    replaceVisualizationUrl({
      grade: activeDirectoryGroup?.grade ?? activeGroup.grade,
      history: "push",
      lab: null,
      mode: "control",
      track: effectiveTrackFilter
    });
    focusPanel();
  }

  async function copyActiveLabLink() {
    if (!isHydrated || !activeDirectoryLab || !activeDirectoryLabHref || typeof window === "undefined") return;
    if (!activeLabCanDistribute) {
      setShareState("blocked");
      return;
    }

    const absoluteHref = new URL(activeDirectoryLabHref, window.location.origin).toString();
    recordVisualizationWorkflowEvent(activeDirectoryLab);

    try {
      setShareState(await writeTextToClipboard(absoluteHref) ? "copied" : "error");
    } catch {
      setShareState("error");
    }
  }

  async function copyActiveLabSnapshot() {
    if (!isHydrated || !activeDirectoryLab || !activeDirectoryLabHref || typeof window === "undefined") return;
    if (!activeLabCanDistribute) {
      setSnapshotState("blocked");
      return;
    }

    recordVisualizationWorkflowEvent(activeDirectoryLab);

    const labSection = document.getElementById(`lab-example-${activeDirectoryLab.labId}`);
    const visibleElements = (selector: string) => Array.from(labSection?.querySelectorAll(selector) ?? []).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || "1") > 0.01;
    });
    const textAndAttributes = labSection
      ? `${labSection.textContent ?? ""} ${Array.from(labSection.querySelectorAll("*"))
        .flatMap((element) => Array.from(element.attributes).map((attribute) => attribute.value))
        .join(" ")}`
      : "";
    const firstSurface = visibleElements("[data-viz-surface]")[0] ?? null;
    const firstSurfaceRect = firstSurface?.getBoundingClientRect();
    const visibleMarks = visibleElements("[data-viz-mark]");
    const visibleControls = visibleElements("button, a, input, select, textarea, [role='button'], [role='link'], [role='switch'], [role='checkbox']");
    const visibleRangeControls = visibleControls.filter((element): element is HTMLInputElement => element instanceof HTMLInputElement && element.type === "range");
    const markSamples = visibleMarks.slice(0, 12).map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        index,
        tagName: element.tagName.toLowerCase(),
        name: element.getAttribute("data-viz-name") ?? null,
        bounds: {
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        attributes: buildVisualizationSnapshotMarkSample(
          Array.from(element.attributes).map((attribute) => ({
            name: attribute.name,
            value: attribute.value
          }))
        )
      };
    });
    const normalizeControlHref = (rawHref: string | null) => {
      if (!rawHref) return null;
      try {
        return new URL(rawHref, window.location.origin).toString();
      } catch {
        return compactSnapshotText(rawHref, 160);
      }
    };
    const controlSamples = visibleControls.slice(0, snapshotControlSampleLimit).map((element, index) => {
      const rect = element.getBoundingClientRect();
      const inputElement = element instanceof HTMLInputElement ? element : null;
      const selectElement = element instanceof HTMLSelectElement ? element : null;
      const textAreaElement = element instanceof HTMLTextAreaElement ? element : null;
      const buttonElement = element instanceof HTMLButtonElement ? element : null;
      const anchorElement = element instanceof HTMLAnchorElement ? element : null;
      const formElement = inputElement ?? selectElement ?? textAreaElement;

      return {
        index,
        tagName: element.tagName.toLowerCase(),
        role: element.getAttribute("role") ?? (anchorElement ? "link" : buttonElement ? "button" : inputElement ? "input" : selectElement ? "select" : textAreaElement ? "textarea" : null),
        type: inputElement?.type ?? buttonElement?.type ?? null,
        label: getSnapshotControlLabel(element),
        value: formElement ? compactSnapshotText(formElement.value, 96) : null,
        checked: inputElement && (inputElement.type === "checkbox" || inputElement.type === "radio") ? inputElement.checked : null,
        disabled: formElement?.disabled ?? buttonElement?.disabled ?? (element.getAttribute("aria-disabled") === "true" ? true : null),
        ariaPressed: element.getAttribute("aria-pressed"),
        min: inputElement?.getAttribute("min") ?? null,
        max: inputElement?.getAttribute("max") ?? null,
        step: inputElement?.getAttribute("step") ?? null,
        href: normalizeControlHref(anchorElement?.getAttribute("href") ?? null),
        bounds: {
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        attributes: buildVisualizationSnapshotMarkSample(
          Array.from(element.attributes).map((attribute) => ({
            name: attribute.name,
            value: attribute.value
          })),
          { attributeLimit: 12, valueLimit: 96 }
        )
      };
    });
    const rangeValues = visibleRangeControls.map((element, index) => ({
      index,
      label: getSnapshotControlLabel(element),
      value: compactSnapshotText(element.value, 96),
      min: element.getAttribute("min"),
      max: element.getAttribute("max"),
      step: element.getAttribute("step")
    }));
    const invalidSentinelMatches = textAndAttributes.match(/\b(?:NaN|Infinity|undefined|null)\b/g) ?? [];
    const absoluteHref = new URL(activeDirectoryLabHref, window.location.origin).toString();
    const domHealth = {
      surfaceCount: labSection?.querySelectorAll("[data-viz-surface]").length ?? 0,
      visibleSurfaceCount: visibleElements("[data-viz-surface]").length,
      markCount: labSection?.querySelectorAll("[data-viz-mark]").length ?? 0,
      visibleMarkCount: visibleMarks.length,
      rangeCount: labSection?.querySelectorAll("input[type='range']").length ?? 0,
      buttonCount: labSection?.querySelectorAll("button").length ?? 0,
      invalidSentinelCount: invalidSentinelMatches.length,
      firstSurface: firstSurfaceRect
        ? {
          width: Math.round(firstSurfaceRect.width),
          height: Math.round(firstSurfaceRect.height)
        }
        : null,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    };
    const controlProbe = {
      controlSampleLimit: snapshotControlSampleLimit,
      sampledControlCount: controlSamples.length,
      totalVisibleControlCount: visibleControls.length,
      totalVisibleRangeControlCount: visibleRangeControls.length,
      controls: controlSamples,
      rangeValues
    };
    const semanticProbe = {
      markSampleLimit: 12,
      sampledMarkCount: markSamples.length,
      totalVisibleMarkCount: visibleMarks.length,
      marks: markSamples
    };
    const diagnosticIssues = [
      ...(labSection ? [] : ["lab-section-missing"]),
      ...(domHealth.visibleSurfaceCount < 1 ? ["no-visible-viz-surface"] : []),
      ...(domHealth.visibleMarkCount < 1 ? ["no-visible-viz-mark"] : []),
      ...(domHealth.invalidSentinelCount > 0 ? ["invalid-sentinel-visible"] : []),
      ...(domHealth.horizontalOverflow > 8 ? ["horizontal-overflow"] : []),
      ...(domHealth.firstSurface && (domHealth.firstSurface.width < 120 || domHealth.firstSurface.height < 80) ? ["first-surface-too-small"] : []),
      ...(controlProbe.sampledControlCount < 1 ? ["no-visible-controls"] : []),
      ...rangeValues.flatMap(buildSnapshotRangeIssue)
    ];

    const snapshot = {
      kind: "mais.visualization.labSnapshot",
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      url: window.location.href,
      lab: {
        labId: activeDirectoryLab.labId,
        topicId: activeDirectoryLab.topicId,
        grade: activeDirectoryLab.grade,
        curriculumTrack: activeDirectoryLab.curriculumTrack,
        moduleId: activeDirectoryLab.moduleId,
        templateId: activeDirectoryLab.templateId,
        qaProfile: activeDirectoryLab.qaProfile,
        analyticsSource: activeDirectoryLab.analyticsSource,
        directHref: absoluteHref,
        practiceHref: new URL(activePracticeHref, window.location.origin).toString()
      },
      ui: {
        language,
        panelMode,
        directLinkStatus,
        saveState: labSection?.querySelector("[data-viz-card]")?.getAttribute("data-viz-save-state") ?? null
      },
      domHealth,
      controlProbe,
      semanticProbe,
      diagnosticVerdict: {
        status: diagnosticIssues.length ? "attention-required" : "pass",
        issueCount: diagnosticIssues.length,
        issues: diagnosticIssues,
        thresholds: {
          horizontalOverflowPx: 8,
          minimumFirstSurfaceWidth: 120,
          minimumFirstSurfaceHeight: 80
        }
      }
    };

    try {
      setSnapshotState(await writeTextToClipboard(JSON.stringify(snapshot, null, 2)) ? "copied" : "error");
    } catch {
      setSnapshotState("error");
    }
  }

  function handleTrackFilterChange(option: VisualizationTrackFilter) {
    const nextGroups = filterGradeLabGroups(curriculumScopedGroups, option);
    const nextGroup =
      nextGroups.find((group) => group.grade === activeDirectoryGrade) ??
      nextGroups.find((group) => group.grade === activeGroup.grade) ??
      nextGroups[0] ??
      null;
    const nextLab = nextGroup?.labs.find((lab) => lab.labId === activeLabId) ?? nextGroup?.labs[0] ?? null;

    setTrackFilter(option);
    setPanelMode("control");
    setActiveDirectoryGrade(nextGroup?.grade ?? activeGroup.grade);
    setActiveLabId(nextLab?.labId ?? null);
    setDirectLinkStatus("idle");
    setRequestedLabId(null);
    replaceVisualizationUrl({
      grade: nextGroup?.grade ?? activeGroup.grade,
      lab: null,
      mode: "control",
      track: option
    });
  }

  function trackLabel(option: VisualizationTrackFilter) {
    if (option === "all") return t({ en: "All", zh: "全部", zhHans: "全部" });
    return text(visualizationTrackLabels[option]);
  }

  const introText = t({
    en: "Choose a grade, open one lab, and finish an observation mission.",
    zh: "選擇年級，打開一個實驗，完成觀察任務。",
    zhHans: "选择年级，打开一个实验，完成观察任务。"
  });
  const pickGradeTitle = t({ en: "Pick your grade", zh: "選擇你的年級", zhHans: "选择你的年级" });
  const pickLabTitle = t({ en: "Pick a lab", zh: "選擇一個實驗", zhHans: "选择一个实验" });
  const nextUpLabel = t({ en: "Next up", zh: "下一站", zhHans: "下一站" });
  const tryThisLabel = t({ en: "Try this!", zh: "試試這個！", zhHans: "试试这个！" });
  const backToLabsLabel = t({ en: "Back to Labs", zh: "返回實驗列表", zhHans: "返回实验列表" });
  const exploredLabel = t({ en: "Explored", zh: "已探索", zhHans: "已探索" });
  const readyLabel = t({ en: "Ready", zh: "待探索", zhHans: "待探索" });
  const emptyStateText = currentUser
    ? t({ en: "No labs match this account curriculum and grade yet.", zh: "此帳號課程與年級暫時沒有相符實驗。", zhHans: "此账号课程与年级暂时没有相符实验。" })
    : t({ en: "No labs match this grade and track filter yet.", zh: "此年級與路線篩選暫時沒有相符實驗。", zhHans: "此年级与路线筛选暂时没有相符实验。" });
  const directLinkWarningText = directLinkStatus === "missing"
    ? t({ en: "This lab link does not match any current Visualization Lab.", zh: "此實驗連結不符合目前任何可視化實驗。", zhHans: "此实验链接不匹配当前任何可视化实验。" })
    : directLinkStatus === "unavailable"
      ? t({ en: "This lab exists, but it is not available under the current curriculum or filter.", zh: "此實驗存在，但不屬於目前課程或篩選條件。", zhHans: "此实验存在，但不属于当前课程或筛选条件。" })
      : null;

  return (
    <div className="min-h-full overflow-hidden bg-transparent text-slate-950">
      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-6 sm:py-8">
        <section
          ref={panelRef}
          id={workspaceSectionLabId ? `lab-example-${workspaceSectionLabId}` : undefined}
          aria-label={t({ en: "Visualization Lab workspace", zh: "可視化實驗室工作區", zhHans: "可视化实验室工作区" })}
          className="scroll-mt-24"
          data-viz-panel-mode={visiblePanelMode}
          data-viz-active-grade={activeDirectoryGroup?.grade ?? ""}
          data-viz-active-lab-id={activeDirectoryLab?.labId ?? ""}
          data-viz-direct-lab-href={activeDirectoryLabHref ?? ""}
          data-viz-lab-runtime-status={panelMode === "lab" ? visiblePanelMode : "idle"}
          data-viz-link-status={directLinkStatus}
          data-viz-requested-lab-id={requestedLabId ?? ""}
        >
          {panelMode === "control" ? (
            <section
              aria-labelledby="visualization-lab-title"
              className="overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-cyan-900/15 ring-1 ring-cyan-100 dark:bg-slate-950 dark:ring-white/10"
            >
              <div className="relative isolate">
                <LabQuestMap
                  href={recommendedLabHref}
                  language={language}
                  onNodeClick={() => {
                    if (recommendedLab) selectDirectoryLab(recommendedLab);
                  }}
                  recommendedLabId={recommendedLab?.labId ?? ""}
                />
                <div className="pointer-events-none relative z-10 flex min-h-[16rem] items-center p-4 sm:min-h-[20rem] sm:p-8">
                  <div className="pointer-events-auto max-w-xl rounded-3xl bg-white/85 p-5 shadow-2xl shadow-cyan-900/20 ring-1 ring-white/70 backdrop-blur-md dark:bg-slate-950/75 dark:ring-white/15 sm:p-7">
                    <h1 id="visualization-lab-title" className="text-3xl font-black leading-[1.02] tracking-tight text-[#15245a] dark:text-white sm:text-5xl">
                      {t({ en: "Visualization Lab", zh: "可視化實驗室", zhHans: "可视化实验室" })}
                    </h1>
                    <p className="mt-3 max-w-md text-base font-bold leading-7 text-slate-700 dark:text-slate-200 sm:text-lg sm:leading-8">
                      {introText}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
                      <a
                        href={recommendedLabHref}
                        onClick={(event) => {
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                          if (!recommendedLab) return;
                          event.preventDefault();
                          selectDirectoryLab(recommendedLab);
                        }}
                        data-viz-start-quest-link
                        data-viz-recommended-lab-id={recommendedLab?.labId ?? ""}
                        className="focus-ring inline-flex min-h-[3.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-red-500 px-7 text-lg font-black text-white shadow-xl shadow-red-500/30 transition hover:-translate-y-0.5 hover:bg-red-400 active:translate-y-0"
                      >
                        {t({ en: "Start Quest", zh: "開始探索", zhHans: "开始探索" })}
                        <span aria-hidden="true">▶</span>
                      </a>
                      {recommendedLab ? (
                        <span className="min-w-0 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
                          {nextUpLabel}:{" "}
                          <span className="text-[#15245a] dark:text-white">{displayCatalogText(compactTitle(text(recommendedLab.title)))}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-8">
                {directLinkWarningText ? (
                  <div
                    className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 shadow-sm"
                    data-viz-link-warning
                    data-viz-link-warning-requested-lab-id={requestedLabId ?? ""}
                    data-viz-link-warning-status={directLinkStatus}
                    role="status"
                  >
                    <span>{directLinkWarningText}</span>
                    {requestedLabId ? (
                      <code className="ml-2 rounded-md bg-white/80 px-2 py-1 text-xs font-black text-amber-950">
                        {requestedLabId}
                      </code>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                  <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight text-[#15245a] dark:text-white">
                    <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-lg text-white shadow-lg shadow-blue-600/25">
                      1
                    </span>
                    {pickGradeTitle}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-black text-slate-600 shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
                      {t({ en: "Current grade", zh: "當前年級", zhHans: "当前年级" })} <span className="ml-1 text-emerald-600 dark:text-emerald-400">{activeGradeLabel}</span>
                    </span>
                    {currentCurriculumLabel ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-black text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200">
                        {currentCurriculumLabel}
                      </span>
                    ) : null}
                  </div>
                </div>

                {!currentUser ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2" aria-label={t({ en: "Filter by curriculum track", zh: "按課程路線篩選", zhHans: "按课程路线筛选" })}>
                    <span className="mr-1 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {t({ en: "Curriculum", zh: "課程路線", zhHans: "课程路线" })}
                    </span>
                    {trackFilterOptions.map((option) => (
                      <a
                        key={option}
                        href={buildControlPanelHref({
                          grade: activeDirectoryGroup?.grade ?? activeGroup.grade,
                          track: option
                        })}
                        onClick={(event) => {
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                          event.preventDefault();
                          handleTrackFilterChange(option);
                        }}
                        aria-pressed={trackFilter === option}
                        role="button"
                        data-viz-track-filter-button
                        data-viz-track-filter-active={String(trackFilter === option)}
                        data-viz-track-filter-value={option}
                        className={cn(
                          "focus-ring rounded-full border px-3 py-1.5 text-xs font-black leading-none transition hover:-translate-y-0.5",
                          trackFilter === option
                            ? "border-cyan-400 bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
                            : "border-slate-200 bg-white text-slate-500 hover:bg-cyan-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-cyan-950/40"
                        )}
                      >
                        {trackLabel(option)}
                      </a>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2.5" aria-label={t({ en: "Select grade", zh: "選擇年級", zhHans: "选择年级" })}>
                  {gradeIds.map((grade) => {
                    const group = directoryGroups.find((item) => item.grade === grade);
                    return (
                      <GradeChip
                        key={grade}
                        active={activeDirectoryGroup?.grade === grade}
                        grade={grade}
                        hasLabs={Boolean(group)}
                        href={buildControlPanelHref({
                          grade,
                          track: effectiveTrackFilter
                        })}
                        label={displayGradeChipLabel(grade)}
                        onClick={() => {
                          if (group) selectDirectoryGrade(group);
                        }}
                      />
                    );
                  })}
                </div>

                <div aria-hidden="true" className="my-7 h-px w-full bg-slate-200/90 dark:bg-white/10" />

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                  <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight text-[#15245a] dark:text-white">
                    <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 text-lg text-white shadow-lg shadow-emerald-600/25">
                      2
                    </span>
                    {pickLabTitle}
                  </h2>
                  <span className="text-sm font-black text-blue-700 dark:text-blue-300">{visibleLabs.length} {t(dictionary.common.labs)}</span>
                </div>

                {visibleLabs.length > 0 ? (
                  <div className="mt-5 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {visibleLabs.map((lab, index) => (
                      <LabTile
                        key={lab.labId}
                        active={activeDirectoryLab?.labId === lab.labId}
                        index={index}
                        isExplored={exploredSessionIds.has(buildVisualizationSessionModuleId(lab))}
                        lab={lab}
                        href={buildVisualizationLabHref(lab, effectiveTrackFilter)}
                        onOpen={() => selectDirectoryLab(lab)}
                        recommended={recommendedLab?.labId === lab.labId}
                        recommendedLabel={tryThisLabel}
                        exploredLabel={exploredLabel}
                        readyLabel={readyLabel}
                        title={displayCatalogText(compactTitle(text(lab.title)))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {emptyStateText}
                  </div>
                )}
              </div>
            </section>
          ) : activeDirectoryLab && ActiveDirectoryLabComponent && activeDirectorySessionModuleId ? (
            <section
              data-lab-id={activeDirectoryLab.labId}
              data-viz-current-grade={activeDirectoryLab.grade}
              data-viz-current-track={activeDirectoryLab.curriculumTrack}
              data-viz-direct-lab-href={activeDirectoryLabHref ?? ""}
              data-viz-copy-controls-ready={String(isHydrated)}
              className="rounded-[1.35rem] bg-white/95 p-4 shadow-2xl shadow-cyan-900/15 ring-1 ring-cyan-100 sm:p-7"
            >
              <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={activeDirectoryControlPanelHref}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                      event.preventDefault();
                      returnToControlPanel();
                    }}
                    data-viz-back-to-control-panel-link
                    data-viz-back-to-control-panel-grade={activeDirectoryLab.grade}
                    data-viz-back-to-control-panel-track={effectiveTrackFilter}
                    className="focus-ring inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
                  >
                    ← {backToLabsLabel}
                  </a>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                    {displayLabGradeLabel(activeDirectoryLab)}
                  </span>
                  <button
                    type="button"
                    onClick={copyActiveLabLink}
                    disabled={!isHydrated || !activeLabCanDistribute}
                    aria-disabled={!isHydrated || !activeLabCanDistribute}
                    data-viz-copy-lab-link
                    data-viz-copy-lab-link-state={shareState}
                    data-viz-copy-lab-link-safeguard-status={activeLabSafeguardStatus}
                    className="focus-ring inline-flex items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {!activeLabCanDistribute || shareState === "blocked"
                      ? t({ en: "Approval required", zh: "需要批准", zhHans: "需要批准" })
                      : shareState === "copied"
                      ? t({ en: "Link copied", zh: "連結已複製", zhHans: "链接已复制" })
                      : t({ en: "Copy lab link", zh: "複製實驗連結", zhHans: "复制实验链接" })}
                  </button>
                  <button
                    type="button"
                    onClick={copyActiveLabSnapshot}
                    disabled={!isHydrated || !activeLabCanDistribute}
                    aria-disabled={!isHydrated || !activeLabCanDistribute}
                    data-viz-copy-lab-snapshot
                    data-viz-snapshot-state={snapshotState}
                    data-viz-snapshot-safeguard-status={activeLabSafeguardStatus}
                    className="focus-ring inline-flex items-center justify-center rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {!activeLabCanDistribute || snapshotState === "blocked"
                      ? t({ en: "Approval required", zh: "需要批准", zhHans: "需要批准" })
                      : snapshotState === "copied"
                      ? t({ en: "Snapshot copied", zh: "快照已複製", zhHans: "快照已复制" })
                      : t({ en: "Copy snapshot", zh: "複製快照", zhHans: "复制快照" })}
                  </button>
                  {shareState === "error" ? (
                    <span className="text-xs font-bold text-rose-600" role="status">
                      {t({ en: "Use the address bar link.", zh: "請使用網址列連結。", zhHans: "请使用地址栏链接。" })}
                    </span>
                  ) : null}
                  {snapshotState === "error" ? (
                    <span className="text-xs font-bold text-rose-600" role="status">
                      {t({ en: "Snapshot unavailable.", zh: "未能複製快照。", zhHans: "未能复制快照。" })}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0">
                <VisualizationCard
                  title={displayCatalogText(text(activeDirectoryLab.title))}
                  description={displayCatalogText(text(activeDirectoryLab.description))}
                  analyticsSource={activeDirectoryLab.analyticsSource}
                  explorationScopeKey={currentUser?.id ?? "guest"}
                  formula={
                    // Both lab modules render their own mathematics, so the
                    // template's generic formula must not be shown alongside
                    // them. It is generated per template, not per topic, so on
                    // a signature bench it can contradict the lab outright —
                    // e.g. statistics-distribution yields "mean +/- spread"
                    // above a bench that teaches median and IQR.
                    activeDirectoryLab.moduleId === "configured-visualization-lab" ||
                    activeDirectoryLab.moduleId === "signature-lab" ||
                    !activeDirectoryLab.templateConfig.formula
                      ? undefined
                      : text(activeDirectoryLab.templateConfig.formula)
                  }
                  initialExplored={exploredSessionIds.has(activeDirectorySessionModuleId)}
                  moduleId={activeDirectorySessionModuleId}
                  onExplored={(exploredModuleId) => {
                    setExploredSessionIds((current) => {
                      if (current.has(exploredModuleId)) return current;
                      const next = new Set(current);
                      next.add(exploredModuleId);
                      return next;
                    });
                  }}
                  topicId={activeDirectoryLab.topicId}
                >
                  {activeSignatureAssignment && activeHasRelatedBenches ? (
                    <SignatureBenchSwitcher
                      assignment={activeSignatureAssignment}
                      lab={activeDirectoryLab}
                      topicId={activeDirectoryLab.topicId}
                      labId={activeDirectoryLab.labId}
                      onRuntimeReady={handleActiveLabRuntimeReady}
                    />
                  ) : (
                    <ActiveDirectoryLabComponent
                      lab={activeDirectoryLab}
                      topicId={activeDirectoryLab.topicId}
                      labId={activeDirectoryLab.labId}
                      onRuntimeReady={handleActiveLabRuntimeReady}
                    />
                  )}
                </VisualizationCard>
              </div>
            </section>
          ) : (
            <section className="rounded-[1.35rem] bg-white/95 p-8 shadow-2xl shadow-cyan-900/15">
              <p className="text-sm font-bold text-slate-600">{emptyStateText}</p>
              <a
                href={activeDirectoryControlPanelHref}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  returnToControlPanel();
                }}
                data-viz-back-to-control-panel-link
                data-viz-back-to-control-panel-grade={activeDirectoryGroup?.grade ?? activeGroup.grade}
                data-viz-back-to-control-panel-track={effectiveTrackFilter}
                className="focus-ring mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
              >
                {backToLabsLabel}
              </a>
            </section>
          )}
        </section>

      </div>
    </div>
  );
}
