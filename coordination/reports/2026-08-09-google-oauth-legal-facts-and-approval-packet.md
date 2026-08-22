# MAIS Google OAuth legal facts and approval packet

Date prepared: 2026-08-09 (Asia/Hong_Kong)  
Status: **PENDING OWNER FACT CONFIRMATION AND INDEPENDENT COUNSEL APPROVAL — NOT APPROVED FOR PUBLICATION**

This is an engineering evidence and approval-control record, not legal advice. It separates public product statements from the facts that only the operator and qualified counsel can confirm. Neither Codex nor a Google Cloud configuration can supply or replace those confirmations.

## 1. Exact documents currently under review

The files below are untracked working-tree drafts and both render `data-document-status="draft-pending-review"`. Their current raw page-source hashes identify only the audited drafts; they are not approval evidence and must be regenerated after every substantive edit. Final approval uses the `mais-google-legal-v1` review-bundle digest described in section 6, not these historical raw hashes.

| Document | Source | Raw page-source SHA-256 on 2026-08-09 | Current status |
| --- | --- | --- | --- |
| Privacy Policy | `app/privacy/page.tsx` | `1113db30b1de93601bdaa7a59cd44f593a6278bd83d94ce2f6b81c640cf94525` | Draft; not effective |
| Terms of Service | `app/terms/page.tsx` | `63f871ff1a4f17bc36d45b8dec462c0700e4622b3c72af75f5ffd8aac11204a8` | Draft; not effective |

Do not sign the approval statements in section 6 against these two hashes. Section 3 records unresolved P0 issues that require correction or an explicit, jurisdiction-specific counsel decision first.

## 2. Legal facts schedule

### 2.1 Public statements that can be evidenced today

| Fact | Evidence boundary | Status |
| --- | --- | --- |
| The public product uses the name `MAIS`. | The live homepage at `https://www.mais.ac/` returned direct HTTP 200 on 2026-08-09 and identifies the product as MAIS / Math AI System. The developer site at `https://www.hudongpin.com/` expands MAIS as Mathematics Adaptive Interactive System. | Confirmed public product statements; not legal-entity facts. Owner must choose one authoritative expansion. |
| The product and related public pages use the `PedaNova` brand. | `https://www.mais.ac/` shows PedaNova in the footer. `https://www.pedanova.tech/` describes MAIS as its mathematics-learning product and links to the MAIS site. | Confirmed public brand statement; the brand-to-entity legal relationship is unconfirmed |
| Public pages identify Dr. Peter HU Dongpin as the developer and PedaNova founder/CEO. | `https://www.mais.ac/` calls him the developer; `https://www.pedanova.tech/team/` calls him CEO and Founder. These are self-descriptions. | Confirmed public biographical statements; they do not prove that the named individual or PedaNova is the contracting operator |
| `hudongpin@126.com` is presented as a public contact. | `https://www.mais.ac/` and `https://www.hudongpin.com/` publish this address, and the draft legal pages currently use it. | Confirmed public contact statement; owner must confirm that it is monitored and authorised for privacy, security, legal notices, and data-subject requests |
| `www.mais.ac` is the owner-selected canonical OAuth host. | Owner instruction and the implementation contract fix the canonical origin to this host. | Confirmed product/OAuth decision; domain ownership and the operator's authority must still be attested |

### 2.2 Facts that are **not established** by public pages

The following must be supplied from formation/registration records and confirmed by an authorised owner. A brand name, founder biography, contact location, domain registration, Google account, or Cloud project name is not a substitute.

- Exact contracting operator legal name, entity type, registration jurisdiction, registration/entity number, status, and registered address.
- Whether `PedaNova` is a registered entity, trade name, product brand, or another relationship; and the legal operator's authority to use that brand.
- The legal operator's authority over MAIS, `mais.ac`, the public policies, Google OAuth, software/content rights, and production data processing.
- Registered office, principal place of business, postal address for formal notices and privacy requests, and public telephone number.
- Authorised signatory's full name, title, entity relationship, and authority.
- Named privacy and security contacts and the identity/contact route for counsel.

An attempted read-only lookup through the official California Secretary of State business-search service was blocked by its anti-automation layer. No authoritative PedaNova entity record was obtained. Therefore no California registration, entity number, status, or address is asserted here.

