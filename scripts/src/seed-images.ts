import { db, imagesTable } from "@workspace/db";
import { count } from "drizzle-orm";

const SEED_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    title: "Mountain Mist",
    category: "Nature",
  },
  {
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
    title: "Forest Light",
    category: "Nature",
  },
  {
    url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80",
    title: "Ocean Waves",
    category: "Nature",
  },
  {
    url: "https://images.unsplash.com/photo-1518893883800-45cd0954574b?w=800&q=80",
    title: "Desert Dunes",
    category: "Nature",
  },
  {
    url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80",
    title: "Alpine Serenity",
    category: "Minimalism",
  },
  {
    url: "https://images.unsplash.com/photo-1524234107056-1c1f48f64ab8?w=800&q=80",
    title: "White Space",
    category: "Minimalism",
  },
  {
    url: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
    title: "Speed Machine",
    category: "Cars",
  },
  {
    url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80",
    title: "Classic Drive",
    category: "Cars",
  },
  {
    url: "https://images.unsplash.com/photo-1536431311719-398b6704d4cc?w=800&q=80",
    title: "Neon Dreams",
    category: "Vaporwave",
  },
  {
    url: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800&q=80",
    title: "Synthwave City",
    category: "Vaporwave",
  },
  {
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80",
    title: "Anime Aesthetic",
    category: "Anime",
  },
  {
    url: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=800&q=80",
    title: "Quiet Moments",
    category: "Quotes",
  },
];

async function seed() {
  const [{ value: existingCount }] = await db.select({ value: count() }).from(imagesTable);

  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} images. Skipping seed.`);
    process.exit(0);
  }

  console.log("Seeding database with initial images...");
  await db.insert(imagesTable).values(SEED_IMAGES);
  console.log(`Successfully seeded ${SEED_IMAGES.length} images.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
