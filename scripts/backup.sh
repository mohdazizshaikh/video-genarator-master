#!/usr/bin/env bash
# ============================================================
# Compatibility wrapper for the full backup tool
# ============================================================
# The legacy implementation of this script excluded all media,
# swallowed tar errors, and appended a second gzip member for the
# redacted .env — none of which is a restorable backup.
#
# Full backups (stores + media + logs + encrypted connector
# secrets) with a checksum manifest, optional AES-256 encryption,
# retention, and verification now live in scripts/backup.mjs:
#
#   BACKUP_PASSPHRASE=... ./scripts/backup.sh --encrypt --pause-container ace-app
#   node scripts/backup.mjs --verify
#   node scripts/restore.mjs --backup <archive> --target <dir>
#
# See docs/BACKUP_RESTORE_RUNBOOK.md. The .env file is never
# included in backups; restore secrets from the operator store.
# ============================================================

set -euo pipefail
exec node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backup.mjs" "$@"
