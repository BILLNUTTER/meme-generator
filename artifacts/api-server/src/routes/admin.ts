import { Router, type IRouter } from "express";
import { UserModel } from "../lib/mongodb";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/admin/users", requireAuth, async (req, res): Promise<void> => {
  const users = await UserModel.find({}, { password: 0 }).sort({ createdAt: -1 });
  const result = users.map((u) => ({
    id: (u._id as unknown as { toString(): string }).toString(),
    name: u.name as string,
    email: u.email as string,
    createdAt: (u.createdAt as Date).toISOString(),
  }));
  res.json(result);
});

export default router;
