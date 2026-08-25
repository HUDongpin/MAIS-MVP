import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_VISUALIZATION_SESSION_EMPTY_CHUNKS,
  MAX_VISUALIZATION_SESSION_REQUEST_BYTES,
  parseVisualizationSessionRequestBody,
} from "@/lib/visualizationSessionRequestBody";

test("parses one exact visualization-session request object", async () => {
  const request = new Request("https://example.test/api/visualization-sessions", {
    method: "POST",
    body: JSON.stringify({
      moduleId: "geometry:arc-length-sector-area:arc-length-sector-area",
      topicId: "arc-length-sector-area",
      source: "geometry",
    }),
  });

  assert.deepEqual(await parseVisualizationSessionRequestBody(request), {
    moduleId: "geometry:arc-length-sector-area:arc-length-sector-area",
    topicId: "arc-length-sector-area",
    source: "geometry",
  });
});

test("rejects a duplicate top-level member before JSON decoding can collapse it", async () => {
  const request = new Request("https://example.test/api/visualization-sessions", {
    method: "POST",
    body: '{"moduleId":"forged","topicId":"arc-length-sector-area","source":"geometry","moduleId":"geometry:arc-length-sector-area:arc-length-sector-area"}',
  });

  await assert.rejects(parseVisualizationSessionRequestBody(request));

  await assert.rejects(parseVisualizationSessionRequestBody(new Request("https://example.test", {
    method: "POST",
    body: '{"moduleId":"first","mod\\u0075leId":"second","topicId":"topic","source":"geometry"}',
  })));
});

