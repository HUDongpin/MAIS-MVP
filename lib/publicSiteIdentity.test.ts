import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC_SITE_URLS } from "@/lib/publicSiteIdentity";

test("Google Auth Platform public URLs use the owner-confirmed www.mais.ac identity", () => {
  assert.deepEqual(PUBLIC_SITE_URLS, {
    homepage: "https://www.mais.ac/",
    privacyPolicy: "https://www.mais.ac/privacy",
    termsOfService: "https://www.mais.ac/terms",
    googleOAuthCallback: "https://www.mais.ac/api/auth/google/callback"
  });
});
