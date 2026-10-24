/**
 * Strongly-typed adapter contract for Freighter wallet connection on Stellar Testnet.
 * Adheres strictly to read-only public address access without secret keys,
 * custodial storage, or transaction signing.
 */

export const STELLAR_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export const STELLAR_TESTNET_NAME = "TESTNET";

export type WalletStatus = "idle" | "connecting" | "connected" | "error";

export type WalletErrorCode =
  | "not_installed"
  | "user_rejected"
  | "unsupported_network"
  | "connection_lost"
  | "unknown";

export interface WalletError {
  code: WalletErrorCode;
  message: string;
  details?: string;
}

export interface WalletNetwork {
  network: string;
  networkPassphrase: string;
  networkUrl?: string;
  sorobanRpcUrl?: string;
}

export interface WalletAccount {
  /** The Stellar G... public key/address. Secret keys are never requested or stored. */
  address: string;
  network: WalletNetwork;
}

export interface WalletState {
  status: WalletStatus;
  account: WalletAccount | null;
  error: WalletError | null;
}

/**
 * Pluggable provider interface mapping to @stellar/freighter-api methods.
 * Facilitates dependency injection for mocked-provider testing and SSR safety.
 */
export interface FreighterProviderApi {
  isConnected: () => Promise<{ isConnected: boolean; error?: unknown }>;
  isAllowed?: () => Promise<{ isAllowed: boolean; error?: unknown }>;
  requestAccess: () => Promise<{ address: string; error?: unknown }>;
  getAddress: () => Promise<{ address: string; error?: unknown }>;
  getNetwork: () => Promise<{ network: string; networkPassphrase?: string; error?: unknown }>;
  getNetworkDetails?: () => Promise<{
    network: string;
    networkUrl?: string;
    networkPassphrase?: string;
    sorobanRpcUrl?: string;
    error?: unknown;
  }>;
}
