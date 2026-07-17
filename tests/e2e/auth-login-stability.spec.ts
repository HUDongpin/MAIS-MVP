import { expect, request as apiRequest, test, type APIRequestContext, type APIResponse, type TestInfo } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const loginAttempts = 20;

type AuthSession = {
  user?: {
    id?: string;
    role?: string;
    grade?: string;
  };
  settings?: {
    selectedGrade?: string;
  };
};

type LoginPayload = {
  username: string;
  password: string;
  grade: string;
  curriculumTrack?: string;
  curriculumProfile?: {
    region: string;
    publisher: string;
  };
  language: "en" | "zh";
  theme: "dark" | "light";
};

function uniqueSlug(testInfo: TestInfo, label: string) {
  return `${label}-${Date.now()}-${testInfo.workerIndex}-${testInfo.project.name}-${Math.random().toString(36).slice(2, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueForwardedFor(group: number, attempt: number) {
  return `10.77.${group}.${attempt + 1}`;
}

async function newLoginContext(group: number, attempt: number) {
  return await apiRequest.newContext({
    baseURL,
    extraHTTPHeaders: {
      "x-forwarded-for": uniqueForwardedFor(group, attempt),
    },
  });
}

function contentTypeOf(response: APIResponse) {
  return response.headers()["content-type"] ?? "";
}

async function expectJsonAuthSession(response: APIResponse, label: string, attempt: number) {
  const status = response.status();
  const contentType = contentTypeOf(response);
  const message = `${label} attempt ${attempt + 1}: status=${status}, content-type=${contentType || "missing"}`;

  expect(status, message).toBe(200);
  expect(contentType, message).toContain("application/json");

  let body: AuthSession;
  try {
    body = await response.json() as AuthSession;
  } catch {
    throw new Error(`${message}; response was not parseable JSON`);
  }

  expect(body.user?.id, message).toBeTruthy();
  expect(body.user?.role, message).toBeTruthy();
  expect(body.settings?.selectedGrade, message).toBeTruthy();
  return body;
}

async function expectStableLogin(
  label: string,
  group: number,
  payload: LoginPayload,
  assertSession?: (session: AuthSession) => void,
) {
  for (let attempt = 0; attempt < loginAttempts; attempt += 1) {
    const context = await newLoginContext(group, attempt);
    try {
      const session = await expectJsonAuthSession(
        await context.post("/api/auth/login", { data: payload }),
        label,
        attempt,
      );
      assertSession?.(session);
    } finally {
      await context.dispose();
    }
  }
}

async function registerFormalStudent(testInfo: TestInfo) {
  const id = uniqueSlug(testInfo, "login-stability-student");
  const student = {
    name: `Login Stability Student ${id}`,
    username: `${id}@example.test`,
    password: "LoginStability123!",
    grade: "S5",
  };
  const context = await apiRequest.newContext({
    baseURL,
    extraHTTPHeaders: {
      "x-forwarded-for": uniqueForwardedFor(9, testInfo.workerIndex),
    },
  });

  try {
    await expectJsonAuthSession(
      await context.post("/api/auth/register", {
        data: {
          role: "student",
          name: student.name,
          username: student.username,
          email: student.username,
          password: student.password,
          grade: student.grade,
          curriculumTrack: "HK",
          curriculumProfile: {
            region: "HK",
            publisher: "HK_UNITED_PRIME_MIA",
          },
          language: "en",
          theme: "dark",
        },
      }),
      "formal student registration",
      0,
    );
  } finally {
    await context.dispose();
  }

  return student;
}

test.describe("auth login stability", () => {
  test.describe.configure({ timeout: 120_000 });

  test("valid demo and registered student logins consistently return JSON sessions", async ({}, testInfo) => {
    await expectStableLogin(
      "HK demo student",
      1,
      {
        username: "HK Student Peter",
        password: "12345",
        grade: "S4",
        curriculumTrack: "HK",
        curriculumProfile: {
          region: "HK",
          publisher: "HK_UNITED_PRIME_MIA",
        },
        language: "en",
        theme: "dark",
      },
      (session) => {
        expect(session.user?.role).toBe("student");
      },
    );

    await expectStableLogin(
      "HK demo teacher",
      2,
      {
        username: "HK Teacher Chan",
        password: "12345",
        grade: "S3",
        curriculumTrack: "HK",
        curriculumProfile: {
          region: "HK",
          publisher: "HK_UNITED_PRIME_MIA",
        },
        language: "en",
        theme: "dark",
      },
      (session) => {
        expect(session.user?.role).toBe("teacher");
      },
    );

    const formalStudent = await registerFormalStudent(testInfo);
    await expectStableLogin(
      "registered formal student",
      3,
      {
        username: formalStudent.username,
        password: formalStudent.password,
        grade: "S1",
        curriculumTrack: "HK",
        curriculumProfile: {
          region: "HK",
          publisher: "HK_UNITED_PRIME_MIA",
        },
        language: "en",
        theme: "dark",
      },
      (session) => {
        expect(session.user?.role).toBe("student");
        expect(session.user?.grade).toBe("S5");
        expect(session.settings?.selectedGrade).toBe("S5");
      },
    );
  });
});
