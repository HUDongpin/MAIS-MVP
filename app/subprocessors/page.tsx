import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalDocument,
  LegalScrollableTable,
  type LegalDocumentSection
} from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Subprocessors | MAIS",
  description:
    "The third-party service providers that process MAIS personal data, what each one receives, and the country it is processed in."
};

const LAST_UPDATED = "2026-07-31";
const CONTACT_EMAIL = "hudongpin@126.com";

type Subprocessor = {
  name: string;
  purpose: string;
  data: string;
  residency: string;
  /** True when the provider processes data outside the learner's own jurisdiction today. */
  flagged?: boolean;
};

const subprocessors: readonly Subprocessor[] = [
  {
    name: "Alibaba Cloud DashScope (Qwen)",
    purpose: "AI tutor responses; speech recognition and synthesis",
    data: "Tutor prompts and learner questions; raw audio of the learner's voice; synthesised speech",
    residency: "Mainland China",
    flagged: true
  },
  {
    name: "DeepSeek",
    purpose: "AI tutor responses",
    data: "Tutor prompts and learner free-text questions",
    residency: "Mainland China",
    flagged: true
  },
  {
    name: "SimpleTex",
    purpose: "Handwriting recognition (primary provider)",
    data: "Photographs of learner handwriting and working",
    residency: "Mainland China",
    flagged: true
  },
  {
    name: "DeepInfra",
    purpose: "AI tutor responses; vision model inputs",
    data: "Tutor prompts; images submitted to the vision model",
    residency: "United States"
  },
  {
    name: "Mathpix",
    purpose: "Handwriting recognition (second opinion)",
    data: "Photographs of learner handwriting and working",
    residency: "United States"
  },
  {
    name: "Google OAuth",
    purpose: "Optional sign-in with a Google account",
    data: "Verified email address and basic profile (scopes: openid, email, profile)",
    residency: "United States"
  },
  {
    name: "Resend",
    purpose: "Transactional email delivery",
    data: "Recipient email address and password-reset message",
    residency: "United States"
  },
  {
    name: "Customer-configured xAPI learning-record store",
    purpose: "Sending learning records to a school's own system",
    data: "Learning statements under a pseudonymous identifier — no name or email",
    residency: "Controlled by the school"
  },
  {
    name: "Vercel",
    purpose: "Application hosting and web analytics",
    data: "Request metadata and aggregate page analytics",
    residency: "United States"
  }
];

const sections: readonly LegalDocumentSection[] = [
  {
    id: "current-subprocessors",
    heading: "Current subprocessors",
    body: (
      <>
        <p>
          These are the third parties that receive MAIS personal data. A provider only receives data
          when the corresponding feature is used and configured.
        </p>
        <LegalScrollableTable label="Current subprocessors and data residency">
          <table>
            <thead>
              <tr>
                <th scope="col">Provider</th>
                <th scope="col">Purpose</th>
                <th scope="col">Data received</th>
                <th scope="col">Processed in</th>
              </tr>
            </thead>
            <tbody>
              {subprocessors.map((entry) => (
                <tr key={entry.name}>
                  <th className="py-2 pr-4 text-left align-top font-semibold text-slate-950 dark:text-white" scope="row">
                    {entry.name}
                  </th>
                  <td>{entry.purpose}</td>
                  <td>{entry.data}</td>
                  <td>
                    {entry.residency}
                    {entry.flagged ? (
                      <span className="ml-1.5 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                        see note
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </LegalScrollableTable>
      </>
    )
  },
  {
    id: "cross-border",
    heading: "Cross-border processing — read this before deploying",
    body: (
      <>
        <p>
          MAIS does not currently route AI requests based on the learner&rsquo;s region. The AI
          provider is chosen by deployment configuration, not by where the learner is. Three of the
          providers above operate in Mainland China.
        </p>
        <p>
          In a deployment configured with those providers, a learner in the United States would have
          the following sent to Mainland China:
        </p>
        <ul>
          <li>the text of their tutor conversations;</li>
          <li>an audio recording of their voice, if they use the spoken-question feature; and</li>
          <li>photographs of their handwriting, if they submit written working.</li>
        </ul>
        <p>
          <strong>
            Region-based routing is in development. Until it ships, United States and Hong Kong
            deployments should be configured to use the United States providers only, and the
            spoken-question feature should be reviewed with the district before enabling it.
          </strong>
        </p>
        <p>
          We publish this rather than omit it because a district will discover it during a security
          review, and finding it late is worse for everyone.
        </p>
      </>
    )
  },
  {
    id: "changes",
    heading: "Changes to this list",
    body: (
      <>
        <p>
          We will update this page before a new subprocessor begins processing personal data.
          Schools and districts under a data-protection agreement will be notified in advance and
          may object, as their agreement provides.
        </p>
        <p>
          Questions about a specific provider, or a request for its security documentation:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </>
    )
  }
];

export default function SubprocessorsPage() {
  return (
    <LegalDocument
      contactNote={
        <>
          Related: <Link href="/privacy">Privacy Policy</Link> ·{" "}
          <Link href="/terms">Terms of Service</Link> ·{" "}
          <Link href="/accessibility">Accessibility Statement</Link>
        </>
      }
      eyebrow="Legal"
      lastUpdated={LAST_UPDATED}
      sections={sections}
      status="draft-pending-review"
      summary="Every third party that processes MAIS personal data, what it receives, and where in the world it processes it."
      title="Subprocessors and data residency"
    />
  );
}
