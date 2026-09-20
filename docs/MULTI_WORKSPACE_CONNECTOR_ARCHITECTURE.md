# Multi-Workspace Connector Architecture

> **Document status: consolidated source of truth for connector evolution.** This document does not replace the existing tenant, profile-account, channel-config, publishing, scheduling, migration, or local-setup runbooks. It records the current implementation first, resolves terminology conflicts, and then defines the approved target model. Any item marked **Planned** must not be described as an already available feature.

## Existing documentation map

| Existing document | Authority | Relationship to this document |
|---|---|---|
| `docs/ARCHITECTURE.md` | Historical system overview | Describes the original file-backed architecture and global provider configuration; use `docs/CURRENT_STATUS.md` and the migration matrix for current migration state. |
| `docs/DATABASE_SCHEMA.md` | Existing JSON-store contracts | Defines current `tenants.json`, `profiles.json`, `profileAccounts.json`, `channelConfigs.json`, `publishJobs.json`, and `schedules.json` shapes. It is not a PostgreSQL connector schema. |
| `docs/PIPELINE.md` | Content-generation pipeline | Defines generation, scoring, comparison, and optional scheduling. It does not define connector credential ownership. |
| `docs/MIGRATION_RUNBOOK.md` | Migration safety gates | Remains authoritative for backup, reconciliation, rollback, and fail-closed migration approvals. |
| `docs/POSTGRES_MINIO_MIGRATION_MATRIX.md` | Storage migration status | Remains authoritative for PostgreSQL/MinIO readiness and cutover flags. |
| `docs/LOCAL_DURABLE_SERVICES_SETUP.md` | Local Docker operation | Remains authoritative for local PostgreSQL, MinIO, Redis, and app configuration. |
| `docs/LOCAL_TEST_AUTH.md` | Local authentication | Remains authoritative for API-key login and temporary local credentials. |

## Current implementation versus target

The current platform already has tenant-scoped profile accounts, channel mappings, publisher adapters, publish jobs, schedules, and a publish worker. It does **not** yet have the connector/destination model described below as a fully implemented PostgreSQL-backed subsystem.

| Capability | Current implementation | Target in this document | Status |
|---|---|---|---|
| Workspace root | `TenantStore` and authenticated tenant claims | Workspace/tenant remains the root ownership boundary | **Implemented, migration-aware** |
| External account ownership | `ProfileAccountStore` accounts belong to a profile, which is tenant-scoped | First-class workspace-owned connectors with destinations | **Current profile model; connector migration planned** |
| Channel mapping | `ChannelConfigStore` stores tenant/category/platform/channel ID mappings | Verified destinations owned by a connector | **Current mapping exists; not equivalent to a connector** |
| Credentials | Profile account credentials are encrypted at rest; publisher code can still fall back to global config | Encrypted connector credential records only, with no global fallback | **Partially implemented; fallback must be removed before production** |
| Telegram publishing | `TelegramPublisher` uses one configured bot token and channel ID; its schedule method uploads immediately | Multiple Telegram bot connectors and verified destinations | **Single-bot current path; multi-bot planned** |
| Publish queue | `PublishWorker` re-fetches tenant-owned accounts and records attempts | Connector/destination revalidation plus idempotent release targets | **Partially implemented; hardening planned** |
| Schedules | `ScheduleStore` and scheduler persist platform-level schedules | Workspace/connector/destination release targets | **Platform schedule current; target fan-out planned** |
| UI integration | Tenant integrations card is a coarse connected/disconnected toggle; profile UI handles accounts | Connector detail, destination verification, capability, approval, and rotation UI | **Target UI planned** |
| Storage | Local JSON stores remain in use while migration gates are closed | PostgreSQL metadata plus MinIO media after approved cutover | **Migration not complete** |

## Conflict resolutions

The following rules prevent this document from creating a parallel or contradictory architecture:

