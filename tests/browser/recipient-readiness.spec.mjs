import { test, expect } from '@playwright/test';

const recipientAddress = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ';
const alternateRecipient = 'GCQ7SWUVPHZ3URQDBRKURQMZKVMYR6B43MMLC6VK7U3DE2TKN552ZZT3';
const walletAddress = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const issuerAddress = 'GCXTYNPKR4WJ5US5VANUIOBOME2MVCFD47ZVNEBSU3COJBQIXJFCSRMD';
const testnetPassphrase = 'Test SDF Network ; September 2015';

function accountPayload(address, balance = '25.0000000') {
  return {
    account_id: address,
    balances: [{ asset_type: 'native', balance }],
  };
}

async function installMockFreighter(page) {
  await page.addInitScript(({ address, passphrase }) => {
    window.freighter = true;
    window.__feyoMockWallet = { address, network: 'TESTNET', passphrase, connected: true };
    window.addEventListener('message', (event) => {
      const request = event.data;
      if (event.source !== window || request?.source !== 'FREIGHTER_EXTERNAL_MSG_REQUEST') return;
      const wallet = window.__feyoMockWallet;
      let response = {};
      if (request.type === 'REQUEST_ACCESS' || request.type === 'REQUEST_PUBLIC_KEY') {
        response = { publicKey: wallet.connected ? wallet.address : '' };
      } else if (request.type === 'REQUEST_CONNECTION_STATUS') {
        response = { isConnected: wallet.connected };
      } else if (request.type === 'REQUEST_ALLOWED_STATUS') {
        response = { isAllowed: wallet.connected };
      } else if (request.type === 'REQUEST_NETWORK_DETAILS') {
        response = {
          networkDetails: {
            network: wallet.network,
            networkUrl: 'https://horizon-testnet.stellar.org',
            networkPassphrase: wallet.passphrase,
          },
        };
      }
      window.postMessage({
        source: 'FREIGHTER_EXTERNAL_MSG_RESPONSE',
        messagedId: request.messageId,
        ...response,
      }, window.location.origin);
    });
  }, { address: walletAddress, passphrase: testnetPassphrase });
}

async function connectMockWallet(page) {
  await page.getByRole('button', { name: 'Connect Freighter' }).click();
  await expect(page.getByTestId('wallet-public-address')).toHaveText(walletAddress);
}

async function changeMockWallet(page, changes) {
  await page.evaluate((next) => Object.assign(window.__feyoMockWallet, next), changes);
}

test('recipient preflight checks a valid native-XLM Testnet destination', async ({ page }) => {
  await page.route('https://horizon-testnet.stellar.org/accounts/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(`/${recipientAddress}`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Latest-Ledger': '123456' },
        body: JSON.stringify(accountPayload(recipientAddress)),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/app');
  await page.getByLabel('Recipient public address').fill(recipientAddress);
  await expect(page.getByRole('heading', { name: 'Recipient readiness' })).toBeVisible();
  const result = page.locator('.recipient-readiness__result');
  await expect(result).toContainText('Funded destination observed');
  await expect(result).toContainText('25.0000000 XLM');
  await expect(page.locator('.recipient-readiness__footnote')).toContainText('does not guarantee');
});

test('invalid recipient input makes no Horizon account request', async ({ page }) => {
  let accountRequests = 0;
  page.on('request', (request) => {
    if (request.url().startsWith('https://horizon-testnet.stellar.org/accounts/')) accountRequests += 1;
  });

  await page.goto('/app');
  await page.getByLabel('Recipient public address').fill('G-not-a-valid-public-key');
  await expect(page.locator('.recipient-readiness')).toContainText('No request is made for an invalid address');
  expect(accountRequests).toBe(0);
});

