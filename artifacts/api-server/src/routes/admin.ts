import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db";
import { requireAuth } from "../middlewares/auth";
import { invalidateImagesCache } from "./images";

const router: IRouter = Router();

router.get("/admin/users", requireAuth, async (req, res): Promise<void> => {
  const users = await query(
    "SELECT id, name, email, suspended, tiktok_expiry, created_at FROM users ORDER BY created_at DESC"
  );
  res.json(users.map((u: any) => ({
    id: u.id, name: u.name, email: u.email, suspended: u.suspended,
    tiktokExpiry: u.tiktok_expiry ?? null,
    tiktokActive: u.tiktok_expiry ? new Date(u.tiktok_expiry) > new Date() : false,
    createdAt: u.created_at,
  })));
});

router.patch("/admin/users/:id/suspend", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const { suspended } = req.body as { suspended: boolean };
  const user = await queryOne<any>(
    "UPDATE users SET suspended = $1 WHERE id = $2 RETURNING id, name, email, suspended, created_at",
    [suspended, id]
  );
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user.id, name: user.name, email: user.email, suspended: user.suspended, createdAt: user.created_at });
});

router.delete("/admin/users/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const user = await queryOne("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ success: true, id });
});

router.get("/admin/revenue", requireAuth, async (req, res): Promise<void> => {
  const payments = await query(
    "SELECT * FROM payments ORDER BY created_at DESC LIMIT 200"
  );
  const total = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const completed = payments.filter((p: any) => p.status === "completed");
  const completedTotal = completed.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  res.json({
    total, completedTotal, count: payments.length, completedCount: completed.length,
    payments: payments.map((p: any) => ({
      id: p.id, userId: p.user_id, email: p.email, phone: p.phone, amount: p.amount,
      currency: p.currency, description: p.description, status: p.status,
      orderTrackingId: p.order_tracking_id, createdAt: p.created_at,
    })),
  });
});

router.patch("/admin/images/:id/destination", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const { destination } = req.body as { destination: string };
  const allowed = ["landing", "dashboard", "both"];
  if (!allowed.includes(destination)) {
    res.status(400).json({ error: "destination must be landing, dashboard, or both" }); return;
  }
  const img = await queryOne<any>(
    "UPDATE images SET destination = $1 WHERE id = $2 RETURNING id, destination",
    [destination, id]
  );
  if (!img) { res.status(404).json({ error: "Image not found" }); return; }
  invalidateImagesCache();
  res.json({ id: img.id, destination: img.destination });
});

router.get("/admin/settings", requireAuth, async (req, res): Promise<void> => {
  const doc = await queryOne<any>("SELECT value FROM settings WHERE key = 'tiktokPaidMode'");
  res.json({ tiktokPaidMode: doc?.value ?? false });
});

router.post("/admin/settings", requireAuth, async (req, res): Promise<void> => {
  const { tiktokPaidMode } = req.body as { tiktokPaidMode?: boolean };
  if (typeof tiktokPaidMode !== "boolean") {
    res.status(400).json({ error: "tiktokPaidMode must be a boolean" }); return;
  }
  await query(
    `INSERT INTO settings (key, value) VALUES ('tiktokPaidMode', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(tiktokPaidMode)]
  );
  res.json({ tiktokPaidMode });
});

export default router;
