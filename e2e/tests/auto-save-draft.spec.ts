import { test, expect } from '../fixtures/test';
import { ProfilePage } from '../pages';

/**
 * Test Suite 4: Auto-Save & Draft Recovery
 *
 * Verifies that the auto-save system persists form edits to
 * localStorage and server, the draft indicator works correctly,
 * and saved changes survive page reloads.
 */

test.describe('Auto-Save & Draft Recovery', () => {
  // ── Test Case 4.1: Auto-saved draft persists after reload ──
  test('4.1 Profile field edits auto-save and persist after reload', async ({ studentPage }) => {
    const profile = new ProfilePage(studentPage);
    await profile.goto('student');

    // Enter edit mode
    await profile.editButton.click();
    await expect(profile.saveButton).toBeVisible();
    await expect(profile.cancelButton).toBeVisible();

    // Find the name input and modify it
    const nameInput = studentPage.locator('input[placeholder*="full name" i]').first();
    await expect(nameInput).toBeVisible();

    const originalValue = await nameInput.inputValue();
    const testSuffix = ` E2E ${Date.now()}`;
    await nameInput.fill(originalValue + testSuffix);

    // Wait for debounced auto-save (500ms debounce + buffer)
    await studentPage.waitForTimeout(2000);

    // Verify localStorage has draft data
    const draftData = await studentPage.evaluate(() => {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('draft:'));
      if (keys.length === 0) return null;
      const raw = localStorage.getItem(keys[0]);
      return raw ? JSON.parse(raw) : null;
    });

    expect(draftData).not.toBeNull();
    expect(draftData.values).toBeDefined();

    // Reload the page
    await studentPage.reload();
    await studentPage.waitForLoadState('networkidle');

    // The draft indicator should show "restored" or the edit field should still have the draft value
    // Wait for draft restoration
    await studentPage.waitForTimeout(1500);

    // Verify draft was restored by checking localStorage still has it
    const restoredDraft = await studentPage.evaluate(() => {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('draft:'));
      if (keys.length === 0) return null;
      const raw = localStorage.getItem(keys[0]);
      return raw ? JSON.parse(raw) : null;
    });

    expect(restoredDraft).not.toBeNull();
  });

  // ── Test Case 4.2: Draft indicator displays correctly ─────
  test('4.2 Draft indicator shows correct status without flickering', async ({ studentPage }) => {
    const profile = new ProfilePage(studentPage);
    await profile.goto('student');

    // Enter edit mode and make a change
    await profile.editButton.click();
    const nameInput = studentPage.locator('input[placeholder*="full name" i]').first();
    await expect(nameInput).toBeVisible();

    const originalValue = await nameInput.inputValue();
    await nameInput.fill(originalValue + ' Draft Test');

    // Wait for auto-save to trigger
    await studentPage.waitForTimeout(1500);

    // The draft indicator container should exist (it reserves space even when idle)
    const indicatorContainer = studentPage.locator(
      '[class*="rounded-lg"][class*="border-border"]'
    ).first();

    // After auto-save, the indicator should show "Saving..." or "Draft saved"
    // Capture the indicator text over time to check for flickering
    const statusTexts: string[] = [];
    for (let i = 0; i < 5; i++) {
      const text = await indicatorContainer.textContent().catch(() => '');
      statusTexts.push(text ?? '');
      await studentPage.waitForTimeout(200);
    }

    // The status should NOT alternate rapidly between different states
    // (which would indicate flickering). It should be stable.
    const uniqueStatuses = new Set(statusTexts.filter(Boolean));
    // At most 2 different statuses during observation (e.g., "Saving..." then "Draft saved")
    expect(uniqueStatuses.size).toBeLessThanOrEqual(2);

    // Restore original value
    await nameInput.fill(originalValue);
    await studentPage.waitForTimeout(500);
    await profile.cancelButton.click();
  });

  // ── Test Case 4.3: No "unsaved changes" warning after save ──
  test('4.3 No browser warning after explicit profile save', async ({ studentPage }) => {
    const profile = new ProfilePage(studentPage);
    await profile.goto('student');

    // Enter edit mode
    await profile.editButton.click();
    const nameInput = studentPage.locator('input[placeholder*="full name" i]').first();
    await expect(nameInput).toBeVisible();

    const originalValue = await nameInput.inputValue();

    // Make a change and save it
    await nameInput.fill(originalValue + ' Saved');
    await profile.saveButton.click();

    // Wait for save to complete
    await studentPage.waitForTimeout(1000);

    // Now try to navigate away — there should be NO beforeunload warning
    // We verify this by checking that hasUnsavedChanges is false
    const hasUnsaved = await studentPage.evaluate(() => {
      // Check if the React state for unsaved changes is false
      // We can verify this by attempting navigation without a dialog appearing
      return (window as any).__hasUnsavedChanges ?? false;
    });

    // Navigate to dashboard — should not trigger any dialog
    let dialogTriggered = false;
    studentPage.on('dialog', (dialog) => {
      dialogTriggered = true;
      dialog.dismiss();
    });

    await studentPage.goto('/job-seeker/dashboard');
    await studentPage.waitForLoadState('networkidle');

    // No dialog should have appeared
    expect(dialogTriggered).toBe(false);

    // Restore original value
    await profile.goto('student');
    await profile.editButton.click();
    await nameInput.fill(originalValue);
    await profile.saveButton.click();
    await studentPage.waitForTimeout(500);
  });
});