test('unfunded Testnet destination is shown as an observation, not a payment guarantee', async ({ page }) => {
  await page.route(`https://horizon-testnet.stellar.org/accounts/${recipientAddress}`, async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/app');
  await page.getByLabel('Recipient public address').fill(recipientAddress);
  const result = page.locator('.recipient-readiness__result');
  await expect(result).toContainText('Destination not present on Testnet');
  await expect(result).toContainText('cannot create or fund it');
});

test('changing the destination suppresses the previous recipient response', async ({ page }) => {
  await page.route('https://horizon-testnet.stellar.org/accounts/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(`/${recipientAddress}`)) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }).catch(() => {});
      return;
    }
    if (path.endsWith(`/${alternateRecipient}`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(accountPayload(alternateRecipient, '8.0000000')),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/app');
  const recipient = page.getByLabel('Recipient public address');
  await recipient.fill(recipientAddress);
  await recipient.fill(alternateRecipient);
  const result = page.locator('.recipient-readiness__result');
  await expect(result).toContainText('Funded destination observed');
  await expect(result).toContainText('8.0000000 XLM');
  await page.waitForTimeout(650);
  await expect(result).toContainText('8.0000000 XLM');
  await expect(result).not.toContainText('Destination not present on Testnet');
});


test('recipient readiness rechecks on wallet account change and ignores the previous context response', async ({ page }) => {
  let recipientCalls = 0;
  await installMockFreighter(page);
  await page.route('https://horizon-testnet.stellar.org/accounts/**', async (route) => {
    const requestedAddress = new URL(route.request().url()).pathname.split('/').pop();
    if (requestedAddress === walletAddress || requestedAddress === alternateRecipient) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(accountPayload(requestedAddress)),
      });
      return;
    }
    if (requestedAddress === recipientAddress) {
      recipientCalls += 1;
      if (recipientCalls === 1) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }).catch(() => {});
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(accountPayload(recipientAddress, '8.0000000')),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/app');
  await connectMockWallet(page);
  await page.getByLabel('Recipient public address').fill(recipientAddress);
  await expect.poll(() => recipientCalls).toBe(1);

  await changeMockWallet(page, { address: alternateRecipient });
  await expect(page.getByTestId('wallet-public-address')).toHaveText(alternateRecipient, { timeout: 4_000 });
  await expect.poll(() => recipientCalls).toBeGreaterThan(1);

  const result = page.locator('.recipient-readiness__result');
  await expect(result).toContainText('Funded destination observed');
  await expect(result).toContainText('8.0000000 XLM');
  await page.waitForTimeout(2_800);
  await expect(result).toContainText('8.0000000 XLM');
  await expect(result).not.toContainText('Destination not present on Testnet');
});

test('recipient readiness checks the selected issued asset by exact issuer', async ({ page }) => {
  await installMockFreighter(page);
  await page.route('https://horizon-testnet.stellar.org/accounts/**', async (route) => {
    const requestedAddress = new URL(route.request().url()).pathname.split('/').pop();
    if (requestedAddress === walletAddress) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          account_id: walletAddress,
          balances: [
            { asset_type: 'native', balance: '100.0000000' },
            { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: issuerAddress, balance: '15.0000000', limit: '1000.0000000', is_authorized: true, is_authorized_to_maintain_liabilities: true, is_clawback_enabled: false },
          ],
        }),
      });
      return;
    }
    if (requestedAddress === recipientAddress) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          account_id: recipientAddress,
          balances: [
            { asset_type: 'native', balance: '25.0000000' },
            { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: issuerAddress, balance: '2.0000000', limit: '100.0000000', is_authorized: true, is_authorized_to_maintain_liabilities: true, is_clawback_enabled: false },
          ],
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/app');
  await connectMockWallet(page);
  await expect(page.locator('#asset option')).toHaveCount(2);
  await page.locator('#asset').selectOption({ index: 1 });
  await page.getByLabel('Recipient public address').fill(recipientAddress);

  const result = page.locator('.recipient-readiness__result');
  await expect(result).toContainText('Matching USDC trustline observed');
  await expect(result).toContainText(issuerAddress);
  await expect(result).toContainText('Authorized to hold this asset');
  await expect(result).toContainText('does not guarantee');
});
