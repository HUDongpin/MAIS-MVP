/**
 * Owner-confirmed public identity for OAuth branding and public legal routes.
 *
 * Keep this independent from request headers: alternate production domains may
 * still serve MAIS, but Google OAuth and its public disclosures use one stable
 * origin so consent-screen URLs never drift between aliases.
 */
export const PUBLIC_SITE_ORIGIN = "https://www.mais.ac" as const;

export const PUBLIC_SITE_URLS = {
  homepage: `${PUBLIC_SITE_ORIGIN}/`,
  privacyPolicy: `${PUBLIC_SITE_ORIGIN}/privacy`,
  termsOfService: `${PUBLIC_SITE_ORIGIN}/terms`,
  googleOAuthCallback: `${PUBLIC_SITE_ORIGIN}/api/auth/google/callback`
} as const;
