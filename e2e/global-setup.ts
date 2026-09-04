import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { seedTestUsers } from './fixtures/auth';

// Load env from e2e/.env.test.local
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env.test.local') });

/**
 * Global setup: seed test users before all tests run.
 */
export default async function globalSetup() {
  console.log('[global-setup] Seeding test users...');
  await seedTestUsers();
  console.log('[global-setup] Test users ready.');
}
