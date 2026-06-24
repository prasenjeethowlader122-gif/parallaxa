import { Router, type IRouter } from "express";
import healthRouter from "./health";
import articlesRouter from "./articles";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(articlesRouter);
router.use(authRouter);

export default router;
