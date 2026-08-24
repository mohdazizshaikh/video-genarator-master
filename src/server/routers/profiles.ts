import { Router } from "express";
import type { Request, Response } from "express";
import crypto from "node:crypto";
import type { Config } from "../../config";
import { ProfileService } from "../../services/ProfileService";
import { buildAuthorizationUrl, defaultCallbackUrl, exchangeOAuthCode, oauthProviderInfo } from "../../services/OAuthProvider";
import { logger } from "../../logger";
import { getAuthenticatedTenantId } from "../auth";
import type { PlatformType } from "../../types/shorts";

interface PendingOAuth {
  tenantId: string;
  profileId: string;
  provider: PlatformType;
  redirectUri: string;
  expiresAt: number;
}

const PENDING_STATE_TTL_MS = 15 * 60 * 1000;

function getKeysSecret(): string {
  return process.env.TENANT_KEYS_SECRET || "";
}

export class ProfilesRouter {
  public router: Router;
  private service: ProfileService | null = null;

  constructor(private config: Config) {
    this.router = Router();
    this.registerRoutes();
  }

  private getService(): ProfileService {
    if (!this.service) {
      this.service = new ProfileService(this.config.dataDirPath, getKeysSecret());
    }
    return this.service;
  }

  private registerRoutes(): void {
    this.router.get("/", async (req: Request, res: Response) => {
      try {
        const tenantId = getAuthenticatedTenantId(req) ?? "";
        const profiles = await this.getService().listProfiles(tenantId);
        res.json({ status: "ok", data: profiles });
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list profiles" });
      }
    });

    this.router.post("/", async (req: Request, res: Response) => {
      try {
        const { name, description, genres } = req.body as {
          name?: string;
          description?: string;
          genres?: string[];
        };
        if (!name || !String(name).trim()) {
          res.status(400).json({ error: "name is required" });
          return;
        }
        const tenantId = getAuthenticatedTenantId(req) ?? "";
        const profile = await this.getService().createProfile(tenantId, {
          name: String(name).trim(),
          description: description ? String(description) : undefined,
          genres: Array.isArray(genres) ? genres.map(String) : [],
        });
        res.status(201).json({ status: "ok", data: profile });
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create profile" });
      }
    });

    this.router.post("/resolve", async (req: Request, res: Response) => {
      try {
        const { category, platform } = req.body as { category?: string; platform?: PlatformType };
        if (!category || !platform) {
          res.status(400).json({ error: "category and platform are required" });
          return;
        }
        const tenantId = getAuthenticatedTenantId(req) ?? "";
        const accounts = await this.getService().resolveAccountsFor(tenantId, String(category), platform);
        res.json({ status: "ok", data: accounts });
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to resolve accounts" });
      }
    });

    this.router.get("/:id", async (req: Request, res: Response) => {
      try {
        const tenantId = getAuthenticatedTenantId(req) ?? "";
        const profile = await this.getService().getProfile(tenantId, req.params.id);
        if (!profile) {
          res.status(404).json({ error: "Profile not found" });
          return;
        }
        res.json({ status: "ok", data: profile });
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get profile" });
      }
    });

    this.router.patch("/:id", async (req: Request, res: Response) => {
      try {
        const { name, description, genres } = req.body as {
          name?: string;
          description?: string;
          genres?: string[];
        };
        const patch: { name?: string; description?: string; genres?: string[] } = {};
        if (name !== undefined) patch.name = String(name);
        if (description !== undefined) patch.description = String(description);
        if (genres !== undefined) patch.genres = genres.map(String);
        const tenantId = getAuthenticatedTenantId(req) ?? "";
        const profile = await this.getService().updateProfile(tenantId, req.params.id, patch);
        if (!profile) {
          res.status(404).json({ error: "Profile not found" });
          return;
        }
        res.json({ status: "ok", data: profile });
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update profile" });
      }
    });

    this.router.delete("/:id", async (req: Request, res: Response) => {
      try {
        const tenantId = getAuthenticatedTenantId(req) ?? "";
        const removed = await this.getService().removeProfile(tenantId, req.params.id);
        if (!removed) {
          res.status(404).json({ error: "Profile not found" });
          return;
        }
        res.json({ status: "ok", data: { removed: true } });
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete profile" });
      }
    });

    // Accounts
    this.router.get("/:id/accounts", async (req: Request, res: Response) => {
      try {
        const tenantId = getAuthenticatedTenantId(req) ?? "";
        const profile = await this.getService().getProfile(tenantId, req.params.id);
        if (!profile) {
          res.status(404).json({ error: "Profile not found" });
          return;
        }
        res.json({ status: "ok", data: profile.accounts });
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list accounts" });
      }
    });

    this.router.post("/:id/accounts", async (req: Request, res: Response) => {
      try {
        const { provider, label, credentials, externalId, displayName, avatarUrl } = req.body as {
          provider?: PlatformType;
          label?: string;
          credentials?: Record<string, string>;
          externalId?: string;
          displayName?: string;
          avatarUrl?: string;
        };
        if (!provider) {
          res.status(400).json({ error: "provider is required" });
          return;
        }
        if (!label || !String(label).trim()) {
          res.status(400).json({ error: "label is required" });
          return;
        }
        if (!credentials || typeof credentials !== "object" || Object.keys(credentials).length === 0) {
          res.status(400).json({ error: "credentials are required (e.g. botToken+channelId, refreshToken, accessToken)" });
          return;
        }
        const tenantId = getAuthenticatedTenantId(req) ?? "";
        const account = await this.getService().addAccount(tenantId, {
          profileId: req.params.id,
          provider,
          label: String(label).trim(),
          credentials,
          externalId: externalId ? String(externalId) : undefined,
          displayName: displayName ? String(displayName) : undefined,
          avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
        });
        if (!account) {
          res.status(404).json({ error: "Profile not found" });
          return;
        }
        res.status(201).json({ status: "ok", data: account });
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to add account" });
      }
    });

    this.router.delete("/:id/accounts/:accountId", async (req: Request, res: Response) => {
      try {
        const tenantId = getAuthenticatedTenantId(req) ?? "";
        const removed = await this.getService().removeAccount(tenantId, req.params.id, req.params.accountId);
        if (!removed) {
          res.status(404).json({ error: "Account not found for this profile" });
          return;
        }
        res.json({ status: "ok", data: { removed: true } });
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete account" });
      }
    });

    this.router.post("/:id/accounts/:accountId/refresh", async (req: Request, res: Response) => {
      try {
        const tenantId = getAuthenticatedTenantId(req) ?? "";
        const account = await this.getService().getAccount(tenantId, req.params.accountId);
        if (!account) {
          res.status(404).json({ error: "Account not found" });
          return;
        }
        const info = oauthProviderInfo(account.provider);
        res.json({
          status: "ok",
          data: {
            refreshed: false,
            reason: info.webOAuthSupported
              ? "Token refresh is handled automatically on next publish"
              : info.hint,
          },
        });
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to refresh account" });
      }
    });
  }
}

