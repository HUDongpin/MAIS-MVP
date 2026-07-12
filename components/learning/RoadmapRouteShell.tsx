"use client";

import dynamic from "next/dynamic";

type RoadmapRouteKind = "student" | "primary" | "secondary";

const StudentRoadmapPage = dynamic(
  () => import("@/components/learning/StudentRoadmapPage").then((module) => module.StudentRoadmapPage),
  { loading: () => <RoadmapRouteLoading label="Learning roadmap" />, ssr: false }
);

const PrimaryRoadmapPage = dynamic(
  () => import("@/components/learning/PrimaryRoadmapPage").then((module) => module.PrimaryRoadmapPage),
  { loading: () => <RoadmapRouteLoading label="Primary roadmap" />, ssr: false }
);

const SecondaryRoadmapPage = dynamic(
  () => import("@/components/learning/SecondaryRoadmapPage").then((module) => module.SecondaryRoadmapPage),
  { loading: () => <RoadmapRouteLoading label="Secondary roadmap" />, ssr: false }
);

function RoadmapRouteLoading({ label }: { label: string }) {
  return (
    <div className="page-container py-10 sm:py-12" data-roadmap-route-loading>
      <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-500 dark:text-cyan-300">{label}</p>
      <div className="mt-6 h-[34rem] animate-pulse rounded-2xl border border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-white/[0.055]" />
    </div>
  );
}

export function RoadmapRouteShell({ kind }: { kind: RoadmapRouteKind }) {
  if (kind === "primary") return <PrimaryRoadmapPage />;
  if (kind === "secondary") return <SecondaryRoadmapPage />;
  return <StudentRoadmapPage />;
}
