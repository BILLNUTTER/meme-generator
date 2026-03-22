import { Router, type IRouter } from "express";
import healthRouter from "./health";
import imagesRouter from "./images";
import authRouter from "./auth";
import usersRouter from "./users";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(imagesRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(adminRouter);

export default router;
