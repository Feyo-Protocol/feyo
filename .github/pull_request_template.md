## What changed?

<!-- Describe the problem and the approach. -->

## Verification

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] `git diff --check`

## Safety and scope

- [ ] This change does not introduce custody of private keys or live payouts.
- [ ] Implemented, work-in-progress, and planned behavior are labeled accurately.
- [ ] Security or regulatory implications are called out above.

## Handoff and roadmap consistency

- [ ] I checked `AGENTS.md`, `docs/PROJECT_HANDOFF.md`, the relevant issue and the living roadmap before implementation.
- [ ] Meaningful implementation changes update `docs/PROJECT_HANDOFF.md` with verified results, branch, risks and the precise next step.
- [ ] Architecture or trust-boundary decisions update `docs/ARCHITECTURE_DECISIONS.md` where relevant.
- [ ] Public claims and `src/app/docs/roadmap/page.mdx` reflect only code that is actually merged/deployed as stated.
- [ ] I distinguish fixture-only, real wallet, live Horizon, funded Testnet, preview and production evidence.
- [ ] This work is issue-scoped, respects existing contributor work and makes no unapproved claims about Wave eligibility or rewards.
