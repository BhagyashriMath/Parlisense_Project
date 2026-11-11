import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

export const authRouter = Router();

authRouter.post("/auth/login", (req, res) => authController.login(req, res));
authRouter.get("/auth/me", authenticate, (req, res) => authController.me(req, res));
authRouter.post("/auth/logout", (req, res) => authController.logout(req, res));
