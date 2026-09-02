import { expect, test } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

function isExpectedAnonymous401Console(text: string) {
  return /Failed to load resource: the server responded with a status of 401(?:\s+\((?:Unauthorized)?\))?/i.test(text);
}

test.describe("California high school textbook student route", () => {
  test("keeps the unapproved high-school package on the noindex review route", async ({ page }) => {
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

    await page.goto("/lesson/california-high-school-textbook");

    // Route policy is unchanged by the interactive rebuild: the public route
    // still redirects to the noindex review copy.
    await expect(page).toHaveURL(/\/lesson\/california-high-school-textbook\/review$/);
    await expect(page.getByRole("heading", { name: "California High School Mathematics Preview", level: 1 })).toBeVisible();
    const reviewPage = page.getByTestId("california-high-school-textbook-review-page");
    await expect(reviewPage).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/i);
    await expect(page.getByTestId("california-high-school-textbook-chapter")).toHaveCount(20);
    await expect(reviewPage.locator('[data-testid="california-high-school-textbook-lesson"][data-lesson-role="opener"] [data-ccss-lesson]')).toHaveCount(20);
    await expect(reviewPage.locator("img")).toHaveCount(0);

    const bodyText = await reviewPage.innerText();
    expect(bodyText).toMatch(/Review only/i);
    expect(bodyText).toMatch(/not-approved-for-production-integration/i);

    const overflow = await reviewPage.evaluate((main) => main.scrollWidth > main.clientWidth + 2);
    expect(overflow).toBe(false);
    expect(httpErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expectNoPageErrors(pageErrors);
  });
});
