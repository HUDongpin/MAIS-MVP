import { expect, test, type Page } from "@playwright/test";

const cjkPattern = /[㐀-鿿豈-﫿]/u;
const middleSchoolRoute = "/student/lessons/california-middle-school-textbook";

async function loginAsCaliforniaStudent(page: Page, grade: "P6" | "S3") {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: "Student Shirleen",
      password: "12345",
      grade,
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      language: "zh",
      theme: "light"
    }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

test("California middle-school textbook keeps anonymous readers behind the lesson login gate", async ({ page }) => {
  await page.goto(middleSchoolRoute);
  await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("next") === middleSchoolRoute);
  await expect(page.getByTestId("california-textbook-page")).toHaveCount(0);
});

test("California Grade 6-8 interactive textbook renders every chapter with a hydrated interactive opener, English only", async ({ page }) => {
  await loginAsCaliforniaStudent(page, "P6");
  await page.goto(middleSchoolRoute);

  await expect(page.getByRole("heading", { name: "Interactive Grade 6-8 Textbook", level: 1 })).toBeVisible();
  const main = page.getByTestId("california-textbook-page");

  // One chapter per G6-G8 California chapter topic, grouped by course.
  const chapters = main.getByTestId("california-textbook-chapter");
  await expect(chapters).toHaveCount(15);
  await expect(main.getByTestId("california-textbook-book-P6")).toBeVisible();
  await expect(main.getByTestId("california-textbook-book-S1")).toBeVisible();
  await expect(main.getByTestId("california-textbook-book-S2")).toBeVisible();
  await expect(main).toContainText("Ratios, Rates, and Percent Reasoning");
  await expect(main).toContainText("Bivariate Data and Claims");

  // Every chapter opens with its MAIS-authored interactive lesson, mounted
  // through the same adapter the lesson page uses (so it hydrates and carries
  // the finite-state diagram protocol), and lists its ported lessons behind
  // disclosures.
  const openers = main.locator('[data-testid="california-textbook-lesson"][data-lesson-role="opener"] [data-ccss-lesson]');
  await expect(openers).toHaveCount(15);
  for (let index = 0; index < 15; index += 1) {
    await expect(openers.nth(index)).toHaveAttribute("data-ccss-diagram-hydrated", "true", { timeout: 30_000 });
  }
  const firstOpener = openers.first();
  await expect(firstOpener.locator("button[type='button']").first()).toBeVisible();
  await expect(firstOpener.getByText(/Math check/i).first()).toBeVisible();

  // A ported lesson mounts on demand.
  const firstDisclosure = main.locator('[data-testid="california-textbook-lesson"][data-lesson-role="lesson"] button[aria-expanded]').first();
  await expect(firstDisclosure).toHaveAttribute("aria-expanded", "false");
  await firstDisclosure.click();
  await expect(firstDisclosure).toHaveAttribute("aria-expanded", "true");
  await expect(main.locator('[data-testid="california-textbook-lesson"][data-lesson-role="lesson"] [data-ccss-lesson]').first())
    .toHaveAttribute("data-ccss-diagram-hydrated", "true", { timeout: 30_000 });

  // Chapter checks are interactive: a multiple-choice check marks the pressed choice.
  const firstCheckChoice = main.getByTestId("california-textbook-check").locator("button[aria-pressed]").first();
  await firstCheckChoice.click();
  await expect(firstCheckChoice).toHaveAttribute("aria-pressed", "true");

  // The Codex text-only package and its concept bitmaps are gone.
  await expect(main).not.toContainText("Replacement Grade 6-8 Lessons");
  await expect(main).not.toContainText(/S18|S05 review|before live integration|QA/i);
  await expect(main.locator('img[src*="/lesson-illustrations/us-ca-middle-school/"]')).toHaveCount(0);

  await expect.poll(async () => await main.innerText()).not.toMatch(cjkPattern);
});

test("California practice mode chooser stays English-only for US curriculum users", async ({ page }) => {
  await loginAsCaliforniaStudent(page, "S3");

  await page.goto("/practice");

  const chooser = page.locator('[data-practice-mode="chooser"]');
  await expect(chooser).toBeVisible();
  await expect(chooser.getByRole("heading", { name: "Unit Exercise", exact: true })).toBeVisible();
  await expect(chooser.getByRole("heading", { name: "Free Exploration", exact: true })).toBeVisible();
  await expect(page.getByLabel("California Math Practice Beta status")).toHaveCount(0);
  await expect.poll(async () => await chooser.innerText()).not.toMatch(cjkPattern);
});