1. **“Workspace”, “tenant”, and “profile” are not interchangeable.** A tenant/workspace is the security root. A profile is currently a tenant-owned client/niche grouping. A future connector may be workspace-owned and may optionally be associated with a profile, but profile association must not weaken workspace authorization.
2. **`profileAccounts` is the current account contract; `connectors` is the target contract.** Do not create both stores for the same account during ordinary feature work. The migration plan must define a one-time mapping from profile accounts to connector records, preserve IDs where possible, and keep the old read path until reconciliation evidence passes.
3. **`channelConfigs` is a routing/mapping record, not a credential vault or destination registry.** It may remain for category-to-channel rules during migration, but it must not be treated as proof that a Telegram destination is verified or publishable.
4. **Global provider environment variables are legacy fallback configuration.** They may be used only for explicitly documented local compatibility tests. A production release must require a workspace-owned connector reference and must reject a missing connector rather than silently using a global token.
5. **`publishJobs` and `schedules` remain existing contracts.** The release-target model below is a hardening direction, not a replacement that can be introduced by changing documentation alone. Existing jobs must be migrated or supported through a versioned compatibility path.
6. **Migration status overrides historical diagrams.** Where `ARCHITECTURE.md` or `DATABASE_SCHEMA.md` describes file-backed storage as the current production architecture, `CURRENT_STATUS.md`, the migration runbook, and migration matrix provide the newer operational status. No PostgreSQL/MinIO cutover is implied by this document.

## Purpose

AI Content Empire is a multi-tenant content factory. Each workspace represents a separate client or business, and each workspace may own one or more Telegram bots, Telegram destinations, and social-media accounts. The connector system must therefore treat **workspace identity as the security boundary**: a job created for Workspace A must never read credentials, media, schedules, quotas, or destinations belonging to Workspace B.

The recommended design is a control plane plus a delivery plane. The dashboard is the control plane where an authorized workspace administrator connects accounts, chooses destinations, configures schedules, and approves content. Background workers form the delivery plane: they load only the connector reference attached to a job, decrypt the credential only inside the delivery boundary, publish to the provider, and record an auditable result.

## Core rule

> Never select a connector by provider name alone. Every connector lookup must use both `workspaceId` and `connectorId`, and the server must verify that the connector belongs to the authenticated workspace before any credential or publishing action is allowed.

## How the relationship works

The hierarchy should be:

```text
Workspace
  └── Connector account
        ├── Provider: telegram, youtube, instagram, facebook, etc.
        ├── Credential reference: encrypted server-side secret
        ├── Destinations: bot/channel/page/account targets
        ├── Capabilities: publish, schedule, analytics, media types
        └── Status: pending, connected, degraded, revoked, disabled

Content item
  └── Release job
        ├── workspaceId
        ├── approved content version
        ├── connectorId
        ├── destinationId
        ├── idempotency key
        └── delivery status and provider response metadata
```

A connector is an account integration, not merely a provider label. A single workspace can have two Telegram bots, while two different workspaces can each have a Telegram bot with completely separate credentials. The UI should show friendly names such as “Aaditech Main Bot” and “Aaditech Campaign Bot”, while the server uses immutable IDs.

## Recommended data model

The names below are logical models. They can be mapped onto the project’s PostgreSQL schema during implementation.

