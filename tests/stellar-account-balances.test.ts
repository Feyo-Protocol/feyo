import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STELLAR_TESTNET_HORIZON_URL,
  LatestBalanceRequest,
  fetchTestnetAccountBalances,
  parseTestnetAccountBalances,
} from "../src/lib/stellar/account-balances";

// Synthetic Testnet public keys for unit assertions; never secret keys.
const ADDRESS = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const ISSUER = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";
const OTHER_ADDRESS = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";

const ACCOUNT_FIXTURE = {
  account_id: ADDRESS,
  balances: [
    { balance: "100.0000000", asset_type: "native" },
    {
      balance: "12.3456789",
      asset_type: "credit_alphanum4",
      asset_code: "USDC",
      asset_issuer: ISSUER,
      limit: "1000.0000000",
    },
    {
      balance: "0.0000001",
      asset_type: "credit_alphanum12",
      asset_code: "TESTASSET",
      asset_issuer: ISSUER,
    },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("parseTestnetAccountBalances: normalizes native and issued balances without assuming USDC", () => {
  const result = parseTestnetAccountBalances(ACCOUNT_FIXTURE, ADDRESS);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.address, ADDRESS);
  assert.equal(result.value.network, "testnet");
  assert.equal(result.value.balances.length, 3);

  const [native, usdc, custom] = result.value.balances;

  assert.deepEqual(native, {
    kind: "native",
    assetType: "native",
    code: "XLM",
    balance: "100.0000000",
  });
  assert.equal("issuer" in native, false);

  assert.equal(usdc.kind, "issued");
  assert.equal(usdc.code, "USDC");
  assert.equal(usdc.issuer, ISSUER);
  assert.equal(usdc.balance, "12.3456789");
  assert.equal(usdc.assetType, "credit_alphanum4");

  assert.equal(custom.kind, "issued");
  assert.equal(custom.code, "TESTASSET");
  assert.equal(custom.issuer, ISSUER);
  assert.equal(custom.assetType, "credit_alphanum12");
  assert.equal(custom.balance, "0.0000001");
});

test("parseTestnetAccountBalances: accepts an empty balance list for a funded account", () => {
  const result = parseTestnetAccountBalances({ account_id: ADDRESS, balances: [] }, ADDRESS);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.balances, []);
});

test("LatestBalanceRequest: account changes invalidate older in-flight responses", () => {
  const requests = new LatestBalanceRequest();
  const first = requests.begin(ADDRESS);
  const second = requests.begin(OTHER_ADDRESS);
  assert.equal(requests.isCurrent(first, ADDRESS), false);
  assert.equal(requests.isCurrent(second, OTHER_ADDRESS), true);
  assert.equal(requests.isCurrent(second, ADDRESS), false);
});

test("LatestBalanceRequest: invalidation prevents stale responses after disconnect", () => {
  const requests = new LatestBalanceRequest();
  const token = requests.begin(ADDRESS);
  requests.invalidate();
  assert.equal(requests.isCurrent(token, ADDRESS), false);
});

test("parseTestnetAccountBalances: keeps the issuer attached to issued assets", () => {
  const result = parseTestnetAccountBalances(
    {
      account_id: ADDRESS,
      balances: [
        {
          balance: "5.0000000",
          asset_type: "credit_alphanum4",
          asset_code: "EURC",
          asset_issuer: ISSUER,
        },
      ],
    },
    ADDRESS
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.balances[0].kind, "issued");
  assert.equal(result.value.balances[0].code, "EURC");
  assert.equal(result.value.balances[0].issuer, ISSUER);
});

test("fetchTestnetAccountBalances: rejects an invalid address before any network request", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return jsonResponse(ACCOUNT_FIXTURE);
  };

  const result = await fetchTestnetAccountBalances("S".repeat(56), {
    fetchImpl,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "invalid_address");
  assert.equal(calls, 0);
});

