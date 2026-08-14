import { test as base, type Page } from '@playwright/test';
import {
  signInViaAPI,
  TEST_USERS,
  type TestUser,
} from './auth';

type DirectReferFixtures = {
  studentPage: Page;
  professionalPage: Page;
  recruiterPage: Page;
};

/**
 * Extended test fixture that provides pre-authenticated pages for each role.
 */
export const test = base.extend<DirectReferFixtures>({
  studentPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInViaAPI(page, TEST_USERS.student);
    await use(page);
    await context.close();
  },

  professionalPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInViaAPI(page, TEST_USERS.professional);
    await use(page);
    await context.close();
  },

  recruiterPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInViaAPI(page, TEST_USERS.recruiter);
    await use(page);
    await context.close();
  },
});

/**
 * SPA-safe page reload: navigates away then back to avoid networkidle hang.
 * The Supabase realtime subscriptions prevent networkidle from ever resolving.
 */
export async function spaReload(page: Page): Promise<void> {
  const url = new URL(page.url());
  // Navigate to a blank page first, then back
  await page.goto('about:blank', { waitUntil: 'commit' });
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  // Wait for app to stabilize (React hydrate + data fetch)
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

export { expect } from '@playwright/test';
export { TEST_USERS, type TestUser };
