# Feyo — architecture decisions and guardrails

Keep this as a small **append-only decision log**. Significant changes to product architecture, trust boundaries, dependencies, data storage, APIs or payment execution need a dated entry recording context, options, decision, consequences, tests and related PR. Decisions do not imply implementations are merged.

## ADR-001 — Non-custodial, explicit user authorization (2026-11-21; standing policy)

**Decision:** Feyo will not request, store or transmit user recovery phrases, signing seeds or private keys. When implemented, transaction signing must be an explicit action in the user's wallet after reviewing destination, exact amount, asset issuer, fee, network and expiration.

**Consequence:** signing never implies submission or settlement; do not add hidden auto-execution. Agent tooling requires a separately reviewed policy and approval boundary.

## ADR-002 — Testnet-only staged rollout (2026-11-21; standing policy)

**Decision:** keep the current Feyo application limited to the canonical Stellar Testnet passphrase. Testnet verification, Classic transaction preview, wallet authorization and future submission are separate milestones; Mainnet and regulated off-ramps require independent threat modeling, review and evidence.

**Consequence:** fail closed on account/network changes, and clearly mark all test assets as valueless.

## ADR-003 — Settlement requires independent exact-match evidence (2026-11-21; accepted in PR #30)

**Context:** a draft, client flag, signature or submission response can be misleading. **Decision:** only a verified successful network transaction and complete matching payment operation (hash, source, recipient, exact integer amount, asset type/code/issuer, network and valid ledger) may appear settled. A Horizon 404 is pending/absent, not definite failure. Check stale-request behavior and refuse copied/serialized verifier flags.

**Scope:** PR #30 added the read-only Testnet verifier and status adapter. The later Issue #28 UI milestone consumes that contract but adds no funded transfer, transaction construction, signing or broadcast. Reverify exact branch, merge and deployment status before making product claims.

## ADR-004 — Persist and reconcile attempts *before* future broadcast (2026-11-21; architecture requirement, not implemented)

**Decision:** future submission needs durable attempt/intent fingerprint, idempotency scope, signed-envelope identity and tx hash saved before network submission. On ambiguous outcomes, check original hash and retry only the identical signed envelope when safe. Never blindly rebuild a new transaction/sequence before resolution.

**Risk:** duplicate payments and falsely reported outcomes. This needs separate design, tests and review before any broadcast UI is enabled.

## ADR-005 — Evidence-driven open-source changes (2026-11-21; standing policy)

**Decision:** issue scope, docs and roadmap follow verified product needs, tests and ecosystem feedback. External programs may help attract contributors but must not dictate architecture, create artificial work, or pressure unsafe merges. Preserve meaningful commit attribution and protected-branch checks.

## ADR-006 — Browser verification requests are bounded and context-scoped (2026-11-21; accepted in PR #31)

**Decision:** the read-only `/app` verification interface validates expected hash, source, destination, exact decimal amount, asset code and issuer before Horizon. It calls the existing verifier through a strict 10-second deadline around the complete verification operation. The deadline returns even if an injected client or response body ignores `AbortSignal`, while still aborting the underlying request. User cancellation remains distinct from timeout. Input edits, component unmount, replacement lookups, wallet account changes, disconnects and network/passphrase changes abort and invalidate active responses.

**Consequence:** timeout, cancellation, unavailable and stale states cannot promote a payment to `Verified`; late resolutions and rejections are consumed and ignored. Only same-process opaque evidence from the existing exact-match verifier can render that label. Public hashes and addresses remain privacy-sensitive and are not persisted or logged by the interface.

**Validation:** deterministic unit tests cover preflight, abort-aware and abort-ignoring deadlines, late resolution/rejection and caller cancellation. Playwright exercises the real component lifecycle for input edits, replacement, unmount, wallet account/disconnect/network/passphrase changes, issued assets, cancellation announcements, result focus, all outcome wording and explorer-link boundaries. An opt-in test checks user-supplied genuine public Testnet evidence.

**Status evidence:** PR #31 merged the interface at protected-main SHA `4670b5511140b8397bd6858ef06362652c6e91b7`; merged-main CI passed, and production checks on 2026-11-22 confirmed verified, amount-mismatch and preflight-invalid-hash outcomes using unrelated public Testnet evidence. This status change does not add signing, submission, custody or Mainnet support.

## Decision entry template

### ADR-NNN — Title (YYYY-MM-DD; Proposed/Accepted/Superseded)

- **Context/problem:**
- **Alternatives:**
- **Decision and rationale:**
- **Security/privacy/operational consequences:**
- **Validation and evidence:**
- **Issue/PR links and date:**
- **Supersedes:** (if applicable)


## ADR-007 — Read-only recipient readiness is observational, not a guarantee (2026-11-27; proposed in Issue #25 branch)

**Context:** payment preparation should identify obvious Testnet destination/account and issued-asset trustline conditions without pretending that a preflight guarantees later execution.

**Decision:** use only the canonical Testnet Horizon account endpoint. Validate the destination public key before requesting data. For issued assets, match both code and issuer; expose Horizon authorization flags and reported balance/limit only when present. A same-code/different-issuer trustline is never accepted. Missing visible trustlines must be described carefully because issuer authorization policy can affect what Horizon exposes. Bound the complete request and response-body read, abort on timeout/cancellation, and invalidate stale results after destination or wallet/network context changes.

**Consequences:** readiness is a point-in-time observation, not a reservation or promise of payment acceptance. This feature does not create accounts/trustlines, calculate guaranteed receiving capacity, sign or submit transactions, or add Mainnet support.

**Validation expected before acceptance:** deterministic funded/unfunded, exact issuer, missing trustline, authorization, limit, malformed response, Horizon failure, timeout and cancellation tests; browser tests for invalid input, stale destination changes and accessible result states. Mark this ADR accepted only after the Issue #25 PR is reviewed and merged.
