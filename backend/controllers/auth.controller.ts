import { Request, Response } from "express";
import { authService } from "../services/auth.service";

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { username, password, member_id, identifier } = req.body;
    const idToUse = identifier || username || member_id;

    if (!idToUse || !password) {
      res.status(400).json({ error: "Identification (username or member_id) and password are required" });
      return;
    }

    const result = await authService.login(idToUse, password);
    if (!result.success) {
      res.status(401).json({ error: result.error || "Invalid credentials" });
      return;
    }

    res.json({
      status: "SUCCESS",
      token: result.token,
      user: result.user
    });
  }

  me(req: Request, res: Response): void {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json({ user: req.user });
  }

  logout(req: Request, res: Response): void {
    res.json({ status: "LOGGED_OUT" });
  }
}

export const authController = new AuthController();
