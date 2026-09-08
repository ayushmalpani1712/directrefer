-- ============================================================================
-- DirectRefer V2.0 — Seed Data Script
-- ============================================================================
-- Generates production-like data for development and testing.
-- Run AFTER migrate-v1-to-v2.sql
-- Target: 10k+ rows across all tables
-- ============================================================================

-- ── 1. Skills Master Vocabulary ──────────────────────────────────────────────

INSERT INTO skills (name, category, slug) VALUES
-- Programming Languages
('javascript', 'programming', 'javascript'),
('typescript', 'programming', 'typescript'),
('python', 'programming', 'python'),
('java', 'programming', 'java'),
('c++', 'programming', 'c++'),
('c#', 'programming', 'c#'),
('go', 'programming', 'go'),
('rust', 'programming', 'rust'),
('ruby', 'programming', 'ruby'),
('php', 'programming', 'php'),
('swift', 'programming', 'swift'),
('kotlin', 'programming', 'kotlin'),
('scala', 'programming', 'scala'),
('r', 'programming', 'r'),
('sql', 'programming', 'sql'),
-- Frameworks
('react', 'framework', 'react'),
('next.js', 'framework', 'next-js'),
('vue.js', 'framework', 'vue-js'),
('angular', 'framework', 'angular'),
('node.js', 'framework', 'node-js'),
('express.js', 'framework', 'express-js'),
('django', 'framework', 'django'),
('flask', 'framework', 'flask'),
('spring boot', 'framework', 'spring-boot'),
('rails', 'framework', 'rails'),
('laravel', 'framework', 'laravel'),
('flutter', 'framework', 'flutter'),
('react native', 'framework', 'react-native'),
-- DevOps & Cloud
('aws', 'devops', 'aws'),
('gcp', 'devops', 'gcp'),
('azure', 'devops', 'azure'),
('docker', 'devops', 'docker'),
('kubernetes', 'devops', 'kubernetes'),
('terraform', 'devops', 'terraform'),
('ci/cd', 'devops', 'ci-cd'),
('jenkins', 'devops', 'jenkins'),
('github actions', 'devops', 'github-actions'),
-- Data & ML
('machine learning', 'data', 'machine-learning'),
('deep learning', 'data', 'deep-learning'),
('tensorflow', 'data', 'tensorflow'),
('pytorch', 'data', 'pytorch'),
('nlp', 'data', 'nlp'),
('data analysis', 'data', 'data-analysis'),
('data visualization', 'data', 'data-visualization'),
('spark', 'data', 'spark'),
('hadoop', 'data', 'hadoop'),
-- Databases
('postgresql', 'database', 'postgresql'),
('mysql', 'database', 'mysql'),
('mongodb', 'database', 'mongodb'),
('redis', 'database', 'redis'),
('elasticsearch', 'database', 'elasticsearch'),
('dynamodb', 'database', 'dynamodb'),
-- Soft Skills
('leadership', 'soft_skill', 'leadership'),
('communication', 'soft_skill', 'communication'),
('teamwork', 'soft_skill', 'teamwork'),
('problem solving', 'soft_skill', 'problem-solving'),
('time management', 'soft_skill', 'time-management'),
('critical thinking', 'soft_skill', 'critical-thinking'),
('adaptability', 'soft_skill', 'adaptability'),
('mentoring', 'soft_skill', 'mentoring'),
-- Domain
('product management', 'domain', 'product-management'),
('agile', 'domain', 'agile'),
('scrum', 'domain', 'scrum'),
('system design', 'domain', 'system-design'),
('microservices', 'domain', 'microservices'),
('api design', 'domain', 'api-design'),
('security', 'domain', 'security'),
('performance optimization', 'domain', 'performance-optimization'),
('blockchain', 'domain', 'blockchain'),
('fintech', 'domain', 'fintech')
ON CONFLICT (name) DO NOTHING;

