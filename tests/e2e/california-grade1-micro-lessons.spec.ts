import { expect, test, type Page } from "@playwright/test";

const microLessons = [
  {
    slug: "us-ca-math-p1-1-h1-picture-join-stories-to-10",
    title: "1-H.1 Picture Join Stories to Ten",
    displayTitle: "Picture Join Stories to Ten",
    workedExample: /A picture mat shows 4 red counters and 3 blue counters/i,
    answer: /Answer:\s*7/i
  },
  {
    slug: "us-ca-math-p1-1-l6-break-apart-subtraction-equations-to-10",
    title: "1-L.6 Break-Apart Subtraction Equations",
    displayTitle: "Break-Apart Subtraction Equations",
    workedExample: /There are 10 shells\. Four shells are in a box/i,
    answer: /Answer:\s*6/i
  }
];

async function loginAsCaliforniaGrade1Student(page: Page) {
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

test("California Grade 1 H/L micro-lessons expose individual MAIS knowledge-point routes", async ({ page }) => {
  await loginAsCaliforniaGrade1Student(page);

  for (const lesson of microLessons) {
    const apiResponse = await page.request.get(`/api/lessons/${encodeURIComponent(lesson.slug)}`);
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
    expect(body.lesson?.slug).toBe(lesson.slug);
    expect(body.lesson?.title?.en).toBe(lesson.title);
    expect(body.lesson?.curriculumProfile).toMatchObject({ region: "US", publisher: "US_CA_MATH" });
    expect(body.lesson?.grade).toBe("P1");
    expect(body.lesson?.practiceQuestions?.length ?? 0).toBeGreaterThan(0);
    expect(body.lesson?.practiceQuestions?.every((question) => question.curriculumTrack === "US_CA_MATH")).toBe(true);
    expect(body.lesson?.blocks?.some((block) => block.type === "worked-example" && lesson.workedExample.test(block.content?.en ?? ""))).toBe(true);
    expect(body.lesson?.blocks?.find((block) => block.type === "practice")?.practiceQuestionIds?.length ?? 0).toBeGreaterThan(0);

    await page.goto(`/student/lessons/${encodeURIComponent(lesson.slug)}`);
    const lessonArticle = page.getByRole("article");
    await expect(page.getByRole("heading", { level: 1, name: lesson.displayTitle })).toBeVisible();
    await expect(lessonArticle.getByText(lesson.workedExample).first()).toBeVisible();
    await expect(lessonArticle.getByText(lesson.answer).first()).toBeVisible();
    const practiceSection = page.getByRole("main").locator("#lesson-practice").first();
    await practiceSection.scrollIntoViewIfNeeded();
    await expect(page.getByText(/No linked practice question yet/i)).toHaveCount(0);
    await expect(practiceSection.locator("[data-ai-selectable='practice-question']").first()).toBeVisible();
    await expect(page.getByText(/\bIXL\b/i)).toHaveCount(0);
  }
});
