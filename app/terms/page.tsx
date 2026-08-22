import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, type LegalDocumentSection } from "@/components/legal/LegalDocument";
import { PUBLIC_SITE_URLS } from "@/lib/publicSiteIdentity";

export const metadata: Metadata = {
  title: { absolute: "Terms of Service | MAIS" },
  description: "Draft terms for use of the MAIS K–12 mathematics learning platform and its optional Google Sign-In feature.",
  alternates: { canonical: PUBLIC_SITE_URLS.termsOfService }
};

const LAST_UPDATED = "2026-08-09";
const CONTACT_EMAIL = "hudongpin@126.com";

const sections: readonly LegalDocumentSection[] = [
  {
    id: "status-and-agreement",
    heading: "Status of this draft and the agreement",
    body: (
      <>
        <p>
          These draft terms are intended to govern use of MAIS, the Mathematics Adaptive Interactive System. They are
          not yet effective. The owner must confirm the legal contracting entity, effective date, governing law,
          dispute forum, contact address, payment model, and final liability language before publication.
        </p>
        <p>
          Once approved and published, a user who creates an account or uses MAIS will be asked to accept the effective
          terms. If a school or district has a separate written agreement, that agreement controls where it conflicts
          with these consumer terms.
        </p>
      </>
    )
  },
  {
    id: "eligibility-and-minors",
    heading: "Eligibility, children, parents, and schools",
    body: (
      <>
        <p>
          MAIS serves students, parents and guardians, teachers, schools, and administrators. A person below the age at
          which they can enter a binding contract may use MAIS only through an appropriately authorised school account
          or with the permission and involvement of a parent or guardian who can accept the effective terms for them.
        </p>
        <p>
          Google Sign-In is not proof of age, parental consent, or school authorisation. Where a child-privacy law
          requires verified parental consent or documented school authorisation before collection, the applicable MAIS
          flow must obtain and record that authorisation before starting Google OAuth. Where an authorised school or
          guardian separately arranges a permitted non-Google account, that route remains independent of Google;
          MAIS does not currently verify that authorisation in-product.
        </p>
      </>
    )
  },
  {
    id: "accounts-and-roles",
    heading: "Accounts and roles",
    body: (
      <>
        <ul>
          <li>Provide accurate account information and keep it current.</li>
          <li>Keep credentials confidential and promptly report suspected compromise.</li>
          <li>Do not share an account or create one for another person without the required authority.</li>
          <li>Use teacher, parent, guardian, and administrator access only for authorised educational and safeguarding purposes.</li>
          <li>Invite codes and claimed relationships do not grant authority beyond the permissions verified by the school or family.</li>
        </ul>
        <p>
          MAIS may require reauthentication, verification, or a school invitation before creating a privileged account
          or linking another identity. A Google email match alone never authorises an account link.
        </p>
      </>
    )
  },
  {
    id: "google-sign-in",
    heading: "Optional Google Sign-In",
    body: (
      <>
        <p>
          Google Sign-In is an optional authentication method. By choosing it, the user asks Google to provide the
          identity information described in the <Link href="/privacy">Privacy Policy</Link>. MAIS uses that information
          only to authenticate, create an eligible account, or explicitly link an existing account.
        </p>
        <p>
          Linking Google does not change a MAIS role, grade, curriculum, class, school, guardian relationship, or other
          permission. A user linking an existing account must be authorised to control both the MAIS account and the
          Google identity. MAIS does not receive a Google password and does not retain Google access or refresh tokens.
        </p>
        <p>
          Google provides its own services under separate terms and may change or interrupt them. Google does not
          sponsor or endorse MAIS. Revoking MAIS in a Google Account stops future Google authorisation, but it does not
          automatically delete the MAIS account or data already stored there; use the process in the Privacy Policy.
        </p>
      </>
    )
  },
  {
    id: "acceptable-use",
    heading: "Acceptable use",
    body: (
      <>
        <p>You must not:</p>
        <ul>
          <li>harass, threaten, exploit, or harm another person, or submit unlawful, abusive, sexual, or unsafe content;</li>
          <li>access another person&rsquo;s account, records, class, or system without authority;</li>
          <li>circumvent safeguards, rate limits, moderation, role checks, age or consent gates, or security controls;</li>
          <li>probe, scan, overload, disrupt, automate against, or introduce malicious code into the service;</li>
          <li>scrape, bulk-export, reproduce, or redistribute protected lessons, question banks, visualisations, or user records; or</li>
          <li>use MAIS, learner data, or generated output to train a competing system except where a written agreement expressly permits it.</li>
        </ul>
        <p>
          MAIS may moderate content, restrict a feature, or suspend access where reasonably necessary to protect
          learners, other users, legal rights, or the service. Safeguarding and school escalation procedures must be
          confirmed before the terms become effective.
        </p>
      </>
    )
  },
  {
    id: "ai-and-learning-output",
    heading: "AI tutor and learning estimates",
    body: (
      <>
        <p>
          AI-generated explanations, OCR results, recommendations, and translations can be incomplete or wrong. They
          are study aids, not substitutes for a qualified teacher, and must not be the sole basis for grading,
          placement, eligibility, discipline, diagnosis, counselling, or another consequential decision.
        </p>
        <p>
          Mastery scores and recommended next steps are statistical inferences, not objective facts about a learner.
          Teachers, parents, and learners should review them in context. The AI tutor is not an emergency or mental
          health service; contact local emergency services or the responsible safeguarding professional where needed.
        </p>
      </>
    )
  },
  {
    id: "content-and-licences",
    heading: "Content and intellectual property",
    body: (
      <>
        <p>
          MAIS software, lessons, question banks, visualisations, branding, and other platform content belong to the
          operator or its licensors. An authorised user receives a limited, non-exclusive, non-transferable licence to
          use that content for permitted learning and teaching purposes.
        </p>
        <p>
          A user retains ownership of original work they submit. They grant the operator only the limited rights needed
          to host, process, display, return, moderate, and share it with their authorised school, teacher, parent, or
          guardian to provide the service. This draft does not grant a right to sell student content or use it for
          behavioural advertising or general-purpose model training.
        </p>
        <p>
          Curriculum standards, publisher names, Google marks, and third-party materials remain the property of their
          respective owners. References do not imply sponsorship or endorsement.
        </p>
      </>
    )
  },
  {
    id: "privacy-and-providers",
    heading: "Privacy and third-party services",
    body: (
      <>
        <p>
          The <Link href="/privacy">Privacy Policy</Link> describes personal data practices and is incorporated into
          these terms once both documents are approved. Schools may require a separate data-processing agreement that
          controls student records, provider use, security, incidents, access, retention, return, and deletion.
        </p>
        <p>
          Some features depend on hosting, analytics, AI, OCR, speech, messaging, authentication, or learning-record
          providers. Their availability can change. The operator must keep the published provider disclosure accurate
          and may not introduce a materially new use of personal data without the notice and consent required by law.
        </p>
      </>
    )
  },
  {
    id: "availability-and-ending-use",
    heading: "Availability, suspension, and ending use",
    body: (
      <>
        <p>
          MAIS is provided on an as-available basis. Features may change, be interrupted, or be withdrawn. A written
          school or paid-service agreement may provide different service levels and will control those commitments.
        </p>
        <p>
          Access may be suspended for a material breach, security threat, safeguarding need, non-payment under a future
          paid agreement, or legal requirement. A user may stop using MAIS and request access, export, correction, or
          deletion as described in the Privacy Policy. Logging out or revoking Google access is not account deletion.
        </p>
      </>
    )
  },
  {
    id: "warranties-liability-and-law",
    heading: "Warranties, liability, governing law, and contact",
    body: (
      <>
        <p>
          Warranty disclaimers, liability exclusions, any liability cap, indemnities, governing law, court or dispute
          forum, and consumer-law exceptions require jurisdiction-specific legal review. They are intentionally not
          invented in this draft. Nothing in the final terms may exclude liability that applicable law does not allow
          the operator to exclude.
        </p>
        <p>
          Questions about these draft terms may be sent to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. The
          final terms must identify the legal contracting entity, postal address, effective date, formal notice method,
          and process for material changes before they are presented as binding or supplied to Google.
        </p>
      </>
    )
  }
];

export default function TermsOfServicePage() {
  return (
    <LegalDocument
      contactNote={
        <>
          Related: <Link href="/privacy">Privacy Policy</Link> · <Link href="/">MAIS homepage</Link>
        </>
      }
      eyebrow="Legal"
      lastUpdated={LAST_UPDATED}
      sections={sections}
      status="draft-pending-review"
      summary="The proposed rules for using MAIS, including account authority, optional Google Sign-In, AI limitations, content, privacy, and the legal terms still requiring owner and counsel decisions."
      title="Terms of Service"
    />
  );
}
