"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useCallback, useState } from "react";
import VisualizationLabLoading from "@/components/visualizations/VisualizationLabLoading";
import { studentVisualizationToolsPath } from "@/lib/visualizationRoutes";
import type { GradeId } from "@/types";

type VisualizationLabRouteShellProps = {
  initialGrade?: GradeId | null;
  initialLabId?: string | null;
};
type VisualizationLabPageRouteShellProps = VisualizationLabRouteShellProps & {
  onRouteShellReady?: () => void;
  suppressLoadingWorkspaceSelector?: boolean;
};

function decodeRouteShellLabId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getRouteShellRequestedLabId(initialLabId: string | null | undefined) {
  if (initialLabId) return initialLabId;
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const queryLabId = params.get("lab");
  if (queryLabId) return queryLabId;

  const topicPathPrefix = `${studentVisualizationToolsPath}/`;
  if (!window.location.pathname.startsWith(topicPathPrefix)) return null;
  const routeLabId = window.location.pathname.slice(topicPathPrefix.length).split("/")[0];
  return routeLabId ? decodeRouteShellLabId(routeLabId) : null;
}

function VisualizationLabRouteLoadingShell({
  requestedLabId
}: {
  requestedLabId: string | null;
}) {
  return (
    <section
      aria-label="Visualization Lab workspace"
      data-viz-catalog-deferred
      data-viz-panel-mode="loading"
      data-viz-active-lab-id={requestedLabId ?? ""}
      data-viz-requested-lab-id={requestedLabId ?? ""}
    >
      <VisualizationLabLoading />
    </section>
  );
}

const VisualizationLabPage = dynamic<VisualizationLabPageRouteShellProps>(
  () => import("@/components/visualizations/VisualizationLabPage").then((module) => module.VisualizationLabPage as ComponentType<VisualizationLabPageRouteShellProps>),
  { loading: () => null, ssr: false }
);

export function VisualizationLabRouteShell(props: VisualizationLabRouteShellProps = {}) {
  const [pageMounted, setPageMounted] = useState(false);
  const requestedLabId = getRouteShellRequestedLabId(props.initialLabId);
  const handleRouteShellReady = useCallback(() => {
    setPageMounted(true);
  }, []);

  return (
    <>
      {pageMounted ? null : (
        <VisualizationLabRouteLoadingShell requestedLabId={requestedLabId} />
      )}
      <VisualizationLabPage {...props} onRouteShellReady={handleRouteShellReady} suppressLoadingWorkspaceSelector />
    </>
  );
}
