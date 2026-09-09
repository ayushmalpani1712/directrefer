-- ============================================================================
-- DirectRefer — Schema Migration Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  description TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by TEXT
);

INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('1.0.0', 'Initial schema migration — V2.0 base schema', 'system')
ON CONFLICT (version) DO NOTHING;
