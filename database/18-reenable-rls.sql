-- 18. Re-enable RLS on tables where it was disabled during debugging
-- These tables have policies defined but RLS was turned off.

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