export class OAuthRouter {
  public router: Router;
  private service: ProfileService | null = null;
  private pending = new Map<string, PendingOAuth>();

  constructor(private config: Config) {
    this.router = Router();
    this.registerRoutes();
  }

  private getService(): ProfileService {
    if (!this.service) {
      this.service = new ProfileService(this.config.dataDirPath, getKeysSecret());
    }
    return this.service;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [state, entry] of this.pending.entries()) {
      if (entry.expiresAt < now) this.pending.delete(state);
    }
  }

  private registerRoutes(): void {
    this.router.post("/:provider/connect", async (req: Request, res: Response) => {
      try {
        const { provider } = req.params;
        const { profileId, redirectUri, clientId } = req.body as {
          profileId?: string;
          redirectUri?: string;
          clientId?: string;
        };
        const info = oauthProviderInfo(provider as PlatformType);
        if (!info.webOAuthSupported) {
          res.status(400).json({ error: `${provider} OAuth connect is not implemented`, hint: info.hint });
          return;
        }
        if (!profileId) {
          res.status(400).json({ error: "profileId is required" });
          return;
        }
        const tenantId = getAuthenticatedTenantId(req) ?? "";
        const profile = await this.getService().getProfileRecord(tenantId, profileId);
        if (!profile) {
          res.status(404).json({ error: "Profile not found" });
          return;
        }
        const state = crypto.randomBytes(24).toString("base64url");
        const callbackUri = defaultCallbackUrl({ redirectUri }, provider as PlatformType);
        this.pending.set(state, {
          tenantId,
          profileId,
          provider: provider as PlatformType,
          redirectUri: callbackUri,
          expiresAt: Date.now() + PENDING_STATE_TTL_MS,
        });
        const authorizationUrl = buildAuthorizationUrl(
          provider as PlatformType,
          { profileId, redirectUri, clientId },
          process.env.YOUTUBE_CLIENT_SECRET || "",
          state,
        );
        res.json({ status: "ok", data: { authorizationUrl, state, provider } });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to start OAuth";
        logger.error({ err: message }, "OAuth connect failed");
        res.status(400).json({ error: message });
      }
    });

    this.router.get("/:provider/callback", async (req: Request, res: Response) => {
      const { provider } = req.params;
      const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

      const fail = (reason: string): void => {
        res.redirect(`/oauth/success?status=error&provider=${provider}&reason=${encodeURIComponent(reason)}`);
      };

      this.pruneExpired();
      const pendingState = state;
      const entry = pendingState ? this.pending.get(pendingState) : undefined;
      if (!pendingState || !entry) {
        fail("OAuth session expired or invalid. Please try connecting again.");
        return;
      }
      this.pending.delete(pendingState);

      if (error) {
        fail(`User cancelled or provider returned an error: ${error}`);
        return;
      }
      if (!code) {
        fail("No authorization code returned.");
        return;
      }

      try {
        const result = await exchangeOAuthCode(
          entry.provider,
          code,
          entry.redirectUri,
          process.env.YOUTUBE_CLIENT_SECRET || "",
        );
        const account = await this.getService().addAccount(entry.tenantId, {
          profileId: entry.profileId,
          provider: entry.provider,
          label: `${entry.provider} account ${result.displayName ? `(${result.displayName})` : ""}`.trim(),
          credentials: result.credentials,
          externalId: result.externalId,
          displayName: result.displayName,
          avatarUrl: result.avatarUrl,
        });
        res.redirect(`/oauth/success?status=success&provider=${entry.provider}&accountId=${account?.id || ""}`);
      } catch (exchangeError: unknown) {
        const reason = exchangeError instanceof Error ? exchangeError.message : "Token exchange failed";
        logger.error({ err: reason, provider }, "OAuth token exchange failed");
        fail(reason);
      }
    });
  }
}
