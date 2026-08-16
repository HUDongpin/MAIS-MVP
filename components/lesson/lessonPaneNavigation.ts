export type LessonContentPaneScrollRequest = {
  behavior: "auto" | "smooth";
  top: number;
};

export function createLessonContentPaneScrollRequest({
  currentScrollTop,
  paneTop,
  prefersReducedMotion,
  targetTop,
  topPadding
}: {
  currentScrollTop: number;
  paneTop: number;
  prefersReducedMotion: boolean;
  targetTop: number | null;
  topPadding: number;
}): LessonContentPaneScrollRequest | null {
  if (targetTop === null) return null;

  return {
    behavior: prefersReducedMotion ? "auto" : "smooth",
    top: Math.max(0, currentScrollTop + targetTop - paneTop - topPadding)
  };
}
