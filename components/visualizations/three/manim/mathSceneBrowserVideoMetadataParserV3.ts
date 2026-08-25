import type { MathSceneWebmParsedVideoMetadata } from "./mathSceneWebmMediaEvidence";

export const MATH_SCENE_BROWSER_VIDEO_METADATA_PARSER_V3_CONTRACT =
  "WebM metadata is accepted only after a hidden browser video element decodes a temporary object URL; every path removes listeners, clears src, and revokes the URL." as const;

export type MathSceneBrowserVideoElementV3 = {
  audioTracks?: { length: number };
  duration: number;
  muted: boolean;
  playsInline: boolean;
  preload: string;
  src: string;
  style: { display: string };
  videoHeight: number;
  videoWidth: number;
  addEventListener: (
    type: "error" | "loadedmetadata",
    listener: () => void
  ) => void;
  load: () => void;
  pause: () => void;
  removeAttribute: (name: "src") => void;
  removeEventListener: (
    type: "error" | "loadedmetadata",
    listener: () => void
  ) => void;
};

export type MathSceneBrowserVideoMetadataAdapterV3 = {
  clearTimeout: (handle: unknown) => void;
  createObjectURL: (blob: Blob) => string;
  createVideoElement: () => MathSceneBrowserVideoElementV3;
  revokeObjectURL: (url: string) => void;
  setTimeout: (callback: () => void, timeoutMs: number) => unknown;
};

export type MathSceneBrowserVideoMetadataParserOptionsV3 = {
  abortSignal?: AbortSignal;
  adapter?: MathSceneBrowserVideoMetadataAdapterV3;
  timeoutMs?: number;
};

function createDefaultAdapter(): MathSceneBrowserVideoMetadataAdapterV3 {
  if (
    typeof document === "undefined" ||
    typeof document.createElement !== "function" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof URL.revokeObjectURL !== "function"
  ) {
    throw new Error("Browser video metadata parsing is unavailable in this environment.");
  }

  return {
    clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
    createObjectURL: (blob) => URL.createObjectURL(blob),
    createVideoElement: () => document.createElement("video"),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    setTimeout: (callback, timeoutMs) => globalThis.setTimeout(callback, timeoutMs)
  };
}

function validMetadata(video: MathSceneBrowserVideoElementV3): video is MathSceneBrowserVideoElementV3 & {
  duration: number;
  videoHeight: number;
  videoWidth: number;
} {
  return Number.isFinite(video.duration) &&
    video.duration > 0 &&
    Number.isInteger(video.videoWidth) &&
    video.videoWidth > 0 &&
    Number.isInteger(video.videoHeight) &&
    video.videoHeight > 0;
}

export async function parseMathSceneBrowserVideoMetadataV3(
  blob: Blob,
  {
    abortSignal,
    adapter,
    timeoutMs = 8_000
  }: MathSceneBrowserVideoMetadataParserOptionsV3 = {}
): Promise<MathSceneWebmParsedVideoMetadata> {
  if (!(blob instanceof Blob) || blob.size <= 0) {
    throw new TypeError("Video metadata parsing requires a non-empty Blob.");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("Video metadata timeout must be positive and finite.");
  }
  if (abortSignal?.aborted) {
    throw new Error("Browser video metadata parsing was aborted.");
  }

  const browser = adapter ?? createDefaultAdapter();
  let objectUrl: string | null = null;
  let video: MathSceneBrowserVideoElementV3 | null = null;

  try {
    objectUrl = browser.createObjectURL(blob);
    if (typeof objectUrl !== "string" || objectUrl.length === 0) {
      throw new Error("Browser did not create a video metadata object URL.");
    }
    video = browser.createVideoElement();
    if (
      !video ||
      typeof video !== "object" ||
      !video.style ||
      typeof video.addEventListener !== "function" ||
      typeof video.removeEventListener !== "function" ||
      typeof video.load !== "function" ||
      typeof video.pause !== "function" ||
      typeof video.removeAttribute !== "function"
    ) {
      throw new TypeError("Browser returned no usable video element.");
    }
  } catch {
    if (objectUrl) {
      try {
        browser.revokeObjectURL(objectUrl);
      } catch {
        // The allocation path is already failing; cleanup remains best effort.
      }
    }
    throw new Error("Browser could not prepare WebM metadata parsing.");
  }

  const allocatedUrl = objectUrl;
  const allocatedVideo = video;
  try {
    allocatedVideo.preload = "metadata";
    allocatedVideo.muted = true;
    allocatedVideo.playsInline = true;
    allocatedVideo.style.display = "none";
  } catch {
    try {
      browser.revokeObjectURL(allocatedUrl);
    } catch {
      // The URL is not retained by this module.
    }
    throw new Error("Browser could not prepare WebM metadata parsing.");
  }

  return await new Promise<MathSceneWebmParsedVideoMetadata>((resolve, reject) => {
    let settled = false;
    let timeoutHandle: unknown;

    const cleanup = () => {
      try {
        browser.clearTimeout(timeoutHandle);
      } catch {
        // Timer cleanup cannot change the metadata verdict.
      }
      try {
        allocatedVideo.removeEventListener("loadedmetadata", handleMetadata);
        allocatedVideo.removeEventListener("error", handleError);
        abortSignal?.removeEventListener("abort", handleAbort);
      } catch {
        // Continue to clearing src and revoking the object URL.
      }
      try {
        allocatedVideo.pause();
      } catch {
        // A detached video element can reject pause in privacy modes.
      }
      try {
        allocatedVideo.removeAttribute("src");
        allocatedVideo.load();
      } catch {
        // Clearing the reference and revoking its URL are the essential cleanup.
      }
      try {
        browser.revokeObjectURL(allocatedUrl);
      } catch {
        // Object URLs are not retained by this module even if the host throws.
      }
    };

    const finish = (
      outcome:
        | { metadata: MathSceneWebmParsedVideoMetadata; ok: true }
        | { error: Error; ok: false }
    ) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (outcome.ok) resolve(outcome.metadata);
      else reject(outcome.error);
    };

    function handleMetadata() {
      if (!validMetadata(allocatedVideo)) {
        finish({ error: new Error("Browser returned invalid video metadata."), ok: false });
        return;
      }
      finish({
        metadata: {
          audioTrackCount: allocatedVideo.audioTracks && Number.isInteger(allocatedVideo.audioTracks.length)
            ? allocatedVideo.audioTracks.length
            : null,
          durationSeconds: allocatedVideo.duration,
          height: allocatedVideo.videoHeight,
          width: allocatedVideo.videoWidth
        },
        ok: true
      });
    }

    function handleError() {
      finish({ error: new Error("Browser could not decode WebM metadata."), ok: false });
    }

    function handleAbort() {
      finish({ error: new Error("Browser video metadata parsing was aborted."), ok: false });
    }

    try {
      allocatedVideo.addEventListener("loadedmetadata", handleMetadata);
      allocatedVideo.addEventListener("error", handleError);
      abortSignal?.addEventListener("abort", handleAbort, { once: true });
      if (abortSignal?.aborted) {
        handleAbort();
        return;
      }
      timeoutHandle = browser.setTimeout(() => {
        finish({ error: new Error("Browser video metadata parsing timed out."), ok: false });
      }, timeoutMs);
      allocatedVideo.src = allocatedUrl;
      allocatedVideo.load();
    } catch {
      finish({ error: new Error("Browser could not start WebM metadata parsing."), ok: false });
    }
  });
}
