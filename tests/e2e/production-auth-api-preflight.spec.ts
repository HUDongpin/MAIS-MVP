import { expect, test } from "@playwright/test";

const productionOrigin = "https://www.mais.hk";

type JsonLike = Record<string, unknown> | null;

test.use({ trace: "off", video: "off", screenshot: "off" });

async function safeJson(response: { text: () => Promise<string> }) {
  const text = await response.text();
  try {
    return {
      json: text ? JSON.parse(text) as JsonLike : null,
      textLength: text.length
    };
  } catch {
    return {
      json: null,
      textLength: text.length
    };
  }
}

test.describe("production auth/API preflight", () => {
  test("safe negative controls are stable before storage-writing smoke runs", async ({ request, baseURL }, testInfo) => {
    test.skip(baseURL !== productionOrigin, "Run with PLAYWRIGHT_SKIP_WEBSERVER=1 and PLAYWRIGHT_BASE_URL=https://www.mais.hk.");
    test.setTimeout(90_000);

    const home = await request.get("/");
    const loginPage = await request.get("/login");
    const anonymousStorageHealth = await request.get("/api/admin/storage/health");
    const malformedLogin = await request.post("/api/auth/login", { data: {} });
    const missingUserLogin = await request.post("/api/auth/login", {
      data: {
        username: `missing-prod-preflight-${Date.now()}@example.test`,
        password: "definitely-not-real",
        grade: "S3",
        language: "en",
        theme: "dark"
      }
    });
    const publicQuestions = await request.get("/api/questions?grade=S3");
    const publicLesson = await request.get("/api/lessons/quadratic-functions");

    const missingUserBody = await safeJson(missingUserLogin);

    const evidence = {
      target: baseURL,
      homeStatus: home.status(),
      loginPageStatus: loginPage.status(),
      anonymousStorageHealthStatus: anonymousStorageHealth.status(),
      malformedLoginStatus: malformedLogin.status(),
      missingUserLoginStatus: missingUserLogin.status(),
      missingUserBodyLength: missingUserBody.textLength,
      missingUserJsonKeys: missingUserBody.json ? Object.keys(missingUserBody.json) : [],
      publicQuestionsStatus: publicQuestions.status(),
      publicLessonStatus: publicLesson.status()
    };

    await testInfo.attach("production-auth-api-preflight.json", {
      body: JSON.stringify(evidence, null, 2),
      contentType: "application/json"
    });

    expect(home.status(), "production home page").toBe(200);
    expect(loginPage.status(), "production login page").toBe(200);
    expect(anonymousStorageHealth.status(), "anonymous admin storage health should stay protected").toBe(401);
    expect(malformedLogin.status(), "malformed auth body should validate before storage lookup").toBe(400);
    expect(missingUserLogin.status(), "missing-user login should return normal auth failure, not storage/server failure").toBe(401);
    expect(publicQuestions.status(), "public S3 questions API").toBe(200);
    expect(publicLesson.status(), "public HK lesson API").toBe(200);
  });
});
