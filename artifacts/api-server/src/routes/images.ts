import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, imagesTable } from "@workspace/db";
import {
  GetImagesQueryParams,
  GetImagesResponse,
  CreateImageBody,
  GetImagesResponseItem,
  DeleteImageParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/images", async (req, res): Promise<void> => {
  const query = GetImagesQueryParams.safeParse(req.query);
  
  let images;
  if (query.success && query.data.category) {
    images = await db
      .select()
      .from(imagesTable)
      .where(eq(imagesTable.category, query.data.category))
      .orderBy(imagesTable.createdAt);
  } else {
    images = await db
      .select()
      .from(imagesTable)
      .orderBy(imagesTable.createdAt);
  }

  res.json(GetImagesResponse.parse(images));
});

router.post("/images", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [image] = await db
    .insert(imagesTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(GetImagesResponseItem.parse(image));
});

router.delete("/images/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteImageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(imagesTable)
    .where(eq(imagesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
