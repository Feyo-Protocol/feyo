# Feyo — Drips eligibility and Wave operations log

**Purpose:** maintain factual, date-scoped records without changing Feyo's independent product roadmap. Source of truth for actual eligibility is the Drips maintainer dashboard, not this log. Refer to [MAINTAINER_PLAYBOOK.md](MAINTAINER_PLAYBOOK.md) and official rules before acting.

## Current status (2026-11-22)

- Stellar Wave maintainer application for `Feyo-Protocol/feyo` was **rejected**; user reported receiving the rejection notice about 2026-11-13 (approximate, not independently confirmed).
- Rejection email said an appeal may be submitted after **two weeks** and is unlikely without substantial improvements. The estimated first appeal date is **2026-11-27** if the reported Nov 13 rejection timestamp is correct, but the official Drips dashboard timestamp must establish the actual date.
- Wave 11 is active Nov 18–25, 2026 per the public Stellar program page. Wave 12 has no verified date in this log.
- Repo has future ordinary GitHub issues #24–#27 and #29; Issue #28 is closed as completed. Do not mark future issues as Stellar Wave Program issues until approved, and don't promise funding.
- [PR #30](https://github.com/Feyo-Protocol/feyo/pull/30) and [PR #31](https://github.com/Feyo-Protocol/feyo/pull/31) are substantive merged improvements since the reported rejection: reproducible runtime/browser CI, an independent Testnet exact-match verifier, trusted status integration, and the accessible user-facing verification workflow. PR #31 closed Issue #28; merged-main GitHub CI passed.
- The production `/app` verification workflow was manually checked on 2026-11-22 with an unrelated public Testnet transaction. Exact expected details returned `VERIFIED`, an amount changed from `1.87` to `1.88` returned `PAYMENT MISMATCH`, and a short hash returned `INVALID REQUEST` before any Horizon call. This is deployed read-only verification evidence, not a Feyo-created, funded, signed or broadcast payment.
- These improvements are potential appeal evidence only. They do not establish Drips acceptance, Wave eligibility, funding or permission to use Program labels.

## Cycle record template (copy for every Wave or review)

### Cycle: Stellar Wave __ / YYYY-MM-DD through YYYY-MM-DD

- **Repo eligibility at start:** Approved / Under review / Rejected / Removed; dashboard verification link + timestamp:
- **Rules and point budget version checked:** official URL, date, per-repo/org limits:
- **Selected GitHub issues:** URLs, scope, accepted dependencies and testable acceptance:
- **Enrolled in Drips:** issue URLs, complexity, enrollment date (only if eligible):
- **Contributor assignment:** links, assigned identity (no duplicate identities), date:
- **PRs and reviews:** PR URLs, important review notes, CI outcomes, reviewer:
- **Merged and resolved:** links, merge SHA and Drips resolution evidence:
- **Carry-over/unresolved:** why, owner, next action and whether enrolled issue remains eligible:
- **Security/quality incidents:** redacted summary and follow-up:
- **Product outcome:** actual release, integration evidence, developer/user feedback:
- **Handoff updated:** date/author/commit:

## Appeal record template

- **Initial rejection timestamp and reason received:**
- **Earliest eligibility per dashboard:**
- **Improvements *merged since rejection*:** commit/PR links and what changed:
- **Verification:** test runs, deployed behavior and independently verified transactions, if any:
- **Ecosystem/community evidence:** meaningful external merges, reviews, support and open-source usefulness:
- **Form submitted on/date, URL:**
- **Decision and next eligible action:**

## Rules reminders

Do not describe any issue as eligible or rewarded without official enrollment. Drips generally does not carry Points between Waves even when unresolved issues can roll forward. Maintainers may be required to follow per-org/per-repo budgets, maintain issue assignment and resolve issues under the current rules; organizers retain discretion over repository eligibility. Never fabricate activity or promise payouts.
