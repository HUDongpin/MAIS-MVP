import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalDocument,
  LegalScrollableTable,
  type LegalDocumentSection
} from "@/components/legal/LegalDocument";
import { PUBLIC_SITE_URLS } from "@/lib/publicSiteIdentity";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy | MAIS" },
  description: "How MAIS collects, uses, stores, shares, protects, retains, and deletes personal data, including data used for optional Google Sign-In.",
  alternates: { canonical: PUBLIC_SITE_URLS.privacyPolicy }
};

const LAST_UPDATED = "2026-08-09";
const CONTACT_EMAIL = "hudongpin@126.com";

const sections: readonly LegalDocumentSection[] = [
  {
    id: "scope-and-operator",
    heading: "Scope and operator",
    body: (
      <>
        <p>
          MAIS (Mathematics Adaptive Interactive System) is a K–12 mathematics learning platform for students,
          parents and guardians, teachers, schools, and administrators. It provides curriculum-aligned lessons,
          interactive visualisations, practice, progress tracking, family and classroom tools, and AI-supported tutoring.
        </p>
        <p>
          This draft applies to the public MAIS service at <a href={PUBLIC_SITE_URLS.homepage}>{PUBLIC_SITE_URLS.homepage}</a>.
          The precise legal name of the contracting operator, its postal address and telephone number have not yet
          been confirmed for publication. The product currently identifies the PedaNova brand, Dr. Peter HU Dongpin
          as developer, and <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> as its public contact. Those facts
          must be confirmed by the owner before this draft becomes an effective policy.
        </p>
      </>
    )
  },
  {
    id: "data-we-handle",
    heading: "Personal data we handle",
    body: (
      <>
        <h3>Account and profile information</h3>
        <ul>
          <li>Name, username, email address, role, school or class relationships, curriculum, publisher, grade, language, theme, and profile settings.</li>
          <li>A salted password hash for password accounts. MAIS does not store the readable password.</li>
          <li>Guardian invite and relationship records, teacher/class records, and account-security or password-reset records where those features are used.</li>
        </ul>

        <h3>Learning, classroom, and family information</h3>
        <ul>
          <li>Answers, correctness, attempts, mistakes, lesson progress, activity events, learning time, mastery estimates, recommendations, assignments, and rewards.</li>
          <li>Class membership, teacher feedback, parent messages, reports, support requests, forum content, and other records created through classroom or family tools.</li>
          <li>AI tutor prompts and responses, safety flags, review records, and transcript-access audit records.</li>
        </ul>

        <h3>Uploaded media and technical information</h3>
        <ul>
          <li>Images of work, handwriting, audio, profile images, or other files that a user chooses to submit to an enabled feature.</li>
          <li>Session cookies, request and security records, feature telemetry, and page-view or operational analytics needed to run and protect the service.</li>
        </ul>
      </>
    )
  },
  {
    id: "google-sign-in",
    heading: "Google Sign-In data",
    body: (
      <>
        <p>
          Google Sign-In is optional. The current authorization request uses only <code>openid email profile</code>.
          MAIS accesses the user&rsquo;s stable Google account identifier (the <code>sub</code> claim), verified email
          address, and basic profile data such as display name. Google may also supply a profile-picture claim and a
          hosted-domain claim; the current MAIS account flow does not save or use the Google profile picture.
        </p>
        <p>
          MAIS uses this Google account identifier, verified email address, and basic profile only to authenticate a
          returning user, create an eligible new MAIS account, initialise its display name, or securely and explicitly
          link Google to an existing MAIS account. Linking never changes an account&rsquo;s MAIS role, school membership,
          curriculum, or permissions.
        </p>
        <p>
          MAIS stores the Google subject identifier, the latest verified Google email observed when linking or signing
          in, the associated MAIS user ID, and identity creation and last-login timestamps. For an eligible Student
          Google identity, MAIS also stores a self-attested 13-or-older assurance and the time it was recorded. It may
          store the Google display name as the initial name of an eligible new student profile. MAIS does not receive a
          Google password and does not retain Google access tokens or refresh tokens.
        </p>
        <p>
          Google identity data is not sent to an AI tutor or OCR provider merely because a user signs in. It is not
          sold, shared with data brokers, used for behavioural advertising, or used to train a general-purpose AI
          model. If any of these practices changes, this policy and the in-product disclosure must be updated and any
          legally required new consent must be obtained before the new use begins.
        </p>
      </>
    )
  },
  {
    id: "purposes-and-choices",
    heading: "Why we use data and what is optional",
    body: (
      <>
        <ul>
          <li>Provide sign-in, account security, saved settings, lessons, practice, progress, classroom, and family features.</li>
          <li>Personalise learning and generate mastery estimates, recommendations, explanations, and teacher-facing summaries.</li>
          <li>Process user-requested AI, handwriting/OCR, speech, media, messaging, and export features.</li>
          <li>Moderate content, investigate abuse, support safeguarding workflows, diagnose faults, and protect the service.</li>
          <li>Meet legal obligations and respond to valid privacy, safety, or law-enforcement requests.</li>
        </ul>
        <p>
          Fields marked as required in an account or feature form are necessary to complete that transaction. If they
          are not provided, MAIS cannot create the account or deliver that feature. Google Sign-In is voluntary;
          password registration and login provide a non-Google route to the service.
        </p>
      </>
    )
  },
  {
    id: "sharing-and-processing",
    heading: "Recipients, service providers, and cross-border processing",
    body: (
      <>
        <p>
          MAIS may disclose data to the user&rsquo;s school, teacher, parent or guardian where the applicable product flow
          has verified the relevant role and relationship. In the protected media-object service, a Teacher may read an
          assignment image, classroom work sample, or practice work photo only when server-side class and enrolment
          records confirm a relationship to the student who owns it; missing, unrelated, or failed relationship checks
          are denied. MAIS also uses providers for hosting and databases, operational analytics, authentication, AI/LLM
          responses, OCR and handwriting recognition, speech processing, email or notifications, webhooks, and optional
          external learning-record stores.
        </p>
        <p>
          Provider routing and hosting region can vary by configuration. Current source code contains integrations for
          Google, Vercel, Qwen/DashScope, DeepSeek-compatible providers, DeepInfra, SimpleTex, Mathpix, EdUHK services,
          Resend, WeCom/webhooks, and external learning-record stores, but source availability does not prove that each
          provider is enabled in production. The final policy must name or categorise the actually enabled providers,
          processing locations, purposes, safeguards, and contractual restrictions after the production inventory is
          verified.
        </p>
        <p>
          MAIS does not sell personal data or use learner data for behavioural advertising. Disclosure may also occur
          where required by law, to investigate security or abuse, or as part of a properly governed business transfer.
        </p>
      </>
    )
  },
  {
    id: "children-and-schools",
    heading: "Children, parents, and schools",
    body: (
      <>
        <p>
          Many MAIS learners may be children. Google Sign-In is an optional identity method and is not parental
          consent. A Google account, Google consent screen, school-looking email address, grade selection, or a simple
          checkbox does not by itself prove verifiable parental consent or school authorisation.
        </p>
        <p>
          <strong>Current limitation:</strong> the general registration flow does not collect date of birth or record a
          verified parental-consent or school-authorisation decision. The current self-service Student Google flow is
          therefore restricted to a learner who selects S2-S6 and attests that they are at least 13. Younger learners
          cannot use Google Sign-In, including for an existing Student account. MAIS does not yet provide a verified
          parental-consent or school-authorisation path inside the product; the grade and checkbox gate is only a
          conservative technical safeguard.
        </p>
        <p>
          Schools that provide student accounts or records remain responsible for giving required notices and using the
          service under an appropriate written agreement. Where FERPA applies, MAIS should be used only under controls
          that preserve the school&rsquo;s direct control, authorised educational purpose, and restrictions on redisclosure.
          This draft does not claim that MAIS is &ldquo;FERPA certified.&rdquo;
        </p>
      </>
    )
  },
  {
    id: "retention",
    heading: "Retention and deletion",
    body: (
      <>
        <LegalScrollableTable label="Current MAIS data retention behaviour">
          <table>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Current behaviour</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Google-linked identity</td>
                <td>Retained with the MAIS account; no automatic expiry or self-service unlink/delete workflow is currently verified.</td>
              </tr>
              <tr>
                <td>Account, profile, activity, attempts, progress, mastery, and tutor records</td>
                <td>Retained for the life of the account; no complete automatic expiry or self-service account erasure is currently verified.</td>
              </tr>
              <tr>
                <td>Uploaded or captured media</td>
                <td>
                  Media routed through the protected media-object service is encrypted with AES-256-GCM and access is
                  blocked after the configured expiry (90 days by default), but the encrypted bytes are not automatically
                  purged. Some legacy or direct embedded data-URL fields remain in the application database and do not
                  have a separately verified object-store expiry or encryption-at-rest guarantee; they require final
                  inventory, migration, and retention decisions before publication.
                </td>
              </tr>
              <tr>
                <td>Temporary OAuth transaction context</td>
                <td>
                  State, nonce, PKCE verifier, account role, Student age/setup information where applicable,
                  interface preferences, safe return path, and—during explicit linking—the bound MAIS user identifier
                  are encrypted in a short-lived HttpOnly cookie for up to 10 minutes and cleared after the callback;
                  they are not used as a durable identity record.
                </td>
              </tr>
            </tbody>
          </table>
        </LegalScrollableTable>
        <p>
          Revoking MAIS in a Google Account prevents future Google authorisation but does not by itself delete the MAIS
          account or the Google identity record already stored there. Logging out clears the login session only. A
          teacher-facing data-request message or deletion-request label is not proof that data has been erased.
        </p>
        <p>
          Until verified erasure and export tooling exists, users must contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          The operator must verify the requester and the affected records, coordinate with an authorised school where
          applicable, and confirm what was deleted or retained. The final published policy needs an executable,
          category-specific retention schedule and backup-deletion timetable.
        </p>
      </>
    )
  },
  {
    id: "security",
    heading: "Security",
    body: (
      <>
        <ul>
          <li>Passwords are stored as salted hashes and login sessions use signed HttpOnly cookies.</li>
          <li>Google OAuth uses the authorization-code flow, OpenID Connect, PKCE S256, nonce validation, encrypted short-lived state, and strict redirect checks.</li>
          <li>Media routed through the protected media-object service is encrypted with AES-256-GCM and must pass its configured access checks before it is served. The owner and an Admin may read it; Teacher access to the three reviewable media categories also requires a server-confirmed class enrolment relationship and fails closed. Direct embedded media fields are excluded from this claim.</li>
          <li>Role, relationship, and transcript-access events are checked or logged only in the product flows where those controls are currently implemented.</li>
        </ul>
        <p>
          No system is perfectly secure. This draft does not promise absolute security. The final operational policy
          must identify the responsible security owner, incident-response process, service-provider review, periodic
          risk assessment, and notification procedure.
        </p>
      </>
    )
  },
  {
    id: "rights-and-contact",
    heading: "Access, correction, deletion, and contact",
    body: (
      <>
        <p>
          Depending on the applicable law and school relationship, a user, parent, guardian, or school may request
          access, correction, export, deletion, restriction, or withdrawal of consent. Email
          <a href={`mailto:${CONTACT_EMAIL}`}> {CONTACT_EMAIL}</a> with the account identifier, the request, and enough
          information to verify authority without sending a password or unnecessary sensitive data.
        </p>
        <p>
          If a learner uses MAIS through a school, the request may need to be coordinated with that school. The operator
          may retain limited records where required by law, for security, or to document a completed request, and should
          explain any such retention in its response.
        </p>
        <p>
          Material changes will be dated and, where required, notified before personal data is used for a new purpose.
          Privacy questions and complaints may be sent to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. A
          named privacy officer, postal address, telephone number, and regulator-specific complaint instructions must be
          added before publication.
        </p>
      </>
    )
  }
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      contactNote={
        <>
          Related: <Link href="/terms">Terms of Service</Link> · <Link href="/">MAIS homepage</Link>
        </>
      }
      eyebrow="Legal and privacy"
      lastUpdated={LAST_UPDATED}
      sections={sections}
      status="draft-pending-review"
      summary="How MAIS handles account, learning, classroom, media, AI, and optional Google Sign-In data — including current limitations that must be resolved before publication."
      title="Privacy Policy"
    />
  );
}
