import { test, expect } from '@playwright/test';

const verificationHash = 'ab'.repeat(32);
const verificationSource = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const verificationDestination = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ';
const verificationIssuer = 'GCXTYNPKR4WJ5US5VANUIOBOME2MVCFD47ZVNEBSU3COJBQIXJFCSRMD';
const alternateWalletAddress = 'GCQ7SWUVPHZ3URQDBRKURQMZKVMYR6B43MMLC6VK7U3DE2TKN552ZZT3';
const testnetPassphrase = 'Test SDF Network ; September 2015';
const mainnetPassphrase = 'Public Global Stellar Network ; September 2015';

async function fillVerificationForm(page) {
  const verifier = page.locator('#verify');
  await verifier.getByLabel('Transaction hash').fill(verificationHash);
  await verifier.getByLabel('Expected source').fill(verificationSource);
  await verifier.getByLabel('Expected destination').fill(verificationDestination);
  await verifier.getByLabel('Exact amount').fill('12.5');
}

function transactionBody(hash = verificationHash, overrides = {}) {
  return {
    hash,
    ledger: 123456,
    successful: true,
    created_at: '2026-11-20T10:00:00Z',
    source_account: verificationSource,
    operation_count: 1,
    ...overrides,
  };
}

function operationBody(hash = verificationHash, overrides = {}) {
  return {
    id: '123456789',
    transaction_hash: hash,
    transaction_successful: true,
    source_account: verificationSource,
    type: 'payment',
    from: verificationSource,
    to: verificationDestination,
    amount: '12.5000000',
    asset_type: 'native',
    ...overrides,
  };
}

async function installMockFreighter(page) {
  await page.addInitScript(({ address, passphrase }) => {
    window.freighter = true;
    window.__feyoMockWallet = {
      address,
      network: 'TESTNET',
      passphrase,
      connected: true,
    };
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
  }, { address: verificationSource, passphrase: testnetPassphrase });
}

async function connectMockWallet(page) {
  await page.getByRole('button', { name: 'Connect Freighter' }).click();
  await expect(page.getByTestId('wallet-public-address')).toHaveText(verificationSource);
}

async function updateMockWallet(page, changes) {
  await page.evaluate((next) => Object.assign(window.__feyoMockWallet, next), changes);
}

async function routeAccountBalances(route) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ balances: [{ asset_type: 'native', balance: '100.0000000' }] }),
  });
}

test('desktop homepage navigation is keyboard accessible and routes to docs', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(nav).toBeVisible();
  const docs = nav.getByRole('link', { name: 'Docs' });
  await docs.focus();
  await expect(docs).toBeFocused();
  await expect(docs).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/docs\/?$/);
  await expect(page.getByRole('main')).toBeVisible();
});

test('homepage mobile disclosure supports keyboard, links and Escape', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const menu = page.locator('.mobile-menu');
  const toggle = menu.locator('summary');
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('open', '');
  await expect(menu.getByRole('link', { name: 'Docs' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open', '');
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(menu).toHaveAttribute('open', '');
  await menu.getByRole('link', { name: 'Docs' }).click();
  await expect(page).toHaveURL(/\/docs\/?$/);
});

test('desktop docs sidebar provides current route and keyboard links', async ({ page }) => {
  await page.goto('/docs');
  const nav = page.getByRole('navigation', { name: 'Documentation navigation' }).filter({ visible: true });
  const gettingStarted = nav.getByRole('link', { name: 'Getting started' });
  await gettingStarted.focus();
  await expect(gettingStarted).toBeFocused();
  await expect(gettingStarted).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/docs\/getting-started\/?$/);
  await expect(page.getByRole('link', { name: 'Getting started' }).filter({ visible: true }).first()).toHaveAttribute('aria-current', 'page');
});

test('mobile docs sidebar toggles with keyboard and Escape restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/docs');
  const toggle = page.getByRole('button', { name: 'Menu' });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Close' })).toHaveAttribute('aria-expanded', 'true');
  const nav = page.getByRole('navigation', { name: 'Documentation navigation' });
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: 'Getting started' }).focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toHaveCount(0);
  await page.keyboard.press('Enter');
  await nav.getByRole('link', { name: 'Getting started' }).click();
  await expect(page).toHaveURL(/\/docs\/getting-started\/?$/);
});

