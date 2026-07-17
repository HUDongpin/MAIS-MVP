import { expect, test, type Locator } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

async function expectBoundingBox(locator: Locator, label: string) {
  const box = await locator.boundingBox();
  expect(box, `${label} should have a rendered bounding box`).not.toBeNull();
  return box!;
}

test.describe("login input width regression", () => {
  test("keeps username and password input fill widths equal", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto("/login");

    const usernameInput = page.locator("#login-identifier");
    const passwordInput = page.locator("#login-password");
    const passwordWrapper = passwordInput.locator("xpath=..");
    const revealButton = passwordWrapper.getByRole("button", {
      name: /show password|hide password|顯示密碼|隱藏密碼|显示密码|隐藏密码/i
    });

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(page.getByText(/fills automatically|fill automatically|自動填入|自动填入/i)).toHaveCount(0);
    await usernameInput.fill("Teacher Scott");
    await passwordInput.fill("12345");
    await expect(revealButton).toBeVisible();

    const usernameBox = await expectBoundingBox(usernameInput, "username input");
    const passwordBox = await expectBoundingBox(passwordInput, "password input");
    const wrapperBox = await expectBoundingBox(passwordWrapper, "password wrapper");
    const revealButtonBox = await expectBoundingBox(revealButton, "password reveal button");

    expect(
      Math.abs(usernameBox.width - passwordBox.width),
      `username width ${usernameBox.width}px and password width ${passwordBox.width}px should match`
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(wrapperBox.width - passwordBox.width),
      `password wrapper width ${wrapperBox.width}px and password input width ${passwordBox.width}px should match`
    ).toBeLessThanOrEqual(1);
    expect(revealButtonBox.x).toBeGreaterThanOrEqual(passwordBox.x);
    expect(revealButtonBox.x + revealButtonBox.width).toBeLessThanOrEqual(passwordBox.x + passwordBox.width + 1);

    expectNoPageErrors(pageErrors);
  });
});
