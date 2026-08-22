import { expect, request as apiRequest, test, type APIRequestContext } from "@playwright/test";
import path from "node:path";
import { startIsolatedApp, type IsolatedApp } from "./isolated-app";

// The teacher clause in canReadMediaObject (lib/server/mediaObjectStore.ts) grants a
// teacher read access to exactly three capabilities — assignment-image,
// classroom-work-sample and practice-work-photo — and those three are the only upload
// capabilities no test has ever exercised. Every existing media test uses
// profile-avatar, which that clause deliberately excludes, so the branch that lets a
// teacher open a learner's photographed working has never executed.
//
// It cannot execute in the shared e2e server either: governed uploads need
// AI_MEDIA_ENCRYPTION_KEY, which playwright.config.ts does not set, so every upload
// there fails 503 before reaching storage. This spec therefore runs its own isolated
// app with a key, the same way profile-avatar-upload.spec.ts does.

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);
const onePixelPngDataUrl = `data:image/png;base64,${onePixelPng.toString("base64")}`;
const mediaEncryptionKey = Buffer.alloc(32, 7).toString("base64");

// Capabilities a teacher must be able to read off one of their own learners.
const teacherReadableCapabilities = ["practice-work-photo", "assignment-image", "classroom-work-sample"] as const;

test.setTimeout(240_000);

type Actor = { context: APIRequestContext; userId: string };

async function newContext(app: IsolatedApp, contexts: APIRequestContext[]) {
  const context = await apiRequest.newContext({ baseURL: app.baseURL });
  contexts.push(context);
  return context;
}

async function registerStudent(app: IsolatedApp, contexts: APIRequestContext[], label: string): Promise<Actor> {
  const context = await newContext(app, contexts);
  const slug = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toLowerCase();
  const response = await context.post("/api/auth/register", {
    data: {
      role: "student",
      name: `Work photo ${slug}`,
      username: `${slug}@example.test`,
      email: `${slug}@example.test`,
      password: "start12345",
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      language: "en",
      theme: "dark"
    }
  });
  expect(response.status(), await response.text()).toBe(200);
  const session = await response.json() as { user: { id: string } };
  return { context, userId: session.user.id };
}

async function loginTeacher(app: IsolatedApp, contexts: APIRequestContext[]): Promise<Actor> {
  const context = await newContext(app, contexts);
  const response = await context.post("/api/auth/login", {
    data: { username: "HK Teacher Chan", password: "12345", grade: "S3", language: "en", theme: "dark" }
  });
  expect(response.status(), await response.text()).toBe(200);
  const session = await response.json() as { user: { id: string; role: string } };
  expect(session.user.role).toBe("teacher");
  return { context, userId: session.user.id };
}

async function loginParent(app: IsolatedApp, contexts: APIRequestContext[]): Promise<Actor> {
  const context = await newContext(app, contexts);
  const response = await context.post("/api/auth/login", {
    data: { username: "Peter's Parent", password: "12345", language: "en", theme: "dark" }
  });
  expect(response.status(), await response.text()).toBe(200);
  const session = await response.json() as { user: { id: string } };
  return { context, userId: session.user.id };
}

test("a teacher can open the working a learner photographed, and other learners cannot", async ({}, testInfo) => {
  const mediaDir = path.join(".tmp", "learner-teacher-work-photos", `object-${testInfo.project.name}-${Date.now()}`);
  const app = await startIsolatedApp("learner-teacher-work-photos", testInfo, {
    env: {
      AI_MEDIA_ENCRYPTION_KEY: mediaEncryptionKey,
      AI_MEDIA_OBJECT_STORE_DIR: mediaDir,
      AI_MEDIA_MAX_REQUESTS_PER_MINUTE: "120"
    },
    warmPaths: ["/dashboard"]
  });
  const contexts: APIRequestContext[] = [];

  try {
    const teacher = await loginTeacher(app, contexts);
    const learner = await registerStudent(app, contexts, "owner");
    const classmate = await registerStudent(app, contexts, "classmate");
    const parent = await loginParent(app, contexts);

    // Both learners join the teacher's class, so the only thing separating them is
    // ownership of the upload — not enrollment.
    const created = await teacher.context.post("/api/teacher/classes", {
      data: { name: `Work photo class ${Date.now()}`, grade: "S3", academicYear: "2026-2027" }
    });
    expect(created.status(), await created.text()).toBe(201);
    const classPayload = await created.json() as { class: { id: string; inviteCode: string } };
    for (const student of [learner, classmate]) {
      const joined = await student.context.post("/api/classes/join", {
        data: { inviteCode: classPayload.class.inviteCode }
      });
      expect(joined.status(), await joined.text()).toBe(200);
    }

    // Uploads must actually be available, or the rest of this test proves nothing.
    const probe = await learner.context.get("/api/media-objects");
    expect(probe.status(), await probe.text()).toBe(200);
    expect((await probe.json() as { uploadsAvailable: boolean }).uploadsAvailable).toBe(true);

    for (const capability of teacherReadableCapabilities) {
      const upload = await learner.context.post("/api/media-objects", {
        data: { capability, dataUrl: onePixelPngDataUrl }
      });
      expect(upload.status(), `${capability} upload: ${await upload.text()}`).toBe(201);
      const uploaded = await upload.json() as { accessUrl: string; media: { objectKey: string } };
      expect(uploaded.media.objectKey.startsWith(`${capability}/`), `objectKey was ${uploaded.media.objectKey}`).toBe(true);

      // The learner who uploaded it can read their own bytes back.
      const ownerRead = await learner.context.get(uploaded.accessUrl);
      expect(ownerRead.status(), `${capability} owner read: ${await ownerRead.text()}`).toBe(200);
      expect(Buffer.from(await ownerRead.body()).equals(onePixelPng)).toBe(true);

      // The interaction under test: the teacher opens the learner's working.
      const teacherRead = await teacher.context.get(uploaded.accessUrl);
      expect(teacherRead.status(), `${capability} teacher read: ${await teacherRead.text()}`).toBe(200);
      expect(
        Buffer.from(await teacherRead.body()).equals(onePixelPng),
        `${capability}: teacher must receive the learner's actual image bytes`
      ).toBe(true);
      expect(teacherRead.headers()["content-type"]).toContain("image/png");

      // A classmate in the same class must not be able to read it.
      const classmateRead = await classmate.context.get(uploaded.accessUrl);
      expect(classmateRead.status(), `${capability} classmate read`).toBe(403);

      // A parent is outside the teacher clause and must not be able to read it either.
      const parentRead = await parent.context.get(uploaded.accessUrl);
      expect(parentRead.status(), `${capability} parent read`).toBe(403);
    }

    // profile-avatar is deliberately excluded from the teacher clause: a learner's
    // profile photo is not schoolwork, so a teacher must not be able to fetch it.
    const avatarUpload = await learner.context.post("/api/media-objects", {
      data: { capability: "profile-avatar", dataUrl: onePixelPngDataUrl }
    });
    expect(avatarUpload.status(), await avatarUpload.text()).toBe(201);
    const avatar = await avatarUpload.json() as { accessUrl: string };
    expect((await teacher.context.get(avatar.accessUrl)).status()).toBe(403);
  } finally {
    await Promise.all(contexts.map((context) => context.dispose().catch(() => undefined)));
    await app.attachLogs(testInfo).catch(() => undefined);
    await app.stop();
  }
});
