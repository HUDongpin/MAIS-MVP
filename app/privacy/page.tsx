import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalDocument,
  LegalScrollableTable,
  type LegalDocumentSection
} from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy | MAIS",
  description:
    "How MAIS collects, uses, shares, retains and deletes personal data — including children's data — across its Hong Kong, Mainland China and United States curriculum tracks."
};

const LAST_UPDATED = "2026-07-31";
const CONTACT_EMAIL = "hudongpin@126.com";

const sections: readonly LegalDocumentSection[] = [
  {
    id: "who-we-are",
    heading: "Who this policy covers",
    body: (
      <>
        <p>
          MAIS (Mathematics Adaptive Interactive System) is an interactive mathematics learning
          platform for learners in kindergarten through grade 12. It operates three curriculum
          regions — Hong Kong, Mainland China, and the United States (California, North Carolina,
          Arkansas and Florida tracks).
        </p>
        <p>
          This policy applies to four categories of person: <strong>learners</strong> (many of whom
          are children under 13), <strong>parents and guardians</strong>, <strong>teachers</strong>,
          and <strong>school or district administrators</strong>.
        </p>
        <p>
          Where MAIS is provided to a learner under an agreement with their school or district, the
          school directs how learner data is used, and MAIS acts on the school&rsquo;s behalf — a
          &ldquo;school official&rdquo; arrangement under FERPA. Where an individual signs up
          directly, MAIS is the controller of that account.
        </p>
      </>
    )
  },
  {
    id: "data-we-collect",
    heading: "What we collect",
    body: (
      <>
        <h3>Account and profile data</h3>
        <ul>
          <li>Username and email address, and a salted hash of the password (never the password itself).</li>
          <li>Role — learner, parent, teacher or administrator — and school affiliation.</li>
          <li>
            For learners: the name entered for the profile, grade level, curriculum region and
            textbook publisher, an optional profile picture, and the invite code that links a learner
            to a guardian account.
          </li>
        </ul>
        <p>
          Grade level is an age indicator accurate to roughly a year. Combined with a learner&rsquo;s
          name and school, it identifies a specific child, so we treat the whole learner profile as a
          student record rather than as analytics data.
        </p>

        <h3>Learning activity</h3>
        <ul>
          <li>Every question attempt, with the answer given and whether it was correct.</li>
          <li>Lesson and practice interaction events used to measure progress.</li>
          <li>Errors saved to the mistake book for later review.</li>
          <li>
            Estimated per-skill mastery inferred by our adaptive model. This is our system&rsquo;s{" "}
            <em>opinion</em> about a learner&rsquo;s ability, not something the learner told us, and
            learners and guardians can ask to see and correct it.
          </li>
          <li>Submitted work, class enrolment and roster records, and teacher messages.</li>
        </ul>

        <h3>AI tutor conversations</h3>
        <p>
          Conversations with the AI tutor are stored in full and linked to the learner&rsquo;s
          account. These are free-text messages written by children and are the most sensitive
          information the platform holds. An automated safety classifier reviews them so that
          disclosures indicating self-harm, abuse, or a crisis can be escalated to the responsible
          teacher or administrator.
        </p>

        <h3>Voice and handwriting</h3>
        <p>
          If a learner uses the spoken-question feature, an audio recording of their voice is
          processed to transcribe it. If a learner photographs handwritten working, that image is
          processed to recognise the mathematics in it. Section{" "}
          <a href="#who-we-share-with">5</a> names the companies that perform this processing and
          the countries they operate in.
        </p>
      </>
    )
  },
  {
    id: "why-we-use-it",
    heading: "Why we use it",
    body: (
      <>
        <ul>
          <li>To run the service — signing in, showing lessons, saving progress.</li>
          <li>
            To adapt teaching to the learner: selecting the next question, estimating mastery, and
            building a personalised path.
          </li>
          <li>To let teachers and guardians see progress for learners in their care.</li>
          <li>To keep learners safe, via the AI-tutor safety classifier described above.</li>
          <li>To secure accounts, prevent abuse, and fix faults.</li>
        </ul>
        <p>
          <strong>We do not sell personal data. We do not serve behavioural advertising, and we do
          not build advertising profiles.</strong> We do not use learner content to train
          general-purpose AI models of our own.
        </p>
      </>
    )
  },
  {
    id: "childrens-data",
    heading: "Children's data",
    body: (
      <>
        <p>
          Learners in kindergarten through grade 6 are under 13, and the platform is designed for
          them. Where MAIS is used under a school or district agreement, the school provides consent
          on behalf of parents for the educational use described here, as COPPA permits.
        </p>
        <p>
          A parent or guardian may at any time ask to review their child&rsquo;s personal data,
          refuse further collection, or direct us to delete it, by contacting us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will not condition a
          child&rsquo;s participation on disclosing more information than is reasonably necessary.
        </p>
        <p>
          <strong>Known limitation.</strong> Registration does not currently collect a date of birth
          or present a consent control; grade level is collected instead. A verifiable
          parental-consent flow for direct (non-school) sign-ups is being built. Until it ships,
          MAIS should be deployed for under-13 learners only under a school or district agreement.
        </p>
      </>
    )
  },
  {
    id: "who-we-share-with",
    heading: "Who we share it with",
    body: (
      <>
        <p>
          We share personal data with the service providers below, and with the learner&rsquo;s own
          school or district. We do not share it with anyone else except where the law requires it.
        </p>
        <p>
          The table on the <Link href="/subprocessors">subprocessors page</Link> lists each provider,
          exactly what data reaches it, and the country it is processed in — including the providers
          that operate in Mainland China.
        </p>
        <p>
          <strong>Cross-border processing.</strong> Some of our current AI providers are hosted in
          Mainland China. Depending on configuration, this can include a learner&rsquo;s voice
          recording and photographs of their handwriting. Region-based routing that keeps a
          learner&rsquo;s data in their own jurisdiction is in development and is not yet in place.
          Schools evaluating MAIS should read the subprocessors page in full before deploying it.
        </p>
      </>
    )
  },
  {
    id: "retention",
    heading: "How long we keep it",
    body: (
      <>
        <LegalScrollableTable label="Data retention periods">
          <table>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Retention</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Uploaded and captured media (handwriting photographs, audio)</td>
                <td>90 days by default, then automatically deleted</td>
              </tr>
              <tr>
                <td>AI tutor conversations</td>
                <td>Kept for the life of the account — no automatic expiry yet</td>
              </tr>
              <tr>
                <td>Learning activity, practice attempts, mistake book, mastery estimates</td>
                <td>Kept for the life of the account — no automatic expiry yet</td>
              </tr>
              <tr>
                <td>Account and profile records</td>
                <td>Kept for the life of the account — no automatic expiry yet</td>
              </tr>
            </tbody>
          </table>
        </LegalScrollableTable>
        <p>
          <strong>Known limitation, stated plainly:</strong> apart from media objects, MAIS does not
          yet enforce automatic retention limits. Scheduled deletion for tutor transcripts and
          learning activity is planned. We would rather say this than imply a limit we do not
          currently enforce.
        </p>
      </>
    )
  },
  {
    id: "security",
    heading: "How we protect it",
    body: (
      <>
        <ul>
          <li>Passwords are stored only as salted hashes.</li>
          <li>
            Uploaded media is encrypted at rest with AES-256-GCM and is rejected unless it has both
            been encrypted and passed a content scan.
          </li>
          <li>
            Learning records sent to a school&rsquo;s external learning-record store use a
            pseudonymous identifier rather than a name or email address.
          </li>
          <li>Access to production data is limited to the operators who need it.</li>
        </ul>
        <p>
          One legacy exception: some older learner profile pictures may still be stored directly in
          the database rather than in the encrypted media store. We are confirming whether any such
          records remain and migrating any that do.
        </p>
      </>
    )
  },
  {
    id: "your-rights",
    heading: "Your rights and how to exercise them",
    body: (
      <>
        <p>
          Depending on where you live, you may have the right to access, correct, delete, export, or
          restrict the use of personal data, and to withdraw consent. These rights arise under COPPA
          and FERPA and state laws including SOPIPA and the CPRA in the United States, the PIPL in
          Mainland China, and the PDPO in Hong Kong.
        </p>
        <p>
          To exercise any of them, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with
          the account username and what you are asking for. If the learner is enrolled through a
          school, we will generally act on the school&rsquo;s instruction and will refer your request
          to them.
        </p>
        <p>
          <strong>Deletion is self-service and immediate.</strong> An account holder can delete their
          own account, a parent or guardian can delete the account of a child they are linked to, and
          a school administrator can delete the account of a learner at their school. Deletion runs
          straight away rather than being queued for an operator, and it cannot be undone — there is
          no recovery window and no way for us to restore the account afterwards.
        </p>
        <p>
          Deleting an account permanently destroys the login and password, the learner profile,
          every practice attempt, lesson progress and mastery estimate, all AI tutor conversations,
          uploaded photographs of work, reward and game progress, and messages about the learner.
          Records that belong to other people are kept but stripped of any link to the deleted
          account: a class keeps its lessons and the other learners&rsquo; work, and a safeguarding
          or AI-safety record is kept as evidence that we met our obligations, with the learner&rsquo;s
          name, identifier, and any quoted words removed.
        </p>
        <p>
          Two limits are worth stating plainly. Encrypted database backups continue to hold the data
          until they age out of their retention window, so deletion is not instantaneous in backups.
          And where a school has connected its own external learning-record system, we cannot delete
          data from that system on the school&rsquo;s behalf — the school must action that separately.
        </p>
        <p>
          Requests other than deletion — access, correction, export, or restriction — are still
          carried out manually by an operator, and we aim to complete them within 30 days.
        </p>
      </>
    )
  },
  {
    id: "changes-and-contact",
    heading: "Changes and contact",
    body: (
      <>
        <p>
          We will update this policy as the platform changes, and will revise the &ldquo;last
          updated&rdquo; date above. Material changes affecting learners will be communicated to the
          schools and guardians concerned.
        </p>
        <p>
          Privacy questions, requests, and complaints:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
        <p>
          A named privacy officer and a postal address for formal notices have not yet been
          designated. Both are required before a district data-protection agreement can be signed and
          are being arranged.
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
          Related: <Link href="/subprocessors">Subprocessors and data residency</Link> ·{" "}
          <Link href="/terms">Terms of Service</Link> ·{" "}
          <Link href="/accessibility">Accessibility Statement</Link>
        </>
      }
      eyebrow="Legal"
      lastUpdated={LAST_UPDATED}
      sections={sections}
      status="draft-pending-review"
      summary="MAIS is used by children. This policy explains what we collect, why, who we send it to, how long we keep it, and what we have not built yet."
      title="Privacy Policy"
    />
  );
}