test("rejects and cancels a streaming body as soon as it exceeds the byte cap", async () => {
  let cancelled = false;
  const prefix = new TextEncoder().encode('{"moduleId":"');
  const overflow = new Uint8Array(MAX_VISUALIZATION_SESSION_REQUEST_BYTES + 1 - prefix.byteLength);
  overflow.fill(0x61);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(prefix);
      controller.enqueue(overflow);
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request("https://example.test/api/visualization-sessions", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  await assert.rejects(parseVisualizationSessionRequestBody(request));
  assert.equal(cancelled, true);
});

test("cancels an unfinished stream when fatal UTF-8 decoding fails", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(Uint8Array.from([0x7b, 0x22, 0xc3, 0x28]));
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request("https://example.test", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  await assert.rejects(parseVisualizationSessionRequestBody(request));
  assert.equal(cancelled, true);
});

test("attempts cancellation on read failure while preserving the original error", async () => {
  const readError = new Error("reader failed");
  let cancelled = false;
  const request = new Request("https://example.test", { method: "POST", body: "{}" });
  Object.defineProperty(request, "body", {
    value: {
      getReader() {
        return {
          async read() {
            throw readError;
          },
          async cancel() {
            cancelled = true;
            throw new Error("secondary cancel failure");
          },
          releaseLock() {},
        };
      },
    },
  });

  await assert.rejects(
    parseVisualizationSessionRequestBody(request),
    (error) => error === readError,
  );
  assert.equal(cancelled, true);
});

test("preserves a read error when releasing the reader lock also throws", async () => {
  const readError = new Error("authoritative read failure");
  let cancelled = false;
  const request = new Request("https://example.test", { method: "POST", body: "{}" });
  Object.defineProperty(request, "body", {
    value: {
      getReader() {
        return {
          async read() {
            throw readError;
          },
          async cancel() {
            cancelled = true;
          },
          releaseLock() {
            throw new Error("secondary release failure");
          },
        };
      },
    },
  });

  await assert.rejects(
    parseVisualizationSessionRequestBody(request),
    (error) => error === readError,
  );
  assert.equal(cancelled, true);
});

test("preserves the byte-cap error when releasing the reader lock also throws", async () => {
  let cancelled = false;
  const request = new Request("https://example.test", { method: "POST", body: "{}" });
  Object.defineProperty(request, "body", {
    value: {
      getReader() {
        return {
          async read() {
            return {
              done: false,
              value: new Uint8Array(MAX_VISUALIZATION_SESSION_REQUEST_BYTES + 1),
            };
          },
          async cancel() {
            cancelled = true;
          },
          releaseLock() {
            throw new Error("secondary release failure");
          },
        };
      },
    },
  });

  await assert.rejects(
    parseVisualizationSessionRequestBody(request),
    (error) =>
      error instanceof SyntaxError &&
      error.message === "Visualization session request body is too large.",
  );
  assert.equal(cancelled, true);
});

test("preserves the fatal UTF-8 error when releasing the reader lock also throws", async () => {
  let cancelled = false;
  let readCount = 0;
  const releaseError = new Error("secondary release failure");
  const request = new Request("https://example.test", { method: "POST", body: "{}" });
  Object.defineProperty(request, "body", {
    value: {
      getReader() {
        return {
          async read() {
            readCount += 1;
            return readCount === 1
              ? { done: false, value: Uint8Array.from([0xc3, 0x28]) }
              : { done: true, value: undefined };
          },
          async cancel() {
            cancelled = true;
          },
          releaseLock() {
            throw releaseError;
          },
        };
      },
    },
  });

  await assert.rejects(
    parseVisualizationSessionRequestBody(request),
    (error) => error instanceof TypeError && error !== releaseError,
  );
  assert.equal(cancelled, true);
});

test("fails closed on a release-lock error after an otherwise successful read", async () => {
  let readCount = 0;
  const releaseError = new Error("authoritative release failure");
  const validBody = new TextEncoder().encode(
    '{"moduleId":"module","topicId":"topic","source":"geometry"}',
  );
  const request = new Request("https://example.test", { method: "POST", body: "{}" });
  Object.defineProperty(request, "body", {
    value: {
      getReader() {
        return {
          async read() {
            readCount += 1;
            return readCount === 1
              ? { done: false, value: validBody }
              : { done: true, value: undefined };
          },
          async cancel() {},
          releaseLock() {
            throw releaseError;
          },
        };
      },
    },
  });

  await assert.rejects(
    parseVisualizationSessionRequestBody(request),
    (error) => error === releaseError,
  );
});

test("bounds zero-length chunks and preserves the budget error through cleanup failures", async () => {
  const unboundedReaderError = new Error("reader continued beyond the empty-chunk budget");
  let readCalls = 0;
  let cancelled = false;
  let cancelReason: unknown;
  let released = false;
  let primaryError: unknown;
  const request = new Request("https://example.test", { method: "POST", body: "{}" });
  Object.defineProperty(request, "body", {
    value: {
      getReader() {
        return {
          async read() {
            readCalls += 1;
            if (readCalls <= MAX_VISUALIZATION_SESSION_EMPTY_CHUNKS + 1) {
              return { done: false, value: new Uint8Array(0) };
            }
            throw unboundedReaderError;
          },
          async cancel(reason: unknown) {
            cancelled = true;
            cancelReason = reason;
            throw new Error("secondary cancel failure");
          },
          releaseLock() {
            released = true;
            throw new Error("secondary release failure");
          },
        };
      },
    },
  });

  await assert.rejects(
    parseVisualizationSessionRequestBody(request),
    (error) => {
      primaryError = error;
      return error instanceof SyntaxError &&
        error.message === "Visualization session request body has too many empty chunks.";
    },
  );
  assert.equal(MAX_VISUALIZATION_SESSION_EMPTY_CHUNKS, 32);
  assert.equal(readCalls, MAX_VISUALIZATION_SESSION_EMPTY_CHUNKS + 1);
  assert.equal(cancelled, true);
  assert.equal(cancelReason, primaryError);
  assert.equal(released, true);
});

test("primary stream failures reject promptly when cancellation never settles", async () => {
  type ReadResult = { done: boolean; value?: Uint8Array };
  type ExpectedError = (error: unknown) => boolean;

  async function runScenario(
    name: string,
    read: () => Promise<ReadResult>,
    expectedError: ExpectedError,
  ) {
    let cancelCalls = 0;
    let cancelReason: unknown;
    let releaseCalls = 0;
    const request = new Request("https://example.test", { method: "POST", body: "{}" });
    Object.defineProperty(request, "body", {
      value: {
        getReader() {
          return {
            read,
            cancel(reason: unknown) {
              cancelCalls += 1;
              cancelReason = reason;
              return new Promise<void>(() => {});
            },
            releaseLock() {
              releaseCalls += 1;
            },
          };
        },
      },
    });

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      parseVisualizationSessionRequestBody(request).then(
        () => ({ kind: "resolved" as const }),
        (error: unknown) => ({ kind: "rejected" as const, error }),
      ),
      new Promise<{ kind: "timeout" }>((resolve) => {
        timeoutHandle = setTimeout(() => resolve({ kind: "timeout" }), 100);
      }),
    ]);
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);

    assert.equal(result.kind, "rejected", `${name} was blocked by reader.cancel()`);
    assert.ok(
      result.kind === "rejected" && expectedError(result.error),
      `${name} did not preserve its authoritative error`,
    );
    assert.equal(cancelCalls, 1, `${name} must attempt cancellation exactly once`);
    assert.equal(
      result.kind === "rejected" && cancelReason,
      result.kind === "rejected" ? result.error : undefined,
      `${name} must pass the authoritative error to cancellation`,
    );
    assert.equal(releaseCalls, 1, `${name} must release the reader promptly`);
  }

  let emptyReads = 0;
  const readError = new Error("authoritative reader failure");
  await Promise.all([
    runScenario(
      "byte cap",
      async () => ({
        done: false,
        value: new Uint8Array(MAX_VISUALIZATION_SESSION_REQUEST_BYTES + 1),
      }),
      (error) => error instanceof SyntaxError &&
        error.message === "Visualization session request body is too large.",
    ),
    runScenario(
      "empty chunk budget",
      async () => {
        emptyReads += 1;
        return { done: false, value: new Uint8Array(0) };
      },
      (error) => error instanceof SyntaxError &&
        error.message === "Visualization session request body has too many empty chunks.",
    ),
    runScenario(
      "fatal UTF-8 decode",
      async () => ({
        done: false,
        value: Uint8Array.from([0xc3, 0x28]),
      }),
      (error) => error instanceof TypeError,
    ),
    runScenario(
      "reader failure",
      async () => {
        throw readError;
      },
      (error) => error === readError,
    ),
  ]);
  assert.equal(emptyReads, MAX_VISUALIZATION_SESSION_EMPTY_CHUNKS + 1);
});

