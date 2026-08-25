import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  authenticateAsDemoStudent,
  authenticateAsTeacher,
  collectPageErrors,
  expectDownloadFrom,
  expectNoPageErrors,
  uniqueSuffix
} from "./helpers";

async function authenticateAsEnglishTeacher(page: Parameters<typeof authenticateAsTeacher>[0]) {
  await authenticateAsTeacher(page);
  const settingsResponse = await page.request.patch("/api/me/settings", {
    data: { language: "en", theme: "light" }
  });
  expect(settingsResponse.status(), await settingsResponse.text()).toBe(200);
}

async function expectNoDocumentHorizontalOverflow(page: Page, testInfo: TestInfo) {
  const evidence = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const clientWidth = documentElement.clientWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          className: typeof element.className === "string" ? element.className : "",
          clientWidth: element.clientWidth,
          left: rect.left,
          overflowX: style.overflowX,
          position: style.position,
          right: rect.right,
          scrollWidth: element.scrollWidth,
          tagName: element.tagName.toLowerCase(),
          width: rect.width
        };
      })
      .filter((entry) => entry.left < -1 || entry.right > clientWidth + 1 || entry.width > clientWidth + 1)
      .sort((left, right) => Math.max(right.right, right.width) - Math.max(left.right, left.width))
      .slice(0, 30);
    return {
      clientWidth,
      scrollWidth: documentElement.scrollWidth,
      offenders
    };
  });
  await testInfo.attach("teacher-v3-horizontal-overflow.json", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json"
  });
  expect(
    evidence.scrollWidth,
    `horizontal overflow evidence: ${JSON.stringify(evidence)}`
  ).toBeLessThanOrEqual(evidence.clientWidth);
}

