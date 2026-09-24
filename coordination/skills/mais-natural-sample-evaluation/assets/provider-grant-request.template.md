# TEMPLATE_ONLY_NOT_AUTHORIZATION

Output language / 输出语言: follow the user's language; keep machine enums and JSON field names in English.

This is a request scaffold, not a provider grant. A completed request does not authorize credential access, network calls, natural-text egress, spend, or execution.

## Requested ProviderGrantBindingV1

- Provider role: `REFERENCE_PROVIDER` or `EVALUATED_PROVIDER`
- Provider adapter ID: redacted positive-grammar logical ID
- Model ID: redacted positive-grammar logical ID
- Phase: `REFERENCE_LABELING` or `EVALUATED_RUN`
- Evaluated usage boundary: one `EVALUATED_RUN` grant covers separately receipted `EVALUATED_CANARY` and full-run activity; it does not merge their reconciliation evidence
- Protocol registration SHA-256: lowercase hash required
- Sample manifest SHA-256: lowercase hash required
- Runner registration SHA-256: lowercase hash required
- Runner source-closure SHA-256: lowercase hash required
- Runner commit: lowercase 40-character commit required
- Route-anchor SHA-256: lowercase hash required

## Requested Scope

- Credential-scope SHA-256: hash of the bounded redacted scope artifact, never credential bytes
- Privacy/rights-scope SHA-256: hash of the bounded rights artifact
- Save policy: `SAVE_NOTHING` or `SAVE_REDACTED_HASHES_ONLY`
- Redaction policy: `REDACT_PROTECTED_CONTENT_AND_RAW_RESPONSES`
- Attempt cap: positive integer required
- Token cap: positive integer required
- USD cap: positive number required
- Concurrency cap: positive integer required

## Time and Signature

- Issued at: canonical `YYYY-MM-DDTHH:mm:ss.sssZ`
- Expires at: canonical `YYYY-MM-DDTHH:mm:ss.sssZ`
- Grant receipt SHA-256: absent until separately granted
- Signature-anchor SHA-256: absent until separately granted
- Validator-derived freshness: not a request field and **never self-reported**

## Preflight Boundary

For a preflight request, do not construct an execution grant. Natural-text egress, credential access, and provider spend remain unauthorized. A later execution grant must appear identically in provider state, source-rights state, and the active authorization graph node before repository-runner eligibility can be considered.

Never include a credential value, authorization prose, account/project identifier, billing/payment detail, protected question, item identifier, exact protected path, or provider body.
