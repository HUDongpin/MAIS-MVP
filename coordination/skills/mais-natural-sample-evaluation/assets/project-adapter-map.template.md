# TEMPLATE_ONLY_NOT_AUTHORIZATION

Output language / 输出语言: follow the user's language; keep machine enums and JSON field names in English.

This scaffold maps the version-agnostic skill to exact registered repository artifacts. It grants no provider, credential, egress, spend, custody, publication, or Git authority.

## Repository Bindings

| Role | Repo-relative registered location | SHA-256 or commit | Verified receipt hash |
|---|---|---|---|
| Active protocol pointer | redacted repo-relative reference | lowercase hash required | lowercase hash required |
| Protocol registration | redacted repo-relative reference | lowercase hash required | lowercase hash required |
| Registered design profile and power artifact | redacted logical reference only | profile ID and lowercase artifact hash required | protocol-registration receipt required |
| Frame/sample freeze | redacted repo-relative reference | lowercase hash required | lowercase hash required |
| Prompt manifest | redacted repo-relative reference | lowercase hash required | registration/currentness receipt required |
| Evidence schema | redacted repo-relative reference | lowercase hash required | registration/currentness receipt required |
| Taxonomy | redacted repo-relative reference | lowercase hash required | registration/currentness receipt required |
| Runner registration | redacted repo-relative reference | lowercase hash required | lowercase hash required |
| Exact registered runner CLI | redacted repo-relative reference | lowercase hash required | review receipt hash required |
| Runner source closure and commit | redacted repo-relative reference | lowercase hash and commit required | closeout/review receipt required |
| Scorer | redacted repo-relative reference | lowercase hash required | registration/currentness receipt required |
| Independent verifier | redacted repo-relative reference | lowercase hash required | review receipt hash required |
| Protected custody locator | do not include exact path | protected-root reference hash only | custody receipt hash required |

## Role Mapping

- Reference provider role: redacted logical role
- Evaluated provider role: redacted logical role
- Freeze owner lane: redacted lane
- Runner owner lane: redacted lane
- Independent review lane: redacted lane
- Claim review lane: redacted lane

## Material Currentness

- Registered protocol/sample/prompt/schema/taxonomy/runner/scorer binding digest: lowercase hash
- Current protocol/sample/prompt/schema/taxonomy/runner/scorer binding digest: lowercase hash
- Exact equality verified by currentness receipt: yes/no
- First provider activity: `NONE` or hash/timestamp/phase only
- Evaluated canary/full-run reconciliations: distinct hashes with full-run activity strictly after the canary receipt
- Invalidated registration receipts: hashes only

## Fixed Prohibitions

- Provider execution authorized: **false**
- Credential access authorized: **false**
- Protected content included: **false**
- Raw provider response included: **false**
- Template authorizes repository runner invocation: **false**

Complete bindings through separately signed/hash-bound receipts. Do not put credentials, account/project identifiers, item IDs, raw paths, or natural content in this file.