test('verification form has accessible labels, keyboard submission, and preflight errors', async ({ page }) => {
  let horizonRequests = 0;
  page.on('request', (request) => {
    if (request.url().startsWith('https://horizon-testnet.stellar.org/')) horizonRequests += 1;
  });
  await page.goto('/app');
  const verifier = page.locator('#verify');
  const formHeading = page.getByRole('heading', { name: 'Verify a Testnet payment' });
  await expect(formHeading).toBeVisible();
  await expect(verifier.getByLabel('Transaction hash')).toBeVisible();
  await expect(verifier.getByLabel('Expected source')).toBeVisible();
  await expect(verifier.getByLabel('Expected destination')).toBeVisible();
  await expect(verifier.getByLabel('Asset type')).toHaveValue('native');
  await expect(verifier.getByLabel('Exact amount')).toBeVisible();

  const submit = page.getByRole('button', { name: 'Verify expected payment' });
  await submit.focus();
  await expect(submit).toBeFocused();
  await expect(submit).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Invalid request' })).toBeFocused();
  await expect(verifier.getByLabel('Transaction hash')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Check the expected payment details. No Horizon request was made.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Stellar Expert/ })).toHaveCount(0);
  expect(horizonRequests).toBe(0);
});

test('verification renders trusted matching evidence and a safe Testnet explorer link', async ({ page }) => {
  await page.route('https://horizon-testnet.stellar.org/**', async (route) => {
    const operations = route.request().url().includes('/operations');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(operations ? {
        _embedded: { records: [operationBody()] },
      } : transactionBody()),
    });
  });
  await page.goto('/app');
  await fillVerificationForm(page);
  await page.getByRole('button', { name: 'Verify expected payment' }).click();
  const outcome = page.getByRole('heading', { name: 'Verified' });
  await expect(outcome).toBeVisible();
  await expect(outcome).toBeFocused();
  await expect(page.getByText('123456', { exact: true })).toBeVisible();
  const explorer = page.getByRole('link', { name: /Stellar Expert Testnet/ });
  await expect(explorer).toHaveAttribute('href', `https://stellar.expert/explorer/testnet/tx/${verificationHash}`);
  await expect(explorer).toHaveAttribute('rel', 'noopener noreferrer');
  expect(new URL(await explorer.getAttribute('href')).pathname).toContain('/explorer/testnet/');
});

test('verification renders exact issued-asset code and issuer from trusted evidence', async ({ page }) => {
  await page.route('https://horizon-testnet.stellar.org/**', async (route) => {
    const operations = route.request().url().includes('/operations');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(operations ? {
        _embedded: { records: [operationBody(verificationHash, {
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: verificationIssuer,
        })] },
      } : transactionBody()),
    });
  });
  await page.goto('/app');
  await fillVerificationForm(page);
  const verifier = page.locator('#verify');
  await verifier.getByLabel('Asset type').selectOption('issued');
  await verifier.getByLabel('Asset code').fill('USDC');
  await verifier.getByLabel('Expected issuer').fill(verificationIssuer);
  await page.getByRole('button', { name: 'Verify expected payment' }).click();

  await expect(page.getByRole('heading', { name: 'Verified' })).toBeFocused();
  await expect(page.getByText('12.5 USDC', { exact: false })).toBeVisible();
  await expect(page.locator('.verification-evidence code').filter({ hasText: 'GCXTYNPK' })).toHaveAttribute('title', verificationIssuer);
});

test('cancel lookup aborts loading, announces cancellation, and focuses the result', async ({ page }) => {
  await page.route('https://horizon-testnet.stellar.org/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }).catch(() => {});
  });
  await page.goto('/app');
  await fillVerificationForm(page);
  await page.getByRole('button', { name: 'Verify expected payment' }).click();
  const loading = page.getByRole('status').filter({ hasText: 'Reading transaction and operation evidence' });
  await expect(loading).toBeVisible();
  await expect(page.locator('#verify form')).toHaveAttribute('aria-busy', 'true');
  await page.getByRole('button', { name: 'Cancel lookup' }).click();

  const cancelled = page.getByRole('heading', { name: 'Verification cancelled' });
  await expect(cancelled).toBeFocused();
  await expect(page.getByText('Verification was cancelled. No settlement state was changed.')).toBeVisible();
  await expect(loading).toHaveCount(0);
  await expect(page.locator('#verify form')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('link', { name: /Stellar Expert/ })).toHaveCount(0);
});

