export const AI_TUTOR_PUBLIC_READ_CACHE_CONTROL = "public, max-age=15, s-maxage=30, stale-while-revalidate=60";
export const AI_TUTOR_PUBLIC_CDN_CACHE_CONTROL = "public, max-age=30, stale-while-revalidate=60";
export const AI_TUTOR_UNKNOWN_PATH_CACHE_CONTROL = "public, max-age=30, s-maxage=60, stale-while-revalidate=120";
export const AI_TUTOR_UNKNOWN_PATH_CDN_CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=120";
export const AI_TUTOR_CLASSROOM_POLICY_CACHE_CONTROL = "private, max-age=15";

export function aiTutorPublicReadCacheHeaders(): Record<string, string> {
  return {
    "Cache-Control": AI_TUTOR_PUBLIC_READ_CACHE_CONTROL,
    "CDN-Cache-Control": AI_TUTOR_PUBLIC_CDN_CACHE_CONTROL,
    "Vercel-CDN-Cache-Control": AI_TUTOR_PUBLIC_CDN_CACHE_CONTROL
  };
}

export function aiTutorUnknownPathCacheHeaders(): Record<string, string> {
  return {
    "Cache-Control": AI_TUTOR_UNKNOWN_PATH_CACHE_CONTROL,
    "CDN-Cache-Control": AI_TUTOR_UNKNOWN_PATH_CDN_CACHE_CONTROL,
    "Vercel-CDN-Cache-Control": AI_TUTOR_UNKNOWN_PATH_CDN_CACHE_CONTROL
  };
}
