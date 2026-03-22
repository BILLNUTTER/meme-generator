import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../lib/mongodb";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { generateUserToken } from "../middlewares/auth";

const router: IRouter = Router();

function toUserJson(doc: InstanceType<typeof UserModel>) {
  return {
    id: (doc._id as unknown as { toString(): string }).toString(),
    name: (doc.name as unknown as string),
    email: (doc.email as unknown as string),
    createdAt: (doc.createdAt as unknown as Date).toISOString(),
  };
}

router.post("/users/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ name, email, password: hashedPassword });

  const token = generateUserToken(
    (user._id as unknown as { toString(): string }).toString(),
    (user.email as unknown as string),
    (user.name as unknown as string),
  );
  res.status(201).json({ token, user: toUserJson(user) });
});

router.post("/users/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const user = await UserModel.findOne({ email: email.toLowerCase() });

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, (user.password as unknown as string));
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (user.suspended) {
    res.status(403).json({ error: "Your account has been suspended. Contact support on WhatsApp: +254713881613" });
    return;
  }

  const token = generateUserToken(
    (user._id as unknown as { toString(): string }).toString(),
    (user.email as unknown as string),
    (user.name as unknown as string),
  );
  res.json({ token, user: toUserJson(user) });
});

export default router;
