import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function source(path: string) {
  return fs.readFileSync(path, "utf8");
}

test("student lesson server pages require an authenticated account before rendering content", () => {
  const entryPage = source("components/lesson/StudentLessonEntryPage.tsx");
  const detailPage = source("components/lesson/StudentLessonPage.tsx");
  const entryClient = source("components/lesson/LessonEntryClient.tsx");
  const authGate = source("components/lesson/lessonAuthGate.ts");

  assert.match(entryPage, /requireLessonAuthentication\(studentLessonsPath\)/);
  assert.match(detailPage, /requireLessonAuthentication\(lessonHrefForSlug\(slug\)\)/);
  assert.doesNotMatch(entryPage, /^import .*@\/lib\/server\/userStore/m);
  assert.doesNotMatch(detailPage, /^import .*@\/lib\/server\/userStore/m);
  assert.match(entryPage, /await import\("@\/lib\/server\/userStore"\)/);
  assert.match(detailPage, /await import\("@\/lib\/server\/userStore"\)/);
  assert.doesNotMatch(authGate, /^import .*@\/lib\/server\/auth/m);
  assert.match(authGate, /await import\("@\/lib\/server\/auth"\)/);
  assert.doesNotMatch(entryClient, /guestRecommendedLessonHrefForGrade/);
  assert.match(entryClient, /router\.replace\(`\/login\?next=\$\{encodeURIComponent\(readCurrentPath\(\)\)\}`\)/);
});

test("student textbook lesson routes also use the lesson authentication gate", () => {
  const middleSchoolRoute = source("app/student/lessons/california-middle-school-textbook/page.tsx");
  const highSchoolRoute = source("app/student/lessons/california-high-school-textbook/page.tsx");

  assert.match(middleSchoolRoute, /requireLessonAuthentication\("\/student\/lessons\/california-middle-school-textbook"\)/);
  assert.match(highSchoolRoute, /requireLessonAuthentication\("\/student\/lessons\/california-high-school-textbook"\)/);
});

test("lesson routes are protected by middleware before lesson modules compile", () => {
  const middleware = source("middleware.ts");

  assert.match(middleware, /"\/lesson"/);
  assert.match(middleware, /"\/student\/lessons"/);
  assert.match(middleware, /"\/lesson\/:path\*"/);
  assert.match(middleware, /"\/student\/lessons\/:path\*"/);
});
