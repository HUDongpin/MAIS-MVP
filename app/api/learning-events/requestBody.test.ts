import assert from "node:assert/strict";
import test from "node:test";

import {
  maxLearningEventsRequestBodyBytes,
  maxLearningEventsRequestIdentifierLength,
  maxLearningEventsRequestEvents,
  parseExactLearningEventsRequestBody
} from "./requestBody";

const event = {
  id: "event-1",
  type: "page-view",
  source: "visualization-lab",
  timestamp: "2026-08-12T10:00:00.000Z",
  grade: "S3",
  topicId: "us-ca-math-s3-chapter-04"
};

function requestWithBody(body: BodyInit, headers?: HeadersInit) {
  return new Request("https://example.test/api/learning-events", {
    method: "POST",
    headers,
    body
  });
}

async function assertInvalidJson(body: string) {
  const result = await parseExactLearningEventsRequestBody(requestWithBody(body));
  assert.equal(result.ok, false, body);
  if (!result.ok) assert.equal(result.status, 400, body);
}

test("strict learning-events JSON accepts the exact A08 delivery schema in either top-level order", async () => {
  const canonical = JSON.stringify({ generation: 0, events: [event] });
  const canonicalResult = await parseExactLearningEventsRequestBody(requestWithBody(canonical));
  assert.equal(canonicalResult.ok, true);
  if (canonicalResult.ok) {
    assert.equal(canonicalResult.value.generation, 0);
    assert.equal(JSON.stringify(canonicalResult.value.events), JSON.stringify([event]));
  }

  const reversed = JSON.stringify({ events: [event], generation: 7 });
  const reversedResult = await parseExactLearningEventsRequestBody(requestWithBody(reversed));
  assert.equal(reversedResult.ok, true);
  if (reversedResult.ok) {
    assert.equal(reversedResult.value.generation, 7);
    assert.equal(JSON.stringify(reversedResult.value.events), JSON.stringify([event]));
  }
});

test("strict learning-events JSON rejects duplicate, escaped-equivalent, unknown, nested, and trailing members", async () => {
  const encodedEvent = JSON.stringify(event);
  for (const body of [
    `{"generation":0,"generation":1,"events":[${encodedEvent}]}`,
    `{"generation":0,"genera\\u0074ion":1,"events":[${encodedEvent}]}`,
    `{"generation":0,"events":[],"ev\\u0065nts":[${encodedEvent}]}`,
    `{"generation":0,"events":[${encodedEvent}],"unknown":true}`,
    `{"generation":{"nested":0},"events":[${encodedEvent}]}`,
    `{"generation":0,"events":[{"id":"forged",${encodedEvent.slice(1)}]}`,
    `{"generation":0,"events":[{"id":"forged","\\u0069d":"event-1","type":"page-view","source":"visualization-lab","timestamp":"2026-08-12T10:00:00.000Z","grade":"S3","topicId":"topic"}]}`,
    `{"generation":0,"events":[{"id":"event","type":"page-view","source":"visualization-lab","timestamp":"2026-08-12T10:00:00.000Z","grade":"S3","topicId":{"nested":"topic"}}]}`,
    `{"generation":0,"events":[${encodedEvent}],}`,
    `{"generation":0,"events":[${encodedEvent}]} true`,
    `{"generation":0,"events":[{"id":"bad\\uD800","type":"page-view","source":"visualization-lab","timestamp":"2026-08-12T10:00:00.000Z","grade":"S3","topicId":"topic"}]}`
  ]) {
    await assertInvalidJson(body);
  }
});

test("learning-events request bodies are bounded by declared and observed bytes with exact length", async () => {
  assert.deepEqual(await parseExactLearningEventsRequestBody(requestWithBody("{}", {
    "Content-Length": String(maxLearningEventsRequestBodyBytes + 1)
  })), {
    ok: false,
    status: 413,
    error: "Learning events body is too large."
  });

  assert.deepEqual(await parseExactLearningEventsRequestBody(requestWithBody(
    " ".repeat(maxLearningEventsRequestBodyBytes + 1)
  )), {
    ok: false,
    status: 413,
    error: "Learning events body is too large."
  });

  assert.deepEqual(await parseExactLearningEventsRequestBody(requestWithBody("{}", {
    "Content-Length": "2x"
  })), {
    ok: false,
    status: 400,
    error: "Invalid Content-Length."
  });

  for (const length of ["1", "200"]) {
    assert.deepEqual(await parseExactLearningEventsRequestBody(requestWithBody("{}", {
      "Content-Length": length
    })), {
      ok: false,
      status: 400,
      error: "Content-Length does not match the request body."
    });
  }
});

test("learning-events request bodies reject locked streams and malformed UTF-8", async () => {
  const locked = requestWithBody(JSON.stringify({ generation: 0, events: [] }));
  assert.ok(locked.body);
  const reader = locked.body.getReader();
  try {
    assert.deepEqual(await parseExactLearningEventsRequestBody(locked), {
      ok: false,
      status: 400,
      error: "Invalid JSON body."
    });
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }

  assert.deepEqual(await parseExactLearningEventsRequestBody(requestWithBody(
    new Uint8Array([0x7b, 0x22, 0xff, 0x22, 0x7d])
  )), {
    ok: false,
    status: 400,
    error: "Invalid UTF-8 JSON body."
  });
});

test("learning-events parser caps physical revisions before event 201 is allocated", async () => {
  const events = Array.from({ length: maxLearningEventsRequestEvents + 1 }, (_, index) => ({
    ...event,
    id: `event-${index}`
  }));
  assert.deepEqual(await parseExactLearningEventsRequestBody(requestWithBody(
    JSON.stringify({ generation: 0, events })
  )), {
    ok: false,
    status: 413,
    error: "Learning events batch is too large."
  });
});

test("learning-events identifiers are canonical, nonempty, and bounded", async () => {
  const acceptedIdentifier = "x".repeat(maxLearningEventsRequestIdentifierLength);
  const accepted = await parseExactLearningEventsRequestBody(requestWithBody(JSON.stringify({
    generation: 0,
    events: [{ ...event, id: acceptedIdentifier, topicId: acceptedIdentifier }]
  })));
  assert.equal(accepted.ok, true);

  for (const mutatedEvent of [
    { ...event, id: "x".repeat(maxLearningEventsRequestIdentifierLength + 1) },
    { ...event, topicId: "x".repeat(maxLearningEventsRequestIdentifierLength + 1) },
    { ...event, questionId: "x".repeat(maxLearningEventsRequestIdentifierLength + 1) },
    { ...event, classId: "x".repeat(161) },
    { ...event, assignmentId: "x".repeat(161) },
    { ...event, competencyId: "x".repeat(161) },
    { ...event, id: " event" },
    { ...event, topicId: "event " },
    { ...event, questionId: "" },
    { ...event, classId: " class" }
  ]) {
    await assertInvalidJson(JSON.stringify({ generation: 0, events: [mutatedEvent] }));
  }
});
