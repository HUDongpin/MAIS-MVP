import { expect, test } from "@playwright/test";
import {
  expectDownloadFrom,
  fixturePath,
  loginAsTeacher,
  uniqueSuffix
} from "./helpers";

// Add the first question in the free paper builder's Select step, waiting for
// the async question query to settle and confirming the paper count actually
// incremented before the caller publishes/saves (guards a load-order race).
async function addFirstWizardQuestion(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /^2\. Select$/i }).click();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const paperCount = page
    .locator("div.soft-panel")
    .filter({ hasText: /In paper/i })
    .locator("p.gradient-text");
  await page.getByRole("button", { name: /^Add$/i }).first().click();
  await expect(paperCount).not.toHaveText(/^0$/);
}

test.describe.serial("teacher workspace frontend workflows", () => {
  test("teacher navigation, search, class creation, resources, and assessments work", async ({ page }, testInfo) => {
    test.slow();
    const suffix = uniqueSuffix(testInfo);
    const shortSuffix = suffix.slice(0, 18);
    const className = `E2E S4 Clinic ${shortSuffix}`;
    const resourceTitle = `E2E PDF ${shortSuffix}`;
    const assessmentTitle = `E2E quiz ${shortSuffix}`;

    await loginAsTeacher(page);
    await expect(page.getByRole("navigation", { name: /Teacher navigation/i })).toBeVisible();

    const routes = [
      ["/teacher", /Teacher Console|Class command center/i],
      ["/teacher/classes", /Class and student management/i],
      ["/teacher/analytics", /Class insight and intervention/i],
      ["/teacher/rewards", /Rewards and gift redemptions/i],
      ["/teacher/live", /Live classroom|Start a classroom check/i],
      ["/teacher/assignments", /Assignment distribution/i],
      ["/teacher/resources", /Teaching resources and papers/i],
      ["/teacher/assessments", /Quiz, test, and mock exam management/i],
      ["/teacher/reports", /Bilingual learning reports/i],
      ["/teacher/inbox", /^Inbox$/i]
    ] as const;

    for (const [route, visibleText] of routes) {
      await page.goto(route);
      // The mobile nav toggle duplicates the active section label inside a
      // display:none bar at desktop width, so assert on visible matches only.
      await expect(page.getByText(visibleText).filter({ visible: true }).first()).toBeVisible();
    }

    // The route loop above already verifies the /teacher alias. Exercise the
    // search form on its canonical route so Enter cannot race the alias
    // redirect and hydrate with a stale /teacher pathname on a cold CI run.
    await page.goto("/teacher/dashboard");
    await expect(page).toHaveURL(/\/teacher\/dashboard$/);
    await page.getByPlaceholder(/Search students, assignments, resources/i).fill("quadratic");
    await page.getByPlaceholder(/Search students, assignments, resources/i).press("Enter");
    await expect(page).toHaveURL(/\/teacher\/dashboard\?q=quadratic/);
    await page.getByLabel(/Class focus/i).selectOption("class-s3a-2026");
    await expect(page).toHaveURL(/classId=class-s3a-2026/);

    await page.goto("/teacher/classes");
    const classSection = page.locator("section").filter({ hasText: /Class and student management/i }).first();
    await classSection.getByLabel(/Class name/i).fill(className);
    await classSection.getByLabel(/Grade/i).selectOption("S4");
    await classSection.getByLabel(/Academic year/i).fill("2026-2027");
    await classSection.getByLabel(/Notes/i).fill("Created by frontend e2e coverage.");
    const createClassResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/classes") && response.request().method() === "POST"
    );
    await classSection.getByRole("button", { name: /^Create$/i }).click({ force: true });
    expect((await createClassResponse).ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByRole("link", { name: new RegExp(className, "i") })).toBeVisible();

    await page.goto("/teacher/resources");
    const uploadSection = page.locator("section").filter({ hasText: /Upload resource/i }).first();
    await uploadSection.getByLabel(/Title/i).fill(resourceTitle);
    await uploadSection.getByLabel(/Grade/i).selectOption("S3");
    await uploadSection.getByLabel(/Type/i).selectOption("worksheet");
    await uploadSection.getByLabel(/Difficulty/i).selectOption("Medium");
    await uploadSection.locator('input[name="file"]').setInputFiles(fixturePath("sample-resource.pdf"));
    const uploadResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/resources") && response.request().method() === "POST"
    );
    await uploadSection.getByRole("button", { name: /Upload/i }).click();
    expect((await uploadResponse).ok()).toBeTruthy();
    await page.reload();
    // The uploaded resource renders in multiple placements (highlight card,
    // responsive variants); the library table row is the canonical one.
    await expect(page.getByRole("table").getByText(resourceTitle)).toBeVisible();
    await page.getByLabel(/Recent/i).check();
    const uploadedResourceRow = page.locator("tr").filter({ hasText: resourceTitle }).first();
    await expect(uploadedResourceRow).toBeVisible();
    await expectDownloadFrom(page, () => uploadedResourceRow.getByRole("link", { name: /Download/i }).click(), /sample-resource\.pdf/);

    await page.goto("/teacher/assessments/new");
    await page.getByRole("combobox", { name: /^Class$/i }).selectOption("class-s3a-2026");
    await page.getByRole("combobox", { name: /Assessment type/i }).selectOption("quiz");
    await page.getByRole("textbox", { name: /^Title$/i }).fill(assessmentTitle);
    await page.getByRole("spinbutton", { name: /Time limit/i }).fill("20");
    await page.getByRole("spinbutton", { name: /Weight/i }).fill("15");
    await page.getByRole("spinbutton", { name: /Attempts/i }).fill("2");
    // The free paper builder wizard requires at least one selected question
    // before it can publish; add the first question from the Select step.
    await addFirstWizardQuestion(page);
    await page.getByRole("button", { name: /Publish assessment/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assessments\/assessment-/);
    await expect(page.getByRole("heading", { name: new RegExp(assessmentTitle, "i") })).toBeVisible();
    await expect(page.getByText(/Score distribution/i)).toBeVisible();
    await expectDownloadFrom(page, () => page.getByRole("link", { name: /Export CSV/i }).click(), /assessment-.*-scores\.csv/);

  });

  test("teacher assignments, analytics, live classroom, reports, and inbox actions work", async ({ page }, testInfo) => {
    test.slow();
    const suffix = uniqueSuffix(testInfo);
    const assignmentTitle = `E2E lesson assignment ${suffix}`;

    await loginAsTeacher(page);

    await page.goto("/teacher/assignments/new");
    await page.getByRole("combobox", { name: /^Class$/i }).selectOption("class-s3a-2026");
    await page.getByRole("combobox", { name: /Content type/i }).selectOption("lesson");
    await page.getByRole("textbox", { name: /^Title$/i }).fill(assignmentTitle);
    await page.getByRole("textbox", { name: /Target ID/i }).fill("quadratic-functions");
    await page.getByRole("textbox", { name: /Description/i }).fill("Frontend e2e grading coverage.");
    await page.getByRole("button", { name: /^Create assignment$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assignments\/assignment-/);
    await expect(page.getByRole("heading", { name: new RegExp(assignmentTitle, "i") })).toBeVisible();
    // Grading moved from table rows to per-student cards with a score input
    // and explicit "Save score" / "Return for correction" actions.
    const submissionCard = page.locator("article").filter({ hasText: /HK Student Peter/i }).first();
    await submissionCard.locator("input").first().fill("88");
    await submissionCard.getByRole("button", { name: /Save score/i }).click();
    await expect(submissionCard.getByText(/88/).first()).toBeVisible();

    // OCR/AI grading suggestion + loop closure (offline fixture provider).
    await submissionCard.getByRole("button", { name: /Run OCR\/AI suggestion/i }).click();
    await expect(submissionCard.getByText(/AI suggestion ready/i)).toBeVisible();
    await submissionCard.getByRole("button", { name: /Confirm and close loop/i }).click();
    await expect(submissionCard.getByText(/Review recorded/i)).toBeVisible();

    await page.goto("/teacher/analytics");
    await expect(page.getByRole("heading", { name: /Class insight and intervention/i })).toBeVisible();
    await expect(page.getByText(/Topic mastery heatmap/i)).toBeVisible();
    const followUp = page.getByRole("button", { name: /Create follow-up/i }).first();
    if (await followUp.isVisible().catch(() => false)) {
      await followUp.click();
      await expect(page.getByRole("button", { name: /Added/i }).first()).toBeVisible();
    }

    await page.goto("/teacher/live");
    await expect(page.getByRole("heading", { name: /quadratic checkpoint|Start a classroom check/i })).toBeVisible();
    if (await page.getByText(/Join code/i).first().isVisible().catch(() => false)) {
      await expect(page.getByRole("link", { name: /Open student view/i })).toHaveAttribute("href", /\/classroom\?code=/);
    } else {
      await page.getByRole("combobox", { name: /^Class$/i }).selectOption("class-s3a-2026");
      await page.getByRole("textbox", { name: /Question/i }).fill("Which option shows the next step?");
      await page.getByRole("textbox", { name: /Topic ID/i }).fill("quadratic-patterns");
      await page.getByRole("button", { name: /^Start$/i }).click();
      await expect(page.getByText(/Join code/i).first()).toBeVisible();
    }
    const studentViewLink = page.getByRole("link", { name: /Open student view/i });
    await expect(studentViewLink).toHaveAttribute("href", /\/classroom\?code=/);
    await studentViewLink.click();
    await expect(page.getByRole("heading", { name: /Join live classroom/i })).toBeVisible();
    await expect(page.getByText(/Teacher preview/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^A ·/i }).first()).toBeDisabled();
    await expect(page.getByRole("button", { name: /Preview only/i })).toBeDisabled();

    // The shell's "Class focus" publishes ?classId= on every teacher route, and
    // /teacher/analytics and /teacher/gradebook both scope on it. The reports form
    // used to ignore it, so "Class focus: S1 Foundation" could sit above a form
    // still set to S3A and the saved report was for the class not chosen.
    await page.goto("/teacher/reports?classId=class-s1-foundation-2026");
    await expect(
      page.getByRole("combobox", { name: /^Class focus$/i }),
      "shell Class focus should reflect the requested class"
    ).toHaveValue("class-s1-foundation-2026");
    await expect(
      page.getByRole("combobox", { name: /^Class$/i }),
      "the report form must target the focused class, not its own default"
    ).toHaveValue("class-s1-foundation-2026");

    await page.goto("/teacher/reports");
    await page.getByRole("combobox", { name: /^Type$/i }).selectOption("student");
    await page.getByRole("combobox", { name: /Language/i }).selectOption("en");
    // The remarks edit re-runs the debounced preview fetch, and the remarks text
    // travels in that request's query string — match on this run's suffix so the
    // wait below settles on the final preview, not an earlier superseded one.
    const reportRemarks = `Keep practising vertex form and explain each graph move. Run ${suffix}.`;
    const remarksPreviewResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/report-previews") && response.url().includes(suffix)
    );
    await page.getByRole("textbox", { name: /Teacher remarks/i }).fill(reportRemarks);
    await expect(page.getByText(/Teacher remarks/i).last()).toBeVisible();
    await expectDownloadFrom(page, () => page.getByRole("link", { name: /Export CSV/i }).click({ force: true }), /student-report-.*\.csv/);
    await expectDownloadFrom(page, () => page.getByRole("link", { name: /Export PDF/i }).click({ force: true }), /student-report-.*\.pdf/);
    // "Save report" stays disabled while that preview refresh is in flight, and a
    // forced click on a disabled button is silently dropped — so wait for the
    // preview to land and the button to be enabled, then confirm the save on the
    // POST rather than racing the toast that only follows a click that landed.
    await remarksPreviewResponse;
    const saveReportButton = page.getByRole("button", { name: /^Save report$/i });
    await expect(saveReportButton).toBeEnabled();
    const savedReportResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/saved-reports") && response.request().method() === "POST"
    );
    await saveReportButton.click();
    expect((await savedReportResponse).ok()).toBeTruthy();
    await expect(page.getByText(/Report saved and added to history/i)).toBeVisible();

    // Pin the thread this run works on. Without `?thread=`, the server selects the
    // first unresolved thread, so once this test resolves one, a retry (or any
    // spec sharing the run's database) silently lands on a different thread.
    const inboxResponse = await page.request.get("/api/teacher/inbox");
    expect(inboxResponse.ok()).toBeTruthy();
    const inboxPayload = await inboxResponse.json() as {
      inbox?: { selectedThread?: { id?: string } | null; threads?: Array<{ id: string }> };
    };
    const inboxThreadId = inboxPayload.inbox?.selectedThread?.id ?? inboxPayload.inbox?.threads?.[0]?.id;
    expect(inboxThreadId, "teacher inbox must expose at least one thread").toBeTruthy();

    await page.goto(`/teacher/inbox?thread=${encodeURIComponent(inboxThreadId!)}`);
    await expect(page.getByRole("heading", { name: /^Inbox$/i })).toBeVisible();
    const replyBox = page.getByPlaceholder(/Reply to the (student|parent)/i);
    await expect(replyBox).toBeEmpty();
    await page.getByRole("button", { name: /Draft reply/i }).click();
    await expect(replyBox).not.toBeEmpty();
    // Tag the outgoing reply so each attempt appends a distinguishable message
    // instead of an identical one.
    await replyBox.fill(`${(await replyBox.inputValue()).trim()} Sent by e2e run ${suffix}.`);

    // Star and resolve both PATCH and then refresh the server-rendered thread;
    // each toggles from whatever the previous run left behind, so assert the
    // label actually flipped. Letting the refresh land also keeps the composer
    // from shifting under the next click.
    const starToggle = page.getByRole("button", { name: /Star|Unstar/i });
    const starLabel = (await starToggle.innerText()).trim();
    const starResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/inbox/") && response.request().method() === "PATCH"
    );
    await starToggle.click();
    expect((await starResponse).ok()).toBeTruthy();
    await expect(starToggle).not.toHaveText(starLabel);

    const statusToggle = page.getByRole("button", { name: /Resolve|Reopen/i });
    const statusLabel = (await statusToggle.innerText()).trim();
    const statusResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/inbox/") && response.request().method() === "PATCH"
    );
    await statusToggle.click();
    expect((await statusResponse).ok()).toBeTruthy();
    await expect(statusToggle).not.toHaveText(statusLabel);

    const sendReplyResponse = page.waitForResponse((response) =>
      /^\/api\/teacher\/inbox\/.+\/replies$/.test(new URL(response.url()).pathname) &&
      response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Send reply/i }).click();
    expect((await sendReplyResponse).ok()).toBeTruthy();
    await expect(replyBox).toBeEmpty();

  });

  test("assessment wizard saves a draft and reopens it for editing", async ({ page }, testInfo) => {
    test.slow();
    const draftTitle = `E2E draft quiz ${uniqueSuffix(testInfo).slice(0, 18)}`;

    await loginAsTeacher(page);
    await page.goto("/teacher/assessments/new");
    await page.getByRole("combobox", { name: /^Class$/i }).selectOption("class-s3a-2026");
    await page.getByRole("combobox", { name: /Assessment type/i }).selectOption("quiz");
    await page.getByRole("textbox", { name: /^Title$/i }).fill(draftTitle);

    // Publishing requires a question; the builder must surface an announced
    // validation alert if the teacher tries to save with an empty paper.
    // (Scope past Next's always-present empty route announcer.)
    await page.getByRole("button", { name: /Save draft/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /Add at least one question/i })).toBeVisible();

    await addFirstWizardQuestion(page);
    await page.getByRole("button", { name: /Save draft/i }).click();

    await expect(page).toHaveURL(/\/teacher\/assessments\/assessment-/);
    await expect(page.getByRole("heading", { name: new RegExp(draftTitle, "i") })).toBeVisible();
    await expect(page.getByText(/^Draft$/).first()).toBeVisible();

    // Draft assessments must be editable; the edit route reopens the builder.
    await page.getByRole("link", { name: /^Edit$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assessments\/assessment-.*\/edit/);
    await expect(page.getByRole("textbox", { name: /^Title$/i })).toHaveValue(new RegExp(draftTitle, "i"));
  });
});
