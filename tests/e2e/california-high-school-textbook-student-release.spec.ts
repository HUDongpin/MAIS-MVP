import { expect, test } from "@playwright/test";
import { authenticateAsDemoStudent, collectPageErrors, expectNoPageErrors } from "./helpers";

function isExpectedAnonymous401Console(text: string) {
  return /Failed to load resource: the server responded with a status of 401(?:\s+\((?:Unauthorized)?\))?/i.test(text);
}

test.describe("California high school textbook student route", () => {
  test("keeps anonymous entry readers behind the lesson login gate", async ({ page }) => {
    const canonicalRoute = "/student/lessons/california-high-school-textbook";
    for (const route of ["/lesson/california-high-school-textbook", canonicalRoute]) {
      await page.goto(route);
      await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("next") === canonicalRoute);
      await expect(page.getByTestId("california-high-school-textbook-review-page")).toHaveCount(0);
    }
  });

  test("keeps the unapproved high-school book out of the legacy and student entry routes", async ({ page }) => {
    await authenticateAsDemoStudent(page);
    const pageErrors = collectPageErrors(page);
    const consoleErrors: string[] = [];
    const httpErrors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error" && !isExpectedAnonymous401Console(message.text())) {
        consoleErrors.push(message.text());
      }
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      const status = response.status();
      if (status < 400) return;
      if (status === 401 && url.pathname === "/api/me") return;
      if (url.pathname.startsWith("/_next/") || status >= 500) {
        httpErrors.push(`${status} ${response.url()}`);
      }
    });

    // The generic legacy redirect runs before the old page-level redirect.
    // Current main sends this retired student book entry back to the roadmap;
    // the explicit /lesson/.../review route has its separate noindex QA spec.
    for (const route of ["/lesson/california-high-school-textbook", "/student/lessons/california-high-school-textbook"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/student\/roadmap$/);
      await expect(page.getByTestId("california-high-school-textbook-review-page")).toHaveCount(0);
      await expect(page.getByTestId("california-high-school-textbook-chapter")).toHaveCount(0);
    }
    expect(httpErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expectNoPageErrors(pageErrors);
  });
});
