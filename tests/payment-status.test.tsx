import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentStatus } from "../src/components/payment/PaymentStatus";
import {
  displayState,
  explorerUrl,
  hasVerification,
  paymentStatusFromVerifiedEvidence,
  statusCopy,
  type PaymentStatusData,
  type PaymentStatusState,
} from "../src/components/payment/status-model";
import {
  verifyTestnetPayment,
  type TestnetHorizonVerificationClient,
  type VerifiedTestnetPaymentEvidence,
} from "../src/lib/stellar/payment-verification";
import { STELLAR_TESTNET_PASSPHRASE } from "../src/lib/stellar/network";

const hash = "ab".repeat(32);
const source = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const destination = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";

async function verifiedPayment(): Promise<PaymentStatusData> {
  const transaction = {
    hash,
    ledger: 123,
    successful: true,
    created_at: "2026-11-20T10:00:00Z",
    source_account: source,
    operation_count: 1,
  };
  const operation = {
    id: "123",
    transaction_hash: hash,
    transaction_successful: true,
    source_account: source,
    type: "payment",
    from: source,
    to: destination,
    amount: "1.0000000",
    asset_type: "native",
  };
  const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  const client: TestnetHorizonVerificationClient = {
    horizonUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    getTransaction: async () => response(transaction),
    getOperations: async () => response({ _embedded: { records: [operation] } }),
  };
  const result = await verifyTestnetPayment({
    network: "testnet",
    transactionHash: hash,
    source,
    destination,
    amountStroops: BigInt(10000000),
    asset: { type: "native", code: "XLM" },
  }, { client });
  assert.equal(result.status, "verified");
  if (result.status !== "verified") throw new Error("Expected verified fixture evidence.");
  const payment = paymentStatusFromVerifiedEvidence(result.evidence);
  assert.ok(payment);
  return payment;
}

for (const state of Object.keys(statusCopy) as PaymentStatusState[]) {
  test(`renders ${state} with text, decorative icon, and a current timeline step`, async () => {
    const verified = await verifiedPayment();
    const html = renderToStaticMarkup(<PaymentStatus payment={{ ...verified, state }} />);
    assert.ok(html.includes(statusCopy[state].label));
    assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
    assert.match(html, /aria-hidden="true"/);
    assert.equal((html.match(/aria-current="step"/g) ?? []).length, 1);
    assert.match(html, /not a record of completed steps/);
  });
}

test("only opaque evidence produced by the verifier permits verification", async () => {
  const verified = await verifiedPayment();
  assert.equal(hasVerification(verified), true);
  const invalid: PaymentStatusData[] = [
    { ...verified, source: "mock" }, { ...verified, source: "local" },
    { ...verified, verification: undefined }, { ...verified, network: undefined },
    { ...verified, transactionHash: "fake" },
    {
      ...verified,
      verification: {
        ...verified.verification!,
        transactionHash: "cd".repeat(32),
      } as VerifiedTestnetPaymentEvidence,
    },
  ];
  for (const data of invalid) {
    assert.equal(hasVerification(data), false);
    assert.equal(displayState(data), "confirming");
    const html = renderToStaticMarkup(<PaymentStatus payment={data} />);
    assert.match(html, /remains unverified/);
    assert.doesNotMatch(html, /Network evidence confirms/);
  }
});

test("a locally created draft remains draft and explicitly unverified", () => {
  const html = renderToStaticMarkup(<PaymentStatus payment={{ state: "draft", source: "local", network: "testnet" }} />);
  assert.match(html, /Local status only/);
  assert.match(html, /Nothing has been submitted/);
  assert.doesNotMatch(html, /Network evidence confirms/);
});

test("explorer validates the full hash and explicit supported network", () => {
  for (const network of ["public", "testnet"]) {
    assert.equal(explorerUrl(hash.toUpperCase(), network), `https://stellar.expert/explorer/${network}/tx/${hash}`);
  }
  for (const value of [undefined, null, "", "fake", hash + "\n", hash + "/", "g".repeat(64), hash.slice(1)]) {
    assert.equal(explorerUrl(value, "testnet"), undefined);
  }
  for (const network of [undefined, null, "mainnet", "futurenet", "__proto__"]) {
    assert.equal(explorerUrl(hash, network), undefined);
  }
});

test("mock and local data never expose explorer links, even with hash-shaped input", async () => {
  const verified = await verifiedPayment();
  for (const source of ["mock", "local"] as const) {
    const html = renderToStaticMarkup(<PaymentStatus payment={{ ...verified, source }} />);
    assert.doesNotMatch(html, /href=/);
    assert.doesNotMatch(html, /Network evidence confirms/);
  }
});

test("network link names its network and testnet verification qualifies value", async () => {
  const verified = await verifiedPayment();
  const html = renderToStaticMarkup(<PaymentStatus payment={verified} />);
  assert.match(html, /href="https:\/\/stellar.expert\/explorer\/testnet\/tx\//);
  assert.match(html, /Stellar Testnet explorer/);
  assert.match(html, /Test assets have no real monetary value/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("empty and lookup failure states do not claim transaction failure or verification", () => {
  const html = renderToStaticMarkup(<PaymentStatus lookupError="Service unavailable" onRetry={() => {}} />);
  assert.match(html, /No payment selected/);
  assert.match(html, /role="alert"/);
  assert.match(html, /Retry status check/);
  assert.doesNotMatch(html, /href=|aria-current|Network evidence confirms/);
});

test("retry stays controlled, disabled during a lookup, and never changes payment status", () => {
  const payment: PaymentStatusData = { state: "failed", source: "local" };
  const html = renderToStaticMarkup(<PaymentStatus payment={payment} onRetry={() => {}} retrying />);
  assert.match(html, /Failed/);
  assert.match(html, /disabled=""/);
  assert.match(html, /Checking status/);
  assert.doesNotMatch(renderToStaticMarkup(<PaymentStatus payment={payment} />), /<button/);
});

test("missing or invalid transaction metadata omits the rendered explorer link", async () => {
  const verified = await verifiedPayment();
  for (const change of [{ network: undefined }, { transactionHash: undefined }, { transactionHash: "not-a-hash" }]) {
    const html = renderToStaticMarkup(<PaymentStatus payment={{ ...verified, state: "submitted", ...change }} />);
    assert.doesNotMatch(html, /href=/);
  }
});

test("mainnet-shaped data cannot claim verified settlement", async () => {
  const verified = await verifiedPayment();
  const payment: PaymentStatusData = {
    ...verified, network: "public", transactionHash: hash.toUpperCase(),
  };
  const html = renderToStaticMarkup(<PaymentStatus payment={payment} />);
  assert.doesNotMatch(html, /Network evidence confirms/);
  assert.match(html, /explorer\/public\/tx\//);
  assert.match(html, /Stellar Mainnet explorer/);
  assert.match(html, /remains unverified/);
});

test("refresh failures preserve the last known state and disclose its staleness", async () => {
  const verified = await verifiedPayment();
  const html = renderToStaticMarkup(<PaymentStatus payment={{ ...verified, state: "confirming" }} lookupError="Request timed out" onRetry={() => {}} />);
  assert.match(html, /Confirming/);
  assert.match(html, /last reported state may be out of date/);
  assert.match(html, /Retry status check/);
  assert.doesNotMatch(html, /Network evidence confirms/);
});
