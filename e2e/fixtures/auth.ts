import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.test.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ecdqnysmosxmojhvxbdu.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export interface TestUser {
  email: string;
  password: string;
  role: 'student' | 'professional' | 'recruiter';
  fullName: string;
}

const TEST_USERS: Record<string, TestUser> = {
  student: {
    email: process.env.E2E_STUDENT_EMAIL || 'e2e-student@directrefer.test',
    password: process.env.E2E_STUDENT_PASSWORD || 'TestPass123!',
    role: 'student',
    fullName: 'E2E Test Student',
  },
  professional: {
    email: process.env.E2E_PROFESSIONAL_EMAIL || 'e2e-professional@directrefer.test',
    password: process.env.E2E_PROFESSIONAL_PASSWORD || 'TestPass123!',
    role: 'professional',
    fullName: 'E2E Test Professional',
  },
  recruiter: {
    email: process.env.E2E_RECRUITER_EMAIL || 'e2e-recruiter@directrefer.test',
    password: process.env.E2E_RECRUITER_PASSWORD || 'TestPass123!',
    role: 'recruiter',
    fullName: 'E2E Test Recruiter',
  },
};

const ROLE_TABLE_MAP = {
  student: 'profiles_job_seeker',
  professional: 'profiles_professional',
  recruiter: 'profiles_recruiter',
} as const;

/**
 * Delete + recreate a test user (clean state) and create their profile row.
 */
export async function ensureTestUser(user: TestUser): Promise<string | null> {
  if (!SUPABASE_SERVICE_KEY) {
    console.warn('[auth-setup] SUPABASE_SERVICE_ROLE_KEY not set — skipping user creation.');
    return null;
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Find and delete existing user (clean slate)
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === user.email);

  if (found) {
    await admin.auth.admin.deleteUser(found.id);
    console.log(`[auth-setup] Deleted existing user ${user.email}`);
  }

  // Create user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      full_name: user.fullName,
      role: user.role === 'student' ? 'job_seeker' : user.role,
    },
  });

  if (createErr || !created?.user) {
    console.error(`[auth-setup] Failed to create ${user.email}:`, createErr?.message);
    return null;
  }

  console.log(`[auth-setup] Created ${user.email} (${user.role}) id=${created.user.id}`);

  // Upsert into users table (syncAuthState does this, but we do it early)
  await admin.from('users').upsert({
    id: created.user.id,
    email: user.email,
    full_name: user.fullName,
    role: user.role === 'student' ? 'job_seeker' : user.role,
    email_verified: true,
    verified: true,
    last_login_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  // Create role-specific profile row
  const table = ROLE_TABLE_MAP[user.role];
  const profileData: Record<string, unknown> = { user_id: created.user.id };

  // Provide required columns for non-student profiles
  if (user.role === 'professional') {
    profileData.company_name = 'E2E Test Corp';
    profileData.job_title = 'Software Engineer';
    profileData.open_for_referrals = true;
  } else if (user.role === 'recruiter') {
    profileData.company_name = 'E2E Recruiting Inc';
    profileData.job_title = 'Technical Recruiter';
  } else {
    // student — set open_to_work default
    profileData.is_open_to_work = false;
  }

  const { error: profileErr } = await admin.from(table).upsert(
    profileData,
    { onConflict: 'user_id' }
  );

  if (profileErr) {
    console.warn(`[auth-setup] Profile row for ${user.email} (${table}):`, profileErr.message);
  } else {
    console.log(`[auth-setup] Profile row created in ${table}`);
  }

  return created.user.id;
}

/**
 * Seed all test users.
 */
export async function seedTestUsers(): Promise<void> {
  for (const u of Object.values(TEST_USERS)) {
    await ensureTestUser(u);
  }
}

/**
 * Sign in via Supabase REST API, inject session, and navigate to the role's profile page.
 */
export async function signInViaAPI(
  page: Page,
  user: TestUser,
): Promise<void> {
  // Navigate to the app root first (needs to be on the domain for localStorage)
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Sign in via REST API and inject session + skip onboarding
  const result = await page.evaluate(
    async ({ supabaseUrl, anonKey, email, password }) => {
      const resp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        return { error: data.error_description || data.msg || 'Sign-in failed' };
      }
      const session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: data.expires_at,
        token_type: data.token_type || 'bearer',
        user: data.user,
      };
      localStorage.setItem('sb-ecdqnysmosxmojhvxbdu-auth-token', JSON.stringify(session));
      localStorage.setItem('onboarding_dismissed', 'true');
      return { error: null, userId: data.user?.id };
    },
    { supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, email: user.email, password: user.password }
  );

  if (result.error) throw new Error(`Sign-in failed for ${user.email}: ${result.error}`);
  console.log(`[auth] Signed in ${user.email} (id=${result.userId})`);

  // Navigate directly to the profile page — the session is already in localStorage
  const profileRoute = getProfileRoute(user.role);
  await page.goto(profileRoute, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  // Wait for the app to finish initializing
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

/**
 * Sign in via UI (slower, for UI-level tests).
 */
export async function signInViaUI(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');

  // Wait for navigation away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15_000,
  });
}

/**
 * Get the expected profile route for a role.
 */
export function getProfileRoute(role: TestUser['role']): string {
  const routes = {
    student: '/job-seeker/profile',
    professional: '/professional/profile',
    recruiter: '/recruiter/profile',
  };
  return routes[role];
}

/**
 * Get the expected dashboard route for a role.
 */
export function getDashboardRoute(role: TestUser['role']): string {
  const routes = {
    student: '/job-seeker/dashboard',
    professional: '/professional/dashboard',
    recruiter: '/recruiter/dashboard',
  };
  return routes[role];
}

export { TEST_USERS };