test('editing verification input cancels and suppresses a stale Horizon response', async ({ page }) => {
  await page.route('https://horizon-testnet.stellar.org/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }).catch(() => {});
  });
  await page.goto('/app');
  await fillVerificationForm(page);
  await page.getByRole('button', { name: 'Verify expected payment' }).click();
  await expect(page.getByText('Reading transaction and operation evidence…')).toBeVisible();
  await page.locator('#verify').getByLabel('Exact amount').fill('12.6');
  await expect(page.getByText('Reading transaction and operation evidence…')).toHaveCount(0);
  await page.waitForTimeout(400);
  await expect(page.getByText('Not found', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Verified' })).toHaveCount(0);
});

test('a new lookup replaces a pending lookup and ignores its late result', async ({ page }) => {
  const replacementHash = 'cd'.repeat(32);
  await page.route('https://horizon-testnet.stellar.org/**', async (route) => {
    const url = route.request().url();
    const operations = url.includes('/operations');
    const hash = url.includes(replacementHash) ? replacementHash : verificationHash;
    if (hash === verificationHash) await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(operations
        ? { _embedded: { records: [operationBody(hash)] } }
        : transactionBody(hash)),
    }).catch(() => {});
  });
  await page.goto('/app');
  await fillVerificationForm(page);
  await page.getByRole('button', { name: 'Verify expected payment' }).click();
  await expect(page.getByText('Reading transaction and operation evidence…')).toBeVisible();
  await page.locator('#verify').getByLabel('Transaction hash').fill(replacementHash);
  await page.getByRole('button', { name: 'Verify expected payment' }).click();

  await expect(page.getByRole('heading', { name: 'Verified' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Stellar Expert Testnet/ })).toHaveAttribute(
    'href',
    `https://stellar.expert/explorer/testnet/tx/${replacementHash}`
  );
  await page.waitForTimeout(600);
  await expect(page.getByRole('heading', { name: 'Verified' })).toHaveCount(1);
});

test('unmounting the verification component cancels a pending lookup without late UI work', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('https://horizon-testnet.stellar.org/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }).catch(() => {});
  });
  await page.goto('/app');
  await fillVerificationForm(page);
  await page.getByRole('button', { name: 'Verify expected payment' }).click();
  await expect(page.getByText('Reading transaction and operation evidence…')).toBeVisible();
  await page.goto('/docs');
  await expect(page.getByRole('main')).toBeVisible();
  await page.waitForTimeout(600);
  expect(pageErrors).toEqual([]);
  await expect(page.locator('#verify')).toHaveCount(0);
});

for (const scenario of [
  { name: 'failed', heading: 'Failed transaction', transactionStatus: 200, transaction: { successful: false }, wording: /recorded this transaction as failed/i, hasExplorer: true },
  { name: 'not found', heading: 'Not found', transactionStatus: 404, wording: /pending or absent/i, hasExplorer: false },
  { name: 'malformed', heading: 'Malformed evidence', transactionStatus: 200, malformed: true, wording: /malformed transaction evidence/i, hasExplorer: false },
  { name: 'unavailable', heading: 'Horizon unavailable', transactionStatus: 503, wording: /HTTP 503/i, hasExplorer: false },
  { name: 'mismatched', heading: 'Payment mismatch', transactionStatus: 200, mismatch: true, wording: /no classic payment operation exactly matched/i, hasExplorer: true },
]) {
  test(`verification shows the ${scenario.name} outcome without claiming success`, async ({ page }) => {
    await page.route('https://horizon-testnet.stellar.org/**', async (route) => {
      const operations = route.request().url().includes('/operations');
      if (operations) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ _embedded: { records: [{
            id: '123456789',
            transaction_hash: verificationHash,
            transaction_successful: true,
            source_account: verificationSource,
            type: 'payment',
            from: verificationSource,
            to: verificationDestination,
            amount: scenario.mismatch ? '12.6000000' : '12.5000000',
            asset_type: 'native',
          }] } }),
        });
        return;
      }
      if (scenario.malformed) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.fulfill({
        status: scenario.transactionStatus,
        contentType: 'application/json',
        body: JSON.stringify(scenario.transactionStatus === 200 ? {
          hash: verificationHash,
          ledger: 123456,
          successful: scenario.transaction?.successful ?? true,
          created_at: '2026-11-20T10:00:00Z',
          source_account: verificationSource,
          operation_count: 1,
        } : {}),
      });
    });
    await page.goto('/app');
    await fillVerificationForm(page);
    await page.getByRole('button', { name: 'Verify expected payment' }).click();
    await expect(page.getByRole('heading', { name: scenario.heading })).toBeFocused();
    await expect(page.locator('.verification-result')).toContainText(scenario.wording);
    await expect(page.getByRole('heading', { name: 'Verified' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Stellar Expert Testnet/ })).toHaveCount(scenario.hasExplorer ? 1 : 0);
  });
}

