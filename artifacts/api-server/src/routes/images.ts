import { Router, type IRouter } from "express";
import { ImageModel } from "../lib/mongodb";
import {
  GetImagesQueryParams,
  CreateImageBody,
  DeleteImageParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function toImageJson(doc: InstanceType<typeof ImageModel>) {
  return {
    id: (doc._id as unknown as { toString(): string }).toString(),
    url: doc.url as string,
    title: (doc.title as string | null) ?? null,
    category: doc.category as string,
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

router.get("/images", async (req, res): Promise<void> => {
  const query = GetImagesQueryParams.safeParse(req.query);

  const filter: Record<string, string> = {};
  if (query.success && query.data.category) {
    filter.category = query.data.category;
  }

  const images = await ImageModel.find(filter).sort({ createdAt: 1 });
  res.json(images.map(toImageJson));
});

router.post("/images", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const image = await ImageModel.create(parsed.data);
  res.status(201).json(toImageJson(image));
});

router.delete("/images/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteImageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const deleted = await ImageModel.findByIdAndDelete(params.data.id);

  if (!deleted) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
