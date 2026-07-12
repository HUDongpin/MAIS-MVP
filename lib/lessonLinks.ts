export const studentLessonsPath = "/student/lessons" as const;
export const legacyLessonPath = "/lesson" as const;

export function lessonSlugForTopicId(topicId: string) {
  return topicId === "quadratic-patterns" ? "quadratic-functions" : topicId;
}

export function lessonHrefForSlug(slug: string) {
  return `${studentLessonsPath}/${encodeURIComponent(slug)}`;
}

export function decodeLessonRouteSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export function lessonHrefForTopicId(topicId: string) {
  return lessonHrefForSlug(lessonSlugForTopicId(topicId));
}

export function isStudentLessonPath(pathname: string) {
  return pathname === studentLessonsPath || pathname.startsWith(`${studentLessonsPath}/`);
}
