export function lessonSlugForTopicId(topicId: string) {
  return topicId === "quadratic-patterns" ? "quadratic-functions" : topicId;
}

export function lessonHrefForSlug(slug: string) {
  return `/lesson/${encodeURIComponent(slug)}`;
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
