import { expect, test } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

function isExpectedAnonymous401Console(text: string) {
  return /Failed to load resource: the server responded with a status of 401(?:\s+\((?:Unauthorized)?\))?/i.test(text);
}

test.describe("California high school textbook review route", () => {
  test("renders noindex review page with 20 chapters, 40 examples, and loaded images", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    const consoleErrors: string[] = [];
    const httpErrors: string[] = [];
    const requestFailures: string[] = [];
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
      if (url.pathname.includes("/lesson-illustrations/us-ca-high-school/") || url.pathname === "/_next/image" || status >= 500) {
        httpErrors.push(`${status} ${response.url()}`);
      }
    });
    page.on("requestfailed", (request) => {
      if (request.url().includes("/lesson-illustrations/us-ca-high-school/")) {
        requestFailures.push(`${request.url()} ${request.failure()?.errorText ?? ""}`);
      }
    });

    await page.goto("/lesson/california-high-school-textbook/review");

    await expect(page.getByRole("heading", { name: "California High School Mathematics Preview", level: 1 })).toBeVisible();
    const reviewPage = page.getByTestId("california-high-school-textbook-review-page");
    await expect(reviewPage).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/i);
    await expect(page.getByTestId("california-high-school-textbook-chapter")).toHaveCount(20);
    await expect(page.getByTestId("california-high-school-worked-example")).toHaveCount(40);

    const images = reviewPage.locator("img");
    await expect(images).toHaveCount(60);
    const imageCount = await images.count();
    for (let index = 0; index < imageCount; index += 1) {
      const image = images.nth(index);
      await image.scrollIntoViewIfNeeded();
      await expect.poll(async () => await image.evaluate((node) => {
        const img = node as HTMLImageElement;
        return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
      }), { timeout: 10000 }).toBe(true);
    }
    const failedImages = await images.evaluateAll((nodes) =>
      nodes
        .map((node) => node as HTMLImageElement)
        .filter((img) => !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0)
        .map((img) => img.currentSrc || img.src || img.alt)
    );
    expect(failedImages).toEqual([]);

    const overflow = await reviewPage.evaluate((main) => main.scrollWidth > main.clientWidth + 2);
    expect(overflow).toBe(false);
    expect(requestFailures).toEqual([]);
    expect(httpErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expectNoPageErrors(pageErrors);
  });
});
