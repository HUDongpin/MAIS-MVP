import { expect, test } from "@playwright/test";
import { loginAsTeacher } from "./helpers";

test("teacher search preserves parameters while the shell still has the legacy route", async ({ page }) => {
  await loginAsTeacher(page);
  await page.goto("/teacher/dashboard");
  const search = page.getByPlaceholder(/Search students, assignments, resources/i);
  await expect(search).toBeVisible();

  // Keep the mounted workspace while reproducing the legacy pathname visible
  // during an alias transition. Next's history integration updates usePathname.
  await page.evaluate(() => {
    window.history.replaceState(null, "", "/teacher?classId=class-s3a-2026");
  });
  await search.fill("quadratic & linear");
  await search.press("Enter");
  await expect(page).toHaveURL((url) =>
    url.pathname === "/teacher/dashboard"
    && url.searchParams.get("q") === "quadratic & linear"
    && url.searchParams.get("classId") === "class-s3a-2026"
  );

  await page.evaluate(() => {
    window.history.replaceState(null, "", "/teacher?q=quadratic&classId=class-s3a-2026");
  });
  await search.fill("");
  await search.press("Enter");
  await expect(page).toHaveURL((url) =>
    url.pathname === "/teacher/dashboard"
    && !url.searchParams.has("q")
    && url.searchParams.get("classId") === "class-s3a-2026"
  );
});
