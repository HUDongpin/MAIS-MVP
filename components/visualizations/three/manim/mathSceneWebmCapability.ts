import type {
  MathSceneVideoExportError,
  MathSceneWebmMimeType
} from "./mathSceneVideoExportContract";

export const MATH_SCENE_WEBM_MIME_PREFERENCE = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm"
] as const satisfies readonly MathSceneWebmMimeType[];

export const MATH_SCENE_LOCAL_MP4_FALLBACK = {
  format: "mp4",
  locality: "local-only",
  requiresSeparateExecutor: true
} as const;

export type MathSceneCanvasCaptureStreamProbe = {
  captureStream?: (fps: number) => unknown;
};

export type MathSceneMediaRecorderProbe = {
  construct?: (stream: unknown, options: { mimeType: MathSceneWebmMimeType }) => unknown;
  isTypeSupported?: (mimeType: MathSceneWebmMimeType) => boolean;
};

export type MathSceneWebmCapabilityAdapter = {
  canvas: MathSceneCanvasCaptureStreamProbe | null;
  mediaRecorder: MathSceneMediaRecorderProbe | null;
  releaseProbe?: (probe: { recorder: unknown | null; stream: unknown | null }) => void;
};

export type MathSceneWebmCapabilityResult =
  | {
      constructorFailures: MathSceneWebmMimeType[];
      localMp4Fallback: typeof MATH_SCENE_LOCAL_MP4_FALLBACK;
      mimeType: MathSceneWebmMimeType;
      supported: true;
    }
  | {
      constructorFailures: MathSceneWebmMimeType[];
      localMp4Fallback: typeof MATH_SCENE_LOCAL_MP4_FALLBACK;
      reason: MathSceneVideoExportError;
      supported: false;
    };

function unsupported(
  code: Extract<
    MathSceneVideoExportError["code"],
    | "CAPTURE_PLAN_INVALID"
    | "CANVAS_CAPTURE_STREAM_UNAVAILABLE"
    | "MEDIA_RECORDER_UNAVAILABLE"
    | "MEDIA_RECORDER_IS_TYPE_SUPPORTED_UNAVAILABLE"
    | "MEDIA_RECORDER_MIME_UNSUPPORTED"
    | "MEDIA_RECORDER_CONSTRUCTOR_FAILED"
  >,
  message: string,
  path: string,
  constructorFailures: MathSceneWebmMimeType[] = []
): MathSceneWebmCapabilityResult {
  return {
    constructorFailures,
    localMp4Fallback: MATH_SCENE_LOCAL_MP4_FALLBACK,
    reason: { code, message, path },
    supported: false
  };
}

function releaseProbe(
  adapter: MathSceneWebmCapabilityAdapter,
  stream: unknown | null,
  recorder: unknown | null
) {
  try {
    adapter.releaseProbe?.({ recorder, stream });
  } catch {
    // Capability cleanup must not turn a truthful probe result into a throw.
  }
}

export function probeMathSceneWebmCapability({
  adapter,
  fps
}: {
  adapter: MathSceneWebmCapabilityAdapter;
  fps: number;
}): MathSceneWebmCapabilityResult {
  if (!Number.isInteger(fps) || fps <= 0) {
    return unsupported("CAPTURE_PLAN_INVALID", "Capability probe fps must be a positive integer.", "fps");
  }
  if (!adapter.canvas || typeof adapter.canvas.captureStream !== "function") {
    return unsupported(
      "CANVAS_CAPTURE_STREAM_UNAVAILABLE",
      "Canvas captureStream is unavailable.",
      "canvas.captureStream"
    );
  }
  if (!adapter.mediaRecorder || typeof adapter.mediaRecorder.construct !== "function") {
    return unsupported("MEDIA_RECORDER_UNAVAILABLE", "MediaRecorder is unavailable.", "MediaRecorder");
  }
  if (typeof adapter.mediaRecorder.isTypeSupported !== "function") {
    return unsupported(
      "MEDIA_RECORDER_IS_TYPE_SUPPORTED_UNAVAILABLE",
      "MediaRecorder.isTypeSupported is unavailable.",
      "MediaRecorder.isTypeSupported"
    );
  }

  const supportedMimeTypes: MathSceneWebmMimeType[] = [];
  try {
    for (const mimeType of MATH_SCENE_WEBM_MIME_PREFERENCE) {
      if (adapter.mediaRecorder.isTypeSupported(mimeType)) supportedMimeTypes.push(mimeType);
    }
  } catch {
    return unsupported(
      "MEDIA_RECORDER_IS_TYPE_SUPPORTED_UNAVAILABLE",
      "MediaRecorder MIME support probing failed safely.",
      "MediaRecorder.isTypeSupported"
    );
  }

  if (supportedMimeTypes.length === 0) {
    return unsupported(
      "MEDIA_RECORDER_MIME_UNSUPPORTED",
      "No supported WebM MediaRecorder MIME type was found.",
      "mimeType"
    );
  }

  const constructorFailures: MathSceneWebmMimeType[] = [];
  for (const mimeType of supportedMimeTypes) {
    let stream: unknown | null = null;
    let recorder: unknown | null = null;
    try {
      stream = adapter.canvas.captureStream(fps);
      if (stream === null || stream === undefined) {
        releaseProbe(adapter, stream, recorder);
        return unsupported(
          "CANVAS_CAPTURE_STREAM_UNAVAILABLE",
          "Canvas captureStream did not return a stream.",
          "canvas.captureStream",
          constructorFailures
        );
      }
    } catch {
      releaseProbe(adapter, stream, recorder);
      return unsupported(
        "CANVAS_CAPTURE_STREAM_UNAVAILABLE",
        "Canvas captureStream probe failed safely.",
        "canvas.captureStream",
        constructorFailures
      );
    }

    try {
      recorder = adapter.mediaRecorder.construct(stream, { mimeType });
      if (recorder === null || recorder === undefined) throw new TypeError("MediaRecorder probe returned no recorder.");
      releaseProbe(adapter, stream, recorder);
      return {
        constructorFailures,
        localMp4Fallback: MATH_SCENE_LOCAL_MP4_FALLBACK,
        mimeType,
        supported: true
      };
    } catch {
      constructorFailures.push(mimeType);
      releaseProbe(adapter, stream, recorder);
    }
  }

  return unsupported(
    "MEDIA_RECORDER_CONSTRUCTOR_FAILED",
    "Every supported WebM MediaRecorder constructor probe failed.",
    "MediaRecorder",
    constructorFailures
  );
}
