"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { VisualizationCard } from "@/components/visualizations/VisualizationCard";
import VisualizationLabLoading from "@/components/visualizations/VisualizationLabLoading";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { resolveVisualizationLabDisplayCopy } from "@/components/visualizations/visualizationLabDisplayMetadata";
import { signatureBenchLabel } from "@/components/visualizations/signatureBenchLabel";
import {
  buildVisualizationDirectoryLabHref,
  buildVisualizationLabHref,
  buildVisualizationPracticeHref,
  buildVisualizationSessionModuleId,
  buildVisualizationSnapshotMarkSample,
  isPremiumThreeDTopicPageLab
} from "@/components/visualizations/visualizationDiagnostics";
import { ccssStandardEmoji, defaultLabEmoji, visualizationTemplateEmoji } from "@/data/visualizationLabEmoji";
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
type VisualizationGradeEntryPoint = "back-to-my-grade" | "empty-state" | "grade-rail" | "grade-rail-pinned";
type VisualizationLabOpenEntryPoint = "lab-tile" | "mission-strip" | "next-up-card" | "start-quest";
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

      // The probe must keep running in hidden tabs (requestAnimationFrame is
      // frozen there, which left background direct-entry tabs stuck on
      // "loading"). MutationObserver callbacks are not visibility-throttled;
      // the interval is a low-cost safety net for anything the observer
      // filter misses.
      let done = false;

      const probeRuntimeReady = () => {
        if (done) return;

        const runtimeRoot = runtimeRootRef.current;
        const surface = runtimeRoot?.querySelector("[data-viz-surface]");
        const mark = surface?.querySelector("[data-viz-mark]");

        if (surface && mark) {
          done = true;
          observer.disconnect();
          window.clearInterval(interval);
          onRuntimeReady(readyLabId);
        }
      };

      const observer = new MutationObserver(probeRuntimeReady);
      if (runtimeRootRef.current) {
        observer.observe(runtimeRootRef.current, {
          attributeFilter: ["data-viz-surface", "data-viz-mark"],
          attributes: true,
          childList: true,
          subtree: true
        });
      }
      const interval = window.setInterval(probeRuntimeReady, 500);
      probeRuntimeReady();

      return () => {
        done = true;
        observer.disconnect();
        window.clearInterval(interval);
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
  ClosureLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ClosureLab")
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
  ComplexArithmeticLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/ComplexArithmeticLab")
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
  CompositionLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CompositionLab")
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
  CoordinateMethodsLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/CoordinateMethodsLab")
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
  EliminationLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/EliminationLab")
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
  GeometricModelingLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/GeometricModelingLab")
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
  PlaceJumpLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/PlaceJumpLab")
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
  StoryProblemLab: dynamic<LabComponentProps>(
    () =>
      Promise.all([
        import("@/components/visualizations/SignatureLabAdapter"),
        import("@/components/visualizations/signature/StoryProblemLab")
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
  labelForBench,
  primaryBenchLabel,
  relatedLabsLabel,
  onRuntimeReady,
  onBenchSwitch
}: {
  assignment: NonNullable<ReturnType<typeof getSignatureLabAssignment>>;
  lab: FeaturedLabDefinition;
  topicId: string;
  labId?: string;
  labelForBench: (benchId: SignatureLabId, benchIndex: number) => string;
  primaryBenchLabel: string;
  relatedLabsLabel: string;
  onRuntimeReady?: (labId: string) => void;
  /**
   * Fired when the student switches to a DIFFERENT bench. Until 2026-07-25 this
   * chip row emitted nothing, so there was no way to tell whether students ever
   * used it — which matters because 138 of the 192 benches are reachable only
   * here, behind a click, rather than as a topic's `primary`. Re-selecting the
   * bench already showing is not a switch and is not reported.
   *
   * Switching remounts the bench (the `key` below). The adapter deliberately
   * performs no network or analytics write on mount, so a switch produces only
   * the explicit `bench-switch` navigation event emitted here. This keeps
   * page-load and interaction counts stable across React remounts.
   */
  onBenchSwitch?: (benchId: SignatureLabId) => void;
}) {
  const benchIds = useMemo<SignatureLabId[]>(
    () => [assignment.primary, ...(assignment.related ?? [])],
    [assignment]
  );
  const [activeBenchId, setActiveBenchId] = useState<SignatureLabId>(assignment.primary);
  const switcherDomId = useMemo(
    () => `signature-${(labId ?? topicId).replace(/[^a-zA-Z0-9_-]+/g, "-")}`,
    [labId, topicId]
  );
  const panelId = `${switcherDomId}-panel`;

  // Reset to the primary whenever the topic (and thus the assignment) changes.
  useEffect(() => {
    setActiveBenchId(assignment.primary);
  }, [assignment.primary, topicId]);

  // Effects run after paint. Resolve an assignment change synchronously as
  // well, so a newly selected topic can never render the previous topic's
  // active bench for one frame while the reset effect catches up.
  const resolvedActiveBenchId = benchIds.includes(activeBenchId) ? activeBenchId : assignment.primary;
  const BenchComponent = SignatureLabRoutes[resolvedActiveBenchId] ?? SignatureLabRoutes[assignment.primary];

  function activateBench(benchId: SignatureLabId) {
    if (benchId === resolvedActiveBenchId) return;
    onBenchSwitch?.(benchId);
    setActiveBenchId(benchId);
  }

  return (
    <div
      data-viz-signature-switcher
      data-viz-active-signature-bench={resolvedActiveBenchId}
    >
      {benchIds.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={relatedLabsLabel}>
          {benchIds.map((benchId, benchIndex) => {
            const isActive = benchId === resolvedActiveBenchId;
            const tabId = `${switcherDomId}-tab-${benchId}`;
            const benchLabel = labelForBench(benchId, benchIndex);
            const accessibleBenchLabel = benchId === assignment.primary
              ? `${benchLabel} · ${primaryBenchLabel}`
              : benchLabel;
            return (
              <button
                key={benchId}
                id={tabId}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={panelId}
                aria-label={accessibleBenchLabel}
                data-viz-signature-bench-id={benchId}
                tabIndex={isActive ? 0 : -1}
                onClick={() => activateBench(benchId)}
                onKeyDown={(event) => {
                  let nextIndex: number | null = null;

                  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    nextIndex = (benchIndex + 1) % benchIds.length;
                  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    nextIndex = (benchIndex - 1 + benchIds.length) % benchIds.length;
                  } else if (event.key === "Home") {
                    nextIndex = 0;
                  } else if (event.key === "End") {
                    nextIndex = benchIds.length - 1;
                  }

                  if (nextIndex === null) return;
                  event.preventDefault();
                  const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                    "[data-viz-signature-bench-id]"
                  );
                  const nextTab = tabs?.[nextIndex];
                  nextTab?.focus();
                  nextTab?.click();
                }}
                className={`min-h-11 rounded-full border px-3.5 py-1.5 text-xs font-black transition ${
                  isActive
                    ? "border-cyan-500 bg-cyan-500 text-white shadow"
                    : "border-slate-300 bg-white text-slate-600 hover:border-cyan-300 hover:text-slate-900 dark:border-slate-100/20 dark:bg-transparent dark:text-slate-200"
                }`}
              >
                {benchLabel}
                {benchId === assignment.primary ? <span className="ml-1.5">· {primaryBenchLabel}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      <div
        id={panelId}
        role={benchIds.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={benchIds.length > 1 ? `${switcherDomId}-tab-${resolvedActiveBenchId}` : undefined}
        data-viz-signature-bench-panel={resolvedActiveBenchId}
        tabIndex={benchIds.length > 1 ? 0 : undefined}
        className="focus-ring rounded-2xl [&_[data-viz-keyboard-equivalent]_button]:min-h-11 [&_[data-viz-keyboard-equivalent]_button]:min-w-11 [&_[data-viz-keyboard-equivalent]_input]:min-h-11 [&_[data-viz-keyboard-equivalent]_select]:min-h-11 [&_[data-viz-keyboard-equivalent]_select]:min-w-11"
      >
        <BenchComponent
          key={resolvedActiveBenchId}
          lab={lab}
          topicId={topicId}
          labId={labId}
          onRuntimeReady={onRuntimeReady}
        />
      </div>
    </div>
  );
}

const trackFilterOptions: VisualizationTrackFilter[] = ["all", "HK", "US", "MAINLAND_PEP_PRIMARY", "MAINLAND_PEP_JUNIOR", "MAINLAND_PEP_HIGH", "MAINLAND_HJB", "MAINLAND_BNU", "CAPSTONE"];
const mainlandPepVisualizationTracks: readonly VisualizationCurriculumTrack[] = ["MAINLAND_PEP_PRIMARY", "MAINLAND_PEP_JUNIOR", "MAINLAND_PEP_HIGH"];
const hongKongPublishers = new Set<TextbookPublisher>(["HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY", "HK_UNITED_PRIME_MIA", "HK_EPH_MIF"]);
const unitedStatesPublishers = new Set<TextbookPublisher>(["US_CA_MATH", "US_NC_MATH", "US_AR_MATH", "US_FL_MATH"]);
const unitedStatesCurriculumTracks = new Set<CurriculumTrack>(["US_CA_MATH", "US_NC_MATH", "US_AR_MATH", "US_FL_MATH"]);

// CCSS-Math-Textbook grade-band accents: one color drives the card's top border,
// the grade pill, and the active ring. Light/dark pairs mirror the source tokens.
const labTileBandStyles = {
  early: {
    topBorder: "border-t-[#ef6c3b] dark:border-t-[#ff8a5c]",
    badge: "bg-[#ef6c3b] dark:bg-[#ff8a5c]",
    ring: "ring-[#ef6c3b]/45 dark:ring-[#ff8a5c]/45"
  },
  upper: {
    topBorder: "border-t-[#17a06a] dark:border-t-[#35c58c]",
    badge: "bg-[#17a06a] dark:bg-[#35c58c]",
    ring: "ring-[#17a06a]/45 dark:ring-[#35c58c]/45"
  },
  middle: {
    topBorder: "border-t-[#3b6fe0] dark:border-t-[#6f95ff]",
    badge: "bg-[#3b6fe0] dark:bg-[#6f95ff]",
    ring: "ring-[#3b6fe0]/45 dark:ring-[#6f95ff]/45"
  },
  high: {
    topBorder: "border-t-[#7c4de0] dark:border-t-[#a988ff]",
    badge: "bg-[#7c4de0] dark:bg-[#a988ff]",
    ring: "ring-[#7c4de0]/45 dark:ring-[#a988ff]/45"
  }
} as const;

// K-G2 accounts get larger touch targets and less symbol clutter; the band
// matches labTileBandStyles.early so the two "young learner" notions agree.
const youngLearnerGrades = new Set<GradeId>(["K", "P1", "P2"]);

function labTileBandForGrade(grade: GradeId) {
  if (grade === "K" || grade === "P1" || grade === "P2") return labTileBandStyles.early;
  if (grade === "P3" || grade === "P4" || grade === "P5" || grade === "P6") return labTileBandStyles.upper;
  if (grade === "S1" || grade === "S2" || grade === "S3") return labTileBandStyles.middle;
  return labTileBandStyles.high;
}

const labStandardChipClass =
  "inline-flex items-center rounded-full border border-[#e3e5ee] bg-[#f1f2f8] px-[0.6rem] py-[0.15rem] font-mono text-[0.72rem] font-semibold tracking-[0.02em] text-[#4a4f5c] dark:border-[#2a2f42] dark:bg-[#1e2231] dark:text-[#b9bdcc]";
const labCategoryChipClass =
  "inline-flex items-center rounded-full border border-[#e3e5ee] bg-[#f1f2f8] px-[0.6rem] py-[0.15rem] text-[0.72rem] font-semibold tracking-[0.02em] text-[#4a4f5c] dark:border-[#2a2f42] dark:bg-[#1e2231] dark:text-[#b9bdcc]";

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
  if (lab.curriculumTrack === "CAPSTONE" && isPremiumThreeDTopicPageLab(lab)) return true;

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

function labTileStandardIds(lab: FeaturedLabDefinition) {
  // "Modeling" is a domain-fallback pseudo-id, not a real CCSS code \u2014 never chip it.
  return (lab.californiaAlignment?.standardIds ?? []).filter((id) => id !== "Modeling");
}

function labTileEmojiForLab(lab: FeaturedLabDefinition) {
  for (const id of labTileStandardIds(lab)) {
    const emoji = ccssStandardEmoji[id];
    if (emoji) return emoji;
  }
  return visualizationTemplateEmoji[lab.templateId] ?? defaultLabEmoji;
}

function LabRuntimeLoading() {
  const { t } = useSettings();

  return (
    <div
      className="grid min-h-[28rem] place-items-center rounded-2xl border border-cyan-200 bg-cyan-50/70 p-6 text-center text-sm font-black text-cyan-800 shadow-inner dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100"
      data-viz-lab-runtime-loading
      role="status"
    >
      {t({ en: "Loading lab runtime…", zh: "正在載入實驗…", zhHans: "正在加载实验…" })}
    </div>
  );
}

function GradeChip({
  active,
  grade,
  hasLabs,
  href,
  label,
  large = false,
  onClick,
  pinned = false,
  pinnedLabel
}: {
  active: boolean;
  grade: GradeId;
  hasLabs: boolean;
  href: string;
  label: string;
  large?: boolean;
  onClick: () => void;
  pinned?: boolean;
  pinnedLabel?: string;
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
      data-viz-grade-chip-pinned={String(pinned)}
      className={cn(
        "focus-ring inline-flex shrink-0 snap-start items-center justify-center rounded-xl border-2 text-center font-black leading-none transition",
        large ? "h-14 min-w-[3.9rem] px-5 text-lg" : "h-12 min-w-[3.4rem] px-4 text-base",
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/30"
          : pinned
            ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm dark:border-emerald-400/40 dark:bg-emerald-950/30 dark:text-emerald-200"
            : "border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-slate-200",
        hasLabs
          ? active
            ? "hover:-translate-y-0.5"
            : pinned
              ? "hover:-translate-y-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/50"
              : "hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
          : "cursor-not-allowed opacity-35"
      )}
    >
      {pinned ? (
        <span aria-hidden="true" className={cn("mr-1.5 text-sm", active ? "text-amber-300" : "text-amber-500")}>
          ★
        </span>
      ) : null}
      {label}
      {pinned && pinnedLabel ? (
        <span
          className={cn(
            "ml-2 rounded-full px-2 py-0.5 text-[0.65rem] font-black leading-none",
            active
              ? "bg-white/20 text-white"
              : "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
          )}
        >
          {pinnedLabel}
        </span>
      ) : null}
    </a>
  );
}

function LabTile({
  active,
  categoryChipLabel,
  description,
  displayDisambiguator,
  emoji,
  exploredLabel,
  gradeBadgeLabel,
  href,
  isExplored,
  lab,
  onOpen,
  readyLabel,
  recommended = false,
  recommendedLabel,
  title
}: {
  active: boolean;
  categoryChipLabel: string;
  description: string;
  displayDisambiguator: string | null;
  emoji: string;
  exploredLabel: string;
  gradeBadgeLabel: string;
  href: string;
  isExplored: boolean;
  lab: FeaturedLabDefinition;
  onOpen: () => void;
  readyLabel: string;
  recommended?: boolean;
  recommendedLabel?: string;
  title: string;
}) {
  const band = labTileBandForGrade(lab.grade);
  const standardIds = labTileStandardIds(lab);
  const visibleStandardIds = standardIds.slice(0, 3);
  const extraStandardCount = standardIds.length - visibleStandardIds.length;
  const accessibleTitle = displayDisambiguator ? `${title} · ${displayDisambiguator}` : title;

  return (
    <a
      id={`lab-tile-${lab.labId}`}
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        // Premium cards advertise a canonical 3D route in their href. Let the
        // browser follow that same route for an ordinary click so click,
        // keyboard activation, copy-link, and open-in-new-tab cannot display
        // different experiments for one lab ID.
        if (isPremiumThreeDTopicPageLab(lab)) return;
        event.preventDefault();
        onOpen();
      }}
      aria-current={active ? "page" : undefined}
      data-lab-id={lab.labId}
      data-viz-lab-tile
      {...(recommended ? { "data-viz-recommended-lab-link": true, "data-viz-recommended-lab-id": lab.labId } : {})}
      className={cn(
        "focus-ring group relative flex flex-col rounded-2xl border border-[#e3e5ee] border-t-4 bg-white p-5 text-left shadow-[0_1px_2px_rgba(16,18,31,0.06),0_8px_24px_rgba(16,18,31,0.06)] transition-shadow hover:shadow-lg dark:border-[#2a2f42] dark:bg-[#161925] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.35)]",
        band.topBorder,
        active ? cn("ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950", band.ring) : ""
      )}
    >
      {recommended && recommendedLabel ? (
        <span className="absolute -top-2.5 right-4 z-10 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[0.68rem] font-black leading-none text-amber-950 shadow-md shadow-amber-500/30">
          <span aria-hidden="true">★</span>
          {recommendedLabel}
        </span>
      ) : null}
      <span className="flex items-center justify-between gap-2">
        <span aria-hidden="true" data-viz-lab-emoji={emoji} className="text-3xl leading-none">
          {emoji}
        </span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold leading-tight text-white", band.badge)}>
          {gradeBadgeLabel}
        </span>
      </span>
      <span
        lang={/^[\x00-\x7F\s'-]+$/.test(title) ? "en" : undefined}
        title={accessibleTitle}
        className="mt-3 line-clamp-2 min-w-0 break-words font-bold leading-snug text-slate-950 [overflow-wrap:anywhere] group-hover:text-[#2f5fe0] dark:text-white dark:group-hover:text-[#6f95ff]"
      >
        {title}
      </span>
      {displayDisambiguator ? (
        <span
          data-viz-display-disambiguator
          className="mt-1.5 self-start rounded-full bg-amber-100 px-2.5 py-1 text-[0.68rem] font-black leading-none text-amber-900 dark:bg-amber-300/15 dark:text-amber-100"
        >
          {displayDisambiguator}
        </span>
      ) : null}
      <span className="mt-1.5 line-clamp-3 flex-1 text-sm text-[#4a4f5c] dark:text-[#b9bdcc]">{description}</span>
      <span className="mt-3 flex flex-wrap items-center gap-1.5">
        {visibleStandardIds.map((standardId) => (
          <span key={standardId} data-viz-lab-standard-chip className={labStandardChipClass}>
            {standardId}
          </span>
        ))}
        {extraStandardCount > 0 ? <span className={labStandardChipClass}>+{extraStandardCount}</span> : null}
        {visibleStandardIds.length === 0 ? <span className={labCategoryChipClass}>{categoryChipLabel}</span> : null}
        <span
          className={cn(
            "ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-black leading-none",
            isExplored
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
              : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
          )}
        >
          <span aria-hidden="true">{isExplored ? "✓" : "▶"}</span>
          {isExplored ? exploredLabel : readyLabel}
        </span>
      </span>
      <span className="sr-only">{lab.labId}</span>
    </a>
  );
}

// Builds a smooth Catmull-Rom -> cubic-bezier path through the given points, so
// the teaser reads as a flowing curve rather than a jagged polyline.
function heroTeaserSmoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  const segments = [`M ${points[0].x} ${points[0].y}`];
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const following = points[index + 2] ?? next;
    const controlOneX = current.x + (next.x - previous.x) / 6;
    const controlOneY = current.y + (next.y - previous.y) / 6;
    const controlTwoX = next.x - (following.x - current.x) / 6;
    const controlTwoY = next.y - (following.y - current.y) / 6;
    segments.push(`C ${controlOneX} ${controlOneY} ${controlTwoX} ${controlTwoY} ${next.x} ${next.y}`);
  }
  return segments.join(" ");
}

// The hero's center zone: a self-contained, GPU-light "living graph" teaser that
// fills what used to be an empty gap between the title block and the Next-up
// card. It ships no lab runtime and no new dependency — just SVG plus the house
// `float`/`pulseGlow` keyframes, which the global `prefers-reduced-motion` block
// already freezes for motion-sensitive learners. A flowing area chart keeps the
// upper-right lively while a bottom-left scrim guarantees the eyebrow + tagline
// stay high-contrast no matter what sits behind them. Decorative visuals are
// aria-hidden; the copy stays readable so screen readers still get the "what
// this page is" message. Shown only at `lg` and up, where the gap exists; narrow
// (Chromebook/iPad) layouts stack title -> card and skip it.
function VisualizationHeroTeaser({ eyebrow, tagline }: { eyebrow: string; tagline: string }) {
  const points = [
    { x: 18, y: 182 },
    { x: 126, y: 122 },
    { x: 214, y: 152 },
    { x: 300, y: 80 },
    { x: 422, y: 116 }
  ];
  const baseline = 262;
  const linePath = heroTeaserSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;

  return (
    <div
      data-viz-hero-teaser
      className="relative flex min-h-[13rem] w-full flex-col overflow-hidden rounded-[1.4rem] bg-gradient-to-tr from-indigo-700 via-blue-600 to-cyan-400 shadow-xl shadow-blue-950/30 ring-1 ring-white/20 dark:from-indigo-950 dark:via-blue-800 dark:to-cyan-600"
    >
      <svg
        viewBox="0 0 440 280"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="viz-teaser-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.36" />
            <stop offset="66%" stopColor="#ffffff" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[74, 122, 170, 218].map((y) => (
          <line key={y} x1="0" y1={y} x2="440" y2={y} stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1" />
        ))}
        <path d={areaPath} fill="url(#viz-teaser-area)" />
        {/* Two stacked strokes fake a soft glow without an SVG filter (cheap on low-end GPUs). */}
        <path d={linePath} fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        <path d={linePath} fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={point.x} className="animate-pulseGlow" style={{ animationDelay: `${index * 0.4}s` }}>
            <circle cx={point.x} cy={point.y} r="9" fill="#ffffff" fillOpacity="0.24" />
            <circle cx={point.x} cy={point.y} r="4" fill="#ffffff" />
          </g>
        ))}
        <circle cx="398" cy="50" r="14" fill="none" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="2" className="animate-float" />
        <path d="M346 30 l3.5 9 l9 3.5 l-9 3.5 l-3.5 9 l-3.5 -9 l-9 -3.5 l9 -3.5 z" fill="#ffffff" fillOpacity="0.6" className="animate-float" style={{ animationDelay: "0.8s" }} />
        <circle cx="70" cy="44" r="3.5" fill="#ffffff" fillOpacity="0.5" className="animate-float" style={{ animationDelay: "1.6s" }} />
      </svg>
      {/* Dark scrim pooled in the bottom-left, fading out toward the top-right, so
          the copy always clears the chart behind it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,rgba(4,11,38,0.85),rgba(4,11,38,0.32)_38%,transparent_70%)]"
      />
      <div className="relative mt-auto p-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-white ring-1 ring-inset ring-white/30 backdrop-blur-sm">
          <span aria-hidden="true">✦</span>
          {eyebrow}
        </span>
        <p className="mt-2.5 max-w-[19rem] text-[0.95rem] font-bold leading-snug text-white [text-shadow:0_1px_14px_rgba(4,11,38,0.6)]">
          {tagline}
        </p>
      </div>
    </div>
  );
}

function VisualizationCatalogLoadError({ requestedLabId }: { requestedLabId: string | null }) {
  const { t } = useSettings();

  return (
    <section
      id={requestedLabId ? `lab-example-${requestedLabId}` : undefined}
      aria-label={t({
        en: "Visualization Lab workspace",
        zh: "可視化實驗室工作區",
        zhHans: "可视化实验室工作区"
      })}
      data-viz-catalog-deferred
      data-viz-catalog-load-status="error"
      data-viz-panel-mode="error"
      data-viz-requested-lab-id={requestedLabId ?? ""}
      className="page-container py-8"
    >
      <div
        role="alert"
        className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-6 text-slate-900 shadow-xl shadow-rose-900/10 dark:border-rose-300/20 dark:bg-slate-950 dark:text-white"
      >
        <h2 className="text-xl font-black">
          {t({
            en: "Visualization Labs could not load",
            zh: "未能載入可視化實驗",
            zhHans: "未能加载可视化实验"
          })}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          {t({
            en: "Check your connection, then try loading the catalog again.",
            zh: "請檢查網絡連線，然後重新載入實驗目錄。",
            zhHans: "请检查网络连接，然后重新加载实验目录。"
          })}
        </p>
        <button
          type="button"
          data-viz-retry-catalog-load
          onClick={() => window.location.reload()}
          className="focus-ring mt-5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-rose-600 px-5 py-2 text-sm font-black text-white shadow-md shadow-rose-600/25 transition hover:-translate-y-0.5 hover:bg-rose-500"
        >
          {t({ en: "Try again", zh: "重試", zhHans: "重试" })}
        </button>
      </div>
    </section>
  );
}

export function VisualizationLabPage(props: VisualizationLabPageProps = {}) {
  const { t } = useSettings();
  const { onRouteShellReady } = props;
  const [catalog, setCatalog] = useState<VisualizationCatalogState | null>(null);
  const [catalogLoadFailed, setCatalogLoadFailed] = useState(false);
  const loadingWorkspaceLabId = getInitialVisualizationLabRequestedLabId(props.initialLabId, getVisualizationLabRouteLocation());
  const loadingWorkspaceSectionId = loadingWorkspaceLabId;

  useLayoutEffect(() => {
    if (!catalog && !catalogLoadFailed) return;
    onRouteShellReady?.();
  }, [catalog, catalogLoadFailed, onRouteShellReady]);

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
    // The route shell already owns the visible loading workspace while this
    // client-only page and its deferred catalog chunk load. Rendering a second
    // full skeleton here produces two stacked "Preparing visualizations"
    // panels on slow connections. Standalone embeds still keep this fallback.
    if (props.suppressLoadingWorkspaceSelector && !catalogLoadFailed) return null;

    if (catalogLoadFailed) {
      return <VisualizationCatalogLoadError requestedLabId={loadingWorkspaceLabId} />;
    }

    return (
      <section
        id={loadingWorkspaceSectionId ? `lab-example-${loadingWorkspaceSectionId}` : undefined}
        aria-label={t({
          en: "Visualization Lab workspace",
          zh: "可視化實驗室工作區",
          zhHans: "可视化实验室工作区"
        })}
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
  const labGridRef = useRef<HTMLDivElement>(null);
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
  // Next-up recommendation: signed-in students get the first lab in the active
  // grade they have not explored yet, so "Start Quest" always resumes their
  // mission. Guests carry no session history, and a fully explored grade has
  // nothing left to resume — both fall back to the static pick.
  const firstUnexploredLab = useMemo(() => {
    if (!currentUser) return null;
    return visibleLabs.find((lab) => !exploredSessionIds.has(buildVisualizationSessionModuleId(lab))) ?? null;
  }, [currentUser, exploredSessionIds, visibleLabs]);
  const recommendedLab = firstUnexploredLab ?? visibleLabs[1] ?? activeDirectoryLab ?? visibleLabs[0] ?? null;
  const recommendedLabIsProgressBased = Boolean(firstUnexploredLab);
  const missionTotalCount = visibleLabs.length;
  const missionExploredCount = useMemo(() => {
    return visibleLabs.filter((lab) => exploredSessionIds.has(buildVisualizationSessionModuleId(lab))).length;
  }, [exploredSessionIds, visibleLabs]);
  const missionProgressPercent = missionTotalCount > 0 ? Math.round((missionExploredCount / missionTotalCount) * 100) : 0;
  const currentCurriculumLabel = currentUser ? text(publisherLabels[currentUser.curriculumProfile.publisher]) : null;
  const useUnitedStatesGradeLabels = currentUser
    ? currentUser.curriculumProfile.region === "US" ||
      unitedStatesPublishers.has(currentUser.curriculumProfile.publisher) ||
      unitedStatesCurriculumTracks.has(currentUser.curriculumTrack)
    : effectiveTrackFilter === "US";
  const activeGradeLabel = activeDirectoryGroup
    ? displayGradeLabel(activeDirectoryGroup.grade)
    : displayGradeLabel(activeGroup.grade);
  // Grade-first navigation: a signed-in student's account grade is pinned at
  // the head of the rail; guests have no account grade and keep the flat rail.
  const ownGrade = currentUser ? currentUserGrade : null;
  const ownGradeGroup = ownGrade ? directoryGroups.find((group) => group.grade === ownGrade) ?? null : null;
  const showBackToMyGrade = Boolean(ownGrade && ownGradeGroup && activeDirectoryGroup?.grade !== ownGrade);
  const browsingOtherGrade = Boolean(ownGrade && (activeDirectoryGroup?.grade ?? activeGroup.grade) !== ownGrade);
  const youngLearnerMode = Boolean(ownGrade && youngLearnerGrades.has(ownGrade));
  const ActiveDirectoryLabComponent = componentForDirectoryLab(activeDirectoryLab);
  // When the active lab is a signature bench whose topic fans out to related
  // benches, render the switcher so every related bench is reachable, not just
  // the primary. Falls back to the plain component otherwise.
  const activeSignatureAssignment =
    activeDirectoryLab?.moduleId === "signature-lab"
      ? getSignatureLabAssignment(activeDirectoryLab.topicId)
      : null;
  const activeDirectorySessionModuleId = activeDirectoryLab ? buildVisualizationSessionModuleId(activeDirectoryLab) : null;
  // This panel is the catalog/signature renderer. Its copy and snapshot links
  // must preserve that exact renderer even when the topic also has a premium
  // 3D canonical route.
  const activeDirectoryLabHref = activeDirectoryLab
    ? buildVisualizationDirectoryLabHref(activeDirectoryLab, effectiveTrackFilter)
    : null;
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

  function displayLabCopy(lab: FeaturedLabDefinition, compact = false) {
    const copy = resolveVisualizationLabDisplayCopy(lab, language);
    return {
      accessibleTitle: displayCatalogText(copy.accessibleTitle),
      disambiguator: copy.disambiguator ? displayCatalogText(copy.disambiguator) : null,
      title: displayCatalogText(compact ? compactTitle(copy.title) : copy.title)
    };
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

  // Navigation telemetry rides the existing mouse-click/navigation channel so
  // no schema change is needed; the structured topicId (viz-nav:action:detail)
  // distinguishes which control drove the visit. Lab-open probes above stay
  // untouched — dashboards aggregate on them.
  function recordVisualizationNavigationEvent(action: string, detail: string) {
    recordLearningEvent({
      type: "mouse-click",
      source: "navigation",
      topicId: `viz-nav:${action}:${detail}`
    });
  }

  function selectDirectoryGrade(group: GradeLabGroupDefinition, entryPoint: VisualizationGradeEntryPoint = "grade-rail") {
    recordVisualizationNavigationEvent(entryPoint, group.grade);
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
    // block: "nearest" keeps the viewport still when the grid is already
    // visible, so the nudge only fires when the labs sit below the fold.
    window.setTimeout(() => {
      labGridRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "nearest"
      });
    }, 40);
  }

  function selectDirectoryLab(lab: FeaturedLabDefinition, entryPoint: VisualizationLabOpenEntryPoint = "lab-tile") {
    recordVisualizationNavigationEvent(`open-${entryPoint}`, lab.labId);
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

  const chooseLabTitle = t({ en: "Choose your lab", zh: "選擇你的實驗", zhHans: "选择你的实验" });
  const yourGradeLabel = t({ en: "Your grade", zh: "你的年級", zhHans: "你的年级" });
  const backToMyGradeLabel = t({ en: "Back to my grade", zh: "回到我的年級", zhHans: "回到我的年级" });
  const nextUpLabel = t({ en: "Next up", zh: "下一站", zhHans: "下一站" });
  const nextUpProgressHint = t({
    en: "First lab you haven't explored yet.",
    zh: "你還沒探索過的第一個實驗。",
    zhHans: "你还没探索过的第一个实验。"
  });
  const continueLabel = t({ en: "Continue", zh: "繼續", zhHans: "继续" });
  const missionProgressLabel = t({
    en: `${activeGradeLabel} mission · ${missionExploredCount} of ${missionTotalCount} labs explored`,
    zh: `${activeGradeLabel}任務 · 已探索 ${missionExploredCount} / ${missionTotalCount} 個實驗`,
    zhHans: `${activeGradeLabel}任务 · 已探索 ${missionExploredCount} / ${missionTotalCount} 个实验`
  });
  const heroTeaserEyebrow = t({ en: "Watch it move", zh: "看它動起來", zhHans: "看它动起来" });
  const heroTeaserTagline = t({
    en: "Every lab turns math into something you can see, move, and explore.",
    zh: "每個實驗都把數學變成可以看見、操作與探索的畫面。",
    zhHans: "每个实验都把数学变成可以看见、操作与探索的画面。"
  });
  const missionStripLabel = t({ en: "Your mission", zh: "你的任務", zhHans: "你的任务" });
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
  const recommendedDisplayCopy = recommendedLab ? displayLabCopy(recommendedLab, true) : null;
  const activeDirectoryDisplayCopy = activeDirectoryLab ? displayLabCopy(activeDirectoryLab) : null;

  return (
    <div className="min-h-full overflow-hidden bg-transparent text-slate-950">
      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-6 sm:py-8">
        <section
          ref={panelRef}
          id={workspaceSectionLabId ? `lab-example-${workspaceSectionLabId}` : undefined}
          aria-label={t({ en: "Visualization Lab workspace", zh: "可視化實驗室工作區", zhHans: "可视化实验室工作区" })}
          className="scroll-mt-24"
          data-viz-panel-mode={visiblePanelMode}
          data-viz-young-learner-mode={String(youngLearnerMode)}
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
              data-tour="student-tools-catalog"
              className="overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-cyan-900/15 ring-1 ring-cyan-100 dark:bg-slate-950 dark:ring-white/10"
            >
              <div className="border-b border-slate-100 p-4 dark:border-white/10 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
                  <div className="min-w-0 max-w-2xl flex-1">
                    <h1 id="visualization-lab-title" className="text-3xl font-black leading-[1.02] tracking-tight text-[#15245a] dark:text-white sm:text-5xl">
                      {t({ en: "Visualization Lab", zh: "可視化實驗室", zhHans: "可视化实验室" })}
                    </h1>
                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
                      <a
                        href={recommendedLabHref}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                        if (!recommendedLab) return;
                        if (isPremiumThreeDTopicPageLab(recommendedLab)) return;
                        event.preventDefault();
                        selectDirectoryLab(recommendedLab, "start-quest");
                        }}
                        data-viz-start-quest-link
                        data-viz-recommended-lab-id={recommendedLab?.labId ?? ""}
                        className={cn(
                          "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-red-500 font-black text-white shadow-xl shadow-red-500/30 transition hover:-translate-y-0.5 hover:bg-red-400 active:translate-y-0",
                          youngLearnerMode ? "min-h-[3.75rem] px-8 text-xl" : "min-h-[3.25rem] px-7 text-lg"
                        )}
                      >
                        {t({ en: "Start Quest", zh: "開始探索", zhHans: "开始探索" })}
                        <span aria-hidden="true">▶</span>
                      </a>
                    </div>
                    {currentUser && missionTotalCount > 0 ? (
                      <div
                        className="mt-6 max-w-md"
                        data-viz-mission-progress
                        data-viz-mission-progress-explored={missionExploredCount}
                        data-viz-mission-progress-total={missionTotalCount}
                      >
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {missionProgressLabel}
                        </p>
                        <div
                          role="progressbar"
                          aria-label={missionProgressLabel}
                          aria-valuemin={0}
                          aria-valuemax={missionTotalCount}
                          aria-valuenow={missionExploredCount}
                          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
                        >
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                            style={{ width: `${missionProgressPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="hidden min-w-0 flex-1 lg:flex">
                    <VisualizationHeroTeaser eyebrow={heroTeaserEyebrow} tagline={heroTeaserTagline} />
                  </div>
                  {recommendedLab ? (
                    <a
                      href={recommendedLabHref}
                      aria-label={recommendedDisplayCopy?.accessibleTitle}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                        if (isPremiumThreeDTopicPageLab(recommendedLab)) return;
                        event.preventDefault();
                        selectDirectoryLab(recommendedLab, "next-up-card");
                      }}
                      data-viz-next-up-card
                      data-viz-next-up-progress-based={String(recommendedLabIsProgressBased)}
                      data-viz-recommended-lab-id={recommendedLab.labId}
                      className="focus-ring group relative flex w-full flex-col justify-between gap-4 rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-5 pt-6 transition hover:-translate-y-0.5 hover:border-blue-400 dark:border-blue-400/30 dark:bg-blue-950/40 dark:hover:border-blue-300/60 lg:w-[24rem] lg:shrink-0"
                    >
                      <span className="absolute -top-3 left-5 inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-black leading-none text-white shadow-md shadow-blue-600/30">
                        {nextUpLabel}
                      </span>
                      <span className="flex items-start gap-3">
                        <span aria-hidden="true" className={cn("leading-none", youngLearnerMode ? "text-4xl" : "text-3xl")}>
                          {labTileEmojiForLab(recommendedLab)}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block break-words font-bold leading-snug text-[#15245a] [overflow-wrap:anywhere] group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-200",
                              youngLearnerMode ? "text-lg" : ""
                            )}
                          >
                            {recommendedDisplayCopy?.title}
                          </span>
                          {recommendedDisplayCopy?.disambiguator ? (
                            <span
                              data-viz-display-disambiguator
                              className="mt-1.5 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[0.68rem] font-black leading-none text-amber-900 dark:bg-amber-300/15 dark:text-amber-100"
                            >
                              {recommendedDisplayCopy.disambiguator}
                            </span>
                          ) : null}
                          <span className={cn("mt-1 block font-bold text-slate-600 dark:text-slate-300", youngLearnerMode ? "text-base leading-7" : "text-sm leading-6")}>
                            {recommendedLabIsProgressBased ? nextUpProgressHint : (
                              <span className="line-clamp-2">{displayCatalogText(text(recommendedLab.description))}</span>
                            )}
                          </span>
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {youngLearnerMode
                          ? null
                          : labTileStandardIds(recommendedLab).slice(0, 3).map((standardId) => (
                              <span key={standardId} className={labStandardChipClass}>
                                {standardId}
                              </span>
                            ))}
                        <span
                          className={cn(
                            "ml-auto inline-flex shrink-0 items-center gap-1.5 font-black text-blue-700 transition group-hover:translate-x-0.5 dark:text-blue-300",
                            youngLearnerMode ? "text-base" : "text-sm"
                          )}
                        >
                          {continueLabel}
                          <span aria-hidden="true">▶</span>
                        </span>
                      </span>
                    </a>
                  ) : null}
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

                {currentUser && missionTotalCount > 0 ? (
                  <div
                    className="mb-6"
                    data-viz-mission-strip
                    data-viz-mission-strip-total={missionTotalCount}
                    data-viz-mission-strip-explored={missionExploredCount}
                  >
                    <div className="mb-2.5 flex items-center gap-3">
                      <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {missionStripLabel}
                      </h2>
                      <span aria-hidden="true" className="h-px flex-1 bg-slate-100 dark:bg-white/10" />
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {missionExploredCount}/{missionTotalCount}
                      </span>
                    </div>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1.5 [scrollbar-width:thin]">
                      {visibleLabs.map((lab) => {
                        const explored = exploredSessionIds.has(buildVisualizationSessionModuleId(lab));
                        const isRecommended = recommendedLab?.labId === lab.labId;
                        const displayCopy = displayLabCopy(lab, true);
                        return (
                          <a
                            key={lab.labId}
                            href={buildVisualizationLabHref(lab, effectiveTrackFilter)}
                            onClick={(event) => {
                              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                              if (isPremiumThreeDTopicPageLab(lab)) return;
                              event.preventDefault();
                              selectDirectoryLab(lab, "mission-strip");
                            }}
                            data-viz-mission-strip-lab={lab.labId}
                            data-viz-mission-strip-lab-explored={String(explored)}
                            title={displayCopy.accessibleTitle}
                            className={cn(
                              "focus-ring group inline-flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold transition hover:-translate-y-0.5",
                              explored
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-100"
                                : isRecommended
                                  ? "border-blue-300 bg-blue-50 text-blue-800 ring-1 ring-blue-300 dark:border-blue-400/40 dark:bg-blue-950/50 dark:text-blue-100 dark:ring-blue-400/40"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20"
                            )}
                          >
                            <span aria-hidden="true" className="text-base leading-none">
                              {labTileEmojiForLab(lab)}
                            </span>
                            <span className="max-w-[9rem] truncate">
                              {displayCopy.title}
                            </span>
                            {displayCopy.disambiguator ? (
                              <span
                                data-viz-display-disambiguator
                                className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[0.65rem] font-black leading-none text-amber-900 dark:bg-amber-300/15 dark:text-amber-100"
                              >
                                {displayCopy.disambiguator}
                              </span>
                            ) : null}
                            <span
                              aria-hidden="true"
                              className={cn(
                                "text-xs font-black",
                                explored ? "text-emerald-600 dark:text-emerald-300" : "text-slate-400 dark:text-slate-500"
                              )}
                            >
                              {explored ? "✓" : "▶"}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                  <h2 className="text-2xl font-black tracking-tight text-[#15245a] dark:text-white">
                    {chooseLabTitle}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      data-viz-grade-context-badge
                      data-viz-grade-context-mode={browsingOtherGrade ? "browsing" : "current"}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-xs font-black shadow-sm",
                        browsingOtherGrade
                          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200"
                          : "border-slate-200 bg-white text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300"
                      )}
                    >
                      {browsingOtherGrade
                        ? t({ en: "Browsing", zh: "正在瀏覽", zhHans: "正在浏览" })
                        : t({ en: "Current grade", zh: "當前年級", zhHans: "当前年级" })}{" "}
                      <span className={cn("ml-1", browsingOtherGrade ? "text-amber-900 dark:text-amber-100" : "text-emerald-600 dark:text-emerald-400")}>{activeGradeLabel}</span>
                    </span>
                    {currentCurriculumLabel ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-black text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200">
                        {currentCurriculumLabel}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-black text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-200">
                      {visibleLabs.length} {t(dictionary.common.labs)}
                    </span>
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
                          "focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-black leading-none transition hover:-translate-y-0.5",
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

                <div
                  className="-mx-4 mt-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 sm:[-webkit-mask-image:none] sm:[mask-image:none]"
                  aria-label={t({ en: "Select grade", zh: "選擇年級", zhHans: "选择年级" })}
                >
                  {ownGrade ? (
                    <>
                      <GradeChip
                        active={activeDirectoryGroup?.grade === ownGrade}
                        grade={ownGrade}
                        hasLabs={Boolean(ownGradeGroup)}
                        href={buildControlPanelHref({
                          grade: ownGrade,
                          track: effectiveTrackFilter
                        })}
                        label={displayGradeChipLabel(ownGrade)}
                        large={youngLearnerMode}
                        pinned
                        pinnedLabel={yourGradeLabel}
                        onClick={() => {
                          if (ownGradeGroup) selectDirectoryGrade(ownGradeGroup, "grade-rail-pinned");
                        }}
                      />
                      <span aria-hidden="true" className="h-8 w-px shrink-0 self-center bg-slate-200 dark:bg-white/10" />
                    </>
                  ) : null}
                  {gradeIds.filter((grade) => grade !== ownGrade).map((grade) => {
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
                        large={youngLearnerMode}
                        onClick={() => {
                          if (group) selectDirectoryGrade(group, "grade-rail");
                        }}
                      />
                    );
                  })}
                  {showBackToMyGrade && ownGrade && ownGradeGroup ? (
                    <a
                      href={buildControlPanelHref({
                        grade: ownGrade,
                        track: effectiveTrackFilter
                      })}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                        event.preventDefault();
                        selectDirectoryGrade(ownGradeGroup, "back-to-my-grade");
                      }}
                      data-viz-back-to-my-grade
                      data-viz-back-to-my-grade-target={ownGrade}
                      className={cn(
                        "focus-ring inline-flex shrink-0 snap-start items-center gap-1.5 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 font-black leading-none text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100 dark:border-emerald-400/40 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50 sm:ml-auto",
                        youngLearnerMode ? "h-14 px-5 text-base" : "h-12 px-4 text-sm"
                      )}
                    >
                      <span aria-hidden="true">↩</span>
                      {backToMyGradeLabel}
                    </a>
                  ) : null}
                </div>

                <div ref={labGridRef} className="scroll-mt-24">
                  {visibleLabs.length > 0 ? (
                    <div className="mt-6 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {visibleLabs.map((lab) => {
                        const displayCopy = displayLabCopy(lab, true);
                        return (
                          <LabTile
                            key={lab.labId}
                            active={activeDirectoryLab?.labId === lab.labId}
                            categoryChipLabel={displayCatalogText(text(lab.category))}
                            description={displayCatalogText(text(lab.description))}
                            displayDisambiguator={displayCopy.disambiguator}
                            emoji={labTileEmojiForLab(lab)}
                            gradeBadgeLabel={displayGradeChipLabel(lab.grade)}
                            isExplored={exploredSessionIds.has(buildVisualizationSessionModuleId(lab))}
                            lab={lab}
                            href={buildVisualizationLabHref(lab, effectiveTrackFilter)}
                            onOpen={() => selectDirectoryLab(lab, "lab-tile")}
                            recommended={recommendedLab?.labId === lab.labId}
                            recommendedLabel={tryThisLabel}
                            exploredLabel={exploredLabel}
                            readyLabel={readyLabel}
                            title={displayCopy.title}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5">
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{emptyStateText}</p>
                      {ownGrade && ownGradeGroup && activeDirectoryGroup?.grade !== ownGrade ? (
                        <a
                          href={buildControlPanelHref({
                            grade: ownGrade,
                            track: effectiveTrackFilter
                          })}
                          onClick={(event) => {
                            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                            event.preventDefault();
                            selectDirectoryGrade(ownGradeGroup, "empty-state");
                          }}
                          data-viz-switch-to-my-grade
                          className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-emerald-600/25 transition hover:-translate-y-0.5 hover:bg-emerald-500"
                        >
                          <span aria-hidden="true">↩</span>
                          {backToMyGradeLabel}
                        </a>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : activeDirectoryLab && ActiveDirectoryLabComponent && activeDirectorySessionModuleId ? (
            <section
              data-lab-id={activeDirectoryLab.labId}
              data-viz-current-grade={activeDirectoryLab.grade}
              data-viz-current-track={activeDirectoryLab.curriculumTrack}
              data-viz-direct-lab-href={activeDirectoryLabHref ?? ""}
              data-viz-copy-controls-ready={String(isHydrated)}
              className="rounded-[1.35rem] bg-white p-4 shadow-2xl shadow-cyan-900/15 ring-1 ring-cyan-100 dark:bg-slate-950 dark:shadow-black/30 dark:ring-white/10 sm:p-7"
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
                    className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-white/10"
                  >
                    ← {backToLabsLabel}
                  </a>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 dark:border-blue-200/20 dark:bg-blue-300/10 dark:text-blue-100">
                    {displayLabGradeLabel(activeDirectoryLab)}
                  </span>
                  {activeDirectoryDisplayCopy?.disambiguator ? (
                    <span
                      data-viz-display-disambiguator
                      className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 dark:border-amber-200/20 dark:bg-amber-300/10 dark:text-amber-100"
                    >
                      {activeDirectoryDisplayCopy.disambiguator}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={copyActiveLabLink}
                    disabled={!isHydrated || !activeLabCanDistribute}
                    aria-disabled={!isHydrated || !activeLabCanDistribute}
                    data-viz-copy-lab-link
                    data-viz-copy-lab-link-state={shareState}
                    data-viz-copy-lab-link-safeguard-status={activeLabSafeguardStatus}
                    className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-700 dark:border-cyan-200/20 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:bg-cyan-300/20 dark:disabled:border-slate-600 dark:disabled:bg-slate-800 dark:disabled:text-slate-200"
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
                    className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-700 dark:border-violet-200/20 dark:bg-violet-300/10 dark:text-violet-100 dark:hover:bg-violet-300/20 dark:disabled:border-slate-600 dark:disabled:bg-slate-800 dark:disabled:text-slate-200"
                  >
                    {!activeLabCanDistribute || snapshotState === "blocked"
                      ? t({ en: "Approval required", zh: "需要批准", zhHans: "需要批准" })
                      : snapshotState === "copied"
                      ? t({ en: "Snapshot copied", zh: "快照已複製", zhHans: "快照已复制" })
                      : t({ en: "Copy snapshot", zh: "複製快照", zhHans: "复制快照" })}
                  </button>
                  {shareState === "error" ? (
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-300" role="status">
                      {t({ en: "Use the address bar link.", zh: "請使用網址列連結。", zhHans: "请使用地址栏链接。" })}
                    </span>
                  ) : null}
                  {snapshotState === "error" ? (
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-300" role="status">
                      {t({ en: "Snapshot unavailable.", zh: "未能複製快照。", zhHans: "未能复制快照。" })}
                    </span>
                  ) : null}
                </div>
              </div>

              <div
                data-viz-lab-workspace
                className="min-w-0 [&_a[role=button]]:inline-flex [&_a[role=button]]:min-h-11 [&_a[role=button]]:min-w-11 [&_button]:min-h-11 [&_button]:min-w-11 [&_input:not([type=range])]:min-h-11 [&_input:not([type=range])]:min-w-11 [&_input[type=range]]:min-h-11 [&_input[type=range]]:min-w-0 [&_[role=slider]]:min-h-11 [&_[role=slider]]:min-w-11 [&_select]:min-h-11 [&_select]:min-w-11"
              >
                <VisualizationCard
                  accessibleTitle={
                    activeDirectoryDisplayCopy?.accessibleTitle ??
                    displayCatalogText(text(activeDirectoryLab.title))
                  }
                  title={activeDirectoryDisplayCopy?.title ?? displayCatalogText(text(activeDirectoryLab.title))}
                  analyticsSource={activeDirectoryLab.analyticsSource}
                  autoExplore={activeLabRuntimeReadyId === activeDirectoryLab.labId}
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
                  {activeSignatureAssignment ? (
                    <SignatureBenchSwitcher
                      key={activeDirectoryLab.topicId}
                      assignment={activeSignatureAssignment}
                      lab={activeDirectoryLab}
                      topicId={activeDirectoryLab.topicId}
                      labId={activeDirectoryLab.labId}
                      labelForBench={(benchId, benchIndex) =>
                        signatureBenchLabel(benchId, language, benchIndex + 1)
                      }
                      primaryBenchLabel={t({ en: "primary", zh: "主要", zhHans: "主要" })}
                      relatedLabsLabel={t({
                        en: "Related labs for this topic",
                        zh: "此主題的相關實驗",
                        zhHans: "此主题的相关实验"
                      })}
                      onRuntimeReady={handleActiveLabRuntimeReady}
                      onBenchSwitch={(benchId) => recordVisualizationNavigationEvent("bench-switch", benchId)}
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
