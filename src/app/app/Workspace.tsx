"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WalletConnection } from "@/components/wallet/WalletConnection";
import { PaymentStatus } from "@/components/payment/PaymentStatus";
import type { PaymentStatusData } from "@/components/payment/status-model";
import { createPaymentIntent, createPaymentIntentId, type PaymentAsset, type PaymentValidationIssue } from "@/lib/payments/intent";
import { fetchTestnetAccountBalances, LatestBalanceRequest, type StellarAssetBalance, type StellarBalanceError } from "@/lib/stellar/account-balances";
import type { WalletState } from "@/wallet/types";

type BalanceState = { address: string; balances: StellarAssetBalance[] } | { address: string; error: StellarBalanceError } | null;

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-5)}`;
}

export default function Workspace() {
  const [wallet, setWallet] = useState<WalletState>({ status: "idle", account: null, error: null });
  const [balanceState, setBalanceState] = useState<BalanceState>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const balanceRequest = useRef(new LatestBalanceRequest());
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [assetKey, setAssetKey] = useState("native:XLM");
  const [issues, setIssues] = useState<PaymentValidationIssue[]>([]);
  const [draft, setDraft] = useState<PaymentStatusData | null>(null);
  const [draftSummary, setDraftSummary] = useState<{ amount: string; asset: string; issuer?: string; recipient: string } | null>(null);

  const activeAddress = wallet.status === "connected" ? wallet.account?.address : undefined;

  useEffect(() => {
    const requestGuard = balanceRequest.current;
    if (!activeAddress) {
      requestGuard.invalidate();
      return;
    }
    const currentRequest = requestGuard.begin(activeAddress);
    const controller = new AbortController();
    void fetchTestnetAccountBalances(activeAddress, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || !requestGuard.isCurrent(currentRequest, activeAddress)) return;
      if (result.ok) setBalanceState({ address: activeAddress, balances: result.value.balances });
      else setBalanceState({ address: activeAddress, error: result.error });
    });
    return () => {
      controller.abort();
      requestGuard.invalidate();
    };
  }, [activeAddress, refreshCount]);

  const balances = balanceState && activeAddress && balanceState.address === activeAddress && "balances" in balanceState ? balanceState.balances : null;
  const balanceLoading = !!activeAddress && (!balanceState || balanceState.address !== activeAddress);

  const assets = useMemo(() => {
    const available: PaymentAsset[] = [{ type: "native", code: "XLM" }];
    for (const balance of balances ?? []) {
      if (balance.kind === "issued") available.push({ type: "issued", code: balance.code, issuer: balance.issuer });
    }
    return available;
  }, [balances]);

  const handleWalletState = useCallback((state: WalletState) => {
    if (state.status !== "connected" || state.account?.address !== balanceRequest.current.getCurrentAddress() || state.account?.network.networkPassphrase !== wallet.account?.network.networkPassphrase) {
      setBalanceState(null);
      balanceRequest.current.invalidate();
      setAssetKey("native:XLM");
    }
    setWallet(state);
  }, [wallet.account?.network.networkPassphrase]);

  function selectedAsset(): PaymentAsset {
    return assets.find((asset) => asset.type === "native" ? assetKey === "native:XLM" : assetKey === `issued:${asset.code}:${asset.issuer}`) ?? { type: "native", code: "XLM" };
  }

  function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const asset = selectedAsset();
    const result = createPaymentIntent({
      intentId: createPaymentIntentId(),
      idempotencyKey: globalThis.crypto.randomUUID(),
      destination: recipient,
      amount,
      asset,
      network: "testnet",
    });
    if (!result.ok) {
      setIssues(result.issues);
      setDraft(null);
      setDraftSummary(null);
      return;
    }
    setIssues([]);
    setDraft({ state: "draft", source: "local", network: "testnet" });
    setDraftSummary({ amount: result.intent.amount.value, asset: result.intent.asset.code, issuer: result.intent.asset.type === "issued" ? result.intent.asset.issuer : undefined, recipient: result.intent.destination });
  }

  const fieldError = (field: string) => issues.find((issue) => issue.field === field)?.message;
  const currentAsset = selectedAsset();

  return (
    <main className="workspace-shell">
      <header className="workspace-nav">
        <Link className="workspace-brand" href="/"><span>f</span> feyo</Link>
        <nav aria-label="Workspace navigation">
          <a href="#overview">Overview</a><a href="#balances">Balances</a><a href="#draft">New draft</a>
          <Link href="/docs/stellar">Docs</Link>
        </nav>
        <details className="workspace-mobile-menu"><summary aria-label="Open workspace navigation">Menu</summary><div><a href="#overview">Overview</a><a href="#balances">Balances</a><a href="#draft">New draft</a><Link href="/docs/stellar">Docs</Link></div></details>
        <span className="network-pill"><i /> Stellar Testnet</span>
      </header>

      <section className="workspace-heading" id="overview">
        <div><p className="workspace-eyebrow">Testnet workspace <span>•</span> Read only</p><h1>Payments, prepared with care.</h1>
          <p>Review public balances and prepare a payment intent. Nothing here signs, submits, or verifies a transaction.</p></div>
        <div className="workspace-heading-meta"><span className="meta-label">NETWORK</span><strong>Stellar Testnet</strong><small>Test assets have no monetary value</small></div>
      </section>

      <div className="workspace-grid">
        <section className="workspace-card wallet-panel" aria-labelledby="wallet-title">
          <div className="card-heading"><div><p className="card-kicker">01 / ACCOUNT</p><h2 id="wallet-title">Connect your wallet</h2></div><span className={`connection-indicator ${wallet.status}`}>{wallet.status === "connected" ? "Connected" : wallet.status === "error" && wallet.error?.code === "unsupported_network" ? "Wrong network" : wallet.status === "error" ? "Connection issue" : wallet.status === "connecting" ? "Connecting" : "Disconnected"}</span></div>
          <WalletConnection onStateChange={handleWalletState} />
          {wallet.status === "connected" && wallet.account && <p className="connected-account"><span>ACTIVE ACCOUNT</span><code title={wallet.account.address}>{shortAddress(wallet.account.address)}</code></p>}
        </section>

        <section className="workspace-card balances-panel" id="balances" aria-labelledby="balances-title">
          <div className="card-heading"><div><p className="card-kicker">02 / PORTFOLIO</p><h2 id="balances-title">Testnet balances</h2></div><button className="refresh-button" type="button" disabled={!activeAddress || balanceLoading} onClick={() => { setBalanceState(null); setRefreshCount((n) => n + 1); }}>{balanceLoading ? "Loading…" : "↻ Refresh"}</button></div>
          {!activeAddress ? <div className="balance-empty"><span className="empty-icon">↗</span><strong>Connect a Testnet account</strong><p>Your public XLM and issued asset balances will appear here.</p></div> : balanceLoading ? <div className="balance-loading" role="status"><span className="loading-dot" /> Reading public account data from Testnet Horizon…</div> : balanceState && "error" in balanceState ? <div className={`balance-message ${balanceState.error.code === "unfunded_account" ? "informational" : "error"}`} role={balanceState.error.code === "unfunded_account" ? "status" : "alert"}><strong>{balanceState.error.code === "unfunded_account" ? "Account not funded" : balanceState.error.code === "network_error" || balanceState.error.code === "endpoint_unavailable" ? "Horizon unavailable" : "Could not read balances"}</strong><p>{balanceState.error.message}</p><button type="button" onClick={() => { setBalanceState(null); setRefreshCount((n) => n + 1); }}>Try again</button></div> : balanceState && balanceState.balances.length === 0 ? <div className="balance-message informational" role="status"><strong>No balances reported</strong><p>Horizon returned an empty balance list for this funded account.</p></div> : balanceState && <div className="balance-list">{balanceState.balances.map((balance) => <article className="balance-row" key={balance.kind === "native" ? "native" : `${balance.code}:${balance.issuer}`}><span className="asset-symbol">{balance.kind === "native" ? "✳" : balance.code.slice(0, 2)}</span><span className="balance-asset"><strong>{balance.code}</strong><small>{balance.kind === "native" ? "Native asset" : <><span>Issued asset · issuer </span><code title={balance.issuer}>{shortAddress(balance.issuer)}</code></>}</small></span><strong className="balance-amount">{balance.balance}<small>{balance.code}</small></strong></article>)}</div>}
          <p className="data-source-note">Source: Stellar Testnet Horizon · public data only</p>
        </section>

        <section className="workspace-card draft-panel" id="draft" aria-labelledby="draft-title">
          <div className="card-heading"><div><p className="card-kicker">03 / PAYMENT INTENT</p><h2 id="draft-title">Prepare a payment draft</h2></div><span className="draft-tag">LOCAL ONLY</span></div>
          <p className="form-intro">This validates details and creates a local draft. It cannot authorize or send funds.</p>
          <form className="draft-form" onSubmit={saveDraft} noValidate>
            <label htmlFor="recipient">Recipient public address</label><input id="recipient" name="recipient" autoComplete="off" spellCheck={false} placeholder="G…" value={recipient} aria-invalid={!!fieldError("destination")} aria-describedby={fieldError("destination") ? "recipient-error" : "recipient-help"} onChange={(e) => setRecipient(e.target.value)} />{fieldError("destination") ? <span className="field-error" id="recipient-error">{fieldError("destination")}</span> : <span className="field-help" id="recipient-help">Stellar public key beginning with G</span>}
            <div className="form-row"><div><label htmlFor="asset">Asset</label><select id="asset" value={assetKey} onChange={(e) => setAssetKey(e.target.value)}>{assets.map((asset) => { const key = asset.type === "native" ? "native:XLM" : `issued:${asset.code}:${asset.issuer}`; return <option key={key} value={key}>{asset.type === "native" ? "XLM · Native" : `${asset.code} · ${shortAddress(asset.issuer)}`}</option>; })}</select>{currentAsset.type === "issued" && <span className="field-help issuer-full">Issuer: <code>{currentAsset.issuer}</code></span>}</div><div><label htmlFor="amount">Exact amount</label><div className="amount-input"><input id="amount" name="amount" inputMode="decimal" placeholder="0.00" value={amount} aria-invalid={!!fieldError("amount")} aria-describedby={fieldError("amount") ? "amount-error" : "amount-help"} onChange={(e) => setAmount(e.target.value)} /><span>{currentAsset.code}</span></div>{fieldError("amount") ? <span className="field-error" id="amount-error">{fieldError("amount")}</span> : <span className="field-help" id="amount-help">Up to 7 decimal places</span>}</div></div>
            {fieldError("asset") && <p className="field-error" role="alert">{fieldError("asset")}</p>}
            <div className="testnet-lock"><span>◎</span><div><strong>Stellar Testnet</strong><small>Network is fixed for this workspace.</small></div><span className="lock-label">LOCKED</span></div>
            <button className="create-draft-button" type="submit">Create local draft <span>→</span></button>
          </form>
          {draftSummary && <div className="draft-summary" aria-live="polite"><strong>{draftSummary.amount} {draftSummary.asset} draft created</strong><code>To {shortAddress(draftSummary.recipient)}</code>{draftSummary.issuer && <code>Issuer {draftSummary.issuer}</code>}</div>}
        </section>

        <section className="workspace-status" aria-label="Draft lifecycle"><div className="status-intro"><p className="card-kicker">04 / LIFECYCLE</p><h2>Intent status</h2><p>A draft stays local until an execution flow exists.</p></div><PaymentStatus payment={draft} /></section>
      </div>
      <footer className="workspace-footer"><span>FEYO · OPEN SOURCE STELLAR FINTECH</span><span>Testnet only · No signing · No broadcasting</span><Link href="/docs/roadmap">Product roadmap ↗</Link></footer>
    </main>
  );
}
