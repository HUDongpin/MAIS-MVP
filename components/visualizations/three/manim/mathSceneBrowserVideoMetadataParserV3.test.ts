import assert from "node:assert/strict";
import test from "node:test";
import {
  parseMathSceneBrowserVideoMetadataV3,
  type MathSceneBrowserVideoElementV3,
  type MathSceneBrowserVideoMetadataAdapterV3
} from "./mathSceneBrowserVideoMetadataParserV3";

type Listener = () => void;

class FakeVideoElement implements MathSceneBrowserVideoElementV3 {
  audioTracks: { length: number } | undefined;
  duration = 2;
  muted = false;
  playsInline = false;
  preload = "";
  src = "";
  style = { display: "block" };
  videoHeight = 720;
  videoWidth = 1280;
  readonly listeners = new Map<string, Set<Listener>>();
  loadCalls = 0;
  pauseCalls = 0;
  removedAttributes: string[] = [];
  onLoad: (() => void) | null = null;

  addEventListener(type: "loadedmetadata" | "error", listener: Listener) {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: "loadedmetadata" | "error", listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: "loadedmetadata" | "error") {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener();
  }

  load() {
    this.loadCalls += 1;
    this.onLoad?.();
  }

  pause() {
    this.pauseCalls += 1;
  }

  removeAttribute(name: "src") {
    this.removedAttributes.push(name);
    this.src = "";
  }
}

function harness({ timeoutImmediately = false }: { timeoutImmediately?: boolean } = {}) {
  const video = new FakeVideoElement();
  const revoked: string[] = [];
  const cleared: unknown[] = [];
  let timerId = 0;
  const adapter: MathSceneBrowserVideoMetadataAdapterV3 = {
    clearTimeout: (handle) => {
      cleared.push(handle);
    },
    createObjectURL: () => "blob:metadata-1",
    createVideoElement: () => video,
    revokeObjectURL: (url) => {
      revoked.push(url);
    },
    setTimeout: (callback) => {
      timerId += 1;
      if (timeoutImmediately) queueMicrotask(callback);
      return timerId;
    }
  };
  return { adapter, cleared, revoked, video };
}

function webm() {
  return new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1])], {
    type: "video/webm"
  });
}

test("parses real video-element metadata through a temporary object URL", async () => {
  const { adapter, cleared, revoked, video } = harness();
  video.onLoad = () => queueMicrotask(() => video.emit("loadedmetadata"));

  const metadata = await parseMathSceneBrowserVideoMetadataV3(webm(), {
    adapter,
    timeoutMs: 2_000
  });

  assert.deepEqual(metadata, { audioTrackCount: null, durationSeconds: 2, height: 720, width: 1280 });
  assert.equal(video.preload, "metadata");
  assert.equal(video.muted, true);
  assert.equal(video.playsInline, true);
  assert.equal(video.style.display, "none");
  assert.equal(video.loadCalls, 2, "cleanup reloads after removing src");
  assert.equal(video.pauseCalls, 1);
  assert.deepEqual(video.removedAttributes, ["src"]);
  assert.deepEqual(revoked, ["blob:metadata-1"]);
  assert.deepEqual(cleared, [1]);
  assert.equal(video.listeners.get("loadedmetadata")?.size, 0);
  assert.equal(video.listeners.get("error")?.size, 0);
});

test("reports an observed browser audio-track count when the media element exposes it", async () => {
  const { adapter, video } = harness();
  video.audioTracks = { length: 1 };
  video.onLoad = () => queueMicrotask(() => video.emit("loadedmetadata"));
  const metadata = await parseMathSceneBrowserVideoMetadataV3(webm(), { adapter });
  assert.equal(metadata.audioTrackCount, 1);
});

test("aborts metadata parsing promptly and revokes the temporary object URL", async () => {
  const controller = new AbortController();
  const { adapter, revoked, video } = harness();
  video.onLoad = () => queueMicrotask(() => controller.abort());
  await assert.rejects(
    parseMathSceneBrowserVideoMetadataV3(webm(), {
      abortSignal: controller.signal,
      adapter,
      timeoutMs: 8_000
    }),
    /aborted/i
  );
  assert.deepEqual(revoked, ["blob:metadata-1"]);
  assert.equal(video.pauseCalls, 1);
  assert.equal(video.listeners.get("loadedmetadata")?.size, 0);
});

test("rejects decode errors and still revokes the temporary URL", async () => {
  const { adapter, revoked, video } = harness();
  video.onLoad = () => queueMicrotask(() => video.emit("error"));

  await assert.rejects(
    parseMathSceneBrowserVideoMetadataV3(webm(), { adapter }),
    /decode WebM metadata/i
  );
  assert.deepEqual(revoked, ["blob:metadata-1"]);
  assert.equal(video.pauseCalls, 1);
  assert.equal(video.listeners.get("error")?.size, 0);
});

test("times out metadata parsing and cleans the video element", async () => {
  const { adapter, revoked, video } = harness({ timeoutImmediately: true });

  await assert.rejects(
    parseMathSceneBrowserVideoMetadataV3(webm(), { adapter, timeoutMs: 25 }),
    /timed out/i
  );
  assert.deepEqual(revoked, ["blob:metadata-1"]);
  assert.equal(video.pauseCalls, 1);
  assert.deepEqual(video.removedAttributes, ["src"]);
});

test("rejects invalid element metadata instead of treating loadedmetadata as proof", async () => {
  const { adapter, revoked, video } = harness();
  video.duration = Number.NaN;
  video.onLoad = () => queueMicrotask(() => video.emit("loadedmetadata"));

  await assert.rejects(
    parseMathSceneBrowserVideoMetadataV3(webm(), { adapter }),
    /invalid video metadata/i
  );
  assert.deepEqual(revoked, ["blob:metadata-1"]);
});

test("validates input before allocating an object URL", async () => {
  let created = 0;
  const { adapter } = harness();
  adapter.createObjectURL = () => {
    created += 1;
    return "blob:unexpected";
  };

  await assert.rejects(
    parseMathSceneBrowserVideoMetadataV3(new Blob([], { type: "video/webm" }), { adapter }),
    /non-empty Blob/i
  );
  await assert.rejects(
    parseMathSceneBrowserVideoMetadataV3(webm(), { adapter, timeoutMs: 0 }),
    /positive and finite/i
  );
  assert.equal(created, 0);
});

test("revokes the object URL when browser event or timer setup fails", async () => {
  const timerFailure = harness();
  timerFailure.adapter.setTimeout = () => {
    throw new Error("host timer denied");
  };
  await assert.rejects(
    parseMathSceneBrowserVideoMetadataV3(webm(), { adapter: timerFailure.adapter }),
    /start WebM metadata parsing/i
  );
  assert.deepEqual(timerFailure.revoked, ["blob:metadata-1"]);
  assert.equal(timerFailure.video.pauseCalls, 1);

  const invalidElement = harness();
  invalidElement.adapter.createVideoElement = () => null as never;
  await assert.rejects(
    parseMathSceneBrowserVideoMetadataV3(webm(), { adapter: invalidElement.adapter }),
    /prepare WebM metadata parsing/i
  );
  assert.deepEqual(invalidElement.revoked, ["blob:metadata-1"]);
});
