# Freighter Wallet Integration

`FreighterAdapter` is an isolated, strongly-typed adapter for connecting to the
Freighter browser extension exclusively on **Stellar Testnet**.

## Security and Scope Boundaries

- **Read-only public address**: Only queries the active Stellar public address (`G...`).
- **Zero custody or signing**: Never requests, touches, or stores secret keys (`S...`). No transaction signing, auto-payment, or live funds handling.
- **Strict network requirement**: Explicitly enforces Stellar Testnet (`Test SDF Network ; September 2015`). Any connection attempt on Mainnet (`Public Global Stellar Network ; September 2015`) or unverified networks fails safely with an `unsupported_network` error.
- **Honest disconnect semantics**: Calling `disconnect()` resets in-memory application state to `idle`. It explicitly notes that local session state was reset without falsely claiming browser extension permissions were revoked.

## Connection States

```
           ┌──────────────────────┐
           │        idle          │
           └──────────┬───────────┘
                      │ connect()
                      ▼
           ┌──────────────────────┐
           │      connecting      │
           └──────┬────────┬──────┘
  success         │        │ failure (missing, rejected, wrong network)
  ┌───────────────┘        └────────────────┐
  ▼                                         ▼
┌──────────────────────┐         ┌──────────────────────┐
│      connected       │         │        error         │
│ (G... address only)  │         │  (typed error code)  │
└──────────┬───────────┘         └──────────┬───────────┘
           │ disconnect()                   │ retry / connect()
           ▼                                ▼
┌──────────────────────┐         ┌──────────────────────┐
│        idle          │         │      connecting      │
└──────────────────────┘         └──────────────────────┘
```

## Manual Setup and Testnet Smoke-Test Steps

1. **Install Freighter Extension**:
   - Install Freighter from [freighter.app](https://www.freighter.app/) in Chrome, Firefox, or Brave.
   - Follow Freighter onboarding to create or import a test account. Keep your recovery phrase safe.

2. **Configure Network to Stellar Testnet**:
   - Open Freighter extension settings (gear icon) -> **Network**.
   - Select **Test Net** (Network Passphrase: `Test SDF Network ; September 2015`, Horizon: `https://horizon-testnet.stellar.org`).

3. **Fund Testnet Account**:
   - Copy your public address (`G...`).
   - Fund your test account via Stellar Friendbot at [laboratory.stellar.org/#account-creator](https://laboratory.stellar.org/#account-creator?network=test) or [stellar.org/developers](https://developers.stellar.org).
   - Verify that testnet lumens (XLM) appear in Freighter. Testnet tokens have zero monetary value.

4. **Verify Application Connection (/app)**:
   - Run Feyo locally (`npm run dev`) and visit `http://localhost:3000/app`.
   - Click **Connect Freighter**.
   - Approve the connection prompt in Freighter.
   - Verify that your public address is displayed with the **Stellar Testnet** badge.

5. **Verify Error States**:
   - **Wrong Network**: Switch Freighter network to **Public / Mainnet** and try connecting. Verify that an `Unsupported Network` warning is displayed explaining that Testnet is required.
   - **User Rejection**: Disconnect, initiate connection, and reject or dismiss the Freighter popup. Verify that a `Connection Rejected` notice appears with a **Try Again** button.
   - **Missing Extension**: Open in an incognito window without Freighter enabled. Verify that a `Freighter Not Found` warning appears with an install link.

6. **Verify Disconnection**:
   - Click **Disconnect**.
   - Confirm that the UI resets to the disconnected state and displays an honest notice that local session state was reset.
