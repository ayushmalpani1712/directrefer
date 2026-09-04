-- Step 1: Check existing profiles
SELECT 'student' as role, user_id, email FROM profiles_job_seeker pjs
JOIN users u ON u.id = pjs.user_id
UNION ALL
SELECT 'professional', p.user_id, u.email FROM profiles_professional p
JOIN users u ON u.id = p.user_id
UNION ALL
SELECT 'recruiter', r.user_id, u.email FROM profiles_recruiter r
JOIN users u ON u.id = r.user_id;

-- Step 2: Check existing auth users
SELECT id, email, email_confirmed_at FROM auth.users;
