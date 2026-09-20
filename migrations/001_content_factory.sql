-- Content Factory PostgreSQL foundation migration.
-- This file is declarative only. It is applied only by the gated migration runner
-- after backup, reconciliation, and explicit owner approvals pass.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS migration_checkpoints (
  name text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  tier text NOT NULL DEFAULT 'starter',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subject_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'reviewer', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, subject_id)
);

CREATE TABLE IF NOT EXISTS connectors (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('telegram', 'youtube', 'instagram', 'facebook', 'linkedin', 'twitter')),
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'reauthorization_required', 'disabled', 'error')),
  credential_ref text NOT NULL,
  external_account_id text,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_health_check_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, platform, external_account_id)
);

CREATE TABLE IF NOT EXISTS connector_destinations (
  id text PRIMARY KEY,
  connector_id text NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  external_destination_id text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'verified', 'disabled', 'permission_error')),
  verification_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connector_id, external_destination_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS content_versions (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content_id text NOT NULL,
  version integer NOT NULL,
  payload jsonb NOT NULL,
  approval_status text NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, content_id, version)
);

CREATE TABLE IF NOT EXISTS releases (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content_version_id text NOT NULL REFERENCES content_versions(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'queued', 'publishing', 'partially_published', 'published', 'failed', 'cancelled')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS release_targets (
  id text PRIMARY KEY,
  release_id text NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connector_id text NOT NULL REFERENCES connectors(id) ON DELETE RESTRICT,
  destination_id text NOT NULL REFERENCES connector_destinations(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'publishing', 'published', 'retryable', 'failed', 'cancelled')),
  idempotency_key text NOT NULL UNIQUE,
  provider_request_id text,
  external_id text,
  published_url text,
  attempts integer NOT NULL DEFAULT 0,
  last_error_code text,
  next_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_connectors_workspace ON connectors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_destinations_workspace ON connector_destinations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_workspace ON content_versions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_releases_workspace_status ON releases(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_release_targets_workspace_status ON release_targets(workspace_id, status);

-- Defense in depth: target ownership must match its parent release/connector/destination.
CREATE OR REPLACE FUNCTION enforce_release_target_workspace() RETURNS trigger AS $$
DECLARE
  release_workspace text;
  connector_workspace text;
  destination_workspace text;
BEGIN
  SELECT workspace_id INTO release_workspace FROM releases WHERE id = NEW.release_id;
  SELECT workspace_id INTO connector_workspace FROM connectors WHERE id = NEW.connector_id;
  SELECT workspace_id INTO destination_workspace FROM connector_destinations WHERE id = NEW.destination_id;
  IF release_workspace IS DISTINCT FROM NEW.workspace_id
     OR connector_workspace IS DISTINCT FROM NEW.workspace_id
     OR destination_workspace IS DISTINCT FROM NEW.workspace_id THEN
    RAISE EXCEPTION 'release target ownership mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS release_target_workspace_guard ON release_targets;
CREATE TRIGGER release_target_workspace_guard
BEFORE INSERT OR UPDATE ON release_targets
FOR EACH ROW EXECUTE FUNCTION enforce_release_target_workspace();
