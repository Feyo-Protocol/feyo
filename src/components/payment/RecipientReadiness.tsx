"use client";

import { useEffect, useState } from "react";
import type { PaymentAsset } from "@/lib/payments/intent";
import { isValidStellarPublicKey } from "@/lib/stellar/address";
import {
  inspectTestnetRecipientReadiness,
  type TestnetRecipientReadinessResult,
} from "@/lib/stellar/recipient-readiness";

interface RecipientReadinessProps {
  destination: string;
  asset: PaymentAsset;
  /** Changes whenever the source wallet/account/network context changes. */
  contextKey: string;
}

type RecipientReadinessViewState = TestnetRecipientReadinessResult;

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-5)}`;
}

function authorizationLabel(value: string): string {
  switch (value) {
    case "authorized":
      return "Authorized to hold this asset";
    case "maintain_liabilities_only":
      return "Maintain-liabilities-only authorization";
    case "unauthorized":
      return "Not authorized to hold this asset";
    default:
      return "Authorization status not exposed by Horizon";
  }
}

export function RecipientReadiness({
  destination,
  asset,
  contextKey,
}: RecipientReadinessProps) {
  const [state, setState] = useState<RecipientReadinessViewState | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const address = destination.trim();
  const assetKey = asset.type === "native" ? "native:XLM" : `issued:${asset.code}:${asset.issuer}`;

  useEffect(() => {
    if (!isValidStellarPublicKey(address)) return;

    const controller = new AbortController();
    let current = true;

    void inspectTestnetRecipientReadiness(address, asset, {
      signal: controller.signal,
    })
      .then((result) => {
        if (current && !controller.signal.aborted) {
          setState(result);
        }
      })
      .catch((error: unknown) => {
        if (!current || controller.signal.aborted) return;

        setState({
          status: "unknown",
          network: "testnet",
          address,
          message: error instanceof Error
            ? `Recipient readiness lookup failed: ${error.message}`
            : "Recipient readiness lookup failed unexpectedly.",
        });
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [address, asset, assetKey, contextKey, retryCount]);

  const canRetry = state !== null && state.status !== "cancelled";
  const requestIsValid = isValidStellarPublicKey(address);

  return (
    <section className="recipient-readiness" aria-labelledby="recipient-readiness-title">
      <div className="recipient-readiness__heading">
        <div>
          <p className="recipient-readiness__eyebrow">READ-ONLY PREFLIGHT · TESTNET</p>
          <h3 id="recipient-readiness-title">Recipient readiness</h3>
        </div>
        {canRetry && (
          <button
            className="recipient-readiness__retry"
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Check again
          </button>
        )}
      </div>

      {!requestIsValid ? (
        <p className="recipient-readiness__message" role="status">
          Enter a valid Stellar public address to inspect its Testnet account and selected asset trustline. No request is made for an invalid address.
        </p>
      ) : state === null ? (
        <p className="recipient-readiness__message" role="status" aria-live="polite">
          Checking public Stellar Testnet account data…
        </p>
      ) : state.status === "funded_destination" ? (
        <div className="recipient-readiness__result" data-tone="positive" role="status">
          <strong>Funded destination observed</strong>
          <p>Horizon reports a native balance of {state.nativeBalance} XLM for this Testnet account.</p>
        </div>
      ) : state.status === "unfunded_destination" ? (
        <div className="recipient-readiness__result" data-tone="warning" role="status">
          <strong>Destination not present on Testnet</strong>
          <p>{state.message}</p>
        </div>
      ) : state.status === "trustline_missing" ? (
        <div className="recipient-readiness__result" data-tone="warning" role="status">
          <strong>No matching trustline visible</strong>
          <p>
            No trustline for {state.asset.code} from issuer <code title={state.asset.issuer}>{shortAddress(state.asset.issuer)}</code> was returned.
            {state.sameCodeDifferentIssuerFound
              ? " A trustline with the same code but a different issuer is not a match."
              : " The account response may omit trustlines hidden by issuer authorization rules."}
          </p>
        </div>
      ) : state.status === "trustline_present" ? (
        <div className="recipient-readiness__result" data-tone="warning" role="status">
          <strong>Matching {state.asset.code} trustline observed</strong>
          <p>{authorizationLabel(state.trustline.authorization)}.</p>
          <dl className="recipient-readiness__details">
            <div><dt>Issuer</dt><dd><code title={state.asset.issuer}>{state.asset.issuer}</code></dd></div>
            <div><dt>Current balance</dt><dd>{state.trustline.balance} {state.asset.code}</dd></div>
            <div><dt>Reported limit</dt><dd>{state.trustline.limit} {state.asset.code}</dd></div>
            <div><dt>Balance vs. limit</dt><dd>{state.trustline.balanceVsLimit === "at_or_above_reported_limit" ? "At or above reported limit" : state.trustline.balanceVsLimit === "below_reported_limit" ? "Below reported limit" : "Unknown"}</dd></div>
            {state.trustline.buyingLiabilities !== undefined && <div><dt>Buying liabilities</dt><dd>{state.trustline.buyingLiabilities} {state.asset.code}</dd></div>}
            {state.trustline.sellingLiabilities !== undefined && <div><dt>Selling liabilities</dt><dd>{state.trustline.sellingLiabilities} {state.asset.code}</dd></div>}
            {state.latestLedger !== undefined && <div><dt>Latest Horizon ledger</dt><dd>{state.latestLedger.toLocaleString("en-US")}</dd></div>}
          </dl>
          {state.trustline.clawbackEnabled && <p>Issuer clawback is enabled for this trustline.</p>}
          <p className="recipient-readiness__caveat">This is a point-in-time observation. Liabilities, issuer policy changes and future network state can still prevent a payment; Feyo does not guarantee that an incoming payment will succeed.</p>
        </div>
      ) : state.status === "horizon_unavailable" ? (
        <div className="recipient-readiness__result" data-tone="error" role="alert">
          <strong>Horizon unavailable</strong>
          <p>{state.message}</p>
        </div>
      ) : state.status === "malformed_response" || state.status === "unknown" ? (
        <div className="recipient-readiness__result" data-tone="warning" role="status">
          <strong>Recipient readiness unknown</strong>
          <p>{state.message}</p>
        </div>
      ) : state.status === "invalid_request" ? (
        <div className="recipient-readiness__result" data-tone="warning" role="alert">
          <strong>Readiness check not available</strong>
          <p>{state.message}</p>
        </div>
      ) : (
        <p className="recipient-readiness__message" role="status">Recipient readiness lookup was cancelled.</p>
      )}

      <p className="recipient-readiness__footnote">
        Public Horizon data only. This check does not create accounts or trustlines and does not guarantee that a future payment will be accepted.
      </p>
    </section>
  );
}
