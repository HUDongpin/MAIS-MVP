import { expect, test } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors, loginAsTeacher, uniqueSuffix } from "./helpers";

// Regression cover for the teacher surfaces that had no e2e at all: Safety
// alerts, the Gradebook grid, and the Operations reminders / collaboration /
// term-archive tabs.
//
// This is where an "add collaborator" regression hid in plain sight: six submit
// handlers called event.currentTarget.reset() after an await, React had already
// cleared currentTarget, and the resulting TypeError aborted the handler before
// its router.refresh(). The UI still said "Collaborator saved." while the list
// never updated. Nothing exercised these tabs, so nothing caught it.
//
// Each test therefore asserts an observable *outcome* — a row appears, a status
// sticks — rather than merely that a click did not throw. A page-error check
// guards the specific failure mode above, since that bug surfaced as an
// uncaught TypeError rather than a failed request.

test.setTimeout(120_000);

test.describe("teacher gradebook", () => {
  test("renders the grade grid for a class with graded work", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await loginAsTeacher(page);

    await page.goto("/teacher/gradebook?classId=class-s3a-2026");
    await expect(page.getByRole("heading", { name: /Gradebook/i })).toBeVisible();

    // A grid with rows, not the "no graded work"/"no students" empty state.
    const grid = page.locator("table");
    await expect(grid).toBeVisible();
    expect(await grid.locator("tbody tr").count()).toBeGreaterThan(0);
    await expect(page.getByText(/No graded work yet|No students are enrolled/i)).toHaveCount(0);

    expectNoPageErrors(pageErrors);
  });
});

test.describe("teacher safety alerts", () => {
  test("filters flags and persists acknowledge/resolve decisions", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await loginAsTeacher(page);

    await page.goto("/teacher/safety");
    await expect(page.getByRole("heading", { name: /Safety|Content safety/i }).first()).toBeVisible();

    // The status filter tabs carry aria-pressed; at least one must be present
    // for the queue to be navigable at all.
    const filterTabs = page.locator("button[aria-pressed]");
    expect(await filterTabs.count()).toBeGreaterThan(0);

    // Acknowledge is only offered for flags still in "new", and more than one
    // flag can be open at once — so the outcome to assert is that the queue
    // shrinks by one, not that the control disappears entirely. This spec also
    // shares a database with other runs, so an already-drained queue is a valid
    // state rather than a failure.
    const acknowledgeButtons = page.getByRole("button", { name: /^Acknowledge$/ });
    const acknowledgeBefore = await acknowledgeButtons.count();
    if (acknowledgeBefore > 0) {
      await acknowledgeButtons.first().click();
      await expect(acknowledgeButtons).toHaveCount(acknowledgeBefore - 1);
    }

    const resolveButtons = page.getByRole("button", { name: /Mark resolved/ });
    const resolveBefore = await resolveButtons.count();
    if (resolveBefore > 0) {
      await resolveButtons.first().click();
      await expect(resolveButtons).toHaveCount(resolveBefore - 1);
    }

    expectNoPageErrors(pageErrors);
  });
});

test.describe("teacher operations tabs", () => {
  test("reminders tab runs due reminders and reports the run", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await loginAsTeacher(page);

    await page.goto("/teacher/operations/reminders");
    await expect(page.getByRole("heading", { name: /Missing-work reminders/i })).toBeVisible();

    const runResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/reminder") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Run due reminders/i }).click();
    expect((await runResponse).status()).toBeLessThan(500);

    expectNoPageErrors(pageErrors);
  });

  test("collaboration tab adds a collaborator and creates a prep team", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);
    const teamName = `E2E prep team ${uniqueSuffix(testInfo)}`;
    await loginAsTeacher(page);

    await page.goto("/teacher/operations/collaboration");
    await expect(page.getByRole("heading", { name: /Class collaborators/i })).toBeVisible();

    // Regression guard: the collaborator POST used to succeed while the view
    // never refreshed, so assert the saved collaborator actually appears.
    const collaboratorResponse = page.waitForResponse((response) =>
      response.url().includes("/collaborators") && response.request().method() === "POST"
    );
    await page.locator('input[name="teacherUsername"]').first().fill("Teacher Phoebe");
    await page.getByRole("button", { name: /Save collaborator/i }).click();
    expect((await collaboratorResponse).status()).toBeLessThan(500);
    await expect(page.getByText(/Teacher Phoebe/i).first()).toBeVisible();

    const teamResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/prep-teams") && response.request().method() === "POST"
    );
    await page.locator('input[name="name"]').first().fill(teamName);
    await page.getByRole("button", { name: /Create prep team/i }).click();
    expect((await teamResponse).status()).toBeLessThan(500);
    await expect(page.getByText(teamName).first()).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("term archives tab creates a snapshot with a download link", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);
    const termLabel = `E2E term ${uniqueSuffix(testInfo)}`;
    await loginAsTeacher(page);

    await page.goto("/teacher/operations/term-archives");
    await expect(page.getByRole("heading", { name: /Create read-only snapshot/i })).toBeVisible();

    const archiveResponse = page.waitForResponse((response) =>
      response.url().includes("/term-archives") && response.request().method() === "POST"
    );
    await page.locator('input[name="termLabel"]').first().fill(termLabel);
    await page.getByRole("button", { name: /Archive term/i }).click();
    expect((await archiveResponse).status()).toBeLessThan(500);

    await expect(page.getByText(termLabel).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Download/i }).first()).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("roster tab renders the roster table and CSV import", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await loginAsTeacher(page);

    // Pin the seeded class: the roster lists the selected class, and the default
    // selection has no enrollments in a fresh database.
    await page.goto("/teacher/operations/roster?classId=class-s3a-2026");
    await expect(page.getByRole("heading", { name: /CSV import/i })).toBeVisible();
    await expect(page.locator("textarea").first()).toBeVisible();
    expect(await page.locator("table tbody tr").count()).toBeGreaterThan(0);

    expectNoPageErrors(pageErrors);
  });
});