| Model | Important fields | Security and behavior |
|---|---|---|
| `workspaces` | `id`, `name`, `status`, `plan`, `created_by` | Tenant root. Never accept a client-provided workspace as authority; derive access from the authenticated membership. |
| `workspace_members` | `workspace_id`, `user_id`, `role`, `status` | Roles should include owner, admin, editor, approver, publisher, analyst, and viewer. |
| `connectors` | `id`, `workspace_id`, `provider`, `display_name`, `status`, `capabilities`, `created_by`, `last_checked_at` | Unique ownership is `(workspace_id, id)`. Provider is descriptive, not an authorization key. |
| `connector_credentials` | `connector_id`, `secret_ciphertext`, `secret_version`, `last_rotated_at`, `expires_at` | Store encrypted values only. Never return them to React, logs, audit events, or API responses. |
| `connector_destinations` | `id`, `connector_id`, `external_id`, `display_name`, `destination_type`, `enabled` | Telegram bot may have multiple approved channel/group destinations. Social connectors may have multiple pages/accounts if the provider supports it. |
| `connector_scopes` | `connector_id`, `scope`, `granted_at` | Records provider permissions such as publish, read insights, or upload media. |
| `content_releases` | `id`, `workspace_id`, `content_asset_id`, `content_version`, `approval_state` | A release is immutable after approval; edits create a new content version. |
| `release_targets` | `release_id`, `connector_id`, `destination_id`, `scheduled_for`, `status` | One release can fan out to several destinations, but every target remains independently retryable. |
| `delivery_attempts` | `release_target_id`, `attempt_no`, `started_at`, `finished_at`, `status`, `provider_request_id`, `safe_error_code` | Store sanitized provider metadata, never access tokens or full request bodies containing secrets. |
| `audit_events` | `workspace_id`, `actor_id`, `action`, `resource_type`, `resource_id`, `outcome`, `metadata` | Append-only security trail for connection, rotation, approval, publish, revoke, and failure events. |

Every table that contains workspace-owned data must include `workspace_id` directly or be reachable through a server-enforced ownership relation. Add database constraints and indexes for `(workspace_id, status)`, `(workspace_id, provider)`, and `(workspace_id, created_at)`.

## Telegram: multiple bots and destinations

A Telegram bot token belongs to one bot identity. The platform should represent each bot as a separate connector record. It must not overwrite a previous bot token when a second bot is added.

The connection flow should be:

1. A workspace owner or admin selects **Add Telegram Bot** and gives the integration a friendly name.
2. The user provides the bot token through a protected server form or a one-time connection flow. The token must never be placed in a URL, browser local storage, client bundle, job payload, or log.
3. The server validates the token with a minimal provider identity check, stores the encrypted secret, and records the bot identity returned by the provider without storing the token in plain text.
4. The administrator adds or selects an approved destination. The destination should be represented by the external chat/channel ID, not only by its human-readable name.
5. The connector remains `pending` until the destination is verified and the workspace administrator explicitly enables publishing.
6. A Telegram release job references `workspaceId`, `connectorId`, and `destinationId`. The worker loads the encrypted credential only after rechecking ownership and enabled status.

A workspace may therefore have:

| Workspace | Connector | Destination | Allowed use |
|---|---|---|---|
| Aaditech Solution | Aaditech Main Bot | Aaditech public channel | Approved marketing reels and captions |
| Aaditech Solution | Aaditech Campaign Bot | Campaign discussion group | Internal review or campaign-specific posts |
| Another client | Client B Bot | Client B channel | Client B content only |

The same bot can technically be used for more than one destination if the provider permits it, but each destination should still be separately registered, verified, enabled, and auditable. The release target must not accept an arbitrary chat ID from the browser; it must select from destinations already registered to that connector.

## Social-media connectors

Social connectors follow the same model even though their authentication differs. A provider account, page, channel, or business profile becomes a connector owned by exactly one workspace. OAuth access and refresh tokens are encrypted server-side, and the UI receives only masked identity information and capability status.

The common lifecycle is:

```text
not_connected
  → authorization_pending
  → connected
  → health_check_failed / degraded
  → reauthorization_required
  → revoked or disabled
```

The connector adapter should expose a provider-neutral interface:

```text
validateCredential()
listDestinations()
getCapabilities()
uploadMedia(asset)
createDraft(metadata)
publishDraft(draft)
getPublishStatus(providerRequestId)
revoke()
```

Provider-specific behavior belongs inside the adapter. The release pipeline should not contain provider-specific branching such as “if Instagram then...”; it should call the connector adapter and handle normalized outcomes. This makes it possible to add YouTube, Instagram, Facebook, LinkedIn, or other providers without weakening tenant isolation.

## Permission model

Workspace membership and connector permissions should be separate. Being an editor does not automatically grant permission to connect an account or publish externally.

