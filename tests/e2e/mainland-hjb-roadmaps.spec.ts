import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mainlandHjbMapDistrictLabels, mainlandHjbRoadmapNodes } from "../../data/mainlandHjbRoadmap";

type AuthSession = {
  user: {
    grade: string;
    curriculumTrack?: string;
    curriculumProfile?: {
      region?: string;
      publisher?: string;
    };
  };
  settings: {
    language: string;
    selectedGrade: string;
  };
};

const accountScopedRoadmapTimeout = 45_000;
const hkPlaceNames = /新界|九龍|九龙|香港島|香港岛|New Territories|Kowloon|Hong Kong Island/i;
const guangzhouPlaceNames = /天河区|海珠区|白云区|黄埔区|越秀区|番禺区|Tianhe District|Haizhu District|Baiyun District|Huangpu District|Yuexiu District|Panyu District/i;
const shanghaiPlaceNames = /黄浦区|徐汇区|浦东新区|杨浦区|静安区|闵行区|Huangpu District|Xuhui District|Pudong New Area|Yangpu District|Jing'an District|Minhang District/i;
const internalArtifactText = /\b(?:candidate|DeepSeek|OCR|source path|locator)\b|候选|候選|源码|源路径/i;

function appUrl(baseURL: string, pathname: string) {
  return new URL(pathname, baseURL).toString();
}

function uniqueUsername(testInfo: TestInfo, label: string) {
  return [
    "mainland-hjb-roadmap",
    label,
    testInfo.project.name,
    testInfo.workerIndex,
    Date.now(),
    Math.random().toString(36).slice(2, 8)
  ]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
}

async function registerHjbAccount(page: Page, baseURL: string, testInfo: TestInfo, grade = "S2") {
  const username = `${uniqueUsername(testInfo, grade)}@example.test`;
  const response = await page.request.post(appUrl(baseURL, "/api/auth/register"), {
    data: {
      name: `Mainland HJB Roadmap ${grade}`,
      username,
      email: username,
      password: "roadmap12345",
      grade,
      curriculumTrack: "MAINLAND_PEP_HIGH",
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_HJB" },
      language: "zh-Hans",
      theme: "dark"
    }
  });

  expect(response.status(), `register Mainland HJB ${grade}`).toBe(200);
  const session = (await response.json()) as AuthSession;
  expect(session.user.grade).toBe(grade);
  expect(session.user.curriculumTrack).toBe("MAINLAND_PEP_HIGH");
  expect(session.user.curriculumProfile?.publisher).toBe("MAINLAND_HJB");
  expect(session.settings.language).toBe("zh-Hans");
  expect(session.settings.selectedGrade).toBe(grade);
}

async function gotoAndExpectHeading(page: Page, baseURL: string, path: string, headingName: RegExp) {
  await page.goto(appUrl(baseURL, path), { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: headingName })).toBeVisible({ timeout: accountScopedRoadmapTimeout });
}

async function expectApprovedJuniorPracticeQuestions(page: Page, baseURL: string) {
  for (const grade of ["S1", "S2", "S3"]) {
    const response = await page.request.get(appUrl(baseURL, `/api/questions?grade=${grade}&publisher=MAINLAND_HJB`));
    expect(response.status(), `GET /api/questions for Mainland HJB ${grade}`).toBe(200);
    const body = await response.json();
    const questions = body.questions ?? [];
    expect(questions, `${grade} exposes the approved HJB junior public practice bank`).toHaveLength(500);
    expect(questions.every((question: { id?: string; publisher?: string }) => question.publisher === "MAINLAND_HJB" && /^hjb-junior-ds-v2-/i.test(question.id ?? ""))).toBe(true);
  }
}

test.describe("Mainland HJB account-scoped roadmaps", () => {
  test("has complete Mainland HJB roadmap graph coverage", () => {
    expect(mainlandHjbRoadmapNodes).toHaveLength(122);
    expect(mainlandHjbRoadmapNodes.filter((node) => node.band === "primary")).toHaveLength(70);
    expect(mainlandHjbRoadmapNodes.filter((node) => node.band === "secondary")).toHaveLength(52);
    expect(mainlandHjbRoadmapNodes.filter((node) => node.stage === "junior-secondary")).toHaveLength(22);
    expect(mainlandHjbRoadmapNodes.filter((node) => node.stage === "senior-secondary")).toHaveLength(30);
    expect(JSON.stringify(mainlandHjbMapDistrictLabels.map((district) => district.label))).toMatch(shanghaiPlaceNames);
  });

  test("serves HJB Learning Path and combined P1-S6 roadmap without leaking other map profiles", async ({ page, baseURL }, testInfo) => {
    test.setTimeout(120_000);
    const resolvedBaseURL = baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? 3020}`;

    await registerHjbAccount(page, resolvedBaseURL, testInfo, "S2");

    await gotoAndExpectHeading(page, resolvedBaseURL, "/student/roadmap", /沪教版学习路径|HJB .*Learning Path/i);
    await expect(page.locator("body")).toContainText(/沪教版每日学习路径|当前年级路线|HJB daily learning path/i, { timeout: accountScopedRoadmapTimeout });
    await expect(page.getByRole("link", { name: /打开沪教版P1至S6路线图|完整沪教版路线|Open HJB P1-S6 roadmap/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /打开沪教版S1至S6中学路线图|中学总览|Open HJB S1-S6 secondary roadmap/i })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(internalArtifactText);

    await gotoAndExpectHeading(page, resolvedBaseURL, "/student/roadmap/primary", /沪教版数学P1-S6路线图|HJB Mathematics P1-S6 Roadmap/i);
    await expect(page.locator("body")).toContainText(/沪教版小学数学路线图|HJB Primary Mathematics Roadmap/i, { timeout: accountScopedRoadmapTimeout });
    await expect(page.locator("body")).toContainText(/沪教版中学数学路线图|HJB Secondary Mathematics Roadmap/i, { timeout: accountScopedRoadmapTimeout });
    await expect(page.locator("body")).toContainText(shanghaiPlaceNames, { timeout: accountScopedRoadmapTimeout });
    await expect(page.locator("body")).not.toContainText(hkPlaceNames);
    await expect(page.locator("body")).not.toContainText(guangzhouPlaceNames);
    await expect(page.locator("body")).not.toContainText(/人教版小学数学路线图|人教版中学数学路线图|PEP Primary Mathematics Subway Map|PEP Secondary Mathematics Subway Map/i);
    await expect(page.locator("body")).not.toContainText(internalArtifactText);

    await page.locator('[data-station-key^="hjb-junior"]').first().click({ force: true });
    await expect(page.locator("body")).toContainText(/教材单元|教材單元|Textbook unit/i);
    await expect(page.locator("body")).toContainText(/先完成课(?:节|时)学习|Lesson-first study route/i);
    await expectApprovedJuniorPracticeQuestions(page, resolvedBaseURL);
  });
});