test.describe.serial("MAIS Manim v3 teacher authoring", () => {
  test("keeps teacher routes behind teacher authentication", async ({ page }) => {
    await page.goto("/teacher/visualizations");
    await expect(page).toHaveURL(/\/login\?next=/);

    await authenticateAsDemoStudent(page);
    await page.goto("/teacher/visualizations");
    await expect(page).toHaveURL(/\/login\?.*reason=teacher-account-required/);

    await authenticateAsEnglishTeacher(page);
    await page.goto("/teacher/visualizations");
    await expect(page.getByRole("heading", { name: /Visualization studio/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /New bounded draft/i })).toBeVisible();
  });

  test("creates, versions, restores, conflicts, and exports one bounded draft", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const pageErrors = collectPageErrors(page);
    const suffix = uniqueSuffix(testInfo);
    const title = `Sine height bounded ${suffix}`;

    await authenticateAsEnglishTeacher(page);
    await page.goto("/teacher/visualizations/new");
    const workspace = page.locator("[data-teacher-visualization-authoring-workspace]");
    await expect(workspace).toBeVisible();

    const titleInput = page.getByLabel(/Draft title/i);
    await expect(titleInput).toBeEnabled({ timeout: 15_000 });
    await titleInput.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/Draft review status/i)).toBeFocused();
    await titleInput.fill(title);

    await page.getByRole("button", { name: /Timeline & narration/i }).click();
    const beatEditor = page.locator("[data-authoring-timeline-captions] > section").first();
    const lastBeat = beatEditor.locator("article").last();
    const durationInput = lastBeat.getByLabel(/^Duration$/i);
    const originalDuration = Number(await durationInput.inputValue());
    expect(Number.isFinite(originalDuration)).toBeTruthy();
    await durationInput.fill(String(originalDuration + 0.5));

    await page.getByRole("button", { name: /^Checkpoint$/i }).click();
    await page.getByText(/Saved checkpoints \(1\)/i).click();
    await expect(page.getByRole("button", { name: /Restore checkpoint/i })).toBeVisible();

    const createResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/teacher/visualization-drafts")
      && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Save cloud draft/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status(), await createResponse.text()).toBe(201);
    await expect(page).toHaveURL(/\/teacher\/visualizations\/visualization-draft-/);
    const draftUrl = page.url();
    const draftId = decodeURIComponent(new URL(draftUrl).pathname.split("/").at(-1) ?? "");
    expect(draftId).toMatch(/^visualization-draft-/);

    const competingTab = await page.context().newPage();
    await competingTab.goto(draftUrl);
    await expect(competingTab.locator("[data-local-writer-conflict]")).toBeVisible({ timeout: 15_000 });
    await expect(competingTab.getByRole("button", { name: /Export current local copy/i })).toBeVisible();
    await expect(competingTab.getByLabel(/Draft title/i)).toBeDisabled();
    await competingTab.close();

    await page.reload();
    await expect(page.getByLabel(/Draft title/i)).toHaveValue(title);
    await page.getByText(/Saved checkpoints \(1\)/i).click();
    await expect(page.getByRole("button", { name: /Restore checkpoint/i })).toBeVisible();

    const currentResponse = await page.request.get(`/api/teacher/visualization-drafts/${encodeURIComponent(draftId)}`);
    const currentResponseText = await currentResponse.text();
    expect(currentResponse.status(), currentResponseText).toBe(200);
    const currentBody = JSON.parse(currentResponseText) as { draft: { revision: number } };
    const serverAdvance = await page.request.patch(`/api/teacher/visualization-drafts/${encodeURIComponent(draftId)}`, {
      data: {
        baseRevision: currentBody.draft.revision,
        title: `${title} server`
      }
    });
    expect(serverAdvance.status(), await serverAdvance.text()).toBe(200);

    await expect(page.getByLabel(/Draft title/i)).toBeEnabled({ timeout: 15_000 });
    await page.getByLabel(/Draft title/i).fill(`${title} local`);
    const conflictResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith(`/api/teacher/visualization-drafts/${draftId}`)
      && response.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: /Save cloud draft/i }).click();
    const conflictResponse = await conflictResponsePromise;
    expect(conflictResponse.status(), await conflictResponse.text()).toBe(409);
    await expect(page.getByRole("heading", { name: /Revision conflict — local work preserved/i })).toBeVisible();

    const saveCopyResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/teacher/visualization-drafts")
      && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Save local copy as a new draft/i }).click();
    const saveCopyResponse = await saveCopyResponsePromise;
    const saveCopyResponseText = await saveCopyResponse.text();
    expect(saveCopyResponse.status(), saveCopyResponseText).toBe(201);
    const saveCopyBody = JSON.parse(saveCopyResponseText) as { draft: { id: string } };
    expect(saveCopyBody.draft.id).not.toBe(draftId);
    await expect(page).toHaveURL(
      `/teacher/visualizations/${encodeURIComponent(saveCopyBody.draft.id)}`
    );
    await page.getByText(/Saved checkpoints \(1\)/i).click();
    await expect(page.getByRole("button", { name: /Restore checkpoint/i })).toBeVisible();

    await page.getByRole("button", { name: /Validate & export/i }).click();
    await page.getByRole("button", { name: /Validate package/i }).click();
    await expect(page.getByRole("status").filter({ hasText: /Scene Package structure is valid/i })).toBeVisible();

    await expectDownloadFrom(
      page,
      () => page.getByRole("button", { name: /Download Scene Package/i }).click(),
      /\.scene-package\.json$/
    );
    await expectDownloadFrom(
      page,
      () => page.getByRole("button", { name: /WebVTT · en/i }).click(),
      /\.en\.vtt$/
    );
    await expect(page.getByRole("button", { name: /WebM · A10_A22_CAPTURE_HARNESS_REQUIRED/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /MP4 · A10_A22_CAPTURE_HARNESS_REQUIRED/i })).toBeDisabled();
    await expect(page.getByText(/An MP4 CLI scaffold is present, but this workbench keeps MP4 disabled until the internal capture route is integrated and verified/i)).toBeVisible();
    await expect(page.getByText(/The WebM executor remains unconnected/i)).toBeVisible();
    await expectNoDocumentHorizontalOverflow(page, testInfo);
    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath("teacher-v3-authoring-final.png")
    });

    expectNoPageErrors(pageErrors);
  });

  test("renders the studio in all three languages and both themes", async ({ page }, testInfo) => {
    await authenticateAsTeacher(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    const cases = [
      { language: "en", heading: /Visualization studio/i },
      { language: "zh", heading: /數學動畫創作室/ },
      { language: "zh-Hans", heading: /數學動畫創作室|数学动画创作室/ }
    ] as const;

    for (const theme of ["light", "dark"] as const) {
      for (const languageCase of cases) {
        const settingsResponse = await page.request.patch("/api/me/settings", {
          data: { language: languageCase.language, theme }
        });
        expect(settingsResponse.status(), await settingsResponse.text()).toBe(200);
        await page.goto("/teacher/visualizations");
        await expect(page.getByRole("heading", { name: languageCase.heading })).toBeVisible();
        if (theme === "dark") await expect(page.locator("html")).toHaveClass(/\bdark\b/);
        else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
      }
    }
    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath("teacher-v3-trilingual-dark.png")
    });
  });
});
