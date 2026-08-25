import type { MathSceneCaptionSpec, MathSceneSpec } from "./mathSceneTypes";

export const MATH_SCENE_CAPTION_SOURCE_CONTRACT =
  "Teaching subtitles: select at most one caption by deterministic scene time, with compact mobile wording" as const;

export type ActiveMathSceneCaption = MathSceneCaptionSpec & {
  progress: number;
  sourceContract: typeof MATH_SCENE_CAPTION_SOURCE_CONTRACT;
};

export type ActiveMathSceneCaptionInput = {
  elapsedSeconds: number;
  viewportWidth: number;
};

function finiteNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function activeMathSceneCaption(
  scene: MathSceneSpec,
  { elapsedSeconds, viewportWidth }: ActiveMathSceneCaptionInput
): ActiveMathSceneCaption | null {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return null;

  const captions = scene.captions ?? [];
  const elapsed = finiteNumber(elapsedSeconds);
  const caption = captions.find((candidate) =>
    elapsed >= candidate.startSeconds && elapsed < candidate.endSeconds
  );
  if (!caption) return null;

  const duration = Math.max(0.001, caption.endSeconds - caption.startSeconds);
  const text = viewportWidth < 640 && caption.mobileText
    ? caption.mobileText
    : caption.text;

  return {
    ...caption,
    ariaLabel: caption.ariaLabel ?? `Teaching subtitle: ${text}`,
    progress: clamp01((elapsed - caption.startSeconds) / duration),
    sourceContract: MATH_SCENE_CAPTION_SOURCE_CONTRACT,
    text
  };
}
