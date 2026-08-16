export type LessonContentPaneScrollRequest = {
  behavior: "auto" | "smooth";
  top: number;
};

export type LessonTargetViewportRealignment = {
  behavior: "auto";
  block: "start";
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

export function createLessonTargetViewportRealignment({
  safeTop,
  targetTop,
  viewportHeight
}: {
  safeTop: number;
  targetTop: number | null;
  viewportHeight: number;
}): LessonTargetViewportRealignment | null {
  if (targetTop === null || !Number.isFinite(targetTop) || viewportHeight <= 0) return null;

  const safeViewportTop = Math.max(0, safeTop);
  const alignmentTolerancePx = 1;
  if (
    targetTop >= safeViewportTop - alignmentTolerancePx &&
    targetTop < viewportHeight - alignmentTolerancePx
  ) return null;

  return { behavior: "auto", block: "start" };
}
