import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, type LegalDocumentSection } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service | MAIS",
  description:
    "The terms on which MAIS, an interactive K-12 mathematics learning platform, is made available to learners, guardians, teachers and schools."
};

const LAST_UPDATED = "2026-07-31";
const CONTACT_EMAIL = "hudongpin@126.com";

const sections: readonly LegalDocumentSection[] = [
  {
    id: "agreement",
    heading: "The agreement",
    body: (
      <>
        <p>
          These terms govern use of the MAIS platform. By creating an account or using MAIS you
          accept them. If you do not accept them, do not use the service.
        </p>
        <p>
          Where a school or district has signed a separate written agreement covering its use of
          MAIS, that agreement governs, and these terms apply only to the extent they do not
          conflict with it.
        </p>
        <p>
          If you are under the age of majority where you live, you may use MAIS only through an
          account provided by your school, or with the permission of a parent or guardian who
          accepts these terms for you.
        </p>
      </>
    )
  },
  {
    id: "accounts",
    heading: "Accounts",
    body: (
      <>
        <ul>
          <li>Provide accurate information when registering, and keep it up to date.</li>
          <li>
            Keep your password confidential. You are responsible for activity under your account.
            Tell us promptly if you believe it has been compromised.
          </li>
          <li>
            Teacher and administrator accounts can see learner records. Use that access only for the
            educational purposes your school has authorised.
          </li>
          <li>
            Do not share an account, and do not create an account for someone else without their
            authority — or, for a child, without their school&rsquo;s or guardian&rsquo;s authority.
          </li>
        </ul>
      </>
    )
  },
  {
    id: "acceptable-use",
    heading: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>
            use MAIS to harass, bully, threaten, or harm anyone, or to send abusive, hateful, sexual,
            or otherwise inappropriate content — including through the AI tutor;
          </li>
          <li>attempt to access accounts, data, or systems you are not authorised to access;</li>
          <li>
            probe, scan, overload, or disrupt the service, or circumvent rate limits or security
            controls;
          </li>
          <li>
            scrape, bulk-export, or redistribute the question banks, lesson content, or
            visualisations;
          </li>
          <li>reverse engineer the service except to the extent that restriction is unenforceable; or</li>
          <li>use MAIS to build or train a competing model or product.</li>
        </ul>
        <p>
          Messages to the AI tutor pass through automated safety and moderation checks. Content that
          those checks flag may be withheld from the learner, recorded in an audit log, and — where
          it suggests a risk of harm — escalated to the responsible teacher or administrator.
        </p>
      </>
    )
  },
  {
    id: "ai-tutor",
    heading: "The AI tutor — what it is and is not",
    body: (
      <>
        <p>
          The AI tutor generates explanations automatically. <strong>It can be wrong.</strong> It may
          state an incorrect result, use a flawed method, or misread handwriting. Its output is a
          study aid and is not a substitute for a teacher, and it should not be relied on as the sole
          source for graded work or assessment decisions.
        </p>
        <p>
          Progress estimates, mastery levels, and recommended next steps are statistical inferences
          about a learner. They are intended to guide teaching and should not be used on their own to
          make consequential decisions about a learner — placement, grading, or eligibility — without
          human review.
        </p>
        <p>
          The AI tutor is not a counselling or emergency service. If a learner is at risk of harm,
          contact local emergency services or your school&rsquo;s safeguarding lead.
        </p>
      </>
    )
  },
  {
    id: "content",
    heading: "Content and intellectual property",
    body: (
      <>
        <p>
          MAIS and its content — lessons, question banks, visualisations, and software — belong to
          the operator of MAIS or its licensors. You get a limited, non-exclusive, non-transferable
          right to use them for learning and teaching, and no other rights.
        </p>
        <p>
          Work that a learner or teacher submits stays theirs. You grant us the right to store,
          process, and display it as needed to run the service and to provide it back to the learner,
          their guardians, and their school.
        </p>
        <p>
          Curriculum standards and textbook material referenced in MAIS remain the property of their
          respective publishers and authorities.
        </p>
      </>
    )
  },
  {
    id: "availability",
    heading: "Availability and changes",
    body: (
      <>
        <p>
          MAIS is provided as-is and as-available. We do not promise uninterrupted service, and we
          may change, suspend, or discontinue features. Where a school agreement specifies a service
          level, that agreement controls.
        </p>
        <p>
          We may suspend or terminate an account that breaches these terms, or where required to
          protect learners or the service. You may stop using MAIS at any time, and may ask us to
          delete your data as described in the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </>
    )
  },
  {
    id: "liability",
    heading: "Disclaimers and liability",
    body: (
      <>
        <p>
          To the fullest extent the law allows, MAIS is provided without warranties of any kind,
          express or implied, including merchantability, fitness for a particular purpose, and
          non-infringement.
        </p>
        <p>
          To the fullest extent the law allows, we are not liable for indirect, incidental, special,
          consequential, or punitive damages, or for lost data, revenue, or profits arising from your
          use of MAIS.
        </p>
        <p>
          Nothing in these terms excludes liability that cannot lawfully be excluded — including for
          death or personal injury caused by negligence, or for fraud. Some jurisdictions do not
          allow certain exclusions, so parts of this section may not apply to you.
        </p>
      </>
    )
  },
  {
    id: "governing-law",
    heading: "Governing law and contact",
    body: (
      <>
        <p>
          The governing law and the forum for disputes have not yet been settled and will be
          specified here before these terms take effect. Where MAIS is used under a school or
          district agreement, that agreement&rsquo;s governing-law clause applies instead.
        </p>
        <p>
          Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
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
          Related: <Link href="/privacy">Privacy Policy</Link> ·{" "}
          <Link href="/subprocessors">Subprocessors and data residency</Link> ·{" "}
          <Link href="/accessibility">Accessibility Statement</Link>
        </>
      }
      eyebrow="Legal"
      lastUpdated={LAST_UPDATED}
      sections={sections}
      status="draft-pending-review"
      summary="The rules for using MAIS — who may hold an account, what the AI tutor is and is not, and how content and liability are handled."
      title="Terms of Service"
    />
  );
}
