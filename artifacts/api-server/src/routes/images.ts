import { Router, type IRouter } from "express";
import https from "https";
import http from "http";
import jwt from "jsonwebtoken";
import { query, queryOne } from "../lib/db";
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

interface ImageRow {
  id: string; url: string; title: string | null; category: string;
  destination: string; type: string; tiktok_url: string | null;
  thumbnail: string | null; created_at: string;
}
function toImageJson(row: ImageRow) {
  return {
    id: row.id, url: row.url, title: row.title ?? null, category: row.category,
    destination: row.destination, type: row.type ?? "wallpaper",
    tiktokUrl: row.tiktok_url ?? null, thumbnail: row.thumbnail ?? null,
    createdAt: row.created_at,
  };
}

// Public app settings
router.get("/settings", async (req, res): Promise<void> => {
  const doc = await queryOne<{ value: unknown }>("SELECT value FROM settings WHERE key = 'tiktokPaidMode'");
  res.json({ tiktokPaidMode: doc?.value ?? false });
});

router.get("/images", async (req, res): Promise<void> => {
  const q = GetImagesQueryParams.safeParse(req.query);
  const category = (q.success && q.data.category) ? q.data.category : null;
  const type = req.query.type as string | undefined;
  const cacheKey = `landing:${category ?? "all"}:${type ?? "all"}`;
  const cached = getCache<ReturnType<typeof toImageJson>[]>(cacheKey);
  if (cached) { res.json(cached); return; }

  let sql = `SELECT * FROM images WHERE (destination IN ('landing','both'))`;
  const params: unknown[] = [];
  let idx = 1;
  if (category) { sql += ` AND category = $${idx++}`; params.push(category); }
  if (type) { sql += ` AND type = $${idx++}`; params.push(type); }
  sql += ` ORDER BY created_at DESC LIMIT 120`;

  const images = await query<ImageRow>(sql, params);
  const result = images.map(toImageJson);
  setCache(cacheKey, result);
  res.json(result);
});

router.get("/images/dashboard", requireUserAuth, async (req, res): Promise<void> => {
  const q = GetImagesQueryParams.safeParse(req.query);
  const category = (q.success && q.data.category) ? q.data.category : null;
  const type = req.query.type as string | undefined;
  const cacheKey = `dashboard:${category ?? "all"}:${type ?? "all"}`;
  const cached = getCache<ReturnType<typeof toImageJson>[]>(cacheKey);
  if (cached) { res.json(cached); return; }

  let sql = `SELECT * FROM images WHERE 1=1`;
  const params: unknown[] = [];
  let idx = 1;
  if (category) { sql += ` AND category = $${idx++}`; params.push(category); }
  if (type) { sql += ` AND type = $${idx++}`; params.push(type); }
  sql += ` ORDER BY created_at DESC LIMIT 120`;

  const images = await query<ImageRow>(sql, params);
  const result = images.map(toImageJson);
  setCache(cacheKey, result);
  res.json(result);
});

// Social links
function getUserId(req: any): string | undefined {
  // JWT token stores userId (from generateUserToken), not id
  return req.user?.userId ?? req.user?.id ?? undefined;
}

router.get("/social-links", requireUserAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Cannot determine user" }); return; }
  const links = await query(
    "SELECT id, platform, url, username, created_at FROM social_links WHERE user_id = $1 ORDER BY created_at ASC",
    [userId]
  );
  res.json(links);
});

router.post("/social-links", requireUserAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Cannot determine user" }); return; }
  const { platform, url, username } = req.body as { platform?: string; url?: string; username?: string };
  if (!platform || !url) { res.status(400).json({ error: "platform and url are required" }); return; }
  const PLATFORMS = ["Instagram","TikTok","Twitter/X","YouTube","Facebook","Snapchat","Pinterest","LinkedIn","WhatsApp","Telegram","Threads","BeReal","Other"];
  if (!PLATFORMS.includes(platform)) { res.status(400).json({ error: "Invalid platform" }); return; }
  try {
    const link = await queryOne(
      `INSERT INTO social_links (user_id, platform, url, username)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, platform) DO UPDATE SET url = EXCLUDED.url, username = EXCLUDED.username
       RETURNING *`,
      [userId, platform, url, username ?? null]
    );
    res.status(201).json(link);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/social-links/:id", requireUserAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Cannot determine user" }); return; }
  const { id } = req.params;
  const deleted = await queryOne(
    "DELETE FROM social_links WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId]
  );
  if (!deleted) { res.status(404).json({ error: "Link not found" }); return; }
  res.sendStatus(204);
});

