import { expect, test, type Page } from "@playwright/test";
import { mainlandPepMapDistrictLabels, mainlandPepRoadmapNodes } from "../../data/mainlandPepRoadmap";

const hkPlaceNames = /新界|九龍|九龙|香港島|香港岛|New Territories|Kowloon|Hong Kong Island/i;
const guangzhouPlaceNames = /天河区|海珠区|白云区|黄埔区|越秀区|番禺区|Tianhe District|Haizhu District|Baiyun District|Huangpu District|Yuexiu District|Panyu District/i;
const accountScopedRoadmapTimeout = 45_000;

async function login(page: Page, username: string, grade: string, language = "en") {
  const curriculumProfile = username === "Student Peter"
    ? { region: "MAINLAND", publisher: "MAINLAND_PEP" }
    : username === "Student Shirleen"
      ? { region: "US", publisher: "US_CA_MATH" }
      : { region: "HK", publisher: "HK_UNITED_PRIME_MIA" };
  const curriculumTrack = username === "Student Peter"
    ? "MAINLAND_PEP_HIGH"
    : username === "Student Shirleen"
      ? "US_CA_MATH"
      : "HK";

  const response = await page.request.post("/api/auth/login", {
    data: {
      username,
      password: "12345",
      grade,
      curriculumTrack,
      curriculumProfile,
      language,
      theme: "dark"
    }
  });
  expect(response.status(), `login ${username}`).toBe(200);
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: new RegExp(username, "i") })).toBeVisible({ timeout: accountScopedRoadmapTimeout });
}

async function gotoAndExpectHeading(page: Page, path: string, headingName: RegExp) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await page.goto(path);
    try {
      await expect(page.getByRole("heading", { name: headingName })).toBeVisible({ timeout: accountScopedRoadmapTimeout });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(500);
    }
  }
}

async function expectNoHongKongPlaceNames(page: Page) {
  await expect(page.locator("body")).not.toContainText(hkPlaceNames);
}

async function expectNoMainlandRoadmapLeak(page: Page) {
  await expect(page.locator("body")).not.toContainText(guangzhouPlaceNames);
  await expect(page.locator("body")).not.toContainText(/人教版小学数学路线图|人教版中学数学路线图|PEP Primary Mathematics Subway Map|PEP Secondary Mathematics Subway Map/i);
}

test.describe("Mainland PEP account-scoped roadmaps", () => {
  test("has complete Mainland PEP roadmap graph coverage", () => {
    expect(mainlandPepRoadmapNodes).toHaveLength(57);
    expect(mainlandPepRoadmapNodes.filter((node) => node.band === "primary")).toHaveLength(24);
    expect(mainlandPepRoadmapNodes.filter((node) => node.band === "secondary")).toHaveLength(33);
    expect(JSON.stringify(mainlandPepMapDistrictLabels.map((district) => district.label))).toMatch(guangzhouPlaceNames);
  });

  test("serves a dedicated P1-S6 Learning Path for Mainland PEP accounts", async ({ page }) => {
    test.setTimeout(120_000);
    page.on("pageerror", (error) => {
      console.error(`Mainland roadmap page error: ${error.stack ?? error.message}`);
    });

    await login(page, "Student Peter", "S4", "zh-Hans");
    await gotoAndExpectHeading(page, "/student/roadmap", /人教版学习路径|PEP .*Learning Path/i);
    await expect(page.locator("body")).toContainText(/人教版每日学习路径|当前年级路线|PEP daily learning path/i, { timeout: accountScopedRoadmapTimeout });
    await expect(page.getByRole("link", { name: /打开小学一年级至六年级小学地铁路线图|完整小学地图|Open P1 to P6 primary roadmap/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /打开初一至高三中学地铁路线图|完整中学地图|Open S1 to S6 secondary roadmap/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/人教版数学|PEP Mathematics/i, { timeout: accountScopedRoadmapTimeout });
  });

  test("serves a Guangzhou-labeled P1-P6 PEP primary roadmap for Mainland PEP accounts", async ({ page }) => {
    test.setTimeout(120_000);
    page.on("pageerror", (error) => {
      console.error(`Mainland roadmap page error: ${error.stack ?? error.message}`);
    });

    await login(page, "Student Peter", "S4", "zh-Hans");
    await gotoAndExpectHeading(page, "/student/roadmap/primary", /人教版小学数学路线图|PEP Primary Mathematics Subway Map/i);
    await expect(page.locator("body")).toContainText(guangzhouPlaceNames, { timeout: accountScopedRoadmapTimeout });
    await expectNoHongKongPlaceNames(page);
    await expect(page.getByRole("button", { name: /显示全图|顯示全圖|Fit Map/i })).toBeVisible();
    await page.locator('[data-station-key^="pep-primary"]').first().click({ force: true });
    await expect(page.locator("body")).toContainText(/教材单元|教材單元|Textbook unit/i);

    const fullscreenButton = page.getByRole("button", { name: /全屏|全螢幕|Full screen/i }).first();
    await fullscreenButton.click();
    await expect(page.getByRole("button", { name: /离开全屏|离开全螢幕|離開全螢幕|Exit full screen/i })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("serves a Guangzhou-labeled S1-S6 PEP secondary roadmap for Mainland PEP accounts", async ({ page }) => {
    test.setTimeout(120_000);
    page.on("pageerror", (error) => {
      console.error(`Mainland roadmap page error: ${error.stack ?? error.message}`);
    });

    await login(page, "Student Peter", "S4", "zh-Hans");
    await gotoAndExpectHeading(page, "/student/roadmap/secondary", /人教版中学数学路线图|PEP Secondary Mathematics Subway Map/i);
    await expect(page.locator("body")).toContainText(guangzhouPlaceNames, { timeout: accountScopedRoadmapTimeout });
    await expectNoHongKongPlaceNames(page);
    await expect(page.locator('[data-station-key^="pep-junior"], [data-station-key^="pep-high"]').first()).toBeVisible();
  });

  test("keeps anonymous visitors on the default roadmap experience", async ({ page }) => {
    await page.goto("/student/roadmap/primary");
    await expect(page.getByRole("heading", { name: /Primary Math Subway Map/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/New Territories|新界/i);
    await expectNoMainlandRoadmapLeak(page);
  });

  test("keeps HK accounts on the default roadmap experience", async ({ page }) => {
    await login(page, "HK Student Peter", "S3", "en");
    await page.goto("/student/roadmap/primary");
    await expect(page.getByRole("heading", { name: /Primary Math Subway Map/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/New Territories|新界/i);
    await expectNoMainlandRoadmapLeak(page);
  });

  test("keeps US accounts on the default roadmap experience", async ({ page }) => {
    await login(page, "Student Shirleen", "S3", "en");
    await page.goto("/student/roadmap/secondary");
    await expect(page.getByRole("heading", { name: /Secondary Math Subway Map/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Kowloon|九龍|九龙/i);
    await expectNoMainlandRoadmapLeak(page);
  });
});
