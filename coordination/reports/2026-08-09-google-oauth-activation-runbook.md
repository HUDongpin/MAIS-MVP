# MAIS Google OAuth activation runbook

Date: 2026-08-09  
Lanes: A01, A08, A09, A10, A11, A12, A19, A22  
Scope: Login-page `Continue with Google` activation and production proof

## Security and product contract

- Use the OAuth 2.0 authorization-code flow with OpenID Connect and PKCE S256.
- Request only `openid email profile`. MAIS does not retain Google's access token or request offline access.
- Correlate a returning Google identity by the verified Google subject, not by mutable display data.
- A new student must explicitly confirm an exact textbook publisher and grade in the dedicated same-origin Google form before leaving MAIS. The server accepts this first-time Student start only as an `application/x-www-form-urlencoded` `POST` whose `Origin` exactly matches the request origin and whose `setupConfirmed` field is `true`; a direct Student `GET` or cross-origin `POST` must fail before OAuth state is created.
- Until MAIS has a verified parent/school authorisation workflow, self-service Student Google OAuth is restricted to a learner who selects S2-S6 and expressly attests that they are at least 13. The same restriction is enforced at the UI, start route, signed state, callback, and identity-persistence layers. A stored Student Google identity must also carry the recorded age assurance and remain in an eligible saved grade; changing the requested role cannot bypass this check. This is a conservative technical safeguard, not proof of age, verifiable parental consent, or school authorisation.
- A new parent must first establish a password-based MAIS account and then explicitly link Google. A new teacher remains invitation-gated.
- The encrypted OAuth transaction carries Student grade and curriculum setup only when the server-authoritative role is Student. Teacher, Parent, and Admin transactions omit those unrelated learner fields.
- Every collision with an existing MAIS email requires explicit linking; Google email metadata never auto-links an existing password account. The owner of the existing Student, Teacher, Parent, or Admin account must prove that account's MAIS password, then explicitly repeat `Continue with Google` while that MAIS session is active. The OAuth transaction is bound to that server-derived user ID and the verified emails must match.
- Password step-up creates an encrypted, purpose-bound, user-bound, HttpOnly, SameSite=Lax marker with a five-minute maximum age. Google start consumes the marker. A missing, expired, malformed, or differently bound marker cannot start an account-link transaction.
- The configured callback origin is the canonical OAuth origin. An OAuth attempt begun on another MAIS alias must move to the canonical origin before state is created. Because MAIS session cookies are host-only and are never transferred between registrable domains, a signed-in linking attempt begun on an alias requires fresh password authentication on the canonical host. A first-time Student confirmation begun on an alias must be repeated on the canonical login page.
- Never log or report an authorization code, ID token, access token, client secret, state, nonce, PKCE verifier, session cookie, or full OAuth callback URL.

Protocol references:

- Google server-side ID-token verification: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- Google OpenID Connect: https://developers.google.com/identity/openid-connect/openid-connect
- Google web-server OAuth flow: https://developers.google.com/identity/protocols/oauth2/web-server
- OAuth 2.0 Security Best Current Practice and PKCE: https://datatracker.ietf.org/doc/rfc9700/
- Google button branding: https://developers.google.com/identity/branding-guidelines
- Google OAuth application policies: https://developers.google.com/identity/protocols/oauth2/policies
- Vercel staged production promotion: https://vercel.com/docs/deployments/promote-preview-to-production
- Vercel production rollback: https://vercel.com/docs/deployments/rollback-production-deployment

## Confirmed production identity and Google Auth Platform URLs

The owner confirmed `www.mais.ac` as the one canonical OAuth host. Configure Google Auth Platform with these exact public values:

```text
Homepage URL: https://www.mais.ac/
Privacy Policy URL: https://www.mais.ac/privacy
Terms of Service URL: https://www.mais.ac/terms
Authorized Domain: mais.ac
Authorized redirect URI: https://www.mais.ac/api/auth/google/callback
```

The redirect URI must be registered with this exact scheme, host, case, path, and absence of a trailing slash. `mais.ac`, `mais.hk`, and `www.mais.hk` may continue to serve the application as aliases, but Google start requests begun on them must first move to `www.mais.ac`. This server-side authorization-code implementation does not require an Authorized JavaScript origin.

The homepage now describes MAIS and why optional Google data is used. `/privacy` and `/terms` exist in this worktree as owner-authorized drafts, but are intentionally labelled `draft-pending-review`. They must be reviewed, completed, expressly approved, deployed on `www.mais.ac`, and checked as publicly reachable before their URLs are supplied as final policies to Google.

## Google Cloud prerequisites

Google's current OAuth 2.0 policy applies to OpenID Connect authentication-only apps and requires separate Google Cloud projects for development, testing/staging, and production. A different client in one shared project is not the complete separation required for a production app.

