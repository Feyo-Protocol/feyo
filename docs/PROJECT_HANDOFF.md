# Feyo — project continuity and engineering handoff

**Snapshot:** 2026-11-21. **Repository:** https://github.com/Feyo-Protocol/feyo. **Website:** https://feyo-silk.vercel.app/. **Public docs:** https://feyo-silk.vercel.app/docs. **Rules:** `/AGENTS.md`, `/SECURITY.md` and `/CONTRIBUTING.md`.

> **IMPORTANT: State is date-scoped.** As of the 2026-11-21 remote check, `main` was `6d69c3f285b09e17f88e9e7f30859e8fe3e6ba3c` and no PR was open. The safe-verification work described below is **local, uncommitted, unpushed, unreviewed, unmerged and undeployed**. Check GitHub and `git status` before treating any of it as current. Local checks are not GitHub CI evidence.

## 1. Why Feyo exists

Feyo is a maintained, independent, non-custodial Stellar payment product for humans, applications and eventually permission-limited AI agents. Its first usable workspace is Testnet-only. It must clearly separate preparing a payment, wallet authorization, network submission, and independently verified settlement. It is not a hackathon demo, Drips-specific project or marketing mockup.

**Do not change the product name, replatform the app, add gratuitous features or assert completed payment capabilities without scope agreement.** Build a technically correct, accessible, real product, maintaining the existing midnight-navy/emerald design language.

## 2. Implementation status

| Feature | On merged `main` as last inspected | In local verification branch | Still not implemented |
| --- | --- | --- | --- |
| Marketing site, responsive workspace, MDX docs/search | Yes | Preserved | — |
| Varial/Freighter public wallet connection and Testnet gating | Yes | Preserved | Wallet transaction authorization |
| Horizon XLM/issued-asset balance reads | Yes | Network constants centralized | Recipient readiness checks |
| Exact-decimal local draft validation and honest status component | Yes | Evidence boundaries tightened | Persistent payment intents/history |
| Independently query Horizon transaction + operations and check exact payment match | No | **Implemented locally; deterministic fixtures pass** | Live hash-verification workflow and deployed integration |
| Trusted verifier evidence into `PaymentStatus` | No | **Implemented in the presentation contract and component tests** | `/app` has no transaction-hash lookup UI or submitted-payment source |
| Node runtime and reproducible Playwright version alignment | Old CI based on prior branch | **Updated locally; GitHub CI not run** | — |
| Unsigned classic payment preview | No | No | Issue #26 |
| Explicit user-reviewed wallet signing | No | No | Issue #27 |
| Bounded, idempotent Testnet submission | No | No | Separate reviewed milestone, not part of #27 |
| Receipts backed by verified network evidence | No | No | Issue #29, depends on verification |
| Mainnet settlement, custody, off-ramp, API/MCP | No | No | Future work, separate security/regulatory design |

The published app must not claim it can send money while it is still a balance viewer and draft creator.

## 3. Local safe-verification milestone (inspected 2026-11-21)

