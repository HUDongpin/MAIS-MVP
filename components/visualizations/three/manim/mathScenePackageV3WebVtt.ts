import {
  MATH_SCENE_PACKAGE_V3_MAX_CAPTION_CUES,
  MATH_SCENE_PACKAGE_V3_MAX_DURATION_SECONDS,
  type MathSceneCaptionCue,
  type MathScenePackageV3Locale
} from "./mathScenePackageV3";

export class MathScenePackageV3WebVttError extends Error {
  readonly code:
    | "CAPTION_CUES_NOT_MONOTONIC"
    | "CAPTION_CUE_COUNT_INVALID"
    | "CAPTION_CUE_IDENTIFIER_INVALID"
    | "CAPTION_CUE_TIME_INVALID"
    | "CAPTION_TEXT_EMPTY";

  constructor(
    code: MathScenePackageV3WebVttError["code"],
    message: string
  ) {
    super(message);
    this.name = "MathScenePackageV3WebVttError";
    this.code = code;
  }
}

function timestamp(milliseconds: number) {
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((milliseconds % 60_000) / 1_000);
  const remainder = milliseconds % 1_000;

  return [hours, minutes, wholeSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":") + `.${String(remainder).padStart(3, "0")}`;
}

function safeCueText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .filter((line, index, lines) => line.trim().length > 0 || (index > 0 && lines[index - 1]?.trim().length > 0))
    .join("\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function buildMathScenePackageV3WebVtt(
  cues: readonly MathSceneCaptionCue[],
  locale: MathScenePackageV3Locale
) {
  if (!Array.isArray(cues) || cues.length > MATH_SCENE_PACKAGE_V3_MAX_CAPTION_CUES) {
    throw new MathScenePackageV3WebVttError(
      "CAPTION_CUE_COUNT_INVALID",
      "Caption cue count exceeds the bounded WebVTT export limit."
    );
  }
  let previousEndMilliseconds = 0;
  const blocks: string[] = [];
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    const startMilliseconds = Math.round(cue.startSeconds * 1_000);
    const endMilliseconds = Math.round(cue.endSeconds * 1_000);
    if (
      !Number.isFinite(cue.startSeconds) ||
      !Number.isFinite(cue.endSeconds) ||
      cue.startSeconds < 0 ||
      cue.endSeconds <= cue.startSeconds ||
      cue.startSeconds > MATH_SCENE_PACKAGE_V3_MAX_DURATION_SECONDS ||
      cue.endSeconds > MATH_SCENE_PACKAGE_V3_MAX_DURATION_SECONDS ||
      !Number.isSafeInteger(startMilliseconds) ||
      !Number.isSafeInteger(endMilliseconds) ||
      endMilliseconds <= startMilliseconds
    ) {
      throw new MathScenePackageV3WebVttError(
        "CAPTION_CUE_TIME_INVALID",
        `Caption cue time is invalid at index ${index}.`
      );
    }
    if (index > 0 && startMilliseconds < previousEndMilliseconds) {
      throw new MathScenePackageV3WebVttError(
        "CAPTION_CUES_NOT_MONOTONIC",
        `Caption cues are not monotonic at index ${index}.`
      );
    }
    if (
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(cue.beatId) ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(cue.conceptId)
    ) {
      throw new MathScenePackageV3WebVttError(
        "CAPTION_CUE_IDENTIFIER_INVALID",
        `Caption cue identifier is invalid at index ${index}.`
      );
    }

    const localizedText = cue.text?.[locale];
    const text = typeof localizedText === "string" ? safeCueText(localizedText) : "";
    if (text.length === 0) {
      throw new MathScenePackageV3WebVttError(
        "CAPTION_TEXT_EMPTY",
        `Caption text is empty at index ${index}.`
      );
    }

    previousEndMilliseconds = endMilliseconds;
    blocks.push([
      `${cue.beatId} ${cue.conceptId}`,
      `${timestamp(startMilliseconds)} --> ${timestamp(endMilliseconds)}`,
      text
    ].join("\n"));
  }

  return `WEBVTT\n\n${blocks.join("\n\n")}${blocks.length > 0 ? "\n" : ""}`;
}
