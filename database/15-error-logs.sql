-- 15-error-logs.sql
-- Create error_logs table for real-time system health monitoring

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  severity text NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  source text NOT NULL DEFAULT 'client',
  message text NOT NULL,
  detail jsonb,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  page_path text,
  created_at timestamptz DEFAULT now()
);

-- RLS: only service role can insert (via server or edge function),
-- but since we use the anon key from the client, allow authenticated inserts
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert (client-side error logging)
CREATE POLICY "Authenticated users can insert error logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can read error logs
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

-- Index for 24h queries
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs (severity, created_at DESC);

-- Auto-cleanup: delete errors older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM error_logs WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION cleanup_old_error_logs() TO service_role;
