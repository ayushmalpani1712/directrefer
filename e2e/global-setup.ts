import { seedTestUsers } from './fixtures/auth';

/**
 * Global setup: seed test users before all tests run.
 * This runs once before the entire test suite.
 */
export default async function globalSetup() {
  console.log('[global-setup] Seeding test users...');
  await seedTestUsers();
  console.log('[global-setup] Test users ready.');
}
