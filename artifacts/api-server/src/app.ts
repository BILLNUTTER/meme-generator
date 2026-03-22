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

// Serve frontend static files in production (for Render single-service deploy)
const staticDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../aesthetic-wallpapers/dist/public"
);
if (process.env.NODE_ENV === "production" && existsSync(staticDir)) {
  app.use(express.static(staticDir, { index: false }));
  // SPA fallback — all non-API routes return index.html
  app.get(/^(?!\/api).*$/, (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
