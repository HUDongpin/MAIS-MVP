import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLessonAudioSseHeaders,
  decodeDashScopeSseAudioStream
} from "./lessonAudioSse";

function streamFromText(parts: string[]) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) {
        controller.enqueue(encoder.encode(part));
      }
      controller.close();
    }
  });
}

test("decodeDashScopeSseAudioStream emits audio bytes as soon as SSE chunks arrive", async () => {
  const firstAudio = Buffer.from([1, 2, 3, 4]);
  const secondAudio = Buffer.from([5, 6, 7]);
  const source = streamFromText([
    `data: {"output":{"audio":{"data":"${firstAudio.toString("base64")}"}}}\n\n`,
    `data: {"output":{"audio":{"data":"${secondAudio.toString("base64")}"}}}\n\n`,
    "data: [DONE]\n\n"
  ]);

  const decoded: Buffer[] = [];
  for await (const chunk of decodeDashScopeSseAudioStream(source)) {
    decoded.push(Buffer.from(chunk));
  }

  assert.deepEqual(decoded, [firstAudio, secondAudio]);
});

test("buildLessonAudioSseHeaders enables DashScope HTTP SSE streaming", () => {
  const headers = buildLessonAudioSseHeaders("test-key");

  assert.equal(headers.Authorization, "Bearer test-key");
  assert.equal(headers["Content-Type"], "application/json");
  assert.equal(headers["X-DashScope-SSE"], "enable");
});