1. The owner must designate one Google Cloud project as production-only and a different project for development/testing/staging. The currently supplied `project-hu-xiangen` project is External and currently in Testing; before it hosts `MAIS Production Web`, confirm that it will not also be used for local, Preview, or staging credentials. Otherwise create a separate owner-approved production project.
2. Configure Google Auth Platform independently in each project and choose the intended audience. Use External unless access is intentionally limited to one managed Google Workspace organization.
3. Supply the approved application name, support email, developer contact, `mais.ac` authorized domain, and the exact homepage/privacy/terms URLs above in the production project only after the two legal drafts receive final approval and are deployed.
4. Keep the nonproduction project in Testing and add only approved test accounts. General public activation belongs in the production-only project and requires the owner-approved publishing and verification posture.
5. Create a Web application OAuth client named `MAIS Production Web` in the production-only project.
6. Register only exact, approved callback URIs. Production gets only `https://www.mais.ac/api/auth/google/callback`; local/Preview callbacks and clients belong in the separate nonproduction project.
7. Store each resulting client secret only in the corresponding approved secret store and environment. Do not paste it into source, reports, screenshots, shell history, or browser test artifacts.

Current console evidence as of 2026-08-20: `project-hu-xiangen` is initialized as MAIS / External / Testing and has zero OAuth clients. Its Branding page has no logo and no configured homepage, Privacy Policy, Terms of Service, or authorized domains; Data Access lists no configured scopes. No client or secret has been created by Codex.

## Server-only environment contract

Production requires the following names in the Vercel Production environment:

```text
GOOGLE_OAUTH_ENABLED=true
GOOGLE_OAUTH_CLIENT_ID=<production Google Web client ID>
GOOGLE_OAUTH_CLIENT_SECRET=<production Google Web client secret>
GOOGLE_OAUTH_REDIRECT_URI=https://www.mais.ac/api/auth/google/callback
GOOGLE_OAUTH_STATE_SECRET=<dedicated random OAuth-state secret, at least 32 characters>
AUTH_SESSION_SECRET=<independent random session secret, at least 32 characters>
HK_MATH_STORAGE_PROVIDER=postgres
POSTGRES_URL=<durable production database>
```

All values above are server-only. None may use a `NEXT_PUBLIC_` prefix. `GOOGLE_OAUTH_STATE_SECRET` and the effective session secret (`AUTH_SESSION_SECRET`, or the legacy `NEXTAUTH_SECRET` fallback) must both be present in production and must not be equal. Both the readiness gate and the Google OAuth runtime enforce this contract without printing either value; missing, weak, fallback-only, or equal Production secrets stop the flow before the Google authorization handoff. Vercel environment changes affect only new deployments, so A22 must deploy a reviewed clean source after A19 confirms redacted environment parity.

For local real-provider testing, use the separate nonproduction Google Cloud project, create a nonproduction Web client, and register the exact fixed loopback callback selected for that test, for example:

```text
http://127.0.0.1:3057/api/auth/google/callback
```

The browser start host and callback host must match exactly. Do not mix `localhost` and `127.0.0.1` in one transaction.

## Repository gates

From a clean, dependency-current OAuth worktree:

```bash
npm run check:google-oauth-legal-approval -- --json
npm run test:google-oauth
npm run test:google-oauth:browser
npm run type-check
npm run build
git diff --check
```

The synthetic gate uses generated credentials and isolated local storage; passing it does not prove that Google Cloud or Vercel is configured. The browser gate verifies the login UI, isolated password/Google forms, server-bound Student confirmation, explicit-link step-up, and OAuth start contract without following the redirect into a real Google account. CI runs the synthetic and Chromium browser gates as separate jobs so a browser-install or UI failure cannot be hidden by the Node-only suite.

Before a real local provider test:

```bash
node scripts/check-google-oauth-readiness.mjs --env-file .env.local --mode local
```

Before release, A19/A22 must also pass the normal Vercel environment, clean-source, build-output, and production-certification gates. After the staged-publish preflight and before any local build, staging, or Vercel mutation, the production deployment command first requires the ignored private owner/counsel approval manifest to match the exact current `mais-google-legal-v1` Privacy/Terms review-bundle digests, then runs `npm run test:google-oauth`; this makes both legal approval and callback/session/explicit-account-link semantics fail-closed deployment prerequisites even if someone bypasses CI. After the isolated build creates the pruned Vercel staging tree, the command runs the same approval verifier again with that exact staging directory as `--source-root`, before dry-run success, live-state inspection, or `vercel deploy`. A production dry-run therefore still materialises this local `.tmp` staging tree so it can verify real upload bytes, but it performs no Vercel or Cloud mutation. The verifier permits only the repository root or a real descendant of this repository's `.tmp/vercel-staging/` boundary, so an arbitrary or symlink-escaped source cannot be substituted. Each pass record contains only the command name, source class (`repository` or `vercel-staging`), and `passed` status, not approval identity, evidence content, hashes, source path, test output, or credentials. The read-only production readiness probe uses a Parent `GET`, stops at the first redirect, and redacts all dynamic OAuth parameters; Student confirmation is covered separately by the same-origin `POST` gates. A `.vercel.app` candidate can prove only the hardened handoff to the canonical OAuth host, not the canonical host's complete OAuth behavior. After promotion, the deployment script first requires the homepage, Privacy Policy, and Terms of Service URLs to satisfy the shared direct-200, exact-canonical, required-content, and published-status P0 contract, then runs the full canonical OAuth start probe and the other production-domain gates. Before creating the candidate, the script must inspect the canonical domain and pin its current immutable `.vercel.app` deployment URL. If any post-promotion production-domain gate fails, including a public-policy contract, the script must automatically run a non-interactive, scoped rollback to that exact pinned deployment and report whether rollback completed or also failed; an unqualified `vercel rollback` status query is not accepted as rollback evidence.

