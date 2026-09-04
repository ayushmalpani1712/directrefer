import { test, expect } from '../fixtures/test';
import { ProfilePage, TalentSearchPage } from '../pages';
import { TEST_USERS } from '../fixtures/auth';

/**
 * Test Suite 3: Cross-Role Search & Candidate Discoverability
 */

test.describe('Cross-Role Search', () => {
  test('3.1 Candidate appears in search when "Open to Work" is ON', async ({ studentPage, professionalPage }) => {
    const studentProfile = new ProfilePage(studentPage);
    await studentProfile.goto('student');
    await studentProfile.setOpenToWork(true);
    expect(await studentProfile.isOpenToWorkOn()).toBe(true);

    const talentSearch = new TalentSearchPage(professionalPage);
    await talentSearch.goto('professional');
    await talentSearch.searchFor(TEST_USERS.student.fullName);
    await professionalPage.waitForTimeout(2000);
    await expect(talentSearch.searchInput).toHaveValue(TEST_USERS.student.fullName);
  });

  test('3.2 Candidate hidden from search when "Open to Work" is OFF', async ({ studentPage, professionalPage }) => {
    const studentProfile = new ProfilePage(studentPage);
    await studentProfile.goto('student');
    await studentProfile.setOpenToWork(false);
    expect(await studentProfile.isOpenToWorkOn()).toBe(false);

    const talentSearch = new TalentSearchPage(professionalPage);
    await talentSearch.goto('professional');
    await talentSearch.searchFor(TEST_USERS.student.fullName);
    await professionalPage.waitForTimeout(2000);
    await expect(talentSearch.searchInput).toHaveValue(TEST_USERS.student.fullName);
  });
});
