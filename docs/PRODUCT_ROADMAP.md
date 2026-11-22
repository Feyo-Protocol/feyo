# Feyo — living product and ecosystem roadmap

**Status:** Directional roadmap, not a fixed-date release commitment.  
**Last reviewed:** 2026-11-22.<br />
**Maintained by:** Feyo-Protocol maintainers.  
**Sources of truth:** merged code, GitHub issues/PRs, CI evidence, and verified deployments. Read [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) for the date-scoped status.

## North star

Feyo is an **independent, open-source, non-custodial Stellar payment product**. It aims to make payments understandable, explicitly authorized, reliably executed, and independently verified for people, merchants, developers and eventually permission-limited AI agents.

Feyo is built as a useful startup-grade product, **not a reward program demonstration**. If eligible, we may participate in recurring Stellar Waves; we also maintain releases, security, support and genuine open-source contributions between Waves and without program participation.

## How this roadmap works

- **Merged:** code is on `main`, with evidence. **Deployed** is a separate status.
- **In PR:** proposed or tested but not part of `main` yet.
- **Planned:** a scoped need, not an implemented capability.
- **Exploration:** requires research, user or ecosystem input, a partner agreement, security review or regulatory check before issues are ready.
- Dates are **not promised**. Priorities respond to user needs, ecosystem changes, vulnerabilities, maintainability and contributors' capacity.
- GitHub issues are concrete work items. This document is the strategic direction; it must never be used to claim that a planned feature works.

## Foundation — verified merged baseline (November 1, 2026)

- Responsive Next.js/TypeScript application and MDX documentation/search, landing page and accessibility work.
- Testnet-only Varial/Freighter wallet public-account connection with network/account-change handling.
- Read-only XLM and issued-asset Horizon balances, retaining asset issuer identity.
- Exact-decimal, validated **session-local drafts** and honest status components.
- Open-source contribution guidelines, protected `main`, automated CI, docs checks and browser navigation tests.

**Not yet on this baseline:** unsigned transaction construction, signing, broadcasting, Feyo-created payments, durable transaction history, public payment API, agent tools, Mainnet or bank payouts.

### Delivered read-only verification milestone: PRs #30 and #31

