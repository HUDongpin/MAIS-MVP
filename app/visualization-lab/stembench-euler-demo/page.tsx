import Link from "next/link";
import { StembenchEulerLineDemo } from "@/components/visualizations/StembenchEulerLineDemo";
import { studentVisualizationToolsPath } from "@/lib/visualizationRoutes";

export default function StembenchEulerDemoPage() {
  return (
    <div
      data-stembench-immersive-route="true"
      className="min-h-screen bg-slate-950 px-4 py-5 sm:px-6 lg:px-8"
      style={{
        background: "#020617",
        inset: 0,
        overflowY: "auto",
        position: "fixed",
        zIndex: 2147483000
      }}
    >
      <style>
        {`
          body:has([data-stembench-immersive-route="true"]) button[aria-labelledby="ai-tutor-launcher-label"],
          body:has([data-stembench-immersive-route="true"]) [data-ai-tutor-panel="true"] {
            display: none !important;
          }
        `}
      </style>
      <div className="mx-auto mb-5 flex w-full max-w-[1500px] items-center justify-between gap-4">
        <Link
          href={studentVisualizationToolsPath}
          className="rounded-lg border border-sky-300/25 px-3 py-2 text-sm font-bold text-sky-100 transition hover:bg-sky-300/10 focus:outline-none focus:ring-2 focus:ring-sky-200"
        >
          Back to Visualization Lab
        </Link>
        <p className="hidden text-right font-mono text-xs uppercase tracking-[0.18em] text-sky-200/55 sm:block">
          STEMBENCH-style SVG demo
        </p>
      </div>
      <StembenchEulerLineDemo />
    </div>
  );
}
