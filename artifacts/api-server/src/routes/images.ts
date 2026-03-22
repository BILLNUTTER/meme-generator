import { Router, type IRouter } from "express";
import https from "https";
import http from "http";
import { ImageModel } from "../lib/mongodb";
import {
  GetImagesQueryParams,
  CreateImageBody,
  DeleteImageParams,
} from "@workspace/api-zod";
import { requireAuth, requireUserAuth } from "../middlewares/auth";

const router: IRouter = Router();

function toImageJson(doc: InstanceType<typeof ImageModel>) {
  return {
    id: (doc._id as unknown as { toString(): string }).toString(),
    url: doc.url as string,
    title: (doc.title as string | null) ?? null,
    category: doc.category as string,
    destination: doc.destination as string,
    type: (doc.type as string) ?? "wallpaper",
    tiktokUrl: (doc.tiktokUrl as string | null) ?? null,
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

router.get("/images", async (req, res): Promise<void> => {
  const query = GetImagesQueryParams.safeParse(req.query);
  const filter: Record<string, unknown> = {
    $or: [{ destination: { $in: ["landing", "both"] } }, { destination: { $exists: false } }],
  };
  if (query.success && query.data.category) {
    filter.category = query.data.category;
  }
  if (req.query.type) {
    filter.type = req.query.type;
  }
  const images = await ImageModel.find(filter).sort({ createdAt: -1 });
  res.json(images.map(toImageJson));
});

router.get("/images/dashboard", requireUserAuth, async (req, res): Promise<void> => {
  const query = GetImagesQueryParams.safeParse(req.query);
  const filter: Record<string, unknown> = {};
  if (query.success && query.data.category) {
    filter.category = query.data.category;
  }
  if (req.query.type) {
    filter.type = req.query.type;
  }
  const images = await ImageModel.find(filter).sort({ createdAt: -1 });
  res.json(images.map(toImageJson));
});

// Resolve a Pinterest URL to a direct image URL
router.post("/images/resolve-pinterest", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  try {
    const imageUrl = await resolvePinterestUrl(url);
    res.json({ imageUrl, title: null });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Get TikTok video info for watermark-free download via tikwm.com
router.post("/images/tiktok-info", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  try {
    const info = await getTiktokInfo(url);
    res.json(info);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Proxy-download any external URL (bypasses CORS for images + TikTok videos)
router.get("/images/download-proxy", async (req, res): Promise<void> => {
  const { url, filename } = req.query as { url?: string; filename?: string };
  if (!url) { res.status(400).json({ error: "url required" }); return; }

  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  const safeFilename = (filename || "aesthetic.jpg").replace(/[^a-z0-9._\-() ]/gi, "_");
  streamProxy(url, res, safeFilename, 0);
});

router.post("/images", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const image = await ImageModel.create(parsed.data);
  res.status(201).json(toImageJson(image));
});

router.delete("/images/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteImageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const deleted = await ImageModel.findByIdAndDelete(params.data.id);
  if (!deleted) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;

// ── Helpers ───────────────────────────────────────────────

function fetchUrl(url: string, options: { method?: string; headers?: Record<string, string> } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;

    const req = lib.request(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: options.method || "GET", headers: { "User-Agent": "Mozilla/5.0", ...options.headers } },
      (resp) => {
        if (resp.statusCode && resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          fetchUrl(resp.headers.location, options).then(resolve).catch(reject);
          return;
        }
        let data = "";
        resp.on("data", (chunk) => (data += chunk));
        resp.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("Request timed out")); });
    req.end();
  });
}

async function resolvePinterestUrl(pinUrl: string): Promise<string> {
  // Try Pinterest's public oembed API first (no auth needed, reliable)
  try {
    const oembedUrl = `https://www.pinterest.com/oembed/?url=${encodeURIComponent(pinUrl)}&format=json`;
    const json = await fetchUrl(oembedUrl);
    const data = JSON.parse(json) as { thumbnail_url?: string; title?: string };
    if (data.thumbnail_url) {
      // Pinterest oembed gives a small thumbnail – bump it to the largest size
      const large = data.thumbnail_url
        .replace(/\/\d+x\//, "/originals/")
        .replace(/_b\.jpg/, "_o.jpg");
      return large;
    }
  } catch {
    // fall through to HTML scrape
  }

  // Fallback: fetch the page and extract og:image
  const html = await fetchUrl(pinUrl);
  const ogMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch?.[1]) return ogMatch[1].replace(/&amp;/g, "&");

  throw new Error("Could not extract image from Pinterest URL. Try pasting the direct image URL instead.");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function streamProxy(url: string, res: any, filename: string, redirectCount: number): void {
  if (redirectCount > 5) { if (!res.headersSent) res.status(500).json({ error: "Too many redirects" }); return; }
  const parsed = new URL(url);
  const lib = parsed.protocol === "https:" ? https : http;
  const req = lib.request(
    { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: "GET", headers: { "User-Agent": "Mozilla/5.0" } },
    (resp) => {
      if (resp.statusCode && resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        streamProxy(resp.headers.location as string, res, filename, redirectCount + 1);
        return;
      }
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", resp.headers["content-type"] || "application/octet-stream");
      if (resp.headers["content-length"]) res.setHeader("Content-Length", resp.headers["content-length"]);
      res.setHeader("Access-Control-Allow-Origin", "*");
      resp.pipe(res as unknown as NodeJS.WritableStream);
    }
  );
  req.on("error", () => { if (!res.headersSent) res.status(500).json({ error: "Download failed" }); });
  req.setTimeout(30000, () => { req.destroy(); if (!res.headersSent) res.status(500).json({ error: "Timed out" }); });
  req.end();
}

async function getTiktokInfo(tiktokUrl: string): Promise<{ downloadUrl: string; thumbnail: string; title: string }> {
  const postData = `url=${encodeURIComponent(tiktokUrl)}&count=12&cursor=0&hd=1`;
  const html = await new Promise<string>((resolve, reject) => {
    const req = https.request(
      {
        hostname: "www.tikwm.com",
        path: "/api/",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
          "User-Agent": "Mozilla/5.0",
        },
      },
      (resp) => {
        let data = "";
        resp.on("data", (chunk) => (data += chunk));
        resp.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("TikTok API timed out")); });
    req.write(postData);
    req.end();
  });

  const json = JSON.parse(html) as {
    code: number;
    data?: { play?: string; cover?: string; title?: string; wmplay?: string };
  };

  if (json.code !== 0 || !json.data) {
    throw new Error("Failed to fetch TikTok video info");
  }

  const downloadUrl = json.data.play || json.data.wmplay || "";
  if (!downloadUrl) throw new Error("No download URL found for this TikTok");

  return {
    downloadUrl,
    thumbnail: json.data.cover || "",
    title: json.data.title || "TikTok Video",
  };
}
