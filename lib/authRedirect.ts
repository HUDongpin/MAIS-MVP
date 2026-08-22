const relativeUrlBase = new URL("https://mais.invalid");
const unsafePathCharacterPattern = /[\\\u0000-\u001f\u007f]/;

function rawPathname(value: string) {
  return value.split(/[?#]/, 1)[0] ?? "";
}

function pathDecodesSafely(value: string) {
  let candidate = rawPathname(value);

  for (let pass = 0; pass < 5; pass += 1) {
    if (!candidate.startsWith("/") || candidate.startsWith("//") || unsafePathCharacterPattern.test(candidate)) {
      return false;
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(candidate);
    } catch {
      return false;
    }
    if (decoded === candidate) return true;
    candidate = decoded;
  }

  return false;
}

export function safeRelativeAppPath(value: unknown, fallback: string) {
  if (typeof value !== "string" || !pathDecodesSafely(value)) return fallback;

  try {
    const target = new URL(value, relativeUrlBase);
    if (
      target.origin !== relativeUrlBase.origin ||
      target.username ||
      target.password ||
      !pathDecodesSafely(target.pathname)
    ) {
      return fallback;
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

export function safePasswordChangeNextPath(value: unknown, fallback: string) {
  const candidate = safeRelativeAppPath(value, fallback);
  if (candidate === "/login?googleLink=1") return candidate;
  return candidate.startsWith("/login") ? fallback : candidate;
}