`https://www.pedanova.tech/` describes PedaNova Ed-Tech as an American AI-native company, and `https://www.pedanova.tech/contact/` publishes a California contact location and telephone number. Neither page shows an `Inc.`, `LLC`, or other legal suffix, a registry number, or labels the contact location as a registered office, principal office, agent-for-service address, or formal notice address. Those marketing/contact statements therefore remain insufficient for the operator fields above.

### 2.3 Owner fact questionnaire

The authorised owner must provide or confirm all of the following before counsel receives a purportedly final version:

1. Operator identity and authority: every field in section 2.2, plus the precise relationship among the legal entity, MAIS, PedaNova, and `mais.ac`.
2. Intended users and territories: consumer versus school service, controller/processor or school-official posture, actual launch jurisdictions, supported languages, and the controlling legal-language version.
3. Business model: free, pilot, subscription, school contract, renewal/cancellation/refund/tax model, and which agreement prevails when a school has a separate contract.
4. Production provider inventory: which of Vercel, production database/object storage, Vercel Analytics, Google, Qwen/DashScope, DeepSeek-compatible providers, DeepInfra, SimpleTex, Mathpix, EdUHK services, Resend, WeCom/webhooks, and external learning-record stores are actually enabled; for each, data categories, purpose, region, retention, contract restrictions, and training posture. Source-code support alone is not production evidence.
5. Representations that must remain operationally true: no sale of personal data, no behavioural advertising, no general-purpose model training with learner data, and no forwarding of Google identity data to AI/OCR merely because a user signs in.
6. Executable retention, export, unlink, deletion, and backup-erasure schedule by data category, including requester verification, responsible person, response target, exceptions, and backup deletion timing.
7. Minors and schools: who may self-register in each launch jurisdiction; how age is determined; when verifiable guardian consent or documented school authorisation is required; and who supplies school DPA/parent notices. The Google Student `S2-S6` plus `13+` self-attestation is only a conservative technical gate, not verified age or consent.
8. Security operations: responsible security owner, incident response, service-provider review, periodic risk assessment, notification process, production media-key configuration, and the disposition of legacy direct data-URL media.
9. Content and IP: rights/licences for software, curricula, question banks, illustrations, publisher material, brands, AI-generated content, and user submissions; permitted provider sublicensing and complaint/takedown procedure.
10. Effective date, document version, material-change notice, formal notice method, approval retention, and authorised publication/release owner.

## 3. P0 decisions before a final text exists

### P0-1 — Terms acceptance promise does not match the product

The draft Terms says a user who creates an account or uses MAIS “will be asked to accept” the effective terms. Current registration, password login, and Google OAuth show legal links but do not persist a terms version, accepting principal, time, method, or authority.

Before publication, counsel and the owner must select and implement one outcome:

- implement a versioned clickwrap/guardian-or-school-authorisation record appropriate to the intended users and jurisdictions; or
- replace the promise with a counsel-approved formation/notice mechanism that accurately describes the shipped product, including its use by minors.

### P0-2 — The Google minor gate does not govern general registration

The Google Student flow restricts self-service OAuth to an S2-S6 learner who attests to being at least 13. General password registration still permits Student/Teacher/Parent self-service and K-S6 selection without date of birth, verified guardian consent, or recorded school authorisation. The policies must not imply that the Google-specific gate solves platform-wide child-account authority.

### P0-3 — Production providers, regions, deletion and retention are not yet evidenced

The final policy cannot publish a source-code possibility list as if it were the deployed subprocessor inventory. It also cannot promise complete erasure while no complete self-service account-erasure endpoint or verified manual and backup-deletion SOP exists. A redacted production configuration inventory and executable owner-approved procedure are required.

### Additional counsel/owner corrections

- Disambiguate “owner” in the media section: the code means the media data subject/uploading account, not necessarily the company owner.
- Split retention categories to reflect actual 10-minute OAuth state, 90-day auth-funnel cleanup, 365-day transcript-access audit cleanup, configured media access expiry without automatic byte purge, and any other production rules.
- Confirm whether and how Vercel Analytics operates, including relevant technical data, cookies or cookieless behaviour, region, and retention.
- Do not describe ordinary password-account email as verified; verified email is a Google-OAuth identity fact only.
- Replace every conditional payment, service-level, IP, governing-law, liability, indemnity, dispute, termination, and safeguarding placeholder with text matching the actual launch model.

## 4. Required counsel decisions

Qualified counsel for the actual operator and launch jurisdictions must determine and document at least:

- applicable privacy/consumer/education laws and the operator's controller, processor, school-official, or equivalent role;
- lawful bases, school DPA, cross-border transfer safeguards, subprocessors, data-subject rights, complaint instructions, incident notice, retention and deletion exceptions;
- age, capacity, guardian consent, school authorisation, and contract formation for each user group and territory;
- clickwrap/browsewrap or another enforceable acceptance mechanism and versioned evidence;
- governing law/forum or arbitration, mandatory consumer-law exceptions, warranties, liability cap, indemnity, suspension/termination, appeal, and material changes;
- user-content and provider sublicences, deletion survival, platform/third-party IP, AI output and training restrictions;
- AI/OCR/learning-inference disclosures and human-review limits for consequential decisions;
- cookie/analytics/marketing treatment and bilingual controlling-version requirements; and
- Google API Services User Data Policy and Limited Use disclosures.

## 5. Google Auth Platform contract and current execution state

| Field | Exact value/status |
| --- | --- |
| Google Cloud project currently inspected | `project-hu-xiangen`; External / Testing; production-vs-nonproduction designation still pending |
| App name | `MAIS` |
| Audience | `External` / `Testing`; `0 users (0 test, 0 other) / 100 user cap` and no test-user rows as of 2026-08-20 |
| User support email | `hudongpin123@gmail.com` (the only eligible account/group option shown in the project) |
| Developer contact | `hudongpin123@gmail.com` |
| Homepage | `https://www.mais.ac/` |
| Privacy | `https://www.mais.ac/privacy` |
| Terms | `https://www.mais.ac/terms` |
| Authorized domain | `mais.ac` |
| OAuth client type/name | `Web application` / `MAIS Production Web` |
| Authorized JavaScript origins | None; server-side authorization-code flow |
| Authorized redirect URI | `https://www.mais.ac/api/auth/google/callback` |
| Runtime scopes | `openid email profile` only |
| Current client count | `0` as of 2026-08-20 |
| Current Branding configuration | Logo, Homepage, Privacy, Terms, and authorized domains are empty as of the latest read-only 2026-08-20 check |
| Current Data Access configuration | Non-sensitive, sensitive, and restricted scope tables each show `No rows to display` as of the latest read-only 2026-08-20 check |

On 2026-08-09, the Google Auth Platform setup wizard was opened in the named project and paused before the account-owner agreement checkbox. Codex did not make that personal/legal attestation. A new read-only check on 2026-08-20 shows that the platform is now initialized as MAIS / External / Testing, so the earlier wizard-pause observation is no longer current; Codex does not infer who completed the owner-only agreement step. A second current-state read-only inspection on 2026-08-20 confirmed the zero-client overview, empty Branding fields/logo/domains, zero test users, and empty non-sensitive/sensitive/restricted Data Access tables. No Save, Publish app, Add users, Add scopes, Add domain, logo upload, or Create OAuth client control was used. No OAuth client exists and no client secret has been generated by this continuation.

Google's OAuth 2.0 policy now expressly applies to OpenID Connect authentication-only apps and requires separate Cloud projects for development, testing/staging, and production. Before creating `MAIS Production Web`, the owner must designate whether `project-hu-xiangen` is production-only or nonproduction, and identify or create the separate project for the other tier. A production client must not share its project or credential with local, Preview, or staging use.

The public homepage currently returns HTTP 200; `/privacy` and `/terms` each return HTTP 404 in production. Consequently, even after the Web client is created, production Brand Verification and publication must wait until the exact approved legal pages are deployed and publicly verified. Google requires a published Privacy Policy that accurately explains access, use, storage, and sharing of Google user data. Only the basic identity scopes are used, so sensitive/restricted-scope data-access verification is not expected; production display of the MAIS name/logo still requires Brand Verification and publication.

## 6. Exact approval statements for the final, corrected hashes

These templates must be completed by the actual authorised persons after the P0 decisions are resolved. Replace every bracket and bind both approvals to the same final SHA-256 values or immutable reviewed commit/blob. Any substantive redline invalidates earlier approval.

For the production gate, each final document SHA-256 is a `mais-google-legal-v1` review-bundle digest over the exact page source plus `components/legal/LegalDocument.tsx` and `lib/publicSiteIdentity.ts`. This ensures that a shared status/copy or public-identity change invalidates both approvals. Use [the non-binding example manifest](./2026-08-20-google-oauth-policy-approval.example.json) only as a shape reference. After the exact final source is ready for review, store the completed approval record at `.local/legal-approvals/google-oauth-policy-approval.json` or pass an explicitly protected path with `--approval-file`; `.local/` is ignored and no actual approval or personal signature should be committed by default.

