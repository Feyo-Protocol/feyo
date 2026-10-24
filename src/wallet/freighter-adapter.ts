import * as freighter from "@stellar/freighter-api";
import { StrKey } from "@stellar/stellar-sdk";
import {
  STELLAR_TESTNET_NAME,
  STELLAR_TESTNET_PASSPHRASE,
  type FreighterProviderApi,
  type WalletAccount,
  type WalletError,
  type WalletErrorCode,
  type WalletState,
} from "./types";

/**
 * Validates if the given network details match the supported Stellar Testnet.
 */
export function isTestnet(network: string, passphrase?: string): boolean {
  if (passphrase) {
    return passphrase.trim() === STELLAR_TESTNET_PASSPHRASE;
  }
  const normalized = network.trim().toUpperCase();
  return normalized === STELLAR_TESTNET_NAME || normalized === "TEST NET";
}

/**
 * Validates whether an address is a valid Stellar public key (starts with 'G').
 * Rejects private keys ('S...') or malformed addresses.
 */
export function isValidStellarPublicKey(address: unknown): boolean {
  if (typeof address !== "string" || !address.startsWith("G") || address.length !== 56) {
    return false;
  }
  try {
    return StrKey.isValidEd25519PublicKey(address);
  } catch {
    return false;
  }
}

/**
 * Creates an error descriptor for wallet integration issues.
 */
export function createWalletError(
  code: WalletErrorCode,
  message: string,
  details?: string
): WalletError {
  return { code, message, details };
}

/**
 * Default provider implementation delegating to the installed @stellar/freighter-api package.
 */
export const defaultFreighterProvider: FreighterProviderApi = {
  isConnected: () => freighter.isConnected(),
  isAllowed: () => (freighter.isAllowed ? freighter.isAllowed() : Promise.resolve({ isAllowed: false })),
  requestAccess: () => freighter.requestAccess(),
  getAddress: () => freighter.getAddress(),
  getNetwork: () => freighter.getNetwork(),
  getNetworkDetails: () => (freighter.getNetworkDetails ? freighter.getNetworkDetails() : freighter.getNetwork()),
};

/**
 * Isolated typed adapter managing connection states with Freighter wallet.
 * Explicitly bound to Stellar Testnet; strictly excludes secret key handling or transaction signing.
 */
export class FreighterAdapter {
  private provider: FreighterProviderApi;
  private state: WalletState = { status: "idle", account: null, error: null };
  private listeners: Set<(state: WalletState) => void> = new Set();

  constructor(provider: FreighterProviderApi = defaultFreighterProvider) {
    this.provider = provider;
  }

  /**
   * Retrieves the current immutable snapshot of the wallet state.
   */
  public getState(): WalletState {
    return this.state;
  }

  /**
   * Subscribes to wallet state changes. Returns an unsubscribe teardown function.
   */
  public subscribe(listener: (state: WalletState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(newState: WalletState): void {
    this.state = newState;
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  /**
   * Initiates a genuine connection to Freighter on Stellar Testnet without initiating any transaction.
   */
  public async connect(): Promise<WalletState> {
    this.setState({ status: "connecting", account: null, error: null });

    try {
      // 1. Verify Freighter is present in the browser
      let connectedCheck: { isConnected: boolean; error?: unknown };
      try {
        connectedCheck = await this.provider.isConnected();
      } catch (err) {
        const error = createWalletError(
          "not_installed",
          "Freighter wallet was not detected. Please install Freighter from https://freighter.app and refresh.",
          err instanceof Error ? err.message : String(err)
        );
        this.setState({ status: "error", account: null, error });
        return this.state;
      }

      if (!connectedCheck.isConnected) {
        const error = createWalletError(
          "not_installed",
          "Freighter wallet is not installed or enabled. Install the Freighter browser extension to continue.",
          connectedCheck.error ? String(connectedCheck.error) : undefined
        );
        this.setState({ status: "error", account: null, error });
        return this.state;
      }

      // 2. Request user access
      let accessResult: { address: string; error?: unknown };
      try {
        accessResult = await this.provider.requestAccess();
      } catch (err) {
        const error = createWalletError(
          "user_rejected",
          "Connection request was rejected or dismissed in Freighter.",
          err instanceof Error ? err.message : String(err)
        );
        this.setState({ status: "error", account: null, error });
        return this.state;
      }

      if (accessResult.error || !accessResult.address) {
        const error = createWalletError(
          "user_rejected",
          "Freighter connection request was not authorized by the user.",
          accessResult.error ? String(accessResult.error) : undefined
        );
        this.setState({ status: "error", account: null, error });
        return this.state;
      }

      const address = accessResult.address;
      if (!isValidStellarPublicKey(address)) {
        const error = createWalletError(
          "unknown",
          "Received an invalid public address from Freighter. Expected an Ed25519 public key (G...)."
        );
        this.setState({ status: "error", account: null, error });
        return this.state;
      }

      // 3. Inspect and strictly validate network (Stellar Testnet requirement)
      let networkDetails: {
        network: string;
        networkPassphrase?: string;
        networkUrl?: string;
        sorobanRpcUrl?: string;
        error?: unknown;
      };

      try {
        if (this.provider.getNetworkDetails) {
          networkDetails = await this.provider.getNetworkDetails();
        } else {
          networkDetails = await this.provider.getNetwork();
        }
      } catch (err) {
        const error = createWalletError(
          "unknown",
          "Failed to retrieve active network details from Freighter.",
          err instanceof Error ? err.message : String(err)
        );
        this.setState({ status: "error", account: null, error });
        return this.state;
      }

      const activeNetwork = networkDetails.network || "";
      const activePassphrase = networkDetails.networkPassphrase || "";

      if (!isTestnet(activeNetwork, activePassphrase)) {
        const error = createWalletError(
          "unsupported_network",
          `Freighter is set to ${activeNetwork || "an unsupported network"}. Feyo requires Stellar Testnet (${STELLAR_TESTNET_PASSPHRASE}) in this milestone.`,
          `Detected passphrase: "${activePassphrase}"`
        );
        this.setState({ status: "error", account: null, error });
        return this.state;
      }

      // 4. Success: store only public address and network details in memory
      const account: WalletAccount = {
        address,
        network: {
          network: activeNetwork,
          networkPassphrase: activePassphrase || STELLAR_TESTNET_PASSPHRASE,
          networkUrl: networkDetails.networkUrl,
          sorobanRpcUrl: networkDetails.sorobanRpcUrl,
        },
      };

      this.setState({ status: "connected", account, error: null });
      return this.state;
    } catch (unexpected) {
      const error = createWalletError(
        "unknown",
        "An unexpected error occurred while connecting to Freighter.",
        unexpected instanceof Error ? unexpected.message : String(unexpected)
      );
      this.setState({ status: "error", account: null, error });
      return this.state;
    }
  }

  /**
   * Resets the local application connection state without claiming that
   * Freighter browser extension permissions were revoked.
   */
  public disconnect(): WalletState {
    this.setState({ status: "idle", account: null, error: null });
    return this.state;
  }
}
