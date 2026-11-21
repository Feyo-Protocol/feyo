<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Feyo — instructions for coding agents and contributors

> **Read `docs/PROJECT_HANDOFF.md` at the start and end of every development task.** Update that document whenever scope, implementation, validation, deployment or blockers change. This file states the durable project rules; the handoff records the current, date-stamped state.

## Permanent product roadmap and maintainership

Before planning features or coding, read `docs/PRODUCT_ROADMAP.md` and `docs/ARCHITECTURE_DECISIONS.md` in addition to the date-scoped handoff. Read `docs/MAINTAINER_PLAYBOOK.md` when triaging, assigning issues, planning recurring contributions or working with Drips, and update `docs/WAVE_LOG.md` after any actual application/cycle decision. Feyo's product roadmap exists independently of any rewards program; follow real user needs and security dependencies, not issue quotas. Approval or participation in one Wave is **not** guaranteed for every future Wave.

Update the living roadmap after significant changes, and ensure the public MDX roadmap reflects only genuinely implemented functionality. Onboarding pointers for other coding agents are `CLAUDE.md` and `.github/copilot-instructions.md`; all agents must treat this AGENTS.md as canonical.

## Product and mission

- Repository: `Feyo-Protocol/feyo`. Website: https://feyo-silk.vercel.app/.
- Feyo is an **independent, open-source Stellar fintech project**. It is being built as a maintained, usable product, not as a one-off hackathon demonstration or an application designed around any rewards program.
- Goal: make non-custodial Stellar stablecoin payments understandable, explicitly authorized and independently verifiable for applications, developers and, eventually, permission-limited agents.
- Preserve the established Next.js App Router + React + TypeScript + MDX application and its existing design system. Improve it deliberately; do not reset, rename, replatform or redesign the project without a substantiated reason and maintainer approval.
- Scope is **Testnet only** until a separate, explicitly reviewed Mainnet milestone. Any Nigerian bank off-ramp, public payment API, MCP payment tools, agent autonomy or regulated payouts remain planned unless code, tests and live evidence prove otherwise.

## Source of truth: verify before modifying

1. Check `git status`, branch, `git log -5`, remote, open PRs and GitHub issues. Preserve other contributors' changes and untracked files.
2. Read `README.md`, this file, `docs/PROJECT_HANDOFF.md`, `src/app/docs/architecture/page.mdx`, `src/app/docs/roadmap/page.mdx`, `SECURITY.md`, and the issue you are addressing.
3. Inspect implementation and tests. **Code and verified runs take precedence over stale descriptions.** Never equate a planned, locally implemented, merged or deployed feature.
4. Keep work issue-scoped and PR-based. Make small, separately reviewable changes. Do not create unrelated features just because an agent thinks they sound useful.
5. Verify external APIs/library compatibility against the installed versions and official docs, not generic examples or model recollection.

## Security and payment correctness — non-negotiable

- Never request, log, persist or transmit wallet recovery phrases, secret seeds, private keys or production credentials. Wallet signing must occur through the user's installed wallet after informed, explicit review.
- Only use the intended Stellar **Testnet** network/passphrase in the current application. Fail closed on network, account or authorization changes.
- An intent/draft is **not** a transaction. A signed envelope is **not** a submission. A submission response is **not** a settled payment. A successful unrelated transaction is **not** proof of the specified payment.
- Never mark a payment `verified` based solely on client-supplied flags, copied/serialized evidence, a wallet signature or a status widget. Require independently retrieved network evidence matching the transaction hash, source, destination, asset type/code/issuer and exact amount; distinguish Horizon 404/pending from confirmed failure. Treat uncertain provider responses as uncertain.
- Use exact decimal strings/integer stroops (up to seven decimal places), not floating-point money comparisons. Preserve issuer identity and use guarded account/transaction async operations to avoid stale data.
- For any future submission feature, design persisted attempt identity and idempotency **before** broadcasting; on ambiguous outcomes query the original transaction/hash and never blindly rebuild/send with a fresh sequence.
- No live Mainnet transactions, actual bank payouts, custody, or autonomous agent payment actions in this milestone. Test with deterministic fixtures and test funds only after explicit approval of the integration flow.
- Treat public wallet addresses, hashes and ledger activity as linkable privacy data. Do not put sensitive user information into logs, screenshots or receipts.

## Current workflow and technical boundaries

- Current main includes wallet connectivity, Testnet balance reads, local payment drafts, MDX docs, testing/accessibility checks, and the merged read-only verification library from PR #30. The user-facing Issue #28 verification workflow is tracked separately in `docs/PROJECT_HANDOFF.md`; verify its branch/PR/merge/deployment state before making claims.
- Maintain strict separation of `src/lib/payments/` domain validation, `src/lib/stellar/` network reads/verification, `src/wallet/` provider integration, and `src/components/payment/` display status.
- Planned work is tracked in GitHub issues #22–#29. Respect dependencies between destination readiness, unsigned preview, signing, controlled submission, independent verification and receipts; a merged verifier does not imply payment execution.
- Do not change API contracts, network scope, wallet permissions, deployment settings or product claims without tests and clear documentation.
- Preserve the protected `main`; develop on named branches and use pull requests. Do not force-push others' branches or overwrite contributor work. Ask for permission before merging or deploying unless already expressly authorized.

## Verification checklist

Use the Node version declared by `.nvmrc` and `package.json` on the current branch. For the in-progress milestone, Node 22.23.3 is the reported CI baseline; **verify against the actual files before relying on this number**.

```bash
npm ci
npm run lint
npm run docs:check
npm run docs:search:check
npm test
npm run test:live:testnet # Optional; requires explicit public Testnet evidence variables
npx next typegen
npx tsc --noEmit
npm run build
bash scripts/check-a11y.sh
git diff --check
```

- For browser tests, use the exact pinned Playwright/Chromium combination in a supported runner. A local system-browser substitute is useful provisional evidence, **not** proof that GitHub's exact browser installation path passes.
- New functionality requires meaningful failure/edge-case tests, clear manual smoke checks where wallets/networks are involved, and honest build/run reports. Never invent test results or mark CI successful before GitHub reports it.

## Handoff discipline — mandatory for every milestone

Update `docs/PROJECT_HANDOFF.md` in the **same branch/PR** as every meaningful implementation, issue completion, architecture change or deployment. Record:

1. Date, branch, base SHA, latest commit/PR and whether code is local, pushed, reviewed, merged or deployed.
2. Implemented behavior, exact files/modules and publicly exposed API changes.
3. Tests/CI **actually run**, distinguishing mocks, browser fixtures and real external-wallet/network evidence; list missing verification.
4. Known blockers, security concerns, regression risks and explicit no-go decisions.
5. Next prioritized issues, dependencies and precise first action for the next agent.
6. Product boundaries and any documentation/README statements needing adjustment.

Preserve prior milestone information succinctly when updating history; do not silently claim abandoned or unmerged work is complete. If the handoff conflicts with verified code, correct the handoff and note the discrepancy.

## External program context

A Feyo repository application to Stellar Drips Wave was rejected in November 2026, and an appeal may be considered after the official cooldown **only if substantive work has been merged**. This does not determine Feyo's product roadmap. Never label ordinary GitHub issues as funded, promise eligibility or apply Program labels until officially approved. Keep appeal logistics in `docs/PROJECT_HANDOFF.md`, not in public-facing marketing copy.
