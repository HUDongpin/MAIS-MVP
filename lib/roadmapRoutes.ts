export const studentRoadmapPath = "/student/roadmap" as const;
export const studentPrimaryRoadmapPath = "/student/roadmap/primary" as const;
export const studentSecondaryRoadmapPath = "/student/roadmap/secondary" as const;

export const legacyLearningPathPath = "/learning-path" as const;
export const legacyPrimaryRoadmapPath = "/primary-roadmap" as const;
export const legacySecondaryRoadmapPath = "/secondary-roadmap" as const;

export function isStudentRoadmapPath(pathname: string) {
  return pathname === studentRoadmapPath || pathname.startsWith(`${studentRoadmapPath}/`);
}

export function isLegacyRoadmapPath(pathname: string) {
  return (
    pathname === legacyLearningPathPath ||
    pathname === legacyPrimaryRoadmapPath ||
    pathname === legacySecondaryRoadmapPath
  );
}
