import { Writable } from "node:stream";
import type { Request, Response, Router } from "express";
import type { AuthClaims } from "../auth";

/** Exercise Express route/middleware order without opening sockets or external services. */
export function dispatch(
  router: Router,
  method: string,
  url: string,
  options: {
    auth?: AuthClaims;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url, "http://localhost");
    const headers = options.headers ?? {};
    const req = {
      method,
      url: parsed.pathname,
      originalUrl: url,
      headers,
      query: Object.fromEntries(parsed.searchParams),
      body: options.body ?? {},
      auth: options.auth,
      get: (name: string) => headers[name.toLowerCase()],
      get path() {
        return this.url.split("?")[0];
      },
    };
    let status = 200;
    const responseHeaders: Record<string, unknown> = {};
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });
    stream.on("finish", () => resolve({ status, body: Buffer.concat(chunks) }));
    const res = Object.assign(stream, {
      status(code: number) {
        status = code;
        return this;
      },
      setHeader(name: string, value: unknown) {
        responseHeaders[name.toLowerCase()] = value;
        return this;
      },
      getHeader(name: string) {
        return responseHeaders[name.toLowerCase()];
      },
      type() {
        return this;
      },
      json(body: unknown) {
        resolve({ status, body });
        return this;
      },
      send(body: unknown) {
        resolve({ status, body });
        return this;
      },
    });
    router(
      req as unknown as Request,
      res as unknown as Response,
      (error?: unknown) => {
        if (error) reject(error);
        else resolve({ status: 404, body: { error: "Not found" } });
      },
    );
  });
}
