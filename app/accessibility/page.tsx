import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, type LegalDocumentSection } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Accessibility Statement | MAIS",
  description:
    "MAIS's accessibility commitment, its current WCAG 2.1 Level AA conformance status, known barriers, and how to report an accessibility problem."
};

const LAST_UPDATED = "2026-07-31";
const CONTACT_EMAIL = "hudongpin@126.com";

const sections: readonly LegalDocumentSection[] = [
  {
    id: "commitment",
    heading: "Our commitment",
    body: (
      <>
        <p>
          MAIS is used by children, including children with disabilities, in classrooms where using
          it is not optional. We consider accessibility a requirement of the product rather than a
          feature of it.
        </p>
        <p>
          We are working towards conformance with the{" "}
          <a
            href="https://www.w3.org/TR/WCAG21/"
            rel="noreferrer noopener"
            target="_blank"
          >
            Web Content Accessibility Guidelines (WCAG) 2.1
          </a>{" "}
          at Level AA, the standard referenced by Section 508 in the United States.
        </p>
      </>
    )
  },
  {
    id: "status",
    heading: "Current conformance status",
    body: (
      <>
        <p>
          <strong>MAIS is partially conformant with WCAG 2.1 Level AA.</strong> &ldquo;Partially
          conformant&rdquo; means parts of the platform do not yet fully meet the standard.
        </p>
        <p>
          We are not claiming full conformance, and we have not commissioned an independent
          third-party audit. Claiming more than we have tested would mislead the schools that rely
          on this page during procurement.
        </p>
        <p>What we have actually done, as of the date above:</p>
        <ul>
          <li>
            Automated WCAG 2.1 A and AA testing of the public routes — home, sign-in, registration,
            and these legal pages — runs in our test suite and must pass before changes ship.
          </li>
          <li>
            The interface language declared to assistive technology now follows the learner&rsquo;s
            chosen language rather than defaulting to English.
          </li>
        </ul>
        <p>What we have not yet done:</p>
        <ul>
          <li>
            Automated or manual testing of the signed-in learner, teacher, parent and administrator
            areas, which is where most of the platform&rsquo;s functionality lives.
          </li>
          <li>Manual screen-reader testing with NVDA, JAWS or VoiceOver.</li>
          <li>Keyboard-only walkthroughs of the interactive lessons, practice games and visualisations.</li>
          <li>An independent third-party accessibility audit.</li>
        </ul>
        <p>
          The full self-assessment, including which WCAG success criteria have been evaluated and
          which have not, is published in our accessibility conformance report in the repository at{" "}
          <code>docs/compliance/accessibility-conformance.md</code>.
        </p>
      </>
    )
  },
  {
    id: "known-barriers",
    heading: "Known barriers",
    body: (
      <>
        <p>We know about the following problems and are working on them.</p>
        <ul>
          <li>
            <strong>Interactive visualisations and practice games.</strong> Many of the mathematical
            visualisations and the game-based practice activities are built on canvas and drag
            interactions with no keyboard-operable equivalent and no text alternative. A learner who
            cannot use a mouse or touch cannot complete them. This is the most serious barrier in the
            platform.
          </li>
          <li>
            <strong>Signed-in areas are untested.</strong> The dashboard, lesson player, teacher
            console and parent console have not been audited. We do not currently know what barriers
            they contain.
          </li>
          <li>
            <strong>Mathematical notation.</strong> Formulas are rendered visually. Screen-reader
            announcement of mathematics has not been verified.
          </li>
          <li>
            <strong>Bilingual content.</strong> Where English and Chinese appear on the same screen,
            individual passages are not always marked with their own language, so a screen reader may
            read one of them with the wrong pronunciation rules.
          </li>
          <li>
            <strong>No-JavaScript use.</strong> The language of the page is corrected by JavaScript
            shortly after loading. With JavaScript disabled, the declared language may not match the
            content.
          </li>
        </ul>
      </>
    )
  },
  {
    id: "accommodations",
    heading: "Accessibility features already in the product",
    body: (
      <>
        <p>
          Teachers can set a per-learner accommodations profile that the learning experience honours,
          covering extended time, read-aloud support, a reduced number of answer choices, and
          calculator availability. These are intended to support IEP and Section 504 plans.
        </p>
        <p>
          The interface also offers a light and dark theme and a language toggle between English and
          Chinese.
        </p>
      </>
    )
  },
  {
    id: "feedback",
    heading: "Tell us about a problem",
    body: (
      <>
        <p>
          If you hit an accessibility barrier in MAIS, please tell us — this is the fastest way for
          us to find and fix real problems.
        </p>
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the page you were on,
          what you were trying to do, and the assistive technology and browser you were using if you
          know them.
        </p>
        <p>
          We aim to acknowledge accessibility reports within 5 working days. If a barrier prevents a
          learner from completing assigned work, tell us that in the message and we will prioritise
          it and work with the school on an interim alternative.
        </p>
        <p>
          A formal escalation contact and complaints procedure have not yet been designated; both are
          being arranged.
        </p>
      </>
    )
  }
];

export default function AccessibilityStatementPage() {
  return (
    <LegalDocument
      contactNote={
        <>
          Related: <Link href="/privacy">Privacy Policy</Link> ·{" "}
          <Link href="/terms">Terms of Service</Link> ·{" "}
          <Link href="/subprocessors">Subprocessors and data residency</Link>
        </>
      }
      eyebrow="Accessibility"
      lastUpdated={LAST_UPDATED}
      sections={sections}
      status="published"
      summary="Where MAIS stands against WCAG 2.1 Level AA, what we have tested, the barriers we know about, and how to report one."
      title="Accessibility Statement"
    />
  );
}
