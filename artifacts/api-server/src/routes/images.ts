import { Router, type IRouter } from "express";
import https from "https";
import http from "http";
import jwt from "jsonwebtoken";
import { ImageModel } from "../lib/mongodb";
import {
  GetImagesQueryParams,
  CreateImageBody,
  DeleteImageParams,
} from "@workspace/api-zod";
import { requireAuth, requireUserAuth } from "../middlewares/auth";

const JWT_SECRET = process.env.JWT_SECRET ?? "aesthetic-wallpapers-secret-key-2026";

const router: IRouter = Router();

const TWO_MINUTES = 2 * 60 * 1000;
interface CacheEntry<T> { data: T; expires: number }
const cache = new Map<string, CacheEntry<unknown>>();
function getCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry || Date.now() > entry.expires) { cache.delete(key); return null; }
  return entry.data;
}
function setCache<T>(key: string, data: T, ttl = TWO_MINUTES) {
  cache.set(key, { data, expires: Date.now() + ttl });
}
export function invalidateImagesCache() { cache.clear(); }

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
  const category = (query.success && query.data.category) ? query.data.category : null;
  const type = req.query.type as string | undefined;
  const cacheKey = `landing:${category ?? "all"}:${type ?? "all"}`;
  const cached = getCache<ReturnType<typeof toImageJson>[]>(cacheKey);
  if (cached) { res.json(cached); return; }
  const filter: Record<string, unknown> = {
    $or: [{ destination: { $in: ["landing", "both"] } }, { destination: { $exists: false } }],
  };
  if (category) filter.category = category;
  if (type) filter.type = type;
  const images = await ImageModel.find(filter).sort({ createdAt: -1 }).limit(120).lean();
  const result = (images as InstanceType<typeof ImageModel>[]).map(toImageJson);
  setCache(cacheKey, result);
  res.json(result);
});

router.get("/images/dashboard", requireUserAuth, async (req, res): Promise<void> => {
  const query = GetImagesQueryParams.safeParse(req.query);
  const category = (query.success && query.data.category) ? query.data.category : null;
  const type = req.query.type as string | undefined;
  const cacheKey = `dashboard:${category ?? "all"}:${type ?? "all"}`;
  const cached = getCache<ReturnType<typeof toImageJson>[]>(cacheKey);
  if (cached) { res.json(cached); return; }
  const filter: Record<string, unknown> = {};
  if (category) filter.category = category;
  if (type) filter.type = type;
  const images = await ImageModel.find(filter).sort({ createdAt: -1 }).limit(120).lean();
  const result = (images as InstanceType<typeof ImageModel>[]).map(toImageJson);
  setCache(cacheKey, result);
  res.json(result);
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
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
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

// Stream a TikTok video by image ID — fetches a fresh watermark-free URL on demand
router.get("/images/:id/video", async (req, res): Promise<void> => {
  // Accept token from query param since <video> elements can't set Authorization headers
  const tokenFromQuery = req.query.token as string | undefined;
  const tokenFromHeader = req.headers.authorization?.slice(7);
  const token = tokenFromQuery ?? tokenFromHeader;

  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    res.status(401).json({ error: "Invalid token" }); return;
  }

  let img: Awaited<ReturnType<typeof ImageModel.findById>>;
  try {
    img = await ImageModel.findById(req.params.id);
  } catch {
    res.status(400).json({ error: "Invalid ID" }); return;
  }

  if (!img) { res.status(404).json({ error: "Not found" }); return; }

  const tiktokUrl = img.tiktokUrl as string | null;
  if (!tiktokUrl) {
    res.status(400).json({ error: "No TikTok URL for this item" }); return;
  }

  try {
    const info = await getTiktokInfo(tiktokUrl);
    streamVideoProxy(info.downloadUrl, req.headers.range, res);
  } catch (err) {
    if (!res.headersSent) res.status(502).json({ error: `TikTok fetch failed: ${String(err)}` });
  }
});

router.post("/images", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const image = await ImageModel.create(parsed.data);
  invalidateImagesCache();
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
  invalidateImagesCache();
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

function streamVideoProxy(url: string, rangeHeader: string | undefined, res: any, redirectCount = 0): void {
  if (redirectCount > 5) { if (!res.headersSent) res.status(500).json({ error: "Too many redirects" }); return; }
  let parsed: URL;
  try { parsed = new URL(url); } catch { if (!res.headersSent) res.status(400).json({ error: "Bad URL" }); return; }
  const lib = parsed.protocol === "https:" ? https : http;
  const reqHeaders: Record<string, string> = { "User-Agent": "Mozilla/5.0", Referer: "https://www.tiktok.com/" };
  if (rangeHeader) reqHeaders.Range = rangeHeader;

  const proxyReq = lib.request(
    { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: "GET", headers: reqHeaders },
    (resp) => {
      if (resp.statusCode && resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        streamVideoProxy(resp.headers.location as string, rangeHeader, res, redirectCount + 1);
        return;
      }
      const status = rangeHeader && resp.statusCode === 206 ? 206 : (resp.statusCode ?? 200);
      if (!res.headersSent) {
        res.status(status);
        res.setHeader("Content-Type", resp.headers["content-type"] || "video/mp4");
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "no-cache, no-store");
        if (resp.headers["content-length"]) res.setHeader("Content-Length", resp.headers["content-length"]);
        if (resp.headers["content-range"]) res.setHeader("Content-Range", resp.headers["content-range"]);
      }
      resp.pipe(res as unknown as NodeJS.WritableStream);
    }
  );
  proxyReq.on("error", () => { if (!res.headersSent) res.status(500).json({ error: "Video stream error" }); });
  proxyReq.setTimeout(30000, () => { proxyReq.destroy(); if (!res.headersSent) res.status(504).json({ error: "Timed out" }); });
  proxyReq.end();
}

// Follow HTTP redirects and return the final URL (for short TikTok links)
function followRedirect(url: string, maxRedirects = 8): Promise<string> {
  return new Promise((resolve) => {
    if (maxRedirects === 0) { resolve(url); return; }
    let parsed: URL;
    try { parsed = new URL(url); } catch { resolve(url); return; }

    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
          Accept: "text/html,*/*",
        },
      },
      (resp) => {
        resp.resume(); // drain body so connection closes
        if (resp.statusCode && resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          const loc = resp.headers.location;
          const next = loc.startsWith("http") ? loc : `${parsed.protocol}//${parsed.host}${loc}`;
          resolve(followRedirect(next, maxRedirects - 1));
        } else {
          resolve(url);
        }
      }
    );
    req.on("error", () => resolve(url));
    req.setTimeout(8000, () => { req.destroy(); resolve(url); });
    req.end();
  });
}

