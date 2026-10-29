"use client";

import React, { useEffect, useState } from "react";
import type { FreighterProviderApi, WalletState } from "../../wallet/types";
import { FreighterAdapter, defaultFreighterProvider } from "../../wallet/freighter-adapter";

export interface WalletConnectionProps {
  customProvider?: FreighterProviderApi;
  onStateChange?: (state: WalletState) => void;
}

export function createWalletConnectHandler(
  adapter: Pick<FreighterAdapter, "connect">,
  setState: (state: WalletState) => void,
  onStateChange?: (state: WalletState) => void,
  clearNotice?: () => void
): () => Promise<void> {
  return async () => {
    clearNotice?.();
    const connecting: WalletState = { status: "connecting", account: null, error: null };
    setState(connecting);
    onStateChange?.(connecting);
    try {
      const nextState = await adapter.connect();
      setState(nextState);
      onStateChange?.(nextState);
    } catch (unexpected) {
      const nextState: WalletState = {
        status: "error",
        account: null,
        error: {
          code: "unknown",
          message: "An unexpected error occurred while connecting to Freighter.",
          details: unexpected instanceof Error ? unexpected.message : String(unexpected),
        },
      };
      setState(nextState);
      onStateChange?.(nextState);
    }
  };
}

export function WalletConnection({
  customProvider,
  onStateChange,
}: WalletConnectionProps): React.JSX.Element {
  const [adapter] = useState(
    () => new FreighterAdapter(customProvider ?? defaultFreighterProvider)
  );
  const [walletState, setWalletState] = useState<WalletState>(adapter.getState());
  const [copied, setCopied] = useState<boolean>(false);
  const [disconnectedNotice, setDisconnectedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (walletState.status !== "connected") return;
    let active = true;
    const poll = async () => {
      const next = await adapter.refresh();
      if (active && next !== walletState) {
        setWalletState(next);
        onStateChange?.(next);
      }
    };
    const timer = window.setInterval(poll, 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [adapter, onStateChange, walletState]);

  const handleConnect = createWalletConnectHandler(
    adapter,
    setWalletState,
    onStateChange,
    () => setDisconnectedNotice(null)
  );

  const handleDisconnect = () => {
    const nextState = adapter.disconnect();
    setWalletState(nextState);
    setCopied(false);
    setDisconnectedNotice(
      "Local session disconnected. Note: Freighter extension permissions remain managed in your browser extension."
    );
    onStateChange?.(nextState);
  };

  const handleCopy = async () => {
    if (!walletState.account?.address) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(walletState.account.address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback or ignore in non-interactive tests
    }
  };

  const { status, account, error } = walletState;

  return (
    <section className="wallet-connection" aria-label="Freighter Wallet Connection">
      <div className="wallet-connection-header">
        <h2 className="wallet-connection-title">Stellar Testnet Wallet</h2>
        <span
          className={`wallet-badge ${status}`}
          data-testid="wallet-status-badge"
          aria-live="polite"
        >
          {status === "connected" && "● Connected"}
          {status === "connecting" && "◐ Connecting"}
          {status === "error" && "▲ Attention required"}
          {status === "idle" && "○ Disconnected"}
        </span>
      </div>

      <div className="wallet-connection-body">
        {status === "idle" && (
          <>
            <p className="wallet-description">
              Connect your Freighter browser extension on <strong>Stellar Testnet</strong> to
              interact with Feyo. No transaction is initiated and secret keys are never accessed
              or stored.
            </p>

            {disconnectedNotice && (
              <p className="wallet-notice" role="status">
                {disconnectedNotice}
              </p>
            )}

            <div className="wallet-actions">
              <button
                type="button"
                className="wallet-button wallet-button-primary"
                onClick={handleConnect}
              >
                Connect Freighter
              </button>
            </div>
          </>
        )}

        {status === "connecting" && (
          <>
            <p className="wallet-description" aria-live="polite">
              Requesting authorization from Freighter... Please approve the access prompt in your
              browser extension.
            </p>
            <div className="wallet-actions">
              <button
                type="button"
                className="wallet-button wallet-button-primary"
                disabled
                aria-busy="true"
              >
                Connecting...
              </button>
            </div>
          </>
        )}

        {status === "error" && error && (
          <>
            <div
              className="wallet-error-alert"
              role="alert"
              aria-live="assertive"
              data-testid="wallet-error-alert"
            >
              <strong>
                {error.code === "not_installed" && "Freighter Not Found"}
                {error.code === "user_rejected" && "Connection Rejected"}
                {error.code === "unsupported_network" && "Unsupported Network"}
                {error.code === "connection_lost" && "Connection Lost"}
                {error.code === "unknown" && "Connection Error"}
              </strong>
              <p style={{ margin: "4px 0 0" }}>{error.message}</p>
              {error.details && <p className="wallet-error-details">{error.details}</p>}
            </div>

            <div className="wallet-actions">
              <button
                type="button"
                className="wallet-button wallet-button-primary"
                onClick={handleConnect}
              >
                Try Again
              </button>
              {error.code === "not_installed" && (
                <a
                  href="https://freighter.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wallet-button wallet-button-secondary"
                >
                  Install Freighter ↗
                </a>
              )}
            </div>
          </>
        )}

        {status === "connected" && account && (
          <>
            <div className="wallet-account-details" data-testid="wallet-account-details">
              <div>
                <span className="wallet-field-label">Public Address</span>
                <div className="wallet-field-value" data-testid="wallet-public-address">
                  {account.address}
                </div>
              </div>

              <div>
                <span className="wallet-field-label">Network</span>
                <div className="wallet-field-network">
                  <strong>Stellar Testnet</strong> ({account.network.networkPassphrase})
                </div>
              </div>
            </div>

            <p className="wallet-notice">
              Stellar Testnet assets have no real monetary value. Secret keys remain strictly
              isolated within your hardware or Freighter extension.
            </p>

            <div className="wallet-actions">
              <button
                type="button"
                className="wallet-button wallet-button-secondary"
                onClick={handleCopy}
              >
                {copied ? "Copied address" : "Copy address"}
              </button>
              <button
                type="button"
                className="wallet-button wallet-button-secondary"
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
