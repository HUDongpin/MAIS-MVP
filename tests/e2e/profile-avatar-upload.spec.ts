import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { demoStudent } from "./helpers";
import { startIsolatedApp, type IsolatedApp } from "./isolated-app";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);
const mediaEncryptionKey = Buffer.alloc(32, 9).toString("base64");

test.setTimeout(180_000);

async function loginDemoStudentThroughApi(app: IsolatedApp, page: Page) {
  const response = await page.request.post(app.url("/api/auth/login"), {
    data: {
      username: demoStudent.username,
      password: demoStudent.password,
      grade: "S3",
      language: "en",
      theme: "light"
    }
  });
  expect(response.status(), await response.text()).toBe(200);
}

async function openDashboard(app: IsolatedApp, page: Page) {
  await page.goto(app.url("/dashboard"), { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Welcome back, HK Student Peter/i })).toBeVisible();
}

async function selectProfilePhoto(page: Page) {
  await page.locator('input[type="file"][accept*="image/png"]').setInputFiles({
    buffer: onePixelPng,
    mimeType: "image/png",
    name: "student-avatar.png"
  });
  await expect(page.getByRole("button", { name: /Photo selected|Preparing photo/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Save profile/i })).toBeEnabled({ timeout: 10_000 });
}

test("student profile photo saves through governed media object storage and survives reload", async ({ page }, testInfo) => {
  const mediaDir = path.join(".tmp", "profile-avatar-upload", `object-${testInfo.project.name}-${Date.now()}`);
  const app = await startIsolatedApp("profile-avatar-object-storage", testInfo, {
    env: {
      AI_MEDIA_OBJECT_STORAGE_REQUIRED: "true",
      AI_MEDIA_OBJECT_STORE_DIR: mediaDir,
      AI_MEDIA_ENCRYPTION_KEY: mediaEncryptionKey,
      AI_MEDIA_MAX_REQUESTS_PER_MINUTE: "120"
    },
    warmPaths: ["/dashboard"]
  });

  try {
    await loginDemoStudentThroughApi(app, page);
    await openDashboard(app, page);
    await selectProfilePhoto(page);

    const mediaPost = page.waitForResponse((response) =>
      response.url() === app.url("/api/media-objects") && response.request().method() === "POST"
    );
    const profilePatch = page.waitForResponse((response) =>
      response.url() === app.url("/api/me/profile") && response.request().method() === "PATCH"
    );

    await page.getByRole("button", { name: /Save profile/i }).click();

    const mediaResponse = await mediaPost;
    expect(mediaResponse.status(), await mediaResponse.text()).toBe(201);
    const mediaPayload = await mediaResponse.json() as { accessUrl?: string; media?: { objectKey?: string } | null };
    expect(mediaPayload.accessUrl).toMatch(/^\/api\/media-objects\/profile-avatar\//);
    expect(mediaPayload.media?.objectKey).toMatch(/^profile-avatar\//);

    const profileResponse = await profilePatch;
    expect(profileResponse.status(), await profileResponse.text()).toBe(200);
    await expect(page.getByText(/^Saved$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Saving/i })).toHaveCount(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    const avatarImage = page.locator('section[aria-labelledby="student-profile-title"] img').first();
    await expect(avatarImage).toBeVisible();
    await expect(avatarImage).toHaveAttribute("src", /\/api\/media-objects\/profile-avatar\//);

    const preservedSrc = await avatarImage.getAttribute("src");
    const displayName = page.getByLabel(/Display name/i);
    await displayName.fill("HK Student Peter Photo");
    const nameOnlyPatch = page.waitForResponse((response) =>
      response.url() === app.url("/api/me/profile") && response.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: /Save profile/i }).click();
    const nameOnlyResponse = await nameOnlyPatch;
    expect(nameOnlyResponse.status(), await nameOnlyResponse.text()).toBe(200);
    await expect(page.getByText(/^Saved$/i)).toBeVisible();
    await expect(avatarImage).toHaveAttribute("src", preservedSrc ?? "");
  } finally {
    await app.attachLogs(testInfo);
    await app.stop();
  }
});

test("student profile photo save recovers from missing media encryption key", async ({ page }, testInfo) => {
  const mediaDir = path.join(".tmp", "profile-avatar-upload", `missing-key-${testInfo.project.name}-${Date.now()}`);
  const app = await startIsolatedApp("profile-avatar-missing-media-key", testInfo, {
    env: {
      AI_MEDIA_OBJECT_STORAGE_REQUIRED: "true",
      AI_MEDIA_OBJECT_STORE_DIR: mediaDir,
      AI_MEDIA_ENCRYPTION_KEY: "",
      AI_MEDIA_MAX_REQUESTS_PER_MINUTE: "120"
    },
    warmPaths: ["/dashboard"]
  });

  try {
    await loginDemoStudentThroughApi(app, page);
    await openDashboard(app, page);
    await selectProfilePhoto(page);

    const mediaPost = page.waitForResponse((response) =>
      response.url() === app.url("/api/media-objects") && response.request().method() === "POST"
    );
    const profilePatch = page.waitForResponse((response) =>
      response.url() === app.url("/api/me/profile") && response.request().method() === "PATCH"
    );

    await page.getByRole("button", { name: /Save profile/i }).click();

    const [mediaResponse, profileResponse] = await Promise.all([mediaPost, profilePatch]);
    const mediaPayload = await mediaResponse.json() as { code?: string };
    expect(mediaResponse.status(), JSON.stringify(mediaPayload)).toBe(503);
    expect(mediaPayload.code).toBe("media-encryption-key-missing");

    const profilePayload = await profileResponse.json() as { code?: string };
    expect(profileResponse.status(), JSON.stringify(profilePayload)).toBe(409);
    expect(profilePayload.code).toBe("object-storage-required");

    await expect(page.getByText(/^Could not save$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Saving/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Save profile/i })).toBeEnabled();
  } finally {
    await app.attachLogs(testInfo);
    await app.stop();
  }
});
