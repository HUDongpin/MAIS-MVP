import assert from "node:assert/strict";
import test from "node:test";

import {
  maxVisualizationSessionRequestBodyBytes,
  parseExactVisualizationSessionRequestBody
} from "./requestBody";

function requestWithBody(body: BodyInit, headers?: HeadersInit) {
  return new Request("https://example.test/api/visualization-sessions", {
    method: "POST",
    headers,
    body
  });
}

async function assertInvalidJson(body: string) {
  const result = await parseExactVisualizationSessionRequestBody(requestWithBody(body));
  assert.equal(result.ok, false, body);
  if (!result.ok) assert.equal(result.status, 400, body);
}

test("strict visualization-session JSON accepts exact members in any order with JSON whitespace", async () => {
  const result = await parseExactVisualizationSessionRequestBody(requestWithBody(
    " \r\n{\t\"source\" : \"geometry\", \"topicId\":\"topic-1\",\n\"moduleId\" : \"module-1\" } \t"
  ));
  assert.deepEqual(result, {
    ok: true,
    value: {
      moduleId: "module-1",
      topicId: "topic-1",
      source: "geometry"
    }
  });
});

test("strict visualization-session JSON rejects duplicate and escaped-equivalent member names", async () => {
  const values = {
    moduleId: "configured-visualization-lab",
    topicId: "us-ca-math-s4-chapter-04",
    source: "function-graph"
  };
  for (const key of ["moduleId", "topicId", "source"] as const) {
    await assertInvalidJson(`{${JSON.stringify(key)}:"forged",${JSON.stringify(key)}:${JSON.stringify(values[key])},"moduleId":${JSON.stringify(values.moduleId)},"topicId":${JSON.stringify(values.topicId)},"source":${JSON.stringify(values.source)}}`);
  }
  await assertInvalidJson(
    `{"moduleId":"forged","module\\u0049d":${JSON.stringify(values.moduleId)},"topicId":${JSON.stringify(values.topicId)},"source":${JSON.stringify(values.source)}}`
  );
  await assertInvalidJson(
    `{"moduleId":${JSON.stringify(values.moduleId)},"topicId":"forged","topic\\u0049d":${JSON.stringify(values.topicId)},"source":${JSON.stringify(values.source)}}`
  );
  await assertInvalidJson(
    `{"moduleId":${JSON.stringify(values.moduleId)},"topicId":${JSON.stringify(values.topicId)},"source":"forged","sour\\u0063e":${JSON.stringify(values.source)}}`
  );
});

test("strict visualization-session JSON rejects prototype, non-string, nested, malformed, and trailing values", async () => {
  for (const body of [
    "{}",
    "[]",
    "null",
    '{"moduleId":"module","topicId":"topic","source":"geometry","__proto__":{"polluted":true}}',
    '{"moduleId":"module","topicId":"topic","source":"geometry","constructor":"forged"}',
    '{"moduleId":{"nested":true},"topicId":"topic","source":"geometry"}',
    '{"moduleId":"module","topicId":["topic"],"source":"geometry"}',
    '{"moduleId":"module","topicId":"topic","source":null}',
    '{"moduleId":"module","topicId":"topic","source":1}',
    '{"moduleId":"module","topicId":"topic","source":"geometry"} true',
    '{"moduleId":"module","topicId":"topic","source":"geometry",}',
    '{"moduleId":"module","topicId":"topic","source":"geo\\uD800metry"}'
  ]) {
    await assertInvalidJson(body);
  }
  assert.equal(({} as { polluted?: unknown }).polluted, undefined);
});

test("visualization-session request bodies are bounded by declared and observed bytes", async () => {
  const declaredOversize = await parseExactVisualizationSessionRequestBody(requestWithBody("{}", {
    "Content-Length": String(maxVisualizationSessionRequestBodyBytes + 1)
  }));
  assert.deepEqual(declaredOversize, {
    ok: false,
    status: 413,
    error: "Visualization session body is too large."
  });

  const observedOversize = await parseExactVisualizationSessionRequestBody(requestWithBody(
    " ".repeat(maxVisualizationSessionRequestBodyBytes + 1)
  ));
  assert.deepEqual(observedOversize, {
    ok: false,
    status: 413,
    error: "Visualization session body is too large."
  });

  const invalidLength = await parseExactVisualizationSessionRequestBody(requestWithBody("{}", {
    "Content-Length": "12x"
  }));
  assert.deepEqual(invalidLength, {
    ok: false,
    status: 400,
    error: "Invalid Content-Length."
  });

  for (const declaredLength of ["2", "200"]) {
    const mismatchedLength = await parseExactVisualizationSessionRequestBody(requestWithBody(
      '{"moduleId":"module","topicId":"topic","source":"geometry"}',
      { "Content-Length": declaredLength }
    ));
    assert.deepEqual(mismatchedLength, {
      ok: false,
      status: 400,
      error: "Content-Length does not match the request body."
    });
  }
});

test("visualization-session request bodies fail closed when the body stream is already locked", async () => {
  const request = requestWithBody('{"moduleId":"module","topicId":"topic","source":"geometry"}');
  assert.ok(request.body);
  const reader = request.body.getReader();
  try {
    assert.deepEqual(await parseExactVisualizationSessionRequestBody(request), {
      ok: false,
      status: 400,
      error: "Invalid JSON body."
    });
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
});

test("visualization-session request bodies reject invalid UTF-8", async () => {
  const result = await parseExactVisualizationSessionRequestBody(requestWithBody(
    new Uint8Array([0x7b, 0x22, 0xff, 0x22, 0x7d])
  ));
  assert.deepEqual(result, {
    ok: false,
    status: 400,
    error: "Invalid UTF-8 JSON body."
  });
});
