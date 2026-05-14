import { Router, type IRouter } from "express";
import healthRouter from "./health";
import userRouter from "./user";
import studyPacksRouter from "./study-packs";
import flashcardsRouter from "./flashcards";
import quizRouter from "./quiz";
import geminiRouter from "./gemini";

const router: IRouter = Router();

router.use(healthRouter);
router.use(userRouter);
router.use(studyPacksRouter);
router.use(flashcardsRouter);
router.use(quizRouter);
router.use(geminiRouter);

export default router;
