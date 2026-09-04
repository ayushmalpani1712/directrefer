import { test, expect } from '../fixtures/test';
import { ProfilePage } from '../pages';

/**
 * Test Suite 4: Auto-Save & Draft Recovery
 *
 * Test cases 4.1 and 4.2 were removed when the auto-save feature
 * was deleted. Test 4.3 remains as a general UX safety test.
 */

test.describe('Auto-Save & Draft Recovery', () => {
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

    // Navigate to dashboard via client-side — should not trigger any dialog
    let dialogTriggered = false;
    studentPage.on('dialog', (dialog) => {
      dialogTriggered = true;
      dialog.dismiss();
    });

    await studentPage.evaluate(() => {
      window.history.pushState({}, '', '/job-seeker/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await studentPage.waitForTimeout(3000);

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
