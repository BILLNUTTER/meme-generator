import mongoose from "mongoose";
import { logger } from "./logger";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  logger.warn("MONGO_URI not set — MongoDB features disabled (settings now use PostgreSQL).");
}

export async function connectMongo() {
  if (!MONGO_URI) return;
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(MONGO_URI);
  logger.info("Connected to MongoDB");
}

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    title: { type: String, default: null },
    category: { type: String, required: true, default: "Nature" },
    destination: { type: String, required: true, default: "landing", enum: ["landing", "dashboard", "both"] },
    type: { type: String, required: true, default: "wallpaper", enum: ["wallpaper", "meme", "tiktok"] },
    tiktokUrl: { type: String, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    suspended: { type: Boolean, default: false },
    tiktokExpiry: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: false }
);

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: "KES" },
    description: { type: String, default: "" },
    orderTrackingId: { type: String, default: null },
    merchantRef: { type: String, default: null },
    status: { type: String, default: "initiated", enum: ["initiated", "completed", "failed"] },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const ImageModel    = mongoose.model("Image",    imageSchema);
export const UserModel     = mongoose.model("User",     userSchema);
export const SettingsModel = mongoose.model("Settings", settingsSchema);
export const PaymentModel  = mongoose.model("Payment",  paymentSchema);
