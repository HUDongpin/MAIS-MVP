import { expect, test } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors, loginAsDemoStudent, openMobileMenuIfNeeded } from "./helpers";

test.describe("class forum retained while hidden from navigation", () => {
  test("student navigation does not expose the forum button", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAsDemoStudent(page);
    await openMobileMenuIfNeeded(page);

    const header = page.locator("header");
    await expect(header.getByRole("link", { name: /^Forum$|^論壇$|^论坛$/i })).toHaveCount(0);
    await expect(header.locator('a[href="/forum"]')).toHaveCount(0);

    expectNoPageErrors(pageErrors);
  });

  test("forum API code remains mounted for direct backend coverage", async ({ request }) => {
    const anonymousForum = await request.get("/api/forum");
    expect(anonymousForum.status()).toBe(401);
  });
});
