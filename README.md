# Feyo

Feyo is an independent, open-source project building Stellar-powered stablecoin payment infrastructure for web applications, developers, and AI agents.

The repository contains the Next.js application, a responsive Stellar Testnet workspace, and a functional MDX documentation foundation. The workspace connects to Freighter, reads public balances from Testnet Horizon, and validates local payment drafts. Payment execution, public developer API endpoints, MCP tools, and Nigerian bank payouts are not implemented capabilities.

## Run locally

```bash
npm install
npm run dev
```

Visit the [Testnet workspace](http://localhost:3000/app) and the [documentation](http://localhost:3000/docs). Drafts and wallet session state remain in memory and are cleared on reload. Disconnect resets the local session; extension permissions remain managed in the wallet.

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

- **Implemented:** Next.js app shell, responsive documentation, MDX routes, contributor foundation, Freighter Testnet connection, read-only Horizon balance display, exact-decimal local payment draft validation and lifecycle (no submission).
- **Work in progress:** permission boundaries, payment execution design, and Stellar transaction construction.
- **Planned:** transaction construction and permissioned execution, developer API, MCP server, verifiable payment execution, and regulated USDC-to-Nigerian-bank payouts.

See the [roadmap](/docs/roadmap) and [contributing guide](/docs/contributing) for more detail.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening an issue or pull request.

Feyo is licensed under the [Apache License 2.0](LICENSE).
