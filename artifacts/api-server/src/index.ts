import app from "./app";
import { logger } from "./lib/logger";
import { connectMongo, ImageModel } from "./lib/mongodb";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const SEED_IMAGES = [
  // Wallpapers
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", title: "Mountain Mist", category: "Nature", destination: "landing", type: "wallpaper" },
  { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", title: "Forest Light", category: "Nature", destination: "both", type: "wallpaper" },
  { url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80", title: "Ocean Waves", category: "Nature", destination: "dashboard", type: "wallpaper" },
  { url: "https://images.unsplash.com/photo-1518893883800-45cd0954574b?w=800&q=80", title: "Desert Dunes", category: "Nature", destination: "both", type: "wallpaper" },
  { url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80", title: "Alpine Serenity", category: "Minimalism", destination: "landing", type: "wallpaper" },
  { url: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80", title: "Speed Machine", category: "Cars", destination: "both", type: "wallpaper" },
  { url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80", title: "Classic Drive", category: "Cars", destination: "landing", type: "wallpaper" },
  { url: "https://images.unsplash.com/photo-1536431311719-398b6704d4cc?w=800&q=80", title: "Neon Dreams", category: "Vaporwave", destination: "both", type: "wallpaper" },
  { url: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800&q=80", title: "Synthwave City", category: "Vaporwave", destination: "dashboard", type: "wallpaper" },
  { url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80", title: "Anime Aesthetic", category: "Anime", destination: "both", type: "wallpaper" },
  // Memes
  { url: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=800&q=80", title: "Chill Vibes", category: "Memes", destination: "landing", type: "meme" },
  { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", title: "Mood Board", category: "Memes", destination: "both", type: "meme" },
];

async function start() {
  await connectMongo();

  // Migrate existing images that have no destination or type field
  await ImageModel.updateMany(
    { destination: { $exists: false } },
    { $set: { destination: "landing" } }
  );
  await ImageModel.updateMany(
    { type: { $exists: false } },
    { $set: { type: "wallpaper" } }
  );

  const count = await ImageModel.countDocuments();
  if (count === 0) {
    await ImageModel.insertMany(SEED_IMAGES);
    logger.info({ count: SEED_IMAGES.length }, "Seeded initial images");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

start().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
