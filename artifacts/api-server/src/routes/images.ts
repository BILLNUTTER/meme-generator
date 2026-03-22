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
  const html = await fetchUrl(pinUrl);
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch && ogMatch[1]) {
    return ogMatch[1].replace(/&amp;/g, "&");
  }
  throw new Error("Could not extract image from Pinterest URL. Try the direct image URL instead.");
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
