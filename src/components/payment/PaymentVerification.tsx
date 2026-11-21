"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  explorerUrl,
  paymentStatusFromVerifiedEvidence,
} from "./status-model";
import {
  DEFAULT_VERIFICATION_TIMEOUT_MS,
  LatestPaymentVerificationRequest,
  prepareTestnetPaymentVerification,
  verifyTestnetPaymentWithTimeout,
  type TestnetPaymentVerificationFormInput,
  type TestnetPaymentVerificationResult,
  type VerificationInputField,
  type VerificationInputIssue,
} from "../../lib/stellar/payment-verification";

const emptyForm: TestnetPaymentVerificationFormInput = {
  transactionHash: "",
  source: "",
  destination: "",
  amount: "",
  assetType: "native",
  assetCode: "",
  issuer: "",
};

const resultCopy = {
  not_found: { label: "Not found", tone: "neutral" },
  failed: { label: "Failed transaction", tone: "danger" },
  mismatched: { label: "Payment mismatch", tone: "warning" },
  invalid_request: { label: "Invalid request", tone: "danger" },
  malformed: { label: "Malformed evidence", tone: "danger" },
  unavailable: { label: "Horizon unavailable", tone: "warning" },
} as const;

function shortValue(value: string): string {
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}

function issueFor(issues: VerificationInputIssue[], field: VerificationInputField) {
  return issues.find((issue) => issue.field === field)?.message;
}

