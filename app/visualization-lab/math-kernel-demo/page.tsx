import {
  MathKernelDemoLab,
  type MathKernelDemoScene,
} from "@/components/visualizations/MathKernelDemoLab";
import type { MathKernelLocale } from "@/components/visualizations/three/manim/mathKernelSceneAdapter";
import { buildMathKernelDemoPayload } from "@/lib/math-kernel/demo/mathKernelDemo.server";

type MathKernelDemoPageProps = {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function localeFrom(value: string | undefined): MathKernelLocale {
  return value === "zh-CN" || value === "zh-HK" || value === "en" ? value : "en";
}

function sceneFrom(value: string | undefined): MathKernelDemoScene {
  return value === "analytic" ? "analytic" : "geometry";
}

export default async function MathKernelDemoPage({
  searchParams,
}: MathKernelDemoPageProps) {
  const params = await searchParams;
  const payload = buildMathKernelDemoPayload();
  if (!payload.ok) {
    throw new Error(`Math-kernel demo unavailable: ${payload.error.code}`);
  }

  return (
    <MathKernelDemoLab
      payload={payload.value}
      initialLocale={localeFrom(first(params?.locale))}
      initialScene={sceneFrom(first(params?.scene))}
    />
  );
}
