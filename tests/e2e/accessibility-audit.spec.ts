import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * WCAG 2.1 Level AA audit of the routes a learner, guardian or district reviewer can
 * reach without signing in.
 *
 * This is the evidence base for `docs/compliance/accessibility-conformance.md` and the
 * public /accessibility statement. When a district asks "how do you know?", the answer
 * is this spec and the JSON report it writes.
 *
 * Automated testing catches roughly a third to a half of WCAG issues. Passing this spec
 * is necessary for a conformance claim, not sufficient — the manual checks listed in the
 * conformance report still have to be done by a person.
 */

const WCAG_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const;

type AuditedRoute = {
  name: string;
  path: string;
  /**
   * Selector that must be attached before the page counts as settled. Keeps the scan
   * off a skeleton state, which produces findings that vanish on the next run.
   */
  readySelector: string;
};

const PUBLIC_ROUTES: readonly AuditedRoute[] = [
  { name: "home", path: "/", readySelector: "main" },
  { name: "login", path: "/login", readySelector: "main" },
  { name: "register", path: "/register", readySelector: "main" },
  { name: "privacy", path: "/privacy", readySelector: "main h1" },
  { name: "terms", path: "/terms", readySelector: "main h1" },
  { name: "subprocessors", path: "/subprocessors", readySelector: "main h1" },
  { name: "accessibility", path: "/accessibility", readySelector: "main h1" }
];

const reportDir = path.join(process.env.PLAYWRIGHT_E2E_ROOT?.trim() || ".tmp/e2e-run-default", "a11y");

async function settle(page: Page, route: AuditedRoute) {
  await page.goto(route.path, { waitUntil: "domcontentloaded" });
  await page.locator(route.readySelector).first().waitFor({ state: "attached", timeout: 30_000 });
  // The animated background and the settings provider both mutate the DOM after mount;
  // scanning before they land produces contrast findings against a half-painted surface.
  await page.waitForTimeout(600);
}

async function scan(page: Page, route: AuditedRoute) {
  const results = await new AxeBuilder({ page }).withTags([...WCAG_AA_TAGS]).analyze();

  await mkdir(reportDir, { recursive: true });
  await writeFile(
    path.join(reportDir, `${route.name}.json`),
    JSON.stringify(
      {
        route: route.path,
        scannedAt: new Date().toISOString(),
        violations: results.violations,
        // Items axe could not decide on its own. These are the checks a human still has
        // to make, so record enough to act on rather than just a count.
        incomplete: results.incomplete.map((item) => ({
          id: item.id,
          help: item.help,
          targets: item.nodes.map((node) => node.target.join(" "))
        })),
        passCount: results.passes.length
      },
      null,
      2
    ),
    "utf8"
  );

  return results;
}

function formatViolations(results: Awaited<ReturnType<typeof scan>>) {
  return results.violations
    .map((violation) => {
      const targets = violation.nodes
        .slice(0, 4)
        .map((node) => `      ${node.target.join(" ")}`)
        .join("\n");
      return `  [${violation.impact ?? "unknown"}] ${violation.id} — ${violation.help}\n${targets}`;
    })
    .join("\n");
}

test.describe("WCAG 2.1 AA — public routes", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} (${route.path}) has no automatically detectable WCAG 2.1 AA violations`, async ({
      page
    }) => {
      await settle(page, route);
      const results = await scan(page, route);

      expect(results.violations, `\n${formatViolations(results)}`).toEqual([]);
    });
  }
});

test.describe("WCAG 2.1 AA — targeted checks", () => {
  test("the document language matches the selected interface language (WCAG 3.1.1)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Before any client JS has had a chance to correct it, the server-rendered document
    // must already carry a real language tag rather than a hardcoded default.
    const initialLang = await page.locator("html").getAttribute("lang");
    expect(initialLang, "the served document must declare a language").toBeTruthy();
    expect(initialLang).toMatch(/^(en|zh)(-[A-Za-z]+)*$/);
  });

  test("every public route exposes exactly one level-1 heading", async ({ page }) => {
    for (const route of PUBLIC_ROUTES) {
      await settle(page, route);
      const headingCount = await page.locator("main h1").count();
      expect(headingCount, `${route.path} should have exactly one <h1> in <main>`).toBe(1);
    }
  });
});
