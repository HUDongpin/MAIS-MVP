import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { MAX_ANSWER_LENGTH } from "@/lib/answerLimits";

const testRoot = join(process.cwd(), ".tmp", `answer-length-routes-${process.pid}`);
const databasePath = join(testRoot, "hk-math-db.sqlite");
let sessionCookie = "";

process.env.AUTH_SESSION_SECRET = "answer-length-route-test-secret";
process.env.HK_MATH_DB_PATH = databasePath;

before(async () => {
  mkdirSync(testRoot, { recursive: true });
  const [{ createSessionToken, SESSION_COOKIE_NAME }, { createStudentUser }] = await Promise.all([
    import("@/lib/session"),
    import("@/lib/server/userStore")
  ]);
  const created = await createStudentUser({
    name: "Answer Length Route Test",
    username: `answer-length-${process.pid}@example.test`,
    email: `answer-length-${process.pid}@example.test`,
    password: "start12345",
    grade: "S6",
    curriculumTrack: "HK",
    language: "en",
    theme: "dark"
  });
  if (created.status !== "created") throw new Error(`Could not create route-test student: ${created.status}`);

  const token = await createSessionToken(created.session.user.id);
  sessionCookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
});

after(() => {
  rmSync(testRoot, { recursive: true, force: true });
});

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify(body)
  });
}

test("attempts API accepts the longest safe answer and rejects the first over-bound answer", async () => {
  const { POST } = await import("./attempts/route");
  const safeResponse = await POST(jsonRequest("http://127.0.0.1/api/attempts", {
    questionId: "missing-answer-length-question",
    selectedAnswer: "1".repeat(MAX_ANSWER_LENGTH)
  }));
  assert.equal(safeResponse.status, 404);

  const rejectedResponse = await POST(jsonRequest("http://127.0.0.1/api/attempts", {
    questionId: "missing-answer-length-question",
    selectedAnswer: "1".repeat(MAX_ANSWER_LENGTH + 1)
  }));
  assert.equal(rejectedResponse.status, 400);
  assert.deepEqual(await rejectedResponse.json(), {
    code: "answer-too-long",
    error: "Answers must be 500 characters or fewer."
  });
});

test("assessment submit API accepts the longest safe answer and rejects the first over-bound answer", async () => {
  const { POST } = await import("./assessments/[assessmentId]/submit/route");
  const context = { params: Promise.resolve({ assessmentId: "missing-answer-length-assessment" }) };
  const safeResponse = await POST(jsonRequest("http://127.0.0.1/api/assessments/missing/submit", {
    answers: [{ questionId: "question-1", answer: "1".repeat(MAX_ANSWER_LENGTH) }]
  }), context);
  assert.equal(safeResponse.status, 404);

  const rejectedResponse = await POST(jsonRequest("http://127.0.0.1/api/assessments/missing/submit", {
    answers: [{ questionId: "question-1", answer: "1".repeat(MAX_ANSWER_LENGTH + 1) }]
  }), context);
  assert.equal(rejectedResponse.status, 400);
  assert.deepEqual(await rejectedResponse.json(), {
    code: "answer-too-long",
    error: "Answers must be 500 characters or fewer."
  });
});