test("adopts a cancellation thenable without replacing the primary read error", async () => {
  const readError = new Error("authoritative read error");
  const cancelError = new Error("secondary thenable cancellation error");
  let cancelCalls = 0;
  let thenCalls = 0;
  let releaseCalls = 0;
  const request = new Request("https://example.test", { method: "POST", body: "{}" });
  Object.defineProperty(request, "body", {
    value: {
      getReader() {
        return {
          async read() {
            throw readError;
          },
          cancel() {
            cancelCalls += 1;
            return {
              then(
                _resolve: (value: void) => unknown,
                reject: (reason: unknown) => unknown,
              ) {
                thenCalls += 1;
                reject(cancelError);
              },
            } as unknown as Promise<void>;
          },
          releaseLock() {
            releaseCalls += 1;
          },
        };
      },
    },
  });

  await assert.rejects(
    parseVisualizationSessionRequestBody(request),
    (error) => error === readError,
  );
  await Promise.resolve();
  assert.equal(cancelCalls, 1);
  assert.equal(thenCalls, 1);
  assert.equal(releaseCalls, 1);
});

function requestFromBytes(bytes: Uint8Array) {
  return new Request("https://example.test/api/visualization-sessions", {
    method: "POST",
    body: bytes,
  });
}

test("accepts every member order, legal JSON whitespace, and exact byte boundary", async () => {
  const members = [
    '"moduleId":"module"',
    '"topicId":"topic"',
    '"source":"geometry"',
  ];
  const permutations = [
    [0, 1, 2], [0, 2, 1], [1, 0, 2],
    [1, 2, 0], [2, 0, 1], [2, 1, 0],
  ];
  for (const order of permutations) {
    const body = ` \n{\t${order.map((index) => members[index]).join(" ,\r\n")} }\r`;
    assert.deepEqual(
      await parseVisualizationSessionRequestBody(new Request("https://example.test", {
        method: "POST",
        body,
      })),
      { moduleId: "module", topicId: "topic", source: "geometry" },
    );
  }

  const compact = '{"moduleId":"module","topicId":"topic","source":"geometry"}';
  const exactBoundary = compact + " ".repeat(
    MAX_VISUALIZATION_SESSION_REQUEST_BYTES - new TextEncoder().encode(compact).byteLength,
  );
  assert.equal(new TextEncoder().encode(exactBoundary).byteLength, MAX_VISUALIZATION_SESSION_REQUEST_BYTES);
  assert.deepEqual(
    await parseVisualizationSessionRequestBody(new Request("https://example.test", {
      method: "POST",
      body: exactBoundary,
    })),
    { moduleId: "module", topicId: "topic", source: "geometry" },
  );
  await assert.rejects(parseVisualizationSessionRequestBody(new Request("https://example.test", {
    method: "POST",
    body: `${exactBoundary} `,
  })));
});