export function PaymentVerification() {
  const [form, setForm] = useState(emptyForm);
  const [issues, setIssues] = useState<VerificationInputIssue[]>([]);
  const [result, setResult] = useState<TestnetPaymentVerificationResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const requestGuard = useRef(new LatestPaymentVerificationRequest());
  const activeController = useRef<AbortController | null>(null);
  const resultHeading = useRef<HTMLHeadingElement | null>(null);

  const invalidate = useCallback(() => {
    activeController.current?.abort(new DOMException("Verification request cancelled.", "AbortError"));
    activeController.current = null;
    requestGuard.current.invalidate();
    setChecking(false);
  }, []);

  useEffect(() => () => {
    activeController.current?.abort(new DOMException("Verification context changed.", "AbortError"));
    requestGuard.current.invalidate();
  }, []);

  const updateField = useCallback(<K extends keyof TestnetPaymentVerificationFormInput,>(
    field: K,
    value: TestnetPaymentVerificationFormInput[K]
  ) => {
    invalidate();
    setIssues([]);
    setResult(null);
    setCancelled(false);
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "assetType" && value === "native"
        ? { assetCode: "", issuer: "" }
        : {}),
    }));
  }, [invalidate]);

  const cancel = useCallback(() => {
    if (!activeController.current) return;
    invalidate();
    setCancelled(true);
    setResult({
      status: "unavailable",
      network: "testnet",
      stage: "transaction",
      message: "Verification was cancelled. No settlement state was changed.",
    });
  }, [invalidate]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    invalidate();
    setCancelled(false);
    const prepared = prepareTestnetPaymentVerification(form);
    if (!prepared.ok) {
      setIssues(prepared.issues);
      setResult({
        status: "invalid_request",
        network: "testnet",
        issues: prepared.issues.map((issue) => issue.message),
        message: "Check the expected payment details. No Horizon request was made.",
      });
      return;
    }

    setIssues([]);
    setResult(null);
    setChecking(true);
    const expected = prepared.expected;
    const token = requestGuard.current.begin(expected);
    const controller = new AbortController();
    activeController.current = controller;
    const next = await verifyTestnetPaymentWithTimeout(expected, {
      signal: controller.signal,
      timeoutMs: DEFAULT_VERIFICATION_TIMEOUT_MS,
    });
    if (!requestGuard.current.isCurrent(token, expected)) return;
    activeController.current = null;
    setChecking(false);
    setResult(next);
  }

  useEffect(() => {
    if (result) resultHeading.current?.focus();
  }, [result]);

  const verifiedPayment = result?.status === "verified"
    ? paymentStatusFromVerifiedEvidence(result.evidence)
    : undefined;
  const verified = result?.status === "verified" && verifiedPayment?.state === "verified";
  const transactionUrl = result?.status === "verified"
    ? explorerUrl(result.evidence.transactionHash, "testnet")
    : result?.status === "failed" || result?.status === "mismatched"
      ? explorerUrl(result.transactionHash, "testnet")
      : undefined;

  const outcome = cancelled
    ? { label: "Verification cancelled", tone: "neutral" as const }
    : result?.status === "unavailable" && result.details?.startsWith("Request timed out after")
      ? { label: "Verification timed out", tone: "warning" as const }
      : verified
        ? { label: "Verified", tone: "success" as const }
        : result && result.status !== "verified"
          ? resultCopy[result.status]
          : null;

  return (
    <section className="workspace-card verification-panel" id="verify" aria-labelledby="verification-title">
      <div className="card-heading">
        <div>
          <p className="card-kicker">05 / NETWORK EVIDENCE</p>
          <h2 id="verification-title">Verify a Testnet payment</h2>
        </div>
        <span className="verification-tag">READ ONLY</span>
      </div>
      <p className="form-intro">
        Compare one public transaction with the payment you expected. This never creates, signs,
        or broadcasts a transaction.
      </p>

      <form className="verification-form" onSubmit={submit} noValidate aria-busy={checking}>
        <div className="verification-field verification-field-wide">
          <label htmlFor="verification-hash">Transaction hash</label>
          <input
            id="verification-hash"
            name="transactionHash"
            autoComplete="off"
            spellCheck={false}
            placeholder="64 hexadecimal characters"
            value={form.transactionHash}
            aria-invalid={!!issueFor(issues, "transactionHash")}
            aria-describedby="verification-hash-help"
            onChange={(event) => updateField("transactionHash", event.target.value)}
          />
          <span className={issueFor(issues, "transactionHash") ? "field-error" : "field-help"} id="verification-hash-help">
            {issueFor(issues, "transactionHash") ?? "Public Stellar Testnet transaction hash"}
          </span>
        </div>

        <div className="verification-field">
          <label htmlFor="verification-source">Expected source</label>
          <input id="verification-source" name="source" autoComplete="off" spellCheck={false} placeholder="G…" value={form.source} aria-invalid={!!issueFor(issues, "source")} aria-describedby="verification-source-help" onChange={(event) => updateField("source", event.target.value)} />
          <span className={issueFor(issues, "source") ? "field-error" : "field-help"} id="verification-source-help">{issueFor(issues, "source") ?? "Account that sent the payment operation"}</span>
        </div>
        <div className="verification-field">
          <label htmlFor="verification-destination">Expected destination</label>
          <input id="verification-destination" name="destination" autoComplete="off" spellCheck={false} placeholder="G…" value={form.destination} aria-invalid={!!issueFor(issues, "destination")} aria-describedby="verification-destination-help" onChange={(event) => updateField("destination", event.target.value)} />
          <span className={issueFor(issues, "destination") ? "field-error" : "field-help"} id="verification-destination-help">{issueFor(issues, "destination") ?? "Account that received the payment operation"}</span>
        </div>

        <div className="verification-field">
          <label htmlFor="verification-asset-type">Asset type</label>
          <select id="verification-asset-type" name="assetType" value={form.assetType} onChange={(event) => updateField("assetType", event.target.value as "native" | "issued")}>
            <option value="native">XLM · Native</option>
            <option value="issued">Issued asset</option>
          </select>
        </div>
        <div className="verification-field">
          <label htmlFor="verification-amount">Exact amount</label>
          <input id="verification-amount" name="amount" inputMode="decimal" placeholder="0.0000000" value={form.amount} aria-invalid={!!issueFor(issues, "amount")} aria-describedby="verification-amount-help" onChange={(event) => updateField("amount", event.target.value)} />
          <span className={issueFor(issues, "amount") ? "field-error" : "field-help"} id="verification-amount-help">{issueFor(issues, "amount") ?? "Exact decimal value, up to 7 places"}</span>
        </div>

        {form.assetType === "issued" && (
          <>
            <div className="verification-field">
              <label htmlFor="verification-asset-code">Asset code</label>
              <input id="verification-asset-code" name="assetCode" autoComplete="off" spellCheck={false} placeholder="USDC" value={form.assetCode} aria-invalid={!!issueFor(issues, "assetCode")} aria-describedby="verification-asset-code-help" onChange={(event) => updateField("assetCode", event.target.value)} />
              <span className={issueFor(issues, "assetCode") ? "field-error" : "field-help"} id="verification-asset-code-help">{issueFor(issues, "assetCode") ?? "Exact on-chain asset code"}</span>
            </div>
            <div className="verification-field">
              <label htmlFor="verification-issuer">Expected issuer</label>
              <input id="verification-issuer" name="issuer" autoComplete="off" spellCheck={false} placeholder="G…" value={form.issuer} aria-invalid={!!issueFor(issues, "issuer")} aria-describedby="verification-issuer-help" onChange={(event) => updateField("issuer", event.target.value)} />
              <span className={issueFor(issues, "issuer") ? "field-error" : "field-help"} id="verification-issuer-help">{issueFor(issues, "issuer") ?? "Required for every issued asset"}</span>
            </div>
          </>
        )}

        <div className="verification-boundary verification-field-wide">
          <span aria-hidden="true">◎</span>
          <div><strong>Official Stellar Testnet Horizon</strong><small>10-second request limit · edits and context changes cancel stale lookups</small></div>
          <span>LOCKED</span>
        </div>
        <div className="verification-actions verification-field-wide">
          <button className="create-draft-button" type="submit" disabled={checking}>
            {checking ? "Checking Horizon…" : "Verify expected payment"}<span>→</span>
          </button>
          {checking && <button className="verification-cancel" type="button" onClick={cancel}>Cancel lookup</button>}
        </div>
      </form>

      <div className="verification-live" aria-live="polite" aria-atomic="true">
        {checking && <p className="verification-checking" role="status"><span className="loading-dot" /> Reading transaction and operation evidence…</p>}
        {result && outcome && (
          <article className={`verification-result ${outcome.tone}`} aria-labelledby="verification-result-title">
            <p className="verification-result-kicker">VERIFICATION OUTCOME</p>
            <h3 id="verification-result-title" ref={resultHeading} tabIndex={-1}>{outcome.label}</h3>
            <p>{result.status === "verified" ? "Horizon confirms a successful transaction with one payment operation matching every expected field." : result.message}</p>
            {result.status === "invalid_request" && <ul>{result.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
            {result.status === "mismatched" && <p><strong>Fields that did not match:</strong> {result.mismatches.join(", ").replace("operation_type", "operation type")}</p>}
            {result.status === "malformed" && <p><strong>Rejected {result.stage} evidence:</strong> {result.details}</p>}
            {result.status === "unavailable" && result.details && <p><strong>Details:</strong> {result.details}</p>}

            {result.status === "verified" && verified && (
              <dl className="verification-evidence">
                <div><dt>Transaction</dt><dd><code title={result.evidence.transactionHash}>{shortValue(result.evidence.transactionHash)}</code></dd></div>
                <div><dt>Ledger</dt><dd>{result.evidence.ledger}</dd></div>
                <div><dt>Operation</dt><dd>{result.evidence.operationId}</dd></div>
                <div><dt>Closed at</dt><dd>{new Date(result.evidence.ledgerClosedAt).toLocaleString()}</dd></div>
                <div><dt>Source</dt><dd><code title={result.evidence.source}>{shortValue(result.evidence.source)}</code></dd></div>
                <div><dt>Destination</dt><dd><code title={result.evidence.destination}>{shortValue(result.evidence.destination)}</code></dd></div>
                <div><dt>Amount</dt><dd>{form.amount} {result.evidence.asset.code}<br /><small>{result.evidence.amountStroops} stroops</small></dd></div>
                {result.evidence.asset.type === "issued" && <div><dt>Issuer</dt><dd><code title={result.evidence.asset.issuer}>{shortValue(result.evidence.asset.issuer)}</code></dd></div>}
              </dl>
            )}
            {(result.status === "failed" || result.status === "mismatched") && (
              <dl className="verification-evidence">
                <div><dt>Transaction</dt><dd><code title={result.transactionHash}>{shortValue(result.transactionHash)}</code></dd></div>
                <div><dt>Ledger</dt><dd>{result.ledger}</dd></div>
              </dl>
            )}
            {transactionUrl && <p className="verification-explorer"><a href={transactionUrl} target="_blank" rel="noopener noreferrer">View this transaction on Stellar Expert Testnet (opens in a new tab)</a></p>}
            <p className="verification-disclaimer">Testnet evidence only. Test assets have no monetary value.</p>
          </article>
        )}
      </div>
    </section>
  );
}