[PR #30](https://github.com/Feyo-Protocol/feyo/pull/30) merged Node runtime and Playwright CI alignment ([#22](https://github.com/Feyo-Protocol/feyo/issues/22), [#23](https://github.com/Feyo-Protocol/feyo/issues/23)) plus the read-only Testnet Horizon verifier and trusted status integration. [PR #31](https://github.com/Feyo-Protocol/feyo/pull/31) added the user-facing exact-hash verification workflow, completed [#28](https://github.com/Feyo-Protocol/feyo/issues/28), passed merged-main CI, and was deployed to production. A November 22 production check using unrelated public Testnet evidence confirmed the exact match, amount-mismatch, and invalid-hash paths. Feyo did not create, fund, sign, or broadcast that transaction, and this milestone adds no payment execution.

## Phase 1 — trustworthy read-only Testnet workspace

**User outcome:** safely inspect wallet/balances, create and manage drafts, check recipient readiness and independently look up a known Testnet transaction without sending money.

- [#24](https://github.com/Feyo-Protocol/feyo/issues/24): multiple **session-only** drafts with clear deletion and no fabricated persistence.
- [#25](https://github.com/Feyo-Protocol/feyo/issues/25): recipient existence, trustline/issued-asset authorization/limits, memo and muxed-account requirements where appropriate.
- **Delivered — [#28](https://github.com/Feyo-Protocol/feyo/issues/28):** exact-hash read-only verification UI, bounded timeout/cancellation, pending vs failure cases, accessible browser coverage, and genuine public Testnet observation. The issue is closed after PR #31; this does not create a submitted-payment source.
- Mobile, accessible account/error states and clear explanation of Testnet limitations.

**Exit criteria:** real wallet/browser smoke test, real read-only Horizon observation (using public Testnet data only), deterministic negative tests, no leaked secrets, accessible UX and updated documentation.

## Phase 2 — deliberate, non-custodial Testnet payment execution

**User outcome:** review a payment, explicitly authorize it through the user's wallet, submit a safely tracked attempt and independently verify its result. No silent payments.

1. Recipient readiness and asset identity ([#25](https://github.com/Feyo-Protocol/feyo/issues/25)).
2. Bounded unsigned classic XLM transaction preview: account sequence, fee, timeout, full human-readable review and XDR decoding ([#26](https://github.com/Feyo-Protocol/feyo/issues/26)).
3. Wallet signature only after explicit user approval, network/account revalidation; signing **does not broadcast** ([#27](https://github.com/Feyo-Protocol/feyo/issues/27)).
4. **New separately reviewed issue:** controlled Testnet submission with persisted attempt identity, idempotency, signed-envelope and transaction hash recorded before broadcast, recovery from ambiguous timeouts, safe identical-envelope retry. No new sequence while earlier payment may land.
5. Integrate the delivered exact-match verifier ([#28](https://github.com/Feyo-Protocol/feyo/issues/28)) with any future submitted-payment flow without weakening its independently retrieved Horizon evidence.
6. Privacy-aware receipts only after verifiable settlement evidence ([#29](https://github.com/Feyo-Protocol/feyo/issues/29)).

**Exit criteria:** at least one genuine funded Testnet transfer with publicly verifiable hash; wrong-network, wrong-asset, reject-signature, stale-balance, timeout, duplication and mismatch tests; review of the security/threat model. **This is not Mainnet readiness.**

## Phase 3 — useful stablecoin payments for merchants and apps

**User outcome:** issued-asset payment flows that work for real Stellar use cases rather than only a test dashboard.

- Well-defined supported issued assets, issuer/trustline identity and limits. Research verified Stellar USDC paths; never hard-code any arbitrary issued asset as USDC.
- Payment requests/links, clear merchant and payer screens, careful memo handling, audit-friendly reconciliation and exports.
- Privacy-conscious payment history with reliable error and retry states.
- Fee sponsorship/no-XLM onboarding only after security, cost and network behavior review.
- Developer examples and a versioned authenticated intent/status API, with durable idempotency, rate limits, access controls and observability.

**Exit criteria:** meaningful developer examples and independently verified funded **Testnet** stablecoin flows, issuer/trustline tests, operational security controls and a documented API contract.

## Phase 4 — developer SDK and permission-controlled agent integrations

**User outcome:** developers and approved agents can use reusable primitives without compromising user authorization.

- Stable SDK/client examples, versioned API contracts, webhook integrity and replay protection.
- Agent/MCP tools initially limited to search, read, validate and draft. Any payment execution requires explicit policy and human authorization, revocation, limits and independent evidence.
- Evaluate supported Stellar smart wallets, passkeys and agent tooling where technically justified; do not integrate solely for novelty.
- Developer onboarding, sample apps, reliability and security reviews.

**Exit criteria:** audited permission boundaries, access-control and replay tests, usable examples, public API documentation and real external developer feedback.

## Phase 5 — sustainable ecosystem and regulated expansion (exploration)

Potential future studies: provider-backed off-ramps relevant to Nigeria and other markets, MoneyGram-compatible experiences only if supported and authorized by providers, additional accessible/localized experiences, ecosystem interoperability and sustainable support infrastructure.

**Not commitments:** no bank payout, provider partnership, custody, Mainnet, regulated service or production launch may be announced without actual integrations, appropriate legal review and independent evidence.

## Prioritization and issue generation

Create an issue only if it solves a demonstrated developer/user problem or necessary safety/maintenance debt. Check existing code and duplicates, identify dependencies, keep PR scope reviewable, define specific acceptance tests and threat considerations. Quality and maintainability matter more than issue counts or points. Create work between Waves as needed; participate in any Wave only if program acceptance and rules permit.

Priority order: **payment correctness/security → real user utility → reliability → maintainability → accessibility/docs → polish**. Maintain separate security fixes and high-risk payments workstreams. Don't split a real engineering feature into artificial issues.

## Product and community signals

Measure authentic progress: verified Testnet payment walkthroughs, independent verification coverage, regression rates, CI reliability, reviewer responsiveness, external contributors' accepted meaningful work, published SDK/examples and developer adoption feedback. Attach evidence; avoid made-up metrics or inflated attribution.

## Roadmap review procedure

At every significant merge or release, and at least once before each prospective Wave: review main/PRs/issues, confirm actual deployed behavior, update issue dependencies and decision log, move features between statuses **only with evidence**, and record changes in [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md). Keep the public MDX roadmap accurate; internal program logistics belong in the [maintainer playbook](MAINTAINER_PLAYBOOK.md).