-- Add common aliases
INSERT INTO skill_aliases (skill_id, alias)
SELECT id, alias FROM skills
CROSS JOIN (VALUES
  ('javascript', 'js'),
  ('javascript', 'ES6'),
  ('typescript', 'ts'),
  ('python', 'py'),
  ('react', 'React.js'),
  ('react', 'reactjs'),
  ('next.js', 'NextJS'),
  ('node.js', 'NodeJS'),
  ('node.js', 'node'),
  ('vue.js', 'Vue'),
  ('angular', 'Angular.js'),
  ('machine learning', 'ML'),
  ('deep learning', 'DL'),
  ('kubernetes', 'k8s'),
  ('continuous integration', 'CI'),
  ('continuous deployment', 'CD'),
  ('amazon web services', 'AWS'),
  ('google cloud platform', 'GCP'),
  (' structured query language', 'SQL')
) AS aliases(skill_name, alias)
WHERE skills.name = skill_name
ON CONFLICT (alias) DO NOTHING;

-- ── 2. Companies ────────────────────────────────────────────────────────────

INSERT INTO companies (name, slug, description, size, industry, headquarters, benefits, office_locations) VALUES
('Google', 'google', 'Multinational technology company specializing in AI, search, and cloud computing.', '10000+', 'Technology', 'Mountain View, CA', ARRAY['401k', 'Free meals', 'Gym', 'Stock options', 'Unlimited PTO'], ARRAY['Mountain View, CA', 'New York, NY', 'London, UK', 'Bangalore, India']),
('Microsoft', 'microsoft', 'Global technology corporation developing software, hardware, and cloud services.', '10000+', 'Technology', 'Redmond, WA', ARRAY['401k', 'Employee stock purchase', 'Health benefits', 'Education assistance'], ARRAY['Redmond, WA', 'Seattle, WA', 'Hyderabad, India', 'Dublin, Ireland']),
('Amazon', 'amazon', 'E-commerce and cloud computing giant with AI/ML leadership.', '10000+', 'Technology', 'Seattle, WA', ARRAY['401k', 'Stock options', 'Health benefits', 'Relocation assistance'], ARRAY['Seattle, WA', 'Arlington, VA', 'Bangalore, India', 'London, UK']),
('Meta', 'meta', 'Social technology company building the metaverse.', '10000+', 'Technology', 'Menlo Park, CA', ARRAY['401k', 'RSUs', 'Free meals', 'Wellness stipend'], ARRAY['Menlo Park, CA', 'New York, NY', 'London, UK', 'Tel Aviv, Israel']),
('Apple', 'apple', 'Consumer electronics and software company.', '10000+', 'Technology', 'Cupertino, CA', ARRAY['401k', 'RSUs', 'Health benefits', 'Employee discount'], ARRAY['Cupertino, CA', 'Austin, TX', 'Cork, Ireland', 'Bangalore, India']),
('Netflix', 'netflix', 'Global streaming entertainment service.', '5000-10000', 'Entertainment', 'Los Gatos, CA', ARRAY['Unlimited PTO', 'Top of market pay', 'Stock options', 'Wellness stipend'], ARRAY['Los Gatos, CA', 'Los Angeles, CA', 'Amsterdam, Netherlands']),
('Stripe', 'stripe', 'Financial infrastructure for the internet.', '5000-10000', 'Fintech', 'San Francisco, CA', ARRAY['Remote-first', 'Health benefits', 'Learning stipend', 'Equity'], ARRAY['San Francisco, CA', 'Seattle, WA', 'Dublin, Ireland', 'Singapore']),
('Uber', 'ride-sharing', 'Mobility platform connecting riders and drivers.', '5000-10000', 'Technology', 'San Francisco, CA', ARRAY['401k', 'RSUs', 'Health benefits', 'Commuter benefits'], ARRAY['San Francisco, CA', 'New York, NY', 'Amsterdam, Netherlands', 'Bangalore, India']),
('Flipkart', 'flipkart', 'Leading Indian e-commerce company.', '10000+', 'E-commerce', 'Bangalore, India', ARRAY['Stock options', 'Health benefits', 'Flexible work', 'Learning budget'], ARRAY['Bangalore, India', 'Gurugram, India', 'Hyderabad, India']),
('Razorpay', 'razorpay', 'Indian fintech company providing payment solutions.', '1000-5000', 'Fintech', 'Bangalore, India', ARRAY['ESOPs', 'Health benefits', 'Flexible work', 'Gym'], ARRAY['Bangalore, India', 'Gurugram, India', 'Jaipur, India']),
('Swiggy', 'swiggy', 'Indian food delivery and quick-commerce platform.', '5000-10000', 'Food Tech', 'Bangalore, India', ARRAY['ESOPs', 'Health benefits', 'Meal credits', 'Flexible work'], ARRAY['Bangalore, India', 'Hyderabad, India', 'Gurugram, India']),
('Zomato', 'zomato', 'Indian restaurant discovery and food delivery platform.', '5000-10000', 'Food Tech', 'Gurugram, India', ARRAY['ESOPs', 'Health benefits', 'Unlimited PTO', 'Flexible work'], ARRAY['Gurugram, India', 'Bangalore, India', 'Mumbai, India']),
('Atlassian', 'atlassian', 'Team collaboration and productivity software company.', '5000-10000', 'Technology', 'Sydney, Australia', ARRAY['Remote-first', 'Stock options', 'Health benefits', 'Learning budget'], ARRAY['Sydney, Australia', 'San Francisco, CA', 'Bangalore, India', 'Amsterdam, Netherlands']),
('Shopify', 'shopify', 'E-commerce platform for online stores.', '5000-10000', 'E-commerce', 'Ottawa, Canada', ARRAY['Remote-first', 'Stock options', 'Health benefits', 'Flexible work'], ARRAY['Ottawa, Canada', 'Toronto, Canada', 'San Francisco, CA', 'Dublin, Ireland']),
('GitLab', 'gitlab', 'DevSecOps platform for software development.', '1000-5000', 'Technology', 'San Francisco, CA', ARRAY['Remote-first', 'Stock options', 'Unlimited PTO', 'Learning budget'], ARRAY['Remote', 'San Francisco, CA', 'New York, NY'])
ON CONFLICT (name) DO NOTHING;

