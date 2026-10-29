import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FreighterAdapter,
  isTestnet,
  isValidStellarPublicKey,
} from "../src/wallet/freighter-adapter";
import {
  STELLAR_TESTNET_PASSPHRASE,
  type FreighterProviderApi,
  type WalletState,
} from "../src/wallet/types";
import { createWalletConnectHandler, WalletConnection } from "../src/components/wallet/WalletConnection";

// Synthetic test key for unit assertions; never a live private key or real account
const TEST_TESTNET_PUBKEY = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

test("isTestnet accurately detects Stellar Testnet passphrase and network names", () => {
  assert.equal(isTestnet("TESTNET", STELLAR_TESTNET_PASSPHRASE), true);
  assert.equal(isTestnet("TESTNET"), true);
  assert.equal(isTestnet("test net"), true);
  assert.equal(isTestnet("PUBLIC", "Public Global Stellar Network ; September 2015"), false);
  assert.equal(isTestnet("PUBLIC"), false);
  assert.equal(isTestnet("FUTURENET", "Test SDF Future Network ; October 2022"), false);
  assert.equal(isTestnet("UNKNOWN_NETWORK"), false);
});

test("isValidStellarPublicKey validates genuine G... keys and rejects secret keys or invalid input", () => {
  assert.equal(isValidStellarPublicKey(TEST_TESTNET_PUBKEY), true);
  // Rejects Stellar secret keys starting with 'S'
  assert.equal(isValidStellarPublicKey("S".repeat(56)), false);
  // Rejects arbitrary strings
  assert.equal(isValidStellarPublicKey("invalid_address"), false);
  assert.equal(isValidStellarPublicKey(null), false);
  assert.equal(isValidStellarPublicKey(undefined), false);
  assert.equal(isValidStellarPublicKey(12345), false);
});

test("FreighterAdapter: successfully connects on supported Stellar Testnet", async () => {
  const mockProvider: FreighterProviderApi = {
    isConnected: async () => ({ isConnected: true }),
    requestAccess: async () => ({ address: TEST_TESTNET_PUBKEY }),
    getAddress: async () => ({ address: TEST_TESTNET_PUBKEY }),
    getNetwork: async () => ({
      network: "TESTNET",
      networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    }),
    getNetworkDetails: async () => ({
      network: "TESTNET",
      networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
      networkUrl: "https://horizon-testnet.stellar.org",
    }),
  };

  const adapter = new FreighterAdapter(mockProvider);
  assert.equal(adapter.getState().status, "idle");

  const state = await adapter.connect();
  assert.equal(state.status, "connected");
  assert.equal(state.account?.address, TEST_TESTNET_PUBKEY);
  assert.equal(state.account?.network.networkPassphrase, STELLAR_TESTNET_PASSPHRASE);
  assert.equal(state.error, null);
});

test("FreighterAdapter: fails safely when Freighter is not installed", async () => {
  const mockProvider: FreighterProviderApi = {
    isConnected: async () => ({ isConnected: false }),
    requestAccess: async () => ({ address: "" }),
    getAddress: async () => ({ address: "" }),
    getNetwork: async () => ({ network: "", networkPassphrase: "" }),
  };

  const adapter = new FreighterAdapter(mockProvider);
  const state = await adapter.connect();

  assert.equal(state.status, "error");
  assert.equal(state.account, null);
  assert.equal(state.error?.code, "not_installed");
  assert.match(state.error!.message, /not installed/i);
});

test("FreighterAdapter: fails safely when user rejects connection request", async () => {
  const mockProvider: FreighterProviderApi = {
    isConnected: async () => ({ isConnected: true }),
    requestAccess: async () => ({ address: "", error: "User declined access" }),
    getAddress: async () => ({ address: "" }),
    getNetwork: async () => ({ network: "TESTNET" }),
  };

  const adapter = new FreighterAdapter(mockProvider);
  const state = await adapter.connect();

  assert.equal(state.status, "error");
  assert.equal(state.account, null);
  assert.equal(state.error?.code, "user_rejected");
  assert.match(state.error!.message, /not authorized|rejected/i);
});

test("FreighterAdapter: fails safely when connected to Mainnet or unsupported network", async () => {
  const mockProvider: FreighterProviderApi = {
    isConnected: async () => ({ isConnected: true }),
    requestAccess: async () => ({ address: TEST_TESTNET_PUBKEY }),
    getAddress: async () => ({ address: TEST_TESTNET_PUBKEY }),
    getNetwork: async () => ({
      network: "PUBLIC",
      networkPassphrase: "Public Global Stellar Network ; September 2015",
    }),
    getNetworkDetails: async () => ({
      network: "PUBLIC",
      networkPassphrase: "Public Global Stellar Network ; September 2015",
      networkUrl: "https://horizon.stellar.org",
    }),
  };

  const adapter = new FreighterAdapter(mockProvider);
  const state = await adapter.connect();

  assert.equal(state.status, "error");
  assert.equal(state.account, null);
  assert.equal(state.error?.code, "unsupported_network");
  assert.match(state.error!.message, /requires Stellar Testnet/i);
});

test("FreighterAdapter: disconnect resets local state to idle without claiming revocation", async () => {
  const mockProvider: FreighterProviderApi = {
    isConnected: async () => ({ isConnected: true }),
    requestAccess: async () => ({ address: TEST_TESTNET_PUBKEY }),
    getAddress: async () => ({ address: TEST_TESTNET_PUBKEY }),
    getNetwork: async () => ({
      network: "TESTNET",
      networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    }),
  };

  const adapter = new FreighterAdapter(mockProvider);
  await adapter.connect();
  assert.equal(adapter.getState().status, "connected");

  const disconnectedState = adapter.disconnect();
  assert.equal(disconnectedState.status, "idle");
  assert.equal(disconnectedState.account, null);
  assert.equal(disconnectedState.error, null);
});

test("WalletConnection component: renders initial disconnected state with connect action", () => {
  const html = renderToStaticMarkup(<WalletConnection />);
  assert.match(html, /Stellar Testnet Wallet/);
  assert.match(html, /Connect Freighter/);
  assert.match(html, /Disconnected/);
  assert.match(html, /secret keys are never accessed or stored/);
});

test("Connect Freighter button handler calls the real adapter and reports its result", async () => {
  let requestAccessCalls = 0;
  const adapter = new FreighterAdapter({
    isConnected: async () => ({ isConnected: true }),
    requestAccess: async () => {
      requestAccessCalls += 1;
      return { address: "", error: "User declined access" };
    },
    getAddress: async () => ({ address: "" }),
    getNetwork: async () => ({ network: "TESTNET" }),
  });
  const states: WalletState[] = [];
  const clickHandler = createWalletConnectHandler(adapter, (state) => states.push(state));

  await clickHandler();

  assert.equal(requestAccessCalls, 1);
  assert.deepEqual(states.map((state) => state.status), ["connecting", "error"]);
  assert.equal(states.at(-1)?.error?.code, "user_rejected");
});

test("WalletConnection component: renders accessible elements and error alerts", () => {
  const mockProvider: FreighterProviderApi = {
    isConnected: async () => ({ isConnected: false }),
    requestAccess: async () => ({ address: "" }),
    getAddress: async () => ({ address: "" }),
    getNetwork: async () => ({ network: "" }),
  };

  const html = renderToStaticMarkup(<WalletConnection customProvider={mockProvider} />);
  assert.match(html, /role="region"|aria-label="Freighter Wallet Connection"/);
  assert.match(html, /data-testid="wallet-status-badge"/);
});
