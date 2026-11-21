# Feyo — architecture decisions and guardrails

Keep this as a small **append-only decision log**. Significant changes to product architecture, trust boundaries, dependencies, data storage, APIs or payment execution need a dated entry recording context, options, decision, consequences, tests and related PR. Decisions do not imply implementations are merged.

## ADR-001 — Non-custodial, explicit user authorization (2026-11-21; standing policy)

**Decision:** Feyo will not request, store or transmit user recovery phrases, signing seeds or private keys. When implemented, transaction signing must be an explicit action in the user's wallet after reviewing destination, exact amount, asset issuer, fee, network and expiration.

**Consequence:** signing never implies submission or settlement; do not add hidden auto-execution. Agent tooling requires a separately reviewed policy and approval boundary.

## ADR-002 — Testnet-only staged rollout (2026-11-21; standing policy)

**Decision:** keep the current Feyo application limited to the canonical Stellar Testnet passphrase. Testnet verification, Classic transaction preview, wallet authorization and future submission are separate milestones; Mainnet and regulated off-ramps require independent threat modeling, review and evidence.

**Consequence:** fail closed on account/network changes, and clearly mark all test assets as valueless.

## ADR-003 — Settlement requires independent exact-match evidence (2026-11-21; proposed in PR #30)

**Context:** a draft, client flag, signature or submission response can be misleading. **Decision:** only a verified successful network transaction and complete matching payment operation (hash, source, recipient, exact integer amount, asset type/code/issuer, network and valid ledger) may appear settled. A Horizon 404 is pending/absent, not definite failure. Check stale-request behavior and refuse copied/serialized verifier flags.

**Scope:** PR #30 currently adds a read-only Testnet verifier and status adapter but no live UI, funded transfer, transaction construction, signing or broadcast. Reverify exact merged status before editing this entry.

## ADR-004 — Persist and reconcile attempts *before* future broadcast (2026-11-21; architecture requirement, not implemented)

**Decision:** future submission needs durable attempt/intent fingerprint, idempotency scope, signed-envelope identity and tx hash saved before network submission. On ambiguous outcomes, check original hash and retry only the identical signed envelope when safe. Never blindly rebuild a new transaction/sequence before resolution.

**Risk:** duplicate payments and falsely reported outcomes. This needs separate design, tests and review before any broadcast UI is enabled.

## ADR-005 — Evidence-driven open-source changes (2026-11-21; standing policy)

**Decision:** issue scope, docs and roadmap follow verified product needs, tests and ecosystem feedback. External programs may help attract contributors but must not dictate architecture, create artificial work, or pressure unsafe merges. Preserve meaningful commit attribution and protected-branch checks.

## Decision entry template

### ADR-NNN — Title (YYYY-MM-DD; Proposed/Accepted/Superseded)

- **Context/problem:**
- **Alternatives:**
- **Decision and rationale:**
- **Security/privacy/operational consequences:**
- **Validation and evidence:**
- **Issue/PR links and date:**
- **Supersedes:** (if applicable)
