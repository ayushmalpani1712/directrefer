-- Error logging table for System Health monitoring
-- Tracks client-side errors, failed API calls, and critical application errors.

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  source TEXT DEFAULT 'client',
  severity TEXT DEFAULT 'error' CHECK (severity IN ('error', 'warning', 'critical')),
  page TEXT,
  stack TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for time-range queries (Errors 24h)
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs (created_at DESC);

-- Index for severity filtering
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs (severity, created_at DESC);

-- RLS: Only admins can read error logs; any authenticated user can insert
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own errors
CREATE POLICY "Users can insert error logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow admins to read all error logs
CREATE POLICY "Admins can read error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Allow admins to delete old error logs (cleanup)
CREATE POLICY "Admins can delete error logs"
  ON error_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Auto-cleanup: keep error logs for 30 days
-- (Scheduled via pg_cron or manual cleanup)
