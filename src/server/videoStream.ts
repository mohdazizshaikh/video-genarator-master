import fs from "node:fs";
import type { Request, Response } from "express";

/** Stream owned media after the caller's authorization boundary, including seeks. */
export function streamVideo(
  filePath: string,
  req: Request,
  res: Response,
): void {
  const size = fs.statSync(filePath).size;
  let start = 0,
    end = size - 1;
  const range = req.get("Range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2]) || size === 0) {
      res.setHeader("Content-Range", `bytes */${size}`);
      res.status(416).end();
      return;
    }
    if (!match[1]) start = Math.max(0, size - Number(match[2]));
    else {
      start = Number(match[1]);
      if (match[2]) end = Math.min(end, Number(match[2]));
    }
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start > end ||
      start >= size ||
      start < 0
    ) {
      res.setHeader("Content-Range", `bytes */${size}`);
      res.status(416).end();
      return;
    }
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
  }
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Length", Math.max(0, end - start + 1));
  if (req.method === "HEAD" || size === 0) {
    res.end();
    return;
  }
  const stream = fs.createReadStream(filePath, { start, end });
  res.on("close", () => stream.destroy());
  stream.on("error", () => {
    if (!res.headersSent) res.status(500).end();
    else res.destroy();
  });
  stream.pipe(res);
}
