import { Router, type IRouter } from "express";
import healthRouter from "./health";
import imagesRouter from "./images";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(imagesRouter);
router.use(authRouter);

export default router;