test("preserves maximum-length identities, finite empty chunks, and multibyte boundaries", async () => {
  const maximumIdentity = "界".repeat(256);
  const literalBody = JSON.stringify({
    moduleId: maximumIdentity,
    topicId: maximumIdentity,
    source: "geometry",
  });
  const literalBytes = new TextEncoder().encode(literalBody);
  const firstMultibyte = literalBytes.indexOf(0xe7);
  assert.notEqual(firstMultibyte, -1);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(0));
      controller.enqueue(literalBytes.slice(0, firstMultibyte + 1));
      controller.enqueue(new Uint8Array(0));
      controller.enqueue(literalBytes.slice(firstMultibyte + 1));
      controller.enqueue(new Uint8Array(0));
      controller.close();
    },
  });
  const streamedRequest = new Request("https://example.test", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  assert.deepEqual(await parseVisualizationSessionRequestBody(streamedRequest), {
    moduleId: maximumIdentity,
    topicId: maximumIdentity,
    source: "geometry",
  });

  const escapedIdentity = "\\u754c".repeat(256);
  const escapedBody = `{"moduleId":"${escapedIdentity}","topicId":"${escapedIdentity}","source":"geometry"}`;
  assert.ok(new TextEncoder().encode(escapedBody).byteLength < MAX_VISUALIZATION_SESSION_REQUEST_BYTES);
  assert.deepEqual(
    await parseVisualizationSessionRequestBody(new Request("https://example.test", {
      method: "POST",
      body: escapedBody,
    })),
    { moduleId: maximumIdentity, topicId: maximumIdentity, source: "geometry" },
  );
});

test("rejects duplicate, extra, missing, non-string, nested, malformed, BOM, and trailing input", async () => {
  const invalidBodies = [
    '{"moduleId":"first","moduleId":"last","topicId":"topic","source":"geometry"}',
    '{"moduleId":"first","topicId":"topic","topicId":"last","source":"geometry"}',
    '{"moduleId":"first","topicId":"topic","source":"geometry","source":"last"}',
    '{"moduleId":"first","topicId":"topic","source":"geometry","extra":"no"}',
    '{"moduleId":"first","topicId":"topic"}',
    '{"moduleId":1,"topicId":"topic","source":"geometry"}',
    '{"moduleId":"first","topicId":{"nested":"no"},"source":"geometry"}',
    '{"moduleId":"first","topicId":"topic","source":["geometry"]}',
    '{"moduleId":"first","topicId":"topic","source":"geometry"} trailing',
    '{"moduleId":"first","topicId":"topic","source":"geometry",}',
    '{"moduleId":"\\x","topicId":"topic","source":"geometry"}',
    '["module","topic","geometry"]',
    "{}",
    "",
  ];
  for (const body of invalidBodies) {
    await assert.rejects(
      parseVisualizationSessionRequestBody(new Request("https://example.test", {
        method: "POST",
        body,
      })),
    );
  }

  const validBytes = new TextEncoder().encode(
    '{"moduleId":"module","topicId":"topic","source":"geometry"}',
  );
  const bomBody = new Uint8Array(3 + validBytes.byteLength);
  bomBody.set([0xef, 0xbb, 0xbf]);
  bomBody.set(validBytes, 3);
  await assert.rejects(parseVisualizationSessionRequestBody(requestFromBytes(bomBody)));

  await assert.rejects(parseVisualizationSessionRequestBody(requestFromBytes(
    Uint8Array.from([0x7b, 0x22, 0x6d, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d]),
  )));
});

test("rejects EOF after the final member comma without a closing object token", async () => {
  const truncatedBody = '{"moduleId":"geometry:arc-length-sector-area:arc-length-sector-area","topicId":"arc-length-sector-area","source":"geometry",';

  await assert.rejects(parseVisualizationSessionRequestBody(new Request(
    "https://example.test/api/visualization-sessions",
    { method: "POST", body: truncatedBody },
  )));
});
