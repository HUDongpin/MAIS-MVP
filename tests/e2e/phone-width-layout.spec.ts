import { expect, test } from "@playwright/test";
import { authenticateAsUserId } from "./helpers";

/**
 * Nothing may push the page wider than the screen.
 *
 * This exists because a horizontal overflow is invisible until someone opens the
 * product on a small screen: the lesson page shipped for a long time laying out
 * ~562px wide inside a 393px phone, which pushed the world menu's rightmost
 * control off the side of the display where it could not be tapped at all. The
 * cause was a grid that declared its columns only at `lg:` — below that
 * breakpoint the single implicit `auto` track was sized by its content and
 * refused to shrink. That idiom (`lg:grid-cols-*` with no unprefixed base) is
 * used in ~294 class strings across the app, and it is harmless in almost all of
 * them, so the guard belongs here at the symptom rather than as a lint on the
 * pattern.
 *
 * A child wider than the viewport is only a defect when the page itself grows.
 * An element inside its own `overflow-x: auto` scroller is deliberate — wide
 * diagrams and teacher data tables pan on purpose — so those are excluded.
 */

const student = "student-jon-us-ca-super";
const teacher = "teacher-rhi-us-ca-super";
const parent = "parent-peter-family";

const phone = { width: 393, height: 850 };

const surfaces: Array<{ name: string; user: string | null; route: string }> = [
  { name: "login", user: null, route: "/login" },
  { name: "student dashboard", user: student, route: "/dashboard" },
  { name: "practice", user: student, route: "/practice" },
  { name: "kindergarten lesson", user: student, route: "/student/lessons/us-ca-math-k-k-cc-count-sequence" },
  { name: "grade 1 lesson", user: student, route: "/student/lessons/us-ca-math-p1-1-oa-add-subtract" },
  { name: "student roadmap", user: student, route: "/student/roadmap" },
  { name: "teacher dashboard", user: teacher, route: "/teacher/dashboard" },
  { name: "teacher assessments", user: teacher, route: "/teacher/assessments" },
  { name: "parent console", user: parent, route: "/parent" }
];

for (const { name, user, route } of surfaces) {
  test(`${name} fits a phone screen`, async ({ page }) => {
    await page.setViewportSize(phone);
    if (user) await authenticateAsUserId(page, user);
    await page.goto(route);
    await expect(page.locator("main, form").first()).toBeVisible({ timeout: 30_000 });
    // Lazily-mounted panels can widen the page after first paint.
    await page.waitForTimeout(2000);

    const report = await page.evaluate(() => {
      const limit = document.documentElement.clientWidth;
      const origins: string[] = [];
      document.querySelectorAll<HTMLElement>("body *").forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width <= limit + 1 || rect.height === 0) return;
        const parent = element.parentElement;
        if (!parent || parent.getBoundingClientRect().width > limit + 1) return;
        if (getComputedStyle(parent).overflowX === "auto") return;
        origins.push(
          `${element.tagName}.${(element.className || "").toString().slice(0, 60)} @${Math.round(rect.width)}px`
        );
      });
      return { scrollWidth: document.documentElement.scrollWidth, limit, origins };
    });

    expect(report.origins, `elements wider than the screen: ${report.origins.join(" | ")}`).toEqual([]);
    expect(report.scrollWidth).toBe(report.limit);
  });
}