// All social links for community discover feed — also returns distinct users for "members to follow"
router.get("/community/social-links", requireUserAuth, async (req, res): Promise<void> => {
  const links = await query(
    `SELECT sl.id, sl.platform, sl.url, sl.username, u.name as user_name, u.id as user_id, sl.created_at
     FROM social_links sl JOIN users u ON u.id = sl.user_id
     ORDER BY sl.created_at DESC LIMIT 200`
  );
  res.json(links);
});

// Distinct members who have added social links (for "members to follow" list)
router.get("/community/members", requireUserAuth, async (req, res): Promise<void> => {
  const members = await query(
    `SELECT DISTINCT ON (u.id) u.id, u.name, u.created_at,
       sl.platform as top_platform, sl.url as top_url, sl.username as top_username,
       COUNT(sl2.id) OVER (PARTITION BY u.id) as link_count
     FROM users u
     JOIN social_links sl ON sl.user_id = u.id
     JOIN social_links sl2 ON sl2.user_id = u.id
     ORDER BY u.id, sl.created_at ASC
     LIMIT 100`
  );
  res.json(members);
});

// Resolve a Pinterest URL to a direct image URL
router.post("/images/resolve-pinterest", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") { res.status(400).json({ error: "url is required" }); return; }
  try {
    const imageUrl = await resolvePinterestUrl(url);
    res.json({ imageUrl, title: null });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Get TikTok video info for watermark-free download
router.post("/images/tiktok-info", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") { res.status(400).json({ error: "url is required" }); return; }
  try {
    const info = await getTiktokInfo(url);
    res.json(info);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

// Proxy-download any external URL
router.get("/images/download-proxy", async (req, res): Promise<void> => {
  const { url, filename } = req.query as { url?: string; filename?: string };
  if (!url) { res.status(400).json({ error: "url required" }); return; }
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    res.status(400).json({ error: "Invalid URL" }); return;
  }
  const safeFilename = (filename || "aesthetic.jpg").replace(/[^a-z0-9._\-() ]/gi, "_");
  streamProxy(url, res, safeFilename, 0);
});

// Stream a TikTok video by image ID
router.get("/images/:id/video", async (req, res): Promise<void> => {
  const tokenFromQuery = req.query.token as string | undefined;
  const tokenFromHeader = req.headers.authorization?.slice(7);
  const token = tokenFromQuery ?? tokenFromHeader;
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  try { jwt.verify(token, JWT_SECRET); } catch { res.status(401).json({ error: "Invalid token" }); return; }

  const img = await queryOne<ImageRow>("SELECT * FROM images WHERE id = $1", [req.params.id]);
  if (!img) { res.status(404).json({ error: "Not found" }); return; }
  if (!img.tiktok_url) { res.status(400).json({ error: "No TikTok URL for this item" }); return; }

  try {
    const info = await getTiktokInfo(img.tiktok_url);
    streamVideoProxy(info.downloadUrl, req.headers.range, res);
  } catch (err) {
    if (!res.headersSent) res.status(502).json({ error: `TikTok fetch failed: ${String(err)}` });
  }
});

router.post("/images", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateImageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data as any;
  const img = await queryOne<ImageRow>(
    `INSERT INTO images (url, title, category, destination, type, tiktok_url, thumbnail)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [d.url, d.title ?? null, d.category ?? "Nature", d.destination ?? "landing", d.type ?? "wallpaper", d.tiktokUrl ?? null, d.thumbnail ?? null]
  );
  invalidateImagesCache();
  res.status(201).json(toImageJson(img!));
});

router.delete("/images/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteImageParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const deleted = await queryOne("DELETE FROM images WHERE id = $1 RETURNING id", [params.data.id]);
  if (!deleted) { res.status(404).json({ error: "Image not found" }); return; }
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
          fetchUrl(resp.headers.location, options).then(resolve).catch(reject); return;
        }
        let data = ""; resp.on("data", (chunk) => (data += chunk)); resp.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("Request timed out")); });
    req.end();
  });
}

async function resolvePinterestUrl(pinUrl: string): Promise<string> {
  try {
    const oembedUrl = `https://www.pinterest.com/oembed/?url=${encodeURIComponent(pinUrl)}&format=json`;
    const json = await fetchUrl(oembedUrl);
    const data = JSON.parse(json) as { thumbnail_url?: string };
    if (data.thumbnail_url) return data.thumbnail_url.replace(/\/\d+x\//, "/originals/").replace(/_b\.jpg/, "_o.jpg");
  } catch { }
  const html = await fetchUrl(pinUrl);
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch?.[1]) return ogMatch[1].replace(/&amp;/g, "&");
  throw new Error("Could not extract image from Pinterest URL.");
}

function streamProxy(url: string, res: any, filename: string, redirectCount: number): void {
  if (redirectCount > 5) { if (!res.headersSent) res.status(500).json({ error: "Too many redirects" }); return; }
  const parsed = new URL(url);
  const lib = parsed.protocol === "https:" ? https : http;
  const req = lib.request(
    { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: "GET", headers: { "User-Agent": "Mozilla/5.0" } },
    (resp) => {
      if (resp.statusCode && resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        streamProxy(resp.headers.location as string, res, filename, redirectCount + 1); return;
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
        streamVideoProxy(resp.headers.location as string, rangeHeader, res, redirectCount + 1); return;
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

function followRedirect(url: string, maxRedirects = 8): Promise<string> {
  return new Promise((resolve) => {
    if (maxRedirects === 0) { resolve(url); return; }
    let parsed: URL;
    try { parsed = new URL(url); } catch { resolve(url); return; }
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: "GET",
        headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)", Accept: "text/html,*/*" } },
      (resp) => {
        resp.resume();
        if (resp.statusCode && resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          const loc = resp.headers.location;
          const next = loc.startsWith("http") ? loc : `${parsed.protocol}//${parsed.host}${loc}`;
          resolve(followRedirect(next, maxRedirects - 1));
        } else { resolve(url); }
      }
    );
    req.on("error", () => resolve(url));
    req.setTimeout(8000, () => { req.destroy(); resolve(url); });
    req.end();
  });
}

async function normalizeTiktokUrl(raw: string): Promise<string> {
  let url = raw.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  if (/vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com\/t\/|m\.tiktok\.com|tiktok\.com\/v\//.test(url))
    url = await followRedirect(url);
  try {
    const p = new URL(url);
    url = `${p.protocol}//${p.host}${p.pathname}`.replace(/\/$/, "");
  } catch { }
  return url;
}

async function callTikwm(url: string): Promise<{ downloadUrl: string; thumbnail: string; title: string }> {
  const postData = `url=${encodeURIComponent(url)}&count=12&cursor=0&hd=1`;
  const html = await new Promise<string>((resolve, reject) => {
    const req = https.request(
      { hostname: "www.tikwm.com", path: "/api/", method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(postData), "User-Agent": "Mozilla/5.0" } },
      (resp) => { let data = ""; resp.on("data", (c: Buffer) => (data += c)); resp.on("end", () => resolve(data)); }
    );
    req.on("error", reject);
    req.setTimeout(18000, () => { req.destroy(); reject(new Error("TikTok API timed out")); });
    req.write(postData); req.end();
  });
  const json = JSON.parse(html) as { code: number; msg?: string; data?: { play?: string; wmplay?: string; cover?: string; title?: string } };
  if (json.code !== 0 || !json.data) throw new Error(json.msg ?? `tikwm error code ${json.code}`);
  const downloadUrl = json.data.play || json.data.wmplay || "";
  if (!downloadUrl) throw new Error("No download URL in tikwm response");
  return { downloadUrl, thumbnail: json.data.cover || "", title: json.data.title || "TikTok Video" };
}

async function getTiktokInfo(rawUrl: string): Promise<{ downloadUrl: string; thumbnail: string; title: string }> {
  const canonical = await normalizeTiktokUrl(rawUrl);
  try { return await callTikwm(canonical); }
  catch (firstErr) {
    if (canonical !== rawUrl.trim()) {
      try { return await callTikwm(rawUrl.trim()); } catch { }
    }
    throw firstErr;
  }
}
