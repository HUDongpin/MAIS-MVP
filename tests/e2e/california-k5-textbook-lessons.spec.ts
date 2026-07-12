import { expect, test, type Page } from "@playwright/test";

const kindergartenLessonSlug = "us-ca-math-k-k-cc-count-sequence";

async function loginAsCaliforniaKindergartenStudent(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: "Student Shirleen",
      password: "12345",
      grade: "K",
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      language: "en",
      theme: "light"
    }
  });

  expect(response.ok(), await response.text()).toBeTruthy();
}

test("California K-5 textbook lesson route exposes live practice links", async ({ page }) => {
  await loginAsCaliforniaKindergartenStudent(page);

  const apiResponse = await page.request.get(`/api/lessons/${encodeURIComponent(kindergartenLessonSlug)}`);
  expect(apiResponse.ok(), await apiResponse.text()).toBeTruthy();
  const body = await apiResponse.json() as {
    access?: string;
    lesson?: {
      slug?: string;
      title?: { en?: string };
      curriculumProfile?: { region?: string; publisher?: string };
      grade?: string;
      practiceQuestions?: Array<{ curriculumTrack?: string }>;
      blocks?: Array<{ type?: string; content?: { en?: string }; practiceQuestionIds?: string[] }>;
    };
  };

  expect(body.access).toBe("full");
  expect(body.lesson?.slug).toBe(kindergartenLessonSlug);
  expect(body.lesson?.title?.en).toBe("K-A.1 Kindergarten Counting and Cardinality: Count Sequence");
  expect(body.lesson?.curriculumProfile).toMatchObject({ region: "US", publisher: "US_CA_MATH" });
  expect(body.lesson?.grade).toBe("K");
  expect(body.lesson?.practiceQuestions?.length ?? 0).toBeGreaterThan(0);
  expect(body.lesson?.practiceQuestions?.every((question) => question.curriculumTrack === "US_CA_MATH")).toBe(true);
  expect(body.lesson?.blocks?.some((block) => block.type === "worked-example" && /5 \+ 2 = 7/.test(block.content?.en ?? ""))).toBe(true);
  expect(body.lesson?.blocks?.find((block) => block.type === "practice")?.practiceQuestionIds?.length ?? 0).toBeGreaterThan(0);
  expect(body.lesson?.blocks?.map((block) => block.type) ?? []).not.toContain("teacher-guide");

  await page.goto(`/student/lessons/${encodeURIComponent(kindergartenLessonSlug)}`);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Counting and Cardinality: Count Sequence/i
    })
  ).toBeVisible();
  const lessonArticle = page.getByRole("article");
  await expect(lessonArticle.getByText(/There are 5 blue counters and 2 green counters/i).first()).toBeVisible();
  await expect(lessonArticle.getByText(/Answer:\s*7/i).first()).toBeVisible();
  const practiceSection = page.getByRole("main").locator("#lesson-practice").first();
  await practiceSection.scrollIntoViewIfNeeded();
  await expect(page.getByText(/No linked practice question yet/i)).toHaveCount(0);
  await expect(practiceSection.locator("[data-ai-selectable='practice-question']").first()).toBeVisible();
});