test("fetchTestnetAccountBalances: distinguishes an unfunded account from other failures", async () => {
  const fetchImpl: typeof fetch = async () =>
    jsonResponse({ status: 404, title: "Resource Missing" }, 404);

  const result = await fetchTestnetAccountBalances(ADDRESS, { fetchImpl });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "unfunded_account");
  assert.equal(result.error.httpStatus, 404);
  assert.match(result.error.message, /not funded/i);
});

test("fetchTestnetAccountBalances: reports unavailable Horizon endpoints with their status", async () => {
  const fetchImpl: typeof fetch = async () => jsonResponse({ title: "Service Unavailable" }, 503);

  const result = await fetchTestnetAccountBalances(ADDRESS, { fetchImpl });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "endpoint_unavailable");
  assert.equal(result.error.httpStatus, 503);
});

test("fetchTestnetAccountBalances: reports network failures explicitly", async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new TypeError("fetch failed");
  };

  const result = await fetchTestnetAccountBalances(ADDRESS, { fetchImpl });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "network_error");
  assert.match(result.error.details ?? "", /fetch failed/);
});

test("fetchTestnetAccountBalances: uses Testnet Horizon by default and returns normalized data", async () => {
  let requestedUrl = "";
  const fetchImpl: typeof fetch = async (input) => {
    requestedUrl = String(input);
    return jsonResponse(ACCOUNT_FIXTURE);
  };

  const result = await fetchTestnetAccountBalances(ADDRESS, { fetchImpl });

  assert.equal(result.ok, true);
  assert.equal(
    requestedUrl,
    `${STELLAR_TESTNET_HORIZON_URL}/accounts/${ADDRESS}`
  );
});

test("fetchTestnetAccountBalances: rejects a non-JSON response body as malformed", async () => {
  const fetchImpl: typeof fetch = async () => new Response("not json", { status: 200 });

  const result = await fetchTestnetAccountBalances(ADDRESS, { fetchImpl });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "malformed_response");
  assert.match(result.error.details ?? "", /not valid JSON/);
});

test("fetchTestnetAccountBalances: rejects a payload for a different account", async () => {
  const fetchImpl: typeof fetch = async () =>
    jsonResponse({ ...ACCOUNT_FIXTURE, account_id: ISSUER });

  const result = await fetchTestnetAccountBalances(ADDRESS, { fetchImpl });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "malformed_response");
  assert.match(result.error.details ?? "", /account_id/);
});

test("parseTestnetAccountBalances: rejects malformed balance entries", () => {
  const cases: Array<{ label: string; payload: unknown }> = [
    { label: "missing balances", payload: { account_id: ADDRESS } },
    { label: "non-object entry", payload: { account_id: ADDRESS, balances: ["nope"] } },
    {
      label: "float-like balance",
      payload: {
        account_id: ADDRESS,
        balances: [{ balance: 100, asset_type: "native" }],
      },
    },
    {
      label: "too much precision",
      payload: {
        account_id: ADDRESS,
        balances: [{ balance: "1.00000001", asset_type: "native" }],
      },
    },
    {
      label: "missing asset code",
      payload: {
        account_id: ADDRESS,
        balances: [{ balance: "1.0000000", asset_type: "credit_alphanum4", asset_issuer: ISSUER }],
      },
    },
    {
      label: "invalid issuer",
      payload: {
        account_id: ADDRESS,
        balances: [
          {
            balance: "1.0000000",
            asset_type: "credit_alphanum4",
            asset_code: "USDC",
            asset_issuer: "not-a-key",
          },
        ],
      },
    },
    {
      label: "unsupported asset type",
      payload: {
        account_id: ADDRESS,
        balances: [{ balance: "1.0000000", asset_type: "liquidity_pool_shares" }],
      },
    },
  ];

  for (const { label, payload } of cases) {
    const result = parseTestnetAccountBalances(payload, ADDRESS);
    assert.equal(result.ok, false, label);
    if (result.ok) continue;
    assert.equal(result.error.code, "malformed_response", label);
  }
});

test("parseTestnetAccountBalances: does not misreport an empty balance list as malformed", () => {
  const result = parseTestnetAccountBalances({ account_id: ADDRESS, balances: [] }, ADDRESS);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value.balances, []);
});
