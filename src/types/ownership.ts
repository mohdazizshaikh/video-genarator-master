/**
 * Canonical ownership vocabulary for the Content Factory.
 *
 * Design contract:
 * - workspaceId is the authenticated tenant boundary.
 * - connectorId identifies one provider account owned by exactly one workspace.
 * - destinationId identifies one verified provider destination under one connector.
 * - releaseId identifies an approved content release and its immutable targets.
 * - contentVersion identifies the exact approved content revision being released.
 *
 * These types are intentionally metadata-only. Credential values and provider
 * tokens must never be represented in API responses, queue payloads, or logs.
 */

export type WorkspaceId = string;
export type ConnectorId = string;
export type DestinationId = string;
export type ReleaseId = string;
export type ContentVersionId = string;

export type ConnectorPlatform =
  | "telegram"
  | "youtube"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "twitter";

export type ConnectorStatus =
  | "pending"
  | "connected"
  | "reauthorization_required"
  | "disabled"
  | "error";

export type DestinationStatus =
  | "pending_verification"
  | "verified"
  | "disabled"
  | "permission_error";

export type ReleaseStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "queued"
  | "publishing"
  | "reconciling"
  | "partially_published"
  | "published"
  | "failed"
  | "cancelled";

export interface WorkspaceOwnedReference {
  workspaceId: WorkspaceId;
}

export interface ConnectorReference extends WorkspaceOwnedReference {
  connectorId: ConnectorId;
  platform: ConnectorPlatform;
}

export interface DestinationReference extends ConnectorReference {
  destinationId: DestinationId;
  status: DestinationStatus;
}

export interface ReleaseTargetReference extends DestinationReference {
  releaseId: ReleaseId;
  contentVersionId: ContentVersionId;
}

export function requireNonEmptyOwnershipId(
  value: string | undefined | null,
  fieldName: string,
): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
}
