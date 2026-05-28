import { expect, test, type Page } from "@playwright/test";
import { mainlandPepMapDistrictLabels, mainlandPepRoadmapNodes } from "../../data/mainlandPepRoadmap";

const hkPlaceNames = /新界|九龍|九龙|香港島|香港岛|New Territories|Kowloon|Hong Kong Island/i;
const guangzhouPlaceNames = /天河区|海珠区|白云区|黄埔区|越秀区|番禺区|Tianhe District|Haizhu District|Baiyun District|Huangpu District|Yuexiu District|Panyu District/i;
const accountScopedRoadmapTimeout = 45_000;

async function login(page: Page, username: string, grade: string, language = "en") {
  await page.goto("/login");

  if (language === "zh-Hans") {
    await page.getByRole("button", { name: /Use Simplified Chinese|使用简体中文/i }).click();
  }

  if (username.includes("Mainland")) {
    await page.getByRole("button", { name: /Mainland Chinese Student|中国内地学生/i }).click();
  } else if (username.includes("Shirleen")) {
    await page.getByRole("button", { name: /US Student|美国学生/i }).click();
  } else {
    await page.getByRole("button", { name: /Hong Kong student|HK Student|香港学生/i }).click();
  }

  await page.getByRole("button", { name: /Log In|登入|登录/i }).click();
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

    await login(page, "Mainland Student Ludwig", "S4", "zh-Hans");
    await gotoAndExpectHeading(page, "/learning-path", /人教版数学P1-S6学习路径|PEP Mathematics P1-S6 Learning Path/i);
    await expect(page.locator("body")).toContainText(/小学一年级|Primary 1/i, { timeout: accountScopedRoadmapTimeout });
    await expect(page.locator("body")).toContainText(/高三|Grade 12/i, { timeout: accountScopedRoadmapTimeout });
    await expect(page.locator("body")).toContainText(/人教版数学|小学、初中和高中数学|P1-S6/i, { timeout: accountScopedRoadmapTimeout });
  });

  test("serves a Guangzhou-labeled P1-P6 PEP primary roadmap for Mainland PEP accounts", async ({ page }) => {
    test.setTimeout(120_000);
    page.on("pageerror", (error) => {
      console.error(`Mainland roadmap page error: ${error.stack ?? error.message}`);
    });

    await login(page, "Mainland Student Ludwig", "S4", "zh-Hans");
    await gotoAndExpectHeading(page, "/primary-roadmap", /人教版小学数学路线图|PEP Primary Mathematics Subway Map/i);
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

    await login(page, "Mainland Student Ludwig", "S4", "zh-Hans");
    await gotoAndExpectHeading(page, "/secondary-roadmap", /人教版中学数学路线图|PEP Secondary Mathematics Subway Map/i);
    await expect(page.locator("body")).toContainText(guangzhouPlaceNames, { timeout: accountScopedRoadmapTimeout });
    await expectNoHongKongPlaceNames(page);
    await expect(page.locator('[data-station-key^="pep-junior"], [data-station-key^="pep-high"]').first()).toBeVisible();
  });

  test("keeps anonymous visitors on the default roadmap experience", async ({ page }) => {
    await page.goto("/primary-roadmap");
    await expect(page.getByRole("heading", { name: /Primary Math Subway Map/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/New Territories|新界/i);
    await expectNoMainlandRoadmapLeak(page);
  });

  test("keeps HK accounts on the default roadmap experience", async ({ page }) => {
    await login(page, "HK Student Peter", "S3", "en");
    await page.goto("/primary-roadmap");
    await expect(page.getByRole("heading", { name: /Primary Math Subway Map/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/New Territories|新界/i);
    await expectNoMainlandRoadmapLeak(page);
  });

  test("keeps US accounts on the default roadmap experience", async ({ page }) => {
    await login(page, "Student Shirleen", "S3", "en");
    await page.goto("/secondary-roadmap");
    await expect(page.getByRole("heading", { name: /Secondary Math Subway Map/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Kowloon|九龍|九龙/i);
    await expectNoMainlandRoadmapLeak(page);
  });
});
