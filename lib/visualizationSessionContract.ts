export const maxVisualizationSessionIdentityLength = 256;

export function isCanonicalVisualizationSessionIdentity(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxVisualizationSessionIdentityLength &&
    value === value.trim()
  );
}
