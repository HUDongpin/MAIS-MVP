import assert from "node:assert/strict";
import test from "node:test";
import { GET as getAITutorStatusRoute } from "../../app/api/ai-tutor/status/route";
import { GET as getLessonRoute } from "../../app/api/lessons/[slug]/route";
import { GET as getQuestionsRoute } from "../../app/api/questions/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "../session";

const anonymousQuestionLimit = 20;

async function readJson<T>(response: Response): Promise<T> {
  return await response.json() as T;
}

async function authenticatedRequest(url: string, userId = "student-peter") {
  const token = await createSessionToken(userId);
  return new Request(url, {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`
    }
  });
}

test("anonymous question API returns only a limited preview payload", async () => {
  const response = await getQuestionsRoute(new Request("http://localhost/api/questions"));
  const body = await readJson<{
    questions?: unknown[];
    limited?: boolean;
    limit?: number;
    requiresSignInForFullAccess?: boolean;
    totalAvailable?: number;
  }>(response);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.questions));
  assert.ok(body.questions.length > 0);
  assert.ok(body.questions.length <= anonymousQuestionLimit);
  assert.equal(body.limited, true);
  assert.equal(body.limit, anonymousQuestionLimit);
  assert.equal(body.requiresSignInForFullAccess, true);
  assert.equal(typeof body.totalAvailable, "number");
  assert.ok((body.totalAvailable ?? 0) > body.questions.length);
});

test("authenticated question API keeps full learning payload access", async () => {
  const response = await getQuestionsRoute(await authenticatedRequest("http://localhost/api/questions?grade=S3"));
  const body = await readJson<{ questions?: unknown[]; limited?: boolean }>(response);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.questions));
  assert.ok(body.questions.length > anonymousQuestionLimit);
  assert.notEqual(body.limited, true);
});

test("anonymous lesson API returns preview metadata without bundled practice questions", async () => {
  const response = await getLessonRoute(new Request("http://localhost/api/lessons/quadratic-functions"), {
    params: Promise.resolve({ slug: "quadratic-functions" })
  });
  const body = await readJson<{
    access?: string;
    requiresSignInForFullAccess?: boolean;
    lesson?: {
      blocks?: Array<{ practiceQuestionIds?: string[] }>;
      practiceQuestions?: unknown[];
    };
  }>(response);

  assert.equal(response.status, 200);
  assert.equal(body.access, "preview");
  assert.equal(body.requiresSignInForFullAccess, true);
  assert.ok(body.lesson);
  assert.ok(Array.isArray(body.lesson?.blocks));
  assert.ok((body.lesson?.blocks ?? []).length <= 2);
  assert.deepEqual(body.lesson?.practiceQuestions, []);
  assert.ok((body.lesson?.blocks ?? []).every((block) => !block.practiceQuestionIds?.length));
});

test("authenticated lesson API keeps complete lesson practice access", async () => {
  const response = await getLessonRoute(await authenticatedRequest("http://localhost/api/lessons/quadratic-functions"), {
    params: Promise.resolve({ slug: "quadratic-functions" })
  });
  const body = await readJson<{
    access?: string;
    lesson?: {
      blocks?: Array<{ practiceQuestionIds?: string[] }>;
      practiceQuestions?: unknown[];
    };
  }>(response);

  assert.equal(response.status, 200);
  assert.notEqual(body.access, "preview");
  assert.ok((body.lesson?.blocks ?? []).length > 2);
  assert.ok((body.lesson?.practiceQuestions ?? []).length > 0);
});

test("AI tutor status reports readiness without exposing provider or model names", async () => {
  const response = await getAITutorStatusRoute();
  const body = await readJson<Record<string, unknown>>(response);

  assert.equal(response.status, 200);
  assert.equal(typeof body.configured, "boolean");
  assert.equal(typeof body.mode, "string");
  assert.equal("provider" in body, false);
  assert.equal("model" in body, false);

  for (const key of ["text", "image", "voice", "speech"]) {
    const capability = body[key] as Record<string, unknown> | undefined;
    assert.ok(capability);
    assert.equal(typeof capability.configured, "boolean");
    assert.equal("provider" in capability, false);
    assert.equal("model" in capability, false);
  }
});
