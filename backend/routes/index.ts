import { Router } from "express";
import { authRouter } from "./auth.routes";
import { memberRouter } from "./member.routes";
import { sessionRouter } from "./session.routes";
import { alertRouter } from "./alert.routes";
import { transcriptRouter } from "./transcript.routes";
import { emergencyRouter } from "./emergency.routes";
import { disciplineRouter } from "./discipline.routes";
import { aiRouter } from "./ai.routes";

export const apiRouter = Router();

// Mount all modular domain routers under /api
apiRouter.use(authRouter);
apiRouter.use(memberRouter);
apiRouter.use(sessionRouter);
apiRouter.use(alertRouter);
apiRouter.use(transcriptRouter);
apiRouter.use(emergencyRouter);
apiRouter.use(disciplineRouter);
apiRouter.use(aiRouter);
