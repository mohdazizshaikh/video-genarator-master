import type { PlatformType } from "./shorts";

export type ProfileAccountStatus = "active" | "needs-reauth" | "error";

export interface ProfileRecord {
  /** Auth-derived owner. Legacy records without this field are not tenant-visible. */
  tenantId: string;
  id: string;
  name: string;
  description?: string;
  genres: string[];
  accountIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfileAccountRecord {
  id: string;
  profileId: string;
  provider: PlatformType;
  label: string;
  externalId?: string;
  displayName?: string;
  avatarUrl?: string;
  status: ProfileAccountStatus;
  lastError?: string;
  /** OAuth / token payload. Stored ENCRYPTED at rest (AES-256-GCM). */
  credentials: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileAccountSummary {
  id: string;
  provider: PlatformType;
  label: string;
  externalId?: string;
  displayName?: string;
  avatarUrl?: string;
  status: ProfileAccountStatus;
  lastError?: string;
  hasCredentials: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileSummary {
  id: string;
  name: string;
  description?: string;
  genres: string[];
  accounts: ProfileAccountSummary[];
  createdAt: string;
  updatedAt: string;
}

export type ProfileAccountCredentials = Record<string, string>;