// Normalise any TikTok link variant to a clean canonical URL
async function normalizeTiktokUrl(raw: string): Promise<string> {
  let url = raw.trim();
  if (!url.startsWith("http")) url = "https://" + url;

  // Short / share links — must resolve redirects first
  const needsRedirect =
    /vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com\/t\/|m\.tiktok\.com|tiktok\.com\/v\//.test(url);

  if (needsRedirect) {
    url = await followRedirect(url);
  }

  // Strip query params — tikwm.com chokes on ?lang=, ?_r=, etc.
  try {
    const p = new URL(url);
    url = `${p.protocol}//${p.host}${p.pathname}`.replace(/\/$/, "");
  } catch { /* keep raw */ }

  return url;
}

async function callTikwm(url: string): Promise<{ downloadUrl: string; thumbnail: string; title: string }> {
  const postData = `url=${encodeURIComponent(url)}&count=12&cursor=0&hd=1`;
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
        resp.on("data", (chunk: Buffer) => (data += chunk));
        resp.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.setTimeout(18000, () => { req.destroy(); reject(new Error("TikTok API timed out")); });
    req.write(postData);
    req.end();
  });

  const json = JSON.parse(html) as {
    code: number;
    msg?: string;
    data?: { play?: string; wmplay?: string; cover?: string; title?: string };
  };

  if (json.code !== 0 || !json.data) {
    throw new Error(json.msg ?? `tikwm error code ${json.code}`);
  }

  const downloadUrl = json.data.play || json.data.wmplay || "";
  if (!downloadUrl) throw new Error("No download URL in tikwm response");

  return {
    downloadUrl,
    thumbnail: json.data.cover || "",
    title: json.data.title || "TikTok Video",
  };
}

async function getTiktokInfo(rawUrl: string): Promise<{ downloadUrl: string; thumbnail: string; title: string }> {
  const canonical = await normalizeTiktokUrl(rawUrl);

  // First attempt with canonical URL
  try {
    return await callTikwm(canonical);
  } catch (firstErr) {
    // If canonical is different from raw, also try with the raw URL
    if (canonical !== rawUrl.trim()) {
      try {
        return await callTikwm(rawUrl.trim());
      } catch { /* fall through to throw first error */ }
    }
    throw firstErr;
  }
}