test('wallet account A changing to B remounts verification and suppresses A evidence', async ({ page }) => {
  await installMockFreighter(page);
  await page.route('https://horizon-testnet.stellar.org/**', async (route) => {
    if (route.request().url().includes('/accounts/')) return routeAccountBalances(route);
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    const operations = route.request().url().includes('/operations');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(operations
        ? { _embedded: { records: [operationBody()] } }
        : transactionBody()),
    }).catch(() => {});
  });
  await page.goto('/app');
  await connectMockWallet(page);
  await fillVerificationForm(page);
  await page.getByRole('button', { name: 'Verify expected payment' }).click();
  await updateMockWallet(page, { address: alternateWalletAddress });

  await expect(page.getByTestId('wallet-public-address')).toHaveText(alternateWalletAddress, { timeout: 4_000 });
  await expect(page.locator('#verify').getByLabel('Transaction hash')).toHaveValue('');
  await page.waitForTimeout(1_200);
  await expect(page.getByRole('heading', { name: 'Verified' })).toHaveCount(0);
});

test('wallet disconnect during verification cancels and clears the pending request', async ({ page }) => {
  await installMockFreighter(page);
  await page.route('https://horizon-testnet.stellar.org/**', async (route) => {
    if (route.request().url().includes('/accounts/')) return routeAccountBalances(route);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }).catch(() => {});
  });
  await page.goto('/app');
  await connectMockWallet(page);
  await fillVerificationForm(page);
  await page.getByRole('button', { name: 'Verify expected payment' }).click();
  await page.getByRole('button', { name: 'Disconnect' }).click();

  await expect(page.getByTestId('wallet-status-badge')).toContainText('Disconnected');
  await expect(page.locator('#verify').getByLabel('Transaction hash')).toHaveValue('');
  await page.waitForTimeout(600);
  await expect(page.getByRole('heading', { name: /Verified|Not found/ })).toHaveCount(0);
});

for (const networkScenario of [
  { name: 'Mainnet', network: 'PUBLIC', passphrase: mainnetPassphrase },
  { name: 'an incorrect network passphrase', network: 'TESTNET', passphrase: 'Incorrect Testnet passphrase' },
]) {
  test(`wallet changing to ${networkScenario.name} cancels verification and cannot display Verified`, async ({ page }) => {
    await installMockFreighter(page);
    await page.route('https://horizon-testnet.stellar.org/**', async (route) => {
      if (route.request().url().includes('/accounts/')) return routeAccountBalances(route);
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      const operations = route.request().url().includes('/operations');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(operations
          ? { _embedded: { records: [operationBody()] } }
          : transactionBody()),
      }).catch(() => {});
    });
    await page.goto('/app');
    await connectMockWallet(page);
    await fillVerificationForm(page);
    await page.getByRole('button', { name: 'Verify expected payment' }).click();
    await updateMockWallet(page, {
      network: networkScenario.network,
      passphrase: networkScenario.passphrase,
    });

    await expect(page.getByTestId('wallet-error-alert')).toContainText('Unsupported Network', { timeout: 4_000 });
    await expect(page.locator('#verify').getByLabel('Transaction hash')).toHaveValue('');
    await page.waitForTimeout(1_200);
    await expect(page.getByRole('heading', { name: 'Verified' })).toHaveCount(0);
  });
}

for (const width of [320, 375, 768, 1280]) {
  for (const route of ['/', '/app', '/docs', '/docs/getting-started']) {
    test(`no horizontal overflow on ${route} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 820 });
      await page.goto(route);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    });
  }
}
