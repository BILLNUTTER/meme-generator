import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);

// Serve frontend static files when the built dist exists (Render single-service deploy).
// Check both possible roots:
//   1. Relative to import.meta.url (works when node is started from inside api-server/)
//   2. Relative to process.cwd()  (works when node is started from project root on Render)
const FRONTEND_REL = "artifacts/aesthetic-wallpapers/dist/public";
const candidateDirs = [
  // From project root (Render: `node artifacts/api-server/dist/index.mjs` run at repo root)
  path.resolve(process.cwd(), FRONTEND_REL),
  // From dist/ dir: dist/ → api-server/ → artifacts/ → project root (three levels up)
  path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..", FRONTEND_REL),
];
const staticDir = candidateDirs.find(d => existsSync(d)) ?? null;
logger.info({ candidateDirs, staticDir }, "Static files directory check");

if (staticDir) {
  app.use(express.static(staticDir, { index: false }));
  // SPA fallback — serve index.html for all non-API routes (app.use catches everything)
  app.use((_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
