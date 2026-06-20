export const visualizationLabPath = "/visualization-lab" as const;
export const studentVisualizationToolsPath = "/student/tools/visualizations" as const;
export const legacyVisualizationLabPath = visualizationLabPath;

export function isStudentVisualizationToolsPath(pathname: string) {
  return pathname === studentVisualizationToolsPath || pathname.startsWith(`${studentVisualizationToolsPath}/`);
}

export function isVisualizationLabPath(pathname: string) {
  return pathname === visualizationLabPath || isStudentVisualizationToolsPath(pathname);
}
