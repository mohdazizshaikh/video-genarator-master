-- Content Factory PostgreSQL foundation.
-- Apply only after DATABASE_URL is owner-approved and reconciliation gates pass.
-- Local file-backed stores remain authoritative until explicit cutover.

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artifact_manifests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  kind TEXT NOT NULL,
  local_path TEXT,
  object_key TEXT,
  sha256 TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  mime_type TEXT NOT NULL,
  lifecycle TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle IN ('active', 'archived', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sha256, kind)
);

CREATE INDEX IF NOT EXISTS artifact_manifests_tenant_idx ON artifact_manifests (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS job_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  job_id TEXT NOT NULL,
  type TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, job_id, sequence)
);

CREATE INDEX IF NOT EXISTS job_events_tenant_job_idx ON job_events (tenant_id, job_id, sequence);

CREATE TABLE IF NOT EXISTS release_controls (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  artifact_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'approved', 'released', 'blocked')),
  reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS release_controls_tenant_idx ON release_controls (tenant_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS migration_checkpoints (
  name TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