-- ── 3. Generate Seed Users ──────────────────────────────────────────────────
-- Note: These are fake users for development. In production, only real migrated users exist.

-- Generate 500 job seekers
DO $$
DECLARE
  i INTEGER;
  v_user_id UUID;
  v_name TEXT;
  v_skills TEXT[];
  v_cities TEXT[] := ARRAY['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Noida', 'Gurugram', 'Remote'];
  v_colleges TEXT[] := ARRAY['IIT Bombay', 'IIT Delhi', 'NIT Trichy', 'BITS Pilani', 'IIIT Hyderabad', 'VIT Vellore', 'DTU', 'NSUT', 'Pune University', 'Anna University'];
  v_tracks TEXT[] := ARRAY['internship', 'early_career', 'experienced', 'leadership'];
  v_headlines TEXT[] := ARRAY['Full Stack Developer', 'Backend Engineer', 'Frontend Developer', 'Data Scientist', 'ML Engineer', 'DevOps Engineer', 'Product Manager', 'UI/UX Designer', 'Mobile Developer', 'Cloud Architect'];
BEGIN
  FOR i IN 1..500 LOOP
    v_user_id := gen_random_uuid();
    v_name := 'Seed User ' || i;
    v_skills := ARRAY[
      (SELECT name FROM skills ORDER BY random() LIMIT 1),
      (SELECT name FROM skills ORDER BY random() LIMIT 1),
      (SELECT name FROM skills ORDER BY random() LIMIT 1)
    ];

    INSERT INTO users (id, email, full_name, role, email_verified, verified, city, country, created_at)
    VALUES (
      v_user_id,
      'seed-seeker-' || i || '@example.com',
      v_name,
      'job_seeker',
      true,
      false,
      v_cities[1 + (i % array_length(v_cities, 1))],
      'India',
      now() - (random() * interval '365 days')
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO profiles_job_seeker (
      user_id, headline, skills, experience_years, qualification, college,
      is_open_to_work, preferred_track, profile_completeness, created_at
    ) VALUES (
      v_user_id,
      v_headlines[1 + (i % array_length(v_headlines, 1))],
      v_skills,
      (i % 15),
      CASE WHEN i % 3 = 0 THEN 'B.Tech' WHEN i % 3 = 1 THEN 'M.Tech' ELSE 'MBA' END,
      v_colleges[1 + (i % array_length(v_colleges, 1))],
      (random() > 0.3),
      v_tracks[1 + (i % array_length(v_tracks, 1))],
      (30 + (random() * 70)::integer),
      now() - (random() * interval '365 days')
    ) ON CONFLICT (user_id) DO NOTHING;

    -- Add skills to join table
    INSERT INTO profile_skills (profile_type, profile_id, skill_id)
    SELECT 'job_seeker', v_user_id, id FROM skills WHERE name = ANY(v_skills)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Generate 200 professionals
DO $$
DECLARE
  i INTEGER;
  v_user_id UUID;
  v_company TEXT;
  v_company_id UUID;
  v_skills TEXT[];
  v_cities TEXT[] := ARRAY['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Seattle', 'San Francisco', 'New York', 'London', 'Remote'];
BEGIN
  FOR i IN 1..200 LOOP
    v_user_id := gen_random_uuid();
    v_company := (SELECT name FROM companies ORDER BY random() LIMIT 1);
    v_company_id := (SELECT id FROM companies WHERE name = v_company LIMIT 1);
    v_skills := ARRAY[
      (SELECT name FROM skills ORDER BY random() LIMIT 1),
      (SELECT name FROM skills ORDER BY random() LIMIT 1),
      (SELECT name FROM skills ORDER BY random() LIMIT 1),
      (SELECT name FROM skills ORDER BY random() LIMIT 1)
    ];

    INSERT INTO users (id, email, full_name, role, email_verified, verified, city, country, created_at)
    VALUES (
      v_user_id,
      'seed-pro-' || i || '@example.com',
      'Professional ' || i,
      'professional',
      true,
      (random() > 0.5),
      v_cities[1 + (i % array_length(v_cities, 1))],
      CASE WHEN i % 5 = 0 THEN 'US' ELSE 'India' END,
      now() - (random() * interval '365 days')
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO profiles_professional (
      user_id, company_name, job_title, department, years_experience,
      open_for_referrals, referral_capacity, referrals_used, skills,
      response_rate, avg_reply_hours, success_rate, rating, profile_completeness,
      created_at
    ) VALUES (
      v_user_id,
      v_company,
      CASE (i % 5)
        WHEN 0 THEN 'Software Engineer'
        WHEN 1 THEN 'Senior Software Engineer'
        WHEN 2 THEN 'Engineering Manager'
        WHEN 3 THEN 'Staff Engineer'
        ELSE 'Principal Engineer'
      END,
      CASE (i % 4)
        WHEN 0 THEN 'Engineering'
        WHEN 1 THEN 'Product'
        WHEN 2 THEN 'Data Science'
        ELSE 'Design'
      END,
      2 + (i % 15),
      (random() > 0.4),
      3 + (i % 8),
      0 + (random() * 5)::integer,
      v_skills,
      (60 + random() * 40),
      (1 + random() * 48),
      (50 + random() * 50),
      (3.5 + random() * 1.5),
      (40 + random() * 60)::integer,
      now() - (random() * interval '365 days')
    ) ON CONFLICT (user_id) DO NOTHING;

    -- Add skills to join table
    INSERT INTO profile_skills (profile_type, profile_id, skill_id)
    SELECT 'professional', v_user_id, id FROM skills WHERE name = ANY(v_skills)
    ON CONFLICT DO NOTHING;

    -- Create trust score
    INSERT INTO trust_scores (user_id, score, tier, response_reliability, acceptance_rate, referral_quality, profile_quality)
    VALUES (
      v_user_id,
      (50 + random() * 50),
      CASE WHEN random() > 0.5 THEN 'verified' WHEN random() > 0.3 THEN 'provisional' ELSE 'unverified' END,
      random() * 25,
      random() * 25,
      random() * 25,
      random() * 25
    ) ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;

-- Generate 100 recruiters
DO $$
DECLARE
  i INTEGER;
  v_user_id UUID;
  v_company TEXT;
  v_company_id UUID;
BEGIN
  FOR i IN 1..100 LOOP
    v_user_id := gen_random_uuid();
    v_company := (SELECT name FROM companies ORDER BY random() LIMIT 1);
    v_company_id := (SELECT id FROM companies WHERE name = v_company LIMIT 1);

    INSERT INTO users (id, email, full_name, role, email_verified, verified, city, country, created_at)
    VALUES (
      v_user_id,
      'seed-recruiter-' || i || '@example.com',
      'Recruiter ' || i,
      'recruiter',
      true,
      true,
      'Bangalore',
      'India',
      now() - (random() * interval '365 days')
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO profiles_recruiter (
      user_id, company_id, company_name, job_title, hiring_department,
      company_size, company_website, created_at
    ) VALUES (
      v_user_id,
      v_company_id,
      v_company,
      CASE (i % 3) WHEN 0 THEN 'Technical Recruiter' WHEN 1 THEN 'Senior Recruiter' ELSE 'Recruiting Manager' END,
      CASE (i % 4) WHEN 0 THEN 'Engineering' WHEN 1 THEN 'Product' WHEN 2 THEN 'Design' ELSE 'Data Science' END,
      '500-1000',
      'https://' || lower(replace(v_company, ' ', '')) || '.com',
      now() - (random() * interval '365 days')
    ) ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;

-- ── 4. Generate Jobs ────────────────────────────────────────────────────────

DO $$
DECLARE
  i INTEGER;
  v_job_id UUID;
  v_company_id UUID;
  v_recruiter_id UUID;
  v_titles TEXT[] := ARRAY[
    'Software Engineer', 'Senior Software Engineer', 'Frontend Developer',
    'Backend Developer', 'Full Stack Developer', 'DevOps Engineer',
    'Data Scientist', 'ML Engineer', 'Product Manager', 'UI/UX Designer',
    'Cloud Architect', 'Security Engineer', 'Mobile Developer', 'QA Engineer',
    'Engineering Manager', 'Staff Engineer', 'Principal Engineer'
  ];
  v_locations TEXT[] := ARRAY['Bangalore', 'Mumbai', 'Hyderabad', 'Pune', 'Remote', 'Seattle', 'San Francisco', 'London'];
  v_types TEXT[] := ARRAY['full_time', 'contract', 'internship'];
  v_tracks TEXT[] := ARRAY['internship', 'early_career', 'experienced', 'leadership'];
BEGIN
  FOR i IN 1..300 LOOP
    v_job_id := gen_random_uuid();
    v_company_id := (SELECT id FROM companies ORDER BY random() LIMIT 1);
    v_recruiter_id := (SELECT user_id FROM profiles_recruiter WHERE company_id = v_company_id LIMIT 1);

    IF v_recruiter_id IS NULL THEN
      v_recruiter_id := (SELECT id FROM users WHERE role = 'recruiter' LIMIT 1);
    END IF;

    INSERT INTO jobs (
      id, recruiter_id, company_id, title, department, location, type, track,
      salary_range, description, status, posted_at, applicant_count, referral_count, created_at
    ) VALUES (
      v_job_id,
      v_recruiter_id,
      v_company_id,
      v_titles[1 + (i % array_length(v_titles, 1))],
      CASE (i % 4) WHEN 0 THEN 'Engineering' WHEN 1 THEN 'Product' WHEN 2 THEN 'Design' ELSE 'Data Science' END,
      v_locations[1 + (i % array_length(v_locations, 1))],
      v_types[1 + (i % array_length(v_types, 1))],
      v_tracks[1 + (i % array_length(v_tracks, 1))],
      CASE (i % 4)
        WHEN 0 THEN '5-10 LPA'
        WHEN 1 THEN '10-20 LPA'
        WHEN 2 THEN '20-40 LPA'
        ELSE '40-80 LPA'
      END,
      'We are looking for a talented professional to join our team. This role involves working on cutting-edge projects with a collaborative team.',
      'active',
      now() - (random() * interval '180 days'),
      (random() * 50)::integer,
      (random() * 20)::integer,
      now() - (random() * interval '180 days')
    ) ON CONFLICT DO NOTHING;

    -- Add 2-4 random skills per job
    INSERT INTO job_skills (job_id, skill_id, required)
    SELECT v_job_id, id, (random() > 0.3)
    FROM skills ORDER BY random() LIMIT 2 + (random() * 2)::integer
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ── 5. Generate Referrals ───────────────────────────────────────────────────

DO $$
DECLARE
  i INTEGER;
  v_requester_id UUID;
  v_professional_id UUID;
  v_job_id UUID;
  v_status TEXT;
  v_statuses TEXT[] := ARRAY['requested', 'under_review', 'accepted', 'declined', 'referral_submitted', 'application_submitted', 'closed', 'expired'];
BEGIN
  FOR i IN 1..500 LOOP
    v_requester_id := (SELECT id FROM users WHERE role = 'job_seeker' ORDER BY random() LIMIT 1);
    v_professional_id := (SELECT id FROM users WHERE role = 'professional' ORDER BY random() LIMIT 1);
    v_job_id := (SELECT id FROM jobs WHERE status = 'active' ORDER BY random() LIMIT 1);
    v_status := v_statuses[1 + (i % array_length(v_statuses, 1))];

    INSERT INTO referrals (
      requester_id, professional_id, job_id, job_title, status, pipeline_stage,
      progress, relationship_type, created_at, updated_at
    ) VALUES (
      v_requester_id,
      v_professional_id,
      v_job_id,
      (SELECT title FROM jobs WHERE id = v_job_id),
      v_status,
      v_status,
      CASE v_status
        WHEN 'requested' THEN 15
        WHEN 'under_review' THEN 35
        WHEN 'accepted' THEN 75
        WHEN 'referral_submitted' THEN 85
        WHEN 'application_submitted' THEN 95
        WHEN 'closed' THEN 100
        WHEN 'declined' THEN 0
        WHEN 'expired' THEN 0
        ELSE 15
      END,
      CASE (i % 8)
        WHEN 0 THEN 'none' WHEN 1 THEN 'former_colleague' WHEN 2 THEN 'friend'
        WHEN 3 THEN 'college校友' WHEN 4 THEN 'mentor' WHEN 5 THEN 'online_connection'
        WHEN 6 THEN 'family' ELSE 'other'
      END,
      now() - (random() * interval '180 days'),
      now() - (random() * interval '30 days')
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ── 6. Generate Conversations & Messages ────────────────────────────────────

DO $$
DECLARE
  i INTEGER;
  v_conv_id UUID;
  v_user_a UUID;
  v_user_b UUID;
  v_j INTEGER;
BEGIN
  FOR i IN 1..200 LOOP
    v_conv_id := gen_random_uuid();
    v_user_a := (SELECT id FROM users WHERE role = 'job_seeker' ORDER BY random() LIMIT 1);
    v_user_b := (SELECT id FROM users WHERE role = 'professional' ORDER BY random() LIMIT 1);

    INSERT INTO conversations (id, user_a_id, user_b_id, created_at)
    VALUES (v_conv_id, v_user_a, v_user_b, now() - (random() * interval '90 days'))
    ON CONFLICT DO NOTHING;

    -- Add 2-10 messages per conversation
    FOR v_j IN 1..(2 + (random() * 8)::integer) LOOP
      INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
      VALUES (
        v_conv_id,
        CASE WHEN v_j % 2 = 0 THEN v_user_a ELSE v_user_b END,
        CASE (v_j % 5)
          WHEN 0 THEN 'Hi! I saw your profile and would love to connect.'
          WHEN 1 THEN 'Thanks for reaching out! What can I help with?'
          WHEN 2 THEN 'I''m looking for a referral at your company. Would you be open to that?'
          WHEN 3 THEN 'Sure, I''d be happy to help. Can you share your resume?'
          WHEN 4 THEN 'Absolutely! I''ll send it over. Thanks so much!'
          ELSE 'Great, I''ll review it and get back to you soon.'
        END,
        (random() > 0.3),
        now() - (random() * interval '90 days')
      );
    END LOOP;
  END LOOP;
END $$;

-- ── 7. Generate Notifications ───────────────────────────────────────────────

DO $$
DECLARE
  i INTEGER;
  v_user_id UUID;
  v_types TEXT[] := ARRAY['referral_request', 'referral_update', 'message', 'job_match', 'system'];
  v_titles TEXT[] := ARRAY['New Referral Request', 'Referral Update', 'New Message', 'Job Match', 'System Update'];
  v_descriptions TEXT[] := ARRAY[
    'You have a new referral request from a job seeker.',
    'Your referral status has been updated.',
    'You have a new message.',
    'A new job matching your skills has been posted.',
    'Platform maintenance scheduled for this weekend.'
  ];
BEGIN
  FOR i IN 1..1000 LOOP
    v_user_id := (SELECT id FROM users ORDER BY random() LIMIT 1);
    INSERT INTO notifications (user_id, type, title, description, channel, read, created_at)
    VALUES (
      v_user_id,
      v_types[1 + (i % array_length(v_types, 1))],
      v_titles[1 + (i % array_length(v_titles, 1))],
      v_descriptions[1 + (i % array_length(v_descriptions, 1))],
      'in_app',
      (random() > 0.4),
      now() - (random() * interval '90 days')
    );
  END LOOP;
END $$;

-- ── 8. Generate Bookmarks ───────────────────────────────────────────────────

DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..300 LOOP
    INSERT INTO bookmarks (user_id, entity_type, entity_id, created_at)
    SELECT
      id,
      CASE (i % 3) WHEN 0 THEN 'professional' WHEN 1 THEN 'job' ELSE 'candidate' END,
      (SELECT id FROM users WHERE role != 'admin' ORDER BY random() LIMIT 1),
      now() - (random() * interval '90 days')
    FROM users WHERE role = 'job_seeker' ORDER BY random() LIMIT 1
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ── 9. Generate Applications ────────────────────────────────────────────────

DO $$
DECLARE
  i INTEGER;
  v_statuses TEXT[] := ARRAY['submitted', 'screening', 'shortlisted', 'interview', 'offered', 'accepted', 'rejected', 'withdrawn'];
BEGIN
  FOR i IN 1..400 LOOP
    INSERT INTO applications (job_id, candidate_id, status, submitted_at)
    SELECT
      (SELECT id FROM jobs WHERE status = 'active' ORDER BY random() LIMIT 1),
      (SELECT id FROM users WHERE role = 'job_seeker' ORDER BY random() LIMIT 1),
      v_statuses[1 + (i % array_length(v_statuses, 1))],
      now() - (random() * interval '180 days')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ── 10. Generate Matches ────────────────────────────────────────────────────

DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..600 LOOP
    INSERT INTO matches (job_id, candidate_id, match_score, skills_score, role_score, company_score, location_score, reputation_score, source, track)
    SELECT
      (SELECT id FROM jobs WHERE status = 'active' ORDER BY random() LIMIT 1),
      (SELECT id FROM users WHERE role = 'job_seeker' ORDER BY random() LIMIT 1),
      (50 + random() * 50),
      random() * 25,
      random() * 20,
      random() * 15,
      random() * 10,
      random() * 30,
      'algorithm',
      CASE (i % 4) WHEN 0 THEN 'internship' WHEN 1 THEN 'early_career' WHEN 2 THEN 'experienced' ELSE 'leadership' END
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ── 11. Generate State History ──────────────────────────────────────────────

INSERT INTO state_history (entity_type, entity_id, field, old_value, new_value, changed_by, created_at)
SELECT
  'referral',
  id,
  'status',
  'requested',
  status,
  professional_id,
  created_at
FROM referrals
WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- ── 12. Generate NPS Responses ──────────────────────────────────────────────

DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO nps_responses (user_id, score, feedback, created_at)
    SELECT
      id,
      (floor(random() * 11))::integer,
      CASE (i % 5)
        WHEN 0 THEN 'Great platform for referrals!'
        WHEN 1 THEN 'Love the concept, needs more companies.'
        WHEN 2 THEN 'Easy to use and helpful.'
        WHEN 3 THEN 'Could improve matching algorithm.'
        ELSE 'Good overall experience.'
      END,
      now() - (random() * interval '180 days')
    FROM users ORDER BY random() LIMIT 1;
  END LOOP;
END $$;

-- ── 13. Summary ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '=== Seed Data Summary ===';
  RAISE NOTICE 'Users: %', (SELECT COUNT(*) FROM users);
  RAISE NOTICE 'Skills: %', (SELECT COUNT(*) FROM skills);
  RAISE NOTICE 'Companies: %', (SELECT COUNT(*) FROM companies);
  RAISE NOTICE 'Jobs: %', (SELECT COUNT(*) FROM jobs);
  RAISE NOTICE 'Referrals: %', (SELECT COUNT(*) FROM referrals);
  RAISE NOTICE 'Matches: %', (SELECT COUNT(*) FROM matches);
  RAISE NOTICE 'Applications: %', (SELECT COUNT(*) FROM applications);
  RAISE NOTICE 'Conversations: %', (SELECT COUNT(*) FROM conversations);
  RAISE NOTICE 'Messages: %', (SELECT COUNT(*) FROM messages);
  RAISE NOTICE 'Notifications: %', (SELECT COUNT(*) FROM notifications);
  RAISE NOTICE 'Trust Scores: %', (SELECT COUNT(*) FROM trust_scores);
  RAISE NOTICE 'Bookmarks: %', (SELECT COUNT(*) FROM bookmarks);
  RAISE NOTICE '=== Seed Complete ===';
END $$;
