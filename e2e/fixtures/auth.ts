import { createClient } from '@supabase/supabase-js';
import type { Page, TestInfo } from '@playwright/test';

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
    email: 'e2e-student@directrefer.test',
    password: 'TestPass123!',
    role: 'student',
    fullName: 'E2E Test Student',
  },
  professional: {
    email: 'e2e-professional@directrefer.test',
    password: 'TestPass123!',
    role: 'professional',
    fullName: 'E2E Test Professional',
  },
  recruiter: {
    email: 'e2e-recruiter@directrefer.test',
    password: 'TestPass123!',
    role: 'recruiter',
    fullName: 'E2E Test Recruiter',
  },
};

/**
 * Create a test user in Supabase if they don't exist.
 * Uses the service role key to bypass RLS.
 */
export async function ensureTestUser(user: TestUser): Promise<void> {
  if (!SUPABASE_SERVICE_KEY) {
    console.warn('[auth-setup] SUPABASE_SERVICE_ROLE_KEY not set — skipping user creation. Tests will use existing users.');
    return;
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Check if user exists
  const { data: existing } = await adminClient.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === user.email);

  if (!found) {
    // Create user
    const { error } = await adminClient.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.fullName,
        role: user.role,
      },
    });
    if (error) {
      console.error(`[auth-setup] Failed to create user ${user.email}:`, error.message);
    } else {
      console.log(`[auth-setup] Created user ${user.email} (${user.role})`);
    }
  }
}

/**
 * Seed all test users.
 */
export async function seedTestUsers(): Promise<void> {
  await Promise.all(
    Object.values(TEST_USERS).map((u) => ensureTestUser(u))
  );
}

/**
 * Sign in via Supabase API and inject the session into the browser.
 * This bypasses the login UI entirely for speed and reliability.
 */
export async function signInViaAPI(
  page: Page,
  user: TestUser,
): Promise<void> {
  // Navigate to the app first (needed for localStorage access)
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Sign in via Supabase REST API
  const response = await page.request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        email: user.email,
        password: user.password,
      },
    }
  );

  const body = await response.json();

  if (!response.ok()) {
    throw new Error(
      `Supabase sign-in failed for ${user.email}: ${body.error_description || body.msg || response.status()}`
    );
  }

  // Inject the session into localStorage (Supabase stores it there)
  await page.evaluate(
    ({ accessToken, refreshToken, user: userData }) => {
      const session = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: userData,
      };
      localStorage.setItem(
        'sb-ecdqnysmosxmojhvxbdu-auth-token',
        JSON.stringify(session)
      );
    },
    {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      user: body.user,
    }
  );

  // Reload to pick up the session
  await page.reload();
  await page.waitForLoadState('networkidle');
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