| Role | Connect or rotate credentials | Create content | Approve content | Publish | View analytics |
|---|---:|---:|---:|---:|---:|
| Owner | Yes | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes | Yes |
| Editor | No | Yes | No | No | Limited |
| Approver | No | Yes | Yes | No | Limited |
| Publisher | No | No | No | Yes, only approved releases | Limited |
| Analyst | No | No | No | No | Yes |
| Viewer | No | No | No | No | No or limited |

For the first release, keep the system fail-closed: connecting a bot or social account must not automatically authorize posting. The workspace owner must explicitly enable the connector, approve the content, and approve the destination.

## Content release and auto-posting flow

The safe posting pipeline should be:

```text
Create content
  → quality and policy checks
  → workspace draft
  → human approval
  → release created
  → target connector/destination validated
  → scheduled queue job
  → worker claims job with idempotency key
  → media uploaded or referenced
  → provider publish call
  → provider result normalized
  → audit event + dashboard status
```

The worker must revalidate the following at execution time, not only when the schedule is created:

- The workspace still exists and is active.
- The connector belongs to that workspace and is enabled.
- The destination belongs to that connector and is enabled.
- The content release is still approved and has not been revoked.
- The scheduled time and campaign state allow publication.
- The connector has not exceeded its workspace/provider rate limit.

A content release should be idempotent. Use a deterministic key such as `workspaceId:releaseId:destinationId:contentVersion`. If a worker crashes after a provider accepts a post but before the local database is updated, a retry must first check the provider status or a stored provider request ID rather than blindly publishing a duplicate.

## Queue and retry policy

Use separate logical queues or routing keys for each operation class: connector health checks, media upload, publish, status reconciliation, and token refresh. Jobs should include IDs and references only; never place secrets in BullMQ/Redis payloads.

| Failure type | Retry behavior | User-visible result |
|---|---|---|
| Temporary network failure | Exponential backoff with jitter, bounded attempts | “Retrying delivery” |
| Provider rate limit | Honor provider retry-after when available; apply per-connector limiter | “Rate limited; next attempt at…” |
| Expired OAuth token | Pause target, refresh once if authorized, otherwise require reauthorization | “Reauthorization required” |
| Invalid Telegram token | No automatic retry; disable connector | “Credential invalid” |
| Destination not found/permission denied | No rapid retry; mark destination degraded | “Destination access lost” |
| Content policy/provider rejection | No retry until content is edited and reapproved | “Rejected by provider” |
| Unknown server error | Bounded retry, alert after threshold | “Delivery failed; inspect logs” |

Retries must never bypass approval or tenant checks. A failed job should not be moved to another workspace, connector, or destination by editing a browser request.

## API boundary

Recommended server endpoints are workspace-scoped and authorization-derived:

```text
GET    /api/workspaces/:workspaceId/connectors
POST   /api/workspaces/:workspaceId/connectors
GET    /api/workspaces/:workspaceId/connectors/:connectorId
POST   /api/workspaces/:workspaceId/connectors/:connectorId/health-check
POST   /api/workspaces/:workspaceId/connectors/:connectorId/rotate
POST   /api/workspaces/:workspaceId/connectors/:connectorId/disable
GET    /api/workspaces/:workspaceId/connectors/:connectorId/destinations
POST   /api/workspaces/:workspaceId/connectors/:connectorId/destinations/verify
POST   /api/workspaces/:workspaceId/releases/:releaseId/publish
```

The server should not trust `workspaceId` from the request body. If it appears in the URL, middleware must compare it with the authenticated membership and reject mismatches with `403`. For normal users, the authenticated workspace should be derived from the session or an explicitly selected workspace that the membership service has authorized. Admin-only maintenance operations must be kept separate and audited.

Responses should expose safe fields only:

```json
{
  "id": "connector_123",
  "provider": "telegram",
  "displayName": "Aaditech Main Bot",
  "status": "connected",
  "maskedIdentity": "@aaditech_channel",
  "capabilities": ["publish_video", "publish_caption"],
  "lastHealthCheckAt": "2026-08-27T10:00:00.000Z"
}
```

Never return `botToken`, OAuth access tokens, refresh tokens, encryption keys, or raw provider error bodies to the frontend.

## UI behavior

