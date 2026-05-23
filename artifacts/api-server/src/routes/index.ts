import { Router, type IRouter } from "express";
import healthRouter from "./health";
import userRouter from "./user";
import byokRouter from "./byok";
import studyPacksRouter from "./study-packs";
import flashcardsRouter from "./flashcards";
import quizRouter from "./quiz";
import geminiRouter from "./gemini";
import adminRouter from "./admin";
import webhooksRouter from "./webhooks";
import roomsRouter from "./rooms";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(userRouter);
router.use(byokRouter);
router.use(studyPacksRouter);
router.use(flashcardsRouter);
router.use(quizRouter);
router.use(geminiRouter);
router.use(adminRouter);
router.use(webhooksRouter);
router.use(roomsRouter);
router.use(paymentsRouter);

export default router;
