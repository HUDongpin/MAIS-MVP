/**
 * The one off-origin check for user-supplied redirect targets.
 *
 * Four guards sanitize a `?next=` value before handing it to a redirect sink
 * (`window.location.replace`, `router.push`, `NextResponse.redirect(new URL(...))`).
 * Until this module existed each of them carried its own copy of the same
 * string pattern match:
 *
 *     value.startsWith("/") && !value.startsWith("//")
 *
 * Rejecting `//evil.example` is right, but a string comparison cannot decide
 * what a URL means. For http(s) the WHATWG URL parser treats a backslash as
 * equivalent to a forward slash in the authority position, so `/\evil.example`
 * passed all four guards and then resolved to `https://evil.example/`. The
 * victim arrived there immediately after a genuine successful login, which is
 * what made it worth closing rather than noting: the natural follow-up is a
 * cloned "your session expired, sign in again" page shown to someone who has
 * just demonstrated they will type their password into a page that looks like
 * this one. Tab, newline and carriage return are stripped from the input before
 * parsing, so `/<TAB>/evil.example` did the same thing.
 *
 * The fix is to stop guessing and ask the same parser the sink will use:
 * resolve the value against an origin that cannot be served (`.invalid` is
 * reserved by RFC 2606), then keep it only if it stayed on that origin. That
 * rejects the whole class — `//host`, `/\host`, `/\/host`, `https://host`,
 * `\\host`, control-character variants — instead of the one spelling someone
 * happened to think of.
 *
 * Two properties here are deliberate:
 *
 *   - A value that does not literally start with `/` is rejected even when it
 *     would resolve on-origin, so `dashboard`, `./dashboard` and `../admin`
 *     still fall back to the caller's default. Every one of the four guards
 *     already required an absolute in-app path, and keeping that requirement
 *     means this module can only ever narrow what they accept.
 *   - The returned path is the parser's own normalization, so
 *     `/teacher/../admin` comes back as `/admin`. Callers that layer a per-role
 *     prefix filter on top therefore filter the path that will actually open,
 *     not a spelling that dot-segments past the filter afterwards.
 *
 * Percent-encoded separators (`/%5Cevil.example`, `/%2F%2Fevil.example`) are
 * not off-origin: they stay one ordinary path segment in every sink, so they
 * come back unchanged and the caller's role filter still applies to them.
 */

/**
 * Reserved by RFC 2606, so it can never be a real deployment origin: a value
 * that still carries this origin after parsing cannot have named a host.
 */
const PROBE_ORIGIN = "https://mais.invalid";

/**
 * Returns the normalized same-origin path (with query and fragment) for a
 * user-supplied redirect target, or `null` when the value is not an in-app
 * path. Callers supply their own fallback, and keep any per-role filter on top.
 */
export function sameOriginPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  try {
    const resolved = new URL(value, PROBE_ORIGIN);
    if (resolved.origin !== PROBE_ORIGIN) return null;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return null;
  }
}
