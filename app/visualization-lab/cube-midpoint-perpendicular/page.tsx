import type { Metadata } from "next";
import { CubeMidpointPerpendicularLab } from "@/components/visualizations/CubeMidpointPerpendicularLab";
import type { MathKernelLocale } from "@/components/visualizations/three/manim/mathKernelSceneAdapter";
import { buildCubeMidpointPerpendicularProof } from "@/lib/math-kernel/demo/cubeMidpointPerpendicular.server";

type CubeMidpointPerpendicularPageProps = {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Cube midpoint-plane perpendicular proof | MAIS",
  description: "An interactive coordinate-vector proof that DB₁ is perpendicular to plane EFG.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function localeFrom(value: string | undefined): MathKernelLocale {
  return value === "zh-CN" || value === "zh-HK" || value === "en"
    ? value
    : "zh-CN";
}

export default async function CubeMidpointPerpendicularPage({
  searchParams,
}: CubeMidpointPerpendicularPageProps) {
  const params = await searchParams;
  const proof = buildCubeMidpointPerpendicularProof();
  if (!proof.ok) {
    throw new Error(`Cube midpoint-plane proof unavailable: ${proof.error.code}`);
  }

  return (
    <CubeMidpointPerpendicularLab
      payload={proof.value}
      initialLocale={localeFrom(first(params?.locale))}
    />
  );
}
