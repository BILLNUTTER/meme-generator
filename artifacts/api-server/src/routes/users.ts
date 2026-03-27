import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { query, queryOne } from "../lib/db";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { generateUserToken, requireUserAuth } from "../middlewares/auth";

const router: IRouter = Router();

interface UserRow {
  id: string; name: string; email: string; password: string;
  suspended: boolean; tiktok_expiry: string | null; created_at: string;
}

function toUserJson(u: UserRow) {
  const expiry = u.tiktok_expiry ? new Date(u.tiktok_expiry) : null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.created_at,
    tiktokExpiry: expiry ? expiry.toISOString() : null,
    tiktokActive: expiry ? expiry > new Date() : false,
  };
}

router.post("/users/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, email, password } = parsed.data;
  const existing = await queryOne("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (existing) { res.status(400).json({ error: "Email already registered" }); return; }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await queryOne<UserRow>(
    `INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING *`,
    [name, email.toLowerCase(), hashedPassword]
  );
  if (!user) { res.status(500).json({ error: "Failed to create user" }); return; }
  const token = generateUserToken(user.id, user.email, user.name);
  res.status(201).json({ token, user: toUserJson(user) });
});

router.post("/users/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { email, password } = parsed.data;
  const user = await queryOne<UserRow>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  if (!user) { res.status(401).json({ error: "Invalid email or password" }); return; }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) { res.status(401).json({ error: "Invalid email or password" }); return; }
  if (user.suspended) {
    res.status(403).json({ error: "Your account has been suspended. Contact support on WhatsApp: +254713881613" });
    return;
  }
  const token = generateUserToken(user.id, user.email, user.name);
  res.json({ token, user: toUserJson(user) });
});

router.get("/users/me", requireUserAuth, async (req, res): Promise<void> => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await queryOne<UserRow>("SELECT * FROM users WHERE id = $1", [userId]);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(toUserJson(user));
});

export default router;
