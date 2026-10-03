import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsDemoStudentApi } from "./helpers";

const points = [{ x: 0, y: 0 }, { x: 2, y: 1 }, { x: -2, y: 1 }];
const controls = [[5, 4], [0, 0], [3, 10], [10, 4], [5, 5]] as const;

async function openCoordinateLab(page: Page) {
  await loginAsDemoStudentApi(page);
  const sessionResponse = await page.request.get("/api/me");
  expect(sessionResponse.ok()).toBeTruthy();
  const session = await sessionResponse.json();
  expect(session.user?.role).toBe("student");
  const settingsResponse = await page.request.patch("/api/me/settings", {
    headers: { "X-MAIS-Expected-User-Id": session.user.id },
    data: { expectedUserId: session.user.id, language: "en", selectedGrade: "S4" }
  });
  expect(settingsResponse.ok()).toBeTruthy();
  expect((await settingsResponse.json()).settings.language).toBe("en");
  await page.goto("/student/tools/visualizations?grade=S4&track=HK&lab=coordinate-geometry");
  const lab = page.locator("#lab-example-coordinate-geometry");
  await expect(lab).toBeVisible({ timeout: 45_000 });
  for (const point of points) {
    await lab.getByLabel("Point x", { exact: true }).fill(String(point.x));
    await lab.getByLabel("Point y", { exact: true }).fill(String(point.y));
    await lab.getByRole("button", { name: "Add point", exact: true }).click();
  }
  await expect(lab.locator('[data-viz-name="user point"]')).toHaveCount(points.length);
  await expect(lab.locator('[data-viz-name="transformed point"]')).toHaveCount(points.length);
  return lab;
}

async function setRange(control: Locator, value: number) {
  await control.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, String(nextValue));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
  await expect(control).toHaveValue(String(value));
}

for (const [mode, button] of [[0, "Translate"], [1, "Reflect"], [2, "Dilate"]] as const) {
  test(`student-entered points obey ${button} and share the triangle's invariant`, async ({ page }) => {
    test.setTimeout(180_000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const lab = await openCoordinateLab(page);
    const sliders = lab.locator('input[type="range"]');
    for (const [value, comparison] of controls) {
      // Set the translation controls first; Reflect/Dilate disable the second
      // slider but must not apply its stale value to the entered point images.
      await lab.getByRole("button", { name: "Translate", exact: true }).click();
      await setRange(sliders.nth(0), value);
      await setRange(sliders.nth(1), comparison);
      await lab.getByRole("button", { name: button, exact: true }).click();
      if (mode === 0) await expect(sliders.nth(1)).toBeEnabled();
      else await expect(sliders.nth(1)).toBeDisabled();

      for (const [index, point] of points.entries()) {
        // Arithmetic oracle is independent of the production transform helper.
        const k = 0.25 + value * 0.25;
        const expected = mode === 0
          ? { x: point.x + value - 5, y: point.y + comparison - 5 }
          : mode === 1
            ? { x: value - 5 - point.x, y: point.y }
            : { x: point.x * k, y: point.y * k };
        const source = lab.locator(`[data-viz-name="user point"][data-viz-point-index="${index + 1}"]`);
        const image = lab.locator(`[data-viz-name="transformed point"][data-viz-point-index="${index + 1}"]`);
        await expect.poll(async () => ({
          x: Number(await image.getAttribute("data-viz-x")),
          y: Number(await image.getAttribute("data-viz-y"))
        }), { message: `${button}: point ${index + 1}, value=${value}, comparison=${comparison}` }).toEqual(expected);
        if (expected.x === point.x && expected.y === point.y) {
          await expect(source).toHaveAttribute("data-viz-clipped", "false");
          await expect(image).toHaveAttribute("data-viz-clipped", "false");
          expect(Number(await image.getAttribute("cx"))).toBe(Number(await source.getAttribute("cx")));
          expect(Number(await image.getAttribute("cy"))).toBe(Number(await source.getAttribute("cy")));
        }
      }
    }
    expect(pageErrors).toEqual([]);
  });
}
