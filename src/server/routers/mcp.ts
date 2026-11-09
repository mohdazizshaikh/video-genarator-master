import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import z from "zod";

import { ShortCreator } from "../../short-creator/ShortCreator";
import { renderConfig, sceneInput } from "../../types/shorts";
import { getAuthenticatedTenantId, requireWorkspace } from "../auth";

export class MCPRouter {
  readonly router: express.Router = express.Router();
  private closing?: Promise<void>;
  private readonly sessions = new Map<
    string,
    { tenantId: string; transport: SSEServerTransport; server: McpServer }
  >();

  constructor(private readonly shortCreator: ShortCreator) {
    this.router.use(requireWorkspace);
    this.setupRoutes();
  }

  close(): Promise<void> {
    if (!this.closing) {
      const sessions = [...this.sessions.values()];
      this.sessions.clear();
      this.closing = Promise.all(sessions.map((session) => session.server.close())).then(() => undefined);
    }
    return this.closing;
  }

  private createServer(tenantId: string): McpServer {
    // Each session owns its server and callbacks. A concurrent request must never
    // switch a shared mutable "current tenant" used by tool callbacks.
    const server = new McpServer({
      name: "Short Creator",
      version: "0.0.1" });
    server.tool(
      "get-video-status",
      "Get the status of a workspace video",
      {
        videoId: z.string().describe("The ID of the video"),
      },
      async ({ videoId }) => {
        if (!this.shortCreator.ownsVideo(tenantId, videoId)) {
          return {
            isError: true,
            content: [{ type: "text", text: "Video not found" }],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: this.shortCreator.status(videoId) }],
        };
      },
    );
    server.tool(
      "create-short-video",
      "Create a short video from a list of scenes",
      {
        scenes: z.array(sceneInput),
        config: renderConfig,
      },
      async ({ scenes, config }) => ({
          content: [
            {
              type: "text",
              text: this.shortCreator.addToQueue(
              scenes,
              config,
              config.videoType,
              config.subtitleLanguage,
              tenantId,
            ),
            },
          ],
        }),
    );
    return server;
  }

  private setupRoutes(): void {
    this.router.get("/sse", async (req, res, next) => {
      if (this.closing) { res.status(503).json({ error: "Server is shutting down" }); return; }
      const tenantId = getAuthenticatedTenantId(req)!;
      const server = this.createServer(tenantId);

      const transport = new SSEServerTransport("/mcp/messages", res);
      this.sessions.set(transport.sessionId, { tenantId, transport, server });
      res.on("close", () => {
        this.sessions.delete(transport.sessionId);
        void server.close().catch(() => undefined);
      });
      try {
        await server.connect(transport);
      } catch (error) {
        this.sessions.delete(transport.sessionId);
        next(error);
      }
    });

    this.router.post("/messages", async (req, res, next) => {
      const sessionId =
        typeof req.query.sessionId === "string" ? req.query.sessionId : "";
      const session = this.sessions.get(sessionId);
      if (!session || session.tenantId !== getAuthenticatedTenantId(req)) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      try {
        await session.transport.handlePostMessage(req, res);
      } catch (error) {
        next(error);
      }
    });
  }
}
