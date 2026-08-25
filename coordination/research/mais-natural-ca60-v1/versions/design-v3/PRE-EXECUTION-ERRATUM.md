# MAIS Natural CA60 V3 pre-execution erratum

Date: 2026-08-25

Status: `DESIGN_REGISTERED / EXECUTION_REGISTRATION_NOT_FROZEN`

This append-only erratum supersedes, but does not rewrite, the V2 design registration whose SHA-256 root is `a1b7d7ac6cf23b059dddc015c75b876d26a3576f9e5e3e07724ef8c5b8429de8`. V2 remains preserved as `SUPERSEDED_NOT_EXECUTED`.

Provider event count: `0`. No California item was sent to Qwen or DeepSeek, no reference labels were produced, no execution registration was frozen, and no natural-item result exists. This design artifact does not authorize provider execution.

Pre-execution adversarial review found that V2 did not yet fail closed across every raw leaf needed for reference sealing, provider-attempt verification, final metric recomputation, runtime-source completeness, and independent review. V3 replaces those contracts before any frame freeze or provider request. It also restores `FALSE_ACCEPT_CORRECT_RESPONSE` exactly as the user-registered, metric-eligible P0 literal; that V3 rule supersedes V2's conservative ambiguous-literal treatment before any label existed.

V3 still freezes the CA60 structural precision limitation. Even a complete, error-free run cannot simultaneously satisfy the registered sensitivity and specificity confidence-bound gates with 60 independent clusters. The normal successful execution ceiling remains `INCONCLUSIVE_MACHINE_REFERENCE`; this package neither establishes general machine-QA validity nor authorizes deployment, promotion, live-content mutation, or cross-region comparison.
