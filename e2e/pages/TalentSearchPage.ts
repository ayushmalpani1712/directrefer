import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the TalentSearch / Find Professionals page.
 * Used by professionals and recruiters to search for candidates.
 */
export class TalentSearchPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchResults: Locator;
  readonly noResultsMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder*="Search" i], input[placeholder*="search" i], input[type="search"]').first();
    this.searchResults = page.locator('[class*="grid"] > div, [class*="space-y"] > div').filter({ hasText: /./ });
    this.noResultsMessage = page.locator('text=/no results|not found|no candidates/i');
  }

  /** Navigate to the talent search page for a role. */
  async goto(role: 'professional' | 'recruiter') {
    const routes = {
      professional: '/professional/talent',
      recruiter: '/recruiter/talent',
    };
    const target = routes[role];
    if (this.page.url().endsWith(target)) return;

    // Use client-side navigation
    await this.page.evaluate((path) => {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, target);

    await this.page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  /** Search for a candidate by name. */
  async searchFor(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounced search or network response
    await this.page.waitForTimeout(1000);
  }

  /** Check if a specific name appears in search results. */
  async resultsContainName(name: string): Promise<boolean> {
    const result = this.page.locator(`text=${name}`);
    return result.count().then((c) => c > 0);
  }
}
