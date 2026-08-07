import { test as base, type Page } from '@playwright/test';
import {
  signInViaAPI,
  seedTestUsers,
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

export { expect } from '@playwright/test';
export { TEST_USERS, type TestUser };
