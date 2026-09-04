import type { Page, Locator } from '@playwright/test';

/**
 * Base page object for profile pages across all roles.
 * Encapsulates shared selectors and actions for the profile header,
 * toggles, draft indicator, and edit flow.
 */
export class ProfilePage {
  readonly page: Page;

  // Banner / header
  readonly banner: Locator;
  readonly avatar: Locator;
  readonly fullName: Locator;
  readonly location: Locator;

  // Toggles
  readonly openToWorkToggle: Locator;
  readonly openForReferralsToggle: Locator;
  readonly openToWorkLabel: Locator;
  readonly openForReferralsLabel: Locator;

  // Edit flow
  readonly editButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Draft indicator
  readonly draftIndicator: Locator;
  readonly draftStatusText: Locator;
  readonly discardDraftButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.banner = page.locator('[class*="bg-gradient-to-r"]').first();
    this.avatar = page.locator('[class*="rounded-full"][class*="bg-gradient"]').first();
    this.fullName = page.locator('h1').first();
    this.location = page.locator('[class*="text-xs"][class*="text-muted-foreground"]').first();

    // Toggle selectors — match the div wrapper containing the Switch + label text
    this.openToWorkToggle = page.locator('div[role="presentation"]').filter({ hasText: /open to work/i }).locator('button[role="switch"]');
    this.openForReferralsToggle = page.locator('div[role="presentation"]').filter({ hasText: /open for referrals/i }).locator('button[role="switch"]');
    this.openToWorkLabel = page.locator('div[role="presentation"]').filter({ hasText: /open to work/i });
    this.openForReferralsLabel = page.locator('div[role="presentation"]').filter({ hasText: /open for referrals/i });

    this.editButton = page.getByRole('button', { name: /edit profile/i });
    this.saveButton = page.getByRole('button', { name: /^save$/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });

    this.draftIndicator = page.locator('[class*="rounded-lg"][class*="border-border"][class*="bg-muted"]').first();
    this.draftStatusText = this.draftIndicator.locator('span').first();
    this.discardDraftButton = page.getByRole('button', { name: /discard draft/i });
  }

  /** Navigate to the profile page for a given role. */
  async goto(role: 'student' | 'professional' | 'recruiter') {
    const routes = {
      student: '/job-seeker/profile',
      professional: '/professional/profile',
      recruiter: '/recruiter/profile',
    };
    const target = routes[role];

    // If already on the target page, skip
    if (this.page.url().endsWith(target)) return;

    // Use client-side navigation to avoid SPA full-page reload conflicts
    await this.page.evaluate((path) => {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, target);

    // Wait for network to settle
    await this.page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    await this.page.waitForTimeout(1000);

    // Dismiss onboarding wizard if present — click through all steps
    for (let i = 0; i < 5; i++) {
      const skipBtn = this.page.getByRole('button', { name: /skip/i });
      if (await skipBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await skipBtn.click();
        await this.page.waitForTimeout(500);
        break;
      }
      const dismissBtn = this.page.getByRole('button', { name: /dismiss/i });
      if (await dismissBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await dismissBtn.click();
        await this.page.waitForTimeout(500);
        break;
      }
      break;
    }
  }

  /** Check if the open-to-work toggle is currently ON. */
  async isOpenToWorkOn(): Promise<boolean> {
    return this.openToWorkToggle.getAttribute('aria-checked').then((v) => v === 'true');
  }

  /** Check if the open-for-referrals toggle is currently ON. */
  async isOpenForReferralsOn(): Promise<boolean> {
    return this.openForReferralsToggle.getAttribute('aria-checked').then((v) => v === 'true');
  }

  /** Toggle the "Open to work" switch to a specific state. */
  async setOpenToWork(targetState: boolean) {
    const isOn = await this.isOpenToWorkOn();
    if (isOn !== targetState) {
      await this.openToWorkToggle.click();
      // Wait for any Supabase request (RPC call, POST, or PATCH)
      await this.page.waitForResponse(
        (resp) => resp.url().includes('/rest/v1/') && ['POST', 'PATCH'].includes(resp.request().method())
      ).catch(() => {});
      await this.page.waitForTimeout(500);
    }
  }

  /** Toggle the "Open for referrals" switch to a specific state. */
  async setOpenForReferrals(targetState: boolean) {
    const isOn = await this.isOpenForReferralsOn();
    if (isOn !== targetState) {
      await this.openForReferralsToggle.click();
      // Wait for any Supabase request (RPC call, POST, or PATCH)
      await this.page.waitForResponse(
        (resp) => resp.url().includes('/rest/v1/') && ['POST', 'PATCH'].includes(resp.request().method())
      ).catch(() => {});
      await this.page.waitForTimeout(500);
    }
  }

  /** Get the current displayed full name text. */
  async getDisplayName(): Promise<string> {
    return (await this.fullName.textContent()) ?? '';
  }

  /** Check if any console errors occurred. */
  monitorConsoleErrors(): string[] {
    const errors: string[] = [];
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }
}
