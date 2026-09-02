import { expect, test } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

function isExpectedAnonymous401Console(text: string) {
  return /Failed to load resource: the server responded with a status of 401(?:\s+\((?:Unauthorized)?\))?/i.test(text);
}

test.describe("California high school textbook review route", () => {
  test("renders the noindex review page with 20 interactive chapters and a hydrated opener per chapter", async ({ page }) => {
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

    await page.goto("/lesson/california-high-school-textbook/review");

    await expect(page.getByRole("heading", { name: "California High School Mathematics Preview", level: 1 })).toBeVisible();
    const reviewPage = page.getByTestId("california-high-school-textbook-review-page");
    await expect(reviewPage).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/i);
    await expect(page.getByTestId("california-high-school-textbook-chapter")).toHaveCount(20);

    // Every chapter opens with its MAIS-authored interactive lesson; the ported
    // lessons sit behind disclosures and the chapter check is interactive.
    const openers = reviewPage.locator('[data-testid="california-high-school-textbook-lesson"][data-lesson-role="opener"] [data-ccss-lesson]');
    await expect(openers).toHaveCount(20);
    for (let index = 0; index < 20; index += 1) {
      await openers.nth(index).scrollIntoViewIfNeeded();
      await expect(openers.nth(index)).toHaveAttribute("data-ccss-diagram-hydrated", "true", { timeout: 30_000 });
    }
    await expect(reviewPage.locator('[data-testid="california-high-school-textbook-lesson"][data-lesson-role="lesson"] button[aria-expanded="false"]').first()).toBeVisible();
    await expect(reviewPage.getByTestId("california-high-school-textbook-check").first()).toBeVisible();

    // The Codex worked-example package and its bitmaps are gone from the route.
    await expect(reviewPage.locator("img")).toHaveCount(0);
    await expect(reviewPage.getByTestId("california-high-school-worked-example")).toHaveCount(0);

    const bodyText = await reviewPage.innerText();
    expect(bodyText).toMatch(/Review only/i);
    expect(bodyText).toMatch(/not-approved-for-production-integration/i);
    expect(bodyText).toMatch(/Pathway|Algebra I|Geometry|Algebra II/i);

    const overflow = await reviewPage.evaluate((main) => main.scrollWidth > main.clientWidth + 2);
    expect(overflow).toBe(false);
    expect(httpErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expectNoPageErrors(pageErrors);
  });
});
