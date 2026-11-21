# Feyo — project continuity and engineering handoff

**Snapshot:** 2026-11-21. **Repository:** https://github.com/Feyo-Protocol/feyo. **Website:** https://feyo-silk.vercel.app/. **Public docs:** https://feyo-silk.vercel.app/docs. **Rules:** `/AGENTS.md`, `/SECURITY.md` and `/CONTRIBUTING.md`.

> **IMPORTANT: State is date-scoped.** As of the 2026-11-21 remote check, protected `main` is `be02fa449078a7cf66ed1cafbc0c105fb8272872`, which merged safe-verification [PR #30](https://github.com/Feyo-Protocol/feyo/pull/30). The user-facing Issue #28 work is currently **local and uncommitted** on `codex/issue-28-verification-ui`, based on that SHA; it is not pushed, reviewed, merged, or deployed. Check GitHub and the worktree before treating this status as current.

## Permanent project document map

This document is a **date-scoped handoff**, not the entire roadmap. Future agents should consult:

- `AGENTS.md` — required engineering, security and safe-merge rules.
- `docs/PRODUCT_ROADMAP.md` — multi-phase product strategy, dependencies and exit evidence.
- `docs/MAINTAINER_PLAYBOOK.md` — maintainer duties and conditional recurring Drips Wave workflow.
- `docs/ARCHITECTURE_DECISIONS.md` — decisions and why they were made; append new ADRs for major changes.
- `docs/WAVE_LOG.md` — factual application, eligibility, cycle and appeal notes.
- `src/app/docs/roadmap/page.mdx` — truthful public product roadmap.

At each milestone, update this handoff with actual evidence and the precise next action. A local pass, green PR check, merge, preview, and production deployment are distinct states.

## 1. Why Feyo exists

Feyo is a maintained, independent, non-custodial Stellar payment product for humans, applications and eventually permission-limited AI agents. Its first usable workspace is Testnet-only. It must clearly separate preparing a payment, wallet authorization, network submission, and independently verified settlement. It is not a hackathon demo, Drips-specific project or marketing mockup.

**Do not change the product name, replatform the app, add gratuitous features or assert completed payment capabilities without scope agreement.** Build a technically correct, accessible, real product, maintaining the existing midnight-navy/emerald design language.

## 2. Implementation status

| Feature | On merged `main` as last inspected | In local Issue #28 branch | Still not implemented |
| --- | --- | --- | --- |
| Marketing site, responsive workspace, MDX docs/search | Yes | Preserved | — |
| Varial/Freighter public wallet connection and Testnet gating | Yes | Preserved | Wallet transaction authorization |
| Horizon XLM/issued-asset balance reads | Yes | Network constants centralized | Recipient readiness checks |
| Exact-decimal local draft validation and honest status component | Yes | Evidence boundaries tightened | Persistent payment intents/history |
| Independently query Horizon transaction + operations and check exact payment match | Yes, merged via PR #30 | Preserved and consumed | Production deployment evidence |
| Trusted verifier evidence into `PaymentStatus` | Yes, merged via PR #30 | Preserved; only verifier evidence can label the UI `Verified` | Submitted-payment source |
| User-facing exact-hash lookup | No | **Implemented locally:** full expected-payment form, preflight, timeout/cancel, outcome/evidence UI | Review, PR CI, merge and deployment |
| Node runtime and reproducible Playwright version alignment | Yes, merged via PR #30 | Preserved | — |
| Unsigned classic payment preview | No | No | Issue #26 |
| Explicit user-reviewed wallet signing | No | No | Issue #27 |
| Bounded, idempotent Testnet submission | No | No | Separate reviewed milestone, not part of #27 |
| Receipts backed by verified network evidence | No | No | Issue #29, depends on verification |
| Mainnet settlement, custody, off-ramp, API/MCP | No | No | Future work, separate security/regulatory design |

The published app must not claim it can send money while it is still a balance viewer and draft creator.

## 3. Merged safe-verification baseline and local Issue #28 milestone (inspected 2026-11-21)

- Merged baseline: PR [#30](https://github.com/Feyo-Protocol/feyo/pull/30), protected-main merge SHA `be02fa449078a7cf66ed1cafbc0c105fb8272872`.
- Current work: `codex/issue-28-verification-ui`, based on `be02fa4`; local changes only, with no commit, push, PR, review, merge, preview, or deployment.
- Scope: [#22](https://github.com/Feyo-Protocol/feyo/issues/22), [#23](https://github.com/Feyo-Protocol/feyo/issues/23), [#28](https://github.com/Feyo-Protocol/feyo/issues/28).
- Runtime: Node >=22.13, `.nvmrc` and both workflows pinned to 22.23.3; Playwright pinned to 1.56.1, browser CI pinned to Ubuntu 24.04.
- New files: `src/lib/stellar/network.ts`, `src/lib/stellar/payment-verification.ts`, `tests/stellar-payment-verification.test.ts`, `.nvmrc`. Existing CI/config/intent/wallet/status/docs files also updated; inspect `git status` and `git diff --stat` for complete live list.
- Locally verified on Node 22.23.3 after clean `npm ci`: lint; docs links; docs search; **91/91 unit/component assertions**; Next type generation; TypeScript; production build with **17/17 static pages**; and `git diff --check`.
- Browser caveat: Playwright 1.56.1 correctly refuses to install Chromium on local Ubuntu 26.04. The direct browser command therefore failed before test logic because revision 1194 was absent. A provisional run against a pre-installed newer Chromium headless shell passed **16/16** keyboard, routing, menu and overflow checks; the pushed GitHub Ubuntu 24.04 job subsequently validated the exact pinned revision and install path.
- PR #30's GitHub `checks` job passed on Ubuntu 24.04 in 1m25s, including the exact pinned browser install and all 16 browser checks; `docs-search` passed in 48s. The automatic Vercel **preview** also passed. This is CI/preview evidence, not review, merge or production deployment.
- Dependency audit after the clean install: the high-severity `follow-redirects` advisory was removed with a compatible transitive lockfile bump from 1.16.1 to 1.16.3. `npm audit` still reports nine moderate development/full-tree entries; `npm audit --omit=dev` reports one moderate direct Next.js 16.4.2 entry aggregating current Next advisories, with no compatible fix offered. Do not force the audit-suggested Next/eslint downgrade; review an upgrade separately.
- PR #30 performed no funded transaction, transaction building, signing, broadcasting or genuine live RPC/Horizon verification. The local Issue #28 milestone has now performed one opt-in read-only Horizon observation of an unrelated public native-XLM Testnet payment; details are recorded below. Feyo did not create, fund, sign or submit it.

### Local Issue #28 behavior and evidence

- `/app` accepts a Testnet transaction hash plus expected source, destination, exact decimal amount, native/issued asset identity and required issuer.
- Shared preflight in `payment-verification.ts` validates and converts the form to exact stroops before Horizon. The UI calls the existing exact-match verifier; it does not duplicate transaction/operation matching.
- Each request has a strict 10-second deadline around the complete verification operation plus explicit cancellation. The deadline returns `unavailable` and aborts the underlying request even when an injected client or response body ignores `AbortSignal`; late resolutions/rejections are consumed and ignored. User cancellation is reported separately. Input edits, component unmount, replacement lookups, wallet account changes, disconnects and network/passphrase changes abort and invalidate stale responses.
- The UI distinguishes `verified`, `failed`, `mismatched`, `not_found`, `malformed`, `invalid_request`, and `unavailable`; only opaque same-process verifier evidence can render `Verified`.
- Verified/failed/mismatched network evidence shows hash/ledger details and uses the existing validated Stellar Expert Testnet link builder. Inputs are session-only and are not logged or persisted.
- Deterministic tests cover all-field preflight; abort-aware, abort-ignoring, late-resolve and late-reject deadlines; caller cancellation; keyboard-accessible invalid submission; native and issued-asset trusted evidence; safe Testnet explorer URLs; cancellation/loading announcements; result focus; every outcome; input/replacement/unmount suppression; actual Freighter account, disconnect, Mainnet and incorrect-passphrase lifecycle changes; and `/app` responsive overflow.
- Opt-in live check passed against official Testnet Horizon for public transaction `ec29030e87bb7707b7a60de39bba8af2252e54c20ae4316a61ee5b4b176ad81c`: source `GCVKD2NSWNYOK6BS3PUMELUW6IRQBYJVW66UFTZWOKLYNBPR4FTQMIHR`, destination `GCVVDPD4M4YOAXEKXJ6YQLPFO43F5MEMSG3J7FOVRBWSMYT7KT7QDHOS`, native XLM, exact amount `1.87`. This is public third-party ledger evidence, not a Feyo payment.
- Final review validation on the stable diff: lint passed; docs links passed (10 pages/18 internal links); docs search matched; `npm test` passed 97/97 non-skipped tests (98 total, opt-in live test skipped by default); Next type generation and `tsc --noEmit` passed; production build passed with 17/17 static pages; and `git diff --check` passed. The 36-scenario browser/accessibility suite passed provisionally against `/usr/bin/google-chrome` through `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. The unmodified `scripts/check-a11y.sh` could not launch any test because pinned Chromium headless-shell revision 1194 is absent on this unsupported Ubuntu 26.04 host; GitHub Ubuntu 24.04 must supply exact pinned proof. The earlier opt-in official-Horizon live check passed 1/1 for the public transaction above; it was not a Feyo-created or funded payment.
- Exact browser limitation: `npm run test:browser:install` failed before tests because Playwright 1.56.1 does not support this Ubuntu 26.04 host, and the unmodified pinned-browser/a11y invocation could not find Chromium headless-shell revision 1194. Fresh supported-runner GitHub CI is still required for exact pinned-browser proof. `npm ci` continues to report nine moderate dependency advisories already tracked for separate review.

### Verification contracts introduced by this milestone

- Read-only **Testnet-only** Horizon verifier with transaction and operation lookups.
- Canonical public Testnet Horizon URL and passphrase are both enforced before lookup. The injectable client remains a trusted-code test seam, not an untrusted public API parameter.
- Exact-source, destination, asset type/code/issuer and integer amount match; successful transaction and positive ledger; contradictory payment source fields and incomplete/malformed result sets fail closed.
- Outcomes distinguish `verified`, `failed`, `not_found`, `mismatched`, `invalid_request`, `malformed`, `unavailable`. 404 means pending/absent, never confirmed failure.
- Stale-request invalidation when wallet, hash or intent changes; claimed/fabricated `verified` evidence must fail closed in status display.
- Opaque process-local evidence is not portable. Any serialized or persisted result requires **fresh verification**; do not put a client-controlled boolean in charge of settlement state.
- `paymentStatusFromVerifiedEvidence()` is the supported adapter into `PaymentStatus`; the component downgrades a claimed `verified` state without same-process verifier evidence to `confirming`. The `/app` lookup invokes the verifier first and passes only its opaque evidence through that presentation contract.

### Review before accepting the milestone

- Review the full read-only verifier diff, including exact operation-count completeness, asset identity, source consistency and exact amount matching. Horizon's documented page maximum is 200; a response shorter than the transaction's `operation_count` is rejected rather than partially trusted.
- Confirm the same-process evidence model is appropriate for the first consumer. It prevents copied/serialized flags from rendering `Verified`, but it is not a cryptographic attestation and the injected client must remain trusted code.
- Review the strict complete-operation 10-second deadline, distinct explicit cancellation, late-promise consumption, and `/app` controller/context behavior. Backoff is intentionally absent because verification is user-triggered and automatic retries could obscure uncertainty.
- Check the Node engine requirement against actual SDK package metadata and Vercel runtime support.
- Preserve the passing GitHub CI path, especially the pinned browser install on Ubuntu 24.04; rerun it after any implementation change.
- Keep deployment deferred until the Issue #28 branch is reviewed and merged; the local UI is read-only and is not yet a production user-facing transaction service.

## 4. Payment architecture and safety constraints

Target flow (not all implemented):

`validated intent → recipient/trustline readiness → fresh sequence/fee/time bound → unsigned XDR review → user-controlled wallet approval → signed envelope → persisted attempt/hash → controlled Testnet submission → exact-hash network lookup → matching payment operation → evidence-backed status/receipt`.

- Never request or hold secret seeds/recovery phrases. Enforce the explicit Testnet passphrase.
- Use precise decimal strings/stroops and preserve issuer, source, destination, and memo/muxed-account semantics where appropriate.
- Signature != submission != verified settlement. Transaction hash alone is not enough if the operation does not exactly match the intended payment.
- Persist intent fingerprint, unique attempt, signed envelope identity, sequence, and hash **before** any future broadcast; query the original hash before retries and avoid sequence changes after ambiguous outcomes.
- Public addresses/hashes can be linkable personal data. No sensitive logging or fabricated receipts. Never turn on production/Mainnet money movement under a read-only issue.

## 5. Issue backlog and dependencies

1. [#22](https://github.com/Feyo-Protocol/feyo/issues/22): Node runtime. **Merged in PR #30.**
2. [#23](https://github.com/Feyo-Protocol/feyo/issues/23): Deterministic browser CI. **Merged in PR #30.**
3. [#28](https://github.com/Feyo-Protocol/feyo/issues/28): Read-only payment verification. **Library/status contract merged in PR #30; the user-facing bounded lookup, browser coverage and public live observation are implemented and locally verified on `codex/issue-28-verification-ui`, pending maintainer review, PR CI, merge and deployment.**
4. [#25](https://github.com/Feyo-Protocol/feyo/issues/25): Read-only recipient/trustline readiness, including destination existence, authorization, limits and account requirements.
5. [#26](https://github.com/Feyo-Protocol/feyo/issues/26): Bounded unsigned classic XLM Testnet payment preview. Requires safe sequence/fee/timeout handling and human-visible XDR decoding.
6. [#27](https://github.com/Feyo-Protocol/feyo/issues/27): Explicit wallet signing authorization for reviewed Testnet envelope, **no submission**; depends on #26.
7. **Separate issue needed:** Controlled Testnet submission with durable attempt storage, idempotency and ambiguous-outcome recovery. Do not quietly add broadcasting in #27 or #28.
8. [#24](https://github.com/Feyo-Protocol/feyo/issues/24): Session-only draft history; avoid confusing drafts with history of paid transactions.
9. [#29](https://github.com/Feyo-Protocol/feyo/issues/29): Privacy-aware receipts, only after trusted verification and tests; no offline proof of a real on-chain payment.

Avoid duplicating completed work when using issues #22/#23/#28 after the local PR is merged.

## 6. Collaboration and quality gates

- Protected `main` is maintained through small, reviewed PRs. Preserve contributors' fork branches and authorship. Issue assignment and contribution workflows are in `CONTRIBUTING.md`.
- CI requires Node installation, lint, docs links/search, unit tests, typecheck, Next build and pinned-browser navigation/accessibility checks. Run commands from `AGENTS.md`.
- Record test provenance precisely: **fixture**, **manual real wallet**, **live Horizon**, **funded Testnet transfer**, or **deployed production**. Do not interchange them.
- No force pushes, destructive resets, fabricated review evidence or undocumented new dependencies. Scope breaking changes and security risk separately.

## 7. Drips Stellar Wave context — not a product requirement

- Feyo applied to the Stellar Wave maintainer program; repository was rejected. The email was reported received around **2026-11-13**, but use the exact rejection timestamp from Drips to establish the first appeal date.
- Official rules: first appeal after 14 days (approximately **2026-11-27** if rejected Nov 13), one-month cooldown following a rejected appeal, maximum three appeals. Submit only through the program's in-app appeal form.
- Wave 11 runs Nov 18–25, 2026. Wave 12 date is not confirmed in this handoff.
- A substantive appeal requires **merged, reviewed, verified implementation** and specific before/after code evidence. New issues alone are insufficient; no invented real-world payment evidence or claims of acceptance.
- Appeal link (use only when eligible): https://www.drips.network/wave/appeal/fdc01c95-806f-4b6a-998b-a6ed37e0d81b/20fd93c3-c249-425a-8a33-91b362848708
- Do not mention Drips/reward motivation in user-facing product marketing. Do not promise payment or Wave reward eligibility for regular GitHub issues.

## 8. Exact next actions for the next agent

1. Review the completed local diff and final verification report for `codex/issue-28-verification-ui`; exact Playwright 1.56.1 Chromium proof must come from the supported GitHub Ubuntu 24.04 runner.
2. If approved, commit and push the focused branch, open the Issue #28 PR, and require fresh GitHub checks and review. Do not merge or deploy without explicit maintainer approval.
3. After merge/deployment, repeat a safe public live observation in the deployed browser and update this file with exact PR, merge SHA and deployment evidence.
4. Review the unresolved moderate dependency audit and Vercel Node runtime support separately; do not fold a Next.js upgrade into Issue #28.
5. Then address #25 or #26 in separate focused PRs while preserving Testnet-only and no-submission boundaries.

### Template for updating this handoff after any PR

`YYYY-MM-DD — PR #N — branch/SHA — state (local/pushed/merged/deployed) — exact functionality — tests (fixture vs live) — security/known limitations — next issue/step.`

### Milestone history

- `2026-11-21 — PR #30 — codex/issues-22-23-28-safe-verification@b073ce5 (+ continuity updates) — open/pushed, required CI and automatic preview passed, not reviewed/merged/production-deployed — Node/Playwright alignment, read-only Testnet verifier and trusted PaymentStatus contract — deterministic Horizon fixtures plus exact GitHub browser CI; no live/funded payment evidence — moderate dependency advisories and live-workflow limitations recorded above — next: maintainer review.`
- `2026-11-21 — PR #30 merged at be02fa4 — protected main — read-only Testnet verifier, trusted status contract and Node/Playwright alignment merged; production deployment not reverified in this session.`
- `2026-11-21 — codex/issue-28-verification-ui (local/uncommitted) — user-facing strictly bounded read-only verifier, deterministic deadline/negative tests, real component wallet/network lifecycle tests, browser accessibility coverage and one opt-in genuine public Testnet observation; exact pinned Chromium remains blocked by unsupported local Ubuntu 26.04 and requires GitHub Ubuntu 24.04 CI; no Feyo-created transaction, signing or broadcast — next: review this final report before commit/push/PR.`