The workspace selector must be above connector pages and must never be allowed to remain empty while a connector request is being constructed. The connector page should show only connectors belonging to the selected workspace.

The UI should provide these states:

- **Not connected:** explain what the connection enables and show a Connect action.
- **Authorization pending:** show the next user step without exposing a secret.
- **Connected:** show provider identity, capabilities, last health check, destinations, and Disable/Rotate actions according to role.
- **Degraded:** show a safe error code and a recovery action such as Reauthorize or Verify destination.
- **Disabled:** show why posting is blocked and who disabled it.

Posting controls should be disabled unless the connector, destination, content approval, and user permission checks all pass. A “Telegram connected” badge alone must never imply that auto-posting is enabled.

## Audit and observability

Every connector mutation and delivery transition should create an audit event. Recommended actions include `connector.created`, `connector.health_checked`, `connector.rotated`, `connector.disabled`, `destination.verified`, `release.approved`, `release.revoked`, `publish.started`, `publish.succeeded`, `publish.retrying`, and `publish.failed`.

Logs should include `workspaceId`, `connectorId`, `destinationId`, `releaseId`, a correlation ID, provider name, operation, status, duration, and safe error code. Do not log tokens, authorization headers, full signed URLs, raw request bodies, or provider responses that may contain sensitive data.

Metrics should be available by workspace and connector without leaking credential values: queue depth, publish success rate, retry count, provider latency, rate-limit events, token refresh failures, and last successful delivery time.

## Local Docker and production operation

For the current local Docker stack, PostgreSQL stores connector metadata and MinIO stores media assets. Redis/BullMQ handles background delivery jobs. The app and worker may run in one container during development, but production should separate the web/API process from connector workers so a slow provider cannot block the dashboard.

The local environment should use a development-only encryption key and development-only bot credentials supplied by the owner through `.env`; these values must remain outside Git. Production should use a managed secret or key-management service, rotate credentials, restrict worker permissions, and enable TLS for PostgreSQL, Redis, MinIO, and the public webhook endpoint.

For a continuously available Telegram or social-media event receiver, the service must run on an always-on host or persistent process. For scheduled deterministic publishing, a background worker with database-backed schedules is preferable to creating a full AI session for each post. The user’s local Docker stack is appropriate for current development and end-to-end testing, but it is not a production delivery guarantee unless the machine remains online and reachable.

## Recommended implementation order

| Phase | Deliverable | Security gate |
|---|---|---|
| 1 | PostgreSQL connector and destination schema, workspace foreign keys, indexes | All reads/writes require workspace ownership |
| 2 | Credential encryption service and masked connector CRUD | Secrets never enter client, logs, or job payloads |
| 3 | Telegram adapter with token health check and destination verification | Explicit connector enable and owner approval |
| 4 | Provider-neutral release target and idempotent queue job | Recheck workspace, connector, destination, and approval at execution |
| 5 | Connector status UI and audit timeline | Role-based actions and safe error states |
| 6 | Social provider adapters one at a time | Official provider scopes and token lifecycle per adapter |
| 7 | Reconciliation, rate limits, metrics, and recovery tooling | No duplicate posts after worker crash |
| 8 | Production deployment hardening | Secret rotation, TLS, backups, alerting, and always-on workers |

## Direct answer for Aaditech Solution

Aaditech should receive its own workspace-scoped connector records. For the first implementation, create one Telegram connector named **Aaditech Main Bot**, register only the intended channel as a destination, keep the connector disabled until the owner verifies it, and require approval for every marketing reel. A second Aaditech bot can be added later as another connector without changing the workspace or sharing credentials.

The correct mental model is therefore:

```text
Aaditech Solution
  ├── Aaditech Main Bot → Aaditech public channel → approved marketing posts
  ├── Aaditech Campaign Bot → campaign group → optional internal review
  └── YouTube/Instagram/Facebook connectors → separate account credentials
```

No Telegram post should be sent merely because a token exists. The system should require a valid workspace session, a connector-owned destination, an enabled connector, approved content, a publisher-authorized actor or schedule, and an idempotent release job.
