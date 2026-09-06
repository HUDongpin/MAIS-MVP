# Owner budget signature: formal 48-run gate

- Protocol: `MAIS-RSI-LITE-CAL-V1` `1.1.1-f2-r`
- Candidate-set SHA-256: ______________________________________________
- Current status: `UNSIGNED`
- F3 status while unsigned: `BLOCKED`

F2 used the deterministic no-charge adapter. It made zero provider calls, incurred zero API cost, and did not launch a browser. Therefore F2 validates accounting fields and local orchestration only; it does not supply a live-provider cost or latency estimate.

The owner fills this only after reviewing the exact A18/A11/A22/A25 receipt hashes. If A18 uses owner amendment `A18-HW-1`, the owner must also review and bind the exact waiver hash. Completing this form makes no run executable; a later separate explicit F3-start instruction is still required.

| Budget field | Per campaign cap | Forty-eight-run aggregate cap |
| --- | ---: | ---: |
| Input tokens | __________ | __________ |
| Output tokens | __________ | __________ |
| Provider calls | __________ | __________ |
| Tool calls | __________ | __________ |
| Active machine minutes | __________ | __________ |
| Wall-clock minutes | __________ | __________ |
| Browser minutes | `0` | `0` |
| Operational human minutes | __________ | __________ |
| Gold-review human minutes | N/A | __________ |
| API currency cost | __________ | __________ |

Approved provider/model pool and immutable versions:

________________________________________________________________________

C0/C parity contract, including role calls and tools:

________________________________________________________________________

Stop-on-budget-exceed behavior and alert owner:

________________________________________________________________________

Owner acknowledgements:

- [ ] Actual spend will be recorded; arms will not waste calls merely to consume the cap.
- [ ] Time-capped unclosed runs count as failures rather than receiving an automatic extension.
- [ ] This budget signature does not itself waive A18, A11, A22, or A25 gates; any A18 human-evidence waiver must be separately valid and hash-bound.
- [ ] This signature does not authorize production, live integration, commit, push, PR, or deployment.
- [ ] The exact formal-run start requires a separate explicit owner authorization after all gate receipts are reviewed.
- [ ] Browser minutes remain zero because protocol `1.1.1-f2-r` freezes a content-only estimand with no route surfaces.

Independent receipt references reviewed by owner:

- A18 receipt path and SHA-256: _________________________________________
- A18 human-evidence waiver path and SHA-256, or `N/A`: _________________
- A11 receipt path and SHA-256: _________________________________________
- A22 receipt path and SHA-256: _________________________________________
- A25 receipt path and SHA-256: _________________________________________

- Owner name: ______________________________
- Signature/approval record: ______________________________
- Date and timezone: ______________________________
- Maximum total currency amount: ______________________________
- Maximum provider calls: ______________________________
- Maximum total tokens: ______________________________
- Maximum wall-clock minutes: ______________________________
- Maximum operational and gold-review human minutes: ___________________

No blank or provisional signature counts as approval.
