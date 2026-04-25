import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import videosRouter from "./videos";
import chatsRouter from "./chats";
import notificationsRouter from "./notifications";
import exploreRouter from "./explore";
import statusesRouter from "./statuses";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(videosRouter);
router.use(chatsRouter);
router.use(notificationsRouter);
router.use(exploreRouter);
router.use(statusesRouter);

export default router;
