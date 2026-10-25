# Feyo

Feyo is an independent, open-source project building Stellar-powered stablecoin payment infrastructure for web applications, developers, and AI agents.

The repository currently contains the Next.js application and a functional MDX documentation foundation. Payment execution, public developer API endpoints, MCP tools, and Nigerian bank payouts are product direction—not capabilities this repository currently claims to provide.

## Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and the [documentation](http://localhost:3000/docs).

## Verify changes

```bash
npm run lint
npm run docs:check
npm test
npx tsc --noEmit
npm run build
npm audit --omit=dev
git diff --check
```

## Project status

- **Implemented:** Next.js app shell, responsive documentation, MDX routes, contributor foundation, read-only Stellar Testnet balance queries, and a validated payment-intent domain contract (no submission).
- **Work in progress:** permission boundaries, payment execution design, and Stellar transaction construction.
- **Planned:** developer API, MCP server, verifiable payment execution, and regulated USDC-to-Nigerian-bank payouts.

See the [roadmap](/docs/roadmap) and [contributing guide](/docs/contributing) for more detail.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening an issue or pull request.

Feyo is licensed under the [Apache License 2.0](LICENSE).
