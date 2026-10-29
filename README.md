# Feyo

Feyo is an independent, open-source fintech startup building non-custodial, Stellar-powered stablecoin payment infrastructure for web applications, developers, and AI agents.

Integrating payments requires more than moving funds: applications need clear authorization, precise asset and amount handling, and trustworthy settlement status. Feyo aims to make those boundaries explicit and inspectable, starting with a Testnet workspace for reviewing balances and preparing payment intents.

**Current scope:** an early-stage, read-only Stellar Testnet application. Live payment execution, Mainnet settlement, a public payment API, MCP payment tools, and Nigerian bank payouts are **not implemented**.

## What works today

- Connect a wallet on Stellar Testnet, with account and network change handling and recoverable connection errors.
- Read public XLM and issued-asset balances from Testnet Horizon, preserving asset issuer identity and handling loading, unfunded accounts, empty results, and request failures.
- Validate payment drafts with exact decimal amounts, recipient addresses, and asset details; create and clear local drafts without signing or submission.
- Browse responsive MDX documentation with navigation and search.

Wallet session state and drafts stay in memory and clear on page reload. Disconnect resets the local wallet session; extension permissions remain managed in the wallet.

## Feature status

| Area | Status | Scope |
| --- | --- | --- |
| Testnet workspace and wallet connection | Implemented | Public address access; unsupported networks rejected |
| Account balances and payment drafts | Implemented | Read-only balances and local validation; no funds sent |
| MDX docs, search, and CI checks | Implemented | Developer documentation and automated validation |
| Authorization model and execution contracts | In progress | Product and interface design, not an execution service |
| Stellar transaction lifecycle | Planned | Construction, explicit signing, submission, and network verification |
| Public payment API and MCP payment tools | Planned | Developer and agent integrations |
| Nigerian bank payouts | Planned | Requires regulated providers and reviewed integrations |

## Local setup

Requires Git, **Node.js 20.9 or newer** (the Next.js minimum), and npm. CI currently uses Node.js 20. Use `npm ci` to install the versions recorded in the lockfile.

```bash
git clone https://github.com/Feyo-Protocol/feyo.git
cd feyo
npm ci
npm run dev
```

Open the [Testnet workspace](http://localhost:3000/app) or [documentation](http://localhost:3000/docs). No environment variables, API keys, or database setup are required for the current workspace. Wallet connection requires the browser extension; balance reads require internet access to Stellar Testnet Horizon.

### Varial (formerly Freighter) on Testnet

1. Install the browser extension from the official [Varial website](https://varialwallet.com/) and create a dedicated test account in the wallet.
2. In the wallet's network settings or network selector, select **Testnet** (sometimes labeled **Test Net**). Feyo requires the passphrase `Test SDF Network ; September 2015` and rejects Mainnet connections.
3. Fund the account with test XLM using [Stellar Friendbot](https://github.com/stellar/friendbot#api-usage): open `https://friendbot.stellar.org/?addr=YOUR_PUBLIC_ADDRESS`, replacing `YOUR_PUBLIC_ADDRESS` with your wallet's `G...` public address. Test assets have no monetary value; never enter a secret key or recovery phrase into Feyo or Friendbot.
4. Open the local workspace, select **Connect Freighter**, and approve address access in the extension. The current UI and `@stellar/freighter-api` integration retain the Freighter name.
5. Confirm that public balances load, then enter a recipient public address and amount to create a local draft. An unfunded account shows **Account not funded**; fund it and refresh balances. A draft does not authorize or send a payment.

## Testing and builds

Run the same checks used by the repository CI, followed by a whitespace check:

```bash
npm run lint
npm run docs:check
npm run docs:search:check
npm test
npx next typegen
npx tsc --noEmit
npm run build
git diff --check
```

Tests cover wallet behavior, balance handling, payment intent validation, payment status rendering, and documentation links and search. Wallet and balance tests use mocks rather than real funds or a live wallet. To serve the production build locally, run `npm start` after `npm run build`.

## Architecture and repository layout

The application uses Next.js App Router, React, TypeScript, Tailwind CSS, and MDX. The browser workspace connects through an isolated wallet adapter for public account and network access, fetches account data from Testnet Horizon, and validates drafts locally through the payment intent model. There is no deployed payment backend in this repository.

```text
src/app/app/           Testnet workspace UI
src/app/docs/          MDX pages, docs layout, and search
src/components/        Shared UI, wallet connection, and payment status
src/wallet/            Read-only wallet adapter and types
src/lib/stellar/       Public address validation and Testnet balances
src/lib/payments/      Exact-decimal amounts and payment intent validation
src/mdx-components.tsx Shared MDX component mapping
tests/                 Unit and component tests
scripts/               Documentation link and search-index checks
.github/               CI workflows and contribution templates
```

Future authorization, signing, submission, and settlement verification are separate design boundaries, described in the [architecture documentation](src/app/docs/architecture/page.mdx).

## Documentation and roadmap

These links open the MDX sources on GitHub; run the app to browse the rendered documentation at `/docs`.

- [Documentation overview](src/app/docs/page.mdx) and [getting started](src/app/docs/getting-started/page.mdx)
- [Stellar integration](src/app/docs/stellar/page.mdx) and [payment intent model](src/app/docs/payments/page.mdx)
- [Planned API](src/app/docs/api/page.mdx) and [planned MCP integration](src/app/docs/mcp/page.mdx)
- [Product roadmap](src/app/docs/roadmap/page.mdx) and [contributing guide](src/app/docs/contributing/page.mdx)
- [Open GitHub issues](https://github.com/Feyo-Protocol/feyo/issues?q=is%3Aissue%20state%3Aopen)

The roadmap moves from the current Testnet foundation toward permissioned execution, verifiable transaction status, developer and agent interfaces, and provider-backed payouts. Future work has no committed release dates; consult the roadmap and issues for scope and progress.

## Contributing

Developers of all experience levels are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md), then browse open issues or report a reproducible bug. Discuss large or architectural changes in an issue before implementation.

Fork the repository, create a focused branch, and make a small, reviewable change. Run the checks above and open a pull request explaining the problem, resulting behavior, and verification. Include tests for behavior changes and keep documentation clear about implemented and planned capabilities.

## Security and non-custodial design

Feyo's current wallet adapter requests public account access only. The application never requests or stores private keys or recovery phrases and does not request transaction signatures. Public account addresses are sent to Testnet Horizon to retrieve balances.

The design keeps authorization, wallet signing, execution, and verification separate. Asset identity includes the issuer, amounts use exact decimal handling, and a local draft must never be treated as settlement evidence. Future payment integrations require explicit permissions, review, and tests.

Report vulnerabilities privately using the process in [SECURITY.md](SECURITY.md); do not include credentials or user data in public issues.

## License

Feyo is licensed under [Apache-2.0](LICENSE).
