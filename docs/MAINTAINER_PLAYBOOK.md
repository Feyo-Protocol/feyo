# Feyo — maintainer and recurring Wave playbook

**Owner:** Feyo-Protocol maintainers. **Last reviewed:** 2026-11-21.  
**Important:** Drips rules and schedules change. Check [official maintainer guidance](https://docs.drips.network/wave/maintainers/faq/), [terms](https://docs.drips.network/wave/terms-and-rules/) and [Stellar Wave page](https://www.drips.network/wave/stellar) before acting. Nothing here establishes eligibility or guarantees recurring approval or rewards.

## Principles

- Feyo is maintained **continuously as an independent project**: issues, reviews, security response, releases and developer support do not depend on Drips.
- Stellar Wave aims to run monthly, typically as a short sprint; **this is an intention, not a permanent guaranteed schedule**. Repository selection, ongoing participation and rewards are at the organizers' discretion; acceptance can be reconsidered or removed.
- **Current state:** application rejected (reported November 2026), appeal not yet confirmed or approved. Do not put Program labels on issues or advertise them as funded while rejected. The 14-day appeal cooldown is measured from the actual rejection timestamp, not the date this file was edited.
- No reward farming, fake/duplicated issues, trivial low-value changes, unverifiable claims, self-dealing, contributor identity manipulation, or pressure to merge broken work. See Terms & Rules.

## Ownership and source-of-truth boundaries

- `AGENTS.md`: mandatory engineering/security behavior for agents.
- `docs/PROJECT_HANDOFF.md`: current snapshot, next step, current PRs and risks.
- `docs/PRODUCT_ROADMAP.md`: strategic product direction and exit gates.
- `docs/ARCHITECTURE_DECISIONS.md`: why important decisions were taken; add dated entries, don't erase history.
- GitHub issues/PRs: scope, discussion, assignment, implementation, reviews and checks.
- `src/app/docs/roadmap/page.mdx`: honest **public** roadmap; don't include reviewer strategy, rewards or misleading marketing.
- Official Drips dashboard: actual program approval, issue enrollment, complexity, points, assignment and resolution—not GitHub labels alone.

## Work between Waves (always applicable)

1. Triage bug/security reports; prioritize blocking user journeys and safety over the next rewards cycle.
2. Review outstanding PRs within a reasonable stated maintainer turnaround; preserve contributor authorship, explain rejections and request tests.
3. Keep `main` protected with required CI. Verify Playwright, docs, TypeScript, build and actual browser/wallet checks as needed.
4. Maintain `docs/PROJECT_HANDOFF.md`, documentation and release notes whenever behavior changes.
5. Create a **small authentic backlog** from roadmap gaps, bugs and ecosystem feedback, with scoped deliverables and prerequisites. Do not invent work to hit a quota.
6. Prepare test fixtures, reproduction steps and non-secret Testnet setup so external contributors can work without private credentials.
7. Handle vulnerabilities privately and responsibly; prohibit unreviewed Mainnet or financial risk changes.

## Before any prospective Wave (only if approved and eligible)

1. Reconfirm Drips repo status and current rules/point budgets before labeling or enrolling issues.
2. Review existing open issues, PR overlap, implementation progress, prerequisites and risk; update or close stale items.
3. Select a modest set of independent, reviewable tasks feasible within the active sprint; avoid high-risk payments without security oversight.
4. Issue template: **problem/beneficiary, exact scope, non-goals, prerequisites, relevant files, acceptance criteria, test commands, security/privacy notes, expected docs, maintainer contact**.
5. Assign complexity in the **Drips maintainer dashboard** rather than assuming GitHub labels set appropriate value. Follow per-repository and organization point budgets. Do not guess reward amounts.
6. Notify contributors of scope, review expectations and actual program status; distinguish ordinary volunteer issues from funded/eligible Wave tasks.

## During a Wave (when one is actually active and Feyo is approved)

- Check applications and issue discussions regularly, with fair and transparent assignment. Do not assign the same issue to multiple uncoordinated contributors.
- Require contributors to comment a short plan when scope is nontrivial. Prefer focused PRs over unrelated bundles.
- Review code, run CI, check reproducible evidence, threat model, documentation and wallet/network assumptions. Return concrete feedback quickly.
- Keep issue status and complexity aligned with real work; don't make point promises. Escalate blockers early, especially security or unowned dependencies.
- For financial paths: verify Testnet-only, no secrets/custody, exact amounts/assets, fail-closed status, idempotency and no fabricated settlement before merge.
- Resolve issues in Drips only when acceptance criteria are met and applicable rules are followed; consult official policy for unusual blocked work.

## At end of Wave and between cycles

1. Reconcile the dashboard with GitHub: assigned, completed, merged, unresolved, reopened; record sources, not just counts.
2. Review any unresolved tasks and whether their scope is still valid. Drips documents a rollover path for unfinished issues, but **Points generally do not carry across Waves**. Confirm current policies.
3. Use the official post-Wave Compliments window if applicable; verify timing and purpose in latest docs.
4. Publish honest development/release notes and thank contributors for meaningful work; preserve original PR/commit attribution.
5. Review product impact, CI regressions, contributor friction and security debt; adjust future backlog rather than mechanically recreating the same issues.
6. Update the [Wave log](WAVE_LOG.md) with exact dates, decisions, evidence, links and any Drips policy change.

## PR acceptance and release safety

**Required:** testable scope, accepted security boundaries, no unjustified dependencies, passing CI/docs/browser, appropriate wallet/Horizon smoke tests, review/maintainer approval, accurate status labels, and updates to handoff when substantive. Never merge a red required CI job just to make a Wave deadline; a Vercel fork preview authorization warning is distinct from failing tests, but review preview code before approving access.

Maintain a clear progression: local experiment → PR/CI → reviewed merge → deployed preview/production → independently verified live behavior. Do not collapse these stages. Direct PR edits must preserve external contributor original authorship and avoid force-pushing their fork.

## Appeals and program eligibility

If the repo is rejected, only appeal through the official form after the applicable cooldown. Supply **substantive merged changes since rejection**, independent evidence of ecosystem relevance, maintained docs, issue reviews, releases, and meaningful contributor activity. No guarantees, no off-platform appeals, no invented usage, no misreporting a PR preview as live product. Record any decision and exact timestamp in the [Wave log](WAVE_LOG.md); keep public marketing independent of Drips.

## New-agent workflow

On entry, read `AGENTS.md` → `docs/PROJECT_HANDOFF.md` → `docs/PRODUCT_ROADMAP.md` → `docs/ARCHITECTURE_DECISIONS.md` → current issue/PR. Confirm latest main and branch **before** editing. On exit, update handoff with actual tests, hashes, paths, blockers and next step; don't overwrite another contributor's edits. No autonomous merge, deployment, program label or fund movement without explicit authorization.
