import { Router, type IRouter } from "express";
import { UserModel, PaymentModel } from "../lib/mongodb";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/admin/users", requireAuth, async (req, res): Promise<void> => {
  const users = await UserModel.find({}, { password: 0 }).sort({ createdAt: -1 });
  const result = users.map((u) => ({
    id: (u._id as unknown as { toString(): string }).toString(),
    name: u.name as string,
    email: u.email as string,
    suspended: (u.suspended as boolean) ?? false,
    createdAt: (u.createdAt as Date).toISOString(),
  }));
  res.json(result);
});

router.patch("/admin/users/:id/suspend", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const { suspended } = req.body as { suspended: boolean };
  const user = await UserModel.findByIdAndUpdate(id, { suspended }, { new: true, select: "-password" });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({
    id: (user._id as unknown as { toString(): string }).toString(),
    name: user.name as string,
    email: user.email as string,
    suspended: user.suspended as boolean,
    createdAt: (user.createdAt as Date).toISOString(),
  });
});

router.get("/admin/revenue", requireAuth, async (req, res): Promise<void> => {
  const payments = await PaymentModel.find().sort({ createdAt: -1 }).limit(200);
  const total = payments.reduce((sum, p) => sum + ((p.amount as number) || 0), 0);
  const completed = payments.filter((p) => p.status === "completed");
  const completedTotal = completed.reduce((sum, p) => sum + ((p.amount as number) || 0), 0);
  res.json({
    total,
    completedTotal,
    count: payments.length,
    completedCount: completed.length,
    payments: payments.map((p) => ({
      id: (p._id as unknown as { toString(): string }).toString(),
      userId: p.userId,
      email: p.email,
      phone: p.phone,
      amount: p.amount,
      currency: p.currency,
      description: p.description,
      status: p.status,
      orderTrackingId: p.orderTrackingId,
      createdAt: (p.createdAt as Date).toISOString(),
    })),
  });
});

export default router;
