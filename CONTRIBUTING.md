# Contributing to Feyo

Thanks for helping build open payment infrastructure. Feyo is early-stage, so clear documentation and small, reviewable changes are especially valuable.

## Development

1. Fork the repository and create a focused branch.
2. Install dependencies with `npm install`.
3. Run the app with `npm run dev`.
4. Make the smallest change that solves the problem.
5. Run lint, docs link checks, tests, type checking, build, and `git diff --check`.
6. Open a pull request using the template.

### Verification commands

```bash
npm run lint          # Run ESLint across application and tests
npm run docs:check    # Validate internal MDX links, routes, and fragment anchors
npm test              # Run offline unit, component and SEO regression tests
npm run test:coverage # Optional Node built-in coverage report
npx tsc --noEmit      # Type-check TypeScript files
npm run build         # Build production Next.js application
git diff --check      # Check for whitespace and merge conflict markers
```

The test suite uses Node's existing runner and server-rendered React components; it requires no wallet, live network, keys, or funds. For example, changing the workspace's `noindex` metadata would fail an SEO regression test. Only set `NEXT_PUBLIC_SITE_URL` to your real HTTPS origin on production.

## Scope and safety

Do not add live payout behavior, custody of user private keys, or undocumented claims about payment/API/MCP functionality. Use mocks, fixtures, and test networks for future payment work. Flag security and regulatory implications in the pull request.

## Commit and pull requests

Use descriptive commits and explain the problem, the change, and verification in your pull request. Documentation changes should keep implemented, work-in-progress, and planned functionality clearly separated.

## Questions

Open a discussion or issue on [GitHub](https://github.com/Feyo-Protocol/feyo/issues) before starting a large or architectural change.
