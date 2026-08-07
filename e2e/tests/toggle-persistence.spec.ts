import { test, expect, spaReload } from '../fixtures/test';
import { ProfilePage } from '../pages';

/**
 * Test Suite 1: Toggle State Persistence Across Page Refreshes
 *
 * Verifies that toggle states (Open to Work, Open for Referrals)
 * persist to the database and survive page reloads.
 */

test.describe('Toggle State Persistence', () => {
  // ── Test Case 1.1: Student — Open to Work ON persists ────
  test('1.1 Job Seeker: "Open to Work" toggle persists ON after reload', async ({ studentPage }) => {
    const profile = new ProfilePage(studentPage);
    await profile.goto('student');

    // Turn ON
    await profile.setOpenToWork(true);
    expect(await profile.isOpenToWorkOn()).toBe(true);

    // Reload
    await spaReload(studentPage);

    // Assert still ON
    expect(await profile.isOpenToWorkOn()).toBe(true);
  });

  // ── Test Case 1.2: Student — Open to Work OFF persists ───
  test('1.2 Job Seeker: "Open to Work" toggle persists OFF after reload', async ({ studentPage }) => {
    const profile = new ProfilePage(studentPage);
    await profile.goto('student');

    // Turn OFF
    await profile.setOpenToWork(false);
    expect(await profile.isOpenToWorkOn()).toBe(false);

    // Reload
    await spaReload(studentPage);

    // Assert still OFF
    expect(await profile.isOpenToWorkOn()).toBe(false);
  });

  // ── Test Case 1.3a: Professional toggles ─────────────────
  test('1.3a Professional: "Open for Referrals" toggle persists after reload', async ({ professionalPage }) => {
    const profile = new ProfilePage(professionalPage);
    await profile.goto('professional');

    // Turn ON
    await profile.setOpenForReferrals(true);
    expect(await profile.isOpenForReferralsOn()).toBe(true);

    // Reload
    await spaReload(professionalPage);

    // Assert still ON
    expect(await profile.isOpenForReferralsOn()).toBe(true);

    // Turn OFF
    await profile.setOpenForReferrals(false);
    expect(await profile.isOpenForReferralsOn()).toBe(false);

    // Reload again
    await spaReload(professionalPage);

    // Assert still OFF
    expect(await profile.isOpenForReferralsOn()).toBe(false);
  });

  // ── Test Case 1.3b: Professional Open to Work ────────────
  test('1.3b Professional: "Open to Work" toggle persists after reload', async ({ professionalPage }) => {
    const profile = new ProfilePage(professionalPage);
    await profile.goto('professional');

    await profile.setOpenToWork(true);
    expect(await profile.isOpenToWorkOn()).toBe(true);

    await spaReload(professionalPage);

    expect(await profile.isOpenToWorkOn()).toBe(true);
  });

  // ── Test Case 1.3c: Recruiter (no open-to-work, but verify page loads) ──
  test('1.3c Recruiter: profile page loads without errors', async ({ recruiterPage }) => {
    const profile = new ProfilePage(recruiterPage);
    await profile.goto('recruiter');

    // Recruiter profile should show company name and edit button
    await expect(profile.editButton).toBeVisible();
  });
});
