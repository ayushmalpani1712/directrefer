import { test, expect } from '../fixtures/test';
import { ProfilePage } from '../pages';

/**
 * Test Suite 2: UI Integrity & State Mutation (Prevent Blanking)
 *
 * Verifies that toggling switches does not cause profile metadata
 * to disappear, and that no console errors occur during mutations.
 */

test.describe('UI Integrity', () => {
  // ── Test Case 2.1: Profile metadata stays visible during toggle ──
  test('2.1 Profile metadata remains intact during and after toggle', async ({ studentPage }) => {
    const profile = new ProfilePage(studentPage);
    await profile.goto('student');

    // Capture initial metadata
    const initialName = await profile.getDisplayName();
    expect(initialName).toBeTruthy();
    expect(initialName.length).toBeGreaterThan(0);

    // Verify banner and avatar are visible
    await expect(profile.banner).toBeVisible();
    await expect(profile.avatar).toBeVisible();
    await expect(profile.fullName).toBeVisible();

    // Toggle and wait for API
    const togglePromise = studentPage.waitForResponse(
      (resp) => resp.url().includes('/rest/v1/') && resp.request().method() === 'PATCH'
    ).catch(() => {});
    await profile.openToWorkToggle.click();
    await togglePromise;

    // Wait for any re-renders
    await studentPage.waitForTimeout(1000);

    // Assert all metadata is still visible and unchanged
    await expect(profile.banner).toBeVisible();
    await expect(profile.avatar).toBeVisible();
    await expect(profile.fullName).toBeVisible();

    const nameAfterToggle = await profile.getDisplayName();
    expect(nameAfterToggle).toBe(initialName);
  });

  // ── Test Case 2.2: No console errors during toggle ───────
  test('2.2 No console errors or unhandled rejections during toggle', async ({ studentPage }) => {
    const profile = new ProfilePage(studentPage);
    const errors: string[] = [];
    const unhandledRejections: string[] = [];

    // Monitor console errors
    studentPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Monitor unhandled promise rejections
    studentPage.on('pageerror', (err) => {
      unhandledRejections.push(err.message);
    });

    await profile.goto('student');

    // Clear any pre-existing errors from initial load
    errors.length = 0;
    unhandledRejections.length = 0;

    // Perform toggle
    await profile.setOpenToWork(true);
    await studentPage.waitForTimeout(1000);

    // Toggle back
    await profile.setOpenToWork(false);
    await studentPage.waitForTimeout(1000);

    // Filter out known benign errors (e.g., 404s for avatar images)
    const criticalErrors = errors.filter(
      (e) => !e.includes('404') && !e.includes('favicon') && !e.includes('manifest')
    );

    expect(criticalErrors).toEqual([]);
    expect(unhandledRejections).toEqual([]);
  });

  // ── Test Case 2.1b: Professional profile metadata stays intact ──
  test('2.1b Professional profile metadata stays intact during toggle', async ({ professionalPage }) => {
    const profile = new ProfilePage(professionalPage);
    await profile.goto('professional');

    const initialName = await profile.getDisplayName();
    expect(initialName).toBeTruthy();

    await expect(profile.fullName).toBeVisible();

    // Toggle
    await profile.setOpenToWork(true);
    await professionalPage.waitForTimeout(1000);

    // Name should not blank out
    const nameAfter = await profile.getDisplayName();
    expect(nameAfter).toBe(initialName);
    expect(nameAfter.length).toBeGreaterThan(0);
  });
});
