import { expect, test, type Locator, type Page } from "@playwright/test";
import { authenticateAsDemoStudent, authenticateAsUserId, collectPageErrors, dismissGuestLoginPrompt, expectNoPageErrors } from "./helpers";

async function loginAsCaliforniaStudent(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: "Student Shirleen",
      password: "12345",
      grade: "P1",
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      language: "en",
      theme: "light"
    }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function setRangeValue(control: Locator, value: string) {
  await control.evaluate((input, nextValue) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function openLab(page: Page, grade: string, labId: string, track = "HK") {
  // These regressions exercise lab visuals as a guest; pre-dismiss the guest
  // login prompt so its 10s-delay modal does not intercept lab control clicks.
  // The prompt flow itself is covered by guest-login-prompt.spec.ts.
  await dismissGuestLoginPrompt(page);
  await page.goto(`/student/tools/visualizations?grade=${grade}&track=${track}&lab=${encodeURIComponent(labId)}`);
  const lab = page.locator(`#lab-example-${labId}`);
  // Lab sections stream in behind the catalog fetch and the documented manim
  // mount stalls, so allow a full load budget before interacting.
  await expect(lab).toBeVisible({ timeout: 30_000 });
  return lab;
}

async function expectComplexMarksInsideGraphFrame(lab: Locator) {
  const outsideMarks = await lab.locator("svg").first().evaluate((svg) => {
    const numberAttribute = (element: Element, name: string) => Number(element.getAttribute(name) ?? "NaN");
    const realAxis = svg.querySelector('[data-viz-name="real axis"]');
    const imaginaryAxis = svg.querySelector('[data-viz-name="imaginary axis"]');
    if (!realAxis || !imaginaryAxis) return ["missing complex-plane axes"];

    const frame = {
      maxX: numberAttribute(realAxis, "x2"),
      maxY: numberAttribute(imaginaryAxis, "y2"),
      minX: numberAttribute(realAxis, "x1"),
      minY: numberAttribute(imaginaryAxis, "y1")
    };
    const pointSelector = [
      '[data-viz-name="complex point"]',
      '[data-viz-name="conjugate point"]',
      '[data-viz-name="i times point"]'
    ].join(",");
    const pointIssues = Array.from(svg.querySelectorAll(pointSelector)).flatMap((element) => {
      const cx = numberAttribute(element, "cx");
      const cy = numberAttribute(element, "cy");
      const r = numberAttribute(element, "r");
      const name = element.getAttribute("data-viz-name") ?? "point";
      return cx - r >= frame.minX && cx + r <= frame.maxX && cy - r >= frame.minY && cy + r <= frame.maxY
        ? []
        : [`${name} outside frame at (${cx}, ${cy}) r=${r}`];
    });
    const labelIssues = Array.from(svg.querySelectorAll("text"))
      .filter((element) => /(?:9 \+ 9i|9 - 9i|-9 \+ 9i)/.test(element.textContent ?? ""))
      .flatMap((element) => {
        const x = numberAttribute(element, "x");
        const y = numberAttribute(element, "y");
        const label = element.textContent?.trim() ?? "complex label";
        return x >= frame.minX && x <= frame.maxX && y >= frame.minY && y <= frame.maxY
          ? []
          : [`${label} outside frame at (${x}, ${y})`];
      });

    return [...pointIssues, ...labelIssues];
  });

  expect(outsideMarks).toEqual([]);
}

test.describe("reported bug regressions", () => {
  test("student assignments route shows a readable loading state instead of a blank panel", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAsCaliforniaStudent(page);
    await page.route("**/api/assignments", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.continue();
    }, { times: 1 });

    await page.goto("/student/assignments");

    // The hydrated view owns the single announced loading region (the route
    // skeleton is aria-hidden), so exactly one status region is announced.
    await expect(page.getByRole("status").getByText(/Loading assignments/i)).toBeVisible({ timeout: 500 });
    await expect(page.getByRole("heading", { name: /My assignments/i })).toBeVisible({ timeout: 15_000 });

    expectNoPageErrors(pageErrors);
  });

  test("personalized learning All assignments opens the student assignments list", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAsCaliforniaStudent(page);
    await page.goto("/personalized-learning");
    await page.getByRole("link", { name: /All assignments/i }).click();

    await expect(page).toHaveURL(/\/student\/assignments$/);
    await expect(page.getByRole("heading", { name: /My assignments/i })).toBeVisible();
    await expect(page.getByText(/Total/i)).toBeVisible();
    await expect(page.getByText(/No assignments yet|Open assignment/i)).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("personalized learning Mission HUD expands from a compact information panel", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await authenticateAsUserId(page, "student-shirleen-us");
    await page.goto("/personalized-learning");

    const missionHudToggle = page.getByRole("button", { name: /Mission HUD/i });
    const missionAction = page.getByRole("link", { name: /Open practice|Enter planet|Start mission/i });
    await expect(missionHudToggle).toBeVisible();
    await expect(missionHudToggle).toHaveAttribute("aria-expanded", "false");
    await expect(missionAction).toBeHidden();

    await missionHudToggle.click();

    await expect(missionHudToggle).toHaveAttribute("aria-expanded", "true");
    await expect(missionAction).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("authenticated login page stays on login instead of auto-hopping through the generic dashboard", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await authenticateAsDemoStudent(page);
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /^Log in$/i })).toBeVisible();

    await expect(page.getByText(/Signed in|已登入/i)).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3000);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /^Log in$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Welcome back, Explorer/i })).toHaveCount(0);

    expectNoPageErrors(pageErrors);
  });

  test("authenticated dashboard is server-seeded before the first interactive learner shell", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await authenticateAsDemoStudent(page);
    let sessionStateRequests = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/auth/session-state") sessionStateRequests += 1;
    });

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: /Welcome back, HK Student Peter|Welcome back,\s*Peter/i })).toBeVisible({ timeout: 15_000 });
    const languageTrigger = page.locator('header button[aria-haspopup="menu"]').first();
    await languageTrigger.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    expect(sessionStateRequests, "server-seeded auth must not be replaced by a duplicate mount-time session request").toBe(0);

    expectNoPageErrors(pageErrors);
  });

  test("auth password fields expose persistent reveal controls", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto("/login");
    await page.getByLabel(/^password$/i).fill("secret123");
    const loginReveal = page.getByRole("button", { name: /show password/i });
    await expect(loginReveal).toBeVisible();
    await loginReveal.click();
    await expect(page.locator("#login-password")).toHaveAttribute("type", "text");
    await page.locator("#login-identifier").click();
    await expect(page.getByRole("button", { name: /hide password/i })).toBeVisible();

    await page.goto("/register");
    await page.getByRole("button", { name: /Account details|Details/i }).last().click();
    await expect(page.getByRole("button", { name: /show password/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /show confirm password/i })).toBeVisible();

    await page.goto("/reset-password?token=test-token");
    await expect(page.getByRole("button", { name: /show new password/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /show confirm new password/i })).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("function model graph clips overflowing curves and exposes a hover probe", async ({ page }) => {
    // The manim runtime deck still runs two ~8s main-thread render tasks after
    // lab mount (A06 deck-render redesign routed 2026-07-09); the extended
    // budget lets actionability checks clear those documented stalls while the
    // clipping/hover contract stays fully verified.
    test.slow();
    const pageErrors = collectPageErrors(page);
    const lab = await openLab(page, "S4", "functions");

    await lab.getByRole("button", { name: /^Exponential$/i }).click();
    await setRangeValue(lab.locator('input[type="range"]').nth(0), "2");
    await setRangeValue(lab.locator('input[type="range"]').nth(1), "5");

    await expect(lab.locator("svg clipPath#functionModelPlotClip")).toHaveCount(1);
    await expect(lab.locator('[data-viz-name="model curve"][data-viz-model="exponential"]')).toHaveAttribute("clip-path", /functionModelPlotClip/);
    await expect(lab.locator('[data-viz-name="selected model point"]')).toHaveAttribute("clip-path", /functionModelPlotClip/);

    const point = lab.locator('[data-viz-name="selected model point"]');
    await point.hover();
    await expect(point).toHaveAttribute("data-viz-hover-active", "true");
    await expect(lab.getByText(/Sample point/i)).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("coordinate lab rejects impossible typed coordinates instead of silently clamping", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    const lab = await openLab(page, "S4", "coordinate-geometry");

    const pointCountBefore = await lab.locator('[data-viz-name="transformed point"]').count();
    await lab.locator('input[type="number"]').nth(0).fill("19");
    await lab.locator('input[type="number"]').nth(1).fill("7");
    await lab.getByRole("button", { name: /Add point/i }).click();

    await expect(lab.locator('[data-viz-name="transformed point"]')).toHaveCount(pointCountBefore);
    await expect(lab.getByText(/Use x from -8 to 8 and y from -6 to 6/i)).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("complex plane keeps max imaginary states inside the graph frame", async ({ page }) => {
    // Extended budget for the documented ~8s manim deck render stalls (A06
    // deck-render redesign routed 2026-07-09); the frame-containment contract
    // itself is unchanged.
    test.slow();
    const pageErrors = collectPageErrors(page);

    await page.addInitScript({
      content: `
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(contextId, ...args) {
          if (typeof contextId === "string" && contextId.toLowerCase().includes("webgl")) return null;
          return originalGetContext.call(this, contextId, ...args);
        };
      `
    });
    const lab = await openLab(page, "S4", "pep-high-s4-complex-numbers", "MAINLAND_PEP_HIGH");

    await setRangeValue(lab.getByLabel(/Real part/i), "9");
    await setRangeValue(lab.getByLabel(/Imaginary part/i), "9");

    await lab.getByRole("button", { name: /^z$/i }).click();
    await expectComplexMarksInsideGraphFrame(lab);
    await lab.getByRole("button", { name: /^Conjugate$/i }).click();
    await expectComplexMarksInsideGraphFrame(lab);
    await lab.getByRole("button", { name: /^i times z$/i }).click();
    await expectComplexMarksInsideGraphFrame(lab);

    expectNoPageErrors(pageErrors);
  });

  test("tangent gradient tick labels remain visible", async ({ page }) => {
    // Extended budget for the documented ~8s manim deck render stalls (A06
    // deck-render redesign routed 2026-07-09).
    test.slow();
    const pageErrors = collectPageErrors(page);

    await authenticateAsDemoStudent(page);
    await page.goto("/student/lessons/calculus");
    await page.getByText(/Explore tangent gradients/i).first().scrollIntoViewIfNeeded();
    // The calculus lesson now embeds the configured Calculus Visual Lab (the
    // primary-lab mapping contract); the protected property is unchanged: the
    // tangent visual renders with readable numeric axis tick labels.
    const calculusSvg = page.locator('svg[aria-label*="Calculus" i]').first();
    await expect(calculusSvg).toBeVisible();
    await expect(calculusSvg.locator('[data-viz-name="tangent"]')).toHaveCount(1);

    const numericTickLabelCount = await calculusSvg.locator("text").evaluateAll((nodes) =>
      nodes.filter((node) => /^-?\d+(\.\d+)?$/.test((node.textContent ?? "").trim())).length
    );
    expect(numericTickLabelCount).toBeGreaterThanOrEqual(8);

    expectNoPageErrors(pageErrors);
  });
});
