import { test, expect } from '@playwright/test';

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

for (const width of [320, 375, 768, 1280]) {
  for (const route of ['/', '/docs', '/docs/getting-started']) {
    test(`no horizontal overflow on ${route} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 820 });
      await page.goto(route);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    });
  }
}
