import { expect, test } from "@playwright/test";

// Phase 1 legal baseline: the public legal surface, the consent gate on child
// account creation, and the data-subject export/erasure endpoints.

const consent = {
  acknowledged: true,
  guardianName: "E2E Guardian",
  guardianEmail: "e2e.guardian@example.test",
  relationship: "parent"
};

function uniqueUsername(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

test.describe("public legal documents", () => {
  for (const path of ["/privacy", "/terms"]) {
    test(`${path} is readable without signing in`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // Version stamp is what a consent record points at, so it must render.
      await expect(page.getByText(/Version \d{4}-\d{2}-\d{2}/)).toBeVisible();
    });
  }

  test("the privacy policy renders in English, Traditional and Simplified Chinese", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();

    await page.getByRole("button", { name: /language selector/i }).click();
    await page.getByRole("menuitemradio", { name: /traditional chinese/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: "私隱政策" })).toBeVisible();

    await page.getByRole("button", { name: /語言選擇/ }).click();
    await page.getByRole("menuitemradio", { name: /使用簡體中文/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "隐私政策" })).toBeVisible();
  });

  test("login links to both legal documents", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('a[href="/privacy"]').first()).toBeVisible();
    await expect(page.locator('a[href="/terms"]').first()).toBeVisible();
  });
});

test.describe("parental consent gate", () => {
  test("a student account cannot be created without guardian consent", async ({ request }) => {
    const response = await request.post("/api/auth/register", {
      data: {
        role: "student",
        name: "No Consent Child",
        username: uniqueUsername("e2e-no-consent"),
        password: "e2ePassword123",
        grade: "P4",
        curriculumTrack: "US_CA_MATH"
      }
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe("parental-consent-required");
  });

  test("an unacknowledged consent is refused", async ({ request }) => {
    const response = await request.post("/api/auth/register", {
      data: {
        role: "student",
        name: "Unacknowledged Child",
        username: uniqueUsername("e2e-unack"),
        password: "e2ePassword123",
        grade: "P4",
        curriculumTrack: "US_CA_MATH",
        parentalConsent: { ...consent, acknowledged: false }
      }
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).reason).toBe("not-acknowledged");
  });
});

test.describe("data subject rights", () => {
  test("a learner can export their data and permanently delete their account", async ({ request }) => {
    const username = uniqueUsername("e2e-rights");
    const created = await request.post("/api/auth/register", {
      data: {
        role: "student",
        name: "Rights Child",
        username,
        password: "e2ePassword123",
        grade: "P4",
        curriculumTrack: "US_CA_MATH",
        parentalConsent: consent
      }
    });
    expect(created.status()).toBe(200);
    const userId = (await created.json()).user.id as string;

    // Export: the subject's own rows, with the consent record and no credentials.
    const exported = await request.get("/api/me/export");
    expect(exported.status()).toBe(200);
    const body = await exported.json();
    expect(body.userId).toBe(userId);
    expect(body.tables.users[0].parental_consent.guardianName).toBe("E2E Guardian");
    expect(body.tables.users[0].password_hash).toBeUndefined();

    // Deletion requires explicit confirmation.
    const unconfirmed = await request.delete("/api/me/account", { data: {} });
    expect(unconfirmed.status()).toBe(400);

    const deleted = await request.delete("/api/me/account", { data: { confirm: "DELETE" } });
    expect(deleted.status()).toBe(200);
    expect((await deleted.json()).ok).toBe(true);

    // The session must no longer authenticate, and the credentials must be gone.
    expect((await request.get("/api/me")).status()).toBe(401);

    const relogin = await request.post("/api/auth/login", {
      data: { username, password: "e2ePassword123" }
    });
    expect(relogin.status()).toBe(401);
  });
});