- Branch: `codex/issues-22-23-28-safe-verification`; base main SHA: `6d69c3f`.
- Scope: [#22](https://github.com/Feyo-Protocol/feyo/issues/22), [#23](https://github.com/Feyo-Protocol/feyo/issues/23), [#28](https://github.com/Feyo-Protocol/feyo/issues/28).
- Runtime: Node >=22.13, `.nvmrc` and both workflows pinned to 22.23.3; Playwright pinned to 1.56.1, browser CI pinned to Ubuntu 24.04.
- New files: `src/lib/stellar/network.ts`, `src/lib/stellar/payment-verification.ts`, `tests/stellar-payment-verification.test.ts`, `.nvmrc`. Existing CI/config/intent/wallet/status/docs files also updated; inspect `git status` and `git diff --stat` for complete live list.
- Locally verified on Node 22.23.3 after clean `npm ci`: lint; docs links; docs search; **91/91 unit/component assertions**; Next type generation; TypeScript; production build with **17/17 static pages**; and `git diff --check`.
- Browser caveat: Playwright 1.56.1 correctly refuses to install Chromium on local Ubuntu 26.04. The direct browser command therefore failed before test logic because revision 1194 was absent. A provisional run against a pre-installed newer Chromium headless shell passed **16/16** keyboard, routing, menu and overflow checks. GitHub Ubuntu 24.04 must still validate the exact pinned revision and install path.
- Dependency audit after the clean install: the high-severity `follow-redirects` advisory was removed with a compatible transitive lockfile bump from 1.16.1 to 1.16.3. `npm audit` still reports nine moderate development/full-tree entries; `npm audit --omit=dev` reports one moderate direct Next.js 16.4.2 entry aggregating current Next advisories, with no compatible fix offered. Do not force the audit-suggested Next/eslint downgrade; review an upgrade separately.
- No funded transaction, transaction building, signing, broadcasting or genuine live RPC/Horizon verification was performed. Browser and Horizon test responses were fixtures.

### Verification contracts introduced by this milestone

- Read-only **Testnet-only** Horizon verifier with transaction and operation lookups.
- Canonical public Testnet Horizon URL and passphrase are both enforced before lookup. The injectable client remains a trusted-code test seam, not an untrusted public API parameter.
- Exact-source, destination, asset type/code/issuer and integer amount match; successful transaction and positive ledger; contradictory payment source fields and incomplete/malformed result sets fail closed.
- Outcomes distinguish `verified`, `failed`, `not_found`, `mismatched`, `invalid_request`, `malformed`, `unavailable`. 404 means pending/absent, never confirmed failure.
- Stale-request invalidation when wallet, hash or intent changes; claimed/fabricated `verified` evidence must fail closed in status display.
- Opaque process-local evidence is not portable. Any serialized or persisted result requires **fresh verification**; do not put a client-controlled boolean in charge of settlement state.
- `paymentStatusFromVerifiedEvidence()` is the supported adapter into `PaymentStatus`; the component downgrades a claimed `verified` state without same-process verifier evidence to `confirming`. This is component-contract integration only, not a live verification page.

### Review before accepting the milestone

- Review the full read-only verifier diff, including exact operation-count completeness, asset identity, source consistency and exact amount matching. Horizon's documented page maximum is 200; a response shorter than the transaction's `operation_count` is rejected rather than partially trusted.
- Confirm the same-process evidence model is appropriate for the first consumer. It prevents copied/serialized flags from rendering `Verified`, but it is not a cryptographic attestation and the injected client must remain trusted code.
- Decide whether a default lookup timeout is required before adding a live caller. The verifier accepts an `AbortSignal` and distinguishes lookup failures, but this milestone does not implement backoff or a `/app` retry/lookup controller.
- Check the Node engine requirement against actual SDK package metadata and Vercel runtime support.
- Run GitHub CI on the pushed PR, especially pinned browser install on Ubuntu 24.04. A local system browser substitute is not sufficient to mark exact browser reproducibility verified.
- Keep deployment deferred until the PR is reviewed and merged; current milestone is a read-only library capability, not a user-facing transaction service.

## 4. Payment architecture and safety constraints

Target flow (not all implemented):

`validated intent → recipient/trustline readiness → fresh sequence/fee/time bound → unsigned XDR review → user-controlled wallet approval → signed envelope → persisted attempt/hash → controlled Testnet submission → exact-hash network lookup → matching payment operation → evidence-backed status/receipt`.

- Never request or hold secret seeds/recovery phrases. Enforce the explicit Testnet passphrase.
- Use precise decimal strings/stroops and preserve issuer, source, destination, and memo/muxed-account semantics where appropriate.
- Signature != submission != verified settlement. Transaction hash alone is not enough if the operation does not exactly match the intended payment.
- Persist intent fingerprint, unique attempt, signed envelope identity, sequence, and hash **before** any future broadcast; query the original hash before retries and avoid sequence changes after ambiguous outcomes.
- Public addresses/hashes can be linkable personal data. No sensitive logging or fabricated receipts. Never turn on production/Mainnet money movement under a read-only issue.

## 5. Issue backlog and dependencies

1. [#22](https://github.com/Feyo-Protocol/feyo/issues/22): Node runtime. **Local milestone implemented, not merged.**
2. [#23](https://github.com/Feyo-Protocol/feyo/issues/23): Deterministic browser CI. **Local milestone implemented; GitHub confirmation pending.**
3. [#28](https://github.com/Feyo-Protocol/feyo/issues/28): Read-only payment verification. **Local verifier and trusted `PaymentStatus` adapter/component tests implemented; no `/app` transaction-hash workflow, live Horizon evidence or funded transfer.**
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

1. Commit the reviewed milestone and both continuity files on `codex/issues-22-23-28-safe-verification`, push without force, and open a normal PR from base `6d69c3f`.
2. The PR may use `Closes #22` and `Closes #23`. For #28, explain that trusted evidence is integrated into the `PaymentStatus` contract and tests but `/app` has no live hash-verification workflow; close only if maintainers agree that this satisfies the issue's read-only scope, otherwise use `Refs #28`.
3. Require GitHub CI to pass the exact Node 22.23.3 and Playwright 1.56.1/Chromium install on Ubuntu 24.04 before merge. Do not treat the Ubuntu 26.04 substitute-browser run as equivalent.
4. Review the unresolved moderate dependency audit and Vercel Node runtime support; keep any Next.js upgrade in a separate reviewed change.
5. Do not merge or deploy without maintainer approval. After review/merge, update this file with PR number, merge SHA, CI conclusion and deployment state.
6. Then address #25 or #26 in separate focused PRs while preserving Testnet-only and no-submission boundaries.

### Template for updating this handoff after any PR

`YYYY-MM-DD — PR #N — branch/SHA — state (local/pushed/merged/deployed) — exact functionality — tests (fixture vs live) — security/known limitations — next issue/step.`