The executable check is:

```bash
npm run check:google-oauth-legal-approval -- --json
```

It requires both documents to be marked `published` in the unpublished release candidate, contain no draft markers, match the manifest hashes, and have separate owner/counsel records with non-placeholder identity, authority/firm, ISO approval time, evidence reference, reviewed jurisdictions, conditions, facts-schedule version, and effective date. The check authenticates consistency and completeness of the archived record; it does not independently prove that a named person sent or signed the referenced evidence.

The production deployment command applies this check twice: once to the reviewed repository candidate before build, and again to the exact pruned Vercel staging source after staging is prepared but before dry-run success or any Vercel command. The second invocation passes `--source-root` internally and accepts only a real path under this repository's `.tmp/vercel-staging/` boundary. Both checks must match the same private manifest, closing the gap in which approved source A could otherwise be transformed into staged source B.

### Owner approval

> I, [FULL LEGAL NAME], acting as [TITLE] with authority for [EXACT LEGAL ENTITY, ENTITY TYPE, JURISDICTION, REGISTRATION NO.], confirm that [ENTITY] operates MAIS, [describe its right to use the PedaNova brand], and is authorised to publish at www.mais.ac and configure Google OAuth. I confirm that Legal Facts Schedule [VERSION/DATE] is complete and accurate, including operator and contacts, audiences and jurisdictions, business model, production subprocessors and locations, data uses, no-sale/no-behavioural-advertising/no-general-model-training representations, retention/deletion/backup procedures, minors/school model, security responsibilities, and IP/licensing. I have reviewed and approve for publication and submission to Google the exact Privacy Policy SHA-256 [FINAL PRIVACY HASH] and Terms of Service SHA-256 [FINAL TERMS HASH], effective [DATE], subject only to the counsel approval below. I authorise the release owner to change those exact documents to published status and deploy them. Any substantive change requires renewed owner and counsel approval. Name / Title / Entity / Date / Signature or authenticated email reply.

### Counsel approval

> I, [COUNSEL NAME], [TITLE/FIRM], counsel to [EXACT LEGAL ENTITY], confirm that I reviewed the exact Privacy Policy SHA-256 [FINAL PRIVACY HASH], Terms of Service SHA-256 [FINAL TERMS HASH], and Legal Facts Schedule [VERSION/DATE] for the intended audiences and jurisdictions [LIST]. Subject to the written conditions/redlines [NONE or LIST], I approve those exact texts for publication at https://www.mais.ac/privacy and https://www.mais.ac/terms, incorporation into the MAIS account/use flow, and submission to Google Auth Platform. I have specifically reviewed operator identity, minors/school authorisation, lawful bases and rights, cross-border subprocessors, retention/deletion, acceptance formation, IP/user-content licence, AI limitations, warranties/liability, governing law/forum, consumer-law exceptions, and change/termination provisions. This approval does not extend to later substantive changes without renewed review. Name / Firm / Jurisdiction(s) / Date / Signature or authenticated firm email reply.

## 7. Publication hard gate

1. Owner supplies the complete legal facts and production evidence.
2. The P0 issues are resolved in product or corrected text; all placeholders and self-described draft language are removed.
3. In an isolated, unpublished release candidate, set both final routes to `published`, set the accurate effective/updated date, and verify there is no draft marker or contradictory summary.
4. Generate the two `mais-google-legal-v1` review-bundle digests from that exact candidate. Owner and independent qualified counsel approve those same digests using section 6 or an equally explicit authenticated record.
5. Archive the final digests/immutable reviewed revision, approver identity and authority, date, conditions, and evidence without unnecessary identity documents or secrets; create the ignored private manifest and require the executable approval gate to pass against the repository candidate.
6. Prepare the clean authorised Vercel staging tree and require the same gate to pass against those exact staged bytes before deployment. After release, anonymously verify direct HTTP 200, exact canonical URL, published marker, and approved content at all three Google URLs.
7. Then save/verify/publish Google Branding, create or validate the production Web client, place its secret only in the approved production secret store, and run the real callback and production certification gates.

Until all seven gates pass, no one should claim that owner/counsel approval was obtained, that the policies are final, that Google Branding is production-ready, or that Continue with Google is fully live.
