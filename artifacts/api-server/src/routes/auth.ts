import { Router, type IRouter } from "express";
import { AdminLoginBody, AdminLoginResponse } from "@workspace/api-zod";
import { generateToken } from "../middlewares/auth";

const router: IRouter = Router();

const ADMIN_USERNAME = "42819408";
const ADMIN_PASSWORD = "BILLnutter001002";

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = generateToken(username);
  res.json(AdminLoginResponse.parse({ token }));
});

export default router;
