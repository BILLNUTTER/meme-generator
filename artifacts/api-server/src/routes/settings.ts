import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const PESAPAL_KEYS = ["pesapalConsumerKey", "pesapalConsumerSecret", "pesapalSandbox", "pesapalDirectUrl"] as const;

router.get("/settings/pesapal", requireAuth, async (_req, res): Promise<void> => {
  const rows = await query<{ key: string; value: unknown }>(
    `SELECT key, value FROM settings WHERE key = ANY($1)`,
    [PESAPAL_KEYS as unknown as string[]]
  );
  const result: Record<string, unknown> = {};
  for (const row of rows) result[row.key] = row.value;
  res.json(result);
});

router.get("/settings/payment-url", async (_req, res): Promise<void> => {
  const row = await queryOne<{ value: unknown }>(
    `SELECT value FROM settings WHERE key = $1`,
    ["pesapalDirectUrl"]
  );
  res.json({ url: (row?.value as string) || null });
});

router.put("/settings/pesapal", requireAuth, async (req, res): Promise<void> => {
  const { pesapalConsumerKey, pesapalConsumerSecret, pesapalSandbox, pesapalDirectUrl } = req.body as {
    pesapalConsumerKey?: string;
    pesapalConsumerSecret?: string;
    pesapalSandbox?: boolean;
    pesapalDirectUrl?: string;
  };

  const updates: { key: string; value: unknown }[] = [];
  if (pesapalConsumerKey !== undefined)    updates.push({ key: "pesapalConsumerKey",    value: pesapalConsumerKey });
  if (pesapalConsumerSecret !== undefined) updates.push({ key: "pesapalConsumerSecret", value: pesapalConsumerSecret });
  if (pesapalSandbox !== undefined)        updates.push({ key: "pesapalSandbox",         value: pesapalSandbox });
  if (pesapalDirectUrl !== undefined)      updates.push({ key: "pesapalDirectUrl",       value: pesapalDirectUrl });

  await Promise.all(
    updates.map(u =>
      query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [u.key, JSON.stringify(u.value)]
      )
    )
  );

  res.json({ success: true });
});

export default router;
