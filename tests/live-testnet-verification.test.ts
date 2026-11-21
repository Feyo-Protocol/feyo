import assert from "node:assert/strict";
import { test } from "node:test";
import {
  prepareTestnetPaymentVerification,
  verifyTestnetPaymentWithTimeout,
} from "../src/lib/stellar/payment-verification";

const enabled = process.env.FEYO_LIVE_TESTNET_VERIFY === "1";

test("opt-in: verifies a genuine public Stellar Testnet payment", { skip: !enabled }, async () => {
  const assetType = process.env.FEYO_TESTNET_ASSET_TYPE === "issued" ? "issued" : "native";
  const prepared = prepareTestnetPaymentVerification({
    transactionHash: process.env.FEYO_TESTNET_TRANSACTION_HASH ?? "",
    source: process.env.FEYO_TESTNET_SOURCE ?? "",
    destination: process.env.FEYO_TESTNET_DESTINATION ?? "",
    amount: process.env.FEYO_TESTNET_AMOUNT ?? "",
    assetType,
    assetCode: assetType === "issued" ? process.env.FEYO_TESTNET_ASSET_CODE ?? "" : "",
    issuer: assetType === "issued" ? process.env.FEYO_TESTNET_ASSET_ISSUER ?? "" : "",
  });
  assert.equal(
    prepared.ok,
    true,
    prepared.ok ? undefined : prepared.issues.map((issue) => issue.message).join(" ")
  );
  if (!prepared.ok) return;

  const result = await verifyTestnetPaymentWithTimeout(prepared.expected, { timeoutMs: 15_000 });
  assert.equal(
    result.status,
    "verified",
    `Expected live matching evidence, received ${result.status}: ${result.status === "verified" ? "" : result.message}`
  );
  if (result.status !== "verified") return;
  assert.equal(result.evidence.transactionHash, prepared.expected.transactionHash);
  assert.equal(result.evidence.source, prepared.expected.source);
  assert.equal(result.evidence.destination, prepared.expected.destination);
  assert.equal(result.evidence.amountStroops, prepared.expected.amountStroops.toString());
});