## Real-provider acceptance matrix

Do not mark the feature complete until all checks below have observed evidence on an approved Google test account and durable target storage.

- [x] Canonical production host confirmed by the owner as `www.mais.ac`.
- [ ] Owner designates a production-only Google Cloud project and a separate development/testing/staging project; no client or credential is shared across tiers.
- [ ] Homepage, privacy-policy URL, and terms URL receive final owner/legal approval, are deployed and publicly verified, and are supplied to Google Auth Platform.
- [ ] Nonproduction and production Google Web clients are created in their respective projects with exact callback URIs.
- [ ] A19 confirms all required local/Vercel variable names and target environments without revealing values.
- [ ] A clean deployment is `READY`, its source revision is recorded, and production aliases point to it.
- [ ] The canonical Parent readiness `GET` returns a redacted `307` to `accounts.google.com` with state, nonce, PKCE S256, and a secure pending cookie.
- [ ] A confirmed, S2-S6, 13-or-older-attested first-time Student same-origin form `POST` returns `303` to `accounts.google.com`; a direct Student `GET`, a cross-origin `POST`, a false/missing setup or age confirmation, or an ineligible grade creates no OAuth state.
- [ ] New Student completes Google consent/callback, lands on `/dashboard`, and retains the explicitly selected publisher and grade.
- [ ] Returning Student reuses the same MAIS user by Google subject, supplies the required age attestation, has stored age assurance and an eligible saved grade, and does not change the saved role/profile.
- [ ] A verified Google email that matches an existing password account is not auto-linked and receives the explicit-link-required flow.
- [ ] An existing Parent proves the MAIS password, explicitly links a matching Google account, completes a later Google callback, and lands on `/parent`.
- [ ] New Teacher is blocked with the invitation-required message.
- [ ] Existing Teacher/Parent account proves its MAIS password, explicitly links the matching Google account, and then signs in with Google without role escalation.
- [ ] Explicit linking fails without the fresh purpose-bound marker, after its five-minute expiry, when bound to a different user, and when attempted from an alias until password authentication is repeated on the canonical host.
- [ ] Provider denial, tampered/expired state, nonce mismatch, token failure, and provider timeout create no MAIS session and show a controlled login error.
- [ ] `/api/auth/session-state` rereads the authenticated identity after callback and after a page reload.
- [ ] Logout clears the MAIS session; a second Google sign-in reuses the same stored identity.
- [ ] The same Google identity persists across another server process or deployment backed by production Postgres.
- [ ] No secret, token, state value, callback query, or cookie appears in committed files or retained evidence.

## Current external blockers

The canonical-host decision and exact formal URLs are now recorded, and the homepage/privacy/terms source exists locally. Production activation is still blocked by external and release prerequisites:

- The approved local key inventory and the observed Vercel environments do not contain the Google OAuth Web client credentials or required Google environment variables.
- `/privacy` and `/terms` are drafts, not approved binding policies. The owner/legal reviewer must confirm the legal entity, address, telephone/privacy contact, governing law and dispute forum, actual production service-provider/region inventory, retention schedule, deletion/backup process, and minors/school-authorisation posture.
- Approved Google test accounts and the Google Auth Platform publishing/verification posture are not yet identified.
- The owner has not yet designated whether `project-hu-xiangen` is the production-only project or the nonproduction Testing project, and no separate project for the other tier has been identified.
- The owner has not authorised staging, committing, pushing, merging, or deploying this slice.
- The cross-process Google-subject reuse test currently proves SQLite durability only. The latest mainline has a fail-closed local-only PostgreSQL 16 integration harness, but the owner-authorized latest-main forward port must add Google identity create/reuse and email-collision-no-auto-link cases to that real database job before production deployment. A Production `POSTGRES_URL` must never be used for this destructive schema-reset test.

Code-only and synthetic checks can proceed without secrets. A real Google callback, Vercel activation, public policy-route proof, and production certification require the approved Google Web client, secret placement, approved legal texts, test accounts, clean reviewed release, and live acceptance evidence.
