export const studentResourcesPath = "/resource" as const;

export function studentResourceHref(resourceId: string) {
  return `${studentResourcesPath}/${encodeURIComponent(resourceId)}`;
}
