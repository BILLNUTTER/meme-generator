import { Router, type IRouter } from "express";
import { SettingsModel } from "../lib/mongodb";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const PESAPAL_KEYS = ["pesapalConsumerKey", "pesapalConsumerSecret", "pesapalSandbox"] as const;

router.get("/settings/pesapal", requireAuth, async (_req, res): Promise<void> => {
  const docs = await SettingsModel.find({ key: { $in: PESAPAL_KEYS } });
  const result: Record<string, unknown> = {};
  for (const doc of docs) result[doc.key as string] = doc.value;
  res.json(result);
});

router.put("/settings/pesapal", requireAuth, async (req, res): Promise<void> => {
  const { pesapalConsumerKey, pesapalConsumerSecret, pesapalSandbox } = req.body as {
    pesapalConsumerKey?: string;
    pesapalConsumerSecret?: string;
    pesapalSandbox?: boolean;
  };

  const updates: { key: string; value: unknown }[] = [];
  if (pesapalConsumerKey !== undefined)  updates.push({ key: "pesapalConsumerKey",    value: pesapalConsumerKey });
  if (pesapalConsumerSecret !== undefined) updates.push({ key: "pesapalConsumerSecret", value: pesapalConsumerSecret });
  if (pesapalSandbox !== undefined)      updates.push({ key: "pesapalSandbox",         value: pesapalSandbox });

  await Promise.all(
    updates.map(u => SettingsModel.findOneAndUpdate({ key: u.key }, { value: u.value }, { upsert: true }))
  );

  res.json({ success: true });
});

export default router;
