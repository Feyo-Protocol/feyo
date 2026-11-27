# Feyo — project continuity and engineering handoff

**Snapshot:** 2026-11-27. **Repository:** https://github.com/Feyo-Protocol/feyo. **Website:** https://feyo-silk.vercel.app/. **Public app:** https://feyo-silk.vercel.app/app. **Public docs:** https://feyo-silk.vercel.app/docs. **Rules:** `/AGENTS.md`, `/SECURITY.md` and `/CONTRIBUTING.md`.

> **IMPORTANT: State is date-scoped.** Protected `main` is `222063731754bb8a1ca02fa5a22cc4f8676d7f85`. PRs [#30](https://github.com/Feyo-Protocol/feyo/pull/30), [#31](https://github.com/Feyo-Protocol/feyo/pull/31) and [#32](https://github.com/Feyo-Protocol/feyo/pull/32) are merged; [Issue #28](https://github.com/Feyo-Protocol/feyo/issues/28) is closed; merged-main CI passed. The local Issue #25 implementation is being prepared on `feat/issue-25-recipient-readiness`, based on this `main` SHA; it has not yet been validated by repository CI, pushed, reviewed, merged or deployed. Confirm GitHub and the worktree before treating this snapshot as current.

## Permanent project document map

This document is a **date-scoped handoff**, not the entire roadmap. Future agents should consult:

- `AGENTS.md` — required engineering, security and safe-merge rules.
- `docs/PRODUCT_ROADMAP.md` — multi-phase product strategy, dependencies and exit evidence.
- `docs/MAINTAINER_PLAYBOOK.md` — maintainer duties and conditional recurring Drips Wave workflow.
- `docs/ARCHITECTURE_DECISIONS.md` — decisions and why they were made; append new ADRs for major changes.
- `docs/WAVE_LOG.md` — factual application, eligibility, cycle and appeal notes.
- `src/app/docs/roadmap/page.mdx` — truthful public product roadmap.

At each milestone, update this handoff with actual evidence and the precise next action. A local pass, green PR check, merge, preview, production deployment and production observation are distinct states.

## 1. Why Feyo exists

Feyo is a maintained, independent, non-custodial Stellar payment product for humans, applications and eventually permission-limited AI agents. Its first usable workspace is Testnet-only. It must clearly separate preparing a payment, wallet authorization, network submission and independently verified settlement. It is not a hackathon demo, Drips-specific project or marketing mockup.

**Do not change the product name, replatform the app, add gratuitous features or assert completed payment capabilities without scope agreement.** Build a technically correct, accessible product while maintaining the established design language.

## 2. Implementation status

| Feature | Verified status | Still not implemented |
| --- | --- | --- |
| Marketing site, responsive workspace, MDX docs/search | Deployed | — |
| Varial/Freighter public wallet connection and Testnet gating | Deployed, public-address access only | Wallet transaction authorization |
| Horizon XLM/issued-asset balance reads | Deployed | — |
| Recipient account and issued-asset readiness | Local implementation on `feat/issue-25-recipient-readiness`; not yet pushed or reviewed | CI, merge and deployment pending |
| Exact-decimal local draft validation and honest status component | Deployed | Persistent payment intents/history |
| Independently query Horizon transaction + operations and check exact payment match | Merged in PR #30 and deployed | Submitted-payment source |
| User-facing exact-hash lookup with bounded requests and accessible outcomes | Merged in PR #31, deployed and manually production-verified | Payment construction or execution |
| Node runtime and reproducible Playwright version alignment | Merged in PR #30; merged-main CI passed | — |
| Session-only multiple draft history | Not implemented | Issue #24 |
| Recipient/trustline readiness | Not implemented | Issue #25 |
| Unsigned classic payment preview | Not implemented | Issue #26 |
| Explicit user-reviewed wallet signing | Not implemented | Issue #27 |
| Bounded, idempotent Testnet submission | Not implemented | Separate reviewed milestone, not part of #27 |
| Receipts backed by verified network evidence | Not implemented | Issue #29 |
| Mainnet settlement, custody, off-ramp, public API/MCP execution | Not implemented | Future security/regulatory design |

The deployed app can inspect balances, create local drafts and independently check a known Testnet transaction. It cannot construct, sign, broadcast or settle a payment.

## 3. Delivered read-only verification milestone (verified 2026-11-22)

- [PR #30](https://github.com/Feyo-Protocol/feyo/pull/30) merged the read-only Testnet Horizon verifier, exact operation matching, trusted `PaymentStatus` evidence adapter, Node 22.23.3 alignment and reproducible Playwright CI. Its protected-main merge SHA is `be02fa449078a7cf66ed1cafbc0c105fb8272872`.
- [PR #31](https://github.com/Feyo-Protocol/feyo/pull/31), **“feat(stellar): add safe Testnet payment verification UI,”** merged the user-facing workflow. Its protected-main merge SHA is `4670b5511140b8397bd6858ef06362652c6e91b7`.
- [Issue #28](https://github.com/Feyo-Protocol/feyo/issues/28) is closed as completed. The implementation is no longer local, pending review or awaiting deployment.
- GitHub CI on merged `main` passed. The production workflow at https://feyo-silk.vercel.app/app was manually checked successfully on 2026-11-22.
- Runtime remains Node >=22.13; `.nvmrc` and CI use Node 22.23.3. Playwright remains pinned to 1.56.1 on the supported Ubuntu 24.04 CI runner.

### Deployed behavior and trust boundaries

- `/app` accepts a Testnet transaction hash plus expected source, destination, exact decimal amount, native/issued asset identity and issuer where required.
- Shared preflight validates the request and converts the amount to exact stroops before Horizon. Invalid input makes no Horizon request.
- Each lookup has a strict 10-second deadline and explicit cancellation. Input edits, component unmount, replacement lookups, wallet account changes, disconnects and network/passphrase changes invalidate stale responses.
- The UI distinguishes `verified`, `failed`, `mismatched`, `not_found`, `malformed`, `invalid_request` and `unavailable`. Only same-process opaque verifier evidence can render `Verified`.
- Verified, failed and mismatched outcomes display independently retrieved transaction evidence and a validated Stellar Expert Testnet link. Inputs are session-only and are not logged or persisted by the workflow.
- Verification requires the canonical Testnet Horizon URL and passphrase, successful transaction evidence, a positive ledger, and an exact matching payment operation for source, destination, asset type/code/issuer and integer amount. Incomplete or contradictory evidence fails closed; Horizon 404 means pending/absent, not confirmed failure.
- The injected client remains a trusted-code test seam, not an untrusted public parameter. Serialized verification-shaped data is not portable evidence and must be freshly verified.

### Production verification evidence — 2026-11-22

The manual production checks used unrelated public Stellar Testnet ledger evidence:

- **Transaction hash:** `ec29030e87bb7707b7a60de39bba8af2252e54c20ae4316a61ee5b4b176ad81c`
- **Source:** `GCVKD2NSWNYOK6BS3PUMELUW6IRQBYJVW66UFTZWOKLYNBPR4FTQMIHR`
- **Destination:** `GCVVDPD4M4YOAXEKXJ6YQLPFO43F5MEMSG3J7FOVRBWSMYT7KT7QDHOS`
- **Asset/amount:** native XLM, exactly `1.87`

Observed production results:

1. Exact expected details returned **VERIFIED** and displayed transaction evidence, ledger, operation, source, destination, `1.87 XLM` and a Stellar Expert Testnet link.
2. Changing the amount to `1.88` returned **PAYMENT MISMATCH** and identified the amount mismatch.
3. Entering an invalid/short transaction hash returned **INVALID REQUEST**, stated that the hash must contain exactly 64 hexadecimal characters, and made no Horizon request.

This transaction was public third-party Testnet evidence. Feyo did **not** create, fund, sign or broadcast it. These checks prove deployed read-only matching behavior, not payment execution, ownership of the transaction, off-chain delivery, fiat payout or Mainnet settlement.

### Validation provenance

- Before merge, the Issue #28 implementation passed lint, documentation link/search checks, 97/97 non-skipped unit/component tests (98 total; opt-in live test skipped by default), Next type generation, TypeScript and a 17/17-page production build. The 36-scenario browser/accessibility suite passed provisionally with the local system Chrome; the unsupported local Ubuntu 26.04 host could not install the pinned Playwright Chromium revision.
- The earlier opt-in live Horizon check passed against the same unrelated public Testnet transaction. It made no funded Feyo transfer.
- The supported GitHub Ubuntu 24.04 runner supplied the authoritative pinned-browser evidence; GitHub CI on merged `main` passed.
- Production browser behavior was then manually verified with the three cases recorded above.
- This documentation synchronization was validated on `docs/sync-pr31-production-state` with Node 22.23.3: lint passed; docs links passed for 10 pages and 18 internal links; the regenerated docs search index matched; `npm test` passed 97 tests with one opt-in live test skipped; Next route type generation passed; `tsc --noEmit` passed; and the production build generated 17/17 static pages. No new live Horizon call, wallet action or funded transaction was needed for this documentation-only task.
- `npm audit` previously reported nine moderate full-tree/development entries and one moderate production Next.js advisory with no compatible fix offered at that time. Review dependency upgrades separately; do not fold them into this documentation synchronization.

### Current Issue #25 implementation — local branch, not yet reviewed

- Branch: `feat/issue-25-recipient-readiness`; base: protected `main` `222063731754bb8a1ca02fa5a22cc4f8676d7f85`.
- Adds `src/lib/stellar/recipient-readiness.ts` and `src/components/payment/RecipientReadiness.tsx`; inserts a non-blocking preflight into the existing `/app` draft form.
- Uses the canonical Testnet Horizon `/accounts/{address}` endpoint. Invalid public addresses and invalid asset identities are rejected before any request. Issued-asset trustlines match exact code **and** issuer.
- Reports funded/unfunded destinations, visible matching/missing trustlines, authorization flags, reported balance/limit, Horizon errors, malformed/unknown and cancellation outcomes. A same-code/different-issuer trustline is never a match.
- Includes a strict 10-second deadline for the full fetch and response-body read; timeout/cancellation aborts the request and stale destination changes or wallet/network context changes suppress old UI results.
- Readiness is observational only. It does not establish that a future payment will succeed, and it does not create/fund accounts or trustlines, construct/sign/broadcast transactions, or enable Mainnet.
- Test additions cover native and issued assets, exact issuer matching, authorization/limit states, malformed responses, Horizon failures, timeout despite ignored abort, caller cancellation, invalid-address no-request behavior and browser stale-destination handling.
- **Validation status:** prepared patch only at this snapshot. The new tests have not yet been run in the user's checkout. Run the full repository checklist and supported-browser suite before pushing. Do not call Issue #25 complete until CI/review/merge/deployment evidence exists.

## 4. Payment architecture and safety constraints

Target flow (not all implemented):

`validated intent → recipient/trustline readiness → fresh sequence/fee/time bound → unsigned XDR review → user-controlled wallet approval → signed envelope → persisted attempt/hash → controlled Testnet submission → exact-hash network lookup → matching payment operation → evidence-backed status/receipt`.

- Never request or hold secret seeds/recovery phrases. Enforce the explicit Testnet passphrase.
- Use precise decimal strings/stroops and preserve issuer, source, destination and memo/muxed-account semantics where appropriate.
- Signature != submission != verified settlement. A transaction hash alone is not enough when the operation does not exactly match the intended payment.
- Persist intent fingerprint, unique attempt, signed-envelope identity, sequence and hash **before** any future broadcast; query the original hash before retries and avoid sequence changes after ambiguous outcomes.
- Public addresses and hashes are linkable privacy data. Do not add sensitive logging or fabricate receipts. Never enable production/Mainnet money movement under a read-only issue.

## 5. Issue backlog and dependencies

1. [#22](https://github.com/Feyo-Protocol/feyo/issues/22): Node runtime. **Completed in PR #30.**
2. [#23](https://github.com/Feyo-Protocol/feyo/issues/23): Deterministic browser CI. **Completed in PR #30.**
3. [#28](https://github.com/Feyo-Protocol/feyo/issues/28): Read-only payment verification. **Completed across PRs #30 and #31; deployed and production-verified.**
4. [#24](https://github.com/Feyo-Protocol/feyo/issues/24): Session-only draft history; avoid confusing drafts with paid-transaction history.
5. [#25](https://github.com/Feyo-Protocol/feyo/issues/25): read-only recipient/trustline readiness; implementation is on local branch `feat/issue-25-recipient-readiness` and still needs full local validation, push, PR CI, review, merge and deployment.
6. [#26](https://github.com/Feyo-Protocol/feyo/issues/26): Bounded unsigned classic XLM Testnet payment preview with safe sequence/fee/timeout handling and human-visible XDR decoding.
7. [#27](https://github.com/Feyo-Protocol/feyo/issues/27): Explicit wallet signing authorization for a reviewed Testnet envelope, **without submission**; depends on #26.
8. **Separate issue needed before execution:** controlled Testnet submission with durable attempt storage, idempotency and ambiguous-outcome recovery. Do not quietly add broadcasting in #27 or #28.
9. [#29](https://github.com/Feyo-Protocol/feyo/issues/29): Privacy-aware receipts, only after trusted verification and tests; no offline proof of a real on-chain payment.

Do not duplicate #28 or treat the deployed verifier as proof that construction, signing, submission or receipts exist.

## 6. Collaboration and quality gates

- Protected `main` is maintained through small, reviewed PRs. Preserve contributors' fork branches and authorship. Issue assignment and contribution workflows are in `CONTRIBUTING.md`.
- CI requires Node installation, lint, docs links/search, unit tests, typecheck, Next build and pinned-browser navigation/accessibility checks. Run commands from `AGENTS.md`.
- Record test provenance precisely: **fixture**, **manual real wallet**, **live Horizon**, **funded Testnet transfer** or **deployed production**. Do not interchange them.
- No force pushes, destructive resets, fabricated review evidence or undocumented new dependencies. Scope breaking changes and security risk separately.

## 7. Drips Stellar Wave context — not a product requirement

- Feyo's Stellar Wave maintainer application was rejected. The notice was reportedly received around **2026-11-13**, but the exact Drips dashboard timestamp remains the source of truth.
- The estimated first appeal date is **2026-11-27** if the reported timestamp is correct. Confirm the official 14-day cooldown in the dashboard before submitting; this estimate does not establish eligibility.
- PRs #30 and #31 are substantive merged improvements since the reported rejection, and the production evidence above can support an appeal. They do not guarantee acceptance, Wave eligibility, rewards or permission to apply Program labels.
- Submit only through the official in-app appeal form when eligible. Do not invent usage, funded-payment evidence or ecosystem claims.
- Appeal link (use only when eligible): https://www.drips.network/wave/appeal/fdc01c95-806f-4b6a-998b-a6ed37e0d81b/20fd93c3-c249-425a-8a33-91b362848708
- Keep Drips/reward motivation out of public product marketing. Feyo's roadmap remains independent of the program.

## 8. Exact next actions for the next agent

1. Complete local validation for the Issue #25 implementation on `feat/issue-25-recipient-readiness`; distinguish isolated patch checks from the full repository test suite.
2. Review the full diff and security boundaries, then push the branch and open a focused PR closing #25 only if the supported local/CI checks pass.
3. Require GitHub Ubuntu 24.04 browser CI and maintainer review before merging. Do not merge, deploy or close #25 based only on local tests.
4. After merge, deploy and manually confirm native-XLM funded/unfunded and issued-asset exact-code/issuer readiness states using public Testnet data. Update README status, public MDX roadmap, handoff, and release evidence to reflect the actual merge/deployment state.
5. Keep the Drips appeal process separate. Confirm the dashboard eligibility date and form state; do not claim approval or Wave eligibility before Drips decides.

### Template for updating this handoff after any PR

`YYYY-MM-DD — PR #N — branch/SHA — state (local/pushed/merged/deployed) — exact functionality — tests (fixture vs live) — security/known limitations — next issue/step.`

### Milestone history

- `2026-11-21 — PR #30 merged at be02fa4 — protected main — Node/Playwright alignment, read-only Testnet verifier and trusted status contract merged; no construction, signing, broadcast or Feyo-funded live transaction.`
- `2026-11-21 — PR #31 merged at 4670b55 — protected main — user-facing bounded Testnet verification UI merged, Issue #28 closed and merged-main GitHub CI passed; no payment execution.`
- `2026-11-22 — production /app — exact third-party public Testnet evidence verified; 1.88 mismatch and invalid short-hash preflight also behaved correctly; no Feyo-created/funded/signed/broadcast transaction — next: synchronize documentation and prepare appeal evidence.`
- `2026-11-22 — docs/sync-pr31-production-state based on 4670b55 — local documentation-only synchronization; roadmap, README, architecture status, Wave log, handoff and generated docs search index updated; required local checks passed on Node 22.23.3 — no feature, signing, broadcast, custody or Mainnet change — next: review/open the focused docs PR, then prepare Drips appeal evidence.`
- `2026-11-27 — Issue #25 local implementation — branch `feat/issue-25-recipient-readiness` based on `2220637` — read-only Testnet recipient account and exact issued-asset trustline preflight added with authorization/limit observations and strict timeout/stale-request guards — tests and CI pending local execution; no push, PR, merge or deployment yet — next: run the full checklist, fix any failures, then open a focused PR.`
