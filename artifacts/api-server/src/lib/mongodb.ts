import mongoose from "mongoose";
import { logger } from "./logger";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI environment variable is required.");
}

export async function connectMongo() {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(MONGO_URI!);
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
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const ImageModel = mongoose.model("Image", imageSchema);
export const UserModel = mongoose.model("User", userSchema);
